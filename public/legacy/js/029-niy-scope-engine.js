/* V2 PASS 43 — geography scope engine.
   Single source of truth for State/Local geography. Adding a state = adding a pack
   to NIY_GEO.packs; every selector, statistic, feed and title below is derived. */
(function () {
  'use strict';
  var GEO = window.NIY_GEO || { registry: [], packs: {} };
  var LS = 'niyScopeV1';
  var st = { state: 'GA', district: '', ac: '', booth: '' };
  try { var s = JSON.parse(localStorage.getItem(LS) || 'null'); if (s && s.state) st = s; } catch (e) {}

  function reg(code) { for (var i = 0; i < GEO.registry.length; i++) if (GEO.registry[i].code === code) return GEO.registry[i]; return null; }
  function pack() { return GEO.packs[st.state] || null; }
  function isLive() { var r = reg(st.state); return !!(r && r.status === 'live' && pack()); }
  function idx(cols, name) { return cols.indexOf(name); }
  function num(v) { return typeof v === 'number' ? v : (v === '' || v == null ? null : Number(v)); }
  function fmt(n) { return (n == null || isNaN(n)) ? '\u2014' : Number(n).toLocaleString('en-IN'); }

  /* ---------- derived slices ---------- */
  function seatObjs() {
    var P = pack(); if (!P) return [];
    var C = P.seatCols, g = function (r, k) { var i = idx(C, k); return i < 0 ? '' : r[i]; };
    return P.seats.map(function (r) {
      return { ac: g(r, 'AC'), name: g(r, 'Constituency'), district: g(r, 'District'), taluka: g(r, 'Taluka'),
        electors: g(r, 'Electors'), booths: g(r, 'Booths'), bloc: g(r, 'Leading bloc'), leadPct: g(r, 'Leading %'),
        status: g(r, 'Status 2022'), male: g(r, 'Male'), female: g(r, 'Female'), sexRatio: g(r, 'Sex ratio'),
        medianAge: g(r, 'Median age'), young: g(r, '18-25 %'), senior: g(r, '60+ %'), households: g(r, 'Households'),
        ac22: g(r, 'BJP AC 2022'), ls24: g(r, 'BJP LS 2024'), gap: g(r, 'Split-ticket gap'),
        inPlay: g(r, 'In-play electors'), inPlayPct: g(r, 'In-play %'), flips: g(r, 'Mean booth flips'),
        distinct: g(r, 'Distinct winners'), _r: r };
    });
  }
  function boothObjs() {
    var P = pack(); if (!P) return [];
    var C = P.boothCols, g = function (r, k) { var i = idx(C, k); return i < 0 ? '' : r[i]; };
    return P.booths.map(function (r) {
      var add = num(g(r, 'SIR added')) || 0, rem = num(g(r, 'SIR removed')) || 0, el = num(g(r, 'Electors')) || 0;
      return { ac: g(r, 'AC'), booth: g(r, 'Booth'), station: g(r, 'Polling station'), electors: el,
        male: g(r, 'Male'), female: g(r, 'Female'), sexRatio: g(r, 'Sex ratio'), meanAge: g(r, 'Mean age'),
        young: g(r, '18-25 %'), senior: g(r, '60+ %'), households: g(r, 'Households'),
        bloc: g(r, 'Leading bloc'), leadPct: g(r, 'Leading %'), enc: g(r, 'ENC'), ops: g(r, 'Ops class'),
        l17: g(r, 'Lead 2017'), l19: g(r, 'Lead 2019'), l22: g(r, 'Lead 2022'), l24: g(r, 'Lead 2024'),
        flips: g(r, 'Flips'), status: g(r, 'Status'), margin24: g(r, '2024 margin'), turnout: g(r, 'Turnout 2024 %'),
        added: add, removed: rem, net: add - rem, netPct: el ? Math.round((add - rem) / el * 1000) / 10 : 0,
        catholic: g(r, 'Catholic'), muslim: g(r, 'Muslim'), st: g(r, 'Hindu ST'), obc: g(r, 'Hindu OBC'),
        general: g(r, 'Hindu General'), sc: g(r, 'Hindu SC') };
    });
  }
  function byCols(rows, cols, extra) {
    var g = function (r, k) { var i = cols.indexOf(k); return i < 0 ? '' : r[i]; };
    return rows.map(function (r) { var o = {}; extra.forEach(function (p) { o[p[0]] = g(r, p[1]); }); return o; });
  }

  /* ---------- scope filtering ---------- */
  function acsInScope() {
    var seats = seatObjs();
    if (st.ac) return seats.filter(function (s2) { return String(s2.ac) === String(st.ac); });
    if (st.district) return seats.filter(function (s2) { return s2.district === st.district; });
    return seats;
  }
  function boothsInScope() {
    var acSet = {}; acsInScope().forEach(function (s2) { acSet[String(s2.ac)] = 1; });
    var bs = boothObjs().filter(function (b) { return acSet[String(b.ac)]; });
    if (st.booth) bs = bs.filter(function (b) { return String(b.booth) === String(st.booth); });
    return bs;
  }
  function districts() { var P = pack(); return P ? P.hierarchy.map(function (d) { return d.name; }) : []; }
  function acList() {
    var seats = seatObjs();
    return (st.district ? seats.filter(function (s2) { return s2.district === st.district; }) : seats);
  }
  function boothList() {
    if (!st.ac) return [];
    return boothObjs().filter(function (b) { return String(b.ac) === String(st.ac); });
  }

  /* ---------- publish slices into the feed layer ---------- */
  function publish() {
    if (typeof EMBEDDED_CSV_DATA === 'undefined') return;
    var P = pack(), live = isLive();
    var E = EMBEDDED_CSV_DATA;
    if (!live) {
      ['geo_state_seats','geo_state_demog','geo_state_blocs','geo_state_results','geo_state_split',
       'geo_state_churn','geo_state_gap','geo_local_booths','geo_local_demog','geo_local_blocs',
       'geo_local_history','geo_local_swing','geo_local_anchor','geo_local_churn'].forEach(function (k) { E[k] = []; });
      return;
    }
    var seats = acsInScope(), booths = boothsInScope();
    var acSet = {}; seats.forEach(function (s2) { acSet[String(s2.ac)] = 1; });
    E.geo_state_seats = seats;
    E.geo_state_demog = seats;
    E.geo_state_split = seats;
    E.geo_state_blocs = byCols(P.blocs, P.blocCols, [['ac','AC'],['electors','Electors'],['catholic','Catholic %'],
      ['muslim','Muslim %'],['st','Hindu ST %'],['obc','Hindu OBC %'],['general','Hindu General %'],
      ['sc','Hindu SC %'],['unclassified','Unclassified %']]).filter(function (r) { return acSet[String(r.ac)]; });
    E.geo_state_results = byCols(P.results, P.resultCols, [['ac','AC'],['w2017','2017 Assembly winner'],
      ['w2019','2019 Lok Sabha winner'],['w2022','2022 Assembly winner'],['pct2022','2022 Assembly %'],
      ['margin2022','2022 Assembly margin'],['w2024','2024 Lok Sabha winner']]).filter(function (r) { return acSet[String(r.ac)]; });
    E.geo_state_churn = byCols(P.churn, P.churnCols, [['ac','AC'],['draft','Draft'],['final','Final'],
      ['added','Added'],['removed','Removed'],['net','Net'],['netPct','Net %']]).filter(function (r) { return acSet[String(r.ac)]; });
    E.geo_state_gap = byCols(P.gap, P.gapCols, [['ac','AC'],['electors','Electors'],['aged','Aged 18-19'],
      ['missing','Missing 18-19'],['pct','% of seat']]).filter(function (r) { return acSet[String(r.ac)]; });
    /* attach constituency names + distinct-winner count */
    var nameOf = {}; seatObjs().forEach(function (s2) { nameOf[String(s2.ac)] = s2.name; });
    var distinctOf = {}; seatObjs().forEach(function (s2) { distinctOf[String(s2.ac)] = s2.distinct; });
    ['geo_state_blocs','geo_state_results','geo_state_churn','geo_state_gap'].forEach(function (k) {
      E[k].forEach(function (r) { r.name = nameOf[String(r.ac)] || ''; if (k === 'geo_state_results') r.distinct = distinctOf[String(r.ac)]; });
    });
    E.geo_local_booths = booths; E.geo_local_demog = booths; E.geo_local_blocs = booths;
    E.geo_local_history = booths; E.geo_local_churn = booths;
    E.geo_local_swing = byCols(P.swing, P.swingCols, [['ac','AC'],['booth','Booth'],['station','Polling station'],
      ['electors','Electors'],['bloc','Leading bloc'],['leadPct','Leading %'],['enc','ENC']]).filter(function (r) { return acSet[String(r.ac)]; });
    E.geo_local_anchor = byCols(P.anchor, P.anchorCols, [['ac','AC'],['booth','Booth'],['station','Polling station'],
      ['electors','Electors'],['bloc','Leading bloc'],['leadPct','Leading %']]).filter(function (r) { return acSet[String(r.ac)]; });
    seatBags(seats); boothBags(booths);
    bust();
  }
  /* V2 PASS 50 — card analysis bags, derived arithmetic-only from pack fields.
     Every sentence is a restatement of numbers in the row; nothing is invented. */
  function seatBags(seats) {
    if (typeof EMBEDDED_JSON_DATA === 'undefined') return;
    var bag = {};
    seats.forEach(function (s2, i) {
      var el = num(s2.electors), gap = num(s2.gap), inp = num(s2.inPlayPct), lead = num(s2.leadPct);
      var brief = s2.name + ' has ' + fmt(el) + ' electors across ' + fmt(s2.booths) + ' booths in ' +
        s2.district + ' (' + s2.taluka + ' taluka). The leading community bloc is ' + s2.bloc +
        ' at ' + lead + '% of the roll, and the seat entered 2022 rated "' + s2.status + '".';
      var why = 'BJP polled ' + s2.ac22 + '% here at the 2022 Assembly against ' + s2.ls24 +
        '% at the 2024 Lok Sabha \u2014 a split-ticket gap of ' + gap + ' points. ' +
        fmt(s2.inPlay) + ' electors (' + inp + '% of the seat) sit in booths classified as in play.';
      var watch = 'The seat has had ' + s2.distinct + ' distinct winners across the last four polls; booths here flip ' +
        s2.flips + ' times on average. ' + (inp >= 60 ? 'Persuasion, not turnout, is the lever in this seat.' :
        inp >= 35 ? 'A mixed seat: both persuasion and turnout operations matter.' :
        'A turnout seat: the blocs are settled and mobilisation decides it.');
      bag[String(i)] = { brief: brief, why_it_matters: why, watch_for: watch,
        tags: [s2.name, s2.district, s2.bloc, s2.status] };
    });
    EMBEDDED_JSON_DATA['geo_state_seats_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_state_demog_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_state_split_analysis.json'] = bag;
  }
  function boothBags(booths) {
    if (typeof EMBEDDED_JSON_DATA === 'undefined') return;
    var bag = {};
    booths.forEach(function (b, i) {
      var brief = 'Booth ' + b.booth + ' of AC ' + b.ac + ' \u2014 ' + b.station + ' \u2014 holds ' +
        fmt(b.electors) + ' electors in ' + fmt(b.households) + ' households. Leading bloc: ' + b.bloc +
        ' at ' + b.leadPct + '%. Ops class ' + b.ops + ', status "' + b.status + '".';
      var why = 'The booth led ' + [b.l17, b.l19, b.l22, b.l24].filter(Boolean).join(' \u2192 ') +
        ' across 2017\u20132024 and flipped ' + b.flips + ' time' + (num(b.flips) === 1 ? '' : 's') +
        '. 2024: margin ' + b.margin24 + ' points on ' + b.turnout + '% turnout.';
      var net = b.net;
      var watch = 'SIR revision ' + (net > 0 ? 'added a net ' + fmt(net) : net < 0 ? 'removed a net ' + fmt(-net) : 'left') +
        (net !== 0 ? ' names (' + b.netPct + '% of the booth). ' : ' the roll unchanged. ') +
        'Mean age ' + b.meanAge + '; ' + b.young + '% aged 18\u201325, ' + b.senior + '% aged 60+.';
      bag[String(i)] = { brief: brief, why_it_matters: why, watch_for: watch,
        tags: ['AC ' + b.ac, 'Booth ' + b.booth, b.bloc, b.ops].filter(Boolean) };
    });
    EMBEDDED_JSON_DATA['geo_local_booths_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_local_demog_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_local_blocs_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_local_history_analysis.json'] = bag;
    EMBEDDED_JSON_DATA['geo_local_churn_analysis.json'] = bag;
  }
  /* V2 PASS 44: renderDataBlock memoises the built table by dataSource identity.
     Scope changes keep the same dataSource object, so the cache must be cleared
     explicitly or the feed would keep showing the previous geography. */
  function bust() {
    try {
      if (typeof renderedBlockCache === 'undefined' || typeof FEATURE_DATA === 'undefined') return;
      ['state', 'local'].forEach(function (t) {
        (FEATURE_DATA[t] || []).forEach(function (f) {
          if (f.dataSource) { renderedBlockCache.delete(f.dataSource); if (f.dataSource.__merged) renderedBlockCache.delete(f.dataSource.__merged); }
        });
      });
    } catch (e) {}
  }

  /* ---------- public API ---------- */
  function label(tier) {
    var r = reg(st.state); if (!r) return '';
    if (tier === 'state') return r.name.toUpperCase();
    var bits = [];
    if (st.district) bits.push(st.district);
    if (st.ac) { var s2 = seatObjs().filter(function (x) { return String(x.ac) === String(st.ac); })[0]; if (s2) bits.push(s2.name); }
    if (st.booth) bits.push('Booth ' + st.booth);
    return (bits.length ? bits.join(' \u00b7 ') : r.name).toUpperCase();
  }
  function newsQuery(tier) {
    var r = reg(st.state); if (!r) return '';
    if (tier === 'state') return '"' + r.name + '" government OR assembly OR policy';
    var bits = [];
    if (st.ac) { var s2 = seatObjs().filter(function (x) { return String(x.ac) === String(st.ac); })[0]; if (s2) bits.push('"' + s2.name + '"'); }
    if (st.district) bits.push('"' + st.district + '"');
    if (!bits.length) bits.push('"' + r.name + '"');
    return bits.join(' OR ') + ' ' + r.name;
  }
  function summary() {
    if (!isLive()) return null;
    var seats = acsInScope(), booths = boothsInScope();
    var el = 0, hh = 0, m = 0, f = 0;
    seats.forEach(function (s2) { el += num(s2.electors) || 0; hh += num(s2.households) || 0; m += num(s2.male) || 0; f += num(s2.female) || 0; });
    if (st.booth || st.ac) { el = 0; hh = 0; m = 0; f = 0; booths.forEach(function (b) { el += b.electors || 0; hh += num(b.households) || 0; m += num(b.male) || 0; f += num(b.female) || 0; }); }
    return { electors: el, booths: booths.length, acs: seats.length, households: hh,
      sexRatio: m ? Math.round(f / m * 1000) : null };
  }
  function set(patch, silent) {
    /* V2PASS45: clear dependent levels FIRST, then apply the patch, so a combined
       patch such as {district, ac} keeps the constituency it explicitly sets. */
    if (patch.state !== undefined) { st.district = ''; st.ac = ''; st.booth = ''; }
    else if (patch.district !== undefined) { st.ac = ''; st.booth = ''; }
    else if (patch.ac !== undefined) { st.booth = ''; }
    Object.keys(patch).forEach(function (k) { st[k] = patch[k]; });
    try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {}
    publish(); paint(true);
    if (!silent) {
      try {
        var d = document.getElementById('detail'); if (d) { d.classList.remove('niy-fade'); void d.offsetWidth; d.classList.add('niy-fade'); }
        if (typeof renderAll === 'function') renderAll();
      } catch (e) {}
    }
  }

  /* ---------- scope bar UI ---------- */
  function chev() { return '<svg class="cv" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></svg>'; }
  function dropdown(host, opts) {
    /* opts: {key,label,value,items:[{v,nm,meta,lock}],placeholder,disabled,onPick} */
    var wrap = document.createElement('div'); wrap.className = 'sc-sel'; wrap.dataset.k = opts.key;
    var cur = opts.items.filter(function (i) { return String(i.v) === String(opts.value); })[0];
    var btn = document.createElement('button'); btn.type = 'button';
    btn.className = 'sc-btn' + (cur && cur.lock ? ' locked' : '');
    btn.disabled = !!opts.disabled;
    btn.innerHTML = '<span class="k">' + opts.label + '</span><span class="v">' +
      (cur ? cur.nm : (opts.placeholder || 'All')) + '</span>' + chev();
    var pop = document.createElement('div'); pop.className = 'sc-pop';
    var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Search ' + opts.label.toLowerCase() + '\u2026';
    var list = document.createElement('div'); list.className = 'sc-list';
    pop.appendChild(inp); pop.appendChild(list);
    var cursor = 0, shown = [];
    function draw(q) {
      q = (q || '').trim().toLowerCase();
      shown = opts.items.filter(function (i) { return !q || String(i.nm).toLowerCase().indexOf(q) >= 0; });
      if (!shown.length) { list.innerHTML = '<div class="sc-empty">No match</div>'; return; }
      /* windowed: only the first 120 matches are in the DOM at once */
      var slice = shown.slice(0, 120);
      list.innerHTML = slice.map(function (i, n) {
        return '<button type="button" class="sc-opt' + (i.lock ? ' lock' : '') +
          (String(i.v) === String(opts.value) ? ' on' : '') + (n === cursor ? ' cursor' : '') + '" data-v="' + String(i.v).replace(/"/g, '&quot;') + '">' +
          (i.dot ? '<span class="sc-dot"></span>' : '') +
          '<span class="nm">' + i.nm + '</span>' +
          (i.meta ? '<span class="meta">' + i.meta + '</span>' : '') + '</button>';
      }).join('') + (shown.length > 120 ? '<div class="sc-empty">' + (shown.length - 120) + ' more \u2014 keep typing</div>' : '');
    }
    draw('');
    inp.addEventListener('input', function () { cursor = 0; draw(inp.value); });
    inp.addEventListener('keydown', function (e) {
      var items = list.querySelectorAll('.sc-opt');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); cursor = Math.max(0, Math.min(items.length - 1, cursor + (e.key === 'ArrowDown' ? 1 : -1)));
        items.forEach(function (x, n) { x.classList.toggle('cursor', n === cursor); });
        if (items[cursor]) items[cursor].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); if (items[cursor]) items[cursor].click(); }
      else if (e.key === 'Escape') { wrap.classList.remove('open'); btn.focus(); }
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.sc-opt'); if (!b) return;
      wrap.classList.remove('open'); opts.onPick(b.dataset.v);
    });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = wrap.classList.contains('open');
      document.querySelectorAll('.sc-sel.open').forEach(function (x) { x.classList.remove('open'); });
      if (!wasOpen) { wrap.classList.add('open'); cursor = 0; inp.value = ''; draw(''); setTimeout(function () { inp.focus(); }, 10); }
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    wrap.appendChild(btn); wrap.appendChild(pop); host.appendChild(wrap);
  }

  /* V2 PASS 46: paint() runs on an interval so the bar survives re-renders. It must be
     idempotent \u2014 rebuilding while a dropdown is open would destroy the user's typing. */
  var lastSig = '';
  function paint(force) {
    var tier = (typeof activeTier !== 'undefined') ? activeTier : '';
    var det = document.getElementById('detail'); if (!det) return;
    var bar = document.getElementById('niyScopeBar');
    if (tier !== 'state' && tier !== 'local') { if (bar) bar.remove(); lastSig = ''; return; }
    if (document.querySelector('.sc-sel.open')) return;
    var sig = tier + '|' + st.state + '|' + st.district + '|' + st.ac + '|' + st.booth + '|' + (isLive() ? 1 : 0);
    if (!force && bar && bar.isConnected && sig === lastSig) return;
    lastSig = sig;
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'niyScopeBar';
      var head = det.querySelector('.toolbar') || det.querySelector('.detail-head');
      if (head && head.parentElement) head.parentElement.insertBefore(bar, head.nextSibling);
      else det.insertBefore(bar, det.firstChild);
    }
    bar.innerHTML = '<span class="sc-lbl">Scope</span>';
    var r = reg(st.state), live = isLive(), P = pack();

    dropdown(bar, { key: 'state', label: 'State / UT', value: st.state,
      items: GEO.registry.map(function (x) { return { v: x.code, nm: x.name, dot: true, lock: x.status !== 'live',
        meta: x.status === 'live' ? 'live' : 'locked' }; }),
      onPick: function (v) { set({ state: v }); } });

    dropdown(bar, { key: 'district', label: 'District', value: st.district, placeholder: 'All districts',
      disabled: !live,
      items: [{ v: '', nm: 'All districts' }].concat(districts().map(function (d) {
        var n = seatObjs().filter(function (s2) { return s2.district === d; }).length;
        return { v: d, nm: d, meta: n + ' AC' }; })),
      onPick: function (v) { set({ district: v }); } });

    dropdown(bar, { key: 'ac', label: 'Constituency', value: st.ac, placeholder: 'All constituencies',
      disabled: !live,
      items: [{ v: '', nm: 'All constituencies' }].concat(acList().map(function (s2) {
        return { v: s2.ac, nm: s2.ac + '. ' + s2.name, meta: fmt(s2.electors) }; })),
      onPick: function (v) { set({ ac: v }); } });

    dropdown(bar, { key: 'booth', label: 'Booth', value: st.booth, placeholder: st.ac ? 'All booths' : 'Pick a constituency',
      disabled: !live || !st.ac,
      items: [{ v: '', nm: 'All booths' }].concat(boothList().map(function (b) {
        return { v: b.booth, nm: b.booth + '. ' + String(b.station).slice(0, 44), meta: fmt(b.electors) }; })),
      onPick: function (v) { set({ booth: v }); } });

    var stats = document.createElement('div'); stats.className = 'sc-stats';
    if (live) {
      var s3 = summary();
      stats.innerHTML =
        '<div class="sc-stat"><b>' + fmt(s3.electors) + '</b><span>Electors</span></div>' +
        '<div class="sc-stat"><b>' + fmt(s3.booths) + '</b><span>Booths</span></div>' +
        '<div class="sc-stat"><b>' + fmt(s3.acs) + '</b><span>' + (s3.acs === 1 ? 'Constituency' : 'Constituencies') + '</span></div>' +
        '<span class="sc-badge live">Live data</span>';
    } else {
      stats.innerHTML = '<span class="sc-badge lock">Data not yet ingested</span>';
    }
    bar.appendChild(stats);

    /* locked-state message replaces the feed, never a broken table */
    var feed = det.querySelector('.niy-col-feed');
    var old = det.querySelector('.niy-scope-empty');
    if (!live) {
      if (!old && feed) {
        var box = document.createElement('div'); box.className = 'niy-scope-empty';
        box.innerHTML = '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/>' +
          '<path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/></svg>' +
          '<h4>' + (r ? r.name : 'This state') + ' is not ingested yet</h4>' +
          '<p>The geography is in place \u2014 districts, constituencies and booths will populate here as soon as the ' +
          (r ? r.name : 'state') + ' roll is ingested. Goa is live today and shows the full drill-down.</p>' +
          '<div class="cta"><button type="button" class="pri" data-go="GA">Switch to Goa</button></div>';
        box.querySelector('[data-go]').addEventListener('click', function () { set({ state: 'GA' }); });
        feed.innerHTML = ''; feed.appendChild(box);
      }
    } else if (old) { old.remove(); }
  }

  window.NiyScope = { get: function () { return JSON.parse(JSON.stringify(st)); }, set: set, label: label,
    newsQuery: newsQuery, summary: summary, isLive: isLive, publish: publish, paint: paint,
    seats: seatObjs, booths: boothObjs, pack: pack, registry: function () { return GEO.registry; } };

  document.addEventListener('click', function () { document.querySelectorAll('.sc-sel.open').forEach(function (x) { x.classList.remove('open'); }); });
  function boot() { publish(); paint(true); try { if (typeof renderAll === 'function' && typeof activeTier !== 'undefined' && (activeTier === 'state' || activeTier === 'local')) renderAll(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(boot, 600);
  setInterval(paint, 1200);
})();