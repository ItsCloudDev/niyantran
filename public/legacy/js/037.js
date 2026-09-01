/* V2 PASS 63 Security desk live layer — GDELT 2.0 · World Bank(SIPRI) · ReliefWeb */(function () {
  'use strict';
  var PFX = 'niySec1:';
  var mem = {}, dead = {}, flight = {};
  function now() { return Date.now(); }
  function lsGet(k, ttl) { try { var raw = localStorage.getItem(PFX + k); if (!raw) return null;
    var o = JSON.parse(raw); if (now() - o.t > ttl) return null; return o.d; } catch (e) { return null; } }
  function lsPut(k, d) { try { var s = JSON.stringify({ t: now(), d: d });
    if (s.length < 150000) localStorage.setItem(PFX + k, s); } catch (e) {} }
  function jget(key, url, ttl, asText) {
    if (mem[key] && now() - mem[key].t < ttl) return Promise.resolve(mem[key].d);
    var c = lsGet(key, ttl);
    if (c) { mem[key] = { t: now(), d: c }; return Promise.resolve(c); }
    var dk = dead[key]; /*V2PASS63B cooldown, not permanent death*/
    if (dk && dk.n >= 3) { if (now() < dk.until) return Promise.reject(new Error('cooldown')); dead[key] = null; }
    if (flight[key]) return flight[key];
    flight[key] = fetch(url, { signal: (AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return asText ? r.text() : r.json(); })
      .then(function (d) { mem[key] = { t: now(), d: d }; lsPut(key, d); dead[key] = null; flight[key] = null; return d; })
      .catch(function (e) { var p = dead[key]; dead[key] = { n: ((p && p.n) || 0) + 1, until: now() + 600000 }; flight[key] = null; throw e; });
    return flight[key];
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls;
    if (text != null) e.textContent = text; return e; }
  function fmtT(d) { try { return d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; } catch (e) { return ''; } }
  function stamp() { try { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function gdeltDate(s) { if (!s || s.length < 15) return null;
    return new Date(s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) + 'T' +
      s.slice(9, 11) + ':' + s.slice(11, 13) + ':' + s.slice(13, 15) + 'Z'); }

  /* GDELT DOC 2.0 — free, no key, updates every 15 min, CORS-open */
  function gdelt(key, q, ttl) {
    var url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(q) +
      '&mode=ArtList&maxrecords=40&format=json&sort=DateDesc&timespan=1d';
    return jget(key, url, ttl).catch(function () { /*V2PASS63C second egress: deployed proxy fetches GDELT server-side*/
      return jget('p:' + key, '/api/rss?url=' + encodeURIComponent(url), ttl, true)
        .then(function (t) { return JSON.parse(t); });
    }).then(function (j) {
      var seen = {}, rows = [];
      ((j && j.articles) || []).forEach(function (a) {
        if (!a.title) return;
        var k2 = a.title.toLowerCase().slice(0, 64);
        if (seen[k2]) return; seen[k2] = 1;
        rows.push({ t: gdeltDate(a.seendate), title: a.title, url: a.url,
          src: a.domain || '', cc: a.sourcecountry || '' });
      });
      return rows.slice(0, 25);
    });
  }

  function sec(id, title) {
    var wrap = el('div', 'niy-live-sec'); wrap.id = id;
    var head = el('div', 'nls-head');
    head.appendChild(el('span', 'nls-title', title));
    var st = el('span', 'nls-status', 'loading\u2026');
    head.appendChild(st); wrap.appendChild(head);
    var body = el('div', 'nls-body'); wrap.appendChild(body);
    return { wrap: wrap, body: body, status: st };
  }
  function newsTable(rows) {
    var tb = el('table'), thead = el('thead'), trh = el('tr');
    ['Time', 'Headline', 'Source', 'Country'].forEach(function (c) { trh.appendChild(el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', 'nls-num', fmtT(r.t)));
      var td = el('td'); var a = el('a', null, r.title);
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      td.appendChild(a); tr.appendChild(td);
      tr.appendChild(el('td', null, r.src));
      tr.appendChild(el('td', null, r.cc));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); return tb;
  }
  function fillNews(s, rows, srcLabel) {
    s.body.innerHTML = '';
    if (!rows || !rows.length) { s.body.appendChild(el('div', 'nls-note', 'No items in the last 24 hours.')); }
    else s.body.appendChild(newsTable(rows));
    s.status.textContent = 'LIVE \u00b7 ' + srcLabel + ' \u00b7 updated ' + stamp();
  }
  function offline(s, msg) { s.body.innerHTML = '';
    s.body.appendChild(el('div', 'nls-note', msg)); s.status.textContent = 'offline'; }

  function host(detail) {
    return detail.querySelector('.niy-col-feed') || detail.querySelector('.niy-col-body') || detail;
  }

  /* ---------------- OPEN FRONTS ---------------- */
  function buildOF(detail) {
    if (document.getElementById('niySecOF')) return;
    var box = el('div'); box.id = 'niySecOF';
    var s1 = sec('niySecOF1', 'Live Conflict Wire \u2014 GDELT 2.0');
    var s2 = sec('niySecOF2', 'Situation Reports \u2014 ReliefWeb (UN OCHA)');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    host(detail).appendChild(box);
    gdelt('of:wire', '(war OR airstrike OR offensive OR ceasefire OR insurgency)', 15 * 60000)
      .then(function (rows) { fillNews(s1, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
      .catch(function () { offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    jget('of:rw', '/api/rss?url=' + encodeURIComponent('https://reliefweb.int/updates/rss.xml'), 30 * 60000, true)
      .then(function (t) {
        var doc = new DOMParser().parseFromString(t, 'text/xml');
        var rows = [].slice.call(doc.querySelectorAll('item')).slice(0, 12).map(function (it) {
          function g(k) { var e = it.querySelector(k); return e ? e.textContent.trim() : ''; }
          var d = new Date(g('pubDate'));
          return { t: isNaN(d) ? null : d, title: g('title'), url: g('link'), src: 'ReliefWeb', cc: '' };
        }).filter(function (x) { return x.title; });
        if (!rows.length) throw new Error('empty');
        fillNews(s2, rows, 'ReliefWeb \u00b7 UN OCHA');
      })
      .catch(function () { offline(s2, 'Situation reports arrive through the deployed backend (/api/rss). Not available in this session.'); });
  }

  /* ---------------- CONFLICTS ---------------- */
  var THEATRES = [
    ['All fronts', '(war OR airstrike OR offensive OR ceasefire OR insurgency)'],
    ['Ukraine', '"Ukraine" (war OR strike OR offensive OR drone)'],
    ['Gaza / Israel', '("Gaza" OR "Israel") (strike OR ceasefire OR hostage OR offensive)'],
    ['Red Sea', '("Red Sea" OR "Houthi") (ship OR strike OR attack)'],
    ['Sudan', '"Sudan" (war OR RSF OR fighting OR famine)'],
    ['Sahel', '("Mali" OR "Niger" OR "Burkina Faso") (insurgency OR attack OR junta)'],
    ['Myanmar', '"Myanmar" (junta OR offensive OR resistance)'],
    ['DR Congo', '("DR Congo" OR "DRC" OR "M23") (fighting OR offensive OR rebels)']
  ];
  function buildCX(detail) {
    if (document.getElementById('niySecCX')) return;
    var s1 = sec('niySecCX', 'Theatre Wire \u2014 GDELT 2.0');
    var chips = el('div', 'nls-chips');
    s1.wrap.insertBefore(chips, s1.body);
    var current = 0;
    function load(i) {
      current = i;
      [].slice.call(chips.children).forEach(function (c, j) { c.classList.toggle('on', j === i); });
      s1.status.textContent = 'loading\u2026';
      gdelt(i === 0 ? 'of:wire' : 'cx:' + i, THEATRES[i][1], 15 * 60000)
        .then(function (rows) { if (current !== i) return; fillNews(s1, rows, THEATRES[i][0] + ' \u00b7 GDELT 2.0'); })
        .catch(function () { if (current !== i) return; offline(s1, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }
    THEATRES.forEach(function (t, i) {
      var c = el('button', 'nls-chip' + (i === 0 ? ' on' : ''), t[0]);
      c.type = 'button';
      c.addEventListener('click', function () { load(i); });
      chips.appendChild(c);
    });
    host(detail).appendChild(s1.wrap);
    load(0);
  }

  /* ---------------- GLOBAL INTELLIGENCE ---------------- */
  var WB_CC = 'USA;CHN;IND;RUS;GBR;FRA;DEU;JPN;KOR;SAU;ISR;AUS;ITA;TUR;PAK';
  function wb(indicator, key) {
    return jget(key, 'https://api.worldbank.org/v2/country/' + WB_CC + '/indicator/' + indicator +
      '?format=json&mrv=1&per_page=20', 24 * 3600000)
      .then(function (j) {
        var out = {};
        ((j && j[1]) || []).forEach(function (r) {
          if (r && r.country && r.value != null) out[r.country.value] = { v: r.value, y: r.date };
        });
        return out;
      });
  }
  function buildGI(detail) {
    if (document.getElementById('niySecGI')) return;
    var box = el('div'); box.id = 'niySecGI';
    var s1 = sec('niySecGI1', 'Military Expenditure \u2014 World Bank open data (SIPRI series)');
    var s2 = sec('niySecGI2', 'Procurement Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    host(detail).appendChild(box);
    Promise.all([wb('MS.MIL.XPND.CD', 'gi:usd'), wb('MS.MIL.XPND.GD.ZS', 'gi:gdp')])
      .then(function (res) {
        var usd = res[0], gdp = res[1];
        var rows = Object.keys(usd).map(function (c) {
          return { c: c, y: usd[c].y, usd: usd[c].v, gdp: gdp[c] ? gdp[c].v : null };
        }).sort(function (a, b) { return b.usd - a.usd; });
        if (!rows.length) throw new Error('empty');
        var tb = el('table'), thead = el('thead'), trh = el('tr');
        ['Country', 'Year', 'Spend (US$ bn)', '% of GDP'].forEach(function (c) { trh.appendChild(el('th', null, c)); });
        thead.appendChild(trh); tb.appendChild(thead);
        var tbody = el('tbody');
        rows.forEach(function (r) {
          var tr = el('tr');
          tr.appendChild(el('td', null, r.c));
          tr.appendChild(el('td', 'nls-num', r.y));
          tr.appendChild(el('td', 'nls-num', (r.usd / 1e9).toLocaleString('en-IN', { maximumFractionDigits: 1 })));
          tr.appendChild(el('td', 'nls-num', r.gdp == null ? '\u2014' : r.gdp.toFixed(1)));
          tbody.appendChild(tr);
        });
        tb.appendChild(tbody);
        s1.body.innerHTML = ''; s1.body.appendChild(tb);
        s1.status.textContent = 'World Bank \u00b7 SIPRI series \u00b7 cached 24h';
      })
      .catch(function () { offline(s1, 'World Bank open-data API unreachable from this network \u2014 it will retry automatically.'); });
    setTimeout(function () { /*V2PASS63B stagger to respect GDELT rate limits*/
    gdelt('gi:wire', '("defense procurement" OR "arms deal" OR "defence contract" OR "weapons deal")', 15 * 60000)
      .then(function (rows) { fillNews(s2, rows, 'GDELT 2.0 \u00b7 15-min cadence'); })
      .catch(function () { offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 4000);
  }

  /*V2PASS65KIT — shared engine for other desks’ live sections*/
  window.__niySecKit = { jget: jget, gdelt: gdelt, sec: sec, newsTable: newsTable,
    fillNews: fillNews, offline: offline, host: host, el: el, fmtT: fmtT, stamp: stamp };
  /* ---------------- mount loop (same contract the Transit module uses) ---------------- */
  var MAP = {
    'geopolitics_war_tracker.csv': function (detail) { var n = document.getElementById('niySecOF'); if (n && n.parentNode) n.parentNode.removeChild(n); },
    'geo_conflicts': buildCX,
    'geopolitics_defense_procurement.csv': buildGI
  };
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'geopolitics') return;
      var fn = MAP[a.csv]; if (!fn) return;
      var d = document.getElementById('detail'); if (!d) return;
      fn(d);
    } catch (e) {}
  }
  setInterval(function () { /*V2PASS63B self-refresh*/
    ['niySecOF', 'niySecCX', 'niySecGI'].forEach(function (id) {
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