import { useState } from 'react';

const fmtPct = (n) => (n != null ? `${n.toFixed(1)}%` : '—');

const QUADRANTES_MAIN = [
  {
    key: 'crit',
    label: '🚨 Problema Crítico',
    desc: 'Curva A · taxa alta — produto campeão de vendas com alto retorno. Investigar urgente.',
    borderColor: '#dc2626',
    bg: 'rgba(220,38,38,0.05)',
    tagColor: '#dc2626',
  },
  {
    key: 'ok',
    label: '✅ Saudável',
    desc: 'Curva A · taxa baixa — vende muito e retorna pouco. Padrão ideal.',
    borderColor: '#16a34a',
    bg: 'rgba(22,163,74,0.05)',
    tagColor: '#16a34a',
  },
  {
    key: 'ruido',
    label: '⚠️ Possível Ruído',
    desc: 'Curva C · taxa alta — vende pouco e o pouco volta. Pode ser problema real ou amostra pequena.',
    borderColor: '#d97706',
    bg: 'rgba(217,119,6,0.05)',
    tagColor: '#d97706',
  },
  {
    key: 'invis',
    label: 'Invisível Normal',
    desc: 'Curva C · taxa baixa — vende pouco e retorna pouco. Sem urgência.',
    borderColor: '#E5E3DC',
    bg: 'transparent',
    tagColor: '#888880',
  },
];

const QUADRANTES_B = [
  { key: 'atencao', label: '⚠️ Atenção',  desc: 'Curva B · taxa alta',  tagColor: '#d97706' },
  { key: 'normal',  label: 'Normal',       desc: 'Curva B · taxa baixa', tagColor: '#888880' },
];

const PAGE = 8;

function QuadranteCard({ q, items }) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return null;

  const displayed = showAll ? items : items.slice(0, PAGE);
  const overflow  = items.length - PAGE;

  return (
    <div className="abc-dev-card" style={{ borderColor: q.borderColor, background: q.bg }}>
      <div className="abc-dev-title" style={{ color: q.tagColor }}>{q.label}</div>
      <div className="abc-dev-desc">{q.desc}</div>
      <div className="abc-dev-count" style={{ color: q.tagColor }}>
        {items.length} produto{items.length !== 1 ? 's' : ''}
      </div>
      <div className="abc-dev-list">
        {displayed.map((item) => (
          <div key={item.nomePai} className="abc-dev-item">
            <span className="abc-dev-name">{item.nomePai}</span>
            <span className="abc-dev-taxa" style={{ color: q.tagColor }}>{fmtPct(item.taxa)}</span>
          </div>
        ))}
        {overflow > 0 && (
          <button
            className="abc-dev-more-btn"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? '▲ recolher' : `▼ +${overflow} mais`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CurvaAbcDevolucao({ dados }) {
  const byQ = (key) => dados.filter((d) => d.quadrante === key);
  const hasBcurve = ['atencao', 'normal'].some((k) => byQ(k).length > 0);

  return (
    <div>
      <h2 className="m2-page-title">Curva ABC × Devolução</h2>
      <p className="m2-page-subtitle">
        Cruza a classificação de volume de vendas com a taxa de devolução.
        Identifica produtos críticos que precisam de investigação imediata
        e sinaliza onde o problema pode ser ruído estatístico.
      </p>

      <div className="abc-dev-grid">
        {QUADRANTES_MAIN.map((q) => (
          <QuadranteCard key={q.key} q={q} items={byQ(q.key)} />
        ))}
      </div>

      {hasBcurve && (
        <>
          <div className="m2-b-divider">Curva B</div>
          <div className="abc-dev-grid" style={{ marginTop: 12 }}>
            {QUADRANTES_B.map((q) => (
              <QuadranteCard
                key={q.key}
                q={{ ...q, borderColor: '#E5E3DC', bg: 'transparent' }}
                items={byQ(q.key)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
