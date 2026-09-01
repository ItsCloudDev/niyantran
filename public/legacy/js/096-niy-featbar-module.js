
/* Feature-bar "dense status rows": categories open by default, each module row
   carries a right-aligned metric (row-count) or LIVE, and every row has a dot.
   Synchronous scheduler (no rAF — unreliable in embedded panes); re-runs on
   every sidebar rebuild via a self-disconnecting MutationObserver. */
(function () {
  if (window.NiyFeatBar) return; window.NiyFeatBar = {};
  var css = '' +
    '#sidebarList .feat-item{display:flex;align-items:center;gap:8px}' +
    '#sidebarList .feat-item .label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#sidebarList .feat-item .fi-meta{flex:none;font-family:var(--font-mono,monospace);font-size:9px;color:var(--fg-faint,#8a8f98);letter-spacing:.02em;padding-left:6px;font-variant-numeric:tabular-nums}' +
    '#sidebarList .feat-item .fi-meta.fi-live{color:#3fae6b;font-weight:600}' +
    '#sidebarList .feat-item.active .fi-meta{color:var(--fg-dim,#c8ccd2)}' +
    '#sidebarList .feat-item .dot.dot-idle{width:6px;height:6px;border-radius:50%;background:transparent;border:1px solid var(--line,#333);box-sizing:border-box;flex:none}';
  var st = document.createElement('style'); st.id = 'niy-featbar-css'; st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function isLive(csv) { return csv === 'seaborne_ais' || csv === 'geopolitics_war_tracker.csv'; }
  var GEO_GLOB = { geo_conflicts: 'NIY_GEO_CONFLICTS', geo_sanctions: 'NIY_GEO_SANCTIONS', geo_leaders: 'NIY_GEO_LEADERS', geo_chokepoints: 'NIY_GEO_CHOKEPOINTS', geo_energy: 'NIY_GEO_ENERGY', geo_commodities: 'NIY_GEO_COMMODITIES' };
  function geoCount(csv) {
    var g = window[GEO_GLOB[csv]]; if (!g) return 0;
    if (Array.isArray(g)) return g.length;
    var mx = 0; Object.keys(g).forEach(function (k) { if (Array.isArray(g[k]) && g[k].length > mx) mx = g[k].length; }); return mx;
  }
  function featMap() {
    var m = {};
    try {
      if (typeof featuresForTier === 'function' && typeof activeTier !== 'undefined') {
        (featuresForTier(activeTier) || []).forEach(function (f) { if (f && f.feature) m[String(f.feature).trim()] = f; });
      }
    } catch (e) { }
    return m;
  }
  function decorate() {
    var list = document.getElementById('sidebarList'); if (!list) return;
    var fm = featMap();
    list.querySelectorAll('.feat-item').forEach(function (btn) {
      var lab = btn.querySelector('.label'); if (!lab) return;
      if (!btn.querySelector('.dot')) { var d = document.createElement('span'); d.className = 'dot dot-idle'; btn.insertBefore(d, btn.firstChild); }
      if (btn.querySelector('.fi-meta')) return;
      var name = (lab.textContent || '').replace(/BETA/ig, '').trim();
      var f = fm[name]; if (!f) return;
      var csv = f.dataSource && f.dataSource.csv, meta = '', cls = 'fi-meta';
      if (csv && isLive(csv)) { meta = 'LIVE'; cls += ' fi-live'; }
      if (!meta) return;
      var s = document.createElement('span'); s.className = cls; s.textContent = meta; btn.appendChild(s);
    });
  }
  function openAll() {
    var list = document.getElementById('sidebarList'); if (!list) return;
    list.querySelectorAll('.sidebar-group').forEach(function (g) {
      var head = g.querySelector('.niy-acc-head'), body = g.querySelector('.niy-acc-body');
      if (head && !head.classList.contains('open')) head.classList.add('open');
      if (body && body.style.maxHeight !== 'none') { body.style.transition = 'none'; body.style.maxHeight = 'none'; }
    });
  }
  var obs = null, busy = false;
  function run() {
    if (busy) return; busy = true;
    if (obs) obs.disconnect();
    try { decorate(); openAll(); } catch (e) { }
    var list = document.getElementById('sidebarList');
    if (obs && list) obs.observe(list, { childList: true, subtree: true });
    busy = false;
  }
  function boot() {
    var list = document.getElementById('sidebarList'); if (!list) { setTimeout(boot, 200); return; }
    obs = new MutationObserver(run);
    run();
    // fallbacks in case observer misses the first paint / async re-renders
    [150, 500, 1200, 2500].forEach(function (t) { setTimeout(run, t); });
  }
  window.NiyFeatBar.refresh = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
