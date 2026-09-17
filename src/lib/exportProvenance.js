/**
 * Attach export provenance so downloads carry filtered scope + source columns
 * even when those fields are hidden in the on-screen table.
 */

export function withExportProvenance(rows, { feature = '', filterNote = '', exportedAt = new Date() } = {}) {
  const when = exportedAt instanceof Date ? exportedAt.toISOString() : String(exportedAt);
  return (rows || []).map((row) => ({
    ...row,
    _export_feature: feature,
    _export_filter: filterNote || '',
    _export_at: when,
    _export_source: row.source_url || row.source || row.source_label || '',
    _export_source_date: row.source_date || row.published || row.date || row.updated || '',
    _export_last_verified: row.last_verified || row.verified || row.latestDate || row.dataThrough || '',
  }));
}

export function downloadJson(filename, payload) {
  try {
    const gate = typeof window !== 'undefined' ? window.__niyExportGate : null;
    if (typeof gate === 'function') {
      const allowed = gate({ kind: 'json', filename });
      if (allowed === false) return false;
    }
  } catch {
    /* continue */
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}
