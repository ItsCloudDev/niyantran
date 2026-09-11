import { classifyApis } from './apiStatus.js';
import { fetchFeature } from './featureFeed.js';
import { hasRealRows } from './archiveFeed.js';
import {
  getAbort,
  loadProbes,
  saveProbe,
  saveProbes,
  saveRefreshCfg,
  setAbort,
  setProgress,
  refreshProgress,
} from './refreshStore.js';
import { liveApiEnabled } from './apiMode.js';

const CONCURRENCY = 3;

function outcome(body, row) {
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const real = hasRealRows(body);
  const n = real ? rows.length : 0;
  const note = String(body?.source?.note || body?.error || '');
  // Live alternate sources (e.g. BBC RSS when GDELT is paced) are still Live, not Archive.
  const liveAlt =
    /Live BBC|BBC World RSS|via \/api\/air|OpenSky live|Google News RSS|LIVE · NEWS RSS|LIVE · PIB|Product-name GDELT search is not used|Wikidata live|LIVE · BUDGET XLSX|Statement 1|Wikidata chief-executive|BUSINESS LEADERS|LIVE · WORLD BANK|India GDP growth|Indian Sports Wire|hockey, badminton|Wikidata Indian leagues|leagues and owners|coverage rows|court \/ litigation coverage|reporting search|last-known-good|Shipped pack|Exhaustive shipped backup/i.test(
      note,
    );
  // Static Vercel has no /api/feature-feed. Loading the shipped pack is not a live failure.
  // Never promote Inactive / Archive connectors just because a URL exists.
  if (!liveApiEnabled() && real && row?.status === 'live') {
    return { ok: true, fallback: false, rows: n, status: 'live', error: null };
  }
  if (real && (!body?.fallback || liveAlt)) {
    return { ok: true, fallback: false, rows: n, status: 'live', error: null };
  }
  if (real && body?.fallback) {
    return { ok: true, fallback: true, rows: n, status: 'archive', error: null };
  }
  return {
    ok: false,
    fallback: false,
    rows: 0,
    status: 'inactive',
    error: body?.error || body?.source?.note || 'No live rows and no archive.',
  };
}

export async function probeOne(row, signal) {
  try {
    const body = await fetchFeature({ tier: row.htmlTier, feature: row.feature, signal });
    return outcome(body, row);
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return { ok: false, fallback: false, rows: 0, status: 'inactive', error: err.message || String(err) };
  }
}

async function runPool(items, signal, onEach) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const idx = i;
      i += 1;
      const item = items[idx];
      const result = await probeOne(item, signal);
      onEach(item, result, idx);
    }
  }
  const n = Math.min(CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
}

export function decorateApis(classified = classifyApis()) {
  const probes = loadProbes();
  const prog = refreshProgress();
  return classified.map((r) => {
    const p = probes[r.key];
    // Ignore stale false-negatives + mislabelled archive for live news-search wires.
    let probe = p;
    // Production static host: probes that only loaded /data must not demote Live → Archive.
    // Do not promote Inactive or Archive into Live.
    if (
      !liveApiEnabled() &&
      p &&
      r.status === 'live' &&
      (p.status === 'archive' || p.status === 'inactive' || p.status === 'local')
    ) {
      probe = { ...p, status: 'live', fallback: false, error: null };
    }
    if (!liveApiEnabled() && p && (r.status === 'inactive' || r.status === 'archive') && p.status === 'live') {
      probe = { ...p, status: r.status, fallback: r.status === 'archive' };
    }
    if (p && (r.status === 'live' || r.adapter === 'api' || r.adapter === 'news-search')) {
      const err = String(p.error || '');
      if (
        p.status === 'inactive' &&
        (r.status === 'live' ||
          /last-known-good archive|Live ship\/air API is not deployed|feature-feed HTTP|Source offline or empty|timed out|did not return rows|No live rows|empty GDELT|rate limited/i.test(
            err,
          ))
      ) {
        // Curated Live (or known false-negative errors): don't let a stale 0-row probe stick.
        probe = null;
      }
      // Policy Pipeline / Geopolitics wire: live RSS rows were mislabelled Archive.
      if (
        p.status === 'archive' &&
        (p.rows || 0) > 0 &&
        (r.key === 'global-geopolitics-news-wire' ||
          r.key === 'national-policy-pipeline' ||
          r.key === 'national-statements-and-contradictions' ||
          r.key === 'national-morning-brief' ||
          r.key === 'state-mla-directory' ||
          r.key === 'state-mla-performanc-meter' ||
          r.key === 'state-district-media-monitor' ||
          r.key === 'state-state-governance-brief' ||
          r.key === 'state-centre-state-fund-flows' ||
          r.key === 'economics-business-leaders' ||
          r.key === 'economics-economic-simulator' ||
          r.key === 'sports-indian-sports-wire' ||
          r.key === 'sports-sports-business-and-media-rights')
      ) {
        probe = { ...p, status: 'live', fallback: false };
      }
    }
    const status = probe?.status || r.status;
    return {
      ...r,
      status,
      statusLabel: status === 'live' ? 'Live' : status === 'archive' ? 'Archive' : status === 'local' ? 'Local pack' : 'Inactive',
      lastAt: probe?.at || 0,
      lastRows: probe?.rows,
      lastError: probe?.error || '',
      lastFallback: Boolean(probe?.fallback),
      probing: prog.running && prog.current === r.key,
    };
  });
}

