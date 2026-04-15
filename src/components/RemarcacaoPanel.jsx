import { useMemo } from 'react';

const DISPLAY_DISCOUNTS = [15, 20, 30, 40, 50];
const CSV_DISCOUNTS     = [10, 20, 30, 40, 50, 60, 70];

/**
 * Retorna quais percentuais de desconto são relevantes para exibir
 * conforme a régua curva × D+.
 * Retorna null quando é "liquidar/liquidação" sem preço sugerido.
 */
function descontosRelevantesPct(curva, dPlus) {
  const isB = curva === 'B+' || curva === 'B-';
  const isC = curva === 'C+' || curva === 'C-';
  if (isB) {
    if (dPlus >= 120) return [30];
    if (dPlus >= 90)  return [20, 30];
    if (dPlus >= 60)  return [15, 20];
  }
  if (isC) {
    if (dPlus >= 120) return null;
    if (dPlus >= 90)  return [40, 50];
    if (dPlus >= 60)  return [30, 40];
    if (dPlus >= 45)  return [15, 20];
  }
  return [];
}

/** Texto descritivo do status de remarcação para uso no CSV e na UI. */
function statusRemarcacao(item) {
  const { curva, dPlus, remarcacao } = item;
  if (curva === 'Aguardando' || dPlus == null || dPlus < 30)
    return 'Aguardando dados (D+ < 30)';
  if (curva === 'A+' || curva === 'A-')
    return 'Curva A — não remarcar';
  if (remarcacao)
    return 'Elegível agora';
  const threshold = (curva === 'B+' || curva === 'B-') ? 60 : 45;
  return `Aguarda ${threshold - dPlus} dias`;
}

const fmt = (n) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
    : '—';

function precoComDesconto(preco, pct) {
  if (!preco || !Number.isFinite(preco)) return null;
  return preco * (1 - pct / 100);
}

function fmtBRL(n) {
  return n != null && Number.isFinite(n)
    ? String(n.toFixed(2)).replace('.', ',')
    : '';
}

/** Exporta TODOS os produtos com as colunas completas. */
function exportarCSV(allData) {
  const header = [
    'SKU',
    'Produto',
    'Curva',
    'D+',
    'Vel. (pç/dia)',
    'Saídas',
    'Estoque',
    'Receita',
    'Status Remarcação',
    'Preço Atual',
    '-10%', '-20%', '-30%', '-40%', '-50%', '-60%', '-70%',
  ];

  const csvRows = [header.join(';')];

  const sorted = [...allData].sort((a, b) => (b.dPlus ?? 0) - (a.dPlus ?? 0));

  sorted.forEach((item) => {
    const precoAtual = item.qtyVendas > 0 ? item.totalVendas / item.qtyVendas : null;
    const cells = [
      item.skuPai,
      `"${(item.nome ?? '').replace(/"/g, '""')}"`,
      item.curva,
      item.dPlus ?? '',
      item.velocidade != null ? item.velocidade.toFixed(3).replace('.', ',') : '',
      item.saidas,
      item.saldoFinal,
      fmtBRL(item.totalVendas),
      statusRemarcacao(item),
      fmtBRL(precoAtual),
      ...CSV_DISCOUNTS.map((pct) => fmtBRL(precoComDesconto(precoAtual, pct))),
    ];
    csvRows.push(cells.join(';'));
  });

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `remarcacao_itlook_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RemarcacaoPanel({ data }) {
  const rows = useMemo(() => {
    return data
      .filter((item) => item.remarcacao !== null)
      .map((item) => {
        const precoAtual =
          item.qtyVendas > 0 ? item.totalVendas / item.qtyVendas : null;
        const descontos = descontosRelevantesPct(item.curva, item.dPlus);
        return { ...item, precoAtual, descontos };
      })
      .sort((a, b) => (b.dPlus ?? 0) - (a.dPlus ?? 0));
  }, [data]);

  return (
    <div className="remarcacao-panel">
      <div className="remarcacao-header">
        <div className="section-title">
          Remarcação
          {rows.length > 0 && <span className="badge-count">{rows.length} produtos</span>}
        </div>
        <button className="btn-export" onClick={() => exportarCSV(data)}>
          Exportar CSV
        </button>
      </div>

      {rows.length === 0 && (
        <div className="remarcacao-empty">
          Nenhum produto atingiu os thresholds de remarcação ainda.
          <span> (mín. D+45 para Curva C · D+60 para Curva B)</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-wrapper">
          <table className="abc-table remarcacao-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Preço Atual</th>
                <th>D+</th>
                <th>Curva</th>
                <th className="price-col">-15%</th>
                <th className="price-col">-20%</th>
                <th className="price-col">-30%</th>
                <th className="price-col">-40%</th>
                <th className="price-col">-50%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.skuPai}>
                  <td><span className="sku-code">{row.skuPai}</span></td>
                  <td className="col-nome"><span className="sku-name">{row.nome}</span></td>
                  <td>{fmt(row.precoAtual)}</td>
                  <td>
                    <span className={`dplus ${row.dPlus >= 120 ? 'dplus-critical' : row.dPlus >= 60 ? 'dplus-warn' : ''}`}>
                      {row.dPlus}d
                    </span>
                  </td>
                  <td>
                    <span className="remarcacao-badge" style={{ background: CURVA_BG[row.curva] }}>
                      {row.curva}
                    </span>
                  </td>
                  {DISPLAY_DISCOUNTS.map((pct) => {
                    const isLiquidar = row.descontos === null;
                    if (isLiquidar) {
                      return (
                        <td key={pct} className="price-col liq-cell">
                          {pct === 30 ? <span className="liq-badge">Liquidar</span> : '—'}
                        </td>
                      );
                    }
                    const relevant = row.descontos?.includes(pct);
                    const preco = relevant ? precoComDesconto(row.precoAtual, pct) : null;
                    return (
                      <td key={pct} className={`price-col ${relevant ? 'price-relevant' : 'price-na'}`}>
                        {relevant && preco != null ? fmt(preco) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const CURVA_BG = {
  'A+': '#15803d', 'A-': '#16a34a',
  'B+': '#2563eb', 'B-': '#7c3aed',
  'C+': '#d97706', 'C-': '#dc2626',
};
