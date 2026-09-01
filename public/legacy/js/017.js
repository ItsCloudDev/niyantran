(function(){
  var T=[
    ['ndesk','Home','<path d="M3.2 11 12 3.4 20.8 11M5.4 9.3V20h4.4v-5.6h4.4V20h4.4V9.3"/>'],
    ['geopolitics','Global','<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.5 2.6 2.5 14.6 0 17.2M12 3.4c-2.5 2.6-2.5 14.6 0 17.2"/>'],
    ['national','National','<path d="M3.6 20.4h16.8M5.6 20.4V10.2M9.9 20.4V10.2M14.1 20.4V10.2M18.4 20.4V10.2"/><path d="M12 3.4 20.4 8.2H3.6z"/>'],
    ['state','State','<path d="M12 20.6s6.4-5.8 6.4-10.6a6.4 6.4 0 1 0-12.8 0c0 4.8 6.4 10.6 6.4 10.6z"/><circle cx="12" cy="10" r="2.3"/>'],
    ['local','Local','<rect x="4" y="4" width="6.4" height="6.4" rx="1.5"/><rect x="13.6" y="4" width="6.4" height="6.4" rx="1.5"/><rect x="4" y="13.6" width="6.4" height="6.4" rx="1.5"/><rect x="13.6" y="13.6" width="6.4" height="6.4" rx="1.5"/>'],
    ['judiciary','Law','<path d="M12 4.2v15.6M8 19.8h8"/><path d="M6 8.6 12 6l6 2.6"/><path d="M3.4 13.2 6 8.6l2.6 4.6a2.6 2.6 0 0 1-5.2 0zM15.4 13.2 18 8.6l2.6 4.6a2.6 2.6 0 0 1-5.2 0z"/>'],
    ['finance','Economics','<path d="M4 19.6h16"/><path d="M7.2 16V11.4M11.6 16V7.2M16 16V9.6M20 16v-3.2"/>'],
    ['climate','Carbon','<path d="M5.2 19.8c0-7.8 5-12.8 14.2-14.2 0 9.2-5 14.2-14.2 14.2z"/><path d="M5.2 19.8c3.1-5.1 6.2-8.2 10.1-10.3"/>'],
    ['sports','Sports','<path d="M8 4.4h8v4.6a4 4 0 0 1-8 0z"/><path d="M8 5.6H5.4a2.7 2.7 0 0 0 2.9 3M16 5.6h2.6a2.7 2.7 0 0 1-2.9 3"/><path d="M12 13v2.6M9.4 19.6h5.2M10.2 15.6h3.6v4h-3.6z"/>'],
    ['entertainment','Entertainment','<path d="M4 10h16v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z"/><path d="m4 10-1-3.4L19.4 3l1 3.4z"/><path d="m7.6 9 2.3-3.7M12.4 7.7l2.3-3.7"/>'],
    ['datastudio','Studio','<ellipse cx="12" cy="6.4" rx="7" ry="2.7"/><path d="M5 6.4v11.2c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7V6.4"/><path d="M5 12c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7"/>']
  ];
  function ico(d){ return '<svg viewBox="0 0 24 24">'+d+'</svg>'; }
  function goto(t){ try{ document.body.classList.remove('niy-alt-view'); if(window.niyGoto) window.niyGoto(t,''); }catch(e){} }

  function studioHeader(){
    var ds=document.getElementById('dataStudio');
    if(!ds || ds.querySelector('.niy-st-top')) return;
    var bar=document.createElement('div'); bar.className='niy-st-top';
    var logoImg=document.querySelector('.niy-rail-logo img,.brand img');
    bar.innerHTML='<button type="button" class="st-logo" title="Home">'+(logoImg?'<img src="'+logoImg.src+'" alt="Home"/>':'<b>\u0928</b>')+'</button>'
      +'<span class="st-t">Studio</span><span class="st-sub">Boards, tables, briefs</span><span class="st-sp"></span>';
    bar.querySelector('.st-logo').addEventListener('click',function(){ goto('ndesk'); });
    var w=document.createElement('div'); w.className='niy-hdr-tier'; w.tabIndex=0;
    w.innerHTML=ico(T[8][2]).replace('<svg','<svg class="ico"')+'<span class="nm">Studio</span>'
      +'<svg class="cv" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></svg>'
      +'<div class="niy-hdr-menu"></div>';
    var m=w.querySelector('.niy-hdr-menu');
    T.forEach(function(t){
      var b=document.createElement('button'); b.type='button';
      b.innerHTML=ico(t[2])+'<span>'+t[1]+'</span>';
      if(t[0]==='datastudio') b.className='on';
      b.addEventListener('click',function(e){ e.stopPropagation(); goto(t[0]); });
      m.appendChild(b);
    });
    bar.appendChild(w);
    ds.insertBefore(bar, ds.firstChild);
  }

  function profileMenu(){
    var av=document.querySelector('.niy-avatar');
    var foot=document.querySelector('.niy-rail-foot');
    if(!av||!foot||av.getAttribute('data-niy-prof')) return;
    var nu=av.cloneNode(true); nu.setAttribute('data-niy-prof','1');
    av.parentNode.replaceChild(nu,av); av=nu;
    var menu=document.createElement('div'); menu.className='niy-prof';
    var who=(av.dataset.n||'Analyst');
    menu.innerHTML='<div class="pf-id"><span class="pf-av">'+(who.charAt(0).toUpperCase())+'</span>'
      +'<span><div class="pf-n">'+who+'</div><div class="pf-s">Niyantran Terminal \u00b7 Pilot access</div></span></div>'
      +'<div class="pf-lbl">Density</div>'
      +'<div class="pf-seg"><button type="button" data-d="comfortable">Comfortable</button><button type="button" data-d="compact">Compact</button></div>'
      +'<div class="pf-div"></div>'
      +'<button type="button" class="pf-it" data-a="home">'+ico('<path d="M3.2 11 12 3.4 20.8 11M5.4 9.3V20h4.4v-5.6h4.4V20h4.4V9.3"/>')+'Go to Home</button>'
      +'<button type="button" class="pf-it" data-a="refresh">'+ico('<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/>')+'Refresh all data</button>'
      +'<div class="pf-div"></div>'
      +'<button type="button" class="pf-it out" data-a="signout">'+ico('<path d="M9 20H5a1.6 1.6 0 0 1-1.6-1.6V5.6A1.6 1.6 0 0 1 5 4h4M15.5 16.5 20 12l-4.5-4.5M20 12H9.4"/>')+'Sign out</button>';
    foot.appendChild(menu);
    function paintD(){ var d=localStorage.getItem('niyV2Density')||'comfortable';
      document.body.classList.toggle('niy-compact', d==='compact');
      menu.querySelectorAll('.pf-seg button').forEach(function(b){ b.classList.toggle('on', b.dataset.d===d); }); }
    paintD();
    menu.addEventListener('click',function(e){
      var seg=e.target.closest('.pf-seg button');
      if(seg){ localStorage.setItem('niyV2Density',seg.dataset.d); paintD(); return; }
      var it=e.target.closest('.pf-it'); if(!it) return;
      if(it.dataset.a==='home'){ try{ document.body.classList.remove('niy-alt-view'); if(window.niyGoto) window.niyGoto('ndesk',''); }catch(x){} }
      if(it.dataset.a==='refresh'){ location.reload(); }
      if(it.dataset.a==='signout'){ try{ sessionStorage.removeItem('niyantranAuthed'); }catch(x){} location.reload(); }
      menu.classList.remove('open');
    });
    av.addEventListener('click',function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click',function(){ menu.classList.remove('open'); });
  }

  function boot(){ try{
    var d=localStorage.getItem('niyV2Density');
    if(d==='compact') document.body.classList.add('niy-compact');
  }catch(e){} }
  function tick(){ try{ studioHeader(); profileMenu(); }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot();tick();});else{boot();tick();}
  setTimeout(tick,800); setInterval(tick,1300);
})();