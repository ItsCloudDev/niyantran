
/* Teammate request: on tier desks, move the left feature rail to a horizontal
   bar on top; restore the tier tabs + search + profile on top. Home & Studio
   are untouched. The real #sidebar stays in the DOM (hidden) so every existing
   navigation handler/observer keeps working — this bar mirrors it and proxies
   clicks. Pure presentation. */
(function(){
'use strict';
var css=[
"#niyFeatNav{display:none}",
"body.niy-topnav-on .topbar{display:flex!important}",
"body.niy-notabs .tabs{display:none!important}",
"body.niy-topnav-on #sidebar{display:none!important}",
"body.niy-topnav-on .main{grid-template-columns:minmax(0,1fr)!important;height:auto!important;min-height:0!important}",
"body.niy-topnav-on .terminal{height:auto!important;min-height:100vh!important}",
"body.niy-topnav-on #detail{height:calc(100vh - var(--niy-topH,152px))!important;max-height:none!important}",
"body.niy-topnav-on #detail .detail-head .tags{display:none!important}",
"body.niy-topnav-on #niyFeatNav{display:flex;align-items:center;gap:10px;padding:8px 22px;border-bottom:1px solid var(--line);background:var(--panel);position:relative;z-index:40}",
"#niyFeatNav .nfn-group{position:relative;flex:none}",
"#niyFeatNav .nfn-bucket{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-display);font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--fg-dim);background:transparent;border:1px solid var(--line-bright);border-radius:999px;padding:7px 14px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}",
"#niyFeatNav .nfn-bucket svg{width:15px;height:15px;flex:none;stroke:currentColor;fill:none;opacity:.85}",
"#niyFeatNav .nfn-bucket .nfn-caret{font-size:9px;opacity:.5;margin-left:1px;transition:transform .15s}",
"#niyFeatNav .nfn-group:hover .nfn-bucket,#niyFeatNav .nfn-bucket:focus-visible{color:var(--fg);border-color:var(--fg-dim)}",
"#niyFeatNav .nfn-group:hover .nfn-caret,#niyFeatNav .nfn-group.open .nfn-caret{transform:rotate(180deg)}",
"#niyFeatNav .nfn-bucket.active{background:var(--ds-accent);border-color:var(--ds-accent);color:#fff}",
"#niyFeatNav .nfn-bucket.active svg{opacity:1}",
"#niyFeatNav .nfn-flyout{position:absolute;top:calc(100% + 7px);left:0;min-width:212px;max-height:min(62vh,440px);overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:7px;background:var(--panel);border:1px solid var(--line-bright);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.28);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .14s,transform .14s,visibility .14s;z-index:60}",
"#niyFeatNav .nfn-group:hover .nfn-flyout,#niyFeatNav .nfn-group.open .nfn-flyout,#niyFeatNav .nfn-flyout:hover{opacity:1;visibility:visible;transform:translateY(0)}",
"#niyFeatNav .nfn-flyout::before{content:'';position:absolute;bottom:100%;left:0;right:0;height:9px}",
"#niyFeatNav .nfn-item{flex:none;text-align:left;font-family:var(--font-display);font-size:12.5px;font-weight:500;letter-spacing:.01em;color:var(--fg-dim);background:transparent;border:0;border-radius:7px;padding:8px 11px;cursor:pointer;white-space:nowrap;transition:background .12s,color .12s}",
"#niyFeatNav .nfn-item:hover{background:var(--ds-accent-dim);color:var(--fg)}",
"#niyFeatNav .nfn-item.active{background:var(--ds-accent);color:#fff}",
"body.niy-topnav-on #detail .niy-hdr-tier{display:none!important}",
"#niyFeatNav .nfn-tiergrp{position:relative;flex:none}",
"#niyFeatNav .nfn-tier{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-display);font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--fg);background:var(--ds-accent-dim);border:1px solid var(--ds-accent-line);border-radius:999px;padding:7px 15px;cursor:pointer;white-space:nowrap;transition:background .15s}",
"#niyFeatNav .nfn-tier::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--ds-accent);flex:none}",
"#niyFeatNav .nfn-tier:hover{background:var(--ds-accent-line)}",
"#niyFeatNav .nfn-tier .nfn-caret{font-size:9px;opacity:.6;margin-left:1px;transition:transform .15s}",
"#niyFeatNav .nfn-tiergrp.open .nfn-caret,#niyFeatNav .nfn-tiergrp:hover .nfn-caret{transform:rotate(180deg)}",
"#niyFeatNav .nfn-tdiv{width:1px;height:22px;background:var(--line-bright);flex:none;margin:0 4px}"
].join('');
var st=document.createElement('style'); st.id='niy-topnav-css'; st.textContent=css; document.head.appendChild(st);
function curTier(){ try{ return activeTier; }catch(e){ return null; } }
function onDesk(){ var t=curTier(); return !!t && t!=='ndesk' && t!=='datastudio'; }
function ensureNav(){
  var nav=document.getElementById('niyFeatNav');
  if(!nav){ nav=document.createElement('nav'); nav.id='niyFeatNav'; nav.setAttribute('aria-label','Feature navigation');
    var main=document.querySelector('.main');
    if(main&&main.parentNode) main.parentNode.insertBefore(nav,main); else document.body.appendChild(nav);
  }
  return nav;
}
function measure(){ try{ var h=0; ['.topbar','.tabs','#niyFeatNav'].forEach(function(s){ var el=document.querySelector(s); if(el&&el.offsetParent!==null) h+=el.offsetHeight; }); if(h>0) document.documentElement.style.setProperty('--niy-topH',h+'px'); }catch(e){} }
function clean(s){ return String(s||'').replace(/\s*(AI|BETA)\s*$/,'').trim(); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function iconFor(name){
  var n=(name||'').toLowerCase(), p;
  if(/secur|defen|conflict|front|threat|\bwar\b|military|border/.test(n)) p='<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>';
  else if(/diplo|allianc|sanction|\baid\b|foreign|treaty|trade/.test(n)) p='<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.6 2.6 2.6 13.4 0 16M12 4c-2.6 2.6-2.6 13.4 0 16"/>';
  else if(/legisl|policy|\bbill|parliament|govern|statut|pipeline/.test(n)) p='<path d="M4 9l8-5 8 5M3 20h18M6 9v9M10 9v9M14 9v9M18 9v9"/>';
  else if(/elect|candidat|\bvote|ballot|\bpoll/.test(n)) p='<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M8.5 11l2.3 2.3L16 8"/>';
  else if(/represent|member|leader|minister|official/.test(n)) p='<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>';
  else if(/media|press|\bnews|broadcast|journal|coverage/.test(n)) p='<circle cx="12" cy="12" r="1.8"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M6 6a9 9 0 0 0 0 12M18 6a9 9 0 0 1 0 12"/>';
  else if(/judic|court|order|justice|verdict|tribunal|\blaw\b/.test(n)) p='<path d="M12 4v15M8 20h8M6 7h12M9 7l-3 5h6zM6 12a2.5 2.5 0 0 0 5 0M18 7l-3 5h6zM15 12a2.5 2.5 0 0 0 5 0"/>';
  else if(/financ|market|econom|fiscal|budget|money|stock/.test(n)) p='<path d="M4 20V6M4 20h16M8 16v-4M12 16V8M16 16v-6"/>';
  else if(/climat|weather|environ|carbon|energy|water/.test(n)) p='<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>';
  else if(/sport|\bgame|match|league|athlet/.test(n)) p='<path d="M7 4h10v3.5a5 5 0 0 1-10 0zM7 6H4.5v.8a3 3 0 0 0 3 3M17 6h2.5v.8a3 3 0 0 1-3 3M9.5 20h5M12 15v5"/>';
  else if(/entertain|culture|film|cinema|music|\bart\b|\bshow/.test(n)) p='<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 9.5h16M9 5v14M15 5v14"/>';
  else if(/transit|infra|transport|mobility|logist/.test(n)) p='<path d="M12 3v18M6 8l6-5 6 5M6 8v8l6 5 6-5V8"/>';
  else if(/intel|analys|signal|monitor|pulse|track|graph/.test(n)) p='<path d="M3 12h4l2-6 4 14 3-9 2 3h3"/>';
  else p='<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>';
  return '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
function build(){
  try{
    var on=onDesk();
    var _t=curTier(); var isHome=(!_t||_t==='ndesk');
    if(document.body.classList.contains('niy-topnav-on')!==on) document.body.classList.toggle('niy-topnav-on',on);
    if(document.body.classList.contains('niy-notabs')===isHome) document.body.classList.toggle('niy-notabs',!isHome);
    var nav=ensureNav();
    if(!on){ if(nav.childNodes.length) nav.innerHTML=''; return; }
    var list=document.getElementById('sidebarList');
    var groups=list?list.querySelectorAll('.sidebar-group'):[];
    if(!groups.length){ if(nav.childNodes.length) nav.innerHTML=''; measure(); return; }
    var frag=document.createDocumentFragment();
    var tabs=document.querySelectorAll('.tabs .tab[data-tier]'); if(!tabs.length) tabs=document.querySelectorAll('.tab[data-tier]');
    if(tabs.length){
      var tgrp=document.createElement('div'); tgrp.className='nfn-group nfn-tiergrp';
      var tfly=document.createElement('div'); tfly.className='nfn-flyout'; tfly.setAttribute('role','menu');
      var activeName='';
      tabs.forEach(function(tb){
        var nm=clean((tb.querySelector('.tab-label')||tb).textContent||'');
        var isA=tb.classList.contains('active'); if(isA) activeName=nm;
        var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem');
        b.className='nfn-item'+(isA?' active':''); b.textContent=nm;
        b.addEventListener('click',function(){ tgrp.classList.remove('open'); try{ tb.click(); }catch(e){} });
        tfly.appendChild(b);
      });
      var ttrig=document.createElement('button'); ttrig.type='button'; ttrig.className='nfn-tier'; ttrig.setAttribute('aria-haspopup','true');
      ttrig.innerHTML='<span class="nfn-tlabel">'+esc(activeName||'Section')+'</span><span class="nfn-caret" aria-hidden="true">▾</span>';
      ttrig.addEventListener('click',function(e){ e.stopPropagation(); var w=tgrp.classList.contains('open'); var all=nav.querySelectorAll('.nfn-group.open'); for(var i=0;i<all.length;i++) all[i].classList.remove('open'); if(!w) tgrp.classList.add('open'); });
      tgrp.appendChild(ttrig); tgrp.appendChild(tfly); frag.appendChild(tgrp);
      var tdiv=document.createElement('span'); tdiv.className='nfn-tdiv'; frag.appendChild(tdiv);
    }
    groups.forEach(function(g){
      var gl=g.querySelector('.sidebar-group-label');
      var nmEl=gl?gl.querySelector('.niy-acc-name'):null;
      var gname=((nmEl?nmEl.textContent:(gl?gl.textContent:''))||'').replace(/[\s▾▸►▶‹›«»·|]+$/,'').replace(/\s+\d+$/,'').trim();
      var items=g.querySelectorAll('.feat-item');
      if(!items.length) return;
      var grp=document.createElement('div'); grp.className='nfn-group';
      var fly=document.createElement('div'); fly.className='nfn-flyout'; fly.setAttribute('role','menu');
      var anyActive=false;
      items.forEach(function(fi){
        var isA=fi.classList.contains('active'); if(isA) anyActive=true;
        var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem');
        b.className='nfn-item'+(isA?' active':'');
        b.textContent=clean((fi.querySelector('.label')||{}).textContent||fi.textContent);
        b.addEventListener('click',function(){ grp.classList.remove('open'); try{ fi.click(); }catch(e){} });
        fly.appendChild(b);
      });
      var trig=document.createElement('button'); trig.type='button';
      trig.className='nfn-bucket'+(anyActive?' active':'');
      trig.setAttribute('aria-haspopup','true');
      trig.innerHTML=iconFor(gname)+'<span class="nfn-bname">'+esc(gname||'Section')+'</span><span class="nfn-caret" aria-hidden="true">▾</span>';
      trig.addEventListener('click',function(e){
        e.stopPropagation();
        var wasOpen=grp.classList.contains('open');
        var all=nav.querySelectorAll('.nfn-group.open'); for(var i=0;i<all.length;i++) all[i].classList.remove('open');
        if(!wasOpen) grp.classList.add('open');
      });
      grp.appendChild(trig); grp.appendChild(fly);
      frag.appendChild(grp);
    });
    nav.innerHTML=''; nav.appendChild(frag); measure();
  }catch(e){}
}
var t=null; function deb(){ clearTimeout(t); t=setTimeout(build,60); }
function arm(){
  build();
  try{ if(window.niyGoto && !window.niyGoto.__nfnWrap){ var _g=window.niyGoto; window.niyGoto=function(){ var r=_g.apply(this,arguments); setTimeout(build,50); setTimeout(build,320); return r; }; window.niyGoto.__nfnWrap=true; } }catch(e){}
  var sl=document.getElementById('sidebarList');
  if(sl&&window.MutationObserver) new MutationObserver(deb).observe(sl,{childList:true});
  window.addEventListener('resize',measure);
  document.addEventListener('click',function(){ try{ var o=document.querySelectorAll('#niyFeatNav .nfn-group.open'); for(var i=0;i<o.length;i++) o[i].classList.remove('open'); }catch(e){} });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ try{ var o=document.querySelectorAll('#niyFeatNav .nfn-group.open'); for(var i=0;i<o.length;i++) o[i].classList.remove('open'); }catch(x){} } });
  setTimeout(build,600); setTimeout(build,1800);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',arm); else arm();
})();
