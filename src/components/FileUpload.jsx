import { useRef } from 'react';

const FILES_CONFIG = [
  {
    key: 'vendas',
    label: 'Relatório Geral de Vendas',
    hint: 'Relatorio_Geral_de_Vendas.xls',
    accept: '.xls,.xlsx',
    icon: '💰',
  },
  {
    key: 'estoque',
    label: 'Entradas e Saídas de Estoque',
    hint: 'Relatorio_de_Entradas_e_Saidas.xls',
    accept: '.xls,.xlsx',
    icon: '📦',
  },
  {
    key: 'saldos',
    label: 'Saldos em Estoque',
    hint: 'Saldos_Em_Estoque.xls',
    accept: '.xls,.xlsx',
    icon: '🗃️',
  },
  {
    key: 'motivos',
    label: 'Devoluções e Trocas',
    hint: 'ProdutosMotivos.csv / .xlsx',
    accept: '.csv,.xlsx,.xls',
    icon: '🔄',
  },
];

export default function FileUpload({ files, onChange, onProcess, loading }) {
  const refs = useRef({});

  const handleFile = (key, e) => {
    const f = e.target.files[0];
    if (f) onChange(key, f);
  };

  const allReady = FILES_CONFIG.every((c) => files[c.key]);

  return (
    <div className="upload-panel">
      <div className="upload-grid">
        {FILES_CONFIG.map(({ key, label, hint, accept, icon }) => {
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
              <div className="upload-label">{label}</div>
              <div className="upload-hint">
                {file ? (
                  <span className="file-name">✓ {file.name}</span>
                ) : (
                  <span>{hint}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="btn-process"
        disabled={!allReady || loading}
        onClick={onProcess}
      >
        {loading ? 'Processando...' : 'Gerar Análise'}
      </button>
    </div>
  );
}
