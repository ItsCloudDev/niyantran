
(function () {
'use strict';
/* ================================================================
   NIYANTRAN STREAM — professional AI newsroom suite.
   Live TV (existing module, untouched) + Teleprompter + Broadcast
   Studio + Video Editor + Remote Studio + Captions + Pro Camera,
   behind one premium hub. Everything runs in-browser; capabilities
   that physically require a server (RTMP push, multi-party
   signaling) are prepared architecturally and labelled honestly.
   ================================================================ */
const Stream = { mods: [], views: {}, cur: null, open: false };
const SLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const SSET = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
const fmtT = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), h = Math.floor(m / 60); return (h ? h + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const fmtAgo = ts => { if (!ts) return 'Never opened'; const d = Date.now() - ts; if (d < 60e3) return 'Just now'; if (d < 3600e3) return Math.floor(d / 60e3) + 'm ago'; if (d < 86400e3) return Math.floor(d / 3600e3) + 'h ago'; return Math.floor(d / 86400e3) + 'd ago'; };
const dl = (name, blobOrUrl) => { const a = document.createElement('a'); a.download = name; a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.click(); if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
const pickFile = (accept, multi) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.multiple = !!multi; i.onchange = () => res(multi ? Array.from(i.files) : i.files[0]); i.click(); });
const smToast = m => { try { if (typeof showToast === 'function') { showToast(m); return; } } catch (e) { } const t = el('div', 'sm-toast', esc(m)); document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
let smMeta = SLS('niyStreamMeta', { last: {}, favs: [] });
const metaSave = () => SSET('niyStreamMeta', smMeta);
// Frame driver: rAF while the tab is visible, a 30fps timer while hidden —
// keeps recordings, the compositor and the prompter running when the tab is
// backgrounded (rAF is suspended in hidden tabs).
const smRaf = fn => (document.visibilityState === 'visible' ? requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 33));
const smCancelRaf = id => { cancelAnimationFrame(id); clearTimeout(id); };

/* ---------------- styles ---------------- */
(function () {
  if (document.getElementById('niy-stream-css')) return;
  const s = document.createElement('style'); s.id = 'niy-stream-css';
  s.textContent = [
    "#niyStream{position:fixed;inset:0;z-index:8500;background:#07090d;color:#e8edf2;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;font-variant-numeric:tabular-nums}",
    "#niyStream[hidden]{display:none}",
    ".sm-head{display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.07);background:#0a0d12;flex:0 0 auto}",
    ".sm-mark{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;letter-spacing:.16em}",
    ".sm-mark .dot{width:8px;height:8px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 10px rgba(255,77,77,.8);animation:smPulse 2.2s infinite}",
    "@keyframes smPulse{0%{box-shadow:0 0 0 0 rgba(255,77,77,.5)}70%{box-shadow:0 0 0 8px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}",
    ".sm-crumb{font-size:11px;color:#68717b;letter-spacing:.06em}",
    ".sm-crumb b{color:#aab4c0;font-weight:650}",
    ".sm-hspace{flex:1}",
    ".sm-hbtn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#c3ccd6;font-size:11px;font-weight:600;padding:6px 11px;cursor:pointer;transition:all .13s}",
    ".sm-hbtn:hover{background:rgba(255,255,255,.1);color:#fff}",
    ".sm-hbtn.ai{background:rgba(127,176,255,.12);border-color:rgba(127,176,255,.3);color:#a9c8ff}",
    ".sm-hbtn.ai:hover{background:rgba(127,176,255,.22)}",
    ".sm-hbtn.rec{background:rgba(255,77,77,.12);border-color:rgba(255,77,77,.35);color:#ff8585}",
    ".sm-hbtn.on{background:rgba(47,213,123,.14);border-color:rgba(47,213,123,.4);color:#57e39b}",
    ".sm-x{background:transparent;border:0;color:#68717b;font-size:20px;cursor:pointer;line-height:1;padding:4px 6px}",
    ".sm-x:hover{color:#fff}",
    ".sm-body{flex:1;min-height:0;position:relative;display:flex}",
    ".sm-view{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}",
    /* hub */
    ".sm-hub{flex:1;overflow-y:auto;padding:26px 30px 40px;scrollbar-width:thin}",
    ".sm-hero{margin:4px 0 4px}",
    ".sm-hero h1{margin:0;font-size:26px;font-weight:750;letter-spacing:-.02em;background:linear-gradient(90deg,#eef2f6,#8db8ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}",
    ".sm-hero p{margin:6px 0 0;font-size:12.5px;color:#727c87;letter-spacing:.02em}",
    ".sm-searchrow{display:flex;align-items:center;gap:10px;margin:20px 0 6px}",
    ".sm-search{flex:0 1 420px;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:8px 13px}",
    ".sm-search:focus-within{border-color:rgba(127,176,255,.45)}",
    ".sm-search input{flex:1;background:transparent;border:0;outline:none;color:#eef2f6;font-size:12.5px}",
    ".sm-search .hint{font-size:9px;color:#5b636e;border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:1px 5px}",
    ".sm-qa{display:flex;gap:7px;flex-wrap:wrap}",
    ".sm-chip{background:rgba(127,176,255,.07);border:1px solid rgba(127,176,255,.22);border-radius:999px;color:#8db8ff;font-size:10.5px;font-weight:600;padding:5px 12px;cursor:pointer;transition:all .13s;white-space:nowrap}",
    ".sm-chip:hover{background:rgba(127,176,255,.18);transform:translateY(-1px)}",
    ".sm-sec{font-size:9.5px;font-weight:700;letter-spacing:.15em;color:#5f6873;margin:22px 0 10px;display:flex;align-items:center;gap:8px}",
    ".sm-sec::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05)}",
    ".sm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:13px}",
    ".sm-card{position:relative;text-align:left;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0) 55%),#0e1218;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 17px 14px;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;overflow:hidden}",
    ".sm-card:hover{transform:translateY(-3px);border-color:rgba(127,176,255,.35);box-shadow:0 14px 38px rgba(0,0,0,.4),0 0 0 1px rgba(127,176,255,.12)}",
    ".sm-card:hover .sm-card-go{opacity:1;transform:translateX(0)}",
    ".sm-card-top{display:flex;align-items:center;gap:11px;margin-bottom:9px}",
    ".sm-card-ic{width:38px;height:38px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:18px;border-radius:10px;background:rgba(127,176,255,.09);border:1px solid rgba(127,176,255,.18)}",
    ".sm-card-t{font-size:14px;font-weight:700;letter-spacing:.01em}",
    ".sm-card-sub{display:flex;align-items:center;gap:6px;margin-top:2px}",
    ".sm-status{width:6px;height:6px;border-radius:50%;background:#2fd57b;box-shadow:0 0 6px rgba(47,213,123,.7)}",
    ".sm-status.idle{background:#5b636e;box-shadow:none}",
    ".sm-status.warn{background:#d9a13c;box-shadow:0 0 6px rgba(217,161,60,.6)}",
    ".sm-card-st{font-size:9.5px;color:#727c87;letter-spacing:.04em}",
    ".sm-card-d{font-size:11px;line-height:1.55;color:#8d97a3;min-height:34px}",
    ".sm-card-foot{display:flex;align-items:center;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,.05)}",
    ".sm-card-last{font-size:9.5px;color:#5f6873}",
    ".sm-key{font-size:8.5px;font-weight:700;color:#68717b;border:1px solid rgba(255,255,255,.13);border-radius:4px;padding:1px 6px;letter-spacing:.05em}",
    ".sm-fav{margin-left:auto;background:transparent;border:0;color:#4a525c;font-size:14px;cursor:pointer;padding:2px;transition:color .12s,transform .12s}",
    ".sm-fav:hover{transform:scale(1.2)}",
    ".sm-fav.on{color:#f0b429}",
    ".sm-card-go{position:absolute;right:14px;top:16px;font-size:12px;color:#8db8ff;opacity:0;transform:translateX(-6px);transition:all .18s}",
    ".sm-recents{display:flex;gap:8px;flex-wrap:wrap}",
    ".sm-recent{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px 13px;cursor:pointer;font-size:11.5px;font-weight:600;color:#c3ccd6;transition:all .13s}",
    ".sm-recent:hover{border-color:rgba(127,176,255,.35);color:#fff;transform:translateY(-1px)}",
    ".sm-recent span{font-size:9px;color:#5f6873;font-weight:500}",
    /* module workspace shell */
    ".sm-mod{flex:1;min-height:0;display:none;flex-direction:column}",
    ".sm-mod.show{display:flex}",
    ".sm-modhead{display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,.06);background:#0c0f15;flex:0 0 auto;flex-wrap:wrap}",
    ".sm-back{display:inline-flex;align-items:center;gap:6px;background:transparent;border:0;color:#8d97a3;font-size:11.5px;font-weight:600;cursor:pointer;padding:5px 8px;border-radius:7px}",
    ".sm-back:hover{background:rgba(255,255,255,.06);color:#fff}",
    ".sm-modtitle{font-size:12.5px;font-weight:750;letter-spacing:.1em}",
    ".sm-modtools{display:flex;align-items:center;gap:7px;margin-left:auto;flex-wrap:wrap}",
    ".sm-modbody{flex:1;min-height:0;display:flex}",
    /* generic inner panels */
    ".sm-panel{background:#0e1218;border:1px solid rgba(255,255,255,.07);border-radius:12px}",
    ".sm-lbl{font-size:9px;font-weight:700;letter-spacing:.13em;color:#68717b}",
    ".sm-in{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#eef2f6;font-size:11.5px;padding:6px 10px;outline:none;font-family:inherit}",
    ".sm-in:focus{border-color:rgba(127,176,255,.4)}",
    ".sm-range{accent-color:#7fb0ff}",
    ".sm-note{font-size:10px;line-height:1.6;color:#68717b}",
    ".sm-honest{display:flex;gap:9px;align-items:flex-start;background:rgba(217,161,60,.06);border:1px solid rgba(217,161,60,.25);border-radius:10px;padding:10px 12px;font-size:10.5px;line-height:1.6;color:#c9a96a}",
    ".sm-toast{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:9990;background:#161b23;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#e8edf2;font-size:12px;padding:9px 16px;box-shadow:0 12px 34px rgba(0,0,0,.5)}",
    /* AI drawer */
    ".sm-ai{position:absolute;top:0;right:0;bottom:0;width:330px;background:#0c1016;border-left:1px solid rgba(255,255,255,.08);display:none;flex-direction:column;z-index:30;box-shadow:-18px 0 40px rgba(0,0,0,.35)}",
    ".sm-ai.show{display:flex}",
    ".sm-ai-h{display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.07)}",
    ".sm-ai-h b{font-size:10px;font-weight:800;letter-spacing:.14em;color:#a9c8ff}",
    ".sm-ai-ctx{font-size:9px;color:#5f6873;letter-spacing:.04em;margin-left:auto;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".sm-ai-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px;scrollbar-width:thin}",
    ".sm-ai-m{max-width:94%;font-size:11.5px;line-height:1.6;border-radius:10px;padding:8px 11px;white-space:pre-wrap;word-break:break-word}",
    ".sm-ai-m.u{align-self:flex-end;background:rgba(127,176,255,.13);border:1px solid rgba(127,176,255,.25);color:#d6e5ff}",
    ".sm-ai-m.a{align-self:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#dbe2e9}",
    ".sm-ai-m .sm-apply{display:block;margin-top:7px;background:rgba(47,213,123,.12);border:1px solid rgba(47,213,123,.35);border-radius:6px;color:#57e39b;font-size:10px;font-weight:700;padding:4px 9px;cursor:pointer}",
    ".sm-ai-chips{display:flex;gap:5px;flex-wrap:wrap;padding:0 12px 8px}",
    ".sm-ai-chips .sm-chip{font-size:9.5px;padding:3.5px 9px}",
    ".sm-ai-inrow{display:flex;gap:7px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.07)}",
    ".sm-ai-inrow textarea{flex:1;resize:none;height:54px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:9px;color:#eef2f6;font-size:11.5px;padding:8px 10px;outline:none;font-family:inherit}",
    ".sm-ai-send{align-self:flex-end;background:rgba(127,176,255,.16);border:1px solid rgba(127,176,255,.35);border-radius:8px;color:#a9c8ff;font-size:11px;font-weight:700;padding:7px 13px;cursor:pointer}",
    "@media(max-width:900px){.sm-grid{grid-template-columns:1fr 1fr}.sm-ai{width:100%}}",
    "@media(max-width:640px){.sm-grid{grid-template-columns:1fr}.sm-hub{padding:18px 14px 30px}}",
  ].join('');
  document.head.appendChild(s);
})();

/* ---------------- overlay shell ---------------- */
function buildShell() {
  if (document.getElementById('niyStream')) return;
  const root = el('div'); root.id = 'niyStream'; root.hidden = true;
  root.innerHTML = '<div class="sm-head">'
    + '<div class="sm-mark"><span class="dot"></span>STREAM</div>'
    + '<div class="sm-crumb" id="smCrumb">Newsroom suite</div>'
    + '<div class="sm-hspace"></div>'
    + '<button class="sm-hbtn ai" id="smAiBtn" type="button" title="AI assistant — understands the current workspace">✦ AI Assistant</button>'
    + '<button class="sm-x" id="smClose" type="button" title="Close (Esc)">×</button>'
    + '</div>'
    + '<div class="sm-body" id="smBody">'
    + '<div class="sm-view" id="smHubView"><div class="sm-hub" id="smHub"></div></div>'
    + '<div class="sm-ai" id="smAiDrawer">'
    + '<div class="sm-ai-h"><b>✦ AI ASSISTANT</b><span class="sm-ai-ctx" id="smAiCtx"></span><button class="sm-x" id="smAiX" type="button">×</button></div>'
    + '<div class="sm-ai-log" id="smAiLog"></div>'
    + '<div class="sm-ai-chips" id="smAiChips"></div>'
    + '<div class="sm-ai-inrow"><textarea id="smAiIn" placeholder="Ask about this workspace…"></textarea><button class="sm-ai-send" id="smAiSend" type="button">Send</button></div>'
    + '</div>'
    + '</div>';
  document.body.appendChild(root);
  root.querySelector('#smClose').addEventListener('click', closeStream);
  root.querySelector('#smAiBtn').addEventListener('click', () => aiToggle());
  root.querySelector('#smAiX').addEventListener('click', () => aiToggle(false));
  root.querySelector('#smAiSend').addEventListener('click', aiSend);
  root.querySelector('#smAiIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); } });
}

function openStream() { buildShell(); const r = document.getElementById('niyStream'); r.hidden = false; Stream.open = true; showHub(); }
function closeStream() { const r = document.getElementById('niyStream'); if (r) r.hidden = true; Stream.open = false; Stream.mods.forEach(m => { try { if (m.onHide && Stream.cur === m.id) m.onHide(); } catch (e) { } }); Stream.cur = null; }
function showHub() {
  Stream.mods.forEach(m => { const v = Stream.views[m.id]; if (v) v.classList.remove('show'); try { if (m.onHide && Stream.cur === m.id) m.onHide(); } catch (e) { } });
  Stream.cur = null;
  document.getElementById('smHubView').style.display = '';
  document.getElementById('smCrumb').innerHTML = 'Newsroom suite';
  renderHub();
  aiSetContext('Stream hub', () => 'The user is on the Stream hub of Niyantran Terminal — a newsroom suite with Live TV fact-checking, teleprompter, broadcast studio, video editor, remote studio, captions and pro camera.', ['Draft a 60-second bulletin script', 'Suggest 5 headlines from today', 'Write a YouTube description', 'Generate hashtags for a politics video']);
}

/* ---------------- module registry + launcher ---------------- */
Stream.register = function (m) { Stream.mods.push(m); };
function launchModule(id) {
  const m = Stream.mods.find(x => x.id === id); if (!m) return;
  if (m.external) { closeStream(); try { m.launch(); } catch (e) { smToast('Could not open ' + m.title); } smMeta.last[id] = Date.now(); metaSave(); return; }
  document.getElementById('smHubView').style.display = 'none';
  Stream.mods.forEach(x => { const v = Stream.views[x.id]; if (v) v.classList.remove('show'); });
  let v = Stream.views[id];
  if (!v) {
    v = el('div', 'sm-mod'); v.id = 'smView_' + id;
    v.innerHTML = '<div class="sm-modhead"><button class="sm-back" type="button">← Hub</button><span class="sm-card-ic" style="width:26px;height:26px;font-size:13px;border-radius:7px">' + m.icon + '</span><span class="sm-modtitle">' + esc(m.title.toUpperCase()) + '</span><div class="sm-modtools"></div></div><div class="sm-modbody"></div>';
    v.querySelector('.sm-back').addEventListener('click', showHub);
    document.getElementById('smBody').insertBefore(v, document.getElementById('smAiDrawer'));
    Stream.views[id] = v;
    try { m.init(v.querySelector('.sm-modbody'), v.querySelector('.sm-modtools')); } catch (e) { v.querySelector('.sm-modbody').innerHTML = '<div class="sm-note" style="padding:20px">Module failed to start: ' + esc(e.message) + '</div>'; }
  }
  v.classList.add('show');
  Stream.cur = id;
  document.getElementById('smCrumb').innerHTML = 'Newsroom suite <b>▸ ' + esc(m.title) + '</b>';
  smMeta.last[id] = Date.now(); metaSave();
  try { if (m.onShow) m.onShow(); } catch (e) { }
  try { aiSetContext(m.title, m.aiCtx || (() => 'User is in the ' + m.title + ' workspace.'), m.aiChips || []); } catch (e) { }
}

/* ---------------- hub ---------------- */
let hubQuery = '';
function renderHub() {
  const hub = document.getElementById('smHub');
  const favs = smMeta.favs || [];
  const match = m => !hubQuery || (m.title + ' ' + m.desc).toLowerCase().includes(hubQuery.toLowerCase());
  const card = (m, i) => {
    const fav = favs.includes(m.id);
    let stat = { cls: '', txt: 'Ready' };
    try { if (m.status) stat = m.status(); } catch (e) { }
    return '<button class="sm-card" data-m="' + m.id + '" type="button">'
      + '<span class="sm-card-go">Open →</span>'
      + '<div class="sm-card-top"><div class="sm-card-ic">' + m.icon + '</div><div><div class="sm-card-t">' + esc(m.title) + '</div>'
      + '<div class="sm-card-sub"><span class="sm-status ' + stat.cls + '"></span><span class="sm-card-st">' + esc(stat.txt) + '</span></div></div></div>'
      + '<div class="sm-card-d">' + esc(m.desc) + '</div>'
      + '<div class="sm-card-foot"><span class="sm-card-last">' + fmtAgo(smMeta.last[m.id]) + '</span><span class="sm-key">' + (i + 1) + '</span>'
      + '<span class="sm-fav' + (fav ? ' on' : '') + '" data-fav="' + m.id + '" title="' + (fav ? 'Unpin' : 'Pin to top') + '">' + (fav ? '★' : '☆') + '</span></div>'
      + '</button>';
  };
  const ordered = Stream.mods.slice().sort((a, b) => (favs.includes(b.id) ? 1 : 0) - (favs.includes(a.id) ? 1 : 0));
  const recents = Stream.mods.filter(m => smMeta.last[m.id]).sort((a, b) => smMeta.last[b.id] - smMeta.last[a.id]).slice(0, 4);
  const pinned = ordered.filter(m => favs.includes(m.id) && match(m));
  const rest = ordered.filter(m => !favs.includes(m.id) && match(m));
  hub.innerHTML = '<div class="sm-hero"><h1>Stream</h1><p>Your AI-powered digital newsroom — research, produce, record and publish without leaving the terminal.</p></div>'
    + '<div class="sm-searchrow"><div class="sm-search"><span style="color:#5f6873">⌕</span><input id="smSearch" placeholder="Search modules…" value="' + esc(hubQuery) + '"/><span class="hint">/</span></div></div>'
    + '<div class="sm-sec">AI QUICK ACTIONS</div><div class="sm-qa">'
    + ['Draft a 60-second bulletin script', 'Convert an article into a teleprompter script', 'Generate lower-third copy', 'Write a YouTube description + hashtags', 'Generate interview questions'].map(q => '<button class="sm-chip" data-qa="' + esc(q) + '" type="button">✦ ' + esc(q) + '</button>').join('') + '</div>'
    + (recents.length ? '<div class="sm-sec">RECENT</div><div class="sm-recents">' + recents.map(m => '<button class="sm-recent" data-m="' + m.id + '" type="button">' + m.icon + ' ' + esc(m.title) + ' <span>' + fmtAgo(smMeta.last[m.id]) + '</span></button>').join('') + '</div>' : '')
    + (pinned.length ? '<div class="sm-sec">PINNED</div><div class="sm-grid">' + pinned.map(m => card(m, Stream.mods.indexOf(m))).join('') + '</div>' : '')
    + '<div class="sm-sec">' + (pinned.length ? 'ALL MODULES' : 'MODULES') + '</div><div class="sm-grid">' + rest.map(m => card(m, Stream.mods.indexOf(m))).join('') + '</div>';
  hub.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('[data-fav]')) return; launchModule(b.dataset.m); }));
  hub.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.fav, f = smMeta.favs || [];
    smMeta.favs = f.includes(id) ? f.filter(x => x !== id) : f.concat([id]);
    metaSave(); renderHub();
  }));
  hub.querySelectorAll('[data-qa]').forEach(b => b.addEventListener('click', () => { aiToggle(true); const i = document.getElementById('smAiIn'); i.value = b.dataset.qa; i.focus(); }));
  const si = hub.querySelector('#smSearch');
  si.addEventListener('input', () => { hubQuery = si.value; const pos = si.selectionStart; renderHub(); const si2 = document.getElementById('smSearch'); si2.focus(); si2.setSelectionRange(pos, pos); });
}

