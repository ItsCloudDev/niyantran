/**
 * Light client-side record checklist.
 * Soft-normalises rows for the desk and reports quality gaps.
 * Does NOT replace a real ingest validation service.
 */

import { parseDate } from './format.js';

const TITLE_KEYS = [
  'title',
  'name',
  'entityName',
  'headline',
  'conflict_name',
  'bill_name',
  'programme',
  'project',
  'facility',
  'mineral',
  'person',
  'athlete',
  'film',
  'show',
  'matter',
  'case',
  'decision',
  'instrument',
  'tender',
  'question',
  'policy',
  'alliance',
];

const DATE_KEYS = [
  'eventDate',
  'published',
  'pub_date',
  'source_date',
  'sourcePublishedAt',
  'date',
  'as_of',
  'updated',
  'tabled',
  'introduced',
  'verifiedAt',
  'last_verified',
  'time',
  'pub',
  'seendate',
];

const SOURCE_KEYS = [
  'sourceName',
  'source_label',
  'outlet',
  'source',
  'domain',
  'source_url',
  'sourceUrl',
];

const EMPTY_RE = /^\s*$|^[-–—]$|^n\/?a$|^null$|^undefined$/i;

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return EMPTY_RE.test(v);
  return false;
}

function pick(row, keys) {
  for (const k of keys) {
    if (!isEmpty(row?.[k])) return { key: k, value: String(row[k]).trim() };
  }
  return null;
}

function cleanEmpties(row) {
  const out = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && EMPTY_RE.test(v)) out[k] = '';
  }
  return out;
}

function hostOf(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Soft-fix one row and collect checklist issues.
 * @returns {{ row: object, issues: Array<{ code: string, hard?: boolean, message: string }> }}
 */
export function checklistRow(row, { feature = '', index = 0 } = {}) {
  if (!row || row.status === 'source_status') return { row, issues: [] };

  const issues = [];
  let out = cleanEmpties(row);

  const title = pick(out, TITLE_KEYS);
  if (!title) {
    issues.push({ code: 'missing_title', hard: true, message: 'Missing title / name' });
  } else {
    if (isEmpty(out.title)) out.title = title.value;
    if (isEmpty(out.entityName)) out.entityName = title.value;
  }

  if (isEmpty(out.id) && isEmpty(out._id)) {
    const slug = String(title?.value || 'row')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    out.id = `${String(feature || 'row')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 24)}:${slug || 'x'}:${index}`;
    issues.push({ code: 'synthetic_id', hard: false, message: 'Id was generated in the app' });
  }

  const datePick = pick(out, DATE_KEYS);
  if (!datePick) {
    issues.push({ code: 'missing_date', hard: false, message: 'No date field' });
  } else {
    const d = parseDate(datePick.value);
    if (!d) {
      issues.push({ code: 'bad_date', hard: true, message: 'Date could not be read' });
    } else {
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (isEmpty(out.eventDate)) out.eventDate = ymd;
      if (isEmpty(out.sourcePublishedAt) && /publish|seen|pub|date/i.test(datePick.key)) {
        out.sourcePublishedAt = ymd;
      }
      const ahead = d.getTime() - Date.now();
      if (ahead > 2 * 86400000) {
        issues.push({ code: 'future_date', hard: false, message: 'Date is in the future' });
      }
    }
  }

  const src = pick(out, SOURCE_KEYS);
  if (!src) {
    issues.push({ code: 'missing_source', hard: true, message: 'No source name or link' });
  } else {
    if (isEmpty(out.sourceName)) {
      out.sourceName = src.key === 'source_url' || src.key === 'sourceUrl' ? hostOf(src.value) || 'Source link' : src.value;
    }
    if ((src.key === 'source_url' || src.key === 'sourceUrl') && isEmpty(out.source_url)) {
      out.source_url = src.value;
    }
  }

  if (!isEmpty(out.value) && isEmpty(out.unit) && /%|percent/i.test(String(out.value))) {
    /* leave — display formatters handle % */
  }

  // Zero-versus-null: do not coerce blank numeric-looking fields to 0.
  for (const k of Object.keys(out)) {
    if (out[k] === '') continue;
    if (typeof out[k] === 'string' && EMPTY_RE.test(out[k])) out[k] = '';
  }

  return { row: out, issues };
}

function countBy(codes, code) {
  return codes.filter((c) => c === code).length;
}

function summarize(quality) {
  const bits = [];
  const { missing_title, missing_source, bad_date, missing_date, future_date, duplicate_id } = quality.counts;
  if (missing_title) bits.push(`${missing_title} missing a clear title`);
  if (missing_source) bits.push(`${missing_source} missing a source`);
  if (bad_date) bits.push(`${bad_date} with a date that could not be read`);
  if (missing_date) bits.push(`${missing_date} with no date`);
  if (future_date) bits.push(`${future_date} dated in the future`);
  if (duplicate_id) bits.push(`${duplicate_id} duplicate id${duplicate_id === 1 ? '' : 's'}`);
  // Feedback: do not surface "Data check" banners in the UI.
  if (!bits.length) return '';
  return '';
}

/**
 * Run checklist over a feed. Soft-fixes rows; attaches meta.quality.
 */
export function applyRecordChecklistToFeed(feed) {
  if (!feed || !Array.isArray(feed.rows) || !feed.rows.length) return feed;
  if (feed.rows[0]?.status === 'source_status' && feed.rows.length === 1) return feed;

  const feature = feed.feature || '';
  const allCodes = [];
  const idSeen = new Map();
  const rows = feed.rows.map((raw, index) => {
    const { row, issues } = checklistRow(raw, { feature, index });
    for (const issue of issues) {
      allCodes.push(issue.code);
    }
    const id = String(row.id || row._id || '');
    if (id && row.status !== 'source_status') {
      idSeen.set(id, (idSeen.get(id) || 0) + 1);
    }
    return row;
  });

  let duplicate_id = 0;
  for (const n of idSeen.values()) {
    if (n > 1) duplicate_id += n - 1;
  }

  const counts = {
    missing_title: countBy(allCodes, 'missing_title'),
    missing_source: countBy(allCodes, 'missing_source'),
    bad_date: countBy(allCodes, 'bad_date'),
    missing_date: countBy(allCodes, 'missing_date'),
    future_date: countBy(allCodes, 'future_date'),
    synthetic_id: countBy(allCodes, 'synthetic_id'),
    duplicate_id,
  };

  const checked = rows.filter((r) => r?.status !== 'source_status').length;
  const hardCount =
    counts.missing_title + counts.missing_source + counts.bad_date + counts.duplicate_id;
  const softCount = counts.missing_date + counts.future_date + counts.synthetic_id;

  const quality = {
    checked,
    hardCount,
    softCount,
    counts,
    summary: summarize({ counts }),
    clientOnly: true,
    note: 'Checked in the app when the page loads. This is not yet a shared checklist forced on every feed at the source.',
  };

  return {
    ...feed,
    rows,
    meta: {
      ...(feed.meta || {}),
      quality,
      moduleId: feed.meta?.moduleId || feature,
      displayTitle: feed.meta?.displayTitle || feature,
    },
  };
}

/** Short banner line when hard gaps exist (or many soft gaps). */
export function qualityBannerText(feed) {
  const q = feed?.meta?.quality;
  if (!q || !q.checked) return '';
  const { counts, hardCount } = q;
  const softHeavy = (counts.missing_date || 0) / q.checked >= 0.35;
  if (!hardCount && !softHeavy) return '';
  return `${q.summary} (screen check only — source feeds are not yet locked to one shared format.)`;
}
