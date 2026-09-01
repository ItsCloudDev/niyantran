(function(){
  var FUNNEL='<svg viewBox="0 0 24 24"><path d="M4 5.4h16l-6.2 7.3v5.1l-3.6-2v-3.1z"/></svg>';
  function tick(){ try{
    var tb=document.querySelector('#detail .toolbar');
    if(tb){
      /* search field — placeholder + slash shortcut */
      var rf=document.getElementById('rowFilter');
      if(rf && rf.getAttribute('data-niy-search')!=='1'){
        rf.setAttribute('data-niy-search','1');
        rf.placeholder='Search this desk\u2026   ( / )';
      }
      /* filter popover */
      var filt=tb.querySelector('.niy-filt');
      if(!filt){
        filt=document.createElement('div'); filt.className='niy-filt';
        var b=document.createElement('button'); b.type='button'; b.title='Filters';
        b.innerHTML=FUNNEL+'<span class="niy-filt-dot"></span>';
        var pop=document.createElement('div'); pop.className='niy-filt-pop';
        pop.innerHTML='<div class="niy-filt-h">Filters</div>';
        filt.appendChild(b); filt.appendChild(pop);
        b.addEventListener('click',function(e){ e.stopPropagation(); filt.classList.toggle('open'); });
        pop.addEventListener('click',function(e){ e.stopPropagation(); });
        var more=tb.querySelector('.niy-more');
        if(more) tb.insertBefore(filt,more); else tb.appendChild(filt);
      }
      /* keep #columnFilters inside the popover (renderDetail recreates it) */
      var cf=document.getElementById('columnFilters');
      if(cf && filt && !filt.contains(cf)) filt.querySelector('.niy-filt-pop').appendChild(cf);
      /* active-filter dot */
      if(cf && filt){
        var act=false;
        cf.querySelectorAll('select').forEach(function(s){ if(s.selectedIndex>0) act=true; });
        cf.querySelectorAll('input').forEach(function(i){ if(i.value) act=true; });
        filt.classList.toggle('active',act);
      }
    }
    /* Live / Snapshot chips — remove wherever they surface */
    document.querySelectorAll('.fi-meta,[class*="badge"],[class*="pill"],[class*="chip"]').forEach(function(el){
      if(el.getAttribute('data-niy-hid')) return;
      var t=(el.textContent||'').trim();
      if(/^(\u25CF\s*)?LIVE(\s+AGENT\s+FEED)?$/i.test(t)||/^(\u25E6\s*)?SNAPSHOT/i.test(t)){
        el.style.display='none'; el.setAttribute('data-niy-hid','1');
      }
    });
  }catch(e){} }
  document.addEventListener('click',function(){ var f=document.querySelector('.niy-filt.open'); if(f) f.classList.remove('open'); });
  document.addEventListener('keydown',function(e){
    if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey) return;
    var a=document.activeElement; if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)) return;
    var rf=document.getElementById('rowFilter'); if(rf){ e.preventDefault(); rf.focus(); }
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,700); setInterval(tick,1100);
})();