/* ---------------- shared AI assistant ---------------- */
const aiState = { ctxLabel: '', ctxFn: null, hist: [], busy: false };
function aiSetContext(label, fn, chips) {
  aiState.ctxLabel = label; aiState.ctxFn = fn;
  const c = document.getElementById('smAiCtx'); if (c) c.textContent = label;
  const box = document.getElementById('smAiChips');
  if (box) {
    box.innerHTML = (chips || []).map(q => '<button class="sm-chip" data-q="' + esc(q) + '" type="button">' + esc(q) + '</button>').join('');
    box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { const i = document.getElementById('smAiIn'); i.value = b.dataset.q; aiSend(); }));
  }
}
function aiToggle(force) {
  const d = document.getElementById('smAiDrawer');
  const show = force != null ? force : !d.classList.contains('show');
  d.classList.toggle('show', show);
  if (show) document.getElementById('smAiIn').focus();
}
function aiMsg(role, text, applyFn) {
  const log = document.getElementById('smAiLog');
  const m = el('div', 'sm-ai-m ' + (role === 'user' ? 'u' : 'a'));
  m.textContent = text;
  if (applyFn) { const b = el('button', 'sm-apply', 'Apply to workspace'); b.addEventListener('click', () => applyFn(text)); m.appendChild(b); }
  log.appendChild(m); log.scrollTop = log.scrollHeight;
  return m;
}
async function aiSend() {
  if (aiState.busy) return;
  const inp = document.getElementById('smAiIn');
  const q = inp.value.trim(); if (!q) return;
  inp.value = '';
  aiMsg('user', q);
  aiState.hist.push({ role: 'user', content: q });
  const wait = aiMsg('a', '…thinking');
  aiState.busy = true;
  try {
    let ctx = '';
    try { ctx = aiState.ctxFn ? String(aiState.ctxFn()).slice(0, 4000) : ''; } catch (e) { }
    const sys = 'You are the Stream AI producer inside Niyantran Terminal — a newsroom suite for Indian journalists. Be direct, production-ready and concise. When asked for scripts, write them ready to read aloud. Never invent facts; if you need facts, search. CURRENT WORKSPACE: ' + aiState.ctxLabel + '. ' + ctx;
    const msgs = [{ role: 'system', content: sys }].concat(aiState.hist.slice(-8));
    const out = await callAI(msgs, { maxTokens: 900 });
    wait.remove();
    const applyFn = Stream.cur && (Stream.mods.find(m => m.id === Stream.cur) || {}).aiApply;
    aiMsg('a', out, applyFn ? t => applyFn(t) : null);
    aiState.hist.push({ role: 'assistant', content: out });
  } catch (e) {
    wait.textContent = 'AI error: ' + (e.message || e);
  }
  aiState.busy = false;
}
Stream.ai = { toggle: aiToggle, setContext: aiSetContext, msg: aiMsg };

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown', e => {
  if (!Stream.open) return;
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape' && !typing) {
    const d = document.getElementById('smAiDrawer');
    if (d && d.classList.contains('show')) { aiToggle(false); return; }
    if (Stream.cur) { const m = Stream.mods.find(x => x.id === Stream.cur); if (m && m.onEsc && m.onEsc()) return; showHub(); }
    else closeStream();
    return;
  }
  if (Stream.cur) return; // module-level keys handled by modules
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); const s = document.getElementById('smSearch'); if (s) s.focus(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= Stream.mods.length) launchModule(Stream.mods[n - 1].id);
});

/* ---------------- Live TV — the existing module, moved in untouched ---------------- */
Stream.register({
  id: 'livetv', icon: '📡', title: 'Live TV', external: true, shortcut: '1',
  desc: 'Official news channels with the InTruth-style live fact-check panel — bilingual transcript, claim extraction, verdicts.',
  status: () => ({ cls: '', txt: 'Ready · InTruth fact-check' }),
  launch: () => { if (typeof window.openLiveTv === 'function') window.openLiveTv(); else smToast('Live TV module not loaded'); },
});

/* ---------------- STREAM button in the terminal header ---------------- */
(function hijack() {
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    const b = document.getElementById('niyLiveTvBtn');
    if (b && !b.dataset.streamized) {
      const clone = b.cloneNode(true);
      clone.dataset.streamized = '1';
      clone.innerHTML = '<span class="niy-livetv-dot"></span> LIVE TV';
      clone.title = 'Stream — AI newsroom suite: Live TV, teleprompter, broadcast studio, editor, captions & more';
      b.parentNode.replaceChild(clone, b);
      clone.addEventListener('click', openStream);
      clearInterval(t);
    }
    if (tries > 100) clearInterval(t);
  }, 250);
})();
try { window.NiyStream = { open: openStream, close: closeStream, launch: launchModule, hub: showHub, Stream: Stream }; } catch (e) { }


/* ================================================================
   TELEPROMPTER — newsroom script library + reading engine.
   ================================================================ */
(function () {
  const LS = 'niyPrompter';
  let db = SLS(LS, { folders: ['General', 'Bulletins', 'Interviews'], scripts: [] });
  const save = () => SSET(LS, db);
  let curId = null, ui = {}, wpm = SLS('niyPrompterWpm', 140);
  let filterFolder = '', filterTag = '', query = '';

  (function css() {
    if (document.getElementById('niy-prompter-css')) return;
    const s = document.createElement('style'); s.id = 'niy-prompter-css';
    s.textContent = [
      ".pt-wrap{flex:1;display:flex;min-height:0}",
      ".pt-lib{width:250px;flex:0 0 auto;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;background:#0c0f15}",
      ".pt-lib-top{padding:11px 12px 8px;display:flex;flex-direction:column;gap:8px}",
      ".pt-folders{display:flex;gap:5px;flex-wrap:wrap;padding:0 12px 8px}",
      ".pt-folder{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:999px;color:#8d97a3;font-size:9.5px;font-weight:650;padding:3px 10px;cursor:pointer}",
      ".pt-folder.active{background:rgba(127,176,255,.14);border-color:rgba(127,176,255,.35);color:#a9c8ff}",
      ".pt-list{flex:1;overflow-y:auto;padding:2px 8px 10px;scrollbar-width:thin}",
      ".pt-item{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:9px;padding:8px 10px;cursor:pointer}",
      ".pt-item:hover{background:rgba(255,255,255,.045)}",
      ".pt-item.active{background:rgba(127,176,255,.11)}",
      ".pt-item .t{font-size:11.5px;font-weight:650;color:#dbe2e9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".pt-item .m{font-size:9px;color:#5f6873;margin-top:2px;display:flex;gap:6px}",
      ".pt-item .tags{display:flex;gap:3px;margin-top:3px;flex-wrap:wrap}",
      ".pt-item .tag{font-size:8px;color:#8db8ff;border:1px solid rgba(127,176,255,.25);border-radius:999px;padding:0 6px}",
      ".pt-main{flex:1;min-width:0;display:flex;flex-direction:column}",
      ".pt-toolbar{display:flex;align-items:center;gap:7px;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.06);flex-wrap:wrap}",
      ".pt-title{background:transparent;border:1px solid transparent;border-radius:7px;color:#eef2f6;font-size:14px;font-weight:700;padding:4px 8px;width:290px}",
      ".pt-title:hover,.pt-title:focus{border-color:rgba(255,255,255,.12);outline:none}",
      ".pt-fmt{display:flex;gap:3px}",
      ".pt-fmt button{width:26px;height:26px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#aab4c0;font-size:11.5px;cursor:pointer}",
      ".pt-fmt button:hover{color:#fff;background:rgba(255,255,255,.09)}",
      ".pt-ed{flex:1;overflow-y:auto;padding:26px 60px 80px;outline:none;font-size:16px;line-height:1.85;color:#dbe2e9;scrollbar-width:thin;max-width:900px;width:100%;margin:0 auto}",
      ".pt-ed:empty::before{content:'Write or generate your script… (✦ AI Assistant can draft, rewrite, translate)';color:#4a525c}",
      ".pt-ed b,.pt-ed strong{color:#fff}",
      ".pt-stats{display:flex;align-items:center;gap:14px;padding:8px 16px;border-top:1px solid rgba(255,255,255,.06);font-size:10px;color:#68717b;flex-wrap:wrap}",
      ".pt-stats b{color:#aab4c0;font-weight:650}",
      /* play overlay */
      "#ptPlay{position:fixed;inset:0;z-index:9500;background:#000;display:none;flex-direction:column}",
      "#ptPlay.show{display:flex}",
      "#ptPlay.floating{inset:auto;right:26px;bottom:26px;width:430px;height:300px;border:1px solid rgba(255,255,255,.2);border-radius:14px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.6)}",
      ".pt-prog{height:3px;background:rgba(255,255,255,.1);flex:0 0 auto}",
      ".pt-prog i{display:block;height:100%;background:#2fd57b;width:0%}",
      ".pt-scroll{flex:1;overflow:hidden;position:relative}",
      ".pt-text{position:absolute;left:0;right:0;top:0;padding:40vh 0 60vh;text-align:center;font-weight:650;color:#fff;will-change:transform}",
      "#ptPlay.mirror .pt-text{transform-origin:center;}",
      ".pt-eyeline{position:absolute;left:0;right:0;top:38%;height:2px;background:rgba(255,77,77,.5);pointer-events:none}",
      ".pt-hud{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:10px;padding:10px 16px;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent);opacity:0;transition:opacity .25s;flex-wrap:wrap}",
      "#ptPlay:hover .pt-hud{opacity:1}",
      ".pt-hud .sm-lbl{color:#98a3af}",
      ".pt-hud input[type=range]{width:90px}",
      ".pt-hud .time{font-size:11px;color:#c3ccd6;font-weight:650;margin-left:auto}",
    ].join('');
    document.head.appendChild(s);
  })();

  const plain = html => { const d = el('div'); d.innerHTML = html || ''; return d.innerText || ''; };
  const words = html => (plain(html).trim().match(/\S+/g) || []).length;
  const dur = html => words(html) / Math.max(60, wpm) * 60;

  function cur() { return db.scripts.find(s => s.id === curId); }
  function newScript(title, content, folder) {
    const s = { id: 'p' + Date.now().toString(36), t: title || 'Untitled script', f: folder || filterFolder || 'General', tags: [], c: content || '', up: Date.now(), vers: [] };
    db.scripts.unshift(s); save(); return s;
  }
  function snapshotVersion(s) {
    if (!s.vers.length || Date.now() - s.vers[0].ts > 120e3) { s.vers.unshift({ ts: Date.now(), c: s.c }); s.vers = s.vers.slice(0, 12); }
  }

  function renderLib() {
    const folders = ['All'].concat(db.folders);
    ui.folders.innerHTML = folders.map(f => '<button class="pt-folder' + ((filterFolder || 'All') === f ? ' active' : '') + '" data-f="' + esc(f) + '" type="button">' + esc(f) + '</button>').join('')
      + '<button class="pt-folder" id="ptAddFolder" type="button" title="New folder">＋</button>';
    ui.folders.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filterFolder = b.dataset.f === 'All' ? '' : b.dataset.f; renderLib(); }));
    ui.folders.querySelector('#ptAddFolder').addEventListener('click', () => {
      const n = (window.prompt('Folder name') || '').trim();
      if (n && !db.folders.includes(n)) { db.folders.push(n); save(); renderLib(); }
    });
    const q = query.toLowerCase();
    const list = db.scripts.filter(s => (!filterFolder || s.f === filterFolder) && (!filterTag || s.tags.includes(filterTag)) && (!q || (s.t + ' ' + plain(s.c) + ' ' + s.tags.join(' ')).toLowerCase().includes(q)));
    ui.list.innerHTML = list.map(s => '<button class="pt-item' + (s.id === curId ? ' active' : '') + '" data-id="' + s.id + '" type="button">'
      + '<div class="t">' + esc(s.t) + '</div>'
      + '<div class="m"><span>' + esc(s.f) + '</span><span>' + words(s.c) + ' words</span><span>' + fmtAgo(s.up) + '</span></div>'
      + (s.tags.length ? '<div class="tags">' + s.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>' : '')
      + '</button>').join('') || '<div class="sm-note" style="padding:12px">No scripts yet — create one or ask the AI to draft it.</div>';
    ui.list.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => openScript(b.dataset.id)));
  }

  function openScript(id) {
    const s = db.scripts.find(x => x.id === id); if (!s) return;
    curId = id;
    ui.title.value = s.t;
    ui.ed.innerHTML = s.c;
    renderLib(); renderStats();
  }
  function renderStats() {
    const s = cur(); if (!s) { ui.stats.innerHTML = ''; return; }
    ui.stats.innerHTML = '<span><b>' + words(s.c) + '</b> words</span><span>~<b>' + fmtT(dur(s.c)) + '</b> at <b>' + wpm + '</b> wpm</span>'
      + '<span>Folder <b>' + esc(s.f) + '</b></span><span>Saved <b>' + fmtAgo(s.up) + '</b></span>'
      + '<span style="margin-left:auto">Tags: ' + (s.tags.length ? s.tags.map(t => '<b>' + esc(t) + '</b>').join(', ') : '—') + '</span>';
  }
  let saveTimer;
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const s = cur(); if (!s) return;
      snapshotVersion(s);
      s.c = ui.ed.innerHTML; s.t = ui.title.value.trim() || 'Untitled script'; s.up = Date.now();
      save(); renderLib(); renderStats();
    }, 800);
  }

  /* ---------- import / export ---------- */
  async function importFile() {
    const f = await pickFile('.txt,.md,.pdf,.docx'); if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '');
    if (/\.(txt|md)$/i.test(f.name)) {
      const text = await f.text();
      const s = newScript(name, esc(text).replace(/\n/g, '<br>')); openScript(s.id); smToast('Imported ' + f.name);
    } else if (/\.pdf$/i.test(f.name)) {
      if (!window.pdfjsLib) { smToast('PDF support needs the online build (pdf.js)'); return; }
      try {
        const buf = await f.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        let text = '';
        for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) {
          const pg = await pdf.getPage(p); const tc = await pg.getTextContent();
          text += tc.items.map(i => i.str).join(' ') + '\n\n';
        }
        const s = newScript(name, esc(text).replace(/\n/g, '<br>')); openScript(s.id); smToast('Imported ' + pdf.numPages + ' pages');
      } catch (e) { smToast('Could not read PDF: ' + e.message); }
    } else {
      smToast('DOCX parsing is not available offline — save as TXT/PDF, or paste the text directly.');
    }
  }
  function exportScript() {
    const s = cur(); if (!s) return;
    dl(s.t.replace(/[^\w\- ]+/g, '') + '.txt', new Blob([plain(s.c)], { type: 'text/plain' }));
  }
  function showVersions() {
    const s = cur(); if (!s || !s.vers.length) { smToast('No earlier versions yet'); return; }
    const pick = window.prompt('Restore version — enter a number:\n' + s.vers.map((v, i) => (i + 1) + ') ' + new Date(v.ts).toLocaleString() + ' · ' + words(v.c) + ' words').join('\n'));
    const n = parseInt(pick, 10);
    if (n >= 1 && n <= s.vers.length) { snapshotVersion(s); s.c = s.vers[n - 1].c; s.up = Date.now(); save(); openScript(s.id); smToast('Version restored'); }
  }

  /* ---------- AI operations ---------- */
  const AI_OPS = [
    ['Generate script', 'Write a broadcast-ready teleprompter script on the topic the user gives (ask if none). Short sentences. Natural spoken rhythm.'],
    ['Rewrite', 'Rewrite this script to be tighter and more broadcast-natural, keeping every fact intact.'],
    ['Shorten', 'Shorten this script by roughly 40% keeping all key facts.'],
    ['Expand', 'Expand this script with smooth transitions and context, without inventing any facts.'],
    ['Change tone', 'Rewrite this script in the tone the user names (ask which: authoritative / conversational / urgent / neutral).'],
    ['Translate → Hindi', 'Translate this script into natural spoken Hindi (Devanagari), broadcast register.'],
    ['Summarize', 'Summarize this script into a 30-second version.'],
    ['Article → prompter', 'Convert the pasted article into a teleprompter script: spoken register, short lines, no bylines/datelines.'],
    ['Interview questions', 'Generate 8 sharp interview questions based on this script/topic, ordered easy → hard.'],
    ['Debate points', 'Generate a balanced debate brief from this script: 4 points for, 4 against, 2 traps to avoid.'],
  ];

  Stream.register({
    id: 'prompter', icon: '📜', title: 'Teleprompter', shortcut: '2',
    desc: 'Script library with folders, tags and versions; AI writing room; mirror-ready reading mode with speed, margins and timers.',
    status: () => ({ cls: db.scripts.length ? '' : 'idle', txt: db.scripts.length + ' saved script' + (db.scripts.length === 1 ? '' : 's') }),
    aiChips: AI_OPS.slice(0, 6).map(o => o[0]),
    aiCtx: () => {
      const s = cur();
      return 'Teleprompter workspace. ' + (s ? 'Current script "' + s.t + '" (' + words(s.c) + ' words):\n' + plain(s.c).slice(0, 2600) : 'No script open yet.')
        + '\nWhen the user picks an operation (' + AI_OPS.map(o => o[0]).join(', ') + '), apply it to the current script.';
    },
    aiApply: text => {
      let s = cur();
      if (!s) s = newScript('AI draft');
      snapshotVersion(s);
      s.c = esc(text).replace(/\n/g, '<br>'); s.up = Date.now(); save();
      openScript(s.id); smToast('Applied to "' + s.t + '"');
    },
    init(body, tools) {
      body.innerHTML = '<div class="pt-wrap">'
        + '<div class="pt-lib"><div class="pt-lib-top">'
        + '<input class="sm-in" id="ptSearch" placeholder="Search scripts, tags…"/>'
        + '<button class="sm-hbtn" id="ptNew" type="button" style="justify-content:center">＋ New script</button>'
        + '</div><div class="pt-folders" id="ptFolders"></div><div class="pt-list" id="ptList"></div></div>'
        + '<div class="pt-main">'
        + '<div class="pt-toolbar">'
        + '<input class="pt-title" id="ptTitle" placeholder="Script title" spellcheck="false"/>'
        + '<div class="pt-fmt"><button data-c="bold" title="Bold" type="button"><b>B</b></button><button data-c="italic" title="Italic" type="button"><i>I</i></button><button data-c="underline" title="Underline" type="button"><u>U</u></button></div>'
        + '<button class="sm-hbtn" id="ptTag" type="button" title="Edit tags">⌗ Tags</button>'
        + '<button class="sm-hbtn" id="ptVer" type="button" title="Version history">⟲ Versions</button>'
        + '<span class="sm-hspace"></span>'
        + '<button class="sm-hbtn" id="ptImport" type="button">⤒ Import</button>'
        + '<button class="sm-hbtn" id="ptExport" type="button">⤓ Export</button>'
        + '<button class="sm-hbtn on" id="ptPlayBtn" type="button" title="Read on prompter (P)">▶ Read</button>'
        + '</div>'
        + '<div class="pt-ed" id="ptEd" contenteditable="true" spellcheck="true"></div>'
        + '<div class="pt-stats" id="ptStats"></div>'
        + '</div></div>';
      ui = { folders: body.querySelector('#ptFolders'), list: body.querySelector('#ptList'), ed: body.querySelector('#ptEd'), title: body.querySelector('#ptTitle'), stats: body.querySelector('#ptStats') };
      body.querySelector('#ptNew').addEventListener('click', () => { const s = newScript(); openScript(s.id); ui.title.focus(); });
      body.querySelector('#ptSearch').addEventListener('input', e => { query = e.target.value; renderLib(); });
      body.querySelectorAll('.pt-fmt [data-c]').forEach(b => b.addEventListener('click', () => { document.execCommand(b.dataset.c); ui.ed.focus(); scheduleAutosave(); }));
      ui.ed.addEventListener('input', scheduleAutosave);
      ui.title.addEventListener('input', scheduleAutosave);
      body.querySelector('#ptTag').addEventListener('click', () => {
        const s = cur(); if (!s) return;
        const t = window.prompt('Tags (comma-separated)', s.tags.join(', '));
        if (t != null) { s.tags = t.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6); save(); renderLib(); renderStats(); }
      });
      body.querySelector('#ptVer').addEventListener('click', showVersions);
      body.querySelector('#ptImport').addEventListener('click', importFile);
      body.querySelector('#ptExport').addEventListener('click', exportScript);
      body.querySelector('#ptPlayBtn').addEventListener('click', startPlay);
      tools.innerHTML = '<span class="sm-lbl">PACE</span><input type="range" class="sm-range" id="ptWpm" min="90" max="220" value="' + wpm + '" title="Words per minute"/><span class="sm-note" id="ptWpmV">' + wpm + ' wpm</span>';
      tools.querySelector('#ptWpm').addEventListener('input', e => { wpm = +e.target.value; SSET('niyPrompterWpm', wpm); tools.querySelector('#ptWpmV').textContent = wpm + ' wpm'; renderStats(); });
      if (!db.scripts.length) newScript('Welcome to the prompter', 'Write your bulletin here.<br><br>Press <b>▶ Read</b> to start the prompter — Space pauses, arrows change speed, M mirrors for beam-splitter glass.');
      openScript(db.scripts[0].id);
    },
  });

  /* ---------- reading engine ---------- */
  const P = { on: false, y: 0, speed: SLS('niyPrompterSpeed', 60), font: SLS('niyPrompterFont', 44), margin: SLS('niyPrompterMargin', 14), paused: false, raf: 0, mirror: false, t0: 0, elapsed: 0 };
  function buildPlay() {
    if (document.getElementById('ptPlay')) return;
    const p = el('div'); p.id = 'ptPlay';
    p.innerHTML = '<div class="pt-prog"><i id="ptProgI"></i></div>'
      + '<div class="pt-scroll" id="ptScroll"><div class="pt-eyeline"></div><div class="pt-text" id="ptText"></div></div>'
      + '<div class="pt-hud">'
      + '<span class="sm-lbl">SPEED</span><input type="range" min="10" max="220" id="ptSpd"/>'
      + '<span class="sm-lbl">FONT</span><input type="range" min="22" max="90" id="ptFont"/>'
      + '<span class="sm-lbl">MARGIN</span><input type="range" min="0" max="30" id="ptMar"/>'
      + '<button class="sm-hbtn" id="ptPause" type="button">⏸ Pause</button>'
      + '<button class="sm-hbtn" id="ptMirror" type="button" title="Mirror for beam-splitter (M)">⇋ Mirror</button>'
      + '<button class="sm-hbtn" id="ptFloat" type="button" title="Floating mini-prompter">⧉ Float</button>'
      + '<button class="sm-hbtn" id="ptFull" type="button" title="Fullscreen (F)">⛶</button>'
      + '<button class="sm-hbtn" id="ptExit" type="button">✕ Exit</button>'
      + '<span class="time" id="ptTime"></span>'
      + '</div>';
    document.body.appendChild(p);
    const q = id => p.querySelector('#' + id);
    q('ptSpd').addEventListener('input', e => { P.speed = +e.target.value; SSET('niyPrompterSpeed', P.speed); });
    q('ptFont').addEventListener('input', e => { P.font = +e.target.value; SSET('niyPrompterFont', P.font); applyPlayStyle(); });
    q('ptMar').addEventListener('input', e => { P.margin = +e.target.value; SSET('niyPrompterMargin', P.margin); applyPlayStyle(); });
    q('ptPause').addEventListener('click', togglePause);
    q('ptMirror').addEventListener('click', toggleMirror);
    q('ptFloat').addEventListener('click', () => p.classList.toggle('floating'));
    q('ptFull').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else p.requestFullscreen && p.requestFullscreen(); });
    q('ptExit').addEventListener('click', stopPlay);
    document.addEventListener('keydown', e => {
      if (!P.on) return;
      if (e.key === ' ') { togglePause(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { P.speed = Math.min(220, P.speed + 5); q('ptSpd').value = P.speed; e.preventDefault(); }
      if (e.key === 'ArrowDown') { P.speed = Math.max(10, P.speed - 5); q('ptSpd').value = P.speed; e.preventDefault(); }
      if (e.key === 'ArrowLeft') { P.y = Math.max(0, P.y - 220); e.preventDefault(); }
      if (e.key === 'ArrowRight') { P.y += 220; e.preventDefault(); }
      if (e.key.toLowerCase() === 'm') toggleMirror();
      if (e.key.toLowerCase() === 'f') q('ptFull').click();
      if (e.key === 'Escape') stopPlay();
    });
  }
  function applyPlayStyle() {
    const t = document.getElementById('ptText');
    t.style.fontSize = P.font + 'px';
    t.style.padding = '40vh ' + P.margin + '% 60vh';
    t.style.lineHeight = 1.6;
    t.style.transform = 'translateY(' + (-P.y) + 'px)' + (P.mirror ? ' scaleX(-1)' : '');
  }
  function toggleMirror() { P.mirror = !P.mirror; applyPlayStyle(); }
  function togglePause() {
    P.paused = !P.paused;
    document.getElementById('ptPause').innerHTML = P.paused ? '▶ Resume' : '⏸ Pause';
  }
  function startPlay() {
    const s = cur(); if (!s) return;
    buildPlay();
    const p = document.getElementById('ptPlay');
    document.getElementById('ptText').innerHTML = s.c || '<i>(empty script)</i>';
    document.getElementById('ptSpd').value = P.speed;
    document.getElementById('ptFont').value = P.font;
    document.getElementById('ptMar').value = P.margin;
    P.on = true; P.y = 0; P.paused = false; P.elapsed = 0; P.t0 = performance.now();
    p.classList.add('show'); p.classList.remove('floating');
    applyPlayStyle();
    let last = performance.now();
    const total = () => Math.max(1, document.getElementById('ptText').scrollHeight - innerHeight * 0.5);
    const loop = now => {
      if (!P.on) return;
      const dt = (now - last) / 1000; last = now;
      if (!P.paused) { P.y += P.speed * dt; P.elapsed += dt; }
      const tt = total();
      if (P.y > tt) P.y = tt;
      applyPlayStyle();
      document.getElementById('ptProgI').style.width = Math.min(100, P.y / tt * 100) + '%';
      const remain = P.speed > 0 ? (tt - P.y) / P.speed : 0;
      document.getElementById('ptTime').textContent = fmtT(P.elapsed) + ' · −' + fmtT(remain);
      P.raf = smRaf(loop);
    };
    P.raf = smRaf(loop);
  }
  function stopPlay() {
    P.on = false; smCancelRaf(P.raf);
    const p = document.getElementById('ptPlay'); if (p) p.classList.remove('show');
    if (document.fullscreenElement) try { document.exitFullscreen(); } catch (e) { }
  }
})();


