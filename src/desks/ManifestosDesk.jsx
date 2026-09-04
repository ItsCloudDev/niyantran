import { useEffect, useMemo, useState } from 'react';
import { MANIFESTO_LIBRARY, UNION_PROMISES } from '../data/nationalCurated.js';
import { applyVizFilter } from '../lib/nationalKpi.js';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';
import TableFilterPop, { choiceGroup, matchesChoice } from '../shell/TableFilterPop.jsx';
import { rowDragProps } from '../lib/aiDrop.js';

function curatedRows() {
  return UNION_PROMISES.map(([promise, domain, verifiable_status]) => ({
    promise,
    domain,
    verifiable_status,
    title: promise,
    cycle: '2024',
  }));
}

export default function ManifestosDesk({ selected, onSelect, onFeed, vizFilter, onClearViz }) {
  const rows = useMemo(() => curatedRows(), []);
  const [domain, setDomain] = useState('all');
  const [year, setYear] = useState('2024');
  const domains = useMemo(() => [...new Set(rows.map((r) => r.domain).filter(Boolean))], [rows]);
  const filtered = rows.filter(
    (r) =>
      applyVizFilter(r, vizFilter) &&
      matchesChoice(domain, r.domain, 'all') &&
      (year === 'all' || String(r.cycle || '2024') === year),
  );

  useEffect(() => {
    onFeed?.({
      ok: true,
      tier: 'national',
      feature: 'LS Manifestos & Promises Tracker',
      rows,
      kind: 'curated',
      source: {
        adapter: 'embedded',
        note: 'CURATED · AS OF JAN 2026 · VERIFY AGAINST GAZETTE / PIB. Verifiable status, not fulfilled/broken.',
      },
      coverage: { from: '2024', through: '2024', exhaustive: false },
      fallback: false,
      meta: {
        section: 'UNION MANIFESTO TRACKER — 2024',
        status: 'CURATED · VERIFY AGAINST GAZETTE / PIB',
        heading: 'MANIFESTOS & PROMISES',
      },
    });
  }, [onFeed, rows]);

  return (
    <div className="nat-panel">
      <div className="feed-head">
        <h1>MANIFESTOS & PROMISES</h1>
        <span className="live-feed">CURATED</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
        <TableFilterPop
          feed={{ feature: 'LS Manifestos & Promises Tracker', rows }}
          vizFilter={vizFilter}
          onClearViz={onClearViz}
          extraGroups={[choiceGroup('Domain', domains, domain, setDomain, { allValue: 'all', allLabel: 'All domains' })]}
        />
      </div>
      <div className="desk-strip">
        <span>UNION MANIFESTO TRACKER — 2024 PROMISES</span>
        <span>CURATED · AS OF JAN 2026 · VERIFY AGAINST GAZETTE / PIB</span>
      </div>
      <p className="desk-note">
        Verifiable status, not a fulfilled/broken verdict. A single “% fulfilled” on a named party is an editorial claim — the ladder stays,
        the reader totals it.
      </p>
      <div className="nls-chips">
        <button type="button" className={`nls-chip${year === '2024' ? ' on' : ''}`} onClick={() => setYear('2024')}>
          2024
        </button>
        <button type="button" className="nls-chip" disabled title="Only one national cycle is in this tracker">
          Filter by year
        </button>
        <button type="button" className="nls-chip" disabled title="Party is not a column on these Union 2024 rows">
          Filter by party
        </button>
      </div>
      <div className="table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>Promise</th>
              <th>Domain</th>
              <th>Verifiable status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.promise || i}
                className={selected?.promise === r.promise ? 'on' : ''}
                onClick={() => onSelect?.(selected?.promise === r.promise ? null : r)}
                {...rowDragProps(r, { title: r.promise || r.title, feature: 'Manifestos' })}
              >
                <td>{r.promise || r.title}</td>
                <td>{r.domain}</td>
                <td>{r.verifiable_status || r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="nat-subh">Manifesto library</h3>
      <ul className="nat-lib">
        {MANIFESTO_LIBRARY.map(([lab, href]) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noreferrer">
              {lab}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
