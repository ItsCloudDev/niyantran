(function(){
  var I={
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
    war:'<path d="M14.5 3.5 20 9l-9 9-5.5-5.5z"/><path d="m4 20 3.5-3.5M18 4l2 2"/>',
    shield:'<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
    ship:'<path d="M3 17l1.5-5h15L21 17"/><path d="M12 12V6M8 6h8M4 21c1.5 0 2-1 4-1s2.5 1 4 1 2-1 4-1 2.5 1 4 1"/>',
    plane:'<path d="M10 21l2-6 8 3v-2l-7-5V5a1.5 1.5 0 0 0-3 0v6l-7 5v2l8-3 2 6z"/>',
    handshake:'<path d="M8 12l3-3 3 3 3-3 3 3-6 6-3-3-3 3-3-3z"/>',
    bank:'<path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z"/>',
    gavel:'<path d="m14 4 6 6-3 3-6-6z"/><path d="m8 10 6 6-2 2-6-6zM3 21h9"/>',
    doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    chart:'<path d="M3 20h18M6 16v-5M11 16V7M16 16v-8M21 16v-3"/>',
    money:'<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6-1 1.4-2.5 1.9-2.5.9-2.5 1.9 1 1.6 2.5 1.6 2.5-.5 2.5-1.5"/>',
    leaf:'<path d="M5 20c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 20c3-5 6-8 10-10"/>',
    pin:'<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18 20c0-2.5-1-4.5-2.5-5.5"/>',
    wave:'<path d="M3 12c2-4 4 4 6 0s4 4 6 0 4 4 6 0"/><path d="M3 18c2-4 4 4 6 0s4 4 6 0 4 4 6 0"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6-4"/>',
    bill:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'
  };
  var R=[[/war|conflict/i,'war'],[/transit|ship|vessel|seaborne|air|aircraft|flight/i,'ship'],[/defence|defense|procure|military|arms/i,'shield'],
    [/allianc|diplom|treaty|foreign|external/i,'handshake'],[/global|world|geopolit|international/i,'globe'],
    [/court|judic|legal|law|tribunal|case|order|verdict/i,'gavel'],[/bill|legislat|parliament|assembly|act/i,'bill'],
    [/tender|procurement|contract/i,'doc'],[/market|stock|nse|bse|trade|index|forecast|predict/i,'chart'],
    [/budget|fund|tax|revenue|financ|economic|money|bank/i,'money'],[/climate|carbon|environment|green|emission|energy/i,'leaf'],
    [/district|local|ward|panchayat|municipal|state|region|constituenc/i,'pin'],
    [/bureaucrat|officer|transfer|cadre|ias|ips|mla|mp|candidate|leader|people|profile/i,'people'],
    [/infra|project|strateg|corridor|port|pipeline/i,'wave'],[/regulat|compliance|watch|monitor/i,'radar'],
    [/intelligen|analys|research|sector|impact|policy/i,'gear']];
  function pick(t){ for(var i=0;i<R.length;i++){ if(R[i][0].test(t)) return I[R[i][1]]; } return I.doc; }
  function paint(){ try{
    document.querySelectorAll('#sidebar .feat-item').forEach(function(f){
      if(f.querySelector('.niy-ficon')) return;
      var lbl=(f.querySelector('.label')||{}).textContent||f.dataset.mono||'';
      var s=document.createElementNS('http://www.w3.org/2000/svg','svg');
      s.setAttribute('viewBox','0 0 24 24');
      s.innerHTML=pick(lbl);
      var w=document.createElement('span'); w.className='niy-ficon'; w.appendChild(s);
      f.insertBefore(w,f.firstChild);
    });
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
  setTimeout(paint,500); setTimeout(paint,1500);
  var sb=document.getElementById('sidebarList');
  if(window.MutationObserver&&sb) new MutationObserver(function(){ setTimeout(paint,60); }).observe(sb,{childList:true,subtree:true});
  else setInterval(paint,2500);
})();