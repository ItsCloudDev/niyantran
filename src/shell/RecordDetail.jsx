import { isArticleHref, displayUrl } from '../lib/normalise.js';
import { dossierFor, impactCards, isOpenFronts } from '../lib/openFronts.js';
import { isGithubCsvRow } from '../lib/githubCsv.js';
import CsvTablePane from './CsvTablePane.jsx';

const SKIP = new Set(['source_url', 'status', 'adapter', 'fail_reason', 'host', 'detail', 'reporting_search', 'sources_json', 'lat', 'lon', 'id']);
const ENTITY_KEYS = /party|ministry|sector|region|state|constituency|vendor|origin|category|department|court|status|stage|company|sponsor|financier|country|cadre|scheme|type|trend|intensity/i;

function prettyKey(k) {
  return String(k)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function yearOf(v) {
  const m = String(v).match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function isUrl(v) {
  return /^https?:\/\//i.test(String(v).trim());
}

function isDateish(v) {
  const y = yearOf(v);
  if (y == null) return false;
  if (/^\s*(19|20)\d{2}\s*$/.test(String(v).replace(/[.,;]/g, ''))) return true;
  return /(\b\d{1,2}[/\-\s][A-Za-z]{3,}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,}\s+\d{4}|\b\d{4}\b)/.test(String(v));
}

function entriesOf(row) {
  return Object.entries(row || {}).filter(
    ([k, v]) => !SKIP.has(k) && !/^source_\d/.test(k) && v != null && String(v).trim() !== '',
  );
}

function frontsAnalysis(row) {
  const name = row.conflict_name || row.title || 'This event';
  const type = String(row.conflict_type || 'conflict');
  const region = row.region || 'the theatre';
  const stage = row.current_stage || 'tracked';
  const latest = String(row.latest_development || '').replace(/\s+/g, ' ').trim();
  return {
    brief: `${name} is tracked in Open Fronts as ${type.toLowerCase()} in ${region} and is currently ${stage}.`,
    why: `The event is tracked because it remains an unresolved ${type.toLowerCase()} affecting ${region}.`,
    latest,
    tags: [region, type, stage].filter(Boolean),
  };
}

const STRIP_KEYS = [
  ['conflict_name', 'title', 'name'],
  ['region'],
  ['conflict_type', 'type'],
  ['current_stage', 'stage'],
  ['intensity'],
  ['trend'],
  ['started', 'date'],
];

function stripCells(row) {
  return STRIP_KEYS.map((keys) => {
    const key = keys.find((k) => row[k] != null && String(row[k]).trim() !== '');
    return key ? { key, value: String(row[key]) } : null;
  }).filter(Boolean);
}

function sourcePairs(row) {
  const out = [];
  const seen = new Set();
  if (row?.sources_json) {
    try {
      for (const s of JSON.parse(row.sources_json)) {
        if (Array.isArray(s) && s[1] && isUrl(s[1]) && !seen.has(s[1])) {
          seen.add(s[1]);
          out.push({ label: s[0] || 'Source', url: s[1] });
        }
      }
    } catch {
      /* ignore */
    }
  }
  for (let i = 1; i <= 6; i++) {
    const url = row?.[`source_${i}_url`];
    const label = row?.[`source_${i}`];
    if (url && isUrl(url) && !seen.has(url)) {
      seen.add(url);
      out.push({ label: label || `Source ${i}`, url });
    }
  }
  if (row?.source_url && isUrl(row.source_url) && !seen.has(row.source_url)) {
    out.push({ label: 'Source', url: row.source_url });
  }
  return out;
}

export default function RecordDetail({ row, feed, onClear }) {
  if (!row) return null;
  const entries = entriesOf(row);
  const title = String(row.conflict_name || row.title || row.bill_name || row.name || 'Record').trim();
  const fronts = isOpenFronts(feed);
  const analysis = fronts ? frontsAnalysis(row) : null;
  const pairs = sourcePairs(row);
  const docs = pairs.length
    ? pairs.map((p) => [p.label, p.url])
    : entries.filter(([, v]) => isUrl(v));
  const dates = entries
    .filter(([, v]) => !isUrl(v) && isDateish(v) && yearOf(v))
    .map(([k, v]) => ({ k, v: String(v).trim(), y: yearOf(v) }))
    .sort((a, b) => a.y - b.y);
  const entities = entries.filter(([k, v]) => ENTITY_KEYS.test(k) && !isUrl(v) && String(v).trim().length <= 60);
  const summary = entries
    .filter(([, v]) => !isUrl(v))
    .slice(0, 6)
    .map(([k, v]) => `${prettyKey(k)}: ${String(v).trim()}`)
    .join('  ·  ');
  const csvFile = isGithubCsvRow(row);
  const csv = fronts ? 'geopolitics_war_tracker.csv' : csvFile ? String(row.name || row.title || '') : '';
  const d = fronts ? dossierFor(row) : null;
  const extra = d && (d.hasDossier || d.verified) ? d : null;
  const impact = extra ? impactCards(d) : [];
  const named = extra ? (d.actors.length ? d.actors : d.entities) : [];

  return (
    <div className="rd">
      {!csvFile ? (
        <div className="rd-strip">
          {stripCells(row).map((c, i) => (
            <div key={c.key} className={`rd-cell${i === 0 ? ' primary' : ''}`}>
              {i === 0 && <i className="status-dot" />}
              <span>{c.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rd-head">
        <h2 className="rd-title">{title}</h2>
        <button type="button" className="rd-close" onClick={onClear} aria-label="Close record">
          ×
        </button>
      </div>
      <div className="row-detail-meta">
        <span className="tag">{fronts ? 'Conflict Intelligence' : feed?.feature || 'Record'}</span>
        <span className="tag">{fronts ? 'GLOBAL' : String(feed?.tier || '').toUpperCase() || 'DESK'}</span>
        <span className="tag">TRACKER</span>
        {csv ? <span className="tag">{csv}</span> : null}
      </div>

      {csvFile ? <CsvTablePane row={row} /> : null}

      {!csvFile && analysis && (
        <div className="rd-section rd-ai">
          <div className="rd-sec-label">✦ NIYANTRAN ANALYSIS</div>
          <div className="rd-ai-brief">{analysis.brief}</div>
          <div className="rd-ai-sub">
            <span>Why it matters</span>
            {analysis.why}
          </div>
          {analysis.latest ? (
            <div className="rd-ai-sub">
              <span>Latest feed note</span>
              {analysis.latest}
            </div>
          ) : null}
          <div className="rd-ai-tags">
            {analysis.tags.map((t) => (
              <span key={t} className="rd-ai-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {!csvFile && summary ? <div className="rd-summary">{summary}</div> : null}

      {!csvFile && dates.length > 0 && (
        <div className="rd-section">
          <div className="rd-sec-label">TIMELINE</div>
          <div className="rd-timeline">
            {dates.map((e) => (
              <div key={e.k} className="rd-tl-item">
                <span className="rd-tl-dot" />
                <div className="rd-tl-body">
                  <div className="rd-tl-when">{e.v}</div>
                  <div className="rd-tl-what">{prettyKey(e.k)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!csvFile && docs.length > 0 && (
        <div className="rd-section">
          <div className="rd-sec-label">DOCUMENTS & SOURCES</div>
          <div className="rd-docs">
            {docs.map(([k, v]) => (
              <a key={String(v)} className="rd-doc" href={String(v).trim()} target="_blank" rel="noreferrer">
                <span className="rd-doc-ic">{/\.pdf(\?|$)/i.test(String(v)) ? '⤓' : '↗'}</span>
                <span>{pairs.length ? k : prettyKey(k)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {!csvFile && entities.length > 0 && (
        <div className="rd-section">
          <div className="rd-sec-label">RELATED ENTITIES</div>
          <div className="rd-entities">
            {entities.map(([k, v]) => (
              <span key={k} className="rd-entity" title={prettyKey(k)}>
                {String(v).trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {!csvFile && (
      <div className="rd-section">
        <div className="rd-sec-label">ALL FIELDS</div>
        <div className="row-detail-fields">
          {entries
            .filter(([, v]) => !isUrl(v))
            .map(([k, v]) => {
              const s = String(v).trim();
              const href = isArticleHref(s);
              return (
                <div key={k} className="row-detail-field">
                  <div className="rdf-key">{prettyKey(k)}</div>
                  <div className="rdf-val">
                    {href ? (
                      <a href={s} target="_blank" rel="noreferrer">
                        {displayUrl(s)}
                      </a>
                    ) : (
                      s
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      )}

      {!csvFile && extra && (
        <>
          <div className="rd-section">
            <div className="rd-sec-label">01 · Verified impact</div>
            <div className="ofx-impact-grid">
              {impact.map((x) => (
                <div key={x.label} className={`ofx-impact${x.missing ? ' missing' : ''}`}>
                  <span>{x.label}</span>
                  <b>{x.value}</b>
                  <small>{x.note}</small>
                </div>
              ))}
            </div>
          </div>
          {(named.length > 0 || d.equipment.length > 0 || d.supporters.length > 0) && (
            <div className="rd-section">
              <div className="rd-sec-label">02 · Operational picture</div>
              <div className="ofx-context-lines" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="ofx-context-line">
                  <span>Actors / headline entities</span>
                  {named.slice(0, 4).join(' · ') || 'Not identified in feed'}
                </div>
                <div className="ofx-context-line">
                  <span>Systems observed</span>
                  {d.equipment.slice(0, 3).join(' · ') || 'Not reported in feed'}
                </div>
              </div>
              <div className="ofx-chiprow">
                {(d.supporters.length ? d.supporters.slice(0, 4) : []).map((x) => (
                  <span key={x} className="ofx-chip">
                    {x}
                  </span>
                ))}
              </div>
              {d.sources?.length ? (
                <div className="rd-docs" style={{ marginTop: 10 }}>
                  {d.sources.map((s) =>
                    s[1] ? (
                      <a key={s[1]} className="rd-doc" href={s[1]} target="_blank" rel="noreferrer">
                        <span className="rd-doc-ic">↗</span>
                        <span>{s[0]}</span>
                      </a>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          )}
          {d.beneficiaries?.beneficiaries?.length ? (
            <div className="rd-section">
              <div className="rd-sec-label">03 · War beneficiaries</div>
              <div className="ofx-contracts">
                {d.beneficiaries.beneficiaries.slice(0, 3).map((x) => (
                  <div key={x.company} className="ofx-contract">
                    <strong>{x.company}</strong>
                    <span>{x.systems}</span>
                    <b>{x.value}</b>
                  </div>
                ))}
              </div>
              <div className="ofx-note">{d.beneficiaries.scope}</div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
