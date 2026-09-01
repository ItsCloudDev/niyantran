/* V2 PASS 80 governance layer — live wires · structural context · source libraries · charts */(function () {
  'use strict';
  function kit() { return window.__niySecKit || null; }
  function viz() { return window.__niyViz || null; }
  function G() { return window.__niyGoaViz || null; }
  function rows(name) {
    try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[name]) return EMBEDDED_CSV_DATA[name]; } catch (e) {}
    return [];
  }
  function stateName() { return 'Goa'; }
  function scopeAC() {
    var acs = {};
    rows('geo_local_booths').forEach(function (r) { acs[r.ac] = 1; });
    var k = Object.keys(acs);
    if (k.length !== 1) return null;
    var nm = null;
    rows('geo_state_seats').forEach(function (s) { if (String(s.ac) === k[0]) nm = s.name; });
    return nm;
  }

  /* ============ the registry: one declaration per function ============ */
  var REG = [
    /* ---- STATE · Legislature ---- */
    { tier: 'state', label: 'MLA Directory', bucket: 'State of Play', id: 'niyGvMLA',
      title: 'Who Represents Each Constituency', special: 'mla',
      wire: 'MLA OR legislator OR "legislative assembly"',
      ctx: 'The 40 members of the 8th Goa Legislative Assembly, elected February 2022 \u2014 from declared constituency results.',
      links: [['ECI \u2014 results & candidate data', 'https://results.eci.gov.in/'],
              ['MyNeta \u2014 affidavits & assets', 'https://myneta.info/'],
              ['Goa Legislative Assembly', 'https://goavidhansabha.gov.in/']] },
    { tier: 'state', label: 'Assembly Proceedings', bucket: 'Legislature', id: 'niyGvAP',
      title: 'The House in Session',
      wire: '"legislative assembly" (session OR bill OR question OR adjourned)',
      ctx: 'Goa\u2019s unicameral assembly: 40 seats, five-year term, sittings notified by the Speaker. Bills, questions and committee reports are tabled on the assembly portal.',
      links: [['Assembly \u2014 bills & business', 'https://goavidhansabha.gov.in/'],
              ['PRS Legislative Research \u2014 states', 'https://prsindia.org/']] },
    { tier: 'state', label: 'Governor & Assent', bucket: 'Legislature', id: 'niyGvGA',
      title: 'Assent, Reservation and Friction',
      wire: 'Governor (assent OR bill OR ordinance OR "returned the bill")',
      ctx: 'Under Article 200 a Governor may assent, withhold assent, return a bill, or reserve it for the President. Reserved bills go to the Union under Article 201. No open feed publishes bills pending assent \u2014 the position has to be read from Raj Bhavan communiqu\u00e9s and assembly bill lists, so this desk tracks reported movement rather than claiming a live register.',
      links: [['Raj Bhavan Goa', 'https://rajbhavangoa.gov.in/'],
              ['Constitution, Articles 200\u2013201', 'https://legislative.gov.in/constitution-of-india/']] },
    /* ---- STATE · Government Operations ---- */
    { tier: 'state', label: 'State Cadre Transfers', bucket: 'Government Operations', id: 'niyGvCT',
      title: 'Transfers & Postings',
      wire: '(IAS OR IPS OR "civil service") (transfer OR posting OR appointed OR reshuffle)',
      ctx: 'Goa is served by the AGMUT cadre; officer postings are notified by the Department of Personnel and gazetted. Establishment lists are published by DoPT.',
      links: [['DoPT \u2014 civil lists', 'https://dopt.gov.in/'],
              ['Goa Department of Personnel', 'https://www.goa.gov.in/department/personnel/']] },
    { tier: 'state', label: 'State Tenders', bucket: 'Government Operations', id: 'niyGvST',
      title: 'Procurement Watch',
      wire: '(tender OR procurement OR "work order" OR contract) government',
      ctx: 'State tenders are published on the Goa e-procurement portal and mirrored on the Central Public Procurement Portal. Neither exposes an open machine feed, so this desk tracks reported awards and disputes; use the portals for the authoritative notices.',
      links: [['Goa e-Procurement', 'https://eprocure.goa.gov.in/'],
              ['CPP Portal (Government of India)', 'https://eprocure.gov.in/eprocure/app'],
              ['GeM \u2014 Government e-Marketplace', 'https://gem.gov.in/']] },
    { tier: 'state', label: 'Cabinet Decisions', bucket: 'Government Operations', id: 'niyGvCD',
      title: 'What the Cabinet Cleared',
      wire: 'cabinet (approved OR decision OR cleared OR nod)',
      ctx: 'State cabinet decisions are announced at post-cabinet briefings and issued as departmental orders in the Official Gazette.',
      links: [['Goa Official Gazette', 'https://goaprintingpress.gov.in/'],
              ['Goa \u2014 government orders & circulars', 'https://www.goa.gov.in/']] },
    /* ---- STATE · Public Finance ---- */
    { tier: 'state', label: 'State Finances', bucket: 'Public Finance', id: 'niyGvSF',
      title: 'Budget, Borrowing and GSDP',
      wire: '(budget OR GSDP OR "fiscal deficit" OR borrowing OR "state development loan")',
      ctx: 'The authoritative series are the state budget documents, the RBI\u2019s annual Study of State Finances and its SDL auction results. Figures are published, not modelled \u2014 open the sources below for the numbers.',
      links: [['RBI \u2014 State Finances: A Study of Budgets', 'https://rbi.org.in/Scripts/AnnualPublications.aspx?head=State+Finances+%3A+A+Study+of+Budgets'],
              ['RBI \u2014 SDL auction results', 'https://rbi.org.in/Scripts/BS_ViewSDLAuction.aspx'],
              ['Goa Budget documents', 'https://www.goa.gov.in/department/finance/']] },
    { tier: 'state', label: 'CAG Audit Tracker', bucket: 'Public Finance', id: 'niyGvCAG',
      title: 'What the Auditor Found',
      wire: '(CAG OR "Comptroller and Auditor General") (report OR audit OR irregularities)',
      ctx: 'CAG audit reports on the state are tabled in the assembly and published as PDFs; the Public Accounts Committee then examines them. Reports carry paragraph-level findings by department. The CAG publishes no machine-readable feed \u2014 the report library below is the authoritative record, and this desk tracks what is reported about it.',
      links: [['CAG \u2014 state audit reports', 'https://cag.gov.in/en/audit-report'],
              ['CAG \u2014 Goa', 'https://cag.gov.in/ag/goa/en']] },
    { tier: 'state', label: 'Centre\u2013State Fund Flows', bucket: 'Public Finance', id: 'niyGvFF',
      title: 'Money From the Union',
      wire: '("central assistance" OR "centrally sponsored" OR "finance commission" OR devolution OR grant)',
      ctx: 'Transfers reach the state as tax devolution (Finance Commission share), centrally sponsored scheme releases, and grants-in-aid. Scheme-wise releases are published on the PFMS and ministry dashboards as screens and PDFs, not as an open feed \u2014 open the sources below for the figures; this desk tracks what is reported.',
      links: [['PFMS \u2014 public financial management', 'https://pfms.nic.in/'],
              ['Finance Commission of India', 'https://fincomindia.nic.in/'],
              ['Union Budget \u2014 transfers to states', 'https://www.indiabudget.gov.in/']] },
    /*V2PASS87: these two rendered as AI-analyst placeholders \u2014 give them the wire pattern*/
    { tier: 'state', label: 'State Governance Brief', bucket: 'Legislature', id: 'niyGvSGB',
      title: 'The Administrative Week',
      wire: '(cabinet OR secretariat OR "chief minister" OR department) (order OR scheme OR decision OR notification)',
      ctx: 'A running brief on how the state is being administered: cabinet decisions, departmental orders, scheme rollouts and personnel moves. Orders are issued in the Official Gazette and on department pages; this desk tracks the reporting around them and links the primary record.',
      links: [['Goa Official Gazette', 'https://goaprintingpress.gov.in/'],
              ['Goa \u2014 departments & orders', 'https://www.goa.gov.in/'],
              ['Chief Minister\u2019s Office, Goa', 'https://www.goa.gov.in/chief-minister/']] },
    { tier: 'state', label: 'District Media Monitor', raw: 'District Media Monitor (Vernacular District Editions)', bucket: 'Districts', id: 'niyGvDMM',
      title: 'What the District Editions Are Running',
      wire: '(district OR taluka OR village) (protest OR land OR water OR road OR school OR hospital OR mining)',
      ctx: 'District editions and local portals carry stories that reach the capital late or never. This monitor runs an English-language district query over the open news index; vernacular district editions are not available through any open feed, so treat this as a partial view of the local press, not a complete one.',
      links: [['PIB Goa', 'https://pib.gov.in/'],
              ['Goa Directorate of Information & Publicity', 'https://dip.goa.gov.in/']] },
    /* ---- LOCAL \u00b7 Municipality ---- */
    { tier: 'local', label: 'Municipal Tenders', bucket: 'Municipality', id: 'niyGvMT',
      title: 'Civic Works & Contracts', localScope: 1,
      wire: '(municipal OR corporation OR council) (tender OR contract OR works OR "work order")',
      ctx: 'Corporation and council works are tendered through the state e-procurement portal; ward-level works also appear in council meeting minutes.',
      links: [['Goa e-Procurement', 'https://eprocure.goa.gov.in/'],
              ['Directorate of Municipal Administration', 'https://dma.goa.gov.in/']] },
    { tier: 'local', label: 'Municipal Finance', bucket: 'Municipality', id: 'niyGvMF',
      title: 'Own Revenue & Solvency', localScope: 1,
      wire: '(municipal OR corporation OR council) (budget OR "property tax" OR revenue OR grant)',
      ctx: 'Urban local bodies raise property tax, trade licences and user charges, topped up by Finance Commission grants routed through the state. Audited accounts are filed with the Directorate of Municipal Administration.',
      links: [['Directorate of Municipal Administration', 'https://dma.goa.gov.in/'],
              ['15th Finance Commission \u2014 ULB grants', 'https://fincomindia.nic.in/']] },
    /* ---- LOCAL · Panchayats ---- */
    { tier: 'local', label: 'MGNREGA Works', bucket: 'Panchayats', id: 'niyGvNR',
      title: 'Wage Employment on the Ground', localScope: 1,
      wire: '(MGNREGA OR NREGA OR "job card" OR "muster roll")',
      ctx: 'MGNREGA guarantees 100 days of wage employment per rural household. Muster rolls, works and payment status are published per panchayat on the national MIS \u2014 the authoritative record for any village.',
      links: [['MGNREGA public reports (nrega.nic.in)', 'https://nrega.nic.in/netnrega/home.aspx'],
              ['Goa Rural Development Agency', 'https://rdagoa.gov.in/']] },
    { tier: 'local', label: 'GPDP Fund Tracker', bucket: 'Panchayats', id: 'niyGvGP',
      title: 'Panchayat Plans & Funds', localScope: 1,
      wire: '(panchayat OR "gram sabha" OR GPDP) (fund OR plan OR works OR grant)',
      ctx: 'Every gram panchayat must adopt a Gram Panchayat Development Plan; Finance Commission grants are released against it and uploaded to eGramSwaraj.',
      links: [['eGramSwaraj \u2014 GPDP & accounts', 'https://egramswaraj.gov.in/'],
              ['Directorate of Panchayats, Goa', 'https://panchayats.goa.gov.in/']] },
    /* ---- LOCAL · Representatives ---- */
    { tier: 'local', label: 'Councillor & Pradhan Cards', bucket: 'Representatives', id: 'niyGvCP',
      title: 'Who Holds Local Office', localScope: 1,
      wire: '(sarpanch OR councillor OR "panch member" OR mayor OR chairperson) (elected OR resigned OR "no-confidence")',
      ctx: 'Ward, panchayat and zilla results are declared by the State Election Commission; sarpanch and chairperson elections follow inside each body and turn over between polls, most often on no-confidence motions. The Commission publishes results as notices rather than as a feed, so this desk tracks reported changes of office and links the record.',
      links: [['State Election Commission, Goa', 'https://secgoa.gov.in/'],
              ['Directorate of Panchayats', 'https://panchayats.goa.gov.in/']] },
    { tier: 'local', label: 'Local Officer Directory', bucket: 'Representatives', id: 'niyGvOD',
      title: 'The Administration Here', localScope: 1,
      wire: '(collector OR "block development officer" OR mamlatdar OR "municipal commissioner") (posted OR transferred OR order)',
      ctx: 'Field administration runs Collector \u2192 Deputy Collector / SDM \u2192 Mamlatdar (taluka) for revenue, and BDO \u2192 panchayat secretary for rural development. Contact directories are published by each collectorate.',
      links: [['North Goa Collectorate', 'https://northgoa.gov.in/'],
              ['South Goa Collectorate', 'https://southgoa.gov.in/'],
              ['Goa government directory', 'https://www.goa.gov.in/']] }
  ];

  /* register with the curator */
  var keep = { state: {}, local: {} }, inject = { state: [], local: [] };
  REG.forEach(function (r, i) {
    /*V2PASS91: r.raw is the catalog's own name \u2014 keying on the display name duplicated the feature*/
    var nm = r.raw || r.label;
    keep[r.tier][nm] = r.bucket;
    inject[r.tier].push({ rank: 200 + i, bucket: r.bucket, feature: nm,
      use: r.ctx.slice(0, 190), money: 'Analysts, journalists, citizens.', unique: 'Yes',
      archetype: 'live', columns: [], dataSource: null });
  });
  window.__niyGovKeep = keep;
  window.__niyGovInject = inject;
  /* bucket order for the new groups */
  try {
    if (typeof BUCKET_ORDER !== 'undefined' && BUCKET_ORDER) {
      ['Legislature', 'Government Operations', 'Public Finance', 'Municipality', 'Panchayats', 'Representatives']
        .forEach(function (b) { if (BUCKET_ORDER.indexOf(b) < 0) BUCKET_ORDER.push(b); });
    }
  } catch (e) {}

  /* ============ builders ============ */
  function libraryBlock(K, links) {
    var w = K.el('div');
    links.forEach(function (l) {
      var d = K.el('div', 'nls-note');
      var a = K.el('a', null, l[0]);
      a.href = l[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
      d.appendChild(a); w.appendChild(d);
    });
    return w;
  }
  function wireQuery(r) {
    var place = r.localScope ? (scopeAC() || stateName()) : stateName();
    return place + ' ' + stateName() + ' ' + r.wire;
  }
  function buildGeneric(r) {
    return function (detail, sig) {
      var K = kit(), g = G(); if (!K || !g) return;
      var place = r.localScope ? (scopeAC() || stateName()) : stateName();
      var s1 = K.sec(r.id, r.title + ' \u2014 ' + place);
      if (sig) s1.wrap.setAttribute('data-sig', sig);
      s1.body.appendChild(K.el('div', 'nls-note', r.ctx));
      /* MLA directory table */
      if (r.special === 'mla') {
        /*V2PASS95: one authority for the declared house \u2014 member, party and margin travel together*/
        var DECLARED = window.__niyDeclared || {};
        var D = (window.__niyGoaDossiers || []).map(function (x) {
          var o = DECLARED[x.ac];
          if (!o) return x;
          return { ac: x.ac, name: x.name,
            winner: o.member || x.winner,
            party: o.party,
            margin: o.margin != null ? o.margin : x.margin,
            note: o.note, m20: x.party, m20winner: x.winner };
        });
        var seats = {}; rows('geo_state_seats').forEach(function (s) { seats[s.ac] = s; });
        s1.body.appendChild(K.el('div', 'nls-note',
          'Built from declared constituency results. Margins are Form 20 booth totals except where the declaration differs \u2014 those rows are marked \u2020 and carry the declared figure.'));
        (function () { /*V2PASS95 say what differs, in the panel, not only in a tooltip*/
          var ns = [];
          Object.keys(DECLARED).forEach(function (k) { if (DECLARED[k].note) ns.push(DECLARED[k].note); });
          if (ns.length) s1.body.appendChild(K.el('div', 'nls-note', '\u2020 ' + ns.join(' ')));
        })();
        if (D.length) {
          var tb = K.el('table'), thead = K.el('thead'), trh = K.el('tr');
          ['AC', 'Constituency', 'Member', 'Party', 'Won by %', 'Electors', 'Status'].forEach(function (c) { trh.appendChild(K.el('th', null, c)); });
          thead.appendChild(trh); tb.appendChild(thead);
          var tbody = K.el('tbody');
          D.slice().sort(function (a, b) { return a.ac - b.ac; }).forEach(function (x) {
            var s = seats[x.ac] || {}, tr = K.el('tr');
            tr.appendChild(K.el('td', 'nls-num', (x.ac < 10 ? '0' : '') + x.ac));
            tr.appendChild(K.el('td', null, x.name));
            tr.appendChild(K.el('td', null, x.winner || '\u2014'));
            var p = K.el('td', null, (x.party || '\u2014') + (x.note ? ' \u2020' : ''));
            if (x.party) { p.style.color = g.pc(x.party); p.style.fontWeight = '600'; }
            if (x.note) p.title = x.note;
            tr.appendChild(p);
            tr.appendChild(K.el('td', 'nls-num', x.margin != null ? x.margin.toFixed(1) : '\u2014'));
            tr.appendChild(K.el('td', 'nls-num', s.electors ? g.IN(s.electors) : '\u2014'));
            tr.appendChild(K.el('td', null, s.status || ''));
            tbody.appendChild(tr);
          });
          tb.appendChild(tbody);
          s1.body.appendChild(tb);
        }
      }
      /*V2PASS99: the government's own releases lead; press coverage follows*/
      if (window.__niyHasGov && window.__niyHasGov(r.label)) {
        var govHost = K.el('div');
        s1.body.appendChild(K.el('div', 'nvz-title', 'Government releases \u2014 Goa'));
        s1.body.appendChild(govHost);
        window.__niyGovReleases(r.label, govHost, K).then(function (n) {
          if (n) {
            s1.wrap.setAttribute('data-gov-rows', String(n));
            try { var V1 = window.__niyViz; if (V1) V1.unmountViz(['niyViz_' + r.id]); } catch (e1) {}
          }
        });
      }
      /* live wire */
      var wireHost = K.el('div');
      s1.body.appendChild(K.el('div', 'nvz-title', 'Press coverage'));
      s1.body.appendChild(wireHost);
      var q = wireQuery(r);
      var url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en';
      K.jget('gov:' + r.id + ':' + q, '/api/rss?url=' + encodeURIComponent(url), 20 * 60000, true)
        .then(function (t) {
          var doc = new DOMParser().parseFromString(t, 'text/xml');
          var items = [].slice.call(doc.querySelectorAll('item')).slice(0, 14).map(function (it) {
            function gg(k) { var e = it.querySelector(k); return e ? e.textContent.trim() : ''; }
            var d = new Date(gg('pubDate'));
            return { t: isNaN(d) ? null : d, title: gg('title'), url: gg('link'), src: gg('source') || 'Google News', cc: '' };
          }).filter(function (x) { return x.title; });
          if (!items.length) throw new Error('empty');
          wireHost.innerHTML = ''; wireHost.appendChild(K.newsTable(items));
          s1.status.textContent = 'LIVE \u00b7 Google News \u00b7 ' + place;
          /*V2PASS90: the charts were built before this resolved \u2014 drop them so the tick redraws with data*/
          try { var V0 = window.__niyViz; if (V0) V0.unmountViz(['niyViz_' + r.id]); } catch (e0) {}
        })
        .catch(function () {
          wireHost.innerHTML = '';
          wireHost.appendChild(K.el('div', 'nls-note', 'The wire arrives through the backend (/api/rss). Not reachable right now \u2014 it will retry automatically.'));
          s1.status.textContent = 'offline \u00b7 sources below';
        });
      /* source library */
      if (r.links && r.links.length) {
        s1.body.appendChild(K.el('div', 'nvz-title', 'Authoritative sources'));
        s1.body.appendChild(libraryBlock(K, r.links));
      }
      K.host(detail).appendChild(s1.wrap);
    };
  }
  function buildViz(r) {
    return function () {
      var V = viz(), g = G(); if (!V || !g) return;
      V.mountViz('niyViz_' + r.id, function (block, K) {
        if (r.special === 'mla') {
          var DECL = { 21: 'BJP' }; /*V2PASS81*/
          var D = window.__niyGoaDossiers || [];
          var byP = {};
          D.forEach(function (x) { var p = DECL[x.ac] || x.party; if (p) byP[p] = (byP[p] || 0) + 1; });
          var items = Object.keys(byP).sort(function (a, b) { return byP[b] - byP[a]; })
            .map(function (p) { return { l: p, v: byP[p], c: g.pc(p) }; });
          block.appendChild(K.el('div', 'nvz-title', 'Assembly Strength \u2014 Members by Party'));
          block.appendChild(K.el('div', 'nvz-sub', '40 seats \u00b7 declared 2022 result (Ponda counted to BJP \u2014 postal ballots)'));
          if (items.length) block.appendChild(g.cbars(items));
          var margins = D.map(function (x) { return x.margin; }).filter(function (m) { return m != null; });
          var bins = [['under 5%', 0], ['5\u201312%', 0], ['12\u201325%', 0], ['25%+', 0]];
          margins.forEach(function (m) { bins[m < 5 ? 0 : m < 12 ? 1 : m < 25 ? 2 : 3][1]++; });
          block.appendChild(K.el('div', 'nvz-title', 'How Safely They Won'));
          block.appendChild(g.cbars([
            { l: bins[0][0], v: bins[0][1], c: '#A93B2B' }, { l: bins[1][0], v: bins[1][1], c: '#D98A3C' },
            { l: bins[2][0], v: bins[2][1], c: '#C9A98F' }, { l: bins[3][0], v: bins[3][1], c: '#7FA0A8' }
          ]));
        }
        /*V2PASS86 per-function analytics, never a shared source-bar*/
        if (r.special !== 'mla') window.__niyWireViz(r.id, r.label)(block);
      });
    };
  }

  /* ============ mount loop ============ */
  var MAP = {};
  REG.forEach(function (r) {
    MAP[r.tier + '|' + r.label] = { b: buildGeneric(r), v: buildViz(r), vid: 'niyViz_' + r.id, id: r.id, local: r.localScope };
  });
  var ALL_VIZ = REG.map(function (r) { return 'niyViz_' + r.id; });
  function activeLabel() {
    var fi = document.querySelector('#sidebarList .feat-item.active');
    if (!fi) return '';
    return ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
  }
  function sigLocal() {
    var d = rows('geo_local_booths');
    return d.length ? (d.length + '|' + d[0].ac) : '0';
  }
  function unmount(ids) { var V = viz(); if (V) V.unmountViz(ids); }
  function tick() {
    try {
      var a = (window.niyActive ? window.niyActive() : null) || {};
      if (a.tier !== 'state' && a.tier !== 'local') { unmount(ALL_VIZ); return; }
      var e = MAP[a.tier + '|' + activeLabel()];
      if (!e) { unmount(ALL_VIZ); return; }
      var d = document.getElementById('detail'); if (!d) return;
      var sig = e.local ? sigLocal() : '';
      var node = document.getElementById(e.id);
      if (node && sig && node.getAttribute('data-sig') !== sig) {
        node.parentNode.removeChild(node);
        var vz = document.getElementById(e.vid);
        if (vz && vz.parentNode) vz.parentNode.removeChild(vz);
        node = null;
      }
      if (!node) e.b(d, sig);
      unmount(ALL_VIZ.filter(function (id) { return id !== e.vid; }));
      e.v();
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