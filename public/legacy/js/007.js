(function(){
  // Company Search removed from the top bar -> surfaced inside ECONOMICS (finance)
  // toolbar and on HOME's desk shortcuts, so the capability is never lost.
  function openCo(){ var b=document.getElementById('niyCoBtn'); if(b){ b.click(); return true; } return false; }
  function addFinance(){
    try{
      if(typeof activeTier==='undefined'||activeTier!=='finance') return;
      var tb=document.querySelector('#detail .toolbar'); if(!tb||tb.querySelector('.niy-co-inline')) return;
      var b=document.createElement('button'); b.type='button'; b.className='toolbar-btn niy-co-inline';
      b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:15px;height:15px;vertical-align:-3px;margin-right:6px"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5M9 11h2M13 11h2"/></svg>Company';
      b.title='Company Search — registry + filings';
      b.addEventListener('click',openCo);
      var ask=tb.querySelector('[class*="ask"],.toolbar-btn'); tb.insertBefore(b, ask||tb.firstChild);
    }catch(e){}
  }
  function addHome(){
    try{
      var g=document.querySelector('#nhDesks .dgrid'); if(!g||g.querySelector('[data-code="CO"]')) return;
      var b=document.createElement('button'); b.type='button'; b.className='nh-desk'; b.dataset.code='CO';
      b.innerHTML='<b>CO</b><span>Company</span>'; b.addEventListener('click',openCo); g.appendChild(b);
    }catch(e){}
  }
  function tick(){ addFinance(); addHome(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,800); setInterval(tick,2500);
})();