/* V2 PASS 30 GEO-IA icon overrides */(function(){
  var FMAP={
    'Open Fronts':'<circle cx="12" cy="12" r="6.8"/><path d="M12 2.6v4.2M12 17.2v4.2M2.6 12h4.2M17.2 12h4.2"/><circle cx="12" cy="12" r="1.1"/>',
    'Global Intelligence':'<circle cx="10.6" cy="9.8" r="6"/><path d="M4.6 9.8h12M10.6 3.8c1.9 1.9 1.9 10.1 0 12M10.6 3.8c-1.9 1.9-1.9 10.1 0 12"/><circle cx="15.6" cy="14.8" r="3"/><path d="m17.8 17 3 3"/>',
    'Conflicts':'<path d="M12 3.2 13.7 9l7 4.3-.5 1.7-6.9-1.5-1.3 3.7 2.3 2.1-.5 1.5-3.8-1-3.8 1-.5-1.5 2.3-2.1-1.3-3.7-6.9 1.5-.5-1.7 7-4.3z"/>',
    'Transit':'<path d="M14.6 16.8H8.2a4.6 4.6 0 1 1 4.6-4.6v4.6"/><path d="m11.6 13.8 3 3-3 3"/>',
    'Alliances':'<path d="M7.4 12.5 10 10l2.4 2.3L14.7 10l2.5 2.4-4.8 4.8-2.4-2.3-2.4 2.3z"/><path d="M3.4 9 6.8 5.6l2.3 2.3M20.6 9l-3.4-3.4-2.3 2.3"/><path d="M18.4 17.8a7.6 7.6 0 0 1-3.2 2.8"/>',
    'Sanctions':'<rect x="8" y="3.8" width="8.6" height="12.6" rx="1.8"/><path d="M12.3 7.2v4M12.3 14.2h.01"/><path d="m5.2 14.8 2.2 1.5M4.4 18.8h2.8M19.8 19.4l-1.6-1.6"/>',
    'Global Aid':'<circle cx="12" cy="12" r="6.2"/><path d="M5.8 12h12.4M12 5.8c1.8 1.9 1.8 10.5 0 12.4M12 5.8c-1.8 1.9-1.8 10.5 0 12.4"/><circle cx="12" cy="3.1" r="1"/><circle cx="12" cy="20.9" r="1"/><circle cx="3.1" cy="12" r="1"/><circle cx="20.9" cy="12" r="1"/>',
    'Infra':'<path d="M3.6 20.4h16.8"/><path d="M6.2 20.4V8.8l8.4-4v6"/><path d="M9.2 7.4v3M14.6 10.8h-4"/><path d="M13.6 20.4v-3.2a3.2 3.2 0 0 1 6.4 0v3.2"/>',
    'Maritime Choke-Points':'<ellipse cx="12" cy="14.2" rx="8.4" ry="3.2"/><path d="M9.2 11.2V8h3.4v3.2M10.9 8V5.6"/><circle cx="7.6" cy="14.2" r=".6"/><circle cx="12" cy="14.6" r=".6"/><circle cx="16.4" cy="14.2" r=".6"/>',
    'Heads of State':'<circle cx="12" cy="6.8" r="2.5"/><path d="M9.6 11.2c.5-1.2 1.4-1.8 2.4-1.8s1.9.6 2.4 1.8"/><path d="M8 11.8h8l1.2 8.6H6.8z"/><path d="M10 15h4"/>',
    'Growth Indicators':'<circle cx="12" cy="14" r="6.8"/><path d="M5.2 14h13.6"/><path d="M8.2 8.6V5.4M12 7.6V4M15.8 8.6V5.2"/><circle cx="8.2" cy="4.4" r=".9"/><circle cx="12" cy="3" r=".9"/><circle cx="15.8" cy="4.2" r=".9"/>',
    'Geopolitics News Wire':'<circle cx="12" cy="8.6" r="1.9"/><path d="M12 10.5 9.2 20.6M12 10.5l2.8 10.1M9.9 17.4h4.2"/><path d="M8.2 5a5.4 5.4 0 0 0 0 7.2M15.8 5a5.4 5.4 0 0 1 0 7.2M5.8 2.8a8.6 8.6 0 0 0 0 11.6M18.2 2.8a8.6 8.6 0 0 1 0 11.6"/>',
    'Global Commodities':'<ellipse cx="9.6" cy="5.6" rx="4" ry="1.5"/><path d="M5.6 5.6v6.8c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5V5.6"/><path d="M5.6 9c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5"/><circle cx="17.2" cy="16.6" r="3.6"/><path d="M17.2 14.6v4M15.8 15.6h2.4M15.8 17.4h2.4"/>',
    'Energy':'<path d="M13.2 3.4 6.2 13.2h4.6L10.8 20.6l7-9.8h-4.6z"/>',
    'Nuclear Watch':'<path d="M9 20.4c-1.7 0-3-3.4-3-6.2 0-2.3.8-4.4 1.4-5.7h3.2c.6 1.3 1.4 3.4 1.4 5.7 0 2.8-1.3 6.2-3 6.2z"/><path d="M14.4 20.4c1.1-.4 2-2.7 2-4.9 0-1.7-.5-3.2-1-4.2h-2"/><path d="M7.8 5.2c.5-.7 1.5-.7 2 0M10.8 3.6c.5-.7 1.5-.7 2 0"/><circle cx="9" cy="15.6" r=".8"/>',
    'Global Trade':'<circle cx="12" cy="12" r="6.4"/><path d="M5.6 12h12.8M12 5.6c1.8 1.9 1.8 10.9 0 12.8M12 5.6c-1.8 1.9-1.8 10.9 0 12.8"/><path d="M21 6.8h-3.4M19.3 5.1 21 6.8l-1.7 1.7M3 17.2h3.4M4.7 18.9 3 17.2l1.7-1.7"/>',
    'Critical Minerals':'<path d="M7.4 4.8h9.2l3.2 4.8L12 19.6 4.2 9.6z"/><path d="M4.2 9.6h15.6M9.6 4.8 12 9.6l2.4-4.8M12 9.6v10"/>',
    'Satellite Infrastructure':'<rect x="9.3" y="9.8" width="5.4" height="4.6" rx="1"/><rect x="2.8" y="10" width="4.4" height="4.2" rx=".8"/><rect x="16.8" y="10" width="4.4" height="4.2" rx=".8"/><path d="M7.2 12.1h2.1M14.7 12.1h2.1M12 14.4v2.8M9.8 20.6a2.6 2.6 0 0 1 4.4 0"/>',
    'World Constitutions':'<path d="M12 5.4c-2-1.4-4.5-1.7-7-1.1v14.3c2.5-.6 5-.3 7 1.1 2-1.4 4.5-1.7 7-1.1V4.3c-2.5-.6-5-.3-7 1.1z"/><path d="M12 5.4v14.3"/><path d="M6.9 8.5c1.3-.2 2.4-.1 3.4.3M17.1 8.5c-1.3-.2-2.4-.1-3.4.3M6.9 12c1.3-.2 2.4-.1 3.4.3M17.1 12c-1.3-.2-2.4-.1-3.4.3"/>'
  };
  var GMAP={
    'Security':'<circle cx="12" cy="7.4" r="2.9"/><path d="M9.2 6h5.6M14.6 6l3.2-1.6"/><path d="M5.2 20.4c.4-3.7 3.1-6.2 6.8-6.2s6.4 2.5 6.8 6.2"/>',
    'Diplomacy':'<path d="M6 20.6 16.8 4.4M18 20.6 7.2 4.4"/><path d="M16.8 4.4c-1.8 1.3-3.4-.4-5.1.9l1.6 2.4c1.7-1.3 3.3.4 5.1-.9z"/><path d="M7.2 4.4c1.8 1.3 3.4-.4 5.1.9l-1.6 2.4c-1.7-1.3-3.3.4-5.1-.9z"/><path d="M8.6 20.6h6.8"/>',
    'Strategic Assets':'<path d="M4 7.2V4h3.2M16.8 4H20v3.2M20 16.8V20h-3.2M7.2 20H4v-3.2"/><path d="M6.6 12c1.7-2.7 3.5-4 5.4-4s3.7 1.3 5.4 4c-1.7 2.7-3.5 4-5.4 4s-3.7-1.3-5.4-4z"/><circle cx="12" cy="12" r="1.7"/>',
    'Global Resources':'<circle cx="12" cy="10.2" r="5.6"/><path d="M6.4 10.2h11.2M12 4.6c1.7 1.7 1.7 9.5 0 11.2M12 4.6c-1.7 1.7-1.7 9.5 0 11.2"/><path d="M4.4 13.2c-.7 2.5.1 4.8 1.9 6.4M19.6 13.2c.7 2.5-.1 4.8-1.9 6.4"/>',
    'Geonomics':'<path d="M3.4 15.6h17.2l-1.9 4.2H5.3z"/><path d="M6.6 15.6v-3.2h10.8v3.2M9.6 12.4V9.2h4.8v3.2"/><path d="M12 9.2V6.8"/>'
  };
  function stamp(){ try{
    document.querySelectorAll('#sidebar .feat-item').forEach(function(f){
      var lbl=((f.querySelector('.label')||{}).textContent||'').replace(/\s*(AI|BETA)\s*$/,'').trim();
      if(!FMAP[lbl]) return;
      var ic=f.querySelector('.niy-ficon svg');
      if(ic && f.getAttribute('data-niy-i2')!==lbl){ ic.innerHTML=FMAP[lbl]; f.setAttribute('data-niy-i2',lbl); }
    });
    document.querySelectorAll('#sidebar .sidebar-group-label').forEach(function(l){
      var name=(l.textContent||'').replace(/\d|[\u25B8\u25BE]/g,'').trim();
      if(!GMAP[name]) return;
      var ic=l.querySelector('.niy-gicon svg');
      if(ic && l.getAttribute('data-niy-i2')!==name){ ic.innerHTML=GMAP[name]; l.setAttribute('data-niy-i2',name); var w=l.querySelector('.niy-gicon'); if(w) w.title=name; }
    });
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp);else stamp();
  setTimeout(stamp,250); setInterval(stamp,700);
})();