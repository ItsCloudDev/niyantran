/* V2 PASS 64 niyActive lifeline — csv-keyed modules survive a partial main-script failure */(function () {
  'use strict';
  var LBL = {
    'Transit': 'seaborne_ais',
    'TRANSIT \u2014 Live Ships & Aircraft': 'seaborne_ais',
    'Conflicts': 'geo_conflicts',
    'Conflicts \u2014 Global Intelligence': 'geo_conflicts',
    'Open Fronts': 'geopolitics_war_tracker.csv',
    'War & Conflict Wire': 'geopolitics_war_tracker.csv',
    'Global Intelligence': 'geopolitics_defense_procurement.csv',
    'Defence Procurement': 'geopolitics_defense_procurement.csv'
  };
  function labelCsv() {
    try {
      var fi = document.querySelector('#sidebarList .feat-item.active');
      if (!fi) return '';
      var lbl = ((fi.querySelector('.label') || {}).textContent || '').replace(/\s*(AI|BETA)\s*$/, '').trim();
      if (LBL[lbl]) return LBL[lbl];
      var FD = null;
      try { if (typeof FEATURE_DATA !== 'undefined') FD = FEATURE_DATA; } catch (e) {}
      var tier = '';
      try { if (typeof activeTier !== 'undefined') tier = activeTier; } catch (e) {}
      var list = (FD && FD[tier]) || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].feature === lbl) return (list[i].dataSource && list[i].dataSource.csv) || '';
      }
      return '';
    } catch (e) { return ''; }
  }
  function shim() {
    if (typeof window.niyActive === 'function' && !window.niyActive.__lifeline) return;
    if (typeof window.niyActive === 'function') return; /* our shim already installed */
    var f = function () {
      try {
        var tier = '';
        try { if (typeof activeTier !== 'undefined') tier = activeTier; } catch (e) {}
        var csv = '';
        try {
          if (typeof FEATURE_DATA !== 'undefined' && typeof activeIndex !== 'undefined' &&
              FEATURE_DATA[tier] && FEATURE_DATA[tier][activeIndex] &&
              FEATURE_DATA[tier][activeIndex].dataSource)
            csv = FEATURE_DATA[tier][activeIndex].dataSource.csv || '';
        } catch (e) {}
        if (!csv) csv = labelCsv();
        return { tier: tier, csv: csv };
      } catch (e) { return {}; }
    };
    f.__lifeline = 1;
    window.niyActive = f;
  }
  /* install now; keep watching for a while — if the REAL one appears it wins (it
     overwrites unconditionally); if the main script died, the shim stays. */
  shim();
  var n = 0, iv = setInterval(function () {
    if (typeof window.niyActive === 'function' && !window.niyActive.__lifeline) { clearInterval(iv); return; }
    shim();
    if (++n > 240) clearInterval(iv);
  }, 500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', shim);
})();