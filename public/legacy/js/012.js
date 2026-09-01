(function(){
  var T=[
    ['ndesk','Home','<path d="M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5"/>'],
    ['geopolitics','Global','<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>'],
    ['national','National','<path d="M3.5 20.5h17M5.5 20.5V10M9.7 20.5V10M14.3 20.5V10M18.5 20.5V10"/><path d="M12 3.3 21 8.5H3z"/>'],
    ['state','State','<path d="M12 21s6.8-6 6.8-11A6.8 6.8 0 0 0 5.2 10c0 5 6.8 11 6.8 11z"/><circle cx="12" cy="10" r="2.4"/>'],
    ['local','Local','<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'],
    ['judiciary','Law','<path d="M12 4v16M7.5 20h9"/><path d="m5.5 8.5 3-3M18.5 8.5l-3-3"/><path d="M2.6 12.6 5.2 8.2l2.6 4.4a2.7 2.7 0 0 1-5.2 0zM16.2 12.6l2.6-4.4 2.6 4.4a2.7 2.7 0 0 1-5.2 0z"/>'],
    ['finance','Economics','<path d="M3.5 19.5h17"/><path d="M6.8 15.8V11M11.4 15.8V6.8M16 15.8V9.4M20.6 15.8v-3.4"/>'],
    ['climate','Carbon','<path d="M4.8 20.2c0-8 5.2-13.2 14.6-14.6 0 9.4-5.2 14.6-14.6 14.6z"/><path d="M4.8 20.2c3.2-5.2 6.4-8.4 10.4-10.6"/>'],
    ['datastudio','Studio','<ellipse cx="12" cy="6.2" rx="7.2" ry="2.8"/><path d="M4.8 6.2v11.4c0 1.6 3.2 2.8 7.2 2.8s7.2-1.2 7.2-2.8V6.2"/><path d="M4.8 11.9c0 1.6 3.2 2.8 7.2 2.8s7.2-1.2 7.2-2.8"/>']
  ];
  function build(){ try{
    var p=document.querySelector('#sidebar .niy-sb-panel'); if(!p) return;
    var rail=p.querySelector('.niy-tier-rail');
    if(!rail){
      rail=document.createElement('div'); rail.className='niy-tier-rail';
      T.forEach(function(t){
        var b=document.createElement('button'); b.type='button'; b.className='niy-tier';
        b.dataset.t=t[0]; b.dataset.n=t[1]; b.title=t[1];
        var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
        s.setAttribute('viewBox','0 0 24 24'); s.innerHTML=t[2];
        b.appendChild(s);
        b.addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto(t[0],''); }catch(e){} });
        rail.appendChild(b);
      });
      var sep=document.createElement('div'); sep.className='niy-rail-sep';
      var logo=p.querySelector('.niy-rail-logo');
      if(logo&&logo.nextSibling){ p.insertBefore(rail,logo.nextSibling); p.insertBefore(sep,rail.nextSibling); }
      else { p.insertBefore(rail,p.firstChild); }
    }
    var cur=(typeof activeTier!=='undefined')?activeTier:'';
    rail.querySelectorAll('.niy-tier').forEach(function(b){ b.classList.toggle('on', b.dataset.t===cur); });
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  setTimeout(build,700); setInterval(build,1100);
})();