/* ================================================================
   BROADCAST STUDIO — lightweight cloud OBS: scenes, sources,
   1280×720 canvas compositor, branding overlays, virtual studio
   (chroma/blur/procedural backdrops), 5 transitions, WebAudio
   mixer, local recording, stream-key management (RTMP push is a
   server capability — keys are prepared for OBS/relay use).
   ================================================================ */
(function () {
  const W = 1280, H = 720;
  const B = {
    scenes: [], active: 0, raf: 0, running: false, cv: null, ctx: null,
    media: {},            // srcId -> {video|img element, stream}
    brand: SLS('niyBrand', { logo: '', logoPos: 'tr', lt: { on: false, title: 'NIYANTRAN', sub: 'Breaking analysis', accent: '#7fb0ff' }, breaking: { on: false, text: 'BREAKING' }, ticker: { on: false, text: 'Niyantran Terminal — governance intelligence · ', speed: 90 }, live: true, clock: true, wm: 'NIYANTRAN' }),
    keys: SLS('niyStreamKeys', { youtube: { url: 'rtmp://a.rtmp.youtube.com/live2', key: '' }, facebook: { url: 'rtmps://live-api-s.facebook.com:443/rtmp/', key: '' }, x: { url: '', key: '' }, linkedin: { url: '', key: '' } }),
    trans: 'fade', transT: 0, prevFrame: null,
    rec: null, recChunks: [], recT0: 0,
    audio: null, mixer: {}, tickX: 0,
  };
  const saveBrand = () => SSET('niyBrand', B.brand);
  const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const scene = () => B.scenes[B.active];

  (function css() {
    if (document.getElementById('niy-bcast-css')) return;
    const s = document.createElement('style'); s.id = 'niy-bcast-css';
    s.textContent = [
      ".bc-wrap{flex:1;display:flex;min-height:0}",
      ".bc-left{width:230px;flex:0 0 auto;border-right:1px solid rgba(255,255,255,.06);overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;background:#0c0f15}",
      ".bc-right{width:270px;flex:0 0 auto;border-left:1px solid rgba(255,255,255,.06);overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;background:#0c0f15}",
      ".bc-center{flex:1;min-width:0;display:flex;flex-direction:column;padding:14px;gap:10px}",
      ".bc-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#05070a;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}",
      ".bc-stage canvas{max-width:100%;max-height:100%;aspect-ratio:16/9;background:#000;border-radius:6px}",
      ".bc-quick{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
      ".bc-sec{font-size:9px;font-weight:700;letter-spacing:.13em;color:#68717b;margin-bottom:7px;display:flex;align-items:center}",
      ".bc-sec .add{margin-left:auto;background:transparent;border:0;color:#8db8ff;cursor:pointer;font-size:13px}",
      ".bc-box{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:9px}",
      ".bc-item{display:flex;align-items:center;gap:7px;width:100%;text-align:left;background:transparent;border:0;border-radius:7px;color:#aab4c0;font-size:11px;font-weight:600;padding:6px 8px;cursor:pointer}",
      ".bc-item:hover{background:rgba(255,255,255,.05)}",
      ".bc-item.active{background:rgba(127,176,255,.13);color:#cfe1ff}",
      ".bc-item .x{margin-left:auto;color:#5b636e;font-size:12px}",
      ".bc-item .x:hover{color:#ff8585}",
      ".bc-srcbtns{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}",
      ".bc-srcbtns .sm-hbtn{justify-content:center;font-size:10px;padding:5px 6px}",
      ".bc-row{display:flex;align-items:center;gap:7px;margin-top:7px;flex-wrap:wrap}",
      ".bc-row .sm-lbl{min-width:52px}",
      ".bc-row input[type=text]{flex:1}",
      ".bc-mix{display:flex;flex-direction:column;gap:8px}",
      ".bc-fader{display:flex;align-items:center;gap:8px}",
      ".bc-fader .nm{width:64px;font-size:10px;color:#98a3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".bc-fader input{flex:1}",
      ".bc-meter{width:38px;height:6px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}",
      ".bc-meter i{display:block;height:100%;background:linear-gradient(90deg,#2fd57b,#d9a13c,#ff5d5d);width:0%}",
      ".bc-trans{display:flex;gap:4px;flex-wrap:wrap}",
      ".bc-trans .sm-hbtn{padding:4px 9px;font-size:10px}",
      ".bc-bg{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px}",
      ".bc-bg button{aspect-ratio:16/9;border-radius:7px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:8px;font-weight:700;letter-spacing:.05em;color:rgba(255,255,255,.85);display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}",
      ".bc-bg button.on{border-color:#7fb0ff;box-shadow:0 0 0 1px #7fb0ff}",
      ".bc-timeline{display:flex;align-items:center;gap:9px;font-size:10.5px;color:#8d97a3;padding:8px 12px;background:#0c0f15;border:1px solid rgba(255,255,255,.06);border-radius:10px}",
      ".bc-rectime{color:#ff8585;font-weight:750;font-variant-numeric:tabular-nums}",
    ].join('');
    document.head.appendChild(s);
  })();

  /* ---------- procedural virtual backdrops (drawn, not stock photos) ---------- */
  const BGS = {
    none: { label: 'None', draw: null, css: 'background:#111' },
    blur: { label: 'BLUR', draw: null, css: 'background:linear-gradient(160deg,#2a2f38,#14171d)' },
    newsroom: {
      label: 'NEWSROOM', css: 'background:linear-gradient(160deg,#0d1522,#1a2c47)',
      draw(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d1522'); g.addColorStop(1, '#1a2c47');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(127,176,255,.14)';
        for (let i = 0; i < 9; i++) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(140 * i - (t / 90 % 140), 0); ctx.lineTo(140 * i + 260 - (t / 90 % 140), H); ctx.stroke(); }
        ctx.fillStyle = 'rgba(127,176,255,.1)'; ctx.font = '800 130px sans-serif'; ctx.fillText('NEWSROOM', 60, H - 80);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, H - 200, W, 3);
      },
    },
    parliament: {
      label: 'PARLIAMENT', css: 'background:linear-gradient(160deg,#1b1508,#3a2c12)',
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#241c0b'); g.addColorStop(1, '#120e06');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(240,180,41,.14)';
        for (let i = 0; i < 12; i++) { ctx.fillRect(70 + i * 100, 130, 34, H - 260); ctx.beginPath(); ctx.arc(87 + i * 100, 130, 26, Math.PI, 0); ctx.fill(); }
        ctx.fillStyle = 'rgba(240,180,41,.25)'; ctx.fillRect(0, H - 130, W, 2);
        ctx.fillStyle = 'rgba(240,180,41,.1)'; ctx.font = '800 96px sans-serif'; ctx.fillText('SANSAD', 70, 110);
      },
    },
    finance: {
      label: 'FINANCE', css: 'background:linear-gradient(160deg,#07130d,#0e2418)',
      draw(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#07130d'); g.addColorStop(1, '#0e2418');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(47,213,123,.1)'; ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(47,213,123,.4)'; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = 0; x <= W; x += 20) { const y = H * .62 - Math.sin((x + t / 26) / 110) * 60 - x * .09; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(47,213,123,.1)'; ctx.font = '800 110px sans-serif'; ctx.fillText('MARKETS', 60, H - 70);
      },
    },
    worldmap: {
      label: 'WORLD DESK', css: 'background:linear-gradient(160deg,#0a1020,#141c33)',
      draw(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a1020'); g.addColorStop(1, '#141c33');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(127,176,255,.16)';
        for (let x = 0; x < W; x += 26) for (let y = 60; y < H - 60; y += 26) {
          const v = Math.sin(x / 97) * Math.cos(y / 71) + Math.sin((x + y) / 143);
          if (v > .55) { ctx.beginPath(); ctx.arc(x, y, 2.1, 0, 7); ctx.fill(); }
        }
        ctx.strokeStyle = 'rgba(127,176,255,.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(W * .72, H * .38, 90 + (t / 40 % 40), 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(127,176,255,.1)'; ctx.font = '800 100px sans-serif'; ctx.fillText('WORLD DESK', 60, H - 70);
      },
    },
    election: {
      label: 'ELECTION', css: 'background:linear-gradient(160deg,#160b14,#2c1226)',
      draw(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#160b14'); g.addColorStop(1, '#2c1226');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const cols = ['rgba(255,107,107,.3)', 'rgba(127,176,255,.3)', 'rgba(240,180,41,.3)', 'rgba(47,213,123,.3)'];
        for (let i = 0; i < 12; i++) {
          const h = 70 + ((i * 97 + Math.floor(t / 900) * 31) % 240);
          ctx.fillStyle = cols[i % 4]; ctx.fillRect(60 + i * 100, H - 140 - h, 56, h);
        }
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, H - 140, W, 2);
        ctx.fillStyle = 'rgba(249,127,181,.12)'; ctx.font = '800 96px sans-serif'; ctx.fillText('ELECTION DESK', 60, 120);
      },
    },
    custom: { label: 'CUSTOM', css: 'background:#333', draw: null },
  };
  let customBg = null;

  /* ---------- sources ---------- */
  async function addSource(type) {
    const sc = scene(); if (!sc) return;
    const id = uid();
    let src = { id, type, x: 0, y: 0, w: W, h: H, opacity: 1, name: type };
    try {
      if (type === 'cam') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
        const v = document.createElement('video'); v.srcObject = stream; v.muted = true; v.playsInline = true; await v.play();
        B.media[id] = { video: v, stream };
        src.name = 'Webcam'; src.bg = 'none'; src.chroma = { on: false, color: '#00b140', tol: 96 }; src.blur = false;
        addAudioTrack(id, 'Mic', stream);
      } else if (type === 'screen') {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const v = document.createElement('video'); v.srcObject = stream; v.muted = true; v.playsInline = true; await v.play();
        B.media[id] = { video: v, stream };
        src.name = 'Screen / Window';
        if (stream.getAudioTracks().length) addAudioTrack(id, 'System audio', stream);
        stream.getVideoTracks()[0].addEventListener('ended', () => removeSource(id));
      } else if (type === 'img' || type === 'pdfimg') {
        const f = await pickFile(type === 'img' ? 'image/*' : 'image/*,.pdf'); if (!f) return;
        if (/\.pdf$/i.test(f.name) && window.pdfjsLib) {
          const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
          const pg = await pdf.getPage(1); const vp = pg.getViewport({ scale: 1.6 });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          B.media[id] = { img: c }; src.name = f.name;
        } else {
          const url = URL.createObjectURL(f); const im = new Image();
          await new Promise(r => { im.onload = r; im.src = url; });
          B.media[id] = { img: im }; src.name = f.name;
        }
        const im = B.media[id].img, sc2 = Math.min(W / im.width, H / im.height);
        src.w = im.width * sc2; src.h = im.height * sc2; src.x = (W - src.w) / 2; src.y = (H - src.h) / 2;
      } else if (type === 'vid') {
        const f = await pickFile('video/*'); if (!f) return;
        const v = document.createElement('video'); v.src = URL.createObjectURL(f); v.loop = true; v.playsInline = true; await v.play();
        B.media[id] = { video: v };
        src.name = f.name;
        try { addAudioTrack(id, f.name.slice(0, 12), null, v); } catch (e) { }
      } else if (type === 'text') {
        const t = window.prompt('Text to show on screen', 'LIVE from the Niyantran newsroom'); if (!t) return;
        src = Object.assign(src, { text: t, size: 44, color: '#ffffff', name: 'Text: ' + t.slice(0, 14), x: 80, y: 90, w: W - 160, h: 90 });
      } else if (type === 'browser') {
        smToast('Browser sources need a rendering server — add the page as a screen/window capture instead.');
        return;
      }
    } catch (e) { smToast(type + ' source failed: ' + (e.message || e.name)); return; }
    sc.sources.push(src);
    renderLeft(); selectSource(id);
  }
  function removeSource(id) {
    B.scenes.forEach(sc => sc.sources = sc.sources.filter(s => s.id !== id));
    const m = B.media[id];
    if (m) { try { if (m.stream) m.stream.getTracks().forEach(t => t.stop()); } catch (e) { } delete B.media[id]; }
    if (B.mixer[id]) { try { B.mixer[id].gain.disconnect(); } catch (e) { } delete B.mixer[id]; renderMixer(); }
    if (selId === id) selId = null;
    renderLeft(); renderInspector();
  }
  let selId = null;
  function selectSource(id) { selId = id; renderLeft(); renderInspector(); }

  /* ---------- audio mixer ---------- */
  function audioCtx() {
    if (!B.audio) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      B.audio = { ac, dest: ac.createMediaStreamDestination(), master: ac.createGain() };
      B.audio.master.connect(B.audio.dest);
    }
    return B.audio;
  }
  function addAudioTrack(id, name, stream, mediaEl) {
    const A = audioCtx();
    let src = null;
    try {
      if (stream && stream.getAudioTracks().length) src = A.ac.createMediaStreamSource(stream);
      else if (mediaEl) src = A.ac.createMediaElementSource(mediaEl);
      else return;
    } catch (e) { return; }
    const gain = A.ac.createGain(); gain.gain.value = 1;
    const an = A.ac.createAnalyser(); an.fftSize = 256;
    src.connect(gain); gain.connect(an);          // analyser taps the fader
    gain.connect(A.master);                       // into the recording mix
    if (mediaEl) gain.connect(A.ac.destination);  // monitor file/video sources locally (never the mic — feedback)
    B.mixer[id] = { name, gain, an, buf: new Uint8Array(an.frequencyBinCount) };
    renderMixer();
  }
  function renderMixer() {
    const box = document.getElementById('bcMixer'); if (!box) return;
    const ids = Object.keys(B.mixer);
    box.innerHTML = ids.length ? ids.map(id => '<div class="bc-fader" data-id="' + id + '"><span class="nm">' + esc(B.mixer[id].name) + '</span><input type="range" class="sm-range" min="0" max="140" value="' + Math.round(B.mixer[id].gain.gain.value * 100) + '"/><span class="bc-meter"><i></i></span></div>').join('')
      : '<div class="sm-note">Add a webcam / video / screen-with-audio source to get audio channels.</div>';
    box.querySelectorAll('.bc-fader input').forEach(inp => inp.addEventListener('input', () => {
      const id = inp.closest('.bc-fader').dataset.id;
      if (B.mixer[id]) B.mixer[id].gain.gain.value = inp.value / 100;
    }));
  }
  function tickMeters() {
    Object.keys(B.mixer).forEach(id => {
      const m = B.mixer[id];
      m.an.getByteTimeDomainData(m.buf);
      let peak = 0; for (let i = 0; i < m.buf.length; i += 4) peak = Math.max(peak, Math.abs(m.buf[i] - 128));
      const bar = document.querySelector('.bc-fader[data-id="' + id + '"] .bc-meter i');
      if (bar) bar.style.width = Math.min(100, peak / 128 * 160) + '%';
    });
  }

  /* ---------- compositor ---------- */
  const off = document.createElement('canvas'); off.width = 480; off.height = 270;
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function drawSource(ctx, s, t) {
    const m = B.media[s.id];
    ctx.save();
    ctx.globalAlpha = s.opacity != null ? s.opacity : 1;
    if (s.type === 'text') {
      ctx.font = '800 ' + (s.size || 44) + 'px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      const tw = ctx.measureText(s.text).width;
      ctx.fillRect(s.x - 18, s.y - (s.size || 44) - 10, tw + 36, (s.size || 44) + 26);
      ctx.fillStyle = s.color || '#fff';
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore(); return;
    }
    const srcEl = m && (m.video || m.img); if (!srcEl) { ctx.restore(); return; }
    // virtual studio backdrop behind the keyed/blurred camera
    if (s.type === 'cam' && s.bg && s.bg !== 'none') {
      const bg = BGS[s.bg];
      if (s.bg === 'blur') { ctx.save(); ctx.filter = 'blur(20px)'; ctx.drawImage(srcEl, -40, -40, W + 80, H + 80); ctx.restore(); }
      else if (s.bg === 'custom' && customBg) ctx.drawImage(customBg, 0, 0, W, H);
      else if (bg && bg.draw) bg.draw(ctx, t);
    }
    const useChroma = s.chroma && s.chroma.on;
    if (useChroma) {
      offCtx.drawImage(srcEl, 0, 0, off.width, off.height);
      try {
        const d = offCtx.getImageData(0, 0, off.width, off.height);
        const [kr, kg, kb] = hex2rgb(s.chroma.color || '#00b140'), tol = s.chroma.tol || 96, px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const dr = px[i] - kr, dg = px[i + 1] - kg, db = px[i + 2] - kb;
          if (dr * dr + dg * dg + db * db < tol * tol * 3) px[i + 3] = 0;
        }
        offCtx.putImageData(d, 0, 0);
        ctx.drawImage(off, s.x, s.y, s.w, s.h);
      } catch (e) { ctx.drawImage(srcEl, s.x, s.y, s.w, s.h); }
    } else {
      ctx.drawImage(srcEl, s.x, s.y, s.w, s.h);
    }
    ctx.restore();
  }
  function drawBrand(ctx, t) {
    const b = B.brand;
    if (b.breaking && b.breaking.on) {
      ctx.fillStyle = '#c1121f'; ctx.fillRect(0, 0, W, 52);
      ctx.fillStyle = '#fff'; ctx.font = '800 26px sans-serif';
      ctx.fillText('◉ ' + (b.breaking.text || 'BREAKING'), 24, 36);
    }
    if (b.lt && b.lt.on) {
      const y = H - 148;
      ctx.fillStyle = 'rgba(8,10,14,.88)'; ctx.fillRect(64, y, 640, 76);
      ctx.fillStyle = b.lt.accent || '#7fb0ff'; ctx.fillRect(64, y, 6, 76);
      ctx.fillStyle = '#fff'; ctx.font = '800 27px sans-serif'; ctx.fillText((b.lt.title || '').slice(0, 40), 88, y + 33);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '500 17px sans-serif'; ctx.fillText((b.lt.sub || '').slice(0, 60), 88, y + 60);
    }
    if (b.ticker && b.ticker.on) {
      ctx.fillStyle = 'rgba(8,10,14,.92)'; ctx.fillRect(0, H - 46, W, 46);
      ctx.fillStyle = '#e8edf2'; ctx.font = '650 20px sans-serif';
      const txt = (b.ticker.text || '') + '   ···   ';
      const tw = Math.max(1, ctx.measureText(txt).width);
      B.tickX = (B.tickX + (b.ticker.speed || 90) / 60) % tw;
      for (let x = -B.tickX; x < W; x += tw) ctx.fillText(txt, x, H - 15);
      ctx.fillStyle = '#c1121f'; ctx.fillRect(0, H - 46, 118, 46);
      ctx.fillStyle = '#fff'; ctx.font = '800 17px sans-serif'; ctx.fillText('LATEST', 18, H - 16);
    }
    if (b.live) {
      ctx.fillStyle = 'rgba(8,10,14,.8)'; ctx.fillRect(W - 128, 18, 104, 36);
      ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(W - 108, 36, 7 + Math.sin(t / 300) * 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 18px sans-serif'; ctx.fillText('LIVE', W - 92, 43);
    }
    if (b.clock) {
      const now = new Date();
      ctx.fillStyle = 'rgba(8,10,14,.8)'; ctx.fillRect(W - 128, b.live ? 62 : 18, 104, 30);
      ctx.fillStyle = '#e8edf2'; ctx.font = '700 16px sans-serif';
      ctx.fillText(now.toTimeString().slice(0, 8), W - 116, (b.live ? 62 : 18) + 21);
    }
    if (b.logo && B._logoImg) ctx.drawImage(B._logoImg, b.logoPos === 'tl' ? 20 : W - 130, 16, 110, 44);
    if (b.wm) { ctx.globalAlpha = .22; ctx.fillStyle = '#fff'; ctx.font = '700 15px sans-serif'; ctx.fillText(b.wm, 20, H - (b.ticker && b.ticker.on ? 58 : 18)); ctx.globalAlpha = 1; }
  }
  function compose(t) {
    const ctx = B.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const sc = scene();
    if (sc) sc.sources.forEach(s => drawSource(ctx, s, t));
    // transition overlay from previous scene
    if (B.transT > 0 && B.prevFrame) {
      const k = B.transT;
      ctx.save();
      if (B.trans === 'fade' || B.trans === 'dissolve') { ctx.globalAlpha = k; ctx.drawImage(B.prevFrame, 0, 0); }
      else if (B.trans === 'slide') { ctx.drawImage(B.prevFrame, -W * (1 - k), 0); }
      else if (B.trans === 'zoom') { ctx.globalAlpha = k; const z = 1 + (1 - k) * .18; ctx.drawImage(B.prevFrame, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); }
      ctx.restore();
      B.transT -= B.trans === 'cut' ? 1 : 0.055;
    }
    drawBrand(ctx, t);
  }
  function loop(t) {
    if (!B.running) return;
    compose(t || performance.now());
    tickMeters();
    if (B.rec) {
      const s = (performance.now() - B.recT0) / 1000;
      const te = document.getElementById('bcRecTime'); if (te) te.textContent = '● REC ' + fmtT(s);
    }
    B.raf = smRaf(loop);
  }
  function switchScene(i) {
    if (i === B.active || !B.scenes[i]) return;
    try {
      if (!B.prevFrame) { B.prevFrame = document.createElement('canvas'); B.prevFrame.width = W; B.prevFrame.height = H; }
      B.prevFrame.getContext('2d').drawImage(B.cv, 0, 0);
      B.transT = B.trans === 'cut' ? 0 : 1;
    } catch (e) { }
    B.active = i; selId = null;
    renderLeft(); renderInspector();
  }

  /* ---------- recording ---------- */
  function startRec(qual) {
    if (B.rec) { stopRec(); return; }
    const fps = 30;
    const stream = B.cv.captureStream(fps);
    try { const A = audioCtx(); A.dest.stream.getAudioTracks().forEach(t2 => stream.addTrack(t2)); } catch (e) { }
    const bps = qual === 'high' ? 8e6 : qual === 'std' ? 4.5e6 : 2.5e6;
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: bps }); }
    catch (e) { rec = new MediaRecorder(stream, { videoBitsPerSecond: bps }); }
    B.recChunks = [];
    rec.ondataavailable = e => { if (e.data.size) B.recChunks.push(e.data); };
    rec.onstop = () => {
      dl('niyantran-broadcast-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.webm', new Blob(B.recChunks, { type: 'video/webm' }));
      smToast('Recording saved');
    };
    rec.start(1000);
    B.rec = rec; B.recT0 = performance.now();
    const btn = document.getElementById('bcRecBtn'); if (btn) { btn.classList.add('rec'); btn.innerHTML = '⏹ Stop & save'; }
  }
  function stopRec() {
    if (!B.rec) return;
    try { B.rec.stop(); } catch (e) { }
    B.rec = null;
    const btn = document.getElementById('bcRecBtn'); if (btn) { btn.classList.remove('rec'); btn.innerHTML = '● Record'; }
    const te = document.getElementById('bcRecTime'); if (te) te.textContent = '';
  }

  /* ---------- UI ---------- */
  function renderLeft() {
    const box = document.getElementById('bcScenes'); if (!box) return;
    box.innerHTML = B.scenes.map((sc, i) => '<button class="bc-item' + (i === B.active ? ' active' : '') + '" data-i="' + i + '" type="button">▣ ' + esc(sc.name) + '<span class="x" data-del="' + i + '">✕</span></button>').join('');
    box.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', e => { if (e.target.dataset.del != null) { if (B.scenes.length > 1) { B.scenes.splice(+e.target.dataset.del, 1); B.active = 0; renderLeft(); } return; } switchScene(+b.dataset.i); }));
    const sbox = document.getElementById('bcSources');
    const sc = scene();
    sbox.innerHTML = (sc ? sc.sources : []).map(s => '<button class="bc-item' + (s.id === selId ? ' active' : '') + '" data-s="' + s.id + '" type="button">' + ({ cam: '🎥', screen: '🖥', img: '🖼', vid: '🎞', text: 'T', pdfimg: '📄' }[s.type] || '▫') + ' ' + esc(s.name) + '<span class="x" data-x="' + s.id + '">✕</span></button>').join('') || '<div class="sm-note">No sources in this scene yet.</div>';
    sbox.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', e => { if (e.target.dataset.x) { removeSource(e.target.dataset.x); return; } selectSource(b.dataset.s); }));
  }
  function renderInspector() {
    const box = document.getElementById('bcInspect'); if (!box) return;
    const sc = scene(), s = sc && sc.sources.find(x => x.id === selId);
    if (!s) { box.innerHTML = '<div class="sm-note">Select a source to position it, key it, or put it in a virtual studio.</div>'; return; }
    let h = '<div class="bc-row"><span class="sm-lbl">X</span><input class="sm-in" style="width:58px" type="number" data-k="x" value="' + Math.round(s.x) + '"/><span class="sm-lbl">Y</span><input class="sm-in" style="width:58px" type="number" data-k="y" value="' + Math.round(s.y) + '"/></div>'
      + '<div class="bc-row"><span class="sm-lbl">W</span><input class="sm-in" style="width:58px" type="number" data-k="w" value="' + Math.round(s.w) + '"/><span class="sm-lbl">H</span><input class="sm-in" style="width:58px" type="number" data-k="h" value="' + Math.round(s.h) + '"/></div>'
      + '<div class="bc-row"><span class="sm-lbl">OPACITY</span><input type="range" class="sm-range" min="10" max="100" data-k="op" value="' + Math.round((s.opacity || 1) * 100) + '"/></div>'
      + '<div class="bc-row"><button class="sm-hbtn" data-a="full" type="button">Fill frame</button><button class="sm-hbtn" data-a="pip" type="button">PiP corner</button></div>';
    if (s.type === 'cam' || s.type === 'vid') {
      h += '<div class="bc-sec" style="margin-top:10px">VIRTUAL STUDIO</div>'
        + '<div class="bc-row"><span class="sm-lbl">CHROMA</span><button class="sm-hbtn' + (s.chroma && s.chroma.on ? ' on' : '') + '" data-a="chroma" type="button">' + (s.chroma && s.chroma.on ? 'On' : 'Off') + '</button>'
        + '<input type="color" data-k="ckey" value="' + (s.chroma ? s.chroma.color : '#00b140') + '" title="Key color"/>'
        + '<input type="range" class="sm-range" style="width:70px" min="30" max="180" data-k="ctol" value="' + (s.chroma ? s.chroma.tol : 96) + '" title="Tolerance"/></div>';
      if (s.type === 'cam') {
        h += '<div class="bc-bg">' + Object.keys(BGS).map(k => '<button data-bg="' + k + '" class="' + ((s.bg || 'none') === k ? 'on' : '') + '" style="' + BGS[k].css + '" type="button">' + BGS[k].label + '</button>').join('') + '</div>'
          + '<div class="sm-note" style="margin-top:6px">Backdrops render behind the camera — enable chroma (green screen) for a clean cutout; without one, use PiP over the backdrop.</div>';
      }
    }
    if (s.type === 'text') h += '<div class="bc-row"><span class="sm-lbl">TEXT</span><input class="sm-in" type="text" data-k="text" value="' + esc(s.text) + '"/></div><div class="bc-row"><span class="sm-lbl">SIZE</span><input type="range" class="sm-range" min="18" max="110" data-k="size" value="' + s.size + '"/><input type="color" data-k="color" value="' + s.color + '"/></div>';
    box.innerHTML = h;
    box.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.k, v = inp.type === 'color' || inp.type === 'text' || k === 'text' ? inp.value : +inp.value;
      if (k === 'op') s.opacity = v / 100;
      else if (k === 'ckey') { s.chroma = s.chroma || { on: false, tol: 96 }; s.chroma.color = v; }
      else if (k === 'ctol') { s.chroma = s.chroma || { on: false, color: '#00b140' }; s.chroma.tol = v; }
      else s[k] = v;
    }));
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'full') { s.x = 0; s.y = 0; s.w = W; s.h = H; }
      if (a === 'pip') { s.w = 380; s.h = 214; s.x = W - 404; s.y = H - 262; }
      if (a === 'chroma') { s.chroma = s.chroma || { color: '#00b140', tol: 96 }; s.chroma.on = !s.chroma.on; }
      renderInspector();
    }));
    box.querySelectorAll('[data-bg]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.bg === 'custom') {
        const f = await pickFile('image/*'); if (!f) return;
        const im = new Image(); im.src = URL.createObjectURL(f);
        await new Promise(r => im.onload = r); customBg = im;
      }
      s.bg = b.dataset.bg; renderInspector();
    }));
  }
  function renderBrandPanel(box) {
    const b = B.brand;
    box.innerHTML = '<div class="bc-row"><span class="sm-lbl">LOWER ⅓</span><button class="sm-hbtn' + (b.lt.on ? ' on' : '') + '" data-t="lt" type="button">' + (b.lt.on ? 'On' : 'Off') + '</button><input type="color" data-b="ltacc" value="' + b.lt.accent + '"/></div>'
      + '<div class="bc-row"><input class="sm-in" type="text" data-b="lttitle" placeholder="Name / headline" value="' + esc(b.lt.title) + '"/></div>'
      + '<div class="bc-row"><input class="sm-in" type="text" data-b="ltsub" placeholder="Designation / strap" value="' + esc(b.lt.sub) + '"/></div>'
      + '<div class="bc-row"><span class="sm-lbl">BREAKING</span><button class="sm-hbtn' + (b.breaking.on ? ' on' : '') + '" data-t="breaking" type="button">' + (b.breaking.on ? 'On' : 'Off') + '</button><input class="sm-in" type="text" data-b="brk" value="' + esc(b.breaking.text) + '"/></div>'
      + '<div class="bc-row"><span class="sm-lbl">TICKER</span><button class="sm-hbtn' + (b.ticker.on ? ' on' : '') + '" data-t="ticker" type="button">' + (b.ticker.on ? 'On' : 'Off') + '</button></div>'
      + '<div class="bc-row"><input class="sm-in" type="text" data-b="tick" value="' + esc(b.ticker.text) + '"/></div>'
      + '<div class="bc-row"><span class="sm-lbl">LIVE</span><button class="sm-hbtn' + (b.live ? ' on' : '') + '" data-t="live" type="button">' + (b.live ? 'On' : 'Off') + '</button>'
      + '<span class="sm-lbl">CLOCK</span><button class="sm-hbtn' + (b.clock ? ' on' : '') + '" data-t="clock" type="button">' + (b.clock ? 'On' : 'Off') + '</button></div>'
      + '<div class="bc-row"><span class="sm-lbl">LOGO</span><button class="sm-hbtn" data-t="logo" type="button">Upload</button>'
      + '<span class="sm-lbl">WM</span><input class="sm-in" style="width:90px" type="text" data-b="wm" value="' + esc(b.wm) + '"/></div>';
    box.querySelectorAll('[data-t]').forEach(btn => btn.addEventListener('click', async () => {
      const t = btn.dataset.t;
      if (t === 'lt') b.lt.on = !b.lt.on;
      if (t === 'breaking') b.breaking.on = !b.breaking.on;
      if (t === 'ticker') b.ticker.on = !b.ticker.on;
      if (t === 'live') b.live = !b.live;
      if (t === 'clock') b.clock = !b.clock;
      if (t === 'logo') {
        const f = await pickFile('image/*'); if (f) {
          const rd = new FileReader();
          rd.onload = () => { b.logo = rd.result; const im = new Image(); im.onload = () => B._logoImg = im; im.src = rd.result; saveBrand(); };
          rd.readAsDataURL(f);
        }
      }
      saveBrand(); renderBrandPanel(box);
    }));
    box.querySelectorAll('[data-b]').forEach(inp => inp.addEventListener('input', () => {
      const k = inp.dataset.b, v = inp.value;
      if (k === 'lttitle') b.lt.title = v; if (k === 'ltsub') b.lt.sub = v; if (k === 'ltacc') b.lt.accent = v;
      if (k === 'brk') b.breaking.text = v; if (k === 'tick') b.ticker.text = v; if (k === 'wm') b.wm = v;
      saveBrand();
    }));
  }
  function renderStreamPanel(box) {
    const plats = [['youtube', 'YouTube'], ['facebook', 'Facebook'], ['x', 'X / Twitter'], ['linkedin', 'LinkedIn']];
    box.innerHTML = plats.map(p => '<div class="bc-row"><span class="sm-lbl" style="min-width:62px">' + p[1].toUpperCase() + '</span>'
      + '<input class="sm-in" style="flex:1" type="password" placeholder="Stream key" data-p="' + p[0] + '" value="' + esc((B.keys[p[0]] || {}).key || '') + '"/>'
      + '<button class="sm-hbtn" data-c="' + p[0] + '" title="Copy RTMP URL + key" type="button">⧉</button></div>').join('')
      + '<div class="sm-honest" style="margin-top:8px">⚠ <span>Browsers cannot push RTMP directly. Your keys are stored locally and ready for <b>OBS</b> or a cloud relay — or record broadcast-quality video here and upload. A relay endpoint can be added to the same Netlify infra later.</span></div>';
    box.querySelectorAll('[data-p]').forEach(inp => inp.addEventListener('input', () => { B.keys[inp.dataset.p] = B.keys[inp.dataset.p] || { url: '' }; B.keys[inp.dataset.p].key = inp.value; SSET('niyStreamKeys', B.keys); }));
    box.querySelectorAll('[data-c]').forEach(btn => btn.addEventListener('click', () => {
      const k = B.keys[btn.dataset.c] || {};
      navigator.clipboard.writeText('Server: ' + (k.url || '(platform RTMP URL)') + '\nStream key: ' + (k.key || '(not set)'));
      smToast('RTMP settings copied');
    }));
  }

  Stream.register({
    id: 'broadcast', icon: '🎛', title: 'Broadcast Studio', shortcut: '3',
    desc: 'Scenes, webcam/screen/media sources, chroma-key virtual studios, lower thirds & tickers, audio mixer, transitions, recording.',
    status: () => ({ cls: B.rec ? 'warn' : (B.scenes.length ? '' : 'idle'), txt: B.rec ? 'Recording…' : 'Compositor ready · 720p' }),
    aiChips: ['Write lower-third copy', 'Punchy breaking-news strap', 'Ticker line for today', 'YouTube live title + description'],
    aiCtx: () => 'Broadcast Studio. Active scene: "' + (scene() ? scene().name : '') + '" with sources: ' + (scene() ? scene().sources.map(s => s.name).join(', ') : 'none') + '. Lower third: "' + B.brand.lt.title + ' / ' + B.brand.lt.sub + '". When asked for lower-third or ticker copy, produce SHORT broadcast-grade lines.',
    aiApply: text => {
      const lines = text.split('\n').map(x => x.trim()).filter(Boolean);
      if (lines.length) { B.brand.lt.title = lines[0].slice(0, 44); B.brand.lt.sub = (lines[1] || '').slice(0, 64); B.brand.lt.on = true; saveBrand(); const bp = document.getElementById('bcBrand'); if (bp) renderBrandPanel(bp); smToast('Applied to lower third'); }
    },
    onShow() { B.running = true; smCancelRaf(B.raf); B.raf = smRaf(loop); },
    onHide() { if (!B.rec) { B.running = false; smCancelRaf(B.raf); } },
    init(body) {
      B.scenes = [{ id: uid(), name: 'Scene 1', sources: [] }, { id: uid(), name: 'Scene 2', sources: [] }];
      if (B.brand.logo) { const im = new Image(); im.onload = () => B._logoImg = im; im.src = B.brand.logo; }
      body.innerHTML = '<div class="bc-wrap">'
        + '<div class="bc-left">'
        + '<div><div class="bc-sec">SCENES<button class="add" id="bcAddScene" type="button">＋</button></div><div class="bc-box" id="bcScenes"></div></div>'
        + '<div><div class="bc-sec">SOURCES</div><div class="bc-box" id="bcSources"></div>'
        + '<div class="bc-srcbtns">'
        + '<button class="sm-hbtn" data-add="cam" type="button">🎥 Webcam</button><button class="sm-hbtn" data-add="screen" type="button">🖥 Screen</button>'
        + '<button class="sm-hbtn" data-add="img" type="button">🖼 Image</button><button class="sm-hbtn" data-add="vid" type="button">🎞 Video</button>'
        + '<button class="sm-hbtn" data-add="pdfimg" type="button">📄 PDF</button><button class="sm-hbtn" data-add="text" type="button">T Text</button>'
        + '</div></div>'
        + '<div><div class="bc-sec">SELECTED SOURCE</div><div class="bc-box" id="bcInspect"></div></div>'
        + '</div>'
        + '<div class="bc-center">'
        + '<div class="bc-stage"><canvas id="bcCanvas" width="' + W + '" height="' + H + '"></canvas></div>'
        + '<div class="bc-timeline"><span class="sm-lbl">TRANSITION</span><div class="bc-trans" id="bcTrans"></div>'
        + '<span class="sm-hspace" style="flex:1"></span><span class="bc-rectime" id="bcRecTime"></span>'
        + '<span class="sm-lbl">QUALITY</span><select class="sm-in" id="bcQual"><option value="std">1080-ready · 4.5 Mbps</option><option value="high">High · 8 Mbps</option><option value="eco">Eco · 2.5 Mbps</option></select>'
        + '<button class="sm-hbtn rec" id="bcRecBtn" type="button">● Record</button></div>'
        + '</div>'
        + '<div class="bc-right">'
        + '<div><div class="bc-sec">BRANDING</div><div class="bc-box" id="bcBrand"></div></div>'
        + '<div><div class="bc-sec">AUDIO MIXER</div><div class="bc-box bc-mix" id="bcMixer"></div></div>'
        + '<div><div class="bc-sec">GO LIVE — STREAM KEYS</div><div class="bc-box" id="bcStream"></div></div>'
        + '</div></div>';
      B.cv = body.querySelector('#bcCanvas'); B.ctx = B.cv.getContext('2d');
      body.querySelector('#bcAddScene').addEventListener('click', () => { B.scenes.push({ id: uid(), name: 'Scene ' + (B.scenes.length + 1), sources: [] }); renderLeft(); });
      body.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addSource(b.dataset.add)));
      const tbox = body.querySelector('#bcTrans');
      ['cut', 'fade', 'dissolve', 'slide', 'zoom'].forEach(t => {
        const b2 = el('button', 'sm-hbtn' + (B.trans === t ? ' on' : ''), t[0].toUpperCase() + t.slice(1)); b2.type = 'button';
        b2.addEventListener('click', () => { B.trans = t; tbox.querySelectorAll('.sm-hbtn').forEach(x => x.classList.remove('on')); b2.classList.add('on'); });
        tbox.appendChild(b2);
      });
      body.querySelector('#bcRecBtn').addEventListener('click', () => startRec(body.querySelector('#bcQual').value));
      renderLeft(); renderInspector(); renderMixer();
      renderBrandPanel(body.querySelector('#bcBrand'));
      renderStreamPanel(body.querySelector('#bcStream'));
    },
  });
})();


