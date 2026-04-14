import { useState, useMemo } from 'react';

const CURVA_COLORS = {
  A: '#16a34a',
  'B+': '#2563eb',
  'B-': '#7c3aed',
  'C+': '#d97706',
  'C-': '#dc2626',
};

const URGENCIA_COLORS = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#2563eb',
};

const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG',
  '36', '38', '40', '42', '44', '46', '48', '50', '52'];

const SIZE_LABELS = {
  '01': 'PP', '02': 'PP', '03': 'P', '04': 'M', '05': 'G',
  '06': 'GG', '07': 'XG', '08': 'XXG',
  '09': '36', '10': '38', '11': '40', '12': '42',
  '13': '44', '14': '46', '15': '48', '16': '50', '17': '52',
};

function sizeLabel(code) {
  return SIZE_LABELS[code] || code;
}

const fmt = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtN = (n, d = 2) => Number(n).toFixed(d);

const COLUMNS = [
  { key: 'nome', label: 'Produto', sortable: true },
  { key: 'curva', label: 'Curva', sortable: true },
  { key: 'dPlus', label: 'D+', sortable: true },
  { key: 'velocidade', label: 'Vel. (pç/dia)', sortable: true },
  { key: 'saidas', label: 'Saídas', sortable: true },
  { key: 'saldoFinal', label: 'Estoque', sortable: true },
  { key: 'totalVendas', label: 'Receita', sortable: true },
  { key: 'remarcacao', label: 'Remarcação', sortable: false },
];

const CURVA_OPTIONS = ['Todas', 'A', 'B+', 'B-', 'C+', 'C-'];
const URGENCIA_OPTIONS = ['Todos', 'Remarcar agora', 'Sem recomendação'];

export default function ABCTable({ data }) {
  const [sort, setSort] = useState({ key: 'velocidade', dir: 'desc' });
  const [expand, setExpand] = useState({});
  const [filterCurva, setFilterCurva] = useState('Todas');
  const [filterMarca, setFilterMarca] = useState('Todos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const toggleSort = (key) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const toggleExpand = (sku) => setExpand((e) => ({ ...e, [sku]: !e[sku] }));

  const filtered = useMemo(() => {
    let rows = [...data];
    if (filterCurva !== 'Todas') rows = rows.filter((r) => r.curva === filterCurva);
    if (filterMarca === 'Remarcar agora') rows = rows.filter((r) => r.remarcacao);
    if (filterMarca === 'Sem recomendação') rows = rows.filter((r) => !r.remarcacao);
    if (search) rows = rows.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()) || r.skuPai.includes(search));
    rows.sort((a, b) => {
      const av = a[sort.key] ?? 0;
      const bv = b[sort.key] ?? 0;
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [data, sort, filterCurva, filterMarca, search]);

  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const SortIcon = ({ col }) => {
    if (sort.key !== col) return <span className="sort-icon neutral">↕</span>;
    return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="table-section">
      {/* Filtros */}
      <div className="filters">
        <input
          className="search-input"
          placeholder="Buscar produto ou SKU..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="filter-group">
          <label>Curva</label>
          <select value={filterCurva} onChange={(e) => { setFilterCurva(e.target.value); setPage(1); }}>
            {CURVA_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filterMarca} onChange={(e) => { setFilterMarca(e.target.value); setPage(1); }}>
            {URGENCIA_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <span className="results-count">{filtered.length} SKUs</span>
      </div>

      {/* Tabela */}
      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th className="col-expand" />
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <>
                <tr key={row.skuPai} className={`row-main ${expand[row.skuPai] ? 'expanded' : ''}`}>
                  <td className="col-expand">
                    <button className="expand-btn" onClick={() => toggleExpand(row.skuPai)}>
                      {expand[row.skuPai] ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="col-nome">
                    <div className="sku-name">{row.nome}</div>
                    <div className="sku-code">{row.skuPai}</div>
                  </td>
                  <td>
                    <span
                      className="curva-badge"
                      style={{ background: CURVA_COLORS[row.curva] }}
                    >
                      {row.curva}
                    </span>
                  </td>
                  <td>
                    <span className={`dplus ${row.dPlus >= 60 ? 'dplus-critical' : row.dPlus >= 30 ? 'dplus-warn' : ''}`}>
                      {row.dPlus ?? '—'}d
                    </span>
                  </td>
                  <td>{fmtN(row.velocidade, 3)}</td>
                  <td>{row.saidas}</td>
                  <td>{row.saldoFinal}</td>
                  <td>{fmt(row.totalVendas)}</td>
                  <td>
                    {row.remarcacao ? (
                      <span
                        className="remarcacao-badge"
                        style={{ background: URGENCIA_COLORS[row.remarcacao.urgencia] }}
                      >
                        {row.remarcacao.label}
                      </span>
                    ) : (
                      <span className="remarcacao-ok">—</span>
                    )}
                  </td>
                </tr>
                {expand[row.skuPai] && (
                  <tr key={`${row.skuPai}-expand`} className="row-expand">
                    <td colSpan={9}>
                      <div className="expand-panel">
                        <div className="expand-title">Breakdown por tamanho</div>
                        <div className="size-grid">
                          {Object.entries(row.tamanhos)
                            .sort(([a], [b]) => {
                              const la = sizeLabel(a), lb = sizeLabel(b);
                              const ia = SIZE_ORDER.indexOf(la), ib = SIZE_ORDER.indexOf(lb);
                              return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                            })
                            .map(([cod, tam]) => (
                              <div key={cod} className="size-card">
                                <div className="size-label">{sizeLabel(cod)}</div>
                                <div className="size-stat">
                                  <span>Saídas</span>
                                  <strong>{tam.saidas}</strong>
                                </div>
                                <div className="size-stat">
                                  <span>Estoque</span>
                                  <strong>{tam.saldoFinal}</strong>
                                </div>
                                {tam.dPlus && (
                                  <div className="size-stat">
                                    <span>D+</span>
                                    <strong className={tam.dPlus >= 60 ? 'dplus-critical' : tam.dPlus >= 30 ? 'dplus-warn' : ''}>
                                      {tam.dPlus}d
                                    </strong>
                                  </div>
                                )}
                                {tam.saldoFinal === 0 && tam.saidas > 0 && (
                                  <div className="size-repor">Repor?</div>
                                )}
                              </div>
                            ))}
                        </div>
                        {(row.trocas > 0 || row.devolucoes > 0) && (
                          <div className="devolucao-info">
                            <span>Reversas: <strong>{row.reversas}</strong></span>
                            <span>Trocas: <strong>{row.trocas}</strong></span>
                            <span>Devoluções: <strong>{row.devolucoes}</strong></span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      )}
    </div>
  );
}
