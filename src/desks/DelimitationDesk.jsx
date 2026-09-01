import { useEffect, useMemo, useState } from 'react';
import { DELIM_SIZES } from '../data/nationalCurated.js';
import { allocateSeats, applyVizFilter } from '../lib/nationalKpi.js';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';

export default function DelimitationDesk({ selected, onSelect, onFeed, vizFilter, onClearViz }) {
  const [house, setHouse] = useState(753);
  const rows = useMemo(() => allocateSeats(house), [house]);
  const shown = useMemo(() => rows.filter((r) => applyVizFilter(r, vizFilter)), [rows, vizFilter]);
  const sum = rows.reduce((s, r) => s + r.proj, 0);
  const gain = rows.filter((r) => r.d > 0).length;
  const lose = rows.filter((r) => r.d < 0).length;
  const gainer = rows.filter((r) => r.d > 0)[0];
  const loser = [...rows].filter((r) => r.d < 0).sort((a, b) => a.d - b.d)[0];

  useEffect(() => {
    publish(house);
    // publish the baseline once so analytics is not "unwired"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function publish(nextHouse) {
    const next = allocateSeats(nextHouse);
    setHouse(nextHouse);
    onFeed?.({
      ok: true,
      tier: 'national',
      feature: 'Delimitation Impact Simulator',
      rows: next,
      kind: 'simulator',
      source: {
        adapter: 'internal',
        note: 'SIMULATION · LARGEST REMAINDER · NCP 2011–36 PROJECTIONS · ILLUSTRATIVE',
        kind: 'simulator',
      },
      coverage: { from: '2011', through: '2036', exhaustive: false },
      fallback: false,
      meta: {
        section: 'SEAT REALLOCATION SIMULATOR',
        status: 'SIMULATION · LARGEST REMAINDER · NCP 2011–36 · ILLUSTRATIVE',
        heading: 'DELIMITATION SIMULATOR',
        kind: 'simulator',
        house: nextHouse,
      },
    });
  }

  return (
    <div className="nat-panel">
      <div className="feed-head">
        <h1>DELIMITATION SIMULATOR</h1>
        <span className="live-feed">SIMULATION</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
      </div>
      <div className="desk-strip">
        <span>SEAT REALLOCATION — POPULATION-PROPORTIONAL</span>
        <span>LARGEST REMAINDER · NCP 2011–36 · ILLUSTRATIVE</span>
      </div>
      <div className="nls-chips">
        {DELIM_SIZES.map(([h, lab]) => (
          <button key={h} type="button" className={`nls-chip${house === h ? ' on' : ''}`} onClick={() => publish(h)}>
            {lab}
          </button>
        ))}
      </div>
      <p className="desk-note">
        House of {house} · allocation check Σ = {sum} · {gain} states gain, {lose} lose · seats frozen on the 1971 census since 1976.
        Select a row for the full state record. Analytics read this simulator output — they are not a second dataset.
      </p>
      <div className="nat-kpi-row">
        <article>
          <h3>Seats before</h3>
          <strong>543</strong>
        </article>
        <article>
          <h3>Seats after</h3>
          <strong>{house}</strong>
        </article>
        <article className={house >= 543 ? 'ok' : 'bad'}>
          <h3>Net change</h3>
          <strong>{house >= 543 ? '+' : ''}{house - 543}</strong>
        </article>
        <article>
          <h3>Largest gainer</h3>
          <strong>{gainer?.name || '—'}</strong>
          <span>{gainer ? `+${gainer.d}` : ''}</span>
        </article>
        <article>
          <h3>Largest loser</h3>
          <strong>{loser?.name || '—'}</strong>
          <span>{loser ? String(loser.d) : ''}</span>
        </article>
      </div>
      <div className="table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>State / UT</th>
              <th>2026 pop. (M, proj.)</th>
              <th>Seats now</th>
              <th>Projected</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.name}
                className={selected?.name === r.name ? 'on' : ''}
                onClick={() => onSelect?.(selected?.name === r.name ? null : r)}
              >
                <td>{r.name}</td>
                <td className="num">{(r.pop / 1000).toFixed(1)}</td>
                <td className="num">{r.now}</td>
                <td className="num">{r.proj}</td>
                <td className={`num${r.d > 0 ? ' pos' : r.d < 0 ? ' neg' : ''}`}>
                  {r.d > 0 ? '+' : ''}
                  {r.d}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
