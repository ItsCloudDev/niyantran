/* V2 PASS 73 Goa report alignment — STATE components */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  var PARTY = { BJP:'#E07B39', INC:'#3B7EA1', MGP:'#7C8F4A', RGP:'#8B6BA8', TMC:'#2F9E6E',
    AAP:'#3E9C8F', GFP:'#C05C5C', IND:'#8C9198', NCP:'#5B7DB1', UGP:'#B4AFA5' };
  var BAND = { Difficult:'#A93B2B', Marginal:'#D98A3C', Battlefield:'#C9A98F', Favourable:'#7FA0A8', Safe:'#35657A' };
  var BANDS = ['Difficult', 'Marginal', 'Battlefield', 'Favourable', 'Safe'];
  var BLOCC = { 'Catholic':'#3B7EA1', 'Muslim':'#2F9E6E', 'Hindu OBC':'#D98A3C', 'Hindu General':'#E07B39',
    'Hindu SC':'#C05C5C', 'Hindu ST':'#8B6BA8', 'Unclassified':'#B8B3A9', 'Hindu':'#D98A3C', 'Other / uncl.':'#B8B3A9' };
  function pc(p) { return PARTY[p] || '#B4AFA5'; }
  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function IN(n, d) { return Number(n).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 0 : d }); }
  function el(t, c, x) { var K = kit(); return K.el(t, c, x); }

  /* ---- shared visual atoms (exported for the LOCAL pass) ---- */
  function statStrip(items) {
    var w = el('div', 'ngv-stats');
    items.forEach(function (it) {
      var s = el('div', 'ngv-stat');
      s.appendChild(el('div', 'v', it.v));
      s.appendChild(el('div', 'k', it.k));
      if (it.s) s.appendChild(el('div', 's', it.s));
      w.appendChild(s);
    });
    return w;
  }
  function strip(items) {
    var tot = 0; items.forEach(function (i) { tot += i.v; });
    var wrap = el('div');
    var bar = el('div', 'ngv-strip');
    items.forEach(function (i) {
      var s = el('span'); s.style.width = (tot ? i.v / tot * 100 : 0) + '%';
      s.style.background = i.c; s.title = i.l + ' \u00b7 ' + IN(i.v);
      bar.appendChild(s);
    });
    wrap.appendChild(bar);
    var leg = el('div', 'ngv-leg');
    items.forEach(function (i) {
      var g = el('span', 'lg');
      var sw = el('span', 'sw'); sw.style.background = i.c; g.appendChild(sw);
      g.appendChild(document.createTextNode(i.l + ' ' + (tot ? (i.v / tot * 100).toFixed(0) : 0) + '% \u00b7 ' + IN(i.v)));
      leg.appendChild(g);
    });
    wrap.appendChild(leg);
    return wrap;
  }
  function cbars(items, unit, dec) {
    var w = el('div', 'ngv-cbars');
    var max = 1; items.forEach(function (i) { if (Math.abs(i.v) > max) max = Math.abs(i.v); });
    items.forEach(function (i) {
      var r = el('div', 'ngv-cbar');
      r.appendChild(el('span', 'l', i.l));
      var t = el('span', 't');
      var f = el('span', 'f');
      f.style.width = Math.max(1.5, Math.abs(i.v) / max * 100) + '%';
      f.style.background = i.c || 'var(--accent,#E0552A)';
      t.appendChild(f); r.appendChild(t);
      r.appendChild(el('span', 'v', (i.v < 0 ? '\u2212' : '') + IN(Math.abs(i.v), dec) + (unit || '')));
      w.appendChild(r);
    });
    return w;
  }
  function partyLegend(parties) {
    var leg = el('div', 'ngv-leg');
    parties.forEach(function (p) {
      var g = el('span', 'lg');
      var sw = el('span', 'sw'); sw.style.background = pc(p); g.appendChild(sw);
      g.appendChild(document.createTextNode(p));
      leg.appendChild(g);
    });
    return leg;
  }
  function leaderGrid(items, cols, rlabel) { /*V2PASS87 rlabel: the trailing column is not always a margin*/
    var g = el('div', 'ngv-grid');
    g.appendChild(el('span', 'hd', ''));
    cols.forEach(function (c) { g.appendChild(el('span', 'hd', c)); });
    g.appendChild(el('span', 'hd', rlabel || 'Margin 22'));
    items.forEach(function (it) {
      g.appendChild(el('span', 'nm', it.l));
      it.cells.forEach(function (p) {
        var c = el('span', 'cell', p || '\u2014');
        c.style.background = p ? pc(p) : 'var(--n100,#F1F3F5)';
        if (!p) c.style.color = 'var(--n400,#A9B0B8)';
        g.appendChild(c);
      });
      g.appendChild(el('span', 'mg', it.r || ''));
    });
    return g;
  }
  window.__niyGoaViz = { PARTY: PARTY, BAND: BAND, BANDS: BANDS, BLOCC: BLOCC, pc: pc,
    statStrip: statStrip, strip: strip, cbars: cbars, leaderGrid: leaderGrid, partyLegend: partyLegend, IN: IN, rows: rows };

  function acName() {
    var m = {};
    rows('geo_state_seats').forEach(function (s) { m[s.ac] = s.name; });
    return m;
  }

  /* ================ 1. CONSTITUENCY REGISTER — state of play ================ */
  function buildGS1(detail) {
    if (document.getElementById('niyGS1')) return;
    var K = kit(); var S = rows('geo_state_seats'); var R = rows('geo_state_results');
    if (!K || !S.length) return;
    var s1 = K.sec('niyGS1', 'Where the 2027 Election Stands');
    var elec = 0, inplay = 0;
    S.forEach(function (r) { elec += r.electors; inplay += (r.inPlay || 0); });
    var u12 = R.filter(function (r) { return r.margin2022 < 12; }).length;
    var u5 = R.filter(function (r) { return r.margin2022 < 5; }).length;
    var p22 = {}, p24 = {};
    R.forEach(function (r) { if (r.w2022) p22[r.w2022] = 1; if (r.w2024) p24[r.w2024] = 1; });
    s1.body.appendChild(statStrip([
      { v: IN(elec), k: 'Electors on the final roll', s: S.length + ' constituencies' },
      { v: u12 + ' / ' + R.length, k: 'Seats won by under 12%', s: u5 + ' were under 5%' },
      { v: IN(inplay), k: 'Electors in play', s: 'in difficult + marginal booths, across ' + S.length + ' seats' },
      { v: Object.keys(p22).length + ' \u2192 ' + Object.keys(p24).length, k: 'Parties leading seats', s: '2022 Assembly \u2192 2024 Lok Sabha' }
    ]));
    var byBand = {};
    S.forEach(function (r) { byBand[r.status] = (byBand[r.status] || 0) + 1; });
    s1.body.appendChild(el('div', 'nvz-title', 'Seats by status'));
    s1.body.appendChild(strip(BANDS.map(function (b) { return { l: b, v: byBand[b] || 0, c: BAND[b] }; })));
    s1.status.textContent = 'Goa \u00b7 final SIR roll \u00b7 computed from the module dataset';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS1() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS1', function (block, K) {
      /*V2PASS86: the band split is the feed strip; chart what the strip cannot show \u2014 how much
        of each band's electorate is actually contested*/
      var S = rows('geo_state_seats');
      var acc = {};
      S.forEach(function (r) {
        if (!acc[r.status]) acc[r.status] = { e: 0, p: 0 };
        acc[r.status].e += r.electors; acc[r.status].p += (r.inPlay || 0);
      });
      block.appendChild(K.el('div', 'nvz-title', 'Contested Share of Each Band'));
      block.appendChild(K.el('div', 'nvz-sub', 'in-play electors as % of the band'));
      block.appendChild(cbars(BANDS.filter(function (b) { return acc[b]; }).map(function (b) {
        return { l: b, v: +(acc[b].p / acc[b].e * 100).toFixed(1), c: BAND[b] };
      }), '%', 1));
    });
  }

  /* ================ 2. ELECTION RESULTS — who led, four elections ================ */
  function buildGS2(detail) {
    if (document.getElementById('niyGS2')) return;
    var K = kit(); var R = rows('geo_state_results');
    if (!K || !R.length) return;
    var s1 = K.sec('niyGS2', 'Who Led, Four Elections Running');
    var DEC = window.__niyDeclared || {};   /*V2PASS87 declared house*/
    function w22(r) { return DEC[r.ac] ? DEC[r.ac].party : r.w2022; }
    var seen = {};
    R.forEach(function (r) { [r.w2017, r.w2019, w22(r), r.w2024].forEach(function (p) { if (p) seen[p] = 1; }); });
    s1.body.appendChild(partyLegend(Object.keys(seen)));
    s1.body.appendChild(leaderGrid(R.map(function (r) {
      return { l: (r.ac < 10 ? '0' : '') + r.ac + ' ' + r.name + (DEC[r.ac] ? ' \u2020' : ''),
        cells: [r.w2017, r.w2019, w22(r), r.w2024],
        r: DEC[r.ac] && DEC[r.ac].margin != null ? DEC[r.ac].margin.toFixed(1) + '%'
           : (r.margin2022 != null ? r.margin2022.toFixed(1) + '%' : '') };
    }), ['2017', '2019', '2022', '2024']));
    if (window.__niyDeclAll && window.__niyDeclAll())
      s1.body.appendChild(el('div', 'nls-note', '\u2020 ' + window.__niyDeclAll()));
    s1.status.textContent = '2022 is the declared result \u00b7 2017, 2019 and 2024 are Form 20 leads';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS2() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS2', function (block, K) {
      var R = rows('geo_state_results');
      function tally(k) {
        var m = {};
        R.forEach(function (r) { var p = r[k]; if (p) m[p] = (m[p] || 0) + 1; });
        return Object.keys(m).map(function (p) { return { l: p, v: m[p], c: pc(p) }; })
          .sort(function (a, b) { return b.v - a.v; });
      }
      /*V2PASS88: one small-multiple of the whole sequence beats three identical bar charts*/
      var DEC = window.__niyDeclared || {};
      block.appendChild(K.el('div', 'nvz-title', 'Party Strength, Four Elections Running'));
      block.appendChild(K.el('div', 'nvz-sub', 'share of the ' + R.length + ' seats led \u00b7 2022 counts the declared result'));
      [['w2017', '2017 Assembly'], ['w2019', '2019 Lok Sabha'], ['w2022', '2022 Assembly'], ['w2024', '2024 Lok Sabha']]
        .forEach(function (y) {
          var m = {};
          R.forEach(function (r) {
            var p = (y[0] === 'w2022' && DEC[r.ac]) ? DEC[r.ac].party : r[y[0]];
            if (p) m[p] = (m[p] || 0) + 1;
          });
          var items = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; })
            .map(function (p) { return { l: p, v: m[p], c: pc(p) }; });
          block.appendChild(K.el('div', 'nvz-sub', y[1]));
          block.appendChild(strip(items));
        });
      var churn = 0;
      R.forEach(function (r) { var a = DEC[r.ac] ? DEC[r.ac].party : r.w2022; if (a && r.w2024 && a !== r.w2024) churn++; });
      block.appendChild(K.el('div', 'nvz-sub', churn + ' of ' + R.length + ' seats led by a different party in 2024 than in 2022'));
    });
  }

  /* ================ 3. SPLIT-TICKET — the same voters, two verdicts ================ */
  function buildGS3(detail) {
    if (document.getElementById('niyGS3')) return;
    var K = kit(); var S = rows('geo_state_split');
    if (!K || !S.length) return;
    var s1 = K.sec('niyGS3', 'The Same Voters, Two Verdicts \u2014 BJP AC22 vs LS24');
    var wAc = 0, wLs = 0, tot = 0;
    S.forEach(function (r) { wAc += (r.ac22 || 0) * r.electors; wLs += (r.ls24 || 0) * r.electors; tot += r.electors; });
    var mAc = wAc / tot, mLs = wLs / tot;
    s1.body.appendChild(statStrip([
      { v: mLs.toFixed(0) + '% vs ' + mAc.toFixed(0) + '%', k: 'BJP share \u2014 national vs state', s: '2024 Lok Sabha vs 2022 Assembly, same seats' },
      { v: '+' + (mLs - mAc).toFixed(1) + ' pts', k: 'Average national premium', s: 'elector-weighted' },
      { v: S.filter(function (r) { return (r.gap || 0) > 10; }).length + ' / ' + S.length, k: 'Seats with a gap above 10 pts' }
    ]));
    var top = S.slice().sort(function (a, b) { return (b.gap || 0) - (a.gap || 0); }).slice(0, 12);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Constituency', 'BJP AC 2022 %', 'BJP LS 2024 %', 'Gain (pts)'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    top.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r.name));
      tr.appendChild(K.el('td', 'nls-num', (r.ac22 || 0).toFixed(1)));
      tr.appendChild(K.el('td', 'nls-num', (r.ls24 || 0).toFixed(1)));
      var d = K.el('td', 'nls-num', '+' + (r.gap || 0).toFixed(1));
      d.style.color = '#A93B2B'; tr.appendChild(d);
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(el('div', 'nvz-title', 'Largest national premiums'));
    s1.body.appendChild(tb);
    s1.status.textContent = 'Form 20 \u00b7 same-seat comparison';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS3() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS3', function (block, K) {
      var S = rows('geo_state_split'), g = window.__niyGoaViz;   /*V2PASS88*/
      block.appendChild(K.el('div', 'nvz-title', 'The Same Seat, Two Verdicts'));
      block.appendChild(K.el('div', 'nvz-sub', 'one dot per constituency \u00b7 above the dashed line the seat voted more BJP nationally than at the state poll'));
      if (g && g.scatter) block.appendChild(g.scatter(S.map(function (r) {
        return { x: r.ac22 || 0, y: r.ls24 || 0, c: PARTY.BJP,
          l: r.name + ' \u2014 AC ' + (r.ac22 || 0).toFixed(1) + '%, LS ' + (r.ls24 || 0).toFixed(1) + '%' };
      }), { diagonal: 1, xlab: 'BJP % \u2014 2022 Assembly', ylab: 'BJP % \u2014 2024 LS' }));
      var bins = [['loses ground', 0], ['0\u20135 pts', 0], ['5\u201310 pts', 0], ['10\u201320 pts', 0], ['20+ pts', 0]];
      S.forEach(function (r) { var gp = r.gap || 0; bins[gp < 0 ? 0 : gp < 5 ? 1 : gp < 10 ? 2 : gp < 20 ? 3 : 4][1]++; });
      block.appendChild(K.el('div', 'nvz-title', 'How Wide the National Premium Runs'));
      block.appendChild(K.el('div', 'nvz-sub', 'every seat, not just the widest twelve'));
      block.appendChild(cbars(bins.map(function (b, i) {
        return { l: b[0], v: b[1], c: ['#7FA0A8', '#C9A98F', '#D98A3C', '#C4632F', '#A93B2B'][i] };
      })));
    });
  }

  /* ================ 4. COMMUNITY BLOC MATRIX — religion & caste on the roll ================ */
  function blocTotals() {
    var B = rows('geo_state_blocs');
    var t = { catholic: 0, muslim: 0, st: 0, obc: 0, general: 0, sc: 0, unclassified: 0, electors: 0 };
    B.forEach(function (r) {
      t.electors += r.electors;
      ['catholic', 'muslim', 'st', 'obc', 'general', 'sc', 'unclassified'].forEach(function (k) {
        t[k] += (r[k] || 0) / 100 * r.electors;
      });
    });
    return t;
  }
  function buildGS4(detail) {
    if (document.getElementById('niyGS4')) return;
    var K = kit(); var B = rows('geo_state_blocs');
    if (!K || !B.length) return;
    var s1 = K.sec('niyGS4', 'Community Blocs on the Roll');
    var t = blocTotals();
    var hindu = t.st + t.obc + t.general + t.sc;
    s1.body.appendChild(el('div', 'nvz-title', 'Religion on the roll'));
    s1.body.appendChild(strip([
      { l: 'Hindu', v: hindu, c: BLOCC['Hindu'] },
      { l: 'Catholic', v: t.catholic, c: BLOCC['Catholic'] },
      { l: 'Muslim', v: t.muslim, c: BLOCC['Muslim'] },
      { l: 'Other / uncl.', v: t.unclassified, c: BLOCC['Other / uncl.'] }
    ]));
    s1.body.appendChild(el('div', 'nvz-title', 'Caste category among Hindu electors'));
    s1.body.appendChild(strip([
      { l: 'OBC', v: t.obc, c: '#D98A3C' }, { l: 'General', v: t.general, c: '#E07B39' },
      { l: 'SC', v: t.sc, c: '#C05C5C' }, { l: 'ST', v: t.st, c: '#8B6BA8' }
    ]));
    /*V2PASS87: read the same partition the strips draw \u2014 Hindu is a majority, so the old note was false*/
    var cN = ['OBC', 'General', 'SC', 'ST'], cV = [t.obc, t.general, t.sc, t.st];
    var ci = cV.indexOf(Math.max.apply(null, cV));
    function sh(v) { return (v / t.electors * 100).toFixed(0) + '%'; }
    s1.body.appendChild(el('div', 'nls-note',
      'Hindu electors are ' + sh(hindu) + ' of the roll, Catholic ' + sh(t.catholic) + ' and Muslim ' + sh(t.muslim) +
      '. The largest caste category is ' + cN[ci] + ' at ' + sh(cV[ci]) + ' of all electors \u2014 no caste category is close to a majority.'));
    var top = B.slice().sort(function (a, b) { return (b.catholic + b.muslim) - (a.catholic + a.muslim); }).slice(0, 10);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Constituency', 'Catholic %', 'Muslim %', 'Largest bloc'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    var SN = {};
    rows('geo_state_seats').forEach(function (s) { SN[s.ac] = s.bloc; });
    top.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r.name));
      tr.appendChild(K.el('td', 'nls-num', (r.catholic || 0).toFixed(1)));
      tr.appendChild(K.el('td', 'nls-num', (r.muslim || 0).toFixed(1)));
      tr.appendChild(K.el('td', null, SN[r.ac] || ''));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(el('div', 'nvz-title', 'Highest minority share'));
    s1.body.appendChild(tb);
    s1.body.appendChild(el('div', 'nls-note',
      'Method: each name on the final roll is classified by surname against a reference lexicon and aggregated to booth, then to constituency. Surname classification is indicative of community, not self-declared identity; names it cannot place are carried as unclassified rather than distributed.'));
    s1.status.textContent = 'surname-classified roll \u00b7 method stated above';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS4() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS4', function (block, K) {
      /*V2PASS88: the feed already draws both strips \u2014 analytics relates community to the contest*/
      var B = rows('geo_state_blocs'), RR = rows('geo_state_results'), g = window.__niyGoaViz;
      var mg = {}; RR.forEach(function (r) { mg[r.ac] = r.margin2022; });
      block.appendChild(K.el('div', 'nvz-title', 'Minority Share Against the 2022 Margin'));
      block.appendChild(K.el('div', 'nvz-sub', 'one dot per constituency \u00b7 does a larger Catholic + Muslim roll make a seat closer?'));
      if (g && g.scatter) block.appendChild(g.scatter(B.map(function (r) {
        return { x: (r.catholic || 0) + (r.muslim || 0), y: mg[r.ac], c: BLOCC['Catholic'],
          l: r.name + ' \u2014 ' + ((r.catholic || 0) + (r.muslim || 0)).toFixed(1) + '% minority, won by ' +
             (mg[r.ac] != null ? mg[r.ac].toFixed(1) + '%' : 'n/a') };
      }), { zero: 1, xlab: 'Catholic + Muslim % of the roll', ylab: 'Won by %' }));
      var cb = [['under 5%', 0], ['5\u201315%', 0], ['15\u201330%', 0], ['30\u201350%', 0], ['50%+', 0]];
      B.forEach(function (r) { var c = r.catholic || 0; cb[c < 5 ? 0 : c < 15 ? 1 : c < 30 ? 2 : c < 50 ? 3 : 4][1]++; });
      block.appendChild(K.el('div', 'nvz-title', 'How Concentrated the Catholic Roll Is'));
      block.appendChild(K.el('div', 'nvz-sub', 'constituencies by Catholic share \u00b7 all ' + B.length + ' seats'));
      block.appendChild(cbars(cb.map(function (b) { return { l: b[0], v: b[1], c: BLOCC['Catholic'] }; })));
    });
  }

  /* ================ 5. ROLL DEMOGRAPHY ================ */
  function buildGS5(detail) {
    if (document.getElementById('niyGS5')) return;
    var K = kit(); var S = rows('geo_state_demog');
    if (!K || !S.length) return;
    var s1 = K.sec('niyGS5', 'The Shape of the Roll');
    var m = 0, f = 0, ages = 0, young = 0, senior = 0;
    S.forEach(function (r) { m += r.male; f += r.female; ages += r.medianAge; young += r.young; senior += r.senior; });
    s1.body.appendChild(statStrip([
      { v: IN(f / m * 1000, 0), k: 'Females per 1,000 males', s: 'statewide roll' },
      { v: (ages / S.length).toFixed(1), k: 'Median age (mean of ACs)' },
      { v: (young / S.length).toFixed(1) + '%', k: 'Young electors (mean share)' },
      { v: (senior / S.length).toFixed(1) + '%', k: 'Senior electors (mean share)' }
    ]));
    s1.status.textContent = 'final SIR roll \u00b7 computed';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS5() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS5', function (block, K) {
      /*V2PASS88: a top-8 re-rank hid the low tail \u2014 show every seat's distribution instead*/
      var S = rows('geo_state_demog'), g = window.__niyGoaViz;
      var sb = [['under 950', 0], ['950\u20131,000', 0], ['1,000\u20131,050', 0], ['1,050\u20131,100', 0], ['1,100+', 0]];
      S.forEach(function (r) {
        var v = r.sexRatio; sb[v < 950 ? 0 : v < 1000 ? 1 : v < 1050 ? 2 : v < 1100 ? 3 : 4][1]++;
      });
      block.appendChild(K.el('div', 'nvz-title', 'Sex Ratio Across Every Seat'));
      block.appendChild(K.el('div', 'nvz-sub', 'females per 1,000 males \u00b7 all ' + S.length + ' constituencies, both tails visible'));
      block.appendChild(cbars(sb.map(function (b, i) {
        return { l: b[0], v: b[1], c: ['#A93B2B', '#D98A3C', '#C9A98F', '#7FA0A8', '#35657A'][i] };
      })));
      block.appendChild(K.el('div', 'nvz-title', 'An Older Roll Is a Smaller-Youth Roll'));
      block.appendChild(K.el('div', 'nvz-sub', 'median age against the young-elector share, one dot per seat'));
      if (g && g.scatter) block.appendChild(g.scatter(S.map(function (r) {
        return { x: r.medianAge, y: r.young, c: '#35657A',
          l: r.name + ' \u2014 median ' + r.medianAge.toFixed(1) + ', young ' + r.young.toFixed(1) + '%' };
      }), { xlab: 'Median age', ylab: 'Young electors %' }));
    });
  }

  /* ================ 6. SIR ROLL CHURN ================ */
  function buildGS6(detail) {
    if (document.getElementById('niyGS6')) return;
    var K = kit(); var C = rows('geo_state_churn');
    /*V2PASS87: the January base must cover the same seats as the churn feed, or the two panels disagree*/
    var inScope = {}; rows('geo_state_seats').forEach(function (s) { inScope[s.ac] = 1; });
    var P = (window.__niyGoaPreSIR || []).filter(function (r) { return inScope[r.ac]; });
    if (!K || (!C.length && !P.length)) return;
    var s1 = K.sec('niyGS6', 'What the SIR Cut From the Roll');
    if (P.length) {
      var pDel = 0, pAdd = 0, pPre = 0;
      P.forEach(function (r) { pDel += r.del; pAdd += r.add; pPre += r.pre; });
      s1.body.appendChild(statStrip([
        { v: '\u2212' + IN(pDel), k: 'Names deleted', s: 'January 2025 roll \u2192 final SIR roll' },
        { v: '+' + IN(pAdd), k: 'Names added' },
        { v: (pDel / pPre * 100).toFixed(1) + '%', k: 'Of the January roll removed', s: IN(pPre) + ' names in January 2025' }
      ]));
      var top = P.slice().sort(function (a, b) { return b.del - a.del; }).slice(0, 12);
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Constituency', 'Jan 2025 roll', 'Deleted', 'Added', 'Deleted %'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      top.forEach(function (r) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, r.name));
        tr.appendChild(K.el('td', 'nls-num', IN(r.pre)));
        var d = K.el('td', 'nls-num', '\u2212' + IN(r.del)); d.style.color = '#A93B2B'; tr.appendChild(d);
        tr.appendChild(K.el('td', 'nls-num', '+' + IN(r.add)));
        tr.appendChild(K.el('td', 'nls-num', r.delPct.toFixed(1)));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(el('div', 'nvz-title', 'Deepest cuts \u2014 January 2025 to final'));
      s1.body.appendChild(tb);
    }
    if (C.length) {
      var add = 0, rem = 0;
      C.forEach(function (r) { add += r.added; rem += r.removed; });
      s1.body.appendChild(el('div', 'nvz-title', 'The refinement round \u2014 draft SIR to final SIR'));
      s1.body.appendChild(statStrip([
        { v: '+' + IN(add), k: 'Added at claims & objections' },
        { v: '\u2212' + IN(rem), k: 'Removed at claims & objections' },
        { v: (add - rem >= 0 ? '+' : '\u2212') + IN(Math.abs(add - rem)), k: 'Net change, draft \u2192 final' }
      ]));
    }
    s1.status.textContent = 'two bases \u00b7 January 2025 \u2192 final, and draft \u2192 final';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS6() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS6', function (block, K) {
      /*V2PASS88: the feed table already ranks deletions \u2014 chart the shape of the churn instead*/
      var inScope = {}; rows('geo_state_seats').forEach(function (s) { inScope[s.ac] = 1; });
      var P = (window.__niyGoaPreSIR || []).filter(function (r) { return inScope[r.ac]; });
      var g = window.__niyGoaViz;
      if (P.length) {
        block.appendChild(K.el('div', 'nvz-title', 'Deletions Against Additions'));
        block.appendChild(K.el('div', 'nvz-sub', 'one dot per constituency \u00b7 the dashed line is one name added for every one removed'));
        if (g && g.scatter) block.appendChild(g.scatter(P.map(function (r) {
          return { x: r.del, y: r.add, c: '#A93B2B',
            l: r.name + ' \u2014 \u2212' + r.del + ' / +' + r.add + ' (' + r.delPct.toFixed(1) + '% cut)' };
        }), { zero: 1, diagonal: 1, xlab: 'Names deleted', ylab: 'Names added' }));
        var db = [['under 10%', 0], ['10\u201315%', 0], ['15\u201320%', 0], ['20\u201325%', 0], ['25%+', 0]];
        P.forEach(function (r) { var d = r.delPct; db[d < 10 ? 0 : d < 15 ? 1 : d < 20 ? 2 : d < 25 ? 3 : 4][1]++; });
        block.appendChild(K.el('div', 'nvz-title', 'How Deep the Cut Went, Seat by Seat'));
        block.appendChild(K.el('div', 'nvz-sub', 'share of the January 2025 roll removed \u00b7 all ' + P.length + ' seats in scope'));
        block.appendChild(cbars(db.map(function (b, i) {
          return { l: b[0], v: b[1], c: ['#7FA0A8', '#C9A98F', '#D98A3C', '#C4632F', '#A93B2B'][i] };
        })));
      }
      var C = rows('geo_state_churn');
      if (C.length) {
        block.appendChild(K.el('div', 'nvz-title', 'Refinement Round \u2014 Added, Draft to Final'));
        block.appendChild(cbars(C.slice().sort(function (a, b) { return b.added - a.added; })
          .slice(0, 8).map(function (r) { return { l: r.name, v: r.added, c: '#35657A' }; })));
      }
    });
  }

  /* ================ 7. REGISTRATION GAP ================ */
  function buildGS7(detail) {
    if (document.getElementById('niyGS7')) return;
    var K = kit(); var G = rows('geo_state_gap');
    if (!K || !G.length) return;
    var s1 = K.sec('niyGS7', 'The Missing First-Time Voters');
    var missing = 0, aged = 0;
    G.forEach(function (r) { missing += r.missing; aged += r.aged; });
    var worst = G.slice().sort(function (a, b) { return b.missing - a.missing; })[0];
    s1.body.appendChild(statStrip([
      { v: IN(missing), k: '18\u201319-year-olds missing (estimate)', s: 'projected cohort less names on the roll' },
      { v: IN(aged), k: '18\u201319-year-olds on the final roll', s: 'counted' },
      { v: worst.name, k: 'Widest gap', s: IN(worst.missing) + ' missing \u00b7 ' + worst.pct.toFixed(1) + '% of electors' }
    ]));
    s1.body.appendChild(el('div', 'nls-note',
      'Basis: the 18\u201319 cohort implied by each constituency\u2019s age structure, set against the 18\u201319-year-olds actually on the final SIR roll. The shortfall is an estimate carried in the state pack, not a headcount \u2014 read it as a registration signal, not a census figure.'));
    s1.status.textContent = 'estimated cohort vs counted roll \u00b7 basis above';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS7() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS7', function (block, K) {
      /*V2PASS88: relate the shortfall to the cohort actually registered*/
      var G = rows('geo_state_gap'), g = window.__niyGoaViz;
      block.appendChild(K.el('div', 'nvz-title', 'Registered Against Missing'));
      block.appendChild(K.el('div', 'nvz-sub', 'one dot per constituency \u00b7 seats to the upper-left register the fewest of the cohort they should'));
      if (g && g.scatter) block.appendChild(g.scatter(G.map(function (r) {
        return { x: r.aged, y: r.missing, c: '#D98A3C',
          l: r.name + ' \u2014 ' + r.aged + ' on the roll, ' + r.missing + ' missing (' + r.pct.toFixed(1) + '%)' };
      }), { zero: 1, diagonal: 1, xlab: '18\u201319s on the roll', ylab: '18\u201319s missing (est.)' }));
      var gb = [['under 0.5%', 0], ['0.5\u20131%', 0], ['1\u20131.5%', 0], ['1.5\u20132%', 0], ['2%+', 0]];
      G.forEach(function (r) { var p = r.pct; gb[p < 0.5 ? 0 : p < 1 ? 1 : p < 1.5 ? 2 : p < 2 ? 3 : 4][1]++; });
      block.appendChild(K.el('div', 'nvz-title', 'The Shortfall as a Share of the Roll'));
      block.appendChild(K.el('div', 'nvz-sub', 'all ' + G.length + ' constituencies'));
      block.appendChild(cbars(gb.map(function (b, i) {
        return { l: b[0], v: b[1], c: ['#7FA0A8', '#C9A98F', '#D98A3C', '#C4632F', '#A93B2B'][i] };
      })));
    });
  }

  /* ================ 8. BOOTH-LEVEL RESULTS — 787 booths decide ================ */
  function buildGS8(detail, sig) {
    var K = kit(); var B = rows('geo_local_booths');
    if (!K || !B.length) return;
    /*V2PASS91: this moved to LOCAL in pass 82 \u2014 it has to follow the scope like every local section*/
    var old = document.getElementById('niyGS8');
    if (old) { if (old.getAttribute('data-sig') === (sig || '')) return; old.parentNode.removeChild(old); }
    var s1 = K.sec('niyGS8', 'The Booths That Decide the Assembly');
    s1.wrap.setAttribute('data-sig', sig || '');
    var byBand = {}, byBandE = {};
    B.forEach(function (r) {
      if (!BAND[r.status]) return;
      byBand[r.status] = (byBand[r.status] || 0) + 1;
      byBandE[r.status] = (byBandE[r.status] || 0) + r.electors;
    });
    var inPlayB = (byBand.Difficult || 0) + (byBand.Marginal || 0);
    var inPlayE = (byBandE.Difficult || 0) + (byBandE.Marginal || 0);
    s1.body.appendChild(statStrip([
      { v: IN(inPlayB), k: 'Difficult + marginal booths', s: 'the contested ground' },
      { v: IN(inPlayE), k: 'Electors in those booths' },
      { v: IN(byBand.Battlefield || 0), k: 'Battlefield booths', s: IN(byBandE.Battlefield || 0) + ' electors' }
    ]));
    s1.body.appendChild(el('div', 'nvz-title', 'Every booth, by 2022 closeness'));
    s1.body.appendChild(strip(BANDS.map(function (b) { return { l: b, v: byBandE[b] || 0, c: BAND[b] }; })));
    var AN = acName();
    var top = B.filter(function (r) { return r.status === 'Battlefield'; })
      .sort(function (a, b) { return b.electors - a.electors; }).slice(0, 20);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Constituency', 'Booth', 'Polling station', 'Electors', '2022', '2024', 'Largest bloc'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    top.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, AN[r.ac] || r.ac));
      tr.appendChild(K.el('td', 'nls-num', String(r.booth)));
      tr.appendChild(K.el('td', null, (r.station || '').slice(0, 52)));
      tr.appendChild(K.el('td', 'nls-num', IN(r.electors)));
      [r.l22, r.l24].forEach(function (p) {
        var td = K.el('td', null, p || '\u2014');
        if (p) { td.style.color = pc(p); td.style.fontWeight = '600'; }
        tr.appendChild(td);
      });
      tr.appendChild(K.el('td', null, r.bloc || ''));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(el('div', 'nvz-title', 'Largest battlefield booths'));
    s1.body.appendChild(tb);
    s1.status.textContent = IN(B.length) + ' booths in scope \u00b7 bands from 2022 booth results';
    K.host(detail).appendChild(s1.wrap);
  }
  function vizGS8() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizGS8', function (block, K) {
      var B = rows('geo_local_booths');
      var byBand = {}, byBandE = {};
      B.forEach(function (r) {
        if (!BAND[r.status]) return;
        byBand[r.status] = (byBand[r.status] || 0) + 1;
        byBandE[r.status] = (byBandE[r.status] || 0) + r.electors;
      });
      block.appendChild(K.el('div', 'nvz-title', 'Booths by 2022 Margin Band'));
      block.appendChild(cbars(BANDS.map(function (b) { return { l: b, v: byBand[b] || 0, c: BAND[b] }; })));
      /*V2PASS88: the feed strip already carries electors by band \u2014 chart booth SIZE instead*/
      block.appendChild(K.el('div', 'nvz-title', 'Average Booth Size in Each Band'));
      block.appendChild(K.el('div', 'nvz-sub', 'electors per booth \u00b7 are the close booths the big ones?'));
      block.appendChild(cbars(BANDS.map(function (b) {
        var n = byBand[b] || 0;
        return { l: b, v: n ? Math.round((byBandE[b] || 0) / n) : 0, c: BAND[b] };
      })));
    });
  }

  /* ================ mount loop ================ */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = {
    'geo_state_seats': [buildGS1, 'niyVizGS1', vizGS1],
    'geo_state_results': [buildGS2, 'niyVizGS2', vizGS2],
    'geo_state_split': [buildGS3, 'niyVizGS3', vizGS3],
    'geo_state_blocs': [buildGS4, 'niyVizGS4', vizGS4],
    'geo_state_demog': [buildGS5, 'niyVizGS5', vizGS5],
    'geo_state_churn': [buildGS6, 'niyVizGS6', vizGS6],
    'geo_state_gap': [buildGS7, 'niyVizGS7', vizGS7],
    'Booth-Level Results': [buildGS8, 'niyVizGS8', vizGS8],
    'Booth-level Results Database': [buildGS8, 'niyVizGS8', vizGS8]
  };
  var ALL_VIZ = ['niyVizGS1', 'niyVizGS2', 'niyVizGS3', 'niyVizGS4', 'niyVizGS5', 'niyVizGS6', 'niyVizGS7', 'niyVizGS8'];
  function unmount(ids) { var V = viz(); if (V) V.unmountViz(ids); }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'state' && a.tier !== 'local') { unmount(ALL_VIZ); return; } /*V2PASS82 booth results moved to local*/
      var e = (a.tier === 'state' ? MAP[a.csv] : null) || MAP[activeLabel()];
      if (!e) { unmount(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      /*V2PASS94: one scope signature for the whole desk \u2014 a stale section must not outlive a scope change*/
      function sigOf(csv) {
        var r = rows(csv);
        return r.length ? (r.length + '|' + (r[0].ac != null ? r[0].ac : '?') + '|' + (r[r.length - 1].ac != null ? r[r.length - 1].ac : '?')) : '0';
      }
      var sig = sigOf(a.tier === 'state' ? (a.csv || 'geo_state_seats') : 'geo_local_booths');
      var prior = d.querySelector('[id^="niyGS"]');
      if (prior && prior.getAttribute('data-sig') !== null && prior.getAttribute('data-sig') !== sig) {
        if (prior.parentNode) prior.parentNode.removeChild(prior);
        unmount(ALL_VIZ);
      }
      e[0](d, sig);
      var made = d.querySelector('[id^="niyGS"]');
      if (made && made.getAttribute('data-sig') === null) made.setAttribute('data-sig', sig);
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