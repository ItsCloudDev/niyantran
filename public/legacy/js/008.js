(function(){
  var G={
    security:'<path d="M12 3l7.5 3v6.2c0 4.3-3.1 7.6-7.5 9.3-4.4-1.7-7.5-5-7.5-9.3V6z"/><path d="M9.4 12.2l1.9 1.9 3.6-3.8"/>',
    intel:'<circle cx="12" cy="7.5" r="3.2"/><path d="M4.6 20.5c.4-3.9 3.6-6.6 7.4-6.6s7 2.7 7.4 6.6"/><path d="M16.6 6.2l3.4-2M16.6 9l3.9.6"/>',
    diplomacy:'<path d="M7.5 12.4 10 10l2.4 2.3 2.3-2.3 2.5 2.4-4.8 4.8-2.4-2.3-2.4 2.3z"/><path d="M3 8.6 6.4 5.2l2.3 2.3M21 8.6l-3.4-3.4-2.3 2.3"/>',
    assets:'<path d="M12 21s6.6-5.8 6.6-10.6A6.6 6.6 0 0 0 5.4 10.4C5.4 15.2 12 21 12 21z"/><path d="M12 7.6v4.6M9.7 9.9h4.6"/>',
    geoecon:'<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.5 2.6 2.5 14.2 0 16.8M12 3.6c-2.5 2.6-2.5 14.2 0 16.8"/>',
    markets:'<path d="M3 19.4h18"/><path d="M6.2 15.6V11M11 15.6V6.6M15.8 15.6v-6M20.6 15.6v-3.4"/>',
    law:'<path d="M12 4v16M7 20h10"/><path d="m5 9 3.4-3.4M19 9l-3.4-3.4"/><path d="M2.4 12.4 5 8l2.6 4.4a2.7 2.7 0 0 1-5.2 0zM16.4 12.4 19 8l2.6 4.4a2.7 2.7 0 0 1-5.2 0z"/>',
    gov:'<path d="M3.4 20.6h17.2M5.4 20.6V9.8M9.6 20.6V9.8M14.4 20.6V9.8M18.6 20.6V9.8"/><path d="M12 3.2 21 8.4H3z"/>',
    climate:'<path d="M4.6 20.4c0-8.2 5.2-13.4 14.8-14.8 0 9.6-5.2 14.8-14.8 14.8z"/><path d="M4.6 20.4c3.2-5.4 6.4-8.6 10.6-10.8"/>',
    data:'<ellipse cx="12" cy="6" rx="7.4" ry="2.9"/><path d="M4.6 6v11.6c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9V6"/><path d="M4.6 11.8c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9"/>',
    media:'<rect x="3" y="5.6" width="13" height="12.8" rx="2.2"/><path d="m16 11 5-2.8v7.6L16 13z"/>',
    people:'<circle cx="8.6" cy="8.4" r="3.1"/><path d="M2.8 19.6c0-3.2 2.6-5.8 5.8-5.8s5.8 2.6 5.8 5.8"/><circle cx="17" cy="9.4" r="2.4"/><path d="M15 14.2c2.9-.5 5.4 1.3 5.4 4.2"/>',
    doc:'<path d="M14.4 3.4H7.6a2.2 2.2 0 0 0-2.2 2.2v12.8a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2V7.6z"/><path d="M14.4 3.4v4.2h4.2M9 12.6h6M9 16.2h4"/>'
  };
  var R=[[/secur|conflict|war|defen|milit|border|maritime/i,'security'],[/intellig|analys|research|monitor|watch/i,'intel'],
    [/diplom|allianc|foreign|external|treaty/i,'diplomacy'],[/asset|infra|strateg|project|resource/i,'assets'],
    [/geoecon|econom|trade|commerc/i,'geoecon'],[/market|finance|invest|stock|budget|fund|tax/i,'markets'],
    [/law|judic|court|legal|justice/i,'law'],[/govern|legislat|parliament|policy|bill|administ|bureau|cabinet/i,'gov'],
    [/climate|carbon|environment|energy|green/i,'climate'],[/data|studio|dataset|archive/i,'data'],
    [/media|stream|broadcast|news|press/i,'media'],[/people|leader|candidate|officer|profile|elect/i,'people']];
  function pick(t){ for(var i=0;i<R.length;i++) if(R[i][0].test(t)) return G[R[i][1]]; return G.doc; }
  function paint(){ try{
    document.querySelectorAll('#sidebar .sidebar-group-label').forEach(function(l){
      if(!l.querySelector('.niy-gicon')){
        var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
        s.setAttribute('viewBox','0 0 24 24'); s.innerHTML=pick(l.textContent||'');
        var w=document.createElement('span'); w.className='niy-gicon'; w.title=(l.textContent||'').replace(/\d+|[▸▾]/g,'').trim();
        w.appendChild(s); l.insertBefore(w,l.firstChild);
      }
      var g=l.parentElement; if(g) g.classList.toggle('has-active', !!g.querySelector('.feat-item.active'));
    });
    // logo => HOME
    var img=document.querySelector('.topbar .brand img')||document.querySelector('.brand img');
    if(img&&!img.dataset.homeWired){ img.dataset.homeWired='1'; img.title='Home';
      img.addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto('ndesk',''); }catch(e){} }); }
    // ticker only on Home
    try{ document.body.classList.toggle('niy-feature', typeof activeTier!=='undefined' && activeTier!=='ndesk'); }catch(e){}
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
  setTimeout(paint,600); setInterval(paint,1200);
})();