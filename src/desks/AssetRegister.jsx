import { useEffect, useMemo, useState } from 'react';
import {
  deskCopy,
  hydrateAsset,
  statsFor,
  strategicKind,
} from '../lib/strategicAssets.js';

function filterOptions(list, key) {
  return [...new Set(list.map((p) => p[key]).filter(Boolean))].sort();
}

export default function AssetRegister({ feed, selected, onSelect, featureName }) {
  const kind = strategicKind(featureName || feed?.feature);
  const copy = deskCopy(kind);
  const list = useMemo(
    () => (feed?.rows || []).map((r) => hydrateAsset(r, kind)).filter((p) => p?.id),
    [feed, kind],
  );
  const [q, setQ] = useState('');
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [live, setLive] = useState(null);
  const [liveErr, setLiveErr] = useState('');

  const selectedId = selected?.id || selected?.__saId || '';
  const current = list.find((p) => p.id === selectedId) || list[0];
  const stats = statsFor(kind, list);
  const filterKeys = copy.filters || [];
  const opt1 = filterKeys[0] ? filterOptions(list, filterKeys[0]) : [];
  const opt2 = filterKeys[1] ? filterOptions(list, filterKeys[1]) : [];
  const opt3 = filterKeys[2] ? filterOptions(list, filterKeys[2]) : [];

  const view = useMemo(() => {
    const n = q.trim().toLowerCase();
    return list.filter((p) => {
      if (filterKeys[0] && f1 && p[filterKeys[0]] !== f1) return false;
      if (filterKeys[1] && f2 && p[filterKeys[1]] !== f2) return false;
      if (filterKeys[2] && f3 && p[filterKeys[2]] !== f3) return false;
      if (!n) return true;
      const hay = [p.name, p.region, p.country, p.sector, p.facilityKind, p.operators, p.provider, p.pad, p.note, p.status]
        .join(' ')
        .toLowerCase();
      return hay.includes(n);
    });
  }, [list, q, f1, f2, f3, filterKeys]);

  useEffect(() => {
    if (!list.length) return;
    if (selected && list.some((p) => p.id === (selected.id || selected.__saId))) return;
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
    if (!copy.liveUrl) {
      setLive({ ok: true, rows: feed?.meta?.arsenal || [], source: 'fas-sipri' });
      setLiveErr('');
      return undefined;
    }
    const ac = new AbortController();
    setLiveErr('');
    fetch(copy.liveUrl, { signal: ac.signal })
      .then((r) => r.json())
      .then((body) => {
        if (ac.signal.aborted) return;
        if (!body?.ok && !body?.rows?.length) throw new Error(body?.error || 'empty');
        setLive(body);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setLiveErr(e.message || String(e));
      });
    return () => ac.abort();
  }, [liveOpen, copy.liveUrl, feed]);

  if (!kind) return null;
  if (!list.length) return <div className="alw-empty-page">{copy.empty}</div>;

  function cell(p, i) {
    if (kind === 'chokepoint') {
      return [p.name, p.region, p.operators, p.oil, p.status][i];
    }
    if (kind === 'infra') {
      return [p.name, p.sector, p.region, p.status, p.expected][i];
    }
    if (kind === 'nuclear') {
      return [p.name, p.facilityKind, p.status, p.note][i];
    }
    return [p.name, p.provider, p.pad, p.expected, p.status][i];
  }

  const liveRows = live?.rows || [];

  return (
    <div className="alw-desk saw-desk">
      <div className="feed-head">
        <h1>{copy.title}</h1>
        <button
          type="button"
          className={`live-feed on${liveOpen ? ' is-open' : ''}`}
          onClick={() => setLiveOpen((v) => !v)}
          aria-pressed={liveOpen}
          title={copy.liveTitle}
        >
          ✓ LIVE FEED
        </button>
      </div>
      {liveOpen && (
        <aside className="alw-live" aria-label={copy.liveTitle}>
          <div className="alw-live-head">
            <span className="alw-live-dot" />
            <strong>{copy.liveTitle}</strong>
            <button type="button" className="alw-live-x" onClick={() => setLiveOpen(false)} aria-label="Close live feed">
              ✕
            </button>
          </div>
          <p className="alw-live-meta">
            {liveErr
              ? 'Live source unreachable'
              : live?.date
                ? `Transit day ${String(live.date).slice(0, 10)} · ${liveRows.length} chokepoints`
                : live?.total
                  ? `${live.total.toLocaleString()} objects in the last 30 days`
                  : liveRows.length
                    ? `${liveRows.length} records`
                    : 'Loading…'}
          </p>
          <div className="alw-live-sec">{copy.liveHint}</div>
          <div className="alw-live-list">
            {kind === 'nuclear'
              ? liveRows.map((x) => (
                  <div key={x.state} className="alw-live-link">
                    <label>
                      {x.warheads} · estimate
                    </label>
                    <span>
                      {x.state} · {x.note}
                    </span>
                  </div>
                ))
              : liveRows.map((x) => {
                  const href = x.url || x.source_url;
                  const inner = (
                    <>
                      <label>
                        {x.country || x.epoch || x.transits != null ? `${x.transits ?? x.country ?? x.epoch}` : x.provider || x.approved || 'Record'}
                      </label>
                      <span>{x.title || x.name}</span>
                    </>
                  );
                  return href ? (
                    <a key={x.title || x.id} className="alw-live-link" href={href} target="_blank" rel="noreferrer">
                      {inner}
                    </a>
                  ) : (
                    <div key={x.title || x.id} className="alw-live-link">
                      {inner}
                    </div>
                  );
                })}
          </div>
          <p className="alw-live-foot">
            {liveErr
              ? 'The live overlay did not return rows. The source-linked register below remains available.'
              : copy.liveHint}
          </p>
        </aside>
      )}
      <section className="alw-feed" aria-label={copy.kicker}>
        <div className="alw-feedbar">
          <div className="alw-feedtitle">
            <b>{copy.kicker}</b>
            <span>{copy.sub}</span>
          </div>
          <div className="alw-feedstats">
            {stats.map(([n, label]) => (
              <div key={label} className="alw-feedstat">
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="alw-feedtools">
          <input className="alw-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.search} />
          {filterKeys[0] && (
            <select className="alw-select" value={f1} onChange={(e) => setF1(e.target.value)}>
              <option value="">All {filterKeys[0].replace(/facilityKind/, 'classes')}</option>
              {opt1.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
          {filterKeys[1] && (
            <select className="alw-select" value={f2} onChange={(e) => setF2(e.target.value)}>
              <option value="">All {filterKeys[1]}</option>
              {opt2.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
          {filterKeys[2] && (
            <select className="alw-select" value={f3} onChange={(e) => setF3(e.target.value)}>
              <option value="">All {filterKeys[2]}</option>
              {opt3.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
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
                {copy.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((p) => (
                <tr key={p.id} className={p.id === current?.id ? 'alw-row-selected' : ''} onClick={() => onSelect?.(p.row || p)}>
                  {copy.columns.map((c, i) => (
                    <td key={c} className={i === copy.columns.length - 1 ? 'alw-obligation' : i === 1 ? 'alw-kind' : ''} title={String(cell(p, i) || '')}>
                      {i === 0 && kind === 'nuclear' ? (
                        <>
                          {p.name}
                          <div className="gaw-sub">{p.country}</div>
                        </>
                      ) : (
                        cell(p, i)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
