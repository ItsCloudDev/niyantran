/**
 * Same-origin /api/feature-feed handler.
 * Live rows, last-known-good archive, or one labelled status row — never fabricated records.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenAlliance } from '../src/lib/alliances.js';
import { flattenSanction } from '../src/lib/sanctions.js';
import { flattenAppeal } from '../src/lib/globalAid.js';
import { flattenChokepoint, flattenInfra, flattenNuclear } from '../src/lib/strategicAssets.js';
import { flattenLeader, commoditiesFromPack } from '../src/lib/globalResources.js';
import { flattenEnergyMineral, flattenMineralRef } from '../src/lib/geonomics.js';
import { serveNational } from './nationalFeed.mjs';
import { loadLaunches } from './assetsApi.mjs';
import { loadConstitutions, loadGrowth, loadTrade } from './resourcesApi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');
const REGISTRY_PATH = path.join(APP_ROOT, 'src', 'data', 'source-registry.json');
const FEATURES_PATH = path.join(APP_ROOT, 'src', 'data', 'html-feature-map.json');
const EMBEDDED_DIRS = [
  path.join(APP_ROOT, 'public', 'data', 'embedded_csv'),
  path.join(REPO_ROOT, 'data', 'embedded_csv'),
];
const MANIFEST_PATH = EMBEDDED_DIRS.map((d) => path.join(d, '_manifest.json')).find((p) => fs.existsSync(p))
  || path.join(EMBEDDED_DIRS[0], '_manifest.json');
const EMBEDDED_DIR = EMBEDDED_DIRS.find((d) => fs.existsSync(d)) || EMBEDDED_DIRS[0];

const FETCH_MS = 12_000;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 500;
const USER_AGENT =
  'Mozilla/5.0 (compatible; NiyantranTerminal/1.0; +https://localhost) AppleWebKit/537.36';

const TIER_ALIAS = {
  home: 'home',
  global: 'geopolitics',
  geopolitics: 'geopolitics',
  national: 'national',
  state: 'state',
  local: 'local',
  law: 'judiciary',
  judiciary: 'judiciary',
  economics: 'finance',
  finance: 'finance',
  carbon: 'climate',
  climate: 'climate',
  sports: 'sports',
  entertainment: 'entertainment',
};

const LIVE_ADAPTERS = new Set(['api', 'news-search', 'embedded', 'bill-history', 'source-library']);
const STATUS_ADAPTERS = new Set(['scrape', 'licensed', 'download-or-html', 'internal', '']);

const HOME_GDELT =
  'https://api.gdeltproject.org/api/v2/doc/doc?query=India&mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=40';
const HOME_STOOQ = [
  ['NIFTY 50', 'https://stooq.com/q/l/?s=%5Enifty&f=sd2t2ohlcv&h&e=csv'],
  ['SENSEX', 'https://stooq.com/q/l/?s=%5Ebsesn&f=sd2t2ohlcv&h&e=csv'],
];
const NSE_INDICES = 'https://www.nseindia.com/api/allIndices';

let cache = null;
const embeddedCache = new Map();

function loadCache() {
  if (cache) return cache;
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const features = JSON.parse(fs.readFileSync(FEATURES_PATH, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const datasetToFile = {};
  for (const row of manifest) {
    datasetToFile[row.key] = row.file;
    datasetToFile[row.key.replace(/\.csv$/i, '')] = row.file;
  }
  cache = { registry, features, datasetToFile };
  return cache;
}

export function resetFeedCache() {
  cache = null;
  embeddedCache.clear();
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveTier(raw) {
  return TIER_ALIAS[norm(raw)] || norm(raw);
}

function isHttpsUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isGdelt(url) {
  return /gdeltproject\.org/i.test(url || '');
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') continue;
    if (typeof v === 'object' && v.value != null) return String(v.value);
    if (typeof v === 'object' && v.url) return String(v.url);
    if (typeof v === 'object') continue;
    return String(v);
  }
  return '';
}

function flattenValue(v, depth = 0) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (depth > 2) return JSON.stringify(v);
  if (Array.isArray(v)) return v.map((x) => flattenValue(x, depth + 1)).join('; ');
  if (typeof v === 'object') {
    if (v.value != null && (v.type || Object.keys(v).length <= 3)) return flattenValue(v.value, depth + 1);
    if (v.url && !v.title) return String(v.url);
  }
  return JSON.stringify(v);
}

function flattenRow(item, extra = {}) {
  const src = item && typeof item === 'object' && !Array.isArray(item) ? item : { value: item };
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith('_')) continue;
    out[k] = flattenValue(v);
  }
  const date =
    pick(src, [
      'date',
      'date_introduced',
      'seendate',
      'seenDate',
      'pubDate',
      'published',
      'datetime',
      'Date',
      'year',
      'closeTime',
      'createdTime',
      'billIntroducedDate',
      'introducedOn',
      'airdate',
      'dateEvent',
    ]) || extra.date || '';
  const title =
    pick(src, [
      'title',
      'bill_name',
      'billName',
      'name',
      'headline',
      'topic',
      'policy_name',
      'tender_title',
      'officer_name',
      'mp_name',
      'project_name',
      'conflict_name',
      'subject',
      'question',
      'strEvent',
      'OBJECT_NAME',
      'lastName',
      'indicator',
      'country',
    ]) || extra.title || '';
  const source_url =
    pick(src, [
      'source_url',
      'url',
      'urlSrc',
      'link',
      'sourceurl',
      'html_url',
      'document_url',
      'pdf_url',
      'detail_url',
      'strVideo',
    ]) || extra.source_url || '';
  return { ...out, date, title, source_url, ...extra };
}

function findArray(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object') return [];
  const keys = [
    'articles',
    'data',
    'items',
    'bills',
    'results',
    'records',
    'rows',
    'content',
    'objects',
    'markets',
    'events',
    'states',
    'value',
    'list',
    'entries',
    'payload',
    'docs',
  ];
  for (const k of keys) {
    if (Array.isArray(json[k])) return json[k];
    if (json[k] && Array.isArray(json[k].data)) return json[k].data;
    if (json[k] && Array.isArray(json[k].objects)) return json[k].objects;
    if (json[k] && Array.isArray(json[k]._embedded?.objects)) return json[k]._embedded.objects;
  }
  if (json._embedded && Array.isArray(json._embedded.objects)) return json._embedded.objects;
  if (json.feed && Array.isArray(json.feed.results)) return json.feed.results;
  if (json.results && Array.isArray(json.results.bindings)) return json.results.bindings;
  for (const v of Object.values(json)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
  }
  return [];
}

function gdeltRows(json) {
  const arts = json?.articles || [];
  return arts.map((a) =>
    flattenRow(a, {
      date: a.seendate || '',
      title: a.title || '',
      source_url: a.url || '',
      reporting_search: 'GDELT DOC 2.0 — news reporting search, not an official dataset',
    }),
  );
}

function worldBankRows(json) {
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : findArray(json);
  return rows.map((r) =>
    flattenRow(
      {
        country: r.country?.value || r.countryiso3code || '',
        indicator: r.indicator?.value || '',
        date: r.date || '',
        value: r.value,
        iso3: r.countryiso3code || '',
      },
      { title: `${r.country?.value || r.countryiso3code || ''} ${r.date || ''}`.trim() },
    ),
  );
}

function wikidataRows(json) {
  const bindings = json?.results?.bindings || [];
  return bindings.map((b) => {
    const flat = {};
    for (const [k, cell] of Object.entries(b)) {
      flat[k.replace(/Label$/, '')] = cell?.value || '';
    }
    const title =
      flat.person ||
      flat.country ||
      flat.film ||
      flat.service ||
      flat.league ||
      flat.district ||
      flat.item ||
      Object.values(flat)[0] ||
      '';
    const source_url = Object.values(b).find((c) => /^https?:/.test(c?.value || ''))?.value || '';
    return flattenRow(flat, { title, source_url });
  });
}

function reliefwebRows(json) {
  const data = json?.data || [];
  return data.map((d) => {
    const f = d.fields || {};
    return flattenRow(
      {
        id: d.id,
        title: f.title,
        date: f.date?.original || f.date?.created || '',
        source_url: f.url,
        status: f.status,
        country: Array.isArray(f.country) ? f.country.map((c) => c.name).join(', ') : '',
      },
      {},
    );
  });
}

function openskyRows(json) {
  const states = json.states || [];
  return states.slice(0, MAX_ROWS).map((s) =>
    flattenRow({
      date: json.time ? new Date(json.time * 1000).toISOString() : '',
      title: (s[1] || s[0] || '').toString().trim() || 'aircraft',
      icao24: s[0],
      callsign: s[1],
      origin_country: s[2],
      longitude: s[5],
      latitude: s[6],
      altitude: s[7],
      on_ground: s[8],
      velocity: s[9],
    }),
  );
}

function espnRows(json) {
  const events = json.events || [];
  return events.map((e) => {
    const comp = e.competitions?.[0];
    const teams = (comp?.competitors || [])
      .map((c) => `${c.team?.displayName || ''} ${c.score || ''}`.trim())
      .join(' vs ');
    return flattenRow({
      date: e.date,
      title: e.name || teams,
      source_url: e.links?.[0]?.href || '',
      status: comp?.status?.type?.description || e.status?.type?.description || '',
      detail: teams,
    });
  });
}

function sportsDbRows(json) {
  const events = json.events || json.event || [];
  return events.map((e) =>
    flattenRow({
      date: e.dateEvent,
      title: e.strEvent,
      source_url: e.strThumb || '',
      league: e.strLeague,
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      time: e.strTime,
    }),
  );
}

function parseCsv(text, cap = MAX_ROWS) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1, cap + 1).map((line) => {
    const cols = split(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h || `col${i}`] = cols[i] || '';
    });
    return flattenRow(obj, {
      title: obj.name || obj.Symbol || obj.symbol || obj.title || cols[0] || '',
      date: obj.Date || obj.date || obj.Time || '',
    });
  });
}

function parseRssOrXml(text) {
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(text))) {
    const block = m[1];
    const tag = (name) => {
      const r = new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${name}>`, 'i');
      const hit = r.exec(block);
      return hit ? (hit[1] || hit[2] || '').trim() : '';
    };
    const href = /<link>([^<]+)<\/link>/i.exec(block)?.[1]?.trim()
      || /href="([^"]+)"/i.exec(block)?.[1]
      || '';
    items.push(
      flattenRow({
        date: tag('pubDate') || tag('updated') || tag('date'),
        title: tag('title'),
        source_url: href,
        summary: tag('description').replace(/<[^>]+>/g, '').slice(0, 400),
      }),
    );
    if (items.length >= MAX_ROWS) break;
  }
  if (items.length) return items;
  const sdn = [];
  const entryRe = /<sdnEntry\b[^>]*>([\s\S]*?)<\/sdnEntry>/gi;
  while ((m = entryRe.exec(text))) {
    const block = m[1];
    const last = /<lastName>([^<]*)<\/lastName>/i.exec(block)?.[1] || '';
    const first = /<firstName>([^<]*)<\/firstName>/i.exec(block)?.[1] || '';
    const uid = /<uid>([^<]*)<\/uid>/i.exec(block)?.[1] || '';
    const sdnType = /<sdnType>([^<]*)<\/sdnType>/i.exec(block)?.[1] || '';
    sdn.push(
      flattenRow({
        title: [last, first].filter(Boolean).join(', ') || uid,
        uid,
        sdnType,
        source_url: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML',
      }),
    );
    if (sdn.length >= MAX_ROWS) break;
  }
  return sdn;
}

function rowsFromPayload(raw, contentType, url) {
  const ct = (contentType || '').toLowerCase();
  const text = typeof raw === 'string' ? raw : '';
  if (
    ct.includes('xml') ||
    ct.includes('rss') ||
    ct.includes('atom') ||
    text.trimStart().startsWith('<')
  ) {
    return parseRssOrXml(text);
  }
  if (ct.includes('csv') || (url && /\.csv(\?|$)/i.test(url) && !text.trimStart().startsWith('{'))) {
    try {
      JSON.parse(text);
    } catch {
      return parseCsv(text);
    }
  }
  let json;
  try {
    json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    if (text.includes('<item')) return parseRssOrXml(text);
    if (text.includes(',')) return parseCsv(text);
    return [];
  }
  if (isGdelt(url) || json?.articles) return gdeltRows(json);
  if (Array.isArray(json) && json[0] && typeof json[0] === 'object' && 'page' in json[0] && Array.isArray(json[1])) {
    return worldBankRows(json);
  }
  if (json?.results?.bindings) return wikidataRows(json);
  if (Array.isArray(json?.data) && json.data[0]?.fields) return reliefwebRows(json);
  if (Array.isArray(json?.states) && url.includes('opensky')) return openskyRows(json);
  if (json?.events && /espn\.com/i.test(url)) return espnRows(json);
  if ((json?.events || json?.event) && /thesportsdb/i.test(url)) return sportsDbRows(json);
  if (Array.isArray(json) && json[0]?.icao24 && json[0]?.callsign !== undefined) {
    return json.slice(0, MAX_ROWS).map((r) => flattenRow(r, { title: r.callsign || r.icao24 }));
  }
  if (Array.isArray(json) && json[0]?.question && json[0]?.probability != null) {
    return json.slice(0, MAX_ROWS).map((r) =>
      flattenRow(r, { title: r.question, source_url: r.url, date: r.closeTime || r.createdTime }),
    );
  }
  const arr = findArray(json);
  return arr.slice(0, MAX_ROWS).map((item) => {
    if (item && typeof item === 'object' && item.show && item.name) {
      return flattenRow({
        date: item.airdate,
        title: `${item.show.name}: ${item.name}`,
        source_url: item.show.officialSite || item.show.url || '',
        network: item.show.network?.name || item.show.webChannel?.name || '',
        airtime: item.airtime,
      });
    }
    if (item && item.OBJECT_NAME) return flattenRow(item, { title: item.OBJECT_NAME });
    return flattenRow(item);
  });
}

async function fetchText(url) {
  if (!isHttpsUrl(url)) {
    throw new Error('HTTPS only');
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        Accept: 'application/json, application/xml, application/rss+xml, text/csv, text/plain, */*',
        'User-Agent': USER_AGENT,
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error('response too large');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    return { text: buf.toString('utf8'), contentType: ct, finalUrl: res.url || url };
  } finally {
    clearTimeout(t);
  }
}

