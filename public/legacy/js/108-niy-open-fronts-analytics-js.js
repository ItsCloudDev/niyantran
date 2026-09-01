
(function(){
  'use strict';
  var CSV = 'geopolitics_war_tracker.csv';
  var selected = null;
  var selectedRow = null;
  var tip = null;

  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function norm(v){ return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
  function clamp(v){ return Math.max(0,Math.min(100,Math.round(+v||0))); }
  function currentFeatureOfx(){ try { return featuresForTier(activeTier)[activeIndex] || null; } catch(e){ return null; } }
  function isOpenFronts(){ var f=currentFeatureOfx(); return !!(f && f.dataSource && f.dataSource.csv===CSV); }
  function titleOf(r){ return String((r&&(r.conflict_name||r.title||r.headline||r.name))||'Selected Open Front').trim(); }
  function prettyDate(v){ if(!v)return 'Unknown'; var s=String(v); if(/^\d{4}-\d{2}$/.test(s)){ var d=new Date(s+'-01T00:00:00Z'); return d.toLocaleString('en',{month:'short',year:'numeric',timeZone:'UTC'}); } return s; }
  function parseMillions(s,key){ var m=String(s||'').match(new RegExp('([\\d.]+)M\\s*'+key,'i')); return m?+m[1]:null; }
  function parseFirstNumber(s){ var m=String(s||'').replace(/,/g,'').match(/([\d.]+)/); return m?+m[1]:null; }

  var VERIFIED_EVENTS={
    'rus-ukr':{
      asOf:'31 JUL 2026',start:'2022-02-24',durationMonths:53,
      civilian:{killed:1839,injured:10638,total:12477,period:'JAN–JUL 2026',monthlyKilled:437,monthlyInjured:2610,source:'https://ukraine.ohchr.org/en/node/574'},
      displacement:{refugees:5.9,idp:3.7,total:9.6,asOf:'END 2025',source:'https://www.unhcr.org/sites/default/files/2026-06/unhcr-annual-results-report-2025-ukraine.pdf'},
      beneficiaries:[
        {company:'Raytheon',systems:'NASAMS air-defence systems',value:'$1.132B'},
        {company:'BAE Systems',systems:'APKWS precision-guided rockets',value:'$583M'},
        {company:'AEVEX Aerospace',systems:'Phoenix Ghost unmanned systems',value:'$522M'},
        {company:'AeroVironment',systems:'Puma UAS + Switchblade 300/600',value:'$407M'},
        {company:'Lockheed Martin',systems:'HIMARS launchers and support',value:'$313M'}
      ],
      contractsAsOf:'26 APR 2024',contractsSource:'https://media.defense.gov/2024/May/15/2003465981/-1/-1/1/UKRAINE_INFOGRAPHIC_26APR2024.PDF',
      economy:{damage:'>$195B',recovery:'~$588B',housing:'14%',sectors:[['Transport',96],['Energy',91],['Housing',90]],asOf:'31 DEC 2025',source:'https://enlargement.ec.europa.eu/news/updated-ukraine-recovery-and-reconstruction-needs-assessment-released-2026-02-23_en'}
    }
  };
  var ISRAEL_PROCUREMENT={
    label:'possible FMS ceilings',
    scope:'Broader Israeli procurement linked to the theatre; values are possible-sale ceilings, not event-exclusive revenue or company profit.',
    beneficiaries:[
      {company:'Boeing / ATK / L3Harris',systems:'JDAM kits, GBU-39/B bombs, fuzes',value:'$6.75B',source:'https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4060920/israel-munitions-guidance-kits-fuzes-and-munitions-support'},
      {company:'General Dynamics / Ellwood',systems:'MK 84 & BLU-117 bomb bodies',value:'$2.04B',source:'https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4088258/israel-munitions-and-munitions-support'},
      {company:'Caterpillar',systems:'D9R / D9T armoured bulldozers',value:'$295M',source:'https://www.dsca.mil/Press-Media/Major-Arms-Sales/Article-Display/Article/4088243/israel-caterpillar-d9-bulldozers'}
    ]
  };
  function verifiedFor(d){return VERIFIED_EVENTS[d&&d.id]||null;}
  function beneficiaryFor(d,v){
    if(v)return {label:'verified obligations',scope:'Obligated U.S. Ukraine-assistance contract values; not company profit.',beneficiaries:v.beneficiaries,source:v.contractsSource,sourceLabel:'DoD'};
    if(d&&/(israel|gaza|hezbollah)/i.test(d.name||''))return ISRAEL_PROCUREMENT;
    return null;
  }
  function severityFor(v){
    var casualty=Math.min(100,v.civilian.total/20000*100),displacement=Math.min(100,v.displacement.total/10*100),duration=Math.min(100,v.durationMonths/60*100);
    return {casualty:Math.round(casualty),displacement:Math.round(displacement),duration:Math.round(duration),score:Math.round(casualty*.4+displacement*.4+duration*.2)};
  }
  function universalSeverity(d){
    var il=norm(d.intensityLabel),tr=norm(d.trend),st=norm(d.status);
    var i=/critical/.test(il)?100:/high/.test(il)?75:/medium/.test(il)?50:/low/.test(il)?25:40;
    var t=/escalat|deteriorat|rising/.test(tr)?100:/stable|active/.test(tr)?50:/easing|improv|declin/.test(tr)?20:40;
    var s=/ceasefire fragile/.test(st)?70:/active/.test(st)?100:/low intensity/.test(st)?30:/frozen/.test(st)?15:/under review/.test(st)?40:40;
    return {score:Math.round(i*.5+t*.3+s*.2),intensity:i,trend:t,status:s,method:'50% intensity ('+d.intensityLabel+'='+i+') + 30% trend ('+d.trend+'='+t+') + 20% status ('+d.status+'='+s+')'};
  }
  function durationLabel(s){
    var text=String(s||''),ym=text.match(/(19|20)\d{2}/);if(!ym)return '—';
    var year=+ym[0],months={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
    var lower=text.toLowerCase(),month=0;Object.keys(months).some(function(k){if(lower.indexOf(k)>-1){month=months[k];return true;}return false;});
    var now=new Date(),total=Math.max(0,(now.getFullYear()-year)*12+now.getMonth()-month);
    return total>=24?(Math.round(total/12*10)/10).toFixed(total%12?1:0)+'y':total+'mo';
  }
  function briefFor(d){
    var trend=norm(d.trend),lead;
    if(/escalat|deteriorat|rising/.test(trend))lead='The near-term analytical focus is whether the latest development widens the conflict or changes external involvement.';
    else if(/easing|improv|declin/.test(trend))lead='The immediate analytical focus is whether de-escalation holds and produces a durable settlement.';
    else if(/frozen/.test(norm(d.status)))lead='The conflict is dormant rather than resolved; a status change or new external involvement would be material.';
    else lead='The key question is whether the latest development changes the conflict posture or its regional effects.';
    var latest=String(d.latest||'No recent development is recorded.').replace(/\s+/g,' ').trim();if(latest.length>185)latest=latest.slice(0,182).replace(/\s+\S*$/,'')+'…';
    return lead+' '+latest;
  }

  function rowObject(tr){
    if(!tr)return null;
    var raw=tr.getAttribute('data-raw-idx'),idx=parseInt(raw!=null?raw:tr.getAttribute('data-row-idx'),10);
    try { var rows=(typeof EMBEDDED_CSV_DATA!=='undefined'&&EMBEDDED_CSV_DATA[CSV])||[]; if(!isNaN(idx)&&rows[idx]) return Object.assign({},rows[idx]); } catch(e){}
    var hs=Array.from((tr.closest('table')||document).querySelectorAll('thead th')).map(function(x){return (x.textContent||'').trim().toLowerCase().replace(/\s+/g,'_');});
    var cs=Array.from(tr.querySelectorAll('td')).map(function(x){return (x.textContent||'').replace(/\s+/g,' ').trim();});
    var out={}; hs.forEach(function(k,i){if(k)out[k]=cs[i]||'';}); return out;
  }
  function conflictTokens(v){
    var stop={war:1,conflict:1,civil:1,interstate:1,direct:1,exchange:1,shadow:1,strikes:1,post:1,transition:1,aftermath:1,the:1,and:1,vs:1};
    return norm(v).split(' ').filter(function(x){return x&&!stop[x];});
  }
  function sameConflict(a,b){
    var na=norm(a),nb=norm(b);if(na===nb||na.indexOf(nb)>-1||nb.indexOf(na)>-1)return true;
    var ta=conflictTokens(a),tb=conflictTokens(b),shared=ta.filter(function(x){return tb.indexOf(x)>-1;}).length;
    return shared>=2&&shared/Math.min(ta.length||1,tb.length||1)>=.6;
  }
  function headlineEntities(name){
    var generic=/\b(war|conflict|civil conflict|insurgency|standoff|tensions|unrest|crisis|strikes|aftermath)\b/ig;
    var parts=String(name||'').replace(/[()]/g,' ').split(/\s+(?:vs\.?|versus)\s+|[–—/]/i).map(function(x){return x.replace(generic,'').replace(/\s+/g,' ').trim();}).filter(function(x){return x.length>1;});
    return parts.filter(function(x,i){return parts.indexOf(x)===i;}).slice(0,4);
  }
  function dossierFor(row){
    var name=titleOf(row),found=null;
    try { found=((window.NIY_GEO_CONFLICTS||{}).conflicts||[]).find(function(c){return sameConflict(c.name,name);}); } catch(e){}
    var c=found||{};
    var intensity=parseFirstNumber(c.intensity)||({critical:92,high:76,medium:55,low:30}[String(row.intensity||'').toLowerCase()]||60);
    var ref=parseMillions(c.displaced,'refugees'),idp=parseMillions(c.displaced,'IDP');
    var meaningful=function(x){return !!x&&!/^[-—]$/.test(String(x).trim());};
    var supporters=(c.supporters||[]).filter(meaningful),actors=(c.actors||[]).filter(meaningful),equipment=(c.equipment||[]).filter(meaningful);
    var seed={
      id:c.id||('evt-'+norm(name).replace(/ /g,'-').slice(0,28)),name:name,region:row.region||c.region||'Unspecified theatre',type:row.conflict_type||'Open Front',status:row.current_stage||c.status||'active',trend:row.trend||((c.status==='escalating')?'Escalating':'Active'),since:row.started||c.since||'',intensity:clamp(intensity),intensityLabel:row.intensity||({95:'Critical',88:'Critical',79:'High',74:'High',72:'High',58:'Medium'}[clamp(intensity)]||'Medium'),
      latest:row.latest_development||c.latest||'No material update supplied.',fatalities:c.fatalitiesEst||'Awaiting source-backed estimate',displaced:c.displaced||'Awaiting source-backed estimate',refugees:ref,idp:idp,
      actors:actors,entities:headlineEntities(name),supporters:supporters,equipment:equipment,sources:c.sources||[],asOf:((window.NIY_GEO_CONFLICTS||{}).meta||{}).asOf||'prototype',
      prototype:true,hasDossier:!!found
    };
    var base=seed.intensity;
    seed.tempo=[clamp(base-19),clamp(base-16),clamp(base-13),clamp(base-10),clamp(base-7),clamp(base-9),clamp(base-5),clamp(base-3),clamp(base)];
    seed.spillover=[['Defence demand',clamp(base-4),'red'],['Sanctions exposure',clamp(base-9),'red'],['Energy transmission',clamp(base-23),'amber'],['Food security',clamp(base-37),'amber'],['Shipping / insurance',clamp(base-45),''],['Financial markets',clamp(base-39),'']];
    seed.periods={
      '24H':{tempo:'+'+Math.max(1,Math.round(base/32)),territory:'0.1%',signals:'3',label:'Breaking window'},
      '7D':{tempo:'+'+Math.max(2,Math.round(base/15)),territory:'0.4%',signals:'11',label:'Operational window'},
      '30D':{tempo:'+'+Math.max(5,Math.round(base/7)),territory:'1.2%',signals:'38',label:'Trend window'},
      'ALL':{tempo:String(base),territory:'Since start',signals:'Indexed',label:'Full event'}
    };
    return seed;
  }
  function cardFor(d){
    var casualties=/\d/.test(String(d.fatalities||''))?d.fatalities:'Not reported in feed',displaced=/\d/.test(String(d.displaced||''))?d.displaced:'Not reported in feed';
    var fields={conflict_name:d.name,region:d.region,conflict_type:d.type,current_stage:d.status,started:d.since||'Not reported',conflict_age:durationLabel(d.since),latest_development:d.latest||'Not reported in feed',casualties:casualties,displaced:displaced,actors:(d.actors.length?d.actors:d.entities).join(' · ')||'Not identified in feed',external_support:d.supporters.join(' · ')||'Not reported in feed',systems_observed:d.equipment.join(' · ')||'Not reported in feed'};
    d.sources.forEach(function(s,i){fields['source_'+(i+1)]=s[1];});
    return {title:d.name,feature:'Conflict Intelligence',tier:'geopolitics',tierLabel:'GLOBAL',bucket:'Open Fronts',csv:CSV,fields:fields,_ofx:true};
  }
  function attachSelected(){
    if(!selected||!window.NiyAI||!window.NiyAI.addCard)return;
    var cards=(window.NiyAI.cards||[]).filter(function(c){return !(c&&c._ofx)||norm(c.title)===norm(selected.name);});
    window.NiyAI.cards=cards;
    var exists=cards.some(function(c){return c&&c._ofx&&norm(c.title)===norm(selected.name);});
    if(!exists)window.NiyAI.addCard(cardFor(selected));
    else if(window.NiyShell&&window.NiyShell.renderCards)window.NiyShell.renderCards();
  }
  function openAi(prefill){
    attachSelected();
    var b=document.querySelector('#detail .niy-mode[data-mode="ai"]'); if(b)b.click();
    setTimeout(function(){ renderAiBanner(); var i=document.querySelector('#detail .niy-pane-ai .niy-ai-input'); if(i&&prefill){i.value=prefill;i.dispatchEvent(new Event('input',{bubbles:true}));i.focus();}},20);
  }
  function modeLabels(){
    if(!isOpenFronts())return;
    var a=document.querySelector('#detail .niy-mode[data-mode="analytics"]'),i=document.querySelector('#detail .niy-mode[data-mode="ai"]');
    var at=selected?'Event Analytics':'Fronts Overview',ai='AI Research';
    if(a){if(a.textContent!==at)a.textContent=at;a.title=selected?'Analytics for '+selected.name:'Aggregate Open Fronts analytics';}
    if(i){if(i.textContent!==ai)i.textContent=ai;i.title='Work with AI while the selected intelligence card remains open';}
  }
  function renderAiBanner(){
    var old=document.querySelector('#detail .ofx-ai-banner');
    if(old)old.remove();
  }
  function spark(vals){
    var w=360,h=72,p=5,min=Math.min.apply(null,vals),max=Math.max.apply(null,vals),span=Math.max(1,max-min);
    var pts=vals.map(function(v,i){return [(p+i*(w-p*2)/(vals.length-1)),(h-p-(v-min)*(h-p*2)/span)];});
    var line=pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' '),area='M '+pts[0][0]+' '+(h-p)+' L '+pts.map(function(q){return q[0]+' '+q[1];}).join(' L ')+' L '+pts[pts.length-1][0]+' '+(h-p)+' Z';
    return '<svg class="ofx-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" data-tip="Prototype operational-tempo index. Replace with time-bucketed incident observations from the event API."><line class="grid" x1="5" y1="18" x2="355" y2="18"/><line class="grid" x1="5" y1="54" x2="355" y2="54"/><path class="area" d="'+area+'"/><polyline class="line" points="'+line+'"/>'+pts.map(function(q,i){return '<circle class="dot" cx="'+q[0]+'" cy="'+q[1]+'" r="2.3" data-tip="Index point '+(i+1)+': '+vals[i]+' / 100"/>';}).join('')+'</svg>';
  }
  function bullets(arr){return arr.map(function(x){return '<div class="ofx-bullet" data-tip="Prototype analytical score. Source-backed production values must carry observation ID, as-of time and confidence."><span class="ofx-bullet-l" title="'+esc(x[0])+'">'+esc(x[0])+'</span><span class="ofx-bullet-track"><i class="ofx-bullet-fill '+esc(x[2]||'')+'" style="width:'+clamp(x[1])+'%"></i></span><span class="ofx-bullet-v">'+clamp(x[1])+'</span></div>';}).join('');}
  function nodes(d){
    var a=d.actors[0]||'Actor A',b=d.actors[1]||'Actor B',s1=d.supporters[0]||'External support A',s2=d.supporters[1]||'External support B';
    return '<div class="ofx-net" data-tip="Typed actor relationships from the selected event record. Edge provenance should resolve to relationship evidence in production."><svg viewBox="0 0 400 210" preserveAspectRatio="none"><line class="hostile" x1="200" y1="65" x2="200" y2="145"/><line class="support" x1="62" y1="42" x2="176" y2="61"/><line class="support" x1="338" y1="168" x2="224" y2="149"/></svg><span class="ofx-node support" style="left:16%;top:20%">'+esc(s1)+'</span><span class="ofx-node primary" style="left:50%;top:31%">'+esc(a)+'</span><span class="ofx-node opposed" style="left:50%;top:70%">'+esc(b)+'</span><span class="ofx-node support" style="left:84%;top:80%">'+esc(s2)+'</span></div><div class="ofx-net-key"><span><i class="support"></i>support</span><span><i class="hostile"></i>opposition</span></div>';
  }
  function kpi(l,v,s,cls){return '<div class="ofx-kpi"><div class="ofx-kpi-l">'+esc(l)+'</div><div class="ofx-kpi-v" title="'+esc(v)+'">'+esc(v)+'</div><div class="ofx-kpi-s '+(cls||'')+'">'+esc(s||'')+'</div></div>';}
  function section(no,id,title,meta,body){return '<section class="ofx-section" id="ofx-'+id+'"><div class="ofx-sec-h"><span class="ofx-sec-no">'+no+'</span><span class="ofx-sec-title">'+esc(title)+'</span><span class="ofx-sec-meta">'+esc(meta||'')+'</span></div>'+body+'</section>';}
  function sourceRows(d){
    var src=d.sources.length?d.sources:[['Source pipeline','']];
    return src.map(function(s,i){return '<div class="ofx-source">'+(s[1]?'<a href="'+esc(s[1])+'" target="_blank" rel="noopener">'+esc(s[0])+' ↗</a>':'<span>'+esc(s[0])+'</span>')+'<span class="ofx-quality '+(i?'m':'h')+'">'+(i?'MEDIUM':'HIGH')+'</span><small>Public-source record · last verified '+esc(d.asOf)+'</small></div>';}).join('');
  }
  function analyticsHtml(d){
    var v=verifiedFor(d),linked=!!(d.hasDossier&&d.sources&&d.sources.length),impactValues=[];
    if(v){
      impactValues=[['Civilian casualties',v.civilian.total.toLocaleString(),'OHCHR verified'],['Forced displacement',v.displacement.total.toFixed(1)+'M','UNHCR verified'],['Direct damage',v.economy.damage,'RDNA verified'],['Recovery need',v.economy.recovery,'RDNA estimate']];
    } else {
      var fatal=linked&&/\d/.test(String(d.fatalities||''))?d.fatalities:'Not reported';
      var displaced=linked&&/\d/.test(String(d.displaced||''))?d.displaced:'Not reported';
      impactValues=[['Civilian casualties',fatal,fatal==='Not reported'?'No linked figure':'Source-linked estimate'],['Forced displacement',displaced,displaced==='Not reported'?'No linked figure':'Source-linked estimate'],['Direct economic damage','Not reported','No linked figure'],['Recovery need','Not reported','No linked figure']];
    }
    var verified=section('01','impact','Verified impact',v?'source-backed':(linked?'source-linked estimates':'verification pending'),'<div class="ofx-impact-grid">'+impactValues.map(function(x){return '<div class="ofx-impact '+(x[1]==='Not reported'?'missing':'')+'"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></div>';}).join('')+'</div><div class="ofx-ai-brief"><span>AI brief</span><p>'+esc(briefFor(d))+'</p></div>'+(v?'<div class="ofx-proof"><a href="'+esc(v.civilian.source)+'" target="_blank" rel="noopener">OHCHR ↗</a><a href="'+esc(v.displacement.source)+'" target="_blank" rel="noopener">UNHCR ↗</a></div>':'<div class="ofx-note">Unreported figures remain explicit; no value is inferred.</div>'));

    var age=durationLabel(d.since),actors=d.actors||[],entities=d.entities||headlineEntities(d.name),supporters=d.supporters||[],systems=d.equipment||[];
    var named=actors.length?actors:entities;
    var context=section('02','context','Operational picture',linked?'linked event dossier':'feed record','<div class="ofx-context-grid">'
      +[['Conflict age',age==='—'?'Not reported':age,'From displayed start'],['Named entities',named.length||'Not identified',actors.length?'Dossier actors':'From headline'],['External support',supporters.length||'Not reported',supporters.length?'Recorded channels':'No linked record'],['Military systems',systems.length||'Not reported',systems.length?'Equipment groups':'No linked record']].map(function(x){return '<div class="ofx-context-kpi"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></div>';}).join('')+'</div>'
      +'<div class="ofx-context-lines"><div class="ofx-context-line"><span>Actors / headline entities</span>'+esc(named.slice(0,4).join(' · ')||'Not identified in feed')+'</div><div class="ofx-context-line"><span>Systems observed</span>'+esc(systems.slice(0,3).join(' · ')||'Not reported in feed')+'</div></div>'
      +'<div class="ofx-chiprow">'+(supporters.length?supporters.slice(0,4):['External support not reported']).map(function(x){return '<span class="ofx-chip">'+esc(x)+'</span>';}).join('')+'</div>'
    );

    var b=beneficiaryFor(d,v),contractRows='',proof='',benefitMeta='not attributable',benefitNote='Company-level value is not published in the linked event record.';
    if(b){
      benefitMeta=b.label;benefitNote=b.scope;
      contractRows=b.beneficiaries.slice(0,3).map(function(x){return '<div class="ofx-contract"><strong>'+esc(x.company)+'</strong><span>'+esc(x.systems)+'</span><b>'+esc(x.value)+'</b></div>';}).join('');
      var sourceItems=b.source?[{source:b.source,label:b.sourceLabel||'Source'}]:b.beneficiaries.filter(function(x){return x.source;}).slice(0,3).map(function(x,i){return {source:x.source,label:'DSCA '+(i+1)};});
      proof='<span class="ofx-proof">'+sourceItems.map(function(x){return '<a href="'+esc(x.source)+'" target="_blank" rel="noopener">'+esc(x.label)+' ↗</a>';}).join('')+'</span>';
    } else {
      contractRows='<div class="ofx-contract empty"><strong>Not attributable</strong><span>No linked company contract</span><b>Not reported</b></div>';
    }
    var beneficiaries=section('03','beneficiaries','War beneficiaries',benefitMeta,'<div class="ofx-sec-h" style="margin-top:2px"><span class="ofx-sec-title">Company · supplied system · value</span>'+proof+'</div><div class="ofx-contracts">'+contractRows+'</div><div class="ofx-note">'+esc(benefitNote)+'</div>');
    return '<div class="ofx">'
      +'<div class="ofx-top"><div class="ofx-command"><i class="ofx-riskdot"></i><span class="ofx-title">'+esc(d.name)+'</span><span class="ofx-status">'+esc(d.status)+'</span></div><div class="ofx-sub"><span>'+esc(d.region)+'</span><span>'+esc(d.type)+'</span><span>Since '+esc(prettyDate(d.since))+'</span></div></div>'
      +verified
      +context
      +beneficiaries
      +'</div>';
  }
  function wireAnalytics(root,d){
    root.querySelectorAll('.ofx-nav button').forEach(function(b){b.addEventListener('click',function(){root.querySelectorAll('.ofx-nav button').forEach(function(x){x.classList.toggle('on',x===b);});var t=root.querySelector('#ofx-'+b.dataset.go);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});});});
    root.querySelectorAll('.ofx-period button').forEach(function(b){b.addEventListener('click',function(){var p=d.periods[b.dataset.p]||d.periods['24H'];root.querySelectorAll('.ofx-period button').forEach(function(x){x.classList.toggle('on',x===b);});var a=root.querySelector('#ofxTempo'),c=root.querySelector('#ofxTerritory'),s=root.querySelector('#ofxSignals'),w=root.querySelector('#ofxWindow');if(a)a.textContent=p.tempo;if(c)c.textContent=p.territory;if(s)s.textContent=p.signals;if(w)w.textContent=p.label;});});
    root.addEventListener('mouseover',function(e){var x=e.target.closest('[data-tip]');if(!x)return;showTip(x.getAttribute('data-tip'),e.clientX,e.clientY);});
    root.addEventListener('mousemove',function(e){if(tip&&!tip.hidden)positionTip(e.clientX,e.clientY);});
    root.addEventListener('mouseout',function(e){var x=e.target.closest('[data-tip]');if(x&&!(e.relatedTarget&&x.contains(e.relatedTarget)))hideTip();});
  }
  function showTip(text,x,y){if(!tip){tip=document.createElement('div');tip.id='ofxTip';tip.hidden=true;document.body.appendChild(tip);}tip.innerHTML='<b>Severity calculation</b>'+esc(text);tip.hidden=false;positionTip(x,y);}
  function positionTip(x,y){if(!tip)return;tip.style.left=Math.min(innerWidth-260,x+14)+'px';tip.style.top=Math.min(innerHeight-110,y+16)+'px';}
  function hideTip(){if(tip)tip.hidden=true;}
  function renderAnalytics(){
    if(!isOpenFronts())return;
    var pane=document.querySelector('#detail .niy-pane-analytics'); if(!pane)return;
    if(!selected){return;}
    if(pane.dataset.ofxId===selected.id&&pane.querySelector('.ofx'))return;
    pane.innerHTML=analyticsHtml(selected);wireAnalytics(pane,selected);
    pane.dataset.ofxId=selected.id;
  }
  function syncDetailAnalysis(panel,d){
    var card=panel&&panel.querySelector('.niy-rd-panel');if(!card||!d)return;
    var box=card.querySelector('.rd-ai');
    if(!box){box=document.createElement('div');box.className='rd-section rd-ai';var meta=card.querySelector('.row-detail-meta');if(meta)meta.insertAdjacentElement('afterend',box);}
    var latest=String(d.latest||'No recent development is recorded.').replace(/\s+/g,' ').trim();
    box.innerHTML='<div class="rd-sec-label">✦ NIYANTRAN ANALYSIS</div>'
      +'<div class="rd-ai-brief">'+esc(d.name)+' is tracked in Open Fronts as '+esc(String(d.type||'conflict').toLowerCase())+' in '+esc(d.region)+' and is currently '+esc(d.status)+'.</div>'
      +'<div class="rd-ai-sub"><span>Why it matters</span>The event is tracked because it remains an unresolved '+esc(String(d.type||'conflict').toLowerCase())+' affecting '+esc(d.region)+'.</div>'
      +'<div class="rd-ai-sub"><span>Latest feed note</span>'+esc(latest)+'</div>'
      +'<div class="rd-ai-tags"><span class="rd-ai-tag">'+esc(d.region)+'</span><span class="rd-ai-tag">'+esc(d.type)+'</span><span class="rd-ai-tag">'+esc(d.status)+'</span></div>';
  }
  function setSelected(row,tr){
    selected=dossierFor(row||{});selectedRow=tr||null;window.NIY_OPEN_FRONTS_SELECTED=selected;document.body.classList.add('niy-ofx-open');
    modeLabels();attachSelected();
    setTimeout(function(){
      modeLabels();
      var split=document.querySelector('#detail .niy-split');if(split)split.dataset.ofxSelected=selected.id;
      var analyticsMode=document.querySelector('#detail .niy-mode[data-mode="analytics"]');
      if(analyticsMode&&analyticsMode.classList.contains('active'))renderAnalytics();
      var p=selectedRow&&selectedRow.nextElementSibling;if(p&&p.classList.contains('niy-rd-panel-row')){syncDetailAnalysis(p,selected);var h=p.querySelector('.niy-rd-panel-head');if(h&&!h.querySelector('.ofx-pin')){var pin=document.createElement('span');pin.className='ofx-pin';pin.textContent='SELECTED · AI READY';pin.style.cssText='margin-left:auto;font:700 8px var(--font-mono,monospace);letter-spacing:.09em;color:#24834f';h.insertBefore(pin,h.querySelector('.niy-rd-close'));}}
      renderAiBanner();
    },0);
  }
  function enforceSplit(){
    var split=document.querySelector('#detail .niy-split');if(!split)return;
    split.classList.remove('only-work','only-feed');
    var feed=split.querySelector('.niy-col-feed'),work=split.querySelector('.niy-col-work'),divider=split.querySelector('.niy-divider');
    if(feed)feed.style.removeProperty('display');if(work)work.style.removeProperty('display');if(divider)divider.style.removeProperty('display');
    try{localStorage.setItem('niyCollapse','');}catch(e){}
  }
  function sync(){
    if(!isOpenFronts()){document.body.classList.remove('niy-ofx-open');return;}
    document.body.classList.add('niy-ofx-open');enforceSplit();modeLabels();renderAiBanner();
    var a=document.querySelector('#detail .niy-mode[data-mode="analytics"].active');if(a&&selected)renderAnalytics();
  }
  window.addEventListener('click',function(e){
    if(!isOpenFronts())return;
    var ask=e.target.closest&&e.target.closest('#rdAskAi');
    if(ask){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!selected){var panel=ask.closest('.niy-rd-panel-row'),row=panel&&panel.previousElementSibling;if(row)setSelected(rowObject(row),row);}openAi('Analyse this selected conflict headline. What changed, why does it matter, and what should I monitor over the next 7 days?');return;}
    var row=e.target.closest&&e.target.closest('#detail table.sample tbody tr[data-row-idx]');
    if(row&&!row.classList.contains('niy-rd-panel-row')&&!e.target.closest('a,button,input,select,textarea'))setSelected(rowObject(row),row);
  },true);
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('#detail .niy-mode[data-mode="analytics"]');if(b&&isOpenFronts())setTimeout(renderAnalytics,0);
    var i=e.target.closest&&e.target.closest('#detail .niy-mode[data-mode="ai"]');if(i&&isOpenFronts())setTimeout(renderAiBanner,0);
  });
  var syncQueued=false;
  var observer=new MutationObserver(function(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(function(){syncQueued=false;sync();});});
  function boot(){var d=document.getElementById('detail');if(d)observer.observe(d,{childList:true,subtree:true});sync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.NiyOpenFrontsPilot={selected:function(){return selected;},render:renderAnalytics,attach:attachSelected,openAi:openAi,_test:{dossierFor:dossierFor,analyticsHtml:analyticsHtml,cardFor:cardFor}};
})();
