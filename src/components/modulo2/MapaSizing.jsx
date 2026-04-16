const fmtN = (n) => new Intl.NumberFormat('pt-BR').format(n);

export default function MapaSizing({ sizing }) {
  return (
    <div>
      <h2 className="m2-page-title">Mapa de Sizing</h2>
      <p className="m2-page-subtitle">
        Apenas SKUs com motivo de tamanho (ficou grande / ficou pequeno).
        A direção do problema por tamanho é insumo direto para a decisão de grade na recompra.
      </p>

      {!sizing.length ? (
        <div className="remarcacao-empty">Nenhum dado de sizing neste período.</div>
      ) : (
        <div className="sizing-grid">
          {sizing.map((s) => {
            const net = s.grande - s.pequeno;
            const dir = net > 2 ? 'grande' : net < -2 ? 'pequeno' : 'neutro';
            return (
              <div key={s.tamanho} className={`sizing-card sizing-${dir}`}>
                <div className="sizing-tam">{s.tamanho}</div>
                <div className="sizing-row">
                  <span>Ficou grande</span>
                  <strong>{fmtN(s.grande)}</strong>
                </div>
                <div className="sizing-row">
                  <span>Ficou pequeno</span>
                  <strong>{fmtN(s.pequeno)}</strong>
                </div>
                <div className="sizing-dir">
                  {dir === 'grande'  && '⬆ Corte grande'}
                  {dir === 'pequeno' && '⬇ Corte pequeno'}
                  {dir === 'neutro'  && '— Neutro'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
