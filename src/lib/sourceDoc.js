/**
 * Resolve source document URLs for a desk row and fetch readable text via /api/ai/source-extract.
 * Used by BillRecordPane / RecordDetail briefs and DeskIntel grounding.
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

function isHttp(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

function isGoogleNews(u) {
  return /news\.google\.com/i.test(String(u || ''));
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function kindHint(u) {
  const path = String(u || '').split('?')[0].toLowerCase();
  if (/\.pdf$/i.test(path)) return 'pdf';
  if (/\.xlsx?$/i.test(path)) return 'sheet';
  if (/\.csv$/i.test(path)) return 'csv';
  if (/\.docx?$/i.test(path)) return 'doc';
  return 'page';
}

/** Prefer PDFs / documents over listing pages. */
export function sourceUrlsForRow(row, { pdf, source } = {}) {
  const out = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (!isHttp(s) || isGoogleNews(s)) return;
    if (!out.includes(s)) out.push(s);
  };
  push(pdf);
  push(source);
  for (const k of URL_KEYS) push(row?.[k]);
  if (typeof row?.sources_json === 'string') {
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
  for (let i = 1; i <= 6; i += 1) push(row?.[`source_${i}_url`]);

  return out
    .sort((a, b) => {
      const score = (u) => {
        const k = kindHint(u);
        if (k === 'pdf') return 0;
        if (k === 'sheet' || k === 'csv' || k === 'doc') return 1;
        if (/sansad\.gov\.in|prsindia|indiacode|egazette|rbi\.org|sebi\.gov/i.test(u)) return 2;
        return 3;
      };
      return score(a) - score(b);
    })
    .slice(0, 4);
}

export function structuralBrief(row, { noun = 'record', name = '' } = {}) {
  const title =
    name ||
    row?.bill_name ||
    row?.policy_name ||
    row?.title ||
    row?.subject ||
    row?.name ||
    `This ${noun}`;
  const bits = [];
  bits.push(String(title).trim());
  const house = row?.house;
  const stage = row?.current_stage || row?.stage || row?.action_type || row?.question_type || row?.status;
  const subject = row?.sector || row?.ministry || row?.regulator;
  const when = row?.date_introduced || row?.date || row?.date_reported || row?.occurred_at;
  if (house) bits.push(`House on record: ${house}.`);
  if (stage) bits.push(`Stage / type: ${stage}.`);
  if (subject) bits.push(`Subject: ${subject}.`);
  if (when) bits.push(`Date on record: ${String(when).slice(0, 16)}.`);
  bits.push(
    `No authored analysis brief is on file for this ${noun}. Open the source document when a readable PDF or page is linked.`,
  );
  return bits.join(' ');
}

/**
 * @returns {Promise<{ ok: boolean, url?: string, kind?: string, text?: string, brief?: string, error?: string, host?: string }>}
 */
