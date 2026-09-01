
/* ============================================================================
   NIYANTRAN — MARKETS+ (Wave 1): Watchlist · Governance & Markets Calendar ·
   Submit a Tip · grouped Tools menu. Bloomberg-inspired, Signal-Protocol themed,
   browser-only (localStorage) — nothing stored server-side. Does not touch the
   drag-to-AI wiring or the candle renderer.
   ========================================================================== */
(function () {
  'use strict';
  if (window.NiyWatch) return; // idempotent

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t) { try { if (typeof showToast === 'function') { showToast(t); return; } } catch (e) { } var d = document.getElementById('globalToast'); if (!d) { d = document.createElement('div'); d.id = 'globalToast'; d.className = 'toast'; document.body.appendChild(d); } d.textContent = t; d.classList.add('show'); clearTimeout(d._t); d._t = setTimeout(function () { d.classList.remove('show'); }, 3000); }
  function lsGet(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function inr(n) { if (n == null || !isFinite(n)) return '—'; return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pctS(p) { if (p == null) return ''; return (p >= 0 ? '+' : '') + p.toFixed(2) + '%'; }
  function dir(p) { return p == null ? 'flat' : (p > 0 ? 'up' : (p < 0 ? 'down' : 'flat')); }

  function overlay(id) {
    var ov = document.getElementById(id);
    if (!ov) { ov = document.createElement('div'); ov.id = id; ov.className = 'niy-mp-ov'; document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('show'); }); document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('show')) ov.classList.remove('show'); }); }
    return ov;
  }
  function spark(sym, w, h) {
    w = w || 72; h = h || 20;
    var e = window.NIY_OHLC_EMBED && sym && window.NIY_OHLC_EMBED[sym];
    if (!e || !e.c || e.c.length < 3) return '<span class="niy-spark-na">—</span>';
    var c = e.c.slice(-30), lo = Math.min.apply(null, c), hi = Math.max.apply(null, c); if (hi <= lo) hi = lo + 1;
    var n = c.length, pts = []; for (var i = 0; i < n; i++) pts.push(((i / (n - 1)) * w).toFixed(1) + ',' + (h - ((c[i] - lo) / (hi - lo)) * (h - 3) - 1.5).toFixed(1));
    var up = c[n - 1] >= c[0];
    return '<svg class="niy-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (up ? '#26b469' : '#eb5050') + '" stroke-width="1.4"/></svg>';
  }

  /* ---------------- WATCHLIST ---------------- */
  var WKEY = 'niyWatchlist';
  window.NiyWatch = {
    list: function () { return lsGet(WKEY, []); },
    has: function (n) { return this.list().indexOf(n) >= 0; },
    add: function (n) { var l = this.list(); if (l.indexOf(n) < 0) { l.push(n); lsSet(WKEY, l); } },
    remove: function (n) { lsSet(WKEY, this.list().filter(function (x) { return x !== n; })); },
    toggle: function (n) { if (this.has(n)) this.remove(n); else this.add(n); return this.has(n); },
    attachFollow: function (modal, name) {
      if (!modal) return; var old = modal.querySelector('.fin-follow'); if (old) old.remove();
      var b = document.createElement('button'); b.type = 'button'; b.className = 'fin-follow'; var self = this;
      function paint() { var on = self.has(name); b.classList.toggle('on', on); b.innerHTML = (on ? '★ Following' : '☆ Follow'); b.title = on ? 'Remove from Watchlist' : 'Add to Watchlist'; }
      paint(); b.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(name); paint(); toast(self.has(name) ? (name + ' added to Watchlist') : (name + ' removed')); });
      var nameEl = modal.querySelector('.fin-modal-name'); if (nameEl) nameEl.appendChild(b); else modal.insertBefore(b, modal.firstChild);
    },
    open: function () {
      var ov = overlay('niyWatchOv'), l = this.list(), self = this;
      var rows = l.map(function (n) { var s = (window.niyInstrumentSnapshot ? window.niyInstrumentSnapshot(n) : null), d = s ? dir(s.pct) : 'flat';
        return '<tr class="niy-w-row" data-fin="' + esc(n) + '"><td class="niy-w-nm">' + esc(n) + '</td><td class="num">' + (s ? inr(s.last) : '—') + '</td><td class="num ' + d + '">' + (s ? pctS(s.pct) : '') + '</td><td class="niy-w-spark">' + (s ? spark(s.symbol) : '') + '</td><td class="niy-w-rm"><button class="niy-w-x" data-rm="' + esc(n) + '" title="Remove">✕</button></td></tr>';
      }).join('');
      ov.innerHTML = '<div class="niy-mp-modal"><div class="niy-mp-head"><span class="niy-mp-title">★ WATCHLIST</span><span class="niy-mp-sub">' + l.length + ' instrument' + (l.length !== 1 ? 's' : '') + '</span><button class="niy-mp-x" type="button">✕</button></div>'
        + (l.length ? '<div class="niy-w-wrap"><table class="niy-w-table"><thead><tr><th>Instrument</th><th class="num">LTP</th><th class="num">% Chg</th><th>Trend</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<div class="niy-mp-empty">No instruments yet.<br>Open any stock or index in Finance and press <b>☆ Follow</b> to pin it here.</div>')
        + '<div class="niy-mp-foot">Your Watchlist is stored only in this browser — nothing is sent to a server.</div></div>';
      ov.querySelector('.niy-mp-x').addEventListener('click', function () { ov.classList.remove('show'); });
      ov.querySelectorAll('.niy-w-x').forEach(function (x) { x.addEventListener('click', function (e) { e.stopPropagation(); self.remove(x.getAttribute('data-rm')); self.open(); }); });
      ov.querySelectorAll('.niy-w-row').forEach(function (tr) { tr.addEventListener('click', function () { var n = tr.getAttribute('data-fin'); if (typeof window.openFinInstrument === 'function') { ov.classList.remove('show'); window.openFinInstrument(n); } }); });
      ov.classList.add('show');
    }
  };

  /* ---------------- GOVERNANCE & MARKETS CALENDAR ---------------- */
  window.NiyCal = {
    cats: [
      { c: 'Fiscal', t: 'Union Budget', cad: 'Presented in Parliament on 1 February each year (an interim/vote-on-account budget in general-election years).', src: 'https://www.indiabudget.gov.in/', sl: 'indiabudget.gov.in' },
      { c: 'Monetary', t: 'RBI Monetary Policy (MPC)', cad: 'The Monetary Policy Committee meets 6 times per financial year to set the repo rate; the meeting calendar is published in advance.', src: 'https://www.rbi.org.in/Scripts/BS_ViewMonetaryPolicy.aspx', sl: 'rbi.org.in' },
      { c: 'Legislature', t: 'Parliament Sessions', cad: 'Three sessions a year — Budget (Feb–Apr), Monsoon (Jul–Aug), Winter (Nov–Dec); exact sitting dates are notified by the government.', src: 'https://sansad.in/', sl: 'sansad.in' },
      { c: 'Judiciary', t: 'Supreme Court Calendar', cad: 'The Court sits year-round with defined vacations (summer break ~mid-May to end-June, plus a winter break); daily cause lists are published online.', src: 'https://www.sci.gov.in/', sl: 'sci.gov.in' },
      { c: 'Elections', t: 'Election Schedule (ECI)', cad: 'The Election Commission announces poll dates for Lok Sabha, state assemblies and by-polls; counting/results follow on a notified day.', src: 'https://www.eci.gov.in/', sl: 'eci.gov.in' },
      { c: 'Regulatory', t: 'SEBI Board Meetings', cad: 'SEBI’s board meets periodically to clear regulations and reforms; agendas and outcomes are issued as press releases.', src: 'https://www.sebi.gov.in/', sl: 'sebi.gov.in' },
      { c: 'Markets', t: 'NSE Results & Corporate Actions', cad: 'Quarterly earnings season, dividends, board meetings and monthly F&O expiry (last Thursday) drive the market event calendar.', src: 'https://www.nseindia.com/companies-listing/corporate-filings-event-calendar', sl: 'nseindia.com' },
      { c: 'Trade / Climate', t: 'CBAM & India CCTS Milestones', cad: 'The EU CBAM definitive regime phases in from 2026; India’s Carbon Credit Trading Scheme compliance timelines are notified by the ministries.', src: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en', sl: 'europa.eu' }
    ],
    open: function () {
      var ov = overlay('niyCalOv'), self = this;
      var cards = this.cats.map(function (e, i) {
        return '<div class="niy-cal-card"><div class="niy-cal-cat">' + esc(e.c) + '</div><div class="niy-cal-t">' + esc(e.t) + '</div><div class="niy-cal-cad">' + esc(e.cad) + '</div><div class="niy-cal-actions"><a class="niy-cal-src" href="' + esc(e.src) + '" target="_blank" rel="noopener">↗ ' + esc(e.sl) + '</a><button class="niy-cal-ai" data-i="' + i + '" type="button">✦ Exact dates (AI)</button></div></div>';
      }).join('');
      ov.innerHTML = '<div class="niy-mp-modal niy-cal-modal"><div class="niy-mp-head"><span class="niy-mp-title">🗓 GOVERNANCE &amp; MARKETS CALENDAR</span><span class="niy-mp-sub">key recurring events · official sources</span><button class="niy-mp-x" type="button">✕</button></div><div class="niy-cal-grid">' + cards + '</div><div class="niy-mp-foot">The cadence shown is the real recurring schedule; exact dates change each year — use the source link, or ✦ to have the AI fetch confirmed upcoming dates. Nothing fabricated, nothing stored.</div></div>';
      ov.querySelector('.niy-mp-x').addEventListener('click', function () { ov.classList.remove('show'); });
      ov.querySelectorAll('.niy-cal-ai').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var ev = self.cats[+b.getAttribute('data-i')]; ov.classList.remove('show'); var q = 'What are the confirmed upcoming dates for "' + ev.t + '" in India for the current and next few months? List the dates and cite the official source (' + ev.sl + '). If a date is not yet officially announced, say so.'; if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(q); else toast('Open the AI panel to ask'); }); });
      ov.classList.add('show');
    }
  };

  /* ---------------- SUBMIT A TIP ---------------- */
  var TKEY = 'niyTips';
  window.NiyTip = {
    list: function () { return lsGet(TKEY, []); },
    open: function () {
      var ov = overlay('niyTipOv'), self = this, tips = this.list();
      var listHtml = tips.length ? '<div class="niy-tip-list"><div class="niy-tip-list-h">Your saved tips (' + tips.length + ')</div>' + tips.slice().reverse().map(function (t) {
        return '<div class="niy-tip-item"><div class="niy-tip-it-t">' + esc(t.title) + '<span class="niy-tip-cat">' + esc(t.cat) + '</span></div>' + (t.details ? '<div class="niy-tip-it-d">' + esc(String(t.details).slice(0, 200)) + '</div>' : '') + '<div class="niy-tip-it-m">' + esc(new Date(t.ts).toLocaleString('en-IN')) + (t.link ? ' · <a href="' + esc(t.link) + '" target="_blank" rel="noopener">source</a>' : '') + '</div></div>';
      }).join('') + '</div>' : '';
      ov.innerHTML = '<div class="niy-mp-modal niy-tip-modal"><div class="niy-mp-head"><span class="niy-mp-title">✎ SUBMIT A TIP</span><span class="niy-mp-sub">leads &amp; story ideas</span><button class="niy-mp-x" type="button">✕</button></div>'
        + '<div class="niy-tip-form"><input class="niy-tip-in" id="niyTipTitle" placeholder="Headline / one-line tip" maxlength="140"/>'
        + '<select class="niy-tip-in" id="niyTipCat"><option>Governance</option><option>Judiciary</option><option>Finance</option><option>Elections</option><option>Corruption</option><option>Policy</option><option>Other</option></select>'
        + '<textarea class="niy-tip-in niy-tip-ta" id="niyTipDetails" placeholder="Details — who, what, where, and why it matters…"></textarea>'
        + '<input class="niy-tip-in" id="niyTipLink" placeholder="Source / document link (optional)"/>'
        + '<button class="niy-tip-submit" type="button">Save tip</button></div>' + listHtml
        + '<div class="niy-mp-foot">Prototype: tips are stored only in your browser. A production build would route these securely to your newsroom.</div></div>';
      ov.querySelector('.niy-mp-x').addEventListener('click', function () { ov.classList.remove('show'); });
      ov.querySelector('.niy-tip-submit').addEventListener('click', function () {
        var title = (document.getElementById('niyTipTitle').value || '').trim(); if (!title) { toast('Add a headline first'); return; }
        var l = self.list(); l.push({ title: title, cat: document.getElementById('niyTipCat').value, details: (document.getElementById('niyTipDetails').value || '').trim(), link: (document.getElementById('niyTipLink').value || '').trim(), ts: Date.now() }); lsSet(TKEY, l); toast('Tip saved'); self.open();
      });
      ov.classList.add('show');
    }
  };

  /* ---------------- Tools menu (header) ---------------- */
  function injectCSS() {
    if (document.getElementById('niy-mp-css')) return;
    var s = document.createElement('style'); s.id = 'niy-mp-css';
    s.textContent = ['.niy-mp-ov{position:fixed;inset:0;background:rgba(3,5,9,.7);backdrop-filter:blur(4px);z-index:9100;display:none;align-items:center;justify-content:center;padding:20px}',
      '.niy-mp-ov.show{display:flex}',
      '.niy-mp-modal{width:min(560px,95vw);max-height:calc(100vh - 40px);overflow-y:auto;overscroll-behavior:contain;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,0) 40%),#10141b;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px 20px;box-shadow:0 24px 70px rgba(0,0,0,.55);font-variant-numeric:tabular-nums;color:var(--fg,#eef2f6)}',
      '.niy-cal-modal{width:min(700px,95vw)}',
      '.niy-mp-head{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:12px;margin-bottom:14px}',
      '.niy-mp-title{font:700 13px var(--font-display,system-ui,sans-serif);letter-spacing:.04em}',
      '.niy-mp-sub{font:500 10px var(--font-mono,monospace);color:var(--fg-dim,#8a94a0);flex:1}',
      '.niy-mp-x{background:rgba(16,20,27,.55);border:0;color:#9aa3ad;font-size:17px;cursor:pointer;width:28px;height:28px;border-radius:7px;line-height:1}',
      '.niy-mp-x:hover{color:#eef2f6;background:rgba(40,48,60,.7)}',
      '.niy-mp-foot{font-size:9.5px;color:#68717b;margin-top:14px;line-height:1.5;border-top:1px solid rgba(255,255,255,.06);padding-top:10px}',
      '.niy-mp-empty{padding:34px 12px;text-align:center;color:var(--fg-dim,#8a94a0);font-size:12.5px;line-height:1.7}.niy-mp-empty b{color:var(--ds-accent,#7fb0ff)}',
      '.niy-w-wrap{border:1px solid rgba(255,255,255,.06);border-radius:9px;overflow:hidden}.niy-w-table{width:100%;border-collapse:collapse}',
      '.niy-w-table thead th{font:600 9px var(--font-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:#68717b;text-align:left;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08)}.niy-w-table th.num{text-align:right}',
      '.niy-w-row{cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s}.niy-w-row:hover{background:var(--ds-accent-dim,rgba(127,176,255,.07))}',
      '.niy-w-table td{padding:8px 12px;font:500 12px var(--font-display,system-ui,sans-serif)}.niy-w-table td.num{text-align:right;font-family:var(--font-mono,monospace);font-size:11.5px}.niy-w-table td.up{color:#26b469}.niy-w-table td.down{color:#eb5050}',
      '.niy-w-nm{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.niy-w-spark{width:84px}.niy-w-x{background:transparent;border:0;color:#68717b;cursor:pointer;font-size:12px}.niy-w-x:hover{color:#eb5050}',
      '.niy-spark{width:72px;height:20px;display:block}.niy-spark-na{color:#4a525c;font:10px var(--font-mono,monospace)}',
      '.fin-follow{margin-left:10px;vertical-align:middle;background:transparent;border:1px solid rgba(255,255,255,.2);color:var(--fg-dim,#b9c2cc);font:600 10px var(--font-mono,monospace);padding:3px 9px;border-radius:6px;cursor:pointer;transition:all .15s}.fin-follow:hover{border-color:var(--ds-accent,#7fb0ff);color:var(--ds-accent,#7fb0ff)}.fin-follow.on{background:rgba(127,176,255,.15);border-color:rgba(127,176,255,.5);color:var(--ds-accent,#7fb0ff)}',
      '.fin-xp-spark{width:66px;padding:4px 10px !important}.fin-spark{width:60px;height:18px;display:block}',
      '.niy-cal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.niy-cal-card{border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 13px;background:rgba(255,255,255,.018)}',
      '.niy-cal-cat{font:700 8.5px var(--font-mono,monospace);letter-spacing:.09em;text-transform:uppercase;color:var(--ds-accent,#7fb0ff);margin-bottom:5px}',
      '.niy-cal-t{font:600 13px var(--font-display,system-ui,sans-serif);margin-bottom:5px}.niy-cal-cad{font-size:11px;color:var(--fg-dim,#8a94a0);line-height:1.5;margin-bottom:9px}',
      '.niy-cal-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.niy-cal-src{font:600 10px var(--font-mono,monospace);color:#68717b;text-decoration:none}.niy-cal-src:hover{color:var(--fg,#eef2f6)}',
      '.niy-cal-ai{font:600 10px var(--font-mono,monospace);background:transparent;border:1px solid rgba(127,176,255,.3);color:var(--ds-accent,#7fb0ff);padding:4px 9px;border-radius:6px;cursor:pointer}.niy-cal-ai:hover{background:rgba(127,176,255,.12)}',
      '.niy-tip-form{display:flex;flex-direction:column;gap:9px}',
      '.niy-tip-in{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:9px 11px;color:var(--fg,#eef2f6);font:500 12px var(--font-display,system-ui,sans-serif);outline:none}.niy-tip-in:focus{border-color:var(--ds-accent,#7fb0ff)}',
      '.niy-tip-ta{min-height:90px;resize:vertical;line-height:1.5}',
      '.niy-tip-submit{align-self:flex-start;background:var(--ds-accent,#7fb0ff);color:#04121f;border:0;font:600 11px var(--font-display,system-ui,sans-serif);padding:8px 18px;border-radius:7px;cursor:pointer}.niy-tip-submit:hover{filter:brightness(1.08)}',
      '.niy-tip-list{margin-top:16px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}.niy-tip-list-h{font:600 10px var(--font-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:#68717b;margin-bottom:9px}',
      '.niy-tip-item{border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;margin-bottom:7px}.niy-tip-it-t{font:600 12px var(--font-display,system-ui,sans-serif);margin-bottom:3px}',
      '.niy-tip-cat{font:600 8px var(--font-mono,monospace);color:var(--ds-accent,#7fb0ff);background:rgba(127,176,255,.13);border:1px solid rgba(127,176,255,.3);border-radius:4px;padding:1px 5px;margin-left:6px}',
      '.niy-tip-it-d{font-size:11px;color:var(--fg-dim,#8a94a0);line-height:1.45;margin-bottom:4px}.niy-tip-it-m{font:500 9px var(--font-mono,monospace);color:#68717b}.niy-tip-it-m a{color:#68717b}',
      '.niy-tools-btn{display:inline-flex;align-items:center;gap:5px;height:30px;flex-shrink:0;background:transparent;border:1px solid var(--line-bright,rgba(255,255,255,.18));color:var(--fg-dim,#b9c2cc);border-radius:7px;padding:0 11px;font:600 11px var(--font-mono,monospace);letter-spacing:.03em;cursor:pointer;white-space:nowrap;transition:all .15s}',
      '.niy-tools-btn:hover{border-color:var(--ds-accent,#7fb0ff);color:var(--ds-accent,#7fb0ff)}.niy-tools-btn .ico{font-size:12px}',
      '.niy-tools-pop{position:fixed;z-index:9200;background:#12161c;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:6px;min-width:180px;box-shadow:0 14px 34px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:2px}.niy-tools-pop[hidden]{display:none}',
      '.niy-tools-pop button{background:transparent;border:0;color:var(--fg,#e8edf2);font:600 12px var(--font-display,system-ui,sans-serif);text-align:left;padding:9px 11px;border-radius:6px;cursor:pointer}.niy-tools-pop button:hover{background:rgba(255,255,255,.06)}',
      '@media (max-width:560px){.niy-cal-grid{grid-template-columns:1fr}}'].join('');
    document.head.appendChild(s);
  }

  function injectToolsBtn() {
    var tries = 0; var t = setInterval(function () {
      tries++;
      if (document.getElementById('niyToolsBtn')) { clearInterval(t); return; }
      var qc = document.querySelector('.quick-controls');
      if (qc) {
        var b = document.createElement('button'); b.id = 'niyToolsBtn'; b.className = 'niy-tools-btn'; b.type = 'button'; b.title = 'Watchlist, Calendar, Submit a Tip'; b.innerHTML = '<span class="ico">⊞</span> TOOLS';
        var pop = document.createElement('div'); pop.id = 'niyToolsPop'; pop.className = 'niy-tools-pop'; pop.hidden = true;
        pop.innerHTML = '<button data-t="watch" type="button">★ Watchlist</button><button data-t="cal" type="button">🗓 Calendar</button><button data-t="tip" type="button">✎ Submit a Tip</button>';
        b.addEventListener('click', function (e) { e.stopPropagation(); if (pop.parentElement !== document.body) { document.body.appendChild(pop); pop.style.position = 'fixed'; } if (pop.hidden) { var r = b.getBoundingClientRect(); pop.style.top = Math.round(r.bottom + 6) + 'px'; pop.style.left = Math.round(Math.max(6, Math.min(r.left, innerWidth - 192))) + 'px'; } pop.hidden = !pop.hidden; });
        document.addEventListener('click', function (e) { if (!pop.hidden && !pop.contains(e.target) && e.target !== b && !b.contains(e.target)) pop.hidden = true; });
        pop.addEventListener('click', function (e) { var x = e.target.closest('button'); if (!x) return; pop.hidden = true; var k = x.getAttribute('data-t'); if (k === 'watch') window.NiyWatch.open(); else if (k === 'cal') window.NiyCal.open(); else if (k === 'tip') window.NiyTip.open(); });
        qc.insertBefore(b, qc.firstChild);
        clearInterval(t);
      }
      if (tries > 100) clearInterval(t);
    }, 300);
  }

  injectCSS();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectToolsBtn); else injectToolsBtn();
})();

