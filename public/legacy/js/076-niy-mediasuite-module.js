
/* ================================================================
   MEDIA SUITE — a MOJO-style journalist portal system, mounted as a
   sub-feature of STREAM. Fully self-contained (this one script block
   + its own localStorage doc `niyMediaSuite` + IndexedDB store
   `niy-media-suite`): remove the block and the Terminal is untouched.
   Feature flag: FEATURE_MEDIA_SUITE (localStorage; default on).
   ================================================================ */
(function () {
  'use strict';
  const FLAG = (function () { try { const v = localStorage.getItem('FEATURE_MEDIA_SUITE'); return v === null ? true : v !== 'false' && v !== '0'; } catch (e) { return true; } })();
  if (!FLAG) { try { console.info('[MediaSuite] disabled via FEATURE_MEDIA_SUITE'); } catch (e) { } return; }

  /* ---------------- utils (module-local; no leakage) ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (t, c, h) => { const d = document.createElement(t); if (c) d.className = c; if (h != null) d.innerHTML = h; return d; };
  const uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => Date.now();
  const fmtDT = ts => { const d = new Date(ts); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); };
  const fmtD = ts => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const rel = ts => { const s = (now() - ts) / 1000; if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' hours ago'; return Math.round(s / 86400) + ' days ago'; };
  const toast = m => { const t = el('div', 'ms-toast', esc(m)); document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const dl = (name, blob) => { const a = document.createElement('a'); a.download = name; a.href = typeof blob === 'string' ? blob : URL.createObjectURL(blob); a.click(); if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 9000); };
  const pickFile = (accept, multi) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.multiple = !!multi; i.onchange = () => res(multi ? Array.from(i.files) : i.files[0]); i.click(); });
  const slugify = s => { const latin = String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return latin.length > 3 ? latin.slice(0, 70) : 'post-' + Date.now().toString(36); };
  const csvDl = (name, headers, rows) => { const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; dl(name, new Blob(['﻿' + headers.map(q).join(',') + '\n' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })); };

  /* ---------------- data layer ---------------- */
  const LS = 'niyMediaSuite';
  function seed() {
    const cats = ['Astrology & Spiritual', 'Bihar Special', 'Crime', 'Business', 'Education', 'arthvavastha'].map((n, i) => ({ id: 'c' + (i + 1), name: n }));
    const posts = [
      { title: 'Demo: Welcome to your Media Suite portal', lang: 'en', cat: 'c4', body: '<p>This is a sample article seeded so the portal has content on first run. Replace it with real reporting — every publish here appears instantly on your public portal.</p>', status: 'publish' },
      { title: 'डेमो: आपका न्यूज़ पोर्टल तैयार है', lang: 'hi', cat: 'c3', body: '<p>यह एक नमूना लेख है। News Post से नई खबर जोड़ें — प्रकाशित होते ही यह आपके पोर्टल पर दिखेगी।</p>', status: 'publish' },
      { title: 'డెమో: మీ న్యూస్ పోర్టల్ సిద్ధంగా ఉంది', lang: 'te', cat: 'c5', body: '<p>ఇది ఒక నమూనా కథనం. మీ సొంత వార్తలు జోడించండి.</p>', status: 'publish' },
      { title: 'ডেমো: আপনার নিউজ পোর্টাল প্রস্তুত', lang: 'bn', cat: 'c2', body: '<p>এটি একটি নমুনা নিবন্ধ। আপনার নিজের সংবাদ যোগ করুন।</p>', status: 'publish' },
      { title: 'Demo: Draft example — not visible on portal', lang: 'en', cat: 'c4', body: '<p>Drafts stay in the backend until published.</p>', status: 'draft' },
    ].map((p, i) => ({ id: uid('p'), title: p.title, slug: slugify(p.title), lang: p.lang, cat: p.cat, tags: ['demo'], body: p.body, coverId: '', mediaIds: [], addedFrom: 'Self', addedBy: 'Owner', ai: false, status: p.status, created: now() - (i + 1) * 86400e3, published: p.status === 'publish' ? now() - (i + 1) * 86400e3 : 0, views: [24, 18, 12, 9, 0][i] || 0, likes: 0, dislikes: 0, sourceUrl: '' }));
    return {
      v: 1,
      settings: { portalName: 'आपका पोर्टल नाम', reporterName: 'Niyantran Reporter', email: '', themeColor: '#c1121f', city: 'Bhopal', languages: ['hi', 'en', 'te', 'bn'], logoId: '', socials: { facebook: '', twitter: '', instagram: '', youtube: '' }, liveUrl: '', liveTitle: '', liveScheduled: '', domain: '', maxReelSec: 60, maxReelMB: 10 },
      categories: cats, posts: posts, comments: [], bulletins: [], softStories: [], renderJobs: [],
      epaper: [], ads: [], shares: [], wa: { connected: false, members: [], groups: [], logs: [] },
      pullSources: [{ id: uid('src'), name: 'PIB (demo source)', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', enabled: true }], pullItems: [],
      subReporters: [], activeAuthor: 'Owner',
    };
  }
  let DB;
  try { DB = JSON.parse(localStorage.getItem(LS) || 'null') || seed(); } catch (e) { DB = seed(); }
  if (!DB.v) DB = Object.assign(seed(), DB);
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(DB)); } catch (e) { toast('Storage full — delete old media in Media Manager'); } }, 250); };
  save();

  /* IndexedDB blob store (media, logos, PDFs) */
  const IDB = { db: null };
  function idb() {
    return new Promise((res, rej) => {
      if (IDB.db) return res(IDB.db);
      const r = indexedDB.open('niy-media-suite', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => { IDB.db = r.result; res(IDB.db); };
      r.onerror = () => rej(r.error);
    });
  }
  async function blobPut(id, blob) { const d = await idb(); return new Promise((res, rej) => { const tx = d.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  async function blobGet(id) { if (!id) return null; const d = await idb(); return new Promise(res => { const rq = d.transaction('blobs').objectStore('blobs').get(id); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); }
  async function blobDel(id) { const d = await idb(); const tx = d.transaction('blobs', 'readwrite'); tx.objectStore('blobs').delete(id); }
  const urlCache = {};
  async function blobUrl(id) { if (!id) return ''; if (urlCache[id]) return urlCache[id]; const b = await blobGet(id); if (!b) return ''; urlCache[id] = URL.createObjectURL(b); return urlCache[id]; }
  // media registry lives in DB.media
  DB.media = DB.media || []; // {id,type:'image'|'video'|'pdf',name,mime,size,w,h,duration,ownerPostId,created}
  async function addMedia(file, meta) {
    const id = uid('m');
    await blobPut(id, file);
    const rec = Object.assign({ id, type: file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'pdf' : 'image', name: file.name || id, mime: file.type, size: file.size, ownerPostId: '', created: now() }, meta || {});
    DB.media.push(rec); save();
    return rec;
  }

  /* analytics */
  const catName = id => (DB.categories.find(c => c.id === id) || {}).name || '—';
  function shareEvent(channel, kind, refId) { DB.shares.push({ id: uid('s'), channel, kind, refId, ts: now() }); save(); }
  function bump(obj, field) { obj[field] = (obj[field] || 0) + 1; save(); }

  /* ---------------- styles ---------------- */
  (function css() {
    if (document.getElementById('niy-ms-css')) return;
    const s = document.createElement('style'); s.id = 'niy-ms-css';
    s.textContent = [
      ".ms-wrap{flex:1;display:flex;min-height:0;font-variant-numeric:tabular-nums}",
      ".ms-side{width:225px;flex:0 0 auto;border-right:1px solid var(--line,#262626);background:var(--panel,#0b0b0b);overflow-y:auto;scrollbar-width:thin;display:flex;flex-direction:column}",
      ".ms-brand{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid var(--line,#262626)}",
      ".ms-brand img{width:30px;height:30px;border-radius:7px;object-fit:cover;background:#222}",
      ".ms-brand .n{font-size:12px;font-weight:750;line-height:1.3}",
      ".ms-brand .e{font-size:9px;color:var(--fg-faint,#525252)}",
      ".ms-grp{font-size:8.5px;font-weight:700;letter-spacing:.15em;color:var(--fg-faint,#525252);padding:13px 14px 5px}",
      ".ms-nav{display:block;width:calc(100% - 12px);margin:1px 6px;text-align:left;background:transparent;border:0;border-radius:8px;color:var(--fg-dim,#8f8f8f);font-size:12px;font-weight:600;padding:8px 10px;cursor:pointer;display:flex;align-items:center;gap:9px}",
      ".ms-nav:hover{background:var(--panel-2,#131313);color:var(--fg,#eaeaea)}",
      ".ms-nav.active{background:var(--ms-acc,#c1121f);color:#fff}",
      ".ms-nav .ic{width:15px;text-align:center;opacity:.85}",
      ".ms-main{flex:1;min-width:0;display:flex;flex-direction:column}",
      ".ms-top{display:flex;align-items:center;gap:9px;padding:9px 16px;border-bottom:1px solid var(--line,#262626);flex-wrap:wrap}",
      ".ms-title{font-size:17px;font-weight:750;letter-spacing:-.01em}",
      ".ms-sub{font-size:10.5px;color:var(--fg-faint,#525252)}",
      ".ms-body{flex:1;overflow-y:auto;padding:16px;scrollbar-width:thin}",
      ".ms-btn{display:inline-flex;align-items:center;gap:6px;background:var(--panel-2,#131313);border:1px solid var(--line,#262626);border-radius:7px;color:var(--fg-dim,#b9c2cc);font-size:11px;font-weight:650;padding:6px 12px;cursor:pointer}",
      ".ms-btn:hover{color:var(--fg,#fff);border-color:var(--line-bright,#3d3d3d)}",
      ".ms-btn.pri{background:var(--ms-acc,#c1121f);border-color:transparent;color:#fff}",
      ".ms-btn.grn{background:rgba(76,154,90,.16);border-color:rgba(76,154,90,.4);color:#7fc98f}",
      ".ms-btn.wa{background:rgba(37,211,102,.14);border-color:rgba(37,211,102,.4);color:#4ad07a}",
      ".ms-in,.ms-sel,textarea.ms-in{background:var(--panel-2,#131313);border:1px solid var(--line,#262626);border-radius:7px;color:var(--fg,#eaeaea);font-size:12px;padding:7px 10px;outline:none;font-family:inherit}",
      ".ms-in:focus,textarea.ms-in:focus{border-color:var(--ms-acc,#c1121f)}",
      ".ms-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:11px;margin-bottom:16px}",
      ".ms-card{background:var(--panel,#0b0b0b);border:1px solid var(--line,#262626);border-left:3px solid var(--ms-acc,#c1121f);border-radius:11px;padding:13px 15px}",
      ".ms-card .k{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--fg-dim,#8f8f8f);text-transform:uppercase}",
      ".ms-card .v{font-size:24px;font-weight:750;margin-top:6px}",
      ".ms-card.b2{border-left-color:#4c9a5a}.ms-card.b3{border-left-color:#c99a3f}.ms-card.b4{border-left-color:#7fb0ff}",
      ".ms-panel{background:var(--panel,#0b0b0b);border:1px solid var(--line,#262626);border-radius:11px;padding:13px 15px;margin-bottom:14px}",
      ".ms-tblbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:9px;font-size:11px;color:var(--fg-dim,#8f8f8f)}",
      ".ms-table{width:100%;border-collapse:collapse;font-size:11.5px}",
      ".ms-table th{text-align:left;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--fg-faint,#525252);padding:7px 9px;border-bottom:1px solid var(--line,#262626);white-space:nowrap}",
      ".ms-table td{padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle;color:var(--fg-dim,#c8c8c8)}",
      ".ms-table tr:hover td{background:rgba(255,255,255,.025)}",
      ".ms-badge{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.05em;border-radius:999px;padding:2px 9px}",
      ".ms-badge.self{color:#7fc98f;border:1px solid rgba(76,154,90,.5)}",
      ".ms-badge.pull{color:#7fb0ff;border:1px solid rgba(127,176,255,.5)}",
      ".ms-badge.ai{color:#c9b3ff;background:rgba(150,110,255,.14);border:1px solid rgba(150,110,255,.45)}",
      ".ms-badge.pub{color:#7fc98f;background:rgba(76,154,90,.12)}",
      ".ms-badge.draft{color:#e6c069;background:rgba(201,154,63,.12)}",
      ".ms-badge.unpub{color:#e08484;background:rgba(184,86,79,.12)}",
      ".ms-badge.run{color:#7fc98f;background:rgba(76,154,90,.14)}",
      ".ms-badge.sched{color:#7fb0ff;background:rgba(127,176,255,.12)}",
      ".ms-badge.ended{color:#8f8f8f;background:rgba(255,255,255,.06)}",
      ".ms-badge.cat{color:var(--fg-dim,#9aa);border:1px solid var(--line,#333)}",
      ".ms-thumb{width:64px;height:100px;object-fit:cover;border-radius:8px;background:#111;border:1px solid var(--line,#262626)}",
      ".ms-thumb.land{width:120px;height:68px}",
      ".ms-note{font-size:10.5px;line-height:1.6;color:var(--fg-faint,#6f6f6f)}",
      ".ms-honest{display:flex;gap:9px;background:rgba(201,154,63,.07);border:1px solid rgba(201,154,63,.3);border-radius:9px;padding:10px 12px;font-size:10.5px;line-height:1.6;color:#c9a96a;margin-bottom:12px}",
      ".ms-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:9px}",
      ".ms-lbl{font-size:9.5px;font-weight:700;letter-spacing:.09em;color:var(--fg-faint,#525252);min-width:86px;text-transform:uppercase}",
      ".ms-toast{position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:99999;background:#161b23;border:1px solid rgba(255,255,255,.16);border-radius:10px;color:#eee;font-size:12px;padding:9px 16px;box-shadow:0 12px 34px rgba(0,0,0,.5)}",
      ".ms-modal-ov{position:fixed;inset:0;z-index:9700;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:22px}",
      ".ms-modal{width:min(760px,95vw);max-height:92vh;overflow-y:auto;background:var(--panel,#0e0e0e);border:1px solid var(--line-bright,#3d3d3d);border-radius:14px;padding:20px 22px;scrollbar-width:thin}",
      ".ms-modal h3{margin:0 0 13px;font-size:15px}",
      ".ms-ed{min-height:170px;background:var(--panel-2,#131313);border:1px solid var(--line,#262626);border-radius:9px;padding:12px 14px;font-size:13.5px;line-height:1.8;outline:none}",
      ".ms-ed:focus{border-color:var(--ms-acc,#c1121f)}",
      ".ms-pager{display:flex;gap:5px;align-items:center;margin-top:9px;font-size:11px;color:var(--fg-dim,#8f8f8f)}",
      ".ms-mediagrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:11px}",
      ".ms-mcard{background:var(--panel,#0b0b0b);border:1px solid var(--line,#262626);border-radius:10px;padding:9px;font-size:10.5px}",
      ".ms-mcard video,.ms-mcard img{width:100%;border-radius:7px;background:#000;max-height:200px;object-fit:contain}",
      /* viral tool */
      ".ms-vt{display:flex;gap:16px;flex-wrap:wrap}",
      ".ms-vt-stage{flex:0 0 auto;background:#000;border:1px solid var(--line,#333);border-radius:12px;overflow:hidden;position:relative}",
      ".ms-vt-panel{flex:1;min-width:280px}",
      ".ms-vt-drop{border:2px dashed var(--line-bright,#3d3d3d);border-radius:11px;padding:26px;text-align:center;color:var(--fg-dim,#8f8f8f);cursor:pointer;font-size:12px}",
      ".ms-vt-drop:hover{border-color:var(--ms-acc,#c1121f)}",
      ".ms-vt-ar{display:flex;gap:7px;margin:9px 0}",
      ".ms-vt-ar .ms-btn.on{background:var(--ms-acc,#c1121f);color:#fff;border-color:transparent}",
      /* stories rail (admin preview + portal) */
      ".ms-reelwrap{position:fixed;inset:0;z-index:9800;background:#000;display:flex;align-items:center;justify-content:center}",
      ".ms-reelwrap video{height:100%;max-width:100vw}",
      ".ms-reel-x{position:absolute;top:14px;right:16px;font-size:26px;color:#fff;background:transparent;border:0;cursor:pointer;z-index:2}",
      ".ms-reel-meta{position:absolute;left:14px;bottom:20px;color:#fff;max-width:70vw;text-shadow:0 1px 4px #000}",
      ".ms-reel-acts{position:absolute;right:12px;bottom:70px;display:flex;flex-direction:column;gap:14px;z-index:2}",
      ".ms-reel-acts button{background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:50%;width:44px;height:44px;font-size:16px;cursor:pointer}",
    ].join('');
    document.head.appendChild(s);
  })();

  /* ---------------- table helper (Show N / search / pager / CSV) ---------------- */
  function dataTable(host, cfg) {
    // cfg: {columns:[{h, w?, cell(row,i)}], rows(), search(row,q), csvName, csvRow(row), pageSizes, empty, actionsHtml}
    let q = '', pageSize = (cfg.pageSizes || [10, 25, 50])[0], page = 0;
    function render() {
      const all = cfg.rows().filter(r => !q || cfg.search(r, q.toLowerCase()));
      const pages = Math.max(1, Math.ceil(all.length / pageSize));
      page = Math.min(page, pages - 1);
      const slice = all.slice(page * pageSize, page * pageSize + pageSize);
      host.innerHTML = '<div class="ms-tblbar">Show <select class="ms-sel" data-ps>' + (cfg.pageSizes || [10, 25, 50]).map(n => '<option' + (n === pageSize ? ' selected' : '') + '>' + n + '</option>').join('') + '</select> entries'
        + '<span style="flex:1"></span>' + (cfg.csvName ? '<button class="ms-btn grn" data-csv>⤓ Export CSV</button>' : '')
        + 'Search: <input class="ms-in" data-q style="width:170px" value="' + esc(q) + '"/></div>'
        + '<div style="overflow-x:auto"><table class="ms-table"><thead><tr>' + cfg.columns.map(c => '<th' + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + c.h + '</th>').join('') + '</tr></thead><tbody>'
        + (slice.map((r, i) => '<tr>' + cfg.columns.map(c => '<td>' + c.cell(r, page * pageSize + i) + '</td>').join('') + '</tr>').join('') || '<tr><td colspan="' + cfg.columns.length + '" style="text-align:center;padding:22px;color:var(--fg-faint)">' + (cfg.empty || 'No records yet.') + '</td></tr>')
        + '</tbody></table></div>'
        + '<div class="ms-pager">Page ' + (page + 1) + ' / ' + pages + ' · ' + all.length + ' records <span style="flex:1"></span><button class="ms-btn" data-pg="-1">‹ Prev</button><button class="ms-btn" data-pg="1">Next ›</button></div>';
      host.querySelector('[data-q]').addEventListener('input', e => { q = e.target.value; page = 0; render(); const inp = host.querySelector('[data-q]'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); });
      host.querySelector('[data-ps]').addEventListener('change', e => { pageSize = +e.target.value; page = 0; render(); });
      host.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { page = Math.max(0, Math.min(pages - 1, page + (+b.dataset.pg))); render(); }));
      const cb = host.querySelector('[data-csv]');
      if (cb) cb.addEventListener('click', () => csvDl(cfg.csvName, cfg.columns.map(c => c.h.replace(/<[^>]+>/g, '')), all.map(cfg.csvRow)));
      if (cfg.wire) cfg.wire(host, slice);
    }
    render();
    return { refresh: render };
  }
  function modal(html) {
    const ov = el('div', 'ms-modal-ov'); ov.innerHTML = '<div class="ms-modal">' + html + '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    return ov;
  }

  /* ---------------- WhatsApp share (real wa.me one-tap) ---------------- */
  function waShare(text, kind, refId) {
    shareEvent('whatsapp', kind, refId);
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  /* ---------------- suite shell + nav ---------------- */
  const SECTIONS = [
    ['DASHBOARD', [['dashboard', '🏠', 'Dashboard']]],
    ['CONTENT MANAGEMENT', [['news', '📰', 'News Post'], ['bulletin', '📣', 'Bulletin'], ['stories', '🎞', 'Soft Stories'], ['viral', '⚡', 'Viral Tool'], ['media', '🎬', 'Media Manager'], ['pull', '☁', 'Pull News'], ['epaper', '🗞', 'E-Paper']]],
    ['ADS MANAGER', [['ads', '📢', 'Ads Manager']]],
    ['SOCIAL ACCOUNTS', [['wa', '💬', 'WhatsApp']]],
    ['SYSTEM', [['subrep', '👥', 'Sub Reporter'], ['settings', '⚙', 'Account Setting']]],
  ];
  const VIEWS = {}; // id -> render(bodyEl)
  let curView = 'dashboard', shellBody = null, shellRoot = null;

  async function renderShell(root) {
    shellRoot = root;
    const logoUrl = await blobUrl(DB.settings.logoId);
    root.innerHTML = '<div class="ms-wrap" style="--ms-acc:' + esc(DB.settings.themeColor || '#c1121f') + '">'
      + '<div class="ms-side"><div class="ms-brand">' + (logoUrl ? '<img src="' + logoUrl + '"/>' : '<span style="font-size:22px">🗞</span>')
      + '<div><div class="n">' + esc(DB.settings.portalName) + '</div><div class="e">' + esc(DB.settings.reporterName) + '</div></div></div>'
      + SECTIONS.map(g => '<div class="ms-grp">' + g[0] + '</div>' + g[1].map(it => '<button class="ms-nav' + (it[0] === curView ? ' active' : '') + '" data-v="' + it[0] + '"><span class="ic">' + it[1] + '</span>' + it[2] + '</button>').join('')).join('')
      + '<div style="flex:1"></div><div class="ms-note" style="padding:12px 14px">Media Suite · FEATURE_MEDIA_SUITE</div></div>'
      + '<div class="ms-main"><div class="ms-top"><div><div class="ms-title" id="msViewTitle"></div><div class="ms-sub" id="msViewSub"></div></div><span style="flex:1"></span>'
      + '<button class="ms-btn" id="msExportPortal" title="Download the public portal as a standalone HTML file">⤓ Export Portal</button>'
      + '<button class="ms-btn pri" id="msVisit">🌐 Visit Site</button></div>'
      + '<div class="ms-body" id="msBody"></div></div></div>';
    shellBody = root.querySelector('#msBody');
    root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => go(b.dataset.v)));
    root.querySelector('#msVisit').addEventListener('click', () => openPortal());
    root.querySelector('#msExportPortal').addEventListener('click', () => exportPortal());
    go(curView);
  }
  const TITLES = { dashboard: ['Dashboard', "Welcome back! Here's what's happening with your news portal."], news: ['News Management', 'Manage your news articles and content'], bulletin: ['Bulletin', 'Video news bulletins'], stories: ['Soft Stories', 'Short vertical video stories'], viral: ['Viral Tool', 'Reel editor with your branding'], media: ['Media Manager', 'All uploaded media'], pull: ['Pull News', 'Aggregate from configured sources'], epaper: ['E-Paper', 'Dated PDF editions'], ads: ['Ad Management', 'Creatives, slots and schedules'], wa: ['WhatsApp', 'Sharing, members, groups and broadcast'], subrep: ['Sub Reporter', 'Invite and review sub-reporters'], settings: ['Account Setting', 'Portal branding and configuration'] };
  function go(v) {
    curView = v;
    if (!shellRoot) return;
    shellRoot.querySelectorAll('.ms-nav').forEach(b => b.classList.toggle('active', b.dataset.v === v));
    const t = TITLES[v] || [v, '']; shellRoot.querySelector('#msViewTitle').textContent = t[0]; shellRoot.querySelector('#msViewSub').textContent = t[1];
    shellBody.innerHTML = '';
    try { VIEWS[v](shellBody); } catch (e) { shellBody.innerHTML = '<div class="ms-note">View failed: ' + esc(e.message) + '</div>'; }
  }

  /* expose module API for later files + tests */
  window.NiyMediaSuite = { DB, save, go, renderShell, VIEWS, dataTable, modal, esc, el, uid, fmtDT, fmtD, rel, toast, dl, pickFile, slugify, csvDl, addMedia, blobUrl, blobGet, blobPut, blobDel, waShare, shareEvent, bump, catName, urlCache, get openPortal() { return openPortal; }, get exportPortal() { return exportPortal; } };


  /* ================= DASHBOARD ================= */
  VIEWS.dashboard = function (body) {
    let from = 0, to = Infinity;
    const wrap = el('div'); body.appendChild(wrap);
    function stats() {
      const P = DB.posts.filter(p => p.created >= from && p.created <= to);
      const sh = DB.shares.filter(s => s.ts >= from && s.ts <= to);
      const by = ch => sh.filter(s => s.channel === ch).length;
      return { cats: DB.categories.length, posts: P.length, stories: DB.softStories.length, bulletins: DB.bulletins.length,
        views: P.reduce((a, p) => a + (p.views || 0), 0), comments: DB.comments.length,
        likes: P.reduce((a, p) => a + (p.likes || 0), 0), dislikes: P.reduce((a, p) => a + (p.dislikes || 0), 0),
        sharing: sh.length, wa: by('whatsapp'), fb: by('facebook'), tw: by('twitter'), li: by('linkedin'), ig: by('instagram') };
    }
    function render() {
      const s = stats();
      wrap.innerHTML = '<div class="ms-row"><input class="ms-in" type="date" id="dFrom"/><span class="ms-note">to</span><input class="ms-in" type="date" id="dTo"/>'
        + '<button class="ms-btn" id="dGo">🔍 Search</button><span style="flex:1"></span><button class="ms-btn pri" id="dAdd">＋ Add News</button></div>'
        + '<div class="ms-cards">'
        + card('Total News Category', s.cats, '') + card('Total News Post', s.posts, 'b4') + card('Total Soft Story', s.stories, 'b2') + card('Total Bulletin', s.bulletins, 'b3')
        + card('Total News View', s.views, 'b4') + card('Total News Comment', s.comments, '') + card('Total News Like', s.likes, 'b2') + card('Total News Dislike', s.dislikes, '')
        + '</div><div class="ms-grp" style="padding-left:2px">SHARING</div><div class="ms-cards">'
        + card('Total Sharing', s.sharing, 'b3') + card('WhatsApp', s.wa, 'b2') + card('Facebook', s.fb, 'b4') + card('Twitter / X', s.tw, '') + card('LinkedIn', s.li, 'b4') + card('Instagram', s.ig, 'b3')
        + '</div><div class="ms-panel"><b style="font-size:13px">Most Viewed News</b><div id="dMost" style="margin-top:10px"></div></div>';
      function card(k, v, cls) { return '<div class="ms-card ' + (cls || '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
      dataTable(wrap.querySelector('#dMost'), {
        columns: [
          { h: 'Sr No', w: '54px', cell: (r, i) => i + 1 },
          { h: 'News Title', cell: r => esc(r.title) },
          { h: 'Views', w: '70px', cell: r => r.views || 0 },
          { h: 'Added From', w: '100px', cell: r => '<span class="ms-badge ' + (r.addedFrom === 'Pull' ? 'pull' : 'self') + '">' + r.addedFrom + '</span>' },
        ],
        rows: () => DB.posts.filter(p => p.created >= from && p.created <= to).slice().sort((a, b) => (b.views || 0) - (a.views || 0)),
        search: (r, q) => (r.title + catName(r.cat)).toLowerCase().includes(q),
        csvName: 'most-viewed.csv', csvRow: r => [r.title, r.views || 0, r.addedFrom],
      });
      wrap.querySelector('#dGo').addEventListener('click', () => {
        const f = wrap.querySelector('#dFrom').value, t = wrap.querySelector('#dTo').value;
        from = f ? new Date(f).getTime() : 0; to = t ? new Date(t).getTime() + 86399e3 : Infinity;
        render();
      });
      wrap.querySelector('#dAdd').addEventListener('click', () => { go('news'); setTimeout(() => { const b = document.querySelector('#msNewsAdd'); if (b) b.click(); }, 80); });
    }
    render();
  };

  /* ================= NEWS POST ================= */
  function postEditor(existing) {
    const p = existing || { id: uid('p'), title: '', slug: '', lang: DB.settings.languages[0] || 'hi', cat: (DB.categories[0] || {}).id, tags: [], body: '', coverId: '', mediaIds: [], addedFrom: 'Self', addedBy: DB.activeAuthor, ai: false, status: 'draft', created: now(), published: 0, views: 0, likes: 0, dislikes: 0, sourceUrl: '' };
    const ov = modal('<h3>' + (existing ? 'Edit News' : '＋ Add News') + '</h3>'
      + '<div class="ms-row"><span class="ms-lbl">Title</span><input class="ms-in" id="peT" style="flex:1" value="' + esc(p.title) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Category</span><select class="ms-sel" id="peC">' + DB.categories.map(c => '<option value="' + c.id + '"' + (c.id === p.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>'
      + '<button class="ms-btn" id="peNewCat">＋ Category</button>'
      + '<span class="ms-lbl" style="min-width:auto">Language</span><select class="ms-sel" id="peL">' + ['hi', 'en', 'te', 'bn'].map(l => '<option' + (l === p.lang ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>'
      + '<div class="ms-row"><span class="ms-lbl">Tags</span><input class="ms-in" id="peTags" style="flex:1" placeholder="comma,separated" value="' + esc(p.tags.join(', ')) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Cover</span><button class="ms-btn" id="peCover">🖼 ' + (p.coverId ? 'Replace image' : 'Upload image') + '</button><span class="ms-note" id="peCoverN">' + (p.coverId ? '1 image attached' : 'none') + '</span>'
      + '<button class="ms-btn" id="peVid">🎬 Attach video</button><span class="ms-note" id="peVidN">' + (p.mediaIds.length ? p.mediaIds.length + ' attached' : '') + '</span></div>'
      + '<div class="ms-row" style="align-items:flex-start"><span class="ms-lbl">Body</span><div class="ms-ed" id="peB" contenteditable="true" style="flex:1">' + (p.body || '') + '</div></div>'
      + '<div class="ms-row"><span class="ms-lbl">Slug</span><input class="ms-in" id="peS" style="flex:1" value="' + esc(p.slug) + '" placeholder="auto from title"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Schedule</span><input class="ms-in" type="datetime-local" id="peSch"/><span class="ms-note">optional — publishes at this time when the suite is open</span></div>'
      + '<div class="ms-row" style="margin-top:14px"><button class="ms-btn" id="peDraft">Save Draft</button><button class="ms-btn pri" id="pePub">Publish</button>'
      + (existing ? '<button class="ms-btn" id="peUnpub">Un-Publish</button><button class="ms-btn" id="peDel" style="color:#e08484">Delete</button>' : '') + '<span style="flex:1"></span><button class="ms-btn" id="peX">Close</button></div>');
    const q = s => ov.querySelector(s);
    q('#peX').addEventListener('click', () => ov.remove());
    q('#peNewCat').addEventListener('click', () => { const n = (prompt('New category name') || '').trim(); if (!n) return; const c = { id: uid('c'), name: n }; DB.categories.push(c); save(); q('#peC').insertAdjacentHTML('beforeend', '<option value="' + c.id + '" selected>' + esc(n) + '</option>'); });
    q('#peCover').addEventListener('click', async () => { const f = await pickFile('image/*'); if (!f) return; const m = await addMedia(f, { ownerPostId: p.id }); p.coverId = m.id; q('#peCoverN').textContent = f.name; });
    q('#peVid').addEventListener('click', async () => { const f = await pickFile('video/*'); if (!f) return; const m = await addMedia(f, { ownerPostId: p.id }); p.mediaIds.push(m.id); q('#peVidN').textContent = p.mediaIds.length + ' attached'; });
    function collect(status) {
      p.title = q('#peT').value.trim() || 'Untitled';
      p.cat = q('#peC').value; p.lang = q('#peL').value;
      p.tags = q('#peTags').value.split(',').map(x => x.trim()).filter(Boolean);
      p.body = q('#peB').innerHTML;
      p.slug = q('#peS').value.trim() || slugify(p.title);
      const sch = q('#peSch').value;
      if (status === 'publish' && sch && new Date(sch).getTime() > now()) { p.status = 'draft'; p.scheduleAt = new Date(sch).getTime(); toast('Scheduled for ' + fmtDT(p.scheduleAt)); }
      else { p.status = status; p.scheduleAt = 0; if (status === 'publish' && !p.published) p.published = now(); }
      if (!existing) DB.posts.unshift(p);
      save(); ov.remove(); go('news');
    }
    q('#peDraft').addEventListener('click', () => collect('draft'));
    q('#pePub').addEventListener('click', () => collect('publish'));
    if (existing) {
      q('#peUnpub').addEventListener('click', () => collect('unpublish'));
      q('#peDel').addEventListener('click', () => { if (!confirm('Delete this post?')) return; DB.posts = DB.posts.filter(x => x.id !== p.id); save(); ov.remove(); go('news'); });
    }
  }
  // scheduler tick (publishes due scheduled posts while suite open)
  setInterval(() => { let hit = false; DB.posts.forEach(p => { if (p.scheduleAt && p.scheduleAt <= now()) { p.status = 'publish'; p.published = now(); p.scheduleAt = 0; hit = true; } }); if (hit) { save(); toast('Scheduled post published'); if (curView === 'news') go('news'); } }, 30000);

  VIEWS.news = function (body) {
    const P = DB.posts;
    const c = st => P.filter(p => p.status === st).length;
    body.innerHTML = '<div class="ms-cards">'
      + '<div class="ms-card"><div class="k">Total Posts</div><div class="v">' + P.length + '</div></div>'
      + '<div class="ms-card b2"><div class="k">Published</div><div class="v">' + c('publish') + '</div></div>'
      + '<div class="ms-card b3"><div class="k">Drafts</div><div class="v">' + c('draft') + '</div></div>'
      + '<div class="ms-card"><div class="k">Un-Published</div><div class="v">' + c('unpublish') + '</div></div></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="msNewsAdd">＋ Add News</button></div><div id="msNewsTbl"></div>';
    body.querySelector('#msNewsAdd').addEventListener('click', () => postEditor(null));
    dataTable(body.querySelector('#msNewsTbl'), {
      columns: [
        { h: 'Serial', w: '52px', cell: (r, i) => i + 1 },
        { h: 'News Title 🔗', cell: r => '<a href="#" data-open="' + r.id + '" style="color:var(--fg);text-decoration:underline">' + esc(r.title.slice(0, 60)) + '</a>' + (r.ai ? ' <span class="ms-badge ai">✦ AI</span>' : '') },
        { h: 'News Category', w: '120px', cell: r => '<span class="ms-badge cat">' + esc(catName(r.cat)) + '</span>' },
        { h: 'Added Form', w: '86px', cell: r => '<span class="ms-badge ' + (r.addedFrom === 'Pull' ? 'pull' : 'self') + '">' + r.addedFrom + '</span>' },
        { h: 'Added By', w: '100px', cell: r => esc(r.addedBy) },
        { h: 'Status', w: '86px', cell: r => '<span class="ms-badge ' + (r.status === 'publish' ? 'pub' : r.status === 'draft' ? 'draft' : 'unpub') + '">' + (r.status === 'publish' ? 'Publish' : r.status === 'draft' ? 'Draft' : 'Un-Publish') + '</span>' },
        { h: 'Published', w: '120px', cell: r => r.published ? fmtDT(r.published) : (r.scheduleAt ? '⏱ ' + fmtDT(r.scheduleAt) : '—') },
        { h: 'Views & Comments', w: '110px', cell: r => '👁 ' + (r.views || 0) + ' · 💬 ' + DB.comments.filter(cm => cm.postId === r.id).length },
        { h: 'Share', w: '80px', cell: r => '<button class="ms-btn wa" data-wa="' + r.id + '">Share</button>' },
      ],
      rows: () => DB.posts,
      search: (r, q2) => (r.title + ' ' + catName(r.cat) + ' ' + r.addedBy + ' ' + r.status).toLowerCase().includes(q2),
      csvName: 'news-posts.csv', csvRow: r => [r.title, catName(r.cat), r.addedFrom, r.addedBy, r.status, r.published ? fmtDT(r.published) : '', r.views || 0],
      wire: host => {
        host.querySelectorAll('[data-open]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); postEditor(DB.posts.find(p => p.id === a.dataset.open)); }));
        host.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => { const p = DB.posts.find(x => x.id === b.dataset.wa); waShare('📰 ' + p.title + '\n— ' + DB.settings.portalName, 'post', p.id); }));
      },
    });
  };

  /* ================= BULLETIN ================= */
  VIEWS.bulletin = function (body) {
    body.innerHTML = '<div class="ms-row"><button class="ms-btn pri" id="bAdd">＋ Create Bulletin</button><span class="ms-note">Upload a bulletin video, or produce one in STREAM ▸ Broadcast Studio and upload the recording.</span></div><div id="bTbl"></div>';
    body.querySelector('#bAdd').addEventListener('click', async () => {
      const f = await pickFile('video/*'); if (!f) return;
      const title = (prompt('Bulletin title', f.name.replace(/\.[^.]+$/, '')) || '').trim(); if (!title) return;
      const m = await addMedia(f, {});
      DB.bulletins.unshift({ id: uid('b'), title, mediaId: m.id, created: now(), status: 'publish', views: 0 });
      save(); go('bulletin'); toast('Bulletin published');
    });
    dataTable(body.querySelector('#bTbl'), {
      columns: [
        { h: 'Sr No', w: '52px', cell: (r, i) => i + 1 },
        { h: 'Bulletin Title', cell: r => esc(r.title) },
        { h: 'Video', w: '140px', cell: r => '<video class="ms-thumb land" data-v="' + r.mediaId + '" controls preload="metadata"></video>' },
        { h: 'Create Date', w: '120px', cell: r => fmtDT(r.created) },
        { h: 'Status', w: '84px', cell: r => '<span class="ms-badge pub">Published</span>' },
        { h: 'Share / Download', w: '190px', cell: r => '<button class="ms-btn wa" data-wa="' + r.id + '">Share</button> <button class="ms-btn" data-dl="' + r.id + '">⤓ Download</button> <button class="ms-btn" data-del="' + r.id + '" style="color:#e08484">✕</button>' },
      ],
      rows: () => DB.bulletins,
      search: (r, q) => r.title.toLowerCase().includes(q),
      csvName: 'bulletins.csv', csvRow: r => [r.title, fmtDT(r.created), 'Published'],
      wire: host => {
        host.querySelectorAll('video[data-v]').forEach(async v => { v.src = await blobUrl(v.dataset.v); });
        host.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => { const r = DB.bulletins.find(x => x.id === b.dataset.wa); waShare('📣 Bulletin: ' + r.title + '\n— ' + DB.settings.portalName, 'bulletin', r.id); }));
        host.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => { const r = DB.bulletins.find(x => x.id === b.dataset.dl); const bl = await blobGet(r.mediaId); if (bl) dl(slugify(r.title) + '.webm', bl); }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { if (!confirm('Delete bulletin?')) return; DB.bulletins = DB.bulletins.filter(x => x.id !== b.dataset.del); save(); go('bulletin'); }));
      },
    });
  };

  /* ================= SOFT STORIES (+ AI pipeline) ================= */
  VIEWS.stories = function (body) {
    const S = DB.softStories, c = st => S.filter(s => s.status === st).length;
    body.innerHTML = '<div class="ms-cards">'
      + '<div class="ms-card"><div class="k">Total</div><div class="v">' + S.length + '</div></div>'
      + '<div class="ms-card b2"><div class="k">Published</div><div class="v">' + c('publish') + '</div></div>'
      + '<div class="ms-card b3"><div class="k">Drafts</div><div class="v">' + c('draft') + '</div></div>'
      + '<div class="ms-card"><div class="k">Un-Published</div><div class="v">' + c('unpublish') + '</div></div></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="ssAI">✦ Generate AI Story</button><button class="ms-btn" id="ssUp">⤒ Upload story video</button></div><div id="ssTbl"></div>';
    body.querySelector('#ssUp').addEventListener('click', async () => {
      const f = await pickFile('video/*'); if (!f) return;
      const title = (prompt('Story title', f.name.replace(/\.[^.]+$/, '')) || '').trim(); if (!title) return;
      const m = await addMedia(f, {});
      DB.softStories.unshift({ id: uid('ss'), title, mediaId: m.id, cat: (DB.categories[0] || {}).id, ai: false, created: now(), status: 'publish', views: 0, likes: 0, sourcePostId: '' });
      save(); go('stories');
    });
    body.querySelector('#ssAI').addEventListener('click', aiStoryWizard);
    dataTable(body.querySelector('#ssTbl'), {
      columns: [
        { h: 'Id', w: '44px', cell: (r, i) => i + 1 },
        { h: 'Story Title', cell: r => esc(r.title) },
        { h: 'Type', w: '110px', cell: r => r.ai ? '<span class="ms-badge ai">✦ AI Generated</span>' : '<span class="ms-badge cat">Manual</span>' },
        { h: 'News Category', w: '110px', cell: r => '<span class="ms-badge cat">' + esc(catName(r.cat)) + '</span>' },
        { h: 'Video', w: '84px', cell: r => '<video class="ms-thumb" data-v="' + r.mediaId + '" controls preload="metadata" muted></video>' },
        { h: 'Create Date', w: '116px', cell: r => fmtDT(r.created) },
        { h: 'Views', w: '56px', cell: r => r.views || 0 },
        { h: 'Share / Download', w: '196px', cell: r => '<button class="ms-btn wa" data-wa="' + r.id + '">Share</button> <button class="ms-btn" data-dl="' + r.id + '">⤓ Download</button> <button class="ms-btn" data-del="' + r.id + '" style="color:#e08484">✕</button>' },
      ],
      rows: () => DB.softStories,
      search: (r, q) => (r.title + catName(r.cat)).toLowerCase().includes(q),
      csvName: 'soft-stories.csv', csvRow: r => [r.title, r.ai ? 'AI Generated' : 'Manual', catName(r.cat), fmtDT(r.created), r.views || 0],
      wire: host => {
        host.querySelectorAll('video[data-v]').forEach(async v => { v.src = await blobUrl(v.dataset.v); });
        host.querySelectorAll('[data-wa]').forEach(b => b.addEventListener('click', () => { const r = DB.softStories.find(x => x.id === b.dataset.wa); waShare('🎞 ' + r.title + '\n— ' + DB.settings.portalName, 'story', r.id); }));
        host.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => { const r = DB.softStories.find(x => x.id === b.dataset.dl); const bl = await blobGet(r.mediaId); if (bl) dl(slugify(r.title) + '.webm', bl); }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { if (!confirm('Delete story?')) return; DB.softStories = DB.softStories.filter(x => x.id !== b.dataset.del); save(); go('stories'); }));
      },
    });
  };

  function aiStoryWizard() {
    const posts = DB.posts.filter(p => p.status === 'publish');
    const ov = modal('<h3>✦ Generate AI Soft Story</h3>'
      + '<div class="ms-honest">⚠ <span>Pipeline: AI script (Anthropic via the Terminal proxy) → burned captions + your branding → in-browser render (canvas + MediaRecorder — this platform\'s FFmpeg). Voiceover: record it with your mic in step 3 (a hosted-TTS provider needs a server key — documented in Account Setting). Nothing is fabricated: the script is grounded in the topic/source you give.</span></div>'
      + '<div class="ms-row"><span class="ms-lbl">Topic</span><input class="ms-in" id="aiT" style="flex:1" placeholder="Headline or topic"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Source post</span><select class="ms-sel" id="aiSrc" style="flex:1"><option value="">(none — topic only)</option>' + posts.map(p => '<option value="' + p.id + '">' + esc(p.title.slice(0, 60)) + '</option>').join('') + '</select></div>'
      + '<div class="ms-row"><span class="ms-lbl">Language</span><select class="ms-sel" id="aiL"><option>hi</option><option>en</option><option>te</option><option>bn</option></select>'
      + '<span class="ms-lbl" style="min-width:auto">Visual</span><button class="ms-btn" id="aiImg">🖼 Upload backdrop image(s)</button><span class="ms-note" id="aiImgN">0 selected</span></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="aiGo">1 · Generate script</button></div>'
      + '<div id="aiStep2" hidden><div class="ms-row" style="align-items:flex-start"><span class="ms-lbl">Script</span><textarea class="ms-in" id="aiScript" style="flex:1;height:120px"></textarea></div>'
      + '<div class="ms-row"><button class="ms-btn" id="aiPrev">🔊 Preview voice (TTS)</button>'
      + '<button class="ms-btn" id="aiVO">🎙 2 · Record voiceover (reads while you record)</button><span class="ms-note" id="aiVON">no VO yet</span></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="aiRender">🎬 3 · Render story video</button><span class="ms-note" id="aiRState"></span></div></div>'
      + '<div class="ms-row" style="margin-top:10px"><span style="flex:1"></span><button class="ms-btn" id="aiX">Close</button></div>');
    const q = s => ov.querySelector(s);
    let imgs = [], voBlob = null, script = '';
    q('#aiX').addEventListener('click', () => ov.remove());
    q('#aiImg').addEventListener('click', async () => { imgs = (await pickFile('image/*', true)) || []; q('#aiImgN').textContent = imgs.length + ' selected'; });
    q('#aiGo').addEventListener('click', async () => {
      const topic = q('#aiT').value.trim(); if (!topic) return toast('Enter a topic');
      const src = DB.posts.find(p => p.id === q('#aiSrc').value);
      q('#aiGo').textContent = 'Generating…';
      try {
        const lang = q('#aiL').value;
        const out = await callAI([
          { role: 'system', content: 'You write 30-second vertical news-story scripts for Indian mobile journalism. Return ONLY the script: 6-9 short spoken lines, one per line, no numbering, in language: ' + lang + '. Ground strictly in the given topic/source; never invent facts, names or numbers not present.' },
          { role: 'user', content: 'Topic: ' + topic + (src ? '\nSource article:\n' + src.title + '\n' + String(src.body).replace(/<[^>]+>/g, ' ').slice(0, 1800) : '') },
        ], { maxTokens: 500 });
        script = out.trim(); q('#aiScript').value = script; q('#aiStep2').hidden = false; q('#aiGo').textContent = '1 · Regenerate script';
      } catch (e) { toast('AI unavailable: ' + e.message); q('#aiGo').textContent = '1 · Generate script'; }
    });
    q('#aiPrev').addEventListener('click', () => {
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(q('#aiScript').value); u.lang = { hi: 'hi-IN', en: 'en-IN', te: 'te-IN', bn: 'bn-IN' }[q('#aiL').value] || 'hi-IN'; speechSynthesis.speak(u); } catch (e) { toast('TTS preview unavailable'); }
    });
    let voRec = null;
    q('#aiVO').addEventListener('click', async () => {
      if (voRec) { voRec.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voRec = new MediaRecorder(stream); const chunks = [];
        voRec.ondataavailable = e => chunks.push(e.data);
        voRec.onstop = () => { stream.getTracks().forEach(t => t.stop()); voBlob = new Blob(chunks, { type: 'audio/webm' }); q('#aiVON').textContent = 'VO recorded ✓'; q('#aiVO').textContent = '🎙 2 · Re-record voiceover'; voRec = null; };
        voRec.start(); q('#aiVO').textContent = '⏹ Stop recording'; q('#aiVON').textContent = 'recording… read the script aloud';
      } catch (e) { toast('Mic error: ' + e.message); }
    });
    q('#aiRender').addEventListener('click', async () => {
      script = q('#aiScript').value.trim(); if (!script) return toast('No script');
      q('#aiRState').textContent = 'rendering…';
      try {
        const blob = await renderStoryVideo({ script, images: imgs, voBlob, state: t => q('#aiRState').textContent = t });
        const m = await addMedia(new File([blob], 'ai-story.webm', { type: 'video/webm' }), {});
        const title = script.split('\n')[0].slice(0, 80);
        DB.softStories.unshift({ id: uid('ss'), title, mediaId: m.id, cat: (DB.posts.find(p => p.id === q('#aiSrc').value) || { cat: (DB.categories[0] || {}).id }).cat, ai: true, created: now(), status: 'publish', views: 0, likes: 0, sourcePostId: q('#aiSrc').value });
        save(); ov.remove(); go('stories'); toast('AI story published');
      } catch (e) { q('#aiRState').textContent = 'failed: ' + e.message; }
    });
  }

  /* story renderer: 1080x1920 canvas — kenburns backdrop, burned captions, brand overlays, optional VO */
  async function renderStoryVideo(opts) {
    const W = 720, H = 1280;
    const lines = opts.script.split('\n').map(x => x.trim()).filter(Boolean);
    const perLine = 2.8, total = Math.min(59, Math.max(8, lines.length * perLine));
    const bitmaps = [];
    for (const f of (opts.images || [])) { try { bitmaps.push(await createImageBitmap(f)); } catch (e) { } }
    const logo = await blobGet(DB.settings.logoId);
    const logoBm = logo ? await createImageBitmap(logo).catch(() => null) : null;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const stream = cv.captureStream(30);
    let ac = null;
    if (opts.voBlob) {
      ac = new AudioContext();
      const buf = await ac.decodeAudioData(await opts.voBlob.arrayBuffer());
      const src = ac.createBufferSource(); src.buffer = buf;
      const dest = ac.createMediaStreamDestination(); src.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      src.start();
    }
    let rec; try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 4e6 }); } catch (e) { rec = new MediaRecorder(stream); }
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => rec.onstop = res);
    rec.start(500);
    const t0 = performance.now();
    await new Promise(resolve => {
      (function frame() {
        const t = (performance.now() - t0) / 1000;
        if (t >= total) return resolve();
        // backdrop
        ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
        if (bitmaps.length) {
          const bi = Math.min(bitmaps.length - 1, Math.floor(t / (total / bitmaps.length)));
          const bm = bitmaps[bi], z = 1.06 + 0.08 * ((t % 6) / 6);
          const sc = Math.max(W / bm.width, H / bm.height) * z;
          ctx.drawImage(bm, (W - bm.width * sc) / 2, (H - bm.height * sc) / 2, bm.width * sc, bm.height * sc);
          ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(0, 0, W, H);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1030'); g.addColorStop(1, '#07070c');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        // brand frame
        ctx.fillStyle = DB.settings.themeColor || '#c1121f';
        ctx.fillRect(24, 34, Math.min(300, 24 + DB.settings.reporterName.length * 13), 44);
        ctx.fillStyle = '#fff'; ctx.font = '700 21px sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(DB.settings.reporterName.slice(0, 20), 38, 57);
        if (logoBm) ctx.drawImage(logoBm, W - 96, 28, 64, 64);
        ctx.font = '650 17px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillText(DB.settings.portalName.slice(0, 26), 24, H - 36);
        // caption
        const li = Math.min(lines.length - 1, Math.floor(t / perLine));
        const words = lines[li] || '';
        ctx.font = '750 30px sans-serif'; ctx.textBaseline = 'alphabetic';
        const wrapAt = 22; let yy = H - 250;
        let rowStr = ''; const rows = [];
        words.split(' ').forEach(w => { if ((rowStr + ' ' + w).length > wrapAt) { rows.push(rowStr); rowStr = w; } else rowStr = rowStr ? rowStr + ' ' + w : w; });
        rows.push(rowStr);
        rows.slice(0, 4).forEach(rw => {
          const tw = ctx.measureText(rw).width;
          ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(W / 2 - tw / 2 - 16, yy - 32, tw + 32, 46);
          ctx.fillStyle = '#fff'; ctx.fillText(rw, W / 2 - tw / 2, yy);
          yy += 52;
        });
        if (typeof opts.state === 'function') opts.state('rendering ' + Math.round(t / total * 100) + '%');
        setTimeout(frame, 33);
      })();
    });
    rec.stop(); await done;
    if (ac) try { ac.close(); } catch (e) { }
    return new Blob(chunks, { type: 'video/webm' });
  }

  /* ================= VIRAL TOOL (reel editor) ================= */
  VIEWS.viral = function (body) {
    let ar = '9:16', mediaFile = null, mediaEl = null, mediaKind = 'video';
    body.innerHTML = '<div class="ms-vt">'
      + '<div><div class="ms-vt-stage" id="vtStage"><canvas id="vtCv"></canvas></div></div>'
      + '<div class="ms-vt-panel"><div class="ms-row"><button class="ms-btn on" id="vtTabV">🎬 Video</button><button class="ms-btn" id="vtTabI">🖼 Image</button></div>'
      + '<div class="ms-grp" style="padding-left:0">1. MEDIA SOURCE</div>'
      + '<div class="ms-vt-drop" id="vtDrop">⤒ Tap to upload <span id="vtKind">Video</span><br><span class="ms-note">Max ' + DB.settings.maxReelSec + ' sec / ' + DB.settings.maxReelMB + 'MB</span></div>'
      + '<div class="ms-grp" style="padding-left:0">2. LAYOUT &amp; SCALING</div>'
      + '<div class="ms-vt-ar"><button class="ms-btn on" data-ar="9:16">📱 9:16</button><button class="ms-btn" data-ar="1:1">◻ 1:1</button><button class="ms-btn" data-ar="16:9">🖥 16:9</button></div>'
      + '<button class="ms-btn pri" id="vtGen" style="width:100%;justify-content:center;padding:11px">🎬 Generate Video</button>'
      + '<div class="ms-note" id="vtState" style="margin-top:8px"></div>'
      + '<div class="ms-row" style="margin-top:9px" id="vtOut" hidden><button class="ms-btn grn" id="vtDl">⤓ Download</button><button class="ms-btn" id="vtAsStory">Publish as Soft Story</button><button class="ms-btn" id="vtAsBull">Publish as Bulletin</button></div></div></div>';
    const cv = body.querySelector('#vtCv'), ctx = cv.getContext('2d');
    let logoBm = null; blobGet(DB.settings.logoId).then(b => b && createImageBitmap(b).then(x => logoBm = x).catch(() => { }));
    function dims() { return ar === '9:16' ? [405, 720] : ar === '1:1' ? [560, 560] : [720, 405]; }
    function fit() { const [w, h] = dims(); cv.width = w * 2; cv.height = h * 2; cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    function paint() {
      const W = cv.width, H = cv.height;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (mediaEl && (mediaKind === 'image' || mediaEl.readyState >= 2)) {
        const mw = mediaEl.videoWidth || mediaEl.width, mh = mediaEl.videoHeight || mediaEl.height;
        const sc = Math.min(W / mw, H / mh);
        ctx.drawImage(mediaEl, (W - mw * sc) / 2, (H - mh * sc) / 2, mw * sc, mh * sc);
      } else {
        ctx.fillStyle = '#3a3a44'; ctx.font = '600 ' + (W / 22) + 'px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Upload media to start editing', W / 2, H / 2); ctx.textAlign = 'left';
      }
      // brand frame (reporter chip + logo — matches MOJO)
      const chipH = H * 0.052;
      ctx.fillStyle = DB.settings.themeColor || '#c1121f';
      ctx.fillRect(W * 0.035, H * 0.03, Math.min(W * .5, chipH * 0.62 * DB.settings.reporterName.length), chipH);
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + chipH * 0.55 + 'px sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText(DB.settings.reporterName.slice(0, 22), W * 0.035 + chipH * 0.3, H * 0.03 + chipH / 2);
      if (logoBm) ctx.drawImage(logoBm, W - chipH * 1.6 - W * 0.03, H * 0.025, chipH * 1.6, chipH * 1.6);
      ctx.textBaseline = 'alphabetic';
    }
    let raf; (function loop() { paint(); raf = setTimeout(loop, 66); })();
    fit();
    body.querySelectorAll('[data-ar]').forEach(b => b.addEventListener('click', () => { ar = b.dataset.ar; body.querySelectorAll('[data-ar]').forEach(x => x.classList.toggle('on', x === b)); fit(); }));
    body.querySelector('#vtTabV').addEventListener('click', () => { mediaKind = 'video'; body.querySelector('#vtKind').textContent = 'Video'; body.querySelector('#vtTabV').classList.add('on'); body.querySelector('#vtTabI').classList.remove('on'); });
    body.querySelector('#vtTabI').addEventListener('click', () => { mediaKind = 'image'; body.querySelector('#vtKind').textContent = 'Image'; body.querySelector('#vtTabI').classList.add('on'); body.querySelector('#vtTabV').classList.remove('on'); });
    body.querySelector('#vtDrop').addEventListener('click', async () => {
      const f = await pickFile(mediaKind === 'video' ? 'video/*' : 'image/*'); if (!f) return;
      if (f.size > DB.settings.maxReelMB * 1048576) return toast('File exceeds ' + DB.settings.maxReelMB + 'MB limit');
      mediaFile = f;
      if (mediaKind === 'video') { const v = document.createElement('video'); v.src = URL.createObjectURL(f); v.muted = true; v.loop = true; v.playsInline = true; await v.play().catch(() => { }); mediaEl = v; }
      else { mediaEl = await createImageBitmap(f); }
      body.querySelector('#vtDrop').innerHTML = '✓ ' + esc(f.name) + ' <span class="ms-note">(tap to replace)</span>';
    });
    let outBlob = null;
    body.querySelector('#vtGen').addEventListener('click', async () => {
      if (!mediaEl) return toast('Upload media first');
      const st = body.querySelector('#vtState');
      const dur = mediaKind === 'video' ? Math.min(DB.settings.maxReelSec, mediaEl.duration || 15) : 8;
      const stream = cv.captureStream(30);
      if (mediaKind === 'video') {
        try { const ac2 = new AudioContext(); const src = ac2.createMediaElementSource(mediaEl); const dest = ac2.createMediaStreamDestination(); src.connect(dest); src.connect(ac2.destination); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); mediaEl.muted = false; mediaEl.currentTime = 0; } catch (e) { }
      }
      let rec; try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 5e6 }); } catch (e) { rec = new MediaRecorder(stream); }
      const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        outBlob = new Blob(chunks, { type: 'video/webm' });
        st.textContent = 'done — ' + (outBlob.size / 1048576).toFixed(1) + ' MB';
        body.querySelector('#vtOut').hidden = false;
        if (mediaKind === 'video') mediaEl.muted = true;
      };
      rec.start(500); st.textContent = 'rendering ' + Math.round(dur) + 's…';
      setTimeout(() => rec.stop(), dur * 1000);
    });
    body.querySelector('#vtDl') && body.addEventListener('click', e => {
      if (e.target.id === 'vtDl' && outBlob) dl('reel-' + Date.now().toString(36) + '.webm', outBlob);
      if (e.target.id === 'vtAsStory' && outBlob) (async () => { const t = prompt('Story title', 'Reel'); if (!t) return; const m = await addMedia(new File([outBlob], 'reel.webm', { type: 'video/webm' }), {}); DB.softStories.unshift({ id: uid('ss'), title: t, mediaId: m.id, cat: (DB.categories[0] || {}).id, ai: false, created: now(), status: 'publish', views: 0, likes: 0, sourcePostId: '' }); save(); toast('Published as Soft Story'); })();
      if (e.target.id === 'vtAsBull' && outBlob) (async () => { const t = prompt('Bulletin title', 'Reel bulletin'); if (!t) return; const m = await addMedia(new File([outBlob], 'reel.webm', { type: 'video/webm' }), {}); DB.bulletins.unshift({ id: uid('b'), title: t, mediaId: m.id, created: now(), status: 'publish', views: 0 }); save(); toast('Published as Bulletin'); })();
    });
  };

  /* ================= MEDIA MANAGER ================= */
  VIEWS.media = function (body) {
    let mode = 'individual';
    const vids = DB.media.filter(m => m.type === 'video');
    body.innerHTML = '<div class="ms-row"><b>Total Videos: ' + vids.length + '</b> · <span class="ms-note">' + DB.media.length + ' media assets total</span><span style="flex:1"></span>'
      + '<button class="ms-btn on" id="mmInd">Individual</button><button class="ms-btn" id="mmGrp">Group by News</button></div><div id="mmGridWrap"></div>';
    const wrap = body.querySelector('#mmGridWrap');
    async function render() {
      if (mode === 'individual') {
        wrap.innerHTML = '<div class="ms-mediagrid">' + DB.media.map(m => mcard(m)).join('') + '</div>' || '<div class="ms-note">No media yet.</div>';
      } else {
        const byPost = {};
        DB.media.forEach(m => { const k = m.ownerPostId || '(unattached)'; (byPost[k] = byPost[k] || []).push(m); });
        wrap.innerHTML = Object.keys(byPost).map(pid => {
          const p = DB.posts.find(x => x.id === pid);
          return '<div class="ms-panel"><b>' + (p ? esc(p.title) : 'Unattached media') + '</b>' + (p ? ' <a href="#" data-edit="' + p.id + '" style="color:#7fb0ff;font-size:11px">Edit News →</a>' : '') + '<div class="ms-mediagrid" style="margin-top:9px">' + byPost[pid].map(m => mcard(m)).join('') + '</div></div>';
        }).join('') || '<div class="ms-note">No media yet.</div>';
      }
      wrap.querySelectorAll('[data-media]').forEach(async n => {
        const u = await blobUrl(n.dataset.media);
        if (n.tagName === 'VIDEO') n.src = u; else n.src = u;
      });
      wrap.querySelectorAll('[data-edit]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); postEditor(DB.posts.find(p => p.id === a.dataset.edit)); }));
      wrap.querySelectorAll('[data-mdel]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Delete media asset?')) return;
        await blobDel(b.dataset.mdel);
        DB.media = DB.media.filter(m => m.id !== b.dataset.mdel); save(); render();
      }));
    }
    function mcard(m) {
      const owner = DB.posts.find(p => p.id === m.ownerPostId);
      return '<div class="ms-mcard">' + (m.type === 'video' ? '<video data-media="' + m.id + '" controls preload="metadata"></video>' : m.type === 'pdf' ? '<div style="font-size:34px;text-align:center;padding:26px">🗞</div>' : '<img data-media="' + m.id + '"/>')
        + '<div style="margin-top:6px;font-weight:650">' + esc(m.name.slice(0, 30)) + '</div>'
        + '<div class="ms-note">' + (m.size / 1048576).toFixed(1) + ' MB · ' + fmtD(m.created) + (owner ? ' · <a href="#" data-edit="' + owner.id + '" style="color:#7fb0ff">Edit News</a>' : '') + '</div>'
        + '<div class="ms-row" style="margin:6px 0 0"><button class="ms-btn" data-mdel="' + m.id + '" style="color:#e08484">✕ Delete</button></div></div>';
    }
    body.querySelector('#mmInd').addEventListener('click', e => { mode = 'individual'; e.target.classList.add('on'); body.querySelector('#mmGrp').classList.remove('on'); render(); });
    body.querySelector('#mmGrp').addEventListener('click', e => { mode = 'group'; e.target.classList.add('on'); body.querySelector('#mmInd').classList.remove('on'); render(); });
    render();
  };


  /* ================= PULL NEWS ================= */
  VIEWS.pull = function (body) {
    body.innerHTML = '<div class="ms-honest">⚠ <span>Feeds are fetched through the Terminal\'s serverless proxy (<code>/api/rss</code>, no key needed). In the offline standalone file there is no proxy, so pulling shows a clear error there. Imported items are tagged <b>Added From = Pull</b> with source attribution and deduped by link.</span></div>'
      + '<div class="ms-panel"><b>Sources</b><div id="pSrcs" style="margin-top:8px"></div>'
      + '<div class="ms-row" style="margin-top:8px"><input class="ms-in" id="pName" placeholder="Source name" style="width:160px"/><input class="ms-in" id="pUrl" placeholder="RSS / feed URL" style="flex:1"/><button class="ms-btn pri" id="pAdd">＋ Add source</button></div></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="pFetch">☁ Pull now</button><span class="ms-note" id="pState"></span></div>'
      + '<div class="ms-panel"><b>Review queue</b><div id="pQueue" style="margin-top:8px"></div></div>';
    function renderSrcs() {
      body.querySelector('#pSrcs').innerHTML = DB.pullSources.map(s => '<div class="ms-row"><label style="display:flex;align-items:center;gap:7px;font-size:11.5px"><input type="checkbox" data-en="' + s.id + '"' + (s.enabled ? ' checked' : '') + '/> <b>' + esc(s.name) + '</b></label><span class="ms-note" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.url) + '</span><button class="ms-btn" data-sdel="' + s.id + '" style="color:#e08484">✕</button></div>').join('') || '<div class="ms-note">No sources configured.</div>';
      body.querySelectorAll('[data-en]').forEach(c => c.addEventListener('change', () => { const s = DB.pullSources.find(x => x.id === c.dataset.en); s.enabled = c.checked; save(); }));
      body.querySelectorAll('[data-sdel]').forEach(b => b.addEventListener('click', () => { DB.pullSources = DB.pullSources.filter(x => x.id !== b.dataset.sdel); save(); renderSrcs(); }));
    }
    renderSrcs();
    body.querySelector('#pAdd').addEventListener('click', () => {
      const n = body.querySelector('#pName').value.trim(), u = body.querySelector('#pUrl').value.trim();
      if (!n || !/^https?:/i.test(u)) return toast('Name + valid URL required');
      DB.pullSources.push({ id: uid('src'), name: n, url: u, enabled: true }); save(); renderSrcs();
    });
    function renderQueue() {
      const pend = DB.pullItems.filter(i => !i.imported && !i.dismissed);
      body.querySelector('#pQueue').innerHTML = pend.map(i => '<div class="ms-row" style="border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:8px">'
        + '<div style="flex:1"><b style="font-size:12px">' + esc(i.title) + '</b><div class="ms-note">' + esc(i.source) + ' · ' + (i.date ? fmtD(new Date(i.date).getTime()) : '') + ' · <a href="' + esc(i.link) + '" target="_blank" rel="noopener" style="color:#7fb0ff">original ↗</a></div></div>'
        + '<button class="ms-btn grn" data-imp="' + i.id + '">Import</button><button class="ms-btn" data-dis="' + i.id + '">Dismiss</button></div>').join('') || '<div class="ms-note">Queue empty — pull to fetch new items.</div>';
      body.querySelectorAll('[data-imp]').forEach(b => b.addEventListener('click', () => {
        const i = DB.pullItems.find(x => x.id === b.dataset.imp);
        DB.posts.unshift({ id: uid('p'), title: i.title, slug: slugify(i.title), lang: 'hi', cat: (DB.categories[0] || {}).id, tags: ['pull'], body: '<p>' + esc(i.desc || '') + '</p><p class="ms-note">Source: <a href="' + esc(i.link) + '" target="_blank" rel="noopener">' + esc(i.source) + '</a></p>', coverId: '', mediaIds: [], addedFrom: 'Pull', addedBy: 'Pull · ' + i.source, ai: false, status: 'publish', created: now(), published: now(), views: 0, likes: 0, dislikes: 0, sourceUrl: i.link });
        i.imported = true; save(); renderQueue(); toast('Imported as Pull');
      }));
      body.querySelectorAll('[data-dis]').forEach(b => b.addEventListener('click', () => { DB.pullItems.find(x => x.id === b.dataset.dis).dismissed = true; save(); renderQueue(); }));
    }
    renderQueue();
    body.querySelector('#pFetch').addEventListener('click', async () => {
      const st = body.querySelector('#pState'); st.textContent = 'fetching…';
      let added = 0, errs = 0;
      for (const s of DB.pullSources.filter(x => x.enabled)) {
        try {
          const r = await fetch('/api/rss?url=' + encodeURIComponent(s.url));
          if (!r.ok) throw new Error('proxy ' + r.status);
          const xml = new DOMParser().parseFromString(await r.text(), 'text/xml');
          xml.querySelectorAll('item').forEach(it => {
            const link = (it.querySelector('link') || {}).textContent || '';
            if (!link || DB.pullItems.some(x => x.link === link) || DB.posts.some(p => p.sourceUrl === link)) return;
            DB.pullItems.unshift({ id: uid('pi'), source: s.name, title: (it.querySelector('title') || {}).textContent || 'Untitled', link, desc: ((it.querySelector('description') || {}).textContent || '').replace(/<[^>]+>/g, ' ').slice(0, 400), date: (it.querySelector('pubDate') || {}).textContent || '', imported: false, dismissed: false });
            added++;
          });
        } catch (e) { errs++; }
      }
      save(); renderQueue();
      st.textContent = added + ' new items' + (errs ? ' · ' + errs + ' source(s) failed (proxy needed — deploy build only)' : '');
    });
  };

  /* ================= E-PAPER ================= */
  VIEWS.epaper = function (body) {
    body.innerHTML = '<div class="ms-row"><button class="ms-btn pri" id="epAdd">＋ Upload edition (PDF)</button><input class="ms-in" type="date" id="epDate" value="' + new Date().toISOString().slice(0, 10) + '"/></div><div id="epTbl"></div>';
    body.querySelector('#epAdd').addEventListener('click', async () => {
      const f = await pickFile('application/pdf'); if (!f) return;
      const m = await addMedia(f, {});
      DB.epaper.unshift({ id: uid('ep'), date: body.querySelector('#epDate').value, mediaId: m.id, name: f.name, created: now() });
      save(); go('epaper'); toast('Edition added');
    });
    dataTable(body.querySelector('#epTbl'), {
      columns: [
        { h: 'Sr No', w: '52px', cell: (r, i) => i + 1 },
        { h: 'Edition Date', cell: r => r.date },
        { h: 'File', cell: r => esc(r.name) },
        { h: 'Uploaded', w: '120px', cell: r => fmtDT(r.created) },
        { h: 'Actions', w: '210px', cell: r => '<button class="ms-btn" data-view="' + r.id + '">📖 View</button> <button class="ms-btn" data-dl="' + r.id + '">⤓</button> <button class="ms-btn" data-del="' + r.id + '" style="color:#e08484">✕</button>' },
      ],
      rows: () => DB.epaper,
      search: (r, q) => (r.date + r.name).toLowerCase().includes(q),
      csvName: 'epaper.csv', csvRow: r => [r.date, r.name, fmtDT(r.created)],
      wire: host => {
        host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => { const r = DB.epaper.find(x => x.id === b.dataset.view); const u = await blobUrl(r.mediaId); const ov = modal('<h3>E-Paper · ' + r.date + '</h3><iframe src="' + u + '" style="width:100%;height:72vh;border:0;border-radius:9px;background:#fff"></iframe><div class="ms-row" style="margin-top:9px"><span style="flex:1"></span><button class="ms-btn" data-x>Close</button></div>'); ov.querySelector('[data-x]').addEventListener('click', () => ov.remove()); }));
        host.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => { const r = DB.epaper.find(x => x.id === b.dataset.dl); const bl = await blobGet(r.mediaId); if (bl) dl('epaper-' + r.date + '.pdf', bl); }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { if (!confirm('Delete edition?')) return; DB.epaper = DB.epaper.filter(x => x.id !== b.dataset.del); save(); go('epaper'); }));
      },
    });
  };

  /* ================= ADS MANAGER ================= */
  const adStatus = a => { const t = now(); if (!a.active) return ['Inactive', 'unpub']; if (t < a.start) return ['Scheduled', 'sched']; if (t > a.end) return ['Ended', 'ended']; return ['Running', 'run']; };
  function adEditor(existing) {
    const a = existing || { id: uid('ad'), title: '', page: 'Homepage', section: 'Header', url: '', mediaId: '', start: now(), end: now() + 30 * 86400e3, active: true, created: now(), impressions: 0, clicks: 0 };
    const ov = modal('<h3>' + (existing ? 'Edit Ad' : '＋ Add Ad') + '</h3>'
      + '<div class="ms-row"><span class="ms-lbl">Ad Title</span><input class="ms-in" id="adT" style="flex:1" value="' + esc(a.title) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Page</span><select class="ms-sel" id="adP"><option' + (a.page === 'Homepage' ? ' selected' : '') + '>Homepage</option><option' + (a.page === 'Article' ? ' selected' : '') + '>Article</option></select>'
      + '<span class="ms-lbl" style="min-width:auto">Section</span><select class="ms-sel" id="adS">' + ['Header', 'Sidebar', 'Home Page Popup', 'In-feed'].map(s => '<option' + (s === a.section ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>'
      + '<div class="ms-row"><span class="ms-lbl">Creative</span><button class="ms-btn" id="adImg">🖼 ' + (a.mediaId ? 'Replace' : 'Upload') + ' image</button><span class="ms-note" id="adImgN">' + (a.mediaId ? 'attached' : 'none') + '</span></div>'
      + '<div class="ms-row"><span class="ms-lbl">Click URL</span><input class="ms-in" id="adU" style="flex:1" placeholder="https://…" value="' + esc(a.url) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Start</span><input class="ms-in" type="date" id="adFrom" value="' + new Date(a.start).toISOString().slice(0, 10) + '"/><span class="ms-lbl" style="min-width:auto">End</span><input class="ms-in" type="date" id="adTo" value="' + new Date(a.end).toISOString().slice(0, 10) + '"/>'
      + '<label style="display:flex;align-items:center;gap:6px;font-size:11.5px"><input type="checkbox" id="adAct"' + (a.active ? ' checked' : '') + '/> Active</label></div>'
      + '<div class="ms-row" style="margin-top:12px"><button class="ms-btn pri" id="adSave">Save</button>' + (existing ? '<button class="ms-btn" id="adDel" style="color:#e08484">Delete</button>' : '') + '<span style="flex:1"></span><button class="ms-btn" id="adX">Close</button></div>');
    const q = s => ov.querySelector(s);
    q('#adX').addEventListener('click', () => ov.remove());
    q('#adImg').addEventListener('click', async () => { const f = await pickFile('image/*'); if (!f) return; const m = await addMedia(f, {}); a.mediaId = m.id; q('#adImgN').textContent = f.name; });
    q('#adSave').addEventListener('click', () => {
      a.title = q('#adT').value.trim() || 'Untitled ad'; a.page = q('#adP').value; a.section = q('#adS').value; a.url = q('#adU').value.trim();
      a.start = new Date(q('#adFrom').value).getTime(); a.end = new Date(q('#adTo').value).getTime() + 86399e3; a.active = q('#adAct').checked;
      if (!existing) DB.ads.unshift(a);
      save(); ov.remove(); go('ads');
    });
    if (existing) q('#adDel').addEventListener('click', () => { if (!confirm('Delete ad?')) return; DB.ads = DB.ads.filter(x => x.id !== a.id); save(); ov.remove(); go('ads'); });
  }
  VIEWS.ads = function (body) {
    body.innerHTML = '<div class="ms-row"><button class="ms-btn pri" id="adAdd">＋ Add</button><span class="ms-note">Creatives render in their named portal slots; impressions and clicks are tracked per ad.</span></div><div id="adTbl"></div>';
    body.querySelector('#adAdd').addEventListener('click', () => adEditor(null));
    dataTable(body.querySelector('#adTbl'), {
      columns: [
        { h: 'Sr No', w: '52px', cell: (r, i) => i + 1 },
        { h: 'Create Date', w: '116px', cell: r => fmtDT(r.created) },
        { h: 'Ad Title', cell: r => '<a href="#" data-e="' + r.id + '" style="color:var(--fg);text-decoration:underline">' + esc(r.title) + '</a>' },
        { h: 'Page Name', w: '90px', cell: r => r.page },
        { h: 'Section Name', w: '120px', cell: r => r.section },
        { h: 'Start Date', w: '100px', cell: r => fmtD(r.start) },
        { h: 'End Date', w: '100px', cell: r => fmtD(r.end) },
        { h: 'Ad Status', w: '90px', cell: r => { const [t, cls] = adStatus(r); return '<span class="ms-badge ' + cls + '">' + t + '</span>'; } },
        { h: 'Status', w: '80px', cell: r => '<span class="ms-badge ' + (r.active ? 'pub' : 'unpub') + '">' + (r.active ? 'Active' : 'Inactive') + '</span>' },
        { h: 'Impr / Clicks', w: '96px', cell: r => (r.impressions || 0) + ' / ' + (r.clicks || 0) },
      ],
      rows: () => DB.ads,
      search: (r, q) => (r.title + r.page + r.section).toLowerCase().includes(q),
      csvName: 'ads.csv', csvRow: r => [r.title, r.page, r.section, fmtD(r.start), fmtD(r.end), adStatus(r)[0], r.active ? 'Active' : 'Inactive', r.impressions || 0, r.clicks || 0],
      wire: host => host.querySelectorAll('[data-e]').forEach(a2 => a2.addEventListener('click', e => { e.preventDefault(); adEditor(DB.ads.find(x => x.id === a2.dataset.e)); })),
    });
  };
  function liveAds(page, section) { const t = now(); return DB.ads.filter(a => a.active && a.page === page && a.section === section && t >= a.start && t <= a.end); }
  function adClick(id) { const a = DB.ads.find(x => x.id === id); if (!a) return; bump(a, 'clicks'); if (a.url) window.open(a.url, '_blank', 'noopener'); }

  /* ================= WHATSAPP ================= */
  VIEWS.wa = function (body) {
    const W = DB.wa;
    body.innerHTML = '<div class="ms-honest">⚠ <span><b>Connect (QR):</b> the WhatsApp Business / Web session requires a server-side relay (Meta Cloud API or whatsapp-web.js on a host) — this static Terminal cannot hold a phone session. Set <code>WHATSAPP_TOKEN</code> + <code>WHATSAPP_PHONE_ID</code> on a Netlify function to activate it later. <b>Working today:</b> one-tap wa.me share on every post/bulletin/story (tracked), members &amp; groups book, and broadcast via sequenced wa.me links with delivery logs.</span></div>'
      + '<div class="ms-cards"><div class="ms-card"><div class="k">Connection</div><div class="v" style="font-size:15px">' + (W.connected ? 'Connected' : 'Relay pending') + '</div></div>'
      + '<div class="ms-card b2"><div class="k">Members</div><div class="v">' + W.members.length + '</div></div>'
      + '<div class="ms-card b4"><div class="k">Groups</div><div class="v">' + W.groups.length + '</div></div>'
      + '<div class="ms-card b3"><div class="k">Broadcasts sent</div><div class="v">' + W.logs.length + '</div></div></div>'
      + '<div class="ms-panel"><b>Members</b><div class="ms-row" style="margin-top:8px"><input class="ms-in" id="wmN" placeholder="Name" style="width:150px"/><input class="ms-in" id="wmP" placeholder="Phone (91XXXXXXXXXX)" style="width:180px"/><select class="ms-sel" id="wmG"><option value="">(no group)</option>' + W.groups.map(g => '<option value="' + g.id + '">' + esc(g.name) + '</option>').join('') + '</select><button class="ms-btn pri" id="wmAdd">＋ Add member</button><button class="ms-btn" id="wgAdd">＋ New group</button></div><div id="wmTbl" style="margin-top:8px"></div></div>'
      + '<div class="ms-panel"><b>Broadcast</b><div class="ms-row" style="margin-top:8px"><select class="ms-sel" id="wbWhat" style="flex:1">'
      + '<optgroup label="Bulletins">' + DB.bulletins.map(b => '<option value="b:' + b.id + '">📣 ' + esc(b.title.slice(0, 50)) + '</option>').join('') + '</optgroup>'
      + '<optgroup label="Soft Stories">' + DB.softStories.map(s => '<option value="s:' + s.id + '">🎞 ' + esc(s.title.slice(0, 50)) + '</option>').join('') + '</optgroup>'
      + '<optgroup label="Posts">' + DB.posts.filter(p => p.status === 'publish').slice(0, 20).map(p => '<option value="p:' + p.id + '">📰 ' + esc(p.title.slice(0, 50)) + '</option>').join('') + '</optgroup></select>'
      + '<select class="ms-sel" id="wbTo"><option value="all">All members</option>' + W.groups.map(g => '<option value="' + g.id + '">Group: ' + esc(g.name) + '</option>').join('') + '</select>'
      + '<button class="ms-btn wa" id="wbGo">📤 Broadcast</button></div><div class="ms-note">Opens a wa.me send window per recipient (confirm each). With the relay + env keys, this same button sends via the Business API automatically.</div></div>'
      + '<div class="ms-panel"><b>Report</b><div id="wbLog" style="margin-top:8px"></div></div>';
    function renderMembers() {
      body.querySelector('#wmTbl').innerHTML = '<table class="ms-table"><thead><tr><th>Name</th><th>Phone</th><th>Group</th><th></th></tr></thead><tbody>'
        + (W.members.map(m => '<tr><td>' + esc(m.name) + '</td><td>' + esc(m.phone) + '</td><td>' + esc((W.groups.find(g => g.id === m.groupId) || {}).name || '—') + '</td><td><button class="ms-btn" data-mdel="' + m.id + '" style="color:#e08484">✕</button></td></tr>').join('') || '<tr><td colspan="4" class="ms-note" style="padding:12px">No members yet.</td></tr>') + '</tbody></table>';
      body.querySelectorAll('[data-mdel]').forEach(b => b.addEventListener('click', () => { W.members = W.members.filter(m => m.id !== b.dataset.mdel); save(); renderMembers(); }));
    }
    renderMembers();
    function renderLog() {
      body.querySelector('#wbLog').innerHTML = '<table class="ms-table"><thead><tr><th>When</th><th>Item</th><th>Audience</th><th>Recipients</th></tr></thead><tbody>'
        + (W.logs.slice(0, 20).map(l => '<tr><td>' + fmtDT(l.ts) + '</td><td>' + esc(l.what) + '</td><td>' + esc(l.to) + '</td><td>' + l.count + '</td></tr>').join('') || '<tr><td colspan="4" class="ms-note" style="padding:12px">No broadcasts yet.</td></tr>') + '</tbody></table>';
    }
    renderLog();
    body.querySelector('#wgAdd').addEventListener('click', () => { const n = (prompt('Group name') || '').trim(); if (!n) return; W.groups.push({ id: uid('g'), name: n }); save(); go('wa'); });
    body.querySelector('#wmAdd').addEventListener('click', () => {
      const n = body.querySelector('#wmN').value.trim(), p = body.querySelector('#wmP').value.replace(/\D/g, '');
      if (!n || p.length < 10) return toast('Name + valid phone required');
      W.members.push({ id: uid('w'), name: n, phone: p, groupId: body.querySelector('#wmG').value }); save(); renderMembers();
    });
    body.querySelector('#wbGo').addEventListener('click', () => {
      const [kind, id] = body.querySelector('#wbWhat').value.split(':');
      const item = kind === 'b' ? DB.bulletins.find(x => x.id === id) : kind === 's' ? DB.softStories.find(x => x.id === id) : DB.posts.find(x => x.id === id);
      if (!item) return toast('Pick an item');
      const gid = body.querySelector('#wbTo').value;
      const rcpts = W.members.filter(m => gid === 'all' || m.groupId === gid);
      if (!rcpts.length) return toast('No recipients in that audience');
      const msg = (kind === 'b' ? '📣 ' : kind === 's' ? '🎞 ' : '📰 ') + item.title + '\n— ' + DB.settings.portalName;
      rcpts.forEach((m, i) => setTimeout(() => window.open('https://wa.me/' + m.phone + '?text=' + encodeURIComponent(msg), '_blank', 'noopener'), i * 900));
      W.logs.unshift({ ts: now(), what: item.title.slice(0, 44), to: gid === 'all' ? 'All members' : (W.groups.find(g => g.id === gid) || {}).name, count: rcpts.length });
      shareEvent('whatsapp', 'broadcast', id); save(); renderLog();
    });
  };

  /* ================= SUB REPORTER ================= */
  VIEWS.subrep = function (body) {
    body.innerHTML = '<div class="ms-row"><input class="ms-in" id="srN" placeholder="Name" style="width:160px"/><input class="ms-in" id="srE" placeholder="Email" style="width:200px"/>'
      + '<label style="display:flex;align-items:center;gap:6px;font-size:11.5px"><input type="checkbox" id="srPub"/> Can publish directly</label>'
      + '<button class="ms-btn pri" id="srAdd">＋ Invite sub-reporter</button></div>'
      + '<div class="ms-row"><span class="ms-lbl">Compose as</span><select class="ms-sel" id="srAs"><option value="Owner"' + (DB.activeAuthor === 'Owner' ? ' selected' : '') + '>Owner</option>' + DB.subReporters.map(s => '<option' + (DB.activeAuthor === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select><span class="ms-note">new posts are stamped Added By = this author; sub-reporters without publish rights create drafts for your review</span></div>'
      + '<div id="srTbl"></div><div class="ms-panel"><b>Submissions awaiting review</b><div id="srQueue" style="margin-top:8px"></div></div>';
    body.querySelector('#srAdd').addEventListener('click', () => {
      const n = body.querySelector('#srN').value.trim(), e = body.querySelector('#srE').value.trim();
      if (!n) return toast('Name required');
      DB.subReporters.push({ id: uid('sr'), name: n, email: e, canPublish: body.querySelector('#srPub').checked, created: now() });
      save(); go('subrep');
    });
    body.querySelector('#srAs').addEventListener('change', e => { DB.activeAuthor = e.target.value; save(); toast('Composing as ' + e.target.value); });
    dataTable(body.querySelector('#srTbl'), {
      columns: [
        { h: 'Sr No', w: '52px', cell: (r, i) => i + 1 },
        { h: 'Name', cell: r => esc(r.name) },
        { h: 'Email', cell: r => esc(r.email || '—') },
        { h: 'Permissions', w: '140px', cell: r => r.canPublish ? '<span class="ms-badge pub">Publish</span>' : '<span class="ms-badge draft">Submit only</span>' },
        { h: 'Posts', w: '60px', cell: r => DB.posts.filter(p => p.addedBy === r.name).length },
        { h: 'Actions', w: '150px', cell: r => '<button class="ms-btn" data-tp="' + r.id + '">Toggle publish</button> <button class="ms-btn" data-del="' + r.id + '" style="color:#e08484">✕</button>' },
      ],
      rows: () => DB.subReporters,
      search: (r, q) => (r.name + ' ' + r.email).toLowerCase().includes(q),
      csvName: 'sub-reporters.csv', csvRow: r => [r.name, r.email, r.canPublish ? 'publish' : 'submit-only'],
      wire: host => {
        host.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('click', () => { const r = DB.subReporters.find(x => x.id === b.dataset.tp); r.canPublish = !r.canPublish; save(); go('subrep'); }));
        host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { if (!confirm('Remove sub-reporter?')) return; DB.subReporters = DB.subReporters.filter(x => x.id !== b.dataset.del); save(); go('subrep'); }));
      },
    });
    function renderQ() {
      const q2 = DB.posts.filter(p => p.status === 'draft' && p.addedBy !== 'Owner' && DB.subReporters.some(s => s.name === p.addedBy));
      body.querySelector('#srQueue').innerHTML = q2.map(p => '<div class="ms-row"><div style="flex:1"><b style="font-size:12px">' + esc(p.title) + '</b><div class="ms-note">by ' + esc(p.addedBy) + ' · ' + fmtDT(p.created) + '</div></div><button class="ms-btn grn" data-ap="' + p.id + '">Approve &amp; publish</button><button class="ms-btn" data-op="' + p.id + '">Open</button></div>').join('') || '<div class="ms-note">Nothing awaiting review.</div>';
      body.querySelectorAll('[data-ap]').forEach(b => b.addEventListener('click', () => { const p = DB.posts.find(x => x.id === b.dataset.ap); p.status = 'publish'; p.published = now(); save(); renderQ(); toast('Published'); }));
      body.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => postEditor(DB.posts.find(x => x.id === b.dataset.op))));
    }
    renderQ();
  };

  /* ================= ACCOUNT SETTING ================= */
  VIEWS.settings = function (body) {
    const S = DB.settings;
    body.innerHTML = '<div class="ms-panel"><b>Portal branding</b>'
      + '<div class="ms-row" style="margin-top:10px"><span class="ms-lbl">Portal name</span><input class="ms-in" id="stName" style="flex:1" value="' + esc(S.portalName) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Reporter</span><input class="ms-in" id="stRep" style="flex:1" value="' + esc(S.reporterName) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Logo</span><button class="ms-btn" id="stLogo">🖼 Upload logo</button><span class="ms-note" id="stLogoN">' + (S.logoId ? 'set' : 'none') + '</span>'
      + '<span class="ms-lbl" style="min-width:auto">Theme</span><input type="color" id="stColor" value="' + esc(S.themeColor) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">City</span><input class="ms-in" id="stCity" value="' + esc(S.city) + '"/><span class="ms-note">drives the portal weather bar (open-meteo, no key)</span></div>'
      + '<div class="ms-row"><span class="ms-lbl">Languages</span>' + ['hi', 'en', 'te', 'bn'].map(l => '<label style="display:flex;align-items:center;gap:5px;font-size:11.5px"><input type="checkbox" data-lang="' + l + '"' + (S.languages.includes(l) ? ' checked' : '') + '/>' + l + '</label>').join('') + '</div>'
      + '<div class="ms-row"><span class="ms-lbl">Domain</span><input class="ms-in" id="stDomain" style="flex:1" placeholder="yourportal.example (used in share links when set)" value="' + esc(S.domain) + '"/></div></div>'
      + '<div class="ms-panel"><b>Live stream</b>'
      + '<div class="ms-row" style="margin-top:10px"><span class="ms-lbl">Live URL</span><input class="ms-in" id="stLive" style="flex:1" placeholder="YouTube live/video URL for the portal hero" value="' + esc(S.liveUrl) + '"/></div>'
      + '<div class="ms-row"><span class="ms-lbl">Live title</span><input class="ms-in" id="stLiveT" style="flex:1" value="' + esc(S.liveTitle) + '"/><span class="ms-lbl" style="min-width:auto">Scheduled</span><input class="ms-in" type="datetime-local" id="stLiveS" value="' + esc(S.liveScheduled) + '"/></div>'
      + '<div class="ms-note">Go live: produce in STREAM ▸ Broadcast Studio, publish to your channel, paste the URL here. RTMP ingest needs a media server (documented).</div></div>'
      + '<div class="ms-panel"><b>Socials</b>' + ['facebook', 'twitter', 'instagram', 'youtube'].map(k => '<div class="ms-row"><span class="ms-lbl">' + k + '</span><input class="ms-in" data-soc="' + k + '" style="flex:1" value="' + esc(S.socials[k] || '') + '"/></div>').join('') + '</div>'
      + '<div class="ms-panel"><b>Limits &amp; providers</b>'
      + '<div class="ms-row" style="margin-top:10px"><span class="ms-lbl">Reel max sec</span><input class="ms-in" id="stSec" type="number" value="' + S.maxReelSec + '" style="width:90px"/><span class="ms-lbl" style="min-width:auto">Reel max MB</span><input class="ms-in" id="stMB" type="number" value="' + S.maxReelMB + '" style="width:90px"/></div>'
      + '<div class="ms-note" style="line-height:1.8">Provider slots (env on the Netlify deploy):<br>· AI script — uses the Terminal\'s <code>ANTHROPIC_API_KEY</code> (already wired via /api/askai) ✓<br>· RSS pull — <code>/api/rss</code> function, no key ✓<br>· Hosted TTS voiceover — needs <code>TTS_PROVIDER</code> + <code>TTS_API_KEY</code> on a relay function (mic VO works today)<br>· WhatsApp Business — <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code> (wa.me works today)<br>· RTMP live — external media server / YouTube Live (embed works today)</div></div>'
      + '<div class="ms-row"><button class="ms-btn pri" id="stSave">Save settings</button>'
      + '<button class="ms-btn" id="stFlag">Disable Media Suite (FEATURE_MEDIA_SUITE)</button></div>';
    body.querySelector('#stLogo').addEventListener('click', async () => { const f = await pickFile('image/*'); if (!f) return; const m = await addMedia(f, {}); S.logoId = m.id; body.querySelector('#stLogoN').textContent = f.name; });
    body.querySelector('#stSave').addEventListener('click', () => {
      S.portalName = body.querySelector('#stName').value.trim() || S.portalName;
      S.reporterName = body.querySelector('#stRep').value.trim() || S.reporterName;
      S.themeColor = body.querySelector('#stColor').value;
      S.city = body.querySelector('#stCity').value.trim() || S.city;
      S.domain = body.querySelector('#stDomain').value.trim();
      S.liveUrl = body.querySelector('#stLive').value.trim();
      S.liveTitle = body.querySelector('#stLiveT').value.trim();
      S.liveScheduled = body.querySelector('#stLiveS').value;
      S.languages = Array.from(body.querySelectorAll('[data-lang]')).filter(c => c.checked).map(c => c.dataset.lang);
      body.querySelectorAll('[data-soc]').forEach(i => S.socials[i.dataset.soc] = i.value.trim());
      S.maxReelSec = +body.querySelector('#stSec').value || 60; S.maxReelMB = +body.querySelector('#stMB').value || 10;
      save(); renderShell(shellRoot); toast('Settings saved');
    });
    body.querySelector('#stFlag').addEventListener('click', () => {
      if (!confirm('Disable the whole Media Suite? Re-enable with localStorage.setItem("FEATURE_MEDIA_SUITE","true") + reload.')) return;
      localStorage.setItem('FEATURE_MEDIA_SUITE', 'false'); location.reload();
    });
  };


  /* ================= PUBLIC PORTAL (reader site) ================= */
  (function portalCss() {
    if (document.getElementById('niy-msp-css')) return;
    const s = document.createElement('style'); s.id = 'niy-msp-css';
    s.textContent = [
      "#msPortal{position:fixed;inset:0;z-index:9400;background:#f4f4f2;color:#191919;overflow-y:auto;font-family:'Space Grotesk','Segoe UI',sans-serif;scrollbar-width:thin}",
      "#msPortal.dark{background:#0d0d10;color:#e8e8ea}",
      "#msPortal.dark .msp-card,#msPortal.dark .msp-head,#msPortal.dark .msp-hero,#msPortal.dark .msp-panel{background:#16161b;border-color:#2a2a31}",
      "#msPortal.dark .msp-topbar{background:#101014;border-color:#26262c;color:#bbb}",
      "#msPortal.dark .msp-nav{background:#101014;border-color:#26262c}",
      ".msp-topbar{display:flex;align-items:center;gap:13px;padding:7px 18px;background:#fff;border-bottom:1px solid #e2e2de;font-size:11.5px;color:#555;flex-wrap:wrap}",
      ".msp-live{background:#111;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:3px 11px;letter-spacing:.06em}",
      ".msp-live i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff3b3b;margin-right:5px;animation:mspBlink 1.4s infinite}",
      "@keyframes mspBlink{50%{opacity:.35}}",
      ".msp-head{display:flex;align-items:center;gap:16px;padding:13px 18px;background:#fff;border-bottom:1px solid #e2e2de;flex-wrap:wrap}",
      ".msp-logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px}",
      ".msp-logo img{width:40px;height:40px;border-radius:9px;object-fit:cover}",
      ".msp-adslot{border:1px dashed #d8d8d2;border-radius:9px;min-height:56px;display:flex;align-items:center;justify-content:center;overflow:hidden}",
      ".msp-adslot img{max-width:100%;max-height:110px;cursor:pointer}",
      ".msp-adslot .tag{font-size:9px;color:#aaa;letter-spacing:.1em}",
      ".msp-ticker{display:flex;align-items:center;gap:12px;background:#fff;border-bottom:1px solid #e2e2de;padding:7px 18px;overflow:hidden}",
      "#msPortal.dark .msp-ticker{background:#101014;border-color:#26262c}",
      ".msp-ticker .chip{flex:0 0 auto;background:var(--msp-acc,#c1121f);color:#fff;font-size:11px;font-weight:800;border-radius:7px;padding:5px 11px}",
      ".msp-ticker .rail{flex:1;overflow:hidden;white-space:nowrap}",
      ".msp-ticker .rail>div{display:inline-block;animation:mspTick 36s linear infinite;font-size:12.5px;font-weight:650}",
      "@keyframes mspTick{from{transform:translateX(8%)}to{transform:translateX(-100%)}}",
      ".msp-nav{display:flex;gap:20px;align-items:center;background:#fff;border-bottom:2px solid #e2e2de;padding:11px 18px;font-size:13px;font-weight:700;flex-wrap:wrap}",
      ".msp-nav a{color:inherit;text-decoration:none;cursor:pointer}",
      ".msp-nav a.on{color:var(--msp-acc,#c1121f);border-bottom:2px solid var(--msp-acc,#c1121f);padding-bottom:6px}",
      ".msp-grid{display:grid;grid-template-columns:250px minmax(0,1fr) 250px;gap:16px;padding:16px 18px;max-width:1420px;margin:0 auto}",
      "@media(max-width:1000px){.msp-grid{grid-template-columns:1fr}}",
      ".msp-hero{background:#000;border-radius:13px;overflow:hidden;border:1px solid #e2e2de;position:relative}",
      ".msp-hero iframe,.msp-hero video{width:100%;aspect-ratio:16/9;border:0;display:block}",
      ".msp-hero .bar{display:flex;align-items:center;gap:9px;background:#101018;color:#fff;font-size:12px;font-weight:700;padding:9px 13px}",
      ".msp-card{background:#fff;border:1px solid #e2e2de;border-radius:12px;overflow:hidden;cursor:pointer}",
      ".msp-card img{width:100%;height:150px;object-fit:cover;background:#ddd}",
      ".msp-card .t{font-size:13px;font-weight:700;line-height:1.45;padding:10px 12px 4px}",
      ".msp-card .m{font-size:10.5px;color:#999;padding:0 12px 11px}",
      ".msp-panel{background:#fff;border:1px solid #e2e2de;border-radius:12px;padding:12px 14px;margin-bottom:14px}",
      ".msp-panel h4{margin:0 0 9px;font-size:13px;border-left:4px solid var(--msp-acc,#c1121f);padding-left:9px}",
      ".msp-mini{display:flex;gap:9px;padding:7px 0;border-bottom:1px dashed #eee;cursor:pointer}",
      ".msp-mini img{width:64px;height:44px;object-fit:cover;border-radius:6px;background:#ddd}",
      ".msp-mini .t{font-size:11.5px;font-weight:650;line-height:1.4}",
      ".msp-mini .m{font-size:9.5px;color:#999}",
      ".msp-rail{display:flex;gap:11px;overflow-x:auto;padding:5px 2px;scrollbar-width:thin}",
      ".msp-reel{flex:0 0 118px;height:196px;border-radius:12px;overflow:hidden;position:relative;cursor:pointer;background:#111}",
      ".msp-reel video{width:100%;height:100%;object-fit:cover}",
      ".msp-reel .t{position:absolute;left:7px;right:7px;bottom:7px;color:#fff;font-size:10px;font-weight:650;text-shadow:0 1px 3px #000}",
      ".msp-btn{display:inline-flex;align-items:center;gap:6px;background:#f0f0ec;border:1px solid #ddd;border-radius:8px;font-size:11.5px;font-weight:650;padding:6px 12px;cursor:pointer;color:#333}",
      "#msPortal.dark .msp-btn{background:#1d1d24;border-color:#33333c;color:#ccc}",
      ".msp-btn.acc{background:var(--msp-acc,#c1121f);border-color:transparent;color:#fff}",
      ".msp-art{max-width:820px;margin:0 auto;padding:22px 18px 60px}",
      ".msp-art h1{font-size:26px;line-height:1.4;margin:8px 0 10px}",
      ".msp-art .body{font-size:15.5px;line-height:1.95}",
      ".msp-art .meta{font-size:11px;color:#999;display:flex;gap:13px;flex-wrap:wrap;align-items:center}",
      ".msp-comment{border-top:1px dashed #ddd;padding:9px 0;font-size:12.5px}",
      ".msp-x{position:fixed;top:12px;right:14px;z-index:9450;background:#111;color:#fff;border:0;border-radius:999px;width:38px;height:38px;font-size:17px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)}",
    ].join('');
    document.head.appendChild(s);
  })();

  const UI = {
    hi: { home: 'मुखपृष्ठ', breaking: 'ताज़ा खबर', live: 'LIVE STREAMING', watch: 'Watch Original', stories: 'सॉफ्ट स्टोरीज़', all: 'All Stories', epaper: 'E-Paper', top: 'टॉप न्यूज़', comments: 'टिप्पणियाँ', writeC: 'टिप्पणी लिखें…', send: 'भेजें' },
    en: { home: 'Home', breaking: 'BREAKING', live: 'LIVE STREAMING', watch: 'Watch Original', stories: 'Soft Stories', all: 'All Stories', epaper: 'E-Paper', top: 'Top News', comments: 'Comments', writeC: 'Write a comment…', send: 'Send' },
    te: { home: 'హోమ్', breaking: 'తాజా వార్త', live: 'LIVE STREAMING', watch: 'Watch Original', stories: 'సాఫ్ట్ స్టోరీస్', all: 'All Stories', epaper: 'E-Paper', top: 'టాప్ న్యూస్', comments: 'వ్యాఖ్యలు', writeC: 'వ్యాఖ్య రాయండి…', send: 'పంపండి' },
    bn: { home: 'হোম', breaking: 'তাজা খবর', live: 'LIVE STREAMING', watch: 'Watch Original', stories: 'সফট স্টোরিজ', all: 'All Stories', epaper: 'E-Paper', top: 'টপ নিউজ', comments: 'মন্তব্য', writeC: 'মন্তব্য লিখুন…', send: 'পাঠান' },
  };
  let pLang = 'hi', pDark = false, weatherCache = null;
  const T = () => UI[pLang] || UI.hi;

  async function weather() {
    if (weatherCache && now() - weatherCache.ts < 1800e3) return weatherCache;
    try {
      const g = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(DB.settings.city))).json();
      const loc = (g.results || [])[0]; if (!loc) throw 0;
      const w = await (await fetch('https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&latitude=' + loc.latitude + '&longitude=' + loc.longitude)).json();
      weatherCache = { ts: now(), temp: Math.round(w.current.temperature_2m * 10) / 10, city: DB.settings.city };
    } catch (e) { weatherCache = { ts: now(), temp: null, city: DB.settings.city }; }
    return weatherCache;
  }
  function ytEmbed(u) {
    const m = String(u || '').match(/(?:youtu\.be\/|v=|\/live\/|shorts\/|embed\/)([\w-]{6,})/);
    return m ? 'https://www.youtube.com/embed/' + m[1] + '?autoplay=0' : '';
  }
  function adSlot(page, section, style) {
    const ads = liveAds(page, section);
    if (!ads.length) return '<div class="msp-adslot" style="' + (style || '') + '"><span class="tag">AD · ' + section.toUpperCase() + '</span></div>';
    const a = ads[Math.floor(Math.random() * ads.length)];
    bump(a, 'impressions');
    return '<div class="msp-adslot" style="' + (style || '') + '"><img data-adimg="' + a.mediaId + '" data-adclick="' + a.id + '" alt="' + esc(a.title) + '"/></div>';
  }
  function pubPosts() { return DB.posts.filter(p => p.status === 'publish'); }

  let portalEl = null;
  function openPortal(view, arg) {
    if (!portalEl) {
      portalEl = el('div'); portalEl.id = 'msPortal';
      document.body.appendChild(portalEl);
      const x = el('button', 'msp-x', '×'); x.title = 'Back to Media Suite'; x.addEventListener('click', () => { portalEl.remove(); portalEl = null; document.querySelector('.msp-x') && document.querySelector('.msp-x').remove(); });
      document.body.appendChild(x);
      portalEl._x = x;
    }
    portalEl.classList.toggle('dark', pDark);
    portalEl.style.setProperty('--msp-acc', DB.settings.themeColor || '#c1121f');
    if (view === 'article') return renderArticle(arg);
    if (view === 'epaper') return renderEpaperView();
    renderHome();
  }
  function chrome(inner) {
    const S = DB.settings;
    const d = new Date();
    return '<div class="msp-topbar"><b>' + d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) + '</b>'
      + '<span id="mspWx">☀ …</span><span style="flex:1"></span>'
      + '<a href="#" data-go="epaper" style="color:inherit;font-weight:700">🗞 ' + T().epaper + '</a>'
      + '<span class="msp-live"><i></i>LIVE</span>'
      + '<button class="msp-btn" id="mspDark">' + (pDark ? '☀' : '🌙') + '</button></div>'
      + '<div class="msp-head"><div class="msp-logo"><img id="mspLogo" alt=""/><div>' + esc(S.portalName) + '<div style="font-size:9.5px;color:#999;font-weight:600">' + esc(S.reporterName) + '</div></div></div>'
      + '<div style="flex:1;min-width:200px">' + adSlot('Homepage', 'Header') + '</div>'
      + '<select class="msp-btn" id="mspLang">' + S.languages.map(l => '<option' + (l === pLang ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>'
      + '<input class="msp-btn" id="mspSearch" placeholder="🔍" style="width:120px"/></div>'
      + '<div class="msp-ticker"><span class="chip">⚡ ' + T().breaking + '</span><div class="rail"><div>' + pubPosts().slice(0, 8).map(p => esc(p.title) + ' · <b>' + new Date(p.published).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '</b>').join('  |  ') + '</div></div></div>'
      + '<div class="msp-nav"><a class="on" data-go="home">' + T().home + '</a>' + DB.categories.map(c => '<a data-cat="' + c.id + '">' + esc(c.name) + '</a>').join('') + '</div>'
      + inner;
  }
  function wireChrome() {
    blobUrl(DB.settings.logoId).then(u => { const im = portalEl.querySelector('#mspLogo'); if (im) { if (u) im.src = u; else im.style.display = 'none'; } });
    weather().then(w => { const s = portalEl.querySelector('#mspWx'); if (s) s.textContent = (w.temp != null ? '☀ ' + w.temp + '°C ' : '') + w.city; });
    portalEl.querySelector('#mspDark').addEventListener('click', () => { pDark = !pDark; openPortal(); });
    portalEl.querySelector('#mspLang').addEventListener('change', e => { pLang = e.target.value; openPortal(); });
    portalEl.querySelectorAll('[data-go="epaper"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPortal('epaper'); }));
    portalEl.querySelectorAll('[data-go="home"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPortal(); }));
    portalEl.querySelectorAll('[data-cat]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); renderHome(a.dataset.cat); }));
    portalEl.querySelectorAll('[data-adimg]').forEach(async im => { im.src = await blobUrl(im.dataset.adimg); im.addEventListener('click', () => adClick(im.dataset.adclick)); });
    const si = portalEl.querySelector('#mspSearch');
    if (si) si.addEventListener('keydown', e => { if (e.key === 'Enter') renderHome(null, si.value.trim().toLowerCase()); });
  }
  function card(p) {
    return '<div class="msp-card" data-art="' + p.id + '">' + (p.coverId ? '<img data-cov="' + p.coverId + '"/>' : '') + '<div class="t">' + esc(p.title) + '</div><div class="m">' + esc(catName(p.cat)) + ' · ' + rel(p.published || p.created) + (p.addedFrom === 'Pull' ? ' · via source' : '') + '</div></div>';
  }
  function renderHome(catId, query) {
    const S = DB.settings;
    let posts = pubPosts();
    if (catId) posts = posts.filter(p => p.cat === catId);
    if (query) posts = posts.filter(p => (p.title + ' ' + p.body).toLowerCase().includes(query));
    const emb = ytEmbed(S.liveUrl);
    const stories = DB.softStories.filter(s => s.status === 'publish');
    const cats = DB.categories.slice(0, 4);
    portalEl.innerHTML = chrome(
      '<div class="msp-grid">'
      + '<div>' + adSlot('Homepage', 'Sidebar', 'min-height:220px;margin-bottom:14px')
      + cats.slice(0, 2).map(c => sidePanel(c)).join('') + '</div>'
      + '<div>'
      + '<div class="msp-hero">' + (emb ? '<iframe src="' + emb + '" allow="autoplay; encrypted-media" allowfullscreen></iframe>' : '<div style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#888;flex-direction:column;gap:8px"><b>' + T().live + '</b><span style="font-size:11px">' + (S.liveScheduled ? 'Scheduled: ' + esc(S.liveScheduled.replace('T', ' ')) : 'Set a live URL in Account Setting, or go live from STREAM ▸ Broadcast Studio') + '</span></div>')
      + '<div class="bar"><i style="width:8px;height:8px;border-radius:50%;background:#ff3b3b"></i> ' + T().live + (S.liveTitle ? ' — ' + esc(S.liveTitle) : '') + '<span style="flex:1"></span>' + (S.liveUrl ? '<a href="' + esc(S.liveUrl) + '" target="_blank" rel="noopener" style="color:#9cf">' + T().watch + ' ↗</a>' : '') + '</div></div>'
      + (stories.length ? '<div class="msp-panel" style="margin-top:14px"><h4>' + T().stories + ' <a href="#" data-allst style="float:right;font-size:11px;color:var(--msp-acc)">' + T().all + ' →</a></h4><div class="msp-rail">' + stories.slice(0, 12).map((s, i) => '<div class="msp-reel" data-reel="' + i + '"><video data-rv="' + s.mediaId + '" muted preload="metadata"></video><div class="t">' + esc(s.title.slice(0, 44)) + '</div></div>').join('') + '</div></div>' : '')
      + adSlot('Homepage', 'In-feed', 'margin:14px 0')
      + '<div class="msp-panel"><h4>' + (catId ? esc(catName(catId)) : query ? 'Search: ' + esc(query) : T().top) + '</h4><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px">' + (posts.map(card).join('') || '<div style="color:#999;font-size:12px;padding:14px">No articles yet.</div>') + '</div></div>'
      + '</div>'
      + '<div>' + adSlot('Homepage', 'Sidebar', 'min-height:220px;margin-bottom:14px') + cats.slice(2, 4).map(c => sidePanel(c)).join('') + '</div>'
      + '</div>');
    wireChrome(); wireHome();
    // popup ad (once per open)
    const pops = liveAds('Homepage', 'Home Page Popup');
    if (pops.length && !portalEl._popped) {
      portalEl._popped = true;
      const a = pops[0]; bump(a, 'impressions');
      blobUrl(a.mediaId).then(u => {
        const ov = el('div', 'ms-modal-ov'); ov.style.zIndex = 9460;
        ov.innerHTML = '<div style="position:relative;max-width:82vw"><button class="msp-x" style="top:-14px;right:-14px;position:absolute" data-x>×</button><img src="' + u + '" style="max-width:100%;max-height:76vh;border-radius:12px;cursor:pointer" data-c/></div>';
        document.body.appendChild(ov);
        ov.querySelector('[data-x]').addEventListener('click', () => ov.remove());
        ov.querySelector('[data-c]').addEventListener('click', () => { adClick(a.id); ov.remove(); });
      });
    }
  }
  function sidePanel(c) {
    const list = pubPosts().filter(p => p.cat === c.id).slice(0, 4);
    return '<div class="msp-panel"><h4>⚡ ' + esc(c.name) + '</h4>' + (list.map(p => '<div class="msp-mini" data-art="' + p.id + '">' + (p.coverId ? '<img data-cov="' + p.coverId + '"/>' : '') + '<div><div class="t">' + esc(p.title.slice(0, 64)) + '</div><div class="m">' + rel(p.published || p.created) + '</div></div></div>').join('') || '<div style="font-size:11px;color:#aaa">No stories yet.</div>') + '</div>';
  }
  function wireHome() {
    portalEl.querySelectorAll('[data-cov]').forEach(async im => im.src = await blobUrl(im.dataset.cov));
    portalEl.querySelectorAll('video[data-rv]').forEach(async v => v.src = await blobUrl(v.dataset.rv));
    portalEl.querySelectorAll('[data-art]').forEach(n => n.addEventListener('click', () => openPortal('article', n.dataset.art)));
    portalEl.querySelectorAll('[data-reel]').forEach(n => n.addEventListener('click', () => openReelPlayer(+n.dataset.reel)));
    const all = portalEl.querySelector('[data-allst]'); if (all) all.addEventListener('click', e => { e.preventDefault(); openReelPlayer(0); });
  }

  /* reels full-screen player (swipe/scroll between stories) */
  function openReelPlayer(startIdx) {
    const stories = DB.softStories.filter(s => s.status === 'publish');
    if (!stories.length) return;
    let idx = Math.min(startIdx, stories.length - 1);
    const ov = el('div', 'ms-reelwrap');
    ov.innerHTML = '<button class="ms-reel-x">×</button><video playsinline autoplay loop></video><div class="ms-reel-meta"></div><div class="ms-reel-acts"><button data-a="like">👍</button><button data-a="share">📤</button><button data-a="next">⌄</button></div>';
    document.body.appendChild(ov);
    const v = ov.querySelector('video');
    async function show() {
      const s = stories[idx];
      bump(s, 'views');
      v.src = await blobUrl(s.mediaId); v.play().catch(() => { });
      ov.querySelector('.ms-reel-meta').innerHTML = '<b>' + esc(s.title) + '</b><div style="font-size:11px;opacity:.8">' + esc(catName(s.cat)) + (s.ai ? ' · ✦ AI' : '') + ' · 👍 ' + (s.likes || 0) + '</div>';
    }
    show();
    ov.querySelector('.ms-reel-x').addEventListener('click', () => ov.remove());
    ov.addEventListener('wheel', e => { idx = (idx + (e.deltaY > 0 ? 1 : stories.length - 1)) % stories.length; show(); });
    let ty = 0;
    ov.addEventListener('touchstart', e => ty = e.touches[0].clientY);
    ov.addEventListener('touchend', e => { const d = ty - e.changedTouches[0].clientY; if (Math.abs(d) > 50) { idx = (idx + (d > 0 ? 1 : stories.length - 1)) % stories.length; show(); } });
    ov.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const s = stories[idx];
      if (b.dataset.a === 'like') { bump(s, 'likes'); show(); }
      if (b.dataset.a === 'share') waShare('🎞 ' + s.title + '\n— ' + DB.settings.portalName, 'story', s.id);
      if (b.dataset.a === 'next') { idx = (idx + 1) % stories.length; show(); }
    }));
  }

  /* article page */
  function renderArticle(id) {
    const p = DB.posts.find(x => x.id === id); if (!p) return renderHome();
    bump(p, 'views');
    const link = (DB.settings.domain ? 'https://' + DB.settings.domain + '/' : '') + p.slug;
    portalEl.innerHTML = chrome('<div class="msp-art">'
      + '<span class="ms-badge cat" style="border-color:#ccc;color:#888">' + esc(catName(p.cat)) + '</span>'
      + '<h1>' + esc(p.title) + '</h1>'
      + '<div class="meta"><span>✍ ' + esc(p.addedBy) + '</span><span>' + fmtDT(p.published || p.created) + '</span><span>👁 <b id="artV">' + p.views + '</b></span><span class="ms-badge ' + (p.addedFrom === 'Pull' ? 'pull' : 'self') + '">' + p.addedFrom + '</span>' + (p.ai ? '<span class="ms-badge ai">✦ AI Generated</span>' : '') + '</div>'
      + (p.coverId ? '<img data-cov="' + p.coverId + '" style="width:100%;border-radius:12px;margin:14px 0"/>' : '')
      + '<div class="body">' + p.body + '</div>'
      + p.mediaIds.map(m => '<video data-cov="' + m + '" controls style="width:100%;border-radius:12px;margin:10px 0"></video>').join('')
      + '<div class="msp-panel" style="margin-top:18px"><div style="display:flex;gap:9px;flex-wrap:wrap">'
      + '<button class="msp-btn" data-r="like">👍 <span>' + (p.likes || 0) + '</span></button><button class="msp-btn" data-r="dislike">👎 <span>' + (p.dislikes || 0) + '</span></button><span style="flex:1"></span>'
      + [['whatsapp', '💬 WhatsApp'], ['facebook', '📘'], ['twitter', '𝕏'], ['linkedin', 'in'], ['instagram', '📷'], ['generic', '🔗 Copy']].map(ch => '<button class="msp-btn" data-sh="' + ch[0] + '">' + ch[1] + '</button>').join('') + '</div></div>'
      + '<div class="msp-panel"><h4>' + T().comments + ' (' + DB.comments.filter(c => c.postId === p.id).length + ')</h4><div id="artC">'
      + DB.comments.filter(c => c.postId === p.id).map(c => '<div class="msp-comment"><b>' + esc(c.name) + '</b> · <span style="color:#999;font-size:10px">' + rel(c.ts) + '</span><br>' + esc(c.text) + '</div>').join('')
      + '</div><div style="display:flex;gap:8px;margin-top:9px"><input class="msp-btn" id="cName" placeholder="Name" style="width:110px"/><input class="msp-btn" id="cText" placeholder="' + T().writeC + '" style="flex:1"/><button class="msp-btn acc" id="cSend">' + T().send + '</button></div></div>'
      + adSlot('Article', 'In-feed', 'margin-top:12px') + '</div>');
    wireChrome();
    portalEl.querySelectorAll('[data-cov]').forEach(async n => n.src = await blobUrl(n.dataset.cov));
    portalEl.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { bump(p, b.dataset.r === 'like' ? 'likes' : 'dislikes'); b.querySelector('span').textContent = b.dataset.r === 'like' ? p.likes : p.dislikes; }));
    portalEl.querySelectorAll('[data-sh]').forEach(b => b.addEventListener('click', () => {
      const ch = b.dataset.sh; shareEvent(ch, 'post', p.id);
      const txt = p.title + ' — ' + DB.settings.portalName + (link ? '\n' + link : '');
      if (ch === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
      else if (ch === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link || location.href) + '&quote=' + encodeURIComponent(p.title), '_blank', 'noopener');
      else if (ch === 'twitter') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(txt), '_blank', 'noopener');
      else if (ch === 'linkedin') window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(link || location.href), '_blank', 'noopener');
      else { navigator.clipboard && navigator.clipboard.writeText(txt); toast('Copied'); }
    }));
    portalEl.querySelector('#cSend').addEventListener('click', () => {
      const n = portalEl.querySelector('#cName').value.trim() || 'Reader', t = portalEl.querySelector('#cText').value.trim();
      if (!t) return;
      DB.comments.push({ id: uid('cm'), postId: p.id, name: n, text: t, ts: now() }); save();
      renderArticle(id);
    });
    portalEl.scrollTop = 0;
  }

  function renderEpaperView() {
    portalEl.innerHTML = chrome('<div class="msp-art"><h1>🗞 ' + T().epaper + '</h1>'
      + (DB.epaper.map(e2 => '<div class="msp-panel" style="display:flex;align-items:center;gap:12px"><b style="flex:1">' + e2.date + '</b><button class="msp-btn acc" data-ep="' + e2.id + '">📖 Read</button></div>').join('') || '<div class="msp-panel">No editions published yet.</div>') + '<div id="epHost"></div></div>');
    wireChrome();
    portalEl.querySelectorAll('[data-ep]').forEach(b => b.addEventListener('click', async () => {
      const e2 = DB.epaper.find(x => x.id === b.dataset.ep);
      const u = await blobUrl(e2.mediaId);
      portalEl.querySelector('#epHost').innerHTML = '<iframe src="' + u + '" style="width:100%;height:78vh;border:0;border-radius:12px;background:#fff"></iframe>';
    }));
  }

  /* ================= EXPORT PORTAL (standalone HTML) ================= */
  async function exportPortal() {
    toast('Building portal export…');
    const S = DB.settings;
    async function dataUrl(id, cap) {
      const b = await blobGet(id); if (!b || b.size > (cap || 400000)) return '';
      return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
    }
    const logo = await dataUrl(S.logoId, 200000);
    const posts = [];
    for (const p of pubPosts().slice(0, 60)) posts.push({ t: p.title, c: catName(p.cat), b: p.body, d: fmtDT(p.published || p.created), by: p.addedBy, img: await dataUrl(p.coverId, 350000), from: p.addedFrom });
    const emb = ytEmbed(S.liveUrl);
    const html = '<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(S.portalName) + '</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f2;color:#1a1a1a}header{background:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:2px solid ' + S.themeColor + '}header img{width:44px;height:44px;border-radius:9px}h1{font-size:19px;margin:0}main{max-width:900px;margin:0 auto;padding:16px}article{background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:16px 18px;margin-bottom:14px}article img{max-width:100%;border-radius:9px}.m{font-size:11px;color:#999}.live{margin:0 0 14px;border-radius:12px;overflow:hidden}iframe{width:100%;aspect-ratio:16/9;border:0}footer{text-align:center;color:#999;font-size:11px;padding:22px}</style></head><body>'
      + '<header>' + (logo ? '<img src="' + logo + '"/>' : '') + '<div><h1>' + esc(S.portalName) + '</h1><div class="m">' + esc(S.reporterName) + '</div></div></header><main>'
      + (emb ? '<div class="live"><iframe src="' + emb + '" allowfullscreen></iframe></div>' : '')
      + posts.map(p => '<article>' + (p.img ? '<img src="' + p.img + '"/>' : '') + '<h2>' + esc(p.t) + '</h2><div class="m">' + esc(p.c) + ' · ' + esc(p.d) + ' · ' + esc(p.by) + ' · ' + p.from + '</div><div>' + p.b + '</div></article>').join('')
      + '</main><footer>Published with Media Suite · ' + esc(S.portalName) + '</footer></body></html>';
    dl(slugify(S.portalName) + '-portal.html', new Blob([html], { type: 'text/html;charset=utf-8' }));
    toast('Portal HTML downloaded — host it anywhere (videos stay in the suite; export carries articles, covers, live embed)');
  }

  /* ================= STREAM registration ================= */
  function register() {
    if (!window.NiyStream || !window.NiyStream.Stream) return setTimeout(register, 400);
    window.NiyStream.Stream.register({
      id: 'mediasuite', icon: '🗞', title: 'Media Suite',
      desc: 'Run your own branded news portal: news posts, bulletins, AI soft stories, reels, e-paper, ads, WhatsApp distribution and sub-reporters — with a reader-facing site.',
      status: () => ({ cls: '', txt: pubPosts().length + ' published · ' + DB.softStories.length + ' stories' }),
      aiChips: ['Draft a news post from a topic', 'Write a bulletin script', 'Suggest 5 headlines'],
      aiCtx: () => 'Media Suite (journalist portal). Portal: ' + DB.settings.portalName + '. Categories: ' + DB.categories.map(c => c.name).join(', ') + '. Recent posts: ' + pubPosts().slice(0, 5).map(p => p.title).join(' | '),
      init(body) { renderShell(body); },
    });
  }
  register();
})();

