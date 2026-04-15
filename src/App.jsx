import { useState } from 'react';
import FileUpload from './components/FileUpload';
import SummaryCards from './components/SummaryCards';
import ABCTable from './components/ABCTable';
import RemarcacaoPanel from './components/RemarcacaoPanel';
import { parseVendas, parseEstoque, parseSaldos } from './utils/parseFiles';
import { buildAbcData } from './utils/abcLogic';
import './App.css';

export default function App() {
  const [files, setFiles] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setData(null);
    setError(null);
  };

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendas, estoque, saldos] = await Promise.all([
        parseVendas(files.vendas),
        parseEstoque(files.estoque),
        parseSaldos(files.saldos),
      ]);
      const result = buildAbcData(vendas, estoque, saldos);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar arquivos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-it">IT</span>
            <span className="logo-look">LOOK</span>
            <span className="logo-sep">|</span>
            <span className="logo-analytics">Analytics</span>
          </div>
          <div className="header-tag">Módulo 1 — Curva ABC &amp; Remarcação</div>
        </div>
      </header>

      <main className="main">
        <FileUpload
          files={files}
          onChange={handleFileChange}
          onProcess={handleProcess}
          loading={loading}
        />

        {error && <div className="error-banner">{error}</div>}

        {data && (
          <>
            <SummaryCards data={data} />
            <RemarcacaoPanel data={data} />
            <ABCTable data={data} />
          </>
        )}
      </main>

      <footer className="footer">
        IT Look Analytics · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
