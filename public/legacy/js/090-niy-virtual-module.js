
/* Niyantran — windowed feed rendering.
   The feed rendered every row up front: 4,576 bills = 9,152 <tr> (each data row
   is paired with a hidden .expand-panel-row for the accordion), 37,444 DOM nodes
   and a 147,240px-tall table. Any global style invalidation then had to restyle
   the lot — which is why flipping dark/light froze the terminal for ~2.5s.

   Measured: 37,444 nodes -> 2,504ms per theme flip; 2,076 nodes -> 55-95ms.

   So we render a window of rows and keep the rest detached (the elements are
   MOVED, never cloned, so their drag/expand listeners survive). Filtering still
   searches every row — it filters the full group list, not just what's on
   screen — and scrolling appends the next chunk. */
(function () {
  'use strict';
  if (window.__niyVirtual) return;
  window.__niyVirtual = 1;

  var PAGE = 150;        // data rows per chunk
  var MIN = 220;         // leave small tables completely alone
  var state = new WeakMap();

  function groupsOf(tbody) {
    var g = [], kids = [].slice.call(tbody.children);
    for (var i = 0; i < kids.length; i++) {
      var r = kids[i];
      if (r.classList.contains('expand-panel-row')) continue;   // belongs to the row above
      var pair = [r];
      var nx = kids[i + 1];
      if (nx && nx.classList.contains('expand-panel-row')) pair.push(nx);
      g.push({ rows: pair, text: (r.textContent || '').toLowerCase() });
    }
    return g;
  }

  function note(tbody, shownGroups, total) {
    var wrap = tbody.closest('.niy-col-body') || tbody.parentElement;
    if (!wrap) return;
    var el = wrap.querySelector('.niy-vnote');
    if (!el) {
      el = document.createElement('div');
      el.className = 'niy-vnote';
      el.style.cssText = 'font:600 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;color:var(--fg-faint,#5f6873);padding:6px 2px 2px';
      tbody.closest('table').insertAdjacentElement('afterend', el);
    }
    el.textContent = shownGroups >= total ? (total + ' ROWS') : (shownGroups + ' / ' + total + ' ROWS · SCROLL FOR MORE');
  }

  function render(tbody) {
    var st = state.get(tbody); if (!st) return;
    var list = st.q ? st.groups.filter(function (x) { return x.text.indexOf(st.q) > -1; }) : st.groups;
    var n = Math.min(st.shown, list.length);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) for (var j = 0; j < list[i].rows.length; j++) frag.appendChild(list[i].rows[j]);
    // detach the rest — they stay referenced in st.groups, so nothing is lost
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    tbody.appendChild(frag);
    st.matched = list.length;
    note(tbody, n, list.length);
  }

  function attach(tbody) {
    if (state.has(tbody)) return;
    var groups = groupsOf(tbody);
    if (groups.length < MIN) return;                       // small table: untouched
    state.set(tbody, { groups: groups, shown: PAGE, q: '', matched: groups.length });
    render(tbody);

    var scroller = tbody.closest('.niy-col-body');
    if (scroller && !scroller.dataset.niyVScroll) {
      scroller.dataset.niyVScroll = '1';
      scroller.addEventListener('scroll', function () {
        var tb = scroller.querySelector('table.sample tbody');
        var st = tb && state.get(tb); if (!st) return;
        if (st.shown >= st.matched) return;
        if (scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 400) {
          st.shown += PAGE; render(tb);
        }
      }, { passive: true });
    }
  }

  // The row filter MUST search every row, not just the rendered window.
  // Delegated at document level: the header (and its input) is rebuilt on every
  // feature switch, so binding to the element itself silently stops working.
  var filterT = null;
  document.addEventListener('input', function (e) {
    var inp = e.target;
    if (!inp || !inp.classList || !inp.classList.contains('filter-input')) return;
    if (!inp.closest('#detail')) return;
    clearTimeout(filterT);
    filterT = setTimeout(function () {
      var tb = document.querySelector('#detail .niy-col-feed table.sample tbody');
      var st = tb && state.get(tb);
      if (!st) return;
      st.q = (inp.value || '').trim().toLowerCase();
      st.shown = PAGE;
      render(tb);
      // our window now contains only matches, so clear any display:none the
      // app's own filter left on rows it had hidden
      [].forEach.call(tb.querySelectorAll('tr.expandable-row'), function (r) {
        if (r.style.display === 'none') r.style.display = '';
      });
    }, 130);
  }, true);

  function scan() {
    var tb = document.querySelector('#detail .niy-col-feed table.sample tbody');
    if (tb) attach(tb);
  }

  function boot() {
    scan();
    var det = document.getElementById('detail');
    if (det) {
      var pending = null;
      new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(scan, 60);      // the app rebuilds the table on feature switch
      }).observe(det, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NiyVirtual = { rescan: scan, page: PAGE };
})();