/* ================================================================
   VIDEO EDITOR — timeline editing in the browser: multi-clip
   sequence, trim/split/speed/rotate, text overlays, music +
   voice-over tracks, color correction, auto-captions (Groq Whisper
   via /api/transcribe), silence removal, aspect/resolution export
   presets (renders in real time via MediaRecorder — no upload).
   ================================================================ */
(function () {
  const E = {
    clips: [], texts: [], cues: [], music: null, vo: null,
    sel: null, selText: null, t: 0, playing: false, raf: 0,
    color: { br: 100, ct: 100, sat: 100, hue: 0 }, burn: true, nr: false,
    cv: null, ctx: null, pxs: 26, exporting: false,
  };
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
  const clipDur = c => Math.max(0.05, (c.out - c.in) / c.speed);
  const seqDur = () => E.clips.reduce((a, c) => a + clipDur(c), 0);
  function locate(t) {
    let acc = 0;
    for (const c of E.clips) { const d = clipDur(c); if (t < acc + d || c === E.clips[E.clips.length - 1]) return { c, local: c.in + Math.min(d, Math.max(0, t - acc)) * c.speed, start: acc }; acc += d; }
    return null;
  }

  (function css() {
    if (document.getElementById('niy-edit-css')) return;
    const s = document.createElement('style'); s.id = 'niy-edit-css';
    s.textContent = [
      ".ed-wrap{flex:1;display:flex;flex-direction:column;min-height:0}",
      ".ed-top{flex:1;display:flex;min-height:0}",
      ".ed-stagewrap{flex:1;display:flex;flex-direction:column;padding:12px;gap:8px;min-width:0}",
      ".ed-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#05070a;border:1px solid rgba(255,255,255,.08);border-radius:12px}",
      ".ed-stage canvas{max-width:100%;max-height:100%;background:#000;border-radius:6px}",
      ".ed-side{width:270px;flex:0 0 auto;border-left:1px solid rgba(255,255,255,.06);overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:12px;background:#0c0f15;scrollbar-width:thin}",
      ".ed-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
      ".ed-time{font-size:12px;font-weight:750;color:#e8edf2;font-variant-numeric:tabular-nums}",
      ".ed-tl{flex:0 0 auto;height:150px;border-top:1px solid rgba(255,255,255,.07);background:#0a0d12;overflow-x:auto;overflow-y:hidden;position:relative;scrollbar-width:thin}",
      ".ed-tl-inner{position:relative;height:100%;min-width:100%;padding:8px 14px}",
      ".ed-track{position:relative;height:38px;margin-bottom:6px;background:rgba(255,255,255,.02);border-radius:7px}",
      ".ed-track .tl-lbl{position:absolute;left:6px;top:-2px;font-size:7.5px;color:#4a525c;letter-spacing:.1em;font-weight:700;z-index:2}",
      ".ed-clip{position:absolute;top:3px;bottom:3px;background:linear-gradient(180deg,rgba(127,176,255,.25),rgba(127,176,255,.12));border:1px solid rgba(127,176,255,.45);border-radius:6px;cursor:pointer;overflow:hidden;font-size:9px;color:#cfe1ff;padding:3px 7px;white-space:nowrap;text-overflow:ellipsis}",
      ".ed-clip.sel{border-color:#fff;box-shadow:0 0 0 1px #fff}",
      ".ed-clip.txt{background:linear-gradient(180deg,rgba(240,180,41,.25),rgba(240,180,41,.1));border-color:rgba(240,180,41,.5);color:#f0d9a0}",
      ".ed-clip.cue{background:linear-gradient(180deg,rgba(47,213,123,.22),rgba(47,213,123,.08));border-color:rgba(47,213,123,.45);color:#a8e8c5}",
      ".ed-clip.mus{background:linear-gradient(180deg,rgba(249,127,181,.22),rgba(249,127,181,.08));border-color:rgba(249,127,181,.4);color:#f5c1d8}",
      ".ed-ph{position:absolute;top:0;bottom:0;width:2px;background:#ff4d4d;z-index:5;pointer-events:none}",
      ".ed-ph::before{content:'';position:absolute;top:0;left:-4px;border:5px solid transparent;border-top-color:#ff4d4d}",
      ".ed-sec{font-size:9px;font-weight:700;letter-spacing:.13em;color:#68717b;margin-bottom:6px}",
      ".ed-box{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:9px}",
      ".ed-row{display:flex;align-items:center;gap:7px;margin-top:6px;flex-wrap:wrap}",
      ".ed-row .sm-lbl{min-width:46px}",
      ".ed-cues{max-height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin}",
      ".ed-cue{display:grid;grid-template-columns:44px 44px 1fr;gap:5px;align-items:center}",
      ".ed-cue input{font-size:10px;padding:3px 5px}",
    ].join('');
    document.head.appendChild(s);
  })();

  /* ---------- import ---------- */
  async function importClips() {
    const files = await pickFile('video/*', true); if (!files || !files.length) return;
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const v = document.createElement('video'); v.src = url; v.playsInline = true; v.preload = 'auto'; v.muted = false;
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; }).catch(() => smToast('Cannot decode ' + f.name));
      if (!v.duration || !isFinite(v.duration)) continue;
      E.clips.push({ id: uid(), name: f.name, file: f, url, v, dur: v.duration, in: 0, out: v.duration, speed: 1, rot: 0 });
    }
    E.sel = E.clips.length ? E.clips[E.clips.length - 1].id : null;
    renderTL(); renderInspect(); draw();
  }

  /* ---------- preview / playback ---------- */
  let audioG = null;
  function ensureAudio() {
    if (audioG) return audioG;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    audioG = { ac, dest: ac.createMediaStreamDestination(), nodes: {} };
    return audioG;
  }
  function routeClipAudio(c) {
    const A = ensureAudio();
    if (A.nodes[c.id]) return;
    try {
      const src = A.ac.createMediaElementSource(c.v);
      let node = src;
      if (E.nr) { const hp = A.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; const lp = A.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000; src.connect(hp); hp.connect(lp); node = lp; }
      const g = A.ac.createGain();
      node.connect(g); g.connect(A.ac.destination); g.connect(A.dest);
      A.nodes[c.id] = g;
    } catch (e) { }
  }
  function draw() {
    const ctx = E.ctx; if (!ctx) return;
    const cw = E.cv.width, ch = E.cv.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    const loc = locate(E.t);
    if (loc && loc.c.v.readyState >= 2) {
      const v = loc.c.v, rot = loc.c.rot || 0;
      ctx.save();
      ctx.filter = 'brightness(' + E.color.br + '%) contrast(' + E.color.ct + '%) saturate(' + E.color.sat + '%) hue-rotate(' + E.color.hue + 'deg)';
      ctx.translate(cw / 2, ch / 2); ctx.rotate(rot * Math.PI / 180);
      const rw = rot % 180 ? ch : cw, rh = rot % 180 ? cw : ch;
      const sc = Math.min(rw / v.videoWidth, rh / v.videoHeight);
      ctx.drawImage(v, -v.videoWidth * sc / 2, -v.videoHeight * sc / 2, v.videoWidth * sc, v.videoHeight * sc);
      ctx.restore();
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#3a424d'; ctx.font = '600 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(E.clips.length ? 'Seek / press play' : 'Import clips to begin', cw / 2, ch / 2); ctx.textAlign = 'left';
    }
    E.texts.forEach(tx => {
      if (E.t >= tx.start && E.t <= tx.start + tx.dur) {
        ctx.font = '800 ' + (tx.size * ch / 720) + 'px sans-serif';
        const w2 = ctx.measureText(tx.text).width;
        const x = tx.pos === 'center' ? (cw - w2) / 2 : cw * .06, y = tx.pos === 'top' ? ch * .14 : tx.pos === 'center' ? ch / 2 : ch * .86;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 12, y - tx.size * ch / 720, w2 + 24, tx.size * ch / 720 * 1.4);
        ctx.fillStyle = tx.color; ctx.fillText(tx.text, x, y);
      }
    });
    if (E.burn) {
      const cue = E.cues.find(q => E.t >= q.s && E.t <= q.e);
      if (cue) {
        ctx.font = '650 ' + (26 * ch / 720) + 'px sans-serif'; ctx.textAlign = 'center';
        const w2 = ctx.measureText(cue.text).width;
        ctx.fillStyle = 'rgba(0,0,0,.66)'; ctx.fillRect(cw / 2 - w2 / 2 - 14, ch * .9 - 30 * ch / 720, w2 + 28, 40 * ch / 720);
        ctx.fillStyle = '#fff'; ctx.fillText(cue.text, cw / 2, ch * .9); ctx.textAlign = 'left';
      }
    }
    if (E.music && E.music.el && E.playing && E.music.el.paused) { E.music.el.volume = E.music.vol; E.music.el.play().catch(() => { }); }
    if (E.vo && E.vo.el && E.playing && E.vo.el.paused && E.t < (E.vo.dur || 0)) E.vo.el.play().catch(() => { });
  }
  let lastClip = null;
  function tick() {
    if (!E.playing) return;
    const loc = locate(E.t);
    if (!loc) { pause(); return; }
    const { c } = loc;
    if (lastClip !== c) {
      if (lastClip) { try { lastClip.v.pause(); } catch (e) { } }
      lastClip = c;
      c.v.currentTime = loc.local; c.v.playbackRate = c.speed;
      routeClipAudio(c);
      c.v.play().catch(() => { });
    }
    if (Math.abs(c.v.currentTime - loc.local) > 0.35) c.v.currentTime = loc.local;
    E.t = loc.start + Math.max(0, (c.v.currentTime - c.in)) / c.speed;
    if (c.v.currentTime >= c.out - 0.03) { E.t = loc.start + clipDur(c) + 0.001; lastClip = null; }
    if (E.t >= seqDur()) { pause(); E.t = 0; }
    draw(); syncTL();
    E.raf = smRaf(tick);
  }
  function play() {
    if (!E.clips.length) return;
    try { ensureAudio().ac.resume(); } catch (e) { }
    try { if (E.music && E.music.el) E.music.el.currentTime = Math.min(E.music.el.duration || 0, E.t); } catch (e) { }
    try { if (E.vo && E.vo.el) E.vo.el.currentTime = Math.min(E.vo.dur || 0, E.t); } catch (e) { }
    E.playing = true; lastClip = null;
    document.getElementById('edPlay').innerHTML = '⏸';
    smCancelRaf(E.raf); E.raf = smRaf(tick);
  }
  function pause() {
    E.playing = false; smCancelRaf(E.raf);
    E.clips.forEach(c => { try { c.v.pause(); } catch (e) { } });
    if (E.music && E.music.el) E.music.el.pause();
    if (E.vo && E.vo.el) E.vo.el.pause();
    const b = document.getElementById('edPlay'); if (b) b.innerHTML = '▶';
  }
  function seek(t) {
    E.t = Math.max(0, Math.min(seqDur(), t)); lastClip = null;
    const loc = locate(E.t);
    if (loc) { loc.c.v.currentTime = loc.local; loc.c.v.pause(); }
    draw(); syncTL();
  }

  /* ---------- edits ---------- */
  function splitAt() {
    const loc = locate(E.t); if (!loc) return;
    const { c, local } = loc;
    if (local <= c.in + 0.08 || local >= c.out - 0.08) return;
    const i = E.clips.indexOf(c);
    const right = Object.assign({}, c, { id: uid(), in: local });
    // right shares the same <video> element source but needs its own element for independent playback
    const v2 = document.createElement('video'); v2.src = c.url; v2.playsInline = true; v2.preload = 'auto';
    right.v = v2;
    c.out = local;
    E.clips.splice(i + 1, 0, right);
    renderTL(); smToast('Clip split');
  }
  function removeClip(id) {
    E.clips = E.clips.filter(c => c.id !== id);
    if (E.sel === id) E.sel = null;
    renderTL(); renderInspect(); draw();
  }
  async function autoSilence() {
    const c = E.clips.find(x => x.id === E.sel) || E.clips[0];
    if (!c) return;
    smToast('Analyzing audio…');
    try {
      const buf = await c.file.arrayBuffer();
      const ac = new OfflineAudioContext(1, 1, 16000);
      const audio = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(buf.slice(0));
      const data = audio.getChannelData(0), sr = audio.sampleRate, win = Math.floor(sr * .05);
      const rms = [];
      for (let i = 0; i < data.length; i += win) { let s = 0; for (let j = i; j < Math.min(i + win, data.length); j++) s += data[j] * data[j]; rms.push(Math.sqrt(s / win)); }
      const thr = Math.max(.008, rms.slice().sort((a, b) => a - b)[Math.floor(rms.length * .35)] * 1.6);
      const spans = []; let st = null;
      rms.forEach((r, i) => { const t = i * .05; if (r < thr) { if (st == null) st = t; } else if (st != null) { if (t - st > .7) spans.push([st + .12, t - .12]); st = null; } });
      if (st != null && (rms.length * .05 - st) > .7) spans.push([st + .12, rms.length * .05]);
      const inside = spans.filter(s => s[0] > c.in && s[1] < c.out);
      if (!inside.length) { smToast('No silent gaps ≥0.7s found'); return; }
      const i0 = E.clips.indexOf(c);
      const pieces = [];
      let cursor = c.in;
      inside.forEach(sp => { if (sp[0] - cursor > .15) pieces.push([cursor, sp[0]]); cursor = sp[1]; });
      if (c.out - cursor > .15) pieces.push([cursor, c.out]);
      const newClips = pieces.map((p, i) => {
        const v2 = document.createElement('video'); v2.src = c.url; v2.playsInline = true; v2.preload = 'auto';
        return Object.assign({}, c, { id: uid(), in: p[0], out: p[1], v: i === 0 ? c.v : v2, name: c.name + ' ✂' + (i + 1) });
      });
      E.clips.splice(i0, 1, ...newClips);
      renderTL(); smToast('Removed ' + inside.length + ' silent gap' + (inside.length > 1 ? 's' : '') + ' (' + inside.reduce((a, s) => a + s[1] - s[0], 0).toFixed(1) + 's)');
    } catch (e) { smToast('Silence analysis failed: ' + e.message); }
  }

  /* ---------- captions ---------- */
  function wavEncode(samples, sr) {
    const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
    const ws = (o, s2) => { for (let i = 0; i < s2.length; i++) v.setUint8(o + i, s2.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); ws(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Blob([b], { type: 'audio/wav' });
  }
  async function autoCaptions() {
    if (!E.clips.length) { smToast('Import a clip first'); return; }
    smToast('Transcribing… (Groq Whisper via proxy)');
    try {
      E.cues = [];
      let seqOff = 0;
      for (const c of E.clips) {
        const raw = await c.file.arrayBuffer();
        const dec = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(raw.slice(0));
        const sr = 16000, off = new OfflineAudioContext(1, Math.ceil(dec.duration * sr), sr);
        const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
        const mono = (await off.startRendering()).getChannelData(0);
        const CH = 25 * sr;
        for (let i = c.in * sr; i < c.out * sr; i += CH) {
          const chunk = mono.slice(i, Math.min(i + CH, c.out * sr));
          if (chunk.length < sr * 0.4) continue;
          const fd = new FormData();
          fd.append('file', wavEncode(chunk, sr), 'chunk.wav');
          const r = await fetch('/api/transcribe', { method: 'POST', body: fd });
          if (!r.ok) throw new Error('transcribe proxy ' + r.status + ' — captions need the deployed build');
          const j = await r.json();
          const text = (j.text || '').trim();
          if (!text) continue;
          const chunkStart = seqOff + (i / sr - c.in) / c.speed, chunkDur = chunk.length / sr / c.speed;
          const sents = text.match(/[^.!?।]+[.!?।]*/g) || [text];
          const totalChars = sents.reduce((a, s2) => a + s2.length, 0) || 1;
          let cur = chunkStart;
          sents.forEach(s2 => {
            const d = chunkDur * s2.length / totalChars;
            E.cues.push({ s: +cur.toFixed(2), e: +(cur + d).toFixed(2), text: s2.trim() });
            cur += d;
          });
        }
        seqOff += clipDur(c);
      }
      renderCues(); renderTL();
      smToast(E.cues.length + ' caption cues created — refine timing in the panel');
    } catch (e) { smToast('Captions failed: ' + e.message); }
  }
  const srtT = (t, sep) => { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = Math.floor(t) % 60, ms = Math.round(t % 1 * 1000); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + sep + String(ms).padStart(3, '0'); };
  function exportSubs(kind) {
    if (!E.cues.length) return;
    let out = '';
    if (kind === 'srt') out = E.cues.map((c, i) => (i + 1) + '\n' + srtT(c.s, ',') + ' --> ' + srtT(c.e, ',') + '\n' + c.text + '\n').join('\n');
    else if (kind === 'vtt') out = 'WEBVTT\n\n' + E.cues.map(c => srtT(c.s, '.') + ' --> ' + srtT(c.e, '.') + '\n' + c.text + '\n').join('\n');
    else out = E.cues.map(c => c.text).join('\n');
    dl('captions.' + kind, new Blob([out], { type: 'text/plain' }));
  }
  function renderCues() {
    const box = document.getElementById('edCues'); if (!box) return;
    box.innerHTML = E.cues.map((c, i) => '<div class="ed-cue" data-i="' + i + '"><input class="sm-in" data-f="s" value="' + c.s + '"/><input class="sm-in" data-f="e" value="' + c.e + '"/><input class="sm-in" data-f="text" value="' + esc(c.text) + '"/></div>').join('') || '<div class="sm-note">No captions yet — run Auto captions.</div>';
    box.querySelectorAll('.ed-cue input').forEach(inp => inp.addEventListener('change', () => {
      const i = +inp.closest('.ed-cue').dataset.i, f = inp.dataset.f;
      E.cues[i][f] = f === 'text' ? inp.value : (+inp.value || 0);
      renderTL();
    }));
  }

  /* ---------- timeline ---------- */
  function renderTL() {
    const inner = document.getElementById('edTlInner'); if (!inner) return;
    const total = Math.max(10, seqDur() + 4);
    inner.style.width = total * E.pxs + 40 + 'px';
    let acc = 0;
    const vparts = E.clips.map(c => { const left = acc * E.pxs, w2 = clipDur(c) * E.pxs; acc += clipDur(c); return '<div class="ed-clip' + (c.id === E.sel ? ' sel' : '') + '" data-c="' + c.id + '" style="left:' + left + 'px;width:' + Math.max(16, w2) + 'px" title="' + esc(c.name) + '">' + esc(c.name) + '</div>'; }).join('');
    const tparts = E.texts.map(tx => '<div class="ed-clip txt" data-t="' + tx.id + '" style="left:' + tx.start * E.pxs + 'px;width:' + Math.max(14, tx.dur * E.pxs) + 'px">' + esc(tx.text) + '</div>').join('');
    const cparts = E.cues.map((q, i) => '<div class="ed-clip cue" style="left:' + q.s * E.pxs + 'px;width:' + Math.max(8, (q.e - q.s) * E.pxs) + 'px" title="' + esc(q.text) + '"></div>').join('');
    const mparts = E.music ? '<div class="ed-clip mus" style="left:0;width:' + Math.min(total, (E.music.el.duration || total)) * E.pxs + 'px">♫ ' + esc(E.music.name) + '</div>' : (E.vo ? '<div class="ed-clip mus" style="left:0;width:' + Math.min(total, E.vo.dur || 8) * E.pxs + 'px">🎙 Voice-over</div>' : '');
    inner.innerHTML = '<div class="ed-track"><span class="tl-lbl">VIDEO</span>' + vparts + '</div>'
      + '<div class="ed-track" style="height:24px"><span class="tl-lbl">TEXT</span>' + tparts + '</div>'
      + '<div class="ed-track" style="height:20px"><span class="tl-lbl">CAPTIONS</span>' + cparts + '</div>'
      + '<div class="ed-track" style="height:20px"><span class="tl-lbl">AUDIO</span>' + mparts + '</div>'
      + '<div class="ed-ph" id="edPh" style="left:' + (E.t * E.pxs + 14) + 'px"></div>';
    inner.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); E.sel = b.dataset.c; E.selText = null; renderTL(); renderInspect(); }));
    inner.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); E.selText = b.dataset.t; E.sel = null; renderTL(); renderInspect(); }));
    const dEl = document.getElementById('edDur'); if (dEl) dEl.textContent = fmtT(seqDur());
  }
  function syncTL() {
    const ph = document.getElementById('edPh'); if (ph) ph.style.left = (E.t * E.pxs + 14) + 'px';
    const te = document.getElementById('edTime'); if (te) te.textContent = fmtT(E.t) + ' / ' + fmtT(seqDur());
  }
  function renderInspect() {
    const box = document.getElementById('edInspect'); if (!box) return;
    const c = E.clips.find(x => x.id === E.sel);
    const tx = E.texts.find(x => x.id === E.selText);
    if (c) {
      box.innerHTML = '<div class="ed-row"><span class="sm-lbl">IN</span><input class="sm-in" style="width:64px" data-k="in" value="' + c.in.toFixed(2) + '"/><span class="sm-lbl">OUT</span><input class="sm-in" style="width:64px" data-k="out" value="' + c.out.toFixed(2) + '"/></div>'
        + '<div class="ed-row"><span class="sm-lbl">SPEED</span><select class="sm-in" data-k="speed">' + [0.5, 0.75, 1, 1.25, 1.5, 2].map(s => '<option value="' + s + '"' + (c.speed === s ? ' selected' : '') + '>' + s + '×</option>').join('') + '</select>'
        + '<span class="sm-lbl">ROTATE</span><select class="sm-in" data-k="rot">' + [0, 90, 180, 270].map(r => '<option value="' + r + '"' + (c.rot === r ? ' selected' : '') + '>' + r + '°</option>').join('') + '</select></div>'
        + '<div class="ed-row"><button class="sm-hbtn" data-a="left" type="button">← Move</button><button class="sm-hbtn" data-a="right" type="button">Move →</button><button class="sm-hbtn" data-a="del" type="button" style="color:#ff8585">✕ Remove</button></div>';
      box.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('change', () => {
        const k = inp.dataset.k, v = +inp.value;
        if (k === 'in') c.in = Math.max(0, Math.min(c.out - .1, v));
        if (k === 'out') c.out = Math.max(c.in + .1, Math.min(c.dur, v));
        if (k === 'speed') c.speed = v; if (k === 'rot') c.rot = v;
        renderTL(); draw();
      }));
      box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
        const i = E.clips.indexOf(c);
        if (b.dataset.a === 'del') removeClip(c.id);
        if (b.dataset.a === 'left' && i > 0) { E.clips.splice(i, 1); E.clips.splice(i - 1, 0, c); renderTL(); }
        if (b.dataset.a === 'right' && i < E.clips.length - 1) { E.clips.splice(i, 1); E.clips.splice(i + 1, 0, c); renderTL(); }
      }));
    } else if (tx) {
      box.innerHTML = '<div class="ed-row"><input class="sm-in" style="flex:1" data-k="text" value="' + esc(tx.text) + '"/></div>'
        + '<div class="ed-row"><span class="sm-lbl">START</span><input class="sm-in" style="width:56px" data-k="start" value="' + tx.start.toFixed(1) + '"/><span class="sm-lbl">DUR</span><input class="sm-in" style="width:50px" data-k="dur" value="' + tx.dur.toFixed(1) + '"/></div>'
        + '<div class="ed-row"><span class="sm-lbl">SIZE</span><input type="range" class="sm-range" min="18" max="90" data-k="size" value="' + tx.size + '"/><input type="color" data-k="color" value="' + tx.color + '"/>'
        + '<select class="sm-in" data-k="pos">' + ['bottom', 'center', 'top'].map(p => '<option' + (tx.pos === p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>'
        + '<button class="sm-hbtn" data-a="del" type="button" style="color:#ff8585">✕</button></div>';
      box.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => {
        const k = inp.dataset.k;
        tx[k] = (k === 'text' || k === 'color' || k === 'pos') ? inp.value : +inp.value;
        renderTL(); draw();
      }));
      box.querySelector('[data-a=del]').addEventListener('click', () => { E.texts = E.texts.filter(x => x.id !== tx.id); E.selText = null; renderTL(); renderInspect(); draw(); });
    } else {
      box.innerHTML = '<div class="sm-note">Select a clip or a title on the timeline.</div>';
    }
  }

  /* ---------- export ---------- */
  async function exportVideo(aspect, resH) {
    if (!E.clips.length || E.exporting) return;
    const dims = aspect === '9:16' ? [Math.round(resH * 9 / 16), resH] : aspect === '1:1' ? [resH, resH] : [Math.round(resH * 16 / 9), resH];
    const xc = document.createElement('canvas'); xc.width = dims[0]; xc.height = dims[1];
    const total = seqDur();
    E.exporting = true;
    smToast('Rendering ' + aspect + ' ' + resH + 'p in real time (' + fmtT(total) + ') — keep this tab focused');
    const oldCv = E.cv, oldCtx = E.ctx;
    E.cv = xc; E.ctx = xc.getContext('2d');
    const stream = xc.captureStream(30);
    try { const A = ensureAudio(); A.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); } catch (e) { }
    let rec;
    const bps = resH >= 2160 ? 26e6 : resH >= 1440 ? 14e6 : resH >= 1080 ? 8e6 : 4.5e6;
    try { rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: bps }); } catch (e) { rec = new MediaRecorder(stream, { videoBitsPerSecond: bps }); }
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => rec.onstop = res);
    rec.start(1000);
    seek(0); play();
    await new Promise(res => { const iv = setInterval(() => { if (!E.playing) { clearInterval(iv); res(); } }, 200); });
    rec.stop(); await done;
    E.cv = oldCv; E.ctx = oldCtx;
    E.exporting = false;
    dl('niyantran-edit-' + aspect.replace(':', 'x') + '-' + resH + 'p.webm', new Blob(chunks, { type: 'video/webm' }));
    smToast('Export saved (' + aspect + ' · ' + resH + 'p WebM)');
    draw();
  }

  /* ---------- voice-over + music ---------- */
  let voRec = null;
  async function toggleVO() {
    if (voRec) { voRec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voRec = new MediaRecorder(stream);
      const chunks = [];
      voRec.ondataavailable = e => chunks.push(e.data);
      voRec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
        const a = new Audio(url);
        a.onloadedmetadata = () => { E.vo = { el: a, dur: a.duration }; renderTL(); };
        try { const A = ensureAudio(); const s2 = A.ac.createMediaElementSource(a); s2.connect(A.ac.destination); s2.connect(A.dest); } catch (e) { }
        voRec = null;
        document.getElementById('edVo').classList.remove('rec');
        smToast('Voice-over added at 0:00');
      };
      voRec.start();
      document.getElementById('edVo').classList.add('rec');
      smToast('Recording voice-over… click again to stop');
    } catch (e) { smToast('Mic error: ' + e.message); }
  }

  Stream.register({
    id: 'editor', icon: '🎬', title: 'Video Editor', shortcut: '4',
    desc: 'Timeline editing: trim, split, speed, titles, music & voice-over, color, auto-captions, silence removal, aspect/res export presets.',
    status: () => ({ cls: E.clips.length ? '' : 'idle', txt: E.clips.length ? E.clips.length + ' clips · ' + fmtT(seqDur()) : 'No project' }),
    aiChips: ['Write a title overlay', 'Chapter markers from captions', 'YouTube description + timestamps', 'Fix caption grammar'],
    aiCtx: () => 'Video Editor. ' + E.clips.length + ' clips, total ' + fmtT(seqDur()) + '. Captions (' + E.cues.length + ' cues): ' + E.cues.slice(0, 40).map(c => '[' + fmtT(c.s) + '] ' + c.text).join(' ').slice(0, 2200),
    onHide() { pause(); },
    init(body) {
      body.innerHTML = '<div class="ed-wrap"><div class="ed-top">'
        + '<div class="ed-stagewrap">'
        + '<div class="ed-stage"><canvas id="edCanvas" width="1280" height="720"></canvas></div>'
        + '<div class="ed-controls">'
        + '<button class="sm-hbtn" id="edImport" type="button">⤒ Import clips</button>'
        + '<button class="sm-hbtn" id="edPlay" type="button" style="width:44px;justify-content:center">▶</button>'
        + '<span class="ed-time" id="edTime">0:00 / 0:00</span>'
        + '<button class="sm-hbtn" id="edSplit" type="button" title="Split at playhead (S)">✂ Split</button>'
        + '<button class="sm-hbtn" id="edText" type="button">T Title</button>'
        + '<button class="sm-hbtn" id="edMusic" type="button">♫ Music</button>'
        + '<button class="sm-hbtn" id="edVo" type="button">🎙 Voice-over</button>'
        + '<button class="sm-hbtn" id="edSil" type="button" title="Cut silent gaps in the selected clip">∿ Cut silence</button>'
        + '<span class="sm-hspace" style="flex:1"></span>'
        + '<select class="sm-in" id="edAspect"><option value="16:9">Landscape 16:9</option><option value="9:16">Portrait 9:16</option><option value="1:1">Square 1:1</option></select>'
        + '<select class="sm-in" id="edRes"><option value="720">720p</option><option value="1080" selected>1080p</option><option value="1440">2K</option><option value="2160">4K</option></select>'
        + '<button class="sm-hbtn on" id="edExport" type="button">⤓ Export</button>'
        + '</div></div>'
        + '<div class="ed-side">'
        + '<div><div class="ed-sec">SELECTED</div><div class="ed-box" id="edInspect"></div></div>'
        + '<div><div class="ed-sec">COLOR CORRECTION</div><div class="ed-box" id="edColor">'
        + ['br|Brightness', 'ct|Contrast', 'sat|Saturation', 'hue|Hue'].map(x => { const [k, l] = x.split('|'); return '<div class="ed-row"><span class="sm-lbl">' + l.toUpperCase().slice(0, 6) + '</span><input type="range" class="sm-range" data-cc="' + k + '" min="' + (k === 'hue' ? -180 : 40) + '" max="' + (k === 'hue' ? 180 : 180) + '" value="' + E.color[k] + '"/></div>'; }).join('')
        + '<div class="ed-row"><button class="sm-hbtn" id="edNr" type="button">Noise reduction: off</button></div></div></div>'
        + '<div><div class="ed-sec">CAPTIONS</div><div class="ed-box">'
        + '<div class="ed-row"><button class="sm-hbtn" id="edAutoCap" type="button">✦ Auto captions</button><button class="sm-hbtn" id="edBurn" type="button">Burn-in: on</button></div>'
        + '<div class="ed-cues" id="edCues" style="margin-top:8px"></div>'
        + '<div class="ed-row"><button class="sm-hbtn" data-x="srt" type="button">SRT</button><button class="sm-hbtn" data-x="vtt" type="button">VTT</button><button class="sm-hbtn" data-x="txt" type="button">TXT</button></div>'
        + '</div></div>'
        + '</div></div>'
        + '<div class="ed-tl" id="edTl"><div class="ed-tl-inner" id="edTlInner"></div></div></div>';
      E.cv = body.querySelector('#edCanvas'); E.ctx = E.cv.getContext('2d');
      body.querySelector('#edImport').addEventListener('click', importClips);
      body.querySelector('#edPlay').addEventListener('click', () => E.playing ? pause() : play());
      body.querySelector('#edSplit').addEventListener('click', splitAt);
      body.querySelector('#edSil').addEventListener('click', autoSilence);
      body.querySelector('#edText').addEventListener('click', () => {
        const t = window.prompt('Title text', 'NIYANTRAN EXCLUSIVE'); if (!t) return;
        E.texts.push({ id: uid(), text: t, start: E.t, dur: 4, size: 44, color: '#ffffff', pos: 'bottom' });
        E.selText = E.texts[E.texts.length - 1].id; E.sel = null;
        renderTL(); renderInspect(); draw();
      });
      body.querySelector('#edMusic').addEventListener('click', async () => {
        const f = await pickFile('audio/*'); if (!f) return;
        const a = new Audio(URL.createObjectURL(f)); a.loop = false;
        E.music = { el: a, vol: .35, name: f.name };
        try { const A = ensureAudio(); const s2 = A.ac.createMediaElementSource(a); const g = A.ac.createGain(); g.gain.value = .35; s2.connect(g); g.connect(A.ac.destination); g.connect(A.dest); } catch (e) { }
        renderTL(); smToast('Music bed added (35% volume)');
      });
      body.querySelector('#edVo').addEventListener('click', toggleVO);
      body.querySelectorAll('[data-cc]').forEach(inp => inp.addEventListener('input', () => { E.color[inp.dataset.cc] = +inp.value; draw(); }));
      body.querySelector('#edNr').addEventListener('click', e => { E.nr = !E.nr; e.target.textContent = 'Noise reduction: ' + (E.nr ? 'basic HP/LP' : 'off'); });
      body.querySelector('#edAutoCap').addEventListener('click', autoCaptions);
      body.querySelector('#edBurn').addEventListener('click', e => { E.burn = !E.burn; e.target.textContent = 'Burn-in: ' + (E.burn ? 'on' : 'off'); draw(); });
      body.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => exportSubs(b.dataset.x)));
      body.querySelector('#edExport').addEventListener('click', () => exportVideo(body.querySelector('#edAspect').value, +body.querySelector('#edRes').value));
      body.querySelector('#edTl').addEventListener('click', e => {
        if (e.target.closest('.ed-clip')) return;
        const r = body.querySelector('#edTlInner').getBoundingClientRect();
        seek((e.clientX - r.left - 14) / E.pxs);
      });
      renderTL(); renderInspect(); renderCues(); draw();
    },
  });
})();


