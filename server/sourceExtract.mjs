/**
 * Fetch a source URL and extract readable text (HTML / CSV / JSON / XLSX / PDF).
 * Used by /api/ai/fetch and /api/source/extract.
 */
import { createRequire } from 'module';

const UA = 'Mozilla/5.0 (compatible; NiyantranTerminal/1.0; source-extract)';
const FETCH_MS = 28_000;
const MAX_BIN = 10 * 1024 * 1024;
const MAX_TEXT = 120_000;

const require = createRequire(import.meta.url);

async function fetchBuf(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_MS);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: '*/*' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BIN) throw new Error('file too large');
    const ct = r.headers.get('content-type') || '';
    return { buf, ct, url: r.url || url };
  } finally {
    clearTimeout(t);
  }
}

export function kindOf(url, ct) {
  const u = String(url || '').split('?')[0].toLowerCase();
  const c = String(ct || '').toLowerCase();
  if (c.includes('pdf') || u.endsWith('.pdf')) return 'pdf';
  if (c.includes('sheet') || c.includes('excel') || /\.xlsx?$/i.test(u)) return 'sheet';
  if (c.includes('csv') || u.endsWith('.csv')) return 'csv';
  if (c.includes('json') || u.endsWith('.json')) return 'json';
  if (c.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(u)) return 'image';
  if (c.includes('html') || /\.html?$/i.test(u) || !/\.[a-z0-9]{2,4}$/i.test(u)) return 'html';
  return 'text';
}

function textFromHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

async function pdfToText(buf) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
    const max = Math.min(doc.numPages || 0, 40);
    const parts = [];
    let len = 0;
    for (let p = 1; p <= max; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const line = (content.items || []).map((it) => it.str || '').join(' ');
      parts.push(line);
      len += line.length;
      if (len > MAX_TEXT) break;
    }
    return parts.join('\n').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

function sheetToText(buf) {
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const parts = [];
    for (const name of (wb.SheetNames || []).slice(0, 6)) {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`# Sheet: ${name}\n${csv}`);
      if (parts.join('\n').length > MAX_TEXT) break;
    }
    return parts.join('\n\n').slice(0, MAX_TEXT);
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

/** Extract text from an already-fetched buffer (chat uploads). */
export async function extractBuffer(buf, { kind = 'text', mime = '', name = '' } = {}) {
  const k = kind || kindOf(name, mime);
  if (k === 'pdf') {
    const extracted = await pdfToText(buf);
    if (typeof extracted === 'string' && extracted.replace(/\s/g, '').length >= 40) {
      return { kind: 'pdf', mime: mime || 'application/pdf', text: extracted, base64: Buffer.from(buf).toString('base64') };
    }
    return {
      kind: 'pdf',
      mime: mime || 'application/pdf',
      base64: Buffer.from(buf).toString('base64'),
      text: typeof extracted === 'object' ? '' : extracted || '',
      error: typeof extracted === 'object' ? extracted.error : 'PDF text unavailable',
    };
  }
  if (k === 'sheet') {
    const text = sheetToText(buf);
    if (typeof text === 'object') return { kind: 'sheet', mime, error: text.error };
    return { kind: 'sheet', mime, text };
  }
  if (k === 'html') {
    return { kind: 'html', mime, text: textFromHtml(Buffer.from(buf).toString('utf8')) };
  }
  return { kind: k || 'text', mime, text: Buffer.from(buf).toString('utf8').slice(0, MAX_TEXT) };
}

/**
 * @returns {Promise<{ url: string, kind: string, mime: string, text?: string, base64?: string, error?: string, bytes: number }>}
 */
export async function extractSource(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('HTTPS url required');
  const got = await fetchBuf(url);
  const kind = kindOf(got.url, got.ct);
  const mime = got.ct || '';
  const bytes = got.buf.length;

  if (kind === 'image') {
    return { url: got.url, kind, mime, base64: got.buf.toString('base64'), bytes };
  }

  if (kind === 'pdf') {
    const extracted = await pdfToText(got.buf);
    if (typeof extracted === 'string' && extracted.replace(/\s/g, '').length >= 40) {
      return { url: got.url, kind, mime: mime || 'application/pdf', text: extracted, bytes };
    }
    return {
      url: got.url,
      kind,
      mime: mime || 'application/pdf',
      base64: got.buf.toString('base64'),
      text: typeof extracted === 'object' ? '' : extracted || '',
      error: typeof extracted === 'object' ? extracted.error : extracted ? 'PDF text too thin' : 'PDF text unavailable',
      bytes,
    };
  }

  if (kind === 'sheet') {
    const text = sheetToText(got.buf);
    if (typeof text === 'object') {
      return { url: got.url, kind, mime, error: text.error, bytes };
    }
    return { url: got.url, kind, mime, text, bytes };
  }

  if (kind === 'html') {
    return { url: got.url, kind, mime, text: textFromHtml(got.buf.toString('utf8')), bytes };
  }

  const raw = got.buf.toString('utf8').slice(0, MAX_TEXT);
  return { url: got.url, kind, mime, text: raw, bytes };
}

export function briefFromExtract(text, { title = '', max = 900 } = {}) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length < 40) return '';
  // Prefer a window after the title if present
  let start = 0;
  const t = String(title || '').trim();
  if (t.length > 8) {
    const i = clean.toLowerCase().indexOf(t.toLowerCase().slice(0, 48));
    if (i >= 0) start = i;
  }
  const slice = clean.slice(start, start + max).trim();
  return slice.length < clean.length ? `${slice}…` : slice;
}
