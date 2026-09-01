/**
 * Diplomacy live proxies. Keys stay on the server.
 * GET /api/opensanctions — OpenSanctions list catalogue (trimmed)
 * GET /api/fts           — UN OCHA Financial Tracking Service, by plan
 */
const UA = 'Mozilla/5.0 (compatible; NiyantranTerminal/1.0; Diplomacy)';
const OS_URL = 'https://data.opensanctions.org/datasets/latest/index.json';
const OS_SUM = 'https://data.opensanctions.org/datasets/latest/sanctions/index.json';
const FTS_URL = (year) => `https://api.hpc.tools/v1/public/fts/flow?year=${year}&groupby=plan`;

const OS_TTL = 6 * 60 * 60 * 1000;
const FTS_TTL = 60 * 60 * 1000;
const FETCH_MS = 22_000;

let osCache = null;
let osAt = 0;
const ftsCache = new Map();

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function getJson(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_MS);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: 'application/json', 'User-Agent': UA },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function trimLists(index) {
  return (index.datasets || [])
    .filter((d) => d && Array.isArray(d.tags) && d.tags.includes('list.sanction') && !d.deprecated && !d.hidden && d.target_count)
    .sort((a, b) => (b.target_count || 0) - (a.target_count || 0))
    .slice(0, 18)
    .map((d) => ({
      title: d.title,
      publisher: d.publisher?.name || '',
      country: d.publisher?.country_label || '',
      targets: d.target_count,
      updated: String(d.updated_at || '').slice(0, 10),
      url: d.url || '',
    }));
}

async function loadOpenSanctions() {
  if (osCache && Date.now() - osAt < OS_TTL) return osCache;
  const [index, sum] = await Promise.all([
    getJson(OS_URL),
    getJson(OS_SUM).catch(() => null),
  ]);
  osCache = {
    ok: true,
    source: 'opensanctions',
    updated: String(sum?.updated_at || '').slice(0, 10),
    entityCount: Number(sum?.entity_count) || 0,
    targetCount: Number(sum?.target_count) || 0,
    lists: trimLists(index),
  };
  osAt = Date.now();
  return osCache;
}

function parseFts(j, year) {
  const rep = j?.data?.report3 || j?.data?.report1;
  const obj = rep?.fundingTotals?.objects?.[0];
  const total = Number(obj?.singleFundingTotal) || 0;
  const all = (obj?.singleFundingObjects || [])
    .filter((p) => p?.name && p.name !== 'Not specified' && p.totalFunding)
    .sort((a, b) => b.totalFunding - a.totalFunding);
  const plans = all.slice(0, 20).map((p) => ({
    title: p.name,
    funded: p.totalFunding,
    share: total ? p.totalFunding / total : 0,
    source_url: 'https://fts.unocha.org/',
  }));
  return { ok: true, source: 'ocha-fts', year, total, plans, planCount: all.length };
}

async function loadFts(year) {
  const y = String(year || new Date().getFullYear());
  const hit = ftsCache.get(y);
  if (hit && Date.now() - hit.at < FTS_TTL) return hit.body;
  const body = parseFts(await getJson(FTS_URL(y)), y);
  ftsCache.set(y, { at: Date.now(), body });
  return body;
}

export function handleDiplomacyRequest(req, res, next) {
  const host = req.headers.host || 'localhost';
  let url;
  try {
    url = new URL(req.url, `http://${host}`);
  } catch {
    next();
    return;
  }
  const p = url.pathname.replace(/\/$/, '');
  if (p !== '/api/opensanctions' && p !== '/api/fts') {
    next();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, { ok: false, error: 'GET only' }, 405);
    return;
  }
  const run = p === '/api/opensanctions' ? loadOpenSanctions() : loadFts(url.searchParams.get('year'));
  return run
    .then((body) => {
      if (req.method === 'HEAD') {
        res.statusCode = 200;
        res.end();
        return;
      }
      json(res, body);
    })
    .catch((err) => json(res, { ok: false, error: err.message || String(err) }, 502));
}

export function diplomacyApiPlugin() {
  return {
    name: 'niyantran-diplomacy-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleDiplomacyRequest(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleDiplomacyRequest(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
  };
}
