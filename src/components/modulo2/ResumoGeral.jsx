const fmt  = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

export default function ResumoGeral({ data }) {
  return (
    <div>
      <h2 className="m2-page-title">Resumo do Período</h2>
      <p className="m2-page-subtitle">
        Visão consolidada de todas as reversas — devoluções e trocas — registradas no TroqueCommerce.
      </p>

      <div className="summary-cards" style={{ marginBottom: 0 }}>
        <div className="card">
          <div className="card-value">{fmtN(data.totalReversas)}</div>
          <div className="card-label">Total de Reversas</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(data.totalDevolucoes)}</div>
          <div className="card-label">Devoluções</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(data.totalTrocas)}</div>
          <div className="card-label">Trocas</div>
        </div>
        <div className="card">
          <div className="card-value">{fmt(data.valorTotal)}</div>
          <div className="card-label">Valor Devolvido</div>
        </div>
        <div className="card card-alert">
          <div className="card-value" style={{ fontSize: 15, lineHeight: 1.4 }}>
            {data.motivoMaisFrequente}
          </div>
          <div className="card-label">
            Motivo Mais Frequente · {fmtN(data.motivoMaisFrequenteTotal)} ocorrências
          </div>
        </div>
      </div>
    </div>
  );
}
