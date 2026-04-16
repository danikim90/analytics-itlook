import { useState, useMemo, useRef } from 'react';
import { parseMotivosCsv, parseVendasXls } from '../utils/parseDevolucoes';
import {
  buildDevolucaoData,
  buildMotivosTotais,
  buildCategoriaData,
  sortTaxaItems,
} from '../utils/devolucaoLogic';

/* ─── Constantes ─────────────────────────────────────────────── */

const MOTIVO_META = [
  { key: 'ficouGrande',    label: 'Ficou grande',         color: '#7c3aed' },
  { key: 'ficouPequeno',   label: 'Ficou pequeno',        color: '#2563eb' },
  { key: 'arrependimento', label: 'Arrependimento',       color: '#d97706' },
  { key: 'qualidade',      label: 'Qualidade',            color: '#dc2626' },
  { key: 'produto',        label: 'Produto diferente',    color: '#db2777' },
  { key: 'demora',         label: 'Demora na entrega',    color: '#0891b2' },
];

const CURVA_COLORS = {
  'A+': '#15803d', 'A-': '#16a34a',
  'B+': '#2563eb', 'B-': '#7c3aed',
  'C+': '#d97706', 'C-': '#dc2626',
  'Aguardando': '#9898a8',
};

const TABS = [
  { key: 'resumo',    label: 'Resumo' },
  { key: 'motivos',   label: 'Motivos' },
  { key: 'categoria', label: 'Por Categoria' },
  { key: 'sizing',    label: 'Sizing' },
  { key: 'taxa',      label: 'Taxa de Devolução' },
  { key: 'curva',     label: 'Curva × Devolução' },
];

const fmt    = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0);
const fmtPct = n => n != null ? `${n.toFixed(1)}%` : '—';
const fmtN   = n => new Intl.NumberFormat('pt-BR').format(n ?? 0);

/* ─── Upload Panel ───────────────────────────────────────────── */

