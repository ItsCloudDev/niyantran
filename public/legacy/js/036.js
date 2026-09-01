/* V2 PASS 59 failsafe: click/tap opens a group; group names available to CSS */(function () {
  'use strict';
  function nameAll() {
    document.querySelectorAll('#sidebar .sidebar-group-label').forEach(function (l) {
      var n = (l.textContent || '').replace(/\d+|[\u25B8\u25BE]/g, '').trim();
      if (n && l.getAttribute('data-name') !== n) l.setAttribute('data-name', n);
    });
  }
  /* clicking the rail icon pins its flyout open — hover is then optional, not required */
  document.addEventListener('click', function (e) {
    var lbl = e.target && e.target.closest && e.target.closest('#sidebar .sidebar-group-label');
    if (!lbl) {
      /*V2PASS62D unpin on feature select, in capture phase before the re-render detaches the node*/
      if (e.target.closest && e.target.closest('#sidebar .feat-item')) {
        document.querySelectorAll('#sidebar .sidebar-group.niy-pinned').forEach(function (g) { g.classList.remove('niy-pinned'); });
        return;
      }
      if (!(e.target.closest && e.target.closest('#sidebar')))
        document.querySelectorAll('#sidebar .sidebar-group.niy-pinned').forEach(function (g) { g.classList.remove('niy-pinned'); });
      return;
    }
    var g = lbl.closest('.sidebar-group'); if (!g) return;
    var was = g.classList.contains('niy-pinned');
    document.querySelectorAll('#sidebar .sidebar-group.niy-pinned').forEach(function (x) { x.classList.remove('niy-pinned'); });
    if (!was) g.classList.add('niy-pinned');
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('#sidebar .sidebar-group.niy-pinned').forEach(function (g) { g.classList.remove('niy-pinned'); });
  });
  /* selecting a feature closes the pinned flyout */
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#sidebar .feat-item'))
      document.querySelectorAll('#sidebar .sidebar-group.niy-pinned').forEach(function (g) { g.classList.remove('niy-pinned'); });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', nameAll); else nameAll();
  setTimeout(nameAll, 600); setInterval(nameAll, 1500);
})();