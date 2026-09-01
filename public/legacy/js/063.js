/* V2PASS101 Hyperlocal News analytics — read from its own feed table */(function () {
  'use strict';
  var LABELS = { 'Hyperlocal News': 1, 'Hyperlocal News Aggregator': 1 };
  var VID = 'niyVizHYP';

  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  /* column index by header text */
  function colIdx(tbl, re) {
    var ths = [].slice.call(tbl.querySelectorAll('thead th'));
    for (var i = 0; i < ths.length; i++) if (re.test((ths[i].textContent || '').trim())) return i;
    return -1;
  }
  function build(block, K) {
    var g = window.__niyGoaViz, V = window.__niyViz;
    var tbl = document.querySelector('#detail .niy-col-feed table');
    if (!tbl || !g) { block.appendChild(K.el('div', 'nls-note', 'The charts draw from the wire below \u2014 they appear once it loads.')); return; }
    var iSrc = colIdx(tbl, /source/i), iTime = colIdx(tbl, /time|date|when/i);
    var rows = [].slice.call(tbl.querySelectorAll('tbody tr'));
    if (!rows.length) { block.appendChild(K.el('div', 'nls-note', 'The charts draw from the wire below \u2014 they appear once it loads.')); return; }

    if (iSrc >= 0) {
      var by = {};
      rows.forEach(function (tr) {
        var c = tr.children[iSrc]; if (!c) return;
        var s = (c.textContent || '').trim(); if (s) by[s] = (by[s] || 0) + 1;
      });
      var keys = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
      if (keys.length) {
        var pal = ['#35657A', '#7FA0A8', '#D98A3C', '#A93B2B', '#8B6BA8', '#C9A98F', '#4E7C59', '#C4632F'];
        block.appendChild(K.el('div', 'nvz-title', 'Who Is Covering This Area'));
        block.appendChild(K.el('div', 'nvz-sub', keys.length + ' outlets across the ' + rows.length + ' stories on the wire now'));
        block.appendChild(g.cbars(keys.map(function (k, i) { return { l: k, v: by[k], c: pal[i % pal.length] }; })));
      }
    }
    if (iTime >= 0) {
      var day = {};
      rows.forEach(function (tr) {
        var c = tr.children[iTime]; if (!c) return;
        var d = (c.textContent || '').split(',')[0].trim();
        if (d) day[d] = (day[d] || 0) + 1;
      });
      var pts = Object.keys(day).map(function (d) { return { d: d, v: day[d] }; }).reverse();
      if (pts.length > 1 && V && V.lineChart) {
        block.appendChild(K.el('div', 'nvz-title', 'Reporting Cadence'));
        block.appendChild(K.el('div', 'nvz-sub', 'stories per day on the local wire'));
        block.appendChild(V.lineChart(pts));
      }
    }
  }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      var V = window.__niyViz; if (!V) return;
      if (a.tier !== 'local' || !LABELS[activeLabel()]) { V.unmountViz([VID]); return; }
      var have = document.getElementById(VID);
      var rows = document.querySelectorAll('#detail .niy-col-feed tbody tr').length;
      /* redraw once the wire actually lands */
      if (have && rows && have.getAttribute('data-rows') !== String(rows)) { V.unmountViz([VID]); have = null; }
      if (!have) {
        V.mountViz(VID, build);
        var n = document.getElementById(VID);
        if (n) n.setAttribute('data-rows', String(rows));
      }
    } catch (e) {}
  }
  function arm() {
    var d = document.getElementById('detail');
    if (d && 'MutationObserver' in window) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 250); }).observe(d, { childList: true, subtree: true });
    }
    tick(); setInterval(tick, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();