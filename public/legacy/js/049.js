/* V2 PASS 74 Goa report alignment — LOCAL components (scope-reactive) */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function G() { return window.__niyGoaViz || null; }
  /*V2PASS76*/
  function gAC(r) { return (window.__niyOneAC ? '' : r.ac + '/') + r.booth; }

  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function sigOf(name) {
    var d = rows(name);
    if (!d.length) return '0';
    var a = d[0], z = d[d.length - 1];
    return d.length + '|' + a.ac + ':' + (a.booth || '') + '|' + z.ac + ':' + (z.booth || '');
  }
  function scopeNote(d) {
    if (!d.length) return '';
    var acs = {};
    d.forEach(function (r) { acs[r.ac] = 1; });
    var n = Object.keys(acs).length;
    return n === 1 ? 'one assembly in scope' : n + ' assemblies in scope';
  }

  /* ---------------- 1. BOOTH REGISTER ---------------- */
  function buildGL1(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var B = rows('geo_local_booths'); if (!B.length) return;
    var s1 = K.sec('niyGL1', 'The Booth Map in Scope');
    s1.wrap.setAttribute('data-sig', sig);
    /*V2PASS87: the constituency dossier belongs to Local Governance Brief \u2014 one owner, one header*/
    var elec = 0, hh = 0;
    B.forEach(function (r) { elec += r.electors; hh += (r.households || 0); });
    s1.body.appendChild(g.statStrip([
      { v: g.IN(B.length), k: 'Polling booths', s: scopeNote(B) },
      { v: g.IN(elec), k: 'Electors' },
      { v: g.IN(elec / B.length, 0), k: 'Electors per booth (avg)' },
      { v: g.IN(hh), k: 'Households' }
    ]));
    /*V2PASS86: the band strip belongs to Booth-Level Results \u2014 not painted twice*/
    s1.status.textContent = 'every booth in scope, with size and households \u00b7 final SIR roll';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL1() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL1', function (block, K) {
      var B = rows('geo_local_booths');
      var bins = [['under 300', 0], ['300\u2013600', 0], ['600\u2013900', 0], ['900\u20131200', 0], ['1200+', 0]];
      B.forEach(function (r) {
        var e = r.electors;
        bins[e < 300 ? 0 : e < 600 ? 1 : e < 900 ? 2 : e < 1200 ? 3 : 4][1]++;
      });
      block.appendChild(K.el('div', 'nvz-title', 'Booths by Size'));
      block.appendChild(g.cbars(bins.map(function (b) { return { l: b[0] + ' electors', v: b[1], c: '#7FA0A8' }; })));
      /*V2PASS89: the register itself lists the booths \u2014 chart what the list cannot show*/
      var withH = B.filter(function (r) { return (r.households || 0) > 0; });
      if (withH.length > 2 && g.scatter) {
        block.appendChild(K.el('div', 'nvz-title', 'Electors Against Households'));
        block.appendChild(K.el('div', 'nvz-sub', 'one dot per booth \u00b7 booths above the line hold more voters per household'));
        block.appendChild(g.scatter(withH.map(function (r) {
          return { x: r.households, y: r.electors, c: '#35657A',
            l: gAC(r) + ' ' + (r.station || '').slice(0, 30) + ' \u2014 ' + g.IN(r.electors) + ' electors, ' + g.IN(r.households) + ' households' };
        }), { zero: 1, diagonal: 1, xlab: 'Households', ylab: 'Electors' }));
      }
    });
  }

  /* ---------------- 2. BOOTH DEMOGRAPHY ---------------- */
  function buildGL2(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var B = rows('geo_local_demog'); if (!B.length) return;
    var s1 = K.sec('niyGL2', 'Who Is On the Roll Here');
    s1.wrap.setAttribute('data-sig', sig);
    var m = 0, f = 0, age = 0, young = 0, senior = 0;
    B.forEach(function (r) { m += r.male; f += r.female; age += r.meanAge; young += (r.young || 0); senior += (r.senior || 0); });
    s1.body.appendChild(g.statStrip([
      { v: g.IN(f / m * 1000, 0), k: 'Females per 1,000 males', s: scopeNote(B) },
      { v: (age / B.length).toFixed(1), k: 'Mean age (booth average)' },
      { v: (senior / B.length).toFixed(1) + '%', k: 'Senior share (booth average)' }
    ]));
    s1.status.textContent = 'sex ratio, age and seniority from the final SIR roll \u00b7 scope-aware';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL2() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL2', function (block, K) {
      var B = rows('geo_local_demog');
      block.appendChild(K.el('div', 'nvz-title', 'Oldest Rolls \u2014 Mean Age'));
      block.appendChild(g.cbars(B.slice().sort(function (a, b) { return b.meanAge - a.meanAge; })
        .slice(0, 10).map(function (r) { return { l: gAC(r) + ' ' + (r.station || '').slice(0, 22), v: r.meanAge, c: '#35657A' }; }, '', 1)));
      block.appendChild(K.el('div', 'nvz-title', 'Highest Female Share (F/1000M)'));
      block.appendChild(g.cbars(B.filter(function (r) { return r.male > 50; })
        .sort(function (a, b) { return b.sexRatio - a.sexRatio; })
        .slice(0, 10).map(function (r) { return { l: gAC(r) + ' ' + (r.station || '').slice(0, 22), v: r.sexRatio, c: '#7FA0A8' }; })));
    });
  }

  /* ---------------- 3. BOOTH BLOC COMPOSITION ---------------- */
  function buildGL3(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var B = rows('geo_local_blocs'); if (!B.length) return;
    var s1 = K.sec('niyGL3', 'Community Blocs in Scope');
    s1.wrap.setAttribute('data-sig', sig);
    var t = { catholic: 0, muslim: 0, st: 0, obc: 0, general: 0, sc: 0 };
    var elec = 0;
    B.forEach(function (r) {
      elec += r.electors;
      Object.keys(t).forEach(function (k) { t[k] += (r[k] || 0); });
    });
    var hindu = t.st + t.obc + t.general + t.sc;
    var uncl = Math.max(0, elec - hindu - t.catholic - t.muslim);
    s1.body.appendChild(K.el('div', 'nvz-title', 'Religion on the roll'));
    s1.body.appendChild(g.strip([
      { l: 'Hindu', v: hindu, c: g.BLOCC['Hindu'] },
      { l: 'Catholic', v: t.catholic, c: g.BLOCC['Catholic'] },
      { l: 'Muslim', v: t.muslim, c: g.BLOCC['Muslim'] },
      { l: 'Other / uncl.', v: uncl, c: g.BLOCC['Other / uncl.'] }
    ]));
    s1.body.appendChild(K.el('div', 'nvz-title', 'Caste category among Hindu electors'));
    s1.body.appendChild(g.strip([
      { l: 'OBC', v: t.obc, c: '#D98A3C' }, { l: 'General', v: t.general, c: '#E07B39' },
      { l: 'SC', v: t.sc, c: '#C05C5C' }, { l: 'ST', v: t.st, c: '#8B6BA8' }
    ]));
    s1.status.textContent = 'surname-classified roll \u00b7 scope-aware';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL3() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL3', function (block, K) {
      var B = rows('geo_local_blocs');
      var byBloc = {};
      B.forEach(function (r) { if (r.bloc) byBloc[r.bloc] = (byBloc[r.bloc] || 0) + 1; });
      block.appendChild(K.el('div', 'nvz-title', 'Booths by Largest Bloc'));
      block.appendChild(g.cbars(Object.keys(byBloc).sort(function (a, b) { return byBloc[b] - byBloc[a]; })
        .map(function (b) { return { l: b, v: byBloc[b], c: g.BLOCC[b] || '#B8B3A9' }; })));
      /*V2PASS86: removed \u2014 the feed strip already carries the minority share*/
    });
  }

  /* ---------------- 4. BOOTH POLITICAL HISTORY ---------------- */
  function buildGL4(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var B = rows('geo_local_history'); if (!B.length) return;
    var s1 = K.sec('niyGL4', 'Who Led, Booth by Booth');
    s1.wrap.setAttribute('data-sig', sig);
    var seen = {};
    B.forEach(function (r) { [r.l17, r.l19, r.l22, r.l24].forEach(function (p) { if (p) seen[p] = 1; }); });
    s1.body.appendChild(g.partyLegend(Object.keys(seen)));
    var show = B.slice(0, 36);
    s1.body.appendChild(g.leaderGrid(show.map(function (r) {
      return { l: gAC(r) + ' ' + (r.station || '').slice(0, 18),
        cells: [r.l17, r.l19, r.l22, r.l24], r: (r.flips != null ? String(r.flips) : '') };
    }), ['2017', '2019', '2022', '2024'], 'Flips'));
    (function () { /*V2PASS87: booth leads are machine totals \u2014 flag any seat the declaration flipped*/
      var D = window.__niyDeclared || {}, seen = {};
      B.forEach(function (r) { if (D[r.ac]) seen[r.ac] = 1; });
      Object.keys(seen).forEach(function (ac) {
        s1.body.appendChild(K.el('div', 'nls-note', D[ac].note + ' The grid above shows machine leads only.'));
      });
    })();
    if (B.length > show.length)
      s1.body.appendChild(K.el('div', 'nls-note', 'Showing ' + show.length + ' of ' + g.IN(B.length) + ' booths \u2014 narrow the scope to an assembly for the full set.'));
    s1.status.textContent = 'Form 20 booth leads \u00b7 four elections \u00b7 scope-aware';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL4() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL4', function (block, K) {
      var B = rows('geo_local_history');
      function tally(k) {
        var m = {};
        B.forEach(function (r) { var p = r[k]; if (p) m[p] = (m[p] || 0) + 1; });
        return Object.keys(m).map(function (p) { return { l: p, v: m[p], c: g.pc(p) }; })
          .sort(function (a, b) { return b.v - a.v; });
      }
      /*V2PASS89: four strips read as a sequence; two identical bar charts did not*/
      block.appendChild(K.el('div', 'nvz-title', 'Who Led These Booths, Election by Election'));
      block.appendChild(K.el('div', 'nvz-sub', 'share of the ' + B.length + ' booths in scope'));
      [['l17', '2017 Assembly'], ['l19', '2019 Lok Sabha'], ['l22', '2022 Assembly'], ['l24', '2024 Lok Sabha']]
        .forEach(function (y) {
          var items = tally(y[0]);
          if (!items.length) return;
          block.appendChild(K.el('div', 'nvz-sub', y[1]));
          block.appendChild(g.strip(items));
        });
      var flips = [0, 0, 0, 0];
      B.forEach(function (r) { flips[Math.min(3, r.flips || 0)]++; });
      block.appendChild(K.el('div', 'nvz-title', 'Loyalty \u2014 Lead Changes Across Four Elections'));
      block.appendChild(g.cbars([
        { l: 'Never flipped', v: flips[0], c: '#35657A' }, { l: 'Flipped once', v: flips[1], c: '#7FA0A8' },
        { l: 'Flipped twice', v: flips[2], c: '#D98A3C' }, { l: 'Three+ flips', v: flips[3], c: '#A93B2B' }
      ]));
    });
  }

  /* ---------------- 5. SWING BOOTHS ---------------- */
  function buildGL5(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var S = rows('geo_local_swing');   /*V2PASS89: say so when the shortlist misses this scope*/
    var s1 = K.sec('niyGL5', 'The Booths That Swing');
    s1.wrap.setAttribute('data-sig', sig);
    if (!S.length) {
      s1.body.appendChild(K.el('div', 'nls-note',
        'No swing booths fall in the current scope. The swing shortlist is drawn from the constituencies where booth-level leads changed hands most often \u2014 it does not cover every seat. Widen the scope bar to the state to see the full list.'));
      s1.status.textContent = 'no rows in scope';
      K.host(detail).appendChild(s1.wrap);
      return;
    }
    var elec = 0;
    S.forEach(function (r) { elec += r.electors; });
    s1.body.appendChild(g.statStrip([
      { v: g.IN(S.length), k: 'Swing booths in scope', s: 'most contested, four elections' },
      { v: g.IN(elec), k: 'Electors in them' }
    ]));
    s1.status.textContent = 'the most fragmented booths \u2014 no party holds them across four elections';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL5() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL5', function (block, K) {
      var S = rows('geo_local_swing');
      var M22 = window.__niyGoaM22 || {};
      var withM = S.map(function (r) { return { r: r, m: M22[r.ac + '_' + r.booth] }; });
      if (withM.some(function (x) { return x.m != null; })) {
        block.appendChild(K.el('div', 'nvz-title', 'Ranked by 2022 Margin \u2014 Closest First'));
        block.appendChild(g.cbars(withM.filter(function (x) { return x.m != null; })
          .sort(function (a, b) { return a.m - b.m; })
          .map(function (x) { return { l: gAC(x.r) + ' ' + (x.r.station || '').slice(0, 22), v: x.m, c: '#A93B2B' }; }), '%', 1));
      }
      /*V2PASS89: the row list already carries each booth \u2014 chart the concentration instead*/
      var AN = {}; rows('geo_state_seats').forEach(function (s) { AN[s.ac] = s.name; });
      var tot = {}; rows('geo_local_booths').forEach(function (r) { tot[r.ac] = (tot[r.ac] || 0) + 1; });
      var byAC = {}; S.forEach(function (r) { byAC[r.ac] = (byAC[r.ac] || 0) + 1; });
      var keys = Object.keys(byAC).sort(function (a, b) { return byAC[b] - byAC[a]; });
      if (keys.length) {
        block.appendChild(K.el('div', 'nvz-title', 'Where the Swing Is Concentrated'));
        block.appendChild(K.el('div', 'nvz-sub', 'swing booths per constituency' +
          (Object.keys(tot).length ? ' \u00b7 hover for the share of that seat\u2019s booths' : '')));
        block.appendChild(g.cbars(keys.map(function (k) {
          var share = tot[k] ? ' (' + (byAC[k] / tot[k] * 100).toFixed(0) + '% of its booths)' : '';
          return { l: (AN[k] || ('AC ' + k)) + share, v: byAC[k], c: '#D98A3C' };
        })));
      }
    });
  }

  /* ---------------- 6. ANCHOR BOOTHS ---------------- */
  function buildGL6(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var A = rows('geo_local_anchor');   /*V2PASS89*/
    var s1 = K.sec('niyGL6', 'The Anchors');
    s1.wrap.setAttribute('data-sig', sig);
    if (!A.length) {
      s1.body.appendChild(K.el('div', 'nls-note',
        'No anchor booths fall in the current scope. The anchor shortlist covers the strongholds where one bloc has led every election \u2014 it does not cover every seat. Widen the scope bar to the state to see the full list.'));
      s1.status.textContent = 'no rows in scope';
      K.host(detail).appendChild(s1.wrap);
      return;
    }
    var elec = 0;
    A.forEach(function (r) { elec += r.electors; });
    s1.body.appendChild(g.statStrip([
      { v: g.IN(A.length), k: 'Anchor booths in scope', s: 'strongholds \u2014 never in doubt' },
      { v: g.IN(elec), k: 'Electors in them' }
    ]));
    s1.status.textContent = 'single-bloc strongholds \u2014 the safest ground on the map';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL6() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL6', function (block, K) {
      /*V2PASS89: the row list ranks each anchor \u2014 aggregate to the thing it cannot show*/
      var A = rows('geo_local_anchor');
      var byB = {}, elB = {};
      A.forEach(function (r) {
        var b = r.bloc || 'Unclassified';
        byB[b] = (byB[b] || 0) + 1;
        elB[b] = (elB[b] || 0) + (r.electors || 0);
      });
      var bk = Object.keys(elB).sort(function (a, b) { return elB[b] - elB[a]; });
      block.appendChild(K.el('div', 'nvz-title', 'Anchor Electors, by the Bloc That Holds Them'));
      block.appendChild(K.el('div', 'nvz-sub', 'how much of the safe vote each community anchors'));
      block.appendChild(g.cbars(bk.map(function (b) {
        return { l: b + ' (' + byB[b] + ' booth' + (byB[b] === 1 ? '' : 's') + ')', v: elB[b], c: g.BLOCC[b] || '#35657A' };
      })));
      var allB = rows('geo_local_booths');
      if (allB.length) {
        var anchorE = 0; A.forEach(function (r) { anchorE += (r.electors || 0); });
        var allE = 0; allB.forEach(function (r) { allE += (r.electors || 0); });
        block.appendChild(K.el('div', 'nvz-title', 'Locked In Against Everything Else'));
        block.appendChild(K.el('div', 'nvz-sub', 'anchor booths as a share of the electorate in scope'));
        block.appendChild(g.strip([
          { l: 'Anchored', v: anchorE, c: '#35657A' },
          { l: 'Everything else', v: Math.max(0, allE - anchorE), c: '#C9C4B8' }
        ]));
      }
    });
  }

  /* ---------------- 7. BOOTH-LEVEL ROLL CHURN ---------------- */
  function buildGL7(detail, sig) {
    var K = kit(), g = G(); if (!K || !g) return;
    var C = rows('geo_local_churn'); if (!C.length) return;
    var s1 = K.sec('niyGL7', 'Where the Roll Moved');
    s1.wrap.setAttribute('data-sig', sig);
    var add = 0, rem = 0;
    C.forEach(function (r) { add += (r.added || 0); rem += (r.removed || 0); });
    var busiest = C.slice().sort(function (a, b) { return (b.added + b.removed) - (a.added + a.removed); })[0];
    s1.body.appendChild(g.statStrip([
      { v: '+' + g.IN(add), k: 'Added, draft \u2192 final', s: scopeNote(C) },
      { v: '\u2212' + g.IN(rem), k: 'Removed, draft \u2192 final' },
      { v: gAC(busiest), k: 'Busiest booth', s: '+' + g.IN(busiest.added) + ' / \u2212' + g.IN(busiest.removed) }
    ]));
    s1.status.textContent = 'draft vs final SIR \u00b7 scope-aware';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGL7() {
    var V = viz(), g = G(); if (!V || !g) return;
    V.mountViz('niyVizGL7', function (block, K) {
      /*V2PASS89: two mirrored top-10s became one net read plus the relationship*/
      var C = rows('geo_local_churn');
      block.appendChild(K.el('div', 'nvz-title', 'Net Movement \u2014 Booths That Moved Most'));
      block.appendChild(K.el('div', 'nvz-sub', 'added less removed \u00b7 the ten largest moves in either direction'));
      block.appendChild(g.cbars(C.slice().sort(function (a, b) {
        return Math.abs((b.added || 0) - (b.removed || 0)) - Math.abs((a.added || 0) - (a.removed || 0));
      }).slice(0, 10).map(function (r) {
        var net = (r.added || 0) - (r.removed || 0);
        return { l: gAC(r) + ' ' + (r.station || '').slice(0, 22) + ' \u00b7 ' + (net >= 0 ? '+' : '\u2212') + Math.abs(net),
          v: Math.abs(net), c: net >= 0 ? '#35657A' : '#A93B2B' };
      })));
      if (g.scatter && C.length > 2) {
        block.appendChild(K.el('div', 'nvz-title', 'Additions Against Removals'));
        block.appendChild(K.el('div', 'nvz-sub', 'one dot per booth \u00b7 on the dashed line the roll only churned, it did not grow'));
        block.appendChild(g.scatter(C.map(function (r) {
          return { x: r.removed || 0, y: r.added || 0, c: '#7FA0A8',
            l: gAC(r) + ' ' + (r.station || '').slice(0, 30) + ' \u2014 +' + (r.added || 0) + ' / \u2212' + (r.removed || 0) };
        }), { zero: 1, diagonal: 1, xlab: 'Removed', ylab: 'Added' }));
      }
    });
  }

  /* ---------------- mount loop (scope-reactive) ---------------- */
  var MAP = {
    'geo_local_booths': ['niyGL1', buildGL1, 'niyVizGL1', vizGL1, 'geo_local_booths'],
    'geo_local_demog': ['niyGL2', buildGL2, 'niyVizGL2', vizGL2, 'geo_local_demog'],
    'geo_local_blocs': ['niyGL3', buildGL3, 'niyVizGL3', vizGL3, 'geo_local_blocs'],
    'geo_local_history': ['niyGL4', buildGL4, 'niyVizGL4', vizGL4, 'geo_local_history'],
    'geo_local_swing': ['niyGL5', buildGL5, 'niyVizGL5', vizGL5, 'geo_local_swing'],
    'geo_local_anchor': ['niyGL6', buildGL6, 'niyVizGL6', vizGL6, 'geo_local_anchor'],
    'geo_local_churn': ['niyGL7', buildGL7, 'niyVizGL7', vizGL7, 'geo_local_churn']
  };
  var ALL_VIZ = ['niyVizGL1', 'niyVizGL2', 'niyVizGL3', 'niyVizGL4', 'niyVizGL5', 'niyVizGL6', 'niyVizGL7'];
  function unmount(ids) { var V = viz(); if (V) V.unmountViz(ids); }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'local') { unmount(ALL_VIZ); return; }
      /*V2PASS76: single-assembly scope — drop the redundant AC column everywhere*/
      (function () {
        var d0 = rows('geo_local_booths'); var acs = {};
        d0.forEach(function (r) { acs[r.ac] = 1; });
        window.__niyOneAC = Object.keys(acs).length === 1;
        var det = document.getElementById('detail'); if (!det) return;
        det.querySelectorAll('table').forEach(function (tb) {
          var ths = tb.querySelectorAll('thead th');
          for (var i = 0; i < ths.length; i++) {
            if ((ths[i].textContent || '').trim().toUpperCase() === 'AC') {
              var disp = window.__niyOneAC ? 'none' : '';
              ths[i].style.display = disp;
              tb.querySelectorAll('tbody tr').forEach(function (tr) {
                if (tr.children[i]) tr.children[i].style.display = disp;
              });
              break;
            }
          }
        });
      })();
      var e = MAP[a.csv];
      if (!e) { unmount(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      var sig = sigOf(e[4]);
      var node = document.getElementById(e[0]);
      if (node && node.getAttribute('data-sig') !== sig) {
        node.parentNode.removeChild(node);
        var vz = document.getElementById(e[2]);
        if (vz && vz.parentNode) vz.parentNode.removeChild(vz);
        node = null;
      }
      if (!node) e[1](d, sig);
      unmount(ALL_VIZ.filter(function (id) { return id !== e[2]; }));
      e[3]();
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