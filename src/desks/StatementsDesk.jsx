import { useEffect, useState } from 'react';
import { STATEMENT_LEADERS } from '../data/nationalCurated.js';
import { Sparkline, VizFilterChip } from '../shell/AnalyticsViz.jsx';
import { applyVizFilter } from '../lib/nationalKpi.js';
import TableFilterPop from '../shell/TableFilterPop.jsx';
import { rowDragProps } from '../lib/aiDrop.js';

function gdeltDoc(q) {
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${q}" sourcecountry:IN`)}&mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=40`;
}
function gdeltVol(q) {
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${q}" sourcecountry:IN`)}&mode=TimelineVol&format=json&timespan=7d`;
}

async function proxyJson(url, signal) {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}`, { signal });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('unreachable');
  }
}

export default function StatementsDesk({ onSelect, onFeed, vizFilter, onClearViz }) {
  const [i, setI] = useState(0);
  const [rows, setRows] = useState([]);
  const [vol, setVol] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const person = STATEMENT_LEADERS[i];
  const shown = rows.filter((r) => {
    if (!applyVizFilter(r, vizFilter)) return false;
    if (!q.trim()) return true;
    return `${r.title || ''} ${r.source || ''}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr('');
    Promise.all([
      proxyJson(gdeltDoc(person), ac.signal),
      proxyJson(gdeltVol(person), ac.signal).catch(() => null),
    ])
      .then(([doc, timeline]) => {
        if (ac.signal.aborted) return;
        const arts = doc?.articles || doc?.article || [];
        const mapped = (Array.isArray(arts) ? arts : []).map((a) => ({
          title: a.title || a.seendate,
          date: a.seendate || a.date,
          source_url: a.url,
          source: a.domain || a.sourceCountry,
          reporting_search: 'GDELT DOC 2.0 — news reporting search, not an official dataset',
        }));
        setRows(mapped);
        const series = (((timeline && timeline.timeline && timeline.timeline[0] && timeline.timeline[0].data) || [])).map((p) => {
          const d = String(p.date || '');
          return { year: d.length >= 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : d, n: +p.value || 0 };
        });
        setVol(series.length ? series : null);
        onFeed?.({
          ok: true,
          tier: 'national',
          feature: 'Statement & Quote Tracker with Contradiction Detection',
          rows: mapped,
          source: { adapter: 'news-search', gdelt: true, note: 'Coverage volume, not statements. No contradiction verdict.' },
          coverage: { from: '', through: '7d', exhaustive: false },
          fallback: true,
          meta: {
            heading: 'STATEMENTS & CONTRADICTIONS',
            section: 'STATEMENT COVERAGE — GDELT 2.0',
            status: mapped.length ? 'GDELT 2.0 · 7-DAY WINDOW' : 'OFFLINE',
            volume: series,
            person,
          },
        });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setRows([]);
        setVol(null);
        const fail = 'GDELT wire unreachable from this network — it will retry automatically.';
        setErr(fail);
        onFeed?.({
          ok: true,
          tier: 'national',
          feature: 'Statement & Quote Tracker with Contradiction Detection',
          rows: [],
          source: { adapter: 'news-search', gdelt: true, note: fail },
          coverage: { through: '7d' },
          fallback: true,
          meta: { heading: 'STATEMENTS & CONTRADICTIONS', volume: [], person },
        });
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [person, onFeed]);

  return (
    <div className="nat-panel">
      <div className="feed-head">
        <h1>STATEMENTS & CONTRADICTIONS</h1>
        <span className={`live-feed${rows.length ? ' on' : ''}`}>{loading ? 'LOADING' : rows.length ? 'GDELT 2.0' : 'OFFLINE'}</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
        <TableFilterPop
          feed={{ feature: 'Statement & Contradiction Tracker', rows }}
          q={q}
          onQ={setQ}
          searchPlaceholder="Search headlines"
          vizFilter={vizFilter}
          onClearViz={onClearViz}
        />
      </div>
      <p className="desk-note">
        This is coverage volume, not statements. The desk measures how much a named person is written about. It does not hold their
        statements and cannot compare positions. No TRUE/FALSE/MISLEADING badge. {STATEMENT_LEADERS.length} personas tracked — count only,
        no portraits.
      </p>
      <div className="nls-chips">
        {STATEMENT_LEADERS.map((name, idx) => (
          <button key={name} type="button" className={`nls-chip${i === idx ? ' on' : ''}`} onClick={() => setI(idx)}>
            {name}
          </button>
        ))}
      </div>
      {err ? <p className="banner warn">{err}</p> : null}
      {vol?.length ? (
        <section className="viz-card">
          <header>
            <h3>Coverage volume — 7 days</h3>
          </header>
          <Sparkline
            series={vol}
            peak={vol.reduce((a, b) => (b.n > a.n ? b : a), vol[0])}
            from={vol[0]?.year}
            through={vol[vol.length - 1]?.year}
          />
          <p className="viz-foot">
            {person} · media volume · 7 days · GDELT TimelineVol
          </p>
        </section>
      ) : null}
      <div className="table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>Headline</th>
              <th>Seen</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr>
                <td colSpan={2}>loading…</td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={2}>No coverage rows in this window.</td>
              </tr>
            ) : (
              shown.map((r, n) => (
                <tr key={r.source_url || n} onClick={() => onSelect?.(r)} {...rowDragProps(r, { title: r.title, feature: 'Statements' })}>
                  <td>
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </td>
                  <td>{r.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
