import { TABS, bucketsFor, modulesForTier } from '../desks/catalog.js';

export function firstFeature(tabId) {
  const tab = TABS.find((t) => t.id === tabId);
  if (!tab || tab.id === 'home') return '';
  const bucket = bucketsFor(modulesForTier(tab.tier), tab.tier)[0];
  return bucket?.items?.[0]?.htmlFeature || '';
}

export function resolveDeskRoute(tabId, feature) {
  const tab = TABS.find((t) => t.id === tabId);
  if (!tab || tab.id === 'home') return { tab: 'home', feature: '' };
  const mods = modulesForTier(tab.tier);
  const want = String(feature || '').trim();
  const hit =
    mods.find((m) => m.htmlFeature === want) ||
    mods.find((m) => m.htmlFeature.toLowerCase() === want.toLowerCase());
  return { tab: tab.id, feature: hit?.htmlFeature || firstFeature(tab.id) };
}

export function deskHash(tab, feature) {
  if (!tab || tab === 'home') return '#/';
  return `#/${encodeURIComponent(tab)}/${encodeURIComponent(feature || '')}`;
}

export function parseDeskHash(hash = typeof location !== 'undefined' ? location.hash : '') {
  const raw = String(hash || '')
    .replace(/^#/, '')
    .replace(/^\/+/, '');
  if (!raw || /^home(?:\/|$)/i.test(raw) || /^nzine\//i.test(raw)) {
    return { tab: 'home', feature: '' };
  }
  const slash = raw.indexOf('/');
  let tabId = slash === -1 ? raw : raw.slice(0, slash);
  let feature = slash === -1 ? '' : raw.slice(slash + 1);
  try {
    tabId = decodeURIComponent(tabId);
    feature = decodeURIComponent(feature);
  } catch {
    /* keep raw segments */
  }
  return resolveDeskRoute(tabId, feature);
}

export function writeDeskHash(tab, feature, { replace = false } = {}) {
  if (typeof history === 'undefined') return;
  const next = deskHash(tab, feature);
  if (location.hash === next) return;
  const url = `${location.pathname}${location.search}${next}`;
  if (replace) history.replaceState({ tab, feature }, '', url);
  else history.pushState({ tab, feature }, '', url);
}
