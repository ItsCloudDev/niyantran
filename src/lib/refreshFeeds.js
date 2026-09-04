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

const CONCURRENCY = 3;

function outcome(body) {
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const real = hasRealRows(body);
  const n = real ? rows.length : 0;
  if (real && !body?.fallback) {
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
    return outcome(body);
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
    const status = p?.status || r.status;
    return {
      ...r,
      status,
      statusLabel: status === 'live' ? 'Live' : status === 'archive' ? 'Archive' : status === 'local' ? 'Local pack' : 'Inactive',
      lastAt: p?.at || 0,
      lastRows: p?.rows,
      lastError: p?.error || '',
      lastFallback: Boolean(p?.fallback),
      probing: prog.running && prog.current === r.key,
    };
  });
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
    fetch('/api/home/refresh').catch(() => {});
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
