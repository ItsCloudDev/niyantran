
/* ================================================================
   NIYANTRAN DESIGN SYSTEM — the unifying layer.
   One token set + component pass that harmonizes every UI
   generation (base terminal, enhancement layer, finance dash,
   Canvas Studio, Stream) onto the Signal Protocol identity:
   monochrome foundation, three desaturated signal colors, and one
   canonized interactive/AI accent. Motion is 150–350ms, transform/
   opacity only (GPU), and honors prefers-reduced-motion. Pure
   presentation — zero behavioral or architectural changes.
   ================================================================ */
(function () {
  'use strict';

  /* ---------------- 1 · tokens + global refinements ---------------- */
  const css = [
    /* NOTE: no color-mix(var()) anywhere — the engine doesn't re-resolve it
       on [data-theme] flips, so every theme-sensitive token is explicit. */
    ":root{--ds-accent:#F3785E;--ds-accent-dim:rgba(243,120,94,.16);--ds-accent-line:rgba(243,120,94,.44);--ds-r-s:6px;--ds-r-m:10px;--ds-r-l:14px;--ds-dur-1:150ms;--ds-dur-2:240ms;--ds-dur-3:340ms;--ds-ease:cubic-bezier(.22,.61,.2,1);--ds-shadow-1:0 2px 10px rgba(0,0,0,.25);--ds-shadow-2:0 10px 30px rgba(0,0,0,.35);--ds-shadow-3:0 24px 70px rgba(0,0,0,.5);--ds-hair:rgba(255,255,255,.1);--ds-hair-2:rgba(255,255,255,.18);--ds-wash:rgba(255,255,255,.045);--ds-zebra:rgba(255,255,255,.016);--ds-surface:rgba(13,14,16,.94);--ds-thumb:rgba(255,255,255,.18);--ds-thumb-h:rgba(255,255,255,.32)}",
    "html[data-theme=light]{--ds-accent:#E0552A;--ds-accent-dim:rgba(224,85,42,.1);--ds-accent-line:rgba(224,85,42,.4);--ds-shadow-1:0 2px 10px rgba(15,20,30,.08);--ds-shadow-2:0 10px 30px rgba(15,20,30,.12);--ds-shadow-3:0 24px 70px rgba(15,20,30,.18);--ds-hair:rgba(10,10,10,.12);--ds-hair-2:rgba(10,10,10,.22);--ds-wash:rgba(10,10,10,.05);--ds-zebra:rgba(10,10,10,.025);--ds-surface:rgba(255,255,255,.94);--ds-thumb:rgba(10,10,10,.22);--ds-thumb-h:rgba(10,10,10,.4)}",
    "*{-webkit-font-smoothing:antialiased}",
    "::selection{background:var(--ds-accent);color:#04121f}",
    "html[data-theme=light] ::selection{background:var(--black);color:var(--white)}",
    /* scrollbars — thin, quiet, hover-bright */
    "*::-webkit-scrollbar{width:9px;height:9px}",
    "*::-webkit-scrollbar-track{background:transparent}",
    "*::-webkit-scrollbar-thumb{background:var(--ds-thumb);border-radius:5px;border:2px solid transparent;background-clip:content-box}",
    "*::-webkit-scrollbar-thumb:hover{background:var(--ds-thumb-h);border:2px solid transparent;background-clip:content-box}",
    /* universal, consistent focus ring — keyboard-first a11y */
    "button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible,[contenteditable]:focus-visible{outline:2px solid var(--ds-accent) !important;outline-offset:2px;border-radius:var(--ds-r-s)}",
    "table.sample tbody tr:focus-visible{outline-offset:-2px}",
    /* motion discipline */
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}",

    /* ---------------- 2 · navigation ---------------- */
    ".tab{position:relative;transition:background var(--ds-dur-1) var(--ds-ease),color var(--ds-dur-1) var(--ds-ease);padding:11px 12px}",
    ".tab::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--ds-accent);transform:scaleX(0);transform-origin:left;transition:transform var(--ds-dur-2) var(--ds-ease)}",
    ".tab.active::after{transform:scaleX(1)}",
    ".tab.active{box-shadow:none !important}",
    ".tab.active .tab-label{text-shadow:none}",
    ".tab:active{transform:translateY(1px)}",
    ".tab .beta-badge{opacity:.75}",
    ".sidebar-filter input,.filter-input,.column-filter-select,.dataset-search-row input,#smSearch{border-radius:var(--ds-r-s);transition:border-color var(--ds-dur-1) var(--ds-ease),background var(--ds-dur-1) var(--ds-ease),box-shadow var(--ds-dur-1) var(--ds-ease)}",
    ".sidebar-filter input:focus,.filter-input:focus,.dataset-search-row input:focus{border-color:var(--ds-accent-line) !important;box-shadow:0 0 0 3px var(--ds-accent-dim);outline:none !important}",
    ".sidebar-group .feat-item,.sidebar .feat-item{position:relative;transition:background var(--ds-dur-1) var(--ds-ease),color var(--ds-dur-1) var(--ds-ease),transform var(--ds-dur-1) var(--ds-ease);border-radius:var(--ds-r-s)}",
    ".sidebar .feat-item:hover{transform:translateX(2px)}",
    ".sidebar-group-label{letter-spacing:.16em;font-size:9.5px}",
    ".scope-bar{backdrop-filter:blur(6px)}",

    /* ---------------- 3 · buttons — one language ---------------- */
    ".toolbar-btn,.scope-action-btn,.studio-nav-item,.login-submit,.odds-tg,.cs-btn,.sm-hbtn,.pt-folder{transition:background var(--ds-dur-1) var(--ds-ease),color var(--ds-dur-1) var(--ds-ease),border-color var(--ds-dur-1) var(--ds-ease),transform var(--ds-dur-1) var(--ds-ease)}",
    ".toolbar-btn,.scope-action-btn{border-radius:var(--ds-r-s)}",
    ".toolbar-btn:hover:not(:disabled),.scope-action-btn:hover{border-color:var(--ds-hair-2)}",
    ".toolbar-btn:active:not(:disabled),.scope-action-btn:active,.sm-hbtn:active,.cs-btn:active,.login-submit:active{transform:scale(.97)}",
    ".toolbar-btn:disabled{opacity:.4}",
    "@media (pointer:coarse){.toolbar-btn,.scope-action-btn,.tab,.column-filter-select{min-height:38px}}",
    /* header action buttons — one identical pill (STREAM · COMPANY · Refresh),
       never compressed by flex, matched height with the ⌘K chip + theme square.
       Fixed sizing so they stay stable/legible on ultrawide + big screens. */
    ".topbar .niy-livetv-btn,.topbar .niy-co-btn,.topbar .ai-status-pill{height:30px;box-sizing:border-box;padding:0 13px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0;flex-grow:0}",
    ".topbar .quick-controls{gap:8px}",
    ".topbar .quick-controls #niyCoBtn{order:-1}",
    ".topbar #niyCmdKHint{height:30px;box-sizing:border-box;display:inline-flex;align-items:center;padding:0 9px;flex-shrink:0}",
    ".topbar .quick-theme-btn,.topbar .profile-btn{flex-shrink:0}",
    /* pin the action cluster to the right edge — kills the dead space that
       otherwise piled up after the avatar on wide/ultrawide screens (search
       stays left, actions flush right — the standard app-bar layout). */
    ".topbar .cmdbar{max-width:760px !important}",
    ".topbar .lang-toggle{flex-shrink:0;margin-left:auto}",

    /* ---------------- 4 · enterprise tables ---------------- */
    "table.sample thead th{position:sticky;top:0;z-index:3;background:var(--ds-surface);backdrop-filter:blur(8px);box-shadow:0 1px 0 var(--ds-hair-2);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;user-select:none}",
    "table.sample th.ds-sortable{cursor:pointer}",
    "table.sample th.ds-sortable:hover{color:var(--fg)}",
    "table.sample th .ds-arrow{display:inline-block;margin-left:5px;font-size:8px;opacity:0;transition:opacity var(--ds-dur-1),transform var(--ds-dur-2) var(--ds-ease)}",
    "table.sample th.ds-sort-asc .ds-arrow,table.sample th.ds-sort-desc .ds-arrow{opacity:.9}",
    "table.sample th.ds-sort-desc .ds-arrow{transform:rotate(180deg)}",
    "table.sample td{font-variant-numeric:tabular-nums;line-height:1.5}",
    "table.sample tbody tr{transition:background var(--ds-dur-1) var(--ds-ease)}",
    "table.sample tbody tr:hover{background:var(--ds-wash)}",
    "table.sample tbody tr:nth-child(even):not(:hover){background:var(--ds-zebra)}",
    /* skip layout/paint of off-screen rows — a 9k-row table costs ~1s of layout without this */
    "table.sample tbody tr{content-visibility:auto;contain-intrinsic-size:auto 34px}",

    /* ---------------- 5 · cards, tags, labels ---------------- */
    ".dataset-card{transition:transform var(--ds-dur-2) var(--ds-ease),border-color var(--ds-dur-2) var(--ds-ease),box-shadow var(--ds-dur-2) var(--ds-ease);border-radius:var(--ds-r-m)}",
    ".dataset-card:hover{transform:translateY(-2px);border-color:var(--ds-hair-2);box-shadow:var(--ds-shadow-1)}",
    ".tag,.beta-badge,.access-flag{border-radius:999px;letter-spacing:.06em}",
    ".section-label{font-size:10px;letter-spacing:.15em;font-weight:700}",
    ".detail-title{letter-spacing:-.01em}",
    ".rd-ai{box-shadow:var(--ds-shadow-1)}",

    /* ---------------- 6 · overlays + menus — one entrance ---------------- */
    "@keyframes dsPop{from{opacity:0;transform:scale(.975) translateY(6px)}to{opacity:1;transform:none}}",
    "@keyframes dsIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    "@keyframes dsFade{from{opacity:0}to{opacity:1}}",
    ".fin-modal,.cs-cm,.cs-pop,.scope-popover:not([hidden]),.niy-more-menu,.feat-related-pop,#niySmartModal .fin-modal,#ptPlay.show .pt-hud{animation:dsPop var(--ds-dur-2) var(--ds-ease)}",
    ".fin-modal-ov.show,.cs-cm-ov.show{animation:dsFade var(--ds-dur-1) var(--ds-ease)}",
    "#niyStream:not([hidden]) .sm-hub>*{animation:dsIn var(--ds-dur-3) var(--ds-ease) backwards}",
    "#niyStream:not([hidden]) .sm-hub>*:nth-child(2){animation-delay:40ms}",
    "#niyStream:not([hidden]) .sm-hub>*:nth-child(3){animation-delay:80ms}",
    "#niyStream:not([hidden]) .sm-hub>*:nth-child(n+4){animation-delay:120ms}",
    /* detail view re-render entrance (innerHTML swap recreates nodes → auto-retrigger) */
    "#detail>.detail-head{animation:dsIn var(--ds-dur-2) var(--ds-ease) backwards}",
    "#detail>.niy-split,#detail>#dataArea,#detail>#niyFinDash,#detail>#niyOddsBoard{animation:dsIn var(--ds-dur-3) var(--ds-ease) 60ms backwards}",

    /* ---------------- 7 · ticker + status surfaces ---------------- */
    /* mask ONLY the scrolling track — masking .ticker-wrap clipped the Topics popover (its child) */
    ".ticker-track{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 26px,#000 calc(100% - 60px),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 26px,#000 calc(100% - 60px),transparent)}",
    ".statusbar{display:none !important}",
    ".toolbar-msg:not(:empty){animation:dsIn var(--ds-dur-2) var(--ds-ease)}",
    "#globalToast,.sm-toast{animation:dsPop var(--ds-dur-2) var(--ds-ease);border-radius:var(--ds-r-m);box-shadow:var(--ds-shadow-2)}",

    /* ---------------- 8 · native skin — Stream + Canvas adopt the Signal Protocol ---------------- */
    "#niyStream{font-family:var(--font-display),'Segoe UI',sans-serif;background:var(--black);color:var(--fg)}",
    ".sm-head,.sm-modhead{background:var(--panel);border-color:var(--line)}",
    ".sm-card,.sm-panel,.sm-recent{background:var(--panel);border-color:var(--line)}",
    ".sm-card:hover{border-color:var(--line-bright)}",
    ".sm-hero h1{background:none;-webkit-text-fill-color:var(--fg);color:var(--fg)}",
    ".sm-search,.sm-hbtn,.sm-in{background:var(--panel-2);border-color:var(--line);color:var(--fg-dim)}",
    ".sm-hbtn:hover{background:var(--panel-3);color:var(--fg)}",
    ".pt-lib,.bc-left,.bc-right,.ed-side,.rm-side,.ca-side,.sm-ai,.cs-toolbar,.cs-side,.cs-top{background:var(--panel);border-color:var(--line)}",
    ".bc-box,.ed-box,.cs-pf{background:var(--panel-2);border-color:var(--line)}",
    ".cs-root{background:var(--black);border-color:var(--line)}",
    ".cs-viewport{background-color:var(--black)}",
    ".cs-btn,.cs-tool,.cs-name{font-family:inherit}",
    "#pane-canvas{height:100%;min-height:430px}",

    /* Live Intelligence (LIVE TV) panel — the body was a flex column of two
       fixed-height sections, leaving dead black space below the fact-check
       feed. Pin the transcript, let the claims feed grow to fill the panel. */
    "#niyLiveTv .ltv-intruth-body{overflow:hidden}",
    "#niyLiveTv .ltv-transcript-sec{flex:0 0 auto}",
    "#niyLiveTv .ltv-fc-claims-sec{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:8px}",
    "#niyLiveTv .ltv-fc-claims-sec .ltv-it-sec-h{flex:0 0 auto}",
    "#niyLiveTv .ltv-fc-claims{flex:1 1 auto;max-height:none;min-height:90px}",

    /* feed tables size columns to content now (table-layout:auto); when the
       table is wider than the narrow feed pane, let it scroll horizontally so
       every value is reachable instead of truncated. */
    "#detail .niy-col-body{overflow-x:auto}",
    "#detail #dataArea{min-width:0}",

    /* inline row-detail accordion — every card expands in place (uniform with
       the Bill Passage Index). Full-bleed panel row inside the feed table. */
    "tr.niy-rd-panel-row>td{padding:0 !important;background:var(--ds-wash);border-bottom:1px solid var(--ds-hair-2)}",
    ".niy-rd-panel{padding:15px 18px 18px;animation:dsIn var(--ds-dur-2) var(--ds-ease)}",
    ".niy-rd-panel-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}",
    ".niy-rd-panel-title{font-size:14px;font-weight:750;letter-spacing:-.01em;color:var(--fg)}",
    ".niy-rd-close{margin-left:auto;background:transparent;border:0;color:var(--fg-faint,#8a94a0);font-size:16px;cursor:pointer;line-height:1;padding:2px 6px}",
    ".niy-rd-close:hover{color:var(--fg)}",
    "table.sample tbody tr.niy-rd-open>td{background:var(--ds-accent-dim);box-shadow:inset 2px 0 0 var(--ds-accent)}",
    ".niy-rd-panel .row-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}",

    /* ---------------- 9 · login ---------------- */
    ".login-card-col input{transition:border-color var(--ds-dur-1) var(--ds-ease),box-shadow var(--ds-dur-1) var(--ds-ease)}",
    ".login-card-col input:focus{border-color:var(--ds-accent-line) !important;box-shadow:0 0 0 3px var(--ds-accent-dim)}",
    "#detail select:focus,#detail input[type=text]:focus,#detail input[type=search]:focus{border-color:var(--ds-accent-line) !important;box-shadow:0 0 0 3px var(--ds-accent-dim) !important}",
    ".login-submit{border-radius:var(--ds-r-s)}",

    /* ---------------- 10 · skeleton loaders + designed states ---------------- */
    "@keyframes dsShimmer{from{background-position:-460px 0}to{background-position:460px 0}}",
    ".ds-skel{display:flex;flex-direction:column;gap:9px;padding:14px 4px}",
    ".ds-skel i{display:block;height:13px;border-radius:5px;background:linear-gradient(90deg,var(--ds-wash) 25%,var(--ds-hair) 40%,var(--ds-wash) 55%);background-size:460px 100%;animation:dsShimmer 1.15s linear infinite}",
    ".ds-skel i:nth-child(1){width:34%;height:11px;opacity:.7}",
    ".ds-skel i:nth-child(n+2){width:100%}",
    ".ds-skel i:nth-child(2n+3){width:92%}",
    ".ds-skel .ds-skel-note{font-size:10px;color:var(--fg-faint);letter-spacing:.05em;padding-top:2px}",
    ".callout{border:1px dashed var(--ds-hair-2) !important;border-radius:var(--ds-r-m);color:var(--fg-dim);line-height:1.65;animation:dsIn var(--ds-dur-2) var(--ds-ease)}",

    /* ---------------- 11 · command palette ---------------- */
    "#niyCmdK{position:fixed;inset:0;z-index:9600;background:rgba(3,5,9,.6);backdrop-filter:blur(3px);display:none;align-items:flex-start;justify-content:center;padding:12vh 20px 20px}",
    "#niyCmdK.show{display:flex;animation:dsFade var(--ds-dur-1) var(--ds-ease)}",
    ".ck-box{width:min(560px,94vw);background:var(--panel-2);border:1px solid var(--ds-hair-2);border-radius:14px;box-shadow:var(--ds-shadow-3);overflow:hidden;animation:dsPop var(--ds-dur-2) var(--ds-ease)}",
    ".ck-inrow{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--ds-hair)}",
    ".ck-inrow .glyph{color:var(--fg-faint);font-size:14px}",
    ".ck-inrow input{flex:1;background:transparent;border:0;outline:none;color:var(--fg);font-size:14px;font-family:var(--font-display)}",
    ".ck-kbd{font-size:9px;font-weight:700;color:var(--fg-faint);border:1px solid var(--ds-hair-2);border-radius:4px;padding:2px 6px;letter-spacing:.06em}",
    ".ck-list{max-height:46vh;overflow-y:auto;padding:6px;scrollbar-width:thin}",
    ".ck-sec{font-size:8.5px;font-weight:700;letter-spacing:.16em;color:var(--fg-faint);padding:8px 12px 4px}",
    ".ck-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:8px 11px;cursor:pointer;color:var(--fg-dim)}",
    ".ck-item .ck-badge{flex:0 0 auto;font-size:8px;font-weight:800;letter-spacing:.08em;border:1px solid var(--ds-hair-2);border-radius:4px;padding:1.5px 6px;color:var(--fg-faint);min-width:30px;text-align:center}",
    ".ck-item .ck-t{flex:1;min-width:0;font-size:12.5px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--fg)}",
    ".ck-item .ck-sub{font-size:10px;color:var(--fg-faint);white-space:nowrap}",
    ".ck-item.sel{background:var(--ds-accent-dim);outline:1px solid var(--ds-accent-line)}",
    ".ck-item.sel .ck-badge{color:var(--ds-accent);border-color:var(--ds-accent-line)}",
    ".ck-foot{display:flex;gap:14px;padding:9px 16px;border-top:1px solid var(--ds-hair);font-size:9.5px;color:var(--fg-faint);letter-spacing:.04em}",
    ".ck-empty{padding:22px;text-align:center;font-size:12px;color:var(--fg-faint)}",
    "#niyCmdKHint{margin-left:6px}",
  ].join('');
  if (!document.getElementById('niy-ds-css')) {
    const s = document.createElement('style'); s.id = 'niy-ds-css'; s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------------- sortable enterprise tables ---------------- */
  // Click a header to sort the visible rows (numeric-aware, ₹/%/, tolerant).
  // Row identity is untouched: each <tr> keeps its data-row-idx, so row-detail,
  // drag-and-drop and filters keep working on the sorted view.
  function cellVal(tr, i) {
    const td = tr.children[i]; if (!td) return '';
    return (td.textContent || '').trim();
  }
  function numOf(v) {
    const n = parseFloat(String(v).replace(/[₹,%\s]/g, '').replace(/,/g, ''));
    return isFinite(n) && /^[\s₹%+-]*[\d.,]+[\s%]*$/.test(v) ? n : null;
  }
  document.addEventListener('click', e => {
    const th = e.target.closest && e.target.closest('table.sample thead th');
    if (!th) return;
    const table = th.closest('table.sample');
    const tbody = table && table.tBodies[0];
    if (!tbody || tbody.rows.length < 2) return;
    const idx = Array.prototype.indexOf.call(th.parentNode.children, th);
    const dir = th.classList.contains('ds-sort-asc') ? -1 : 1;
    th.parentNode.querySelectorAll('th').forEach(h => { h.classList.remove('ds-sort-asc', 'ds-sort-desc'); });
    th.classList.add(dir === 1 ? 'ds-sort-asc' : 'ds-sort-desc');
    if (!th.querySelector('.ds-arrow')) th.insertAdjacentHTML('beforeend', '<span class="ds-arrow">▲</span>');
    // expander panel rows must travel with their data row
    const rows = Array.from(tbody.rows).filter(r => !r.classList.contains('expand-panel-row'));
    const panels = {};
    Array.from(tbody.querySelectorAll('tr.expand-panel-row')).forEach(p => { panels[p.getAttribute('data-row-idx')] = p; });
    rows.sort((a, b) => {
      const va = cellVal(a, idx), vb = cellVal(b, idx);
      const na = numOf(va), nb = numOf(vb);
      if (na != null && nb != null) return (na - nb) * dir;
      return va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
    rows.forEach(r => {
      tbody.appendChild(r);
      const p = panels[r.getAttribute('data-row-idx')];
      if (p) tbody.appendChild(p);
    });
  }, true);
  // mark headers as sortable on hover-time (cheap, idempotent)
  document.addEventListener('mouseover', e => {
    const th = e.target.closest && e.target.closest('table.sample thead th');
    if (th && !th.classList.contains('ds-sortable')) {
      th.classList.add('ds-sortable');
      th.title = 'Click to sort';
      if (!th.querySelector('.ds-arrow')) th.insertAdjacentHTML('beforeend', '<span class="ds-arrow">▲</span>');
    }
  }, true);

  /* ---------------- keyboard: '/' focuses the row filter ---------------- */
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (document.body.classList.contains('locked')) return;
    const stream = document.getElementById('niyStream');
    if (stream && !stream.hidden) return; // Stream hub has its own '/'
    const t = document.getElementById('rowFilter') || document.querySelector('.search-input, #globalSearch input, .topbar input[type=text]');
    if (t && !t.disabled) { e.preventDefault(); t.focus(); }
  });

  // (empty-state coaching removed — it misfired on data features mid-render
  // and read as disclaimer clutter; the app's own "DATA PIPELINE PENDING"
  // callouts already cover BETA features.)
  document.querySelectorAll('.ds-empty-hint').forEach(n => n.remove());

  /* ---------------- idle warm-up of the sidebar signal cache ----------------
     The first visit to a tier pays the aggregate-signal computation for its
     CSVs (seconds for the big ones). Precompute them one CSV at a time on
     idle ticks after load, so every tab switch — including the first — is
     instant, and sidebar dots appear without needing a visit. */
  setTimeout(async function warmSignals() {
    try {
      if (typeof TIERS === 'undefined' || typeof loadCSV !== 'function' || typeof worstSignal !== 'function') return;
      window.__niyAggSig = window.__niyAggSig || {};
      const jobs = [];
      Object.keys(TIERS).forEach(t => (TIERS[t] || []).forEach(f => { if (f.dataSource && f.dataSource.csv) jobs.push(f); }));
      for (const f of jobs) {
        try {
          const rows = await loadCSV(f.dataSource.csv);
          const aggKey = f.dataSource.csv + '|' + f.archetype + '|' + rows.length;
          if (!(aggKey in window.__niyAggSig)) {
            // row-chunked: one 8k-row computeSignal pass is itself a ~600ms
            // main-thread task — the very freeze this warmup exists to avoid
            let worst = null;
            for (let ri = 0; ri < rows.length; ri += 600) {
              const part = rows.slice(ri, ri + 600).map(row => computeSignal(f.archetype, row, f.dataSource.csv, rows));
              part.push(worst);
              worst = worstSignal(part);
              if (typeof niyYield === 'function') await niyYield(); else await new Promise(r => setTimeout(r, 0));
            }
            window.__niyAggSig[aggKey] = worst;
          }
        } catch (e) { }
        await new Promise(r => setTimeout(r, 120)); // breathe between CSVs
      }
      try { renderSidebar(); } catch (e) { } // refresh dots once everything is warm
    } catch (e) { }
  }, 2500);

  /* ---------------- ⌘K command palette ----------------
     One keystroke to any tier, feature, Stream module or Studio pane —
     replaces 2–4 clicks of tab + sidebar navigation. Classic-script
     top-level bindings (activeTier, TIERS, renderAll…) share the global
     lexical scope, so navigation writes them directly. */
  const CK = { open: false, sel: 0, items: [], recents: [] };
  try { CK.recents = JSON.parse(localStorage.getItem('niyCmdKRecents') || '[]'); } catch (e) { }

  function ckIndex() {
    const out = [];
    try {
      const tiers = (typeof TIER_LABEL !== 'undefined') ? TIER_LABEL : {};
      Object.keys(tiers).forEach(t => {
        out.push({ id: 'tier:' + t, badge: (typeof TIER_CODE !== 'undefined' && TIER_CODE[t]) || 'GO', t: tiers[t].charAt(0) + tiers[t].slice(1).toLowerCase(), sub: 'Section', sec: 'SECTIONS', run: () => ckGoTier(t) });
        if (t === 'datastudio') return;
        try {
          (featuresForTier(t) || []).forEach((f, i) => {
            out.push({ id: 'feat:' + t + ':' + i, badge: (typeof TIER_CODE !== 'undefined' && TIER_CODE[t]) || '·', t: f.feature, sub: f.bucket + (f.dataSource ? '' : ' · beta'), sec: 'FEATURES', run: () => ckGoFeature(t, i) });
          });
        } catch (e) { }
      });
    } catch (e) { }
    try {
      if (window.NiyStream) (window.NiyStream.Stream.mods || []).forEach(m => {
        out.push({ id: 'stream:' + m.id, badge: '◉', t: m.title, sub: 'Stream · newsroom', sec: 'STREAM', run: () => { window.NiyStream.open(); setTimeout(() => window.NiyStream.launch(m.id), 60); } });
      });
    } catch (e) { }
    ['canvas|Canvas board', 'overview|Overview', 'tables|Tables & datasets', 'assistant|AI research assistant', 'ppt|Slides', 'sheets|Sheets', 'saved|Saved'].forEach(p => {
      const [pane, label] = p.split('|');
      out.push({ id: 'studio:' + pane, badge: 'ST', t: label, sub: 'Studio', sec: 'STUDIO', run: () => { ckGoTier('datastudio'); setTimeout(() => { try { switchStudioPane(pane); } catch (e) { } }, 120); } });
    });
    out.push({ id: 'act:theme', badge: '◐', t: 'Toggle light / dark theme', sub: 'Action', sec: 'ACTIONS', run: () => { try { const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; if (typeof applyTheme === 'function') applyTheme(cur); else document.documentElement.setAttribute('data-theme', cur); } catch (e) { } } });
    out.push({ id: 'act:csv', badge: '⤓', t: 'Export current table as CSV', sub: 'Action', sec: 'ACTIONS', run: () => { const b = document.getElementById('exportCsvBtn'); if (b && !b.disabled) b.click(); } });
    out.push({ id: 'act:ai', badge: '✦', t: 'Ask AI about this feature', sub: 'Action', sec: 'ACTIONS', run: () => { const b = document.getElementById('featAskAi') || document.getElementById('globalAiBtn'); if (b) b.click(); } });
    return out;
  }
  function ckGoTier(t) {
    try { if (window.NiyStream && window.NiyStream.Stream.open) window.NiyStream.close(); } catch (e) { }
    try { const tab = document.querySelector('.tab[data-tier="' + t + '"]'); if (tab) tab.click(); } catch (e) { }
  }
  function ckGoFeature(t, i) {
    ckGoTier(t);
    try { activeIndex = i; renderAll(); } catch (e) { }
  }
  function ckScore(item, q) {
    const hay = (item.t + ' ' + item.sub).toLowerCase();
    if (!q) return 0;
    const ix = hay.indexOf(q);
    if (ix >= 0) return 100 - ix - hay.length * 0.05;
    // subsequence match
    let hi = 0, hits = 0;
    for (const ch of q) { const f = hay.indexOf(ch, hi); if (f < 0) return -1; hi = f + 1; hits++; }
    return 40 - hay.length * 0.05;
  }
  function ckBuild() {
    if (document.getElementById('niyCmdK')) return;
    const ov = document.createElement('div'); ov.id = 'niyCmdK';
    ov.innerHTML = '<div class="ck-box"><div class="ck-inrow"><span class="glyph">⌕</span><input id="ckIn" placeholder="Jump to any section, feature, Stream module…" autocomplete="off" spellcheck="false"/><span class="ck-kbd">esc</span></div><div class="ck-list" id="ckList"></div><div class="ck-foot"><span>↑↓ navigate</span><span>↵ open</span><span>ctrl K toggle</span></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ckClose(); });
    ov.querySelector('#ckIn').addEventListener('input', () => ckRender());
    ov.querySelector('#ckIn').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { CK.sel = Math.min(CK.items.length - 1, CK.sel + 1); ckPaint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { CK.sel = Math.max(0, CK.sel - 1); ckPaint(); e.preventDefault(); }
      else if (e.key === 'Enter') { ckRun(CK.sel); e.preventDefault(); }
      else if (e.key === 'Escape') { ckClose(); e.stopPropagation(); }
    });
  }
  function ckOpen() {
    ckBuild();
    CK.all = ckIndex(); CK.open = true; CK.sel = 0;
    const ov = document.getElementById('niyCmdK');
    ov.classList.add('show');
    const inp = ov.querySelector('#ckIn'); inp.value = ''; inp.focus();
    ckRender();
  }
  function ckClose() { const ov = document.getElementById('niyCmdK'); if (ov) ov.classList.remove('show'); CK.open = false; }
  function ckRender() {
    const q = (document.getElementById('ckIn').value || '').trim().toLowerCase();
    let list;
    if (!q) {
      const rec = CK.recents.map(id => CK.all.find(x => x.id === id)).filter(Boolean).map(x => Object.assign({}, x, { sec: 'RECENT' }));
      list = rec.concat(CK.all.filter(x => x.sec === 'SECTIONS' || x.sec === 'STREAM' || x.sec === 'ACTIONS'));
    } else {
      list = CK.all.map(x => [ckScore(x, q), x]).filter(p => p[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, 24).map(p => p[1]);
    }
    CK.items = list; CK.sel = 0;
    ckPaint();
  }
  function ckPaint() {
    const box = document.getElementById('ckList');
    if (!CK.items.length) { box.innerHTML = '<div class="ck-empty">No matches — try a feature name, section or module.</div>'; return; }
    let html = '', lastSec = '';
    CK.items.forEach((it, i) => {
      if (it.sec !== lastSec) { html += '<div class="ck-sec">' + it.sec + '</div>'; lastSec = it.sec; }
      html += '<button class="ck-item' + (i === CK.sel ? ' sel' : '') + '" data-i="' + i + '" type="button"><span class="ck-badge">' + it.badge + '</span><span class="ck-t">' + it.t.replace(/</g, '&lt;') + '</span><span class="ck-sub">' + it.sub.replace(/</g, '&lt;') + '</span></button>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.ck-item').forEach(b => {
      b.addEventListener('click', () => ckRun(+b.dataset.i));
      b.addEventListener('mousemove', () => { if (CK.sel !== +b.dataset.i) { CK.sel = +b.dataset.i; ckPaint(); } });
    });
    const sel = box.querySelector('.ck-item.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function ckRun(i) {
    const it = CK.items[i]; if (!it) return;
    ckClose();
    CK.recents = [it.id].concat(CK.recents.filter(x => x !== it.id)).slice(0, 6);
    try { localStorage.setItem('niyCmdKRecents', JSON.stringify(CK.recents)); } catch (e) { }
    try { it.run(); } catch (e) { }
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      if (document.body.classList.contains('locked')) return;
      e.preventDefault();
      CK.open ? ckClose() : ckOpen();
    }
  }, true);
  // discoverability: a slim ⌘K chip beside the header actions
  (function hint() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const anchor = document.getElementById('niyLiveTvBtn') || document.getElementById('refreshBtn');
      if (anchor && !document.getElementById('niyCmdKHint')) {
        const b = document.createElement('button');
        b.id = 'niyCmdKHint'; b.type = 'button'; b.className = 'ck-kbd';
        b.style.cssText = 'cursor:pointer;background:transparent;color:var(--fg-dim)';
        b.textContent = '⌘ K'; b.title = 'Command palette — jump anywhere (Ctrl+K)';
        b.addEventListener('click', ckOpen);
        anchor.parentNode.insertBefore(b, anchor);
        clearInterval(t);
      }
      if (tries > 80) clearInterval(t);
    }, 300);
  })();
  try { window.NiyCmdK = { open: ckOpen, close: ckClose, index: ckIndex }; } catch (e) { }
})();
