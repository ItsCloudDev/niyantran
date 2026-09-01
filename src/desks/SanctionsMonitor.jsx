import { useEffect, useMemo, useState } from 'react';
import { hydrateSanction, issuerTokens, statsFor } from '../lib/sanctions.js';

export default function SanctionsMonitor({ feed, selected, onSelect }) {
  const list = useMemo(
    () => (feed?.rows || []).map((r) => hydrateSanction(r)).filter((p) => p?.id),
    [feed],
  );
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [live, setLive] = useState(null);
  const [liveErr, setLiveErr] = useState('');

  const regions = useMemo(() => [...new Set(list.map((p) => p.region).filter(Boolean))].sort(), [list]);
  const types = useMemo(() => [...new Set(list.map((p) => p.type).filter(Boolean))].sort(), [list]);
  const stats = useMemo(() => statsFor(list), [list]);
  const asOf = feed?.meta?.asOf || '';
  const selectedId = selected?.id || selected?.__snId || '';
  const current = list.find((p) => p.id === selectedId) || list[0];

  const view = useMemo(() => {
    const n = q.trim().toLowerCase();
    return list.filter((p) => {
      if (region && p.region !== region) return false;
      if (type && p.type !== type) return false;
      if (status && p.status !== status) return false;
      if (!n) return true;
      const hay = [p.name, p.issuer, p.target, p.reason, p.sectors.join(' '), p.type].join(' ').toLowerCase();
      return hay.includes(n);
    });
  }, [list, q, region, type, status]);

  useEffect(() => {
    if (!list.length) return;
    if (selected && list.some((p) => p.id === (selected.id || selected.__snId))) return;
    onSelect?.(list[0].row);
  }, [list, selected, onSelect]);

  useEffect(() => {
    if (!liveOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setLiveOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [liveOpen]);

  useEffect(() => {
    if (!liveOpen) return undefined;
    const ac = new AbortController();
    setLiveErr('');
    fetch('/api/opensanctions', { signal: ac.signal })
      .then((r) => r.json())
      .then((body) => {
        if (ac.signal.aborted) return;
        if (!body?.ok && !body?.lists?.length) throw new Error(body?.error || 'empty');
        setLive(body);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setLiveErr(e.message || String(e));
      });
    return () => ac.abort();
  }, [liveOpen]);

  function pick(p) {
    onSelect?.(p.row || p);
  }

  if (!list.length) {
    return <div className="alw-empty-page">Sanctions register is unavailable.</div>;
  }

  return (
    <div className="alw-desk snw-desk">
      <div className="feed-head">
        <h1>SANCTIONS</h1>
        <button
          type="button"
          className={`live-feed on${liveOpen ? ' is-open' : ''}`}
          onClick={() => setLiveOpen((v) => !v)}
          aria-pressed={liveOpen}
          title="Open live OpenSanctions lists"
        >
          ✓ LIVE FEED
        </button>
      </div>
      {liveOpen && (
        <aside className="alw-live" aria-label="Live OpenSanctions lists">
          <div className="alw-live-head">
            <span className="alw-live-dot" />
            <strong>OpenSanctions</strong>
            <button type="button" className="alw-live-x" onClick={() => setLiveOpen(false)} aria-label="Close live feed">
              ✕
            </button>
          </div>
          <p className="alw-live-meta">
            {live?.targetCount
              ? `${live.targetCount.toLocaleString()} sanctioned targets · updated ${live.updated || '—'}`
              : liveErr
                ? 'Live catalogue unreachable'
                : 'Loading daily list catalogue…'}
          </p>
          <div className="alw-live-sec">LISTS BY TARGET COUNT</div>
          <div className="alw-live-list">
            {(live?.lists || []).map((x) => (
              <a key={x.title} className="alw-live-link" href={x.url || 'https://www.opensanctions.org/'} target="_blank" rel="noreferrer">
                <label>
                  {x.updated} · {x.publisher || x.country || 'Publisher'}
                </label>
                <span>
                  {x.title} · {(x.targets || 0).toLocaleString()} targets
                </span>
              </a>
            ))}
          </div>
          <p className="alw-live-foot">
            {liveErr
              ? 'OpenSanctions did not return lists from this network. Programme register below is source-linked and remains available.'
              : 'Live catalogue from data.opensanctions.org. List counts are publisher figures, not a score.'}
          </p>
        </aside>
      )}
      <section className="alw-feed" aria-label="Sanctions monitor">
        <div className="alw-feedbar">
          <div className="alw-feedtitle">
            <b>Sanctions monitor</b>
            <span>Programme register · official-source links · as of {asOf || '—'}</span>
          </div>
          <div className="alw-feedstats">
            <div className="alw-feedstat">
              <strong>{stats.regimes}</strong>
              <span>Regimes</span>
            </div>
            <div className="alw-feedstat">
              <strong>{stats.issuers}</strong>
              <span>Issuer groups</span>
            </div>
            <div className="alw-feedstat">
              <strong>{stats.regions}</strong>
              <span>Regions</span>
            </div>
          </div>
        </div>
        <div className="alw-feedtools">
          <input className="alw-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programme, issuer or sector" />
          <select className="alw-select" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select className="alw-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All regime types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="alw-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="escalating">escalating</option>
            <option value="under-review">under-review</option>
          </select>
        </div>
        <div className="alw-resultbar">
          <span>
            <b>{view.length}</b> programmes shown
          </span>
          <span>Click a row for event analytics</span>
        </div>
        <div className="alw-tablewrap">
          <table className="alw-table">
            <thead>
              <tr>
                <th>Programme / target</th>
                <th>Issuing authorities</th>
                <th>Economic perimeter</th>
                <th style={{ textAlign: 'right' }}>Listed scope</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {view.map((p) => (
                <tr key={p.id} className={p.id === current?.id ? 'alw-row-selected' : ''} onClick={() => pick(p)}>
                  <td title={p.name}>{p.name}</td>
                  <td className="alw-kind" title={p.issuer}>
                    {issuerTokens(p).join(' · ')}
                  </td>
                  <td title={p.sectors.join(', ')}>{p.sectors.slice(0, 2).join(' · ')}</td>
                  <td className="alw-members">{p.entities}</td>
                  <td className="alw-obligation">{p.status}</td>
                  <td className="alw-go">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
