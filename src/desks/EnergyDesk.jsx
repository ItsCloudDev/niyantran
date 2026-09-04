import { useMemo, useState, Fragment } from 'react';
import { energyStatusOf } from '../lib/geonomics.js';
import GeoDotsMap from './GeoDotsMap.jsx';
import { applyVizFilter } from '../lib/nationalKpi.js';
import TableFilterPop from '../shell/TableFilterPop.jsx';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';
import { aiDragProps } from '../lib/aiDrop.js';

const AI_SUMMARY =
  'The geoeconomic story is refining concentration, not just mining: China controls ~90% of rare-earth processing and near-monopoly on gallium/germanium — direct leverage in the chip war. Energy prices carry a persistent Middle-East risk premium. Uranium is re-rating on the nuclear revival.';

const PROMPTS = [
  [
    'Choke leverage',
    'Which critical mineral gives China the most usable coercive leverage over the West, and how fast can it be diversified?',
  ],
  [
    'Energy shock',
    'Trace how a Hormuz or Red Sea shock would flow through to Indian inflation and the rupee.',
  ],
  [
    'Friend-shoring',
    'Where is Western friend-shoring of critical minerals actually working vs. stalling?',
  ],
];

const SOURCES = [
  ['EIA', 'https://www.eia.gov/'],
  ['IEA critical minerals', 'https://www.iea.org/topics/critical-minerals'],
  ['USGS Mineral Commodity Summaries', 'https://www.usgs.gov/centers/national-minerals-information-center'],
  ['Trading Economics', 'https://tradingeconomics.com/commodities'],
];

