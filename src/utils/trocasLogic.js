/**
 * Business logic for Módulo 2 — Trocas & Devoluções
 */

export const MOTIVOS_LABELS = {
  ficouGrande:   'Ficou grande',
  ficouPequeno:  'Ficou pequeno',
  arrependimento:'Arrependimento',
  qualidade:     'Não gostei da qualidade',
  produto:       'Não gostei do produto',
};

const MOTIVO_KEYS = Object.keys(MOTIVOS_LABELS);

const SIZE_ORDER = [
  'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG',
  '34', '36', '38', '40', '42', '44', '46', '48', '50', '52',
];

/** Map last-2-digit Eccosys SKU suffix → readable size label */
const SIZE_LABELS = {
  '01': 'PP', '02': 'PP', '03': 'P',  '04': 'M',  '05': 'G',
  '06': 'GG', '07': 'XG', '08': 'XXG',
  '09': '36', '10': '38', '11': '40', '12': '42',
  '13': '44', '14': '46', '15': '48', '16': '50', '17': '52',
};

/** Sizes actually carried — anything outside this set is discarded */
const VALID_SIZES = new Set(['P', 'M', 'G', 'GG', '36', '38', '40', '42', '44']);

function getSizeLabelFromSku(sku) {
  const code = String(sku).slice(-2);
  return SIZE_LABELS[code] || code;
}

function dominantMotivo(obj) {
  return MOTIVO_KEYS.reduce((best, k) => (obj[k] > obj[best] ? k : best), MOTIVO_KEYS[0]);
}

/**
 * @param {Array}  rows       - output of parseTroqueCommerce
 * @param {Object|null} vendasMap - output of parseVendas (optional)
 */
