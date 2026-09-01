(function(){
  function tick(){ try{
    if(typeof activeTier!=='undefined' && activeTier!=='ndesk') return;
    var latest=document.getElementById('nhLatest'); if(!latest||!latest.parentElement) return;
    var kit=document.getElementById('niyMkit');
    if(!kit){
      kit=document.createElement('div'); kit.id='niyMkit';
      kit.innerHTML='<div class="mk-h"><span>Markets</span><a>Economics desk \u2192</a></div><div class="mk-b"></div>';
      kit.querySelector('.mk-h a').addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto('finance',''); }catch(e){} });
      latest.parentElement.insertBefore(kit,latest);
    }
    var src=document.getElementById('nhMoves'); if(!src) return;
    var rows=src.querySelectorAll('tbody tr'); if(!rows.length) rows=src.querySelectorAll('tr');
    var b=kit.querySelector('.mk-b'), html='';
    rows.forEach(function(tr){
      var td=tr.querySelectorAll('td'); if(td.length<4) return;
      var name=td[0].textContent.trim(), spark=td[1].innerHTML, px=td[2].textContent.trim(), ch=td[3];
      var dir=/dn/.test(ch.className)?'dn':(/up/.test(ch.className)?'up':'');
      html+='<div class="mk-r" title="Open Economics desk"><span class="mk-n">'+name+'</span>'
        +'<span class="mk-s">'+spark+'</span><span class="mk-v">'+px+'</span>'
        +'<span class="mk-c '+dir+'">'+ch.textContent.trim()+'</span></div>';
    });
    if(html && b.getAttribute('data-h')!==String(html.length)+rows.length){
      b.innerHTML=html; b.setAttribute('data-h',String(html.length)+rows.length);
      b.querySelectorAll('.mk-r').forEach(function(r){ r.addEventListener('click',function(){ try{ if(window.niyGoto) window.niyGoto('finance',''); }catch(e){} }); });
    }
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  setTimeout(tick,900); setInterval(tick,2000);
})();