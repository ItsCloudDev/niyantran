/** Display helpers for casing and copy cleanup (feedback: less AI-looking UI). */

const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'vs', 'via']);

/** Title Case for bill / proper names. Keeps short glue words lowercase mid-phrase. */
export function toTitleCase(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/\b[\w'’]+/g, (word, i) => {
      if (i > 0 && SMALL.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}

/** Prefer sentence case for UI labels that were ALL CAPS. */
export function toSentenceCase(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Replace em/en dashes with plain hyphens or commas for UI copy. */
export function softenDashes(value) {
  return String(value || '')
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const DEVANAGARI = /[\u0900-\u097F]/;

export function looksHindi(value) {
  const s = String(value || '');
  if (!s) return false;
  const hits = (s.match(DEVANAGARI) || []).length;
  return hits >= 8 || hits / Math.max(1, s.length) > 0.25;
}

/** Drop Hindi-primary rows when an English alternate exists; otherwise keep. */
export function preferEnglishRows(rows, { titleKeys = ['title', 'headline', 'subject', 'decision', 'name'] } = {}) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const english = rows.filter((r) => {
    if (r?.status === 'source_status') return true;
    const blob = titleKeys.map((k) => r?.[k]).filter(Boolean).join(' ');
    return !looksHindi(blob);
  });
  const realEn = english.filter((r) => r?.status !== 'source_status');
  if (realEn.length >= Math.min(3, rows.filter((r) => r?.status !== 'source_status').length * 0.2)) {
    return english;
  }
  return rows;
}
