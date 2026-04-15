const CURVA_COLORS = {
  'A+': '#15803d',
  'A-': '#16a34a',
  'B+': '#2563eb',
  'B-': '#7c3aed',
  'C+': '#d97706',
  'C-': '#dc2626',
};

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

export default function SummaryCards({ data }) {
  const totalSKUs = data.length;
  const totalVendas = data.reduce((s, r) => s + r.totalVendas, 0);
  const totalSaidas = data.reduce((s, r) => s + r.saidas, 0);
  const totalEstoque = data.reduce((s, r) => s + r.saldoFinal, 0);
  const comRemarcacao = data.filter((r) => r.remarcacao).length;

  const porCurva = {};
  data.forEach((r) => {
    porCurva[r.curva] = (porCurva[r.curva] || 0) + 1;
  });

  return (
    <div className="summary-section">
      <div className="summary-cards">
        <div className="card">
          <div className="card-value">{fmtN(totalSKUs)}</div>
          <div className="card-label">SKUs Pai Ativos</div>
        </div>
        <div className="card">
          <div className="card-value">{fmt(totalVendas)}</div>
          <div className="card-label">Receita Total</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(totalSaidas)}</div>
          <div className="card-label">Peças Vendidas</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(totalEstoque)}</div>
          <div className="card-label">Saldo em Estoque</div>
        </div>
        <div className="card card-alert">
          <div className="card-value">{comRemarcacao}</div>
          <div className="card-label">SKUs p/ Remarcar</div>
        </div>
      </div>

      <div className="curva-dist">
        {['A+', 'A-', 'B+', 'B-', 'C+', 'C-'].map((c) => (
          <div key={c} className="curva-pill" style={{ borderColor: CURVA_COLORS[c] }}>
            <span className="curva-badge" style={{ background: CURVA_COLORS[c] }}>
              {c}
            </span>
            <span className="curva-count">{porCurva[c] || 0} SKUs</span>
          </div>
        ))}
      </div>
    </div>
  );
}
