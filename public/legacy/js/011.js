(function(){
  function pill(){ try{
    if(document.querySelector('.niy-home-pill')) return;
    var b=document.createElement('button'); b.type='button'; b.className='niy-home-pill';
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5"/></svg> Home';
    b.title='Back to Home (all sections)';
    b.addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto('ndesk',''); }catch(e){} });
    document.body.appendChild(b);
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pill);else pill();
  setTimeout(pill,900);
})();