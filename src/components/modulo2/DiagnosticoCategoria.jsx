const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

export default function DiagnosticoCategoria({ categorias }) {
  return (
    <div>
      <h2 className="m2-page-title">Por Categoria</h2>
      <p className="m2-page-subtitle">
        Reversas agrupadas por categoria de produto. Confirma o pivot estratégico e indica
        onde concentrar ação de produto e grade.
      </p>

      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Total Reversas</th>
              <th>% do Total</th>
              <th>Motivo Dominante</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.categoria} className="row-main">
                <td><span className="sku-name">{c.categoria}</span></td>
                <td><strong>{fmtN(c.total)}</strong></td>
                <td>
                  <span className="m2-pct-bar-wrap">
                    <span className="m2-pct-bar" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                    <span className="m2-pct-label">{c.pct.toFixed(1)}%</span>
                  </span>
                </td>
                <td><span className="motivo-badge">{c.motivoDominante}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
