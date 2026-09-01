
/* Niyantran — customizable tab bar.
   The 9 tiers (Geopolitics … Studio) can be shown/hidden and reordered per user.
   A single "+" control at the end of the bar opens a panel that lists every
   tier with a drag handle and an eye toggle. Choices persist in the browser.
   The tabs use delegated clicks, so reordering the buttons and toggling
   display:none is safe — no listeners to rebind. */
(function () {
  'use strict';
  if (window.NiyTabs) return;

  var LS = 'niyTabPref';
  var ICONS = { geopolitics: '🌐', national: '🏛', state: '📍', local: '⊞', judiciary: '⚖', finance: '📈', climate: '☘', ndesk: '📡', datastudio: '◲' };

  function tabsWrap() { return document.querySelector('.tabs'); }
  function allTiers() {
    var w = tabsWrap(); if (!w) return [];
    return [].slice.call(w.querySelectorAll('.tab[data-tier]')).map(function (t) { return t.getAttribute('data-tier'); });
  }
  function labelOf(tier) {
    var w = tabsWrap(); if (!w) return tier;
    var t = w.querySelector('.tab[data-tier="' + tier + '"]');
    return t ? ((t.querySelector('.tab-label') || {}).textContent || tier).trim() : tier;
  }
  function isBeta(tier) {
    var w = tabsWrap(); var t = w && w.querySelector('.tab[data-tier="' + tier + '"]');
    return !!(t && t.querySelector('.beta-badge'));
  }

  function getPref() {
    var all = allTiers();
    var def = { order: all.slice(), hidden: [] };
    try {
      var p = JSON.parse(localStorage.getItem(LS) || 'null');
      if (!p || !p.order) return def;
      // reconcile with reality: keep only known tiers, append any new ones
      var order = p.order.filter(function (x) { return all.indexOf(x) > -1; });
      all.forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });
      var hidden = (p.hidden || []).filter(function (x) { return all.indexOf(x) > -1; });
      return { order: order, hidden: hidden };
    } catch (e) { return def; }
  }
  function savePref(p) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) { } }

  function applyPref() {
    var w = tabsWrap(); if (!w) return;
    var p = getPref();
    var btn = document.getElementById('niyTabAdd');
    // reorder — insert each tab before the add-button so it stays last
    p.order.forEach(function (tier) {
      var t = w.querySelector('.tab[data-tier="' + tier + '"]');
      if (t) w.insertBefore(t, btn || null);
    });
    // show/hide
    allTiers().forEach(function (tier) {
      var t = w.querySelector('.tab[data-tier="' + tier + '"]');
      if (t) t.style.display = p.hidden.indexOf(tier) > -1 ? 'none' : '';
    });
    // never orphan the user on a hidden active tab
    var active = w.querySelector('.tab.active');
    if (active && active.style.display === 'none') {
      var firstVis = [].slice.call(w.querySelectorAll('.tab[data-tier]')).filter(function (t) { return t.style.display !== 'none'; })[0];
      if (firstVis) firstVis.click();
    }
    var addBtn = document.getElementById('niyTabAdd');
    if (addBtn) addBtn.dataset.hidden = p.hidden.length ? p.hidden.length : '';
  }

  /* ---------------- the panel ---------------- */
  var pop = null;
  function buildPop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.className = 'niy-tabpop'; pop.id = 'niyTabPop'; pop.hidden = true;
    document.body.appendChild(pop);
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    return pop;
  }
  function renderPop() {
    var p = getPref(), el = buildPop();
    var visCount = allTiers().length - p.hidden.length;
    el.innerHTML = '<div class="niy-tabpop-h">Customise tabs<span>drag to reorder · tap the eye to show/hide</span></div>'
      + '<div class="niy-tabpop-list">' + p.order.map(function (tier) {
        var hidden = p.hidden.indexOf(tier) > -1;
        return '<div class="niy-tabrow' + (hidden ? ' off' : '') + '" draggable="true" data-tier="' + tier + '">'
          + '<span class="niy-tabrow-grip">⠿</span>'
          + '<span class="niy-tabrow-ico">' + (ICONS[tier] || '•') + '</span>'
          + '<span class="niy-tabrow-lbl">' + labelOf(tier) + (isBeta(tier) ? ' <em>beta</em>' : '') + '</span>'
          + '<button class="niy-tabrow-eye" type="button" title="' + (hidden ? 'Show' : 'Hide') + '" aria-label="' + (hidden ? 'Show' : 'Hide') + '">' + (hidden ? '◌' : '●') + '</button>'
          + '</div>';
      }).join('') + '</div>'
      + '<div class="niy-tabpop-f"><span>' + visCount + ' shown</span><button type="button" id="niyTabReset">Reset</button></div>';

    // eye toggles
    el.querySelectorAll('.niy-tabrow-eye').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var tier = b.closest('.niy-tabrow').dataset.tier;
        var pr = getPref(), i = pr.hidden.indexOf(tier);
        if (i > -1) pr.hidden.splice(i, 1);
        else {
          if (allTiers().length - pr.hidden.length <= 1) { flash(el); return; } // keep ≥1
          pr.hidden.push(tier);
        }
        savePref(pr); applyPref(); renderPop();
      });
    });
    wireDrag(el);
    var reset = el.querySelector('#niyTabReset');
    if (reset) reset.addEventListener('click', function () { try { localStorage.removeItem(LS); } catch (e) { } applyPref(); renderPop(); });
  }
  function flash(el) {
    var f = el.querySelector('.niy-tabpop-f'); if (!f) return;
    f.style.transition = 'none'; f.style.color = 'var(--bad,#ff6f6f)';
    setTimeout(function () { f.style.transition = 'color .5s'; f.style.color = ''; }, 30);
  }

  /* drag reorder within the panel (rows, not the tab buttons — safer) */
  function wireDrag(el) {
    var dragging = null;
    el.querySelectorAll('.niy-tabrow').forEach(function (row) {
      row.addEventListener('dragstart', function (e) { dragging = row; row.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; } catch (x) { } });
      row.addEventListener('dragend', function () { if (dragging) dragging.classList.remove('drag'); dragging = null; commitOrder(el); });
      row.addEventListener('dragover', function (e) {
        e.preventDefault(); if (!dragging || dragging === row) return;
        var r = row.getBoundingClientRect();
        var after = (e.clientY - r.top) > r.height / 2;
        row.parentNode.insertBefore(dragging, after ? row.nextSibling : row);
      });
    });
  }
  function commitOrder(el) {
    var order = [].slice.call(el.querySelectorAll('.niy-tabrow')).map(function (r) { return r.dataset.tier; });
    var pr = getPref(); pr.order = order; savePref(pr); applyPref();
  }

  function openPop() {
    renderPop();
    var btn = document.getElementById('niyTabAdd'); var r = btn.getBoundingClientRect();
    pop.hidden = false;
    var w = pop.offsetWidth || 250;
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
  }
  function closePop() { if (pop) pop.hidden = true; }

  function mountBtn() {
    var w = tabsWrap(); if (!w || document.getElementById('niyTabAdd')) return true;
    var b = document.createElement('button');
    b.id = 'niyTabAdd'; b.type = 'button'; b.className = 'niy-tab-add';
    b.title = 'Customise tabs — show, hide and reorder';
    b.setAttribute('aria-label', 'Customise tabs');
    b.innerHTML = '<span>+</span>';
    b.addEventListener('click', function (e) { e.stopPropagation(); if (pop && !pop.hidden) closePop(); else openPop(); });
    w.appendChild(b);
    return true;
  }

  /* ---------------- styles ---------------- */
  function css() {
    if (document.getElementById('niy-tabs-css')) return;
    var s = document.createElement('style'); s.id = 'niy-tabs-css';
    s.textContent = [
      '.tabs{position:relative}',
      '.niy-tab-add{flex:0 0 auto;position:sticky;right:0;align-self:stretch;min-width:34px;background:var(--panel,#12151b);border:0;border-left:1px solid var(--line,#232a33);color:var(--fg-dim,#98a3af);font-size:17px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;z-index:3}',
      '.niy-tab-add:hover{color:var(--ds-accent,#7fb0ff)}',
      '.niy-tab-add[data-hidden]:not([data-hidden=""])::after{content:attr(data-hidden);position:absolute;top:4px;right:3px;font:700 8px var(--font-mono,monospace);color:var(--ds-accent,#7fb0ff)}',
      '.niy-tabpop{position:fixed;z-index:9999;width:250px;background:#12161c;border:1px solid var(--line2,#333c48);border-radius:12px;box-shadow:0 18px 46px rgba(0,0,0,.6);overflow:hidden}',
      '.niy-tabpop[hidden]{display:none}',
      '.niy-tabpop-h{padding:11px 13px 8px;font:700 11px var(--font-display,system-ui,sans-serif);color:var(--fg,#e9edf2);display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--line,#232a33)}',
      '.niy-tabpop-h span{font:500 9.5px var(--font-mono,ui-monospace,monospace);letter-spacing:.02em;color:var(--fg-faint,#606a77);text-transform:none}',
      '.niy-tabpop-list{padding:5px;max-height:60vh;overflow-y:auto}',
      '.niy-tabrow{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:8px;cursor:grab;user-select:none}',
      '.niy-tabrow:hover{background:rgba(255,255,255,.05)}',
      '.niy-tabrow.drag{opacity:.5;background:rgba(127,176,255,.12)}',
      '.niy-tabrow.off{opacity:.45}',
      '.niy-tabrow-grip{color:var(--fg-faint,#5f6873);font-size:12px;cursor:grab}',
      '.niy-tabrow-ico{width:18px;text-align:center;font-size:13px}',
      '.niy-tabrow-lbl{flex:1;font:600 12.5px var(--font-display,system-ui,sans-serif);color:var(--fg,#e9edf2);white-space:nowrap}',
      '.niy-tabrow-lbl em{font-style:normal;font:700 8px var(--font-mono,monospace);letter-spacing:.06em;color:var(--warn,#f0b429);vertical-align:1px;margin-left:3px}',
      '.niy-tabrow-eye{background:transparent;border:1px solid var(--line,#232a33);color:var(--fg-dim,#98a3af);width:24px;height:22px;border-radius:6px;cursor:pointer;font-size:10px;flex:none}',
      '.niy-tabrow.off .niy-tabrow-eye{color:var(--fg-faint,#5f6873)}',
      '.niy-tabrow-eye:hover{color:var(--ds-accent,#7fb0ff);border-color:var(--line2,#333c48)}',
      '.niy-tabpop-f{display:flex;align-items:center;justify-content:space-between;padding:8px 13px;border-top:1px solid var(--line,#232a33);font:600 10px var(--font-mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint,#606a77)}',
      '.niy-tabpop-f button{background:transparent;border:1px solid var(--line,#232a33);color:var(--fg-dim,#98a3af);border-radius:6px;font:600 9.5px var(--font-mono,monospace);padding:3px 10px;cursor:pointer}',
      '.niy-tabpop-f button:hover{color:var(--fg,#e9edf2)}'
    ].join('');
    document.head.appendChild(s);
  }

  document.addEventListener('click', closePop);

  function boot() {
    css();
    var tries = 0;
    var t = setInterval(function () {
      if (tabsWrap() && mountBtn()) { applyPref(); clearInterval(t); }
      else if (++tries > 80) clearInterval(t);
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NiyTabs = { apply: applyPref, open: openPop, pref: getPref };
})();

