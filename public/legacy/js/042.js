/* V2 PASS 68 Geonomics live layer — World Bank · live futures · GDELT 2.0 */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }

  /* ---------------- GLOBAL TRADE ---------------- */
  var GT_CC = 'USA;CHN;IND;DEU;JPN;GBR;FRA;BRA;ITA;CAN;RUS;KOR;AUS;MEX;IDN;SAU;TUR;NLD;CHE;ESP';
  function wbInd(ind, key) {
    var K = kit();
    return K.jget(key, 'https://api.worldbank.org/v2/country/' + GT_CC + '/indicator/' + ind +
      '?format=json&mrv=1&per_page=25', 24 * 3600000)
      .then(function (j) {
        var out = {};
        ((j && j[1]) || []).forEach(function (r) {
          if (r && r.country && r.value != null) out[r.country.value] = { v: r.value, y: r.date };
        });
        return out;
      });
  }
  function buildGT(detail) {
    if (document.getElementById('niySecGT')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecGT';
    var s1 = K.sec('niySecGT1', 'Trade Monitor \u2014 World Bank open data');
    var s2 = K.sec('niySecGT2', 'Trade Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    Promise.all([wbInd('TX.VAL.MRCH.CD.WT', 'gt:exp'), wbInd('NE.TRD.GNFS.ZS', 'gt:trd')])
      .then(function (res) {
        var exp = res[0], trd = res[1];
        var rows = Object.keys(exp).map(function (c) {
          return { c: c, y: exp[c].y, e: exp[c].v, t: trd[c] ? trd[c].v : null };
        }).sort(function (a, b) { return b.e - a.e; });
        if (!rows.length) throw new Error('empty');
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Economy', 'Year', 'Merch. exports (US$ bn)', 'Trade (% of GDP)'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        rows.forEach(function (r) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, r.c));
          tr.appendChild(K.el('td', 'nls-num', r.y));
          tr.appendChild(K.el('td', 'nls-num', (r.e / 1e9).toLocaleString('en-IN', { maximumFractionDigits: 0 })));
          tr.appendChild(K.el('td', 'nls-num', r.t == null ? '\u2014' : r.t.toFixed(1)));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.innerHTML = ''; s1.body.appendChild(tb);
        s1.status.textContent = 'LIVE \u00b7 World Bank \u00b7 cached 24h';
      })
      .catch(function () { K.offline(s1, 'World Bank open-data API unreachable from this network \u2014 it will retry automatically.'); });
    setTimeout(function () {
      K.gdelt('gt:wire', '("trade deal" OR tariffs OR "trade war" OR WTO OR "export controls")', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- CRITICAL MINERALS ---------------- */
  var MINERALS = [
    ['Lithium', 'Australia \u00b7 Chile \u00b7 China', 'Batteries; brine + hard-rock supply'],
    ['Cobalt', 'DR Congo (~70%) \u00b7 Indonesia \u00b7 Russia', 'Cathodes; DRC concentration risk'],
    ['Nickel (class 1)', 'Indonesia \u00b7 Philippines \u00b7 Russia', 'Batteries + stainless; Indonesian HPAL build-out'],
    ['Rare earths', 'China \u00b7 United States \u00b7 Myanmar', 'Magnets; China dominates refining (~90%)'],
    ['Copper', 'Chile \u00b7 Peru \u00b7 DR Congo', 'Grid + EV wiring; structural deficit projected'],
    ['Graphite (natural)', 'China \u00b7 Mozambique \u00b7 Madagascar', 'Anodes; China export permits since 2023'],
    ['Gallium / Germanium', 'China (dominant)', 'Semiconductors; Chinese export controls since 2023'],
    ['Manganese', 'South Africa \u00b7 Gabon \u00b7 Australia', 'Steel + LMFP cathodes'],
    ['Platinum group', 'South Africa \u00b7 Russia \u00b7 Zimbabwe', 'Catalysis + hydrogen electrolysers'],
    ['Uranium', 'Kazakhstan \u00b7 Canada \u00b7 Namibia', 'Fuel cycle; conversion/enrichment bottlenecks']
  ];
  function buildCM(detail) {
    if (document.getElementById('niySecCM')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecCM';
    var s1 = K.sec('niySecCM1', 'Supply Concentration \u2014 curated reference');
    var s2 = K.sec('niySecCM2', 'Minerals Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Mineral', 'Leading producers', 'Strategic note'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    MINERALS.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', null, r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 USGS Mineral Commodity Summaries basis \u00b7 as of 2025';
    setTimeout(function () {
      K.gdelt('cm:wire', '("critical minerals" OR lithium OR cobalt OR "rare earth" OR graphite)', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- ENERGY ---------------- */
  var CONTRACTS = [
    ['Brent crude', 'BZ=F', 'US$/bbl'],
    ['WTI crude', 'CL=F', 'US$/bbl'],
    ['Henry Hub gas', 'NG=F', 'US$/MMBtu'],
    ['RBOB gasoline', 'RB=F', 'US$/gal'],
    ['Heating oil', 'HO=F', 'US$/gal']
  ];
  function ohlc(sym) {
    var K = kit();
    return K.jget('en:' + sym, '/api/ohlc?symbol=' + encodeURIComponent(sym) + '&range=1mo', 20 * 60000)
      .then(function (j) {
        var c = (j && j.c) || [];
        if (c.length < 2) return null;
        var last = c[c.length - 1], prev = c[c.length - 2], first = c[0];
        return { last: last, d1: (last - prev) / prev * 100, dM: (last - first) / first * 100 };
      }).catch(function () { return null; });
  }
  function buildEN(detail) {
    if (document.getElementById('niySecEN')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecEN';
    var s1 = K.sec('niySecEN1', 'Energy Futures \u2014 live');
    var s2 = K.sec('niySecEN2', 'Energy Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    Promise.all(CONTRACTS.map(function (c) { return ohlc(c[1]); }))
      .then(function (qs) {
        var rows = [];
        CONTRACTS.forEach(function (c, i) { if (qs[i]) rows.push({ n: c[0], u: c[2], q: qs[i] }); });
        if (!rows.length) throw new Error('empty');
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Contract', 'Last', '1-day %', '1-month %', 'Unit'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        rows.forEach(function (r) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, r.n));
          tr.appendChild(K.el('td', 'nls-num', r.q.last.toLocaleString('en-IN', { maximumFractionDigits: 2 })));
          tr.appendChild(K.el('td', 'nls-num', (r.q.d1 >= 0 ? '+' : '') + r.q.d1.toFixed(2)));
          tr.appendChild(K.el('td', 'nls-num', (r.q.dM >= 0 ? '+' : '') + r.q.dM.toFixed(2)));
          tr.appendChild(K.el('td', null, r.u));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.innerHTML = ''; s1.body.appendChild(tb);
        s1.status.textContent = 'LIVE \u00b7 futures via /api/ohlc \u00b7 cached 20 min';
      })
      .catch(function () { K.offline(s1, 'Futures feed arrives through the backend (/api/ohlc). Not reachable right now \u2014 it will retry automatically.'); });
    setTimeout(function () {
      K.gdelt('en:wire', '(OPEC OR "oil output" OR LNG OR "power grid" OR renewables)', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- mount loop ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = { 'geo_energy': buildEN, 'Global Trade': buildGT, 'Critical Minerals': buildCM,
              'Energy & Critical Minerals': buildEN };
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'geopolitics') return;
      var fn = MAP[a.csv] || MAP[activeLabel()];
      if (!fn) return;
      var d = document.getElementById('detail'); if (!d) return;
      fn(d);
    } catch (e) {}
  }
  setInterval(function () {
    ['niySecGT', 'niySecCM', 'niySecEN'].forEach(function (id) {
      var n = document.getElementById(id); if (n && n.parentNode) n.parentNode.removeChild(n);
    });
  }, 16 * 60000);
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