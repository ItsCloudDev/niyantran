
/*
  Niyantran Signal Protocol — deterministic, client-side only, zero new data
  collection. Computes a traffic-light signal from fields already present on
  a raw CSV row (before rowMap projects it into display columns).

  Shape returned by every function here: { level, label, trend, previousValue }
    level:  'green' | 'amber' | 'red' | null  (null = no signal, not "unknown")
    label:  short string shown in the dot/arrow's title tooltip
    trend:  'up' | 'down' | 'flat' | null — only finance rows set this today;
            everything else needs a second data point over time (Phase 2).
    previousValue: always undefined for now — reserved so Phase 2 (a real
            snapshot-history store) can populate it without a breaking change.

  If a row is missing the field a signal needs, return { level: null } —
  never guess a signal from absent data.
*/

function computeSignal(archetype, row, csvName, allRows) {
  if (!row) return { level: null };

  // Finance's market-feed rows carry change/pct_change, not a stage field —
  // handled as its own case rather than forced through trackerSignal's
  // stage-keyword matching, which doesn't apply to market data at all.
  if (csvName === 'finance_market_feed.csv') return financeChangeSignal(row);

  switch (archetype) {
    case 'tracker':   return trackerSignal(row);
    case 'tender':    return tenderSignal(row);
    case 'directory': return directorySignal(row, csvName, allRows);
    case 'fund':      return fundSignal(row);
    case 'transfer':  return transferSignal(row);
    case 'media':     return { level: null }; // no deterministic signal for media archetype
    default:          return { level: null };
  }
}

function trackerSignal(row) {
  const stage = row.current_stage;
  if (!stage) return { level: null };
  const s = String(stage).toLowerCase();
  if (/assented|passed|notified|implemented|disposed|resolved/.test(s)) {
    return { level: 'green', label: `Stage: ${stage}`, trend: null, previousValue: undefined };
  }
  if (/lapsed|withdrawn|rejected|dismissed|stayed/.test(s)) {
    return { level: 'red', label: `Stage: ${stage}`, trend: null, previousValue: undefined };
  }
  if (/introduced|pending|committee|under review|reserved/.test(s)) {
    return { level: 'amber', label: `Stage: ${stage}`, trend: null, previousValue: undefined };
  }
  // PHASE 2: a "stalled" variant (same stage for >N days) needs the
  // snapshot-history store described in the Phase 2 brief — not buildable
  // from a single snapshot.
  return { level: null };
}

function parseAnyDate(value) {
  if (!value) return null;
  // Handles "2026-07-13" (ISO), "13-Jul-2026 03:00 PM" (CPPP), and generic
  // Date-parseable strings without over-engineering a full date library.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function tenderSignal(row) {
  const raw = row.deadline || row.end_date;
  const deadline = parseAnyDate(raw);
  if (!deadline) return { level: null };
  const daysToDeadline = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  if (daysToDeadline < 3) {
    return { level: 'red', label: `Closes in ${daysToDeadline}d`, trend: null, previousValue: undefined };
  }
  if (daysToDeadline < 14) {
    return { level: 'amber', label: `Closes in ${daysToDeadline}d`, trend: null, previousValue: undefined };
  }
  return { level: 'green', label: `Closes in ${daysToDeadline}d`, trend: null, previousValue: undefined };
}

// There's no live-push mechanism on a static site, so "new-PDF-detected
// should push a notification" (per the build brief) is approximated here:
// any transfer order dated within the last 45 days lights up green, same
// visual language as everywhere else in the Signal Protocol, so a freshly
// scraped order reads as "new" without a separate notification system.
function transferSignal(row) {
  const orderDate = parseAnyDate(row.order_date);
  if (!orderDate) return { level: null };
  const daysAgo = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
  if (daysAgo < 0) return { level: null };
  if (daysAgo <= 45) {
    return { level: 'green', label: `Ordered ${daysAgo}d ago — recent`, trend: null, previousValue: undefined };
  }
  return { level: null };
}

