const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', '48', '50'];

/**
 * Monta o array de itens com taxa de devolução e categoria.
 * @param {Object} motivosMap  — resultado de parseMotivosCsv
 * @param {Object|null} vendasMap — resultado de parseVendasXls (ou null se não fornecido)
 */
export function buildDevolucaoData(motivosMap, vendasMap = null) {
  return Object.values(motivosMap).map(entry => {
    const vendas = vendasMap !== null ? (vendasMap[entry.skuPai] ?? 0) : null;
    const amostaPequena = vendas !== null && vendas < 2;
    const taxa = vendas !== null && vendas > 0 ? (entry.reversas / vendas) * 100 : null;

    // Ordena tamanhos por SIZE_ORDER
    const tam = {};
    SIZE_ORDER.forEach(s => { if (entry.tamanhos[s]) tam[s] = entry.tamanhos[s]; });
    Object.keys(entry.tamanhos).forEach(s => { if (!tam[s]) tam[s] = entry.tamanhos[s]; });

    // Categoria = primeira palavra com >2 chars no nome do produto
    const words = (entry.nome || '').split(' ');
    const categoria = words.find(w => w.length > 2) || words[0] || 'Outros';

    return { ...entry, tamanhos: tam, vendas, taxa, amostaPequena, categoria };
  });
}

/** Soma todos os motivos do dataset */
export function buildMotivosTotais(items) {
  const t = { ficouGrande: 0, ficouPequeno: 0, arrependimento: 0, qualidade: 0, produto: 0, demora: 0 };
  items.forEach(i => {
    t.ficouGrande     += i.ficouGrande;
    t.ficouPequeno    += i.ficouPequeno;
    t.arrependimento  += i.arrependimento;
    t.qualidade       += i.qualidade;
    t.produto         += i.produto;
    t.demora          += i.demora;
  });
  return t;
}

/** Agrega por categoria */
export function buildCategoriaData(items) {
  const map = {};
  items.forEach(item => {
    const cat = item.categoria;
    if (!map[cat]) map[cat] = {
      categoria: cat, produtos: 0,
      reversas: 0, trocas: 0, devolucoes: 0, valor: 0,
      vendas: 0, temVendas: false,
    };
    const c = map[cat];
    c.produtos++;
    c.reversas     += item.reversas;
    c.trocas       += item.trocas;
    c.devolucoes   += item.devolucoes;
    c.valor        += item.valor;
    if (item.vendas !== null) { c.vendas += item.vendas; c.temVendas = true; }
  });
  return Object.values(map).sort((a, b) => b.reversas - a.reversas);
}

/**
 * Ordena itens para a aba Taxa de Devolução:
 * 1. Taxa calculada (vendas >= 2) → desc por taxa
 * 2. Amostra pequena (vendas < 2) → desc por reversas
 * 3. Sem dados de vendas → desc por reversas
 */
export function sortTaxaItems(items) {
  const grupo1 = items.filter(i => i.taxa !== null && !i.amostaPequena).sort((a, b) => b.taxa - a.taxa);
  const grupo2 = items.filter(i => i.amostaPequena).sort((a, b) => b.reversas - a.reversas);
  const grupo3 = items.filter(i => i.vendas === null).sort((a, b) => b.reversas - a.reversas);
  return [...grupo1, ...grupo2, ...grupo3];
}