/** Static host: rewrite pack-load probes so Live connectors are not stuck as Archive. */
export function healStaticHostProbes() {
  if (liveApiEnabled()) return { ok: true, count: 0 };
  const classified = classifyApis();
  const probes = loadProbes();
  const patch = {};
  for (const r of classified) {
    const p = probes[r.key];
    if (!p) continue;
    if (r.status === 'live' && (p.status === 'archive' || p.status === 'inactive' || p.status === 'local')) {
      patch[r.key] = { ...p, status: 'live', fallback: false, error: null };
    } else if ((r.status === 'inactive' || r.status === 'archive') && p.status === 'live') {
      patch[r.key] = { ...p, status: r.status, fallback: r.status === 'archive' };
    }
  }
  if (Object.keys(patch).length) saveProbes(patch);
  return { ok: true, count: Object.keys(patch).length };
}

/** Clear known-bad inactive probes and re-probe those feeds once (admin). */
export async function healStaleInactiveProbes() {
  const probes = loadProbes();
  const classified = classifyApis();
  const heal = [];
  const patch = {};
  for (const r of classified) {
    const p = probes[r.key];
    if (!p) continue;
    if (
      p.status === 'archive' &&
      (p.rows || 0) > 0 &&
      (r.key === 'global-geopolitics-news-wire' ||
        r.key === 'national-policy-pipeline' ||
        r.key === 'national-statements-and-contradictions' ||
        r.key === 'national-morning-brief' ||
        r.key === 'state-mla-directory' ||
        r.key === 'state-mla-performanc-meter' ||
        r.key === 'state-district-media-monitor' ||
        r.key === 'state-state-governance-brief' ||
        r.key === 'state-centre-state-fund-flows' ||
        r.key === 'economics-business-leaders' ||
        r.key === 'economics-economic-simulator' ||
        r.key === 'sports-indian-sports-wire' ||
        r.key === 'sports-sports-business-and-media-rights') &&
      r.status === 'live'
    ) {
      patch[r.key] = { ...p, status: 'live', fallback: false, error: null };
      continue;
    }
    if (p.status !== 'inactive') continue;
    if (!(r.status === 'live' || r.adapter === 'api' || r.adapter === 'news-search')) continue;
    const err = String(p.error || p.note || '');
    // Always re-probe curated Live rows stuck on a stale Inactive probe.
    if (r.status === 'live') {
      heal.push(r);
      continue;
    }
    if (
      !/last-known-good archive|Live ship\/air API is not deployed|feature-feed HTTP|Source offline or empty|timed out|did not return rows|No live rows|empty GDELT|rate limited|extraction not scheduled|Module planned|reporting search is unavailable|Live extraction is not scheduled/i.test(
        err,
      )
    ) {
      continue;
    }
    heal.push(r);
  }
  if (Object.keys(patch).length) saveProbes(patch);
  if (!heal.length) return { ok: true, count: Object.keys(patch).length };
  const next = { ...loadProbes() };
  for (const r of heal) delete next[r.key];
  saveProbes(next);
  await Promise.all(heal.map((r) => refreshOne(r)));
  return { ok: true, count: heal.length + Object.keys(patch).length };
}

export function liveRows(classified = classifyApis()) {
  return classified.filter((r) => r.status === 'live' || r.adapter === 'api');
}

export async function sweepApis({ scope = 'live' } = {}) {
  if (refreshProgress().running) return { ok: false, reason: 'A sweep is already running.' };
  const all = classifyApis();
  const items = scope === 'all' ? all : all.filter((r) => r.status === 'live');
  const ac = new AbortController();
  setAbort(ac);
  setProgress({ running: true, scope, done: 0, total: items.length, current: items[0]?.key || '' });
  const patch = {};
  try {
    await runPool(items, ac.signal, (row, result) => {
      patch[row.key] = { ...result, at: Date.now() };
      saveProbe(row.key, patch[row.key]);
      const done = Object.keys(patch).length;
      setProgress({ done, current: row.key });
    });
    saveProbes(patch);
    if (scope === 'all') saveRefreshCfg({ lastFullSweep: Date.now(), lastLiveSweep: Date.now() });
    else saveRefreshCfg({ lastLiveSweep: Date.now() });
    if (liveApiEnabled()) fetch('/api/home/refresh').catch(() => {});
    return { ok: true, count: items.length };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, reason: 'Sweep cancelled.' };
    return { ok: false, reason: err.message || String(err) };
  } finally {
    setAbort(null);
    setProgress({ running: false, current: '', done: 0, total: 0, scope: '' });
  }
}

export async function refreshOne(row) {
  const result = await probeOne(row);
  saveProbe(row.key, { ...result, at: Date.now() });
  return result;
}

export function cancelSweep() {
  getAbort()?.abort();
}