export async function fetchSourceExtract(url, { title = '', signal } = {}) {
  if (!isHttp(url)) return { ok: false, error: 'No URL' };
  const q = new URLSearchParams({ url: url.trim() });
  if (title) q.set('title', title);
  const res = await fetch(`/api/ai/source-extract?${q}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) {
    return { ok: false, url, error: body?.error || `HTTP ${res.status}`, host: hostOf(url) };
  }
  return {
    ok: true,
    url: body.url || url,
    kind: body.kind,
    text: body.text || '',
    brief: body.brief || '',
    error: body.error || null,
    host: hostOf(body.url || url),
    bytes: body.bytes,
  };
}

/**
 * Try preferred source URLs until one yields usable text.
 */
export async function resolveSourceBrief(row, { pdf, source, title, noun = 'record', signal } = {}) {
  const name =
    title ||
    row?.bill_name ||
    row?.policy_name ||
    row?.title ||
    row?.subject ||
    row?.name ||
    '';
  const urls = sourceUrlsForRow(row, { pdf, source });
  if (!urls.length) {
    return {
      text: structuralBrief(row, { noun, name }),
      origin: 'structural',
      host: '',
      url: '',
      extract: '',
    };
  }

  let lastErr = '';
  for (const url of urls) {
    try {
      const got = await fetchSourceExtract(url, { title: name, signal });
      if (!got.ok) {
        lastErr = got.error || lastErr;
        continue;
      }
      const excerpt = String(got.brief || got.text || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (excerpt.length < 60) {
        lastErr = got.error || 'Source text too thin';
        continue;
      }
      const label = got.kind === 'pdf' ? 'PDF' : got.kind === 'sheet' ? 'spreadsheet' : got.kind === 'csv' ? 'CSV' : 'source page';
      return {
        text: `From ${label}${got.host ? ` (${got.host})` : ''}: ${excerpt}`,
        origin: 'source',
        host: got.host,
        url: got.url,
        kind: got.kind,
        extract: got.text || excerpt,
      };
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      lastErr = err.message || String(err);
    }
  }

  return {
    text: `${structuralBrief(row, { noun, name })}${
      lastErr
        ? ` Could not read source text (${lastErr}). Use View PDF / Source when the document is available.`
        : ''
    }`,
    origin: 'structural',
    host: '',
    url: urls[0] || '',
    extract: '',
    error: lastErr,
  };
}

/** Clean common PDF extraction artefacts before display / AI. */
export function scrubPdfNoise(s) {
  return String(s || '')
    .replace(/^From (PDF|source page|spreadsheet|CSV)\s*\([^)]*\):\s*/i, '')
    .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, '$1')
    .replace(/\bN\s*O\s*\.\s*/gi, 'No. ')
    .replace(/\bW\s*HEREAS\b/gi, 'WHEREAS')
    .replace(/\b(\d+)\s*rd\b/gi, '$1rd')
    .replace(/\b(\d+)\s*th\b/gi, '$1th')
    .replace(/\b(\d+)\s*st\b/gi, '$1st')
    .replace(/\b(\d+)\s*nd\b/gi, '$1nd')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Deterministic short digest when the organiser model is unavailable. */
export function localDigest(extract, { max = 480 } = {}) {
  const clean = scrubPdfNoise(extract);
  if (clean.length < 40) return '';
  let start = 0;
  const m = clean.match(/\bAn Act to\b|\bA Bill(?:\s+further)?\s+to\b|\bWHEREAS\b|\bIt is hereby enacted\b/i);
  if (m && m.index != null) start = m.index;
  const slice = clean.slice(start);
  const sentences = slice.split(/(?<=[.!?])\s+/).filter((x) => x.replace(/\s/g, '').length > 35);
  let out = (sentences.slice(0, 3).join(' ') || slice).trim();
  if (out.length > max) out = `${out.slice(0, max - 1).trim()}…`;
  return out;
}

const META_LABEL_RE =
  /^(facility|status|source(?: and verification)?|bill category|house(?: and sector)?|sector|ministry|stage|date|verification|adapter|house and sector)\s*:/i;

function isMetaBullet(s) {
  return META_LABEL_RE.test(String(s || '').trim());
}

function formatOrganisedBrief(brief, { noun = 'record' } = {}) {
  if (!brief) return null;
  const headline = String(brief.headline || '').trim();
  const rawBullets = Array.isArray(brief.summary)
    ? brief.summary.map((s) => String(s || '').trim()).filter((s) => s.length > 8)
    : [];
  const substance = rawBullets.filter((b) => !isMetaBullet(b));
  // Reject pure metadata dumps (Facility / Status / Source…).
  if (substance.length >= 2) {
    return {
      origin: 'organised',
      bullets: substance.slice(0, 5),
      text: [headline, ...substance].filter(Boolean).join(' '),
      headline,
    };
  }
  if (headline.length > 28 && !/facility|status|source and verification/i.test(headline)) {
    return { origin: 'organised', bullets: headline ? [headline] : [], text: headline, headline };
  }
  return null;
}

/**
 * Extract source text, then write a substance summary of what the record is about.
 * Falls back to a cleaned local digest — never dumps raw PDF or registry metadata.
 */
export async function resolveOrganisedBrief(
  row,
  { pdf, source, title, noun = 'record', feature = '', tier = '', signal } = {},
) {
  const src = await resolveSourceBrief(row, { pdf, source, title, noun, signal });
  const extract = String(src.extract || '').trim();
  const canAskModel = Boolean(feature);

  if (canAskModel && (extract.length >= 60 || String(title || row?.bill_name || '').length > 12)) {
    try {
      const { ensureDeskBrief } = await import('./deskBrief.js');
      const run = (force) =>
        ensureDeskBrief({
          feature,
          tier,
          row,
          sourceNote: src.host ? `Source ${src.kind || 'document'} from ${src.host}` : '',
          sourceExtract: extract.slice(0, 12_000),
          scope: 'substance',
          force,
          signal,
        });
      let brief = await run(false);
      let organised = formatOrganisedBrief(brief, { noun });
      if (!organised) {
        brief = await run(true);
        organised = formatOrganisedBrief(brief, { noun });
      }
      if (organised && organised.text.length >= 40) {
        return {
          ...organised,
          url: src.url,
          host: src.host,
          extract,
        };
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      /* fall through to local digest */
    }
  }

  const digest = extract.length >= 60 ? localDigest(extract) : '';
  if (digest) {
    return {
      origin: 'digest',
      bullets: [digest],
      text: digest,
      headline: '',
      url: src.url,
      host: src.host,
      extract,
    };
  }

  return {
    origin: src.origin || 'structural',
    bullets: [],
    text: structuralBrief(row, { noun, name: title }),
    headline: '',
    url: src.url,
    host: src.host,
    extract: '',
  };
}

