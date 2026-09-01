
/* Teammate request: on every feature desk header (parallel to the title),
   remove the search box and the two column filters, and add a single
   "Export & options" menu on the far right (Export CSV/JSON, Open in Studio,
   Print/PDF, Ask AI). Each item proxies the feature's existing action, so
   behaviour is unchanged. The row-search still works via cmd-K / "/". */
(function(){
'use strict';
var css=[
"#detail .detail-head .toolbar .filter-group,#detail .toolbar .filter-group{display:none!important}",
"#detail .toolbar .column-filters,#detail .toolbar #columnFilters{display:none!important}",
"#detail .detail-head .toolbar #exportCsvBtn,#detail .detail-head .toolbar #exportJsonBtn,#detail .detail-head .toolbar #studioBtn{display:none!important}",
".niy-hdr-actions{position:relative;flex:0 0 auto;order:100;margin-left:10px}",
".niy-hdr-actions>button.niy-ha-trig{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 15px;font-family:var(--font-display);font-size:12.5px;font-weight:600;letter-spacing:.01em;color:#fff;background:var(--ds-accent);border:1px solid var(--ds-accent);border-radius:999px;cursor:pointer;white-space:nowrap;transition:filter .15s}",
".niy-hdr-actions>button.niy-ha-trig:hover{filter:brightness(1.07)}",
".niy-hdr-actions>button.niy-ha-trig svg{width:15px;height:15px;flex:none;stroke:currentColor;fill:none}",
".niy-hdr-actions>button.niy-ha-trig .cv{font-size:9px;opacity:.85;margin-left:1px;transition:transform .15s}",
".niy-hdr-actions.open>button.niy-ha-trig .cv{transform:rotate(180deg)}",
".niy-hdr-actions .niy-ha-menu{position:absolute;top:calc(100% + 7px);right:0;min-width:214px;display:flex;flex-direction:column;gap:2px;padding:7px;background:var(--panel);border:1px solid var(--line-bright);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.28);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .14s,transform .14s,visibility .14s;z-index:80}",
".niy-hdr-actions.open .niy-ha-menu{opacity:1;visibility:visible;transform:translateY(0)}",
".niy-hdr-actions .niy-ha-menu button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;font-family:var(--font-display);font-size:12.5px;font-weight:500;color:var(--fg-dim);background:transparent;border:0;border-radius:7px;padding:9px 11px;cursor:pointer;white-space:nowrap;transition:background .12s,color .12s}",
".niy-hdr-actions .niy-ha-menu button:hover{background:var(--ds-accent-dim);color:var(--fg)}",
".niy-hdr-actions .niy-ha-menu button:disabled{opacity:.38;cursor:default;background:transparent;color:var(--fg-faint)}",
".niy-hdr-actions .niy-ha-menu button svg{width:15px;height:15px;flex:none;stroke:currentColor;fill:none;opacity:.85}",
".niy-hdr-actions .niy-ha-sep{height:1px;background:var(--line);margin:4px 2px}"
].join('');
var st=document.createElement('style'); st.id='niy-hdr-actions-css'; st.textContent=css; document.head.appendChild(st);
function svg(p){ return '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'; }
var ICO={
  csv:svg('<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>'),
  json:svg('<path d="M9 5H7a2 2 0 0 0-2 2v3.5L3.5 12 5 13.5V17a2 2 0 0 0 2 2h2M15 5h2a2 2 0 0 1 2 2v3.5L20.5 12 19 13.5V17a2 2 0 0 1-2 2h-2"/>'),
  studio:svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M9.5 9.5V20"/>'),
  print:svg('<path d="M7 9V4h10v5M7 20h10v-7H7zM7 16H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/>'),
  ai:svg('<path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z"/>')
};
var TRIG=svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 8.4v7.2M8.4 12h7.2"/>');
function byId(id){ return document.getElementById(id); }
function clickById(id){ var b=byId(id); if(b&&!b.disabled){ b.click(); return true; } return false; }
function askAi(){ if(clickById('featAskAi')) return; if(clickById('globalAiBtn')) return;
  var b=[].slice.call(document.querySelectorAll('#detail .toolbar .toolbar-btn,.niy-more-menu button')).filter(function(x){return /ask ai/i.test(x.textContent||'');})[0]; if(b) b.click(); }
function headerToolbar(){
  var tbs=document.querySelectorAll('#detail .toolbar');
  for(var i=0;i<tbs.length;i++){ var t=tbs[i]; if(t.querySelector('#exportCsvBtn')||t.querySelector('.filter-group')||t.querySelector('#columnFilters')) return t; }
  return null;
}
function mkItem(ic,label,fn,srcId){
  var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem');
  b.innerHTML=ic+'<span>'+label+'</span>'; b.addEventListener('click',fn); if(srcId) b.dataset.src=srcId; return b;
}
function syncDisabled(tb){ var w=tb.querySelector('.niy-hdr-actions'); if(!w) return;
  w.querySelectorAll('.niy-ha-menu button[data-src]').forEach(function(b){ var s=byId(b.dataset.src); b.disabled=!!(s&&s.disabled); }); }
function inject(){
  var tb=headerToolbar(); if(!tb) return;
  ['.filter-group','.niy-filt','#columnFilters','.column-filters','#exportCsvBtn','#exportJsonBtn','#studioBtn'].forEach(function(sel){ var el=tb.querySelector(sel); if(el&&el.style.display!=='none') el.style.setProperty('display','none','important'); });
  if(tb.querySelector('.niy-hdr-actions')){ syncDisabled(tb); return; }
  var wrap=document.createElement('div'); wrap.className='niy-hdr-actions';
  var btn=document.createElement('button'); btn.type='button'; btn.className='niy-ha-trig'; btn.setAttribute('aria-haspopup','true');
  btn.innerHTML=TRIG+'<span>Export &amp; options</span><span class="cv" aria-hidden="true">\u25be</span>';
  var menu=document.createElement('div'); menu.className='niy-ha-menu'; menu.setAttribute('role','menu');
  menu.appendChild(mkItem(ICO.csv,'Export CSV',function(){ clickById('exportCsvBtn'); },'exportCsvBtn'));
  menu.appendChild(mkItem(ICO.json,'Export JSON',function(){ clickById('exportJsonBtn'); },'exportJsonBtn'));
  menu.appendChild(mkItem(ICO.studio,'Open in Studio',function(){ clickById('studioBtn'); },'studioBtn'));
  var sep=document.createElement('div'); sep.className='niy-ha-sep'; menu.appendChild(sep);
  menu.appendChild(mkItem(ICO.print,'Print / PDF',function(){ try{ window.print(); }catch(e){} }));
  menu.appendChild(mkItem(ICO.ai,'Ask AI about this',function(){ askAi(); }));
  btn.addEventListener('click',function(e){ e.stopPropagation(); var o=document.querySelectorAll('.niy-hdr-actions.open'); for(var i=0;i<o.length;i++) if(o[i]!==wrap) o[i].classList.remove('open'); wrap.classList.toggle('open'); });
  menu.addEventListener('click',function(){ wrap.classList.remove('open'); });
  wrap.appendChild(btn); wrap.appendChild(menu); tb.appendChild(wrap);
  syncDisabled(tb);
}
var t=null; function deb(){ clearTimeout(t); t=setTimeout(inject,80); }
function closeAll(){ var o=document.querySelectorAll('.niy-hdr-actions.open'); for(var i=0;i<o.length;i++) o[i].classList.remove('open'); }
function arm(){
  inject();
  var d=byId('detail'); if(d&&window.MutationObserver) new MutationObserver(deb).observe(d,{childList:true,subtree:true});
  document.addEventListener('click',closeAll);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeAll(); });
  setTimeout(inject,700); setTimeout(inject,1800);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',arm); else arm();
})();
