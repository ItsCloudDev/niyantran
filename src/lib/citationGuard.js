/**
 * Drop rows whose citation is a fake government URL (D5 guard).
 * Reject — do not blank the link and keep the row.
 * Wikidata SPARQL often returns http://www.wikidata.org/entity/… — that is a
 * real citation; requiring https:// emptied MLA Directory while Admin still
 * counted the raw probe rows.
 */
export function isPlaceholderCitation(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (/placeholder/i.test(u)) return true;
  if (/PRID=placeholder/i.test(u)) return true;
  return false;
}

/** Absolute http(s) URL — not javascript:/data:/relative junk. */
export function isAbsoluteHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

export function citationUrlOf(row) {
  if (!row || typeof row !== 'object') return '';
  for (const k of ['source_url', 'pdf_url', 'url', 'link', 'document_url', 'html_url']) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export function applyCitationGuardToFeed(feed) {
  const rows = Array.isArray(feed?.rows) ? feed.rows : null;
  if (!rows?.length) return feed;
  const kept = [];
  let dropped = 0;
  for (const row of rows) {
    const url = citationUrlOf(row);
    if (url && (isPlaceholderCitation(url) || !isAbsoluteHttpUrl(url))) {
      dropped += 1;
      continue;
    }
    kept.push(row);
  }
  if (!dropped) return feed;
  return {
    ...feed,
    rows: kept,
    meta: {
      ...(feed.meta || {}),
      citationGuardDropped: dropped,
    },
  };
}
