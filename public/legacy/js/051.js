/* V2 PASS 75 Goa choropleth engine + state map sections + real booth margins */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function G() { return window.__niyGoaViz || null; }
  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function names() {
    var m = {};
    rows('geo_state_seats').forEach(function (s) { m[s.ac] = s.name; });
    return m;
  }
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function ramp(t) { /* parchment -> deep brick, the report's intensity language */
    t = Math.max(0, Math.min(1, t));
    return 'rgb(' + lerp(245, 169, t) + ',' + lerp(233, 59, t) + ',' + lerp(220, 43, t) + ')';
  }

  /* ---- the choropleth: window.__niyGoaViz.goaMap(opts) ----
     opts { value(ac)->number|string, mode:'party'|'band'|'ramp', max, fmt(v), caption } */
  function goaMap(opts) {
    var g = G(), K = kit();
    var M = window.__niyGoaMap || {};
    var NM = names();
    var wrap = K.el('div', 'ngv-map');
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', M.vb || '0 0 190 232');
    svg.setAttribute('class', 'ngv-mapsvg');
    for (var ac = 1; ac <= 40; ac++) {
      var d = (M.acs || {})[ac]; if (!d) continue;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      var v = opts.value(ac);
      var fill = 'var(--n100,#F1F3F5)';
      if (v != null && v !== '') {
        if (opts.mode === 'party') fill = g.pc(v);
        else if (opts.mode === 'band') fill = g.BAND[v] || 'var(--n100,#F1F3F5)';
        else fill = ramp(opts.max ? (+v) / opts.max : 0);
      }
      p.setAttribute('fill', fill);
      p.setAttribute('class', 'ngv-ac');
      var t = document.createElementNS(NS, 'title');
      t.textContent = (ac < 10 ? '0' : '') + ac + ' ' + (NM[ac] || '') +
        (v != null && v !== '' ? ' \u00b7 ' + (opts.fmt ? opts.fmt(v) : v) : '');
      p.appendChild(t);
      svg.appendChild(p);
    }
    wrap.appendChild(svg);
    if (opts.caption) wrap.appendChild(K.el('div', 'ngv-mapcap', opts.caption));
    return wrap;
  }
  function mapRow(maps) {
    var K = kit();
    var row = K.el('div', 'ngv-maps');
    maps.forEach(function (mp) { row.appendChild(mp); });
    return row;
  }
  if (window.__niyGoaViz) { window.__niyGoaViz.goaMap = goaMap; window.__niyGoaViz.mapRow = mapRow; window.__niyGoaViz.ramp = ramp; }

  /* ---- attach maps into the pass-73 state sections (id-guarded augmentations) ---- */
  function bySection(secId, augId, build) {
    if (window.__niyMapsInAnalytics && /map$/.test(augId)) return; /*V2PASS79 maps live in ANALYTICS*/
    var sec = document.getElementById(secId);
    if (!sec || document.getElementById(augId)) return;
    var K = kit(); if (!K || !window.__niyGoaMap) return;
    var box = K.el('div'); box.id = augId;
    build(box, K);
    var body = sec.querySelector('.nls-body') || sec;
    body.insertBefore(box, body.firstChild);
  }
  function idx(csv, key, val) {
    var m = {};
    rows(csv).forEach(function (r) { m[r.ac] = r; });
    return function (ac) { var r = m[ac]; return r ? r[key] : null; };
  }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'state' && a.tier !== 'local') return; /*V2PASS82*/
      var g = G(); if (!g || !g.goaMap) return;
      /* Election Results — the report's four maps */
      bySection('niyGS2', 'niyGS2map', function (box, K) {
        box.appendChild(K.el('div', 'nvz-title', 'The map, four elections running'));
        box.appendChild(mapRow([
          goaMap({ mode: 'party', value: idx('geo_state_results', 'w2017'), caption: '2017 Assembly' }),
          goaMap({ mode: 'party', value: idx('geo_state_results', 'w2019'), caption: '2019 Lok Sabha' }),
          goaMap({ mode: 'party', value: idx('geo_state_results', 'w2022'), caption: '2022 Assembly' }),
          goaMap({ mode: 'party', value: idx('geo_state_results', 'w2024'), caption: '2024 Lok Sabha' })
        ]));
      });
      /* Constituency Register — status map */
      bySection('niyGS1', 'niyGS1map', function (box, K) {
        box.appendChild(mapRow([
          goaMap({ mode: 'band', value: idx('geo_state_seats', 'status'), caption: 'Every seat by status \u2014 hover for names' })
        ]));
      });
      /* SIR — deletion intensity */
      bySection('niyGS6', 'niyGS6map', function (box, K) {
        var P = window.__niyGoaPreSIR || [];
        var m = {}; P.forEach(function (r) { m[r.ac] = r.delPct; });
        var mx = 0; P.forEach(function (r) { if (r.delPct > mx) mx = r.delPct; });
        box.appendChild(mapRow([
          goaMap({ mode: 'ramp', value: function (ac) { return m[ac]; }, max: mx,
            fmt: function (v) { return v.toFixed(1) + '% deleted'; },
            caption: 'Share of the January 2025 roll deleted \u2014 darkest ' + mx.toFixed(0) + '%' })
        ]));
      });
      /* Registration Gap — missing ramp */
      bySection('niyGS7', 'niyGS7map', function (box, K) {
        var m = {}, mx = 0;
        rows('geo_state_gap').forEach(function (r) { m[r.ac] = r.pct; if (r.pct > mx) mx = r.pct; });
        box.appendChild(mapRow([
          goaMap({ mode: 'ramp', value: function (ac) { return m[ac]; }, max: mx,
            fmt: function (v) { return v.toFixed(1) + '% of electors missing (18\u201319)'; },
            caption: 'Missing first-time voters as a share of the roll' })
        ]));
      });
      /* Bloc Matrix — minority share ramp */
      bySection('niyGS4', 'niyGS4map', function (box, K) {
        var m = {}, mx = 0;
        rows('geo_state_blocs').forEach(function (r) {
          var v = (r.catholic || 0) + (r.muslim || 0);
          m[r.ac] = v; if (v > mx) mx = v;
        });
        box.appendChild(mapRow([
          goaMap({ mode: 'ramp', value: function (ac) { return m[ac]; }, max: mx,
            fmt: function (v) { return v.toFixed(0) + '% minority share'; },
            caption: 'Catholic + Muslim share of the roll \u2014 darkest ' + mx.toFixed(0) + '%' })
        ]));
      });
      /* Split — BJP gain ramp */
      bySection('niyGS3', 'niyGS3map', function (box, K) {
        var m = {}, mx = 0;
        rows('geo_state_split').forEach(function (r) { m[r.ac] = r.gap; if (r.gap > mx) mx = r.gap; });
        box.appendChild(mapRow([
          goaMap({ mode: 'ramp', value: function (ac) { return m[ac]; }, max: mx,
            fmt: function (v) { return '+' + v.toFixed(1) + ' pts national premium'; },
            caption: 'Where the split vote runs deepest \u2014 darkest +' + mx.toFixed(0) + ' pts' })
        ]));
      });
      /* Booth-Level Results — REAL margins */
      bySection('niyGS8', 'niyGS8m22', function (box, K) {
        var g2 = G();
        var M22 = window.__niyGoaM22 || {};
        var vals = Object.keys(M22).map(function (k) { return M22[k]; });
        if (!vals.length) return;
        var u5 = vals.filter(function (v) { return v < 5; }).length;
        var u12 = vals.filter(function (v) { return v < 12; }).length;
        box.appendChild(g2.statStrip([
          { v: g2.IN(u12), k: 'Booths won by under 12%', s: 'the ground that decides' },
          { v: g2.IN(u5), k: 'Booths won by under 5%' }
        ]));
        /* closest booths table with REAL 2022 margins */
        var B = rows('geo_local_booths');
        var NM = names();
        var withM = B.map(function (r) { return { r: r, m: M22[r.ac + '_' + r.booth] }; })
          .filter(function (x) { return x.m != null; })
          .sort(function (a, b) { return a.m - b.m || b.r.electors - a.r.electors; })
          .slice(0, 20);
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Constituency', 'Booth', 'Polling station', 'Electors', 'Won by %', '2022', '2024'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        withM.forEach(function (x) {
          var r = x.r, tr = K.el('tr');
          tr.appendChild(K.el('td', null, NM[r.ac] || r.ac));
          tr.appendChild(K.el('td', 'nls-num', String(r.booth)));
          tr.appendChild(K.el('td', null, (r.station || '').slice(0, 46)));
          tr.appendChild(K.el('td', 'nls-num', g2.IN(r.electors)));
          var mm = K.el('td', 'nls-num', x.m.toFixed(1)); mm.style.color = '#A93B2B'; mm.style.fontWeight = '600';
          tr.appendChild(mm);
          [r.l22, r.l24].forEach(function (p) {
            var td = K.el('td', null, p || '\u2014');
            if (p) { td.style.color = g2.pc(p); td.style.fontWeight = '600'; }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        box.appendChild(K.el('div', 'nvz-title', 'The closest booths of 2022 \u2014 real margins'));
        box.appendChild(tb);
      });
    } catch (e) {}
  }
  function arm() {
    var d = document.getElementById('detail');
    if (d && 'MutationObserver' in window) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 350); })
        .observe(d, { childList: true, subtree: true });
    }
    tick(); setInterval(tick, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();