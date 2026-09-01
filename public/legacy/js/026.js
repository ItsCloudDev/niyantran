/* V2 PASS 41 live enrichment */(function(){
  var state={};
  function once(k){ if(state[k]) return false; state[k]='run'; return true; }
  function fail(k){ state[k]=null; }
  function refresh(){ try{ if(typeof renderAll==='function') renderAll(); }catch(e){} }
  function put(csv,rows){ try{
    if(typeof EMBEDDED_CSV_DATA==='undefined'||!rows||!rows.length) return;
    EMBEDDED_CSV_DATA[csv]=rows; state[csv]='done'; refresh();
  }catch(e){} }
  function fmtDate(d){ try{ return d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
  function rss(url,csv,fallbackSource){ if(!once(csv)) return;
    fetch('/api/rss?url='+encodeURIComponent(url),{signal:(AbortSignal.timeout?AbortSignal.timeout(16000):undefined)})
      .then(function(r){ return r.text(); })
      .then(function(t){
        var doc=new DOMParser().parseFromString(t,'text/xml');
        var rows=[].slice.call(doc.querySelectorAll('item')).slice(0,30).map(function(it){
          function g(k){ var e=it.querySelector(k); return e?e.textContent.trim():''; }
          var d=new Date(g('pubDate'));
          var src=g('source')||fallbackSource;
          return { headline:g('title'), source:src, time:isNaN(d)?'':fmtDate(d), link:g('link') };
        }).filter(function(x){ return x.headline; });
        if(rows.length) put(csv,rows); else fail(csv);
      }).catch(function(){ fail(csv); });
  }
  function ohlc(sym){
    return fetch('/api/ohlc?symbol='+encodeURIComponent(sym)+'&range=1mo',{signal:(AbortSignal.timeout?AbortSignal.timeout(14000):undefined)})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var c=(j&&j.c)||[]; if(c.length<2) return null;
        var last=c[c.length-1], prev=c[c.length-2], first=c[0];
        return { last:last, d1:(last-prev)/prev*100, dM:(last-first)/first*100 };
      }).catch(function(){ return null; });
  }
  function worldExchanges(csv){ if(!once(csv)) return;
    var SY=[['S&P 500','^GSPC','US'],['Dow Jones','^DJI','US'],['NASDAQ','^IXIC','US'],['FTSE 100','^FTSE','UK'],
      ['DAX','^GDAXI','Germany'],['CAC 40','^FCHI','France'],['Nikkei 225','^N225','Japan'],['Hang Seng','^HSI','Hong Kong'],
      ['Shanghai Comp.','000001.SS','China'],['ASX 200','^AXJO','Australia'],['Bovespa','^BVSP','Brazil'],
      ['TSX Comp.','^GSPTSE','Canada'],['NIFTY 50','^NSEI','India'],['SENSEX','^BSESN','India']];
    Promise.all(SY.map(function(s){ return ohlc(s[1]).then(function(q){ return q&&{ name:s[0], region:s[2],
      level:q.last.toLocaleString('en-IN',{maximumFractionDigits:q.last>999?0:2}),
      d1:(q.d1>=0?'\u25b2':'\u25bc')+Math.abs(q.d1).toFixed(2)+'%', dM:(q.dM>=0?'\u25b2':'\u25bc')+Math.abs(q.dM).toFixed(1)+'%' }; }); }))
      .then(function(rows){ rows=rows.filter(Boolean); if(rows.length) put(csv,rows); else fail(csv); });
  }
  function worldBank(csv){ if(!once(csv)) return;
    var IND=[['NY.GDP.MKTP.KD.ZG','GDP growth (annual %)'],['FP.CPI.TOTL.ZG','Inflation, CPI (annual %)'],['SL.UEM.TOTL.ZS','Unemployment (% labour force)']];
    var CC='ind;usa;chn;jpn;deu;gbr;bra;idn';
    Promise.all(IND.map(function(iv){
      /*V2PASS41B: worldbank blocks browser CORS; go through the server-side proxy*/
      return fetch('/api/rss?url='+encodeURIComponent('https://api.worldbank.org/v2/country/'+CC+'/indicator/'+iv[0]+'?format=json&mrnev=1&per_page=100'),
        {signal:(AbortSignal.timeout?AbortSignal.timeout(16000):undefined)})
        .then(function(r){ return r.text(); }).then(function(t){ return JSON.parse(t); })
        .then(function(j){ return ((j&&j[1])||[]).map(function(row){
          return { country:(row.country||{}).value||'', indicator:iv[1],
            latest:row.value==null?'':(Math.round(row.value*100)/100)+'%', year:row.date||'' };
        }); }).catch(function(){ return []; });
    })).then(function(res){
      var rows=res[0].concat(res[1]).concat(res[2]).filter(function(x){ return x.country&&x.latest!==''; });
      if(rows.length){ put(csv,rows); return; }
      /*V2PASS41C: World Bank unreachable on this network — fall back to the analyst outline instead of an empty table*/
      fail(csv);
      try{ var f=(FEATURE_DATA.finance||[]).filter(function(x){ return x.dataSource&&x.dataSource.csv===csv; })[0];
        if(f){ f.dataSource=null; f.columns=['Item','Status','Detail']; refresh(); } }catch(e){}
    });
  }
  function commoditiesLive(){ if(!once('geo_cmdty')) return;
    var G=[['Energy',[['WTI Crude','CL=F'],['Brent Crude','BZ=F'],['Natural Gas','NG=F']]],
      ['Metals',[['Gold','GC=F'],['Silver','SI=F'],['Copper','HG=F']]],
      ['Agriculture',[['Wheat','ZW=F'],['Corn','ZC=F'],['Soybeans','ZS=F'],['Sugar','SB=F']]],
      ['Softs',[['Coffee','KC=F'],['Cocoa','CC=F'],['Cotton','CT=F']]]];
    var jobs=[]; G.forEach(function(grp){ grp[1].forEach(function(it){ jobs.push(ohlc(it[1]).then(function(q){ return { g:grp[0], n:it[0], q:q }; })); }); });
    Promise.all(jobs).then(function(res){
      var ok=res.filter(function(x){ return x.q; }); if(ok.length<6){ fail('geo_cmdty'); return; }
      var groups=G.map(function(grp){
        return { g:grp[0], items: ok.filter(function(x){ return x.g===grp[0]; }).map(function(x){
          var chg=(x.q.dM>=0?'+':'')+x.q.dM.toFixed(1)+'%';
          return [x.n, x.q.last.toLocaleString('en-US',{maximumFractionDigits:2}), chg, Math.min(100,Math.abs(x.q.dM)*6+8)];
        }) };
      }).filter(function(g2){ return g2.items.length; });
      var gain=ok.filter(function(x){ return x.q.dM>=0; }).length;
      window.NIY_GEO_COMMODITIES={
        meta:{ asOf:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' \u00b7 live' },
        stats:{ tracked:ok.length, gainers:gain, losers:ok.length-gain, riskPremium:'Live' },
        groups:groups };
      state.geo_cmdty='done';
      try{ if(window.NiyGeo&&window.NiyGeo.remount) window.NiyGeo.remount(); }catch(e){}
    });
  }
  function activate(){ try{
    if(typeof activeTier==='undefined') return;
    if(activeTier==='geopolitics'){
      rss('https://feeds.bbci.co.uk/news/world/rss.xml','geo_news_wire.csv','BBC World');
      commoditiesLive();
    } else if(activeTier==='finance'){
      worldExchanges('finance_world_exchanges.csv');
      worldBank('finance_world_indicators.csv');
    } else if(activeTier==='local'){
      (function(){ var q=(window.NiyScope&&NiyScope.newsQuery&&NiyScope.newsQuery('local'))||'India local government';
        rss('https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-IN&gl=IN&ceid=IN:en','local_hyper_news.csv','Google News'); })();
    } else if(activeTier==='state'){
      (function(){ var q=(window.NiyScope&&NiyScope.newsQuery&&NiyScope.newsQuery('state'))||'India state government';
        rss('https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-IN&gl=IN&ceid=IN:en','up_district_media.csv','Google News'); })();
    }
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate);else activate();
  setInterval(activate,1300);
})();