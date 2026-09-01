/* V2PASS99 Goa government releases — dip.goa.gov.in WP REST via /api/rss */(function () {
  'use strict';
  /* subject query per desk; the second value is an honest caption when the term is broad */
  var GOVQ = {
    'Assembly Proceedings':      ['assembly'],
    'Governor & Assent':         ['governor'],
    'State Governance Brief':    ['chief minister'],
    'State Cadre Transfers':     ['transfer'],
    'State Tenders':             ['tender'],
    'Cabinet Decisions':         ['cabinet'],
    'State Finances':            ['budget'],
    'CAG Audit Tracker':         ['audit'],
    'Centre\u2013State Fund Flows': ['central'],
    'District Media Monitor':    ['district'],
    'Municipal Watch':           ['municipal'],
    'Municipal Tenders':         ['municipal works'],
    'Municipal Finance':         ['municipality'], /*V2PASS100: 'municipal budget' ANDed to 2 hits*/
    'Panchayat Watch':           ['panchayat'],
    'MGNREGA Works':             ['employment', 'MGNREGA itself is named in only one release \u2014 this is the wider rural-employment record'],
    'GPDP Fund Tracker':         ['panchayat scheme'],
    'Councillor & Pradhan Cards':['sarpanch'],
    'Local Officer Directory':   ['collector']
  };
  var BASE = 'https://dip.goa.gov.in/wp-json/wp/v2/posts';

  function strip(s) {
    var d = document.createElement('textarea');
    d.innerHTML = String(s || '').replace(/<[^>]+>/g, '');
    return d.value.replace(/\s+/g, ' ').trim();
  }

  /* renders into hostEl; returns a promise so callers can chain a repaint */
  window.__niyGovReleases = function (label, hostEl, K) {
    var spec = GOVQ[label];
    if (!spec || !hostEl || !K) return Promise.resolve(0);
    var q = spec[0], caveat = spec[1];
    var url = BASE + '?per_page=20&search=' + encodeURIComponent(q) +
              '&_fields=date,title,link&orderby=date&order=desc';
    return K.jget('dip:' + q, '/api/rss?url=' + encodeURIComponent(url), 30 * 60000, true)
      .then(function (t) {
        var rows = JSON.parse(t);
        if (!rows || !rows.length) throw new Error('empty');
        var items = rows.map(function (p) {
          var d = new Date(p.date);
          return { t: isNaN(d) ? null : d, title: strip(p.title && p.title.rendered),
                   url: p.link, src: 'Goa DIP', cc: '' };
        }).filter(function (x) { return x.title; });
        if (!items.length) throw new Error('empty');
        hostEl.innerHTML = '';
        hostEl.appendChild(K.newsTable(items));
        var n = K.el('div', 'nls-note',
          items.length + ' releases from the Department of Information & Publicity, Government of Goa \u00b7 matched on \u201c' + q + '\u201d' +
          (caveat ? ' \u2014 ' + caveat : '') + '.');
        hostEl.appendChild(n);
        return items.length;
      })
      .catch(function () {
        hostEl.innerHTML = '';
        hostEl.appendChild(K.el('div', 'nls-note',
          'The Goa government release service (dip.goa.gov.in) is reached through the backend proxy. Not available right now \u2014 it retries automatically.'));
        return 0;
      });
  };
  window.__niyHasGov = function (label) { return !!GOVQ[label]; };
})();