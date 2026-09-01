/* V2 PASS 78 District Profiles + Assembly Dossier + civic watches */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function G() { return window.__niyGoaViz || null; }
  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  var DCOL = { 'North Goa': '#35657A', 'South Goa': '#D98A3C' };

  /* ================= DISTRICT PROFILES (STATE) ================= */
  function distAgg() {
    var S = rows('geo_state_seats'), B = rows('geo_state_blocs');
    var bm = {}; B.forEach(function (r) { bm[r.ac] = r; });
    var d = {};
    S.forEach(function (s) {
      var k = s.district || 'Unknown';
      if (!d[k]) d[k] = { seats: 0, electors: 0, booths: 0, inPlay: 0, cath: 0, mus: 0, acs: [] };
      var o = d[k];
      o.seats++; o.electors += s.electors; o.booths += s.booths; o.inPlay += (s.inPlay || 0);
      var b = bm[s.ac];
      if (b) { o.cath += (b.catholic || 0) / 100 * s.electors; o.mus += (b.muslim || 0) / 100 * s.electors; }
      o.acs.push(s);
    });
    return d;
  }
  function buildDP(detail, sig) {
    if (document.getElementById('niyDP')) return;
    var K = kit(), g = G();
    var S = rows('geo_state_seats');
    if (!K || !g || !S.length) return;
    var s1 = K.sec('niyDP', 'The Districts');
    if (sig) s1.wrap.setAttribute('data-sig', sig);   /*V2PASS91*/
    var d = distAgg();
    var keys = Object.keys(d).sort();
    /* district map */
    var dm = {};
    S.forEach(function (s) { dm[s.ac] = s.district; });
    /*V2PASS88: every choropleth lives in the analytics pane (PASS 79) \u2014 this one included*/
    /* stat strip */
    var strip = [];
    keys.forEach(function (k) {
      strip.push({ v: d[k].seats + ' seats', k: k, s: g.IN(d[k].electors) + ' electors \u00b7 ' + g.IN(d[k].booths) + ' booths' });
    });
    s1.body.appendChild(g.statStrip(strip));
    /* district table */
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['District', 'Seats', 'Electors', 'Booths', 'In play', 'In play %', 'Minority share'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    keys.forEach(function (k) {
      var o = d[k], tr = K.el('tr');
      var td0 = K.el('td', null, k); td0.style.color = DCOL[k] || ''; td0.style.fontWeight = '600';
      tr.appendChild(td0);
      tr.appendChild(K.el('td', 'nls-num', String(o.seats)));
      tr.appendChild(K.el('td', 'nls-num', g.IN(o.electors)));
      tr.appendChild(K.el('td', 'nls-num', g.IN(o.booths)));
      tr.appendChild(K.el('td', 'nls-num', g.IN(o.inPlay)));
      tr.appendChild(K.el('td', 'nls-num', (o.inPlay / o.electors * 100).toFixed(0) + '%'));
      tr.appendChild(K.el('td', 'nls-num', ((o.cath + o.mus) / o.electors * 100).toFixed(0) + '%'));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    /* most contested per district */
    var R = rows('geo_state_results');
    var rm = {}; R.forEach(function (r) { rm[r.ac] = r; });
    keys.forEach(function (k) {
      var hot = d[k].acs.slice().sort(function (a, b) {
        return ((rm[a.ac] || {}).margin2022 || 99) - ((rm[b.ac] || {}).margin2022 || 99);
      }).slice(0, 5);
      s1.body.appendChild(K.el('div', 'nvz-title', k + ' \u2014 tightest seats of 2022'));
      var t2 = K.el('table'), th2 = K.el('thead'), tr2 = K.el('tr');
      ['Constituency', 'Won by %', '2022', '2024', 'Status'].forEach(function (c) { tr2.appendChild(K.el('th', null, c)); });
      th2.appendChild(tr2); t2.appendChild(th2);
      var tb2 = K.el('tbody');
      hot.forEach(function (s) {
        var r = rm[s.ac] || {}, tr = K.el('tr');
        tr.appendChild(K.el('td', null, s.name));
        var dq = (window.__niyDeclared || {})[s.ac];   /*V2PASS93 declared margin beside the declared party*/
        var mv = dq && dq.margin != null ? dq.margin : r.margin2022;
        var mm = K.el('td', 'nls-num', mv != null ? mv.toFixed(1) : '\u2014');
        mm.style.color = '#A93B2B'; tr.appendChild(mm);
        var DEC = (window.__niyDeclared || {})[s.ac];   /*V2PASS87*/
        var p22 = DEC ? DEC.party : r.w2022;
        var c22 = K.el('td', null, (p22 || '\u2014') + (DEC ? ' \u2020' : ''));
        if (p22) { c22.style.color = g.pc(p22); c22.style.fontWeight = '600'; }
        if (DEC) c22.title = DEC.note;
        tr.appendChild(c22);
        var c24 = K.el('td', null, r.w2024 || '\u2014');
        if (r.w2024) { c24.style.color = g.pc(r.w2024); c24.style.fontWeight = '600'; }
        tr.appendChild(c24);
        tr.appendChild(K.el('td', null, s.status));
        tb2.appendChild(tr);
      });
      t2.appendChild(tb2);
      s1.body.appendChild(t2);
    });
    s1.status.textContent = 'computed from the state pack \u00b7 final SIR roll';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizDP() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizDP', function (block, K) {
      /*V2PASS88: the feed table already prints electors, seats and in-play per district*/
      var d = distAgg(), keys = Object.keys(d).sort();
      var S = rows('geo_state_seats'), RR = rows('geo_state_results');
      var dm = {}; S.forEach(function (s) { dm[s.ac] = s.district; });
      /*V2PASS91: the PASS-79 map layer already draws the district choropleth here \u2014 do not draw a second*/
      var mg = {}; RR.forEach(function (r) { mg[r.ac] = r.margin2022; });
      block.appendChild(K.el('div', 'nvz-title', 'Seat Size Against Seat Safety'));
      block.appendChild(K.el('div', 'nvz-sub', 'one dot per constituency, coloured by district \u00b7 the spread inside a district is the story'));
      if (g.scatter) block.appendChild(g.scatter(S.map(function (s) {
        return { x: s.electors, y: mg[s.ac], c: DCOL[s.district] || '#B8B3A9',
          l: s.name + ' \u2014 ' + s.district + ' \u00b7 ' + g.IN(s.electors) + ' electors, won by ' +
             (mg[s.ac] != null ? mg[s.ac].toFixed(1) + '%' : 'n/a') };
      }), { xlab: 'Electors', ylab: 'Won by %' }));
    });
  }

  /* ================= ASSEMBLY DOSSIER (LOCAL: Local Governance Brief) ================= */
  function scopeACs() {
    var acs = {};
    rows('geo_local_booths').forEach(function (r) { acs[r.ac] = 1; });
    return Object.keys(acs).map(Number);
  }
  function buildAD(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var acs = scopeACs(); if (!acs.length) return;
    var s1 = K.sec('niyAD', 'Assembly Dossier');
    s1.wrap.setAttribute('data-sig', sig);
    var seats = {}, resIdx = {};
    rows('geo_state_seats').forEach(function (s) { seats[s.ac] = s; });
    rows('geo_state_results').forEach(function (r) { resIdx[r.ac] = r; });
    if (acs.length > 1) {
      s1.body.appendChild(K.el('div', 'nls-note',
        acs.length + ' assemblies in scope \u2014 pick one in the scope bar for the full dossier.'));
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Constituency', 'Electors', 'Booths', '2022', 'Won by %', 'Status'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      acs.forEach(function (ac) {
        var s = seats[ac], r = resIdx[ac] || {};
        if (!s) return;
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, (ac < 10 ? '0' : '') + ac + ' ' + s.name));
        tr.appendChild(K.el('td', 'nls-num', g.IN(s.electors)));
        tr.appendChild(K.el('td', 'nls-num', String(s.booths)));
        var dc = (window.__niyDeclared || {})[ac];   /*V2PASS87*/
        var p22 = dc ? dc.party : r.w2022;
        var w = K.el('td', null, (p22 || '\u2014') + (dc ? ' \u2020' : ''));
        if (p22) { w.style.color = g.pc(p22); w.style.fontWeight = '600'; }
        if (dc) w.title = dc.note;
        tr.appendChild(w);
        tr.appendChild(K.el('td', 'nls-num', r.margin2022 != null ? r.margin2022.toFixed(1) : '\u2014'));
        tr.appendChild(K.el('td', null, s.status));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(tb);
      s1.status.textContent = 'scope-aware \u00b7 select a constituency';
      K.host(detail).appendChild(s1.wrap);
      return;
    }
    var ac = acs[0], seat = seats[ac], res = resIdx[ac] || {};
    var D = (window.__niyGoaDossiers || []).filter(function (x) { return x.ac === ac; })[0] || {};
    if (!seat) return;
    /* header */
    var dv = K.el('div', 'ngv-dossier');
    var nm = K.el('div', 'dn', (ac < 10 ? '0' : '') + ac + ' ' + seat.name);
    var chip = K.el('span', 'bandchip', seat.status);
    chip.style.background = g.BAND[seat.status] || '#8C9198';
    nm.appendChild(chip); dv.appendChild(nm);
    dv.appendChild(K.el('div', 'dm', (D.district || seat.district) + ' \u00b7 ' + (D.taluka || seat.taluka) + ' taluka \u00b7 ' + seat.booths + ' booths \u00b7 ' + g.IN(seat.electors) + ' electors'));
    var DEC = (window.__niyDeclared || {})[ac];   /*V2PASS87 the declared member, not the machine lead*/
    var wName = DEC && DEC.member ? DEC.member : D.winner;
    var wParty = DEC ? DEC.party : D.party;
    var wMarg = DEC && DEC.margin != null ? DEC.margin : D.margin;
    if (wName) {
      var w2 = K.el('div', 'dw');
      var pty = K.el('span', 'pty', wParty); pty.style.background = g.pc(wParty);
      w2.appendChild(pty);
      w2.appendChild(document.createTextNode(wName + (wMarg != null ? ' won 2022 by ' + wMarg + '% of the vote' : '')));
      dv.appendChild(w2);
    }
    s1.body.appendChild(dv);
    if (DEC) s1.body.appendChild(K.el('div', 'nls-note', DEC.note + ' Booth figures below are machine totals.'));
    /* who led, four elections */
    s1.body.appendChild(K.el('div', 'nvz-title', 'Who led, four elections running'));
    s1.body.appendChild(g.leaderGrid([{ l: seat.name,
      cells: [res.w2017, res.w2019, (DEC ? DEC.party : res.w2022), res.w2024],
      r: res.margin2022 != null ? res.margin2022.toFixed(1) + '%' : '' }], ['2017', '2019', '2022', '2024']));
    /*V2PASS89: the religion strip belongs to Booth Bloc Composition \u2014 the brief ranks the seat instead*/
    (function () {
      /*V2PASS91: rank against the WHOLE state \u2014 the CSVs here are scope-filtered to this seat*/
      var RK = window.__niyStateRank; if (!RK) return;
      function f1(x, s) { return x == null ? '\u2014' : (x.toFixed(1) + (s || '')); }
      var mine = (window.__niyStateAll ? window.__niyStateAll() : []).filter(function (x) { return x.ac === ac; })[0];
      if (!mine) return;
      var rowsOut = [
        ['How close it was in 2022', f1(mine.margin22, '%'), RK(ac, 'margin22', true), 'tightest'],
        ['Electors on the roll', mine.electors != null ? g.IN(mine.electors) : '\u2014', RK(ac, 'electors', false), 'largest'],
        ['Catholic + Muslim share', f1(mine.minorityPct, '%'), RK(ac, 'minorityPct', false), 'highest'],
        ['Share of the January roll cut', f1(mine.delPct, '%'), RK(ac, 'delPct', false), 'deepest']
      ].filter(function (r) { return r[2]; });
      if (!rowsOut.length) return;
      s1.body.appendChild(K.el('div', 'nvz-title', 'Where this seat stands among the ' + rowsOut[0][2].n));
      var tR = K.el('table'), thR = K.el('thead'), trR = K.el('tr');
      ['Measure', 'This seat', 'Rank'].forEach(function (c) { trR.appendChild(K.el('th', null, c)); });
      thR.appendChild(trR); tR.appendChild(thR);
      var tbR = K.el('tbody');
      rowsOut.forEach(function (x) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, x[0]));
        tr.appendChild(K.el('td', 'nls-num', x[1]));
        tr.appendChild(K.el('td', 'nls-num', x[2].r + ' of ' + x[2].n + ' \u00b7 ' + x[3]));
        tbR.appendChild(tr);
      });
      tR.appendChild(tbR);
      s1.body.appendChild(tR);
    })();
    /* the SIR here */
    var P = (window.__niyGoaPreSIR || []).filter(function (x) { return x.ac === ac; })[0];
    if (P) {
      s1.body.appendChild(K.el('div', 'nvz-title', 'The SIR here'));
      s1.body.appendChild(g.statStrip([
        { v: '\u2212' + g.IN(P.del), k: 'Deleted, Jan 2025 \u2192 final', s: P.delPct.toFixed(1) + '% of the January roll' },
        { v: '+' + g.IN(P.add), k: 'Added' }
      ]));
    }
    /*V2PASS89: the closest-booth table is Booth-Level Results' material \u2014 point there instead*/
    (function () {
      var M22 = window.__niyGoaM22 || {};
      var n = 0, tight = 0;
      rows('geo_local_booths').forEach(function (r) {
        var m = M22[r.ac + '_' + r.booth];
        if (m == null) return;
        n++; if (m < 12) tight++;
      });
      if (!n) return;
      s1.body.appendChild(K.el('div', 'nls-note',
        tight + ' of the ' + n + ' booths here were decided by under 12% in 2022. Open Booth-Level Results for the booth-by-booth table.'));
    })();
    s1.status.textContent = 'the constituency page \u00b7 scope-aware';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizAD() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizAD', function (block, K) {
      /*V2PASS89: margin bands are Booth-Level Results' chart \u2014 the brief places the seat*/
      var acs = scopeACs();
      var AS = (window.__niyStateAll ? window.__niyStateAll() : []);
      if (acs.length !== 1 || !AS.length) {
        var bySt = {};
        AS.forEach(function (s) { if (s.status) bySt[s.status] = (bySt[s.status] || 0) + 1; });
        block.appendChild(K.el('div', 'nvz-title', 'The Assemblies in Scope'));
        block.appendChild(K.el('div', 'nvz-sub', 'narrow the scope bar to one constituency for its dossier'));
        block.appendChild(g.cbars((g.BANDS || Object.keys(bySt)).map(function (b) {
          return { l: b, v: bySt[b] || 0, c: (g.BAND || {})[b] || '#8C9198' };
        })));
        return;
      }
      /*V2PASS91: the same correction \u2014 rank against the unfiltered state pack*/
      var one = acs[0], RK = window.__niyStateRank;
      if (!RK) return;
      var items = [
        ['Tightest contest', RK(one, 'margin22', true), '#A93B2B'],
        ['Largest roll', RK(one, 'electors', false), '#35657A'],
        ['Highest minority share', RK(one, 'minorityPct', false), '#7FA0A8'],
        ['Deepest SIR cut', RK(one, 'delPct', false), '#D98A3C']
      ].filter(function (x) { return x[1]; });
      if (!items.length) return;
      block.appendChild(K.el('div', 'nvz-title', 'Where This Seat Ranks'));
      block.appendChild(K.el('div', 'nvz-sub', 'position among all ' + items[0][1].n + ' constituencies \u00b7 a longer bar is a higher rank'));
      block.appendChild(g.cbars(items.map(function (x) {
        return { l: x[0] + ' \u2014 ' + x[1].r + ' of ' + x[1].n, v: x[1].n - x[1].r + 1, c: x[2] };
      })));
    });
  }

  /* ================= MUNICIPAL / PANCHAYAT WATCH (LOCAL) ================= */
  var CIVIC_M = 'Urban Goa: the Corporation of the City of Panaji plus 13 municipal councils run wards, licensing, sanitation and civic works \u2014 public record, as of 2025.';
  var CIVIC_P = 'Rural Goa: 191 gram panchayats under 2 zilla panchayats, each with a gram sabha that must adopt its own development plan \u2014 public record, as of 2025.';
  function scopeName() {
    var acs = scopeACs();
    if (acs.length === 1) {
      var s = null;
      rows('geo_state_seats').forEach(function (x) { if (x.ac === acs[0]) s = x; });
      return s ? s.name : 'Goa';
    }
    return 'Goa';
  }
  function watch(idBase, title, terms) {
    return function (detail, sig) {
      var K = kit(), g = G(); if (!K || !g) return;
      var s1 = K.sec(idBase, title + ' \u2014 ' + scopeName());
      s1.wrap.setAttribute('data-sig', sig);
      s1.body.appendChild(K.el('div', 'nls-note', idBase === 'niyMW' ? CIVIC_M : CIVIC_P));
      /*V2PASS99*/
      var wLabel = idBase === 'niyMW' ? 'Municipal Watch' : 'Panchayat Watch';
      var govHost = K.el('div');
      s1.body.appendChild(K.el('div', 'nvz-title', 'Government releases \u2014 Goa'));
      s1.body.appendChild(govHost);
      window.__niyGovReleases(wLabel, govHost, K).then(function (n) {
        if (n) {
          s1.wrap.setAttribute('data-gov-rows', String(n));
          try { var V1 = window.__niyViz; if (V1) V1.unmountViz([idBase === 'niyMW' ? 'niyVizMW' : 'niyVizPW']); } catch (e1) {}
        }
      });
      s1.body.appendChild(K.el('div', 'nvz-title', 'Press coverage'));
      var wireHost = K.el('div'); s1.body.appendChild(wireHost);
      var q = scopeName() + ' Goa ' + terms;
      var url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en';
      K.jget(idBase + ':' + q, '/api/rss?url=' + encodeURIComponent(url), 20 * 60000, true)
        .then(function (t) {
          var doc = new DOMParser().parseFromString(t, 'text/xml');
          var items = [].slice.call(doc.querySelectorAll('item')).slice(0, 14).map(function (it) {
            function gg(k) { var e = it.querySelector(k); return e ? e.textContent.trim() : ''; }
            var d = new Date(gg('pubDate'));
            var src = gg('source') || 'Google News';
            return { t: isNaN(d) ? null : d, title: gg('title'), url: gg('link'), src: src, cc: '' };
          }).filter(function (x) { return x.title; });
          if (!items.length) throw new Error('empty');
          var tb = K.newsTable(items);
          wireHost.innerHTML = ''; wireHost.appendChild(tb);
          s1.status.textContent = 'LIVE \u00b7 Google News \u00b7 scope-aware';
          s1.wrap.setAttribute('data-rows', String(items.length));
          /*V2PASS90*/
          try { var V0 = window.__niyViz; if (V0) V0.unmountViz([idBase === 'niyMW' ? 'niyVizMW' : 'niyVizPW']); } catch (e0) {}
        })
        .catch(function () {
          wireHost.innerHTML = '';
          wireHost.appendChild(K.el('div', 'nls-note', 'The wire arrives through the backend (/api/rss). Not reachable right now \u2014 it will retry automatically.'));
          s1.status.textContent = 'offline';
        });
      K.host(detail).appendChild(s1.wrap);
    };
  }
  var buildMW = watch('niyMW', 'Municipal Watch', 'municipality OR "municipal council" OR ward');
  var buildPW = watch('niyPW', 'Panchayat Watch', 'panchayat OR sarpanch OR "gram sabha"');
  function vizWatch(secId, vizId) {
    return function () {
      var V = viz(), g = G(); if (!V || !g) return;
      /*V2PASS86*/ V.mountViz(vizId, window.__niyWireViz(secId, secId === 'niyMW' ? 'Municipal Watch' : 'Panchayat Watch'));
    };
  }
  var vizMW = vizWatch('niyMW', 'niyVizMW');
  var vizPW = vizWatch('niyPW', 'niyVizPW');

  /* ================= mount loops ================= */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  function sigLocal() {
    var d = rows('geo_local_booths');
    if (!d.length) return '0';
    return d.length + '|' + d[0].ac + '|' + d[d.length - 1].ac;
  }
  /*V2PASS91: District Profiles reads scope-filtered rows, so it must rebuild when the scope moves*/
  function sigState() {
    var d = rows('geo_state_seats');
    return d.length ? (d.length + '|' + d[0].ac + '|' + d[d.length - 1].ac) : '0';
  }
  var SMAP = { 'District Profiles': [buildDP, 'niyVizDP', vizDP, 'niyDP'] };
  var LMAP = {
    'Local Governance Brief': [buildAD, 'niyVizAD', vizAD, 'niyAD'],
    'Municipal Watch': [buildMW, 'niyVizMW', vizMW, 'niyMW'],
    'Panchayat Watch': [buildPW, 'niyVizPW', vizPW, 'niyPW']
  };
  var ALL_VIZ = ['niyVizDP', 'niyVizAD', 'niyVizMW', 'niyVizPW'];
  function unmount(ids) { var V = viz(); if (V) V.unmountViz(ids); }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      var e = null, scopeSig = '';
      if (a.tier === 'state') { e = SMAP[activeLabel()]; scopeSig = sigState(); }
      else if (a.tier === 'local') { e = LMAP[activeLabel()]; scopeSig = sigLocal(); }
      if (!e) { unmount(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      var node = document.getElementById(e[3]);
      if (node && scopeSig && node.getAttribute('data-sig') !== scopeSig) {
        node.parentNode.removeChild(node);
        var vz = document.getElementById(e[1]);
        if (vz && vz.parentNode) vz.parentNode.removeChild(vz);
        node = null;
      }
      if (!node) e[0](d, scopeSig);
      unmount(ALL_VIZ.filter(function (id) { return id !== e[1]; }));
      e[2]();
    } catch (er) {}
  }
  function arm() {
    var d = document.getElementById('detail');
    if (d && 'MutationObserver' in window) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 300); })
        .observe(d, { childList: true });
    }
    tick(); setInterval(tick, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();