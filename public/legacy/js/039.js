/* V2 PASS 65 Diplomacy desk live layer — OpenSanctions · UN OCHA FTS · GDELT 2.0 */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }

  /* ---------------- ALLIANCES ---------------- */
  var BLOCS = [
    ['NATO', '32', 'Collective defence \u00b7 Brussels', 'Finland (2023) and Sweden (2024) joined'],
    ['European Union', '27', 'Political & economic union \u00b7 Brussels', 'Enlargement track: Ukraine, Moldova, W. Balkans'],
    ['BRICS', '10', 'Economic bloc \u00b7 rotating chair', 'Expanded 2024\u201325; partner-country tier added'],
    ['SCO', '10', 'Security & economics \u00b7 Beijing', 'Belarus joined 2024'],
    ['ASEAN', '11', 'Regional bloc \u00b7 Jakarta', 'Timor-Leste admitted 2025'],
    ['Quad', '4', 'Indo-Pacific dialogue', 'US \u00b7 India \u00b7 Japan \u00b7 Australia'],
    ['AUKUS', '3', 'Security pact', 'Submarines (Pillar 1) \u00b7 advanced tech (Pillar 2)'],
    ['GCC', '6', 'Gulf cooperation \u00b7 Riyadh', 'Monetary & defence integration tracks'],
    ['African Union', '55', 'Continental union \u00b7 Addis Ababa', 'G20 permanent member since 2023'],
    ['CSTO', '6', 'Collective security \u00b7 Moscow', 'Armenia participation frozen']
  ];
  var DIPQ = [
    ['All', '(summit OR treaty OR "state visit" OR "bilateral talks" OR "signed agreement")'],
    ['NATO', '"NATO" (summit OR treaty OR defence OR exercise)'],
    ['EU', '"European Union" (summit OR treaty OR accession OR council)'],
    ['BRICS', '"BRICS" (summit OR members OR currency OR expansion)'],
    ['SCO', '"Shanghai Cooperation" OR "SCO summit"'],
    ['ASEAN', '"ASEAN" (summit OR agreement OR ministers)'],
    ['Quad / Indo-Pacific', '("Quad" OR "Indo-Pacific") (summit OR talks OR partners)'],
    ['Gulf', '("Gulf Cooperation" OR "GCC") (summit OR agreement OR talks)']
  ];
  function buildAL(detail) {
    if (document.getElementById('niySecAL')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecAL';
    var s1 = K.sec('niySecAL1', 'Bloc Monitor \u2014 curated reference');
    var s2 = K.sec('niySecAL2', 'Diplomacy Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    /* curated table — honest label, no fabricated live data */
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Bloc', 'Members', 'Type \u00b7 Seat', 'Note'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    BLOCS.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', 'nls-num', r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tr.appendChild(K.el('td', null, r[3]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 as of Jan 2026';
    /* GDELT wire with bloc chips */
    var chips = K.el('div', 'nls-chips');
    s2.wrap.insertBefore(chips, s2.body);
    var current = 0;
    function load(i) {
      current = i;
      [].slice.call(chips.children).forEach(function (c, j) { c.classList.toggle('on', j === i); });
      s2.status.textContent = 'loading\u2026';
      K.gdelt('dip:' + i, DIPQ[i][1], 15 * 60000)
        .then(function (rows) { if (current !== i) return; K.fillNews(s2, rows, DIPQ[i][0] + ' \u00b7 GDELT 2.0'); })
        .catch(function () { if (current !== i) return; K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }
    DIPQ.forEach(function (t, i) {
      var c = K.el('button', 'nls-chip' + (i === 0 ? ' on' : ''), t[0]);
      c.type = 'button';
      c.addEventListener('click', function () { load(i); });
      chips.appendChild(c);
    });
    setTimeout(function () { load(0); }, 800);
  }

  /* ---------------- SANCTIONS ---------------- */
  function loadOpenSanctions() {
    /* the catalog is ~2MB raw — fetch once, trim to rows, cache the TRIMMED result 24h */
    var CK = 'niySec1:os:lists';
    try {
      var raw = localStorage.getItem(CK);
      if (raw) { var o = JSON.parse(raw); if (Date.now() - o.t < 24 * 3600000) return Promise.resolve(o.d); }
    } catch (e) {}
    return fetch('https://data.opensanctions.org/datasets/latest/index.json',
      { signal: (AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var rows = (j.datasets || [])
          .filter(function (d) { return d && d.tags && d.tags.indexOf('list.sanction') >= 0 && !d.deprecated && !d.hidden && d.target_count; })
          .sort(function (a, b) { return b.target_count - a.target_count; })
          .slice(0, 15)
          .map(function (d) { return { t: d.title, p: (d.publisher && d.publisher.name) || '',
            c: (d.publisher && d.publisher.country_label) || '', n: d.target_count,
            u: (d.updated_at || '').slice(0, 10), url: d.url || '' }; });
        try { localStorage.setItem(CK, JSON.stringify({ t: Date.now(), d: rows })); } catch (e) {}
        return rows;
      });
  }
  function buildSN(detail) {
    if (document.getElementById('niySecSN')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecSN';
    var s1 = K.sec('niySecSN1', 'Sanctions Lists \u2014 OpenSanctions (live, daily)');
    var s2 = K.sec('niySecSN2', 'Sanctions Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    Promise.all([
      loadOpenSanctions(),
      K.jget('os:sum', 'https://data.opensanctions.org/datasets/latest/sanctions/index.json', 24 * 3600000)
        .catch(function () { return null; })
    ]).then(function (res) {
      var rows = res[0], sum = res[1];
      if (!rows || !rows.length) throw new Error('empty');
      if (sum && sum.target_count) {
        s1.body.appendChild(K.el('div', 'nls-note',
          'Consolidated coverage: ' + Number(sum.entity_count).toLocaleString('en-IN') + ' entities \u00b7 ' +
          Number(sum.target_count).toLocaleString('en-IN') + ' sanctioned targets \u00b7 updated ' +
          String(sum.updated_at || '').slice(0, 10)));
      }
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['List', 'Publisher', 'Country', 'Targets', 'Updated'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        var td = K.el('td');
        if (r.url) { var a = K.el('a', null, r.t); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; td.appendChild(a); }
        else td.textContent = r.t;
        tr.appendChild(td);
        tr.appendChild(K.el('td', null, r.p));
        tr.appendChild(K.el('td', null, r.c));
        tr.appendChild(K.el('td', 'nls-num', Number(r.n).toLocaleString('en-IN')));
        tr.appendChild(K.el('td', 'nls-num', r.u));
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(tb);
      s1.status.textContent = 'LIVE \u00b7 OpenSanctions \u00b7 cached 24h';
    }).catch(function () {
      K.offline(s1, 'OpenSanctions unreachable from this network \u2014 it will retry automatically.');
    });
    setTimeout(function () {
      K.gdelt('sn:wire', '(sanctions OR OFAC OR "export controls" OR designation OR blacklist)', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- GLOBAL AID ---------------- */
  function buildGA(detail) {
    if (document.getElementById('niySecGA')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecGA';
    var yr = new Date().getFullYear();
    var s1 = K.sec('niySecGA1', 'Humanitarian Funding ' + yr + ' \u2014 UN OCHA FTS (live)');
    var s2 = K.sec('niySecGA2', 'Aid Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    K.jget('fts:' + yr, 'https://api.hpc.tools/v1/public/fts/flow?year=' + yr + '&groupby=plan', 6 * 3600000)
      .then(function (j) {
        var rep = j && j.data && (j.data.report3 || j.data.report1);
        var obj = rep && rep.fundingTotals && rep.fundingTotals.objects && rep.fundingTotals.objects[0];
        var plans = (obj && obj.singleFundingObjects) || [];
        var total = (obj && obj.singleFundingTotal) || 0;
        var rows = plans.filter(function (p) { return p.name && p.name !== 'Not specified' && p.totalFunding; })
          .sort(function (a, b) { return b.totalFunding - a.totalFunding; }).slice(0, 15);
        if (!rows.length) throw new Error('empty');
        if (total) s1.body.appendChild(K.el('div', 'nls-note',
          'Total tracked humanitarian funding ' + yr + ': US$ ' + (total / 1e9).toFixed(1) + ' bn'));
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Response Plan', 'Funding (US$ m)', 'Share'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        rows.forEach(function (p) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, p.name));
          tr.appendChild(K.el('td', 'nls-num', (p.totalFunding / 1e6).toLocaleString('en-IN', { maximumFractionDigits: 1 })));
          tr.appendChild(K.el('td', 'nls-num', total ? ((p.totalFunding / total) * 100).toFixed(1) + '%' : '\u2014'));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.appendChild(tb);
        s1.status.textContent = 'LIVE \u00b7 UN OCHA FTS \u00b7 cached 6h';
      })
      .catch(function () { K.offline(s1, 'UN OCHA FTS unreachable from this network \u2014 it will retry automatically.'); });
    setTimeout(function () {
      K.gdelt('ga:wire', '("humanitarian aid" OR "aid package" OR "donor conference" OR "relief operation")', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- mount loop (csv OR label keyed — outline pages have csv:null) ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = { 'geo_sanctions': function (detail) { var n = document.getElementById('niySecSN'); if (n && n.parentNode) n.parentNode.removeChild(n); var host = document.getElementById('niyGeoDossier'); if (host && !host.querySelector('.snw-direct') && window.NiySanctions) window.NiySanctions.activate(host); }, 'Alliances': function (detail) { var n = document.getElementById('niySecAL'); if (n && n.parentNode) n.parentNode.removeChild(n); }, 'Alliances & Diplomacy': function (detail) { var n = document.getElementById('niySecAL'); if (n && n.parentNode) n.parentNode.removeChild(n); },
              'Global Aid': function (detail) { var n = document.getElementById('niySecGA'); if (n && n.parentNode) n.parentNode.removeChild(n); if (window.NiyGlobalAid) window.NiyGlobalAid.activate(detail); } };
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
  setInterval(function () { /* self-refresh: drop, remount, TTL-stale cache refetches */
    ['niySecAL', 'niySecSN', 'niySecGA'].forEach(function (id) {
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