
/* ============================================================================
   NIYANTRAN — SEABORNE · Live Maritime Trade (Geopolitics)
   Dotted world map + live AIS ships glowing, coloured by cargo type, PLUS a
   ship-name search with full voyage detail. Data: aisstream.io real-time AIS.
   Nothing stored. Map is pure vector dots (window.NIY_LANDMAP). Key is client-
   side (aisstream is WebSocket-only); overridable via localStorage.niyAisKey.
   ========================================================================== */
(function () {
  'use strict';
  if (window.NiySeaborne) return;

  var AIS_KEY = (function () { try { return localStorage.getItem('niyAisKey') || ((window.NIY_KEYS && window.NIY_KEYS.aisstream) || ''); } catch (e) { return ((window.NIY_KEYS && window.NIY_KEYS.aisstream) || ''); } })();

  var CATS = {
    tanker: { c: '#f0a339', l: 'Tanker · Oil & Gas' }, cargo: { c: '#4c9af0', l: 'Cargo · Dry / Container' },
    passenger: { c: '#4cd07f', l: 'Passenger' }, fishing: { c: '#35c2b0', l: 'Fishing' },
    hsc: { c: '#7ce0ff', l: 'High-speed' }, tug: { c: '#c98bff', l: 'Tug / Towing' },
    service: { c: '#c9b98f', l: 'Service / Special' }, other: { c: '#8a94a0', l: 'Other / Unknown' }
  };
  var CAT_ORDER = ['tanker', 'cargo', 'passenger', 'fishing', 'hsc', 'tug', 'service', 'other'];
  function aisCat(t) { t = +t || 0; if (t >= 80 && t <= 89) return 'tanker'; if (t >= 70 && t <= 79) return 'cargo'; if (t >= 60 && t <= 69) return 'passenger'; if (t === 30) return 'fishing'; if (t >= 40 && t <= 49) return 'hsc'; if (t === 31 || t === 32 || t === 52) return 'tug'; if (t >= 50 && t <= 59) return 'service'; return 'other'; }
  var NAV = { 0: 'Under way (engine)', 1: 'At anchor', 2: 'Not under command', 3: 'Restricted manoeuvrability', 4: 'Constrained by draught', 5: 'Moored', 6: 'Aground', 7: 'Fishing', 8: 'Under way (sailing)' };
  var MON = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var REGIONS = [
    { id: 'world', l: 'World', bb: [-180, -78, 180, 82], vbb: [55.4, 25.4, 57, 27], vlanes: [[55.4, 25.4, 57, 27], [103.4, 1, 104.4, 1.6], [1, 50.8, 2.2, 51.4], [121.3, 30.9, 122.5, 31.7]] }, { id: 'india', l: 'India & Arabian Sea', bb: [55, 2, 95, 27], vbb: [71.5, 18.4, 73.2, 20], vlanes: [[71.5, 18.4, 73.2, 20], [80.2, 12.8, 81.4, 13.6]] },
    { id: 'hormuz', l: 'Strait of Hormuz', bb: [53, 22, 61, 29], vbb: [55.4, 25.4, 57, 27] }, { id: 'suez', l: 'Suez · Red Sea', bb: [31, 11, 45, 33], vbb: [32.3, 29.5, 33.6, 30.7] },
    { id: 'malacca', l: 'Malacca Strait', bb: [94, -3, 106, 8], vbb: [103.4, 1, 104.4, 1.6] }, { id: 'scs', l: 'South China Sea', bb: [104, -2, 123, 26], vbb: [113.6, 22, 114.9, 22.9] },
    { id: 'channel', l: 'English Channel', bb: [-7, 47, 5, 53], vbb: [1, 50.8, 2.2, 51.4] }, { id: 'panama', l: 'Panama Canal', bb: [-83, 5, -76, 12], vbb: [-80, 8.7, -79.3, 9.4] },
    { id: 'baltic', l: 'Baltic · Gulf of Finland', bb: [9, 53, 31, 66], vbb: [12.3, 55.2, 13.6, 56.2] }
  ];

  var ships = new Map(), typeCache = new Map(), staticCache = new Map();
  var panned = false;
  var UNKNOWN_CAP = 500;
  var ws = null, wsState = 'idle', reconnectT = null, active = false;
  // Connection health. aisstream can be unreachable (its stream host has gone
  // down before); without a timeout the socket sits in CONNECTING forever and
  // the HUD lies with "connecting…". These make the failure explicit.
  var connectT = null, retryDelay = 5000, lastErr = '', lastLiveAt = 0, stale = false;
  var CONNECT_TIMEOUT = 12000;
  var region = REGIONS[1], filter = {}; CAT_ORDER.forEach(function (k) { filter[k] = true; });
  var rafId = null, hover = null, canvas = null, ctx = null, tip = null, pulseT = 0, focusMmsi = null;

  var mode = 'sea', aircraft = new Map(), airTimer = null, airFetching = false, airHover = null;
  /* V2 PASS 32 MAPVIEW — zoomable, pannable viewport over the region bbox */
  var view = { z: 1, cx: null, cy: null, rid: null };
  function bb() {
    var b = region.bb;
    if (view.rid !== region.id) { view.rid = region.id; view.z = 1; view.cx = null; view.cy = null; }
    if (view.z <= 1.001) return b;
    var w = (b[2] - b[0]) / view.z, hg = (b[3] - b[1]) / view.z;
    var cx = view.cx == null ? (b[0] + b[2]) / 2 : view.cx;
    var cy = view.cy == null ? (b[1] + b[3]) / 2 : view.cy;
    cx = Math.max(b[0] + w / 2, Math.min(b[2] - w / 2, cx));
    cy = Math.max(b[1] + hg / 2, Math.min(b[3] - hg / 2, cy));
    view.cx = cx; view.cy = cy;
    return [cx - w / 2, cy - hg / 2, cx + w / 2, cy + hg / 2];
  }
  function viewZoom(f, px, py) {
    var b = bb(), nz = Math.max(1, Math.min(24, view.z * f));
    if (nz === view.z) return;
    var r = canvas ? canvas.getBoundingClientRect() : null;
    if (r && px != null) {
      var fx = px / r.width, fy = py / r.height;
      var lon = b[0] + fx * (b[2] - b[0]);
      var t = mercY(b[3]), m = mercY(b[1]);
      var lat = (2 * Math.atan(Math.exp(t - fy * (t - m))) - Math.PI / 2) * 180 / Math.PI;
      var rb = region.bb, nw = (rb[2] - rb[0]) / nz, nh = (rb[3] - rb[1]) / nz;
      view.cx = lon + (0.5 - fx) * nw;
      view.cy = lat + (fy - 0.5) * nh;
    }
    view.z = nz;
    var zl = document.getElementById('sbZoomLvl'); if (zl) zl.textContent = view.z <= 1.001 ? '1x' : (Math.round(view.z * 10) / 10) + 'x';
  }
  function inBB(lon, lat) { var b = bb(); return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtEta(e) { if (!e) return null; var mo = +e.Month || 0, day = +e.Day || 0, h = +e.Hour, mi = +e.Minute; if (!mo && !day) return null; var s = (day ? day + ' ' : '') + (mo && mo <= 12 ? MON[mo] : ''); if (h != null && h < 24) s += ' ' + String(h).padStart(2, '0') + ':' + String(mi || 0).padStart(2, '0') + ' UTC'; return s.trim() || null; }

  var LAND = null;
  function landCells() { if (LAND) return LAND; var m = window.NIY_LANDMAP; if (!m) return (LAND = []); var bytes = atob(m.b), cells = []; for (var idx = 0; idx < m.w * m.h; idx++) { if (bytes.charCodeAt(idx >> 3) & (1 << (idx & 7))) { var gy = Math.floor(idx / m.w), gx = idx % m.w; cells.push([-180 + (gx + 0.5) / m.w * 360, 90 - (gy + 0.5) / m.h * 180]); } } return (LAND = cells); }

  function connect() {
    stopWS(true);
    try { ws = new WebSocket('wss://stream.aisstream.io/v0/stream'); } catch (e) { wsState = 'error'; return; }
    ws.binaryType = 'arraybuffer'; wsState = 'connecting'; lastErr = '';
    // a socket that never opens must not sit in CONNECTING forever
    clearTimeout(connectT);
    connectT = setTimeout(function () {
      if (wsState === 'connecting') { try { ws.close(); } catch (e) { } fail('aisstream.io did not respond'); }
    }, CONNECT_TIMEOUT);
    ws.onopen = function () { clearTimeout(connectT); wsState = 'live'; retryDelay = 5000; lastErr = ''; stale = false; lastLiveAt = Date.now(); var b = bb(); try { ws.send(JSON.stringify({ APIKey: AIS_KEY, BoundingBoxes: [[[b[1], b[0]], [b[3], b[2]]]] })); } catch (e) { } };
    ws.onmessage = function (ev) { var data = ev.data, done = function (txt) { try { handle(JSON.parse(txt)); } catch (e) { } }; if (typeof data === 'string') done(data); else if (data instanceof ArrayBuffer) done(new TextDecoder().decode(data)); else if (data && data.text) data.text().then(done).catch(function () { }); };
    ws.onclose = function (e) {
      clearTimeout(connectT); if (wsState !== 'offline') wsState = 'closed';
      if (e && e.code && e.code !== 1000 && !lastErr) lastErr = 'socket closed (code ' + e.code + ')';
      if (active && mode === 'sea' && !aisKeyBad) scheduleRetry();
    };
    ws.onerror = function () { lastErr = lastErr || 'connection refused'; };
  }
  // Explicit, surfaced failure + capped exponential backoff, instead of a
  // silent 4s reconnect loop that hammers a dead endpoint forever.
  /* ---------- provider 2: Finnish Digitraffic (government open data) ----------
     aisstream is global but has been down for days. Digitraffic is the Finnish
     Transport Infrastructure Agency's open AIS: no API key, CORS-open (so it
     works even in the offline standalone file), and unlike aisstream it returns
     ship TYPE, NAME and DESTINATION immediately rather than in slow bursts —
     13% unknown instead of 90%. Coverage is the Baltic / Gulf of Finland, so we
     say so plainly rather than implying global cover. */
  var DT = 'https://meri.digitraffic.fi/api/ais/v1/';
  var dtTimer = null, dtMeta = {}, provider = 'aisstream', dtFails = 0;
  function dtFetch(path) {
    return fetch(DT + path, { headers: { 'Accept': 'application/json', 'Digitraffic-User': 'Niyantran/Terminal' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function dtApply(locs) {
    var n = 0;
    (locs.features || []).forEach(function (f) {
      var c = (f.geometry || {}).coordinates || [], p = f.properties || {}, m = f.mmsi || p.mmsi;
      if (!m || c.length < 2) return;
      var meta = dtMeta[m] || {};
      ships.set(m, {
        mmsi: m, lon: c[0], lat: c[1],
        name: (meta.name || '').trim(), sog: p.sog, cog: p.cog, hdg: p.heading, nav: p.navStat,
        cat: aisCat(meta.shipType), type: meta.shipType,
        dest: (meta.destination || '').trim(), imo: meta.imo || null, callsign: (meta.callSign || '').trim(),
        length: (meta.referencePointA || 0) + (meta.referencePointB || 0),
        beam: (meta.referencePointC || 0) + (meta.referencePointD || 0),
        draught: meta.draught ? (meta.draught / 10) : null,
        ts: p.timestampExternal || Date.now()
      });
      n++;
    });
    return n;
  }
  function dtPoll() {
    dtFetch('locations').then(function (locs) {
      var n = dtApply(locs);
      if (n) { wsState = 'live'; lastLiveAt = Date.now(); stale = false; lastErr = ''; dtFails = 0; }
    }).catch(function (e) {
      lastErr = 'Digitraffic: ' + e.message;
      dtFails++;
      if (dtFails >= 3) { wsState = 'offline'; stale = ships.size > 0; }
    });
  }
  function startDigitraffic() {
    if (provider === 'digitraffic' && dtTimer) return;
    provider = 'digitraffic';
    // stop the dead global socket completely — a stray retry failing later must
    // not mark this feed offline
    clearTimeout(connectT); clearTimeout(reconnectT);
    if (ws) { try { ws.onclose = null; ws.onerror = null; ws.close(); } catch (e) { } ws = null; }
    wsState = 'connecting';
    dtFetch('vessels').then(function (list) {
      dtMeta = {}; (list || []).forEach(function (v) { dtMeta[v.mmsi] = v; });
      dtPoll();
      // point the map at the water this feed actually covers
      if (region.id === 'world') {
        var b = REGIONS.filter(function (x) { return x.id === 'baltic'; })[0];
        if (b) { region = b; var selEl = document.getElementById('sbRegion'); if (selEl) selEl.value = 'baltic'; }
      }
      clearInterval(dtTimer);
      dtTimer = setInterval(dtPoll, 60000);          // their cache-control is 60s
    }).catch(function (e) { wsState = 'offline'; lastErr = 'Digitraffic unavailable (' + e.message + ')'; });
  }
  function stopDigitraffic() { clearInterval(dtTimer); dtTimer = null; }

  function fail(msg) {
    lastErr = msg || 'unreachable';
    wsState = ships.size ? 'live' : 'offline'; stale = ships.size > 0;
    // reconnect aisstream rather than abandoning it for the typeless fallback;
    // VesselAPI is only reached by the 15s empty-state timer in mount().
    if (mode === 'sea' && active) scheduleRetry();
  }
  function scheduleRetry() {
    if (!active || provider === 'digitraffic' || aisKeyBad) return;
    clearTimeout(reconnectT);
    reconnectT = setTimeout(function () { if (active) connect(); }, retryDelay);
    retryDelay = Math.min(60000, Math.round(retryDelay * 1.8));
  }
  // Retry must re-run the source that actually feeds the current mode. It used to
  // call connect() -- the browser aisstream WebSocket, which can never open here --
  // so pressing Retry in SHIPS mode knocked a working VesselAPI fleet back to OFFLINE.
  function retryNow() { retryDelay = 5000; clearTimeout(reconnectT); active = true; lastErr = ''; if (mode === 'air') { aircraft.clear(); airPoll(); } else connect(); }
  function stopWS(silent) { active = active && silent; clearTimeout(reconnectT); if (ws) { try { ws.onclose = null; ws.close(); } catch (e) { } ws = null; } }
  var aisKeyBad = false;
  function handle(m) {
    if (m && m.error) {
      lastErr = 'aisstream: ' + m.error;
      try { console.warn('[TRANSIT] aisstream error frame:', m.error); } catch (e) { }
      if (/key|valid|unauthor/i.test(String(m.error))) { aisKeyBad = true; stopWS(true); wsState = 'offline'; }
      return;
    }
    var md = m.MetaData || {}, mmsi = md.MMSI; if (!mmsi) return;
    if (m.MessageType === 'ShipStaticData') {
      var sd = (m.Message && m.Message.ShipStaticData) || {}, dim = sd.Dimension || {};
      if (sd.Type != null) typeCache.set(mmsi, sd.Type);
      var st = { name: (sd.Name || '').trim(), type: sd.Type, dest: (sd.Destination || '').trim(), eta: fmtEta(sd.Eta), imo: sd.ImoNumber || null, callsign: (sd.CallSign || '').trim(), length: (dim.A || 0) + (dim.B || 0), beam: (dim.C || 0) + (dim.D || 0), draught: sd.MaximumStaticDraught || null };
      staticCache.set(mmsi, st); if (staticCache.size > 7000) { staticCache.delete(staticCache.keys().next().value); } saveVesselsDeb();
      var s0 = ships.get(mmsi); if (s0) { Object.assign(s0, st); s0.cat = aisCat(sd.Type); if (st.name) s0.name = st.name; } return;
    }
    if (m.MessageType !== 'PositionReport') return;
    var pr = (m.Message && m.Message.PositionReport) || {}, lat = md.latitude, lon = md.longitude; if (lat == null || lon == null) return;
    var base = staticCache.get(mmsi) || {};
    ships.set(mmsi, Object.assign({}, base, { mmsi: mmsi, lat: lat, lon: lon, name: (md.ShipName || base.name || '').trim(), sog: pr.Sog, cog: pr.Cog, hdg: pr.TrueHeading, nav: pr.NavigationalStatus, cat: aisCat(typeCache.get(mmsi)), ts: Date.now() }));
    if (ships.size > 15000) evictUnknown(1);
  }
  function prune() { var cut = Date.now() - 12 * 60000; ships.forEach(function (v, k) { if (v.ts < cut && k !== focusMmsi) ships.delete(k); }); }
  // Bound the unknown set so identified (coloured) vessels dominate the map,
  // instead of thousands of grey dots that never received an AIS static message.
  function evictUnknown(max) { var n = 0; for (var k of ships.keys()) { if (n >= (max || 30)) break; var s = ships.get(k); if (s && s.cat === 'other' && k !== focusMmsi) { ships.delete(k); n++; } } return n; }
  // Runs on a timer (independent of rendering, which pauses when the tab is
  // hidden) so the unknown set stays bounded even in the background.
  function enforceCaps() { if (ships.size > 15000) evictUnknown(ships.size - 15000); }
  // Vessel identities (type + voyage) are cached in the user's browser so
  // categorisation compounds across sessions — nothing is stored on a server.
  var VKEY = 'niySbVessels', saveT = null;
  function loadVessels() { try { var o = JSON.parse(localStorage.getItem(VKEY) || '{}'); Object.keys(o).forEach(function (k) { var a = o[k]; if (!a) return; staticCache.set(+k, { type: a[0], name: a[1], dest: a[2], eta: a[3], imo: a[4], callsign: a[5], length: a[6], beam: a[7], draught: a[8] }); if (a[0] != null) typeCache.set(+k, a[0]); }); } catch (e) { } }
  function saveVessels() { try { var o = {}, n = 0; staticCache.forEach(function (v, k) { if (n++ > 4500 || v.type == null) return; o[k] = [v.type, v.name, v.dest, v.eta, v.imo, v.callsign, v.length, v.beam, v.draught]; }); localStorage.setItem(VKEY, JSON.stringify(o)); } catch (e) { } }
  function saveVesselsDeb() { if (saveT) return; saveT = setTimeout(function () { saveT = null; saveVessels(); saveSnapshot(); }, 15000); }

  // Last-known positions, so an upstream outage shows a clearly-labelled stale
  // map instead of an empty one. Capped and stored only in this browser.
  var SKEY = 'niySbSnap';
  function saveSnapshot() {
    try {
      if (wsState !== 'live' || !ships.size) return;
      var out = [], n = 0;
      ships.forEach(function (s) { if (n++ >= 900) return; out.push([s.mmsi, +s.lat.toFixed(3), +s.lon.toFixed(3), s.cat, (s.name || '').slice(0, 28)]); });
      localStorage.setItem(SKEY, JSON.stringify({ t: Date.now(), s: out }));
    } catch (e) { }
  }
  function loadSnapshot() {
    try {
      if (ships.size) return 0;
      var o = JSON.parse(localStorage.getItem(SKEY) || 'null');
      if (!o || !o.s || !o.s.length) return 0;
      var age = Date.now() - (o.t || 0);
      if (age > 24 * 3600 * 1000) return 0; // older than a day is not worth showing
      o.s.forEach(function (a) {
        ships.set(a[0], { mmsi: a[0], lat: a[1], lon: a[2], cat: a[3] || 'other', name: a[4] || '', ts: o.t, _stale: true });
      });
      stale = true; lastLiveAt = o.t;
      return o.s.length;
    } catch (e) { return 0; }
  }

  function mercY(lat) { lat = Math.max(-85.05, Math.min(85.05, lat)); return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
  function proj(lon, lat, w, h) { var b = bb(), t = mercY(b[3]), m = mercY(b[1]); return [(lon - b[0]) / (b[2] - b[0]) * w, (t - mercY(lat)) / (t - m) * h]; }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  /* ---------- AIR mode: live aircraft via OpenSky (/api/air proxy) ---------- */
  var AIR_ALT = [[2000, '#e5484d', '< 2 km'], [5000, '#e0913f', '2–5 km'], [9000, '#e5c53f', '5–9 km'], [11500, '#46a758', '9–11.5 km'], [1e9, '#4a90d9', '> 11.5 km']];
  function altColor(alt) { if (alt == null) return '#8a94a0'; for (var i = 0; i < AIR_ALT.length; i++) if (alt < AIR_ALT[i][0]) return AIR_ALT[i][1]; return '#4a90d9'; }
  function airBB() { var b = bb(); return 'lamin=' + b[1].toFixed(3) + '&lamax=' + b[3].toFixed(3) + '&lomin=' + b[0].toFixed(3) + '&lomax=' + b[2].toFixed(3); }
  var airSource = '', airRot = 0;
  function airPoll() {
    if (airFetching) return; airFetching = true;
    fetch('/api/air?' + airBB() + '&rot=' + (airRot++), { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(15000) : undefined }).then(function (r) { return r.json(); }).then(function (d) {
      airFetching = false;
      if (d.error) { lastErr = d.error; if (!aircraft.size) { wsState = 'offline'; setTimeout(function () { if (mode === 'air' && active && !aircraft.size) airPoll(); }, 15000); } return; }
      var now = Date.now(), seen = {};
      (d.aircraft || []).forEach(function (a) { if (a.lat != null && a.lon != null) { a.ts = now; aircraft.set(a.icao, a); seen[a.icao] = 1; } });
      if (d.source === 'opensky') {
        aircraft.forEach(function (v, k) { if (!seen[k]) aircraft.delete(k); });
      } else {
        aircraft.forEach(function (v, k) { if (!seen[k] && now - (v.ts || 0) > 300000) aircraft.delete(k); });
        // fill the rotation quickly on the first cycle, then settle to the 60s timer
        if (airRot <= 5) setTimeout(function () { if (mode === 'air' && active) airPoll(); }, 18000);
      }
      wsState = 'live'; lastLiveAt = Date.now(); lastErr = ''; airSource = (d.source || 'opensky').toUpperCase();
    }).catch(function (e) { airFetching = false; lastErr = 'air feed: ' + e.message; if (!aircraft.size) wsState = 'offline'; });
  }
  function startAir() { wsState = aircraft.size ? 'live' : 'connecting'; airPoll(); clearInterval(airTimer); airTimer = setInterval(airPoll, 60000); }
  function stopAir() { clearInterval(airTimer); airTimer = null; }
  /* ---------- SHIPS: aisstream (primary, server-side bridge) -> VesselAPI (fallback)
     The browser cannot hold an aisstream WebSocket, so /api/ais opens it server-side
     and returns a snapshot. If aisstream yields nothing (inactive key / no data), we
     fall back to VesselAPI (/api/vessels, 150 calls a MONTH -> fetch once, never poll). */
  // VesselAPI allows 150 calls a MONTH. The module re-mounts often (layout/colour
  // observers churn #detail), so a mount-time fetch guarded only by "no ships yet"
  // re-fired on every re-mount and would drain the whole monthly quota in one sitting.
  // Guard on TIME as well: one fetch per region per cooldown window unless forced.
  var vesselFetchedRegion = null, vesselFetching = false, vesselFetchedAt = 0;
  var VESSEL_COOLDOWN = 10 * 60 * 1000;
  function applyVessels(list, src) {
    provider = src; ships.clear();
    (list || []).forEach(function (s) {
      if (s.lat == null || s.lon == null) return;
      var kt = (s.type != null) ? s.type : typeCache.get(s.mmsi);
      var ks = staticCache.get(s.mmsi) || {};
      ships.set(s.mmsi, {
        mmsi: s.mmsi, name: (s.name || ks.name || '').trim(), lat: s.lat, lon: s.lon,
        sog: s.sog, cog: s.cog, hdg: s.hdg, nav: s.nav, imo: s.imo || ks.imo || null, dest: s.dest || ks.dest || '',
        cat: (kt != null ? aisCat(kt) : 'other'), ts: Date.now()
      });
    });
    wsState = ships.size ? 'live' : 'offline'; lastLiveAt = Date.now();
    lastErr = ships.size ? '' : 'No vessels reported in this lane right now — try another region.';
  }
  function vesselFetch(force) {
    if (vesselFetching) return;
    if (!force && vesselFetchedRegion === region.id && (ships.size || Date.now() - vesselFetchedAt < VESSEL_COOLDOWN)) { if (ships.size) wsState = 'live'; return; }
    vesselFetching = true; vesselFetchedRegion = region.id; vesselFetchedAt = Date.now();
    if (!ships.size) wsState = 'connecting';
    (function () {
        // VesselAPI LAST RESORT ONLY (no ship type -> no categories; 150 calls a MONTH).
        // It pages at 20 vessels per call and caps a box at ~4 degrees, so a
        // region-sized map needs SEVERAL busy lanes merged.
        var lanes = region.vlanes || [region.vbb || region.bb];
        var q = function (v) {
          return fetch('/api/vessels?latTop=' + v[3] + '&latBottom=' + v[1] + '&lonLeft=' + v[0] + '&lonRight=' + v[2])
            .then(function (r) { return r.json(); })
            .then(function (d2) { return d2 && d2.vessels ? d2.vessels : (d2 && d2.error ? (lastErr = 'VesselAPI: ' + d2.error, []) : []); })
            .catch(function (e) { lastErr = 'VesselAPI: ' + e.message; return []; });
        };
        return Promise.all(lanes.map(q)).then(function (sets) {
          vesselFetching = false;
          var all = [], seen = {};
          sets.forEach(function (s) { (s || []).forEach(function (x) { if (x && !seen[x.mmsi]) { seen[x.mmsi] = 1; all.push(x); } }); });
          if (!all.length) { wsState = ships.size ? 'live' : 'offline'; return; }
          if (ships.size && provider === 'aisstream') return;   // live AIS arrived meanwhile
          applyVessels(all, 'vesselapi');
        });
    })();
  }
  function airVisible() { var b = bb(), n = 0; aircraft.forEach(function (a) { if (a.lon >= b[0] && a.lon <= b[2] && a.lat >= b[1] && a.lat <= b[3]) n++; }); return n; }
  function drawAircraft(cssW, cssH, b) {
    canvas._air = [];
    aircraft.forEach(function (a) {
      if (a.lon < b[0] || a.lon > b[2] || a.lat < b[1] || a.lat > b[3]) return;
      var p = proj(a.lon, a.lat, cssW, cssH), col = altColor(a.alt), isHov = airHover && airHover.icao === a.icao;
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate((a.hdg || 0) * Math.PI / 180);
      ctx.globalAlpha = isHov ? 1 : .92; ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(3.5, 4.6); ctx.lineTo(0, 2.2); ctx.lineTo(-3.5, 4.6); ctx.closePath(); ctx.fill();
      if (isHov) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
      canvas._air.push({ x: p[0], y: p[1], a: a });
    });
    ctx.globalAlpha = 1;
    if (airHover) { var hp = proj(airHover.lon, airHover.lat, cssW, cssH); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(hp[0], hp[1], 9, 0, 6.283); ctx.stroke(); }
  }
  function updateAirHud() {
    var el = document.getElementById('sbCount'); if (el) el.textContent = airVisible() + ' aircraft';
    var st = document.getElementById('sbState'); if (st) { st.textContent = wsState === 'live' ? '● LIVE' : wsState === 'connecting' ? 'connecting…' : wsState === 'offline' ? '⚠ FEED OFFLINE' : wsState === 'paused' ? '❚❚ paused' : wsState; st.className = 'sb-state ' + (wsState === 'live' ? 'on' : wsState === 'offline' ? 'bad' : 'off'); }
    var ft = document.getElementById('sbFoot'); if (ft) { var t = new Date(lastLiveAt || Date.now()); ft.textContent = (airSource || 'OPENSKY NETWORK') + ' · ' + (wsState === 'live' ? airVisible() + ' AIRCRAFT · ' + String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ' UTC' : wsState.toUpperCase()); }
    var al = document.getElementById('sbAlert'); if (al) { if (wsState === 'offline') { al.hidden = false; al.querySelector('.sb-alert-msg').textContent = 'Air feed unavailable: ' + (lastErr || 'unreachable') + '. Every upstream (OpenSky, adsb.fi, adsb.lol) failed from this network.'; } else al.hidden = true; }
  }
  function renderLegend() {
    var lg = document.getElementById('sbLegend'); if (!lg) return;
    if (mode === 'air') { lg.innerHTML = '<span class="sb-lg-t">ALTITUDE</span>' + AIR_ALT.map(function (x) { return '<span class="sb-lg" style="color:' + x[1] + '"><span class="sw" style="background:' + x[1] + '"></span>' + x[2] + '</span>'; }).join(''); }
    else {
      lg.innerHTML = CAT_ORDER.map(function (k) { return '<span class="sb-lg' + (filter[k] ? '' : ' off') + '" data-cat="' + k + '" style="color:' + CATS[k].c + '"><span class="sw" style="background:' + CATS[k].c + '"></span>' + CATS[k].l + ' <span class="n" id="sbc-' + k + '">0</span></span>'; }).join('');
      lg.querySelectorAll('.sb-lg').forEach(function (el2) { el2.addEventListener('click', function () { var k = el2.getAttribute('data-cat'); filter[k] = !filter[k]; el2.classList.toggle('off', !filter[k]); }); });
    }
  }
  function setMode(m) {
    if (m === mode) return; mode = m;
    var el = document.getElementById('niySeaborne'); if (el) el.querySelectorAll('.sb-mode').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === m); });
    var srch = document.getElementById('sbSearch'); if (srch) { srch.value = ''; srch.placeholder = m === 'air' ? '🔍 Search a flight by callsign…' : '🔍 Search a ship by name…'; var box = document.getElementById('sbResults'); if (box) box.hidden = true; }
    var det = document.getElementById('sbDetail'); if (det) det.hidden = true; focusMmsi = null; airHover = null; hover = null;
    if (m === 'air') { stopWS(); active = true; startAir(); } else { stopAir(); active = true; if (wsState !== 'live' && wsState !== 'connecting') connect(); setTimeout(function () { if (mode === 'sea' && !ships.size) vesselFetch(); }, 2600); }
    renderLegend();
  }
  function onHoverAir(ev) {
    if (!canvas) return; var r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, best = null, bd = 14 * 14;
    (canvas._air || []).forEach(function (h) { var dx = h.x - mx, dy = h.y - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = h.a; } });
    airHover = best; canvas.style.cursor = best ? 'pointer' : 'default';
    if (best && tip) { tip.innerHTML = '<b>' + esc(best.flt || best.icao) + '</b><br><span class="k">Alt</span> ' + (best.alt != null ? best.alt + ' m' : '—') + '<br><span class="k">Speed</span> ' + (best.vel != null ? Math.round(best.vel * 1.944) + ' kn' : '—') + '<br><span class="k">Heading</span> ' + (best.hdg != null ? best.hdg + '°' : '—') + '<br><span class="k">' + esc(best.country || '') + '</span>'; var p = proj(best.lon, best.lat, r.width, r.height); tip.style.left = Math.min(r.width - 180, p[0] + 12) + 'px'; tip.style.top = Math.max(2, p[1] - 8) + 'px'; tip.style.display = 'block'; }
    else if (tip) tip.style.display = 'none';
  }
  function openAirDetail(a) {
    var panel = document.getElementById('sbDetail'); if (!panel) return; var col = altColor(a.alt);
    var row = function (k, v) { return (v == null || v === '') ? '' : '<div style="display:flex;justify-content:space-between;gap:10px;font:500 11px var(--font-mono,monospace);padding:2.5px 0"><span style="color:#68717b">' + k + '</span><span style="color:#eef2f6;text-align:right">' + v + '</span></div>'; };
    panel.innerHTML = '<div class="sb-d-head"><span class="sb-d-sw" style="background:' + col + '"></span><span class="sb-d-nm">' + esc(a.flt || a.icao) + '</span><button class="sb-d-x" type="button">✕</button></div>'
      + '<div class="sb-d-cat" style="color:' + col + '">Aircraft · ' + esc(a.cat || 'unknown') + '</div>'
      + '<div class="sb-d-sec">POSITION</div>' + row('Coordinates', a.lat.toFixed(4) + '°, ' + a.lon.toFixed(4) + '°') + row('Altitude', a.alt != null ? a.alt + ' m' : '—') + row('Ground speed', a.vel != null ? Math.round(a.vel * 1.944) + ' kn' : '—') + row('Heading', a.hdg != null ? a.hdg + '°' : '—') + row('Vertical rate', a.vrate != null ? (a.vrate > 0.5 ? '↑ climbing' : a.vrate < -0.5 ? '↓ descending' : 'level') : '—')
      + '<div class="sb-d-sec">AIRCRAFT</div>' + row('Callsign', esc(a.flt || '—')) + row('ICAO 24-bit', esc(a.icao)) + row('Registered', esc(a.country || '—'))
      + '<div class="sb-d-actions"><button class="sb-d-ai" type="button">✦ Flight &amp; operator lookup (AI)</button></div>';
    panel.hidden = false;
    panel.querySelector('.sb-d-x').addEventListener('click', function () { panel.hidden = true; airHover = null; });
    panel.querySelector('.sb-d-ai').addEventListener('click', function () { var q = 'Identify flight "' + (a.flt || a.icao) + '" (ICAO24 ' + a.icao + '), currently over ' + a.lat.toFixed(2) + ',' + a.lon.toFixed(2) + ' at ' + (a.alt || '?') + ' m altitude heading ' + (a.hdg || '?') + '°. Give the airline, aircraft type, likely origin and destination airports, and route. Cite public sources such as FlightRadar24 or planespotters.'; if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(q); else if (window.openGlobalAi) window.openGlobalAi(); });
  }
  /* ---------- land renderer ----------
     NIY_LANDMAP is only a 200x100 global grid (1.8 deg cells). Two naive approaches
     both fail: fixed tiny dots vanish when you zoom into a region (cells end up ~30px
     apart), and scaling each cell to its footprint paints huge ugly squares. Instead we
     sample in SCREEN SPACE at a constant dot pitch and bilinearly interpolate the coarse
     land field, so the map is the same clean dot matrix at every zoom level and the
     1.8 deg blockiness is smoothed into a coastline. */
  var LAND_FIELD = null;
  function landField() {
    if (LAND_FIELD) return LAND_FIELD;
    var m = window.NIY_LANDMAP; if (!m) return null;
    var bytes = atob(m.b), g = new Uint8Array(m.w * m.h);
    for (var i = 0; i < m.w * m.h; i++) if (bytes.charCodeAt(i >> 3) & (1 << (i & 7))) g[i] = 1;
    return (LAND_FIELD = { w: m.w, h: m.h, g: g });
  }
  function landAt(f, lon, lat) {                       // bilinear sample, 0..1
    var fx = (lon + 180) / 360 * f.w - 0.5, fy = (90 - lat) / 180 * f.h - 0.5;
    var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    var at = function (x, y) {
      if (y < 0 || y >= f.h) return 0;
      x = ((x % f.w) + f.w) % f.w;                     // wrap longitude
      return f.g[y * f.w + x];
    };
    return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty)
      + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty;
  }
  /* ===== V2 PASS 29 SAT — real satellite imagery under the live layer ===== */
  var tileCache = {}, tileLoading = 0;
  function tileImg(z, x, y) {
    var key = z + '/' + y + '/' + x, t = tileCache[key];
    if (t) return t.ok ? t.img : null;
    if (tileLoading > 22) return null;
    if (Object.keys(tileCache).length > 420) tileCache = {};
    var img = new Image(); tileLoading++;
    t = tileCache[key] = { img: img, ok: false };
    img.onload = function () { t.ok = true; tileLoading--; };
    img.onerror = function () { tileLoading--; };
    img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x;
    return null;
  }
  function drawSat(cssW, cssH, b) {
    var PI = Math.PI, t = mercY(b[3]), m = mercY(b[1]);
    var fx0 = (b[0] + 180) / 360, fx1 = (b[2] + 180) / 360;
    var fy0 = (PI - t) / (2 * PI), fy1 = (PI - m) / (2 * PI);
    var z = Math.max(2, Math.min(12, Math.round(Math.log(cssW / 256 / Math.max(1e-6, fx1 - fx0)) / Math.LN2)));
    var sc = Math.pow(2, z);
    while (z > 2 && (Math.floor(fx1 * sc) - Math.floor(fx0 * sc) + 1) * (Math.floor(fy1 * sc) - Math.floor(fy0 * sc) + 1) > 48) { z--; sc = Math.pow(2, z); }
    var x0 = Math.floor(fx0 * sc), x1 = Math.floor(fx1 * sc), y0 = Math.floor(fy0 * sc), y1 = Math.floor(fy1 * sc);
    ctx.fillStyle = '#0A121C'; ctx.fillRect(0, 0, cssW, cssH);
    var drew = 0;
    for (var ty = Math.max(0, y0); ty <= Math.min(sc - 1, y1); ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var img = tileImg(z, ((tx % sc) + sc) % sc, ty); if (!img) continue;
        var dx0 = (tx / sc - fx0) / (fx1 - fx0) * cssW, dx1 = ((tx + 1) / sc - fx0) / (fx1 - fx0) * cssW;
        var dy0 = (ty / sc - fy0) / (fy1 - fy0) * cssH, dy1 = ((ty + 1) / sc - fy0) / (fy1 - fy0) * cssH;
        try { ctx.drawImage(img, dx0, dy0, dx1 - dx0 + 0.6, dy1 - dy0 + 0.6); drew++; } catch (e) { }
      }
    }
    if (drew) {
      ctx.fillStyle = 'rgba(5,9,15,.22)'; ctx.fillRect(0, 0, cssW, cssH);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'right';
      ctx.fillText('\u00a9 Esri World Imagery', cssW - 8, cssH - 7); ctx.textAlign = 'left';
    }
    return drew > 0;
  }
  function drawLand(cssW, cssH, b) {
    if (drawSat(cssW, cssH, b)) return;
    drawDots(cssW, cssH, b);
  }
  function drawDots(cssW, cssH, b) {
    var f = landField(); if (!f) return;
    var PITCH = 7, R = 1.45;                            // constant on-screen dot grid
    var lonPer = (b[2] - b[0]) / cssW, latPer = (b[3] - b[1]) / cssH;
    ctx.fillStyle = 'rgba(150,184,109,.30)';
    ctx.beginPath();
    for (var y = PITCH / 2; y < cssH; y += PITCH) {
      var lat = b[3] - y * latPer;
      for (var x = PITCH / 2; x < cssW; x += PITCH) {
        var v = landAt(f, b[0] + x * lonPer, lat);
        if (v < 0.45) continue;
        ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, 6.283);
      }
    }
    ctx.fill();                                         // one path -> one fill, fast
  }
  function draw() {
    if (!ctx || !canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), cssW = canvas.clientWidth, cssH = canvas.clientHeight; if (!cssW || !cssH) return;
    if (canvas.width !== Math.round(cssW * dpr)) { canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
    var b = bb();
    drawLand(cssW, cssH, b);
    if (mode === 'air') { drawAircraft(cssW, cssH, b); updateAirHud(); return; }
    pulseT += 0.05; var pulse = 0.5 + 0.5 * Math.sin(pulseT), counts = {}; CAT_ORDER.forEach(function (k) { counts[k] = 0; });
    ships.forEach(function (s) {
      if (!inBB(s.lon, s.lat)) return; counts[s.cat] = (counts[s.cat] || 0) + 1; if (!filter[s.cat]) return;
      var p = proj(s.lon, s.lat, cssW, cssH), col = (CATS[s.cat] || CATS.other).c;
      if (s.cat === 'other' && ships.size > 150) { ctx.globalAlpha = 0.6; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 1.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; return; }
      ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, 6.283); ctx.stroke();
    });
    /* unknown cap removed — every vessel is shown */
    ctx.globalAlpha = 1;
    var mark = focusMmsi != null ? ships.get(focusMmsi) : hover;
    if (mark && inBB(mark.lon, mark.lat)) { var hp = proj(mark.lon, mark.lat, cssW, cssH); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hp[0], hp[1], 9 + (focusMmsi ? 3 * pulse : 0), 0, 6.283); ctx.stroke(); if (focusMmsi && mark.name) { ctx.fillStyle = '#fff'; ctx.font = '11px ui-monospace,monospace'; ctx.fillText(mark.name, hp[0] + 12, hp[1] - 8); } }
    updateHud(counts);
  }
  function loop() { draw(); rafId = (document.visibilityState === 'hidden') ? setTimeout(loop, 200) : requestAnimationFrame(loop); }
  function startRender() { stopRender(); loop(); }
  function stopRender() { if (rafId != null) { cancelAnimationFrame(rafId); clearTimeout(rafId); rafId = null; } }
  function shown() { var n = 0; ships.forEach(function (s) { if (inBB(s.lon, s.lat) && filter[s.cat]) n++; }); return n; }
  function updateHud(counts) {
    var el = document.getElementById('sbCount'); if (el) el.textContent = shown() + ' ships';
    var st = document.getElementById('sbState');
    if (st) {
      st.textContent = wsState === 'live' ? '● LIVE'
        : wsState === 'connecting' ? 'connecting…'
        : wsState === 'offline' ? '⚠ FEED OFFLINE'
        : wsState === 'paused' ? '❚❚ paused'
        : wsState === 'closed' ? 'reconnecting…' : wsState;
      st.className = 'sb-state ' + (wsState === 'live' ? 'on' : wsState === 'offline' ? 'bad' : 'off');
    }
    // terminal-style status line: source · count · time. No prose.
    var ft = document.getElementById('sbFoot');
    if (ft) {
      // NB: do not name this `shown` — that shadows the module's shown() helper
      var nVis = 0; for (var k in counts) nVis += counts[k] || 0;
      var t = new Date(wsState === 'live' ? Date.now() : (lastLiveAt || Date.now()));
      var hhmm = String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0');
      var srcName = provider === 'digitraffic' ? 'DIGITRAFFIC · BALTIC' : provider === 'vesselapi' ? 'VESSELAPI · LIVE AIS' : 'AISSTREAM.IO · GLOBAL';
      ft.textContent = srcName + ' · ' + (wsState === 'live' ? nVis + ' VESSELS · ' + hhmm + ' UTC'
        : wsState === 'offline' ? (lastLiveAt ? 'OFFLINE · LAST ' + hhmm + ' UTC' : 'OFFLINE')
        : wsState.toUpperCase());
    }
    // an explicit banner when the upstream feed can't be reached, with the
    // reason and a retry — never leave the user staring at an empty map
    var al = document.getElementById('sbAlert');
    if (al) {
      if (wsState === 'offline') {
        al.hidden = false;
        al.querySelector('.sb-alert-msg').textContent =
          (aisKeyBad
            ? 'aisstream rejected the API key. Regenerate it at aisstream.io and update AIS_KEY. '
            : 'Live vessel AIS is unavailable' + (lastErr ? ' (' + lastErr + ')' : '') + '. If this repeats, close other Niyantran tabs (aisstream allows one connection per key) or regenerate the key at aisstream.io. ')
          + (stale ? 'Showing last known positions.' : '');
      } else al.hidden = true;
    }
    CAT_ORDER.forEach(function (k) { var c = document.getElementById('sbc-' + k); if (c) c.textContent = counts[k] || 0; });
  }

  /* ---------- search + detail ---------- */
  function doSearch(q) {
    var box = document.getElementById('sbResults'); if (!box) return;
    if (mode === 'air') { box.hidden = true; return; }
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    var out = []; ships.forEach(function (s) { if (s.name && s.name.toLowerCase().indexOf(q) !== -1) out.push(s); });
    out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!out.length) { box.hidden = false; box.innerHTML = '<div class="sb-res-empty">No vessel in view matches “' + esc(q) + '”. Switch region to <b>World</b> for global coverage, or wait as more ships broadcast.</div>'; return; }
    box.hidden = false;
    box.innerHTML = out.slice(0, 14).map(function (s) { return '<button class="sb-res" data-mmsi="' + s.mmsi + '" type="button"><span class="sb-res-sw" style="background:' + (CATS[s.cat] || CATS.other).c + '"></span><span class="sb-res-nm">' + esc(s.name) + '</span><span class="sb-res-t">' + (CATS[s.cat] || CATS.other).l.split(' · ')[0] + '</span></button>'; }).join('');
    box.querySelectorAll('.sb-res').forEach(function (b) { b.addEventListener('click', function () { openDetail(+b.getAttribute('data-mmsi')); box.hidden = true; }); });
  }
  function locLabel(lat, lon) { for (var i = 1; i < REGIONS.length; i++) { var b = REGIONS[i].bb; if (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]) return REGIONS[i].l; } return (Math.abs(lat).toFixed(2) + '°' + (lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(lon).toFixed(2) + '°' + (lon >= 0 ? 'E' : 'W')); }
  function row(k, v) { return v == null || v === '' ? '' : '<div class="sb-d-row"><span class="sb-d-k">' + k + '</span><span class="sb-d-v">' + v + '</span></div>'; }
  function openDetail(mmsi) {
    var s = ships.get(mmsi); if (!s) return; focusMmsi = mmsi;
    // pan region so the focused ship is visible
    if (!inBB(s.lon, s.lat)) { region = REGIONS[0]; if (active) connect(); var sel = document.getElementById('sbRegion'); if (sel) sel.value = 'world'; }
    var panel = document.getElementById('sbDetail'); if (!panel) return;
    var cat = CATS[s.cat] || CATS.other;
    panel.innerHTML = '<div class="sb-d-head"><span class="sb-d-sw" style="background:' + cat.c + '"></span><span class="sb-d-nm">' + esc(s.name || ('MMSI ' + mmsi)) + '</span><button class="sb-d-x" type="button">✕</button></div>'
      + '<div class="sb-d-cat" style="color:' + cat.c + '">' + cat.l + '</div>'
      + '<div class="sb-d-sec">POSITION</div>'
      + row('Location', esc(locLabel(s.lat, s.lon)))
      + row('Coordinates', s.lat.toFixed(4) + '°, ' + s.lon.toFixed(4) + '°')
      + row('Speed', s.sog != null ? s.sog + ' kn' : '—') + row('Course', s.cog != null ? s.cog + '°' : '—')
      + row('Status', s.nav != null && NAV[s.nav] ? NAV[s.nav] : (s.nav != null ? 'Status ' + s.nav : null))
      + '<div class="sb-d-sec">VOYAGE</div>'
      + row('Destination (AIS)', s.dest ? esc(s.dest) : '<i>not broadcast yet</i>')
      + row('ETA (AIS)', s.eta ? esc(s.eta) : '<i>—</i>')
      + row('Departure port', '<i class="sb-d-na">not in AIS signal</i>')
      + row('Departure date', '<i class="sb-d-na">not in AIS signal</i>')
      + '<div class="sb-d-sec">VESSEL</div>'
      + row('MMSI', mmsi) + row('IMO', s.imo || '<i>—</i>') + row('Call sign', s.callsign ? esc(s.callsign) : '<i>—</i>')
      + row('Dimensions', s.length ? (s.length + ' × ' + s.beam + ' m') : '<i>—</i>') + row('Draught', s.draught ? (s.draught + ' m') : '<i>—</i>')
      + '<div class="sb-d-actions"><button class="sb-d-ai" type="button">✦ Full voyage &amp; history (AI)</button></div>'
      + '<div class="sb-d-foot">Live AIS. Departure port/date and full route aren’t broadcast in AIS — use ✦ AI to look them up from public sources.</div>';
    panel.hidden = false;
    panel.querySelector('.sb-d-x').addEventListener('click', function () { panel.hidden = true; focusMmsi = null; });
    panel.querySelector('.sb-d-ai').addEventListener('click', function () { askVoyageAi(s, mmsi); });
  }

  function askVoyageAi(s, mmsi) {
    var q = 'Give the full voyage details for the merchant vessel "' + (s.name || ('MMSI ' + mmsi)) + '"' + (s.imo ? ' (IMO ' + s.imo + ')' : '') + (s.dest ? ', currently bound for ' + s.dest : '') + '. Report: vessel type, flag, operator/owner, current status, departure (last) port and departure date, route, destination port and ETA, and recent port calls. Cite public sources such as MarineTraffic, VesselFinder or Equasis.';
    if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(q);
    else if (window.openGlobalAi) window.openGlobalAi();
  }

  function css() {
    if (document.getElementById('niy-sb-css')) return;
    var s = document.createElement('style'); s.id = 'niy-sb-css';
    s.textContent = ['#detail.niy-seaborne-on .niy-split{display:none!important}', '#niySeaborne{position:relative;padding:0 2px}',
      '.sb-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
      '.sb-title{font:700 13px var(--font-display,system-ui,sans-serif);letter-spacing:.05em;color:var(--fg,#eef2f6)}.sb-title .sb-dot{color:#eb5050;margin-right:6px}',
      '.sb-modes{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:8px;overflow:hidden}','.sb-mode{background:transparent;border:0;color:var(--fg-dim,#8a94a0);font:700 10px var(--font-mono,monospace);letter-spacing:.04em;padding:5px 12px;cursor:pointer;transition:background .15s}','.sb-mode.active{background:var(--ds-accent,#4a90d9);color:#fff}','.sb-lg-t{font:700 8px var(--font-mono,monospace);letter-spacing:.12em;color:var(--fg-faint,#525252);margin-right:2px;align-self:center}',
      '.sb-state{font:600 10px var(--font-mono,monospace);letter-spacing:.05em}.sb-state.on{color:#26b469}.sb-state.off{color:#c99a3f}.sb-state.bad{color:#ff6f6f}',
      '.sb-alert{display:flex;align-items:center;gap:10px;margin:0 0 8px;padding:8px 12px;border:1px solid rgba(255,111,111,.4);background:rgba(255,111,111,.08);border-radius:9px}',
      '.sb-alert[hidden]{display:none}',
      '.sb-alert-msg{flex:1;font-size:11.5px;color:var(--fg-dim,#9aa5b1);line-height:1.45}',
      '.sb-retry{background:transparent;border:1px solid rgba(255,111,111,.5);color:#ff8f8f;border-radius:7px;font-size:10.5px;font-weight:700;padding:4px 12px;cursor:pointer;white-space:nowrap}',
      '.sb-retry:hover{color:#fff;border-color:#ff6f6f}',
      '.sb-count{font:600 11px var(--font-mono,monospace);color:var(--fg-dim,#8a94a0)}',
      '.sb-search-wrap{position:relative;flex:1 1 200px;min-width:160px;max-width:320px}',
      '.sb-search{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:var(--fg,#eef2f6);border-radius:8px;padding:7px 11px;font:500 12px var(--font-display,system-ui,sans-serif);outline:none}.sb-search:focus{border-color:var(--ds-accent,#7fb0ff)}',
      '.sb-results{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:20;background:#12161c;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:5px;max-height:320px;overflow-y:auto;box-shadow:0 14px 34px rgba(0,0,0,.5)}.sb-results[hidden]{display:none}',
      '.sb-res{display:flex;align-items:center;gap:8px;width:100%;background:transparent;border:0;color:var(--fg,#eef2f6);padding:7px 9px;border-radius:6px;cursor:pointer;text-align:left}.sb-res:hover{background:rgba(255,255,255,.06)}',
      '.sb-res-sw{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 5px currentColor}.sb-res-nm{font:600 12px var(--font-display,system-ui,sans-serif);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sb-res-t{font:600 9px var(--font-mono,monospace);color:var(--fg-dim,#8a94a0)}',
      '.sb-res-empty{padding:12px;font-size:11px;color:var(--fg-dim,#8a94a0);line-height:1.5}.sb-res-empty b{color:var(--ds-accent,#7fb0ff)}',
      '.sb-region{margin-left:auto;display:flex;align-items:center;gap:8px}',
      '.sb-sel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:var(--fg,#eef2f6);border-radius:7px;padding:5px 9px;font:600 11px var(--font-mono,monospace);cursor:pointer}',
      '.sb-pause{background:transparent;border:1px solid rgba(255,255,255,.18);color:var(--fg-dim,#b9c2cc);border-radius:7px;padding:5px 11px;font:600 10px var(--font-mono,monospace);cursor:pointer}.sb-pause:hover{border-color:var(--ds-accent,#7fb0ff);color:var(--ds-accent,#7fb0ff)}',
      '.sb-mapwrap{position:relative;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;background:radial-gradient(120% 120% at 50% 0%,#0e1420,#0a0d13)}',
      /* Fill the pane instead of guessing a vh height. #detail is overflow:hidden,
         so a fixed 62vh canvas pushed the legend and status line past the clip
         line and they simply vanished. Flex means it always fits. */
      '#detail.niy-seaborne-on{display:flex;flex-direction:column;min-height:0}',
      '#detail.niy-seaborne-on>.detail-head,#detail.niy-seaborne-on>.toolbar-msg{flex:0 0 auto}',
      '#niySeaborne{display:flex;flex-direction:column;min-height:0;flex:1 1 auto}',
      '#niySeaborne .sb-mapwrap{flex:1 1 auto;min-height:150px}',
      '.sb-canvas{display:block;width:100%;height:100%}',
      '.sb-tip{position:absolute;pointer-events:none;background:rgba(10,14,20,.97);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:7px 9px;font:500 10.5px var(--font-mono,monospace);color:#eef2f6;z-index:5;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.55);display:none;max-width:230px}.sb-tip b{color:#fff}.sb-tip .k{color:#68717b}',
      '.sb-detail{position:absolute;top:12px;right:12px;width:290px;max-width:calc(100% - 24px);max-height:calc(100% - 24px);overflow-y:auto;z-index:8;background:rgba(12,16,22,.97);border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:13px 14px;box-shadow:0 16px 40px rgba(0,0,0,.6)}.sb-detail[hidden]{display:none}',
      '.sb-d-head{display:flex;align-items:center;gap:8px;margin-bottom:2px}.sb-d-sw{width:10px;height:10px;border-radius:50%;box-shadow:0 0 6px currentColor;flex:none}.sb-d-nm{font:700 13px var(--font-display,system-ui,sans-serif);color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sb-d-x{background:transparent;border:0;color:#9aa3ad;font-size:15px;cursor:pointer}.sb-d-x:hover{color:#fff}',
      '.sb-d-cat{font:600 10px var(--font-mono,monospace);margin-bottom:10px}',
      '.sb-d-sec{font:700 8.5px var(--font-mono,monospace);letter-spacing:.09em;color:#68717b;margin:11px 0 5px;border-top:1px solid rgba(255,255,255,.07);padding-top:8px}',
      '.sb-d-row{display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.6}.sb-d-k{color:#68717b}.sb-d-v{color:var(--fg,#eef2f6);text-align:right;font-family:var(--font-mono,monospace);font-size:10.5px}.sb-d-v i{color:#68717b;font-style:italic}.sb-d-na{color:#7a6b52!important}',
      '.sb-d-actions{margin-top:12px}.sb-d-ai{width:100%;background:rgba(127,176,255,.12);border:1px solid rgba(127,176,255,.35);color:var(--ds-accent,#7fb0ff);font:600 11px var(--font-display,system-ui,sans-serif);padding:8px;border-radius:8px;cursor:pointer}.sb-d-ai:hover{background:rgba(127,176,255,.2)}',
      '.sb-d-foot{font-size:9px;color:#68717b;margin-top:9px;line-height:1.5}',
      /* one dense row, no pills — a terminal legend, not a tag cloud */
      '.sb-legend{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:2px;margin-top:7px;flex:0 0 auto;scrollbar-width:none}',
      '.sb-legend::-webkit-scrollbar{display:none}',
      '.sb-lg{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;font:600 10px var(--font-mono,monospace);letter-spacing:.02em;color:var(--fg-dim,#9aa5b1);white-space:nowrap;transition:background .12s,color .12s;user-select:none}',
      '.sb-lg.off{opacity:.35}.sb-lg:hover{background:rgba(255,255,255,.06);color:var(--fg,#eef2f6)}',
      '.sb-lg .sw{width:7px;height:7px;border-radius:50%;flex:none}',
      '.sb-lg .n{font:700 10px var(--font-mono,monospace);color:var(--fg,#eef2f6);font-variant-numeric:tabular-nums}',
      '.sb-foot{flex:0 0 auto;font:600 9px var(--font-mono,monospace);letter-spacing:.1em;color:#5a636e;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'].join('');
    document.head.appendChild(s);
  }
  function buildDom() {
    var detail = document.getElementById('detail'); if (!detail) return false;
    if (document.getElementById('niySeaborne')) return true;
    css(); detail.classList.add('niy-seaborne-on');
    var host = detail.querySelector('.niy-col-body') || detail;
    var el = document.createElement('div'); el.id = 'niySeaborne';
    el.innerHTML = '<div class="sb-head"><span class="sb-title"><span class="sb-dot">●</span>TRANSIT</span><span class="sb-modes"><button class="sb-mode' + (mode === 'sea' ? ' active' : '') + '" data-mode="sea" type="button">⚓ SHIPS</button><button class="sb-mode' + (mode === 'air' ? ' active' : '') + '" data-mode="air" type="button">✈ AIR</button></span><span class="sb-state off" id="sbState">connecting…</span><span class="sb-count" id="sbCount">0 ships</span>'
      + '<span class="sb-search-wrap"><input class="sb-search" id="sbSearch" type="text" placeholder="🔍 Search a ship by name…" autocomplete="off"/><div class="sb-results" id="sbResults" hidden></div></span>'
      + '<span class="sb-region"><select class="sb-sel" id="sbRegion">' + REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (r.id === region.id ? ' selected' : '') + '>' + r.l + '</option>'; }).join('') + '</select><button class="sb-pause" id="sbPause" type="button">⏸ Pause</button></span></div>'
      + '<div class="sb-alert" id="sbAlert" hidden><span class="sb-alert-msg"></span><button class="sb-retry" id="sbRetry" type="button">Retry now</button></div>'
      + '<div class="sb-mapwrap"><canvas class="sb-canvas" id="sbCanvas"></canvas><div class="sb-tip" id="sbTip"></div><div class="sb-detail" id="sbDetail" hidden></div></div>'
      + '<div class="sb-legend" id="sbLegend">' + CAT_ORDER.map(function (k) { return '<span class="sb-lg" data-cat="' + k + '" style="color:' + CATS[k].c + '"><span class="sw" style="background:' + CATS[k].c + '"></span>' + CATS[k].l + ' <span class="n" id="sbc-' + k + '">0</span></span>'; }).join('') + '</div>'
      + '<div class="sb-foot" id="sbFoot">AISSTREAM.IO</div>';
    var split = detail.querySelector('.niy-split');
    if (split && split.parentElement) split.parentElement.insertBefore(el, split); else host.insertBefore(el, host.firstChild);
    canvas = document.getElementById('sbCanvas'); ctx = canvas.getContext('2d'); tip = document.getElementById('sbTip');
    var sel = document.getElementById('sbRegion'); sel.addEventListener('change', function () { var r = REGIONS.filter(function (x) { return x.id === sel.value; })[0]; if (r) { region = r; if (mode === 'air') { aircraft.clear(); airHover = null; airPoll(); } else { ships.clear(); focusMmsi = null; provider = 'aisstream'; connect(); clearTimeout(mount._fb); mount._fb = setTimeout(function () { if (mode === 'sea' && active && !ships.size) vesselFetch(true); }, 15000); } } });
    document.getElementById('sbPause').addEventListener('click', function () { if (active) { stopWS(); stopAir(); active = false; this.textContent = '▶ Resume'; wsState = 'paused'; } else { active = true; if (mode === 'air') startAir(); else connect(); this.textContent = '⏸ Pause'; } });
    document.getElementById('sbRetry').addEventListener('click', function () { this.textContent = 'Retrying…'; var b = this; if (mode === 'air') retryNow(); else vesselFetch(true); setTimeout(function () { b.textContent = 'Retry now'; }, 2500); });
    var srch = document.getElementById('sbSearch'); srch.addEventListener('input', function () { doSearch(srch.value); }); srch.addEventListener('focus', function () { if (srch.value.trim().length >= 2) doSearch(srch.value); });
    document.addEventListener('click', function (e) { var box = document.getElementById('sbResults'); if (box && !box.hidden && !box.contains(e.target) && e.target !== srch) box.hidden = true; });
    if (!buildDom._tog) { buildDom._tog = 1; document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#niySeaborne .sb-mode'); if (b) setMode(b.dataset.mode); }); } renderLegend();
    canvas.addEventListener('mousemove', onHover); canvas.addEventListener('mouseleave', function () { hover = null; if (tip) tip.style.display = 'none'; });
    /* V2 PASS 32 — zoom + pan */
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); var r = canvas.getBoundingClientRect(); viewZoom(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    var panSt = null;
    canvas.addEventListener('pointerdown', function (e) { if (view.z <= 1.001) return; panSt = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; panned = false; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} });
    canvas.addEventListener('pointermove', function (e) { if (!panSt) return; var r = canvas.getBoundingClientRect(), b = bb(); var dx = e.clientX - panSt.x, dy = e.clientY - panSt.y; if (Math.abs(dx) + Math.abs(dy) > 4) panned = true; view.cx = panSt.cx - dx / r.width * (b[2] - b[0]); view.cy = panSt.cy + dy / r.height * (b[3] - b[1]); });
    canvas.addEventListener('pointerup', function () { panSt = null; });
    canvas.addEventListener('pointercancel', function () { panSt = null; });
    var mw = el.querySelector('.sb-mapwrap');
    if (mw && !mw.querySelector('.sb-zoom')) {
      var zc = document.createElement('div'); zc.className = 'sb-zoom';
      zc.innerHTML = '<button type="button" data-z="in" title="Zoom in">+</button><span id="sbZoomLvl">1x</span><button type="button" data-z="out" title="Zoom out">\u2212</button><button type="button" data-z="reset" title="Reset view">\u2302</button>';
      zc.addEventListener('click', function (e) { var btn = e.target.closest('button'); if (!btn) return; var r = canvas.getBoundingClientRect(); if (btn.dataset.z === 'in') viewZoom(1.4, r.width / 2, r.height / 2); else if (btn.dataset.z === 'out') viewZoom(0.72, r.width / 2, r.height / 2); else { view.z = 1; view.cx = null; view.cy = null; var zl = document.getElementById('sbZoomLvl'); if (zl) zl.textContent = '1x'; } });
      mw.appendChild(zc);
    }
    canvas.addEventListener('click', function () { if (panned) { panned = false; return; } if (mode === 'air') { if (airHover) openAirDetail(airHover); } else if (hover) openDetail(hover.mmsi); });
    return true;
  }
  function onHover(ev) {
    if (mode === 'air') return onHoverAir(ev);
    if (!canvas) return; var r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, best = null, bd = 14 * 14;
    ships.forEach(function (s) { if (!inBB(s.lon, s.lat) || !filter[s.cat]) return; var p = proj(s.lon, s.lat, r.width, r.height), dx = p[0] - mx, dy = p[1] - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = s; } });
    hover = best; canvas.style.cursor = best ? 'pointer' : 'default';
    if (best && tip) { tip.innerHTML = '<b>' + (best.name ? esc(best.name) : ('MMSI ' + best.mmsi)) + '</b><br><span class="k">Type</span> ' + (CATS[best.cat] || CATS.other).l + '<br><span class="k">Speed</span> ' + (best.sog != null ? best.sog + ' kn' : '—') + (best.dest ? '<br><span class="k">Dest</span> ' + esc(best.dest) : '') + '<br><span class="k">click for detail</span>'; var p = proj(best.lon, best.lat, r.width, r.height); tip.style.left = Math.min(r.width - 180, p[0] + 12) + 'px'; tip.style.top = Math.max(2, p[1] - 8) + 'px'; tip.style.display = 'block'; }
    else if (tip) tip.style.display = 'none';
  }

  function mount() { if (!buildDom()) { setTimeout(mount, 300); return; } if (!mount._loaded) { mount._loaded = 1; loadVessels(); loadSnapshot(); } active = true; if (mode === 'air') startAir(); else { if (wsState !== 'live' && wsState !== 'connecting') connect(); clearTimeout(mount._fb); mount._fb = setTimeout(function () { if (mode === 'sea' && active && !ships.size) vesselFetch(); }, 15000); } startRender(); if (!mount._prune) mount._prune = setInterval(prune, 60000); if (!mount._caps) mount._caps = setInterval(enforceCaps, 1500); }
  function unmount() { var el = document.getElementById('niySeaborne'), detail = document.getElementById('detail'); if (detail) detail.classList.remove('niy-seaborne-on'); if (!el && !active) return; if (el) el.remove(); stopRender(); active = false; focusMmsi = null; stopWS(); stopDigitraffic(); stopAir(); saveVessels(); clearInterval(mount._prune); mount._prune = null; clearInterval(mount._caps); mount._caps = null; canvas = ctx = tip = null; }

  window.NiySeaborne = { mount: mount, unmount: unmount, search: doSearch, open: openDetail, _ships: ships };

  var deb = null;
  function maybeMount() { var a = (window.niyActive ? window.niyActive() : null) || {}, on = a.tier === 'geopolitics' && a.csv === 'seaborne_ais'; if (on) { if (!document.getElementById('niySeaborne')) mount(); } else if (active || document.getElementById('niySeaborne')) unmount(); }
  function startObs() { var d = document.getElementById('detail'); if (!d) { setTimeout(startObs, 400); return; } new MutationObserver(function () { clearTimeout(deb); deb = setTimeout(maybeMount, 140); }).observe(d, { childList: true }); maybeMount(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs); else startObs();
})();

