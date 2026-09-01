/* V2 PASS 49 universal escape */(function () {
  'use strict';
  /* Priority-ordered exits. Each entry: [probe selector, close action]. The first
     visible match wins, so Escape always closes the top-most thing first. */
  function visible(el) { return el && el.offsetParent !== null; }
  function clickIf(sel, root) { var b = (root || document).querySelector(sel); if (b) { b.click(); return true; } return false; }
  var EXITS = [
    /* open dropdowns + popovers */
    function () { var x = document.querySelector('.sc-sel.open'); if (x) { x.classList.remove('open'); return true; } return false; },
    function () { var x = document.querySelector('.niy-filt.open'); if (x) { x.classList.remove('open'); return true; } return false; },
    function () { var x = document.querySelector('.niy-prof.open'); if (x) { x.classList.remove('open'); return true; } return false; },
    function () { var hit = false; document.querySelectorAll('.niy-comms-pop:not([hidden])').forEach(function (p) { p.hidden = true; hit = true; }); return hit; },
    function () { var p = document.getElementById('niyToolsPop'); if (p && !p.hidden) { p.hidden = true; return true; } return false; },
    function () { var m = document.querySelector('.niy-more-menu'); if (m && visible(m) && m.classList.contains('open')) { m.classList.remove('open'); return true; } return false; },
    /* the row card */
    function () { var c = document.querySelector('.niy-rd-panel .niy-rd-close'); if (c && visible(c)) { c.click(); return true; } return false; },
    /* module-level detail drawers (transit vessel, geo dossier cards, article reader, modals) */
    function () { var d = document.getElementById('sbDetail'); if (d && !d.hidden) { d.hidden = true; return true; } return false; },
    function () {
      var sels = ['.niy-modal-card [class*="close"]', '.fin-modal [class*="close"]', '.nz-close', '.niy-co-card [class*="close"]',
        '[class*="modal"][style*="display: flex"] button[class*="close"]', '.sb-d-x'];
      for (var i = 0; i < sels.length; i++) { var b = document.querySelector(sels[i]); if (b && visible(b)) { b.click(); return true; } }
      return false;
    },
    /* generic: any visible fixed overlay that carries a close-ish button */
    function () {
      var els = document.querySelectorAll('body > div, body > section');
      for (var i = 0; i < els.length; i++) {
        var e = els[i], cs = getComputedStyle(e);
        if (cs.position !== 'fixed' || !visible(e) || e.getBoundingClientRect().height < 160) continue;
        if (e.id === 'sidebar' || /topbar|ticker|tabs|scope/.test(e.className)) continue;
        var b = e.querySelector('[class*="close"],[aria-label*="Close"],[data-close]');
        if (b) { b.click(); return true; }
      }
      return false;
    }
  ];
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) { a.blur(); return; }
    for (var i = 0; i < EXITS.length; i++) { try { if (EXITS[i]()) { ev.preventDefault(); return; } } catch (e) {} }
  });
})();