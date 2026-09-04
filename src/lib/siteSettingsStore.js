const KEY = 'niyantranSiteSettings';
const EVENT = 'niy-site-settings';

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'NIYANTRAN TERMINAL',
  shortName: 'TERMINAL',
  tagline: 'The intelligence layer for government, policy and global affairs.',
  description:
    'NIYANTRAN TERMINAL is an intelligence platform that brings together authoritative information and data sources across government, policy, legislation, economics, global affairs, markets, research, and related areas.',
  metaTitle: 'NIYANTRAN TERMINAL — Government, policy and global affairs intelligence',
  metaDescription:
    'Authoritative intelligence across government, policy, legislation, economics, global affairs, markets and research. Live desks, provenance, and source-backed coverage.',
  metaKeywords:
    'NIYANTRAN, terminal, government intelligence, policy, legislation, parliament, economics, global affairs, markets, research, India',
  canonicalUrl: '',
  robots: 'index,follow',
  locale: 'en_IN',
  author: 'NIYANTRAN TERMINAL',
  themeColor: '#012EA1',
  ogTitle: '',
  ogDescription: '',
  ogImage: '/brand/logo.png?v=2',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterHandle: '',
  faviconUrl: '/brand/logo.png?v=2',
  googleAnalyticsId: '',
  googleTagManagerId: '',
  customHeadHtml: '',
  contactEmail: 'privacy@niyantran.com',
  contactWebsite: '',
  contactAddress: '',
};

function clean(saved) {
  const src = saved && typeof saved === 'object' ? saved : {};
  const out = { ...DEFAULT_SITE_SETTINGS };
  for (const key of Object.keys(DEFAULT_SITE_SETTINGS)) {
    if (src[key] == null) continue;
    out[key] = String(src[key]);
  }
  return out;
}

export function loadSiteSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return clean(JSON.parse(raw));
  } catch {
    /* defaults */
  }
  return clean({});
}

export function saveSiteSettings(next) {
  const value = clean(next);
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  return value;
}

export function resetSiteSettings() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
  return loadSiteSettings();
}

export function subscribeSiteSettings(fn) {
  const on = () => fn(loadSiteSettings());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}
