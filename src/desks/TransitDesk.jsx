import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AIR_ALT,
  CAT_ORDER,
  CATS,
  DEFAULT_FILTER,
  NAV,
  REGIONS,
  aisCat,
  altColor,
  applyViewZoom,
  inBB,
  locLabel,
  proj,
  rowFromAir,
  rowFromShip,
  sourceLabel,
  utcHm,
  viewBox,
  zoomLabel,
} from '../lib/transit.js';

const TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

function bboxQuery(b) {
  return `lamin=${b[1].toFixed(3)}&lamax=${b[3].toFixed(3)}&lomin=${b[0].toFixed(3)}&lomax=${b[2].toFixed(3)}`;
}

function drawSat(ctx, cssW, cssH, b, tiles) {
  const PI = Math.PI;
  const t = Math.log(Math.tan(Math.PI / 4 + (Math.max(-85.05, Math.min(85.05, b[3])) * Math.PI) / 360));
  const m = Math.log(Math.tan(Math.PI / 4 + (Math.max(-85.05, Math.min(85.05, b[1])) * Math.PI) / 360));
  const fx0 = (b[0] + 180) / 360;
  const fx1 = (b[2] + 180) / 360;
  const fy0 = (PI - t) / (2 * PI);
  const fy1 = (PI - m) / (2 * PI);
  let z = Math.max(2, Math.min(12, Math.round(Math.log(cssW / 256 / Math.max(1e-6, fx1 - fx0)) / Math.LN2)));
  let sc = 2 ** z;
  while (z > 2 && (Math.floor(fx1 * sc) - Math.floor(fx0 * sc) + 1) * (Math.floor(fy1 * sc) - Math.floor(fy0 * sc) + 1) > 48) {
    z -= 1;
    sc = 2 ** z;
  }
  const x0 = Math.floor(fx0 * sc);
  const x1 = Math.floor(fx1 * sc);
  const y0 = Math.floor(fy0 * sc);
  const y1 = Math.floor(fy1 * sc);
  ctx.fillStyle = '#0A121C';
  ctx.fillRect(0, 0, cssW, cssH);
  let drew = 0;
  for (let ty = Math.max(0, y0); ty <= Math.min(sc - 1, y1); ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const img = tiles.get(z, ((tx % sc) + sc) % sc, ty);
      if (!img) continue;
      const dx0 = ((tx / sc - fx0) / (fx1 - fx0)) * cssW;
      const dx1 = (((tx + 1) / sc - fx0) / (fx1 - fx0)) * cssW;
      const dy0 = ((ty / sc - fy0) / (fy1 - fy0)) * cssH;
      const dy1 = (((ty + 1) / sc - fy0) / (fy1 - fy0)) * cssH;
      try {
        ctx.drawImage(img, dx0, dy0, dx1 - dx0 + 0.6, dy1 - dy0 + 0.6);
        drew += 1;
      } catch {
        /* tainted or incomplete tile */
      }
    }
  }
  if (drew) {
    ctx.fillStyle = 'rgba(5,9,15,.22)';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '9px ui-monospace,monospace';
    ctx.textAlign = 'right';
    ctx.fillText('© Esri World Imagery', cssW - 8, cssH - 7);
    ctx.textAlign = 'left';
  }
  return drew > 0;
}

function makeTileCache() {
  const cache = {};
  let loading = 0;
  return {
    get(z, x, y) {
      const key = `${z}/${y}/${x}`;
      const t = cache[key];
      if (t) return t.ok ? t.img : null;
      if (loading > 22) return null;
      if (Object.keys(cache).length > 420) {
        for (const k of Object.keys(cache)) delete cache[k];
      }
      const img = new Image();
      loading += 1;
      cache[key] = { img, ok: false };
      img.onload = () => {
        cache[key].ok = true;
        loading -= 1;
      };
      img.onerror = () => {
        loading -= 1;
      };
      img.src = `${TILE}/${z}/${y}/${x}`;
      return null;
    },
  };
}

