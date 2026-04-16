import { useState } from 'react';
import FileUploadM2 from './modulo2/FileUploadM2';
import ResumoGeral from './modulo2/ResumoGeral';
import RankingMotivos from './modulo2/RankingMotivos';
import DiagnosticoCategoria from './modulo2/DiagnosticoCategoria';
import MapaSizing from './modulo2/MapaSizing';
import TaxaDevolucao from './modulo2/TaxaDevolucao';
import CurvaAbcDevolucao from './modulo2/CurvaAbcDevolucao';
import { parseTroqueCommerce } from '../utils/parseTroqueCommerce';
import { parseVendas } from '../utils/parseFiles';
import { buildTrocasData } from '../utils/trocasLogic';

export default function Modulo2() {
  const [files, setFiles]     = useState({});
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('resumo');

  const handleFileChange = (key, file) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setData(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!files.troque) return;
    setLoading(true);
    setError(null);
    try {
      const trocas = await parseTroqueCommerce(files.troque);
      const vendas = files.vendas ? await parseVendas(files.vendas) : null;
      setData(buildTrocasData(trocas, vendas));
      setActiveTab('resumo');
    } catch (err) {
      console.error(err);
      setError('Erro ao processar arquivos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { key: 'resumo',     label: 'Resumo' },
    { key: 'motivos',    label: 'Motivos' },
    { key: 'categorias', label: 'Por Categoria' },
    { key: 'sizing',     label: 'Sizing' },
    ...(data?.taxaDevolucao ? [{ key: 'taxa',  label: 'Taxa de Devolução' }] : []),
    ...(data?.abcDevolucao  ? [{ key: 'curva', label: 'Curva × Devolução' }] : []),
  ];

  return (
    <>
      <FileUploadM2
        files={files}
        onChange={handleFileChange}
        onProcess={handleProcess}
        loading={loading}
      />

      {error && <div className="error-banner">{error}</div>}

      {data && (
        <div className="m2-content">
          <div className="m2-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`m2-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'resumo'     && <ResumoGeral data={data.resumo} />}
          {activeTab === 'motivos'    && <RankingMotivos motivos={data.motivos} />}
          {activeTab === 'categorias' && <DiagnosticoCategoria categorias={data.categorias} />}
          {activeTab === 'sizing'     && <MapaSizing sizing={data.sizing} />}
          {activeTab === 'taxa'       && <TaxaDevolucao taxa={data.taxaDevolucao} />}
          {activeTab === 'curva'      && <CurvaAbcDevolucao dados={data.abcDevolucao} />}
        </div>
      )}
    </>
  );
}
