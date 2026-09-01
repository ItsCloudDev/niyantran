/* V2 PASS 66 Strategic Assets live layer — IMF PortWatch · Space Devs · CelesTrak · GDELT */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }

  /* ---------------- INFRA ---------------- */
  function buildIN(detail) {
    if (document.getElementById('niySecIN')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecIN';
    var s1 = K.sec('niySecIN1', 'Infrastructure Wire \u2014 GDELT 2.0');
    var s2 = K.sec('niySecIN2', 'Development Projects \u2014 World Bank');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    K.gdelt('in:wire', '("port project" OR "economic corridor" OR "belt and road" OR pipeline OR "high-speed rail")', 15 * 60000)
      .then(function (rows) { K.fillNews(s1, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
      .catch(function () { K.offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    K.jget('in:wb', '/api/rss?url=' + encodeURIComponent('https://search.worldbank.org/api/v2/projects?format=json&rows=12&os=0'), 12 * 3600000, true)
      .then(function (t) {
        var j = JSON.parse(t);
        var ps = j && j.projects ? Object.keys(j.projects).map(function (k) { return j.projects[k]; }) : [];
        if (!ps.length) throw new Error('empty');
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Project', 'Country', 'Commitment (US$ m)', 'Approved'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        ps.slice(0, 12).forEach(function (p) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, (p.project_name || '').slice(0, 90)));
          tr.appendChild(K.el('td', null, p.countryshortname || ''));
          tr.appendChild(K.el('td', 'nls-num', p.curr_total_commitment != null ? String(p.curr_total_commitment) : '\u2014'));
          tr.appendChild(K.el('td', 'nls-num', (p.boardapprovaldate || '').slice(0, 10)));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s2.body.innerHTML = ''; s2.body.appendChild(tb);
        s2.status.textContent = 'World Bank \u00b7 via deployed proxy \u00b7 cached 12h';
      })
      .catch(function () { K.offline(s2, 'World Bank projects arrive through the deployed backend (/api/rss). Not available in this session.'); });
  }

  /* ---------------- NUCLEAR WATCH ---------------- */
  var ARSENAL = [
    ['Russia', '~5,450', 'Deployed + reserve + retired-awaiting-dismantlement'],
    ['United States', '~5,180', 'Deployed + reserve + retired-awaiting-dismantlement'],
    ['China', '~600', 'Fastest-growing stockpile; silo build-out'],
    ['France', '~290', 'Sea- and air-based deterrent'],
    ['United Kingdom', '~225', 'Sea-based deterrent; ceiling raised 2021'],
    ['India', '~180', 'Triad maturing; no-first-use doctrine'],
    ['Pakistan', '~170', 'Full-spectrum posture'],
    ['Israel', '~90', 'Undeclared'],
    ['North Korea', '~50', 'Fissile stock growing; delivery tests continue']
  ];
  function buildNW(detail) {
    if (document.getElementById('niySecNW')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecNW';
    var s1 = K.sec('niySecNW1', 'Arsenal Reference \u2014 FAS estimates');
    var s2 = K.sec('niySecNW2', 'Nuclear Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['State', 'Est. warheads', 'Posture note'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    ARSENAL.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', 'nls-num', r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 FAS/SIPRI estimates \u00b7 as of 2025';
    setTimeout(function () {
      K.gdelt('nw:wire', '("nuclear weapons" OR "nuclear test" OR enrichment OR nonproliferation OR "arms control")', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 2500);
  }

  /* ---------------- SATELLITE INFRASTRUCTURE ---------------- */
  function buildSI(detail) {
    if (document.getElementById('niySecSI')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecSI';
    var s1 = K.sec('niySecSI1', 'Upcoming Launches \u2014 Launch Library (The Space Devs)');
    var s2 = K.sec('niySecSI2', 'Newly Orbited Objects \u2014 CelesTrak (last 30 days)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    K.jget('si:ll', 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&format=json', 30 * 60000)
      .then(function (j) {
        var rs = (j && j.results) || [];
        if (!rs.length) throw new Error('empty');
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Launch', 'Provider', 'Pad', 'NET (UTC)'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        rs.forEach(function (l) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, (l.name || '').slice(0, 70)));
          tr.appendChild(K.el('td', null, (l.launch_service_provider && l.launch_service_provider.name) || ''));
          tr.appendChild(K.el('td', null, (l.pad && l.pad.location && l.pad.location.name) || ''));
          tr.appendChild(K.el('td', 'nls-num', (l.net || '').replace('T', ' ').slice(0, 16)));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.innerHTML = ''; s1.body.appendChild(tb);
        s1.status.textContent = 'LIVE \u00b7 The Space Devs \u00b7 cached 30 min';
      })
      .catch(function () { K.offline(s1, 'Launch Library unreachable from this network \u2014 it will retry automatically.'); });
    /* CelesTrak: fetch, trim, cache trimmed (raw is ~150KB) */
    (function () {
      var CK = 'niySec1:si:ct';
      var cached = null;
      try { var raw = localStorage.getItem(CK);
        if (raw) { var o = JSON.parse(raw); if (Date.now() - o.t < 6 * 3600000) cached = o.d; } } catch (e) {}
      (cached ? Promise.resolve(cached)
        : fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json',
            { signal: (AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined) })
            .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
            .then(function (arr) {
              var d = { n: arr.length, rows: arr.slice(0, 12).map(function (o) {
                return { name: o.OBJECT_NAME, id: o.OBJECT_ID, ep: (o.EPOCH || '').slice(0, 10) }; }) };
              try { localStorage.setItem(CK, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
              return d;
            })
      ).then(function (d) {
        s2.body.innerHTML = '';
        s2.body.appendChild(K.el('div', 'nls-note', d.n + ' objects catalogued in the last 30 days'));
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Object', 'Intl designator', 'Epoch'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        d.rows.forEach(function (r) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, r.name));
          tr.appendChild(K.el('td', 'nls-num', r.id));
          tr.appendChild(K.el('td', 'nls-num', r.ep));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s2.body.appendChild(tb);
        s2.status.textContent = 'LIVE \u00b7 CelesTrak \u00b7 cached 6h';
      }).catch(function () {
        K.offline(s2, 'CelesTrak unreachable from this network \u2014 it will retry automatically.');
      });
    })();
  }

  /* ---------------- MARITIME CHOKE-POINTS ---------------- */
  function buildCP(detail) {
    if (document.getElementById('niySecCP')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecCP';
    var s1 = K.sec('niySecCP1', 'Daily Transit Calls \u2014 IMF PortWatch');
    var s2 = K.sec('niySecCP2', 'Chokepoint Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var url = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query' +
      '?where=1%3D1&outFields=date,portname,n_total,n_tanker,n_container,n_dry_bulk,n_cargo&orderByFields=date%20DESC&resultRecordCount=60&f=json';
    K.jget('cp:pw', url, 6 * 3600000)
      .then(function (j) {
        var fs2 = (j && j.features) || [];
        if (!fs2.length) throw new Error('empty');
        var latest = fs2[0].attributes.date;
        var rows = fs2.map(function (f) { return f.attributes; })
          .filter(function (a) { return a.date === latest; })
          .sort(function (a, b) { return b.n_total - a.n_total; });
        var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
        ['Chokepoint', 'Transits', 'Tankers', 'Container', 'Dry bulk', 'Cargo'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = K.el('tbody');
        rows.forEach(function (a) {
          var tr = K.el('tr');
          tr.appendChild(K.el('td', null, a.portname));
          tr.appendChild(K.el('td', 'nls-num', String(a.n_total)));
          tr.appendChild(K.el('td', 'nls-num', String(a.n_tanker)));
          tr.appendChild(K.el('td', 'nls-num', String(a.n_container)));
          tr.appendChild(K.el('td', 'nls-num', String(a.n_dry_bulk)));
          tr.appendChild(K.el('td', 'nls-num', String(a.n_cargo)));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.innerHTML = '';
        s1.body.appendChild(K.el('div', 'nls-note', 'Vessel transit calls on ' + latest + ' \u00b7 IMF PortWatch (AIS-derived, ~3-day lag)'));
        s1.body.appendChild(tb);
        s1.status.textContent = 'LIVE \u00b7 IMF PortWatch \u00b7 cached 6h';
      })
      .catch(function () { K.offline(s1, 'IMF PortWatch unreachable from this network \u2014 it will retry automatically.'); });
    setTimeout(function () {
      K.gdelt('cp:wire', '("Suez" OR "Hormuz" OR "Malacca" OR "Bab el-Mandeb" OR "Panama Canal")', 15 * 60000)
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
  var MAP = { 'geopolitics_infra_projects.csv': buildIN, 'geo_chokepoints': buildCP,
              'Nuclear Watch': buildNW, 'Satellite Infrastructure': buildSI };
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
    ['niySecIN', 'niySecNW', 'niySecSI', 'niySecCP'].forEach(function (id) {
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