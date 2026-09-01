/* V2 PASS 71 Government Operations + analytics charts */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function csvRows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function counts(name, key, top) {
    var m = {};
    csvRows(name).forEach(function (r) {
      var raw = key === 'deadline:date' ? ((r.deadline || '').toString().split(' ')[0]) : (r[key] || '').toString(); /*V2PASS71C*/
      var v = raw.trim(); if (!v) return;
      m[v] = (m[v] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { l: k, v: m[k] }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, top || 8);
  }
  /*V2PASS71B: embedded csvs load async — poll until rows exist, then draw*/
  function lateBars(target, K, V, spec) {
    var tries = 0;
    (function attempt() {
      var ready = spec.some(function (s) { return counts(s[2], s[3], 8).length; });
      if (!ready && tries++ < 12) { setTimeout(attempt, 900); return; }
      target.innerHTML = '';
      spec.forEach(function (s, i) {
        var data = counts(s[2], s[3], 8);
        target.appendChild(K.el('div', 'nvz-title', s[0]));
        if (s[1]) target.appendChild(K.el('div', 'nvz-sub', s[1]));
        if (data.length) target.appendChild(V.barChart(i ? data.map(function (x) { return { l: x.l, v: x.v, dim: true }; }) : data));
        else target.appendChild(K.el('div', 'nls-note', 'No dataset rows available.'));
      });
    })();
  }

  /* ---------------- CENTRAL TENDERS ---------------- */
  function buildCT(detail) {
    if (document.getElementById('niySecCT')) return;
    var K = kit(); if (!K) return;
    var s1 = K.sec('niySecCT', 'Tender Wire \u2014 GDELT 2.0 (India-sourced)');
    K.host(detail).appendChild(s1.wrap);
    viz().spaced(function () { return K.gdelt('ct:wire', '(tender OR procurement OR bid) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s1, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizCT() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizCT', function (block, K) {
      var bw = K.el('div'); block.appendChild(bw);
      lateBars(bw, K, V, [['Tenders by Deadline', 'live CPPP tenders \u00b7 count per closing date', 'national_tender_aggregator.csv', 'deadline:date'],
        ['Tenders by Status', '', 'national_tender_aggregator.csv', 'status']]);
    });
  }

  /* ---------------- IAS/IPS TRANSFERS ---------------- */
  function buildTR(detail) {
    if (document.getElementById('niySecTR')) return;
    var K = kit(); if (!K) return;
    var s1 = K.sec('niySecTR', 'Transfers & Postings Wire \u2014 GDELT 2.0 (India-sourced)');
    K.host(detail).appendChild(s1.wrap);
    viz().spaced(function () { return K.gdelt('tr:wire', '(IAS OR IPS) (transfer OR posting OR appointed) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s1, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizTR() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizTR', function (block, K) {
      var bw = K.el('div'); block.appendChild(bw);
      lateBars(bw, K, V, [['Transfers by Jurisdiction', 'AGMUT cadre orders \u00b7 module dataset', 'national_agmut_transfers.csv', 'jurisdiction'],
        ['Transfers by Cadre', '', 'national_agmut_transfers.csv', 'cadre']]);
    });
  }

  /* ---------------- CABINET DECISIONS ---------------- */
  function buildCD(detail) {
    if (document.getElementById('niySecCD')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecCD';
    var s1 = K.sec('niySecCD1', 'Cabinet on the Record \u2014 PIB releases');
    var s2 = K.sec('niySecCD2', 'Cabinet Wire \u2014 GDELT 2.0 (India-sourced)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    /* shared cache key with Morning Brief: zero extra PIB calls */
    K.jget('mb:pib', '/api/rss?url=' + encodeURIComponent('https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'), 30 * 60000, true)
      .then(function (t) {
        var doc = new DOMParser().parseFromString(t, 'text/xml');
        var all = [].slice.call(doc.querySelectorAll('item')).map(function (it) {
          function g(k) { var e = it.querySelector(k); return e ? e.textContent.trim() : ''; }
          var d = new Date(g('pubDate'));
          return { t: isNaN(d) ? null : d, title: g('title'), url: g('link'), src: 'PIB', cc: 'India' };
        }).filter(function (x) { return x.title; });
        var cab = all.filter(function (x) { return /cabinet|CCEA|CCS\b/i.test(x.title); }).slice(0, 12);
        if (cab.length) { K.fillNews(s1, cab, 'PIB \u00b7 cabinet-tagged'); }
        else if (all.length) {
          s1.body.innerHTML = '';
          s1.body.appendChild(K.el('div', 'nls-note', 'No cabinet-tagged releases in the current PIB window \u2014 latest releases shown below in the wire.'));
          s1.status.textContent = 'PIB \u00b7 no cabinet items right now';
        } else { throw new Error('empty'); }
      })
      .catch(function () { K.offline(s1, 'PIB releases arrive through the backend (/api/rss). Not reachable right now.'); });
    viz().spaced(function () { return K.gdelt('cd:wire', '(cabinet OR CCEA) (approves OR decision OR cleared) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizCD() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizCD', function (block, K) {
      var bw = K.el('div'); block.appendChild(bw);
      lateBars(bw, K, V, [['Tracked Decisions by Priority', 'module dataset', 'national_cabinet_decisions.csv', 'priority']]);
      block.appendChild(K.el('div', 'nvz-title', 'Cabinet Coverage \u2014 7 Days'));
      var body = K.el('div', 'nvz-body'); block.appendChild(body);
      body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      V.spaced(function () { return V.gdeltTimeline('cd:tl', '(cabinet OR CCEA) sourcecountry:IN', 30 * 60000); })
        .then(function (pts) {
          body.innerHTML = '';
          if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
          body.appendChild(V.lineChart(pts));
        })
        .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
    });
  }

  /* ---------------- CENTRAL PROJECTS ---------------- */
  var FLAGSHIP = [
    ['PM Gati Shakti', 'Multi-modal logistics master plan', 'National master plan operational; NMP portal live'],
    ['Bharatmala Pariyojana', 'Highways', 'Phase-I corridors under construction \u2014 revised timelines'],
    ['Sagarmala', 'Ports & coastal economy', 'Port modernisation + connectivity projects ongoing'],
    ['Dedicated Freight Corridors', 'Rail freight', 'EDFC complete; WDFC final stretches'],
    ['Jal Jeevan Mission', 'Rural tap water', 'Coverage expanded from 17% (2019) \u2014 mission extended'],
    ['PMAY (urban + rural)', 'Housing', 'Next-phase target of 3 crore additional houses approved 2024'],
    ['Vande Bharat programme', 'Passenger rail', 'Fleet expansion + sleeper variant trials'],
    ['Smart Cities Mission', 'Urban', 'Mission period closed; projects transitioned to states']
  ];
  function buildCP(detail) {
    if (document.getElementById('niySecCP2x')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecCP2x';
    var s1 = K.sec('niySecCP2x1', 'Flagship Programmes \u2014 curated reference');
    var s2 = K.sec('niySecCP2x2', 'Projects Wire \u2014 GDELT 2.0 (India-sourced)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Programme', 'Domain', 'Verifiable status'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    FLAGSHIP.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', null, r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 as of Jan 2026 \u00b7 verify against ministry dashboards';
    viz().spaced(function () { return K.gdelt('cp:wire', '("infrastructure project" OR "foundation stone" OR inaugurated) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizCP() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizCP', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'Infrastructure Coverage \u2014 7 Days'));
      block.appendChild(K.el('div', 'nvz-sub', 'India-sourced project coverage \u00b7 GDELT TimelineVol'));
      var body = K.el('div', 'nvz-body'); block.appendChild(body);
      body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      V.spaced(function () { return V.gdeltTimeline('cp:tl', '("infrastructure project" OR inaugurated) sourcecountry:IN', 30 * 60000); })
        .then(function (pts) {
          body.innerHTML = '';
          if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
          body.appendChild(V.lineChart(pts));
        })
        .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
    });
  }

  /* ---------------- mount loop (label-keyed) ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = {
    'Central Tenders': [buildCT, 'niyVizCT', vizCT],
    'Central Tender Aggregator + Constituency Filter': [buildCT, 'niyVizCT', vizCT],
    'IAS/IPS Transfers (AGMUT)': [buildTR, 'niyVizTR', vizTR],
    'Bureaucratic Transfers \u2014 AGMUT Cadre': [buildTR, 'niyVizTR', vizTR],
    'Cabinet Decisions': [buildCD, 'niyVizCD', vizCD],
    'Central Projects': [buildCP, 'niyVizCP', vizCP],
    'Centre-sanctioned Projects & Completion Rate': [buildCP, 'niyVizCP', vizCP]
  };
  var ALL_VIZ = ['niyVizCT', 'niyVizTR', 'niyVizCD', 'niyVizCP'];
  function unmount(ids) {
    var V = viz(); if (V) V.unmountViz(ids);
  }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'national') { unmount(ALL_VIZ); return; }
      var e = MAP[activeLabel()];
      if (!e) { unmount(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      e[0](d);
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