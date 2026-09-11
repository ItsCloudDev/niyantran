import { useEffect, useRef, useState } from 'react';
import ads from '../data/home-ads.json';
import zine from '../data/home-zine.json';
import {
  homeCacheHasRows,
  isHomeCacheFresh,
  kickHomeRefreshIfDue,
  loadHomeCache,
  saveHomeCache,
} from '../lib/homeCache.js';
import { homeLatestFromStatic, homeMarketsFromStatic, homePulseFromStatic } from '../lib/homeStatic.js';
import { liveApiEnabled } from '../lib/apiMode.js';
import { loadRefreshCfg } from '../lib/refreshStore.js';
import { aiDragProps } from '../lib/aiDrop.js';
import { dedupeNewsRows } from '../lib/newsDedup.js';
import { applyRecordChecklistToFeed } from '../lib/recordChecklist.js';
import { prepareHomeMarketQuotes } from '../lib/homeMarkets.js';

async function getJson(path, signal) {
  const route = String(path).split('?')[0];
  // D2: on static production, skip /api/home/* (404) and load archives directly.
  if (liveApiEnabled()) {
    try {
      const res = await fetch(path, { signal });
      const body = await res.json().catch(() => null);
      if (res.ok && body && (body.rows?.length || body.ok !== false)) return body;
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
    }
  }
  if (route === '/api/home/markets') return homeMarketsFromStatic(signal);
  if (route === '/api/home/latest') return homeLatestFromStatic(signal);
  if (route === '/api/home/pulse') return homePulseFromStatic(signal);
  throw new Error(`HTTP ${route} unavailable`);
}

function fmtPx(n) {
  if (n == null || Number.isNaN(Number(n))) return '…';
  const v = Number(n);
  return v.toLocaleString('en-IN', { maximumFractionDigits: v > 999 ? 0 : 2 });
}

function chClass(n) {
  if (n == null) return '';
  return n >= 0 ? 'up' : 'dn';
}

function chText(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  return `${v >= 0 ? '▲' : '▼'}${Math.abs(v).toFixed(digits)}%`;
}

