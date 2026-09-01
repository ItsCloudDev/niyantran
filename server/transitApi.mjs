/**
 * Transit live-position proxies. Keys stay on the server.
 * GET /api/air   — OpenSky, then adsb.fi / adsb.lol
 * GET /api/ships — AISStream snapshot (if AISSTREAM_KEY) else Digitraffic (Baltic)
 * GET /api/vessels — same as /api/ships, HTML-compatible vessel list
 */

const UA = 'Mozilla/5.0 (compatible; NiyantranTerminal/1.0; Transit)';
const FETCH_MS = 14_000;
const AIR_TTL = 20_000;
const SHIP_TTL = 55_000;
const VESSEL_META_TTL = 10 * 60_000;

const airCache = new Map();
let shipCache = null;
let vesselMeta = null;
let vesselMetaAt = 0;

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bboxFrom(url) {
  const lamin = num(url.searchParams.get('lamin') ?? url.searchParams.get('latBottom'), -90);
  const lamax = num(url.searchParams.get('lamax') ?? url.searchParams.get('latTop'), 90);
  const lomin = num(url.searchParams.get('lomin') ?? url.searchParams.get('lonLeft'), -180);
  const lomax = num(url.searchParams.get('lomax') ?? url.searchParams.get('lonRight'), 180);
  return { lamin, lamax, lomin, lomax };
}

function inBox(lat, lon, b) {
  return lat >= b.lamin && lat <= b.lamax && lon >= b.lomin && lon <= b.lomax;
}

async function fetchJson(url, extra = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), extra.ms || FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { Accept: 'application/json', 'User-Agent': UA, ...(extra.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function aisCat(t) {
  t = +t || 0;
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t === 30) return 'fishing';
  if (t >= 40 && t <= 49) return 'hsc';
  if (t === 31 || t === 32 || t === 52) return 'tug';
  if (t >= 50 && t <= 59) return 'service';
  return 'other';
}

function openskyAircraft(json) {
  return (json.states || [])
    .map((s) => ({
      icao: s[0],
      flt: String(s[1] || '').trim(),
      country: s[2] || '',
      lon: s[5],
      lat: s[6],
      alt: s[7] != null ? Math.round(s[7]) : s[13] != null ? Math.round(s[13]) : null,
      vel: s[9],
      hdg: s[10] != null ? Math.round(s[10]) : null,
      vrate: s[11],
      cat: s[8] ? 'on ground' : 'airborne',
    }))
    .filter((a) => a.icao && a.lat != null && a.lon != null);
}

function adsbAircraft(json) {
  return (json.ac || json.aircraft || [])
    .map((a) => {
      const altFt = a.alt_baro ?? a.alt_geom;
      const gs = a.gs;
      return {
        icao: a.hex || a.icao,
        flt: String(a.flight || a.r || '').trim(),
        country: a.desc || a.t || '',
        lon: a.lon,
        lat: a.lat,
        alt: altFt != null && altFt !== 'ground' ? Math.round(Number(altFt) * 0.3048) : altFt === 'ground' ? 0 : null,
        vel: gs != null ? gs / 1.944 : null,
        hdg: a.track != null ? Math.round(a.track) : null,
        vrate: a.baro_rate != null ? a.baro_rate * 0.00508 : null,
        cat: a.t || a.category || '',
      };
    })
    .filter((a) => a.icao && a.lat != null && a.lon != null);
}

async function serveAir(b) {
  const key = `${b.lamin.toFixed(2)}:${b.lamax.toFixed(2)}:${b.lomin.toFixed(2)}:${b.lomax.toFixed(2)}`;
  const hit = airCache.get(key);
  if (hit && Date.now() - hit.at < AIR_TTL) return hit.body;

  const errors = [];
  const sky = `https://opensky-network.org/api/states/all?lamin=${b.lamin}&lamax=${b.lamax}&lomin=${b.lomin}&lomax=${b.lomax}`;
  try {
    const data = await fetchJson(sky);
    const body = { aircraft: openskyAircraft(data), source: 'opensky' };
    airCache.set(key, { at: Date.now(), body });
    return body;
  } catch (e) {
    errors.push(`opensky: ${e.message}`);
  }

  const lat = (b.lamin + b.lamax) / 2;
  const lon = (b.lomin + b.lomax) / 2;
  const kmLat = (b.lamax - b.lamin) * 111;
  const kmLon = (b.lomax - b.lomin) * 111 * Math.cos((lat * Math.PI) / 180);
  const nm = Math.max(80, Math.min(250, Math.round((Math.hypot(kmLat, kmLon) / 2) * 0.54)));

  for (const host of ['https://opendata.adsb.fi/api/v2', 'https://api.adsb.lol/v2']) {
    try {
      const data = await fetchJson(`${host}/lat/${lat.toFixed(3)}/lon/${lon.toFixed(3)}/dist/${nm}`);
      const aircraft = adsbAircraft(data).filter((a) => inBox(a.lat, a.lon, b));
      const body = { aircraft, source: host.includes('adsb.fi') ? 'adsb.fi' : 'adsb.lol' };
      airCache.set(key, { at: Date.now(), body });
      return body;
    } catch (e) {
      errors.push(`${host}: ${e.message}`);
    }
  }

  return { aircraft: [], source: '', error: errors.join('; ') || 'air feed unavailable' };
}

async function loadVesselMeta() {
  if (vesselMeta && Date.now() - vesselMetaAt < VESSEL_META_TTL) return vesselMeta;
  const list = await fetchJson('https://meri.digitraffic.fi/api/ais/v1/vessels', {
    headers: { 'Digitraffic-User': 'Niyantran/Terminal' },
    ms: 20000,
  });
  const map = {};
  for (const v of list || []) if (v && v.mmsi) map[v.mmsi] = v;
  vesselMeta = map;
  vesselMetaAt = Date.now();
  return map;
}

function shipsFromDigitraffic(locs, meta, b) {
  const ships = [];
  for (const f of locs.features || []) {
    const c = f.geometry?.coordinates || [];
    const p = f.properties || {};
    const m = f.mmsi || p.mmsi;
    if (!m || c.length < 2) continue;
    const lon = c[0];
    const lat = c[1];
    if (!inBox(lat, lon, b)) continue;
    const md = meta[m] || {};
    ships.push({
      mmsi: m,
      lon,
      lat,
      name: String(md.name || '').trim(),
      sog: p.sog,
      cog: p.cog,
      hdg: p.heading,
      nav: p.navStat,
      type: md.shipType,
      cat: aisCat(md.shipType),
      dest: String(md.destination || '').trim(),
      imo: md.imo || null,
      callsign: String(md.callSign || '').trim(),
      length: (md.referencePointA || 0) + (md.referencePointB || 0),
      beam: (md.referencePointC || 0) + (md.referencePointD || 0),
      draught: md.draught ? md.draught / 10 : null,
    });
  }
  return ships;
}

async function aisSnapshot(b, key) {
  if (typeof WebSocket === 'undefined') return [];
  return new Promise((resolve) => {
    const ships = new Map();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve([...ships.values()]);
    };
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    const timer = setTimeout(done, 8000);
    ws.addEventListener('open', () => {
      try {
        ws.send(
          JSON.stringify({
            APIKey: key,
            BoundingBoxes: [
              [
                [b.lamin, b.lomin],
                [b.lamax, b.lomax],
              ],
            ],
          }),
        );
      } catch {
        clearTimeout(timer);
        done();
      }
    });
    ws.addEventListener('message', (ev) => {
      try {
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data));
        if (m?.error) return;
        const md = m.MetaData || {};
        const mmsi = md.MMSI;
        if (!mmsi || m.MessageType !== 'PositionReport') return;
        const pr = m.Message?.PositionReport || {};
        const lat = md.latitude;
        const lon = md.longitude;
        if (lat == null || lon == null) return;
        ships.set(mmsi, {
          mmsi,
          lat,
          lon,
          name: String(md.ShipName || '').trim(),
          sog: pr.Sog,
          cog: pr.Cog,
          hdg: pr.TrueHeading,
          nav: pr.NavigationalStatus,
          cat: 'other',
        });
      } catch {
        /* ignore a bad frame */
      }
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      done();
    });
    ws.addEventListener('close', () => {
      clearTimeout(timer);
      done();
    });
  });
}