export function buildTrocasData(rows, vendasMap = null) {
  // ── 1. Resumo geral ──────────────────────────────────────────────────────────
  const totalReversas    = rows.reduce((s, r) => s + r.reversas, 0);
  const totalTrocas      = rows.reduce((s, r) => s + r.trocas, 0);
  const totalDevolucoes  = rows.reduce((s, r) => s + r.devolucoes, 0);
  const valorTotal       = rows.reduce((s, r) => s + r.valorDevolucoes, 0);

  const motivoTotais = {};
  MOTIVO_KEYS.forEach((k) => { motivoTotais[k] = rows.reduce((s, r) => s + r[k], 0); });

  const topMotivoKey = dominantMotivo(motivoTotais);
  const resumo = {
    totalReversas, totalTrocas, totalDevolucoes, valorTotal,
    motivoMaisFrequente: MOTIVOS_LABELS[topMotivoKey],
    motivoMaisFrequenteTotal: motivoTotais[topMotivoKey],
  };

  // ── 2. Ranking de motivos ────────────────────────────────────────────────────
  const totalMotivos = Object.values(motivoTotais).reduce((s, v) => s + v, 0);
  const motivos = Object.entries(motivoTotais)
    .map(([key, total]) => ({
      key,
      label: MOTIVOS_LABELS[key],
      total,
      pct: totalMotivos > 0 ? (total / totalMotivos) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // ── 3. Diagnóstico por categoria ─────────────────────────────────────────────
  const catMap = {};
  rows.forEach((r) => {
    if (!catMap[r.categoria]) {
      catMap[r.categoria] = { categoria: r.categoria, total: 0, ...Object.fromEntries(MOTIVO_KEYS.map((k) => [k, 0])) };
    }
    catMap[r.categoria].total += r.reversas;
    MOTIVO_KEYS.forEach((k) => { catMap[r.categoria][k] += r[k]; });
  });
  const categorias = Object.values(catMap)
    .map((c) => ({
      ...c,
      pct: totalReversas > 0 ? (c.total / totalReversas) * 100 : 0,
      motivoDominante: MOTIVOS_LABELS[dominantMotivo(c)],
    }))
    .sort((a, b) => b.total - a.total);

  // ── 4. Ranking produtos pai ───────────────────────────────────────────────────
  // Group by skuPai (first 10 digits) — the canonical parent identifier
  const prodMap = {};
  rows.forEach((r) => {
    if (!prodMap[r.skuPai]) {
      prodMap[r.skuPai] = {
        nomePai: r.nomePai,
        skuPai: r.skuPai,
        total: 0,
        ...Object.fromEntries(MOTIVO_KEYS.map((k) => [k, 0])),
      };
    }
    prodMap[r.skuPai].total += r.reversas;
    MOTIVO_KEYS.forEach((k) => { prodMap[r.skuPai][k] += r[k]; });
  });
  const produtosPai = Object.values(prodMap)
    .map((p) => ({ ...p, motivoPrincipal: MOTIVOS_LABELS[dominantMotivo(p)] }))
    .sort((a, b) => b.total - a.total);

  // ── 5. Mapa de sizing ─────────────────────────────────────────────────────────
  const sizingMap = {};
  rows.forEach((r) => {
    if (!r.ficouGrande && !r.ficouPequeno) return;
    const tam = r.tamanho || '?';
    if (!VALID_SIZES.has(tam)) return;
    if (!sizingMap[tam]) sizingMap[tam] = { tamanho: tam, grande: 0, pequeno: 0 };
    sizingMap[tam].grande   += r.ficouGrande;
    sizingMap[tam].pequeno  += r.ficouPequeno;
  });
  const sizing = Object.values(sizingMap).sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.tamanho);
    const ib = SIZE_ORDER.indexOf(b.tamanho);
    if (ia === -1 && ib === -1) return a.tamanho.localeCompare(b.tamanho);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // ── 6 & 7. Cross with Eccosys vendas (optional) ──────────────────────────────
  let taxaDevolucao = null;
  let abcDevolucao = null;

  if (vendasMap) {
    // ── Prep ──────────────────────────────────────────────────────────────────
    // per-SKU qty from Eccosys (variant level)
    const vendasPorSku = {};
    Object.values(vendasMap).forEach(({ sku, qty }) => {
      vendasPorSku[sku] = (vendasPorSku[sku] || 0) + qty;
    });

    // per-skuPai total qty from Eccosys (parent level)
    const vendasPorPai = {};
    Object.values(vendasMap).forEach(({ sku, qty }) => {
      const pai = sku.slice(0, 10);
      vendasPorPai[pai] = (vendasPorPai[pai] || 0) + qty;
    });

    // Group TroqueCommerce rows by skuPai
    const trocasPorPai = {};
    rows.forEach((r) => {
      if (!trocasPorPai[r.skuPai]) {
        trocasPorPai[r.skuPai] = { nomePai: r.nomePai, skuPai: r.skuPai, tcRows: [] };
      }
      trocasPorPai[r.skuPai].tcRows.push(r);
    });

    // ── View 6 — Taxa de devolução com breakdown por tamanho ─────────────────
    taxaDevolucao = Object.values(trocasPorPai).map((pai) => {
      const tcSkus = new Set(pai.tcRows.map((r) => r.sku));

      // Denominator = ALL Eccosys sales for this skuPai (not just variants with returns)
      const totalReversas = pai.tcRows.reduce((s, r) => s + r.reversas, 0);
      const totalVendas   = vendasPorPai[pai.skuPai] || 0;
      const taxa          = totalVendas > 0 ? (totalReversas / totalVendas) * 100 : null;

      // Size breakdown
      const tamMap = {};

      // TroqueCommerce variants: reversas + their matching Eccosys sales
      pai.tcRows.forEach((r) => {
        const tam = r.tamanho || getSizeLabelFromSku(r.sku);
        if (!VALID_SIZES.has(tam)) return;
        if (!tamMap[tam]) tamMap[tam] = { tamanho: tam, reversas: 0, vendas: 0 };
        tamMap[tam].reversas += r.reversas;
        tamMap[tam].vendas   += vendasPorSku[r.sku] || 0;
      });

      // Eccosys-only variants (sales but 0 returns — not present in TroqueCommerce)
      Object.values(vendasMap).forEach(({ sku, qty }) => {
        if (sku.slice(0, 10) !== pai.skuPai || tcSkus.has(sku)) return;
        const tam = getSizeLabelFromSku(sku);
        if (!VALID_SIZES.has(tam)) return;
        if (!tamMap[tam]) tamMap[tam] = { tamanho: tam, reversas: 0, vendas: 0 };
        tamMap[tam].vendas += qty;
      });

      const tamanhos = Object.values(tamMap)
        .map((t) => ({ ...t, taxa: t.vendas > 0 ? (t.reversas / t.vendas) * 100 : null }))
        .sort((a, b) => (b.taxa ?? -1) - (a.taxa ?? -1));

      return { nomePai: pai.nomePai, skuPai: pai.skuPai, totalReversas, totalVendas, taxa, tamanhos };
    }).sort((a, b) => (b.taxa ?? -1) - (a.taxa ?? -1));

    // ── View 7 — ABC × devolução ──────────────────────────────────────────────
    const vendasArray = Object.entries(vendasPorPai).sort(([, a], [, b]) => b - a);
    const n = vendasArray.length;
    const abcMap = {};
    vendasArray.forEach(([skuPai], idx) => {
      const pct = (idx + 1) / n;
      abcMap[skuPai] = pct <= 0.20 ? 'A' : pct <= 0.65 ? 'B' : 'C';
    });

    const QUAD_ORDER = { crit: 0, atencao: 1, ok: 2, ruido: 3, normal: 4, invis: 5 };

    abcDevolucao = taxaDevolucao
      .map((p) => {
        const curva = abcMap[p.skuPai] ?? 'N/A';
        const alta  = p.taxa != null && p.taxa > 10;
        let quadrante;
        if      (curva === 'A' && alta)  quadrante = 'crit';
        else if (curva === 'A' && !alta) quadrante = 'ok';
        else if (curva === 'B' && alta)  quadrante = 'atencao';
        else if (curva === 'B' && !alta) quadrante = 'normal';
        else if (curva === 'C' && alta)  quadrante = 'ruido';
        else                             quadrante = 'invis';
        return { ...p, curva, quadrante };
      })
      .sort((a, b) => (QUAD_ORDER[a.quadrante] ?? 9) - (QUAD_ORDER[b.quadrante] ?? 9));
  }

  return { resumo, motivos, categorias, produtosPai, sizing, taxaDevolucao, abcDevolucao };
}
