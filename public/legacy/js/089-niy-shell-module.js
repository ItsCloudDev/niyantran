
/* Niyantran — SHELL layer.
   1) Ticker chrome: one small gear. Topics + speed + show/hide all live inside
      it; the loose Topics/speed/focus/collapse buttons are absorbed.
   2) Refresh reduced to its icon.
   3) THE CARD SYSTEM — a row dragged into the AI is rendered as a real card
      carrying its fields, its source link and an INVISIBLE, record-type-aware
      prompt, so the analyst never has to type a multi-line brief. */
(function () {
  'use strict';
  if (document.getElementById('niy-shell-css')) return;

  /* ============================ styles ============================ */
  var s = document.createElement('style');
  s.id = 'niy-shell-css';
  s.textContent = [
    /* --- ticker: one gear, no words --- */
    '#tickerFilterBtn{width:34px;padding:0!important;font-size:13px!important;text-align:center;letter-spacing:0!important}',
    '#tickerSpeedBtn{display:none!important}',
    '.ticker-actions{display:none!important}',
    '.ticker-wrap .ticker-track{margin-left:34px}',
    /* .ticker-wrap is a flex item — height:0 alone loses to the parent's flex
       sizing, so the bar stayed 30px. flex-basis must go to zero too. */
    'body.niy-ticker-collapsed .ticker-wrap{height:0!important;min-height:0!important;max-height:0!important;flex:0 0 0!important;padding:0!important;border-bottom:0!important;overflow:hidden!important}',
    'body.niy-ticker-collapsed .ticker-wrap>*{display:none!important}',
    /* the settings popover */
    '.niy-set-sec{font:700 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint,#606a77);padding:9px 7px 5px}',
    '.niy-set-sec:first-child{padding-top:2px}',
    '.niy-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 7px;border-radius:6px;font-size:12.5px;color:var(--fg,#e8edf2);cursor:pointer}',
    '.niy-set-row:hover{background:rgba(255,255,255,.06)}',
    '.niy-seg2{display:flex;gap:4px}',
    '.niy-seg2 button{background:transparent;border:1px solid var(--line,#262626);color:var(--fg-dim,#98a3af);border-radius:6px;font:600 10.5px var(--font-mono,ui-monospace,monospace);padding:3px 10px;cursor:pointer}',
    '.niy-seg2 button.on{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
    '.niy-set-div{height:1px;background:var(--line,#262626);margin:6px 2px}',

    /* --- refresh: icon only --- */
    /* the label is a child <span id="refreshLabel">, not a text node */
    '#refreshBtn{width:32px;padding:0!important;justify-content:center;overflow:hidden;white-space:nowrap}',
    '#refreshBtn #refreshLabel,#refreshBtn .niy-lbl{display:none!important}',

    /* --- THE CARD: one dense line each, details on demand.
       Full panels per card ate the whole workspace (~220px each). --- */
    '.niy-cards{border:1px solid var(--line,#262626);border-radius:8px;overflow:hidden;max-height:34vh;overflow-y:auto}',
    '.niy-card{display:block;border-bottom:1px solid var(--line,#262626)}',
    '.niy-card:last-child{border-bottom:0}',
    '.niy-card-hd{display:flex;align-items:center;gap:7px;padding:5px 8px;cursor:pointer}',
    '.niy-card-hd:hover{background:rgba(255,255,255,.045)}',
    '.niy-card-cx{color:var(--fg-faint,#68717b);font-size:8px;flex:none;transition:transform .12s}',
    '.niy-card.open .niy-card-cx{transform:rotate(90deg)}',
    '.niy-card-tier{font:700 8px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;color:var(--ds-accent,#7fb0ff);flex:none}',
    '.niy-card-title{font:600 11.5px var(--font-display,system-ui,sans-serif);color:var(--fg,#e8edf2);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.niy-card-pdf{font:600 8px var(--font-mono,ui-monospace,monospace);color:#48d17f;flex:none}',
    '.niy-card-x{background:transparent;border:0;color:var(--fg-faint,#5f6873);font-size:14px;line-height:1;cursor:pointer;padding:0 1px;flex:none}',
    '.niy-card-x:hover{color:var(--bad,#ff6f6f)}',
    '.niy-card-body{display:none;padding:0 9px 8px 22px}',
    '.niy-card.open .niy-card-body{display:block}',
    '.niy-card-fields{display:grid;grid-template-columns:auto 1fr;gap:2px 9px;margin:0 0 5px;font-size:10.5px}',
    '.niy-card-fields dt{color:var(--fg-faint,#68717b);font-family:var(--font-mono,ui-monospace,monospace);font-size:9px;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}',
    '.niy-card-fields dd{margin:0;color:var(--fg-dim,#c3cbd4);word-break:break-word;font-variant-numeric:tabular-nums}',
    '.niy-card-src{font:600 8.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.05em;color:var(--fg-faint,#5f6873)}',
    '.niy-card-src a{color:var(--ds-accent,#7fb0ff);text-decoration:none}',
    /* one shared suggestion row for all attached cards, not one per card */
    '.niy-sugg{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}',
    '.niy-ask{background:transparent;border:1px solid var(--line2,#333c48);color:var(--fg-dim,#98a3af);border-radius:999px;font:600 10px var(--font-display,system-ui,sans-serif);padding:2px 9px;cursor:pointer;white-space:nowrap}',
    '.niy-ask:hover{color:#0b0f14;background:var(--ds-accent,#7fb0ff);border-color:transparent}',
    '.niy-cards-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}',
    '.niy-cards-hd span{font:600 9px var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint,#68717b)}',
    '.niy-cards-hd button{background:transparent;border:1px solid var(--line,#262626);color:var(--fg-dim,#98a3af);border-radius:5px;font-size:9.5px;padding:1px 8px;cursor:pointer}',

    /* --- DENSITY PASS ---------------------------------------------------
       Standing rules, not one-off trims:
       (a) a control that has a clear icon does not also need a word,
       (b) metadata chips that repeat what the navigation already says are cut,
       (c) empty states name themselves, they do not explain themselves,
       (d) placeholders are hints, not sentences.                        */

    /* (b) the bucket tag repeats the sidebar group; access flags (REG/INTERNAL)
       are internal vocabulary that means nothing to a reader */
    '#detail .detail-head .tags{display:none!important}',
    '#detail .access-flag,#detail .flag-reg{display:none!important}',

    /* (c) empty state: keep the label, drop the paragraph */
    '.niy-ai-empty-d{display:none!important}',
    '.niy-ai-empty-t{font:600 10px var(--font-mono,ui-monospace,monospace)!important;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint,#606a77)!important}',
    '.niy-ai-empty{padding:14px 0!important}',
    '.niy-ai-drop-hint{font:500 10.5px var(--font-mono,ui-monospace,monospace)!important;color:var(--fg-faint,#5f6873)!important;padding:9px!important}',

    /* compact toolbar + pane controls (were 28-38px tall) */
    '#detail .toolbar .toolbar-btn{padding:3px 9px!important;font-size:10.5px!important;height:24px!important;min-height:0!important;line-height:1!important}',
    '#detail .toolbar .filter-input{height:24px!important;font-size:11px!important;padding-top:0!important;padding-bottom:0!important}',
    '#detail .toolbar .column-filter-select{height:24px!important;font-size:10.5px!important;padding:0 6px!important}',
    '#detail .niy-work-modes button{padding:2px 9px!important;font-size:10px!important;height:22px!important;min-height:0!important}',
    /* min-height:0 here collapsed .niy-col-head to 11px while its 13px label
       needed more — that is the "text cut in half" the user saw. Give the row
       a floor and the label a real line-height. */
    '#detail .niy-col-head,#detail .niy-work-head{min-height:20px;display:flex;align-items:center}',
    '#detail .niy-col-title{line-height:1.4!important;overflow:visible!important}',
    /* line-height == font-size clips the glyph box (descenders/digits). Never
       set them equal. These two were cutting text: the finance VIX figure and
       the card close button. */
    '#detail .fin-vix-v,#detail [class*=-v]{line-height:1.15!important}',
    '.niy-card-x{line-height:1.15!important;height:auto!important}',

    /* row rhythm: 19.5px line-height on 13px text made the gap between bills
       too wide. 13px/1.35 + 4px padding = ~26px rows. */
    '#detail table.sample tbody td{padding-top:4px!important;padding-bottom:4px!important;line-height:1.35!important}',
    '#detail table.sample thead th{padding-top:4px!important;padding-bottom:4px!important}',

    /* (a) the composer: globe needs no caption, and the row is one height */
    '.ai-web-toggle .aiwt-lbl{display:none!important}',
    '.ai-web-toggle{width:30px!important;min-width:0!important;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center;height:30px!important}',
    '.niy-ai-send{height:30px!important;min-height:0!important;padding:0 13px!important;font-size:11px!important}',
    '#detail .niy-pane-ai textarea,#detail .niy-pane-ai input[type=text]{min-height:30px!important;font-size:12px!important;padding:6px 9px!important}',

    /* the source link was a 151px sentence */
    '#detail .niy-src-link,#detail a[class*=source]{font-size:10px!important}'

  ].join('');
  document.head.appendChild(s);

  /* ===================== 1 · ticker settings ===================== */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  // two speeds only — Normal and Slow (read-for-comprehension)
  function setSpeeds() {
    try {
      if (typeof TICKER_SPEEDS === 'undefined') return false;
      TICKER_SPEEDS.length = 0;
      TICKER_SPEEDS.push({ k: 'normal', label: 'Normal', mult: 1 }, { k: 'slow', label: 'Slow', mult: 0.42 });
      tickerSpeedIdx = lsGet('niyTickerSpeed', 'normal') === 'slow' ? 1 : 0;
      return true;
    } catch (e) { return false; }
  }
  function applySpeed(k) {
    lsSet('niyTickerSpeed', k);
    try { tickerSpeedIdx = (k === 'slow') ? 1 : 0; } catch (e) { }
    syncSettings();
  }
  function tickerHidden() { return document.body.classList.contains('niy-ticker-collapsed'); }
  function setTickerHidden(on) {
    document.body.classList.toggle('niy-ticker-collapsed', !!on);
    lsSet('niyTickerCollapsed', on ? '1' : '0');
    try { window.dispatchEvent(new Event('resize')); } catch (e) { }
    syncSettings();
  }

  function syncSettings() {
    var pop = document.getElementById('tickerFilterPop'); if (!pop) return;
    var cur = lsGet('niyTickerSpeed', 'normal');
    pop.querySelectorAll('.niy-seg2 button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === cur); });
    var t = pop.querySelector('#niySetHide'); if (t) t.textContent = tickerHidden() ? 'Show' : 'Hide';
  }

  // fold speed + show/hide into the existing Topics popover, and turn the
  // button into a bare gear
  function upgradeSettings() {
    var btn = document.getElementById('tickerFilterBtn'), pop = document.getElementById('tickerFilterPop');
    if (!btn || !pop) return false;
    btn.textContent = '⚙';
    btn.title = 'Ticker settings — topics, speed, show/hide';
    btn.setAttribute('aria-label', 'Ticker settings');
    if (pop.dataset.niyShell) return true;

    var head = document.createElement('div');
    head.innerHTML =
      '<div class="niy-set-sec">Live ticker</div>' +
      '<div class="niy-set-row"><span>Speed</span><span class="niy-seg2">' +
      '<button type="button" data-s="normal">Normal</button><button type="button" data-s="slow">Slow</button></span></div>' +
      '<div class="niy-set-row" id="niySetHideRow"><span>Ticker</span><span class="niy-seg2"><button type="button" id="niySetHide">Hide</button></span></div>' +
      '<div class="niy-set-div"></div><div class="niy-set-sec">Topics</div>';
    pop.insertBefore(head, pop.firstChild);
    // the original "Live ticker topics" heading is now redundant
    var oldH = pop.querySelector('.tfp-h'); if (oldH) oldH.style.display = 'none';

    head.querySelectorAll('.niy-seg2 button[data-s]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); applySpeed(b.dataset.s); });
    });
    head.querySelector('#niySetHide').addEventListener('click', function (e) {
      e.stopPropagation(); setTickerHidden(!tickerHidden());
    });
    pop.dataset.niyShell = '1';
    syncSettings();
    return true;
  }

  /* restore the persisted collapse state (the old inline toggle is hidden now) */
  function applyPersisted() {
    document.body.classList.toggle('niy-ticker-collapsed', lsGet('niyTickerCollapsed', '0') === '1');
  }

  /* ===================== 2 · refresh, icon only ===================== */
  function shrinkRefresh() {
    var b = document.getElementById('refreshBtn'); if (!b || b.dataset.niyShrunk) return !!b;
    // keep the label in the DOM for a11y, just hide it visually
    b.childNodes.forEach && [].slice.call(b.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        var sp = document.createElement('span'); sp.className = 'niy-lbl'; sp.textContent = n.textContent;
        b.replaceChild(sp, n);
      }
    });
    b.title = (b.title || 'Refresh the current view');
    b.setAttribute('aria-label', 'Refresh');
    b.dataset.niyShrunk = '1';
    return true;
  }

  /* ===================== 3 · THE CARD SYSTEM ===================== */
  // An invisible, record-type-aware brief. This is the point: the analyst drags
  // a row and asks "why does this matter?" — the terminal supplies the rest.
  function cardPrompt(c) {
    var f = (c.feature || '').toLowerCase(), csv = (c.csv || '').toLowerCase(), tier = (c.tier || '').toLowerCase();
    if (/war|conflict/.test(f) || /war_tracker/.test(csv))
      return 'These are news reports. For each: state what is reported, separate confirmed fact from claim or allegation, identify the actors, and explain the strategic significance. Open the Link and read the article before answering. Cite the outlet and timestamp.';
    if (/bill|legislat|policy pipeline|gazette/.test(f))
      return 'These are legislative records. For each: explain in plain English what the bill does, who it affects, its current stage, and the realistic path and blockers to passage. Cite the bill by name.';
    if (/judg|order|court|case|tribunal/.test(f) || tier === 'judiciary')
      return 'These are court records. For each: identify the parties, the question before the court, the holding, and what changes as a result. If a source PDF is attached, read it fully and quote the operative paragraph. Cite the case and date.';
    if (/tender|procure/.test(f))
      return 'These are procurement records. For each: summarise scope, value, deadline and eligibility, and flag anything unusual about the terms, timing or bidder conditions.';
    if (/ship|seaborne|maritime|vessel/.test(f))
      return 'These are vessel records. For each: describe the voyage, cargo class and route, and any chokepoint or sanctions exposure. Departure port and date are not carried in AIS — look them up and say so explicitly if unavailable.';
    if (tier === 'finance' || /market|stock|index|instrument/.test(f))
      return 'These are market records. For each: describe the recent move, the plausible drivers, and what to watch next. Be explicit about what the data does and does not show. Do not give investment advice.';
    if (/company|registry|cin|corporate/.test(f))
      return 'These are corporate registry records. For each: summarise the statutory facts, then flag what an analyst should check — status, capital changes, director overlaps, filing gaps.';
    if (/question|parliament|assembly/.test(f))
      return 'These are parliamentary records. For each: summarise what was asked and answered, what it reveals about government position, and what follow-up is warranted.';
    return 'For each attached record: explain what it shows, why it matters, and what an analyst should check next. Use only the fields present — do not invent values. Cite each record by title.';
  }
  var UNIVERSAL = 'Treat every attached card as a primary source. Never state a figure or fact that is not present in the card fields or in a source you actually fetched. If something is not in the data, say so plainly.';

  function suggestions(c) {
    var f = (c.feature || '').toLowerCase(), tier = (c.tier || '').toLowerCase();
    if (/war|conflict/.test(f) || /war_tracker/.test((c.csv||'').toLowerCase())) return ['What happened?', 'Why it matters', 'Verify this'];
    if (/bill|legislat|policy pipeline|gazette/.test(f)) return ['Explain simply', 'Will it pass?', 'Who is affected?'];
    if (/judg|order|court|case|tribunal/.test(f) || tier === 'judiciary') return ['Summarise the order', 'What changes?', 'Key paragraph'];
    if (/ship|seaborne|vessel|maritime/.test(f)) return ['Voyage detail', 'Chokepoint risk'];
    if (tier === 'finance') return ['Explain the move', 'What to watch'];
    if (/company|registry|cin|corporate/.test(f)) return ['Profile this company', 'Red flags'];
    if (/tender|procure/.test(f)) return ['Summarise tender', 'Anything unusual?'];
    return ['Explain this', 'Why does it matter?', 'What next?'];
  }

  function esc2(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  var painting = false;
  var openCards = {};   // title -> expanded, survives repaints
  function renderCards() {
    if (painting) return;                       // our own writes must not re-trigger the observer
    var host = document.querySelector('#detail .niy-pane-ai .niy-ai-context');
    if (!host) return;
    painting = true;
    try { paint(host); } finally { setTimeout(function () { painting = false; }, 0); }
  }
  function paint(host) {
    var cards = (window.NiyAI && window.NiyAI.cards) || [];
    if (!cards.length) {
      host.innerHTML = '<div class="niy-ai-drop-hint">⊕ Drag any row here — it becomes a card the AI already knows how to read</div>';
      return;
    }
    host.innerHTML = '<div class="niy-cards-hd"><span>' + cards.length + ' card' + (cards.length > 1 ? 's' : '') + ' attached</span>'
      + '<button type="button" data-clear="1">Clear</button></div>'
      + '<div class="niy-cards">' + cards.map(function (c, i) {
        var fields = c.fields || {};
        var keys = Object.keys(fields).filter(function (k) {
          var v = String(fields[k] == null ? '' : fields[k]).trim();
          return v && v !== c.title && !/^https?:\/\//i.test(v);
        }).slice(0, 6);
        var link = '';
        Object.keys(fields).forEach(function (k) { if (!link && /^https?:\/\//i.test(String(fields[k] || ''))) link = fields[k]; });
        if (!link && c.pdf_url) link = c.pdf_url;
        var dom = ''; try { dom = link ? new URL(link).hostname.replace(/^www\./, '') : ''; } catch (e) { }
        // collapsed: a single line. expand for the fields.
        return '<div class="niy-card' + (openCards[c.title] ? ' open' : '') + '" data-i="' + i + '">'
          + '<div class="niy-card-hd" data-tog="' + i + '">'
          + '<span class="niy-card-cx">▶</span>'
          + '<span class="niy-card-tier">' + esc2(String(c.tierLabel || c.tier || 'DATA')).toUpperCase().slice(0, 4) + '</span>'
          + '<span class="niy-card-title" title="' + esc2(c.title || '') + '">' + esc2(c.title || '') + '</span>'
          + (c.pdf_url ? '<span class="niy-card-pdf">PDF</span>' : '')
          + '<button class="niy-card-x" type="button" data-rm="' + i + '" aria-label="Remove card">×</button></div>'
          + '<div class="niy-card-body">'
          + (keys.length ? '<dl class="niy-card-fields">' + keys.map(function (k) {
            return '<dt>' + esc2(k) + '</dt><dd>' + esc2(String(fields[k]).slice(0, 180)) + '</dd>';
          }).join('') + '</dl>' : '')
          + '<div class="niy-card-src">' + (link ? '<a href="' + esc2(link) + '" target="_blank" rel="noopener">' + esc2(dom || 'source') + ' ↗</a>' : esc2(c.csv || 'terminal record')) + '</div>'
          + '</div></div>';
      }).join('') + '</div>'
      // one shared suggestion row, derived from the most recent card
      + '<div class="niy-sugg">' + suggestions(cards[cards.length - 1]).slice(0, 3).map(function (q) {
        return '<button class="niy-ask" type="button" data-q="' + esc2(q) + '">' + esc2(q) + '</button>';
      }).join('') + '</div>';

    var clr = host.querySelector('[data-clear]');
    if (clr) clr.addEventListener('click', function () { try { window.NiyAI.clear(); } catch (e) { } });
    host.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); try { window.NiyAI.removeCard(+b.dataset.rm); } catch (e2) { } });
    });
    host.querySelectorAll('[data-tog]').forEach(function (h) {
      h.addEventListener('click', function () {
        var card = h.parentElement, t = (cards[+h.dataset.tog] || {}).title;
        card.classList.toggle('open');
        if (t) { if (card.classList.contains('open')) openCards[t] = 1; else delete openCards[t]; }
      });
    });
    host.querySelectorAll('.niy-ask').forEach(function (b) {
      b.addEventListener('click', function () { ask(b.dataset.q); });
    });
  }

  // a suggestion click sends straight away — the invisible prompt does the work
  function ask(q) {
    var box = document.querySelector('#detail .niy-pane-ai textarea, #detail .niy-pane-ai input[type=text], #aiWorkspaceInput, #globalAiInput');
    if (!box) return;
    box.value = q;
    try { box.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { }
    box.focus();
    var form = box.closest('form');
    var send = (form || document).querySelector('.niy-ai-send,[data-send],button[type=submit]');
    if (send) send.click();
    else box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  /* fold the invisible briefs into what the model actually receives */
  function wrapContext() {
    if (!window.NiyAI || window.NiyAI._niyShellWrapped) return false;
    var orig = window.NiyAI.contextBlock;
    if (typeof orig !== 'function') return false;
    window.NiyAI.contextBlock = function () {
      var base = orig.apply(this, arguments) || '';
      var cards = this.cards || [];
      if (!cards.length) return base;
      var seen = {}, briefs = [];
      cards.forEach(function (c) { var p = cardPrompt(c); if (!seen[p]) { seen[p] = 1; briefs.push(p); } });
      return base + '\n\n=== HOW TO USE THE ATTACHED CARDS (implicit brief — the analyst did not type this) ===\n'
        + briefs.map(function (b) { return '• ' + b; }).join('\n') + '\n• ' + UNIVERSAL;
    };
    window.NiyAI._niyShellWrapped = true;
    return true;
  }

  /* The app's own renderAiContext lives inside a module scope (it is NOT on
     window), so it can't be overridden — it will happily repaint the old chip
     markup. Instead, watch the pane and re-paint whenever what's on screen
     disagrees with the attached cards. */
  function watchAiPane() {
    var det = document.getElementById('detail');
    if (!det || det.dataset.niyCardWatch) return !!det;
    det.dataset.niyCardWatch = '1';
    new MutationObserver(function () {
      trimLabels();            // the AI pane is built lazily, long after boot
      if (painting) return;
      var host = document.querySelector('#detail .niy-pane-ai .niy-ai-context');
      if (!host) return;
      var n = ((window.NiyAI && window.NiyAI.cards) || []).length;
      var shown = host.querySelectorAll('.niy-card').length;
      if (host.querySelector('.niy-ai-chip') || shown !== n) renderCards();
    }).observe(det, { childList: true, subtree: true });
    return true;
  }

  /* ============================ boot ============================ */
  // (d) long placeholders wrapped to two lines inside the input box
  function trimLabels() {
    var inp = document.querySelector('#detail .niy-pane-ai textarea, #detail .niy-pane-ai input[type=text], #niy-ai-input');
    if (inp && inp.placeholder && inp.placeholder.length > 12) inp.placeholder = 'Ask…';
    var g = document.querySelector('#globalAiInput');
    if (g && g.placeholder && g.placeholder.length > 12) g.placeholder = 'Ask…';
    [].forEach.call(document.querySelectorAll('#detail button,#detail a'), function (b) {
      var t = (b.textContent || '').trim();
      if (/^ⓘ?\s*Source\s*&\s*methodolog/i.test(t)) b.textContent = 'ⓘ Source';
    });
  }

  function boot() {
    applyPersisted();
    trimLabels();
    setSpeeds();
    wrapContext();
    watchAiPane();
    var tries = 0;
    var t = setInterval(function () {
      var a = upgradeSettings(), b = shrinkRefresh();
      watchAiPane(); wrapContext(); trimLabels();
      if ((a && b) || ++tries > 80) clearInterval(t);
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NiyShell = { renderCards: renderCards, cardPrompt: cardPrompt, hideTicker: setTickerHidden, speed: applySpeed };
})();