async function serveShips(b) {
  const cacheKey = `${b.lamin.toFixed(2)}:${b.lamax.toFixed(2)}:${b.lomin.toFixed(2)}:${b.lomax.toFixed(2)}`;
  if (shipCache && shipCache.key === cacheKey && Date.now() - shipCache.at < SHIP_TTL) return shipCache.body;

  const aisKey = process.env.AISSTREAM_KEY || process.env.AIS_KEY || '';
  if (aisKey) {
    try {
      const ships = await aisSnapshot(b, aisKey);
      if (ships.length) {
        const body = { ships, vessels: ships, source: 'aisstream' };
        shipCache = { key: cacheKey, at: Date.now(), body };
        return body;
      }
    } catch (e) {
      /* fall through to Digitraffic */
    }
  }

  try {
    const [locs, meta] = await Promise.all([
      fetchJson('https://meri.digitraffic.fi/api/ais/v1/locations', {
        headers: { 'Digitraffic-User': 'Niyantran/Terminal' },
        ms: 20000,
      }),
      loadVesselMeta().catch(() => ({})),
    ]);
    const ships = shipsFromDigitraffic(locs, meta, b);
    const body = { ships, vessels: ships, source: 'digitraffic' };
    shipCache = { key: cacheKey, at: Date.now(), body };
    return body;
  } catch (e) {
    return { ships: [], vessels: [], source: '', error: e.message || 'ship feed unavailable' };
  }
}

export async function handleTransitApi(req, res, next) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const p = url.pathname;
  if (p !== '/api/air' && p !== '/api/ships' && p !== '/api/ais' && p !== '/api/vessels') {
    next();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, { ok: false, error: 'GET only' }, 405);
    return;
  }
  try {
    const b = bboxFrom(url);
    if (p === '/api/air') {
      json(res, await serveAir(b));
      return;
    }
    json(res, await serveShips(b));
  } catch (err) {
    json(res, { ok: false, error: err.message || String(err) }, 502);
  }
}

export function transitApiPlugin() {
  return {
    name: 'niyantran-transit-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleTransitApi(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleTransitApi(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
  };
}