function datasetFile(dataset) {
  if (!dataset) return null;
  const { datasetToFile } = loadCache();
  const key = dataset.trim();
  if (datasetToFile[key]) return path.join(EMBEDDED_DIR, datasetToFile[key]);
  const noCsv = key.replace(/\.csv$/i, '');
  if (datasetToFile[noCsv]) return path.join(EMBEDDED_DIR, datasetToFile[noCsv]);
  const guess = path.join(EMBEDDED_DIR, `${noCsv}.json`);
  if (fs.existsSync(guess)) return guess;
  return null;
}

function loadEmbedded(dataset) {
  const file = datasetFile(dataset);
  if (!file || !fs.existsSync(file)) return null;
  if (embeddedCache.has(file)) return embeddedCache.get(file);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = Array.isArray(json) ? json.map((r) => flattenRow(r)) : rowsFromPayload(json, 'application/json', '');
  embeddedCache.set(file, rows);
  return rows;
}

function loadAlliancesPack() {
  const candidates = [
    path.join(APP_ROOT, 'src', 'data', 'alliances.json'),
    path.join(REPO_ROOT, 'niyantran-react', 'src', 'data', 'alliances.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    if (embeddedCache.has(file)) return embeddedCache.get(file);
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    embeddedCache.set(file, pack);
    return pack;
  }
  return null;
}

function loadJsonPack(name) {
  const candidates = [
    path.join(APP_ROOT, 'src', 'data', name),
    path.join(REPO_ROOT, 'niyantran-react', 'src', 'data', name),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    if (embeddedCache.has(file)) return embeddedCache.get(file);
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    embeddedCache.set(file, pack);
    return pack;
  }
  return null;
}

function loadSanctionsPack() {
  return loadJsonPack('sanctions.json');
}

function loadGlobalAidPack() {
  return loadJsonPack('global-aid.json');
}

function loadGeoConflictsPack() {
  const candidates = [
    path.join(APP_ROOT, 'src', 'data', 'geo-conflicts.json'),
    path.join(REPO_ROOT, 'niyantran-react', 'src', 'data', 'geo-conflicts.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    if (embeddedCache.has(file)) return embeddedCache.get(file);
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    embeddedCache.set(file, pack);
    return pack;
  }
  return null;
}

function geoConflictRows(pack) {
  return (pack?.conflicts || [])
    .filter((c) => c && c.id && c.name && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon)))
    .map((c) => {
      const sources = (c.sources || []).filter((s) => Array.isArray(s) && String(s[0] || '').trim() && /^https?:\/\//i.test(String(s[1] || '')));
      const actors = (c.actors || []).filter((x) => String(x || '').trim());
      const row = {
        id: c.id,
        name: c.name,
        title: c.name,
        conflict_name: c.name,
        region: c.region || '',
        status: c.status || '',
        current_stage: c.status || '',
        intensity: c.intensity,
        since: c.since || '',
        started: c.since || '',
        date: c.since || '',
        fatalitiesEst: c.fatalitiesEst || '',
        displaced: c.displaced || '',
        latest: c.latest || '',
        latest_development: c.latest || '',
        actors: actors.join(' · '),
        supporters: (c.supporters || []).filter((x) => String(x || '').trim()).join(' · '),
        equipment: (c.equipment || []).filter((x) => String(x || '').trim()).join(' · '),
        lat: Number(c.lat),
        lon: Number(c.lon),
        source_url: sources[0]?.[1] || '',
        sources_json: JSON.stringify(sources),
      };
      sources.forEach((s, i) => {
        row[`source_${i + 1}`] = s[0];
        row[`source_${i + 1}_url`] = s[1];
      });
      return row;
    });
}

function dossierLinks(rows) {
  const urls = [];
  for (const row of rows) {
    for (let i = 1; i <= 6; i++) {
      const u = row[`source_${i}_url`];
      if (u && isHttpsUrl(u) && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}

function sourceLinks(entry, feature) {
  const urls = new Set();
  for (const u of String(entry?.primaryFeedUrl || '').split(/\s+/)) {
    if (isHttpsUrl(u)) urls.add(u);
  }
  for (const u of String(entry?.sourceUrls || '').split(/\n/)) {
    const t = u.trim();
    if (isHttpsUrl(t)) urls.add(t);
  }
  if (feature?.source && isHttpsUrl(feature.source.split(/\s/)[0])) urls.add(feature.source.split(/\s/)[0]);
  if (entry?.openLiveFallback && isHttpsUrl(entry.openLiveFallback)) urls.add(entry.openLiveFallback);
  return [...urls];
}

function envelope({ tier, feature, rows, adapter, links, coverage, fallback, note, gdelt, kind, timeline, meta }) {
  return {
    ok: true,
    tier,
    feature: feature.htmlFeature || feature,
    rows,
    source: {
      adapter,
      links,
      note: note || '',
      gdelt: Boolean(gdelt),
      kind: kind || '',
    },
    coverage: {
      from: coverage?.from || entryCoverage(feature).from,
      through: coverage?.through || entryCoverage(feature).through,
      exhaustive: Boolean(coverage?.exhaustive),
    },
    fallback: Boolean(fallback),
    timeline: Array.isArray(timeline) ? timeline : [],
    meta: meta || null,
  };
}

function entryCoverage(featureOrEntry) {
  return {
    from: featureOrEntry?.coverageFrom || '',
    through: featureOrEntry?.coverageThrough || '',
    exhaustive: Boolean(featureOrEntry?.exhaustive),
  };
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function shortFail(error) {
  const raw = String(error || '').trim();
  if (!raw) return 'live feed unavailable';
  const s = raw.replace(/^[a-z0-9.-]+:\s*/i, '');
  if (/abort/i.test(s)) return 'timed out';
  if (/HTTP 401|HTTP 403/i.test(s)) return 'source refused the request';
  if (/HTTP 404/i.test(s)) return 'source endpoint not found';
  if (/HTTP /i.test(s)) return `source returned ${s.match(/HTTP \d+/)?.[0] || 'an error'}`;
  if (/empty/i.test(s)) return 'source returned no rows';
  if (/fetch failed|ECONN|ENOTFOUND|certificate|network/i.test(s)) return 'host did not respond';
  if (/^https?:/i.test(raw) || /[\?&=]/.test(raw) || raw.length > 140) return 'live feed unavailable';
  return raw;
}

function statusRow({ adapter, url, reason, featureName }) {
  const scrape = STATUS_ADAPTERS.has(adapter || '');
  const host = scrape ? '' : hostOf(url);
  const title = scrape ? 'Extraction not scheduled' : 'Live source unavailable';
  const detail = scrape
    ? 'This adapter is listed in the source map, but table extraction is not scheduled. No records were invented to fill this table.'
    : host
      ? `${host} did not return rows and there is no last-known-good archive for this module. No records were invented.`
      : 'No live rows and no last-known-good archive were available. No records were invented.';
  return [
    flattenRow({
      date: new Date().toISOString().slice(0, 10),
      title,
      source_url: '',
      status: 'source_status',
      adapter: adapter || '',
      feature: featureName || '',
      host: host || '',
      detail,
      fail_reason: shortFail(reason),
    }),
  ];
}

function matchFeature(tier, featureName) {
  const { features, registry } = loadCache();
  const t = resolveTier(tier);
  const n = norm(featureName);
  const list = t === 'home' ? features : features.filter((f) => f.htmlTier === t);
  let feat =
    list.find((f) => norm(f.htmlFeature) === n) ||
    features.find((f) => norm(f.htmlFeature) === n);
  if (!feat) {
    feat = list.find((f) => norm(f.workbookFunctions) === n);
  }
  if (!feat && n) {
    feat = list.find((f) => norm(f.htmlFeature).includes(n) || n.includes(norm(f.htmlFeature)));
  }
  const entries = (feat?.registryKeys || [])
    .map((k) => registry.find((r) => r.key === k))
    .filter(Boolean);
  if (!entries.length && feat) {
    const byName = registry.find(
      (r) => r.htmlTier === (feat.htmlTier || t) && norm(r.htmlFeature) === norm(feat.htmlFeature),
    );
    if (byName) entries.push(byName);
  }
  return { feat, entries, tier: feat?.htmlTier || t };
}

function capRows(rows, isBills) {
  if (isBills) return rows;
  return rows.slice(0, MAX_ROWS);
}

function labelledGdelt(rows, url) {
  if (!isGdelt(url)) return { rows, gdelt: false };
  return {
    gdelt: true,
    rows: rows.map((r) => ({
      ...r,
      reporting_search: r.reporting_search || 'GDELT DOC 2.0 — news reporting search, not an official dataset',
    })),
  };
}

async function tryUrls(urls) {
  const errors = [];
  for (const url of urls) {
    if (!url || !isHttpsUrl(url)) continue;
    try {
      const got = await fetchText(url);
      const rows = rowsFromPayload(got.text, got.contentType, got.finalUrl);
      if (rows.length) return { rows, url: got.finalUrl, error: null };
      errors.push(`${hostOf(url) || 'source'}: empty`);
    } catch (err) {
      errors.push(`${hostOf(url) || 'source'}: ${err.message || err}`);
    }
  }
  return { rows: [], url: urls[0] || '', error: errors.join(' | ') };
}

function mergeBills(archive, live) {
  const seen = new Set();
  const out = [];
  const keyOf = (r) => norm(r.bill_name || r.billName || r.title) + '|' + (r.date_introduced || r.date || '');
  for (const r of [...live, ...archive]) {
    const k = keyOf(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

async function serveHome(featureName) {
  const n = norm(featureName);
  if (n === 'markets' || n === 'briefing' || n === '') {
    const nse = await tryUrls([NSE_INDICES]);
    if (nse.rows.length) {
      const nifty = nse.rows.filter((r) => /nifty 50|sensex|nifty bank/i.test(r.title || r.indexName || r.name || ''));
      return envelope({
        tier: 'home',
        feature: { htmlFeature: 'Markets' },
        rows: (nifty.length ? nifty : nse.rows).slice(0, 40),
        adapter: 'api',
        links: [NSE_INDICES],
        coverage: { from: '', through: 'present', exhaustive: false },
        fallback: false,
        note: 'NSE index snapshot via proxy.',
      });
    }
    const quotes = [];
    for (const [name, url] of HOME_STOOQ) {
      const got = await tryUrls([url]);
      if (got.rows.length) {
        quotes.push(
          flattenRow({
            ...got.rows[0],
            title: name,
            name,
            source_url: url,
          }),
        );
      }
    }
    if (quotes.length) {
      return envelope({
        tier: 'home',
        feature: { htmlFeature: 'Markets' },
        rows: quotes,
        adapter: 'api',
        links: HOME_STOOQ.map((x) => x[1]),
        coverage: { from: '', through: 'present', exhaustive: false },
        fallback: false,
        note: 'Stooq last quotes via proxy.',
      });
    }
    const archive = loadEmbedded('finance_market_feed.csv') || [];
    return envelope({
      tier: 'home',
      feature: { htmlFeature: 'Markets' },
      rows: archive.length ? archive.slice(0, 40) : statusRow({ adapter: 'api', url: NSE_INDICES, reason: 'live market feed failed; no archive rows parsed', featureName: 'Markets' }),
      adapter: 'embedded',
      links: [NSE_INDICES, ...HOME_STOOQ.map((x) => x[1])],
      coverage: { from: '', through: 'archive', exhaustive: false },
      fallback: true,
      note: archive.length
        ? 'Live NSE/Stooq did not return quotes. Showing last-known-good index snapshot from the local archive.'
        : 'Live market endpoints failed and no archive was available.',
    });
  }
  if (n === 'top stories' || n === 'stories') {
    const got = await tryUrls([HOME_GDELT]);
    const labelled = labelledGdelt(got.rows, HOME_GDELT);
    return envelope({
      tier: 'home',
      feature: { htmlFeature: 'Top Stories' },
      rows: labelled.rows.length
        ? labelled.rows
        : statusRow({ adapter: 'news-search', url: HOME_GDELT, reason: 'GDELT India 7-day search unavailable', featureName: 'Top Stories' }),
      adapter: 'news-search',
      links: [HOME_GDELT],
      coverage: { from: '', through: '7d', exhaustive: false },
      fallback: !labelled.rows.length,
      gdelt: true,
      note: 'GDELT DOC 2.0 reporting search for India, last 7 days — not an official dataset.',
    });
  }
  return null;
}

export async function serveFeatureFeed(searchParams) {
  loadCache();
  const tierIn = searchParams.get('tier') || '';
  const featureIn = searchParams.get('feature') || '';
  const resolvedTier = resolveTier(tierIn);

  if (resolvedTier === 'home') {
    const home = await serveHome(featureIn || 'markets');
    if (home) return home;
    return {
      ok: false,
      tier: 'home',
      feature: featureIn,
      rows: statusRow({ adapter: 'internal', url: '', reason: 'unknown home feature', featureName: featureIn }),
      source: { adapter: 'internal', links: [], note: 'Home supports Markets and Top Stories.' },
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
    };
  }

  const { feat, entries, tier } = matchFeature(tierIn, featureIn);
  if (!feat) {
    return {
      ok: false,
      tier: resolvedTier,
      feature: featureIn,
      rows: statusRow({ adapter: '', url: '', reason: 'unknown feature', featureName: featureIn }),
      source: { adapter: '', links: [], note: 'No matching HTML FEATURE MAP row.' },
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
    };
  }

  const entry = entries[0] || null;
  const adapter = (entry?.adapter || feat.adapters || '').split(/[|,]/)[0].trim().toLowerCase();
  const links = sourceLinks(entry, feat);
  const dataset = entry?.dataset || feat.dataset || '';
  const isBills = adapter === 'bill-history' || /bill passage/i.test(feat.htmlFeature);
  const coverage = {
    from: entry?.coverageFrom || '',
    through: entry?.coverageThrough || '',
    exhaustive: Boolean(entry?.exhaustive) && isBills,
  };
  const primary = entry?.primaryFeedUrl || (isHttpsUrl(feat.source) ? feat.source : '');
  const gdeltFallback = entry?.openLiveFallback || '';

  // Strategic Assets — Infra: curated public project register, not World Bank/GDELT.
  if (/^infra$/i.test(feat.htmlFeature || '') || dataset === 'geopolitics_infra_projects.csv') {
    const pack = loadJsonPack('infra-projects.json');
    const rows = (pack?.projects || []).map(flattenInfra);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML strategic infrastructure register. Live World Bank projects are served at /api/wb-projects.',
        meta: { asOf: pack.asOf },
      });
    }
  }

  // Strategic Assets — Nuclear Watch: public-source facility register, not GDELT.
  if (/^nuclear watch$/i.test(feat.htmlFeature || '')) {
    const pack = loadJsonPack('nuclear-watch.json');
    const rows = (pack?.facilities || []).map(flattenNuclear);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML nuclear facility register. FAS/SIPRI arsenal estimates are attached as a live overlay, not a live count.',
        meta: { asOf: pack.asOf, strip: pack.strip || {}, arsenal: pack.arsenal || [] },
      });
    }
  }

  // Strategic Assets — Maritime Choke-Points: HTML NIY_GEO_CHOKEPOINTS register, not GDELT.
  if (/^maritime choke-?points$/i.test(feat.htmlFeature || '') || dataset === 'geo_chokepoints') {
    const pack = loadJsonPack('chokepoints.json');
    const rows = (pack?.points || []).map(flattenChokepoint);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML maritime chokepoint register. Live IMF PortWatch transits are served at /api/portwatch.',
        meta: { asOf: pack.asOf, stats: pack.stats || {} },
      });
    }
  }

  // Strategic Assets — Satellite Infrastructure: live Space Devs upcoming launches. No curated constellation dossier.
  if (/^satellite infrastructure$/i.test(feat.htmlFeature || '')) {
    try {
      const live = await loadLaunches();
      if (live.rows?.length) {
        return envelope({
          tier,
          feature: feat,
          rows: live.rows,
          adapter: 'live',
          links: ['https://ll.thespacedevs.com/'],
          coverage: { from: '', through: '', exhaustive: false },
          fallback: false,
          kind: 'dossier',
          note: 'The Space Devs upcoming launches. CelesTrak last-30-days is served at /api/celestrak.',
          meta: { source: live.source },
        });
      }
    } catch (err) {
      return envelope({
        tier,
        feature: feat,
        rows: statusRow({
          adapter: 'api',
          url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/',
          reason: err.message || String(err),
          featureName: feat.htmlFeature,
        }),
        adapter: 'api',
        links: ['https://ll.thespacedevs.com/'],
        coverage: { from: '', through: '', exhaustive: false },
        fallback: false,
        note: 'The Space Devs launch library did not return rows. No constellation records were invented.',
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'api',
        url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/',
        reason: 'empty launch roster',
        featureName: feat.htmlFeature,
      }),
      adapter: 'api',
      links: ['https://ll.thespacedevs.com/'],
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
      note: 'The Space Devs launch library returned no upcoming launches. No constellation records were invented.',
    });
  }

  // Global Resources — World Constitutions: Constitute Project in-force list (not Wikidata/GDELT).
  if (/^world constitutions$/i.test(feat.htmlFeature || '')) {
    try {
      const live = await loadConstitutions();
      if (live.rows?.length) {
        return envelope({
          tier,
          feature: feat,
          rows: live.rows,
          adapter: 'live',
          links: ['https://www.constituteproject.org/'],
          coverage: { from: '', through: '', exhaustive: false },
          fallback: false,
          note: 'Constitute Project constitutions currently in force. Cached up to 7 days.',
          meta: {
            section: 'CONSTITUTIONS IN FORCE — CONSTITUTE PROJECT',
            status: 'LIVE · CONSTITUTE PROJECT · CACHED 7D',
            note: `${live.rows.length} constitutions currently in force`,
          },
        });
      }
    } catch (err) {
      return envelope({
        tier,
        feature: feat,
        rows: statusRow({
          adapter: 'api',
          url: 'https://www.constituteproject.org/service/constitutions?lang=en',
          reason: err.message || String(err),
          featureName: feat.htmlFeature,
        }),
        adapter: 'api',
        links: ['https://www.constituteproject.org/'],
        coverage: { from: '', through: '', exhaustive: false },
        fallback: false,
        note: 'Constitute Project did not return rows. No constitution records were invented.',
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'api',
        url: 'https://www.constituteproject.org/service/constitutions?lang=en',
        reason: 'empty constitution list',
        featureName: feat.htmlFeature,
      }),
      adapter: 'api',
      links: ['https://www.constituteproject.org/'],
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
      note: 'Constitute Project returned no in-force constitutions. No records were invented.',
    });
  }

  // Global Resources — Growth Indicators: World Bank GDP / CPI / unemployment for the HTML country set.
  if (/^growth indicators$/i.test(feat.htmlFeature || '')) {
    try {
      const live = await loadGrowth();
      if (live.rows?.length) {
        return envelope({
          tier,
          feature: feat,
          rows: live.rows,
          adapter: 'live',
          links: ['https://data.worldbank.org/'],
          coverage: { from: '', through: '', exhaustive: false },
          fallback: false,
          note: 'World Bank open data — GDP growth, inflation and unemployment. Cached up to 24 hours.',
          meta: {
            section: 'GROWTH MONITOR — WORLD BANK OPEN DATA',
            status: 'LIVE · WORLD BANK · CACHED 24H',
            note: `${live.rows.length} economies · most recent published year`,
          },
        });
      }
    } catch (err) {
      return envelope({
        tier,
        feature: feat,
        rows: statusRow({
          adapter: 'api',
          url: 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG',
          reason: err.message || String(err),
          featureName: feat.htmlFeature,
        }),
        adapter: 'api',
        links: ['https://data.worldbank.org/'],
        coverage: { from: '', through: '', exhaustive: false },
        fallback: false,
        note: 'World Bank open-data API did not return rows. No growth figures were invented.',
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'api',
        url: 'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.KD.ZG',
        reason: 'empty growth table',
        featureName: feat.htmlFeature,
      }),
      adapter: 'api',
      links: ['https://data.worldbank.org/'],
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
      note: 'World Bank returned no indicator rows. No growth figures were invented.',
    });
  }

  // Global Resources — Heads of State: original HTML leader dossier (44 profiles), not Wikidata/GDELT.
  if (/^heads of state$/i.test(feat.htmlFeature || '') || dataset === 'geo_leaders') {
    const pack = loadJsonPack('leaders.json');
    const rows = (pack?.leaders || []).map(flattenLeader).filter((r) => r.name);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: ['https://www.wikidata.org/', 'https://www.cia.gov/the-world-factbook/'],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML world-leaders register. As-of the pack date; not a live Wikidata table.',
        meta: {
          asOf: pack.asOf,
          stats: pack.stats,
        },
      });
    }
  }

  // Global Resources — Global Commodities: original HTML benchmark board (Pink Sheet is XLSX).
  if (/^global commodities$/i.test(feat.htmlFeature || '') || dataset === 'geo_commodities') {
    const pack = loadJsonPack('commodities.json');
    const rows = commoditiesFromPack(pack);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [
          'https://tradingeconomics.com/commodities',
          'https://www.cmegroup.com/',
          'https://www.worldbank.org/en/research/commodity-markets',
        ],
        coverage: { from: pack.meta?.asOf || '', through: pack.meta?.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: pack.meta?.note || 'Original HTML commodity benchmark board. Levels are as-of the pack date, not a live ticker.',
        meta: {
          section: 'GLOBAL COMMODITIES',
          status: `AS OF ${String(pack.meta?.asOf || '').toUpperCase()} · ${pack.stats?.tracked || rows.length} BENCHMARKS`,
          note: pack.meta?.note || '',
          asOf: pack.meta?.asOf,
          stats: pack.stats,
          groups: pack.groups || [],
        },
      });
    }
  }

  // Global Resources — Geopolitics News Wire: GDELT topic search from the HTML live layer.
  if (/^geopolitics news wire$/i.test(feat.htmlFeature || '') || dataset === 'geo_news_wire.csv') {
    const nws =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent('(geopolitics OR "foreign policy" OR diplomacy OR "United Nations")') +
      '&mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=40';
    const got = await tryUrls([nws]);
    const labelled = labelledGdelt(got.rows, nws);
    if (labelled.rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows: capRows(labelled.rows, false),
        adapter: 'news-search',
        links: [nws],
        coverage: { from: '', through: '7d', exhaustive: false },
        fallback: false,
        gdelt: true,
        note: 'GDELT DOC 2.0 reporting search — not an official government dataset.',
        meta: {
          section: 'TOP WORLD STORIES — GDELT 2.0',
          status: 'GDELT 2.0 · 7-DAY WINDOW',
          note: `${labelled.rows.length} articles · reporting search, not an official feed`,
        },
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'news-search',
        url: nws,
        reason: got.error || 'empty GDELT wire',
        featureName: feat.htmlFeature,
      }),
      adapter: 'news-search',
      links: [nws],
      coverage: { from: '', through: '7d', exhaustive: false },
      fallback: false,
      gdelt: true,
      note: 'GDELT DOC 2.0 reporting search did not return rows. No stories were invented.',
    });
  }

  // Geonomics — Global Trade: World Bank merchandise exports + trade/GDP for the HTML country set.
  if (/^global trade$/i.test(feat.htmlFeature || '')) {
    try {
      const live = await loadTrade();
      if (live.rows?.length) {
        return envelope({
          tier,
          feature: feat,
          rows: live.rows,
          adapter: 'live',
          links: ['https://data.worldbank.org/indicator/TX.VAL.MRCH.CD.WT'],
          coverage: { from: '', through: '', exhaustive: false },
          fallback: false,
          note: 'World Bank open data — merchandise exports and trade as a share of GDP. Cached up to 24 hours.',
          meta: {
            section: 'TRADE MONITOR — WORLD BANK OPEN DATA',
            status: 'LIVE · WORLD BANK · CACHED 24H',
            note: `${live.rows.length} economies · most recent published year`,
          },
        });
      }
    } catch (err) {
      return envelope({
        tier,
        feature: feat,
        rows: statusRow({
          adapter: 'api',
          url: 'https://api.worldbank.org/v2/country/all/indicator/TX.VAL.MRCH.CD.WT',
          reason: err.message || String(err),
          featureName: feat.htmlFeature,
        }),
        adapter: 'api',
        links: ['https://data.worldbank.org/'],
        coverage: { from: '', through: '', exhaustive: false },
        fallback: false,
        note: 'World Bank open-data API did not return rows. No trade figures were invented.',
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'api',
        url: 'https://api.worldbank.org/v2/country/all/indicator/TX.VAL.MRCH.CD.WT',
        reason: 'empty trade table',
        featureName: feat.htmlFeature,
      }),
      adapter: 'api',
      links: ['https://data.worldbank.org/'],
      coverage: { from: '', through: '', exhaustive: false },
      fallback: false,
      note: 'World Bank returned no trade rows. No figures were invented.',
    });
  }

  // Geonomics — Critical Minerals: curated USGS-basis register from the HTML live layer.
  if (/^critical minerals$/i.test(feat.htmlFeature || '')) {
    const pack = loadJsonPack('critical-minerals.json');
    const rows = (pack?.minerals || []).map(flattenMineralRef);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: ['https://www.usgs.gov/centers/national-minerals-information-center'],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        note: 'Curated supply-concentration register on a USGS Mineral Commodity Summaries basis. Not a live mine-output feed.',
        meta: {
          section: 'SUPPLY CONCENTRATION — CURATED REFERENCE',
          status: `CURATED · USGS MINERAL COMMODITY SUMMARIES BASIS · AS OF ${pack.asOf || '2025'}`,
          asOf: pack.asOf,
        },
      });
    }
  }

  // Geonomics — Energy: original HTML energy & critical minerals dossier (not GDELT, not Yahoo OHLC).
  if (/^energy$/i.test(feat.htmlFeature || '') || dataset === 'geo_energy') {
    const pack = loadJsonPack('energy.json');
    const rows = (pack?.minerals || []).map(flattenEnergyMineral);
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: ['https://www.usgs.gov/', 'https://www.eia.gov/', 'https://www.iea.org/topics/critical-minerals'],
        coverage: { from: pack.meta?.asOf || '', through: pack.meta?.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: pack.stats?.note || 'Original HTML energy and critical-minerals register. Levels are as-of the pack date.',
        meta: {
          asOf: pack.meta?.asOf,
          stats: pack.stats,
          commodities: pack.commodities || [],
        },
      });
    }
  }

  // Diplomacy Sanctions: programme register + live OpenSanctions via /api/opensanctions.
  if (/^sanctions$/i.test(feat.htmlFeature || '')) {
    const pack = loadSanctionsPack();
    const rows = (pack?.programs || []).map((p) => flattenSanction(p));
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: pack.asOf || '', through: pack.asOf || '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML sanctions programme register. Live OpenSanctions lists are served at /api/opensanctions.',
        timeline: pack.timeline || [],
        meta: { asOf: pack.asOf, stats: pack.stats, byTarget: pack.byTarget },
      });
    }
  }

  // Diplomacy Global Aid: appeal register + live OCHA FTS via /api/fts.
  if (/^global aid$/i.test(feat.htmlFeature || '')) {
    const pack = loadGlobalAidPack();
    const rows = (pack?.appeals || []).map((p) => flattenAppeal(p));
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: '', through: '', exhaustive: false },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML global aid appeal register. Live OCHA FTS is served at /api/fts.',
        meta: { wire: pack.wire || [] },
      });
    }
  }

  // Diplomacy Alliances: original HTML workbench register, not GDELT.
  if (/^alliances$/i.test(feat.htmlFeature || '')) {
    const pack = loadAlliancesPack();
    const rows = (pack?.alliances || []).map((p) => flattenAlliance(p, pack.memberFlags || {}));
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: [...new Set(rows.map((r) => r.source_url).filter(Boolean))],
        coverage: { from: pack.verified || '', through: pack.verified || '', exhaustive: true },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML alliance and bloc register. Source-linked dossiers, not GDELT.',
        meta: { verified: pack.verified, memberFlags: pack.memberFlags || {} },
      });
    }
  }

  // Conflicts Global monitor: original HTML dossier (NIY_GEO_CONFLICTS), not ReliefWeb/GDELT.
  if (dataset === 'geo_conflicts' || /^conflicts$/i.test(feat.htmlFeature || '')) {
    const pack = loadGeoConflictsPack();
    const rows = pack ? geoConflictRows(pack) : [];
    if (rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'embedded',
        links: dossierLinks(rows),
        coverage: {
          from: pack.meta?.asOf || '',
          through: pack.meta?.asOf || '',
          exhaustive: false,
        },
        fallback: false,
        kind: 'dossier',
        note: 'Original HTML Global monitor (NIY_GEO_CONFLICTS). Per-theatre dossier sources, not ReliefWeb or GDELT.',
        timeline: pack.timeline || [],
        meta: pack.meta || null,
      });
    }
  }

  const archive = loadEmbedded(dataset);

  if (tier === 'national') {
    const nat = await serveNational({
      feat,
      dataset,
      adapter,
      primary,
      gdeltFallback,
      links,
      coverage,
      loadEmbedded,
      tryUrls,
      capRows,
      envelope,
      statusRow,
      labelledGdelt,
    });
    if (nat) return nat;
  }

  // Wave C: scrape / licensed / download-or-html / internal / unmapped — no live table.
  if (!entry || STATUS_ADAPTERS.has(adapter) || !LIVE_ADAPTERS.has(adapter)) {
    if (archive && archive.length) {
      return envelope({
        tier,
        feature: feat,
        rows: capRows(archive, isBills),
        adapter: adapter || 'unmapped',
        links,
        coverage,
        fallback: true,
        note: `${adapter || 'unmapped'} adapter: live extraction is not scheduled. Showing last-known-good archive only.`,
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: adapter || 'unmapped',
        url: primary || links[0] || '',
        reason: 'extraction not scheduled',
        featureName: feat.htmlFeature,
      }),
      adapter: adapter || 'unmapped',
      links,
      coverage,
      fallback: false,
      note: 'Live extraction is not scheduled for this adapter. No records were invented.',
    });
  }

  // Bill Passage: never use GDELT as a bill table. Merge live Sansad into exhaustive archive.
  if (adapter === 'bill-history') {
    const live = primary ? await tryUrls([primary]) : { rows: [] };
    if (archive && archive.length) {
      const rows = live.rows.length ? mergeBills(archive, live.rows) : archive;
      return envelope({
        tier,
        feature: feat,
        rows,
        adapter: 'bill-history',
        links,
        coverage: { from: '1952-01-01', through: 'present', exhaustive: true },
        fallback: !live.rows.length,
        note: live.rows.length
          ? 'Sansad live page merged into the 1952–present local archive (Sansad 1952–2016 + PRS 2017–present).'
          : 'Sansad live feed failed. Showing the 4,576-row last-known-good archive. Exhaustive coverage is the archive, not a news search.',
        meta: {
          section: 'BILL PASSAGE INDEX',
          status: live.rows.length ? 'LIVE · SANSAD MERGED INTO ARCHIVE' : 'ARCHIVE · 4,576 BILLS · 1952–PRESENT',
          heading: 'BILL PASSAGE INDEX',
        },
      });
    }
    if (live.rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows: live.rows,
        adapter: 'bill-history',
        links,
        coverage: { from: '', through: 'present', exhaustive: false },
        fallback: false,
        note: 'Sansad live page only — local exhaustive archive was not found on disk.',
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'bill-history',
        url: primary,
        reason: 'Sansad live feed failed and no local archive was found',
        featureName: feat.htmlFeature,
      }),
      adapter: 'bill-history',
      links,
      coverage,
      fallback: false,
    });
  }

  const format = (entry?.format || '').toUpperCase();
  const skipBinary = format === 'XLSX' || format === 'XLS';
  const liveUrls = [];
  // GDELT is a news search, not the HTML table. Do not treat it as the primary live feed
  // when the original embedded dataset exists.
  if (primary && !skipBinary && !isGdelt(primary)) liveUrls.push(primary);
  const allowGdelt =
    adapter === 'news-search' ||
    (gdeltFallback && isGdelt(gdeltFallback) && (adapter === 'api' || adapter === 'source-library' || adapter === 'embedded'));

  const live = liveUrls.length ? await tryUrls(liveUrls) : { rows: [] };
  if (live.rows.length) {
    const labelled = labelledGdelt(live.rows, live.url);
    return envelope({
      tier,
      feature: feat,
      rows: capRows(labelled.rows, false),
      adapter,
      links,
      coverage,
      fallback: false,
      gdelt: labelled.gdelt,
      note: labelled.gdelt
        ? 'GDELT DOC 2.0 reporting search — not an official government or exchange dataset.'
        : `Live ${adapter} feed.`,
    });
  }

  if (archive && archive.length) {
    return envelope({
      tier,
      feature: feat,
      rows: capRows(archive, isBills),
      adapter: adapter === 'news-search' ? 'embedded' : adapter,
      links,
      coverage,
      fallback: Boolean(liveUrls.length),
      note: live.error
        ? `Live feed failed (${live.error}). Showing the original HTML dataset.`
        : 'Original HTML dataset.',
    });
  }

  if (allowGdelt && (gdeltFallback || isGdelt(primary))) {
    const gdeltUrl = isGdelt(primary) ? primary : gdeltFallback;
    const fb = await tryUrls([gdeltUrl]);
    if (fb.rows.length) {
      const labelled = labelledGdelt(fb.rows, gdeltUrl);
      return envelope({
        tier,
        feature: feat,
        rows: capRows(labelled.rows, false),
        adapter: 'news-search',
        links,
        coverage,
        fallback: true,
        gdelt: true,
        note: 'No HTML dataset for this module. GDELT DOC 2.0 reporting search — not an official dataset.',
      });
    }
  }

  const primaryIsGdelt = isGdelt(primary) || isGdelt(gdeltFallback);
  return envelope({
    tier,
    feature: feat,
    rows: statusRow({
      adapter,
      url: primary || gdeltFallback || links[0] || '',
      reason: shortFail(live.error) || (skipBinary ? 'spreadsheet extraction not scheduled' : 'no live rows and no archive'),
      featureName: feat.htmlFeature,
    }),
    adapter,
    links,
    coverage,
    fallback: false,
    gdelt: primaryIsGdelt,
    note: primaryIsGdelt
      ? 'GDELT DOC 2.0 reporting search is unavailable. Status row only — not an official dataset, and no records were invented.'
      : 'No live rows and no last-known-good archive. Status row only — no records invented.',
  });
}

