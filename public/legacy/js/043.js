/* V2 PASS 69 National: Delimitation Simulator + Manifestos & Promises */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }

  /* [state, 2026 projected population (thousands, NCP 2011-36), current LS seats] */
  var STATES = [
    ['Uttar Pradesh', 238100, 80], ['Bihar', 127800, 40], ['Maharashtra', 126400, 48],
    ['West Bengal', 99600, 42], ['Madhya Pradesh', 87600, 29], ['Rajasthan', 82400, 25],
    ['Tamil Nadu', 76800, 39], ['Gujarat', 71500, 26], ['Karnataka', 69300, 28],
    ['Andhra Pradesh', 53200, 25], ['Odisha', 47100, 21], ['Jharkhand', 40100, 14],
    ['Telangana', 38200, 17], ['Assam', 36300, 14], ['Kerala', 35800, 20],
    ['Punjab', 30800, 13], ['Haryana', 30700, 10], ['Chhattisgarh', 30200, 11],
    ['Delhi', 21600, 7], ['Jammu & Kashmir', 13600, 5], ['Uttarakhand', 11800, 5],
    ['Himachal Pradesh', 7500, 4], ['Tripura', 4200, 2], ['Meghalaya', 3400, 2],
    ['Manipur', 3300, 2], ['Nagaland', 2300, 1], ['Goa', 1600, 2],
    ['Arunachal Pradesh', 1600, 2], ['Puducherry', 1600, 1], ['Mizoram', 1300, 1],
    ['Chandigarh', 1200, 1], ['D&N Haveli and Daman & Diu', 1200, 2], ['Sikkim', 700, 1],
    ['Andaman & Nicobar', 400, 1], ['Ladakh', 300, 1], ['Lakshadweep', 70, 1]
  ];
  /* largest-remainder allocation with a minimum of one seat per state/UT */
  function allocate(H) {
    var totalPop = 0;
    STATES.forEach(function (s) { totalPop += s[1]; });
    var rows = STATES.map(function (s) {
      var q = s[1] / totalPop * H;
      return { name: s[0], pop: s[1], now: s[2], q: q, base: Math.floor(q), rem: q - Math.floor(q), bumped: false };
    });
    rows.forEach(function (r) { if (r.base < 1) { r.base = 1; r.bumped = true; } });
    var assigned = 0;
    rows.forEach(function (r) { assigned += r.base; });
    var leftover = H - assigned;
    if (leftover > 0) {
      rows.slice().sort(function (a, b) { return b.rem - a.rem; })
        .slice(0, leftover).forEach(function (r) { r.base += 1; });
    } else if (leftover < 0) {
      rows.slice().filter(function (r) { return !r.bumped && r.base > 1; })
        .sort(function (a, b) { return a.rem - b.rem; })
        .slice(0, -leftover).forEach(function (r) { r.base -= 1; });
    }
    return rows.map(function (r) { return { name: r.name, pop: r.pop, now: r.now, proj: r.base, d: r.base - r.now }; })
      .sort(function (a, b) { return b.d - a.d || b.proj - a.proj; });
  }

  function buildDS(detail) {
    if (document.getElementById('niySecDS')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecDS';
    var s1 = K.sec('niySecDS1', 'Seat Reallocation Simulator \u2014 population-proportional');
    var s2 = K.sec('niySecDS2', 'Delimitation Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var chips = K.el('div', 'nls-chips');
    s1.wrap.insertBefore(chips, s1.body);
    var SIZES = [[543, '543 \u00b7 current house'], [753, '753 \u00b7 expanded'], [848, '848 \u00b7 debated ceiling']];
    function render(H) {
      [].slice.call(chips.children).forEach(function (c, j) { c.classList.toggle('on', SIZES[j][0] === H); });
      var rows = allocate(H);
      var sum = 0, gain = 0, lose = 0;
      rows.forEach(function (r) { sum += r.proj; if (r.d > 0) gain++; if (r.d < 0) lose++; });
      s1.body.innerHTML = '';
      s1.body.appendChild(K.el('div', 'nls-note',
        'House of ' + H + ' \u00b7 allocation check \u03a3 = ' + sum + ' \u00b7 ' + gain +
        ' states gain, ' + lose + ' lose \u00b7 seats frozen on the 1971 census since 1976'));
      var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
      ['State / UT', '2026 pop. (M, proj.)', 'Seats now', 'Projected', '\u0394'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
      thead.appendChild(trh); tb.appendChild(thead);
      var tbody = K.el('tbody');
      rows.forEach(function (r) {
        var tr = K.el('tr');
        tr.appendChild(K.el('td', null, r.name));
        tr.appendChild(K.el('td', 'nls-num', (r.pop / 1000).toFixed(1)));
        tr.appendChild(K.el('td', 'nls-num', String(r.now)));
        tr.appendChild(K.el('td', 'nls-num', String(r.proj)));
        var dd = K.el('td', 'nls-num', (r.d > 0 ? '+' : '') + r.d);
        if (r.d > 0) dd.style.color = 'var(--pos,#0B7A3E)';
        if (r.d < 0) dd.style.color = 'var(--neg,#C0261B)';
        tr.appendChild(dd);
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
      s1.body.appendChild(tb);
      s1.status.textContent = 'simulation \u00b7 largest remainder \u00b7 NCP 2011\u201336 projections \u00b7 illustrative';
    }
    SIZES.forEach(function (s, i) {
      var c = K.el('button', 'nls-chip' + (i === 0 ? ' on' : ''), s[1]);
      c.type = 'button';
      c.addEventListener('click', function () { render(s[0]); });
      chips.appendChild(c);
    });
    render(543);
    setTimeout(function () {
      K.gdelt('ds:wire', '(delimitation OR "seat allocation" OR census) sourcecountry:IN', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 1200);
  }

  /* ---------------- MANIFESTOS & PROMISES ---------------- */
  var PROMISES = [
    ['Ayushman Bharat cover for all citizens 70+', 'Health', 'Launched Oct 2024 \u2014 enrolment live'],
    ['3 crore additional PMAY houses', 'Housing', 'Cabinet approved Aug 2024 \u2014 rollout ongoing'],
    ['One Nation One Election', 'Governance', '129th Amendment Bill introduced Dec 2024 \u2014 before JPC'],
    ['Uniform Civil Code', 'Governance', 'Uttarakhand state UCC in force (2025); national law pending'],
    ['Free foodgrain (PMGKAY) for 5 years', 'Welfare', 'Extension in force \u2014 ongoing'],
    ['3 crore Lakhpati Didis', 'Livelihoods', 'NRLM programme ongoing \u2014 counts contested; verify NRLM data'],
    ['Women\u2019s reservation (Nari Shakti Vandan)', 'Representation', 'Enacted 2023 \u2014 implementation tied to census + delimitation'],
    ['Mudra loan ceiling to \u20b920 lakh', 'Finance', 'Raised Oct 2024 \u2014 in force'],
    ['Anti paper-leak law', 'Education', 'Public Examinations Act 2024 \u2014 in force'],
    ['Vande Bharat & rail modernisation', 'Infrastructure', 'Fleet expansion ongoing']
  ];
  var LIBRARY = [
    ['BJP \u2014 Sankalp Patra 2024', 'https://www.bjp.org/manifesto'],
    ['INC \u2014 Nyay Patra 2024', 'https://manifesto.inc.in/'],
    ['ECI \u2014 Model Code & party documents', 'https://www.eci.gov.in/'],
    ['Manifesto Project (research corpus)', 'https://manifesto-project.wzb.eu/']
  ];
  function buildMP(detail) {
    if (document.getElementById('niySecMP')) return;
    var K = kit(); if (!K) return;
    var box = K.el('div'); box.id = 'niySecMP';
    var s1 = K.sec('niySecMP1', 'Union Manifesto Tracker \u2014 2024 promises, verifiable status');
    var s3 = K.sec('niySecMP3', 'Manifesto Library');
    var s2 = K.sec('niySecMP2', 'Promise Wire \u2014 GDELT 2.0');
    box.appendChild(s1.wrap); box.appendChild(s3.wrap); box.appendChild(s2.wrap);
    K.host(detail).appendChild(box);
    var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
    ['Promise', 'Domain', 'Verifiable status'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = K.el('tbody');
    PROMISES.forEach(function (r) {
      var tr = K.el('tr');
      tr.appendChild(K.el('td', null, r[0]));
      tr.appendChild(K.el('td', null, r[1]));
      tr.appendChild(K.el('td', null, r[2]));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    s1.body.appendChild(tb);
    s1.status.textContent = 'curated \u00b7 as of Jan 2026 \u00b7 verify against Gazette / PIB';
    var ul = K.el('div');
    LIBRARY.forEach(function (l) {
      var d = K.el('div', 'nls-note');
      var a = K.el('a', null, l[0]);
      a.href = l[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
      d.appendChild(a); ul.appendChild(d);
    });
    s3.body.appendChild(ul);
    s3.status.textContent = 'primary documents';
    setTimeout(function () {
      K.gdelt('mp:wire', '(manifesto OR "poll promise" OR "election guarantee") sourcecountry:IN', 15 * 60000)
        .then(function (rows) { K.fillNews(s2, rows, 'India \u00b7 GDELT 2.0'); })
        .catch(function () { K.offline(s2, 'GDELT wire unreachable from this network \u2014 it will retry automatically.'); });
    }, 1200);
  }

  /* ---------------- mount loop (label-keyed ONLY — csv is stale on outline pages here) ---------------- */
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  var MAP = { 'Delimitation Simulator': buildDS, 'Delimitation Impact Simulator': buildDS,
              'Manifestos & Promises': buildMP, 'LS Manifestos & Promises Tracker': buildMP };
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'national') return;
      var fn = MAP[activeLabel()];
      if (!fn) return;
      var d = document.getElementById('detail'); if (!d) return;
      fn(d);
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