export default function EnergyDesk({ feed, selected, onSelect, onAsk, vizFilter, onClearViz }) {
  const rawMinerals = useMemo(
    () => (feed?.rows || []).filter((r) => r.id && r.name).sort((a, b) => (b.intensity || 0) - (a.intensity || 0)),
    [feed],
  );
  const minerals = useMemo(() => rawMinerals.filter((r) => applyVizFilter(r, vizFilter)), [rawMinerals, vizFilter]);
  const commodities = feed?.meta?.commodities || [];
  const stats = feed?.meta?.stats || {};
  const asOf = feed?.meta?.asOf || '2026-07';
  const weaponised = minerals.filter((m) => m.status === 'escalating').length;
  const selectedId = selected?.id || minerals[0]?.id || '';
  const [openId, setOpenId] = useState('');

  const mapPts = minerals.map((m) => {
    const s = energyStatusOf(m.status);
    return {
      id: m.id,
      name: m.name,
      lat: m.lat,
      lon: m.lon,
      intensity: m.intensity,
      color: s.c,
      statusL: s.l,
    };
  });

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ asOf, stats, commodities, minerals }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'niyantran-energy-minerals.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!rawMinerals.length) return <div className="alw-empty-page">Energy register is unavailable.</div>;

  return (
    <div className="cpd">
      <div className="geo-top">
        <span className="geo-risk">ENERGY & CRITICAL MINERALS</span>
        <span className="geo-asof">AS OF {String(asOf).toUpperCase()} · GEOECONOMIC LEVERAGE</span>
        <span className="geo-actions">
          <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
          <TableFilterPop feed={feed} vizFilter={vizFilter} onClearViz={onClearViz} />
          <button type="button" className="geo-btn" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" className="geo-btn pri" onClick={() => onAsk?.(PROMPTS[0][1])}>
            Ask AI
          </button>
        </span>
      </div>
      <div className="geo-kpis">
        {[
          [stats.brent || '—', 'Brent', 'warn'],
          [stats.wti || '—', 'WTI', 'warn'],
          [stats.ttfGas || '—', 'EU gas (TTF)', 'warn'],
          [minerals.length, 'Critical minerals', 'acc'],
          [weaponised, 'Weaponised', 'bad'],
          ['China', 'Refining leader', 'bad'],
        ].map(([v, k, tone]) => (
          <div key={k} className="geo-kpi">
            <div className={`geo-kpi-v${tone ? ` ${tone}` : ''}`}>{v}</div>
            <div className="geo-kpi-k">{k}</div>
          </div>
        ))}
      </div>
      <GeoDotsMap
        points={mapPts}
        legend={[
          ['#ff8f3f', 'Escalating'],
          ['#ff6f6f', 'Concentrated'],
        ]}
        onPick={(d) => {
          const hit = minerals.find((m) => m.id === d.id);
          if (hit) {
            onSelect?.(hit);
            setOpenId(hit.id);
          }
        }}
        ariaLabel="Critical mineral concentrations"
      />
      <div className="geo-grid">
        <div>
          <section className="geo-panel">
            <div className="geo-panel-h">
              <span>Commodity prices</span>
            </div>
            <div className="geo-panel-b">
              {commodities.map((c) => {
                const up = String(c.chg || '').startsWith('+');
                return (
                  <div key={c.k} className="geo-bar">
                    <span className="geo-bar-l">{c.k}</span>
                    <span className="geo-bar-t">
                      <i
                        style={{
                          width: `${Math.max(2, Math.min(100, c.pct || 2))}%`,
                          background: up ? '#48d17f' : '#ff6f6f',
                        }}
                      />
                    </span>
                    <span className="geo-bar-v">
                      {c.v}  {c.chg}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="geo-panel">
            <div className="geo-panel-h">
              <span>Critical minerals · supply leverage</span>
            </div>
            <div className="geo-panel-b">
              {minerals.map((m) => {
                const s = energyStatusOf(m.status);
                const on = openId === m.id || m.id === selectedId;
                return (
                  <div key={m.id} className={`geo-card${on && openId === m.id ? ' open' : ''}${m.id === selectedId ? ' hl' : ''}`}>
                    <button
                      type="button"
                      className="geo-card-h"
                      onClick={() => {
                        onSelect?.(m);
                        setOpenId((id) => (id === m.id ? '' : m.id));
                      }}
                      {...aiDragProps({ kind: 'row', feature: feed?.feature, title: m.name, row: m })}
                    >
                      <span className="geo-card-dot" style={{ color: s.c, background: s.c }} />
                      <span className="geo-card-nm">{m.name}</span>
                      <span className="geo-card-st" style={{ background: `${s.c}22`, color: s.c }}>
                        {s.l}
                      </span>
                      <span className="geo-card-int">{m.intensity}</span>
                    </button>
                    {on && openId === m.id && (
                      <div className="geo-card-b">
                        <dl className="geo-fields">
                          <dt>Use</dt>
                          <dd>{m.use}</dd>
                          <dt>Top producers</dt>
                          <dd>{m.topProducers}</dd>
                          <dt>China share</dt>
                          <dd>{m.chinaShare}</dd>
                        </dl>
                        <div className="geo-card-latest">{m.note || m.latest}</div>
                        {Array.isArray(m.sources) && m.sources.length ? (
                          <div className="geo-src">
                            {m.sources.map((pair) => (
                              <a key={pair[1]} href={pair[1]} target="_blank" rel="noopener noreferrer">
                                {pair[0]} ↗
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div>
          <div className="geo-ai">
            <h4>◆ AI Intelligence Summary</h4>
            <p>{AI_SUMMARY}</p>
            <div className="geo-ai-q">
              {PROMPTS.map(([label, q]) => (
                <button key={label} type="button" onClick={() => onAsk?.(q)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <section className="geo-panel">
            <div className="geo-panel-h">
              <span>Benchmark levels</span>
            </div>
            <div className="geo-panel-b">
              <dl className="geo-kv">
                {commodities.slice(0, 3).map((c) => (
                  <Fragment key={c.k}>
                    <dt>{c.k}</dt>
                    <dd>{c.v}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </section>
          <section className="geo-panel">
            <div className="geo-panel-h">
              <span>Sources & Methodology</span>
            </div>
            <div className="geo-panel-b">
              <div className="geo-src">
                {SOURCES.map(([label, href]) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer">
                    {label} ↗
                  </a>
                ))}
              </div>
              <p className="gld-src-note">{stats.note || 'Illustrative levels — swaps to EIA/Trading Economics live.'} {asOf}.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