function isGithubRawCsv(url) {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' && u.hostname === 'raw.githubusercontent.com' && /\.csv$/i.test(u.pathname);
  } catch {
    return false;
  }
}

async function serveCsvTable(searchParams) {
  const url = searchParams.get('url') || '';
  if (!isGithubRawCsv(url)) {
    return { ok: false, error: 'Only raw GitHub CSV URLs are accepted.', rows: [], total: 0 };
  }
  const got = await fetchText(url);
  const all = parseCsv(got.text, 2000);
  const rawLines = got.text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim()).length;
  const total = Math.max(0, rawLines - 1);
  return {
    ok: true,
    url,
    rows: all,
    total,
    truncated: total > all.length,
    note: total > all.length ? `Showing ${all.length} of ${total} rows.` : '',
  };
}

export async function handleFeatureFeedRequest(req, res, next) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  if (url.pathname === '/api/csv-table') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'GET only' }));
      return;
    }
    try {
      const body = await serveCsvTable(url.searchParams);
      const json = JSON.stringify(body);
      res.statusCode = body.ok ? 200 : 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') res.end();
      else res.end(json);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: err.message || String(err), rows: [] }));
    }
    return;
  }
  if (url.pathname !== '/api/feature-feed') {
    next();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'GET only' }));
    return;
  }
  try {
    const body = await serveFeatureFeed(url.searchParams);
    const json = JSON.stringify(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') res.end();
    else res.end(json);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
  }
}

export function featureFeedPlugin() {
  return {
    name: 'niyantran-feature-feed',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleFeatureFeedRequest(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleFeatureFeedRequest(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
  };
}