function Row({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="sb-d-row">
      <span className="sb-d-k">{k}</span>
      <span className="sb-d-v">{v}</span>
    </div>
  );
}

export default function TransitDesk({ onFeed, onSelect, onLoading, reload }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const shipsRef = useRef(new Map());
  const airRef = useRef(new Map());
  const viewRef = useRef({ z: 1, cx: null, cy: null, rid: null });
  const filterRef = useRef({ ...DEFAULT_FILTER });
  const regionRef = useRef(REGIONS[1]);
  const modeRef = useRef('sea');
  const pausedRef = useRef(false);
  const hoverRef = useRef(null);
  const focusRef = useRef(null);
  const panRef = useRef(null);
  const pannedRef = useRef(false);
  const pulseRef = useRef(0);
  const tilesRef = useRef(makeTileCache());
  const hitsRef = useRef([]);
  const countsHold = useRef(Object.fromEntries(CAT_ORDER.map((k) => [k, 0])));
  const providerRef = useRef('');
  const lastLiveRef = useRef(0);
  const lastErrRef = useRef('');
  const abortRef = useRef(null);

  const [mode, setMode] = useState('sea');
  const [regionId, setRegionId] = useState('india');
  const [paused, setPaused] = useState(false);
  const [wsState, setWsState] = useState('connecting');
  const [count, setCount] = useState(0);
  const [counts, setCounts] = useState(() => Object.fromEntries(CAT_ORDER.map((k) => [k, 0])));
  const [filter, setFilter] = useState({ ...DEFAULT_FILTER });
  const [zLabel, setZLabel] = useState('1x');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [tip, setTip] = useState(null);
  const [panel, setPanel] = useState(null);
  const [foot, setFoot] = useState('LIVE AIS');
  const [alert, setAlert] = useState('');
  const [tick, setTick] = useState(0);

  const region = useMemo(() => REGIONS.find((r) => r.id === regionId) || REGIONS[1], [regionId]);
  const liveOn = wsState === 'live';
  const liveLabel = liveOn ? '✓ LIVE FEED' : wsState === 'connecting' ? 'CONNECTING' : wsState === 'paused' ? 'PAUSED' : 'FEED OFFLINE';

  const visibleList = useMemo(() => {
    const b = viewBox(regionRef.current, viewRef.current);
    if (mode === 'air') {
      return [...airRef.current.values()].filter((a) => inBB(a.lon, a.lat, b));
    }
    return [...shipsRef.current.values()].filter((s) => inBB(s.lon, s.lat, b) && filterRef.current[s.cat]);
  }, [mode, tick, regionId, filter]);

  const publishFeed = useCallback(
    (state, n, provider) => {
      const rows =
        modeRef.current === 'air'
          ? [...airRef.current.values()].slice(0, 80).map(rowFromAir)
          : [...shipsRef.current.values()].slice(0, 80).map(rowFromShip);
      onFeed?.({
        ok: true,
        feature: 'Transit',
        rows,
        source: {
          adapter: 'api',
          kind: 'transit',
          note: sourceLabel(provider || providerRef.current, modeRef.current),
        },
        fallback: false,
        coverage: { exhaustive: false },
      });
      onLoading?.(false);
    },
    [onFeed, onLoading],
  );

  const poll = useCallback(async () => {
    if (pausedRef.current) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const b = viewBox(regionRef.current, viewRef.current);
    const sea = modeRef.current === 'sea';
    if (!shipsRef.current.size && !airRef.current.size) setWsState('connecting');
    try {
      const url = sea ? `/api/ships?${bboxQuery(b)}` : `/api/air?${bboxQuery(b)}`;
      const res = await fetch(url, { signal: ac.signal });
      const d = await res.json();
      if (ac.signal.aborted) return;
      if (d.error && !(d.ships || d.aircraft || []).length) {
        lastErrRef.current = d.error;
        setWsState(shipsRef.current.size || airRef.current.size ? 'live' : 'offline');
        setAlert(d.error);
        publishFeed('offline', 0, d.source);
        return;
      }
      if (sea) {
        const next = new Map();
        for (const s of d.ships || d.vessels || []) {
          if (s.lat == null || s.lon == null || s.mmsi == null) continue;
          next.set(s.mmsi, {
            ...s,
            cat: s.cat || aisCat(s.type),
            name: String(s.name || '').trim(),
            ts: Date.now(),
          });
        }
        shipsRef.current = next;
        providerRef.current = d.source || 'digitraffic';
      } else {
        const next = new Map();
        for (const a of d.aircraft || []) {
          if (a.lat == null || a.lon == null || !a.icao) continue;
          next.set(a.icao, { ...a, ts: Date.now() });
        }
        airRef.current = next;
        providerRef.current = d.source || 'opensky';
      }
      lastLiveRef.current = Date.now();
      lastErrRef.current = '';
      setAlert('');
      setWsState('live');
      setTick((n) => n + 1);
      publishFeed('live', sea ? shipsRef.current.size : airRef.current.size, d.source);
    } catch (e) {
      if (e.name === 'AbortError') return;
      lastErrRef.current = e.message || String(e);
      setWsState(shipsRef.current.size || airRef.current.size ? 'live' : 'offline');
      setAlert(lastErrRef.current);
    }
  }, [publishFeed]);

  useEffect(() => {
    modeRef.current = mode;
    regionRef.current = region;
    pausedRef.current = paused;
    filterRef.current = filter;
  }, [mode, region, paused, filter]);

  useEffect(() => {
    onLoading?.(true);
    shipsRef.current = new Map();
    airRef.current = new Map();
    hoverRef.current = null;
    focusRef.current = null;
    setPanel(null);
    setQuery('');
    setResults([]);
    setWsState('connecting');
    poll();
    const id = setInterval(poll, 60000);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [mode, regionId, reload, poll, onLoading]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    const loop = () => {
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW && cssH) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
          canvas.width = Math.round(cssW * dpr);
          canvas.height = Math.round(cssH * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        const b = viewBox(regionRef.current, viewRef.current);
        drawSat(ctx, cssW, cssH, b, tilesRef.current);
        pulseRef.current += 0.05;
        const hits = [];
        if (modeRef.current === 'air') {
          airRef.current.forEach((a) => {
            if (!inBB(a.lon, a.lat, b)) return;
            const p = proj(a.lon, a.lat, cssW, cssH, b);
            const col = altColor(a.alt);
            const isHov = hoverRef.current && hoverRef.current.icao === a.icao;
            ctx.save();
            ctx.translate(p[0], p[1]);
            ctx.rotate(((a.hdg || 0) * Math.PI) / 180);
            ctx.globalAlpha = isHov ? 1 : 0.92;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, -5.5);
            ctx.lineTo(3.5, 4.6);
            ctx.lineTo(0, 2.2);
            ctx.lineTo(-3.5, 4.6);
            ctx.closePath();
            ctx.fill();
            if (isHov) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.restore();
            hits.push({ x: p[0], y: p[1], ship: null, air: a });
          });
        } else {
          const nextCounts = Object.fromEntries(CAT_ORDER.map((k) => [k, 0]));
          shipsRef.current.forEach((s) => {
            if (!inBB(s.lon, s.lat, b)) return;
            nextCounts[s.cat] = (nextCounts[s.cat] || 0) + 1;
            if (!filterRef.current[s.cat]) return;
            const p = proj(s.lon, s.lat, cssW, cssH, b);
            const col = (CATS[s.cat] || CATS.other).c;
            ctx.globalAlpha = s.cat === 'other' && shipsRef.current.size > 150 ? 0.6 : 1;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(p[0], p[1], s.cat === 'other' && shipsRef.current.size > 150 ? 1.5 : 2.4, 0, 6.283);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.85)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(p[0], p[1], 2.4, 0, 6.283);
            ctx.stroke();
            ctx.globalAlpha = 1;
            hits.push({ x: p[0], y: p[1], ship: s, air: null });
          });
          countsHold.current = nextCounts;
        }
        hitsRef.current = hits;
        const mark = focusRef.current || hoverRef.current;
        if (mark && mark.lon != null && inBB(mark.lon, mark.lat, b)) {
          const hp = proj(mark.lon, mark.lat, cssW, cssH, b);
          const pulse = 0.5 + 0.5 * Math.sin(pulseRef.current);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(hp[0], hp[1], 9 + (focusRef.current ? 3 * pulse : 0), 0, 6.283);
          ctx.stroke();
          if (focusRef.current && (mark.name || mark.flt)) {
            ctx.fillStyle = '#fff';
            ctx.font = '11px ui-monospace,monospace';
            ctx.fillText(mark.name || mark.flt, hp[0] + 12, hp[1] - 8);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onWh = (ev) => {
      ev.preventDefault();
      const r = canvas.getBoundingClientRect();
      applyViewZoom(viewRef.current, regionRef.current, ev.deltaY < 0 ? 1.25 : 0.8, ev.clientX - r.left, ev.clientY - r.top, canvas);
      setZLabel(zoomLabel(viewRef.current.z));
    };
    canvas.addEventListener('wheel', onWh, { passive: false });
    const hud = setInterval(() => {
      const vis = hitsRef.current.length;
      setCount((n) => (n === vis ? n : vis));
      const next = countsHold.current;
      setCounts((prev) => (CAT_ORDER.every((k) => prev[k] === next[k]) ? prev : { ...next }));
    }, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hud);
      canvas.removeEventListener('wheel', onWh);
    };
  }, []);

  useEffect(() => {
    const n = count;
    const src = sourceLabel(providerRef.current, mode);
    const hhmm = utcHm(wsState === 'live' ? Date.now() : lastLiveRef.current);
    if (mode === 'air') {
      setFoot(
        `${(providerRef.current || 'OPENSKY NETWORK').toUpperCase()} · ${
          wsState === 'live' ? `${n} AIRCRAFT · ${hhmm}` : wsState.toUpperCase()
        }`,
      );
    } else {
      setFoot(
        `${src} · ${
          wsState === 'live'
            ? `${n} VESSELS · ${hhmm}`
            : wsState === 'offline'
              ? lastLiveRef.current
                ? `OFFLINE · LAST ${hhmm}`
                : 'OFFLINE'
              : wsState.toUpperCase()
        }`,
      );
    }
  }, [count, wsState, mode, tick]);

  function hitAt(mx, my) {
    let best = null;
    let bd = 14 * 14;
    for (const h of hitsRef.current) {
      const d = (h.x - mx) ** 2 + (h.y - my) ** 2;
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  function openShip(s) {
    if (!s) return;
    focusRef.current = s;
    hoverRef.current = s;
    setPanel({ kind: 'ship', ship: s });
    onSelect?.(rowFromShip(s));
  }

  function openAir(a) {
    if (!a) return;
    focusRef.current = a;
    hoverRef.current = a;
    setPanel({ kind: 'air', air: a });
    onSelect?.(rowFromAir(a));
  }

  function openLive() {
    if (panel?.kind === 'live') {
      closePanel();
      return;
    }
    setPanel({ kind: 'live' });
    setTick((n) => n + 1);
  }

  function onCanvasMove(ev) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left;
    const my = ev.clientY - r.top;
    if (panRef.current) {
      const b = viewBox(regionRef.current, viewRef.current);
      const dx = ev.clientX - panRef.current.x;
      const dy = ev.clientY - panRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) pannedRef.current = true;
      viewRef.current.cx = panRef.current.cx - (dx / r.width) * (b[2] - b[0]);
      viewRef.current.cy = panRef.current.cy + (dy / r.height) * (b[3] - b[1]);
      return;
    }
    const h = hitAt(mx, my);
    const item = h ? h.ship || h.air : null;
    hoverRef.current = item;
    canvas.style.cursor = item ? 'pointer' : viewRef.current.z > 1.001 ? 'grab' : 'default';
    if (item) {
      const b = viewBox(regionRef.current, viewRef.current);
      const p = proj(item.lon, item.lat, r.width, r.height, b);
      if (item.mmsi) {
        setTip({
          x: Math.min(r.width - 180, p[0] + 12),
          y: Math.max(2, p[1] - 8),
          html: true,
          title: item.name || `MMSI ${item.mmsi}`,
          lines: [
            ['Type', (CATS[item.cat] || CATS.other).l],
            ['Speed', item.sog != null ? `${item.sog} kn` : '—'],
            item.dest ? ['Dest', item.dest] : null,
            ['', 'click for detail'],
          ].filter(Boolean),
        });
      } else {
        setTip({
          x: Math.min(r.width - 180, p[0] + 12),
          y: Math.max(2, p[1] - 8),
          title: item.flt || item.icao,
          lines: [
            ['Alt', item.alt != null ? `${item.alt} m` : '—'],
            ['Speed', item.vel != null ? `${Math.round(item.vel * 1.944)} kn` : '—'],
            ['Heading', item.hdg != null ? `${item.hdg}°` : '—'],
            ['', item.country || ''],
          ],
        });
      }
    } else setTip(null);
  }

  function onCanvasDown(ev) {
    if (viewRef.current.z <= 1.001) return;
    panRef.current = {
      x: ev.clientX,
      y: ev.clientY,
      cx: viewRef.current.cx,
      cy: viewRef.current.cy,
    };
    pannedRef.current = false;
    try {
      canvasRef.current.setPointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onCanvasUp() {
    panRef.current = null;
  }

  function onCanvasClick() {
    if (pannedRef.current) {
      pannedRef.current = false;
      return;
    }
    const item = hoverRef.current;
    if (!item) return;
    if (mode === 'air') openAir(item);
    else openShip(item);
  }

  function zoom(kind) {
    const r = canvasRef.current.getBoundingClientRect();
    if (kind === 'in') applyViewZoom(viewRef.current, regionRef.current, 1.4, r.width / 2, r.height / 2, canvasRef.current);
    else if (kind === 'out') applyViewZoom(viewRef.current, regionRef.current, 0.72, r.width / 2, r.height / 2, canvasRef.current);
    else {
      viewRef.current.z = 1;
      viewRef.current.cx = null;
      viewRef.current.cy = null;
    }
    setZLabel(zoomLabel(viewRef.current.z));
  }

  function onSearch(v) {
    setQuery(v);
    const q = v.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const pool = mode === 'air' ? [...airRef.current.values()] : [...shipsRef.current.values()];
    const out = pool.filter((s) => {
      const name = String(s.name || s.flt || s.icao || s.mmsi || '').toLowerCase();
      return name.includes(q);
    });
    setResults(out.slice(0, 14));
    setShowResults(true);
  }

  function closePanel() {
    setPanel(null);
    focusRef.current = null;
    onSelect?.(null);
  }

  const stateClass = wsState === 'live' ? 'on' : wsState === 'offline' ? 'bad' : 'off';
  const stateText =
    wsState === 'live'
      ? '● LIVE'
      : wsState === 'connecting'
        ? 'connecting…'
        : wsState === 'offline'
          ? '⚠ FEED OFFLINE'
          : wsState === 'paused'
            ? '❚❚ paused'
            : wsState === 'closed'
              ? 'reconnecting…'
              : wsState;

  const ship = panel?.kind === 'ship' ? panel.ship : null;
  const air = panel?.kind === 'air' ? panel.air : null;
  const cat = ship ? CATS[ship.cat] || CATS.other : null;

  return (
    <div className="desk desk-wide transit-desk">
      <div className="feed-head">
        <h1>TRANSIT</h1>
        <button
          type="button"
          className={`live-feed ${liveOn ? 'on' : ''}`}
          onClick={openLive}
          aria-pressed={Boolean(panel)}
          title="Open live traffic details"
        >
          {liveLabel}
        </button>
        <span className="muted transit-src">{sourceLabel(providerRef.current, mode)}</span>
      </div>
      <div id="niySeaborne">
        <div className="sb-head">
          <span className="sb-title">
            <span className="sb-dot">●</span>TRANSIT
          </span>
          <span className="sb-modes">
            <button type="button" className={`sb-mode${mode === 'sea' ? ' active' : ''}`} data-mode="sea" onClick={() => setMode('sea')}>
              ⚓ SHIPS
            </button>
            <button type="button" className={`sb-mode${mode === 'air' ? ' active' : ''}`} data-mode="air" onClick={() => setMode('air')}>
              ✈ AIR
            </button>
          </span>
          <span className={`sb-state ${stateClass}`}>{stateText}</span>
          <span className="sb-count">
            {count} {mode === 'air' ? 'aircraft' : 'ships'}
          </span>
          <span className="sb-search-wrap">
            <input
              className="sb-search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowResults(true)}
              placeholder={mode === 'air' ? 'Search a flight by callsign…' : 'Search a ship by name…'}
              autoComplete="off"
            />
            {showResults && (
              <div className="sb-results">
                {results.length === 0 ? (
                  <div className="sb-res-empty">
                    No {mode === 'air' ? 'flight' : 'vessel'} in view matches “{query}”. Switch region or wait as more positions arrive.
                  </div>
                ) : (
                  results.map((s) => (
                    <button
                      key={s.mmsi || s.icao}
                      className="sb-res"
                      type="button"
                      onClick={() => {
                        setShowResults(false);
                        if (s.icao) openAir(s);
                        else openShip(s);
                      }}
                    >
                      <span className="sb-res-sw" style={{ background: s.icao ? altColor(s.alt) : (CATS[s.cat] || CATS.other).c }} />
                      <span className="sb-res-nm">{s.name || s.flt || s.icao || `MMSI ${s.mmsi}`}</span>
                      <span className="sb-res-t">{s.icao ? 'AIR' : (CATS[s.cat] || CATS.other).l.split(' · ')[0]}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </span>
          <span className="sb-region">
            <select
              className="sb-sel"
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                viewRef.current = { z: 1, cx: null, cy: null, rid: null };
                setZLabel('1x');
              }}
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.l}
                </option>
              ))}
            </select>
            <button
              className="sb-pause"
              type="button"
              onClick={() => {
                const next = !paused;
                setPaused(next);
                pausedRef.current = next;
                if (next) setWsState('paused');
                else {
                  setWsState('connecting');
                  poll();
                }
              }}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </span>
        </div>
        {alert && wsState === 'offline' && (
          <div className="sb-alert">
            <span className="sb-alert-msg">
              {mode === 'air'
                ? `Air feed unavailable: ${alert}. OpenSky / adsb.fi / adsb.lol all failed from this network.`
                : `Live vessel AIS is unavailable (${alert}). Baltic coverage is open via Digitraffic; India & chokepoints need an AISStream key on the server.`}
            </span>
            <button className="sb-retry" type="button" onClick={poll}>
              Retry now
            </button>
          </div>
        )}
        <div className="sb-mapwrap" ref={wrapRef}>
          <canvas
            className="sb-canvas"
            ref={canvasRef}
            onMouseMove={onCanvasMove}
            onMouseLeave={() => {
              hoverRef.current = null;
              setTip(null);
            }}
            onPointerDown={onCanvasDown}
            onPointerUp={onCanvasUp}
            onPointerCancel={onCanvasUp}
            onClick={onCanvasClick}
          />
          {tip && (
            <div className="sb-tip" style={{ left: tip.x, top: tip.y, display: 'block' }}>
              <b>{tip.title}</b>
              {tip.lines.map((ln, i) => (
                <div key={i}>
                  {ln[0] ? <span className="k">{ln[0]} </span> : null}
                  {ln[1]}
                </div>
              ))}
            </div>
          )}
          {panel && (
            <div className="sb-detail">
              {panel.kind === 'live' && (
                <>
                  <div className="sb-d-head">
                    <span className="sb-d-sw" style={{ background: liveOn ? '#26b469' : '#c99a3f' }} />
                    <span className="sb-d-nm">Live {mode === 'air' ? 'air' : 'traffic'}</span>
                    <button className="sb-d-x" type="button" onClick={closePanel}>
                      ✕
                    </button>
                  </div>
                  <div className="sb-d-cat" style={{ color: liveOn ? '#26b469' : '#c99a3f' }}>
                    {stateText} · {region.l}
                  </div>
                  <div className="sb-d-sec">FEED</div>
                  <Row k="Source" v={sourceLabel(providerRef.current, mode)} />
                  <Row k="In view" v={`${visibleList.length} ${mode === 'air' ? 'aircraft' : 'ships'}`} />
                  <Row k="Updated" v={lastLiveRef.current ? utcHm(lastLiveRef.current) : '—'} />
                  {lastErrRef.current ? <Row k="Note" v={lastErrRef.current} /> : null}
                  <div className="sb-d-sec">{mode === 'air' ? 'AIRCRAFT' : 'VESSELS'}</div>
                  {visibleList.length === 0 ? (
                    <p className="sb-d-foot">
                      No live positions in this view yet. {mode === 'sea' ? 'Try Baltic · Gulf of Finland, or switch to AIR.' : 'Wait for the next OpenSky sweep, or pick another region.'}
                    </p>
                  ) : (
                    <div className="sb-live-list">
                      {visibleList.slice(0, 18).map((s) => (
                        <button
                          key={s.mmsi || s.icao}
                          type="button"
                          className="sb-res"
                          onClick={() => (s.icao ? openAir(s) : openShip(s))}
                        >
                          <span className="sb-res-sw" style={{ background: s.icao ? altColor(s.alt) : (CATS[s.cat] || CATS.other).c }} />
                          <span className="sb-res-nm">{s.name || s.flt || s.icao || `MMSI ${s.mmsi}`}</span>
                          <span className="sb-res-t">
                            {s.icao ? (s.alt != null ? `${Math.round(s.alt / 1000)} km` : '') : (CATS[s.cat] || CATS.other).l.split(' · ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="sb-d-foot">Click a marker on the map, or a row here, for position and identity. AIS does not carry a recommendation.</div>
                </>
              )}
              {ship && (
                <>
                  <div className="sb-d-head">
                    <span className="sb-d-sw" style={{ background: cat.c }} />
                    <span className="sb-d-nm">{ship.name || `MMSI ${ship.mmsi}`}</span>
                    <button className="sb-d-x" type="button" onClick={closePanel}>
                      ✕
                    </button>
                  </div>
                  <div className="sb-d-cat" style={{ color: cat.c }}>
                    {cat.l}
                  </div>
                  <div className="sb-d-sec">POSITION</div>
                  <Row k="Location" v={locLabel(ship.lat, ship.lon)} />
                  <Row k="Coordinates" v={`${ship.lat.toFixed(4)}°, ${ship.lon.toFixed(4)}°`} />
                  <Row k="Speed" v={ship.sog != null ? `${ship.sog} kn` : '—'} />
                  <Row k="Course" v={ship.cog != null ? `${ship.cog}°` : '—'} />
                  <Row k="Status" v={ship.nav != null && NAV[ship.nav] ? NAV[ship.nav] : ship.nav != null ? `Status ${ship.nav}` : null} />
                  <div className="sb-d-sec">VOYAGE</div>
                  <Row k="Destination (AIS)" v={ship.dest || 'not broadcast yet'} />
                  <Row k="ETA (AIS)" v={ship.eta || '—'} />
                  <div className="sb-d-sec">VESSEL</div>
                  <Row k="MMSI" v={ship.mmsi} />
                  <Row k="IMO" v={ship.imo || '—'} />
                  <Row k="Call sign" v={ship.callsign || '—'} />
                  <Row k="Dimensions" v={ship.length ? `${ship.length} × ${ship.beam} m` : '—'} />
                  <Row k="Draught" v={ship.draught ? `${ship.draught} m` : '—'} />
                  <div className="sb-d-foot">Live AIS. Departure port and full route are not in the broadcast.</div>
                </>
              )}
              {air && (
                <>
                  <div className="sb-d-head">
                    <span className="sb-d-sw" style={{ background: altColor(air.alt) }} />
                    <span className="sb-d-nm">{air.flt || air.icao}</span>
                    <button className="sb-d-x" type="button" onClick={closePanel}>
                      ✕
                    </button>
                  </div>
                  <div className="sb-d-cat" style={{ color: altColor(air.alt) }}>
                    Aircraft · {air.cat || 'unknown'}
                  </div>
                  <div className="sb-d-sec">POSITION</div>
                  <Row k="Coordinates" v={`${air.lat.toFixed(4)}°, ${air.lon.toFixed(4)}°`} />
                  <Row k="Altitude" v={air.alt != null ? `${air.alt} m` : '—'} />
                  <Row k="Ground speed" v={air.vel != null ? `${Math.round(air.vel * 1.944)} kn` : '—'} />
                  <Row k="Heading" v={air.hdg != null ? `${air.hdg}°` : '—'} />
                  <Row
                    k="Vertical rate"
                    v={air.vrate != null ? (air.vrate > 0.5 ? '↑ climbing' : air.vrate < -0.5 ? '↓ descending' : 'level') : '—'}
                  />
                  <div className="sb-d-sec">AIRCRAFT</div>
                  <Row k="Callsign" v={air.flt || '—'} />
                  <Row k="ICAO 24-bit" v={air.icao} />
                  <Row k="Registered" v={air.country || '—'} />
                </>
              )}
            </div>
          )}
          <div className="sb-zoom">
            <button type="button" title="Zoom in" onClick={() => zoom('in')}>
              +
            </button>
            <span>{zLabel}</span>
            <button type="button" title="Zoom out" onClick={() => zoom('out')}>
              −
            </button>
            <button type="button" title="Reset view" onClick={() => zoom('reset')}>
              ⌂
            </button>
          </div>
        </div>
        <div className="sb-legend">
          {mode === 'air' ? (
            <>
              <span className="sb-lg-t">ALTITUDE</span>
              {AIR_ALT.map((x) => (
                <span key={x[2]} className="sb-lg" style={{ color: x[1] }}>
                  <span className="sw" style={{ background: x[1] }} />
                  {x[2]}
                </span>
              ))}
            </>
          ) : (
            CAT_ORDER.map((k) => (
              <span
                key={k}
                className={`sb-lg${filter[k] ? '' : ' off'}`}
                style={{ color: CATS[k].c }}
                onClick={() => setFilter((f) => ({ ...f, [k]: !f[k] }))}
              >
                <span className="sw" style={{ background: CATS[k].c }} />
                {CATS[k].l} <span className="n">{counts[k] || 0}</span>
              </span>
            ))
          )}
        </div>
        <div className="sb-foot">{foot}</div>
      </div>
    </div>
  );
}