/* ================================================================
   REMOTE STUDIO + CAPTIONS + PRO CAMERA
   ================================================================ */

/* ---------------- REMOTE STUDIO ---------------- */
(function () {
  const R = { room: null, tiles: [], layout: 'grid', chat: [], rec: null, recChunks: [], cv: null, raf: 0, micAn: null };
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  (function css() {
    if (document.getElementById('niy-remote-css')) return;
    const s = document.createElement('style'); s.id = 'niy-remote-css';
    s.textContent = [
      ".rm-wrap{flex:1;display:flex;min-height:0}",
      ".rm-main{flex:1;display:flex;flex-direction:column;padding:12px;gap:10px;min-width:0}",
      ".rm-grid{flex:1;min-height:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-content:center}",
      ".rm-grid.speaker{grid-template-columns:1fr;grid-auto-rows:0;overflow:hidden}",
      ".rm-tile{position:relative;background:#0a0d12;border:1px solid rgba(255,255,255,.09);border-radius:12px;overflow:hidden;aspect-ratio:16/9}",
      ".rm-tile video{width:100%;height:100%;object-fit:cover;background:#000}",
      ".rm-tile .nm{position:absolute;left:10px;bottom:8px;background:rgba(0,0,0,.6);border-radius:6px;font-size:10.5px;font-weight:650;color:#fff;padding:3px 9px;display:flex;align-items:center;gap:6px}",
      ".rm-tile .q{width:7px;height:7px;border-radius:50%;background:#2fd57b}",
      ".rm-tile .acts{position:absolute;right:8px;top:8px;display:flex;gap:5px;opacity:0;transition:opacity .15s}",
      ".rm-tile:hover .acts{opacity:1}",
      ".rm-tile.pip{position:absolute;right:22px;bottom:22px;width:230px;z-index:5;box-shadow:0 12px 32px rgba(0,0,0,.5)}",
      ".rm-side{width:270px;flex:0 0 auto;border-left:1px solid rgba(255,255,255,.06);background:#0c0f15;display:flex;flex-direction:column;padding:10px;gap:11px;overflow-y:auto;scrollbar-width:thin}",
      ".rm-chatlog{flex:1;min-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;font-size:11px;color:#c3ccd6}",
      ".rm-chatlog b{color:#8db8ff}",
      ".rm-invite{font-family:monospace;font-size:10.5px;color:#a9c8ff;background:rgba(127,176,255,.07);border:1px dashed rgba(127,176,255,.3);border-radius:8px;padding:7px 9px;word-break:break-all;cursor:pointer}",
    ].join('');
    document.head.appendChild(s);
  })();

  async function addLocal(kind) {
    try {
      const stream = kind === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        : await navigator.mediaDevices.getUserMedia({ video: { width: 1280 }, audio: true });
      const v = document.createElement('video'); v.srcObject = stream; v.muted = true; v.playsInline = true; v.autoplay = true;
      const tile = { id: 'l' + Date.now().toString(36), name: kind === 'screen' ? 'Screen share' : 'You (host)', v, stream, kind, muted: false };
      R.tiles.push(tile);
      if (kind !== 'screen') {
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const an = ac.createAnalyser(); an.fftSize = 128;
          ac.createMediaStreamSource(stream).connect(an);
          R.micAn = { an, buf: new Uint8Array(an.frequencyBinCount) };
        } catch (e) { }
      }
      if (kind === 'screen') stream.getVideoTracks()[0].addEventListener('ended', () => { R.tiles = R.tiles.filter(t => t !== tile); renderTiles(); });
      renderTiles();
    } catch (e) { smToast(kind + ' failed: ' + (e.message || e.name)); }
  }
  function renderTiles() {
    const g = document.getElementById('rmGrid'); if (!g) return;
    g.className = 'rm-grid' + (R.layout === 'speaker' || R.layout === 'presentation' ? ' speaker' : '');
    g.innerHTML = '';
    let tiles = R.tiles.slice();
    if (R.layout === 'presentation') tiles.sort((a, b) => (b.kind === 'screen') - (a.kind === 'screen'));
    tiles.forEach((t, i) => {
      const d = el('div', 'rm-tile' + (R.layout === 'pip' && i > 0 ? ' pip' : ''));
      d.appendChild(t.v);
      d.insertAdjacentHTML('beforeend', '<span class="nm"><span class="q"></span>' + esc(t.name) + (t.muted ? ' · 🔇' : '') + '</span>'
        + '<span class="acts"><button class="sm-hbtn" data-mute="' + t.id + '" type="button">' + (t.muted ? 'Unmute' : 'Mute') + '</button><button class="sm-hbtn" data-kick="' + t.id + '" type="button">Remove</button></span>');
      g.appendChild(d);
      t.v.play().catch(() => { });
      if ((R.layout === 'speaker' || R.layout === 'presentation') && i > 0 && R.layout !== 'pip') d.style.display = 'none';
    });
    if (!tiles.length) g.innerHTML = '<div class="sm-note" style="text-align:center;align-self:center">Join with your camera to start the session.</div>';
    g.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', () => {
      const t = R.tiles.find(x => x.id === b.dataset.mute); if (!t) return;
      t.muted = !t.muted; t.stream.getAudioTracks().forEach(a => a.enabled = !t.muted); renderTiles();
    }));
    g.querySelectorAll('[data-kick]').forEach(b => b.addEventListener('click', () => {
      const t = R.tiles.find(x => x.id === b.dataset.kick); if (!t) return;
      t.stream.getTracks().forEach(x => x.stop());
      R.tiles = R.tiles.filter(x => x !== t); renderTiles();
    }));
  }
  function chatAdd(who, text) {
    R.chat.push({ who, text });
    const log = document.getElementById('rmChat');
    if (log) { log.insertAdjacentHTML('beforeend', '<div><b>' + esc(who) + '</b> ' + esc(text) + '</div>'); log.scrollTop = log.scrollHeight; }
  }
  function toggleRec() {
    if (R.rec) { R.rec.stop(); return; }
    if (!R.tiles.length) { smToast('Nothing to record'); return; }
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
    const ctx = cv.getContext('2d');
    R.cv = cv;
    const drawLoop = () => {
      if (!R.rec) return;
      ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, 1280, 720);
      const ts = R.tiles.filter(t => t.v.readyState >= 2);
      const n = Math.max(1, ts.length), cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
      ts.forEach((t, i) => {
        const w2 = 1280 / cols, h2 = 720 / rows, x = (i % cols) * w2, y = Math.floor(i / cols) * h2;
        const sc = Math.min(w2 / t.v.videoWidth, h2 / t.v.videoHeight) || 1;
        ctx.drawImage(t.v, x + (w2 - t.v.videoWidth * sc) / 2, y + (h2 - t.v.videoHeight * sc) / 2, t.v.videoWidth * sc, t.v.videoHeight * sc);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 10, y + h2 - 34, ctx.measureText(t.name).width + 26, 24);
        ctx.fillStyle = '#fff'; ctx.font = '650 14px sans-serif'; ctx.fillText(t.name, x + 20, y + h2 - 17);
      });
      R.raf = smRaf(drawLoop);
    };
    const stream = cv.captureStream(30);
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ac.createMediaStreamDestination();
      R.tiles.forEach(t => { try { if (t.stream.getAudioTracks().length) ac.createMediaStreamSource(t.stream).connect(dest); } catch (e) { } });
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { }
    R.recChunks = [];
    try { R.rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' }); } catch (e) { R.rec = new MediaRecorder(stream); }
    R.rec.ondataavailable = e => { if (e.data.size) R.recChunks.push(e.data); };
    R.rec.onstop = () => {
      smCancelRaf(R.raf);
      dl('niyantran-interview.webm', new Blob(R.recChunks, { type: 'video/webm' }));
      R.rec = null;
      document.getElementById('rmRec').innerHTML = '● Record session';
      smToast('Session recording saved');
    };
    R.rec.start(1000); drawLoop();
    document.getElementById('rmRec').innerHTML = '⏹ Stop recording';
  }

  Stream.register({
    id: 'remote', icon: '🌐', title: 'Remote Studio', shortcut: '5',
    desc: 'Remote interview rooms — invite links, waiting room, device checks, screen share, layouts, session recording.',
    status: () => ({ cls: 'warn', txt: 'Local studio ready · relay pending' }),
    aiChips: ['Interview questions for my guest', 'Pre-interview checklist', 'Guest intro script'],
    aiCtx: () => 'Remote Studio: interview room "' + (R.room || 'not created') + '" with ' + R.tiles.length + ' participants: ' + R.tiles.map(t => t.name).join(', '),
    init(body) {
      R.room = uid();
      const invite = location.origin + location.pathname + '#niyroom=' + R.room;
      body.innerHTML = '<div class="rm-wrap"><div class="rm-main">'
        + '<div class="sm-honest">⚠ <span><b>Architecture note:</b> multi-network guest calling needs a WebRTC signaling relay (a small WebSocket function on the same Netlify infra). Rooms, invites, layouts, device checks and recording are fully working locally; the peer handshake plugs into this UI when the relay is deployed.</span></div>'
        + '<div class="rm-grid" id="rmGrid"></div>'
        + '<div class="ed-controls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        + '<button class="sm-hbtn on" id="rmJoin" type="button">🎥 Join with camera</button>'
        + '<button class="sm-hbtn" id="rmShare" type="button">🖥 Share screen</button>'
        + '<span class="sm-lbl">LAYOUT</span>'
        + '<select class="sm-in" id="rmLayout"><option value="grid">Grid</option><option value="speaker">Speaker</option><option value="presentation">Presentation</option><option value="pip">Picture-in-picture</option></select>'
        + '<button class="sm-hbtn rec" id="rmRec" type="button">● Record session</button>'
        + '<span class="sm-note" id="rmNet" style="margin-left:auto"></span>'
        + '</div></div>'
        + '<div class="rm-side">'
        + '<div><div class="ed-sec">INVITE</div><div class="rm-invite" id="rmInvite" title="Click to copy">' + esc(invite) + '</div>'
        + '<div class="sm-note" style="margin-top:6px">Guests land in a waiting room; you admit them once the relay is live.</div></div>'
        + '<div><div class="ed-sec">DEVICE CHECK</div><div class="ed-box"><div class="ed-row"><span class="sm-lbl">MIC</span><span class="bc-meter" style="flex:1"><i id="rmMicMeter"></i></span></div>'
        + '<div class="ed-row"><button class="sm-hbtn" id="rmTone" type="button">🔊 Speaker test tone</button></div></div></div>'
        + '<div style="flex:1;display:flex;flex-direction:column;min-height:140px"><div class="ed-sec">CHAT</div><div class="rm-chatlog" id="rmChat"></div>'
        + '<div class="ed-row"><input class="sm-in" id="rmChatIn" style="flex:1" placeholder="Message…"/><button class="sm-hbtn" id="rmChatSend" type="button">➤</button></div></div>'
        + '<div><div class="ed-sec">FILES</div><div class="ed-box"><button class="sm-hbtn" id="rmFile" type="button">⤒ Share a file</button><div class="sm-note" id="rmFiles" style="margin-top:6px"></div></div></div>'
        + '</div></div>';
      body.querySelector('#rmJoin').addEventListener('click', () => addLocal('cam'));
      body.querySelector('#rmShare').addEventListener('click', () => addLocal('screen'));
      body.querySelector('#rmLayout').addEventListener('change', e => { R.layout = e.target.value; renderTiles(); });
      body.querySelector('#rmRec').addEventListener('click', toggleRec);
      body.querySelector('#rmInvite').addEventListener('click', () => { navigator.clipboard.writeText(invite); smToast('Invite link copied'); });
      body.querySelector('#rmTone').addEventListener('click', () => {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain();
        g.gain.value = .12; o.frequency.value = 440; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .6);
      });
      const send = () => { const i = body.querySelector('#rmChatIn'); if (i.value.trim()) { chatAdd('You', i.value.trim()); i.value = ''; } };
      body.querySelector('#rmChatSend').addEventListener('click', send);
      body.querySelector('#rmChatIn').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      body.querySelector('#rmFile').addEventListener('click', async () => {
        const f = await pickFile('', false); if (!f) return;
        body.querySelector('#rmFiles').textContent = '📎 ' + f.name + ' (' + Math.round(f.size / 1024) + ' KB) — ready to send when guests connect';
      });
      const net = () => {
        const c = navigator.connection || {};
        const t = c.effectiveType ? c.effectiveType.toUpperCase() + (c.downlink ? ' · ' + c.downlink + ' Mbps' : '') : 'Connection: unknown';
        const e2 = body.querySelector('#rmNet'); if (e2) e2.innerHTML = '<span class="sm-status ' + (c.effectiveType === '4g' ? '' : 'warn') + '" style="display:inline-block;margin-right:5px"></span>' + t;
      };
      net(); setInterval(net, 5000);
      setInterval(() => {
        if (R.micAn) {
          R.micAn.an.getByteTimeDomainData(R.micAn.buf);
          let p = 0; for (let i = 0; i < R.micAn.buf.length; i++) p = Math.max(p, Math.abs(R.micAn.buf[i] - 128));
          const m = document.getElementById('rmMicMeter'); if (m) m.style.width = Math.min(100, p / 128 * 180) + '%';
        }
      }, 120);
      renderTiles();
    },
  });
})();

