
/* Niyantran — live conflict wire (client).
   The War & Conflict Tracker used to be 10 hand-typed rows whose own source note
   admitted "not a live feed". This turns it into a real newswire: ~170 unique,
   deduplicated stories pulled from GDELT 2.0 (free, no key) via /api/conflict,
   each with a timestamp, a source outlet and a link to the original — so every
   row is searchable, draggable into the AI, and citable.

   Reuses the same live-refresh mechanism the Carbon Registry Wire uses:
   replace EMBEDDED_CSV_DATA[csv] -> bust renderedBlockCache -> renderDetail().
   Classic scripts share the global lexical scope, so those bindings are visible
   here. Everything is guarded: if /api/conflict is unreachable (the offline
   standalone file has no backend) the original snapshot stays and we say so. */
(function () {
  'use strict';
  var CSV = 'geopolitics_war_tracker.csv';
  // Headline leads: the card title is taken from the first column, and a card
  // called "2026-07-20 11:30" is useless to the AI and to the analyst.
  // Link is carried as a real column so it lands in the card's fields — that is
  // what lets the AI fetch and read the actual article, and lets a journalist
  // copy a citable URL.
  var LIVE_COLS = ['Headline', 'Time', 'Region', 'Source', 'Outlets', 'Link'];
  var loaded = false, loading = false;

  function feat() {
    try {
      return featuresForTier('geopolitics').find(function (f) {
        return f.dataSource && f.dataSource.csv === CSV;
      });
    } catch (e) { return null; }
  }
  function onFeature() {
    try {
      if (typeof activeTier === 'undefined' || activeTier !== 'geopolitics') return false;
      var f = featuresForTier('geopolitics')[activeIndex];
      return !!(f && f.dataSource && f.dataSource.csv === CSV);
    } catch (e) { return false; }
  }

  function applyRows(rows) {
    var f = feat(); if (!f) return false;
    // switch the feature over to the live shape (only on success, so a failed
    // pull can never leave the table pointing at columns that don't exist)
    f.columns = LIVE_COLS.slice();
    f.dataSource.rowMap = function (r) { return [r.title, r.time, r.region, r.source, r.outlets, r.link]; };
    try {
      if (!window.__niyWarBaseline) {
        var _orig = (EMBEDDED_CSV_DATA[CSV] || []).filter(function (r) { return r.conflict_type || r.intensity; });
        if (_orig.length) window.__niyWarBaseline = _orig;
      }
      EMBEDDED_CSV_DATA[CSV] = rows;
      if (typeof csvCache !== 'undefined') csvCache[CSV] = rows;
      if (typeof renderedBlockCache !== 'undefined') renderedBlockCache.delete(f.dataSource);
    } catch (e) { return false; }
    loaded = true;
    return true;
  }

  function pull(opts) {
    opts = opts || {};
    if (loading) return Promise.resolve(null);
    loading = true;
    var qs = 'days=' + (opts.days || 3) + (opts.topic ? '&topic=' + encodeURIComponent(opts.topic) : '');
    return fetch('/api/conflict?' + qs, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(25000) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        loading = false;
        if (!j || !j.rows || !j.rows.length) throw new Error((j && j.error) || 'no rows');
        if (!applyRows(j.rows)) throw new Error('could not apply rows');
        return j.meta || {};
      })
      .catch(function (e) { loading = false; throw e; });
  }

  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) { } }

  function inject() {
    if (!onFeature()) return;
    var tb = document.querySelector('#detail .toolbar');
    if (!tb || tb.querySelector('.niy-conflict-live')) return;

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'toolbar-btn niy-conflict-live';
    b.innerHTML = loaded ? '⟳ Live' : '⟳ Go Live';
    b.title = 'Pull the latest conflict reporting from GDELT (free, no key) via /api/conflict';
    b.addEventListener('click', function () {
      b.disabled = true; b.innerHTML = '⟳ Pulling…';
      pull({ days: 3 }).then(function (meta) {
        say('Live wire: ' + meta.unique + ' stories · ' + meta.deduped + ' duplicates merged · ' + meta.window);
        b.disabled = false; b.innerHTML = '⟳ Live';
        try { renderDetail(); } catch (e) { }
      }).catch(function (e) {
        say('Live wire unavailable (' + e.message + ') — showing the embedded snapshot.');
        b.disabled = false; b.innerHTML = '⟳ Go Live';
      });
    });
    tb.appendChild(b);

    // first visit in a session: pull automatically so the feed is live by default
    if (!loaded && !loading) {
      b.disabled = true; b.innerHTML = '⟳ Pulling…';
      pull({ days: 3 }).then(function (meta) {
        b.disabled = false; b.innerHTML = '⟳ Live';
        say('Live wire: ' + meta.unique + ' stories from ' + meta.window);
        try { renderDetail(); } catch (e) { }
      }).catch(function () {
        b.disabled = false; b.innerHTML = '⟳ Go Live';
      });
    }
  }

  (function hook() {
    if (typeof window.renderDetail !== 'function') return setTimeout(hook, 500);
    var orig = window.renderDetail;
    window.renderDetail = function () {
      var r = orig.apply(this, arguments);
      try { setTimeout(inject, 0); } catch (e) { }
      return r;
    };
    setTimeout(inject, 400);
  })();

  window.NiyConflict = { pull: pull, isLive: function () { return loaded; } };
})();

