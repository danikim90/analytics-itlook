import * as XLSX from 'xlsx';

const VALID_SIZES = new Set(['P', 'M', 'G', 'GG', '36', '38', '40', '42', '44']);

function normSku(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).replace(/\.0$/, '').trim().padStart(12, '0');
}

function skuPaiOf(sku) {
  return normSku(sku).slice(0, 10);
}

/**
 * Extrai tamanho e nome-pai da descrição.
 * Formato esperado: "Nome do Produto (Cor, Tamanho)"
 * Nome-pai = tudo antes do parêntese (mantém cor).
 * Tamanho aceito: apenas os do VALID_SIZES.
 */
function extractSizeAndName(desc) {
  const parenMatch = desc.match(/\s*\(([^)]+)\)\s*$/);
  let size = null;
  let nomePai = desc.trim();
  if (parenMatch) {
    nomePai = desc.slice(0, parenMatch.index).trim();
    const parts = parenMatch[1].split(',').map(s => s.trim());
    for (const part of parts) {
      if (VALID_SIZES.has(part)) { size = part; break; }
    }
  }
  return { nomePai, size };
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ';' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function pNum(v) {
  return Number(String(v ?? 0).replace(',', '.')) || 0;
}

function emptyEntry(pai, nome) {
  return {
    skuPai: pai, nome,
    reversas: 0, trocas: 0, devolucoes: 0, valor: 0,
    ficouGrande: 0, ficouPequeno: 0, arrependimento: 0,
    qualidade: 0, produto: 0, demora: 0,
    tamanhos: {},
  };
}

function emptyTam() {
  return {
    reversas: 0, trocas: 0, devolucoes: 0,
    ficouGrande: 0, ficouPequeno: 0, arrependimento: 0,
    qualidade: 0, produto: 0, demora: 0,
  };
}

function acumular(target, cols) {
  target.reversas     += pNum(cols[2]);
  target.trocas       += pNum(cols[3]);
  // cols[4] = campo extra (ignorado)
  target.devolucoes   += pNum(cols[5]);
  target.valor        += pNum(cols[6]);
  // cols[7], cols[8] = outros campos (ignorados)
  target.ficouGrande  += pNum(cols[9]);
  target.ficouPequeno += pNum(cols[10]);
  target.arrependimento += pNum(cols[11]);
  target.qualidade    += pNum(cols[12]);
  target.produto      += pNum(cols[13]);
  target.demora       += pNum(cols[14]);
}

/** Parse do TroqueCommerce ProdutosMotivos.csv (separador ;) */
export async function parseMotivosCsv(file) {
  const text = await file.text();
  const cleaned = text.replace(/^\uFEFF/, ''); // remove BOM
  const lines = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = {};

  lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    const cols = parseCsvLine(line);
    const sku = normSku(cols[0]);
    if (!sku || sku === '000000000000') return;

    const desc = String(cols[1] || '').trim();
    const { nomePai, size } = extractSizeAndName(desc);
    const pai = skuPaiOf(sku);

    if (!result[pai]) result[pai] = emptyEntry(pai, nomePai);
    const entry = result[pai];

    // Prefere o nome mais descritivo
    if (nomePai && nomePai.length > (entry.nome || '').length) entry.nome = nomePai;

    acumular(entry, cols);

    if (size) {
      if (!entry.tamanhos[size]) entry.tamanhos[size] = emptyTam();
      acumular(entry.tamanhos[size], cols);
    }
  });

  return result;
}

/** Parse do Eccosys Relatório Geral de Vendas (.xls/.xlsx) — opcional */
export async function parseVendasXls(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const map = {};
        rows.slice(1).forEach(r => {
          const sku = normSku(r[0]);
          if (!sku || sku === '000000000000') return;
          const qty = Number(r[3]) || 0;
          const pai = sku.slice(0, 10);
          map[pai] = (map[pai] || 0) + qty;
        });
        resolve(map);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
