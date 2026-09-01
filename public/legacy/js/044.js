/* V2 PASS 70 Representative & Media Intelligence + analytics charts */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }

  /* ---- GDELT queue: the API allows one request per 5 seconds ---- */
  var gq = Promise.resolve();
  function spaced(fn) {
    var run = gq.then(function () { return fn(); });
    gq = run.catch(function () {}).then(function () {
      return new Promise(function (res) { setTimeout(res, 5200); });
    });
    return run;
  }
  function gdeltTimeline(key, q, ttl) {
    var K = kit();
    var url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(q) +
      '&mode=TimelineVol&format=json&timespan=7d';
    return K.jget(key, url, ttl).then(function (j) {
      var series = (j && j.timeline && j.timeline[0] && j.timeline[0].data) || [];
      return series.map(function (p) {
        var d = String(p.date || '');
        return { d: d.length >= 8 ? (d.slice(4, 6) + '/' + d.slice(6, 8)) : d.slice(5, 10), v: +p.value || 0 };
      });
    });
  }

  /* ---- tiny SVG charts (no libraries, token-themed) ---- */
  function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
  function lineChart(points, W, H) {
    W = W || 640; H = H || 170;
    var s = svgEl('svg'); s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var padL = 34, padB = 22, padT = 8, padR = 8;
    var iw = W - padL - padR, ih = H - padT - padB;
    var max = 1; points.forEach(function (p) { if (p.v > max) max = p.v; });
    var ax = svgEl('line'); ax.setAttribute('class', 'nvz-axis');
    ax.setAttribute('x1', padL); ax.setAttribute('y1', padT + ih); ax.setAttribute('x2', W - padR); ax.setAttribute('y2', padT + ih);
    s.appendChild(ax);
    var X = function (i) { return padL + (points.length < 2 ? 0 : i / (points.length - 1) * iw); };
    var Y = function (v) { return padT + ih - v / max * ih; };
    var dArea = '', dLine = '';
    points.forEach(function (p, i) {
      dLine += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1);
    });
    if (points.length > 1) {
      dArea = dLine + 'L' + X(points.length - 1).toFixed(1) + ' ' + (padT + ih) + 'L' + padL + ' ' + (padT + ih) + 'Z';
      var ar = svgEl('path'); ar.setAttribute('class', 'nvz-area'); ar.setAttribute('d', dArea); s.appendChild(ar);
    }
    var ln = svgEl('path'); ln.setAttribute('class', 'nvz-line'); ln.setAttribute('d', dLine); s.appendChild(ln);
    var ymax = svgEl('text'); ymax.setAttribute('x', 2); ymax.setAttribute('y', padT + 8);
    ymax.textContent = max >= 1000 ? (max / 1000).toFixed(1) + 'k' : String(max);
    s.appendChild(ymax);
    [0, Math.floor((points.length - 1) / 2), points.length - 1].forEach(function (i) {
      if (i < 0 || !points[i]) return;
      var t = svgEl('text'); t.setAttribute('x', Math.min(X(i), W - 34)); t.setAttribute('y', H - 6);
      t.textContent = points[i].d; s.appendChild(t);
    });
    return s;
  }
  function barChart(items, W) {
    W = W || 640;
    var rowH = 22, H = items.length * rowH + 6;
    var s = svgEl('svg'); s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var max = 1; items.forEach(function (it) { if (it.v > max) max = it.v; });
    var labW = 150, valW = 44, bw = W - labW - valW - 12;
    items.forEach(function (it, i) {
      var y = i * rowH + 4;
      var t = svgEl('text'); t.setAttribute('x', 0); t.setAttribute('y', y + 12); t.textContent = it.l.slice(0, 24); s.appendChild(t);
      var r = svgEl('rect'); r.setAttribute('class', it.dim ? 'nvz-bar2' : 'nvz-bar');
      r.setAttribute('x', labW); r.setAttribute('y', y + 3);
      r.setAttribute('width', Math.max(2, it.v / max * bw)); r.setAttribute('height', 12); r.setAttribute('rx', 2);
      s.appendChild(r);
      var v = svgEl('text'); v.setAttribute('x', labW + Math.max(2, it.v / max * bw) + 6); v.setAttribute('y', y + 13);
      v.textContent = it.v.toLocaleString('en-IN'); s.appendChild(v);
    });
    return s;
  }
  function vizHost() {
    var pane = document.querySelector('.niy-pane-analytics');
    if (!pane) return null;
    return pane;
  }
  function mountViz(id, build) {
    var pane = vizHost(); if (!pane) return;
    if (document.getElementById(id)) return;
    var K = kit(); if (!K) return;
    var block = K.el('div', 'niy-viz-block'); block.id = id;
    var empty = pane.querySelector('.niy-viz-empty');
    if (empty) empty.style.display = 'none';
    pane.appendChild(block);
    build(block, K);
  }
  function unmountViz(ids) {
    ids.forEach(function (id) {
      var n = document.getElementById(id);
      if (n && n.parentNode) n.parentNode.removeChild(n);
    });
    var pane = vizHost();
    if (pane) { var empty = pane.querySelector('.niy-viz-empty');
      if (empty) empty.style.display = pane.querySelector('.niy-viz-block') ? 'none' : ''; }
  }

  window.__niyViz = { lineChart: lineChart, barChart: barChart, mountViz: mountViz,
    unmountViz: unmountViz, spaced: spaced, gdeltTimeline: gdeltTimeline }; /*V2PASS71 export*/
  /* ---------------- STATEMENTS & CONTRADICTIONS ---------------- */
  var LEADERS = ['Narendra Modi', 'Amit Shah', 'Rahul Gandhi', 'Nirmala Sitharaman',
    'S. Jaishankar', 'Mallikarjun Kharge', 'Yogi Adityanath', 'Mamata Banerjee'];
  var stSel = 0;
  function buildST(detail) {
    if (document.getElementById('niySecST')) return;
    var K = kit(); if (!K) return;
    var s1 = K.sec('niySecST', 'Statement Coverage \u2014 GDELT 2.0 (India-sourced)');
    var chips = K.el('div', 'nls-chips');
    s1.wrap.insertBefore(chips, s1.body);
    function load(i) {
      stSel = i;
      [].slice.call(chips.children).forEach(function (c, j) { c.classList.toggle('on', j === i); });
      s1.status.textContent = 'loading\u2026';
      spaced(function () { return K.gdelt('st:' + i, '"' + LEADERS[i] + '" sourcecountry:IN', 15 * 60000); })
        .then(function (rows) { if (stSel !== i) return; K.fillNews(s1, rows, LEADERS[i] + ' \u00b7 GDELT 2.0'); })
        .catch(function () { if (stSel !== i) return; K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
      loadSTViz(i);
    }
    LEADERS.forEach(function (t, i) {
      var c = K.el('button', 'nls-chip' + (i === 0 ? ' on' : ''), t);
      c.type = 'button';
      c.addEventListener('click', function () { load(i); });
      chips.appendChild(c);
    });
    K.host(detail).appendChild(s1.wrap);
    load(0);
  }
  function loadSTViz(i) {
    var block = document.getElementById('niyVizST'); if (!block) return;
    var K = kit();
    var body = block.querySelector('.nvz-body'); if (!body) return;
    body.innerHTML = '';
    body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
    spaced(function () { return gdeltTimeline('st:tl:' + i, '"' + LEADERS[i] + '" sourcecountry:IN', 30 * 60000); })
      .then(function (pts) {
        body.innerHTML = '';
        if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
        body.appendChild(lineChart(pts));
        var sub = block.querySelector('.nvz-sub');
        if (sub) sub.textContent = LEADERS[i] + ' \u00b7 media volume \u00b7 7 days \u00b7 GDELT TimelineVol';
      })
      .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
  }
  function vizST() {
    mountViz('niyVizST', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'Coverage Volume \u2014 7 Days'));
      block.appendChild(K.el('div', 'nvz-sub', LEADERS[stSel] + ' \u00b7 GDELT TimelineVol'));
      block.appendChild(K.el('div', 'nvz-body'));
      loadSTViz(stSel);
    });
  }

  /* ---------------- MP REPORT CARDS ---------------- */
  var LS18 = [
    ['BJP', 240], ['INC', 99], ['SP', 37], ['AITC', 29], ['DMK', 22],
    ['TDP', 16], ['JD(U)', 12], ['SS (UBT)', 9], ['NCP (SP)', 8], ['Others', 71]
  ];
  var LS_FACTS = [
    ['Members', '543', 'Elected strength'],
    ['Women MPs', '74 (13.6%)', 'Highest count to date'],
    ['First-time MPs', '~280 (52%)', 'Turnover at the 2024 election'],
    ['Average age', '~56 years', 'ECI / PRS published profile']
  ];
  function buildMPC(detail) {
    if (document.getElementById('niySecMPC')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecMPC';
    var s1 = K.sec('niySecMPC1', '18th Lok Sabha \u2014 composition reference');
    var s2 = K.sec('niySecMPC2', 'MP Wire \u2014 GDELT 2.0 (India-sourced)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Measure', 'Value', 'Note'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    LS_FACTS.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', 'nls-num', r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 public record \u00b7 as of the 2024 election';
    spaced(function () { return K.gdelt('mpc:wire', '("Member of Parliament" OR "Lok Sabha MP" OR MPLADS) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
      .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizMPC() {
    mountViz('niyVizMPC', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'Party Seat Share \u2014 18th Lok Sabha'));
      block.appendChild(K.el('div', 'nvz-sub', '543 seats \u00b7 public record \u00b7 curated'));
      block.appendChild(barChart(LS18.map(function (p, i) { return { l: p[0], v: p[1], dim: i === LS18.length - 1 }; })));
      block.appendChild(K.el('div', 'nvz-title', 'House Profile'));
      block.appendChild(barChart([
        { l: 'Women MPs', v: 74 }, { l: 'First-time MPs', v: 280 }, { l: 'Returning MPs', v: 263, dim: true }
      ]));
    });
  }

  /* ---------------- MORNING BRIEF ---------------- */
  function buildMB(detail) {
    if (document.getElementById('niySecMB')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecMB';
    var s1 = K.sec('niySecMB1', 'Top of the Day \u2014 India');
    var s2 = K.sec('niySecMB2', 'Government Wire \u2014 PIB');
    var s3 = K.sec('niySecMB3', 'Economy \u2014 India');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap); box.appendChild(s3.wrap);
    K.host(detail).appendChild(box);
    spaced(function () { return K.gdelt('mb:top', 'sourcecountry:IN (India OR government OR parliament)', 15 * 60000); })
      .then(function (rows) { K.fillNews(s1, rows.slice(0, 12), 'GDELT 2.0 \u00b7 India'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    K.jget('mb:pib', '/api/rss?url=' + encodeURIComponent('https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'), 30 * 60000, true)
      .then(function (t) {
        var doc = new DOMParser().parseFromString(t, 'text/xml');
        var rows = [].slice.call(doc.querySelectorAll('item')).slice(0, 10).map(function (it) {
          function g(k) { var e = it.querySelector(k); return e ? e.textContent.trim() : ''; }
          var d = new Date(g('pubDate'));
          return { t: isNaN(d) ? null : d, title: g('title'), url: g('link'), src: 'PIB', cc: 'India' };
        }).filter(function (x) { return x.title; });
        if (!rows.length) throw new Error('empty');
        K.fillNews(s2, rows, 'PIB \u00b7 Government of India');
      })
      .catch(function () { K.offline(s2, 'PIB releases arrive through the backend (/api/rss). Not reachable right now.'); });
    spaced(function () { return K.gdelt('mb:eco', '(economy OR RBI OR rupee OR markets) sourcecountry:IN', 15 * 60000); })
      .then(function (rows) { K.fillNews(s3, rows.slice(0, 12), 'GDELT 2.0 \u00b7 India'); })
      .catch(function () { K.offline(s3, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
  }
  function vizMB() {
    mountViz('niyVizMB', function (block, K) {
      block.appendChild(K.el('div', 'nvz-title', 'India News Volume \u2014 7 Days'));
      block.appendChild(K.el('div', 'nvz-sub', 'all India-sourced coverage \u00b7 GDELT TimelineVol'));
      var body = K.el('div', 'nvz-body'); block.appendChild(body);
      body.appendChild(K.el('div', 'nls-note', 'loading\u2026'));
      spaced(function () { return gdeltTimeline('mb:tl', 'sourcecountry:IN', 30 * 60000); })
        .then(function (pts) {
          body.innerHTML = '';
          if (!pts.length) { body.appendChild(K.el('div', 'nls-note', 'No volume data.')); return; }
          body.appendChild(lineChart(pts));
        })
        .catch(function () { body.innerHTML = ''; body.appendChild(K.el('div', 'nls-note', 'GDELT unreachable \u2014 chart will retry on next visit.')); });
    });
  }

  /* ---------------- icons (user request: fix all three) ---------------- */
  var ICONS = {
    'Statements & Contradictions': '<path d="M4.5 5.6h15v9.8h-8.6L7 19v-3.6H4.5z"/><path d="M12 8.4v3"/><circle cx="12" cy="13.4" r=".8"/>',
    'MP Report Cards': '<rect x="3.6" y="5.2" width="16.8" height="13.6" rx="1.8"/><circle cx="8.4" cy="10.4" r="2"/><path d="M5.6 15.8c.5-1.7 1.5-2.6 2.8-2.6s2.3.9 2.8 2.6"/><path d="M14 9.2h4.4M14 12h4.4M14.6 15.4l1.3 1.3 2.3-2.5"/>',
    'Morning Brief': '<rect x="4" y="5.6" width="13" height="12.8" rx="1.6"/><path d="M17 8.4h2.2a1 1 0 0 1 1 1v7.4a1.6 1.6 0 0 1-1.6 1.6H6"/><path d="M6.8 8.6h7.4M6.8 11.4h7.4M6.8 14.2h4.6"/>'
  };
  function stampIcons() {
    try {
      document.querySelectorAll('#sidebarList .feat-item').forEach(function (b) {
        var lbl = ((b.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
        var g = ICONS[lbl]; if (!g) return;
        var svg = b.querySelector('.niy-ficon svg'); if (!svg) return;
        if (b.getAttribute('data-niy-i70') === '1' && svg.innerHTML.indexOf('13.4') >= 0 === (lbl === 'Statements & Contradictions')) return;
        svg.innerHTML = g;
        b.setAttribute('data-niy-i70', '1');
      });
    } catch (e) {}
  }

  /* ---------------- mount loops ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = { 'Statements & Contradictions': buildST, 'MP Report Cards': buildMPC, 'Morning Brief': buildMB };
  var VIZ = { 'Statements & Contradictions': ['niyVizST', vizST],
              'MP Report Cards': ['niyVizMPC', vizMPC], 'Morning Brief': ['niyVizMB', vizMB] };
  var ALL_VIZ = ['niyVizST', 'niyVizMPC', 'niyVizMB'];
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      stampIcons();
      if (a.tier !== 'national') { unmountViz(ALL_VIZ); return; }
      var lbl = activeLabel();
      var fn = MAP[lbl];
      var vz = VIZ[lbl];
      if (!fn) { unmountViz(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      fn(d);
      unmountViz(ALL_VIZ.filter(function (id) { return !vz || id !== vz[0]; }));
      if (vz) vz[1]();
    } catch (e) {}
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