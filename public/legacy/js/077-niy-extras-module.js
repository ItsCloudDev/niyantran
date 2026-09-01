
/* ================================================================
   NIYANTRAN EXTRAS — (A) live refresh for the Climate wire features
   (registry feeds + newswire re-pulled through /api/rss), and
   (B) COMPANY SEARCH replacing the header clock: Zauba/Tracxn-style
   profiles from Wikidata (keyless, CORS-open) + cross-search of the
   terminal's own datasets + primary-source deep links.
   Self-contained and removable as one block.
   ================================================================ */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { const t = document.createElement('div'); t.className = 'ms-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };

  /* ---------------- A · climate live refresh ---------------- */
  const FEEDS = {
    'climate_news.csv': {
      kind: 'news',
      srcs: [
        ['Carbon Brief', 'https://www.carbonbrief.org/feed/'],
        ['Mongabay India', 'https://india.mongabay.com/feed/'],
        ['Climate Home News', 'https://www.climatechangenews.com/feed/'],
      ],
    },
    'climate_registry_wire.csv': {
      kind: 'registry',
      srcs: [
        ['Verra', 'https://verra.org/feed/'],
        ['Puro.earth', 'https://puro.earth/rss'],
        ['Isometric', 'sitemap:https://isometric.com/sitemap.xml'],
      ],
    },
  };
  async function pullFeed(name, url) {
    const isMap = url.startsWith('sitemap:');
    const real = isMap ? url.slice(8) : url;
    const r = await fetch('/api/rss?url=' + encodeURIComponent(real));
    if (!r.ok) throw new Error('proxy ' + r.status);
    const xml = new DOMParser().parseFromString(await r.text(), 'text/xml');
    const out = [];
    if (isMap) {
      xml.querySelectorAll('url').forEach(u => {
        const loc = (u.querySelector('loc') || {}).textContent || '';
        if (!loc.includes('/writing-articles/')) return;
        const lm = ((u.querySelector('lastmod') || {}).textContent || '').trim().slice(0, 10);
        const slug = loc.trim().replace(/\/$/, '').split('/').pop().replace(/-/g, ' ');
        out.push({ who: name, title: slug.charAt(0).toUpperCase() + slug.slice(1), date: lm, link: loc.trim() });
      });
      out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return out.slice(0, 14);
    }
    xml.querySelectorAll('item').forEach(it => {
      if (out.length >= 14) return;
      const g = t => ((it.querySelector(t) || {}).textContent || '').trim();
      out.push({ who: name, title: g('title').replace(/\s+/g, ' '), date: g('pubDate').slice(0, 22), link: g('link') });
    });
    return out;
  }
  async function refreshFeed(csv) {
    const cfg = FEEDS[csv];
    const all = [];
    let fails = 0;
    for (const [name, url] of cfg.srcs) {
      try { all.push(...await pullFeed(name, url)); } catch (e) { fails++; }
    }
    if (!all.length) throw new Error(fails === cfg.srcs.length ? 'all sources failed — live refresh needs the deployed build (/api/rss)' : 'no items');
    const rows = all.map((x, i) => cfg.kind === 'news'
      ? { id: String(i + 1), source: x.who, title: x.title, date: x.date, link: x.link }
      : { id: String(i + 1), registry: x.who, title: x.title, date: x.date, link: x.link });
    try {
      EMBEDDED_CSV_DATA[csv] = rows;
      if (typeof csvCache !== 'undefined') csvCache[csv] = rows;
      const f = featuresForTier('climate').find(x => x.dataSource && x.dataSource.csv === csv);
      if (f && typeof renderedBlockCache !== 'undefined') renderedBlockCache.delete(f.dataSource);
    } catch (e) { }
    return { rows: rows.length, fails };
  }
  function injectRefreshBtn() {
    try {
      if (typeof activeTier === 'undefined' || activeTier !== 'climate') return;
      const f = featuresForTier('climate')[activeIndex];
      if (!f || !f.dataSource || !FEEDS[f.dataSource.csv]) return;
      const tb = document.querySelector('#detail .toolbar');
      if (!tb || tb.querySelector('.niy-live-refresh')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'toolbar-btn niy-live-refresh';
      b.innerHTML = '⟳ Refresh Live';
      b.title = 'Re-pull these feeds from their sources via /api/rss (deployed build)';
      b.addEventListener('click', async () => {
        b.disabled = true; b.innerHTML = '⟳ Pulling…';
        try {
          const res = await refreshFeed(f.dataSource.csv);
          toast('Live: ' + res.rows + ' items' + (res.fails ? ' · ' + res.fails + ' source(s) failed' : ''));
          renderDetail();
        } catch (e) { toast(e.message); b.disabled = false; b.innerHTML = '⟳ Refresh Live'; }
      });
      tb.appendChild(b);
    } catch (e) { }
  }
  (function hookRD() {
    if (typeof window.renderDetail !== 'function') return setTimeout(hookRD, 500);
    const orig = window.renderDetail;
    window.renderDetail = async function () {
      const r = await orig.apply(this, arguments);
      setTimeout(injectRefreshBtn, 250);
      setTimeout(injectRefreshBtn, 900);
      return r;
    };
  })();

  /* ---------------- B · COMPANY SEARCH (clock slot) ---------------- */
  (function css() {
    if (document.getElementById('niy-co-css')) return;
    const s = document.createElement('style'); s.id = 'niy-co-css';
    s.textContent = [
      /* single-line header pill — DS module normalizes it to match STREAM/Refresh */
      ".niy-co-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--line-bright,#3d3d3d);border-radius:8px;color:var(--fg,#eaeaea);height:30px;box-sizing:border-box;padding:0 12px;cursor:pointer;font-family:var(--font-mono,monospace);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex-shrink:0}",
      ".niy-co-btn:hover{color:var(--white,#fff);border-color:var(--white,#fff)}",
      ".niy-co-btn .ico{font-size:12px;line-height:1}",
      "#niyCoModal{position:fixed;inset:0;z-index:9650;background:rgba(3,5,9,.66);backdrop-filter:blur(3px);display:none;align-items:flex-start;justify-content:center;padding:9vh 20px 20px}",
      "#niyCoModal.show{display:flex}",
      ".niy-co-box{width:min(680px,95vw);max-height:82vh;overflow-y:auto;background:var(--panel,#0e0e0e);border:1px solid var(--line-bright,#3d3d3d);border-radius:14px;scrollbar-width:thin}",
      ".niy-co-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line,#262626)}",
      ".niy-co-head input{flex:1;background:transparent;border:0;outline:none;color:var(--fg,#eaeaea);font-size:14px;font-family:var(--font-display,sans-serif)}",
      ".niy-co-body{padding:13px 16px}",
      ".niy-co-hit{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:8px 10px;cursor:pointer;color:var(--fg-dim,#9aa)}",
      ".niy-co-hit:hover{background:var(--panel-2,#161616);color:var(--fg,#fff)}",
      ".niy-co-hit b{color:var(--fg,#eaeaea);font-size:12.5px}",
      ".niy-co-hit span{font-size:10.5px;color:var(--fg-faint,#666)}",
      ".niy-co-prof h2{margin:2px 0 3px;font-size:18px}",
      ".niy-co-desc{font-size:11.5px;color:var(--fg-dim,#9aa);line-height:1.6;margin-bottom:11px}",
      ".niy-co-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:12px}",
      ".niy-co-f{background:var(--panel-2,#141414);border:1px solid var(--line,#262626);border-radius:9px;padding:8px 11px}",
      ".niy-co-f .k{font-size:8.5px;font-weight:700;letter-spacing:.09em;color:var(--fg-faint,#555);text-transform:uppercase}",
      ".niy-co-f .v{font-size:12px;font-weight:650;margin-top:3px;word-break:break-word}",
      ".niy-co-links{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 13px}",
      ".niy-co-links a{font-size:10.5px;font-weight:650;color:#7fb0ff;border:1px solid rgba(127,176,255,.35);border-radius:999px;padding:3px 11px;text-decoration:none}",
      ".niy-co-sec{font-size:9px;font-weight:700;letter-spacing:.14em;color:var(--fg-faint,#555);margin:13px 0 7px}",
      ".niy-co-x{margin-left:auto;background:transparent;border:0;color:var(--fg-faint,#666);font-size:19px;cursor:pointer}",
      ".niy-co-x:hover{color:var(--fg,#fff)}",
      ".niy-co-note{font-size:9.5px;color:var(--fg-faint,#555);line-height:1.6;border-top:1px dashed var(--line,#262626);padding-top:9px;margin-top:6px}",
      ".niy-co-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;vertical-align:middle;margin-left:6px}",
      ".niy-co-badge.ok{background:rgba(38,180,105,.16);color:#37c47f}",
      ".niy-co-badge.warn{background:rgba(201,154,63,.16);color:#d0a24a}",
      ".niy-co-src{font-size:9.5px;font-weight:650;letter-spacing:.04em;color:#7fb0ff;margin:1px 0 11px}",
      ".niy-co-2nd{color:var(--fg-faint,#555);font-weight:600}",
      ".niy-co-dirs{max-height:190px;overflow-y:auto;border:1px solid var(--line,#262626);border-radius:9px;padding:3px;margin-bottom:6px}",
      ".niy-co-dir{display:flex;justify-content:space-between;gap:10px;padding:5px 8px;border-radius:6px;font-size:11px}",
      ".niy-co-dir:hover{background:var(--panel-2,#141414)}",
      ".niy-co-dir .nm{font-weight:650;color:var(--fg,#eaeaea)}",
      ".niy-co-dir .ro{font-size:9.5px;color:var(--fg-faint,#666);white-space:nowrap;font-family:var(--font-mono,monospace)}",
    ].join('');
    document.head.appendChild(s);
  })();

  const WD = 'https://www.wikidata.org/w/api.php';
  async function wdSearch(q) {
    const r = await fetch(WD + '?action=wbsearchentities&search=' + encodeURIComponent(q) + '&language=en&limit=8&format=json&origin=*');
    return (await r.json()).search || [];
  }
  async function wdEntities(ids) {
    if (!ids.length) return {};
    const r = await fetch(WD + '?action=wbgetentities&ids=' + ids.join('|') + '&props=labels|descriptions|claims&languages=en&format=json&origin=*');
    return (await r.json()).entities || {};
  }
  const claimIds = (ent, prop) => (((ent.claims || {})[prop]) || []).map(c => { try { return c.mainsnak.datavalue.value.id; } catch (e) { return null; } }).filter(Boolean);
  const claimStr = (ent, prop) => { try { return ent.claims[prop][0].mainsnak.datavalue.value; } catch (e) { return ''; } };
  const claimTime = (ent, prop) => { try { return ent.claims[prop][0].mainsnak.datavalue.value.time.slice(1, 11).replace(/-01-01$/, ''); } catch (e) { return ''; } };
  const claimQty = (ent, prop) => { try { return (+ent.claims[prop][0].mainsnak.datavalue.value.amount).toLocaleString('en-IN'); } catch (e) { return ''; } };

  function crossSearch(name) {
    const needle = name.toLowerCase();
    const hits = [];
    try {
      Object.keys(EMBEDDED_CSV_DATA).forEach(csv => {
        const rows = EMBEDDED_CSV_DATA[csv];
        for (let i = 0; i < rows.length && hits.length < 40; i++) {
          const r = rows[i];
          for (const k in r) {
            if (String(r[k]).toLowerCase().includes(needle)) {
              hits.push({ csv, i, snippet: String(r[k]).slice(0, 110) });
              break;
            }
          }
        }
      });
    } catch (e) { }
    return hits;
  }

  let coModal = null;
  function openCo() {
    if (!coModal) {
      coModal = document.createElement('div'); coModal.id = 'niyCoModal';
      coModal.innerHTML = '<div class="niy-co-box"><div class="niy-co-head"><span style="font-size:15px">🏢</span>'
        + '<input id="coQ" placeholder="Search a company — ZaubaCorp / MCA registry + Wikipedia…" autocomplete="off" spellcheck="false"/>'
        + '<span class="ck-kbd">esc</span><button class="niy-co-x" id="coX">×</button></div><div class="niy-co-body" id="coBody">'
        + '<div class="niy-co-desc">Type a company name — Indian companies resolve to their <b>ZaubaCorp / MCA registry</b> record (CIN, incorporation, capital, directors, status), with <b>Wikipedia</b> for supplementary background. Global names and offline use fall back to open data. Terminal mentions scan every embedded dataset.</div>'
        + '<div class="niy-co-sec">RECENT</div><div id="coRecent"></div></div></div>';
      document.body.appendChild(coModal);
      coModal.addEventListener('click', e => { if (e.target === coModal) coModal.classList.remove('show'); });
      coModal.querySelector('#coX').addEventListener('click', () => coModal.classList.remove('show'));
      let t;
      coModal.querySelector('#coQ').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => doSearch(e.target.value.trim()), 350); });
      coModal.querySelector('#coQ').addEventListener('keydown', e => { if (e.key === 'Escape') { coModal.classList.remove('show'); e.stopPropagation(); } });
      renderRecent();
    }
    coModal.classList.add('show');
    coModal.querySelector('#coQ').focus();
  }
  function recent() { try { return JSON.parse(localStorage.getItem('niyCoRecent') || '[]'); } catch (e) { return []; } }
  function renderRecent() {
    const host = coModal.querySelector('#coRecent'); if (!host) return;
    host.innerHTML = recent().map(r => '<button class="niy-co-hit" data-ref="' + esc(r.lei ? 'lei:' + r.lei : (r.cin ? 'cin:' + r.cin : (r.url || ''))) + '" data-name="' + esc(r.label) + '"><b>' + esc(r.label) + '</b><span>' + esc(r.desc || '') + '</span></button>').join('') || '<div class="niy-co-desc">No recent lookups.</div>';
    host.querySelectorAll('.niy-co-hit').forEach(b => b.addEventListener('click', () => showProfile(b.dataset.ref, b.dataset.name)));
  }
    // ---- Company Search: ZaubaCorp PRIMARY (free MCA-mirrored statutory registry),
  // Wikipedia SECONDARY (supplementary about). Zauba is CORS-locked + Cloudflare-
  // gated, so it is fetched through the /api/company Function; if that is
  // unreachable (file:// standalone, or blocked) we fall back to Wikidata open data.
  async function apiCompany(qs) {
    const r = await fetch('/api/company?' + qs, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(24000) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) { const e = new Error(j.error || ('HTTP ' + r.status)); e.blocked = j.blocked; throw e; }
    return j;
  }
  async function wikiSummary(name) {
    try {
      // gsrlimit=1 blindly trusted Wikipedia's FIRST hit — for company names that
      // was routinely a film / person / unrelated topic. Take 5 candidates, score
      // corporate language up and entertainment/biography down, weight title
      // similarity, and below the confidence bar return NOTHING rather than the
      // wrong company's analysis.
      const clean = String(name || '').replace(/\b(pvt\.?|private|ltd\.?|limited|llp|inc\.?)\s*$/i, '').trim() || String(name || '');
      const u = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(clean) + '&gsrlimit=5&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*';
      const d = await (await fetch(u)).json();
      const pages = Object.values((d.query && d.query.pages) || {});
      if (!pages.length) return null;
      const CORP = /\b(compan(y|ies)|corporation|conglomerate|multinational|manufacturer|bank|insurer|nbfc|subsidiar(y|ies)|enterprise|industries|public sector|state-owned|startup|retailer|airline|telecommunications|pharmaceutical|financial services|holding)\b/i;
      const WRONG = /\b(film|movie|album|song|television series|actor|actress|singer|cricketer|footballer|novel|village|genus|species|river|temple|festival|deity)\b/i;
      const nl = clean.toLowerCase();
      let best = null, bs = -1e9;
      pages.forEach(function (p) {
        const ex = (p.extract || '').replace(/\s+/g, ' ').trim(); if (!ex) return;
        const tl = String(p.title || '').toLowerCase();
        let sc = -(p.index || 0);
        if (tl === nl) sc += 40; else if (tl.indexOf(nl) === 0 || nl.indexOf(tl) === 0) sc += 24; else if (tl.indexOf(nl) >= 0) sc += 12;
        if (CORP.test(ex.slice(0, 420))) sc += 30;
        if (WRONG.test(ex.slice(0, 220))) sc -= 50;
        if (/\bindia/i.test(ex.slice(0, 420))) sc += 6;
        if (sc > bs) { bs = sc; best = { p: p, ex: ex }; }
      });
      if (!best || bs < 24) return null;
      return { title: best.p.title, extract: best.ex.slice(0, 640), url: best.p.fullurl };
    } catch (e) { return null; }
  }
  const coreOf = label => label.replace(/\s+(Limited|Ltd\.?|Inc\.?|Incorporated|Corp\.?|Corporation|PLC|Pvt\.?|Private|Company|Co\.?)\b.*$/i, '').trim() || label;

  // ---- Company registries — fully client-side, NO Function required. GLEIF
  // (LEI holders, fuzzy name) + MCA data.gov.in (all 3.67M Indian companies,
  // exact registered name incl. small private Ltds). Both CORS-open (ACAO:*).
  const __coGleif = {};
  const CO_CIN_RE = /^[LUu]\d{5}[A-Za-z]{2}\d{4}[A-Za-z]{3}\d{6}$/;
  const MCA_RES = '4dbe5667-7b6b-41d7-82af-211562424d9a';
  const MCA_KEY = (window.NIY_KEYS && window.NIY_KEYS.mca) || '';
  function coAddr(a) { if (!a) return ''; return [...(a.addressLines || []), a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ').replace(/\s+/g, ' ').replace(/\s,/g, ',').replace(/,\s*,/g, ',').trim(); }
  function gleifMap(d) {
    const e = (d.attributes && d.attributes.entity) || {}, reg = (d.attributes && d.attributes.registration) || {};
    const registeredAs = e.registeredAs || '';
    return { lei: d.id, name: (e.legalName && e.legalName.name) || '', registeredAs, isCin: CO_CIN_RE.test(registeredAs), status: e.status || '', city: (e.legalAddress && e.legalAddress.city) || '', country: (e.legalAddress && e.legalAddress.country) || '', address: coAddr(e.legalAddress), hq: coAddr(e.headquartersAddress), jurisdiction: e.jurisdiction || '', incorporated: (e.creationDate || '').slice(0, 10), aka: (e.otherNames || []).map(o => o.name).filter(Boolean).slice(0, 6), leiStatus: reg.status || '' };
  }
  async function gleifSearch(q, global) {
    let u = 'https://api.gleif.org/api/v1/lei-records?page%5Bsize%5D=12&filter%5Bentity.legalName%5D=' + encodeURIComponent(q);
    if (!global) u += '&filter%5Bentity.legalAddress.country%5D=IN';
    const r = await fetch(u, { headers: { 'Accept': 'application/vnd.api+json' }, signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(14000) : undefined });
    if (!r.ok) throw new Error('GLEIF ' + r.status);
    const j = await r.json();
    return (j.data || []).map(d => { __coGleif[d.id] = d; return gleifMap(d); });
  }
  async function gleifById(lei) {
    if (__coGleif[lei]) return gleifMap(__coGleif[lei]);
    const r = await fetch('https://api.gleif.org/api/v1/lei-records/' + encodeURIComponent(lei), { headers: { 'Accept': 'application/vnd.api+json' } });
    if (!r.ok) throw new Error('GLEIF ' + r.status);
    const j = await r.json(); __coGleif[lei] = j.data; return gleifMap(j.data);
  }
  function mcaMoney(v) { const n = parseFloat(v); if (!isFinite(n)) return ''; if (n >= 1e7) return '₹' + (n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr'; if (n >= 1e5) return '₹' + (n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L'; return '₹' + n.toLocaleString('en-IN'); }
  function mcaMap(r) { return { source: 'mca', name: r.CompanyName || '', cin: r.CIN || '', status: r.CompanyStatus || '', type: r.CompanyClass || '', classification: r.CompanySubCategory || '', category: r.CompanyCategory || '', incorporated: r.CompanyRegistrationdate_date || '', roc: (r.CompanyROCcode || '').replace(/^RoC[- ]?/i, 'ROC '), authCapital: mcaMoney(r.AuthorizedCapital), paidCapital: mcaMoney(r.PaidupCapital), listing: r.Listingstatus || '', nic: r.nic_code || '', activity: r.CompanyIndustrialClassification || '', address: (r.Registered_Office_Address || '').replace(/\s+/g, ' ').trim() }; }
  async function mcaClient(params) { let u = 'https://api.data.gov.in/resource/' + MCA_RES + '?api-key=' + MCA_KEY + '&format=json&limit=8'; for (const k in params) u += '&' + k + '=' + encodeURIComponent(params[k]); try { const r = await fetch(u, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(12000) : undefined }); if (!r.ok) return []; const j = await r.json(); return (j.records || []).map(mcaMap); } catch (e) { return []; } }
  function nameVariants(q) { const b = q.trim().toUpperCase().replace(/\s+/g, ' '); const bare = b.replace(/\s+(PRIVATE\s+)?LIMITED$|\s+LTD\.?$|\s+PVT\.?\s*LTD\.?$/i, '').trim(); return [...new Set([b, bare + ' PRIVATE LIMITED', bare + ' LIMITED'])]; }
  async function mcaSearch(q) { const up = q.trim().toUpperCase(); if (CO_CIN_RE.test(up)) return mcaClient({ 'filters[CIN]': up }); for (const v of nameVariants(q)) { const recs = await mcaClient({ 'filters[CompanyName]': v }); if (recs.length) return recs; } return []; }
  async function mcaByCin(cin) { const recs = await mcaClient({ 'filters[CIN]': cin }); return recs[0] || null; }

  function coLinks(core, cin) { const enc = encodeURIComponent(core); return '<div class="niy-co-links">' + (cin ? '<a href="https://www.zaubacorp.com/company/' + esc(core.replace(/\s+/g, '-')) + '/' + esc(cin) + '" target="_blank" rel="noopener">🏢 ZaubaCorp ↗</a>' : '') + '<a href="https://www.tofler.in/company-search?query=' + enc + '" target="_blank" rel="noopener">Tofler ↗</a><a href="https://opencorporates.com/companies?q=' + enc + '" target="_blank" rel="noopener">OpenCorporates ↗</a><a href="https://www.google.com/search?q=' + encodeURIComponent(core + ' company news') + '" target="_blank" rel="noopener">News ↗</a></div>'; }
  function coSaveRecent(o) { const rc = recent().filter(r => (o.lei ? r.lei !== o.lei : r.cin !== o.cin) && r.label !== o.label); rc.unshift(o); localStorage.setItem('niyCoRecent', JSON.stringify(rc.slice(0, 6))); }
  function coEnrich(core) {
    wikiSummary(core).then(w => { const el = coModal.querySelector('#coWiki'); if (!el) return; el.innerHTML = w ? '<div class="niy-co-desc" style="margin:0">' + esc(w.extract) + ' <a style="color:var(--accent,#7fb0ff)" target="_blank" rel="noopener" href="' + esc(w.url) + '">Wikipedia ↗</a></div>' : '<div class="niy-co-desc" style="margin:0">No Wikipedia article found.</div>'; });
    const cross = crossSearch(core), byCsv = {}; cross.forEach(h => { byCsv[h.csv] = (byCsv[h.csv] || 0) + 1; });
    const mc = coModal.querySelector('#coMentCount'); if (mc) mc.textContent = '(' + cross.length + (cross.length === 40 ? '+' : '') + ')';
    const men = coModal.querySelector('#coMentions'); if (men) men.innerHTML = Object.keys(byCsv).length ? Object.keys(byCsv).map(c => '<div class="niy-co-f" style="margin-bottom:6px"><div class="k">' + esc(c.replace(/_/g, ' ').replace('.csv', '')) + ' · ' + byCsv[c] + ' hit' + (byCsv[c] > 1 ? 's' : '') + '</div><div class="v" style="font-weight:500;font-size:10.5px;color:var(--fg-dim)">' + esc((cross.find(h => h.csv === c) || {}).snippet || '') + '…</div></div>').join('') : '<div class="niy-co-desc" style="margin:0">No mentions in the embedded datasets.</div>';
  }

  async function doSearch(q) {
    const body = coModal.querySelector('#coBody');
    if (!q) { body.innerHTML = '<div class="niy-co-sec">RECENT</div><div id="coRecent"></div>'; renderRecent(); return; }
    body.innerHTML = '<div class="niy-co-loading"><span class="niy-co-spin"></span>Searching company registries…</div>';
    const both = await Promise.all([
      gleifSearch(q, false).catch(() => []).then(r => (r && r.length) ? r : gleifSearch(q, true).catch(() => [])),
      mcaSearch(q).catch(() => [])
    ]);
    const gRes = both[0] || [], mRes = both[1] || [], seen = {}, hits = [];
    gRes.forEach(g => { hits.push({ ref: 'lei:' + g.lei, name: g.name, sub: (g.isCin ? 'CIN ' + g.registeredAs : (g.registeredAs ? 'Reg ' + g.registeredAs : 'LEI ' + g.lei)) + (g.city ? ' · ' + g.city : '') + (g.country && g.country !== 'IN' ? ' · ' + g.country : '') }); if (g.isCin) seen[g.registeredAs] = 1; });
    mRes.forEach(m => { if (m.cin && seen[m.cin]) return; if (m.cin) seen[m.cin] = 1; hits.push({ ref: 'cin:' + m.cin, name: m.name, sub: 'CIN ' + m.cin + (m.status ? ' · ' + m.status : '') + ' · MCA' }); });
    if (hits.length) {
      body.innerHTML = '<div class="niy-co-sec">COMPANY REGISTRY <span class="niy-co-2nd">· ' + hits.length + ' match' + (hits.length > 1 ? 'es' : '') + '</span></div>'
        + hits.map(h => '<button class="niy-co-hit" data-ref="' + esc(h.ref) + '" data-name="' + esc(h.name) + '"><b>' + esc(h.name) + '</b><span>' + esc(h.sub) + '</span></button>').join('');
      body.querySelectorAll('[data-ref]').forEach(b => b.addEventListener('click', () => showProfile(b.dataset.ref, b.dataset.name)));
      return;
    }
    await fallbackSearch(q);
  }
  async function fallbackSearch(q, err) {
    const body = coModal.querySelector('#coBody'); const enc = encodeURIComponent(q);
    body.innerHTML = '<div class="niy-co-sec">NO MATCH</div>'
      + '<div class="niy-co-desc">No company matched “' + esc(q) + '”. Try the full registered name (add “PRIVATE LIMITED”), or:</div>'
      + '<div class="niy-co-links"><a href="https://www.tofler.in/company-search?query=' + enc + '" target="_blank" rel="noopener">Tofler ↗</a><a href="https://www.mca.gov.in/mcafoportal/findCIN.do" target="_blank" rel="noopener">MCA ↗</a></div>';
  }
  async function showProfile(ref, name) {
    const body = coModal.querySelector('#coBody');
    body.innerHTML = '<div class="niy-co-loading"><span class="niy-co-spin"></span>Loading ' + esc(name || '') + '…</div>';
    try {
      if (/^cin:/.test(ref)) { const co = await mcaByCin(ref.slice(4)); if (co) { renderMcaProfile(co, name); return; } }
      else if (/^lei:/.test(ref)) { const g = await gleifById(ref.slice(4)); renderCoProfile(g, name); return; }
    } catch (e) { }
    body.innerHTML = '<div class="niy-co-desc">Couldn’t load that record. <a style="color:var(--accent,#7fb0ff)" target="_blank" rel="noopener" href="https://www.tofler.in/company-search?query=' + encodeURIComponent(name || '') + '">Tofler ↗</a></div>';
  }
  function renderMcaProfile(co, name) {
    const body = coModal.querySelector('#coBody'); const core = coreOf(co.name || name || '');
    const ok = /active/i.test(co.status);
    const fields = [['CIN', co.cin], ['Status', co.status], ['Type', co.type], ['Class', co.classification], ['Category', co.category], ['Incorporated', co.incorporated], ['Registrar (ROC)', co.roc], ['Authorized capital', co.authCapital], ['Paid-up capital', co.paidCapital], ['Listing', co.listing], [('Activity' + (co.nic ? ' · NIC ' + co.nic : '')), co.activity]].filter(f => f[1]);
    body.innerHTML = '<div class="niy-co-prof"><h2>' + esc(co.name || name) + (co.status ? ' <span class="niy-co-badge ' + (ok ? 'ok' : 'warn') + '">' + esc(co.status) + '</span>' : '') + '</h2>'
      + '<div class="niy-co-src">● MCA — Ministry of Corporate Affairs <span class="niy-co-2nd">(official)</span></div>'
      + '<div class="niy-co-grid">' + fields.map(f => '<div class="niy-co-f"><div class="k">' + esc(f[0]) + '</div><div class="v">' + esc(f[1]) + '</div></div>').join('') + '</div>'
      + (co.address ? '<div class="niy-co-f" style="margin-bottom:6px"><div class="k">Registered address</div><div class="v" style="font-weight:500">' + esc(co.address) + '</div></div>' : '')
      + '<div class="niy-co-sec">ABOUT <span class="niy-co-2nd">· WIKIPEDIA</span></div><div id="coWiki"><div class="niy-co-desc" style="margin:0">Looking up Wikipedia…</div></div>'
      + coLinks(core, co.cin)
      + '<div class="niy-co-sec">MENTIONS IN TERMINAL DATA <span id="coMentCount"></span></div><div id="coMentions"><div class="niy-co-desc" style="margin:0">Scanning…</div></div></div>';
    coSaveRecent({ cin: co.cin, label: co.name || name, desc: co.roc || co.category || '' });
    coEnrich(core);
  }
  function renderCoProfile(g, name) {
    const body = coModal.querySelector('#coBody'); const core = coreOf(g.name || name || '');
    const statusOk = /active|issued/i.test(g.status);
    const fields = [[g.isCin ? 'CIN' : 'Registration no.', g.registeredAs], ['LEI', g.lei], ['Incorporated', g.incorporated], ['Jurisdiction', g.jurisdiction], ['LEI status', g.leiStatus]].filter(f => f[1]);
    body.innerHTML = '<div class="niy-co-prof"><h2>' + esc(g.name || name) + (g.status ? ' <span class="niy-co-badge ' + (statusOk ? 'ok' : 'warn') + '">' + esc(g.status) + '</span>' : '') + '</h2>'
      + '<div class="niy-co-src">● GLEIF — Global LEI registry <span class="niy-co-2nd">(official)</span></div>'
      + (g.aka.length ? '<div class="niy-co-desc" style="margin-top:2px">a.k.a. ' + esc(g.aka.join(' · ')) + '</div>' : '')
      + '<div class="niy-co-grid">' + fields.map(f => '<div class="niy-co-f"><div class="k">' + esc(f[0]) + '</div><div class="v">' + esc(f[1]) + '</div></div>').join('') + '</div>'
      + (g.address ? '<div class="niy-co-f" style="margin-bottom:6px"><div class="k">Registered address</div><div class="v" style="font-weight:500">' + esc(g.address) + '</div></div>' : '')
      + (g.hq && g.hq !== g.address ? '<div class="niy-co-f" style="margin-bottom:6px"><div class="k">Headquarters</div><div class="v" style="font-weight:500">' + esc(g.hq) + '</div></div>' : '')
      + (g.isCin ? '<div id="coMca"></div>' : '')
      + '<div class="niy-co-sec">ABOUT <span class="niy-co-2nd">· WIKIPEDIA</span></div><div id="coWiki"><div class="niy-co-desc" style="margin:0">Looking up Wikipedia…</div></div>'
      + coLinks(core, g.isCin ? g.registeredAs : '')
      + '<div class="niy-co-sec">MENTIONS IN TERMINAL DATA <span id="coMentCount"></span></div><div id="coMentions"><div class="niy-co-desc" style="margin:0">Scanning…</div></div></div>';
    coSaveRecent({ lei: g.lei, label: g.name || name, desc: g.city || g.jurisdiction || '' });
    if (g.isCin) mcaByCin(g.registeredAs).then(co => { const el = coModal.querySelector('#coMca'); if (!el || !co) return; const mf = [['Type', co.type], ['Class', co.classification], ['Registrar (ROC)', co.roc], ['Authorized capital', co.authCapital], ['Paid-up capital', co.paidCapital], [('Activity' + (co.nic ? ' · NIC ' + co.nic : '')), co.activity], ['Listing', co.listing]].filter(f => f[1]); if (mf.length) el.innerHTML = '<div class="niy-co-sec">MCA MASTER DATA <span class="niy-co-2nd">· official</span></div><div class="niy-co-grid">' + mf.map(f => '<div class="niy-co-f"><div class="k">' + esc(f[0]) + '</div><div class="v">' + esc(f[1]) + '</div></div>').join('') + '</div>'; });
    coEnrich(core);
  }

  async function showProfileWd(id, label) {
    const body = coModal.querySelector('#coBody');
    body.innerHTML = '<div class="niy-co-desc">Loading ' + esc(label) + '…</div>';
    try {
      const ents = await wdEntities([id]);
      const ent = ents[id];
      const desc = ((ent.descriptions || {}).en || {}).value || '';
      const refProps = { industry: 'P452', hq: 'P159', country: 'P17', ceo: 'P169', chair: 'P488', parent: 'P749', owner: 'P127', exchange: 'P414' };
      const refIds = {};
      Object.keys(refProps).forEach(k => { refIds[k] = claimIds(ent, refProps[k]).slice(0, 2); });
      const flat = [...new Set(Object.values(refIds).flat())].slice(0, 20);
      const refEnts = await wdEntities(flat);
      const lbl = qid => ((refEnts[qid] || {}).labels || {}).en ? refEnts[qid].labels.en.value : '';
      const j = k => refIds[k].map(lbl).filter(Boolean).join(', ');
      const website = claimStr(ent, 'P856'), inception = claimTime(ent, 'P571'), employees = claimQty(ent, 'P1128'), isin = claimStr(ent, 'P946');
      const fields = [
        ['Industry', j('industry')], ['Founded', inception], ['Headquarters', j('hq')], ['Country', j('country')],
        ['CEO', j('ceo')], ['Chairperson', j('chair')], ['Parent', j('parent')], ['Owner', j('owner')],
        ['Employees', employees], ['Listed on', j('exchange')], ['ISIN', isin],
      ].filter(f => f[1]);
      const coreName = coreOf(label);
      const cross = crossSearch(coreName);
      const byCsv = {};
      cross.forEach(h => { byCsv[h.csv] = (byCsv[h.csv] || 0) + 1; });
      const encCore = encodeURIComponent(coreName);
      body.innerHTML = '<div class="niy-co-prof"><h2>' + esc(label) + '</h2><div class="niy-co-src" style="color:#c99a3f">● Wikidata open data (registry offline)</div><div class="niy-co-desc">' + esc(desc) + '</div>'
        + '<div class="niy-co-grid">' + fields.map(f => '<div class="niy-co-f"><div class="k">' + f[0] + '</div><div class="v">' + esc(f[1]) + '</div></div>').join('') + '</div>'
        + (website ? '<div class="niy-co-links"><a href="' + esc(website) + '" target="_blank" rel="noopener">🌐 Website ↗</a>' : '<div class="niy-co-links">')
        + '<a href="https://www.zaubacorp.com/companysearchresults/' + encCore + '" target="_blank" rel="noopener" title="India · MCA-linked filings">ZaubaCorp ↗</a>'
        + '<a href="https://www.tofler.in/company-search?query=' + encCore + '" target="_blank" rel="noopener" title="India · company filings">Tofler ↗</a>'
        + '<a href="https://opencorporates.com/companies?q=' + encCore + '" target="_blank" rel="noopener" title="Global open company registry">OpenCorporates ↗</a>'
        + '<a href="https://www.google.com/search?q=' + encodeURIComponent(coreName + ' company news') + '" target="_blank" rel="noopener">News ↗</a>'
        + '<a href="https://www.wikidata.org/wiki/' + id + '" target="_blank" rel="noopener">Wikidata ↗</a></div>'
        + '<div class="niy-co-sec">MENTIONS IN TERMINAL DATA (' + cross.length + (cross.length === 40 ? '+' : '') + ')</div>'
        + (Object.keys(byCsv).length
          ? Object.keys(byCsv).map(c => '<div class="niy-co-f" style="margin-bottom:6px"><div class="k">' + esc(c.replace(/_/g, ' ').replace('.csv', '')) + ' · ' + byCsv[c] + ' hit' + (byCsv[c] > 1 ? 's' : '') + '</div><div class="v" style="font-weight:500;font-size:10.5px;color:var(--fg-dim)">' + esc((cross.find(h => h.csv === c) || {}).snippet || '') + '…</div></div>').join('')
          : '<div class="niy-co-desc">No mentions in the embedded datasets.</div>')
        + '<div class="niy-co-note">SOURCE · WIKIDATA — REGISTRY OFFLINE</div></div>';
      const rc = recent().filter(r => r.id !== id); rc.unshift({ id, label, desc: desc.slice(0, 60) });
      localStorage.setItem('niyCoRecent', JSON.stringify(rc.slice(0, 6)));
    } catch (e) { body.innerHTML = '<div class="niy-co-desc">Profile failed: ' + esc(e.message) + '</div>'; }
  }

  /* replace the clock with the Company button (module-contained, reversible) */
  (function swapClock() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const clock = document.querySelector('.clock');
      if (clock && !document.getElementById('niyCoBtn')) {
        clock.style.display = 'none';
        const b = document.createElement('button');
        b.id = 'niyCoBtn'; b.type = 'button'; b.className = 'niy-co-btn';
        b.title = 'Company Search — GLEIF global registry + MCA + Wikipedia';
        b.innerHTML = '<span class="ico">🏢</span> COMPANY';
        b.addEventListener('click', openCo);
        // group with the other header action buttons (STREAM / ⌘K / Refresh)
        const qc = document.querySelector('.quick-controls');
        if (qc) qc.insertBefore(b, qc.firstChild); else clock.parentNode.insertBefore(b, clock);
        clearInterval(t);
      }
      if (tries > 80) clearInterval(t);
    }, 300);
  })();
  try { window.NiyCompany = { open: openCo, search: wdSearch, cross: crossSearch, refreshFeed: refreshFeed }; } catch (e) { }
})();

