import { useEffect, useState } from 'react';
import ads from '../data/home-ads.json';
import zine from '../data/home-zine.json';

async function getJson(path, signal) {
  const res = await fetch(path, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
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
  const [markets, setMarkets] = useState([]);
  const [latest, setLatest] = useState([]);
  const [pulse, setPulse] = useState([]);
  const [meta, setMeta] = useState({ markets: null, latest: null, pulse: null });
  const [ad, setAd] = useState(0);
  const [loading, setLoading] = useState(true);

  const featured = zine[0];

  useEffect(() => {
    if (!ads.length) return undefined;
    const t = setInterval(() => setAd((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    onLoading?.(true);
    Promise.allSettled([
      getJson('/api/home/markets', ac.signal),
      getJson('/api/home/latest', ac.signal),
      getJson('/api/home/pulse', ac.signal),
    ])
      .then(([m, l, p]) => {
        if (ac.signal.aborted) return;
        const marketsBody = m.status === 'fulfilled' ? m.value : null;
        const latestBody = l.status === 'fulfilled' ? l.value : null;
        const pulseBody = p.status === 'fulfilled' ? p.value : null;
        setMarkets(marketsBody?.rows || []);
        setLatest(latestBody?.rows || []);
        setPulse(pulseBody?.rows || []);
        setMeta({ markets: marketsBody, latest: latestBody, pulse: pulseBody });
        if (latestBody?.rows?.length) {
          onFeed({
            feature: 'Home',
            rows: latestBody.rows.map((r) => ({ title: r.title, source_url: r.link, date: r.pub, status: '' })),
            source: { adapter: 'rss', note: latestBody.note, gdelt: false },
            fallback: Boolean(latestBody.archive),
          });
        } else if (pulseBody?.rows?.length) {
          onFeed({
            feature: 'Conflict Pulse',
            rows: pulseBody.rows.map((r) => ({ title: r.title, source_url: r.link, date: r.time, status: '' })),
            source: { adapter: pulseBody.gdelt ? 'news-search' : 'embedded', note: pulseBody.note, gdelt: Boolean(pulseBody.gdelt) },
            fallback: Boolean(pulseBody.archive),
          });
        }
        onSelect(null);
      })
      .finally(() => {
        if (ac.signal.aborted) return;
        setLoading(false);
        onLoading?.(false);
      });
    return () => ac.abort();
  }, [onFeed, onSelect, onLoading, reload]);

  const quotes = markets.length ? markets : TICKER_PLACEHOLDERS;

  return (
    <div className="nh">
      <div className="nh-strip">
        {quotes.map((q) => (
          <div key={q.name} className="nh-q">
            <b>{q.name}</b>
            <span>{fmtPx(q.last)}</span>
            <span className={chClass(q.d1)}>{chText(q.d1)}</span>
          </div>
        ))}
      </div>

      <div className="nh-grid">
        <div className="nh-main">
          {ads.length > 0 && (
            <div className="nh-ads">
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
                  <span className="nh-tag inv">{featured.type}</span>
                  {featured.interactive && <span className="nh-sim">INTERACTIVE</span>}
                </div>
                <h2>{featured.title}</h2>
                <p>{featured.dek}</p>
                <button type="button" className="nh-cta">
                  Read + explore the data
                </button>
              </div>
              {featured.thumb && <img className="nh-hero-img" alt="" src={featured.thumb} />}
            </article>
          )}
        </div>

        <aside className="nh-rail">
          <section className="nh-box">
            <div className="bh">
              <span>
                MARKETS
                <AgentBadge ageH={meta.markets?.ageH} />
              </span>
              <button type="button" className="nh-link" onClick={() => onOpen({ tab: 'economics', feature: 'NSE/BSE Delayed Market Feed' })}>
                Economics desk →
              </button>
            </div>
            <table className="nh-moves">
              <tbody>
                {quotes.map((q) => (
                  <tr key={`m-${q.name}`}>
                    <td>{q.name}</td>
                    <td className="spk">
                      <Spark values={q.spark} up={(q.dM || 0) >= 0} />
                    </td>
                    <td className="px">{fmtPx(q.last)}</td>
                    <td className={chClass(q.dM)}>{q.last == null ? '…' : chText(q.dM, 1)}</td>
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
              {!loading && !latest.length && <li className="muted">Wire quiet. Headlines arrive from RSS when the proxy can reach the publishers.</li>}
              {latest.map((r, i) => (
                <li key={`${r.link}-${i}`}>
                  <span className="t">{r.ago || ''}</span>
                  <div>
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                    <span className="s">{r.src}</span>
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
              {!loading && !pulse.length && (
                <li className="muted">
                  Conflict wire quiet.{' '}
                  <button type="button" className="nh-inline" onClick={() => onOpen({ tab: 'global', feature: 'Open Fronts' })}>
                    Open Fronts
                  </button>
                </li>
              )}
              {pulse.slice(0, 5).map((r, i) => (
                <li key={`${r.link || r.title}-${i}`}>
                  <span className="pt">
                    {r.time}
                    {r.region ? ` · ${r.region}` : ''}
                  </span>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    <span className="nh-ptitle">{r.title}</span>
                  )}
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
