/* V2 PASS 77 state/local curator — 4 groups per tab, junk removed, healer-consistent */(function () {
  'use strict';
  /* RAW feature-name -> new bucket. Anything absent is removed. */
  /*V2PASS82: booth analysis is a LOCAL concern*/
  var MOVE = { 'Booth-level Results Database': { from: 'state', to: 'local', bucket: 'Assembly' } };
  var KEEP_STATE = {
    'Constituency Register': 'State of Play',
    'Election Results 2017\u20132024': 'State of Play',
    'Split-Ticket & Competitiveness': 'State of Play',
    'Roll Demography': 'The Roll',
    'Community Bloc Matrix': 'The Roll',
    'SIR Roll Churn': 'The Roll',
    'Registration Gap': 'The Roll',
    'District Profiles': 'Districts',
    'District Media Monitor (Vernacular District Editions)': 'Districts',
    'State Governance Brief': 'Legislature'
  };
  var KEEP_LOCAL = {
    'Local Governance Brief': 'Assembly',
    'Booth-level Results Database': 'Assembly',
    'Booth Political History': 'Contest Analysis',
    'Swing Booths': 'Contest Analysis',
    'Anchor Booths': 'Contest Analysis',
    'Booth Register': 'Booths',
    'Booth Demography': 'Booths',
    'Booth Bloc Composition': 'Booths',
    'Booth-level Roll Churn': 'Booths',
    'Municipal Watch': 'Local Wires',
    'Panchayat Watch': 'Local Wires',
    'Hyperlocal News Aggregator': 'Local Wires'
  };
  var INJECT = {
    state: [{
      rank: 90, bucket: 'Districts', feature: 'District Profiles',
      use: 'Every district of the state \u2014 seats, electors, booths, contested ground and community mix, computed from the ingested state pack.',
      money: 'Analysts, campaigns, district correspondents.', unique: 'Yes', archetype: 'brief',
      columns: [], dataSource: null
    }],
    local: [{
      rank: 91, bucket: 'Local Wires', feature: 'Municipal Watch',
      use: 'Live municipal and council coverage for the area in scope \u2014 corporations, municipal councils, wards.',
      money: 'Local journalists, councillors, residents.', unique: 'Yes', archetype: 'live',
      columns: [], dataSource: null
    }, {
      rank: 92, bucket: 'Local Wires', feature: 'Panchayat Watch',
      use: 'Live panchayat coverage for the area in scope \u2014 gram sabhas, sarpanch elections, works.',
      money: 'Rural correspondents, GP members, residents.', unique: 'Yes', archetype: 'live',
      columns: [], dataSource: null
    }]
  };
  var ORDER_STATE = ['State of Play', 'The Roll', 'Districts', 'Governance'];
  var ORDER_LOCAL = ['Assembly', 'Booths', 'Municipality', 'Panchayats', 'Wires'];

  function moveAcross() { /*V2PASS82*/
    try {
      var FD = (typeof FEATURE_DATA !== 'undefined') ? FEATURE_DATA : null; if (!FD) return;
      Object.keys(MOVE).forEach(function (name) {
        var mv = MOVE[name];
        var src = FD[mv.from], dst = FD[mv.to];
        if (!src || !dst) return;
        for (var i = src.length - 1; i >= 0; i--) {
          if (src[i].feature === name) {
            var f = src.splice(i, 1)[0];
            f.bucket = mv.bucket;
            if (!dst.some(function (x) { return x.feature === name; })) dst.push(f);
          }
        }
        try {
          var S = window.SHEET_NEW_FEATURES;
          if (S && S[mv.from]) {
            for (var j = S[mv.from].length - 1; j >= 0; j--) {
              if (S[mv.from][j].feature === name) {
                var g = S[mv.from].splice(j, 1)[0]; g.bucket = mv.bucket;
                if (!S[mv.to]) S[mv.to] = [];
                if (!S[mv.to].some(function (x) { return x.feature === name; })) S[mv.to].push(g);
              }
            }
          }
        } catch (e) {}
      });
    } catch (e) {}
  }
  function curate(tier, KEEP, inject) {
    moveAcross();
    /*V2PASS80: governance features register themselves; merged at call time so load order cannot matter*/
    try {
      var EK = (window.__niyGovKeep || {})[tier];
      if (EK) Object.keys(EK).forEach(function (k) { KEEP[k] = EK[k]; });
      var EI = (window.__niyGovInject || {})[tier];
      if (EI) EI.forEach(function (nf) {
        if (!inject.some(function (x) { return x.feature === nf.feature; })) inject.push(nf);
      });
    } catch (e) {}
    var FD = null;
    try { if (typeof FEATURE_DATA !== 'undefined') FD = FEATURE_DATA; } catch (e) {}
    if (!FD || !FD[tier] || !FD[tier].length) return false;
    var list = FD[tier];
    /* already curated? */
    var alien = list.filter(function (f) { return !KEEP[f.feature]; }).length;
    /*V2PASS83: a kept feature in the wrong group must be re-bucketed too*/
    var drift = list.filter(function (f) { return KEEP[f.feature] && f.bucket !== KEEP[f.feature]; }).length;
    var missing = inject.filter(function (nf) {
      return !list.some(function (f) { return f.feature === nf.feature; });
    });
    if (!alien && !drift && !missing.length) return false;
    /* remove junk in place */
    for (var i = list.length - 1; i >= 0; i--) {
      if (!KEEP[list[i].feature]) list.splice(i, 1);
      else list[i].bucket = KEEP[list[i].feature];
    }
    /* inject the new features */
    missing.forEach(function (nf) { list.push(nf); });
    /* keep the healer's sheet consistent so nothing resurrects */
    try {
      var S = window.SHEET_NEW_FEATURES;
      if (S && S[tier]) {
        for (var j = S[tier].length - 1; j >= 0; j--) {
          if (!KEEP[S[tier][j].feature]) S[tier].splice(j, 1);
          else S[tier][j].bucket = KEEP[S[tier][j].feature];
        }
      }
    } catch (e) {}
    return true;
  }
  function orderBuckets() {
    try {
      if (typeof BUCKET_ORDER === 'undefined' || !BUCKET_ORDER) return;
      ['State of Play', 'The Roll', 'Districts', 'Legislature', 'Government Operations', 'Public Finance',
       'Assembly', 'Booths', 'Contest Analysis', 'Local Wires', 'Municipality', 'Panchayats', 'Representatives']
        .concat(ORDER_STATE).concat(ORDER_LOCAL).forEach(function (b) {
        if (BUCKET_ORDER.indexOf(b) < 0) BUCKET_ORDER.push(b);
      });
      /*V2PASS92: appending was not enough \u2014 'Government Operations' and 'Public Finance' already sat
        near the front of the global catalog, so the state desk opened on procurement. Lift the four
        groups that define the desk above them. */
      var anchor = BUCKET_ORDER.indexOf('Government Operations');
      if (anchor >= 0 && BUCKET_ORDER.indexOf('State of Play') > anchor) {
        var lead = ['State of Play', 'The Roll', 'Districts', 'Legislature'];
        lead.forEach(function (b) { var i = BUCKET_ORDER.indexOf(b); if (i >= 0) BUCKET_ORDER.splice(i, 1); });
        var at = BUCKET_ORDER.indexOf('Government Operations');
        for (var q = lead.length - 1; q >= 0; q--) BUCKET_ORDER.splice(at, 0, lead[q]);
      }
    } catch (e) {}
  }
  function repaint() {
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  }
  function tick() {
    var a = curate('state', KEEP_STATE, INJECT.state);
    var b = curate('local', KEEP_LOCAL, INJECT.local);
    if (a || b) { orderBuckets(); repaint(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
  [200, 900, 2000, 4000].forEach(function (ms) { setTimeout(tick, ms); });
  var n = 0, iv = setInterval(function () { tick(); if (++n > 30) clearInterval(iv); }, 1500);
})();