function UploadPanel({ onProcess }) {
  const [files, setFiles] = useState({ motivos: null, vendas: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const refs = { motivos: useRef(), vendas: useRef() };

  const handleFile = (key, e) => {
    const f = e.target.files[0];
    if (f) setFiles(prev => ({ ...prev, [key]: f }));
    setError(null);
  };

  const handleProcess = async () => {
    if (!files.motivos) return;
    setLoading(true);
    setError(null);
    try {
      const [motivosMap, vendasMap] = await Promise.all([
        parseMotivosCsv(files.motivos),
        files.vendas ? parseVendasXls(files.vendas) : Promise.resolve(null),
      ]);
      const items = buildDevolucaoData(motivosMap, vendasMap);
      onProcess(items);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const CARDS = [
    {
      key: 'motivos',
      label: 'TroqueCommerce — Motivos',
      hint: 'ProdutosMotivos.csv',
      accept: '.csv',
      icon: '↩️',
      required: true,
    },
    {
      key: 'vendas',
      label: 'Eccosys — Vendas',
      hint: 'Relatorio_Geral_de_Vendas.xls',
      accept: '.xls,.xlsx',
      icon: '💰',
      required: false,
    },
  ];

  return (
    <div className="upload-panel">
      <div className="upload-grid">
        {CARDS.map(({ key, label, hint, accept, icon, required }) => (
          <div
            key={key}
            className={`upload-card ${files[key] ? 'ready' : ''}`}
            onClick={() => refs[key].current?.click()}
          >
            <input
              ref={refs[key]}
              type="file"
              accept={accept}
              style={{ display: 'none' }}
              onChange={e => handleFile(key, e)}
            />
            <span className="upload-icon">{icon}</span>
            <div className="upload-label">
              {label}
              {!required && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>(opcional)</span>}
            </div>
            <div className="upload-hint">
              {files[key]
                ? <span className="file-name">✓ {files[key].name}</span>
                : <span>{hint}</span>
              }
            </div>
          </div>
        ))}
      </div>
      {!files.vendas && (
        <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', marginBottom: 12 }}>
          Sem o arquivo de Vendas, a Taxa de Devolução não será calculada.
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      <button
        className="btn-process"
        disabled={!files.motivos || loading}
        onClick={handleProcess}
      >
        {loading ? 'Processando...' : 'Gerar Análise'}
      </button>
    </div>
  );
}

/* ─── Tab: Resumo ────────────────────────────────────────────── */

function TabResumo({ items }) {
  const [showAll, setShowAll] = useState(false);

  const totalReversas   = items.reduce((s, i) => s + i.reversas, 0);
  const totalTrocas     = items.reduce((s, i) => s + i.trocas, 0);
  const totalDevolucoes = items.reduce((s, i) => s + i.devolucoes, 0);
  const totalValor      = items.reduce((s, i) => s + i.valor, 0);
  const comTaxa         = items.filter(i => i.taxa !== null && !i.amostaPequena);
  const taxaMedia       = comTaxa.length > 0
    ? comTaxa.reduce((s, i) => s + i.taxa, 0) / comTaxa.length
    : null;

  const motTotais  = useMemo(() => buildMotivosTotais(items), [items]);
  const totalMot   = Object.values(motTotais).reduce((s, v) => s + v, 0);

  const topProdutos = useMemo(() =>
    [...items].sort((a, b) => b.reversas - a.reversas), [items]);
  const N_SHOW = 5;
  const displayed = showAll ? topProdutos : topProdutos.slice(0, N_SHOW);
  const maisCount = topProdutos.length - N_SHOW;

  return (
    <div>
      <div className="summary-cards" style={{ marginBottom: 28 }}>
        <div className="card">
          <div className="card-value">{fmtN(totalReversas)}</div>
          <div className="card-label">Total Reversas</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(totalDevolucoes)}</div>
          <div className="card-label">Devoluções</div>
        </div>
        <div className="card">
          <div className="card-value">{fmtN(totalTrocas)}</div>
          <div className="card-label">Trocas</div>
        </div>
        <div className="card">
          <div className="card-value">{fmt(totalValor)}</div>
          <div className="card-label">Valor Devolvido</div>
        </div>
        {taxaMedia !== null && (
          <div className="card card-alert">
            <div className="card-value">{fmtPct(taxaMedia)}</div>
            <div className="card-label">Taxa Média Dev.</div>
          </div>
        )}
      </div>

      <div className="m2-two-col">
        {/* Motivos breakdown */}
        <div className="card" style={{ textAlign: 'left' }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 18 }}>
            Motivos de Devolução
          </div>
          {MOTIVO_META.map(({ key, label, color }) => {
            const val = motTotais[key] || 0;
            const pct = totalMot > 0 ? (val / totalMot) * 100 : 0;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text2)' }}>
                    {fmtN(val)} <span style={{ fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top produtos */}
        <div className="card" style={{ textAlign: 'left' }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 18 }}>
            Top Produtos por Reversas
          </div>
          {displayed.map((item, idx) => (
            <div key={item.skuPai} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 18, textAlign: 'right' }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.nome}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>{item.skuPai}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--rose)', minWidth: 28, textAlign: 'right' }}>
                {item.reversas}
              </span>
            </div>
          ))}
          {maisCount > 0 && !showAll && (
            <button className="btn-mais" onClick={() => setShowAll(true)}>
              +{maisCount} mais
            </button>
          )}
          {showAll && (
            <button className="btn-mais" onClick={() => setShowAll(false)}>
              Ver menos ▲
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Motivos ───────────────────────────────────────────── */

function TabMotivos({ items }) {
  const [showAll, setShowAll] = useState({});

  const motTotais = useMemo(() => buildMotivosTotais(items), [items]);
  const totalMot  = Object.values(motTotais).reduce((s, v) => s + v, 0);
  const N = 5;

  return (
    <div>
      {/* Barra geral */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title" style={{ fontSize: 14, marginBottom: 20 }}>
          Distribuição Geral dos Motivos
          <span className="badge-count" style={{ marginLeft: 10 }}>{fmtN(totalMot)} ocorrências</span>
        </div>
        <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
          {MOTIVO_META.filter(m => motTotais[m.key] > 0).map(({ key, color }) => {
            const pct = (motTotais[key] / totalMot) * 100;
            return (
              <div key={key} title={`${pct.toFixed(1)}%`}
                style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s' }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12 }}>
          {MOTIVO_META.map(({ key, label, color }) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              {label} — <strong>{fmtN(motTotais[key])}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Por motivo: top produtos */}
      <div className="m2-two-col">
        {MOTIVO_META.map(({ key, label, color }) => {
          const sorted = [...items]
            .filter(i => i[key] > 0)
            .sort((a, b) => b[key] - a[key]);
          if (sorted.length === 0) return null;
          const displayed = showAll[key] ? sorted : sorted.slice(0, N);
          const mais = sorted.length - N;
          return (
            <div key={key} className="card" style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
                <span className="badge-count" style={{ borderColor: color, color }}>{fmtN(motTotais[key])}</span>
              </div>
              {displayed.map(item => (
                <div key={item.skuPai} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 7, fontSize: 12 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.nome}
                  </span>
                  <strong style={{ flexShrink: 0, color }}>{item[key]}</strong>
                </div>
              ))}
              {mais > 0 && !showAll[key] && (
                <button className="btn-mais" onClick={() => setShowAll(p => ({ ...p, [key]: true }))}>
                  +{mais} mais
                </button>
              )}
              {showAll[key] && (
                <button className="btn-mais" onClick={() => setShowAll(p => ({ ...p, [key]: false }))}>
                  Ver menos ▲
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Tab: Por Categoria ─────────────────────────────────────── */

function TabCategoria({ items }) {
  const categorias = useMemo(() => buildCategoriaData(items), [items]);
  const temVendas  = categorias.some(c => c.temVendas);

  return (
    <div>
      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Produtos</th>
              <th>Reversas</th>
              <th>Trocas</th>
              <th>Devoluções</th>
              <th>Valor Devolvido</th>
              {temVendas && <th>Vendas</th>}
              {temVendas && <th>Taxa Méd.</th>}
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => {
              const taxa = cat.temVendas && cat.vendas > 0
                ? (cat.reversas / cat.vendas) * 100
                : null;
              return (
                <tr key={cat.categoria} className="row-main">
                  <td><strong>{cat.categoria}</strong></td>
                  <td>{cat.produtos}</td>
                  <td><strong>{fmtN(cat.reversas)}</strong></td>
                  <td>{fmtN(cat.trocas)}</td>
                  <td>{fmtN(cat.devolucoes)}</td>
                  <td>{fmt(cat.valor)}</td>
                  {temVendas && <td>{fmtN(cat.vendas)}</td>}
                  {temVendas && (
                    <td>
                      {taxa != null
                        ? <span className={`dplus ${taxa >= 20 ? 'dplus-critical' : taxa >= 10 ? 'dplus-warn' : ''}`}>{fmtPct(taxa)}</span>
                        : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Sizing ────────────────────────────────────────────── */

function TabSizing({ items }) {
  const sizingItems = useMemo(() =>
    [...items]
      .filter(i => i.ficouGrande + i.ficouPequeno > 0)
      .sort((a, b) => (b.ficouGrande + b.ficouPequeno) - (a.ficouGrande + a.ficouPequeno)),
    [items]);

  if (sizingItems.length === 0) {
    return <div className="remarcacao-empty">Nenhum produto com retorno por tamanho.</div>;
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
        Produtos com retornos por tamanho. Barra azul = <strong>ficou grande</strong> (produto corre grande) · Barra roxa = <strong>ficou pequeno</strong> (produto corre pequeno).
      </p>
      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th style={{ width: 60 }}>Grande</th>
              <th style={{ width: 60 }}>Pequeno</th>
              <th style={{ minWidth: 180 }}>Distribuição</th>
              <th>Diagnóstico</th>
            </tr>
          </thead>
          <tbody>
            {sizingItems.map(item => {
              const total = item.ficouGrande + item.ficouPequeno;
              const pctG = total > 0 ? (item.ficouGrande / total) * 100 : 50;
              const pctP = 100 - pctG;
              let diag = 'Equilibrado';
              let diagColor = 'var(--text2)';
              if (pctG >= 70) { diag = 'Corre grande'; diagColor = '#2563eb'; }
              else if (pctP >= 70) { diag = 'Corre pequeno'; diagColor = '#7c3aed'; }
              return (
                <tr key={item.skuPai} className="row-main">
                  <td className="col-nome">
                    <div className="sku-name">{item.nome}</div>
                    <div className="sku-code">{item.skuPai}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{item.ficouGrande}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{item.ficouPequeno}</td>
                  <td>
                    <div style={{ display: 'flex', height: 12, borderRadius: 3, overflow: 'hidden', background: 'var(--border)', gap: 1 }}>
                      {item.ficouGrande > 0 && (
                        <div style={{ height: '100%', width: `${pctG}%`, background: '#2563eb', borderRadius: '3px 0 0 3px' }} />
                      )}
                      {item.ficouPequeno > 0 && (
                        <div style={{ height: '100%', width: `${pctP}%`, background: '#7c3aed', borderRadius: item.ficouGrande > 0 ? '0 3px 3px 0' : '3px' }} />
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, color: diagColor }}>{diag}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Taxa de Devolução ─────────────────────────────────── */

const SORT_OPTIONS = [
  { key: 'taxa',     label: 'Taxa %'   },
  { key: 'reversas', label: 'Reversas' },
  { key: 'vendas',   label: 'Vendas'   },
  { key: 'valor',    label: 'Valor'    },
];

const CURVA_FILTER_OPTIONS = ['Todas', 'A', 'B', 'C'];

const CATEGORIAS = ['Todas', 'Calça', 'Blusa', 'Vestido', 'Blazer', 'Conjunto', 'Camisa', 'Colete', 'Jaqueta'];

// Mapeamento motivo-label → chave do objeto item
const MOTIVO_FILTRO_MAP = {
  'Arrependimento': 'arrependimento',
  'Ficou grande':   'ficouGrande',
  'Ficou pequeno':  'ficouPequeno',
  'Qualidade':      'qualidade',
  'Produto':        'produto',
};

function computeAlerta(item) {
  if (!item.curva || item.taxa === null || item.amostaPequena) return null;
  if ((item.curva === 'A+' || item.curva === 'A-') && item.taxa >= 15)
    return { text: 'Investigar qualidade', color: 'var(--red)' };
  if ((item.curva === 'C+' || item.curva === 'C-') && item.taxa >= 20)
    return { text: 'Liquidar com urgência', color: 'var(--amber)' };
  return null;
}

function TabTaxa({ items, abcData }) {
  const [expand, setExpand]       = useState({});
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState('taxa');
  const [sortDir, setSortDir]     = useState('desc');
  const [filtroCurva, setFiltroCurva] = useState('Todas');
  const [filtroCat, setFiltroCat]     = useState('Todas');

  const temVendas = items.some(i => i.vendas !== null);

  // Enriquece items com curva do ABC (Módulo 1)
  const abcMap = useMemo(() => {
    if (!abcData) return {};
    return Object.fromEntries(abcData.map(i => [i.skuPai, i]));
  }, [abcData]);

  const enriched = useMemo(() =>
    items.map(item => ({ ...item, curva: abcMap[item.skuPai]?.curva ?? null })),
    [items, abcMap]
  );

  const processed = useMemo(() => {
    // 1. Filtro de curva (só quando temVendas + abcData)
    let rows = enriched;
    if (temVendas && abcData && filtroCurva !== 'Todas') {
      rows = rows.filter(i => i.curva ? i.curva.startsWith(filtroCurva) : false);
    }

    // 2. Filtro de categoria
    if (filtroCat !== 'Todas') {
      rows = rows.filter(i => i.categoria === filtroCat);
    }

    // 3. Filtro de busca
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(i => i.nome.toLowerCase().includes(q) || i.skuPai.includes(q));
    }

    // 3. Ordenação
    const mul = sortDir === 'desc' ? -1 : 1;

    if (sortKey === 'taxa') {
      // Mantém agrupamento semântico: calculado → amostra pequena → sem dados
      const g1 = rows.filter(i => i.taxa !== null && !i.amostaPequena)
        .sort((a, b) => mul * (a.taxa - b.taxa));
      const g2 = rows.filter(i => i.amostaPequena)
        .sort((a, b) => mul * ((a.taxa ?? -1) - (b.taxa ?? -1)));
      const g3 = rows.filter(i => i.vendas === null)
        .sort((a, b) => -1 * (a.reversas - b.reversas)); // sempre por reversas desc
      return [...g1, ...g2, ...g3];
    }

    // Ordena por campo simples; nulls sempre no final
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return mul * (av - bv);
    });
  }, [enriched, temVendas, abcData, filtroCurva, filtroCat, search, sortKey, sortDir]);

  const toggle = sku => setExpand(e => ({ ...e, [sku]: !e[sku] }));

  return (
    <div>
      {!temVendas && (
        <div className="remarcacao-empty" style={{ marginBottom: 20 }}>
          Arquivo de Vendas não fornecido — taxa de devolução não disponível.
          <span>Faça upload do Eccosys Vendas para ver as taxas por produto.</span>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="filters" style={{ marginBottom: 16 }}>
        <input
          className="search-input"
          placeholder="Buscar produto ou SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="filter-group">
          <label>Ordenar por</label>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
          >
            {SORT_OPTIONS.filter(o => o.key !== 'vendas' || temVendas).map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Direção</label>
          <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>

        {temVendas && abcData && (
          <div className="filter-group">
            <label>Curva</label>
            <select value={filtroCurva} onChange={e => setFiltroCurva(e.target.value)}>
              {CURVA_FILTER_OPTIONS.map(o => (
                <option key={o} value={o}>{o === 'Todas' ? 'Todas' : `Curva ${o}`}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Categoria</label>
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <span className="results-count">{processed.length} produtos</span>
      </div>

      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th className="col-expand" />
              <th>Produto</th>
              <th>Reversas</th>
              {temVendas && <th>Vendas</th>}
              {temVendas && <th>Taxa Dev.</th>}
              <th>Trocas</th>
              <th>Devoluções</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {processed.map(item => {
              const hasTam = Object.keys(item.tamanhos).length > 0;
              const expanded = expand[item.skuPai];
              return [
                <tr key={item.skuPai} className={`row-main ${expanded ? 'expanded' : ''}`}>
                  <td className="col-expand">
                    {hasTam && (
                      <button className="expand-btn" onClick={() => toggle(item.skuPai)}>
                        {expanded ? '▼' : '▶'}
                      </button>
                    )}
                  </td>
                  <td className="col-nome">
                    <div className="sku-name">{item.nome}</div>
                    <div className="sku-code">{item.skuPai}</div>
                  </td>
                  <td><strong>{fmtN(item.reversas)}</strong></td>
                  {temVendas && <td>{item.vendas !== null ? fmtN(item.vendas) : '—'}</td>}
                  {temVendas && (
                    <td>
                      {item.amostaPequena ? (
                        <span title="Amostra pequena" style={{ color: 'var(--amber)', fontWeight: 600, cursor: 'help' }}>
                          {item.taxa != null ? fmtPct(item.taxa) : '—'} ⚠
                        </span>
                      ) : item.taxa != null ? (
                        <span className={`dplus ${item.taxa >= 20 ? 'dplus-critical' : item.taxa >= 10 ? 'dplus-warn' : ''}`}>
                          {fmtPct(item.taxa)}
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  <td>{fmtN(item.trocas)}</td>
                  <td>{fmtN(item.devolucoes)}</td>
                  <td>{fmt(item.valor)}</td>
                </tr>,
                expanded && hasTam && (
                  <tr key={`${item.skuPai}-exp`} className="row-expand">
                    <td colSpan={temVendas ? 8 : 6}>
                      <div className="expand-panel">
                        <div className="expand-title">Breakdown por tamanho</div>
                        <div className="size-grid">
                          {Object.entries(item.tamanhos).map(([tam, t]) => (
                            <div key={tam} className="size-card">
                              <div className="size-label">{tam}</div>
                              <div className="size-stat"><span>Reversas</span><strong>{t.reversas}</strong></div>
                              <div className="size-stat"><span>Trocas</span><strong>{t.trocas}</strong></div>
                              <div className="size-stat"><span>Dev.</span><strong>{t.devolucoes}</strong></div>
                              {(t.ficouGrande + t.ficouPequeno) > 0 && (
                                <div className="size-stat">
                                  <span>Tam.</span>
                                  <strong style={{ color: t.ficouGrande > t.ficouPequeno ? '#2563eb' : '#7c3aed' }}>
                                    {t.ficouGrande > t.ficouPequeno ? 'Grande' : 'Pequeno'}
                                  </strong>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Motivos do produto */}
                        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {MOTIVO_META.filter(m => item[m.key] > 0).map(({ key, label, color }) => (
                            <span key={key} style={{ fontSize: 12 }}>
                              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 4 }} />
                              {label}: <strong>{item[key]}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Curva × Devolução ─────────────────────────────────── */

const TAXA_FILTRO_OPTIONS = [
  { label: 'Todas',        min: null },
  { label: 'Acima de 20%', min: 20   },
  { label: 'Acima de 50%', min: 50   },
  { label: 'Acima de 100%', min: 100 },
];

function TabCurva({ items, abcData }) {
  const [filtroCurva,  setFiltroCurva]  = useState('Todas');
  const [filtroTaxa,   setFiltroTaxa]   = useState('Todas');
  const [filtroMotivo, setFiltroMotivo] = useState('Todos');
  const [filtroAlerta, setFiltroAlerta] = useState('Todos');

  const abcMap = useMemo(() => {
    if (!abcData) return {};
    return Object.fromEntries(abcData.map(i => [i.skuPai, i]));
  }, [abcData]);

  // Enriquece items com curva, dPlus, motivoPrincipal e alerta pré-computados
  const cruzados = useMemo(() => {
    return items
      .map(item => {
        const abc    = abcMap[item.skuPai] || null;
        const curva  = abc?.curva ?? null;
        const dPlus  = abc?.dPlus ?? null;
        const enr    = { ...item, curva, dPlus };
        const maxMot = MOTIVO_META
          .filter(m => item[m.key] > 0)
          .sort((a, b) => item[b.key] - item[a.key])[0] ?? null;
        const alerta = computeAlerta(enr);
        return { ...enr, maxMot, alerta };
      })
      .sort((a, b) => {
        if (a.curva && !b.curva) return -1;
        if (!a.curva && b.curva) return 1;
        return (b.taxa ?? -1) - (a.taxa ?? -1);
      });
  }, [items, abcMap]);

  const alertasBanner = useMemo(() =>
    cruzados.filter(i =>
      i.curva && (i.curva === 'A+' || i.curva === 'A-') &&
      i.taxa !== null && !i.amostaPequena && i.taxa >= 15
    ), [cruzados]);

  const filtered = useMemo(() => {
    let rows = cruzados;

    if (filtroCurva !== 'Todas') {
      rows = rows.filter(i => i.curva === filtroCurva);
    }

    if (filtroTaxa !== 'Todas') {
      const minVal = TAXA_FILTRO_OPTIONS.find(o => o.label === filtroTaxa)?.min;
      if (minVal != null) {
        rows = rows.filter(i => i.taxa !== null && !i.amostaPequena && i.taxa > minVal);
      }
    }

    if (filtroMotivo !== 'Todos') {
      const chave = MOTIVO_FILTRO_MAP[filtroMotivo];
      rows = rows.filter(i => i.maxMot?.key === chave);
    }

    if (filtroAlerta === 'Com alerta') {
      rows = rows.filter(i => i.alerta !== null);
    } else if (filtroAlerta === 'Sem alerta') {
      rows = rows.filter(i => i.alerta === null);
    }

    return rows;
  }, [cruzados, filtroCurva, filtroTaxa, filtroMotivo, filtroAlerta]);

  if (!abcData) {
    return (
      <div className="remarcacao-empty">
        Dados da Curva ABC não disponíveis nesta sessão.
        <span>Processe o Módulo 1 (Curva ABC &amp; Remarcação) primeiro para cruzar os dados.</span>
      </div>
    );
  }

  return (
    <div>
      {/* Banner de alertas críticos */}
      {alertasBanner.length > 0 && (
        <div style={{
          background: 'rgba(220,38,38,0.06)', border: '1px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 8, fontSize: 13 }}>
            ⚠ Produtos Curva A com alta taxa de devolução ({alertasBanner.length})
          </div>
          {alertasBanner.map(item => (
            <div key={item.skuPai} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>
              <strong>{item.nome}</strong>
              <span style={{ marginLeft: 8, color: 'var(--text2)' }}>{item.skuPai}</span>
              <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--red)' }}>{fmtPct(item.taxa)}</span>
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text2)' }}>— investigar qualidade</span>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros */}
      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <label>Curva</label>
          <select value={filtroCurva} onChange={e => setFiltroCurva(e.target.value)}>
            <option value="Todas">Todas</option>
            {['A+', 'A-', 'B+', 'B-', 'C+', 'C-'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Taxa</label>
          <select value={filtroTaxa} onChange={e => setFiltroTaxa(e.target.value)}>
            {TAXA_FILTRO_OPTIONS.map(o => (
              <option key={o.label} value={o.label}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Motivo</label>
          <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)}>
            <option value="Todos">Todos</option>
            {Object.keys(MOTIVO_FILTRO_MAP).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Alerta</label>
          <select value={filtroAlerta} onChange={e => setFiltroAlerta(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Com alerta">Com alerta</option>
            <option value="Sem alerta">Sem alerta</option>
          </select>
        </div>

        <span className="results-count">{filtered.length} de {cruzados.length} produtos</span>
      </div>

      <div className="table-wrapper">
        <table className="abc-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Curva</th>
              <th>D+</th>
              <th>Reversas</th>
              <th>Taxa Dev.</th>
              <th>Motivo Principal</th>
              <th>Alerta</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.skuPai} className="row-main">
                <td className="col-nome">
                  <div className="sku-name">{item.nome}</div>
                  <div className="sku-code">{item.skuPai}</div>
                </td>
                <td>
                  {item.curva
                    ? <span className="curva-badge" style={{ background: CURVA_COLORS[item.curva] }}>{item.curva}</span>
                    : <span style={{ color: 'var(--text2)', fontSize: 12 }}>—</span>}
                </td>
                <td>
                  {item.dPlus != null
                    ? <span className={`dplus ${item.dPlus >= 60 ? 'dplus-critical' : item.dPlus >= 30 ? 'dplus-warn' : ''}`}>{item.dPlus}d</span>
                    : '—'}
                </td>
                <td><strong>{fmtN(item.reversas)}</strong></td>
                <td>
                  {item.amostaPequena
                    ? <span title="Amostra pequena" style={{ color: 'var(--amber)', cursor: 'help' }}>
                        {item.taxa != null ? fmtPct(item.taxa) : '—'} ⚠
                      </span>
                    : item.taxa != null
                      ? <span className={`dplus ${item.taxa >= 20 ? 'dplus-critical' : item.taxa >= 10 ? 'dplus-warn' : ''}`}>
                          {fmtPct(item.taxa)}
                        </span>
                      : '—'}
                </td>
                <td>
                  {item.maxMot && (
                    <span style={{ fontSize: 12, color: item.maxMot.color, fontWeight: 600 }}>
                      {item.maxMot.label}
                    </span>
                  )}
                </td>
                <td>
                  {item.alerta && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.alerta.color }}>
                      {item.alerta.text}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Componente Principal ───────────────────────────────────── */

export default function Modulo2({ abcData }) {
  const [items, setItems]         = useState(null);
  const [activeTab, setActiveTab] = useState('resumo');

  const handleReset = () => { setItems(null); setActiveTab('resumo'); };

  if (!items) {
    return <UploadPanel onProcess={setItems} />;
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="m2-tabbar">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`m2-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button onClick={handleReset} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text2)', fontSize: 12,
          textDecoration: 'underline', padding: '4px 8px',
        }}>
          Novo upload
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {activeTab === 'resumo'    && <TabResumo   items={items} />}
        {activeTab === 'motivos'   && <TabMotivos  items={items} />}
        {activeTab === 'categoria' && <TabCategoria items={items} />}
        {activeTab === 'sizing'    && <TabSizing   items={items} />}
        {activeTab === 'taxa'      && <TabTaxa     items={items} abcData={abcData} />}
        {activeTab === 'curva'     && <TabCurva    items={items} abcData={abcData} />}
      </div>
    </div>
  );
}
