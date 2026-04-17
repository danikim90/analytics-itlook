import * as XLSX from 'xlsx';

/** Normaliza SKU: remove .0, garante string de 12 dígitos */
function normSku(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return raw.toString().replace(/\.0$/, '').trim().padStart(12, '0');
}

/** SKU pai = primeiros 10 dígitos */
export function skuPai(sku) {
  return normSku(sku).slice(0, 10);
}

/**
 * Converte qualquer valor de célula em número.
 * Tolera:
 *   - número JS puro              → 1234
 *   - string plain                → "1234"  → 1234
 *   - string decimal com ponto    → "1234.5" → 1234.5
 *   - string BR com vírgula       → "1234,5" → 1234.5
 *   - string BR com milhar+decimal → "1.234,50" → 1234.5
 * Retorna 0 para qualquer valor que não parse.
 */
function toNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = val.toString().trim().replace(/\s/g, '');
  if (s === '') return 0;
  // Tenta parse direto primeiro (cobre "1234" e "1234.5")
  const direct = parseFloat(s);
  if (!isNaN(direct) && !s.includes(',')) return direct;
  // Formato BR: "1.234,56" → remove pontos de milhar, troca vírgula por ponto
  const br = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(br) ? 0 : br;
}

/**
 * SKU válido = exatamente 12 dígitos e ao menos um não-zero.
 * Descarta linhas de cabeçalho ("SKU", "Descrição", etc.) que normSku
 * transformaria em strings contendo letras.
 */
function isValidSku(sku) {
  return /^\d{12}$/.test(sku) && sku !== '000000000000';
}

/** Parse de data no formato DD/MM/YYYY */
function parseDateBR(str) {
  if (!str) return null;
  const [d, m, y] = String(str).split('/');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Lê a primeira planilha do XLS/XLSX e devolve array de arrays.
 * Opções escolhidas para máxima compatibilidade com os exports do Eccosys:
 *   - type:'array'   → aceita ArrayBuffer diretamente (não depende de codificação)
 *   - cellDates:false → datas ficam como serial number, evita conversão errada
 *   - cellNF:false    → não carrega string de formato numérico, reduz overhead
 *   - cellText:false  → não gera .w (texto formatado), usa apenas .v (valor raw)
 *   - raw:true        → sheet_to_json devolve valores brutos (.v), não formatados
 */
function readSheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, {
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellText: false,
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          raw: true,       // retorna .v (número JS), não string formatada
          blankrows: false, // ignora linhas completamente vazias
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ─── Parsers dos 3 relatórios ─────────────────────────────────── */

/**
 * Relatorio_Geral_de_Vendas.xls
 * Colunas esperadas: SKU | Descrição | Total R$ | Qtd Vendida
 */
export async function parseVendas(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const sku = normSku(r[0]);
    if (!isValidSku(sku)) return;
    const desc  = String(r[1] || '');
    const total = toNum(r[2]);
    const qty   = toNum(r[3]);
    if (!map[sku]) map[sku] = { sku, desc, total: 0, qty: 0 };
    map[sku].total += total;
    map[sku].qty   += qty;
  });
  return map;
}

/**
 * Relatorio_de_Entradas_e_Saidas.xls
 * Colunas esperadas: SKU | Descrição | Saldo Inicial | Entradas | Saídas | Saldo Final
 */
export async function parseEstoque(file) {
  const rows = await readSheet(file);

  // ── DEBUG TEMPORÁRIO ──────────────────────────────────────────
  console.group('📦 parseEstoque — diagnóstico SheetJS');
  console.log('Total de linhas lidas:', rows.length);
  console.log('Linha 0 (raw):', rows[0]);
  console.log('Linha 1 (raw):', rows[1]);
  console.log('Linha 2 (raw):', rows[2]);
  const headerRow = rows[0] ?? [];
  console.log('Colunas detectadas (linha 0):', headerRow.map((v, i) => `[${i}] ${JSON.stringify(v)}`).join(' | '));
  const firstData = rows[1] ?? [];
  console.log('Célula [4] da linha 1 (esperado: Saídas):', JSON.stringify(firstData[4]), '— tipo:', typeof firstData[4]);
  console.log('Célula [5] da linha 1 (esperado: Saldo Final):', JSON.stringify(firstData[5]), '— tipo:', typeof firstData[5]);
  console.groupEnd();
  // ── FIM DEBUG ─────────────────────────────────────────────────

  const map = {};
  rows.slice(1).forEach((r) => {
    const sku = normSku(r[0]);
    if (!isValidSku(sku)) return;
    const desc         = String(r[1] || '');
    const saldoInicial = toNum(r[2]);
    const entradas     = toNum(r[3]);
    const saidas       = toNum(r[4]);
    const saldoFinal   = toNum(r[5]);
    if (!map[sku]) map[sku] = { sku, desc, saldoInicial: 0, entradas: 0, saidas: 0, saldoFinal: 0 };
    map[sku].saldoInicial += saldoInicial;
    map[sku].entradas     += entradas;
    map[sku].saidas       += saidas;
    map[sku].saldoFinal   += saldoFinal;
  });
  return map;
}

/**
 * Saldos_Em_Estoque.xls
 * Colunas esperadas: Nome | ? | SKU | ? | Data Criação | Preço Custo | Qtd | Qtd Disp
 */
export async function parseSaldos(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const nome = String(r[0] || '');
    const sku  = normSku(r[2]);
    if (!isValidSku(sku)) return;
    const dataCriacao = parseDateBR(r[4]);
    const precoCusto  = toNum(r[5]);
    const qty         = toNum(r[6]);
    const qtyDisp     = toNum(r[7]);
    map[sku] = { sku, nome, dataCriacao, precoCusto, qty, qtyDisp };
  });
  return map;
}

/**
 * ProdutosMotivos — mantido para compatibilidade, mas Módulo 2
 * usa parseDevolucoes.js que lê o CSV do TroqueCommerce.
 */
export async function parseMotivos(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const sku  = normSku(r[0]);
    if (!isValidSku(sku)) return;
    const desc          = String(r[1] || '');
    const reversas      = toNum(r[2]);
    const trocas        = toNum(r[3]);
    const devolucoes    = toNum(r[5]);
    const valor         = toNum(r[6]);
    const ficouGrande   = toNum(r[9]);
    const ficouPequeno  = toNum(r[10]);
    const arrependimento = toNum(r[11]);
    const qualidade     = toNum(r[12]);
    const produto       = toNum(r[13]);
    const demora        = toNum(r[14]);
    map[sku] = { sku, desc, reversas, trocas, devolucoes, valor,
      ficouGrande, ficouPequeno, arrependimento, qualidade, produto, demora };
  });
  return map;
}
