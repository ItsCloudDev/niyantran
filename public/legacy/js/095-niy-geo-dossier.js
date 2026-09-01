
/* Niyantran — GEOPOLITICS intelligence-dossier engine.
   A reusable renderer that takes over #detail with a dense, Bloomberg/Janes-style
   multi-panel dossier (KPIs · dotted map · charts · timeline · entity cards ·
   AI panel · watchlist · sources). Modules register a renderer against a feature
   marker (dataSource.csv). Mounted via the same #detail MutationObserver pattern
   SEABORNE uses. Data comes from embedded namespaced JSON — swap for an API with
   one line. All maps are pure vector dots; no tiles, no photos. */
(function () {
  'use strict';
  if (window.NiyGeo) return;

  var REG = {};
  function register(marker, fn) { REG[marker] = fn; }
  function active() { try { return window.niyActive() || {}; } catch (e) { return {}; } }

  /* ---------- shared UI atoms (Bloomberg-dense) ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var STATUS = {
    'active': { c: '#ff6f6f', l: 'ACTIVE' }, 'escalating': { c: '#ff8f3f', l: 'ESCALATING' },
    'ceasefire-fragile': { c: '#f0b429', l: 'CEASEFIRE · FRAGILE' }, 'under-review': { c: '#7fb0ff', l: 'UNDER REVIEW' }
  };
  function statusOf(s) { return STATUS[s] || { c: '#8a94a0', l: (s || '').toUpperCase() }; }
  function kpi(v, k, tone) { return '<div class="geo-kpi"><div class="geo-kpi-v' + (tone ? ' ' + tone : '') + '">' + esc(v) + '</div><div class="geo-kpi-k">' + esc(k) + '</div></div>'; }
  function panel(title, right, body) {
    return '<section class="geo-panel"><div class="geo-panel-h"><span>' + esc(title) + '</span>' + (right || '') + '</div><div class="geo-panel-b">' + body + '</div></section>';
  }
  function bar(label, pct, val, color) {
    return '<div class="geo-bar"><span class="geo-bar-l">' + esc(label) + '</span><span class="geo-bar-t"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%;background:' + (color || 'var(--ds-accent,#7fb0ff)') + '"></i></span><span class="geo-bar-v">' + esc(val) + '</span></div>';
  }

  /* ---------- dotted world map (one-shot canvas draw, not animated) ---------- */
  var LAND = null;
  function landCells() {
    if (LAND) return LAND; var m = window.NIY_LANDMAP; if (!m) return (LAND = []);
    var bytes = atob(m.b), cells = [];
    for (var i = 0; i < m.w * m.h; i++) { if (bytes.charCodeAt(i >> 3) & (1 << (i & 7))) { var gy = Math.floor(i / m.w), gx = i % m.w; cells.push([-180 + (gx + 0.5) / m.w * 360, 90 - (gy + 0.5) / m.h * 180]); } }
    return (LAND = cells);
  }
  function proj(lon, lat, w, h) { return [(lon + 180) / 360 * w, (90 - lat) / 180 * h]; }
  function drawMap(canvas, points, tip) {
    if (!canvas) return; var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) { setTimeout(function () { drawMap(canvas, points, tip); }, 200); return; }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
    // ocean gradient wash
    var og = ctx.createLinearGradient(0, 0, 0, cssH); og.addColorStop(0, 'rgba(16,26,44,.55)'); og.addColorStop(1, 'rgba(7,11,20,.78)');
    ctx.fillStyle = og; ctx.fillRect(0, 0, cssW, cssH);
    // graticule — faint lat/long grid (Palantir-style)
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(96,128,168,.075)';
    for (var lon = -150; lon <= 150; lon += 30) { var ga = proj(lon, 84, cssW, cssH), gb = proj(lon, -84, cssW, cssH); ctx.beginPath(); ctx.moveTo(ga[0], ga[1]); ctx.lineTo(gb[0], gb[1]); ctx.stroke(); }
    for (var lat = -60; lat <= 60; lat += 30) { var gc = proj(-180, lat, cssW, cssH), gd = proj(180, lat, cssW, cssH); ctx.beginPath(); ctx.moveTo(gc[0], gc[1]); ctx.lineTo(gd[0], gd[1]); ctx.stroke(); }
    var e0 = proj(-180, 0, cssW, cssH), e1 = proj(180, 0, cssW, cssH); ctx.strokeStyle = 'rgba(96,128,168,.15)'; ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.stroke();
    // land — cool-tinted dots
    var lc = landCells(); ctx.fillStyle = 'rgba(150,184,109,.26)';
    for (var i = 0; i < lc.length; i++) { var p = proj(lc[i][0], lc[i][1], cssW, cssH); ctx.beginPath(); ctx.arc(p[0], p[1], .9, 0, 6.283); ctx.fill(); }
    // points — layered halo, ring for hot spots, bright core
    canvas._pts = points.map(function (pt) {
      var p = proj(pt.lon, pt.lat, cssW, cssH), inten = pt.intensity || 40, r = 3 + inten / 100 * 9, col = pt.color;
      var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 2.5);
      g.addColorStop(0, col); g.addColorStop(.42, col + '66'); g.addColorStop(1, col + '00');
      ctx.globalAlpha = .92; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r * 2.5, 0, 6.283); ctx.fill();
      if (inten >= 70) { ctx.globalAlpha = .5; ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p[0], p[1], r + 3.5, 0, 6.283); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 2.7, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(p[0], p[1], 1.1, 0, 6.283); ctx.fill();
      return { x: p[0], y: p[1], r: r * 2.5, d: pt };
    });
    ctx.globalAlpha = 1;
  }

  function wireMap(canvas, tip, onClick) {
    canvas.addEventListener('mousemove', function (e) {
      var rc = canvas.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top, hit = null;
      (canvas._pts || []).forEach(function (pt) { var dx = mx - pt.x, dy = my - pt.y; if (dx * dx + dy * dy < (pt.r + 4) * (pt.r + 4)) hit = pt; });
      if (hit) { tip.hidden = false; tip.style.left = (hit.x + 12) + 'px'; tip.style.top = (hit.y - 8) + 'px'; tip.innerHTML = '<b>' + esc(hit.d.name) + '</b><br>' + esc(hit.d.statusL) + ' · intensity ' + hit.d.intensity; canvas.style.cursor = 'pointer'; }
      else { tip.hidden = true; canvas.style.cursor = 'default'; }
    });
    canvas.addEventListener('mouseleave', function () { tip.hidden = true; });
    canvas.addEventListener('click', function (e) {
      var rc = canvas.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top;
      (canvas._pts || []).forEach(function (pt) { var dx = mx - pt.x, dy = my - pt.y; if (dx * dx + dy * dy < (pt.r + 4) * (pt.r + 4)) onClick(pt.d); });
    });
  }

  /* ---------- AI + export bridges ---------- */
  function askAI(prompt) { try { if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(prompt); else if (window.openGlobalAi) window.openGlobalAi(); } catch (e) { } }
  function exportJSON(name, obj) {
    try {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    } catch (e) { }
  }
  function toast(m) { try { if (typeof window.toast === 'function') window.toast(m); } catch (e) { } }

  /* watchlist (browser-local) */
  function wlKey() { return 'niyGeoWatch'; }
  function watch() { try { return JSON.parse(localStorage.getItem(wlKey()) || '[]'); } catch (e) { return []; } }
  function toggleWatch(id) { var w = watch(), i = w.indexOf(id); if (i > -1) w.splice(i, 1); else w.push(id); try { localStorage.setItem(wlKey(), JSON.stringify(w)); } catch (e) { } return w.indexOf(id) > -1; }

  /* ---------- mount / unmount ---------- */
  function host() { var det = document.getElementById('detail'); return det && det.querySelector('#niyGeoDossier'); }
  function mount(marker) {
    var det = document.getElementById('detail'); if (!det) return;
    var el = host();
    if (el && el.dataset.marker === marker && el.parentElement === det) return;
    if (el) el.remove();
    el = document.createElement('div'); el.id = 'niyGeoDossier'; el.dataset.marker = marker;
    // MUST be a DIRECT child of #detail — inserting it inside .niy-split means
    // the "hide the feed" rule collapses the dossier along with the feed.
    var split = null;
    [].slice.call(det.children).forEach(function (ch) { if (!split && ch.classList && (ch.classList.contains('niy-split') || ch.classList.contains('niy-col-feed'))) split = ch; });
    if (split) det.insertBefore(el, split); else det.appendChild(el);
    det.classList.add('niy-geo-on');
    try { REG[marker](el, { esc: esc, panel: panel, kpi: kpi, bar: bar, statusOf: statusOf, drawMap: drawMap, wireMap: wireMap, askAI: askAI, exportJSON: exportJSON, toast: toast, watch: watch, toggleWatch: toggleWatch }); } catch (e) { el.innerHTML = '<div class="geo-err">Dossier failed to render: ' + esc(e.message) + '</div>'; }
  }
  function unmount() { var det = document.getElementById('detail'); if (det) det.classList.remove('niy-geo-on'); var el = host(); if (el) el.remove(); }
  function maybeMount() {
    var a = active();
    if (a.tier === 'geopolitics' && REG[a.csv]) mount(a.csv);
    else unmount();
  }

  /* ---------- styles ---------- */
  function css() {
    if (document.getElementById('niy-geo-css')) return;
    var s = document.createElement('style'); s.id = 'niy-geo-css';
    s.textContent = [
      // #detail is fixed-height + overflow:hidden, so the dossier must be a flex
      // child that fills the remaining space and scrolls internally.
      '#detail.niy-geo-on{display:flex!important;flex-direction:column;min-height:0}',
      '#detail.niy-geo-on>.detail-head,#detail.niy-geo-on>.toolbar-msg{flex:0 0 auto}',
      '#detail.niy-geo-on>.niy-split,#detail.niy-geo-on>.niy-col-feed{display:none!important}',
      '#niyGeoDossier{flex:1 1 auto;min-height:0;overflow-y:auto;padding:2px 4px 30px;color:var(--fg,#e9edf2);font-family:var(--font-display,system-ui,sans-serif)}',
      '.geo-err{color:#ff6f6f;font-size:12px;padding:16px}',
      '.geo-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 10px}',
      '.geo-top .geo-risk{font:800 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;padding:3px 9px;border-radius:5px;background:rgba(255,111,111,.14);color:#ff6f6f}',
      '.geo-top .geo-asof{font:600 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;color:var(--fg-faint,#606a77)}',
      '.geo-top .geo-actions{margin-left:auto;display:flex;gap:6px}',
      '.geo-btn{background:transparent;border:1px solid var(--line,#232a33);color:var(--fg-dim,#98a3af);border-radius:7px;font:600 10px var(--font-display,system-ui,sans-serif);padding:4px 11px;cursor:pointer;white-space:nowrap}',
      '.geo-btn:hover{color:var(--fg,#e9edf2);border-color:var(--line2,#333c48)}',
      '.geo-btn.pri{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
      '.geo-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px}',
      '.geo-kpi{background:var(--panel,#12151b);border:1px solid var(--line,#232a33);border-radius:9px;padding:9px 11px}',
      '.geo-kpi-v{font:700 18px var(--font-mono,ui-monospace,monospace);letter-spacing:-.01em;line-height:1;font-variant-numeric:tabular-nums}',
      '.geo-kpi-v.bad{color:#ff6f6f}.geo-kpi-v.warn{color:#f0b429}.geo-kpi-v.acc{color:var(--ds-accent,#7fb0ff)}',
      '.geo-kpi-k{margin-top:6px;font:600 8.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-faint,#606a77)}',
      '.geo-grid{display:grid;grid-template-columns:1.55fr 1fr;gap:12px;align-items:start}',
      '.geo-panel{background:var(--panel,#12151b);border:1px solid var(--line,#232a33);border-radius:11px;overflow:hidden;margin-bottom:12px}',
      '.geo-panel-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line,#232a33);font:700 9.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-dim,#98a3af)}',
      '.geo-panel-b{padding:11px 12px}',
      '.geo-mapwrap{position:relative;border:1px solid var(--line,#232a33);border-radius:11px;overflow:hidden;background:radial-gradient(120% 120% at 50% 0%,#0e1420,#0a0d13);margin-bottom:12px}',
      '.geo-map{display:block;width:100%;height:clamp(240px,32vh,340px)}',
      '.geo-map-legend{position:absolute;left:10px;bottom:9px;display:flex;gap:11px;flex-wrap:wrap;font:600 9px var(--font-mono,ui-monospace,monospace)}',
      '.geo-map-legend span{display:inline-flex;align-items:center;gap:4px;color:var(--fg-dim,#98a3af)}',
      '.geo-map-legend i{width:7px;height:7px;border-radius:50%}',
      '.geo-tip{position:absolute;pointer-events:none;background:rgba(10,14,20,.97);border:1px solid var(--line2,#333c48);border-radius:7px;padding:6px 8px;font:600 10px var(--font-mono,ui-monospace,monospace);color:#eef2f6;z-index:5;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.5)}',
      '.geo-tip[hidden]{display:none}.geo-tip b{color:#fff}',
      '.geo-bar{display:flex;align-items:center;gap:9px;margin:5px 0;font-size:11px}',
      '.geo-bar-l{flex:0 0 40%;color:var(--fg-dim,#c3cbd4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.geo-bar-t{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}',
      '.geo-bar-t i{display:block;height:100%;border-radius:3px}',
      '.geo-bar-v{flex:0 0 auto;font:700 10px var(--font-mono,ui-monospace,monospace);color:var(--fg,#e9edf2);font-variant-numeric:tabular-nums}',
      '.geo-tl{position:relative;padding-left:14px}',
      '.geo-tl-i{position:relative;padding:0 0 11px 12px;border-left:1px solid var(--line2,#333c48)}',
      '.geo-tl-i:last-child{border-left-color:transparent}',
      '.geo-tl-i::before{content:"";position:absolute;left:-4px;top:3px;width:7px;height:7px;border-radius:50%;background:var(--ds-accent,#7fb0ff)}',
      '.geo-tl-i.critical::before{background:#ff6f6f}.geo-tl-i.high::before{background:#ff8f3f}.geo-tl-i.medium::before{background:#f0b429}',
      '.geo-tl-d{font:700 8.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.05em;color:var(--fg-faint,#606a77)}',
      '.geo-tl-t{font-size:11.5px;color:var(--fg-dim,#c3cbd4);margin-top:2px;line-height:1.4}.geo-tl-t b{color:var(--fg,#e9edf2)}',
      '.geo-card{border:1px solid var(--line,#232a33);border-radius:10px;margin-bottom:8px;overflow:hidden;scroll-margin-top:8px}',
      '.geo-card.hl{border-color:var(--ds-accent,#7fb0ff);box-shadow:0 0 0 1px var(--ds-accent,#7fb0ff)}',
      '.geo-card-h{display:flex;align-items:center;gap:8px;padding:8px 11px;cursor:pointer}',
      '.geo-card-h:hover{background:rgba(255,255,255,.03)}',
      '.geo-card-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor}',
      '.geo-card-nm{font:650 12.5px var(--font-display,system-ui,sans-serif);color:var(--fg,#e9edf2);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.geo-card-st{font:800 8px var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;padding:2px 6px;border-radius:4px;white-space:nowrap}',
      '.geo-card-int{font:700 10px var(--font-mono,ui-monospace,monospace);color:var(--fg-dim,#98a3af);width:30px;text-align:right}',
      '.geo-star{background:transparent;border:0;cursor:pointer;color:var(--fg-faint,#5f6873);font-size:13px;flex:none}.geo-star.on{color:#f0b429}',
      '.geo-card-b{display:none;padding:0 11px 11px 27px;font-size:11px}',
      '.geo-card.open .geo-card-b{display:block}',
      '.geo-fields{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:4px 0 8px}',
      '.geo-fields dt{font:700 8.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint,#68717b);white-space:nowrap}',
      '.geo-fields dd{margin:0;color:var(--fg-dim,#c3cbd4);line-height:1.4}',
      '.geo-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}',
      '.geo-chip{font:600 9.5px var(--font-mono,ui-monospace,monospace);padding:2px 7px;border-radius:999px;border:1px solid var(--line2,#333c48);color:var(--fg-dim,#98a3af)}',
      '.geo-card-latest{color:var(--fg,#e9edf2);line-height:1.5;margin:2px 0 7px}',
      '.geo-src{display:flex;flex-wrap:wrap;gap:8px;font:600 9.5px var(--font-mono,ui-monospace,monospace)}',
      '.geo-src a{color:var(--ds-accent,#7fb0ff);text-decoration:none}.geo-src a:hover{text-decoration:underline}',
      '.geo-ai{border:1px solid rgba(127,176,255,.3);background:rgba(127,176,255,.05);border-radius:11px;padding:12px;margin-bottom:12px}',
      '.geo-ai h4{margin:0 0 6px;font:700 10px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--ds-accent,#7fb0ff)}',
      '.geo-ai p{margin:0 0 9px;font-size:11.5px;color:var(--fg-dim,#c3cbd4);line-height:1.5}',
      '.geo-ai-q{display:flex;flex-wrap:wrap;gap:5px}',
      '.geo-ai-q button{background:transparent;border:1px solid var(--line2,#333c48);color:var(--fg-dim,#98a3af);border-radius:999px;font:600 10px var(--font-display,system-ui,sans-serif);padding:3px 10px;cursor:pointer}',
      '.geo-ai-q button:hover{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
      '.geo-ceasefire{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#232a33);font-size:11px}',
      '.geo-ceasefire:last-child{border-bottom:0}.geo-ceasefire .n{color:var(--fg-dim,#c3cbd4)}',
      '.geo-frag{font:700 8px var(--font-mono,ui-monospace,monospace);padding:2px 6px;border-radius:4px;background:rgba(240,180,41,.14);color:#f0b429}',
      // entity monogram grid (leaders, minerals)
      '.geo-egrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}',
      '.geo-e{border:1px solid var(--line,#232a33);border-radius:10px;padding:10px;background:var(--panel-2,#141821)}',
      '.geo-e-h{display:flex;align-items:center;gap:9px;margin-bottom:7px}',
      '.geo-mono{width:34px;height:34px;border-radius:8px;flex:none;display:grid;place-items:center;font:800 13px var(--font-mono,ui-monospace,monospace);color:#0b0f14}',
      '.geo-e-nm{font:650 12.5px var(--font-display,system-ui,sans-serif);color:var(--fg,#e9edf2);line-height:1.15}',
      '.geo-e-sub{font:600 9.5px var(--font-mono,ui-monospace,monospace);color:var(--fg-faint,#68717b);margin-top:1px}',
      '.geo-e-meta{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:10.5px;margin-bottom:6px}',
      '.geo-e-meta dt{font:700 8px var(--font-mono,ui-monospace,monospace);letter-spacing:.04em;text-transform:uppercase;color:var(--fg-faint,#68717b);white-space:nowrap}',
      '.geo-e-meta dd{margin:0;color:var(--fg-dim,#c3cbd4)}',
      '.geo-e-latest{font-size:10.5px;color:var(--fg-dim,#98a3af);line-height:1.45;border-top:1px solid var(--line,#232a33);padding-top:6px}',
      '.geo-e-flag{font-size:17px;line-height:1}',
      '.geo-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:11.5px}',
      '.geo-kv dt{font:700 8.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint,#68717b)}',
      '.geo-kv dd{margin:0;color:var(--fg,#e9edf2);font:700 11.5px var(--font-mono,ui-monospace,monospace);text-align:right;font-variant-numeric:tabular-nums}',
      '.geo-filter{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}',
      '.geo-filter button{background:transparent;border:1px solid var(--line,#232a33);color:var(--fg-dim,#98a3af);border-radius:999px;font:600 10px var(--font-mono,ui-monospace,monospace);padding:3px 11px;cursor:pointer}',
      '.geo-filter button.on{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
      '@media(max-width:900px){.geo-kpis{grid-template-columns:repeat(3,1fr)}.geo-grid{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  function boot() {
    css();
    var det = document.getElementById('detail');
    if (!det) return setTimeout(boot, 400);
    maybeMount();
    new MutationObserver(function () { maybeMount(); }).observe(det, { childList: true, subtree: false });
    var t = null;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { var c = document.querySelector('#niyGeoDossier .geo-map'); if (c && c._redraw) c._redraw(); }, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* ============================================================
     GENERIC dossier renderer — spec-driven, so each new module is
     mostly DATA. spec = { risk, asOf, subtitle, kpis, map, left, right,
     ai, sources, exportName, exportData }. Panels: {title,kind,data}.
     ============================================================ */
  function renderPanelBody(kind, data, el) {
    if (kind === 'bars') return data.map(function (b) { return uiBar(b.label, b.pct, b.val, b.color); }).join('');
    if (kind === 'kv') return '<dl class="geo-kv">' + data.map(function (r) { return '<dt>' + escG(r[0]) + '</dt><dd>' + escG(r[1]) + '</dd>'; }).join('') + '</dl>';
    if (kind === 'timeline') return '<div class="geo-tl">' + data.map(function (t) { return '<div class="geo-tl-i ' + (t.sev || '') + '"><div class="geo-tl-d">' + escG(t.date) + (t.region ? ' · ' + escG(t.region) : '') + '</div><div class="geo-tl-t">' + escG(t.text) + '</div></div>'; }).join('') + '</div>';
    if (kind === 'grid') return '<div class="geo-egrid">' + data.map(function (e) {
      return '<div class="geo-e"><div class="geo-e-h">'
        + (e.flag ? '<span class="geo-e-flag">' + e.flag + '</span>' : '<span class="geo-mono" style="background:' + (e.monoColor || 'var(--ds-accent,#7fb0ff)') + '">' + escG(e.mono || '?') + '</span>')
        + '<div><div class="geo-e-nm">' + escG(e.title) + '</div>' + (e.sub ? '<div class="geo-e-sub">' + escG(e.sub) + '</div>' : '') + '</div></div>'
        + (e.meta && e.meta.length ? '<dl class="geo-e-meta">' + e.meta.map(function (m) { return '<dt>' + escG(m[0]) + '</dt><dd>' + escG(m[1]) + '</dd>'; }).join('') + '</dl>' : '')
        + (e.latest ? '<div class="geo-e-latest">' + escG(e.latest) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    if (kind === 'cards') return data.map(function (c) {
      return '<div class="geo-card" id="gc-' + escG(c.id) + '"><div class="geo-card-h" data-tog="1">'
        + '<span class="geo-card-dot" style="color:' + (c.dotColor || '#8a94a0') + ';background:' + (c.dotColor || '#8a94a0') + '"></span>'
        + '<span class="geo-card-nm">' + escG(c.title) + '</span>'
        + (c.badge ? '<span class="geo-card-st" style="background:' + (c.badgeColor || '#8a94a0') + '22;color:' + (c.badgeColor || '#8a94a0') + '">' + escG(c.badge) + '</span>' : '')
        + (c.right != null ? '<span class="geo-card-int">' + escG(c.right) + '</span>' : '')
        + '</div><div class="geo-card-b">'
        + (c.fields && c.fields.length ? '<dl class="geo-fields">' + c.fields.map(function (f) { return '<dt>' + escG(f[0]) + '</dt><dd>' + escG(f[1]) + '</dd>'; }).join('') + '</dl>' : '')
        + (c.chips || []).map(function (g) { return '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:4px 0 3px">' + escG(g[0]) + '</div><div class="geo-chips">' + g[1].filter(Boolean).map(function (x) { return '<span class="geo-chip">' + escG(x) + '</span>'; }).join('') + '</div>'; }).join('')
        + (c.latest ? '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:6px 0 3px">LATEST</div><div class="geo-card-latest">' + escG(c.latest) + '</div>' : '')
        + (c.sources && c.sources.length ? '<div class="geo-src">' + c.sources.map(function (s) { return '<a href="' + escG(s[1]) + '" target="_blank" rel="noopener">' + escG(s[0]) + ' ↗</a>'; }).join('') + '</div>' : '')
        + '</div></div>';
    }).join('');
    return kind === 'html' ? data : '';
  }
  var escG = esc, uiBar = bar;
  function renderGeneric(el, U, spec) {
    var kpis = '<div class="geo-kpis">' + spec.kpis.map(function (k) { return U.kpi(k[0], k[1], k[2] || ''); }).join('') + '</div>';
    var mapHtml = '';
    if (spec.map) {
      mapHtml = '<div class="geo-mapwrap"><canvas class="geo-map" id="geoMap"></canvas><div class="geo-tip" id="geoTip" hidden></div>'
        + '<div class="geo-map-legend">' + (spec.map.legend || []).map(function (l) { return '<span><i style="background:' + l[0] + '"></i>' + escG(l[1]) + '</span>'; }).join('') + '</div></div>';
    }
    function col(list) { return (list || []).map(function (p) { return U.panel(p.title, p.right || '', renderPanelBody(p.kind, p.data, el)); }).join(''); }
    var ai = spec.ai ? '<div class="geo-ai"><h4>◆ AI Intelligence Summary</h4><p>' + escG(spec.ai.summary) + '</p><div class="geo-ai-q">' + spec.ai.prompts.map(function (q) { return '<button data-q="' + escG(q[1]) + '">' + escG(q[0]) + '</button>'; }).join('') + '</div></div>' : '';
    var sources = spec.sources ? U.panel('Sources & Methodology', '', '<div style="font-size:10.5px;color:var(--fg-dim,#98a3af);line-height:1.7"><div class="geo-src" style="display:inline">' + spec.sources.map(function (s) { return '<a href="' + escG(s[1]) + '" target="_blank" rel="noopener">' + escG(s[0]) + ' ↗</a>'; }).join(' · ') + '</div><div style="margin-top:6px">Curated from public sources; figures are estimates unless cited. ' + escG(spec.asOf || '') + '.</div></div>') : '';

    el.innerHTML =
      '<div class="geo-top"><span class="geo-risk">' + escG(spec.risk || 'INTELLIGENCE') + '</span><span class="geo-asof">' + escG(spec.subtitle || '') + '</span>'
      + '<span class="geo-actions"><button class="geo-btn" id="geoExport">Export JSON</button><button class="geo-btn pri" id="geoAsk">Ask AI</button></span></div>'
      + kpis + mapHtml
      + '<div class="geo-grid"><div>' + col(spec.left) + '</div><div>' + ai + col(spec.right) + sources + '</div></div>';

    // map wiring
    if (spec.map) {
      var canvas = el.querySelector('#geoMap'), tip = el.querySelector('#geoTip');
      canvas._redraw = function () { U.drawMap(canvas, spec.map.points, tip); }; canvas._redraw();
      U.wireMap(canvas, tip, function (d) { var c = el.querySelector('#gc-' + d.id); if (c) { c.classList.add('open', 'hl'); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { c.classList.remove('hl'); }, 1500); } });
    }
    // card toggles
    el.querySelectorAll('[data-tog]').forEach(function (h) { h.addEventListener('click', function () { h.parentElement.classList.toggle('open'); }); });
    // AI + export
    el.querySelectorAll('.geo-ai-q button').forEach(function (b) { b.addEventListener('click', function () { U.askAI(b.dataset.q); }); });
    var ask = el.querySelector('#geoAsk'); if (ask && spec.ai) ask.addEventListener('click', function () { U.askAI(spec.ai.prompts[0][1]); });
    var exp = el.querySelector('#geoExport'); if (exp) exp.addEventListener('click', function () { U.exportJSON('niyantran-' + (spec.exportName || 'export'), spec.exportData || {}); U.toast('Exported ' + (spec.exportName || 'data') + '.json'); });
  }

  /* ---- MODULE 2 · SANCTIONS ---- */
  register('geo_sanctions', function (el, U) {
    var D = window.NIY_GEO_SANCTIONS; if (!D) { el.innerHTML = '<div class="geo-err">Sanctions dataset missing.</div>'; return; }
    var progs = D.programs.map(function (p) { var s = U.statusOf(p.status); return Object.assign({}, p, { color: s.c, statusL: s.l }); });
    renderGeneric(el, U, {
      risk: 'SANCTIONS · ACTIVE', subtitle: 'AS OF ' + D.meta.asOf.toUpperCase() + ' · ' + D.stats.programs + ' PROGRAMMES', asOf: D.meta.asOf,
      kpis: [[D.stats.programs, 'Active programmes', 'warn'], [D.stats.entitiesListed, 'Entities listed', 'bad'], [D.stats.jurisdictions, 'Jurisdictions', 'acc'], [D.stats.sectorsHit, 'Sectors hit'], [D.stats.newDesignations30d, 'New · 30 days', 'warn'], [progs.length, 'Major programmes']],
      map: { points: progs.map(function (p) { return { name: p.name, lat: p.lat, lon: p.lon, intensity: p.intensity, color: p.color, statusL: p.statusL, id: p.id }; }), legend: [['#ff6f6f', 'Active'], ['#ff8f3f', 'Escalating']] },
      left: [
        { title: 'Designations by target', kind: 'bars', data: D.byTarget.map(function (b) { return { label: b.t, pct: b.n / 6300 * 100, val: b.n, color: b.i > 80 ? '#ff6f6f' : b.i > 60 ? '#ff8f3f' : '#f0b429' }; }) },
        { title: 'Recent designations', kind: 'timeline', data: D.timeline },
        { title: 'Major sanctions programmes · ' + progs.length, kind: 'cards', data: progs.map(function (p) { return { id: p.id, title: p.name, dotColor: p.color, badge: p.statusL, badgeColor: p.color, right: p.intensity, fields: [['Issuer', p.issuer], ['Target', p.target], ['Reason', p.reason], ['Entities', p.entities]], chips: [['SECTORS', p.sectors]], latest: p.impact, sources: p.sources }; }) }
      ],
      right: [{ title: 'Coverage', kind: 'kv', data: [['Programmes', D.stats.programs], ['Entities', D.stats.entitiesListed], ['Jurisdictions', D.stats.jurisdictions], ['New / 30d', D.stats.newDesignations30d]] }],
      ai: { summary: 'Russia remains the most heavily sanctioned state in history (' + D.byTarget[0].n + '+ listings), with enforcement shifting to the shadow fleet and third-country evaders. Iran and DPRK evade via China-linked buyers and crypto. The frontier is secondary sanctions on Chinese dual-use exporters.', prompts: [['Enforcement gaps', 'Where are the biggest enforcement gaps in the current Russia sanctions regime, and what closes them?'], ['Secondary-sanctions risk', 'Which sectors face the highest secondary-sanctions risk from exposure to Russia and Iran?'], ['Market impact', 'How are these sanctions actually moving oil and commodity flows right now?']] },
      sources: [['OFAC SDN', 'https://sanctionssearch.ofac.treas.gov/'], ['EU sanctions map', 'https://www.sanctionsmap.eu/'], ['UK OFSI', 'https://www.gov.uk/government/organisations/office-of-financial-sanctions-implementation'], ['UN Security Council', 'https://www.un.org/securitycouncil/sanctions/information']],
      exportName: 'sanctions', exportData: D
    });
  });

  /* ---- MODULE 3 · LEADERS ---- */
  register('geo_leaders', function (el, U) {
    var D = window.NIY_GEO_LEADERS; if (!D) { el.innerHTML = '<div class="geo-err">Leaders dataset missing.</div>'; return; }
    renderGeneric(el, U, {
      risk: 'WORLD LEADERS', subtitle: 'AS OF ' + D.meta.asOf.toUpperCase() + ' · ' + D.leaders.length + ' PROFILES', asOf: D.meta.asOf,
      kpis: [[D.stats.tracked, 'Leaders tracked', 'acc'], [D.stats.autocracies, 'Autocracies', 'warn'], [D.stats.electionsThisYear, 'Elections · this year'], [D.stats.avgTenure, 'Avg tenure'], [D.leaders.length, 'Profiled'], ['24/7', 'Statement watch', 'acc']],
      left: [{ title: 'Leader profiles · ' + D.leaders.length, kind: 'grid', data: D.leaders.map(function (l) { return { flag: l.flag, title: l.name, sub: l.country + ' · ' + l.role, meta: [['Party', l.party], ['Ideology', l.ideology], ['Since', l.since + (l.age ? ' · age ' + l.age : '')]], latest: l.latest }; }) }],
      right: [{ title: 'By government type', kind: 'kv', data: [['Democracies', D.stats.tracked - D.stats.autocracies], ['Autocracies', D.stats.autocracies], ['Elections / yr', D.stats.electionsThisYear], ['Avg tenure', D.stats.avgTenure]] }],
      ai: { summary: 'The tracked cohort skews toward long-tenure strongmen (Putin 1999-, Xi 2012-, Erdogan 2014-). Democratic incumbents face fragmented parliaments and fiscal constraint. Watch succession/health risk in the Gulf and the impact of 2026 elections on Ukraine support.', prompts: [['Succession risk', 'Which tracked leaders carry the highest succession or stability risk in the next 24 months, and why?'], ['Alignment map', 'Group these leaders by their real strategic alignment (US-led, China-Russia, non-aligned) with reasoning.'], ['Elections ahead', 'Which upcoming elections most affect global geopolitics and how?']] },
      sources: [['Wikidata', 'https://www.wikidata.org/'], ['CIA World Factbook', 'https://www.cia.gov/the-world-factbook/'], ['Government portals', 'https://www.gov.uk/']],
      exportName: 'leaders', exportData: D
    });
  });

  /* ---- MODULE 4 · CHOKEPOINTS ---- */
  register('geo_chokepoints', function (el, U) {
    var D = window.NIY_GEO_CHOKEPOINTS; if (!D) { el.innerHTML = '<div class="geo-err">Chokepoints dataset missing.</div>'; return; }
    var pts = D.points.map(function (p) { var s = U.statusOf(p.status); return Object.assign({}, p, { color: s.c, statusL: s.l }); });
    renderGeneric(el, U, {
      risk: 'MARITIME CHOKEPOINTS', subtitle: 'AS OF ' + D.meta.asOf.toUpperCase() + ' · ' + D.stats.chokepoints + ' TRACKED', asOf: D.meta.asOf,
      kpis: [[D.stats.chokepoints, 'Chokepoints', 'acc'], [D.stats.oilTransitMbd, 'Oil transit', 'warn'], [D.stats.atRisk, 'At extreme risk', 'bad'], [D.stats.tradeSharePct, 'Of global trade'], [pts.filter(function (p) { return p.status === 'escalating'; }).length, 'Escalating', 'warn'], ['Live', 'AIS-linkable', 'acc']],
      map: { points: pts.map(function (p) { return { name: p.name, lat: p.lat, lon: p.lon, intensity: p.intensity, color: p.color, statusL: p.statusL, id: p.id }; }), legend: [['#ff6f6f', 'Active'], ['#ff8f3f', 'Escalating'], ['#7fb0ff', 'Watch']] },
      left: [
        { title: 'Strategic risk ranking', kind: 'bars', data: pts.slice().sort(function (a, b) { return b.intensity - a.intensity; }).map(function (p) { return { label: p.name, pct: p.intensity, val: p.intensity, color: p.color }; }) },
        { title: 'Chokepoint dossiers · ' + pts.length, kind: 'cards', data: pts.slice().sort(function (a, b) { return b.intensity - a.intensity; }).map(function (p) { return { id: p.id, title: p.name, dotColor: p.color, badge: p.statusL, badgeColor: p.color, right: p.intensity, fields: [['Region', p.region], ['Oil transit', p.oil], ['Narrowest', p.width], ['Operators', p.operators], ['Risk', p.risk]], latest: p.note, sources: p.sources }; }) }
      ],
      right: [{ title: 'Combined flows', kind: 'kv', data: [['Chokepoints', D.stats.chokepoints], ['Oil transit', D.stats.oilTransitMbd], ['Trade share', D.stats.tradeSharePct], ['At extreme risk', D.stats.atRisk]] }],
      ai: { summary: 'Bab-el-Mandeb and Hormuz are the acute risks: Houthi strikes have already rerouted Suez traffic around the Cape (+10-14 days), and any Hormuz disruption removes ~1/5 of world oil with no bypass. Panama’s constraint is climate, not conflict.', prompts: [['Closure scenario', 'Model the global price and supply-chain impact if the Strait of Hormuz were closed for 30 days.'], ['Reroute cost', 'Quantify the cost of the Red Sea / Bab-el-Mandeb disruption on Asia-Europe shipping.'], ['China exposure', 'How exposed is China to the Malacca dilemma and what is it doing to hedge it?']] },
      sources: [['EIA world oil chokepoints', 'https://www.eia.gov/international/analysis/special-topics/World_Oil_Transit_Chokepoints'], ['UNCTAD Review of Maritime Transport', 'https://unctad.org/rmt']],
      exportName: 'chokepoints', exportData: D
    });
  });

  /* ---- MODULE 5 · ENERGY & CRITICAL MINERALS ---- */
  register('geo_energy', function (el, U) {
    var D = window.NIY_GEO_ENERGY; if (!D) { el.innerHTML = '<div class="geo-err">Energy dataset missing.</div>'; return; }
    var min = D.minerals.map(function (m) { var s = U.statusOf(m.status); return Object.assign({}, m, { color: s.c, statusL: s.l }); });
    renderGeneric(el, U, {
      risk: 'ENERGY & CRITICAL MINERALS', subtitle: 'AS OF ' + D.meta.asOf.toUpperCase() + ' · GEOECONOMIC LEVERAGE', asOf: D.meta.asOf,
      kpis: [[D.stats.brent, 'Brent', 'warn'], [D.stats.wti, 'WTI', 'warn'], [D.stats.ttfGas, 'EU gas (TTF)', 'warn'], [min.length, 'Critical minerals', 'acc'], [min.filter(function (m) { return m.status === 'escalating'; }).length, 'Weaponised', 'bad'], ['China', 'Refining leader', 'bad']],
      map: { points: min.map(function (m) { return { name: m.name, lat: m.lat, lon: m.lon, intensity: m.intensity, color: m.color, statusL: m.statusL, id: m.id }; }), legend: [['#ff8f3f', 'Escalating'], ['#ff6f6f', 'Concentrated']] },
      left: [
        { title: 'Commodity prices', kind: 'bars', data: D.commodities.map(function (c) { return { label: c.k, pct: c.pct, val: c.v + '  ' + c.chg, color: c.chg.indexOf('+') === 0 ? '#48d17f' : '#ff6f6f' }; }) },
        { title: 'Critical minerals · supply leverage', kind: 'cards', data: min.slice().sort(function (a, b) { return b.intensity - a.intensity; }).map(function (m) { return { id: m.id, title: m.name, dotColor: m.color, badge: m.status === 'escalating' ? 'WEAPONISED' : 'CONCENTRATED', badgeColor: m.color, right: m.intensity, fields: [['Use', m.use], ['Top producers', m.topProducers], ['China share', m.chinaShare]], latest: m.note, sources: m.sources }; }) }
      ],
      right: [{ title: 'Benchmark levels', kind: 'kv', data: D.commodities.map(function (c) { return [c.k, c.v]; }) }],
      ai: { summary: 'The geoeconomic story is refining concentration, not just mining: China controls ~90% of rare-earth processing and near-monopoly on gallium/germanium — direct leverage in the chip war. Energy prices carry a persistent Middle-East risk premium. Uranium is re-rating on the nuclear revival.', prompts: [['Choke leverage', 'Which critical mineral gives China the most usable coercive leverage over the West, and how fast can it be diversified?'], ['Energy shock', 'Trace how a Hormuz or Red Sea shock would flow through to Indian inflation and the rupee.'], ['Friend-shoring', 'Where is Western friend-shoring of critical minerals actually working vs. stalling?']] },
      sources: [['EIA', 'https://www.eia.gov/'], ['IEA critical minerals', 'https://www.iea.org/topics/critical-minerals'], ['USGS Mineral Commodity Summaries', 'https://www.usgs.gov/centers/national-minerals-information-center'], ['Trading Economics', 'https://tradingeconomics.com/commodities']],
      exportName: 'energy-minerals', exportData: D
    });
  });

  /* ---- MODULE 6 · COMMODITIES ---- */
  register('geo_commodities', function (el, U) {
    var D = window.NIY_GEO_COMMODITIES; if (!D) { el.innerHTML = '<div class="geo-err">Commodities dataset missing.</div>'; return; }
    var panels = D.groups.map(function (grp) {
      return { title: grp.g, kind: 'bars', data: grp.items.map(function (it) { return { label: it[0], pct: it[3], val: it[1] + '  ' + it[2], color: String(it[2]).indexOf('+') === 0 ? '#48d17f' : '#ff6f6f' }; }) };
    });
    renderGeneric(el, U, {
      risk: 'GLOBAL COMMODITIES', subtitle: 'AS OF ' + D.meta.asOf.toUpperCase() + ' · ' + D.stats.tracked + ' BENCHMARKS', asOf: D.meta.asOf,
      kpis: [[D.stats.tracked, 'Benchmarks', 'acc'], [D.stats.gainers, 'Gainers', 'acc'], [D.stats.losers, 'Losers', 'bad'], ['4', 'Complexes'], [D.stats.riskPremium, 'Risk premium', 'warn'], ['Live', 'API-ready', 'acc']],
      left: panels.slice(0, 2),
      right: panels.slice(2),
      ai: { summary: 'Energy and precious metals carry a geopolitical risk premium (Middle East, Red Sea, safe-haven gold). Soft commodities (cocoa, coffee) are climate-driven. The through-line to watch: any Hormuz/Red Sea shock transmits straight into oil, freight and food-import inflation for net importers like India.', prompts: [['Inflation transmission', 'Trace how the current commodity picture flows into Indian CPI and the rupee.'], ['Supply shocks', 'Which commodities are most exposed to a geopolitical supply shock in the next quarter?'], ['Safe havens', 'Explain the gold move in the context of current geopolitical risk.']] },
      sources: [['Trading Economics', 'https://tradingeconomics.com/commodities'], ['CME Group', 'https://www.cmegroup.com/'], ['World Bank Pink Sheet', 'https://www.worldbank.org/en/research/commodity-markets']],
      exportName: 'commodities', exportData: D
    });
  });

  window.NiyGeo = { register: register, remount: maybeMount, generic: renderGeneric, _reg: REG };

  /* ============================================================
     MODULE 1 — CONFLICTS (the flagship)
     ============================================================ */
  register('geo_conflicts', function (el, U) {
    var D = window.NIY_GEO_CONFLICTS; if (!D) { el.innerHTML = '<div class="geo-err">Conflicts dataset not loaded.</div>'; return; }
    var wl = U.watch();
    var conflicts = D.conflicts.map(function (c) { var s = U.statusOf(c.status); return Object.assign({}, c, { color: s.c, statusL: s.l }); });

    var mapPts = conflicts.map(function (c) { return { name: c.name, lat: c.lat, lon: c.lon, intensity: c.intensity, color: c.color, statusL: c.statusL, id: c.id }; });

    // KPI strip
    var kpis = '<div class="geo-kpis">'
      + U.kpi(D.stats.activeConflicts, 'Active conflicts', 'bad')
      + U.kpi(D.stats.escalatingCount, 'Escalating', 'warn')
      + U.kpi(D.stats.fatalities12mo, 'Fatalities · 12mo', 'bad')
      + U.kpi(D.stats.displacedTotal, 'Forcibly displaced', 'acc')
      + U.kpi(D.stats.ceasefireFragile, 'Ceasefires · fragile', 'warn')
      + U.kpi(D.stats.newThisMonth, 'New this month')
      + '</div>';

    // intensity bars (top theatres)
    var topInt = conflicts.slice().sort(function (a, b) { return b.intensity - a.intensity; }).slice(0, 8);
    var intBars = topInt.map(function (c) { return U.bar(c.name, c.intensity, c.intensity, c.color); }).join('');

    // regional breakdown
    var regBars = D.regions.slice().sort(function (a, b) { return b.active - a.active; })
      .map(function (r) { return U.bar(r.region, r.active / 11 * 100, r.active + ' · ' + r.intensity, r.intensity > 75 ? '#ff6f6f' : r.intensity > 55 ? '#ff8f3f' : '#f0b429'); }).join('');

    // timeline
    var tl = '<div class="geo-tl">' + D.timeline.map(function (t) {
      return '<div class="geo-tl-i ' + t.sev + '"><div class="geo-tl-d">' + U.esc(t.date) + ' · ' + U.esc(t.region) + '</div><div class="geo-tl-t">' + U.esc(t.text) + '</div></div>';
    }).join('') + '</div>';

    // conflict cards
    var cards = conflicts.slice().sort(function (a, b) { return b.intensity - a.intensity; }).map(function (c) {
      var on = wl.indexOf(c.id) > -1;
      return '<div class="geo-card" id="gc-' + c.id + '" data-id="' + c.id + '">'
        + '<div class="geo-card-h" data-tog="' + c.id + '">'
        + '<span class="geo-card-dot" style="color:' + c.color + ';background:' + c.color + '"></span>'
        + '<span class="geo-card-nm">' + U.esc(c.name) + '</span>'
        + '<span class="geo-card-st" style="background:' + c.color + '22;color:' + c.color + '">' + c.statusL + '</span>'
        + '<span class="geo-card-int">' + c.intensity + '</span>'
        + '<button class="geo-star' + (on ? ' on' : '') + '" data-star="' + c.id + '" title="Watchlist">' + (on ? '★' : '☆') + '</button>'
        + '</div>'
        + '<div class="geo-card-b">'
        + '<dl class="geo-fields">'
        + '<dt>Region</dt><dd>' + U.esc(c.region) + '</dd>'
        + '<dt>Since</dt><dd>' + U.esc(c.since) + '</dd>'
        + '<dt>Fatalities</dt><dd>' + U.esc(c.fatalitiesEst) + '</dd>'
        + '<dt>Displaced</dt><dd>' + U.esc(c.displaced) + '</dd>'
        + '</dl>'
        + '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:4px 0 3px">KEY ACTORS</div>'
        + '<div class="geo-chips">' + c.actors.filter(Boolean).map(function (a) { return '<span class="geo-chip">' + U.esc(a) + '</span>'; }).join('') + '</div>'
        + (c.supporters.filter(Boolean).length ? '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:4px 0 3px">EXTERNAL SUPPORT</div><div class="geo-chips">' + c.supporters.filter(Boolean).map(function (a) { return '<span class="geo-chip">' + U.esc(a) + '</span>'; }).join('') + '</div>' : '')
        + (c.equipment.filter(Boolean).length ? '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:4px 0 3px">MATÉRIEL</div><div class="geo-chips">' + c.equipment.filter(Boolean).map(function (a) { return '<span class="geo-chip">' + U.esc(a) + '</span>'; }).join('') + '</div>' : '')
        + '<div style="font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--fg-faint,#68717b);margin:6px 0 3px">LATEST</div>'
        + '<div class="geo-card-latest">' + U.esc(c.latest) + '</div>'
        + '<div class="geo-src">' + c.sources.map(function (s) { return '<a href="' + U.esc(s[1]) + '" target="_blank" rel="noopener">' + U.esc(s[0]) + ' ↗</a>'; }).join('') + '</div>'
        + '</div></div>';
    }).join('');

    // ceasefire tracker
    var cf = conflicts.filter(function (c) { return c.status === 'ceasefire-fragile'; })
      .map(function (c) { return '<div class="geo-ceasefire"><span class="n">' + U.esc(c.name) + '</span><span class="geo-frag">FRAGILE</span></div>'; }).join('') || '<div style="font-size:11px;color:var(--fg-faint,#606a77)">No active ceasefires tracked.</div>';

    // AI panel
    var aiP = '<div class="geo-ai"><h4>◆ AI Intelligence Summary</h4>'
      + '<p>' + D.stats.activeConflicts + ' active conflicts tracked; ' + D.stats.escalatingCount + ' escalating. The highest-intensity theatres are Eastern Europe (Russia–Ukraine, 95) and Sudan (88). Sub-Saharan Africa carries the largest active caseload and the world’s biggest displacement crisis. Drone warfare and maritime interdiction are the defining escalation vectors this quarter.</p>'
      + '<div class="geo-ai-q">'
      + '<button data-q="Give a 5-point global conflict outlook for the coming month, with the two highest-escalation risks and why.">Monthly outlook</button>'
      + '<button data-q="Which of these conflicts most threatens global shipping and energy prices, and how?">Shipping / energy risk</button>'
      + '<button data-q="Rank these conflicts by risk of drawing in a great power directly, with reasoning.">Great-power risk</button>'
      + '</div></div>';

    var sources = '<section class="geo-panel"><div class="geo-panel-h"><span>Sources &amp; Methodology</span></div><div class="geo-panel-b" style="font-size:10.5px;color:var(--fg-dim,#98a3af);line-height:1.6">Event data: <a class="geo-src" style="color:var(--ds-accent,#7fb0ff)" href="https://acleddata.com/" target="_blank" rel="noopener">ACLED</a> · <a style="color:var(--ds-accent,#7fb0ff)" href="https://ucdp.uu.se/" target="_blank" rel="noopener">UCDP</a>. Situation reports: <a style="color:var(--ds-accent,#7fb0ff)" href="https://www.understandingwar.org/" target="_blank" rel="noopener">ISW</a>. Humanitarian: <a style="color:var(--ds-accent,#7fb0ff)" href="https://www.unocha.org/" target="_blank" rel="noopener">UN OCHA</a> · <a style="color:var(--ds-accent,#7fb0ff)" href="https://www.unhcr.org/" target="_blank" rel="noopener">UNHCR</a>. Figures are estimates from public reporting; ranges reflect source disagreement. ' + U.esc(D.meta.asOf) + '.</div></section>';

    el.innerHTML =
      '<div class="geo-top"><span class="geo-risk">GLOBAL RISK · ELEVATED</span><span class="geo-asof">AS OF ' + U.esc(D.meta.asOf).toUpperCase() + ' · ' + D.conflicts.length + ' THEATRES TRACKED</span>'
      + '<span class="geo-actions"><button class="geo-btn" id="geoExport">Export JSON</button><button class="geo-btn pri" id="geoAsk">Ask AI</button></span></div>'
      + kpis
      + '<div class="geo-mapwrap"><canvas class="geo-map" id="geoMap"></canvas><div class="geo-tip" id="geoTip" hidden></div>'
      + '<div class="geo-map-legend"><span><i style="background:#ff6f6f"></i>Active</span><span><i style="background:#ff8f3f"></i>Escalating</span><span><i style="background:#f0b429"></i>Ceasefire</span><span><i style="background:#7fb0ff"></i>Under review</span></div></div>'
      + '<div class="geo-grid"><div>'
      + U.panel('Conflict intensity · top theatres', '', intBars)
      + U.panel('Recent incidents', '', tl)
      + U.panel('Active conflicts · ' + conflicts.length, '', cards)
      + '</div><div>'
      + aiP
      + U.panel('Regional distribution', '', regBars)
      + U.panel('Ceasefire tracker', '', cf)
      + sources
      + '</div></div>';

    // wire map
    var canvas = el.querySelector('#geoMap'), tip = el.querySelector('#geoTip');
    canvas._redraw = function () { U.drawMap(canvas, mapPts, tip); };
    canvas._redraw();
    U.wireMap(canvas, tip, function (d) {
      var card = el.querySelector('#gc-' + d.id); if (!card) return;
      card.classList.add('open', 'hl'); card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { card.classList.remove('hl'); }, 1600);
    });
    // card toggles
    el.querySelectorAll('[data-tog]').forEach(function (h) { h.addEventListener('click', function (e) { if (e.target.closest('.geo-star')) return; h.parentElement.classList.toggle('open'); }); });
    el.querySelectorAll('[data-star]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var on = U.toggleWatch(b.dataset.star); b.classList.toggle('on', on); b.textContent = on ? '★' : '☆'; }); });
    // AI + export
    el.querySelectorAll('.geo-ai-q button').forEach(function (b) { b.addEventListener('click', function () { U.askAI(b.dataset.q + '\n\nContext: Niyantran global conflict tracker, ' + D.conflicts.length + ' theatres as of ' + D.meta.asOf + '.'); }); });
    var ask = el.querySelector('#geoAsk'); if (ask) ask.addEventListener('click', function () { U.askAI('Analyse the current global conflict picture from the Niyantran conflict tracker: ' + conflicts.map(function (c) { return c.name + ' (' + c.statusL + ', intensity ' + c.intensity + ')'; }).join('; ') + '. Give the top 3 escalation risks and what to watch.'); });
    var exp = el.querySelector('#geoExport'); if (exp) exp.addEventListener('click', function () { U.exportJSON('niyantran-conflicts', D); U.toast('Exported conflicts.json'); });
  });
})();

