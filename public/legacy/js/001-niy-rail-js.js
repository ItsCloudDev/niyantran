
/* Sidebar hover-rail: collapsed 64px monogram rail by default; the full panel slides
   over the content on hover (overlay -> zero layout shift for #detail). The old
   « toggle still fully hides the sidebar if the user wants max canvas. */
(function () {
  function mono(s) {
    s = String(s || '').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
    var w = s.split(/\s+/).filter(Boolean);
    var m = (w[0] || '').slice(0, 1) + (w[1] ? w[1].slice(0, 1) : (w[0] || '').slice(1, 2));
    return m.toUpperCase();
  }
  // Codes are assigned ONCE across every tier's feature list and deduplicated,
  // so a code like WC belongs to exactly one function terminal-wide. The registry
  // (window.__niyMono) is also consulted by the global search bar.
  function buildCodes() {
    try {
      if (window.__niyMono) return window.__niyMono;
      var labels = [];
      if (typeof FEATURE_DATA !== 'undefined' && typeof featuresForTier === 'function') {
        Object.keys(FEATURE_DATA).forEach(function (t) {
          (featuresForTier(t) || []).forEach(function (f) { if (f && f.feature) labels.push(f.feature); });
        });
      }
      var used = {}, map = {};
      labels.forEach(function (L) {
        if (map[L]) return;
        var words = String(L).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (!words.length) words = ['X'];
        var cands = [];
        if (words.length > 1) cands.push(words[0][0] + words[1][0]);
        cands.push((words[0] || 'XX').slice(0, 2));
        if (words.length > 1 && words[1].length > 1) cands.push(words[0][0] + words[1][1]);
        if (words.length > 2) cands.push(words[0][0] + words[2][0]);
        if (words[0].length > 2) cands.push(words[0][0] + words[0][2]);
        if (words.length > 1) cands.push(words[0][0] + words[1].slice(0, 2));
        cands.push((words[0] || 'XXX').slice(0, 3));
        var code = null;
        for (var i = 0; i < cands.length; i++) {
          var c = String(cands[i] || '').toUpperCase();
          if (c.length >= 2 && !used[c]) { code = c; break; }
        }
        if (!code) { var b = (words[0][0] || 'X').toUpperCase(); var n = 2; while (used[b + n]) n++; code = b + n; }
        used[code] = 1; map[L] = code;
      });
      window.__niyMono = map; return map;
    } catch (e) { return (window.__niyMono = {}); }
  }
  function tag() {
    try {
      var map = buildCodes();
      document.querySelectorAll('#sidebarList .feat-item').forEach(function (b) {
        var l = b.querySelector('.label');
        var name = (l ? l.textContent : b.textContent || '').trim();
        b.dataset.mono = map[name] || mono(name);
      });
      var sb = document.getElementById('sidebar');
      var on = sb && getComputedStyle(sb).display !== 'none' && !document.body.classList.contains('sb-collapsed');
      document.body.classList.toggle('sb-hoverail', !!on);
    } catch (e) { }
  }
  var t; function deb() { clearTimeout(t); t = setTimeout(tag, 320); }
  function boot() {
    // wrap the sidebar's children once so the overlay can expand independently
    try {
      var sb = document.getElementById('sidebar');
      if (sb && !sb.querySelector('.niy-sb-panel')) {
        var panel = document.createElement('div'); panel.className = 'niy-sb-panel';
        while (sb.firstChild) panel.appendChild(sb.firstChild);
        sb.appendChild(panel);
      }
    } catch (e) { }
    tag();
    var sl = document.getElementById('sidebarList');
    if (sl && 'MutationObserver' in window) new MutationObserver(deb).observe(sl, { childList: true, subtree: true });
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.tab, .niy-sb-toggle, .niy-sb-rail')) deb();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
