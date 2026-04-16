import { useState, useMemo } from 'react';

const fmtN   = (n) => new Intl.NumberFormat('pt-BR').format(n);
const fmtPct = (n) => (n != null ? `${n.toFixed(1)}%` : '—');

const MIN_VENDAS = 2;

function TaxaCell({ taxa, vendas, altaThreshold }) {
  if (vendas < MIN_VENDAS) {
    return <span className="taxa-pequena">⚠️ amostra pequena</span>;
  }
  return (
    <span className={`taxa-badge ${taxa != null && taxa > altaThreshold ? 'taxa-alta' : ''}`}>
      {fmtPct(taxa)}
    </span>
  );
}

const COLS = [
  { key: 'nomePai',      label: 'Produto Pai' },
  { key: 'totalReversas', label: 'Reversas' },
  { key: 'totalVendas',  label: 'Vendas no Período' },
  { key: 'taxa',         label: 'Taxa %' },
];

function SortIcon({ colKey, sort }) {
  if (sort.key !== colKey) return <span className="sort-icon neutral">↕</span>;
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function TaxaDevolucao({ taxa }) {
  const [expand, setExpand] = useState({});
  const [sort, setSort] = useState({ key: 'taxa', dir: 'desc' });

  const toggle = (key) => setExpand((e) => ({ ...e, [key]: !e[key] }));

  const toggleSort = (key) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const sorted = useMemo(() => {
    return [...taxa].sort((a, b) => {
      let av, bv;
      if (sort.key === 'nomePai') {
        av = a.nomePai ?? '';
        bv = b.nomePai ?? '';
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      // Numeric columns
      if (sort.key === 'taxa') {
        // "amostra pequena" and null taxa always go last, regardless of direction
        const nullLast = sort.dir === 'asc' ? Infinity : -Infinity;
        av = a.totalVendas < MIN_VENDAS ? nullLast : (a.taxa ?? nullLast);
        bv = b.totalVendas < MIN_VENDAS ? nullLast : (b.taxa ?? nullLast);
      } else {
        av = a[sort.key] ?? 0;
        bv = b[sort.key] ?? 0;
      }
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [taxa, sort]);

  return (
    <div>
      <h2 className="m2-page-title">Taxa de Devolução por Produto</h2>
      <p className="m2-page-subtitle">
        Reversas ÷ vendas por produto pai. Destaque vermelho para tamanhos com taxa acima de 20%.
        <br />
        <span style={{ fontSize: 12 }}>
          ⚠️ indica produtos com poucas vendas no período — taxa pode não ser representativa.
        </span>
      </p>

      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th className="col-expand" />
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className="sortable"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <SortIcon colKey={col.key} sort={sort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <>
                <tr
                  key={p.skuPai}
                  className={`row-main ${expand[p.skuPai] ? 'expanded' : ''}`}
                >
                  <td className="col-expand">
                    <button className="expand-btn" onClick={() => toggle(p.skuPai)}>
                      {expand[p.skuPai] ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="col-nome">
                    <div className="sku-name">{p.nomePai}</div>
                    <div className="sku-code">{p.skuPai}</div>
                  </td>
                  <td>{fmtN(p.totalReversas)}</td>
                  <td>{p.totalVendas > 0 ? fmtN(p.totalVendas) : '—'}</td>
                  <td>
                    <TaxaCell taxa={p.taxa} vendas={p.totalVendas} altaThreshold={10} />
                  </td>
                </tr>

                {expand[p.skuPai] && (
                  <tr key={`${p.skuPai}-exp`} className="row-expand">
                    <td colSpan={5}>
                      <div className="expand-panel">
                        <div className="expand-title">Breakdown por tamanho</div>
                        <table className="abc-table" style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th>Tamanho</th>
                              <th>Reversas</th>
                              <th>Vendas</th>
                              <th>Taxa %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.tamanhos.map((t) => (
                              <tr key={t.tamanho} className="row-main">
                                <td><strong>{t.tamanho}</strong></td>
                                <td>{t.reversas || '—'}</td>
                                <td>{t.vendas > 0 ? fmtN(t.vendas) : '—'}</td>
                                <td>
                                  <TaxaCell taxa={t.taxa} vendas={t.vendas} altaThreshold={20} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
