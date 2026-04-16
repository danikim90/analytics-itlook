import { useState } from 'react';

const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

export default function RankingProdutos({ produtos }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? produtos.filter((p) => p.nomePai.toLowerCase().includes(search.toLowerCase()))
    : produtos;

  return (
    <div className="m2-section">
      <div className="section-title" style={{ marginBottom: 16 }}>
        Ranking de Produtos com Problema
      </div>
      <div className="filters">
        <input
          className="search-input"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="results-count">{filtered.length} produtos</span>
      </div>
      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th>Produto Pai</th>
              <th>Total</th>
              <th>Ficou Grande</th>
              <th>Ficou Pequeno</th>
              <th>Arrependimento</th>
              <th>Qualidade</th>
              <th>Produto</th>
              <th>Motivo Principal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.nomePai} className="row-main">
                <td className="col-nome">
                  <div className="sku-name">{p.nomePai}</div>
                  <div className="sku-code">{p.skuPai}</div>
                </td>
                <td><strong>{fmtN(p.total)}</strong></td>
                <td>{p.ficouGrande    || '—'}</td>
                <td>{p.ficouPequeno   || '—'}</td>
                <td>{p.arrependimento || '—'}</td>
                <td>{p.qualidade      || '—'}</td>
                <td>{p.produto        || '—'}</td>
                <td><span className="motivo-badge">{p.motivoPrincipal}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
