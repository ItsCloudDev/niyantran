/* V2 PASS 31 comms topbar */(function(){
  /* Channel links — paste real URLs here (or set localStorage niyCommsWhatsApp / niyCommsDiscord). Empty = shown as "coming soon", never a fake link. */
  function cfg(k,d){ try{ return localStorage.getItem(k)||d; }catch(e){ return d; } }
  var COMMS={
    whatsapp: cfg('niyCommsWhatsApp',''),
    discord:  cfg('niyCommsDiscord',''),
    email:    cfg('niyCommsEmail','sonal2001tm@gmail.com')
  };
  var BELL='<svg viewBox="0 0 24 24"><path d="M18 9.6a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.4 19.4a1.8 1.8 0 0 0 3.2 0"/></svg>';
  var UPDOWN='<svg viewBox="0 0 24 24"><path d="M8 20V5.6M8 5.6 4.8 8.8M8 5.6l3.2 3.2"/><path d="M16 4v14.4M16 18.4l3.2-3.2M16 18.4l-3.2-3.2"/></svg>';
  var WAP='<svg viewBox="0 0 24 24"><path d="M12 3.4a8.6 8.6 0 0 0-7.4 12.9L3.4 20.6l4.5-1.2A8.6 8.6 0 1 0 12 3.4z"/><path d="M9 8.8c.4 2.8 3.4 5.8 6.2 6.2l1-1.8-2.2-1-1 .8c-.9-.4-1.6-1.1-2-2l.8-1-1-2.2z"/></svg>';
  var MAIL='<svg viewBox="0 0 24 24"><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2"/><path d="m4.4 7 7.6 6 7.6-6"/></svg>';
  var DISC='<svg viewBox="0 0 24 24"><path d="M8.6 5.4C6.8 5.9 5.3 6.7 4.4 7.4 2.9 10.3 2.4 13.6 2.7 16.8c1.5 1.2 3.3 2 4.9 2.4l1-1.9M15.4 5.4c1.8.5 3.3 1.3 4.2 2 1.5 2.9 2 6.2 1.7 9.4-1.5 1.2-3.3 2-4.9 2.4l-1-1.9"/><path d="M8.4 5.6C10.7 5 13.3 5 15.6 5.6M7.6 17.2c2.8 1 6 1 8.8 0"/><circle cx="9.2" cy="12.4" r="1.3"/><circle cx="14.8" cy="12.4" r="1.3"/></svg>';

  function mkPop(id,html){ var p=document.createElement('div'); p.id=id; p.className='niy-tools-pop niy-comms-pop'; p.hidden=true; p.innerHTML=html; document.body.appendChild(p); return p; }
  function wire(btn,pop){
    btn.addEventListener('click',function(e){ e.stopPropagation();
      document.querySelectorAll('.niy-comms-pop').forEach(function(x){ if(x!==pop) x.hidden=true; });
      if(pop.hidden){ var r=btn.getBoundingClientRect(); pop.style.top=Math.round(r.bottom+6)+'px'; pop.style.left=Math.round(Math.max(6,Math.min(r.left,innerWidth-280)))+'px'; }
      pop.hidden=!pop.hidden; });
    document.addEventListener('click',function(e){ if(!pop.hidden&&!pop.contains(e.target)&&e.target!==btn&&!btn.contains(e.target)) pop.hidden=true; });
  }
  function row(icon,title,sub,off){ return '<button type="button" class="row'+(off?' off':'')+'">'+icon+'<span class="t"><b>'+title+'</b><span>'+sub+'</span></span></button>'; }

  function build(){ try{
    var qc=document.querySelector('.quick-controls'); if(!qc||document.getElementById('niyNotifyBtn')) return;
    /* Enable Notifications */
    var nb=document.createElement('button'); nb.id='niyNotifyBtn'; nb.type='button';
    nb.className='niy-tools-btn niy-comms-btn'; nb.title='Enable Notifications — subscribe to the newsletter';
    nb.innerHTML=BELL+' NOTIFICATIONS';
    var np=mkPop('niyNotifyPop',
      '<div class="h">Enable notifications \u00b7 newsletter</div>'
      +row(WAP,'WhatsApp', COMMS.whatsapp?'Join the Niyantran channel':'Channel link coming soon', !COMMS.whatsapp)
      +row(MAIL,'Email','Subscribe to the daily briefing',false));
    np.children[1].addEventListener('click',function(){ if(COMMS.whatsapp){ window.open(COMMS.whatsapp,'_blank','noopener'); np.hidden=true; } });
    np.children[2].addEventListener('click',function(){ location.href='mailto:'+COMMS.email+'?subject='+encodeURIComponent('Subscribe me to the Niyantran newsletter')+'&body='+encodeURIComponent('Please add this address to the Niyantran daily briefing list.'); np.hidden=true; });
    wire(nb,np);
    /* Two-Way Communication */
    var cb=document.createElement('button'); cb.id='niyCommBtn'; cb.type='button';
    cb.className='niy-tools-btn niy-comms-btn'; cb.title='Two-Way Communication — reach the desk';
    cb.innerHTML=UPDOWN+' CONNECT';
    var cp=mkPop('niyCommPop',
      '<div class="h">Two-way communication</div>'
      +row(DISC,'Submit a Tip', COMMS.discord?'Securely via Discord':'Secure form \u00b7 Discord channel coming soon', false));
    cp.children[1].addEventListener('click',function(){
      cp.hidden=true;
      if(COMMS.discord){ window.open(COMMS.discord,'_blank','noopener'); }
      else if(window.NiyTip&&window.NiyTip.open){ window.NiyTip.open(); }
    });
    wire(cb,cp);
    var tools=document.getElementById('niyToolsBtn');
    if(tools&&tools.parentElement===qc){ qc.insertBefore(nb,tools); qc.insertBefore(cb,tools); }
    else { qc.insertBefore(cb,qc.firstChild); qc.insertBefore(nb,qc.firstChild); }
  }catch(e){} }

  /* Watchlist + Calendar keep a home: the profile menu */
  function intoProfile(){ try{
    var menu=document.querySelector('.niy-prof'); if(!menu||menu.querySelector('[data-a="watch"]')) return;
    var ref=menu.querySelector('.pf-it[data-a="home"]'); if(!ref) return;
    function it(a,label,d){ var b=document.createElement('button'); b.type='button'; b.className='pf-it'; b.dataset.a=a;
      b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'+label; return b; }
    var w=it('watch','Watchlist','<path d="m12 3.6 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>');
    var c=it('cal','Calendar','<rect x="3.6" y="5" width="16.8" height="15.4" rx="2"/><path d="M3.6 9.6h16.8M8.4 3v4M15.6 3v4"/>');
    w.addEventListener('click',function(){ try{ window.NiyWatch.open(); }catch(e){} menu.classList.remove('open'); });
    c.addEventListener('click',function(){ try{ window.NiyCal.open(); }catch(e){} menu.classList.remove('open'); });
    ref.parentNode.insertBefore(w,ref.nextSibling); ref.parentNode.insertBefore(c,w.nextSibling);
  }catch(e){} }

  function tick(){ build(); intoProfile(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,900); setInterval(tick,1500);
})();