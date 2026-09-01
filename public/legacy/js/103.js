
/* ============================================================================
   THE BRAIN — GALAXY SKIN  ·  2026-08-18
   The company Brain rendered as a living spiral galaxy: nodes laid out as an
   even Milky-Way spiral, slow rotation, starfield + glowing core, colour-per-
   type "stars", a galaxy legend, and zoom-into-region on selection.
   ADDITIVE: no edits to NiyBrain logic. Three small marked edits in the
   NiyBrain draw code route through window.__galaxyBg / window.__NB_PAL /
   window.__brainShape and a zoom bump. Delete this block + revert those to
   restore the original Brain.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__NB_SKIN) return; window.__NB_SKIN = 1;

  window.__NB_LIGHT = false;  // dark neural / deep-space background
  // colour carries node type on the dark field
  window.__NB_PAL = {
    event:'#8fb3ff',        // pale blue — the many stars (events)
    company:'#57c7ff',      // cyan — companies
    sector:'#ffd166',       // gold — sector hubs
    institution:'#ff7a6b',  // coral — institutions
    theme:'#c79bff',        // violet — themes
    commodity:'#5ce0b0',    // teal — commodities
    geography:'#ff9ed2',    // pink — geographies
    dataset:'#7f8aa3'
  };
  var PAL = window.__NB_PAL;
  var TYPE_LABEL={event:'Events',company:'Companies',sector:'Sectors',institution:'Institutions',theme:'Themes',commodity:'Commodities',geography:'Geographies',dataset:'Datasets'};

  function hash01(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return ((h>>>0)%100000)/100000; }

  /* ---- galaxy layout: even spiral (Milky-Way) ---------------------------- */
  window.__brainShape = function (pos, G) {   // name kept so the 2 core call-sites don't change
    var ids = Object.keys(pos || {}); if (ids.length < 8) return;
    var i, p, sx=0, sy=0, m=0;
    for (i=0;i<ids.length;i++){ p=pos[ids[i]]; if(!p||!isFinite(p.x)||!isFinite(p.y))continue; sx+=p.x; sy+=p.y; m++; }
    if(!m) return;
    var cx=sx/m, cy=sy/m;
    var dists=[]; for(i=0;i<ids.length;i++){ p=pos[ids[i]]; if(!p||!isFinite(p.x))continue; dists.push(Math.hypot(p.x-cx,p.y-cy)); }
    dists.sort(function(a,b){return a-b;}); var S=(dists[Math.floor(dists.length*0.92)]||600)*1.15;
    // preserve cluster adjacency by keeping each node's ANGLE from the force layout;
    // set RADIUS by degree rank (hubs form the bright bulge), then add a spiral twist.
    var arr=ids.map(function(id){ var q=pos[id]; return { id:id, ang:Math.atan2(q.y-cy,q.x-cx), deg:(G.nodes[id]&&G.nodes[id].degree)||1, h:hash01(id) }; });
    arr.sort(function(a,b){ return b.deg-a.deg; });   // high degree first → centre
    var N=arr.length, CORE=S*0.16, TWIST=1.55;
    for(i=0;i<N;i++){ var a=arr[i]; var t=(i+0.6)/N;
      var r = S*Math.pow(t,0.55) * (0.82+0.36*a.h);              // sqrt-ish → even area density + jitter
      var ang = a.ang + TWIST*Math.log(1+r/CORE) + (a.h-0.5)*0.30; // log-spiral arms + slight scatter
      var q=pos[a.id]; q.x=cx+Math.cos(ang)*r; q.y=cy+Math.sin(ang)*r;
    }
    window.__NB_pos=pos; window.__NB_gc={cx:cx,cy:cy,S:S}; window.__NB_galaxyReady=true;
  };

  /* ---- deep-space background: gradient + starfield + core glow ------------ */
  var STARS=null;
  function makeStars(){ STARS=[]; var seed=1234567; function rnd(){ seed=(Math.imul(seed,1103515245)+12345)&0x7fffffff; return seed/0x7fffffff; }
    for(var i=0;i<320;i++){ STARS.push({x:rnd(),y:rnd(),r:0.4+rnd()*1.3,a:0.25+rnd()*0.6,ph:rnd()*6.28,sp:0.6+rnd()*1.6}); } }
  window.__galaxyBg = function(ctx,w,h,toScreen){
    if(!STARS) makeStars();
    var g=ctx.createRadialGradient(w*0.5,h*0.5,30, w*0.5,h*0.5, Math.max(w,h)*0.85);
    g.addColorStop(0,'#0b1220'); g.addColorStop(0.5,'#070b14'); g.addColorStop(1,'#03040a');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    var t=(window.performance&&performance.now?performance.now():0)*0.001;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(var i=0;i<STARS.length;i++){ var s=STARS[i]; var a=s.a*(0.55+0.45*Math.sin(t*s.sp+s.ph));
      ctx.globalAlpha=a; ctx.fillStyle='#cfe0ff'; ctx.beginPath(); ctx.arc(s.x*w,s.y*h,s.r,0,6.2832); ctx.fill(); }
    var gc=window.__NB_gc;
    if(gc && toScreen){ var cs=toScreen(gc.cx,gc.cy); var cr=Math.max(w,h)*0.16;
      var cg=ctx.createRadialGradient(cs[0],cs[1],0,cs[0],cs[1],cr);
      cg.addColorStop(0,'rgba(255,244,214,0.42)'); cg.addColorStop(0.35,'rgba(255,208,150,0.14)'); cg.addColorStop(1,'rgba(255,208,150,0)');
      ctx.globalAlpha=1; ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cs[0],cs[1],cr,0,6.2832); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
  };

  /* ---- slow rotation (the galaxy turns) ---------------------------------- */
  var rotPaused=false;
  function spin(){
    requestAnimationFrame(spin);
    if(rotPaused || !window.__NB_galaxyReady) return;
    var b=document.getElementById('niyBrain'); if(!b||!b.classList.contains('show')) return;
    var pos=window.__NB_pos, gc=window.__NB_gc; if(!pos||!gc) return;
    var d=0.0011, c=Math.cos(d), sn=Math.sin(d);   // ~0.063°/frame → gentle drift
    for(var id in pos){ var p=pos[id]; if(!p||!isFinite(p.x))continue; var dx=p.x-gc.cx, dy=p.y-gc.cy; p.x=gc.cx+dx*c-dy*sn; p.y=gc.cy+dx*sn+dy*c; }
  }
  requestAnimationFrame(spin);

  var CSS = [
    '#niyBrain{background:#03040a !important;color:#e8edf6 !important}',
    '#niyBrain .nb-top{background:linear-gradient(180deg,#0a1020,#05070f) !important;border-bottom:1px solid #141d2c !important}',
    '#niyBrain .nb-title{color:#fff !important}',
    '#niyBrain .nb-sub,#niyBrain .nb-disclaimer{color:#5f6b82 !important}',
    '#niyBrain .nb-filters{background:rgba(6,10,20,.55) !important;border-bottom:1px solid #141d2c !important;backdrop-filter:blur(3px)}',
    '#niyBrain .nb-filters label{color:#aab4c6 !important}',
    '#niyBrain #nbSearch{background:#0a1120 !important;border:1px solid #26324a !important;color:#e8edf6 !important}',
    '#niyBrain #nbSearch::placeholder{color:#54607a !important}',
    '#niyBrain .seg{border:1px solid #26324a !important;border-radius:7px;overflow:hidden}',
    '#niyBrain .seg button{background:#0d1526 !important;color:#cdd6e6 !important;border:0 !important}',
    '#niyBrain .seg button.on{background:#e2603a !important;color:#fff !important}',
    '#niyBrain .nb-rebuild{background:#0d1526 !important;color:#cdd6e6 !important;border:1px solid #26324a !important}',
    '#niyBrain .nb-rebuild:hover{background:#16203a !important}',
    '#niyBrain .nb-legend{background:rgba(6,10,20,.66) !important;border:1px solid #1b2740 !important;color:#c4cee0 !important;border-radius:11px !important;padding:11px 14px !important;backdrop-filter:blur(6px)}',
    '#niyBrain .nb-legend .lg{display:flex !important;align-items:center;gap:10px;cursor:pointer;padding:3px 2px !important;font-size:12px;letter-spacing:.02em;color:#c4cee0}',
    '#niyBrain .nb-legend .lg.off{opacity:.32}',
    '#niyBrain .nb-legend .nbdot{width:11px;height:11px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}',
    '#niyBrain .nb-legend .nbhdr{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6b7790;margin-bottom:7px}',
    '#niyBrain .nb-panel{background:rgba(8,12,22,.94) !important;border-left:1px solid #141d2c !important;color:#dbe2ee !important}',
    '#niyBrain .nb-panel *{border-color:#1a2436 !important}',
    '#niyBrain .nb-tip{background:rgba(6,10,18,.96) !important;border:1px solid #26324a !important;color:#e8edf6 !important}',
    '#niyBrain .nb-hud button{background:#0d1526 !important;color:#cdd6e6 !important;border:1px solid #26324a !important}',
    '#niyBrain #nbZoom{color:#8592a8 !important}',
    '#niyBrain .nb-toast{background:#0d1526 !important;color:#e8edf6 !important;border:1px solid #26324a !important}',
    '#niyBrain .nb-table-wrap{background:#070b14 !important;color:#dbe2ee !important}',
    '#niyBrain .nb-table th{background:#0b1220 !important;color:#aab4c6 !important;border-color:#1a2436 !important}',
    '#niyBrain .nb-table td{border-color:#0f1826 !important;color:#cdd6e6 !important}',
    '#niyBrain .nb-fresh{color:#7a869c !important}',
    '#nbSearchWrap{position:relative;display:inline-block}',
    '#nbSearchGo{margin-left:-30px;background:transparent;border:0;color:#8592a8;cursor:pointer;font-size:14px}',
    '#nbSuggest{position:absolute;left:0;top:calc(100% + 4px);width:320px;max-height:340px;overflow:auto;background:#0a1120;border:1px solid #26324a;border-radius:9px;z-index:40;box-shadow:0 12px 34px rgba(0,0,0,.6);display:none}',
    '#nbSuggest.show{display:block}',
    '#nbSuggest .row{display:flex;align-items:center;gap:9px;padding:7px 11px;cursor:pointer;font-size:12.5px;color:#dbe2ee}',
    '#nbSuggest .row:hover,#nbSuggest .row.sel{background:#152139}',
    '#nbSuggest .dot{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor}',
    '#nbSuggest .ty{margin-left:auto;font-size:10px;color:#7a869c;text-transform:uppercase;letter-spacing:.05em}',
    '#nbSuggest .empty{padding:12px;color:#7a869c;font-size:12px}',
    '#nbFilterSel{margin-left:8px;background:#0a1120;border:1px solid #26324a;color:#cdd6e6;border-radius:7px;padding:5px 8px;font-size:12px;font-family:inherit;max-width:210px}',
    '#nbFilterClear{margin-left:4px;background:#0d1526;border:1px solid #26324a;color:#8592a8;border-radius:7px;padding:5px 9px;font-size:12px;cursor:pointer;display:none}'
  ].join('');
  function injectCss(){ if(document.getElementById('nbSkinCss')) return; var s=document.createElement('style'); s.id='nbSkinCss'; s.textContent=CSS; document.head.appendChild(s); }

  // galaxy legend: colour dots + a header (replaces the shape swatches, keeps toggle behaviour)
  function styleLegend(){
    var box=document.querySelector('#niyBrain .nb-legend'); if(!box) return;
    if(!box.querySelector('.nbhdr')){ var hd=document.createElement('div'); hd.className='nbhdr'; hd.textContent='Populations'; box.insertBefore(hd, box.firstChild); }
    box.querySelectorAll('.lg').forEach(function(row){ if(row.getAttribute('data-dotted'))return; var t=row.getAttribute('data-t'); var c=PAL[t]||'#8592a8';
      row.innerHTML='<span class="nbdot" style="background:'+c+';color:'+c+'"></span><span>'+(TYPE_LABEL[t]||t)+'</span>'; row.setAttribute('data-dotted','1'); });
  }

  /* ---- search + filter + zoom-on-select ---------------------------------- */
  var wrapped=false, sugEl=null, inputEl=null, filterSel=null, filterClear=null, _flying=false;
  function nodesList(){ try{ var G=window.NiyBrain.graph.ensure(); var out=[]; for(var id in G.nodes){ var n=G.nodes[id]; if(n.label) out.push(n); } return out; }catch(e){ return []; } }
  function runSearch(q){ q=(q||'').toLowerCase().trim(); if(!q){ sugEl.classList.remove('show'); return; }
    var all=nodesList(), hits=[];
    for(var i=0;i<all.length;i++){ var n=all[i]; var idx=(n.label||'').toLowerCase().indexOf(q); if(idx<0)continue; hits.push({n:n,sc:idx*4+Math.max(0,20-(n.degree||0))}); }
    hits.sort(function(a,b){return a.sc-b.sc;}); hits=hits.slice(0,14);
    if(!hits.length){ sugEl.innerHTML='<div class="empty">No match for “'+esc(q)+'”</div>'; sugEl.classList.add('show'); return; }
    sugEl.innerHTML=hits.map(function(h,i){ var c=PAL[h.n.type]||'#8592a8'; return '<div class="row'+(i===0?' sel':'')+'" data-lbl="'+esc(h.n.label)+'"><span class="dot" style="color:'+c+';background:'+c+'"></span><span>'+esc(clip(h.n.label,34))+'</span><span class="ty">'+(TYPE_LABEL[h.n.type]||h.n.type)+'</span></div>'; }).join('');
    sugEl.classList.add('show');
    sugEl.querySelectorAll('.row').forEach(function(r){ r.addEventListener('mousedown', function(ev){ ev.preventDefault(); pick(r.getAttribute('data-lbl')); }); });
  }
  function pick(lbl){ sugEl.classList.remove('show'); inputEl.value=lbl; inputEl.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); }
  var FILTER_GROUPS=[['company','Companies'],['sector','Sectors'],['theme','Themes'],['institution','Institutions'],['commodity','Commodities'],['geography','Geographies']];
  function fillFilter(){ if(!filterSel) return; var all=nodesList(); if(!all.length||filterSel.options.length>1) return;
    var byType={}; all.forEach(function(n){ (byType[n.type]=byType[n.type]||[]).push(n.label); });
    var html='<option value="">Filter: company, sector, theme…</option>';
    FILTER_GROUPS.forEach(function(g){ var arr=(byType[g[0]]||[]).slice().sort(); if(!arr.length)return; html+='<optgroup label="'+g[1]+'">'+arr.map(function(l){return '<option value="'+esc(l)+'">'+esc(clip(l,30))+'</option>';}).join('')+'</optgroup>'; });
    filterSel.innerHTML=html;
  }
  function clearFilter(){ if(filterSel)filterSel.value=''; if(filterClear)filterClear.style.display='none'; rotPaused=false; try{window.NiyBrain.ui.onSelect(null);}catch(e){} }

  function wireControls(){
    if(wrapped) return true;
    inputEl=document.querySelector('#niyBrain #nbSearch'); if(!inputEl) return false;
    var wrap=document.createElement('span'); wrap.id='nbSearchWrap'; inputEl.parentNode.insertBefore(wrap,inputEl); wrap.appendChild(inputEl);
    var go=document.createElement('button'); go.id='nbSearchGo'; go.type='button'; go.innerHTML='🔍'; go.title='Search'; wrap.appendChild(go);
    sugEl=document.createElement('div'); sugEl.id='nbSuggest'; wrap.appendChild(sugEl);
    inputEl.setAttribute('placeholder','Search company, event, sector…  ( / )');
    inputEl.addEventListener('input', function(){ runSearch(inputEl.value); });
    inputEl.addEventListener('focus', function(){ if(inputEl.value) runSearch(inputEl.value); });
    inputEl.addEventListener('blur', function(){ setTimeout(function(){ sugEl.classList.remove('show'); },150); });
    go.addEventListener('click', function(){ inputEl.focus(); runSearch(inputEl.value); });
    var bar=document.querySelector('#niyBrain .nb-filters');
    if(bar){ filterSel=document.createElement('select'); filterSel.id='nbFilterSel'; filterSel.title='Filter: zoom into a sector, theme…'; bar.appendChild(filterSel);
      filterClear=document.createElement('button'); filterClear.id='nbFilterClear'; filterClear.type='button'; filterClear.textContent='✕ clear'; bar.appendChild(filterClear);
      filterSel.addEventListener('change', function(){ var l=filterSel.value; if(!l){ clearFilter(); return; } pick(l); filterClear.style.display='inline-block'; });
      filterClear.addEventListener('click', clearFilter);
    }
    // wrap onSelect → zoom into the selected node's region + pause the galaxy so it stays put
    try{ var orig=window.NiyBrain.ui.onSelect; window.NiyBrain.ui.onSelect=function(n){ try{ orig.call(window.NiyBrain.ui,n); }catch(_e){}
      if(n){ rotPaused=true; if(!_flying && n.label){ _flying=true; try{ inputEl.value=n.label; inputEl.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); }finally{ setTimeout(function(){_flying=false;},60);} } }
      else { rotPaused=false; }
    }; }catch(e){}
    wrapped=true; return true;
  }

  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function clip(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }
  function brainShown(){ var b=document.getElementById('niyBrain'); return b&&b.classList.contains('show'); }
  function tick(){ injectCss(); if(brainShown()){ styleLegend(); wireControls(); fillFilter(); } }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setInterval(tick,700); tick(); });
  else { setInterval(tick,700); tick(); }
  console.log('[NB galaxy] loaded');
})();
