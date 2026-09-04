import { Fragment } from 'react';

function exportJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `niyantran-${name}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function GeoDossierChrome({
  title,
  tag,
  subtitle,
  kpis,
  tab,
  onTab,
  onExport,
  onAsk,
  tools,
  children,
}) {
  return (
    <div className="gld">
      <div className="gld-head">
        <h1>{title}</h1>
        <span className="live-feed on">LIVE FEED</span>
        {tools}
        <nav className="gld-tabs" aria-label="Dossier views">
          <button type="button" className={tab === 'analytics' ? 'on' : ''} onClick={() => onTab('analytics')}>
            ANALYTICS
          </button>
          <button type="button" className={tab === 'ai' ? 'on' : ''} onClick={() => onTab('ai')}>
            AI WORKSPACE
          </button>
        </nav>
        <span className="geo-actions">
          <button type="button" className="geo-btn" onClick={onExport}>
            Export JSON
          </button>
          <button type="button" className="geo-btn pri" onClick={onAsk}>
            Ask AI
          </button>
        </span>
      </div>
      {tab === 'analytics' && (
        <>
          <div className="geo-top">
            <span className="geo-risk">{tag}</span>
            <span className="geo-asof">{subtitle}</span>
          </div>
          <div className="geo-kpis">
            {kpis.map(([v, k, tone]) => (
              <div key={k} className="geo-kpi">
                <div className={`geo-kpi-v${tone ? ` ${tone}` : ''}`}>{v}</div>
                <div className="geo-kpi-k">{k}</div>
              </div>
            ))}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

export function GeoAi({ summary, prompts, onAsk }) {
  return (
    <div className="geo-ai">
      <h4>◆ AI Intelligence Summary</h4>
      <p>{summary}</p>
      <div className="geo-ai-q">
        {prompts.map(([label, q]) => (
          <button key={label} type="button" onClick={() => onAsk(q)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GeoSources({ links, asOf }) {
  return (
    <section className="geo-panel">
      <div className="geo-panel-h">
        <span>Sources & Methodology</span>
      </div>
      <div className="geo-panel-b gld-src">
        <div className="geo-src">
          {links.map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer">
              {label} ↗
            </a>
          ))}
        </div>
        <p>Curated from public sources; figures are estimates unless cited. {asOf}.</p>
      </div>
    </section>
  );
}

export function GeoKv({ rows }) {
  return (
    <dl className="geo-kv">
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export { exportJson };
