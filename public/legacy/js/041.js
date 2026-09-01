/* V2 PASS 67 Global Resources live layer — Constitute · World Bank · Wikidata · GDELT */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function trimCache(key, ttl, fetcher) {
    var CK = 'niySec1:' + key;
    try { var raw = localStorage.getItem(CK);
      if (raw) { var o = JSON.parse(raw); if (Date.now() - o.t < ttl) return Promise.resolve(o.d); } } catch (e) {}
    return fetcher().then(function (d) {
      try { localStorage.setItem(CK, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return d;
    });
  }

  /* ---------------- WORLD CONSTITUTIONS ---------------- */
  function buildWC(detail) {
    if (document.getElementById('niySecWC')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecWC';
    var s1 = K.sec('niySecWC1', 'Constitutions in Force \u2014 Constitute Project');
    var s2 = K.sec('niySecWC2', 'Constitutional Affairs Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    trimCache('wc:list', 7 * 24 * 3600000, function () {
      return fetch('https://www.constituteproject.org/service/constitutions?lang=en',
        { signal: (AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined) })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (arr) {
          /*V2PASS67B in-force only*/
          return (arr || []).filter(function (c) { return c.in_force === true; }).map(function (c) {
            return { c: c.country_id || c.country || '', t: (c.title || '').slice(0, 60),
              y: c.year_enacted || (c.date_enacted || '').slice(0, 4) || '\u2014', id: c.id || '' };
          }).filter(function (r) { return r.c; })
            .sort(function (a, b) { return a.c < b.c ? -1 : 1; });
        });
    }).then(function (rows) {
      if (!rows.length) throw new Error('empty');
      s1.body.innerHTML = '';
      s1.body.appendChild(K.el('div', 'nls-note', rows.length + ' constitutions currently in force'));
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Country', 'Enacted'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        var td = K.el('td');
        if (r.id) { var a = K.el('a', null, r.c);
          a.href = 'https://www.constituteproject.org/constitution/' + r.id;
          a.target = '_blank'; a.rel = 'noopener noreferrer'; td.appendChild(a); }
        else td.textContent = r.c;
        tr.appendChild(td);
        tr.appendChild(K.el('td', 'nls-num', String(r.y)));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(tb);
      s1.status.textContent = 'LIVE \u00b7 Constitute Project \u00b7 cached 7d';
    }).catch(function () {
      K.offline(s1, 'Constitute Project unreachable from this network \u2014 it will retry automatically.');
    });
    setTimeout(function () {
      K.gdelt('wc:wire', '("constitutional amendment" OR "constitutional court" OR referendum)', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- GROWTH INDICATORS ---------------- */
  var GR_CC = 'USA;CHN;IND;DEU;JPN;GBR;FRA;BRA;ITA;CAN;RUS;KOR;AUS;MEX;IDN;SAU;TUR;NLD;CHE;ESP';
  function wbInd(ind, key) {
    var K = kit();
    return K.jget(key, 'https://api.worldbank.org/v2/country/' + GR_CC + '/indicator/' + ind +
      '?format=json&mrv=1&per_page=25', 24 * 3600000)
      .then(function (j) {
        var out = {};
        ((j && j[1]) || []).forEach(function (r) {
          if (r && r.country && r.value != null) out[r.country.value] = { v: r.value, y: r.date };
        });
        return out;
      });
  }
  function buildGR(detail) {
    if (document.getElementById('niySecGR')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecGR';
    var s1 = K.sec('niySecGR1', 'Growth Monitor \u2014 World Bank open data');
    var s2 = K.sec('niySecGR2', 'Macro Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    Promise.all([
      wbInd('NY.GDP.MKTP.KD.ZG', 'gr:gdp'),
      wbInd('FP.CPI.TOTL.ZG', 'gr:cpi'),
      wbInd('SL.UEM.TOTL.ZS', 'gr:uem')
    ]).then(function (res) {
      var gdp = res[0], cpi = res[1], uem = res[2];
      var rows = Object.keys(gdp).map(function (c) {
        return { c: c, y: gdp[c].y, g: gdp[c].v,
          i: cpi[c] ? cpi[c].v : null, u: uem[c] ? uem[c].v : null };
      }).sort(function (a, b) { return b.g - a.g; });
      if (!rows.length) throw new Error('empty');
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Economy', 'Year', 'GDP growth %', 'Inflation %', 'Unemployment %'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, r.c));
        tr.appendChild(K.el('td', 'nls-num', r.y));
        tr.appendChild(K.el('td', 'nls-num', r.g.toFixed(1)));
        tr.appendChild(K.el('td', 'nls-num', r.i == null ? '\u2014' : r.i.toFixed(1)));
        tr.appendChild(K.el('td', 'nls-num', r.u == null ? '\u2014' : r.u.toFixed(1)));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.innerHTML = ''; s1.body.appendChild(tb);
      s1.status.textContent = 'LIVE \u00b7 World Bank \u00b7 cached 24h';
    }).catch(function () {
      K.offline(s1, 'World Bank open-data API unreachable from this network \u2014 it will retry automatically.');
    });
    setTimeout(function () {
      K.gdelt('gr:wire', '("GDP growth" OR inflation OR recession OR "central bank")', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- GEOPOLITICS NEWS WIRE ---------------- */
  function buildNWS(detail) {
    if (document.getElementById('niySecNWS')) return;
    var K = kit(); if (!K) return;
    var s1 = K.sec('niySecNWS', 'Top World Stories \u2014 GDELT 2.0');
    K.host(detail).appendChild(s1.wrap);
    K.gdelt('nws:wire', '(geopolitics OR "foreign policy" OR diplomacy OR "United Nations")', 15 * 60000)
      .then(function (rows) { K.fillNews(s1, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }

  /* ---------------- HEADS OF STATE ---------------- */
  function buildHS(detail) {
    if (document.getElementById('niySecHS')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecHS';
    var s1 = K.sec('niySecHS1', 'Current Leaders \u2014 Wikidata');
    var s2 = K.sec('niySecHS2', 'Transitions Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var Q = 'SELECT ?countryLabel ?hosLabel ?hogLabel WHERE { ?country wdt:P463 wd:Q1065 . ' +
      '?country wdt:P35 ?hos . OPTIONAL { ?country wdt:P6 ?hog } ' +
      'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 600';
    trimCache('hs:wd', 24 * 3600000, function () {
      return fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(Q),
        { signal: (AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined),
          headers: { 'Accept': 'application/sparql-results+json' } })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          var seen = {}, rows = [];
          (((j || {}).results || {}).bindings || []).forEach(function (b) {
            var c = b.countryLabel && b.countryLabel.value;
            if (!c || seen[c] || /^Q[0-9]+$/.test(c)) return;
            seen[c] = 1;
            var hos = (b.hosLabel && b.hosLabel.value) || '';
            var hog = (b.hogLabel && b.hogLabel.value) || '';
            rows.push({ c: c, s: /^Q[0-9]+$/.test(hos) ? '\u2014' : hos,
              g: (!hog || /^Q[0-9]+$/.test(hog)) ? '\u2014' : hog });
          });
          rows.sort(function (a, b) { return a.c < b.c ? -1 : 1; });
          return rows;
        });
    }).then(function (rows) {
      if (!rows.length) throw new Error('empty');
      s1.body.innerHTML = '';
      s1.body.appendChild(K.el('div', 'nls-note', rows.length + ' UN member states \u00b7 head of state and head of government'));
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Country', 'Head of State', 'Head of Government'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, r.c));
        tr.appendChild(K.el('td', null, r.s));
        tr.appendChild(K.el('td', null, r.g));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(tb);
      s1.status.textContent = 'LIVE \u00b7 Wikidata \u00b7 cached 24h';
    }).catch(function () {
      K.offline(s1, 'Wikidata unreachable from this network \u2014 it will retry automatically.');
    });
    setTimeout(function () {
      K.gdelt('hs:wire', '("sworn in" OR inauguration OR "elected president" OR "new prime minister")', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- GLOBAL COMMODITIES ---------------- */
  function buildGC(detail) {
    if (document.getElementById('niySecGC')) return;
    var K = kit(); if (!K) return;
    var s1 = K.sec('niySecGC', 'Commodities Wire \u2014 GDELT 2.0');
    K.host(detail).appendChild(s1.wrap);
    K.gdelt('gc:wire', '("oil prices" OR OPEC OR "natural gas" OR copper OR wheat OR "gold price")', 15 * 60000)
      .then(function (rows) { K.fillNews(s1, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }

  /* ---------------- mount loop ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = { 'geo_news_wire.csv': buildNWS, 'geo_leaders': buildHS, 'geo_commodities': buildGC,
              'World Constitutions': buildWC, 'Growth Indicators': buildGR };
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
    ['niySecWC', 'niySecGR', 'niySecNWS', 'niySecHS', 'niySecGC'].forEach(function (id) {
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