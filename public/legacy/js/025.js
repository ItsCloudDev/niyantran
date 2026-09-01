/* V2 PASS 40 sports+entertainment live data */(function(){
  var state={};
  function put(csv,rows){ try{
    if(typeof EMBEDDED_CSV_DATA==='undefined'||!rows||!rows.length) return;
    EMBEDDED_CSV_DATA[csv]=rows; state[csv]='done';
    if(typeof renderAll==='function'&&typeof activeTier!=='undefined'&&(activeTier==='sports'||activeTier==='entertainment')) renderAll();
  }catch(e){} }
  function once(key){ if(state[key]) return false; state[key]='run'; return true; }
  function fail(key){ /*V2PASS58B cap retries: a permanently-failing source must not hammer the network forever*/ state._n=state._n||{}; var n=(state._n[key]||0)+1; state._n[key]=n; state[key]=(n>=3)?'dead':null; }
  function fmtDate(d){ try{ return d.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
  function rss(url,csv,source){ /*V2PASS91: key on the QUERY too, or a scope change never refetches*/
    var rk=csv+'|'+url; if(!once(rk)) return;
    fetch('/api/rss?url='+encodeURIComponent(url),{signal:(AbortSignal.timeout?AbortSignal.timeout(16000):undefined)})
      .then(function(r){ return r.text(); })
      .then(function(t){
        var doc=new DOMParser().parseFromString(t,'text/xml');
        var rows=[].slice.call(doc.querySelectorAll('item')).slice(0,30).map(function(it){
          function g(k){ var e=it.querySelector(k); return e?e.textContent.trim():''; }
          var d=new Date(g('pubDate'));
          return { headline:g('title'), source:source, time:isNaN(d)?'':fmtDate(d), link:g('link') };
        }).filter(function(x){ return x.headline; });
        if(rows.length) put(csv,rows); else fail(rk);
      }).catch(function(){ fail(rk); });
  }
  function tsdb(leagues,csv){ if(!once(csv)) return;
    var all=[];
    var jobs=leagues.map(function(lg){
      var id=lg[0], nm=lg[1];
      function pull(kind){
        return fetch('https://www.thesportsdb.com/api/v1/json/3/'+kind+'.php?id='+id,{signal:(AbortSignal.timeout?AbortSignal.timeout(15000):undefined)})
          .then(function(r){ return r.json(); })
          .then(function(j){
            var evs=(j&&(j.events||j.results))||[];
            evs.slice(0,8).forEach(function(e){
              var score=(e.intHomeScore!=null&&e.intHomeScore!=='')?(e.intHomeScore+' \u2013 '+e.intAwayScore+' \u00b7 FT'):'Upcoming';
              all.push({ match:(e.strHomeTeam&&e.strAwayTeam)?(e.strHomeTeam+' vs '+e.strAwayTeam):(e.strEvent||''),
                league:e.strLeague||nm, date:(e.dateEvent||'')+(e.strTime?(' '+e.strTime.slice(0,5)):''), status:score, _d:e.dateEvent||'' });
            });
          }).catch(function(){});
      }
      return Promise.all([pull('eventsnextleague'),pull('eventspastleague')]);
    });
    Promise.all(jobs).then(function(){
      all.sort(function(a,b){ return (b._d||'').localeCompare(a._d||''); });
      var rows=all.filter(function(x){ return x.match; });
      if(rows.length) put(csv,rows); else fail(csv);
    });
  }
  function tvmaze(csv){ if(!once(csv)) return;
    function pull(cc){
      return fetch('https://api.tvmaze.com/schedule?country='+cc,{signal:(AbortSignal.timeout?AbortSignal.timeout(15000):undefined)})
        .then(function(r){ return r.json(); })
        .then(function(list){
          return (list||[]).slice(0,25).map(function(ep){
            var show=ep.show||{}; var net=(show.network||show.webChannel||{}).name||'';
            return { show:show.name||'', network:net, time:(ep.airtime||'')+' '+cc,
              episode:'S'+(ep.season||'?')+'E'+(ep.number||'?')+(ep.name?(' \u00b7 '+ep.name):'') };
          });
        }).catch(function(){ return []; });
    }
    Promise.all([pull('IN'),pull('US')]).then(function(res){
      var rows=res[0].concat(res[1]).filter(function(x){ return x.show; });
      if(rows.length) put(csv,rows); else fail(csv);
    });
  }
  function itunes(cc,csv){ if(!once(csv)) return;
    fetch('https://itunes.apple.com/'+cc+'/rss/topsongs/limit=25/json',{signal:(AbortSignal.timeout?AbortSignal.timeout(15000):undefined)})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var es=(j&&j.feed&&j.feed.entry)||[];
        var rows=es.map(function(e,i){
          return { rank:String(i+1), track:(e['im:name']||{}).label||'',
            artist:(e['im:artist']||{}).label||'',
            album:((e['im:collection']||{})['im:name']||{}).label||'' };
        }).filter(function(x){ return x.track; });
        if(rows.length) put(csv,rows); else fail(csv);
      }).catch(function(){ fail(csv); });
  }
  function activate(){ try{
    if(typeof activeTier==='undefined') return;
    if(activeTier==='sports'){
      rss('https://www.espncricinfo.com/rss/content/story/feeds/0.xml','sports_cricket_wire.csv','ESPNcricinfo');
      rss('https://feeds.bbci.co.uk/sport/football/rss.xml','sports_football_wire.csv','BBC Sport');
      rss('https://www.thehindu.com/sport/feeder/default.rss','sports_india_wire.csv','The Hindu Sport');
      tsdb([['4328','Premier League'],['4387','NBA'],['4460','Indian Premier League'],['4335','La Liga']],'sports_fixtures.csv');
      tsdb([['4791','Indian Super League']],'sports_isl.csv');
    } else if(activeTier==='entertainment'){
      rss('https://variety.com/feed/','ent_news_wire.csv','Variety');
      rss('https://feeds.feedburner.com/ndtvmovies-latest','ent_bolly_wire.csv','NDTV Movies');
      tvmaze('ent_tv_tonight.csv');
      itunes('in','ent_music_in.csv');
      itunes('us','ent_music_us.csv');
    }
  }catch(e){} }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate);else activate();
  setInterval(activate,1200);
})();