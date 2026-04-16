import { useRef } from 'react';

const CONFIGS = [
  {
    key: 'troque',
    label: 'TroqueCommerce — ProdutosMotivos',
    hint: 'ProdutosMotivos.csv',
    accept: '.csv,.txt',
    icon: '🔄',
    required: true,
  },
  {
    key: 'vendas',
    label: 'Eccosys — Relatório de Vendas',
    hint: 'Opcional · desbloqueia visões 6 e 7',
    accept: '.xls,.xlsx',
    icon: '💰',
    required: false,
  },
];

export default function FileUploadM2({ files, onChange, onProcess, loading }) {
  const refs = useRef({});

  const handleFile = (key, e) => {
    const f = e.target.files[0];
    if (f) onChange(key, f);
  };

  return (
    <div className="upload-panel">
      <div className="upload-grid">
        {CONFIGS.map(({ key, label, hint, accept, icon, required }) => {
          const file = files[key];
          return (
            <div
              key={key}
              className={`upload-card ${file ? 'ready' : ''}`}
              onClick={() => refs.current[key]?.click()}
            >
              <input
                ref={(el) => (refs.current[key] = el)}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={(e) => handleFile(key, e)}
              />
              <span className="upload-icon">{icon}</span>
              <div className="upload-label">
                {label}
                {!required && <span className="upload-optional"> (opcional)</span>}
              </div>
              <div className="upload-hint">
                {file ? <span className="file-name">✓ {file.name}</span> : <span>{hint}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="btn-process"
        disabled={!files.troque || loading}
        onClick={onProcess}
      >
        {loading ? 'Processando...' : 'Gerar Análise'}
      </button>
    </div>
  );
}
