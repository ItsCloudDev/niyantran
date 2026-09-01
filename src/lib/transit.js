export function isTransitFeature(name) {
  return /^transit$/i.test(String(name || '').trim());
}

export const CATS = {
  tanker: { c: '#f0a339', l: 'Tanker · Oil & Gas' },
  cargo: { c: '#4c9af0', l: 'Cargo · Dry / Container' },
  passenger: { c: '#4cd07f', l: 'Passenger' },
  fishing: { c: '#35c2b0', l: 'Fishing' },
  hsc: { c: '#7ce0ff', l: 'High-speed' },
  tug: { c: '#c98bff', l: 'Tug / Towing' },
  service: { c: '#c9b98f', l: 'Service / Special' },
  other: { c: '#8a94a0', l: 'Other / Unknown' },
};

export const CAT_ORDER = ['tanker', 'cargo', 'passenger', 'fishing', 'hsc', 'tug', 'service', 'other'];

export const AIR_ALT = [
  [2000, '#e5484d', '< 2 km'],
  [5000, '#e0913f', '2–5 km'],
  [9000, '#e5c53f', '5–9 km'],
  [11500, '#46a758', '9–11.5 km'],
  [1e9, '#4a90d9', '> 11.5 km'],
];

export const NAV = {
  0: 'Under way (engine)',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Fishing',
  8: 'Under way (sailing)',
};

export const REGIONS = [
  { id: 'world', l: 'World', bb: [-180, -78, 180, 82] },
  { id: 'india', l: 'India & Arabian Sea', bb: [55, 2, 95, 27] },
  { id: 'hormuz', l: 'Strait of Hormuz', bb: [53, 22, 61, 29] },
  { id: 'suez', l: 'Suez · Red Sea', bb: [31, 11, 45, 33] },
  { id: 'malacca', l: 'Malacca Strait', bb: [94, -3, 106, 8] },
  { id: 'scs', l: 'South China Sea', bb: [104, -2, 123, 26] },
  { id: 'channel', l: 'English Channel', bb: [-7, 47, 5, 53] },
  { id: 'panama', l: 'Panama Canal', bb: [-83, 5, -76, 12] },
  { id: 'baltic', l: 'Baltic · Gulf of Finland', bb: [9, 53, 31, 66] },
];

export const DEFAULT_FILTER = Object.fromEntries(CAT_ORDER.map((k) => [k, true]));

export function aisCat(t) {
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

export function altColor(alt) {
  if (alt == null) return '#8a94a0';
  for (const row of AIR_ALT) if (alt < row[0]) return row[1];
  return '#4a90d9';
}

export function mercY(lat) {
  lat = Math.max(-85.05, Math.min(85.05, lat));
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function viewBox(region, view) {
  const b = region.bb;
  if (view.rid !== region.id) {
    view.rid = region.id;
    view.z = 1;
    view.cx = null;
    view.cy = null;
  }
  if (view.z <= 1.001) return b;
  const w = (b[2] - b[0]) / view.z;
  const hg = (b[3] - b[1]) / view.z;
  let cx = view.cx == null ? (b[0] + b[2]) / 2 : view.cx;
  let cy = view.cy == null ? (b[1] + b[3]) / 2 : view.cy;
  cx = Math.max(b[0] + w / 2, Math.min(b[2] - w / 2, cx));
  cy = Math.max(b[1] + hg / 2, Math.min(b[3] - hg / 2, cy));
  view.cx = cx;
  view.cy = cy;
  return [cx - w / 2, cy - hg / 2, cx + w / 2, cy + hg / 2];
}

export function proj(lon, lat, w, h, b) {
  const t = mercY(b[3]);
  const m = mercY(b[1]);
  return [((lon - b[0]) / (b[2] - b[0])) * w, ((t - mercY(lat)) / (t - m)) * h];
}

export function inBB(lon, lat, b) {
  return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
}

export function locLabel(lat, lon) {
  for (let i = 1; i < REGIONS.length; i++) {
    const b = REGIONS[i].bb;
    if (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]) return REGIONS[i].l;
  }
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}

export function zoomLabel(z) {
  return z <= 1.001 ? '1x' : `${Math.round(z * 10) / 10}x`;
}

export function applyViewZoom(view, region, f, px, py, canvas) {
  const b = viewBox(region, view);
  const nz = Math.max(1, Math.min(24, view.z * f));
  if (nz === view.z) return;
  const r = canvas?.getBoundingClientRect();
  if (r && px != null) {
    const fx = px / r.width;
    const fy = py / r.height;
    const lon = b[0] + fx * (b[2] - b[0]);
    const t = mercY(b[3]);
    const m = mercY(b[1]);
    const lat = ((2 * Math.atan(Math.exp(t - fy * (t - m))) - Math.PI / 2) * 180) / Math.PI;
    const rb = region.bb;
    const nw = (rb[2] - rb[0]) / nz;
    const nh = (rb[3] - rb[1]) / nz;
    view.cx = lon + (0.5 - fx) * nw;
    view.cy = lat + (fy - 0.5) * nh;
  }
  view.z = nz;
}

export function rowFromShip(s) {
  const cat = CATS[s.cat] || CATS.other;
  return {
    title: s.name || `MMSI ${s.mmsi}`,
    name: s.name || `MMSI ${s.mmsi}`,
    type: cat.l,
    location: locLabel(s.lat, s.lon),
    coordinates: `${s.lat.toFixed(4)}°, ${s.lon.toFixed(4)}°`,
    speed: s.sog != null ? `${s.sog} kn` : '',
    course: s.cog != null ? `${s.cog}°` : '',
    destination: s.dest || '',
    mmsi: s.mmsi,
    imo: s.imo || '',
    callsign: s.callsign || '',
    lat: s.lat,
    lon: s.lon,
  };
}

export function rowFromAir(a) {
  return {
    title: a.flt || a.icao,
    name: a.flt || a.icao,
    type: `Aircraft · ${a.cat || 'unknown'}`,
    location: locLabel(a.lat, a.lon),
    coordinates: `${a.lat.toFixed(4)}°, ${a.lon.toFixed(4)}°`,
    altitude: a.alt != null ? `${a.alt} m` : '',
    speed: a.vel != null ? `${Math.round(a.vel * 1.944)} kn` : '',
    heading: a.hdg != null ? `${a.hdg}°` : '',
    icao: a.icao,
    country: a.country || '',
    lat: a.lat,
    lon: a.lon,
  };
}

export function sourceLabel(provider, mode) {
  if (mode === 'air') return 'OPENSKY NETWORK';
  if (provider === 'digitraffic') return 'DIGITRAFFIC · BALTIC';
  if (provider === 'vesselapi') return 'VESSELAPI · LIVE AIS';
  if (provider === 'aisstream') return 'AISSTREAM.IO · GLOBAL';
  return 'LIVE AIS';
}

export function utcHm(ts) {
  const t = new Date(ts || Date.now());
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} UTC`;
}
