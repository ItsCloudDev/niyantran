
/* Sidebar section histogram bars — width follows the number of features in the
   section, recomputed only on tier/section clicks (no observers, no polling). */
(function () {
  function bars() {
    try {
      document.querySelectorAll('.sidebar-group').forEach(function (g) {
        var lbl = g.querySelector('.sidebar-group-label'); if (!lbl) return;
        var n = g.querySelectorAll('.feat-item').length;
        lbl.style.setProperty('--gm-w', String(Math.min(120, n * 16)));
      });
    } catch (e) { }
  }
  var t = null;
  function deb() { clearTimeout(t); t = setTimeout(bars, 380); }
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    if (el && el.closest && el.closest('.tab, .sidebar-group-label, .sidebar-group')) deb();
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', deb);
  else deb();
})();
