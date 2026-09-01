/* V2 PASS 36 home alignment */(function(){
  function tick(){ try{
    if(typeof activeTier!=='undefined' && activeTier!=='ndesk') return;
    /* ad slider docks into the main column so the rail can rise beside it */
    var ads=document.getElementById('nhAds'), main=document.getElementById('nhMain');
    if(ads && main && ads.parentElement!==main) main.insertBefore(ads, main.firstChild);
    /* placeholders that never filled become quiet dashes (feed unreachable) */
    if(performance.now()>15000){
      document.querySelectorAll('#nhStrip .nh-q[data-q] span').forEach(function(s){
        if(s.textContent==='\u2026'){ s.textContent='\u2014'; s.classList.add('niy-nodata'); }
      });
    }
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,600); setInterval(tick,1500);
})();