/* ---------------- CAPTIONS ---------------- */
(function () {
  const C = { cues: [], speakers: ['Speaker 1'], media: null, mediaEl: null };
  function wavEncode(samples, sr) {
    const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
    const ws = (o, s2) => { for (let i = 0; i < s2.length; i++) v.setUint8(o + i, s2.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); ws(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Blob([b], { type: 'audio/wav' });
  }
  const srtT = (t, sep) => { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = Math.floor(t) % 60, ms = Math.round(t % 1 * 1000); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + sep + String(ms).padStart(3, '0'); };

  async function transcribeFile(f) {
    smToast('Transcribing ' + f.name + '…');
    const raw = await f.arrayBuffer();
    const dec = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(raw.slice(0));
    const sr = 16000, off = new OfflineAudioContext(1, Math.ceil(dec.duration * sr), sr);
    const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
    const mono = (await off.startRendering()).getChannelData(0);
    C.cues = [];
    const CH = 25 * sr;
    for (let i = 0; i < mono.length; i += CH) {
      const chunk = mono.slice(i, i + CH);
      const fd = new FormData(); fd.append('file', wavEncode(chunk, sr), 'c.wav');
      const r = await fetch('/api/transcribe', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('ASR proxy unavailable (' + r.status + ') — use the deployed build');
      const j = await r.json();
      const text = (j.text || '').trim(); if (!text) continue;
      const start = i / sr, dur2 = chunk.length / sr;
      const sents = text.match(/[^.!?।]+[.!?।]*/g) || [text];
      const chars = sents.reduce((a, s2) => a + s2.length, 0) || 1;
      let cur = start;
      sents.forEach(s2 => { const d = dur2 * s2.length / chars; C.cues.push({ s: +cur.toFixed(2), e: +(cur + d).toFixed(2), sp: 0, text: s2.trim() }); cur += d; });
      renderCues();
    }
    smToast(C.cues.length + ' cues — refine below');
  }
  async function aiFix(kind) {
    if (!C.cues.length) return;
    smToast('AI is processing ' + C.cues.length + ' cues…');
    try {
      const chunk = C.cues.map((c, i) => i + '|' + c.text).join('\n').slice(0, 9000);
      const instr = kind === 'grammar'
        ? 'Fix grammar + punctuation of each subtitle line. PRESERVE meaning and line count. Return STRICTLY the same "index|text" lines, nothing else.'
        : 'Translate each subtitle line into ' + kind + '. Return STRICTLY the same "index|text" lines, nothing else.';
      const out = await callAI([{ role: 'system', content: instr }, { role: 'user', content: chunk }], { maxTokens: 2000, noSearch: true });
      out.split('\n').forEach(l => {
        const m = l.match(/^(\d+)\|(.*)$/);
        if (m && C.cues[+m[1]]) C.cues[+m[1]].text = m[2].trim();
      });
      renderCues(); smToast('Done');
    } catch (e) { smToast('AI error: ' + e.message); }
  }
  function renderCues() {
    const box = document.getElementById('cpList'); if (!box) return;
    const q = (document.getElementById('cpSearch') || {}).value || '';
    box.innerHTML = C.cues.map((c, i) => (!q || c.text.toLowerCase().includes(q.toLowerCase()))
      ? '<div class="ed-cue" style="grid-template-columns:52px 52px 76px 1fr" data-i="' + i + '">'
      + '<input class="sm-in" data-f="s" value="' + c.s + '"/><input class="sm-in" data-f="e" value="' + c.e + '"/>'
      + '<select class="sm-in" data-f="sp">' + C.speakers.map((sp, j) => '<option value="' + j + '"' + (c.sp === j ? ' selected' : '') + '>' + esc(sp) + '</option>').join('') + '</select>'
      + '<input class="sm-in" data-f="text" value="' + esc(c.text) + '"/></div>' : '').join('')
      || '<div class="sm-note">No cues yet — transcribe a file or import an SRT.</div>';
    box.querySelectorAll('.ed-cue input,.ed-cue select').forEach(inp => inp.addEventListener('change', () => {
      const i = +inp.closest('.ed-cue').dataset.i, f = inp.dataset.f;
      C.cues[i][f] = f === 'text' ? inp.value : +inp.value;
    }));
    const st = document.getElementById('cpStats'); if (st) st.textContent = C.cues.length + ' cues · ' + C.speakers.length + ' speakers';
  }
  function exportSubs(kind) {
    if (!C.cues.length) return;
    let out = '';
    if (kind === 'srt') out = C.cues.map((c, i) => (i + 1) + '\n' + srtT(c.s, ',') + ' --> ' + srtT(c.e, ',') + '\n' + (C.speakers.length > 1 ? C.speakers[c.sp] + ': ' : '') + c.text + '\n').join('\n');
    else if (kind === 'vtt') out = 'WEBVTT\n\n' + C.cues.map(c => srtT(c.s, '.') + ' --> ' + srtT(c.e, '.') + '\n<v ' + C.speakers[c.sp] + '>' + c.text + '\n').join('\n');
    else out = C.cues.map(c => (C.speakers.length > 1 ? C.speakers[c.sp] + ': ' : '') + c.text).join('\n');
    dl('captions.' + kind, new Blob([out], { type: 'text/plain' }));
  }

  Stream.register({
    id: 'captions', icon: '💬', title: 'Captions', shortcut: '6',
    desc: 'Speech-to-text workspace: Whisper transcription, cue timeline, speakers, search & replace, AI grammar + translation, SRT/VTT/TXT.',
    status: () => ({ cls: C.cues.length ? '' : 'idle', txt: C.cues.length ? C.cues.length + ' cues loaded' : 'Ready' }),
    aiChips: ['Fix grammar & punctuation', 'Summarize this transcript', 'Pull 3 quotes for social'],
    aiCtx: () => 'Captions workspace. Transcript (' + C.cues.length + ' cues): ' + C.cues.map(c => c.text).join(' ').slice(0, 2800),
    init(body) {
      body.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;padding:14px;gap:10px;min-height:0;max-width:1050px;margin:0 auto;width:100%">'
        + '<div class="ed-controls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        + '<button class="sm-hbtn on" id="cpFile" type="button">⤒ Transcribe audio/video</button>'
        + '<button class="sm-hbtn" id="cpImport" type="button">⤒ Import SRT</button>'
        + '<button class="sm-hbtn" id="cpSpk" type="button">👤 Speakers</button>'
        + '<button class="sm-hbtn" id="cpGrammar" type="button">✦ Grammar + punctuation</button>'
        + '<button class="sm-hbtn" id="cpTrans" type="button">✦ Translate…</button>'
        + '<span class="sm-note" id="cpStats" style="margin-left:auto"></span></div>'
        + '<div class="ed-controls" style="display:flex;gap:8px;align-items:center">'
        + '<input class="sm-in" id="cpSearch" placeholder="Search cues…" style="width:200px"/>'
        + '<input class="sm-in" id="cpFind" placeholder="Replace: find" style="width:140px"/>'
        + '<input class="sm-in" id="cpRepl" placeholder="with" style="width:140px"/>'
        + '<button class="sm-hbtn" id="cpDoRepl" type="button">Replace all</button>'
        + '<span class="sm-hspace" style="flex:1"></span>'
        + '<button class="sm-hbtn" data-x="srt" type="button">⤓ SRT</button><button class="sm-hbtn" data-x="vtt" type="button">⤓ VTT</button><button class="sm-hbtn" data-x="txt" type="button">⤓ TXT</button></div>'
        + '<div class="ed-cues" id="cpList" style="flex:1;max-height:none"></div></div>';
      body.querySelector('#cpFile').addEventListener('click', async () => {
        const f = await pickFile('audio/*,video/*'); if (!f) return;
        try { await transcribeFile(f); } catch (e) { smToast(e.message); }
      });
      body.querySelector('#cpImport').addEventListener('click', async () => {
        const f = await pickFile('.srt,.vtt'); if (!f) return;
        const text = await f.text();
        C.cues = [];
        const re = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*\n([\s\S]*?)(?=\n\s*\n|$)/g;
        let m; while ((m = re.exec(text))) {
          const s = +m[1] * 3600 + +m[2] * 60 + +m[3] + m[4] / 1000, e2 = +m[5] * 3600 + +m[6] * 60 + +m[7] + m[8] / 1000;
          C.cues.push({ s: +s.toFixed(2), e: +e2.toFixed(2), sp: 0, text: m[9].replace(/\n/g, ' ').trim() });
        }
        renderCues(); smToast('Imported ' + C.cues.length + ' cues');
      });
      body.querySelector('#cpSpk').addEventListener('click', () => {
        const v = window.prompt('Speaker names (comma-separated)', C.speakers.join(', '));
        if (v != null) { C.speakers = v.split(',').map(x => x.trim()).filter(Boolean).slice(0, 8) || ['Speaker 1']; renderCues(); }
      });
      body.querySelector('#cpGrammar').addEventListener('click', () => aiFix('grammar'));
      body.querySelector('#cpTrans').addEventListener('click', () => {
        const lang = window.prompt('Translate into…', 'Hindi'); if (lang) aiFix(lang);
      });
      body.querySelector('#cpSearch').addEventListener('input', renderCues);
      body.querySelector('#cpDoRepl').addEventListener('click', () => {
        const f = body.querySelector('#cpFind').value, r = body.querySelector('#cpRepl').value;
        if (!f) return;
        let n = 0;
        C.cues.forEach(c => { if (c.text.includes(f)) { n++; c.text = c.text.split(f).join(r); } });
        renderCues(); smToast(n + ' cues updated');
      });
      body.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => exportSubs(b.dataset.x)));
      renderCues();
    },
  });
})();

/* ---------------- PRO CAMERA ---------------- */
(function () {
  const K = { stream: null, track: null, v: null, rec: null, chunks: [], t0: 0, hist: 0, peak: false, grid: true, safe: false, an: null, raf: 0 };

  (function css() {
    if (document.getElementById('niy-cam-css')) return;
    const s = document.createElement('style'); s.id = 'niy-cam-css';
    s.textContent = [
      ".ca-wrap{flex:1;display:flex;min-height:0}",
      ".ca-stage{position:relative;flex:1;min-width:0;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}",
      ".ca-stage video{max-width:100%;max-height:100%}",
      ".ca-ov{position:absolute;inset:0;pointer-events:none}",
      ".ca-side{width:264px;flex:0 0 auto;border-left:1px solid rgba(255,255,255,.06);background:#0c0f15;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}",
      ".ca-ctl{display:flex;align-items:center;gap:8px;margin-top:6px}",
      ".ca-ctl .sm-lbl{min-width:62px}",
      ".ca-ctl input[type=range]{flex:1}",
      ".ca-ctl .v{font-size:9.5px;color:#8d97a3;min-width:44px;text-align:right;font-variant-numeric:tabular-nums}",
      ".ca-na{font-size:9.5px;color:#5b636e;font-style:italic}",
      ".ca-hud{position:absolute;left:12px;top:10px;display:flex;gap:8px;align-items:center;font-size:10.5px;color:#fff;background:rgba(0,0,0,.5);border-radius:8px;padding:5px 10px}",
      ".ca-rec{color:#ff6b6b;font-weight:800}",
    ].join('');
    document.head.appendChild(s);
  })();

  async function start(res) {
    stop(false);
    try {
      const c = { video: { facingMode: 'environment', width: { ideal: res === '2160' ? 3840 : res === '1440' ? 2560 : res === '1080' ? 1920 : 1280 } }, audio: true };
      K.stream = await navigator.mediaDevices.getUserMedia(c);
      K.track = K.stream.getVideoTracks()[0];
      K.v.srcObject = K.stream; await K.v.play();
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const an = ac.createAnalyser(); an.fftSize = 128;
        ac.createMediaStreamSource(K.stream).connect(an);
        K.an = { an, buf: new Uint8Array(an.frequencyBinCount) };
      } catch (e) { }
      renderControls();
      loop();
    } catch (e) { smToast('Camera error: ' + (e.message || e.name)); }
  }
  function stop(clearUi) {
    smCancelRaf(K.raf);
    if (K.stream) K.stream.getTracks().forEach(t => t.stop());
    K.stream = null; K.track = null;
    if (clearUi !== false && K.v) K.v.srcObject = null;
  }
  const CAPS = [
    ['zoom', 'ZOOM', 1], ['exposureCompensation', 'EXP ±', .1], ['exposureTime', 'SHUTTER', 1],
    ['iso', 'ISO', 1], ['focusDistance', 'FOCUS', .01], ['colorTemperature', 'WB K', 50], ['frameRate', 'FPS', 1],
  ];
  function renderControls() {
    const box = document.getElementById('caCtl'); if (!box || !K.track) return;
    let caps = {};
    try { caps = K.track.getCapabilities ? K.track.getCapabilities() : {}; } catch (e) { }
    const cur = K.track.getSettings ? K.track.getSettings() : {};
    let h = '';
    CAPS.forEach(([k, label, step]) => {
      if (caps[k] && caps[k].max != null) {
        h += '<div class="ca-ctl"><span class="sm-lbl">' + label + '</span><input type="range" class="sm-range" data-k="' + k + '" min="' + caps[k].min + '" max="' + caps[k].max + '" step="' + (caps[k].step || step) + '" value="' + (cur[k] != null ? cur[k] : caps[k].min) + '"/><span class="v">' + (cur[k] != null ? (+cur[k]).toFixed(k === 'focusDistance' ? 2 : 0) : '—') + '</span></div>';
      } else {
        h += '<div class="ca-ctl"><span class="sm-lbl">' + label + '</span><span class="ca-na">auto only on this camera</span></div>';
      }
    });
    box.innerHTML = h + '<div class="sm-note" style="margin-top:8px">Manual ISO / shutter / focus / WB depend on the camera hardware — phone cameras expose far more than laptop webcams. Unsupported controls stay on auto, honestly labelled.</div>';
    box.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', async () => {
      const k = inp.dataset.k, v = +inp.value;
      const adv = { advanced: [{ [k]: v }] };
      if (k === 'focusDistance') adv.advanced[0].focusMode = 'manual';
      if (k === 'colorTemperature') adv.advanced[0].whiteBalanceMode = 'manual';
      if (k === 'exposureTime' || k === 'iso') adv.advanced[0].exposureMode = 'manual';
      try { await K.track.applyConstraints(adv); inp.nextElementSibling.textContent = v.toFixed(k === 'focusDistance' ? 2 : 0); } catch (e) { smToast(k + ' rejected by camera'); }
    }));
  }
  const sampler = document.createElement('canvas'); sampler.width = 160; sampler.height = 90;
  const sctx = sampler.getContext('2d', { willReadFrequently: true });
  function loop() {
    K.raf = smRaf(loop);
    if (!K.v || K.v.readyState < 2) return;
    const ov = document.getElementById('caOv'); if (!ov) return;
    const octx = ov.getContext('2d');
    const w2 = ov.width = ov.clientWidth, h2 = ov.height = ov.clientHeight;
    octx.clearRect(0, 0, w2, h2);
    if (K.grid) {
      octx.strokeStyle = 'rgba(255,255,255,.28)'; octx.lineWidth = 1;
      [1, 2].forEach(i => { octx.beginPath(); octx.moveTo(w2 * i / 3, 0); octx.lineTo(w2 * i / 3, h2); octx.stroke(); octx.beginPath(); octx.moveTo(0, h2 * i / 3); octx.lineTo(w2, h2 * i / 3); octx.stroke(); });
    }
    if (K.safe) { octx.strokeStyle = 'rgba(240,180,41,.55)'; octx.setLineDash([6, 5]); octx.strokeRect(w2 * .05, h2 * .05, w2 * .9, h2 * .9); octx.setLineDash([]); }
    // histogram + focus peaking @ ~10fps
    if (!K._n) K._n = 0;
    if (++K._n % 6 === 0) {
      sctx.drawImage(K.v, 0, 0, 160, 90);
      try {
        const d = sctx.getImageData(0, 0, 160, 90).data;
        const bins = new Array(48).fill(0);
        const lum = new Float32Array(160 * 90);
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114);
          lum[i >> 2] = l;
          bins[Math.min(47, l / 256 * 48 | 0)]++;
        }
        K._bins = bins; K._lum = lum;
      } catch (e) { }
    }
    if (K._bins) {
      const bw = 110, bh = 44, bx = w2 - bw - 12, by = h2 - bh - 12;
      octx.fillStyle = 'rgba(0,0,0,.55)'; octx.fillRect(bx - 6, by - 6, bw + 12, bh + 12);
      const mx = Math.max.apply(null, K._bins) || 1;
      octx.fillStyle = 'rgba(255,255,255,.85)';
      K._bins.forEach((b2, i) => { const hh = b2 / mx * bh; octx.fillRect(bx + i * (bw / 48), by + bh - hh, bw / 48 - .5, hh); });
    }
    if (K.peak && K._lum) {
      octx.fillStyle = 'rgba(255,60,60,.85)';
      const sx = w2 / 160, sy = h2 / 90;
      for (let y = 1; y < 89; y++) for (let x = 1; x < 159; x++) {
        const i = y * 160 + x;
        const gx = K._lum[i + 1] - K._lum[i - 1], gy = K._lum[i + 160] - K._lum[i - 160];
        if (gx * gx + gy * gy > 2400) octx.fillRect(x * sx, y * sy, 1.6, 1.6);
      }
    }
    if (K.an) {
      K.an.an.getByteTimeDomainData(K.an.buf);
      let p = 0; for (let i = 0; i < K.an.buf.length; i++) p = Math.max(p, Math.abs(K.an.buf[i] - 128));
      octx.fillStyle = 'rgba(0,0,0,.55)'; octx.fillRect(12, h2 - 24, 130, 12);
      octx.fillStyle = p / 128 > .82 ? '#ff5d5d' : '#2fd57b'; octx.fillRect(14, h2 - 22, Math.min(126, p / 128 * 200), 8);
    }
    const hud = document.getElementById('caHud');
    if (hud) {
      const s2 = K.track && K.track.getSettings ? K.track.getSettings() : {};
      hud.innerHTML = (K.rec ? '<span class="ca-rec">● REC ' + fmtT((performance.now() - K.t0) / 1000) + '</span>' : '')
        + '<span>' + (s2.width || '?') + '×' + (s2.height || '?') + (s2.frameRate ? ' @' + Math.round(s2.frameRate) : '') + '</span>'
        + '<span id="caStore"></span><span id="caBatt"></span>';
    }
  }
  async function meta() {
    try { const e2 = await navigator.storage.estimate(); const g = x => (x / 1e9).toFixed(1); const s2 = document.getElementById('caStore'); if (s2) s2.textContent = '💾 ' + g(e2.usage) + '/' + g(e2.quota) + ' GB'; } catch (e) { }
    try { const b = await navigator.getBattery(); const e2 = document.getElementById('caBatt'); if (e2) e2.textContent = '🔋 ' + Math.round(b.level * 100) + '%' + (b.charging ? '⚡' : ''); } catch (e) { }
  }
  function toggleRec() {
    if (K.rec) { K.rec.stop(); return; }
    if (!K.stream) { smToast('Start the camera first'); return; }
    K.chunks = [];
    try { K.rec = new MediaRecorder(K.stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 12e6 }); } catch (e) { K.rec = new MediaRecorder(K.stream); }
    K.rec.ondataavailable = e => { if (e.data.size) K.chunks.push(e.data); };
    K.rec.onstop = () => {
      dl('niyantran-procam.webm', new Blob(K.chunks, { type: 'video/webm' }));
      K.rec = null;
      document.getElementById('caRec').innerHTML = '● Record';
      smToast('Clip saved');
    };
    K.rec.start(1000); K.t0 = performance.now();
    document.getElementById('caRec').innerHTML = '⏹ Stop';
  }

  Stream.register({
    id: 'camera', icon: '📷', title: 'Pro Camera', shortcut: '7',
    desc: 'Manual camera: ISO, shutter, focus, white balance, zoom, histogram, focus peaking, grids, audio meters, storage & battery.',
    status: () => ({ cls: 'idle', txt: navigator.mediaDevices ? 'Camera available' : 'No camera API' }),
    aiChips: ['Shot list for a field report', 'Interview framing tips'],
    aiCtx: () => 'Pro Camera workspace — a manual-control field camera.',
    onHide() { if (!K.rec) stop(); },
    init(body) {
      body.innerHTML = '<div class="ca-wrap">'
        + '<div class="ca-stage"><video id="caV" playsinline muted></video><canvas class="ca-ov" id="caOv"></canvas><div class="ca-hud" id="caHud"></div></div>'
        + '<div class="ca-side">'
        + '<div class="ed-sec">CAMERA</div><div class="ed-box">'
        + '<div class="ca-ctl"><span class="sm-lbl">RES</span><select class="sm-in" id="caRes" style="flex:1"><option value="720">720p</option><option value="1080" selected>1080p</option><option value="1440">2K</option><option value="2160">4K</option></select></div>'
        + '<div class="ca-ctl"><button class="sm-hbtn on" id="caStart" type="button" style="flex:1;justify-content:center">▶ Start camera</button></div>'
        + '<div class="ca-ctl"><button class="sm-hbtn rec" id="caRec" type="button" style="flex:1;justify-content:center">● Record</button>'
        + '<button class="sm-hbtn" id="caShot" type="button" title="Still photo">📸</button></div></div>'
        + '<div class="ed-sec">MANUAL CONTROLS</div><div class="ed-box" id="caCtl"><div class="sm-note">Start the camera to read its capabilities.</div></div>'
        + '<div class="ed-sec">ASSIST</div><div class="ed-box">'
        + '<div class="ca-ctl"><button class="sm-hbtn on" id="caGrid" type="button">Grid</button><button class="sm-hbtn" id="caSafe" type="button">Safe area</button><button class="sm-hbtn" id="caPeak" type="button">Peaking</button></div>'
        + '<div class="sm-note" style="margin-top:6px">Histogram bottom-right · mic meter bottom-left · red edges = in focus.</div></div>'
        + '</div></div>';
      K.v = body.querySelector('#caV');
      body.querySelector('#caStart').addEventListener('click', () => start(body.querySelector('#caRes').value));
      body.querySelector('#caRes').addEventListener('change', e => { if (K.stream) start(e.target.value); });
      body.querySelector('#caRec').addEventListener('click', toggleRec);
      body.querySelector('#caShot').addEventListener('click', () => {
        if (!K.v || K.v.readyState < 2) return;
        const c = document.createElement('canvas'); c.width = K.v.videoWidth; c.height = K.v.videoHeight;
        c.getContext('2d').drawImage(K.v, 0, 0);
        dl('niyantran-photo.png', c.toDataURL('image/png'));
      });
      const tg = (id, k) => body.querySelector(id).addEventListener('click', e => { K[k] = !K[k]; e.target.classList.toggle('on', K[k]); });
      tg('#caGrid', 'grid'); tg('#caSafe', 'safe'); tg('#caPeak', 'peak');
      setInterval(meta, 8000); meta();
    },
  });
})();

})();
