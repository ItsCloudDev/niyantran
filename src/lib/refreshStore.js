const CFG_KEY = 'niyantranRefreshCfg';
const PROBE_KEY = 'niyantranRefreshProbes';
const EVENT = 'niy-refresh';

export const DEFAULT_INTERVAL_HOURS = 6;

const memory = {
  running: false,
  scope: '',
  done: 0,
  total: 0,
  current: '',
  abort: null,
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* keep fallback */
  }
  return fallback;
}

export function loadRefreshCfg() {
  const saved = readJson(CFG_KEY, {});
  const hours = Number(saved.intervalHours);
  return {
    intervalHours: Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_INTERVAL_HOURS,
    lastLiveSweep: Number(saved.lastLiveSweep) || 0,
    lastFullSweep: Number(saved.lastFullSweep) || 0,
    auto: saved.auto !== false,
  };
}

export function saveRefreshCfg(patch) {
  const next = { ...loadRefreshCfg(), ...patch };
  localStorage.setItem(CFG_KEY, JSON.stringify(next));
  emit();
  return next;
}

export function intervalMs() {
  return loadRefreshCfg().intervalHours * 60 * 60 * 1000;
}

export function loadProbes() {
  const raw = readJson(PROBE_KEY, {});
  return raw && typeof raw === 'object' ? raw : {};
}

export function saveProbe(key, probe) {
  const all = loadProbes();
  all[key] = probe;
  localStorage.setItem(PROBE_KEY, JSON.stringify(all));
  emit();
}

export function saveProbes(patch) {
  const all = { ...loadProbes(), ...patch };
  localStorage.setItem(PROBE_KEY, JSON.stringify(all));
  emit();
}

export function refreshProgress() {
  return {
    running: memory.running,
    scope: memory.scope,
    done: memory.done,
    total: memory.total,
    current: memory.current,
  };
}

export function setProgress(partial) {
  Object.assign(memory, partial);
  emit();
}

export function getAbort() {
  return memory.abort;
}

export function setAbort(c) {
  memory.abort = c;
}

export function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeRefresh(fn) {
  const on = () => fn();
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function formatAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (s < 86400) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const d = Math.floor(s / 86400);
  return `${d}d ago`;
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatWhen(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString();
}

export function nextSweepAt() {
  const cfg = loadRefreshCfg();
  if (!cfg.lastLiveSweep) return 0;
  return cfg.lastLiveSweep + cfg.intervalHours * 3600 * 1000;
}

export function isDue() {
  const cfg = loadRefreshCfg();
  if (!cfg.auto || !cfg.lastLiveSweep) return false;
  return Date.now() >= nextSweepAt();
}
