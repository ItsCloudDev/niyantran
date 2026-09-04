import { TABS, catalogModules, modulesForTier } from '../desks/catalog.js';
import { fetchFeature } from './featureFeed.js';
import { githubCsvUrl } from './githubCsv.js';

export const AI_DND = 'application/x-niyantran-ai';

export function openAiResearch(detail = {}) {
  window.dispatchEvent(new CustomEvent('niy-ai-open', { detail }));
}

export function aiDragProps(payload) {
  return {
    draggable: true,
    onDragStart: (e) => {
      e.stopPropagation();
      const data = JSON.stringify({ v: 1, ...payload });
      e.dataTransfer.setData(AI_DND, data);
      e.dataTransfer.setData('text/plain', payload.title || payload.feature || 'Niyantran record');
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}

export function rowDragProps(row, extra = {}) {
  if (!row) return {};
  const title =
    extra.title ||
    row.conflict_name ||
    row.name ||
    row.title ||
    row.bill_name ||
    row.theatre ||
    row.commodity ||
    'Record';
  return aiDragProps({
    kind: 'row',
    title,
    row,
    feature: extra.feature || '',
    tab: extra.tab || '',
  });
}

export function readAiDrag(e) {
  try {
    const raw = e.dataTransfer?.getData(AI_DND) || e.dataTransfer?.getData('text/plain');
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

function fileKind(url) {
  const u = String(url || '').split('?')[0].toLowerCase();
  if (/\.pdf$/i.test(u)) return 'pdf';
  if (/\.csv$/i.test(u)) return 'csv';
  if (/\.(xlsx?|xls)$/i.test(u)) return 'sheet';
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(u)) return 'image';
  if (/\.json$/i.test(u)) return 'json';
  return '';
}

function urlsFromRow(row) {
  if (!row || typeof row !== 'object') return [];
  const out = [];
  const push = (v) => {
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) out.push(v.trim());
  };
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
  for (const v of Object.values(row)) {
    if (typeof v === 'string') push(v);
  }
  const gh = githubCsvUrl(row);
  if (gh) out.push(gh);
  return [...new Set(out)].slice(0, 16);
}

function rowPreview(row) {
  if (!row || typeof row !== 'object') return {};
  const skip = new Set(['__alId', '__gaId', '__saId', 'members_json', 'agenda_json', 'sources_json']);
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(row)) {
    if (skip.has(k) || k.startsWith('_')) continue;
    if (v == null || v === '') continue;
    if (typeof v === 'object') continue;
    out[k] = String(v).slice(0, 500);
    n += 1;
    if (n >= 32) break;
  }
  const sources = urlsFromRow(row);
  if (sources.length) out.attached_sources = sources;
  return out;
}

function relatedPacket(row, feed) {
  if (!row || !feed) return {};
  const id = row.id;
  const name = String(row.conflict_name || row.name || row.title || row.bill_name || '').trim().toLowerCase();
  const related = [];
  const extraUrls = [];
  for (const r of feed.rows || []) {
    if (!r || r === row || r.status === 'source_status') continue;
    if (id && r.id === id) continue;
    const hay = `${r.conflict_name || ''} ${r.title || ''} ${r.name || ''} ${r.related_to || ''} ${r.theatre || ''}`.toLowerCase();
    if (name && name.length > 3 && hay.includes(name)) {
      related.push(rowPreview(r));
      extraUrls.push(...urlsFromRow(r));
    }
    if (related.length >= 8) break;
  }
  const timeline = (feed.timeline || [])
    .filter((t) => {
      const h = `${t.conflict || t.name || t.text || t.title || ''}`.toLowerCase();
      return (id && t.id === id) || (name && name.length > 3 && h.includes(name));
    })
    .slice(0, 10)
    .map((t) => ({
      date: t.date || t.when || '',
      text: String(t.text || t.title || t.latest || '').slice(0, 400),
    }));
  return {
    related_records: related,
    timeline,
    extraUrls: [...new Set(extraUrls)],
  };
}

function slimRows(rows, cap = 28) {
  return (rows || []).filter((r) => r && r.status !== 'source_status').slice(0, cap).map(rowPreview);
}

export async function materializeAiDrop(payload, extras = {}) {
  if (!payload) return [];
  const kind = payload.kind || 'feature';
  const attachments = [];

  if (kind === 'row' && payload.row) {
    const related = relatedPacket(payload.row, extras.feed);
    const urls = [...new Set([...urlsFromRow(payload.row), ...(related.extraUrls || [])])].slice(0, 12);
    attachments.push({
      kind: 'row',
      title: payload.title || payload.row.conflict_name || payload.row.title || payload.row.name || 'Record',
      tab: payload.tab || '',
      feature: payload.feature || extras.feature || extras.feed?.feature || '',
      preview: {
        ...rowPreview(payload.row),
        related_records: related.related_records,
        timeline: related.timeline,
      },
      urls,
      files: urls.map((url) => ({ url, kind: fileKind(url) || 'link' })),
    });
    return attachments;
  }

  if (kind === 'tab') {
    const tab = TABS.find((t) => t.id === payload.tab) || TABS.find((t) => t.tier === payload.tier);
    const mods = tab ? modulesForTier(tab.tier) : [];
    attachments.push({
      kind: 'tab',
      title: tab?.label || payload.title || 'Desk',
      tab: tab?.id || payload.tab,
      feature: '',
      preview: { modules: mods.slice(0, 40).map((m) => m.htmlFeature).join(' · ') },
      urls: [],
      files: [],
    });
    return attachments;
  }

  if (kind === 'feed' && extras.feed?.rows?.length) {
    const urls = [...new Set((extras.feed.rows || []).flatMap(urlsFromRow))].slice(0, 8);
    attachments.push({
      kind: 'feed',
      title: extras.feed.feature || payload.feature || 'Current feed',
      tab: payload.tab || '',
      feature: extras.feed.feature || payload.feature,
      preview: { rows: slimRows(extras.feed.rows), note: extras.feed.source?.note || '' },
      urls,
      files: urls.map((url) => ({ url, kind: fileKind(url) || 'link' })),
    });
    return attachments;
  }

  const feature = payload.feature || payload.title;
  const tier = payload.tier || extras.tier || '';
  if (feature) {
    let rows = [];
    let note = '';
    try {
      const body = await fetchFeature({ tier, feature });
      rows = slimRows(body?.rows);
      note = body?.source?.note || '';
    } catch (err) {
      note = err.message || 'Feed unavailable';
    }
    const urls = [...new Set((payload.urls || []).concat(rows.flatMap((r) => r.source_url || r.url || []).filter(Boolean)))].slice(0, 8);
    attachments.push({
      kind: 'feature',
      title: feature,
      tab: payload.tab || '',
      feature,
      preview: { rows, note },
      urls,
      files: urls.map((url) => ({ url, kind: fileKind(String(url)) || 'link' })),
    });
    return attachments;
  }

  if (kind === 'desk') {
    return materializeAiDrop({ kind: 'tab', tab: payload.tab, title: payload.title });
  }

  return [
    {
      kind: kind || 'note',
      title: payload.title || 'Context',
      tab: payload.tab || '',
      feature: payload.feature || '',
      preview: payload.preview || {},
      urls: payload.urls || [],
      files: (payload.urls || []).map((url) => ({ url, kind: fileKind(url) || 'link' })),
    },
  ];
}

export function catalogHint(tabId) {
  const tab = TABS.find((t) => t.id === tabId);
  if (!tab) return '';
  return modulesForTier(tab.tier)
    .slice(0, 8)
    .map((m) => m.htmlFeature)
    .join(', ');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function filesFromDrop(e) {
  const list = [...(e.dataTransfer?.files || [])];
  const out = [];
  for (const file of list) {
    const kind =
      fileKind(file.name) ||
      (file.type.includes('pdf') ? 'pdf' : file.type.startsWith('image/') ? 'image' : file.type.includes('csv') ? 'csv' : 'text');
    const rec = { kind: 'file', title: file.name, urls: [], files: [] };
    try {
      if (kind === 'pdf' || kind === 'image') {
        rec.files.push({
          name: file.name,
          kind,
          mime: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/png'),
          base64: await fileToBase64(file),
        });
      } else {
        rec.files.push({
          name: file.name,
          kind: kind || 'text',
          mime: file.type,
          text: (await file.text()).slice(0, 180000),
        });
      }
    } catch {
      rec.files.push({ name: file.name, kind, error: 'Could not read file' });
    }
    out.push(rec);
  }
  return out;
}

export { catalogModules };
