/* V2PASS91 the whole state, unfiltered — scope filters the CSVs, ranks must not shrink with them */(function () {
  'use strict';
  var cache = null;
  function pack() {
    try {
      var P = window.NIY_GEO && window.NIY_GEO.packs;
      if (!P) return null;
      var k = Object.keys(P)[0];
      return k ? P[k] : null;
    } catch (e) { return null; }
  }
  function col(cols, name) { return cols ? cols.indexOf(name) : -1; }
  window.__niyStateAll = function () {
    if (cache) return cache;
    var p = pack(); if (!p || !p.seats || !p.seats.length) return [];
    var sc = p.seatCols || [];
    var iAc = col(sc, 'AC'), iNm = col(sc, 'Constituency'), iDi = col(sc, 'District'),
        iEl = col(sc, 'Electors'), iMg = col(sc, '2022 margin'), iSt = col(sc, 'Status 2022'),
        iIp = col(sc, 'In-play electors'), iBo = col(sc, 'Booths');
    var bc = p.blocCols || [], bAc = col(bc, 'AC'), bCa = col(bc, 'Catholic %'), bMu = col(bc, 'Muslim %');
    var minority = {};
    (p.blocs || []).forEach(function (r) {
      if (bAc < 0) return;
      minority[r[bAc]] = (bCa >= 0 ? (r[bCa] || 0) : 0) + (bMu >= 0 ? (r[bMu] || 0) : 0);
    });
    var del = {};
    (window.__niyGoaPreSIR || []).forEach(function (r) { del[r.ac] = r.delPct; });
    cache = p.seats.map(function (r) {
      var ac = r[iAc];
      return { ac: ac, name: iNm >= 0 ? r[iNm] : '', district: iDi >= 0 ? r[iDi] : '',
        electors: iEl >= 0 ? r[iEl] : null, booths: iBo >= 0 ? r[iBo] : null,
        margin22: iMg >= 0 ? r[iMg] : null, status: iSt >= 0 ? r[iSt] : '',
        inPlay: iIp >= 0 ? r[iIp] : null,
        minorityPct: minority[ac] != null ? minority[ac] : null,
        delPct: del[ac] != null ? del[ac] : null };
    });
    return cache;
  };
  /* rank one AC against the whole state on a field; asc = smallest is rank 1 */
  window.__niyStateRank = function (ac, field, asc) {
    var A = window.__niyStateAll().filter(function (r) { return r[field] != null; });
    if (A.length < 2) return null;
    A.sort(function (a, b) { return asc ? a[field] - b[field] : b[field] - a[field]; });
    for (var i = 0; i < A.length; i++) if (A[i].ac === ac) return { r: i + 1, n: A.length, v: A[i][field] };
    return null;
  };
  /* superseded by V2PASS92, which reorders inside the curator where BUCKET_ORDER is in scope */
  function order() {
    return true;
  }
  function orderUnused() {
    try {
      if (typeof BUCKET_ORDER === 'undefined' || !BUCKET_ORDER) return false;
      var lead = ['State of Play', 'The Roll', 'Districts', 'Legislature'];
      var anchor = BUCKET_ORDER.indexOf('Government Operations');
      if (anchor < 0) return false;
      if (BUCKET_ORDER.indexOf('State of Play') < anchor) return true;
      lead.forEach(function (b) {
        var i = BUCKET_ORDER.indexOf(b);
        if (i >= 0) BUCKET_ORDER.splice(i, 1);
      });
      BUCKET_ORDER.splice(BUCKET_ORDER.indexOf('Government Operations'), 0, lead[0], lead[1], lead[2], lead[3]);
      return true;
    } catch (e) { return false; }
  }
  if (!order()) { var n = 0, iv = setInterval(function () { if (order() || ++n > 80) clearInterval(iv); }, 100); }
})();