
(function(){
  'use strict';
  if(window.__niyProfessionalPolish)return;
  window.__niyProfessionalPolish=true;
  var activeButton=null,raf=0;
  var specs=[
    ['body.niy-ofx-open #detail .ofx-note','Method note'],
    ['#detail.niy-conflicts-holistic .c2-foot span:first-child','Data scope'],
    ['#detail.niy-gi-workspace .giw-method','Record note'],
    ['#detail.niy-alliances-workspace .alw-overlap-note','Method note'],
    ['#detail.niy-alliances-workspace .alw-method','Research context'],
    ['#detail.niy-sanctions-workspace .sna-method','Method note'],
    ['#detail.niy-global-aid-workspace .gaa-method','Research context']
  ];
  function portal(){
    var p=document.getElementById('niyStaticFlyout');
    if(p)return p;
    p=document.createElement('div');p.id='niyStaticFlyout';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-modal','false');p.setAttribute('aria-labelledby','niyFlyoutTitle');
    p.innerHTML='<div class="niy-flyout-head"><b id="niyFlyoutTitle">Method note</b><button class="niy-flyout-close" type="button" aria-label="Close information flyout">×</button></div><p class="niy-flyout-body"></p>';
    document.body.appendChild(p);
    p.querySelector('.niy-flyout-close').addEventListener('click',close);
    return p;
  }
  function close(){var p=document.getElementById('niyStaticFlyout');if(p)p.hidden=true;if(activeButton){activeButton.setAttribute('aria-expanded','false');activeButton=null;}}
  function position(p,b){
    var r=b.getBoundingClientRect(),w=Math.min(350,window.innerWidth-24),left=Math.max(12,Math.min(window.innerWidth-w-12,r.right-w));
    p.style.width=w+'px';p.style.left=left+'px';p.style.top='12px';p.hidden=false;
    var h=p.offsetHeight,top=r.bottom+8;if(top+h>window.innerHeight-12)top=Math.max(12,r.top-h-8);p.style.top=top+'px';
  }
  function open(b){
    var p=portal();if(activeButton&&activeButton!==b)activeButton.setAttribute('aria-expanded','false');activeButton=b;
    p.querySelector('#niyFlyoutTitle').textContent=b.getAttribute('data-niy-flyout-title')||'Method note';
    p.querySelector('.niy-flyout-body').textContent=b.getAttribute('data-niy-flyout-text')||'';
    b.setAttribute('aria-expanded','true');position(p,b);
  }
  function decorate(el,title){
    if(!el||el.dataset.niyFlyoutReady||el.querySelector('a,button,input,select,textarea'))return;
    var copy=(el.textContent||'').replace(/\s+/g,' ').trim();if(copy.length<38)return;
    el.dataset.niyFlyoutReady='1';el.classList.add('niy-static-flyout-source');
    var hidden=document.createElement('span');hidden.className='niy-static-copy';hidden.textContent=copy;hidden.setAttribute('aria-hidden','true');
    while(el.firstChild)el.removeChild(el.firstChild);
    var button=document.createElement('button');button.type='button';button.className='niy-flyout-trigger';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('data-niy-flyout-title',title);button.setAttribute('data-niy-flyout-text',copy);button.innerHTML='<i aria-hidden="true">i</i><span>'+title+'</span>';
    button.addEventListener('click',function(e){e.stopPropagation();if(activeButton===button&&!portal().hidden)close();else open(button);});
    el.appendChild(hidden);el.appendChild(button);
  }
  function enhance(){raf=0;specs.forEach(function(s){document.querySelectorAll(s[0]).forEach(function(el){decorate(el,s[1]);});});}
  function schedule(){if(!raf)raf=requestAnimationFrame(enhance);}
  document.addEventListener('click',function(e){var p=document.getElementById('niyStaticFlyout');if(p&&!p.hidden&&!p.contains(e.target)&&e.target!==activeButton)close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  window.addEventListener('resize',function(){if(activeButton){var p=document.getElementById('niyStaticFlyout');if(p&&!p.hidden)position(p,activeButton);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
