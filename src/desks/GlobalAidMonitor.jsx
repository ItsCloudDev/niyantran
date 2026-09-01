import { useEffect, useMemo, useState } from 'react';
import { compact, hydrateAppeal, money, statsFor } from '../lib/globalAid.js';

export default function GlobalAidMonitor({ feed, selected, onSelect }) {
  const list = useMemo(
    () => (feed?.rows || []).map((r) => hydrateAppeal(r)).filter((p) => p?.id),
    [feed],
  );
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [agency, setAgency] = useState('');
  const [type, setType] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [live, setLive] = useState(null);
  const [liveErr, setLiveErr] = useState('');

  const regions = useMemo(() => [...new Set(list.map((p) => p.region).filter(Boolean))].sort(), [list]);
  const agencies = useMemo(() => [...new Set(list.map((p) => p.agency).filter(Boolean))].sort(), [list]);
  const types = useMemo(() => [...new Set(list.map((p) => p.type).filter(Boolean))].sort(), [list]);
  const stats = useMemo(() => statsFor(list), [list]);
  const selectedId = selected?.id || selected?.__gaId || '';
  const current = list.find((p) => p.id === selectedId) || list[0];
  const wire = feed?.meta?.wire || [];

  const view = useMemo(() => {
    const n = q.trim().toLowerCase();
    return list.filter((p) => {
      if (region && p.region !== region) return false;
      if (agency && p.agency !== agency) return false;
      if (type && p.type !== type) return false;
      if (!n) return true;
      const hay = [p.name, p.agency, p.region, p.geography, p.type, p.sectors.join(' '), p.latest].join(' ').toLowerCase();
      return hay.includes(n);
    });
  }, [list, q, region, agency, type]);

  useEffect(() => {
    if (!list.length) return;
    if (selected && list.some((p) => p.id === (selected.id || selected.__gaId))) return;
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
    fetch(`/api/fts?year=${new Date().getFullYear()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((body) => {
        if (ac.signal.aborted) return;
        if (!body?.ok && !body?.plans?.length) throw new Error(body?.error || 'empty');
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
    return <div className="alw-empty-page">Aid register is unavailable.</div>;
  }

  return (
    <div className="alw-desk gaw-desk">
      <div className="feed-head">
        <h1>GLOBAL AID</h1>
        <button
          type="button"
          className={`live-feed on${liveOpen ? ' is-open' : ''}`}
          onClick={() => setLiveOpen((v) => !v)}
          aria-pressed={liveOpen}
          title="Open live UN OCHA FTS funding"
        >
          ✓ LIVE FEED
        </button>
      </div>
      {liveOpen && (
        <aside className="alw-live" aria-label="Live UN OCHA FTS">
          <div className="alw-live-head">
            <span className="alw-live-dot" />
            <strong>UN OCHA FTS</strong>
            <button type="button" className="alw-live-x" onClick={() => setLiveOpen(false)} aria-label="Close live feed">
              ✕
            </button>
          </div>
          <p className="alw-live-meta">
            {live?.total
              ? `${money(live.total)} tracked in ${live.year} · ${live.planCount || live.plans?.length || 0} response plans`
              : liveErr
                ? 'Live FTS unreachable'
                : 'Loading Financial Tracking Service…'}
          </p>
          <div className="alw-live-sec">FUNDING BY RESPONSE PLAN</div>
          <div className="alw-live-list">
            {(live?.plans || []).map((x) => (
              <a key={x.title} className="alw-live-link" href={x.source_url} target="_blank" rel="noreferrer">
                <label>{money(x.funded)} · {(x.share * 100).toFixed(1)}%</label>
                <span>{x.title}</span>
              </a>
            ))}
          </div>
          {wire.length > 0 && (
            <>
              <div className="alw-live-sec">DATED PROGRAMME UPDATES</div>
              <div className="alw-live-list">
                {wire.slice(0, 6).map((x) => (
                  <a key={x.title} className="alw-live-link" href={x.url} target="_blank" rel="noreferrer">
                    <label>
                      {x.date} · {x.source}
                    </label>
                    <span>{x.title}</span>
                  </a>
                ))}
              </div>
            </>
          )}
          <p className="alw-live-foot">
            {liveErr
              ? 'FTS did not return plans from this network. The appeal register below remains available.'
              : 'Live receipts from api.hpc.tools. Requirements and receipts are separate instruments and are not summed.'}
          </p>
        </aside>
      )}
      <section className="alw-feed" aria-label="Global aid operations register">
        <div className="alw-feedbar">
          <div className="alw-feedtitle">
            <b>Global aid operations register</b>
            <span>Official appeals + financing facilities · source-linked · dated snapshots</span>
          </div>
          <div className="alw-feedstats">
            <div className="alw-feedstat">
              <strong>{stats.programmes}</strong>
              <span>Programmes</span>
            </div>
            <div className="alw-feedstat">
              <strong>{stats.institutions}</strong>
              <span>Institutions</span>
            </div>
            <div className="alw-feedstat">
              <strong>{stats.regions}</strong>
              <span>Regions</span>
            </div>
            <div className="alw-feedstat">
              <strong>
                {stats.programmes}/{stats.programmes}
              </strong>
              <span>Source-linked</span>
            </div>
          </div>
        </div>
        <div className="alw-feedtools">
          <input className="alw-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programme, institution, country or sector" />
          <select className="alw-select" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select className="alw-select" value={agency} onChange={(e) => setAgency(e.target.value)}>
            <option value="">All institutions</option>
            {agencies.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select className="alw-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All programme types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="alw-resultbar">
          <span>
            <b>{view.length}</b> records
          </span>
          <span>Click a row for event analytics</span>
        </div>
        <div className="alw-tablewrap">
          <table className="alw-table">
            <thead>
              <tr>
                <th>Programme</th>
                <th>Institution / region</th>
                <th style={{ textAlign: 'right' }}>Requirement</th>
                <th style={{ textAlign: 'right' }}>People target</th>
                <th>Record status</th>
                <th>Data through</th>
              </tr>
            </thead>
            <tbody>
              {view.map((p) => (
                <tr key={p.id} className={p.id === current?.id ? 'alw-row-selected' : ''} onClick={() => pick(p)}>
                  <td title={p.name}>{p.name}</td>
                  <td className="alw-kind">
                    {p.agency}
                    <div className="gaw-sub">{p.region}</div>
                  </td>
                  <td className="alw-members">{money(p.requirement)}</td>
                  <td className="alw-members">{compact(p.target)}</td>
                  <td className="alw-obligation">{p.status}</td>
                  <td className="alw-date">{p.dataThrough}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
