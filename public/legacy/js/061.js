/* V2PASS98 feed hygiene — feed = live list, analytics = analysis */(function () {
  'use strict';
  var SEC = '[id^="niyGS"],[id^="niyGL"],#niyDP,#niyAD';

  function detail() { return document.getElementById('detail'); }
  function feedOf(d) { return d ? d.querySelector('.niy-col-feed') : null; }
  function paneOf(d) { return d ? d.querySelector('.niy-pane-analytics') : null; }

  /* a live list = a table with body rows that is NOT inside one of our analysis sections */
  function liveRows(feed) {
    if (!feed) return 0;
    var n = 0;
    feed.querySelectorAll('table').forEach(function (t) {
      if (t.closest(SEC)) return;
      n += t.querySelectorAll('tbody tr').length;
    });
    return n;
  }

  function sweep() {
    try {
      var d = detail(); if (!d) return;
      var feed = feedOf(d), pane = paneOf(d);
      if (!feed) return;

      /* (b) the analyst box never belongs in the feed */
      feed.querySelectorAll('.niy-analyst').forEach(function (n) { n.parentNode.removeChild(n); });

      /* (a) relocate analysis sections — only while the feed still has a live list */
      if (pane) {
        var secs = [].slice.call(feed.querySelectorAll(SEC));
        if (secs.length && liveRows(feed) > 0) {
          /* keep our sections above the chart blocks, in their original order */
          var anchor = pane.firstChild;
          secs.forEach(function (s) {
            s.setAttribute('data-niy-moved', '1');
            pane.insertBefore(s, anchor);
          });
          var empty = pane.querySelector('.niy-viz-empty');
          if (empty) empty.style.display = 'none';
        }
      }

      /*V2PASS102: collapse any column that is empty in every row*/
      feed.querySelectorAll('table').forEach(function (t) {
        var ths = [].slice.call(t.querySelectorAll('thead th'));
        var trs = [].slice.call(t.querySelectorAll('tbody tr'));
        if (!ths.length || !trs.length) return;
        ths.forEach(function (th, i) {
          if (th.hasAttribute('data-niy-col')) return;
          var any = false;
          for (var r = 0; r < trs.length; r++) {
            var c = trs[r].children[i];
            if (c && (c.textContent || '').trim()) { any = true; break; }
          }
          th.setAttribute('data-niy-col', any ? 'keep' : 'drop');
          if (!any) {
            th.style.display = 'none';
            trs.forEach(function (tr) { if (tr.children[i]) tr.children[i].style.display = 'none'; });
          }
        });
      });

      /* (c) the pending notice is only honest when there is genuinely nothing */
      var hasContent = liveRows(feed) > 0 || feed.querySelector(SEC) ||
        (pane && pane.querySelector(SEC + ',.niy-viz-block'));
      if (hasContent) {
        feed.querySelectorAll('.empty-state').forEach(function (n) { n.parentNode.removeChild(n); });
      }
    } catch (e) {}
  }

  function arm() {
    var d = detail();
    if (d && 'MutationObserver' in window) {
      var t;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(sweep, 120); })
        .observe(d, { childList: true, subtree: true });
    }
    sweep();
    setInterval(sweep, 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();