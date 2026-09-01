(function(){
  /* releasing focus after choosing a feature collapses the flyout (focus-within otherwise pins it open over content) */
  document.addEventListener("click",function(e){
    var it=e.target.closest&&e.target.closest(".niy-acc-body .feat-item");
    if(!it) return;
    setTimeout(function(){ try{ if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); }catch(x){} },60);
  },true);
})();