// Parses "Rs 8,05,85,824~ 8 Crore+" -> 80585824. Returns null if unparseable.
function parseRupees(value) {
  if (!value) return null;
  const m = /Rs\s*([\d,]+)/.exec(value);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ""));
}

// Peer-group numeric fields checked in priority order — the first one
// present and non-blank on this row is used for percentile ranking.
const DIRECTORY_RANK_FIELDS = [
  { field: 'attendance_pct', parse: v => Number(v) },
  { field: 'questions_asked', parse: v => Number(v) },
  { field: 'total_assets', parse: parseRupees },
];

function directorySignal(row, csvName, allRows) {
  const criminalCases = Number(row.criminal_cases);
  if (row.criminal_cases !== undefined && row.criminal_cases !== "" && criminalCases > 0) {
    return { level: 'red', label: `${criminalCases} pending case(s)`, trend: null, previousValue: undefined };
  }

  if (!allRows || !allRows.length) return { level: null };

  for (const { field, parse } of DIRECTORY_RANK_FIELDS) {
    const thisValue = parse(row[field]);
    if (thisValue === null || isNaN(thisValue)) continue;

    const peerValues = allRows
      .map(r => parse(r[field]))
      .filter(v => v !== null && !isNaN(v));
    if (peerValues.length < 3) continue; // too small a peer group for a percentile to mean anything

    peerValues.sort((a, b) => a - b);
    const rank = peerValues.filter(v => v <= thisValue).length / peerValues.length;
    const level = rank >= 2 / 3 ? 'green' : rank >= 1 / 3 ? 'amber' : 'red';
    return { level, label: `${field.replace(/_/g, ' ')}: ${row[field]} (percentile ${Math.round(rank * 100)})`, trend: null, previousValue: undefined };
  }

  // PHASE 2: asset-growth trend arrows need multiple election cycles per
  // candidate in the same CSV — today's affidavit CSV only has one cycle.
  return { level: null };
}

function fundSignal(row) {
  const allocated = Number(row.budget_allocated_inr || row.allocated);
  const utilized = Number(row.budget_utilized_inr || row.utilized);
  if (!allocated || isNaN(allocated) || isNaN(utilized)) return { level: null };
  const rate = utilized / allocated;
  const label = `${Math.round(rate * 100)}% utilized`;
  if (rate < 0.4) return { level: 'red', label, trend: null, previousValue: undefined };
  if (rate < 0.75) return { level: 'amber', label, trend: null, previousValue: undefined };
  return { level: 'green', label, trend: null, previousValue: undefined };
}

function financeChangeSignal(row) {
  const pct = parseFloat(row.pct_change);
  if (row.pct_change === undefined || row.pct_change === "" || isNaN(pct)) return { level: null };
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const level = pct > 0 ? 'green' : pct < 0 ? 'red' : 'amber';
  return { level, label: `${pct > 0 ? '+' : ''}${pct}%`, trend, previousValue: undefined };
}

// Renders either a dot (most archetypes) or a colored trend arrow (finance,
// where `trend` is set) — one shared entry point so renderDataBlock doesn't
// need to know which shape a given archetype produces.
function signalMarkupHtml(signal) {
  if (!signal || !signal.level) return '';
  const label = escapeHtml(signal.label || '');
  if (signal.trend) {
    const arrow = signal.trend === 'up' ? '▲' : signal.trend === 'down' ? '▼' : '—';
    return `<span class="trend-arrow trend-${signal.level}" title="${label}">${arrow}</span>`;
  }
  return `<span class="dot dot-${signal.level}" title="${label}"></span>`;
}

// Worst-of aggregate across a feature's rows, for the sidebar's per-item
// dot — red beats amber beats green beats null.
const SIGNAL_SEVERITY = { red: 3, amber: 2, green: 1 };
function worstSignal(signals) {
  let worst = null;
  for (const s of signals) {
    if (!s || !s.level) continue;
    if (!worst || SIGNAL_SEVERITY[s.level] > SIGNAL_SEVERITY[worst.level]) worst = s;
  }
  return worst;
}

