
/* Niyantran — CALM layer.
   Audit found: 33% of the screen was chrome before any data, an 113px feature
   header (title block and toolbar were stacking instead of sharing a row), 11
   distinct font sizes, 62 bordered boxes and 60 competing controls — plus two
   tags that carried no user value ("NATIONAL" duplicates the active tab,
   "UNIQUE TO THIS TIER" is internal language).

   This layer is purely additive and reversible: it compresses the header onto
   one row, removes the dead tags, gives the toolbar a single primary action,
   and adds two view controls that REDUCE what's on screen (Focus, Density)
   rather than adding more chrome. */
(function () {
  'use strict';
  if (document.getElementById('niy-calm-css')) return;

  var LS_DENSITY = 'niyDensity';

  /* ---------------- styles ---------------- */
  var s = document.createElement('style');
  s.id = 'niy-calm-css';
  s.textContent = [
    /* 1 — the feature header on ONE row: title+tags left, toolbar right.
          This alone reclaims ~50px (7% of a 720px screen) on every feature. */
    '#detail .detail-head{display:flex;align-items:center;gap:12px;row-gap:7px;flex-wrap:wrap;padding-top:6px;padding-bottom:6px}',
    '#detail .detail-head .detail-title-block{flex:0 1 auto;min-width:0;max-width:46%}',
    /* title and its tag share one line and truncate — wrapping here was adding a
       second 22px row to two-thirds of all features. */
    '#detail .detail-head .detail-title-block>div{display:flex;align-items:baseline;gap:10px;flex-wrap:nowrap;min-width:0}',
    '#detail .detail-head .detail-title{font-size:15.5px;font-weight:640;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}',
    '#detail .detail-head .tags{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-width:0;overflow:hidden}',
    '#detail .detail-head .tags .tag{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;flex:0 1 auto}',
    '#detail .detail-head .toolbar{margin-left:auto!important;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;justify-content:flex-end}',
    /* the search box and the column-filter select were 340px + 242px — together
       two-thirds of the header, which is what forced the toolbar onto 4 rows.
       Both are now compact; the search expands on focus, when it's actually in use. */
    '#detail .detail-head .toolbar .filter-group{width:auto;max-width:150px;flex:0 1 auto;min-width:0}',
    '#detail .detail-head .toolbar .filter-input{width:100%;min-width:0;transition:max-width .18s ease}',
    '#detail .detail-head .toolbar .filter-group:focus-within{max-width:280px}',
    /* a feature can carry several column filters; letting them wrap inside the
       group is what pushed the header to two rows. Keep them on one line and
       scroll horizontally when there are more than a couple. */
    '#detail .detail-head .toolbar .column-filters{max-width:200px;flex:0 1 auto;min-width:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}',
    '#detail .detail-head .toolbar .column-filters::-webkit-scrollbar{display:none}',
    '#detail .detail-head .toolbar .column-filter-select{max-width:96px;min-width:64px;width:auto;flex:0 0 auto}',
    '#detail .detail-head .toolbar .toolbar-btn{flex:0 0 auto;white-space:nowrap}',
    /* below ~1100px there genuinely isn't room for one row — let it wrap again */
    '@media(max-width:1100px){#detail .detail-head{flex-wrap:wrap}#detail .detail-head .toolbar{flex-wrap:wrap}#detail .detail-head .detail-title-block{max-width:100%}}',

    /* 2 — kill the two tags that carry no information for a reader */
    '#detail .tags .tag.unique{display:none!important}',
    '#detail .tags .tag.niy-dup-tier{display:none!important}',

    /* 3 — one clear primary action. Everything else recedes to a quiet outline,
          so the eye lands on "Ask AI" instead of scanning 6 equal buttons. */
    '#detail .toolbar .toolbar-btn{background:transparent;font-weight:600}',
    '#detail .toolbar .toolbar-btn:not(.niy-primary){color:var(--fg-dim,#98a3af);border-color:var(--line,#232a33)}',
    '#detail .toolbar .toolbar-btn:not(.niy-primary):hover{color:var(--fg,#e9edf2);border-color:var(--line2,#333c48)}',
    '#detail .toolbar .toolbar-btn.niy-primary{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
    '#detail .toolbar .toolbar-btn.niy-primary:hover{filter:brightness(1.08)}',
    '#detail .toolbar .filter-input{min-width:120px}',

    /* 4 — Focus mode: strip the app down to data + workspace. */
    'body.niy-focus .ticker-wrap,body.niy-focus .tabs{display:none!important}',
    'body.niy-focus #sidebar,body.niy-focus .sidebar{display:none!important}',
    'body.niy-focus .main{grid-template-columns:1fr!important}',
    '#niyFocusExit{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;',
    'display:none;align-items:center;gap:9px;background:rgba(18,21,27,.94);border:1px solid var(--line2,#333c48);',
    'border-radius:999px;padding:6px 14px;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;',
    'color:var(--fg-dim,#98a3af);box-shadow:0 8px 26px rgba(0,0,0,.5);backdrop-filter:blur(6px)}',
    'body.niy-focus #niyFocusExit{display:flex}',
    '#niyFocusExit b{color:var(--ds-accent,#7fb0ff);font-weight:700}',
    '#niyFocusExit button{background:transparent;border:1px solid var(--line2,#333c48);color:var(--fg-dim,#98a3af);',
    'border-radius:999px;font-size:10px;padding:2px 9px;cursor:pointer;font-family:inherit}',
    '#niyFocusExit button:hover{color:var(--fg,#e9edf2)}',

    /* 5 — Compact density: tighter everywhere, for people who want maximum data. */
    'body.niy-compact #detail{padding-top:4px}',
    'body.niy-compact #detail .detail-head{padding-top:3px;padding-bottom:3px;gap:9px}',
    'body.niy-compact #detail .detail-title{font-size:14px}',
    'body.niy-compact #detail table tbody td{padding-top:4px!important;padding-bottom:4px!important}',
    'body.niy-compact #detail table thead th{padding-top:4px!important;padding-bottom:4px!important}',
    'body.niy-compact .niy-col-head,body.niy-compact .niy-work-head{padding-top:3px;padding-bottom:3px}',
    'body.niy-compact .feat-item{padding-top:6px;padding-bottom:6px}',

    /* 6 — ⌘K duplicated the header search box (which IS #cmdInput — the command
       input itself), so the chip was pure redundant chrome sitting beside the
       very field it opens. The shortcut still works. */
    '#niyCmdKHint{display:none!important}',
    /* the ticker speed control was absolutely positioned at right:0, the same
       corner as the pre-existing #ticker-actions, so it was buried underneath */
    '.ticker-actions .ticker-speed-btn{position:static;border-left:0;height:100%;margin-right:2px}'
  ].join('');
  document.head.appendChild(s);

  /* ---------------- density ---------------- */
  function applyDensity(v) {
    document.body.classList.toggle('niy-compact', v === 'compact');
    try { localStorage.setItem(LS_DENSITY, v); } catch (e) { }
    syncPop();
  }
  function density() { try { return localStorage.getItem(LS_DENSITY) || 'comfortable'; } catch (e) { return 'comfortable'; } }

  /* ---------------- focus mode ---------------- */
  function focusOn() { return document.body.classList.contains('niy-focus'); }
  function setFocus(on) { document.body.classList.toggle('niy-focus', !!on); syncPop(); try { window.dispatchEvent(new Event('resize')); } catch (e) { } }
  function toggleFocus() { setFocus(!focusOn()); }

  /* ---------------- header clean-up (runs on every feature render) ---------------- */
  function cleanHead() {
    var det = document.getElementById('detail'); if (!det) return;
    // the tier tag duplicates the active tab — mark it so CSS hides it
    var active = document.querySelector('.tab.active');
    var tier = active ? (active.textContent || '').trim().toUpperCase() : '';
    det.querySelectorAll('.tags .tag').forEach(function (t) {
      var txt = (t.textContent || '').trim().toUpperCase();
      if (tier && txt === tier) t.classList.add('niy-dup-tier');
      if (txt === 'UNIQUE TO THIS TIER') t.classList.add('unique');
    });
    // exactly one primary action
    det.querySelectorAll('.toolbar .toolbar-btn').forEach(function (b) {
      if (/^ask ai/i.test((b.textContent || '').trim())) b.classList.add('niy-primary');
    });
  }

  /* ---------------- view controls live inside the existing TOOLS menu ----------------
     A separate button for two view toggles was chrome for its own sake. TOOLS
     already exists and is the natural home for them. */
  function syncPop() {
    var f = document.getElementById('niyFocusItem');
    if (f) f.textContent = '◱ Focus mode' + (focusOn() ? ' · on' : '') + '   F';
    var d = document.getElementById('niyDensityItem');
    if (d) d.textContent = '▤ Density · ' + (density() === 'compact' ? 'Compact' : 'Comfortable');
  }
  function injectTools() {
    var pop = document.getElementById('niyToolsPop');
    if (!pop || document.getElementById('niyFocusItem')) return;
    var sample = pop.querySelector('button');           // copy the existing item styling
    var cls = sample ? sample.className : '';
    function item(id, onClick) {
      var b = document.createElement('button');
      b.type = 'button'; b.id = id; b.className = cls;
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); syncPop(); });
      pop.appendChild(b); return b;
    }
    item('niyFocusItem', toggleFocus);
    item('niyDensityItem', function () { applyDensity(density() === 'compact' ? 'comfortable' : 'compact'); });
    syncPop();
  }

  /* the speed control was absolutely positioned at right:0 — the same corner as
     the pre-existing #ticker-actions — so it rendered underneath it and looked
     "gone". Move it into that group so both are reachable. */
  function fixTickerSpeed() {
    var b = document.getElementById('tickerSpeedBtn');
    if (!b) return false;
    if (b.dataset.niyMoved) return true;
    // NB: .ticker-actions is a CLASS, not an id — getElementById silently
    // returns null and the button stays stacked under it.
    var actions = document.querySelector('.ticker-actions');
    if (actions) { actions.insertBefore(b, actions.firstChild); b.style.position = 'static'; }
    else { b.style.position = 'absolute'; b.style.right = '68px'; } // clear of that corner
    b.dataset.niyMoved = '1';
    return true;
  }

  /* the exit affordance so focus mode is never a trap */
  function mountExit() {
    if (document.getElementById('niyFocusExit')) return;
    var e = document.createElement('div'); e.id = 'niyFocusExit';
    e.innerHTML = '<span>Focus mode — press <b>F</b> or <b>Esc</b></span><button type="button">Exit</button>';
    e.querySelector('button').addEventListener('click', function () { setFocus(false); });
    document.body.appendChild(e);
  }

  /* ---------------- wiring ---------------- */
  // the TOOLS popover is built on demand, so inject after it opens
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#niyToolsBtn')) setTimeout(injectTools, 30);
  }, true);
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = (t && t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFocus(); }
    else if (e.key === 'Escape' && focusOn()) { setFocus(false); }
  });

  function boot() {
    mountExit();
    applyDensity(density());
    cleanHead();
    var tries = 0;
    var t = setInterval(function () { if (fixTickerSpeed() || ++tries > 60) clearInterval(t); }, 300);
    var det = document.getElementById('detail');
    if (det) new MutationObserver(function () { cleanHead(); }).observe(det, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NiyCalm = { focus: setFocus, toggleFocus: toggleFocus, density: applyDensity, clean: cleanHead };
})();

