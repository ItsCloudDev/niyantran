(function(){
  function build(){ try{
    document.querySelectorAll('#sidebar .sidebar-group').forEach(function(g){
      if(g.dataset.flyed) return;
      var lbl=g.querySelector('.sidebar-group-label'); if(!lbl) return;
      var items=[].slice.call(g.querySelectorAll(':scope > .feat-item'));
      if(!items.length) return;
      g.dataset.flyed='1';
      var fly=document.createElement('div'); fly.className='niy-fly';
      var h=document.createElement('div'); h.className='niy-fly-h';
      h.textContent=(lbl.textContent||'').replace(/[0-9▸▾]/g,'').trim();
      fly.appendChild(h);
      items.forEach(function(it){ fly.appendChild(it); });
      g.appendChild(fly);
    });
  }catch(e){} }
  function railLogo(){ try{
    var p=document.querySelector('#sidebar .niy-sb-panel'); if(!p||p.querySelector('.niy-rail-logo')) return;
    var src=(document.querySelector('.topbar .brand img')||document.querySelector('.brand img')||{}).src; if(!src) return;
    var d=document.createElement('div'); d.className='niy-rail-logo'; d.title='Home';
    var i=document.createElement('img'); i.src=src; d.appendChild(i);
    d.addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto('ndesk',''); }catch(e){} });
    p.insertBefore(d,p.firstChild);
  }catch(e){} }
  function tick(){ build(); railLogo(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,700); setInterval(tick,1400);
})();