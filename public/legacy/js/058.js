/* V2PASS87 declared results — the house as declared, not as the machines read */(function () {
  'use strict';
  /* Ponda (AC 21), 2022: Ravi Naik (BJP) 7,514 v Ketan Prabhu Bhatikar (MGP) 7,437 — 77 votes, 0.30%.
     The report's dossiers carry Form 20 machine totals, which led to MGP. Source: ECI declaration. */
  window.__niyDeclared = {
    21: { party: 'BJP', member: 'Ravi Naik', margin: 0.3, m20: 'MGP',
          note: 'Ponda was declared to Ravi Naik (BJP) by 77 votes (0.30%); Form 20 machine totals led to MGP. Postal ballots decided the seat.' }
  };
  window.__niyDeclAll = function () {
    var d = window.__niyDeclared || {}, out = [];
    Object.keys(d).forEach(function (k) { out.push(d[k].note); });
    return out.join(' ');
  };
})();