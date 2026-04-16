/**
 * Parse TroqueCommerce "ProdutosMotivos" CSV
 * Separator: ;
 * Columns (0-indexed):
 *  0  SKU
 *  1  Descrição
 *  2  Total de Reversas
 *  3  Trocas
 *  4  Trocas por Produto
 *  5  Devoluções
 *  6  Valor das Trocas
 *  7  Valor das Trocas por Produto
 *  8  Valor das Devoluções
 *  9  Ficou grande
 *  10 Ficou pequeno
 *  11 Arrependimento
 *  12 Não gostei da qualidade
 *  13 Não gostei do produto
 */

function normSku(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).replace(/\.0$/, '').trim().padStart(12, '0');
}

/** Parse BR currency string "1.234,56" → 1234.56 */
function parseBRL(str) {
  if (!str && str !== 0) return 0;
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function parseNum(str) {
  return parseInt(String(str || '0').trim(), 10) || 0;
}

/** Minimal CSV line splitter that handles double-quoted fields */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Extract parent product name (Nome + Cor) and size from description.
 * Format: "Nome Produto Cor (Cor, Tamanho)"
 * Keeps "Nome Produto Cor" intact — only strips the parenthesised "(Cor, Tamanho)".
 * Example: "Calça Alfaiataria Valentina Preta (Preta, M)"
 *        → { nomePai: "Calça Alfaiataria Valentina Preta", tamanho: "M" }
 */
function extractInfo(desc) {
  const raw = String(desc || '').trim();
  const match = raw.match(/^(.+?)\s+\(([^,]+),\s*([^)]+)\)\s*$/);
  if (match) {
    const nomePai = match[1].trim(); // "Calça Alfaiataria Valentina Preta"
    const tamanho = match[3].trim(); // "M"
    return { nomePai, tamanho };
  }
  // Fallback: strip any trailing parenthesised segment
  return { nomePai: raw.replace(/\s*\([^)]+\)\s*$/, '').trim() || raw, tamanho: '' };
}

export function detectCategoria(nomePai) {
  const n = nomePai.toLowerCase();
  if (n.includes('calça') || n.includes('calca')) return 'Calça';
  if (n.includes('vestido')) return 'Vestido';
  if (n.includes('blazer')) return 'Blazer';
  if (n.includes('conjunto')) return 'Conjunto';
  if (n.includes('camisa')) return 'Camisa';
  if (n.includes('colete')) return 'Colete';
  if (n.includes('jaqueta')) return 'Jaqueta';
  if (n.includes('shorts') || n.includes('bermuda')) return 'Shorts';
  if (n.includes('saia')) return 'Saia';
  if (n.includes('blusa') || n.includes('top') || n.includes('cropped')) return 'Blusa';
  return 'Outros';
}

export async function parseTroqueCommerce(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const rows = [];
        // Skip header row
        lines.slice(1).forEach((line) => {
          const cols = parseCSVLine(line);
          if (cols.length < 9) return;
          const rawSku = cols[0];
          if (!rawSku) return;
          const sku = normSku(rawSku);
          const desc = cols[1];
          const { nomePai, tamanho } = extractInfo(desc);
          rows.push({
            sku,
            skuPai: sku.slice(0, 10),
            desc,
            nomePai,
            tamanho,
            categoria: detectCategoria(nomePai),
            reversas:        parseNum(cols[2]),
            trocas:          parseNum(cols[3]),
            trocasProd:      parseNum(cols[4]),
            devolucoes:      parseNum(cols[5]),
            valorTrocas:     parseBRL(cols[6]),
            valorTrocasProd: parseBRL(cols[7]),
            valorDevolucoes: parseBRL(cols[8]),
            ficouGrande:     parseNum(cols[9]),
            ficouPequeno:    parseNum(cols[10]),
            arrependimento:  parseNum(cols[11]),
            qualidade:       parseNum(cols[12]),
            produto:         parseNum(cols[13]),
          });
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    // Try UTF-8; Windows exports may be latin-1 but most modern tools use UTF-8
    reader.readAsText(file, 'utf-8');
  });
}
