const HIDDEN = new Set([
  'reporting_search',
  'source_url',
  'status',
  'adapter',
  'feature',
  'host',
  'fail_reason',
]);

export function displayColumns(rows) {
  if (!rows?.length) return ['date', 'title', 'source_url'];
  const counts = new Map();
  for (const row of rows.slice(0, 40)) {
    for (const [k, v] of Object.entries(row)) {
      if (HIDDEN.has(k) || v == null || v === '') continue;
      if (typeof v === 'string' && v.length > 400) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const preferred = ['date', 'title', 'source_url'];
  const rest = [...counts.keys()]
    .filter((k) => !preferred.includes(k))
    .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
  const cols = [...preferred.filter((k) => counts.has(k)), ...rest];
  return cols.slice(0, 8);
}

export function filterRows(rows, q) {
  const n = String(q || '')
    .trim()
    .toLowerCase();
  if (!n) return rows || [];
  return (rows || []).filter((row) =>
    Object.values(row).some((v) => String(v || '').toLowerCase().includes(n)),
  );
}

export function sortRows(rows, key, dir = 'desc') {
  if (!key) return rows;
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    const an = Number(av);
    const bn = Number(bv);
    if (av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn)) {
      return (an - bn) * mul;
    }
    return String(av || '').localeCompare(String(bv || ''), undefined, { numeric: true }) * mul;
  });
}

export function provenanceLabel(feed) {
  if (!feed) return '';
  if (feed.rows?.[0]?.status === 'source_status') return 'SOURCE STATUS';
  if (feed.source?.kind === 'dossier') return 'DOSSIER';
  if (feed.source?.gdelt) return feed.fallback ? 'GDELT SEARCH (fallback)' : 'GDELT SEARCH';
  if (feed.fallback) return 'ARCHIVE';
  return 'LIVE';
}

export function cellText(v) {
  if (v == null) return '';
  const s = String(v);
  return s.length > 220 ? `${s.slice(0, 217)}…` : s;
}

export function hostLabel(url) {
  try {
    return new URL(String(url || '')).hostname;
  } catch {
    return '';
  }
}

/** Visible label for a URL — never dump API query strings into the table. */
export function displayUrl(value) {
  const s = String(value || '');
  if (!/^https?:\/\//i.test(s)) return s;
  if (/[?&=]/.test(s) || /\/api\//i.test(s) || s.length > 80) return hostLabel(s) || 'configured source';
  return s;
}

export function isArticleHref(url) {
  const s = String(url || '');
  if (!/^https?:\/\//i.test(s)) return false;
  if (/[?&=]/.test(s) && /\/api\/|format=json|sparql/i.test(s)) return false;
  return true;
}
