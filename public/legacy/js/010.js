(function(){
  // On every feature page open the AI WORKSPACE first (mockup shows the calm
  // "Drag & Drop AI Chat" state, not the dense analytics wall).
  function preferAI(){ try{
    if(typeof activeTier==='undefined'||activeTier==='ndesk') return;
    var work=document.querySelector('#detail .niy-col-work'); if(!work||work.dataset.aiFirst) return;
    var btns=work.querySelectorAll('button, [role="tab"]');
    for(var i=0;i<btns.length;i++){
      var t=(btns[i].textContent||'').trim().toUpperCase();
      if(t.indexOf('AI')===0||t.indexOf('AI WORKSPACE')>=0){
        if(!btns[i].classList.contains('active')) btns[i].click();
        work.dataset.aiFirst='1'; break;
      }
    }
  }catch(e){} }
  var last='';
  setInterval(function(){
    try{ var k=(typeof activeTier!=='undefined'?activeTier:'')+':'+(typeof activeIndex!=='undefined'?activeIndex:'');
      if(k!==last){ last=k; var w=document.querySelector('#detail .niy-col-work'); if(w) delete w.dataset.aiFirst; setTimeout(preferAI,650); }
    }catch(e){}
  },700);
  setTimeout(preferAI,1200);
})();