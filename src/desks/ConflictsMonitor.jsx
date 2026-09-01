import { useEffect, useMemo, useState } from 'react';
import {
  markerPos,
  ordered,
  regionGroup,
  statsFor,
  statusOf,
  theatresFromFeed,
} from '../lib/conflictsMonitor.js';

export default function ConflictsMonitor({ feed, selected, onSelect }) {
  const theatres = useMemo(() => theatresFromFeed(feed), [feed]);
  const [region, setRegion] = useState('Global');
  const [posture, setPosture] = useState('All');
  const [query, setQuery] = useState('');

  const regions = useMemo(() => {
    const set = new Set(theatres.map((c) => regionGroup(c.region)));
    return ['Global', ...[...set].sort()];
  }, [theatres]);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    return theatres.filter((c) => {
      if (region !== 'Global' && regionGroup(c.region) !== region) return false;
      if (posture !== 'All' && c.status !== posture) return false;
      if (!q) return true;
      return [c.name, c.region, c.status, c.latest, ...(c.actors || [])].join(' ').toLowerCase().includes(q);
    });
  }, [theatres, region, posture, query]);

  const ranked = useMemo(() => ordered(view), [view]);
  const stats = useMemo(() => statsFor(theatres), [theatres]);
  const selectedId = selected?.id || ranked[0]?.id || '';
  const current = theatres.find((c) => c.id === selectedId) || ranked[0] || null;
  const st = current ? statusOf(current.status) : null;
  const asOf = feed?.meta?.asOf || feed?.coverage?.through || '';
  const timeline = (feed?.timeline || []).slice(0, 5);

  useEffect(() => {
    if (!ranked.length) return;
    if (selected && ranked.some((c) => c.id === selected.id)) return;
    onSelect?.(ranked[0].row);
  }, [ranked, selected, onSelect]);

  function pick(id) {
    const hit = theatres.find((c) => c.id === id);
    if (hit) onSelect?.(hit.row);
  }

  function exportRegister() {
    const blob = new Blob(
      [JSON.stringify({ asOf, derived: stats, conflicts: theatres.map(({ row, ...rest }) => rest) }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'niyantran-conflicts-register.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!theatres.length) {
    return <div className="c2-empty">Conflict records are unavailable.</div>;
  }

  return (
    <div className="c2">
      <header className="c2-head">
        <div className="c2-identity">
          <b>Global monitor</b>
          <span>AS OF {asOf}</span>
        </div>
        <div className="c2-strip">
          <span>
            <b>{stats.tracked}</b>theatres
          </span>
          <span className="hot">
            <b>{stats.deteriorating}</b>deteriorating
          </span>
          <span className="cease">
            <b>{stats.ceasefires}</b>fragile ceasefires
          </span>
          <span>
            <b>{stats.sourceLinked}</b>source-linked
          </span>
        </div>
        <div className="c2-actions">
          <button type="button" className="c2-action" onClick={exportRegister}>
            Export
          </button>
        </div>
      </header>

      <div className="c2-controls">
        <span className="c2-label">View</span>
        <select className="c2-select" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="c2-select" value={posture} onChange={(e) => setPosture(e.target.value)} aria-label="Filter by posture">
          <option value="All">All postures</option>
          <option value="escalating">Deteriorating</option>
          <option value="active">Active hostilities</option>
          <option value="ceasefire-fragile">Fragile ceasefire</option>
          <option value="under-review">Monitored</option>
        </select>
        <span className="c2-result">{view.length} shown</span>
        <input
          className="c2-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search theatre, actor or region"
          aria-label="Search conflict records"
        />
      </div>

      <section className="c2-main">
        <div className="c2-map">
          <div className="c2-map-title">Global theatre map</div>
          <div className="c2-map-asof">Click a marker to inspect</div>
          <div className="c2-markers">
            {view.map((c) => {
              const pos = markerPos(c);
              const s = statusOf(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`c2-marker${c.id === selectedId ? ' on' : ''}`}
                  style={{ left: pos.left, top: pos.top, background: s.color }}
                  aria-label={`${c.name}, ${s.label}`}
                  onClick={() => pick(c.id)}
                >
                  <span>
                    {c.name}
                    <em>
                      {s.label} · {regionGroup(c.region)}
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="c2-map-footer">
            <span>
              <i style={{ background: '#ce3f34' }} />
              Deteriorating
            </span>
            <span>
              <i style={{ background: '#d97932' }} />
              Active
            </span>
            <span>
              <i style={{ background: '#a86e17' }} />
              Ceasefire
            </span>
            <span>
              <i style={{ background: '#2f6eaa' }} />
              Monitored
            </span>
            <span className="hint">Country boundaries shown for orientation</span>
          </div>
        </div>

        <aside className="c2-side">
          <div className="c2-side-head">
            <b>Selected theatre</b>
            <span>Source dossier</span>
          </div>
          <div className="c2-selected">
            {current ? (
              <>
                <div className="c2-selected-top">
                  <h2>{current.name}</h2>
                  <span className="c2-posture" style={{ color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div className="c2-subline">
                  {regionGroup(current.region)} · since {current.since}
                </div>
                {(current.fatalitiesEst || current.displaced) && (
                  <div className="c2-facts">
                    {current.fatalitiesEst ? (
                      <div className="c2-fact">
                        <label>Reported casualties</label>
                        <strong title={current.fatalitiesEst}>{current.fatalitiesEst}</strong>
                      </div>
                    ) : null}
                    {current.displaced ? (
                      <div className="c2-fact">
                        <label>Displacement</label>
                        <strong title={current.displaced}>{current.displaced}</strong>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="c2-latest">
                  <label>Latest recorded development</label>
                  <p>{current.latest}</p>
                </div>
                {current.actors.length > 0 && (
                  <div className="c2-actors">
                    <b>Actors:</b> {current.actors.slice(0, 4).join(' · ')}
                  </div>
                )}
                <div className="c2-evidence">
                  {current.sources.slice(0, 3).map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label} ↗
                    </a>
                  ))}
                  <button type="button" disabled title="AI route not configured">
                    Request AI Analysis ↗
                  </button>
                </div>
              </>
            ) : (
              <div className="c2-empty">No theatre matches the current filters.</div>
            )}
          </div>
          <div className="c2-side-head">
            <b>Attention queue</b>
            <span>Posture ordered</span>
          </div>
          <div className="c2-queue">
            {ranked.length === 0 ? (
              <div className="c2-empty">No matching theatres.</div>
            ) : (
              ranked.slice(0, 8).map((c) => {
                const s = statusOf(c.status);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`c2-q${c.id === selectedId ? ' on' : ''}`}
                    onClick={() => pick(c.id)}
                  >
                    <i style={{ background: s.color }} />
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {regionGroup(c.region)} · {c.since}
                      </small>
                    </span>
                    <em>{s.short}</em>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </section>

      <section className="c2-tape">
        <div className="c2-tape-label">
          <b>Latest developments</b>
          <span>Most recent recorded changes across the monitor.</span>
        </div>
        {timeline.map((t) => (
          <article key={`${t.date}-${t.region}`} className="c2-event">
            <time>
              {t.date} · {t.region}
            </time>
            <b>{String(t.text || '').split(';')[0]}</b>
            <p>{t.text}</p>
          </article>
        ))}
      </section>

      <section className="c2-register">
        <div className="c2-reg-head">
          <b>Theatre register</b>
          <span>{view.length} records</span>
          <span className="note">Click any row to inspect · qualifiers retained</span>
        </div>
        <div className="c2-tablewrap">
          {ranked.length === 0 ? (
            <div className="c2-empty">No matching records.</div>
          ) : (
            <table className="c2-table">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Posture</th>
                  <th>Theatre</th>
                  <th>Region</th>
                  <th>Since</th>
                  <th>Reported casualties</th>
                  <th>Displacement</th>
                  <th>Latest</th>
                  <th>AI analysis</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c) => {
                  const s = statusOf(c.status);
                  return (
                    <tr key={c.id} className={c.id === selectedId ? 'on' : ''} onClick={() => pick(c.id)}>
                      <td>
                        <span className="c2-state">
                          <i style={{ background: s.color }} />
                          {s.short}
                        </span>
                      </td>
                      <td className="theatre">
                        <button type="button">{c.name}</button>
                      </td>
                      <td>{regionGroup(c.region)}</td>
                      <td>{c.since}</td>
                      <td title={c.fatalitiesEst}>{c.fatalitiesEst || 'Not reported'}</td>
                      <td title={c.displaced}>{c.displaced || 'Not reported'}</td>
                      <td title={c.latest}>{c.latest}</td>
                      <td className="c2-ai-cell">
                        <button type="button" className="c2-ai-request" disabled title="AI route not configured">
                          Request AI Analysis
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <footer className="c2-foot">
        <span>Reported figures keep each dossier’s original scope and time period.</span>
        <span>
          {stats.regions} normalized regions · {stats.sourceLinked} evidence-linked records
        </span>
      </footer>
    </div>
  );
}
