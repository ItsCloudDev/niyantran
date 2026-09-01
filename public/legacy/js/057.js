/* V2PASS86 wire analytics — cadence + domain, never "coverage by source" */(function () {
  'use strict';
  /* Goa local-body composition (public record) — the civic functions' domain chart */
  var BODIES = [
    { l: 'Gram panchayats', v: 191, c: '#7FA0A8' },
    { l: 'Municipal councils', v: 13, c: '#D98A3C' },
    { l: 'Zilla panchayats', v: 2, c: '#35657A' },
    { l: 'Municipal corporation', v: 1, c: '#A93B2B' }
  ];
  /*V2PASS90: a structural chart only where the structure genuinely differs \u2014 no shared filler*/
  var DOMAIN = {
    'Municipal Watch': { title: 'Urban Local Bodies in Goa', sub: 'the bodies this desk covers \u00b7 public record',
      items: BODIES.filter(function (b) { return /council|corporation/i.test(b.l); }) },
    'Panchayat Watch': { title: 'Rural Local Bodies in Goa', sub: 'the bodies this desk covers \u00b7 public record',
      items: BODIES.filter(function (b) { return /panchayat/i.test(b.l); }) },
    'Councillor & Pradhan Cards': { title: 'Bodies That Elect Representatives', sub: 'every tier of local office in Goa \u00b7 public record', items: BODIES },
    'Local Officer Directory': { title: 'Administrative Units', sub: 'Goa revenue administration \u00b7 12 talukas across 2 districts (Goa government directory)',
      items: [{ l: 'Talukas', v: 12, c: '#7FA0A8' }, { l: 'Districts', v: 2, c: '#35657A' }] }
  };
  /* what each desk is actually watching for \u2014 counted in that desk's own headlines */
  var TERMS = {
    'State Cadre Transfers': ['transfer', 'posting', 'promotion', 'IAS', 'IPS', 'secretary', 'collector', 'police', 'charge'],
    'State Tenders': ['tender', 'contract', 'award', 'work order', 'bid', 'e-procurement', 'GeM', 'cancelled', 'crore'],
    'Cabinet Decisions': ['approved', 'policy', 'scheme', 'amendment', 'ordinance', 'land', 'recruitment', 'proposal'],
    'State Finances': ['budget', 'deficit', 'borrowing', 'GSDP', 'revenue', 'debt', 'grant', 'tax', 'crore'],
    'CAG Audit Tracker': ['audit', 'irregular', 'loss', 'PAC', 'report', 'expenditure', 'mining', 'contract'],
    'Centre\u2013State Fund Flows': ['devolution', 'grant', 'release', 'scheme', 'finance commission', 'centre', 'crore', 'pending'],
    'Assembly Proceedings': ['bill', 'question', 'session', 'adjourn', 'committee', 'speaker', 'motion', 'opposition', 'walkout'],
    'Governor & Assent': ['assent', 'bill', 'ordinance', 'returned', 'reserved', 'Raj Bhavan', 'governor', 'president'],
    'State Governance Brief': ['order', 'department', 'scheme', 'cabinet', 'notification', 'secretariat', 'chief minister', 'recruitment'],
    'District Media Monitor': ['protest', 'land', 'water', 'road', 'school', 'hospital', 'mining', 'garbage', 'power'],
    'Municipal Watch': ['ward', 'council', 'corporation', 'garbage', 'licence', 'sanitation', 'encroach', 'meeting'],
    'Municipal Tenders': ['tender', 'contract', 'works', 'road', 'drain', 'award', 'crore', 'delay'],
    'Municipal Finance': ['budget', 'property tax', 'revenue', 'grant', 'audit', 'dues', 'salary', 'deficit'],
    'Panchayat Watch': ['sarpanch', 'gram sabha', 'panchayat', 'resolution', 'no-confidence', 'meeting', 'complaint'],
    'MGNREGA Works': ['MGNREGA', 'NREGA', 'job card', 'wages', 'muster', 'works', 'payment', 'delay'],
    'GPDP Fund Tracker': ['GPDP', 'plan', 'grant', 'funds', 'finance commission', 'works', 'audit', 'unspent'],
    'Councillor & Pradhan Cards': ['elected', 'sarpanch', 'councillor', 'mayor', 'chairperson', 'no-confidence', 'resign', 'poll'],
    'Local Officer Directory': ['collector', 'mamlatdar', 'BDO', 'transferred', 'posted', 'order', 'charge', 'SDM']
  };
  var TCOL = ['#35657A', '#7FA0A8', '#D98A3C', '#A93B2B', '#8B6BA8', '#C9A98F', '#4E7C59', '#C4632F', '#6E7B8B'];
  function headlines(sec) {
    if (!sec) return [];
    return [].slice.call(sec.querySelectorAll('tbody tr')).map(function (tr) {
      return (tr.textContent || '').replace(/\s+/g, ' ');
    });
  }
  function subjects(sec, label) {
    var terms = TERMS[label]; if (!terms) return null;
    var hl = headlines(sec); if (!hl.length) return null;
    var out = [];
    terms.forEach(function (t, i) {
      var n = 0, re = new RegExp(t.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'i');
      hl.forEach(function (line) { if (re.test(line)) n++; });
      if (n) out.push({ l: t, v: n, c: TCOL[i % TCOL.length] });
    });
    out.sort(function (a, b) { return b.v - a.v; });
    return { items: out, n: hl.length };
  }
  /* publication cadence straight from the wire's own rows */
  function cadence(sec) {
    var out = {};
    if (!sec) return [];
    [].slice.call(sec.querySelectorAll('tbody tr')).forEach(function (tr) {
      var t = tr.children[0] ? tr.children[0].textContent.trim() : '';
      var d = t.split(',')[0].trim();          /* "05 Aug, 10:30 pm" -> "05 Aug" */
      if (d) out[d] = (out[d] || 0) + 1;
    });
    return Object.keys(out).map(function (d) { return { d: d, v: out[d] }; }).reverse();
  }
  window.__niyWireViz = function (secId, label) {
    var V = window.__niyViz, g = window.__niyGoaViz, K = window.__niySecKit;
    return function (block) {
      var sec = document.getElementById(secId);
      /*V2PASS90: what this desk's own headlines are about \u2014 different query, different chart*/
      var sub = subjects(sec, label);
      if (sub && sub.items.length) {
        block.appendChild(K.el('div', 'nvz-title', 'What the Coverage Is About'));
        block.appendChild(K.el('div', 'nvz-sub', 'headlines mentioning each term \u00b7 ' + sub.n + ' stories on this wire now'));
        block.appendChild(g.cbars(sub.items));
      }
      var dom = DOMAIN[label];
      if (dom && dom.items.length) {
        block.appendChild(K.el('div', 'nvz-title', dom.title));
        block.appendChild(K.el('div', 'nvz-sub', dom.sub));
        block.appendChild(g.cbars(dom.items));
      }
      var pts = cadence(sec);
      if (pts.length > 1) {
        block.appendChild(K.el('div', 'nvz-title', 'Reporting Cadence'));
        block.appendChild(K.el('div', 'nvz-sub', 'stories per day in the current wire'));
        block.appendChild(V.lineChart(pts));
      } else if (!sub && !(dom && dom.items.length)) {
        block.appendChild(K.el('div', 'nvz-title', 'Reporting Cadence'));
        block.appendChild(K.el('div', 'nls-note', 'These charts draw from the wire below \u2014 they appear once it loads.'));
      }
    };
  };
})();