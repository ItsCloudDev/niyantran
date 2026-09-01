
/* ============================================================================
   BROKER QUICK TRADE  —  reusable, prototype-only panel for a stock card.
   - window.BrokerService : mock data provider (replace getBrokers/connect with
     real Zerodha/Angel One/Upstox/Dhan adapters later; same shape in/out).
   - window.BrokerQuickTrade.attach(cardEl, instrument) : renders the panel into
     any stock card element, above its .fin-modal-foot (falls back to append).
   Nothing here touches the existing card markup, animations or interactions.
   ========================================================================== */
(function () {
  'use strict';

  // ---- Mock data provider (swap for real broker APIs later) ----------------
  var BROKERS = [
    { id: 'zerodha',  name: 'Zerodha',   logo: 'Z', flat: 20, feeFactor: 1.00, connected: true },
    { id: 'angelone', name: 'Angel One', logo: 'A', flat: 20, feeFactor: 1.07, connected: false },
    { id: 'upstox',   name: 'Upstox',    logo: 'U', flat: 20, feeFactor: 0.97, connected: false },
    { id: 'dhan',     name: 'Dhan',      logo: 'D', flat: 20, feeFactor: 0.90, connected: true }
  ];
  var connState = {}; // runtime connection overrides (mock session)

  function estimate(b, price) {
    var p = (price && isFinite(price)) ? price : 1000;
    var brokerage = b.flat; // discount-broker flat fee (mock)
    // Mock statutory + exchange charges scaled by a per-broker factor so there
    // is a clear lowest-cost broker. NOT a real charges computation.
    var charges = (p * 0.00125 + brokerage * 0.18 + 3.1) * b.feeFactor;
    return { brokerage: brokerage, totalCharges: brokerage + charges };
  }

  window.BrokerService = window.BrokerService || {
    // Returns [{id,name,logo,brokerage,totalCharges,connected}] for an instrument.
    getBrokers: function (instrument) {
      var price = instrument && instrument.price;
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(BROKERS.map(function (b) {
            var e = estimate(b, price);
            return { id: b.id, name: b.name, logo: b.logo, brokerage: e.brokerage, totalCharges: e.totalCharges,
                     connected: (b.id in connState) ? connState[b.id] : b.connected };
          }));
        }, 120); // simulate async fetch
      });
    },
    // Simulate a successful broker connection (mock handshake).
    connect: function (brokerId) {
      return new Promise(function (resolve) {
        setTimeout(function () { connState[brokerId] = true; resolve({ ok: true, brokerId: brokerId, connected: true }); }, 620);
      });
    }
  };

  // ---- Reusable panel component -------------------------------------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function inr(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // Reuse the terminal's own toast styling (.toast/.show) so it feels native.
  function toast(text) {
    var t = document.getElementById('globalToast');
    if (!t) { t = document.createElement('div'); t.id = 'globalToast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = text; t.classList.add('show');
    clearTimeout(t._bqtTimer); t._bqtTimer = setTimeout(function () { t.classList.remove('show'); }, 3400);
  }

  function injectCSS() {
    if (document.getElementById('niy-bqt-css')) return;
    var st = document.createElement('style'); st.id = 'niy-bqt-css';
    st.textContent = [
      '.niy-bqt{margin-top:16px;border-top:1px solid rgba(255,255,255,.08);padding-top:13px;animation:bqtIn .4s cubic-bezier(.22,.61,.36,1)}',
      '@keyframes bqtIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
      '.niy-bqt-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px}',
      '.niy-bqt-title{font:600 10px/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.11em;color:var(--fg-dim,#8a94a0)}',
      '.niy-bqt-sub{font:500 8.5px var(--font-mono,monospace);letter-spacing:.08em;color:#68717b;text-transform:uppercase}',
      '.niy-bqt-list{display:flex;flex-direction:column;gap:6px}',
      '.niy-bqt-skel{font:500 11px var(--font-mono,monospace);color:#68717b;padding:12px 4px;text-align:center}',
      '.niy-bqt-row{display:grid;grid-template-columns:24px minmax(76px,1.15fr) 1fr 1fr auto;align-items:center;gap:9px;padding:7px 10px;border:1px solid rgba(255,255,255,.06);border-radius:9px;background:rgba(255,255,255,.018);transition:border-color .18s,background .18s}',
      '.niy-bqt-row:hover{border-color:rgba(255,255,255,.13);background:rgba(255,255,255,.032)}',
      '.niy-bqt-row.best{border-color:rgba(127,176,255,.34);background:linear-gradient(180deg,rgba(127,176,255,.065),rgba(127,176,255,0) 70%)}',
      '.niy-bqt-logo{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font:700 11px var(--font-display,system-ui,sans-serif);color:#0b0f16;background:linear-gradient(145deg,#d6dde6,#98a3b2);box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}',
      '.niy-bqt-idn{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.niy-bqt-name{font:600 12px var(--font-display,system-ui,sans-serif);color:var(--fg,#eef2f6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}',
      '.niy-bqt-best{font:700 8px/1 var(--font-mono,monospace);letter-spacing:.05em;color:var(--ds-accent,#7fb0ff);background:rgba(127,176,255,.13);border:1px solid rgba(127,176,255,.32);border-radius:4px;padding:2px 4px;flex:none}',
      '.niy-bqt-status{font:500 9.5px var(--font-mono,monospace);display:flex;align-items:center;gap:4px}',
      '.niy-bqt-status.on{color:#26b469}.niy-bqt-status.off{color:#727c86}',
      '.niy-bqt-status .dot{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor}',
      '.niy-bqt-fig{display:flex;flex-direction:column;line-height:1.24;min-width:0}',
      '.niy-bqt-fig span{font:500 8.5px var(--font-mono,monospace);letter-spacing:.02em;color:#68717b;text-transform:uppercase;white-space:nowrap}',
      '.niy-bqt-fig b{font:600 11.5px var(--font-mono,monospace);color:var(--fg,#eef2f6);font-variant-numeric:tabular-nums}',
      '.niy-bqt-act{font:600 11px var(--font-display,system-ui,sans-serif);padding:6px 15px;border-radius:7px;cursor:pointer;border:1px solid transparent;transition:filter .16s,box-shadow .16s,border-color .16s,color .16s;white-space:nowrap}',
      '.niy-bqt-act.buy{background:var(--ds-accent,#7fb0ff);color:#04121f}',
      '.niy-bqt-act.buy:hover{filter:brightness(1.08);box-shadow:0 4px 14px rgba(127,176,255,.3)}',
      '.niy-bqt-act.connect{background:transparent;color:var(--fg,#eef2f6);border-color:rgba(255,255,255,.2)}',
      '.niy-bqt-act.connect:hover{border-color:var(--ds-accent,#7fb0ff);color:var(--ds-accent,#7fb0ff)}',
      '.niy-bqt-act:disabled{opacity:.6;cursor:default;filter:none;box-shadow:none}',
      '.niy-bqt-note{font:500 11px var(--font-display,system-ui,sans-serif);color:var(--fg-dim,#8a94a0);line-height:1.5;margin-bottom:9px}',
      '.niy-bqt-routes{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}',
      '.niy-bqt-route{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.018)}',
      '.niy-bqt-route.act{cursor:pointer;border-color:rgba(127,176,255,.3);background:linear-gradient(180deg,rgba(127,176,255,.07),rgba(127,176,255,0))}',
      '.niy-bqt-route.act:hover{border-color:var(--ds-accent,#7fb0ff)}',
      '.niy-bqt-route-k{font:700 8px var(--font-mono,monospace);letter-spacing:.08em;color:#68717b}',
      '.niy-bqt-route-b{font:600 12px var(--font-display,system-ui,sans-serif);color:var(--fg,#eef2f6)}',
      '.niy-bqt-route-s{font:500 9px var(--font-mono,monospace);color:#68717b}',
      '@media (max-width:520px){.niy-bqt-routes{grid-template-columns:1fr}}',
      '@media (max-width:420px){.niy-bqt-row{grid-template-columns:22px 1fr auto;gap:7px;row-gap:4px}.niy-bqt-fig{flex-direction:row;gap:5px;align-items:baseline}.niy-bqt-fig span::after{content:""}.niy-bqt-idn{grid-column:2}.niy-bqt-act{grid-row:1;grid-column:3}.niy-bqt-fig{grid-column:2/4}}'
    ].join('');
    document.head.appendChild(st);
  }

  function headHtml() { return '<div class="niy-bqt-head"><span class="niy-bqt-title">BROKER QUICK TRADE</span><span class="niy-bqt-sub">Est. \u00B7 Prototype</span></div>'; }
  function rowHtml(b, isBest) {
    var on = !!b.connected;
    return '<div class="niy-bqt-row' + (isBest ? ' best' : '') + '" data-id="' + esc(b.id) + '">'
      + '<span class="niy-bqt-logo" aria-hidden="true">' + esc(b.logo || (b.name || '?').charAt(0)) + '</span>'
      + '<span class="niy-bqt-idn"><span class="niy-bqt-name">' + esc(b.name) + (isBest ? '<span class="niy-bqt-best">BEST PRICE</span>' : '') + '</span>'
      + '<span class="niy-bqt-status ' + (on ? 'on' : 'off') + '"><span class="dot"></span>' + (on ? 'Connected' : 'Not Connected') + '</span></span>'
      + '<span class="niy-bqt-fig"><span>Brokerage</span><b>' + inr(b.brokerage) + '</b></span>'
      + '<span class="niy-bqt-fig"><span>Tot. charges</span><b>' + inr(b.totalCharges) + '</b></span>'
      + '<button class="niy-bqt-act ' + (on ? 'buy' : 'connect') + '" data-id="' + esc(b.id) + '" data-mode="' + (on ? 'buy' : 'connect') + '" type="button">' + (on ? 'Buy' : 'Connect') + '</button>'
      + '</div>';
  }

  var NIY_ETF = { 'NIFTY 50': 'NIFTYBEES', 'NIFTY NEXT 50': 'JUNIORBEES', 'NIFTY BANK': 'BANKBEES', 'NIFTY IT': 'ITBEES', 'NIFTY PSU BANK': 'PSUBNKBEES', 'NIFTY PHARMA': 'PHARMABEES', 'NIFTY INFRASTRUCTURE': 'INFRABEES', 'NIFTY MIDCAP 100': 'MID150BEES', 'NIFTY 100': 'ICICINF100', 'NIFTY 500': 'MOM500', 'NIFTY MIDCAP 50': 'MIDCAPETF' };
  function renderRoute(wrap, inst) {
    if (!inst || !inst.kind || inst.kind === 'index') { renderIndexRoute(wrap, inst); return; }
    var kind = inst.kind, nm = esc(inst.name), title, note, routes;
    if (kind === 'commodity') { title = 'HOW TO TRADE THIS COMMODITY'; note = nm + ' is a commodity \u2014 get exposure via:'; routes = [['ETF', 'Commodity ETF', 'e.g. Gold / Silver ETF', 1], ['FUT', 'MCX / COMEX Futures', 'Exchange-traded'], ['FUND', 'Commodity Fund', 'Mutual-fund route']]; }
    else if (kind === 'currency') { title = 'HOW TO TRADE THIS PAIR'; note = nm + ' is a currency pair \u2014 access via:'; routes = [['CDS', 'Currency Futures', 'NSE / BSE currency deriv.'], ['FX', 'Forex / Spot', 'Authorised dealer'], ['ETF', 'Currency ETF', 'Where available']]; }
    else { title = 'HOW TO TRADE THIS CRYPTO'; note = nm + ' is a crypto asset \u2014 not available via a stockbroker. Trade on a crypto exchange:'; routes = [['CEX', 'WazirX / CoinDCX', 'Indian exchanges', 1], ['CEX', 'Binance / Coinbase', 'Global exchanges'], ['ETF', 'Crypto ETF', 'Where available']]; }
    wrap.innerHTML = '<div class="niy-bqt-head"><span class="niy-bqt-title">' + title + '</span><span class="niy-bqt-sub">Prototype</span></div>'
      + '<div class="niy-bqt-note">' + note + '</div><div class="niy-bqt-routes">'
      + routes.map(function (r) { var k = String(r[0]).replace(/&/g, '&amp;'); return r[3] ? '<button class="niy-bqt-route act" data-buy="1" type="button"><span class="niy-bqt-route-k">' + k + '</span><span class="niy-bqt-route-b">' + esc(r[1]) + '</span><span class="niy-bqt-route-s">' + esc(r[2]) + '</span></button>' : '<div class="niy-bqt-route"><span class="niy-bqt-route-k">' + k + '</span><span class="niy-bqt-route-b">' + esc(r[1]) + '</span><span class="niy-bqt-route-s">' + esc(r[2]) + '</span></div>'; }).join('') + '</div>';
    wrap.querySelectorAll('.niy-bqt-route[data-buy]').forEach(function (b) { b.addEventListener('click', function () { toast('Prototype Mode \u2014 Live broker integration will be available in a future release.'); }); });
  }
  function renderIndexRoute(wrap, inst) {
    var etf = NIY_ETF[inst.name];
    wrap.innerHTML = '<div class="niy-bqt-head"><span class="niy-bqt-title">HOW TO TRADE THIS INDEX</span><span class="niy-bqt-sub">Prototype</span></div>'
      + '<div class="niy-bqt-note">' + esc(inst.name) + ' is an index \u2014 it can\'t be bought directly. Get exposure via:</div>'
      + '<div class="niy-bqt-routes">'
      + (etf ? '<button class="niy-bqt-route act" data-buy="1" type="button"><span class="niy-bqt-route-k">ETF</span><span class="niy-bqt-route-b">' + esc(etf) + '</span><span class="niy-bqt-route-s">Buy like a stock \u2192</span></button>' : '<div class="niy-bqt-route"><span class="niy-bqt-route-k">ETF</span><span class="niy-bqt-route-b">Index ETF</span><span class="niy-bqt-route-s">Tracks this index</span></div>')
      + '<div class="niy-bqt-route"><span class="niy-bqt-route-k">FUND</span><span class="niy-bqt-route-b">Index Fund</span><span class="niy-bqt-route-s">SIP / lump-sum</span></div>'
      + '<div class="niy-bqt-route"><span class="niy-bqt-route-k">F&amp;O</span><span class="niy-bqt-route-b">Futures &amp; Options</span><span class="niy-bqt-route-s">NSE derivatives</span></div>'
      + '</div>';
    var rb = wrap.querySelector('.niy-bqt-route[data-buy]');
    if (rb) rb.addEventListener('click', function () { toast('Prototype Mode \u2014 Live broker integration will be available in a future release.'); });
  }
  function render(wrap, brokers, instrument) {
    if (instrument && instrument.kind && instrument.kind !== 'equity') { renderRoute(wrap, instrument); return; }
    if (!brokers || !brokers.length) { wrap.innerHTML = headHtml() + '<div class="niy-bqt-list"><div class="niy-bqt-skel">Broker quotes unavailable.</div></div>'; return; }
    var bestId = null, bestVal = Infinity;
    brokers.forEach(function (b) { if (b.totalCharges < bestVal) { bestVal = b.totalCharges; bestId = b.id; } });
    wrap.innerHTML = headHtml() + '<div class="niy-bqt-list">' + brokers.map(function (b) { return rowHtml(b, b.id === bestId); }).join('') + '</div>';
    wrap.querySelectorAll('.niy-bqt-act').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id'); var b = null;
        for (var i = 0; i < brokers.length; i++) if (brokers[i].id === id) { b = brokers[i]; break; }
        if (!b) return;
        if (btn.getAttribute('data-mode') === 'buy') {
          toast('Prototype Mode \u2014 Live broker integration will be available in a future release.');
        } else {
          btn.disabled = true; btn.textContent = 'Connecting\u2026';
          Promise.resolve(window.BrokerService.connect(b.id, instrument)).then(function (res) {
            if (res && res.ok) { b.connected = true; render(wrap, brokers, instrument); toast(b.name + ' connected \u2014 Prototype Mode (mock session)'); }
            else { btn.disabled = false; btn.textContent = 'Connect'; }
          }).catch(function () { btn.disabled = false; btn.textContent = 'Connect'; });
        }
      });
    });
  }

  window.BrokerQuickTrade = {
    // Attach the panel to any stock card element. instrument: {name,symbol,price}.
    attach: function (cardEl, instrument) {
      if (!cardEl || !window.BrokerService) return null;
      injectCSS();
      var old = cardEl.querySelector('.niy-bqt'); if (old) old.remove();
      var wrap = document.createElement('div'); wrap.className = 'niy-bqt';
      wrap.innerHTML = headHtml() + '<div class="niy-bqt-list"><div class="niy-bqt-skel">Loading broker quotes\u2026</div></div>';
      var foot = cardEl.querySelector('.fin-modal-foot');
      if (foot && foot.parentElement === cardEl) foot.insertAdjacentElement('beforebegin', wrap); else cardEl.appendChild(wrap);
      if (instrument && instrument.kind && instrument.kind !== 'equity') { render(wrap, [], instrument); return wrap; }
      Promise.resolve(window.BrokerService.getBrokers(instrument || {})).then(function (brokers) { render(wrap, brokers, instrument || {}); }).catch(function () { render(wrap, [], instrument || {}); });
      return wrap;
    }
  };
})();
