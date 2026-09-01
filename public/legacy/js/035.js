/* build stamp */
window.NIY_BUILD = 'V2 · build 102 · 06 Aug 2026';
console.log('%cNIYANTRAN ' + NIY_BUILD, 'background:#E0552A;color:#fff;padding:3px 8px;border-radius:4px');
(function(){ function tag(){ try{
  var m=document.querySelector('.niy-prof .pf-s');
  if(m && m.getAttribute('data-b')!=='1'){ m.setAttribute('data-b','1'); m.textContent = m.textContent + ' · ' + NIY_BUILD; }
  var f=document.querySelector('.niy-rail-foot');
  if(f && !f.querySelector('.niy-build')){ var s=document.createElement('div'); s.className='niy-build';
    s.style.cssText='font-size:8px;color:#B6BDC6;letter-spacing:.04em;text-align:center;padding-top:2px';
    s.textContent='b102'; s.title=NIY_BUILD; f.appendChild(s); }
}catch(e){} } if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tag);else tag(); setInterval(tag,2000); })();
