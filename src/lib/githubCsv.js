import { liveApiEnabled } from './apiMode.js';

export function githubCsvUrl(row) {
  const download = String(row?.download_url || '').trim();
  if (/^https:\/\/raw\.githubusercontent\.com\/.+\.csv$/i.test(download.split('?')[0])) return download;
  const html = String(row?.html_url || row?.source_url || '').trim();
  const blob = html.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.csv)$/i);
  if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}`;
  return '';
}

export function isGithubCsvRow(row) {
  const name = String(row?.name || row?.title || '');
  if (!/\.csv$/i.test(name)) return false;
  return Boolean(githubCsvUrl(row));
}

export async function fetchGithubCsv(row, signal) {
  const url = githubCsvUrl(row);
  if (!url) throw new Error('No CSV download URL on this row.');
  // Prefer direct raw.githubusercontent.com from the browser when the csv-table
  // proxy is not deployed (D2 / D12) — GitHub is CORS-OK.
  if (!liveApiEnabled()) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
    const text = await res.text();
    return { ok: true, url, text, rows: null, direct: true };
  }
  const res = await fetch(`/api/csv-table?url=${encodeURIComponent(url)}`, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || `CSV HTTP ${res.status}`);
  }
  return body;
}