function Spark({ values, up }) {
  const c = (values || []).filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  if (c.length < 2) return null;
  const w = 56;
  const h = 16;
  const min = Math.min(...c);
  const max = Math.max(...c);
  const r = max - min || 1;
  const pts = c
    .map((v, i) => `${((i / (c.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / r) * (h - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" aria-hidden="true" className="nh-spark">
      <polyline points={pts} fill="none" stroke={up ? '#72C36B' : '#C1524B'} strokeWidth="1.4" opacity="0.9" />
    </svg>
  );
}

function AgentBadge({ ageH }) {
  if (ageH == null || !Number.isFinite(Number(ageH))) return null;
  const label = ageH < 1 ? '<1h' : `${Math.round(ageH)}h`;
  return <span className="nh-agent">↻ agent · {label} ago</span>;
}

export default function HomeDesk({ onOpen, onFeed, onSelect, onLoading, reload }) {
  const boot = loadHomeCache();
  const [markets, setMarkets] = useState(boot?.markets?.rows || []);
  const [latest, setLatest] = useState(boot?.latest?.rows || []);
  const [pulse, setPulse] = useState(boot?.pulse?.rows || []);
  const [meta, setMeta] = useState({
    markets: boot?.markets || null,
    latest: boot?.latest || null,
    pulse: boot?.pulse || null,
  });
  const [ad, setAd] = useState(0);
  const [loading, setLoading] = useState(!homeCacheHasRows(boot));
  const prevReload = useRef(reload);

  const featured = zine[0];
  const latestShown = dedupeNewsRows(
    (latest || []).map((r) => ({
      title: r.title,
      source_url: r.link,
      date: r.pub || r.ago,
      outlet: r.src,
      link: r.link,
      src: r.src,
      ago: r.ago,
      dek: r.dek,
      pub: r.pub,
    })),
  ).map((r) => ({
    title: r.title,
    link: r.link || r.source_url,
    src: r.src || r.outlet,
    ago: r.ago,
    dek: r.dek,
    pub: r.pub || r.published || r.date,
    related_count: r.related_count,
  }));
  const pulseShown = dedupeNewsRows(
    (pulse || []).map((r) => ({
      title: r.title,
      source_url: r.link,
      date: r.time,
      region: r.region,
      link: r.link,
      time: r.time,
      dek: r.dek,
    })),
  ).map((r) => ({
    ...r,
    link: r.link || r.source_url,
    time: r.time || r.published || r.date,
  }));

  useEffect(() => {
    if (!ads.length) return undefined;
    const t = setInterval(() => setAd((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const force = prevReload.current !== reload;
    prevReload.current = reload;
    const hours = loadRefreshCfg().intervalHours;
    const cached = loadHomeCache();
    const hasCache = homeCacheHasRows(cached);

    function applyFeed(marketsBody, latestBody, pulseBody) {
      if (latestBody?.rows?.length) {
        const rows = dedupeNewsRows(
          latestBody.rows.map((r) => ({ title: r.title, source_url: r.link, date: r.pub, status: '' })),
        );
        onFeed(
          applyRecordChecklistToFeed({
            feature: 'Home',
            rows,
            source: { adapter: 'rss', note: latestBody.note, gdelt: false },
            fallback: Boolean(latestBody.archive),
          }),
        );
      } else if (pulseBody?.rows?.length) {
        const rows = dedupeNewsRows(
          pulseBody.rows.map((r) => ({ title: r.title, source_url: r.link, date: r.time, status: '' })),
        );
        onFeed(
          applyRecordChecklistToFeed({
            feature: 'Conflict Pulse',
            rows,
            source: {
              adapter: pulseBody.gdelt ? 'news-search' : 'embedded',
              note: pulseBody.note,
              gdelt: Boolean(pulseBody.gdelt),
            },
            fallback: Boolean(pulseBody.archive),
          }),
        );
      }
      onSelect(null);
    }

    function paintCache(c) {
      if (!c) return;
      setMarkets(c.markets?.rows || []);
      setLatest(c.latest?.rows || []);
      setPulse(c.pulse?.rows || []);
      setMeta({ markets: c.markets, latest: c.latest, pulse: c.pulse });
      setLoading(false);
      onLoading?.(false);
    }

    async function pullSnapshots(fresh) {
      const q = `maxAgeH=${encodeURIComponent(hours)}${fresh ? '&fresh=1' : ''}`;
      const [m, l, p] = await Promise.allSettled([
        getJson(`/api/home/markets?${q}`, ac.signal),
        getJson(`/api/home/latest?${q}`, ac.signal),
        getJson(`/api/home/pulse?${q}`, ac.signal),
      ]);
      if (ac.signal.aborted) return;
      const marketsBody = m.status === 'fulfilled' ? m.value : null;
      const latestBody = l.status === 'fulfilled' ? l.value : null;
      const pulseBody = p.status === 'fulfilled' ? p.value : null;
      if (marketsBody?.rows) setMarkets(marketsBody.rows);
      if (latestBody?.rows) setLatest(latestBody.rows);
      if (pulseBody?.rows) setPulse(pulseBody.rows);
      setMeta({ markets: marketsBody, latest: latestBody, pulse: pulseBody });
      saveHomeCache({ markets: marketsBody, latest: latestBody, pulse: pulseBody });
      applyFeed(marketsBody, latestBody, pulseBody);
    }

    if (hasCache) {
      paintCache(cached);
      applyFeed(cached.markets, cached.latest, cached.pulse);
    } else {
      setLoading(true);
      onLoading?.(true);
    }

    const cfg = loadRefreshCfg();
    const skipLive = !force && hasCache && (!cfg.auto || isHomeCacheFresh(hours, cached));

    (async () => {
      try {
        if (!skipLive && !force && hasCache) await kickHomeRefreshIfDue();
        if (ac.signal.aborted) return;
        await pullSnapshots(force);
      } catch (err) {
        if (err?.name === 'AbortError') return;
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
          onLoading?.(false);
        }
      }
      try {
        if (ac.signal.aborted || force) return;
        const saved = loadHomeCache();
        if ((saved?.markets?.rows?.length || 0) < 9) {
          await new Promise((r) => setTimeout(r, 20000));
          if (ac.signal.aborted) return;
          await pullSnapshots(false);
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    })();

    return () => ac.abort();
  }, [onFeed, onSelect, onLoading, reload]);

  const quotes = prepareHomeMarketQuotes(markets.length ? markets : TICKER_PLACEHOLDERS);

  return (
    <div className="nh">
      <div className="nh-strip" aria-label="Market quotes">
        <div className="nh-strip-track">
          {[0, 1].map((copy) =>
            quotes.map((q) => (
              <div key={`${copy}-${q.name}`} className="nh-q" aria-hidden={copy === 1 || undefined}>
                <b>{q.name}</b>
                <span>{fmtPx(q.last)}</span>
                <span className={chClass(q.chg)} title={q.changeWindow ? `${q.changeWindow} change` : 'Change'}>
                  {chText(q.chg)}
                </span>
                {(q.asOf || q.as_of) && (
                  <span className="muted" style={{ fontSize: '0.65rem', marginLeft: 4 }} title={`As of ${q.asOf || q.as_of}`}>
                    as of {String(q.asOf || q.as_of).slice(0, 10)}
                  </span>
                )}
              </div>
            )),
          )}
        </div>
      </div>

      <div className="nh-grid">
        <div className="nh-main">
          {ads.length > 0 && (
            <div className="nh-ads" aria-label="Sponsored">
              <span className="ad-tag">SPONSORED</span>
              {ads.map((a, i) => (
                <a
                  key={a.name}
                  className={`ad-slide${i === ad ? ' on' : ''}`}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  aria-label={a.name}
                >
                  <img alt={a.name} src={a.img} />
                </a>
              ))}
              <div className="ad-dots">
                {ads.map((a, i) => (
                  <i key={a.name} className={i === ad ? 'on' : ''} onClick={() => setAd(i)} />
                ))}
              </div>
            </div>
          )}
          {featured && (
            <article className="nh-hero">
              <div className="nh-hero-copy">
                <div className="nh-kicker">
                  <span className="nh-tag inv">{featured.type || 'Briefing'}</span>
                  {featured.interactive && <span className="nh-sim">INTERACTIVE</span>}
                </div>
                <h2>{featured.title}</h2>
                <p>{featured.dek}</p>
                <div className="nh-story-meta">
                  <span>{featured.source || 'Niyantran'}</span>
                  {featured.published ? <span>· {featured.published}</span> : null}
                </div>
                <button type="button" className="nh-cta">
                  Read + explore the data
                </button>
              </div>
              {featured.thumb && <img className="nh-hero-img" alt="" src={featured.thumb} />}
            </article>
          )}
        </div>

        <aside className="nh-mid">
          <section className="nh-box">
            <div className="bh">MY WATCHLIST</div>
            <ul className="nh-watchlist">
              {[
                { tab: 'global', feature: 'Open Fronts', label: 'Open Fronts' },
                { tab: 'national', feature: 'Bill Passage Probability Index', label: 'Bill Passage' },
                { tab: 'economics', feature: 'NSE/BSE Delayed Market Feed', label: 'Markets' },
              ].map((w) => (
                <li key={w.feature}>
                  <button type="button" onClick={() => onOpen({ tab: w.tab, feature: w.feature })}>
                    {w.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="nh-box">
            <div className="bh">FEED HEALTH</div>
            <div className="nh-health">
              <div>
                <span>Markets</span>
                <b>{meta.markets?.ageH != null ? `${Number(meta.markets.ageH).toFixed(1)}h` : loading ? '…' : '—'}</b>
              </div>
              <div>
                <span>Latest wire</span>
                <b>{meta.latest?.ageH != null ? `${Number(meta.latest.ageH).toFixed(1)}h` : loading ? '…' : '—'}</b>
              </div>
              <div>
                <span>Conflict pulse</span>
                <b>{meta.pulse?.ageH != null ? `${Number(meta.pulse.ageH).toFixed(1)}h` : loading ? '…' : '—'}</b>
              </div>
            </div>
          </section>
        </aside>

        <aside className="nh-rail">
          <section className="nh-box">
            <div className="bh">
              <span>
                MARKETS
                <AgentBadge ageH={meta.markets?.ageH} />
              </span>
              <button type="button" className="nh-link" onClick={() => onOpen({ tab: 'economics', feature: 'NSE/BSE Delayed Market Feed' })} {...aiDragProps({ kind: 'feature', tab: 'economics', feature: 'NSE/BSE Delayed Market Feed', title: 'NSE/BSE Delayed Market Feed' })}>
                Economics desk →
              </button>
            </div>
            {(meta.markets?.as_of || meta.markets?.updated || quotes.find((q) => q.asOf || q.as_of)) && (
              <p className="nh-asof muted" style={{ margin: '0 0 0.5rem', fontSize: '0.75rem' }}>
                As of{' '}
                {String(meta.markets?.as_of || meta.markets?.updated || quotes.find((q) => q.asOf || q.as_of)?.asOf || quotes.find((q) => q.as_of)?.as_of || '')
                  .replace('T', ' ')
                  .replace(/\.\d+Z$/, ' UTC')
                  .replace(/Z$/, ' UTC')}
              </p>
            )}
            <table className="nh-moves">
              <tbody>
                {quotes.map((q) => (
                  <tr key={`m-${q.name}`} {...aiDragProps({ kind: 'row', tab: 'economics', feature: 'NSE/BSE Delayed Market Feed', title: q.name, row: q })}>
                    <td>{q.name}</td>
                    <td className="spk">
                      <Spark values={q.spark} up={(q.chg || 0) >= 0} />
                    </td>
                    <td className="px">{fmtPx(q.last)}</td>
                    <td className={chClass(q.chg)} title={q.changeWindow ? `${q.changeWindow} change` : 'Change'}>
                      {q.last == null ? '…' : chText(q.chg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="nh-box">
            <div className="bh">
              LATEST
              <AgentBadge ageH={meta.latest?.ageH} />
            </div>
            <ul className="nh-latest">
              {loading && !latest.length && <li className="muted">Loading…</li>}
              {!loading && !latestShown.length && <li className="muted">Wire quiet. Headlines arrive from RSS when the proxy can reach the publishers.</li>}
              {latestShown.map((r, i) => (
                <li key={`${r.link}-${i}`} {...aiDragProps({ kind: 'row', title: r.title, row: { title: r.title, source_url: r.link, src: r.src } })}>
                  <span className="nh-story-kicker">{r.src || 'Wire'}{r.ago ? ` · ${r.ago}` : ''}{r.related_count > 0 ? ` · +${r.related_count} related` : ''}</span>
                  <div>
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                    {r.dek ? <span className="nh-story-dek">{r.dek}</span> : null}
                    <span className="s">{r.src}{r.ago ? ` · ${r.ago}` : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="nh-box">
            <div className="bh">
              CONFLICT PULSE{' '}
              <small>{meta.pulse?.gdelt ? 'GDELT · LIVE' : meta.pulse?.rows?.length ? 'OPEN FRONTS' : ''}</small>
              <AgentBadge ageH={meta.pulse?.ageH} />
            </div>
            <ul className="nh-pulse">
              {loading && !pulse.length && <li className="muted">Loading…</li>}
              {!loading && !pulseShown.length && (
                <li className="muted">
                  Conflict wire quiet.{' '}
                  <button type="button" className="nh-inline" onClick={() => onOpen({ tab: 'global', feature: 'Open Fronts' })} {...aiDragProps({ kind: 'feature', tab: 'global', feature: 'Open Fronts', title: 'Open Fronts' })}>
                    Open Fronts
                  </button>
                </li>
              )}
              {pulseShown.slice(0, 5).map((r, i) => (
                <li key={`${r.link || r.title}-${i}`} {...aiDragProps({ kind: 'row', tab: 'global', feature: 'Open Fronts', title: r.title, row: r })}>
                  <span className="nh-story-kicker">
                    {r.region || 'Theatre'}
                    {r.time ? ` · ${r.time}` : ''}
                    {r.related_count > 0 ? ` · +${r.related_count} related` : ''}
                  </span>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    <span className="nh-ptitle">{r.title}</span>
                  )}
                  {r.dek ? <span className="nh-story-dek">{r.dek}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

const TICKER_PLACEHOLDERS = [
  'NIFTY 50',
  'SENSEX',
  'USD/INR',
  'BRENT',
  'GOLD',
  'NIFTY BANK',
  'INDIA VIX',
  'S&P 500',
  'BITCOIN',
].map((name) => ({ name, last: null, d1: null, dM: null }));
