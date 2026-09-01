/* V2 PASS 72 Economy, Finance & Industry + charts */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }

  /* ---------------- BUDGET & SCHEMES ---------------- */
  var BUDGET_KEY = [
    ['Total expenditure', '~\u20b950.65 lakh crore', 'Budget estimate'],
    ['Capital expenditure', '~\u20b911.21 lakh crore', 'Effective capex higher with grants-in-aid'],
    ['Fiscal deficit target', '4.4% of GDP', 'Glide path continues'],
    ['Receipts (excl. borrowings)', '~\u20b934.96 lakh crore', 'Tax + non-tax + capital receipts'],
    ['Income-tax relief', 'Nil tax up to \u20b912 lakh', 'New regime, incl. rebate']
  ];
  var SCHEMES = [
    ['MGNREGA', 86000], ['Jal Jeevan Mission', 67000], ['PM-KISAN', 63500],
    ['Samagra Shiksha', 41250], ['National Health Mission', 37227],
    ['PM Gram Sadak Yojana', 19000], ['PM-POSHAN', 12500], ['Ayushman Bharat PM-JAY', 9406]
  ];
  function buildBS(detail) {
    if (document.getElementById('niySecBS')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecBS';
    var s1 = K.sec('niySecBS1', 'Union Budget 2025\u201326 \u2014 key numbers');
    var s2 = K.sec('niySecBS2', 'Major Scheme Allocations \u2014 2025\u201326 BE');
    var s3 = K.sec('niySecBS3', 'Budget Wire \u2014 GDELT 2.0 (India-sourced)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap); box.appendChild(s3.wrap);
    K.host(detail).appendChild(box);
    var tb1 = K.el('table'), th1 = K.el('thead'), tr1 = K.el('tr');
    ['Measure', 'Value', 'Note'].forEach(function (c) { tr1.appendChild(K.el('th', null, c)); });
    th1.appendChild(tr1); tb1.appendChild(th1);
    var bd1 = K.el('tbody');
    BUDGET_KEY.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', 'nls-num', r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      bd1.appendChild(tr);
    });
    tb1.appendChild(bd1);
    s1.body.appendChild(tb1);
    s1.status.textContent = 'curated \u00b7 budget documents \u00b7 verify against indiabudget.gov.in';
    var tb2 = K.el('table'), th2 = K.el('thead'), tr2 = K.el('tr');
    ['Scheme', 'Allocation (\u20b9 crore, approx.)'].forEach(function (c) { tr2.appendChild(K.el('th', null, c)); });
    th2.appendChild(tr2); tb2.appendChild(th2);
    var bd2 = K.el('tbody');
    SCHEMES.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', 'nls-num', '~' + r[1].toLocaleString('en-IN')));
      bd2.appendChild(tr);
    });
    tb2.appendChild(bd2);
    s2.body.appendChild(tb2);
    s2.status.textContent = 'curated \u00b7 2025\u201326 budget estimates \u00b7 approximate';
    viz().spaced(function () { return K.gdelt('bs:wire', '(budget OR "fiscal deficit" OR "government scheme") sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s3, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s3, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizBS() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizBS', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'Major Scheme Allocations'));
      block.appendChild(K.el('div', 'nvz-sub', 'Union Budget 2025\u201326 BE \u00b7 \u20b9 crore \u00b7 curated'));
      block.appendChild(V.barChart(SCHEMES.map(function (s) { return { l: s[0], v: s[1] }; })));
      block.appendChild(K.el('div', 'nvz-title', 'Budget Coverage \u2014 7 Days'));
      var body = K.el('div', 'nvz-body'); block.appendChild(body);
      body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      V.spaced(function () { return V.gdeltTimeline('bs:tl', '(budget OR "fiscal deficit") sourcecountry:IN', 30 * 60000); })
        .then(function (pts) {
          body.innerHTML = '';
          if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
          body.appendChild(V.lineChart(pts));
        })
        .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
    });
  }

  /* ---------------- INDUSTRY UPDATES ---------------- */
  function wbSeries(ind, key, mrv) {
    var K = kit();
    return K.jget(key, 'https://api.worldbank.org/v2/country/IND/indicator/' + ind +
      '?format=json&mrv=' + (mrv || 15), 24 * 3600000)
      .then(function (j) {
        return (((j && j[1]) || []).filter(function (r) { return r && r.value != null; })
          .map(function (r) { return { d: r.date, v: r.value }; })).reverse();
      });
  }
  function buildIU(detail) {
    if (document.getElementById('niySecIU')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecIU';
    var s1 = K.sec('niySecIU1', 'Industry Monitor \u2014 World Bank open data');
    var s2 = K.sec('niySecIU2', 'Industry Wire \u2014 GDELT 2.0 (India-sourced)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    Promise.all([
      wbSeries('NV.IND.MANF.ZS', 'iu:manf', 15),
      wbSeries('NV.IND.TOTL.ZS', 'iu:ind', 2),
      wbSeries('NE.EXP.GNFS.ZS', 'iu:exp', 2)
    ]).then(function (res) {
      var manf = res[0], ind = res[1], exp = res[2];
      if (!manf.length) throw new Error('empty');
      var rows = [
        ['Manufacturing, value added (% of GDP)', manf[manf.length - 1]],
        ['Industry incl. construction (% of GDP)', ind[ind.length - 1]],
        ['Exports of goods & services (% of GDP)', exp[exp.length - 1]]
      ].filter(function (r) { return r[1]; });
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['Indicator', 'Year', 'Value %'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, r[0]));
        tr.appendChild(K.el('td', 'nls-num', r[1].d));
        tr.appendChild(K.el('td', 'nls-num', r[1].v.toFixed(1)));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.innerHTML = ''; s1.body.appendChild(tb);
      s1.status.textContent = 'LIVE \u00b7 World Bank \u00b7 India \u00b7 cached 24h';
    }).catch(function () {
      K.offline(s1, 'World Bank open-data API unreachable from this network \u2014 it will retry automatically.');
    });
    viz().spaced(function () { return K.gdelt('iu:wire', '(manufacturing OR "industrial output" OR PLI OR exports) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizIU() {
    var V = viz(); if (!V) return;
    V.mountViz('niyVizIU', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'Manufacturing Share of GDP \u2014 15-Year Trend'));
      block.appendChild(K.el('div', 'nvz-sub', 'India \u00b7 % of GDP \u00b7 World Bank'));
      var body = K.el('div', 'nvz-body'); block.appendChild(body);
      body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      wbSeries('NV.IND.MANF.ZS', 'iu:manf', 15)
        .then(function (pts) {
          body.innerHTML = '';
          if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No series data.')); return; }
          body.appendChild(V.lineChart(pts.map(function (p) { return { d: p.d, v: p.v }; })));
        })
        .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'World Bank unreachable \u2014 chart will retry on next visit.')); });
      block.appendChild(K.el('div', 'nvz-title', 'Industry Coverage \u2014 7 Days'));
      var body2 = K.el('div', 'nvz-body'); block.appendChild(body2);
      body2.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      V.spaced(function () { return V.gdeltTimeline('iu:tl', '(manufacturing OR "industrial output") sourcecountry:IN', 30 * 60000); })
        .then(function (pts) {
          body2.innerHTML = '';
          if (!pts.length) { body2.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
          body2.appendChild(V.lineChart(pts));
        })
        .catch(function () { body2.innerHTML = ''; body2.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
    });
  }

  /* ---------------- mount loop (label-keyed) ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = {
    'Budget & Schemes': [buildBS, 'niyVizBS', vizBS],
    'Budget Utilisation & Schemes': [buildBS, 'niyVizBS', vizBS],
    'Industry Updates': [buildIU, 'niyVizIU', vizIU],
    'Industry Updates (Ministry Data)': [buildIU, 'niyVizIU', vizIU]
  };
  var ALL_VIZ = ['niyVizBS', 'niyVizIU'];
  function unmount(ids) { var V = viz(); if (V) V.unmountViz(ids); }
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