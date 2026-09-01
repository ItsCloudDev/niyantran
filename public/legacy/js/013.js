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
  function build(){ try{
    /* --- header tier switcher --- */
    var tb=document.querySelector('#detail .toolbar');
    if(tb && !tb.querySelector('.niy-hdr-tier')){
      var cur=(typeof activeTier!=='undefined')?activeTier:'geopolitics';
      var c=T.filter(function(t){return t[0]===cur;})[0]||T[1];
      var w=document.createElement('div'); w.className='niy-hdr-tier'; w.tabIndex=0;
      w.innerHTML=ico(c[2]).replace('<svg','<svg class="ico"')+'<span class="nm">'+c[1]+'</span>'+
        '<svg class="cv" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></svg>'+
        '<div class="niy-hdr-menu"></div>';
      var m=w.querySelector('.niy-hdr-menu');
      T.forEach(function(t){
        var b=document.createElement('button'); b.type='button';
        b.innerHTML=ico(t[2])+'<span>'+t[1]+'</span>';
        if(t[0]===cur) b.className='on';
        b.addEventListener('click',function(e){ e.stopPropagation(); try{ if(window.niyGoto) window.niyGoto(t[0],''); }catch(x){} });
        m.appendChild(b);
      });
      tb.insertBefore(w, tb.firstChild);
    } else if(tb){
      var cur2=(typeof activeTier!=='undefined')?activeTier:'';
      var c2=T.filter(function(t){return t[0]===cur2;})[0];
      var el=tb.querySelector('.niy-hdr-tier');
      if(c2&&el){ var nm=el.querySelector('.nm'); if(nm&&nm.textContent!==c2[1]){ nm.textContent=c2[1];
          var sv=el.querySelector('svg.ico'); if(sv) sv.innerHTML=c2[2]; }
        el.querySelectorAll('.niy-hdr-menu button').forEach(function(b,i){ b.classList.toggle('on', T[i][0]===cur2); }); }
    }
    /* --- profile pinned at the rail foot --- */
    var p=document.querySelector('#sidebar .niy-sb-panel');
    if(p && !p.querySelector('.niy-rail-foot')){
      var f=document.createElement('div'); f.className='niy-rail-foot';
      var a=document.createElement('button'); a.type='button'; a.className='niy-avatar';
      var who=(document.querySelector('.niy-acc-name')||{}).textContent||'Analyst';
      a.textContent=who.trim().charAt(0).toUpperCase()||'A';
      a.dataset.n=who.trim()||'Account';
      a.addEventListener('click',function(){ var t=document.querySelector('.niy-acc-btn,[class*="acct"],[class*="account"]'); if(t&&t.click) t.click(); });
      f.appendChild(a); p.appendChild(f);
    }
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  setTimeout(build,700); setInterval(build,1100);
})();