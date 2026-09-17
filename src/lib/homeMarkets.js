/**
 * Home market ticker rules: one row per benchmark, one headline move.
 * Strip and table must never disagree on direction for the same symbol.
 */

const ALIASES = {
  nifty: 'NIFTY 50',
  'nifty 50': 'NIFTY 50',
  '^nsei': 'NIFTY 50',
  sensex: 'SENSEX',
  '^bsesn': 'SENSEX',
  'usd/inr': 'USD/INR',
  'inr=x': 'USD/INR',
  brent: 'BRENT',
  'bz=f': 'BRENT',
  gold: 'GOLD',
  'gc=f': 'GOLD',
  'nifty bank': 'NIFTY BANK',
  banknifty: 'NIFTY BANK',
  '^nsebank': 'NIFTY BANK',
  'india vix': 'INDIA VIX',
  '^indiavix': 'INDIA VIX',
  's&p 500': 'S&P 500',
  spx: 'S&P 500',
  '^gspc': 'S&P 500',
  bitcoin: 'BITCOIN',
  btc: 'BITCOIN',
  'btc-usd': 'BITCOIN',
};

export function canonicalMarketName(row) {
  const name = String(row?.name || '').trim();
  const symbol = String(row?.symbol || '').trim();
  const bySym = ALIASES[symbol.toLowerCase()];
  if (bySym) return bySym;
  const byName = ALIASES[name.toLowerCase()];
  if (byName) return byName;
  return name || symbol || 'UNKNOWN';
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rankQuote(q) {
  let score = 0;
  if (q.last != null) score += 8;
  if (q.chg != null) score += 4;
  if (!q.archive) score += 3;
  if (Array.isArray(q.spark) && q.spark.length > 1) score += 2;
  if (q.asOf || q.as_of || q.updated) score += 1;
  return score;
}

/**
 * Headline change = session / 1-day move (d1). Period move stays on `periodChg`
 * for sparks/tooling but is never shown as the unlabeled % next to the name.
 */
export function normalizeMarketQuote(row) {
  if (!row || typeof row !== 'object') return null;
  const name = canonicalMarketName(row);
  const last = num(row.last);
  const d1 = num(row.d1 ?? row.pct_change ?? row.chg ?? row.changePct);
  const dM = num(row.dM ?? row.periodChg);
  const chg = d1 != null ? d1 : dM;
  const asOf = row.asOf || row.as_of || row.updated || row.date || '';
  return {
    ...row,
    name,
    symbol: row.symbol || '',
    last,
    d1: chg,
    dM: dM != null ? dM : chg,
    chg,
    periodChg: dM,
    changeWindow: d1 != null ? '1D' : dM != null ? 'period' : null,
    spark: Array.isArray(row.spark) ? row.spark : [],
    source: row.source || row.sourceName || '',
    asOf,
    as_of: asOf,
  };
}

/**
 * Collapse aliases (NIFTY / NIFTY 50) and pick the strongest single quote.
 * Never keep two rows that would paint opposite moves for one market.
 */
export function mergeMarketQuotes(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map();
  for (const raw of list) {
    const q = normalizeMarketQuote(raw);
    if (!q || !q.name || q.name === 'UNKNOWN') continue;
    if (q.last == null && q.chg == null) continue;
    const prev = byKey.get(q.name);
    if (!prev || rankQuote(q) > rankQuote(prev)) {
      byKey.set(q.name, q);
      continue;
    }
    if (rankQuote(q) === rankQuote(prev)) {
      // Same strength: prefer the quote whose last price matches the spark tip,
      // else keep the existing (stable) row — never average contradictory % moves.
      const tip = Array.isArray(q.spark) && q.spark.length ? num(q.spark[q.spark.length - 1]) : null;
      if (tip != null && q.last != null && Math.abs(tip - q.last) < Math.abs((prev.last ?? tip) - tip)) {
        byKey.set(q.name, q);
      }
    }
  }
  return [...byKey.values()];
}

export function prepareHomeMarketQuotes(rows) {
  return mergeMarketQuotes(rows);
}
