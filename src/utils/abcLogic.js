import { skuPai } from './parseFiles';

const TODAY = new Date();

function daysDiff(date) {
  if (!date) return null;
  const diff = TODAY - date;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Curva ABC por saídas totais do período (ranking relativo).
 * Ordena por saídas desc e classifica por percentil cumulativo.
 *
 * A+ = top 10%   A- = 11–25%
 * B+ = 26–50%    B- = 51–65%
 * C+ = 66–85%    C- = bottom 15%
 */
function atribuirCurva(items) {
  // Produtos com D+ < 30 não entram no ranking — ainda sem histórico suficiente
  items.filter((i) => i.dPlus == null || i.dPlus < 30).forEach((item) => {
    item.curva = 'Aguardando';
  });

  // Ranking por velocidade (saídas ÷ D+) apenas para produtos com D+ ≥ 30
  const elegiveis = items.filter((i) => i.dPlus != null && i.dPlus >= 30);
  const sorted = [...elegiveis].sort((a, b) => b.velocidade - a.velocidade);
  const n = sorted.length;

  sorted.forEach((item, idx) => {
    const pct = (idx + 1) / n;
    if (pct <= 0.10)      item.curva = 'A+';
    else if (pct <= 0.25) item.curva = 'A-';
    else if (pct <= 0.50) item.curva = 'B+';
    else if (pct <= 0.65) item.curva = 'B-';
    else if (pct <= 0.85) item.curva = 'C+';
    else                  item.curva = 'C-';
  });
}

/**
 * Recomendação de remarcação cruzando curva com D+.
 *
 * Curva A (A+ / A-)  → nunca remarcar
 * Curva B (B+ / B-)  → D+60: 15-20% OFF | D+90: 20-30% OFF | D+120: liquidação
 * Curva C (C+ / C-)  → D+45: 15-20% OFF | D+60: 30-40% OFF | D+90: 40-50% OFF | D+120: liquidar
 *
 * Retorna null quando não há ação recomendada.
 */
function recomendacaoRemarcacao(dPlus, curva) {
  if (!dPlus || curva === 'A+' || curva === 'A-' || curva === 'Aguardando') return null;

  const isB = curva === 'B+' || curva === 'B-';
  const isC = curva === 'C+' || curva === 'C-';

  if (isB) {
    if (dPlus >= 120) return { label: 'Liquidação', urgencia: 'critical' };
    if (dPlus >= 90)  return { label: '20% a 30% OFF', urgencia: 'high' };
    if (dPlus >= 60)  return { label: '15% a 20% OFF', urgencia: 'medium' };
    return null;
  }

  if (isC) {
    if (dPlus >= 120) return { label: 'Liquidar', urgencia: 'critical' };
    if (dPlus >= 90)  return { label: '40% a 50% OFF', urgencia: 'critical' };
    if (dPlus >= 60)  return { label: '30% a 40% OFF', urgencia: 'high' };
    if (dPlus >= 45)  return { label: '15% a 20% OFF', urgencia: 'medium' };
    return null;
  }

  return null;
}

export function buildAbcData(vendas, estoque, saldos) {
  const pais = {};

  function getPai(sku, desc) {
    const pai = skuPai(sku);
    if (!pais[pai]) {
      const nomeBase = desc.replace(/\s+(PP|P|M|G|GG|XG|XXG|36|38|40|42|44|46|48|50|52|\d{2})$/, '').trim();
      pais[pai] = {
        skuPai: pai,
        nome: nomeBase,
        saidas: 0,
        entradas: 0,
        saldoFinal: 0,
        totalVendas: 0,
        qtyVendas: 0,
        dataCriacaoMin: null,
        precoCusto: 0,
        tamanhos: {},
      };
    }
    return pais[pai];
  }

  // 1. Entradas e Saídas de Estoque — base da curva ABC
  Object.values(estoque).forEach(({ sku, desc, entradas, saidas, saldoFinal }) => {
    const entry = getPai(sku, desc);
    const tam = sku.slice(10, 12);
    entry.saidas += saidas;
    entry.entradas += entradas;
    entry.saldoFinal += saldoFinal;
    if (!entry.tamanhos[tam]) entry.tamanhos[tam] = { saidas: 0, saldoFinal: 0, dataCriacao: null, dPlus: null };
    entry.tamanhos[tam].saidas += saidas;
    entry.tamanhos[tam].saldoFinal += saldoFinal;
  });

  // 2. Saldos — data de criação (base do D+) e custo
  Object.values(saldos).forEach(({ sku, dataCriacao, precoCusto, qtyDisp }) => {
    const entry = getPai(sku, '');
    const tam = sku.slice(10, 12);
    if (entry.tamanhos[tam]) {
      entry.tamanhos[tam].dataCriacao = dataCriacao;
      entry.tamanhos[tam].dPlus = daysDiff(dataCriacao);
    }
    // Usa a data mais antiga do grupo (produto mais velho → maior D+)
    if (dataCriacao) {
      if (!entry.dataCriacaoMin || dataCriacao < entry.dataCriacaoMin) {
        entry.dataCriacaoMin = dataCriacao;
      }
    }
    if (precoCusto > entry.precoCusto) entry.precoCusto = precoCusto;
    entry.qtyDisp = (entry.qtyDisp || 0) + qtyDisp;
  });

  // 3. Vendas
  Object.values(vendas).forEach(({ sku, total, qty }) => {
    const entry = getPai(sku, '');
    entry.totalVendas += total;
    entry.qtyVendas += qty;
  });

  // 4. Calcula D+ e velocidade por SKU pai
  const items = Object.values(pais).map((entry) => {
    const dPlus = daysDiff(entry.dataCriacaoMin);
    const velocidade = entry.saidas / Math.max(1, dPlus ?? 1);
    return { ...entry, dPlus, velocidade };
  });

  // 6. Atribui curva ABC por saídas totais
  atribuirCurva(items);

  // 7. Recomendação de remarcação (curva × D+)
  items.forEach((item) => {
    item.remarcacao = recomendacaoRemarcacao(item.dPlus, item.curva);
  });

  return items;
}
