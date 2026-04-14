import * as XLSX from 'xlsx';

/** Normaliza SKU: remove .0, garante string de 12 dígitos */
function normSku(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).replace(/\.0$/, '').trim().padStart(12, '0');
}

/** SKU pai = primeiros 10 dígitos */
export function skuPai(sku) {
  return normSku(sku).slice(0, 10);
}

/** Parse de data no formato DD/MM/YYYY */
function parseDateBR(str) {
  if (!str) return null;
  const [d, m, y] = String(str).split('/');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function readSheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parseVendas(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const sku = normSku(r[0]);
    if (!sku) return;
    const desc = String(r[1] || '');
    const total = Number(r[2]) || 0;
    const qty = Number(r[3]) || 0;
    if (!map[sku]) map[sku] = { sku, desc, total: 0, qty: 0 };
    map[sku].total += total;
    map[sku].qty += qty;
  });
  return map;
}

export async function parseEstoque(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const sku = normSku(r[0]);
    if (!sku) return;
    const desc = String(r[1] || '');
    const saldoInicial = Number(r[2]) || 0;
    const entradas = Number(r[3]) || 0;
    const saidas = Number(r[4]) || 0;
    const saldoFinal = Number(r[5]) || 0;
    if (!map[sku]) map[sku] = { sku, desc, saldoInicial: 0, entradas: 0, saidas: 0, saldoFinal: 0 };
    map[sku].saldoInicial += saldoInicial;
    map[sku].entradas += entradas;
    map[sku].saidas += saidas;
    map[sku].saldoFinal += saldoFinal;
  });
  return map;
}

export async function parseSaldos(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const nome = String(r[0] || '');
    const sku = normSku(r[2]);
    if (!sku) return;
    const dataCriacao = parseDateBR(r[4]);
    const precoCusto = parseFloat(String(r[5] || '0').replace(',', '.')) || 0;
    const qty = Number(r[6]) || 0;
    const qtyDisp = Number(r[7]) || 0;
    map[sku] = { sku, nome, dataCriacao, precoCusto, qty, qtyDisp };
  });
  return map;
}

export async function parseMotivos(file) {
  const rows = await readSheet(file);
  const map = {};
  rows.slice(1).forEach((r) => {
    const sku = normSku(r[0]);
    if (!sku) return;
    const desc = String(r[1] || '');
    const reversas = Number(r[2]) || 0;
    const trocas = Number(r[3]) || 0;
    const devolucoes = Number(r[5]) || 0;
    const valor = Number(r[6]) || 0;
    const ficouGrande = Number(r[9]) || 0;
    const ficouPequeno = Number(r[10]) || 0;
    const arrependimento = Number(r[11]) || 0;
    const qualidade = Number(r[12]) || 0;
    const produto = Number(r[13]) || 0;
    const demora = Number(r[14]) || 0;
    map[sku] = { sku, desc, reversas, trocas, devolucoes, valor, ficouGrande, ficouPequeno, arrependimento, qualidade, produto, demora };
  });
  return map;
}
