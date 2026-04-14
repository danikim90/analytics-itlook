import { skuPai } from './parseFiles';

const TODAY = new Date();

function daysDiff(date) {
  if (!date) return null;
  const diff = TODAY - date;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Regra de remarcação por D+ */
function recomendacaoRemarcacao(dPlus, curva) {
  if (!dPlus) return null;
  if (dPlus >= 75) return { label: '50% a 70% OFF', urgencia: 'critical' };
  if (dPlus >= 60) return { label: '50% a 70% OFF', urgencia: 'critical' };
  if (dPlus >= 45) return { label: '30% a 50% OFF', urgencia: 'high' };
  if (dPlus >= 30) return { label: '15% a 30% OFF', urgencia: 'medium' };
  return null;
}

/** Atribui curva ABC baseada em percentil de velocidade */
function atribuirCurva(items) {
  const sorted = [...items].sort((a, b) => b.velocidade - a.velocidade);
  const n = sorted.length;

  sorted.forEach((item, idx) => {
    const pct = (idx + 1) / n; // 0..1, menor = mais rápido
    if (pct <= 0.20) item.curva = 'A';
    else if (pct <= 0.45) item.curva = 'B+';
    else if (pct <= 0.70) item.curva = 'B-';
    else if (pct <= 0.85) item.curva = 'C+';
    else item.curva = 'C-';
  });
}

export function buildAbcData(vendas, estoque, saldos, motivos) {
  // Agrupa por SKU pai
  const pais = {};

  // Função para garantir entrada de SKU pai
  function getPai(sku, desc) {
    const pai = skuPai(sku);
    if (!pais[pai]) {
      // Extrai nome do produto (remove tamanho do final)
      const nomeBase = desc.replace(/\s+(PP|P|M|G|GG|XG|XXG|36|38|40|42|44|46|48|50|52|\d{2})$/, '').trim();
      pais[pai] = {
        skuPai: pai,
        nome: nomeBase,
        saidas: 0,
        entradas: 0,
        saldoFinal: 0,
        totalVendas: 0,
        qtyVendas: 0,
        dPlus: null, // menor D+ do grupo (mais recente entrada)
        dataCriacaoMin: null,
        precoCusto: 0,
        tamanhos: {},
        reversas: 0,
        trocas: 0,
        devolucoes: 0,
      };
    }
    return pais[pai];
  }

  // 1. Dados de estoque (Entradas e Saídas) — base da velocidade
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

  // 2. Dados de saldos — data de criação, custo, qtd disponível
  Object.values(saldos).forEach(({ sku, dataCriacao, precoCusto, qtyDisp }) => {
    const entry = getPai(sku, '');
    const tam = sku.slice(10, 12);
    if (entry.tamanhos[tam]) {
      entry.tamanhos[tam].dataCriacao = dataCriacao;
      const dp = daysDiff(dataCriacao);
      entry.tamanhos[tam].dPlus = dp;
    }
    // Data mais antiga = produto mais velho (maior D+)
    if (dataCriacao) {
      if (!entry.dataCriacaoMin || dataCriacao < entry.dataCriacaoMin) {
        entry.dataCriacaoMin = dataCriacao;
      }
    }
    if (precoCusto > entry.precoCusto) entry.precoCusto = precoCusto;
    entry.qtyDisp = (entry.qtyDisp || 0) + qtyDisp;
  });

  // 3. Dados de vendas
  Object.values(vendas).forEach(({ sku, total, qty }) => {
    const entry = getPai(sku, '');
    entry.totalVendas += total;
    entry.qtyVendas += qty;
  });

  // 4. Dados de motivos/devoluções
  Object.values(motivos).forEach(({ sku, reversas, trocas, devolucoes }) => {
    const entry = getPai(sku, '');
    entry.reversas += reversas;
    entry.trocas += trocas;
    entry.devolucoes += devolucoes;
  });

  // 5. Calcula D+ e velocidade por SKU pai
  const items = Object.values(pais).map((entry) => {
    const dPlus = daysDiff(entry.dataCriacaoMin);
    const velocidade = dPlus ? entry.saidas / dPlus : 0; // peças/dia
    return { ...entry, dPlus, velocidade };
  });

  // 6. Atribui curva ABC
  atribuirCurva(items);

  // 7. Recomendação de remarcação
  items.forEach((item) => {
    item.remarcacao = recomendacaoRemarcacao(item.dPlus, item.curva);
  });

  return items;
}
