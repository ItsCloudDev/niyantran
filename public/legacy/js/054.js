/* V2 PASS 79 maps->analytics · usable tables · universal drag */(function () {
  'use strict';
  window.__niyMapsInAnalytics = 1;
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function G() { return window.__niyGoaViz || null; }
  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function idxOf(csv, key) {
    var m = {};
    rows(csv).forEach(function (r) { m[r.ac] = r[key]; });
    return function (ac) { return m[ac]; };
  }

  /* ---------- (2) tables that are actually usable ---------- */
  function stampFeedWrap() {
    try {
      document.querySelectorAll('#detail .niy-col-feed table.sample').forEach(function (t) {
        var p = t.parentElement;
        if (p && p !== document.body && !p.classList.contains('niy-feedwrap')) p.classList.add('niy-feedwrap');
      });
    } catch (e) {}
  }

  /* ---------- (3) universal drag on every injected live list ---------- */
  function stampDraggable() {
    try {
      var feed = document.querySelector('#detail .niy-col-feed'); if (!feed) return;
      feed.querySelectorAll('table').forEach(function (t) {
        if (!t.querySelector('thead th') || !t.querySelector('tbody tr')) return;
        if (!t.classList.contains('sample')) t.classList.add('niy-liveTbl');
        var i = 0;
        t.querySelectorAll('tbody tr').forEach(function (tr) {
          if (!tr.hasAttribute('data-row-idx')) tr.setAttribute('data-row-idx', String(i));
          i++;
          if (!tr.dataset.niyDrag) {
            tr.dataset.niyDrag = '1';
            tr.setAttribute('draggable', 'true');
          }
        });
      });
    } catch (e) {}
  }

  /* ---------- (1) the state maps, now in ANALYTICS ---------- */
  function mapsFor(label, csv) {
    var g = G(); if (!g || !g.goaMap || !window.__niyGoaMap) return null;
    if (csv === 'geo_state_results') {
      return { title: 'The Map, Four Elections Running', sub: 'party leading each constituency',
        maps: [
          g.goaMap({ mode: 'party', value: idxOf('geo_state_results', 'w2017'), caption: '2017 Assembly' }),
          g.goaMap({ mode: 'party', value: idxOf('geo_state_results', 'w2019'), caption: '2019 Lok Sabha' }),
          g.goaMap({ mode: 'party', value: (function () { /*V2PASS91 the map shows the declared house too*/
            var f = idxOf('geo_state_results', 'w2022'), D = window.__niyDeclared || {};
            return function (ac) { return D[ac] ? D[ac].party : f(ac); };
          })(), caption: '2022 Assembly \u00b7 declared' }),
          g.goaMap({ mode: 'party', value: idxOf('geo_state_results', 'w2024'), caption: '2024 Lok Sabha' })
        ] };
    }
    if (csv === 'geo_state_seats' || csv === 'geo_state_demog') {
      return { title: 'Seat Status \u2014 Heat Map', sub: 'hover for constituency names',
        maps: [g.goaMap({ mode: 'band', value: idxOf('geo_state_seats', 'status'), caption: 'Every seat by status' })] };
    }
    if (csv === 'geo_state_churn') {
      var P = window.__niyGoaPreSIR || [], m = {}, mx = 0;
      P.forEach(function (r) { m[r.ac] = r.delPct; if (r.delPct > mx) mx = r.delPct; });
      return { title: 'Deletion Intensity \u2014 Heat Map', sub: 'share of the January 2025 roll deleted',
        maps: [g.goaMap({ mode: 'ramp', value: function (ac) { return m[ac]; }, max: mx,
          fmt: function (v) { return v.toFixed(1) + '% deleted'; },
          caption: 'darkest ' + mx.toFixed(0) + '%' })] };
    }
    if (csv === 'geo_state_gap') {
      var m2 = {}, mx2 = 0;
      rows('geo_state_gap').forEach(function (r) { m2[r.ac] = r.pct; if (r.pct > mx2) mx2 = r.pct; });
      return { title: 'Missing First-Time Voters \u2014 Heat Map', sub: 'as a share of the roll',
        maps: [g.goaMap({ mode: 'ramp', value: function (ac) { return m2[ac]; }, max: mx2,
          fmt: function (v) { return v.toFixed(1) + '% missing'; }, caption: 'darkest ' + mx2.toFixed(1) + '%' })] };
    }
    if (csv === 'geo_state_blocs') {
      var m3 = {}, mx3 = 0;
      rows('geo_state_blocs').forEach(function (r) {
        var v = (r.catholic || 0) + (r.muslim || 0); m3[r.ac] = v; if (v > mx3) mx3 = v;
      });
      return { title: 'Minority Share \u2014 Heat Map', sub: 'Catholic + Muslim share of the roll',
        maps: [g.goaMap({ mode: 'ramp', value: function (ac) { return m3[ac]; }, max: mx3,
          fmt: function (v) { return v.toFixed(0) + '%'; }, caption: 'darkest ' + mx3.toFixed(0) + '%' })] };
    }
    if (csv === 'geo_state_split') {
      var m4 = {}, mx4 = 0;
      rows('geo_state_split').forEach(function (r) { m4[r.ac] = r.gap; if (r.gap > mx4) mx4 = r.gap; });
      return { title: 'National Premium \u2014 Heat Map', sub: 'BJP LS24 minus AC22, points',
        maps: [g.goaMap({ mode: 'ramp', value: function (ac) { return m4[ac]; }, max: mx4,
          fmt: function (v) { return '+' + v.toFixed(1) + ' pts'; }, caption: 'darkest +' + mx4.toFixed(0) + ' pts' })] };
    }
    if (label === 'District Profiles') {
      var dm = {}, DC = { 'North Goa': '#35657A', 'South Goa': '#D98A3C' };
      rows('geo_state_seats').forEach(function (s) { dm[s.ac] = s.district; });
      var mp = g.goaMap({ mode: 'party', value: function (ac) { return dm[ac]; }, caption: 'North Goa \u00b7 South Goa' });
      var svg = mp.querySelector('.ngv-mapsvg');
      if (svg) {
        var ps = svg.querySelectorAll('path.ngv-ac'), i = 0;
        for (var ac = 1; ac <= 40; ac++) { if (ps[i]) ps[i].setAttribute('fill', DC[dm[ac]] || '#B8B3A9'); i++; }
      }
      return { title: 'The Districts \u2014 Heat Map', sub: 'every constituency by district', maps: [mp] };
    }
    if (label === 'Booth-Level Results') {
      var m5 = {}, mx5 = 0;
      var M22 = window.__niyGoaM22 || {}, agg = {};
      rows('geo_local_booths').forEach(function (r) {
        var mm = M22[r.ac + '_' + r.booth]; if (mm == null) return;
        if (!agg[r.ac]) agg[r.ac] = { n: 0, c: 0 };
        agg[r.ac].n++; if (mm < 12) agg[r.ac].c++;
      });
      Object.keys(agg).forEach(function (ac) {
        var v = agg[ac].c / agg[ac].n * 100; m5[ac] = v; if (v > mx5) mx5 = v;
      });
      return { title: 'Contested Booths \u2014 Heat Map', sub: 'share of booths won by under 12% in 2022',
        maps: [g.goaMap({ mode: 'ramp', value: function (ac) { return m5[ac]; }, max: mx5,
          fmt: function (v) { return v.toFixed(0) + '% of booths under 12%'; }, caption: 'darkest ' + mx5.toFixed(0) + '%' })] };
    }
    return null;
  }
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  function mountMaps() {
    var V = viz(), K = kit(), g = G(); if (!V || !K || !g) return;
    var a = (window.niyActive ? window.niyActive() : null) || {};
    if (a.tier !== 'state' && !(a.tier === 'local' && activeLabel() === 'Booth-Level Results')) { V.unmountViz(['niyVizMAP']); return; } /*V2PASS82*/
    var spec = mapsFor(activeLabel(), a.csv);
    if (!spec) { V.unmountViz(['niyVizMAP']); return; }
    var existing = document.getElementById('niyVizMAP');
    if (existing && existing.getAttribute('data-k') === (a.csv || activeLabel())) return;
    if (existing) V.unmountViz(['niyVizMAP']);
    V.mountViz('niyVizMAP', function (block) {
      block.setAttribute('data-k', a.csv || activeLabel());
      block.appendChild(K.el('div', 'nvz-title', spec.title));
      if (spec.sub) block.appendChild(K.el('div', 'nvz-sub', spec.sub));
      var w = K.el('div', 'ngv-mapwrap');
      w.appendChild(g.mapRow(spec.maps));
      block.appendChild(w);
    });
    /* keep the map block first in the pane so it reads as the lede */
    try {
      var pane = document.querySelector('.niy-pane-analytics');
      var blk = document.getElementById('niyVizMAP');
      if (pane && blk && pane.firstChild !== blk) pane.insertBefore(blk, pane.firstChild);
    } catch (e) {}
  }

  function tick() { stampFeedWrap(); stampDraggable(); mountMaps(); }
  function arm() {
    var d = document.getElementById('detail');
    if (d && 'MutationObserver' in window) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 260); })
        .observe(d, { childList: true, subtree: true });
    }
    tick(); setInterval(tick, 1400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();