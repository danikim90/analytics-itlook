const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

const MOTIVO_COLORS = {
  ficouGrande:    '#e91e8c',
  ficouPequeno:   '#7c3aed',
  arrependimento: '#d97706',
  qualidade:      '#dc2626',
  produto:        '#2563eb',
};

export default function RankingMotivos({ motivos }) {
  const max = motivos[0]?.total || 1;

  return (
    <div>
      <h2 className="m2-page-title">Ranking de Motivos</h2>
      <p className="m2-page-subtitle">
        Distribuição dos motivos de reversa. Insumo direto para decisões de produto,
        grade e comunicação com o cliente.
      </p>

      <div className="motivos-chart">
        {motivos.map((m) => (
          <div key={m.key} className="motivo-row">
            <div className="motivo-label">{m.label}</div>
            <div className="motivo-bar-wrap">
              <div
                className="motivo-bar"
                style={{
                  width: `${(m.total / max) * 100}%`,
                  background: MOTIVO_COLORS[m.key] ?? '#888',
                }}
              />
            </div>
            <div className="motivo-stats">
              <span className="motivo-total">{fmtN(m.total)}</span>
              <span className="motivo-pct">{m.pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
