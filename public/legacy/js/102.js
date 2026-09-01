
/* ============================================================================
   NYAYA BRAIN — legal-sector Brain  ·  force-directed graph  ·  2026-08-18
   Topic ↔ constitutional Article ↔ Statute ↔ Doctrine ↔ Verdict, with evidence.
   The legal analogue of the company Brain: instead of datapoint→company, the
   graph links constitutional TOPICS to the laws and judgments that engage them.

   REMOVABILITY: 100% additive. Edits NO existing code. Watches window.activeTier
   and injects its own launcher only on the Law (judiciary) tab. Delete this
   <script> and the terminal is byte-for-byte its prior self.

   PHASE 0: hand-curated landmark seed. Bands are jurisprudential centrality;
   overruled cases are stamped, never deleted. Legal information, not advice.
   ========================================================================== */
(function () {
  'use strict';
  if (window.NyayaBrain) return;

  /* ---- topic ontology (anchored to the Constitution) ---------------------- */
  var TOPICS = [
    { id:'child_marriage', label:'Child Marriage', articles:['21','21A','15(3)','24','23'],
      statutes:['Prohibition of Child Marriage Act, 2006','POCSO Act, 2012','IPC §375 (Exception 2)'],
      blurb:'Minimum marriage age, protection of minors, and the conflict between personal law and the child’s constitutional protections.' },
    { id:'privacy', label:'Right to Privacy', articles:['21','19','14'],
      statutes:['Aadhaar Act, 2016','IT Act, 2000','DPDP Act, 2023'],
      blurb:'Whether privacy is a fundamental right intrinsic to life and liberty, and its limits against state surveillance and data collection.' },
    { id:'free_speech', label:'Free Speech & Sedition', articles:['19(1)(a)','19(2)','21'],
      statutes:['IT Act §66A','IPC §124A (Sedition)','BNS §152'],
      blurb:'The scope of free expression and the constitutionality of restrictions such as sedition and online-speech provisions.' },
    { id:'reservation', label:'Reservation & Equality', articles:['14','15','15(4)','15(6)','16','16(4)','16(6)'],
      statutes:['Constitution (103rd Amendment) Act, 2019','State Reservation Acts'],
      blurb:'Affirmative action, the 50% ceiling, the creamy layer, and economic-criteria (EWS) reservation.' },
    { id:'environment', label:'Environmental Protection', articles:['21','48A','51A(g)','32'],
      statutes:['Environment (Protection) Act, 1986','Water Act, 1974','Air Act, 1981'],
      blurb:'The right to a clean environment as part of Article 21, and doctrines of absolute liability and sustainable development.' },
    { id:'lgbtq', label:'LGBTQ+ Rights', articles:['14','15','19','21'],
      statutes:['IPC §377','Transgender Persons (Protection of Rights) Act, 2019'],
      blurb:'Decriminalisation of consensual same-sex relations and recognition of gender identity.' },
    { id:'women_equality', label:'Women’s Equality & Dignity', articles:['14','15','15(3)','21','25'],
      statutes:['POSH Act, 2013','IPC §497 (Adultery)','Muslim Women (Protection) Act, 2019'],
      blurb:'Workplace harassment, gender-discriminatory penal provisions, and reform of discriminatory personal-law practices.' },
    { id:'liberty_detention', label:'Personal Liberty & Detention', articles:['21','22','14','19'],
      statutes:['CrPC / BNSS','Preventive Detention statutes','MISA (historical)'],
      blurb:'The meaning of “procedure established by law”, substantive due process, and limits on preventive detention.' },
    { id:'death_penalty', label:'Death Penalty', articles:['21','14'],
      statutes:['IPC §302 / BNS §103','CrPC §354(3)'],
      blurb:'Constitutionality of capital punishment and the “rarest of rare” sentencing doctrine.' },
    { id:'basic_structure', label:'Basic Structure & Amendment', articles:['368','13','14','21'],
      statutes:['Constitution (24th, 25th, 42nd, 44th Amendment) Acts'],
      blurb:'The limits of Parliament’s power to amend the Constitution — the basic-structure doctrine.' },
    { id:'ucc', label:'Uniform Civil Code', articles:['44','25','26','14','15'],
      statutes:['Personal law statutes','Special Marriage Act, 1954'],
      blurb:'The directive to secure a uniform civil code and its tension with religious personal law.' },
    { id:'dignity_caste', label:'Caste, Dignity & Untouchability', articles:['17','21','23','15'],
      statutes:['SC/ST (Prevention of Atrocities) Act, 1989','Manual Scavengers Act, 2013'],
      blurb:'Abolition of untouchability, manual scavenging, and the guarantee of human dignity.' }
  ];

  /* ---- verdicts (band = jurisprudential centrality; s = ordering tiebreak) - */
  var CASES = [
    { name:'Independent Thought v. Union of India', cite:'(2017) 10 SCC 800', court:'Supreme Court', year:2017,
      topics:['child_marriage','women_equality'], articles:['21','15(3)','24'], statutes:['IPC §375 (Exception 2)','POCSO Act, 2012'], doctrines:['Harmonious Construction'],
      band:'Landmark', status:'good', s:0.95, path:'L1',
      holding:'Read down Exception 2 to IPC §375: sex by a man with his wife aged 15–18 is rape. Harmonised the marital-rape exception with POCSO and the child’s Article 21 rights.' },
    { name:'Court on its own motion (Lajja Devi) v. State', cite:'(2012) 193 DLT 61 (FB)', court:'Delhi High Court', year:2012,
      topics:['child_marriage'], articles:['21','15(3)'], statutes:['Prohibition of Child Marriage Act, 2006','Hindu Marriage Act, 1955'], doctrines:[],
      band:'Strong', status:'good', s:0.72, path:'L1',
      holding:'Examined the validity of minors’ marriages and the interplay of PCMA with personal-law marriage ages; a child marriage is voidable at the minor’s option.' },
    { name:'Seema v. Ashwani Kumar', cite:'(2006) 2 SCC 578', court:'Supreme Court', year:2006,
      topics:['child_marriage'], articles:['21'], statutes:['Compulsory Registration of Marriages'], doctrines:[],
      band:'Relevant', status:'good', s:0.45, path:'L4',
      holding:'Directed compulsory registration of all marriages, a safeguard against child and fraudulent marriages.' },
    { name:'K.S. Puttaswamy v. Union of India (Privacy)', cite:'(2017) 10 SCC 1', court:'Supreme Court', year:2017,
      topics:['privacy','liberty_detention'], articles:['21','14','19'], statutes:[], doctrines:['Proportionality','Due Process'],
      band:'Landmark', status:'good', s:0.98, path:'L2',
      holding:'Right to privacy is a fundamental right intrinsic to life and liberty under Article 21 and Part III. Overruled M.P. Sharma and Kharak Singh to the contrary.' },
    { name:'K.S. Puttaswamy v. Union of India (Aadhaar)', cite:'(2019) 1 SCC 1', court:'Supreme Court', year:2018,
      topics:['privacy'], articles:['21','14'], statutes:['Aadhaar Act, 2016'], doctrines:['Proportionality'],
      band:'Strong', status:'good', s:0.8, path:'L1',
      holding:'Upheld the Aadhaar Act on proportionality but struck §57 (private-party use) and read down mandatory linking.' },
    { name:'PUCL v. Union of India (Telephone Tapping)', cite:'(1997) 1 SCC 301', court:'Supreme Court', year:1997,
      topics:['privacy'], articles:['21','19(1)(a)'], statutes:['Indian Telegraph Act, 1885 §5(2)'], doctrines:['Due Process'],
      band:'Relevant', status:'good', s:0.5, path:'L2',
      holding:'Telephone tapping infringes privacy under Article 21 unless done under a just, fair and reasonable procedure; laid down safeguards.' },
    { name:'Shreya Singhal v. Union of India', cite:'(2015) 5 SCC 1', court:'Supreme Court', year:2015,
      topics:['free_speech'], articles:['19(1)(a)','19(2)','14'], statutes:['IT Act §66A'], doctrines:['Vagueness / Overbreadth'],
      band:'Landmark', status:'good', s:0.94, path:'L1',
      holding:'Struck down §66A of the IT Act as unconstitutionally vague and overbroad, violating Article 19(1)(a); read down §79 intermediary liability.' },
    { name:'Kedar Nath Singh v. State of Bihar', cite:'AIR 1962 SC 955', court:'Supreme Court', year:1962,
      topics:['free_speech'], articles:['19(1)(a)','19(2)'], statutes:['IPC §124A (Sedition)'], doctrines:['Reading Down'],
      band:'Strong', status:'good', s:0.78, path:'L1',
      holding:'Upheld sedition (§124A) but read it down: only speech with a tendency to incite violence or public disorder is punishable, not mere criticism.' },
    { name:'Romesh Thappar v. State of Madras', cite:'AIR 1950 SC 124', court:'Supreme Court', year:1950,
      topics:['free_speech'], articles:['19(1)(a)','19(2)'], statutes:[], doctrines:[],
      band:'Relevant', status:'good', s:0.55, path:'L2',
      holding:'Freedom of speech includes freedom of circulation; a ban must fall within Article 19(2) — led to the First Amendment adding “public order”.' },
    { name:'S. Rangarajan v. P. Jagjivan Ram', cite:'(1989) 2 SCC 574', court:'Supreme Court', year:1989,
      topics:['free_speech'], articles:['19(1)(a)','19(2)'], statutes:[], doctrines:['Proximate Incitement'],
      band:'Relevant', status:'good', s:0.42, path:'L2',
      holding:'The State cannot plead a hostile audience to justify censorship; the standard is proximate and direct incitement, not remote possibility.' },
    { name:'Indra Sawhney v. Union of India', cite:'1992 Supp (3) SCC 217', court:'Supreme Court', year:1992,
      topics:['reservation'], articles:['16(4)','15(4)','14'], statutes:[], doctrines:['Reasonable Classification'],
      band:'Landmark', status:'good', s:0.93, path:'L2',
      holding:'Upheld 27% OBC reservation; capped total reservation at 50%; excluded the “creamy layer”; barred reservation in promotions (later amended).' },
    { name:'M. Nagaraj v. Union of India', cite:'(2006) 8 SCC 212', court:'Supreme Court', year:2006,
      topics:['reservation'], articles:['16(4A)','16(4B)','14'], statutes:['Constitution (77th & 85th Amendment) Acts'], doctrines:['Reasonable Classification'],
      band:'Strong', status:'good', s:0.75, path:'L1',
      holding:'Upheld promotion-reservation amendments subject to the State showing backwardness, inadequate representation and administrative efficiency.' },
    { name:'Janhit Abhiyan v. Union of India (EWS)', cite:'(2023) 5 SCC 1', court:'Supreme Court', year:2022,
      topics:['reservation'], articles:['15(6)','16(6)','14'], statutes:['Constitution (103rd Amendment) Act, 2019'], doctrines:['Basic Structure'],
      band:'Strong', status:'good', s:0.77, path:'L1',
      holding:'Upheld 10% EWS reservation 3:2; economic criteria a permissible basis and the 50% ceiling does not bind the EWS category.' },
    { name:'M.R. Balaji v. State of Mysore', cite:'AIR 1963 SC 649', court:'Supreme Court', year:1963,
      topics:['reservation'], articles:['15(4)'], statutes:[], doctrines:[],
      band:'Relevant', status:'superseded', s:0.4, path:'L2',
      holding:'First articulated the ~50% limit and that reservation is an exception; much of its reasoning was reframed by Indra Sawhney.' },
    { name:'M.C. Mehta v. Union of India (Oleum Gas Leak)', cite:'(1987) 1 SCC 395', court:'Supreme Court', year:1987,
      topics:['environment'], articles:['21','32'], statutes:['Environment (Protection) Act, 1986'], doctrines:['Absolute Liability'],
      band:'Landmark', status:'good', s:0.9, path:'L2',
      holding:'Evolved the rule of ABSOLUTE liability for hazardous enterprises — no exceptions — departing from Rylands v. Fletcher; expanded Article 32 remedies.' },
    { name:'Subhash Kumar v. State of Bihar', cite:'(1991) 1 SCC 598', court:'Supreme Court', year:1991,
      topics:['environment'], articles:['21'], statutes:['Water Act, 1974'], doctrines:[],
      band:'Strong', status:'good', s:0.74, path:'L2',
      holding:'The right to life under Article 21 includes the right to enjoyment of pollution-free water and air.' },
    { name:'Vellore Citizens Welfare Forum v. Union of India', cite:'(1996) 5 SCC 647', court:'Supreme Court', year:1996,
      topics:['environment'], articles:['21','48A','51A(g)'], statutes:['Environment (Protection) Act, 1986'], doctrines:['Precautionary Principle','Polluter Pays'],
      band:'Strong', status:'good', s:0.73, path:'L3',
      holding:'Incorporated the Precautionary Principle and Polluter Pays into Indian law as part of sustainable development under Article 21.' },
    { name:'M.C. Mehta v. Union of India (Taj Trapezium)', cite:'(1997) 2 SCC 353', court:'Supreme Court', year:1997,
      topics:['environment'], articles:['21','48A'], statutes:['Air Act, 1981'], doctrines:['Precautionary Principle'],
      band:'Relevant', status:'good', s:0.48, path:'L3',
      holding:'Ordered industries around the Taj Mahal to switch fuel or relocate, applying the precautionary principle to a heritage monument.' },
    { name:'Navtej Singh Johar v. Union of India', cite:'(2018) 10 SCC 1', court:'Supreme Court', year:2018,
      topics:['lgbtq'], articles:['14','15','19','21'], statutes:['IPC §377'], doctrines:['Manifest Arbitrariness','Transformative Constitutionalism'],
      band:'Landmark', status:'good', s:0.95, path:'L1',
      holding:'Read down §377 to decriminalise consensual same-sex relations between adults; violated dignity, equality and privacy. Overruled Suresh Kumar Koushal.' },
    { name:'NALSA v. Union of India', cite:'(2014) 5 SCC 438', court:'Supreme Court', year:2014,
      topics:['lgbtq','women_equality'], articles:['14','15','16','21'], statutes:[], doctrines:['Transformative Constitutionalism'],
      band:'Landmark', status:'good', s:0.9, path:'L2',
      holding:'Recognised transgender persons as a “third gender” with the right to self-identify; directed reservations and welfare measures.' },
    { name:'Suresh Kumar Koushal v. Naz Foundation', cite:'(2014) 1 SCC 1', court:'Supreme Court', year:2013,
      topics:['lgbtq'], articles:['14','15','21'], statutes:['IPC §377'], doctrines:[],
      band:'Peripheral', status:'overruled', s:0.2, path:'L1',
      holding:'Reinstated §377 and reversed the Delhi HC — OVERRULED by Navtej Johar (2018). Retained to show why the law changed.' },
    { name:'Vishaka v. State of Rajasthan', cite:'(1997) 6 SCC 241', court:'Supreme Court', year:1997,
      topics:['women_equality'], articles:['14','15','19','21'], statutes:['(pre-POSH) CEDAW guidelines'], doctrines:['International Law Incorporation'],
      band:'Landmark', status:'good', s:0.88, path:'L2',
      holding:'Laid down binding guidelines against workplace sexual harassment (later the POSH Act, 2013), reading CEDAW into Articles 14/15/21.' },
    { name:'Joseph Shine v. Union of India', cite:'(2019) 3 SCC 39', court:'Supreme Court', year:2018,
      topics:['women_equality'], articles:['14','15','21'], statutes:['IPC §497 (Adultery)'], doctrines:['Manifest Arbitrariness'],
      band:'Strong', status:'good', s:0.79, path:'L1',
      holding:'Struck down §497 (adultery) — it treated women as property and violated equality and dignity.' },
    { name:'Shayara Bano v. Union of India (Triple Talaq)', cite:'(2017) 9 SCC 1', court:'Supreme Court', year:2017,
      topics:['women_equality','ucc'], articles:['14','15','21','25'], statutes:['Muslim Personal Law'], doctrines:['Manifest Arbitrariness'],
      band:'Strong', status:'good', s:0.8, path:'L2',
      holding:'Set aside instantaneous triple talaq (talaq-e-biddat) as arbitrary and unconstitutional; led to the 2019 Act.' },
    { name:'Maneka Gandhi v. Union of India', cite:'(1978) 1 SCC 248', court:'Supreme Court', year:1978,
      topics:['liberty_detention','privacy'], articles:['21','14','19'], statutes:['Passport Act, 1967'], doctrines:['Due Process','Golden Triangle'],
      band:'Landmark', status:'good', s:0.97, path:'L2',
      holding:'“Procedure established by law” must be just, fair and reasonable — introduced substantive due process; Articles 14, 19 and 21 interlink.' },
    { name:'A.K. Gopalan v. State of Madras', cite:'AIR 1950 SC 27', court:'Supreme Court', year:1950,
      topics:['liberty_detention'], articles:['21','22','19'], statutes:['Preventive Detention Act, 1950'], doctrines:[],
      band:'Peripheral', status:'superseded', s:0.25, path:'L2',
      holding:'Held Article 21 required only a procedure enacted by law and treated fundamental rights as isolated — SUPERSEDED by Maneka Gandhi (1978).' },
    { name:'ADM Jabalpur v. Shivkant Shukla (Habeas Corpus)', cite:'(1976) 2 SCC 521', court:'Supreme Court', year:1976,
      topics:['liberty_detention'], articles:['21','22'], statutes:['MISA, 1971'], doctrines:[],
      band:'Peripheral', status:'overruled', s:0.15, path:'L2',
      holding:'Held that during Emergency the right to move courts to enforce Article 21 stood suspended — expressly OVERRULED in Puttaswamy (2017).' },
    { name:'Sunil Batra v. Delhi Administration', cite:'(1978) 4 SCC 494', court:'Supreme Court', year:1978,
      topics:['liberty_detention','dignity_caste'], articles:['21','14','19'], statutes:['Prisons Act, 1894'], doctrines:['Due Process'],
      band:'Relevant', status:'good', s:0.5, path:'L2',
      holding:'Prisoners retain fundamental rights; solitary confinement and bar fetters are subject to Article 21 fairness.' },
    { name:'Bachan Singh v. State of Punjab', cite:'(1980) 2 SCC 684', court:'Supreme Court', year:1980,
      topics:['death_penalty'], articles:['21','14','19'], statutes:['IPC §302','CrPC §354(3)'], doctrines:['Rarest of Rare'],
      band:'Landmark', status:'good', s:0.9, path:'L1',
      holding:'Upheld the death penalty but confined it to the “rarest of rare” cases where the alternative is unquestionably foreclosed.' },
    { name:'Machhi Singh v. State of Punjab', cite:'(1983) 3 SCC 470', court:'Supreme Court', year:1983,
      topics:['death_penalty'], articles:['21'], statutes:['IPC §302'], doctrines:['Rarest of Rare'],
      band:'Strong', status:'good', s:0.7, path:'L5',
      holding:'Elaborated the “rarest of rare” test into five categories and a balance-sheet of aggravating and mitigating circumstances.' },
    { name:'Kesavananda Bharati v. State of Kerala', cite:'(1973) 4 SCC 225', court:'Supreme Court', year:1973,
      topics:['basic_structure'], articles:['368','13','14','21'], statutes:['Constitution (24th & 25th Amendment) Acts'], doctrines:['Basic Structure'],
      band:'Landmark', status:'good', s:0.99, path:'L2',
      holding:'Parliament can amend any part of the Constitution but cannot alter its “basic structure” — the foundational doctrine of Indian constitutional law.' },
    { name:'Minerva Mills v. Union of India', cite:'(1980) 3 SCC 625', court:'Supreme Court', year:1980,
      topics:['basic_structure'], articles:['368','14','19'], statutes:['Constitution (42nd Amendment) Act, 1976'], doctrines:['Basic Structure'],
      band:'Strong', status:'good', s:0.82, path:'L1',
      holding:'Struck parts of the 42nd Amendment; the balance between Fundamental Rights and Directive Principles is itself basic structure.' },
    { name:'Indira Nehru Gandhi v. Raj Narain', cite:'1975 Supp SCC 1', court:'Supreme Court', year:1975,
      topics:['basic_structure'], articles:['368','14','329A'], statutes:['Constitution (39th Amendment) Act'], doctrines:['Basic Structure'],
      band:'Relevant', status:'good', s:0.55, path:'L2',
      holding:'Applied basic structure to strike an amendment shielding the PM’s election from review (free and fair elections = basic structure).' },
    { name:'Mohd. Ahmed Khan v. Shah Bano Begum', cite:'(1985) 2 SCC 556', court:'Supreme Court', year:1985,
      topics:['ucc','women_equality'], articles:['44','14','15','25'], statutes:['CrPC §125','Muslim Personal Law'], doctrines:[],
      band:'Strong', status:'superseded', s:0.68, path:'L2',
      holding:'A divorced Muslim woman is entitled to maintenance under §125 CrPC; urged a UCC. Legislatively altered by the 1986 Act (later softened by Danial Latifi).' },
    { name:'Sarla Mudgal v. Union of India', cite:'(1995) 3 SCC 635', court:'Supreme Court', year:1995,
      topics:['ucc'], articles:['44','25','21'], statutes:['Hindu Marriage Act, 1955','IPC §494'], doctrines:[],
      band:'Strong', status:'good', s:0.65, path:'L2',
      holding:'A Hindu husband converting to Islam to contract a second marriage does not dissolve the first; reiterated the call for a UCC.' },
    { name:'Shabnam Hashmi v. Union of India', cite:'(2014) 4 SCC 1', court:'Supreme Court', year:2014,
      topics:['ucc'], articles:['44','21','15'], statutes:['Juvenile Justice Act, 2000'], doctrines:[],
      band:'Relevant', status:'good', s:0.45, path:'L4',
      holding:'The right to adopt under the JJ Act is available irrespective of religion; a step toward a uniform secular framework.' },
    { name:'Safai Karamchari Andolan v. Union of India', cite:'(2014) 11 SCC 224', court:'Supreme Court', year:2014,
      topics:['dignity_caste'], articles:['17','21','23'], statutes:['Manual Scavengers Act, 2013'], doctrines:[],
      band:'Landmark', status:'good', s:0.85, path:'L1',
      holding:'Directed implementation of the 2013 Act abolishing manual scavenging, with compensation for sewer deaths and rehabilitation — rooted in Articles 17 and 21.' },
    { name:'State of Karnataka v. Appa Balu Ingale', cite:'(1995) Supp (4) SCC 469', court:'Supreme Court', year:1993,
      topics:['dignity_caste'], articles:['17','15','21'], statutes:['Protection of Civil Rights Act, 1955'], doctrines:[],
      band:'Relevant', status:'good', s:0.5, path:'L1',
      holding:'Untouchability under Article 17 is enforceable against private individuals; upheld convictions for denying access to a well.' },
    { name:'Indian Young Lawyers Assn. v. State of Kerala (Sabarimala)', cite:'(2019) 11 SCC 1', court:'Supreme Court', year:2018,
      topics:['dignity_caste','women_equality','ucc'], articles:['17','14','15','25','21'], statutes:[], doctrines:['Manifest Arbitrariness'],
      band:'Strong', status:'good', s:0.72, path:'L2',
      holding:'Held the exclusion of women of menstruating age from Sabarimala unconstitutional; “purity” notions offend dignity and Article 17. (Review pending.)' }
  ];

  /* ---- public API + resolver --------------------------------------------- */
  var BAND_ORDER={Landmark:0,Strong:1,Relevant:2,Peripheral:3};
  var BAND_META={
    Landmark:{tag:'LANDMARK',col:'#2e9e4f'},
    Strong:{tag:'STRONG',col:'#c8901a'},
    Relevant:{tag:'RELEVANT',col:'#6b7787'},
    Peripheral:{tag:'PERIPHERAL',col:'#d64545'}
  };
  function topicById(id){for(var i=0;i<TOPICS.length;i++)if(TOPICS[i].id===id)return TOPICS[i];return null;}
  function casesForTopic(id){var o=CASES.filter(function(c){return c.topics.indexOf(id)>=0;});
    o.sort(function(a,b){var d=BAND_ORDER[a.band]-BAND_ORDER[b.band];return d||((b.s||0)-(a.s||0));});return o;}

  window.NyayaBrain={
    topics:TOPICS, cases:CASES, topicById:topicById, casesForTopic:casesForTopic,
    stats:function(){var e=0;CASES.forEach(function(c){e+=c.topics.length;});
      var b={};CASES.forEach(function(c){b[c.band]=(b[c.band]||0)+1;});
      return{topics:TOPICS.length,cases:CASES.length,edges:e,bands:b};},
    selftest:function(){var pass=0,fail=[],ok;
      ok=true;CASES.forEach(function(c){c.topics.forEach(function(t){if(!topicById(t)){ok=false;fail.push('bad topic '+t);}});});ok?pass++:0;
      ok=true;TOPICS.forEach(function(t){if(!casesForTopic(t.id).length){ok=false;fail.push('no cases '+t.id);}});ok?pass++:0;
      ok=CASES.every(function(c){return c.holding&&c.holding.length>10;});ok?pass++:fail.push('holding');
      ok=CASES.every(function(c){return BAND_META[c.band];});ok?pass++:fail.push('band');
      ok=CASES.every(function(c){if(c.status==='overruled'&&c.band!=='Peripheral')return false;if(c.status!=='good'&&c.band==='Landmark')return false;return true;});ok?pass++:fail.push('demote');
      return{pass:pass,of:5,fail:fail};}
  };

  /* ======================================================================== */
  /*  GRAPH ENGINE                                                            */
  /* ======================================================================== */
  // node types & how they draw (shape carries type; nothing but bands use colour)
  //   topic    → filled circle (the universe, sized by degree)   ← "company"
  //   case     → small filled dot (the event)                    ← "event"
  //   article  → hollow circle                                   ← "sector"
  //   statute  → filled square                                   ← "institution"
  //   doctrine → filled diamond                                  ← "theme"
  //   court    → hollow square                                   ← "geography"
  // Neural design: uniform round "neurons"; COLOUR (not shape) carries type.
  var TYPE_COL={
    topic:'#ffca45',      // amber — the cortical hubs (topics)
    "case":'#4cc9f0',     // cyan — verdicts (the firing neurons)
    article:'#b388ff',    // violet — constitutional Articles
    statute:'#ff6b9d',    // rose — statutes
    doctrine:'#5cf2b6',   // mint — doctrines
    court:'#9aa7bd'       // slate — courts
  };
  var TYPE_LABEL={topic:'Topic',"case":'Verdict',article:'Article',statute:'Statute',doctrine:'Doctrine',court:'Court'};

  function buildGraph(){
    var nodes=[], byKey={}, edges=[];
    function add(type,key,label,extra){
      var id=type+':'+key;
      if(byKey[id]) return byKey[id];
      var n={id:id,type:type,key:key,label:label,deg:0,x:0,y:0,vx:0,vy:0};
      if(extra) for(var k in extra) n[k]=extra[k];
      byKey[id]=n; nodes.push(n); return n;
    }
    function link(a,b,kind,rest,strength){edges.push({a:a,b:b,kind:kind,rest:rest,strength:strength});a.deg++;b.deg++;}

    TOPICS.forEach(function(t){ add('topic',t.id,t.label,{topic:t}); });
    // topic → its declared articles/statutes (the structural backbone)
    TOPICS.forEach(function(t){
      var tn=byKey['topic:'+t.id];
      (t.articles||[]).forEach(function(a){ var an=add('article',a,'Art '+a); link(tn,an,'declares',120,0.35); });
      (t.statutes||[]).forEach(function(s){ var sn=add('statute',s,s); link(tn,sn,'operationalises',150,0.18); });
    });
    // cases → topics / articles / statutes / doctrines / court
    CASES.forEach(function(c){
      var cn=add('case',c.name,c.name,{caseRef:c, band:c.band});
      (c.topics||[]).forEach(function(id){ var tn=byKey['topic:'+id]; if(tn) link(cn,tn,'engages',70,0.9); });
      (c.articles||[]).forEach(function(a){ var an=add('article',a,'Art '+a); link(cn,an,'cites',150,0.14); });
      (c.statutes||[]).forEach(function(s){ if(!s) return; var sn=add('statute',s,s); link(cn,sn,'applies',150,0.12); });
      (c.doctrines||[]).forEach(function(d){ var dn=add('doctrine',d,d); link(cn,dn,'uses',130,0.2); });
      if(c.court){ var ct=add('court',c.court,c.court); link(cn,ct,'decidedBy',180,0.08); }
    });
    // uniform radius PER TYPE (every topic same, every verdict same, …)
    var RZ={topic:15, "case":6, article:8, statute:7, doctrine:8, court:7};
    nodes.forEach(function(n){ n.r=RZ[n.type]||6; });
    // seed positions in a disc
    var R=420;
    nodes.forEach(function(n,i){var a=i*2.399963,rr=R*Math.sqrt((i+1)/nodes.length);n.x=Math.cos(a)*rr;n.y=Math.sin(a)*rr;});
    return {nodes:nodes,edges:edges,byKey:byKey};
  }

  /* ---- force simulation --------------------------------------------------- */
  function makeSim(G){
    var alpha=1, K_REP=4200, K_GRAV=0.009, DAMP=0.87;
    function rw(n){ return n.type==='topic'?3.2:(n.type==='doctrine'||n.type==='article'?1.5:1); }
    function tick(){
      var ns=G.nodes, i, j, n=ns.length;
      // repulsion O(n^2) — n≈150, fine; hubs push harder so lobes separate
      for(i=0;i<n;i++){var a=ns[i];for(j=i+1;j<n;j++){var b=ns[j];
        var dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy||0.01, d=Math.sqrt(d2);
        var f=(K_REP*alpha*rw(a)*rw(b))/d2; var fx=dx/d*f, fy=dy/d*f;
        a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy;}}
      // springs
      G.edges.forEach(function(e){
        var dx=e.b.x-e.a.x, dy=e.b.y-e.a.y, d=Math.sqrt(dx*dx+dy*dy)||0.01;
        var f=(d-e.rest)*e.strength*0.06*alpha; var fx=dx/d*f, fy=dy/d*f;
        e.a.vx+=fx;e.a.vy+=fy;e.b.vx-=fx;e.b.vy-=fy;
      });
      // gravity to origin + integrate
      ns.forEach(function(a){
        a.vx-=a.x*K_GRAV*alpha; a.vy-=a.y*K_GRAV*alpha;
        a.vx*=DAMP; a.vy*=DAMP;
        if(!a.fixed){ a.x+=a.vx; a.y+=a.vy; }
      });
      alpha*=0.995; if(alpha<0.02) alpha=0.02;
    }
    return { tick:tick, reheat:function(v){alpha=v||0.9;} };
  }

  /* ---- UI / rendering ----------------------------------------------------- */
  var STYLE=[
    '#nyayaBrain{position:fixed;inset:0;z-index:60;display:none;background:#05070d;color:#e8edf6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
    '#nyayaBrain.show{display:block}',
    '#nyayaBrain *{box-sizing:border-box}',
    '.nbg-top{position:absolute;left:0;right:0;top:0;height:92px;padding:12px 20px;border-bottom:1px solid #1a2233;background:linear-gradient(180deg,#0b1220,#080d17);z-index:3}',
    '.nbg-t1{display:flex;align-items:baseline;gap:12px}',
    '.nbg-title{font-size:17px;font-weight:700;color:#fff}',
    '.nbg-sub{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#5f6b82}',
    '.nbg-disc{font-size:10.5px;color:#5f6b82;margin-top:3px}',
    '.nbg-close{margin-left:auto;cursor:pointer;border:1px solid #2a3548;border-radius:6px;padding:5px 12px;font-size:12px;background:#111a2b;color:#cdd6e6;font-family:inherit}',
    '.nbg-close:hover{background:#18233a}',
    '.nbg-tools{display:flex;align-items:center;gap:8px;margin-top:9px;flex-wrap:wrap}',
    '.nbg-seg{display:inline-flex;border:1px solid #2a3548;border-radius:7px;overflow:hidden}',
    '.nbg-seg button{border:0;background:#111a2b;padding:5px 13px;font-size:12px;cursor:pointer;font-family:inherit;color:#cdd6e6}',
    '.nbg-seg button.on{background:#e2603a;color:#fff}',
    '.nbg-btn{border:1px solid #2a3548;border-radius:7px;background:#111a2b;color:#cdd6e6;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit}',
    '.nbg-btn:hover{background:#18233a}',
    '.nbg-search{border:1px solid #2a3548;border-radius:7px;padding:5px 10px;font-size:12px;font-family:inherit;width:180px;background:#0c1421;color:#e8edf6}',
    '.nbg-search::placeholder{color:#54607a}',
    '.nbg-chip{font-size:11px;border:1px solid #2a3548;border-radius:20px;padding:3px 10px;cursor:pointer;background:#111a2b;color:#cdd6e6;user-select:none}',
    '.nbg-chip.off{opacity:.34;text-decoration:line-through}',
    '.nbg-count{font-size:11px;color:#5f6b82;margin-left:auto}',
    '#nbgCanvas{position:absolute;left:0;top:92px;right:0;bottom:0;display:block;cursor:grab}',
    '#nbgCanvas.drag{cursor:grabbing}',
    '.nbg-legend{position:absolute;right:16px;top:104px;background:rgba(10,16,28,.82);border:1px solid #1e2839;border-radius:9px;padding:10px 13px;font-size:11.5px;z-index:2;line-height:2;backdrop-filter:blur(4px)}',
    '.nbg-legend .lg{display:flex;align-items:center;gap:9px;color:#b7c1d4}',
    '.nbg-legend .gl{width:11px;height:11px;border-radius:50%;display:inline-block}',
    '.nbg-tip{position:absolute;pointer-events:none;background:rgba(8,12,20,.95);border:1px solid #24304a;color:#e8edf6;font-size:11px;padding:5px 8px;border-radius:6px;max-width:260px;z-index:5;display:none;line-height:1.35}',
    '.nbg-panel{position:absolute;right:0;top:92px;bottom:0;width:390px;max-width:88vw;background:#0a0f1a;border-left:1px solid #1a2233;padding:18px 20px;overflow:auto;transform:translateX(100%);transition:transform .18s ease;z-index:4}',
    '.nbg-panel.open{transform:none}',
    '.nbg-pclose{float:right;cursor:pointer;border:0;background:transparent;font-size:16px;color:#5f6b82}',
    '.nbg-pk{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#5f6b82}',
    '.nbg-pname{font-size:16px;font-weight:700;margin:3px 0 2px;line-height:1.25;color:#fff}',
    '.nbg-pcite{font-size:11.5px;color:#8592a8;margin-bottom:10px}',
    '.nbg-band{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.06em;border-radius:4px;padding:2px 7px;border:1px solid}',
    '.nbg-status{font-size:9.5px;font-weight:700;border-radius:3px;padding:1px 6px;margin-left:6px}',
    '.nbg-arts{display:flex;flex-wrap:wrap;gap:5px;margin:11px 0}',
    '.nbg-a{font-size:11px;border:1px solid #2a3548;border-radius:16px;padding:2px 9px;cursor:pointer;color:#cdd6e6}',
    '.nbg-a.art{border-color:#5b4b8a;color:#c9b8ff}',
    '.nbg-ev{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#5f6b82;margin:12px 0 3px}',
    '.nbg-hold{font-size:12.5px;line-height:1.6;color:#dbe2ee}',
    '.nbg-path{font-size:10.5px;color:#7a869c;margin-top:10px;border-top:1px dashed #23304a;padding-top:8px}',
    '.nbg-caselist{margin-top:8px}',
    '.nbg-cl{border:1px solid #1a2233;border-left:3px solid #33405a;border-radius:6px;padding:8px 10px;margin-bottom:7px;cursor:pointer;background:#0c1320}',
    '.nbg-cl:hover{background:#121b2c}',
    '.nbg-cl .cn{font-size:12.5px;font-weight:600;color:#e8edf6}',
    '.nbg-cl .cc{font-size:10.5px;color:#7a869c}',
    '.nb-launch{position:fixed;right:20px;bottom:20px;z-index:55;cursor:pointer;border:1px solid #e2603a;background:#0b1220;color:#f0e6e1;border-radius:22px;padding:10px 18px;font-size:13px;font-family:ui-monospace,monospace;box-shadow:0 4px 22px rgba(76,201,240,.25);display:none}',
    '.nb-launch:hover{background:#14203a}'
  ].join('');

  var elRoot, cv, ctx, tip, panel, legendEl, countEl, elLaunch, built=false;
  var G, sim, cam={x:0,y:0,k:1}, W=0, H=0, DPR=1, raf=0;
  var typeOn={topic:1,"case":1,article:1,statute:1,doctrine:1,court:1};
  var bandOn={Landmark:1,Strong:1,Relevant:1,Peripheral:1};
  var hoverN=null, selN=null, dragN=null, panning=false, lastX=0, lastY=0, moved=false, searchQ='';

  function build(){
    if(built) return; built=true;
    var st=document.createElement('style'); st.textContent=STYLE; document.head.appendChild(st);
    elRoot=document.createElement('div'); elRoot.id='nyayaBrain';
    var s=window.NyayaBrain.stats();
    elRoot.innerHTML=
      '<div class="nbg-top">'+
        '<div class="nbg-t1"><span class="nbg-title">⚖ Nyaya Brain</span>'+
          '<span class="nbg-sub">Topic ↔ Constitution ↔ Verdict — knowledge graph</span>'+
          '<button class="nbg-close" id="nbgClose">✕ Close</button></div>'+
        '<div class="nbg-disc">Surfaces how landmark judgments connect to constitutional topics — legal information for research, not advice. Every node shows its evidence.</div>'+
        '<div class="nbg-tools">'+
          '<span class="nbg-seg"><button id="nbgGraph" class="on">Graph</button><button id="nbgList">List</button></span>'+
          '<input class="nbg-search" id="nbgSearch" placeholder="Search case / article / topic…">'+
          '<span class="nbg-chip" data-band="Landmark">Landmark</span>'+
          '<span class="nbg-chip" data-band="Strong">Strong</span>'+
          '<span class="nbg-chip" data-band="Relevant">Relevant</span>'+
          '<span class="nbg-chip" data-band="Peripheral">Peripheral</span>'+
          '<button class="nbg-btn" id="nbgFit">Fit</button>'+
          '<button class="nbg-btn" id="nbgRebuild">↻ Rebuild</button>'+
          '<span class="nbg-count" id="nbgCount"></span>'+
        '</div>'+
      '</div>'+
      '<canvas id="nbgCanvas"></canvas>'+
      '<div class="nbg-legend" id="nbgLegend"></div>'+
      '<div class="nbg-tip" id="nbgTip"></div>'+
      '<div class="nbg-panel" id="nbgPanel"></div>';
    document.body.appendChild(elRoot);

    cv=elRoot.querySelector('#nbgCanvas'); ctx=cv.getContext('2d');
    tip=elRoot.querySelector('#nbgTip'); panel=elRoot.querySelector('#nbgPanel');
    legendEl=elRoot.querySelector('#nbgLegend'); countEl=elRoot.querySelector('#nbgCount');

    legendEl.innerHTML=['topic','case','article','statute','doctrine','court'].map(function(t){
      return '<div class="lg"><span class="gl" style="background:'+TYPE_COL[t]+';box-shadow:0 0 7px '+TYPE_COL[t]+'"></span>'+TYPE_LABEL[t]+'</div>';
    }).join('');

    elRoot.querySelector('#nbgClose').addEventListener('click', close);
    elRoot.querySelector('#nbgGraph').addEventListener('click', function(){ setMode('graph'); });
    elRoot.querySelector('#nbgList').addEventListener('click', function(){ setMode('list'); });
    elRoot.querySelector('#nbgFit').addEventListener('click', fit);
    elRoot.querySelector('#nbgRebuild').addEventListener('click', function(){ rebuild(); });
    elRoot.querySelector('#nbgSearch').addEventListener('input', function(e){ searchQ=e.target.value.toLowerCase().trim(); });
    elRoot.querySelectorAll('.nbg-chip').forEach(function(ch){
      ch.addEventListener('click', function(){ var b=ch.dataset.band; bandOn[b]=bandOn[b]?0:1; ch.classList.toggle('off',!bandOn[b]); });
    });

    // pointer interaction
    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cv.addEventListener('wheel', onWheel, {passive:false});
    cv.addEventListener('mousemove', onHover);
    cv.addEventListener('click', onClick);

    // launcher
    elLaunch=document.createElement('button'); elLaunch.className='nb-launch';
    elLaunch.innerHTML='⚖ Nyaya Brain'; elLaunch.addEventListener('click', open);
    document.body.appendChild(elLaunch);

    rebuild(true);
  }

  var mode='graph';
  function setMode(m){
    mode=m;
    elRoot.querySelector('#nbgGraph').classList.toggle('on',m==='graph');
    elRoot.querySelector('#nbgList').classList.toggle('on',m==='list');
    if(m==='list') showList(); else { closePanel(); }
    cv.style.display=(m==='graph')?'block':'none';
    legendEl.style.display=(m==='graph')?'block':'none';
  }

  function rebuild(first){
    G=buildGraph(); sim=makeSim(G);
    // warm start: run a bunch of ticks headlessly so it opens settled
    for(var i=0;i<360;i++) sim.tick();
    fit();
    countEl.textContent=G.nodes.length+' nodes · '+G.edges.length+' links';
    if(first) return;
    sim.reheat(0.9);
  }

  var TOPH=92;
  function resize(){
    DPR=window.devicePixelRatio||1;
    W=(elRoot&&elRoot.clientWidth)||window.innerWidth||1200;
    H=((elRoot&&elRoot.clientHeight)||window.innerHeight||800)-TOPH;
    if(H<50) H=(window.innerHeight||800)-TOPH;
    cv.style.width=W+'px'; cv.style.height=H+'px';
    cv.width=W*DPR; cv.height=H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function fit(){
    resize();
    var xs=G.nodes.map(function(n){return n.x;}), ys=G.nodes.map(function(n){return n.y;});
    var minX=Math.min.apply(0,xs),maxX=Math.max.apply(0,xs),minY=Math.min.apply(0,ys),maxY=Math.max.apply(0,ys);
    var gw=(maxX-minX)||1, gh=(maxY-minY)||1;
    var k=Math.min((W-120)/gw,(H-120)/gh); k=Math.max(0.15,Math.min(k,2.2));
    cam.k=k; cam.x=(minX+maxX)/2; cam.y=(minY+maxY)/2;
  }
  function w2s(x,y){ return [ (x-cam.x)*cam.k + W/2, (y-cam.y)*cam.k + H/2 ]; }
  function s2w(sx,sy){ return [ (sx-W/2)/cam.k + cam.x, (sy-H/2)/cam.k + cam.y ]; }

  function visible(n){
    if(!typeOn[n.type]) return false;
    if(n.type==='case' && !bandOn[n.band]) return false;
    return true;
  }
  function matchSearch(n){
    if(!searchQ) return true;
    return (n.label||'').toLowerCase().indexOf(searchQ)>=0;
  }

  var _t=0;
  function hexA(hex,a){ var h=hex.replace('#',''); var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16); return 'rgba('+r+','+g+','+b+','+a+')'; }

  function draw(){
    if(W===0||H===0){ resize(); if(W===0||H===0) return; fit(); }
    // deep neural field background
    var bg=ctx.createRadialGradient(W*0.5,H*0.46,40, W*0.5,H*0.5, Math.max(W,H)*0.8);
    bg.addColorStop(0,'#0d1524'); bg.addColorStop(0.55,'#0a0f1a'); bg.addColorStop(1,'#05070d');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // ---- synapses (curved axons, colour-blended, glow) ----
    ctx.lineCap='round';
    G.edges.forEach(function(e){
      if(!visible(e.a)||!visible(e.b)) return;
      var hi = (hoverN && (e.a===hoverN||e.b===hoverN)) || (selN && (e.a===selN||e.b===selN));
      var p=w2s(e.a.x,e.a.y), q=w2s(e.b.x,e.b.y);
      var mx=(p[0]+q[0])/2, my=(p[1]+q[1])/2;
      // slight perpendicular bow → organic, dendritic feel
      var dx=q[0]-p[0], dy=q[1]-p[1], len=Math.sqrt(dx*dx+dy*dy)||1;
      var bow=Math.min(26, len*0.14); var cx=mx - dy/len*bow, cy=my + dx/len*bow;
      if(hi){
        var g=ctx.createLinearGradient(p[0],p[1],q[0],q[1]);
        g.addColorStop(0,hexA(TYPE_COL[e.a.type]||'#8fb3ff',0.9));
        g.addColorStop(1,hexA(TYPE_COL[e.b.type]||'#8fb3ff',0.9));
        ctx.strokeStyle=g; ctx.lineWidth=1.8; ctx.shadowColor='rgba(120,180,255,0.7)'; ctx.shadowBlur=8;
        ctx.setLineDash([5,7]); ctx.lineDashOffset=-((_t*0.9)%12);   // animated flow along active synapses
      } else {
        ctx.strokeStyle='rgba(120,150,210,0.10)'; ctx.lineWidth=1; ctx.shadowBlur=0; ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.quadraticCurveTo(cx,cy,q[0],q[1]); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.shadowBlur=0;

    // ---- neurons ----
    G.nodes.forEach(function(n){
      if(!visible(n)) return;
      var p=w2s(n.x,n.y), x=p[0], y=p[1], r=n.r;
      var dim = (searchQ && !matchSearch(n)) ? 0.14 : 1;
      var isHi = (n===hoverN||n===selN);
      var col = TYPE_COL[n.type]||'#8fb3ff';
      // gentle breathing pulse, stronger on hubs
      var pulse = 1 + 0.08*Math.sin(_t*0.05 + (n.deg||1));
      var rr = r*(n.type==='topic'?pulse:1);
      ctx.globalAlpha=dim;
      // outer glow halo
      var halo=ctx.createRadialGradient(x,y,0,x,y,rr*3.2);
      halo.addColorStop(0, hexA(isHi?'#ffffff':col, isHi?0.5:0.32));
      halo.addColorStop(1, hexA(col,0));
      ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(x,y,rr*3.2,0,6.2832); ctx.fill();
      // core
      ctx.shadowColor=hexA(col,0.9); ctx.shadowBlur=isHi?18:10;
      ctx.beginPath(); ctx.arc(x,y,rr,0,6.2832);
      ctx.fillStyle=isHi?'#ffffff':col; ctx.fill();
      ctx.shadowBlur=0;
      // bright inner dot for depth
      ctx.beginPath(); ctx.arc(x-rr*0.28,y-rr*0.28,Math.max(1,rr*0.34),0,6.2832);
      ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fill();
      // verdict band → thin outline ring (keeps band info without a 2nd colour axis)
      if(n.type==='case' && n.caseRef){ ctx.beginPath(); ctx.arc(x,y,rr+2.2,0,6.2832);
        ctx.strokeStyle=hexA(BAND_META[n.band].col,0.9); ctx.lineWidth=1.4; ctx.stroke(); }

      var showLabel=(n.type==='topic')||(n.type==='doctrine'&&r>7)||(n.type==='article'&&n.deg>3)||isHi||(cam.k>0.95&&n.type!=='case')||(cam.k>1.5);
      if(showLabel && dim>0.5){
        ctx.globalAlpha=isHi?1:0.82;
        ctx.fillStyle=isHi?'#ffffff':hexA(col,0.95);
        ctx.font=(n.type==='topic'?'700 ':'')+(isHi?12:n.type==='topic'?12:10.5)+'px ui-monospace,monospace';
        ctx.textAlign='center'; ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
        var lab=n.label.length>26?n.label.slice(0,25)+'…':n.label;
        ctx.fillText(lab,x,y+rr+12); ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;
    });
  }

  function loop(){
    if(!elRoot.classList.contains('show')||mode!=='graph'){ raf=0; return; }
    _t++; sim.tick(); draw(); raf=requestAnimationFrame(loop);
  }
  function startLoop(){ if(!raf) raf=requestAnimationFrame(loop); }

  function pickAt(sx,sy){
    var best=null, bd=1e9;
    for(var i=G.nodes.length-1;i>=0;i--){ var n=G.nodes[i]; if(!visible(n))continue;
      var p=w2s(n.x,n.y), dx=p[0]-sx, dy=p[1]-sy, d=Math.sqrt(dx*dx+dy*dy);
      if(d<=n.r+5 && d<bd){ bd=d; best=n; } }
    return best;
  }
  function onDown(e){
    var sx=e.offsetX, sy=e.offsetY, n=pickAt(sx,sy); moved=false;
    if(n){ dragN=n; n.fixed=true; } else { panning=true; cv.classList.add('drag'); }
    lastX=e.clientX; lastY=e.clientY;
  }
  function onMove(e){
    if(dragN){ var wp=s2w(e.clientX-cv.getBoundingClientRect().left, e.clientY-cv.getBoundingClientRect().top-0);
      // account for canvas offset (canvas starts at top:92)
      var rect=cv.getBoundingClientRect(); var w=s2w(e.clientX-rect.left, e.clientY-rect.top);
      dragN.x=w[0]; dragN.y=w[1]; dragN.vx=0; dragN.vy=0; sim.reheat(0.5); moved=true; startLoop(); }
    else if(panning){ var dx=e.clientX-lastX, dy=e.clientY-lastY; cam.x-=dx/cam.k; cam.y-=dy/cam.k; lastX=e.clientX; lastY=e.clientY; moved=true; draw(); }
  }
  function onUp(){ if(dragN){ dragN.fixed=false; dragN=null; } panning=false; cv.classList.remove('drag'); }
  function onWheel(e){ e.preventDefault();
    var rect=cv.getBoundingClientRect(), sx=e.clientX-rect.left, sy=e.clientY-rect.top;
    var before=s2w(sx,sy); var f=e.deltaY<0?1.12:0.89; cam.k=Math.max(0.12,Math.min(cam.k*f,4));
    var after=s2w(sx,sy); cam.x+=before[0]-after[0]; cam.y+=before[1]-after[1]; draw();
  }
  function onHover(e){
    var n=pickAt(e.offsetX,e.offsetY);
    if(n!==hoverN){ hoverN=n; draw(); }
    if(n){ tip.style.display='block'; tip.style.left=(e.offsetX+14)+'px'; tip.style.top=(e.offsetY+92+14)+'px';
      tip.innerHTML=tipHtml(n); } else tip.style.display='none';
  }
  function tipHtml(n){
    if(n.type==='case'){ var c=n.caseRef; return '<b>'+esc(c.name)+'</b><br>'+esc(c.cite)+' · '+BAND_META[c.band].tag; }
    if(n.type==='topic'){ return '<b>'+esc(n.label)+'</b><br>topic · '+casesForTopic(n.key).length+' cases'; }
    if(n.type==='article'){ return '<b>Article '+esc(n.key)+'</b><br>'+n.deg+' links'; }
    if(n.type==='doctrine'){ return '<b>'+esc(n.label)+'</b><br>doctrine · '+n.deg+' cases'; }
    if(n.type==='statute'){ return '<b>'+esc(n.label)+'</b><br>statute'; }
    return '<b>'+esc(n.label)+'</b><br>'+n.type;
  }
  function onClick(e){
    if(moved) return; var n=pickAt(e.offsetX,e.offsetY);
    if(!n){ selN=null; closePanel(); draw(); return; }
    selN=n; draw(); openPanelFor(n);
  }

  function openPanelFor(n){
    var html='<button class="nbg-pclose" id="nbgPClose">✕</button>';
    if(n.type==='case'){
      var c=n.caseRef, m=BAND_META[c.band];
      var stag=c.status==='overruled'?'<span class="nbg-status" style="background:#fbe3e3;color:#d64545">OVERRULED</span>':
               c.status==='superseded'?'<span class="nbg-status" style="background:#f6ecd6;color:#c8901a">SUPERSEDED</span>':'';
      html+='<div class="nbg-pk">Verdict</div>'+
        '<div class="nbg-pname">'+esc(c.name)+stag+'</div>'+
        '<div class="nbg-pcite">'+esc(c.cite)+' · '+esc(c.court)+'</div>'+
        '<span class="nbg-band" style="color:'+m.col+';border-color:'+m.col+'">'+m.tag+'</span>'+
        '<div class="nbg-arts">'+(c.articles||[]).map(function(a){return '<span class="nbg-a art" data-art="'+esc(a)+'">Art '+esc(a)+'</span>';}).join('')+
          (c.statutes||[]).filter(Boolean).map(function(x){return '<span class="nbg-a">'+esc(x)+'</span>';}).join('')+
          (c.doctrines||[]).map(function(d){return '<span class="nbg-a">◆ '+esc(d)+'</span>';}).join('')+'</div>'+
        '<div class="nbg-ev">Holding — evidence</div><div class="nbg-hold">'+esc(c.holding)+'</div>'+
        '<div class="nbg-path">Engages via path '+esc(c.path)+' · '+pathText(c.path)+'</div>';
    } else if(n.type==='topic'){
      var t=n.topic, list=casesForTopic(t.id);
      html+='<div class="nbg-pk">Topic</div><div class="nbg-pname">'+esc(t.label)+'</div>'+
        '<div class="nbg-arts">'+(t.articles||[]).map(function(a){return '<span class="nbg-a art">Art '+esc(a)+'</span>';}).join('')+
          (t.statutes||[]).map(function(x){return '<span class="nbg-a">'+esc(x)+'</span>';}).join('')+'</div>'+
        '<div class="nbg-hold" style="color:#aab4c6">'+esc(t.blurb)+'</div>'+
        '<div class="nbg-ev">Related verdicts · '+list.length+'</div><div class="nbg-caselist">'+
        list.map(function(c){var m=BAND_META[c.band];return '<div class="nbg-cl" data-case="'+esc(c.name)+'" style="border-left-color:'+m.col+'"><div class="cn">'+esc(c.name)+'</div><div class="cc">'+esc(c.cite)+' · '+m.tag+'</div></div>';}).join('')+'</div>';
    } else {
      // article / statute / doctrine / court → list the cases touching it
      var rel=CASES.filter(function(c){
        if(n.type==='article') return (c.articles||[]).indexOf(n.key)>=0;
        if(n.type==='statute') return (c.statutes||[]).indexOf(n.key)>=0;
        if(n.type==='doctrine') return (c.doctrines||[]).indexOf(n.key)>=0;
        if(n.type==='court') return c.court===n.key;
      });
      var kLabel=n.type==='article'?'Article '+n.key:n.label;
      html+='<div class="nbg-pk">'+n.type+'</div><div class="nbg-pname">'+esc(kLabel)+'</div>'+
        '<div class="nbg-ev">Cases · '+rel.length+'</div><div class="nbg-caselist">'+
        rel.map(function(c){var m=BAND_META[c.band];return '<div class="nbg-cl" data-case="'+esc(c.name)+'" style="border-left-color:'+m.col+'"><div class="cn">'+esc(c.name)+'</div><div class="cc">'+esc(c.cite)+' · '+m.tag+'</div></div>';}).join('')+'</div>';
    }
    panel.innerHTML=html; panel.classList.add('open');
    panel.querySelector('#nbgPClose').addEventListener('click', function(){ selN=null; closePanel(); draw(); });
    panel.querySelectorAll('[data-case]').forEach(function(el){ el.addEventListener('click', function(){
      var nm=el.getAttribute('data-case'); var node=G.byKey['case:'+nm]; if(node){ selN=node; focusNode(node); openPanelFor(node); draw(); } }); });
    panel.querySelectorAll('[data-art]').forEach(function(el){ el.addEventListener('click', function(){
      var a=el.getAttribute('data-art'); var node=G.byKey['article:'+a]; if(node){ selN=node; focusNode(node); openPanelFor(node); draw(); } }); });
  }
  function focusNode(n){ cam.x=n.x; cam.y=n.y; cam.k=Math.max(cam.k,1.1); }
  function pathText(p){return p==='L1'?'names a topic statute/section':p==='L2'?'decides an Article the topic declares':p==='L3'?'applies a doctrine the topic engages':p==='L4'?'decided under a related subject':'cites a topic-linked precedent';}
  function closePanel(){ if(panel){ panel.classList.remove('open'); } }

  /* ---- list mode (fallback / the earlier panel view) --------------------- */
  function showList(){
    closePanel();
    var host=document.createElement('div'); // reuse panel as full list? simpler: temporary overlay
    // repurpose the side panel as a wide reading list
    panel.innerHTML='<button class="nbg-pclose" id="nbgPClose2">✕</button><div class="nbg-pk">All topics</div>'+
      TOPICS.map(function(t){var list=casesForTopic(t.id);
        return '<div style="margin:12px 0 4px;font-weight:700;font-size:13px">'+esc(t.label)+' <span style="color:#9098a2;font-weight:400">· '+list.length+'</span></div>'+
          list.map(function(c){var m=BAND_META[c.band];return '<div class="nbg-cl" data-case="'+esc(c.name)+'" style="border-left-color:'+m.col+'"><div class="cn">'+esc(c.name)+'</div><div class="cc">'+esc(c.cite)+' · '+m.tag+'</div></div>';}).join('');
      }).join('');
    panel.classList.add('open');
    panel.querySelector('#nbgPClose2').addEventListener('click', function(){ setMode('graph'); });
    panel.querySelectorAll('[data-case]').forEach(function(el){ el.addEventListener('click', function(){
      setMode('graph'); var nm=el.getAttribute('data-case'); var node=G.byKey['case:'+nm]; if(node){ selN=node; focusNode(node); openPanelFor(node); startLoop(); } }); });
  }

  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}

  function open(){ build(); elRoot.classList.add('show'); resize(); fit(); sim.reheat(0.7); startLoop(); }
  function close(){ if(elRoot) elRoot.classList.remove('show'); if(raf){cancelAnimationFrame(raf);raf=0;} }

  window.addEventListener('resize', function(){ if(elRoot&&elRoot.classList.contains('show')){ resize(); draw(); } });

  /* ---- launcher visibility: Law (judiciary) tab only --------------------- */
  function lawActive(){ try{ if(window.activeTier==='judiciary')return true;
    return !!document.querySelector('.tab[data-tier="judiciary"].active, .tab[data-tier="judiciary"][aria-selected="true"]'); }catch(e){return false;} }
  function tick(){ build(); var on=lawActive(); elLaunch.style.display=on?'block':'none'; if(!on&&elRoot.classList.contains('show')) close(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ build(); setInterval(tick,700); tick(); });
  else { build(); setInterval(tick,700); tick(); }

  console.log('[NyayaBrain] graph loaded · selftest', JSON.stringify(window.NyayaBrain.selftest()), '· nodes', (G?G.nodes.length:0));
})();
