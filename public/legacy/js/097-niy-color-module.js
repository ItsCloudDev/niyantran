
/* Colour & aesthetics layer — richer accents over the Signal Protocol base:
   severity pills in the feed, per-tier tab accents, active-item accents,
   coloured finance deltas. Feed colouriser is virtualisation-safe (re-evaluates
   each cell every render; adds/removes pills; disconnects during its own writes). */
(function () {
  if (window.NiyColor) return; window.NiyColor = {};
  var CSS = `
:root{
  --niy-red:#e5484d; --niy-amber:#e0913f; --niy-green:#46a758; --niy-blue:#4a90d9;
  --niy-cyan:#2ec5c5; --niy-violet:#8b7bf6; --niy-pink:#ec4899; --niy-saffron:#e0913f;
}
/* severity pills */
.niy-pill{display:inline-block;padding:0 7px;border-radius:9px;font-size:10px;font-family:var(--font-mono);font-weight:600;letter-spacing:.02em;line-height:16px;white-space:nowrap;vertical-align:baseline}
.niy-pill-r{color:#ff7a75;background:rgba(229,72,77,.13);box-shadow:inset 0 0 0 1px rgba(229,72,77,.34)}
.niy-pill-a{color:#f2b45f;background:rgba(224,145,63,.13);box-shadow:inset 0 0 0 1px rgba(224,145,63,.34)}
.niy-pill-g{color:#5fce87;background:rgba(70,167,88,.14);box-shadow:inset 0 0 0 1px rgba(70,167,88,.34)}
.niy-pill-b{color:#7fb0e8;background:rgba(74,144,217,.13);box-shadow:inset 0 0 0 1px rgba(74,144,217,.32)}
.niy-delta-up{color:#5fce87!important;font-weight:600}
.niy-delta-dn{color:#ff7a75!important;font-weight:600}
/* per-tier active tab accent + live dot colour */
.tab.active{position:relative}
.tab.active::after{content:'';position:absolute;left:10px;right:10px;bottom:-1px;height:2px;border-radius:2px;background:var(--niy-amber);opacity:.95}
.tab[data-tier="geopolitics"].active::after{background:var(--niy-red)}
.tab[data-tier="national"].active::after{background:var(--niy-saffron)}
.tab[data-tier="state"].active::after{background:var(--niy-cyan)}
.tab[data-tier="local"].active::after{background:var(--niy-violet)}
.tab[data-tier="judiciary"].active::after{background:var(--niy-blue)}
.tab[data-tier="finance"].active::after{background:var(--niy-green)}
.tab[data-tier="climate"].active::after{background:var(--niy-cyan)}
.tab[data-tier="ndesk"].active::after{background:var(--niy-violet)}
.tab[data-tier="datastudio"].active::after{background:var(--niy-pink)}
.tab .tab-ico svg{transition:color .18s ease}
.tab[data-tier="geopolitics"].active .tab-ico{color:var(--niy-red)}
.tab[data-tier="finance"].active .tab-ico{color:var(--niy-green)}
.tab[data-tier="judiciary"].active .tab-ico{color:var(--niy-blue)}
.tab[data-tier="state"].active .tab-ico{color:var(--niy-cyan)}
.tab[data-tier="climate"].active .tab-ico{color:var(--niy-cyan)}
.tab-live{background:var(--niy-green)!important;box-shadow:0 0 6px rgba(70,167,88,.7)}
/* active feature — accent border + lift */
#sidebarList .feat-item.active{box-shadow:inset 2px 0 0 var(--niy-amber);background:linear-gradient(90deg,rgba(201,154,63,.09),transparent 60%)}
#sidebarList .feat-item .fi-live{color:#5fce87;text-shadow:0 0 8px rgba(70,167,88,.45)}
/* category head — accent underline when open + coloured count */
.niy-acc-head.open{box-shadow:inset 0 -1px 0 color-mix(in srgb,var(--niy-amber) 34%,transparent)}
.niy-acc-head.open .niy-acc-count{color:var(--niy-amber);border-color:color-mix(in srgb,var(--niy-amber) 45%,transparent)}
/* KPI cards — accent tick */
.niy-kpi{position:relative;overflow:hidden}
.niy-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--niy-amber);opacity:.5}
.niy-kpi .niy-kpi-v.sig-red{color:var(--niy-red)}
.niy-kpi .niy-kpi-v.sig-amber{color:var(--niy-amber)}
.niy-kpi .niy-kpi-v.sig-green{color:var(--niy-green)}
/* premium search-bar focus glow */
.cmdbar:focus-within{box-shadow:0 0 0 1px color-mix(in srgb,var(--niy-amber) 45%,transparent),0 6px 22px rgba(0,0,0,.5)}
/* section labels — subtle accent underline */
.niy-col-head,.niy-kpis-hd{border-bottom:1px solid color-mix(in srgb,var(--niy-amber) 16%,transparent)}
/* tab labels never truncate (N-Desk etc.) */
.tabs .tab{min-width:-moz-fit-content;min-width:fit-content}
.tabs .tab .tab-label{overflow:visible!important;text-overflow:clip!important;max-width:none!important}
/* brain logo — cycles colour every few seconds */
.brand img,.wordmark ~ img,.brand svg{animation:niyLogoCycle 14s linear infinite}
@keyframes niyLogoCycle{0%{filter:sepia(1) saturate(3.4) hue-rotate(0deg) brightness(1.1)}100%{filter:sepia(1) saturate(3.4) hue-rotate(360deg) brightness(1.1)}}
/* feed readability — kill the "blob of lines": zebra + hover + category left-rail */
#detail table.sample tbody tr:nth-child(even) td{background:rgba(255,255,255,.015)}
#detail table.sample tbody tr:hover td{background:rgba(201,154,63,.06)}
#detail table.sample tbody tr td:first-child{transition:box-shadow .15s ease}
`;
  var st = document.createElement('style'); st.id = 'niy-color-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);

  // ---- feed severity colouriser ----
  var WORD = {};
  [['r', ['critical', 'high', 'escalating', 'active', 'declining', 'lapsed', 'rejected', 'dismissed', 'withdrawn', 'banned', 'ongoing', 'urgent', 'terminated', 'stayed']],
   ['a', ['medium', 'fragile', 'ceasefire fragile', 'under review', 'stable', 'pending', 'in committee', 'proposed', 'planned', 'draft', 'reserved', 'trials', 'rfp', 'closing soon', 'moderate']],
   ['g', ['low', 'easing', 'resolved', 'operational', 'passed', 'assented', 'notified', 'completed', 'issued', 'advancing', 'delivered', 'approved', 'elected', 'won', 'allowed', 'disposed', 'commissioned']],
   ['b', ['frozen', 'low-intensity', 'dormant', 'monitoring']]
  ].forEach(function (p) { p[1].forEach(function (w) { WORD[w] = p[0]; }); });
  var DELTA = /^[+\-−]?\s?\d[\d,]*(\.\d+)?\s?%$/;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function colorizeCell(td) {
    var t = (td.textContent || '').trim();
    var hasPill = td.firstElementChild && td.firstElementChild.classList && td.firstElementChild.classList.contains('niy-pill');
    var tone = WORD[t.toLowerCase()];
    if (tone && t.length <= 24) {
      var want = 'niy-pill niy-pill-' + tone;
      if (!hasPill || td.firstElementChild.className !== want) td.innerHTML = '<span class="' + want + '">' + esc(t) + '</span>';
      return true;
    }
    if (hasPill) { td.textContent = t; }
    // finance deltas: colour +/- % text (no pill, just colour)
    if (DELTA.test(t)) {
      var neg = /^[\-−]/.test(t); var cls = neg ? 'niy-delta-dn' : (/^[+]/.test(t) ? 'niy-delta-up' : '');
      if (cls && !td.classList.contains(cls)) { td.classList.remove('niy-delta-up', 'niy-delta-dn'); td.classList.add(cls); }
      return true;
    } else if (td.classList.contains('niy-delta-up') || td.classList.contains('niy-delta-dn')) {
      td.classList.remove('niy-delta-up', 'niy-delta-dn');
    }
    return false;
  }
  // colour each feed row's left rail — by status pill if present, else a stable
  // per-category hue (hash of the category cell). Differentiates the "blob".
  function hueOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; }
  function colorizeRows(detail) {
    var rows = detail.querySelectorAll('table.sample tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i], tds = tr.children; if (!tds.length) continue;
      var pill = tr.querySelector('.niy-pill'), col = '';
      if (pill) { col = pill.classList.contains('niy-pill-r') ? 'rgb(229,72,77)' : pill.classList.contains('niy-pill-a') ? 'rgb(224,145,63)' : pill.classList.contains('niy-pill-g') ? 'rgb(70,167,88)' : 'rgb(74,144,217)'; }
      else { var cat = ((tds[1] && tds[1].textContent) || (tds[0] && tds[0].textContent) || '').trim(); if (cat) col = 'hsl(' + hueOf(cat) + ',52%,56%)'; }
      var want = col ? 'inset 3px 0 0 ' + col : '';
      if (tds[0].style.boxShadow !== want) tds[0].style.boxShadow = want;
    }
  }
  var obs = null, pend = null;
  // Debounced + childList-only (NOT characterData — live HUD/counter ticks must
  // not trigger a re-scan) + skip canvas features (SEABORNE / geo dossier have no
  // feed table; scanning there thrashed layout and distorted the live map).
  function doRun() {
    if (obs) obs.disconnect();
    try {
      var detail = document.getElementById('detail');
      if (detail && !detail.classList.contains('niy-seaborne-on') && !detail.querySelector('#niyGeoDossier')) {
        var cells = detail.querySelectorAll('table.sample td'); for (var i = 0; i < cells.length; i++) colorizeCell(cells[i]);
        colorizeRows(detail);
      }
    } catch (e) { }
    var d = document.getElementById('detail'); if (obs && d) obs.observe(d, { childList: true, subtree: true });
  }
  function run() { clearTimeout(pend); pend = setTimeout(doRun, 140); }
  function boot() {
    var d = document.getElementById('detail'); if (!d) { setTimeout(boot, 250); return; }
    obs = new MutationObserver(run); doRun();
    [250, 700, 1500].forEach(function (t) { setTimeout(doRun, t); });
  }
  window.NiyColor.refresh = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
