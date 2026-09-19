/**
 * Shared URL ranking for AI grounding / source extract.
 * Pure helpers — safe for browser and Node (Vite + Vercel).
 */

const URL_KEYS = [
  'pdf_url',
  'document_url',
  'doc_url',
  'file_url',
  'attachment_url',
  'detail_url',
  'html_url',
  'source_url',
  'url',
  'link',
  'href',
];

export function isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

export function isGoogleNewsUrl(u) {
  return /news\.google\.com/i.test(String(u || ''));
}

/**
 * Registry / listing hubs that are provenance only — not the record body.
 * Fetching these on Vercel just returns chrome, so the model "reads a URL".
 */
export function isHubListingUrl(u) {
  const s = String(u || '').trim().toLowerCase();
  if (!s) return true;
  if (isGoogleNewsUrl(s)) return true;
  // Sansad legislation index (every bill row currently points here)
  if (/sansad\.(in|gov\.in)\/(?:rs|ls)?\/?legislation\/?$/i.test(s)) return true;
  if (/sansad\.(in|gov\.in)\/(?:rs|ls)?\/?legislation\/?(?:\?|$)/i.test(s) && !/\.pdf(\?|$)/i.test(s) && !/getfile/i.test(s)) {
    return true;
  }
  // Generic open-data / search hubs without a document path
  if (/^https?:\/\/(www\.)?(prsindia\.org|indiacode\.nic\.in)\/?$/i.test(s)) return true;
  if (/egazette\.gov\.in\/?$/i.test(s)) return true;
  return false;
}

export function sourceKindHint(u) {
  const path = String(u || '').split('?')[0].toLowerCase();
  if (/\.pdf$/i.test(path) || /getfile/i.test(path) && /pdf/i.test(path)) return 'pdf';
  if (/\.xlsx?$/i.test(path)) return 'sheet';
  if (/\.csv$/i.test(path)) return 'csv';
  if (/\.docx?$/i.test(path)) return 'doc';
  if (/\/annex\/|\/questions\/|gazette|circular|notification/i.test(path)) return 'page';
  return 'page';
}

/** True when the URL is worth fetching for body text. */
export function isExtractableSourceUrl(u) {
  if (!isHttpUrl(u) || isHubListingUrl(u)) return false;
  const kind = sourceKindHint(u);
  if (kind === 'pdf' || kind === 'sheet' || kind === 'csv' || kind === 'doc') return true;
  // Specific document/detail paths (not bare hubs)
  const path = String(u).split('?')[0];
  if (/getfile|\.pdf|\/annex\/|\/billtext|\/bills\/|circular|master.?direction|notification/i.test(path)) return true;
  // Allow HTML detail pages with a meaningful path depth
  try {
    const { pathname } = new URL(u);
    if ((pathname || '/').split('/').filter(Boolean).length >= 2) return true;
  } catch {
    return false;
  }
  return false;
}

function scoreUrl(u) {
  const kind = sourceKindHint(u);
  if (kind === 'pdf') return 0;
  if (kind === 'sheet' || kind === 'csv' || kind === 'doc') return 1;
  if (/sansad\.|prsindia|indiacode|egazette|rbi\.org|sebi\.gov/i.test(u) && isExtractableSourceUrl(u)) return 2;
  if (isExtractableSourceUrl(u)) return 3;
  return 9;
}

/** Collect + rank URLs from a desk row. Hubs are excluded from extractable list. */
export function collectRowUrls(row, { pdf, source } = {}) {
  const all = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (!isHttpUrl(s) || isGoogleNewsUrl(s)) return;
    if (!all.includes(s)) all.push(s);
  };
  push(pdf);
  push(source);
  if (row && typeof row === 'object') {
    for (const k of URL_KEYS) push(row[k]);
    if (typeof row.sources_json === 'string') {
      try {
        const arr = JSON.parse(row.sources_json);
        for (const s of arr || []) {
          if (Array.isArray(s)) push(s[1]);
          else if (s && typeof s === 'object') push(s.url || s.href || s.link);
          else push(s);
        }
      } catch {
        /* ignore */
      }
    }
    for (let i = 1; i <= 8; i += 1) push(row[`source_${i}_url`]);
  }

  const extractable = all.filter(isExtractableSourceUrl).sort((a, b) => scoreUrl(a) - scoreUrl(b));
  const hubs = all.filter((u) => isHubListingUrl(u) || !isExtractableSourceUrl(u));
  return {
    all,
    extractable,
    hubs,
    /** Top documents to fetch (keep small for Vercel time budget). */
    toFetch: extractable.slice(0, 3),
  };
}

/** Human-readable record from row columns when no PDF body exists. */
export function rowRecordText(row, { title = '', max = 6_000 } = {}) {
  if (!row || typeof row !== 'object') return '';
  const skip = new Set([
    '__alId',
    '__gaId',
    '__saId',
    'members_json',
    'agenda_json',
    'sources_json',
    'attached_sources',
  ]);
  const lines = [];
  const head =
    title ||
    row.bill_name ||
    row.policy_name ||
    row.title ||
    row.subject ||
    row.name ||
    row.conflict_name ||
    '';
  if (head) lines.push(`Record: ${head}`);
  for (const [k, v] of Object.entries(row)) {
    if (skip.has(k) || k.startsWith('_')) continue;
    if (v == null || v === '') continue;
    if (typeof v === 'object') continue;
    const s = String(v).trim();
    if (!s) continue;
    if (isHttpUrl(s) && isHubListingUrl(s)) {
      lines.push(`${k}: ${s} (registry hub — provenance only, not document body)`);
      continue;
    }
    lines.push(`${k}: ${s.slice(0, 800)}`);
    if (lines.join('\n').length > max) break;
  }
  return lines.join('\n').slice(0, max);
}
