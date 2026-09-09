/**
 * Fast client search for large desks (e.g. 8k parliamentary questions).
 * Builds a per-row haystack once; token search avoids scanning every Object.values call.
 */

const DEFAULT_KEYS = [
  'subject',
  'title',
  'question',
  'mp_name',
  'member',
  'ministry',
  'house',
  'party',
  'question_type',
  'name',
  'constituency',
  'bill_name',
  'policy_name',
  'tender',
  'authority',
  'candidate',
];

export function buildTableSearchIndex(rows, keys = DEFAULT_KEYS) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row, i) => {
    const parts = [];
    for (const k of keys) {
      const v = row?.[k];
      if (v != null && v !== '') parts.push(String(v));
    }
    if (!parts.length) {
      for (const v of Object.values(row || {})) {
        if (v == null || v === '' || typeof v === 'object') continue;
        const s = String(v);
        if (s.length > 400) continue;
        parts.push(s);
      }
    }
    return { i, text: parts.join('\n').toLowerCase() };
  });
}

export function searchTableRows(rows, index, q) {
  const list = Array.isArray(rows) ? rows : [];
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  if (!needle) return list;
  const tokens = needle.split(/\s+/).filter(Boolean);
  if (!tokens.length) return list;
  const idx = Array.isArray(index) && index.length === list.length ? index : buildTableSearchIndex(list);
  const out = [];
  for (const { i, text } of idx) {
    if (tokens.every((t) => text.includes(t))) out.push(list[i]);
  }
  return out;
}

/** Prefer indexed search once a desk is large enough that naive scans stutter. */
export function shouldIndexSearch(rowCount) {
  return Number(rowCount) >= 500;
}
