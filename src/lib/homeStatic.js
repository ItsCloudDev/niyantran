const TICKERS = [
  ['NIFTY 50', '^NSEI'],
  ['SENSEX', '^BSESN'],
  ['USD/INR', 'INR=X'],
  ['BRENT', 'BZ=F'],
  ['GOLD', 'GC=F'],
  ['NIFTY BANK', '^NSEBANK'],
  ['INDIA VIX', '^INDIAVIX'],
  ['S&P 500', '^GSPC'],
  ['BITCOIN', 'BTC-USD'],
];

function quoteFromCloses(name, closes, symbol) {
  const c = (closes || []).filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  if (c.length < 2) return null;
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  const first = c[0];
  const step = Math.max(1, Math.floor(c.length / 24));
  const spark = c.filter((_, k) => k % step === 0 || k === c.length - 1);
  return {
    name,
    symbol,
    last,
    d1: prev ? ((last - prev) / prev) * 100 : null,
    dM: first ? ((last - first) / first) * 100 : null,
    spark,
    archive: true,
  };
}

async function getStaticJson(path, signal) {
  const res = await fetch(path, { signal });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function homeMarketsFromStatic(signal) {
  const [ohlc, feed] = await Promise.all([
    getStaticJson('/data/ohlc.json', signal),
    getStaticJson('/data/embedded_csv/finance_market_feed.json', signal),
  ]);
  const rows = TICKERS.map(([name, symbol]) => {
    const pack = ohlc?.[symbol];
    const fromOhlc = quoteFromCloses(name, pack?.c || pack?.close, symbol);
    if (fromOhlc) return fromOhlc;
    const row = Array.isArray(feed)
      ? feed.find((r) => String(r.name || '').toUpperCase() === name.toUpperCase())
      : null;
    if (!row || row.last == null) return null;
    const last = Number(String(row.last).replace(/,/g, ''));
    const pct = Number(row.pct_change);
    if (!Number.isFinite(last)) return null;
    return { name, symbol, last, d1: Number.isFinite(pct) ? pct : null, dM: Number.isFinite(pct) ? pct : null, spark: [], archive: true };
  }).filter(Boolean);
  return {
    ok: true,
    rows,
    source: 'Original HTML OHLC / NSE market-feed snapshot.',
    archive: true,
  };
}

export async function homeLatestFromStatic(signal) {
  const snap = await getStaticJson('/data/news.json', signal);
  const rows = Array.isArray(snap?.rows) ? snap.rows : [];
  if (rows.length) {
    return {
      ok: true,
      rows,
      note: snap.note || 'Saved home-desk headlines.',
      archive: true,
      ageH: snap.updated ? (Date.now() - new Date(snap.updated).getTime()) / 3600000 : null,
      updated: snap.updated,
    };
  }
  return { ok: true, rows: [], note: 'Live wire unreachable on this host. No headlines were invented.', archive: true };
}

export async function homePulseFromStatic(signal) {
  const snap = await getStaticJson('/data/conflict.json', signal);
  if (Array.isArray(snap?.rows) && snap.rows.length) {
    return {
      ok: true,
      rows: snap.rows.slice(0, 8),
      gdelt: Boolean(snap.gdelt),
      archive: true,
      note: snap.note || 'Saved conflict-pulse snapshot.',
      ageH: snap.updated ? (Date.now() - new Date(snap.updated).getTime()) / 3600000 : null,
      updated: snap.updated,
    };
  }
  const war = await getStaticJson('/data/embedded_csv/geopolitics_war_tracker.json', signal);
  const rows = (Array.isArray(war) ? war : [])
    .filter((r) => r.conflict_name)
    .slice(0, 8)
    .map((r) => ({
      title: r.conflict_name,
      time: r.started || r.current_stage || '',
      region: r.region || '',
      link: r.source_url || r.link || '',
      source: 'Open Fronts snapshot',
      outlets: r.conflict_type || '',
      event: r.latest_development || '',
    }));
  return {
    ok: true,
    rows,
    gdelt: false,
    archive: true,
    note: 'Open Fronts snapshot (geopolitics_war_tracker). Live GDELT was unreachable.',
  };
}
