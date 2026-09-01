/* V2 PASS 61 catalog healer — guarantees every feature reaches the sidebar */(function () {
  'use strict';
  var ORDER = ['Conflict Intelligence','Defense Intelligence','Maritime & Border Security',
    'Diplomacy & Alliances','Infra','Comparative Governance',
    'Legislative & Policy Intelligence','Regulatory & Judicial',
    'Judicial Intelligence','Judicial Analytics','International Courts',
    'Comparative Jurisprudence','Tribunals','Court Operations',
    'Justice System Data','Legal Research',
    'Electoral Data & Analytics','Representative Intelligence',
    'Government Operations','Political Operations Intelligence',
    'Audit & Oversight','Public Finance','Development Indicators',
    'Comparative Analytics','Service Delivery','Hyperlocal Intelligence',
    'Governance & Civic Bodies',
    'Market Intelligence','Macro & Economic Indicators',
    'Sector & Industry Intelligence','Trade & Sanctions','Prediction Markets',
    'Analytical Tools','News & Media Monitoring',
    'Data Markets & Community','Workflow & Distribution'];

  function catalog() { return window.SHEET_NEW_FEATURES || null; }
  function featureData() {
    try { if (typeof FEATURE_DATA !== 'undefined' && FEATURE_DATA) return FEATURE_DATA; } catch (e) {}
    return window.FEATURE_DATA || null;
  }
  /* how many sheet features are still absent */
  function missingCount() {
    var sheet = catalog(), FD = featureData();
    if (!sheet || !FD) return -1;
    var n = 0;
    Object.keys(sheet).forEach(function (tier) {
      var have = {};
      (FD[tier] || []).forEach(function (f) { have[f.feature] = 1; });
      sheet[tier].forEach(function (nf) { if (!have[nf.feature]) n++; });
    });
    return n;
  }
  function heal() {
    var sheet = catalog(), FD = featureData();
    if (!sheet || !FD) return false;
    var added = 0;
    Object.keys(sheet).forEach(function (tier) {
      if (!FD[tier]) FD[tier] = [];
      var have = {};
      FD[tier].forEach(function (f) { have[f.feature] = 1; });
      sheet[tier].forEach(function (nf) {
        if (have[nf.feature]) return;
        FD[tier].push(nf); have[nf.feature] = 1; added++;
      });
    });
    if (added) {
      try {
        if (typeof BUCKET_ORDER !== 'undefined' && BUCKET_ORDER && BUCKET_ORDER.length < ORDER.length) {
          BUCKET_ORDER.length = 0; ORDER.forEach(function (b) { BUCKET_ORDER.push(b); });
        }
      } catch (e) {}
      window.__NIY_CATALOG_HEALED = (window.__NIY_CATALOG_HEALED || 0) + added;
      repaint();
    }
    return added > 0;
  }
  function repaint() {
    try { if (typeof renderAll === 'function') { renderAll(); return; } } catch (e) {}
    try {
      var t = document.querySelector('#tabs .tab.active[data-tier], button[data-tier].active');
      if (t) { t.click(); return; }
    } catch (e) {}
  }
  function tick() { var m = missingCount(); if (m > 0) heal(); }
  /* run early, run again after the app settles, then watch for a while: the original
     merge may or may not have run, and tier catalogs are also touched by other modules */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
  [80, 300, 800, 1600, 3000, 5000].forEach(function (ms) { setTimeout(tick, ms); });
  var n = 0, iv = setInterval(function () { tick(); if (++n > 40) clearInterval(iv); }, 1500);
  /* expose a one-line self-check for support */
  window.niyCatalogStatus = function () {
    var FD = featureData(); if (!FD) return 'FEATURE_DATA unavailable';
    return Object.keys(FD).map(function (k) { return k + ':' + FD[k].length; }).join(' | ')
      + ' || missing:' + missingCount() + ' healed:' + (window.__NIY_CATALOG_HEALED || 0);
  };
})();