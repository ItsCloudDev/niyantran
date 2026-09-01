import { useEffect, useMemo, useState } from 'react';
import { hydrateAsset } from '../lib/strategicAssets.js';

function tone(status, kind) {
  const s = `${status} ${kind}`.toLowerCase();
  if (/strategic|warhead|publicly reported/.test(s)) return 'strategic';
  if (/construction|commissioning|licensing|development/.test(s)) return 'building';
  return 'operating';
}

function options(list, key) {
  return [...new Set(list.map((p) => p[key]).filter(Boolean))].sort();
}

export default function NuclearWatch({ feed, selected, onSelect }) {
  const list = useMemo(
    () => (feed?.rows || []).map((r) => hydrateAsset(r, 'nuclear')).filter((p) => p?.id),
    [feed],
  );
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const strip = feed?.meta?.strip || {};
  const selectedId = selected?.id || selected?.__saId || '';

  const view = useMemo(() => {
    const n = q.trim().toLowerCase();
    return list.filter((p) => {
      if (kind && p.facilityKind !== kind) return false;
      if (region && p.region !== region) return false;
      if (status && p.status !== status) return false;
      if (!n) return true;
      return [p.name, p.country, p.region, p.facilityKind, p.status, p.operators, p.material, p.scope, p.capacity]
        .join(' ')
        .toLowerCase()
        .includes(n);
    });
  }, [list, q, kind, region, status]);

  useEffect(() => {
    if (!list.length) return;
    if (selected && list.some((p) => p.id === (selected.id || selected.__saId))) return;
    onSelect?.(list[0].row);
  }, [list, selected, onSelect]);

  if (!list.length) return <div className="alw-empty-page">Nuclear register is unavailable.</div>;

  const countries = new Set(list.map((p) => p.country)).size;

  return (
    <div id="nwwNuclearFeed">
      <section className="nww-feedbar">
        <div>
          <h2>Nuclear Watch</h2>
          <p>Public-source civilian and strategic nuclear facility register</p>
        </div>
        <span className="nww-feed-meta">
          <b>{view.length}</b> records · {countries} countries
        </span>
      </section>
      <div className="nww-global-strip">
        <div>
          <label>Power reactors</label>
          <strong>{strip.operatingReactors || '417 operating'}</strong>
          <span>IAEA PRIS · 26 Jul 2026</span>
        </div>
        <div>
          <label>Reactor pipeline</label>
          <strong>{strip.reactorPipeline || '77 building'}</strong>
          <span>21 suspended · IAEA PRIS</span>
        </div>
        <div>
          <label>Identified uranium</label>
          <strong>{strip.identifiedUranium || '7.9345M tU'}</strong>
          <span>&lt; USD 260/kgU · Red Book 2024</span>
        </div>
        <div>
          <label>Global inventory</label>
          <strong>{strip.inventory || '12,187 warheads'}</strong>
          <span>SIPRI estimate · Jan 2026</span>
        </div>
      </div>
      <div className="nww-filters">
        <input
          className="nww-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search facility, country, operator or material"
        />
        <select className="nww-select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All facility classes</option>
          {options(list, 'facilityKind').map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="nww-select" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {options(list, 'region').map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="nww-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All recorded statuses</option>
          {options(list, 'status').map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <div className="nww-feednote">
        <span>Public facility and country-resource records</span>
        <span>Click for Event Analytics</span>
      </div>
      <div className="nww-tablewrap">
        <table className="nww-table">
          <colgroup>
            <col style={{ width: '31%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '28%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Facility / country</th>
              <th>Class / region</th>
              <th>Recorded status</th>
              <th>Latest source record</th>
            </tr>
          </thead>
          <tbody>
            {view.map((p) => (
              <tr
                key={p.id}
                className={p.id === selectedId ? 'nww-row-selected' : ''}
                onClick={() => onSelect?.(p.row)}
              >
                <td>
                  <div className="nww-facility">
                    <i className="nww-dot" />
                    <div>
                      <strong title={p.name}>{p.name}</strong>
                      <small>{p.country}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="nww-cell">
                    <strong title={p.facilityKind}>{p.facilityKind}</strong>
                    <small>{p.region}</small>
                  </div>
                </td>
                <td>
                  <span className="nww-status" data-tone={tone(p.status, p.facilityKind)}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="nww-record">
                    <strong>{p.sourceLabel}</strong>
                    <span title={p.note}>{p.note}</span>
                    <small>Checked {p.row?.checked}</small>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
