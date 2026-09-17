/**
 * Home "MY WATCHLIST" — per-user pins (local + SQLite sync via userPrefsSync).
 */
const KEY = 'niyWatchlist';
const EVENT = 'niy-watchlist';

export const DEFAULT_WATCHLIST = [
  { tab: 'global', feature: 'Open Fronts', label: 'Open Fronts' },
  { tab: 'national', feature: 'Bill Passage Probability Index', label: 'Bill Passage' },
  { tab: 'economics', feature: 'NSE/BSE Delayed Market Feed', label: 'Markets' },
];

function normalizeItem(it) {
  if (!it || typeof it !== 'object') return null;
  const feature = String(it.feature || '').trim();
  if (!feature) return null;
  return {
    tab: String(it.tab || 'home').trim() || 'home',
    feature,
    label: String(it.label || feature).trim() || feature,
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const list = parsed.map(normalizeItem).filter(Boolean);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

function writeLocal(list) {
  const next = (list || []).map(normalizeItem).filter(Boolean).slice(0, 24);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function loadWatchlist() {
  return readLocal() || DEFAULT_WATCHLIST.map((x) => ({ ...x }));
}

export function saveWatchlist(list) {
  const next = writeLocal(list);
  try {
    window.dispatchEvent(new CustomEvent('niy-prefs-dirty', { detail: { kind: 'watchlist' } }));
  } catch {
    /* ignore */
  }
  return next;
}

/** Replace from server hydrate without re-pushing. */
export function applyWatchlistFromServer(list) {
  if (!Array.isArray(list) || !list.length) return loadWatchlist();
  return writeLocal(list);
}

export function subscribeWatchlist(fn) {
  const on = () => fn(loadWatchlist());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function addWatchlistItem(item) {
  const n = normalizeItem(item);
  if (!n) return loadWatchlist();
  const cur = loadWatchlist();
  if (cur.some((x) => x.feature === n.feature && x.tab === n.tab)) return cur;
  return saveWatchlist([n, ...cur]);
}

export function removeWatchlistItem(feature, tab) {
  const cur = loadWatchlist();
  return saveWatchlist(cur.filter((x) => !(x.feature === feature && (!tab || x.tab === tab))));
}
