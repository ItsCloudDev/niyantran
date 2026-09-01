/* V2 PASS 37 scroll reveal */(function(){
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  var io=null;
  function ob(){ if(io) return io;
    io=new IntersectionObserver(function(es){ es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); },
      { rootMargin:'0px 0px -8% 0px' });
    return io; }
  function tick(){ try{
    if(typeof activeTier!=='undefined' && activeTier!=='ndesk') return;
    document.querySelectorAll('#nhMain > *, #nhRail .nh-box, #niyMkit').forEach(function(el){
      if(el.getAttribute('data-niy-rv')) return; el.setAttribute('data-niy-rv','1');
      el.classList.add('niy-reveal'); ob().observe(el);
    });
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,700); setInterval(tick,1400);
})();