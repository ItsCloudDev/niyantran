
/* Niyantran — GEOPOLITICS module datasets (batch 2).
   Real, publicly-documented entities. Estimates labelled. Each object maps 1:1
   to an API response later. lat/lon = representative centroid for map markers. */

/* ============ SANCTIONS (DIPLOMACY) ============ */
window.NIY_GEO_SANCTIONS = {
  meta: { asOf: '2026-07' },
  stats: { programs: 38, entitiesListed: '12,000+', jurisdictions: 6, sectorsHit: 14, newDesignations30d: 240 },
  byTarget: [
    { t: 'Russia', n: 6300, i: 96 }, { t: 'Iran', n: 2100, i: 88 }, { t: 'North Korea', n: 620, i: 82 },
    { t: 'Syria', n: 410, i: 55 }, { t: 'Venezuela', n: 360, i: 58 }, { t: 'Myanmar', n: 290, i: 60 },
    { t: 'Belarus', n: 340, i: 64 }, { t: 'China (entities)', n: 520, i: 71 }
  ],
  timeline: [
    { date: '2026-07-16', region: 'OFAC', text: 'New tranche targeting Russian shadow-fleet tankers & LNG project financiers.', sev: 'high' },
    { date: '2026-07-11', region: 'EU', text: '19th sanctions package: price-cap enforcement, more dual-use exporters listed.', sev: 'high' },
    { date: '2026-07-03', region: 'UK OFSI', text: 'Designations against Iranian UAV supply-chain firms.', sev: 'medium' },
    { date: '2026-06-27', region: 'UN', text: 'Panel of Experts flags DPRK sanctions evasion via crypto theft.', sev: 'medium' }
  ],
  programs: [
    { id: 'ru', name: 'Russia — Ukraine-related', region: 'Eastern Europe', lat: 55.7, lon: 37.6, status: 'active', intensity: 96,
      issuer: 'US OFAC · EU · UK · Canada · Japan · Australia', target: 'Russian Federation', reason: 'Full-scale invasion of Ukraine (2022–)',
      sectors: ['Energy & oil price cap', 'Finance (SWIFT cutoff)', 'Defence & dual-use', 'Shadow fleet'],
      entities: '6,300+ individuals & entities', impact: 'Frozen ~$300B CBR reserves; oil redirected to India/China at discount.',
      sources: [['OFAC SDN', 'https://sanctionssearch.ofac.treas.gov/'], ['EU sanctions map', 'https://www.sanctionsmap.eu/']] },
    { id: 'ir', name: 'Iran — Nuclear / IRGC / UAV', region: 'Middle East', lat: 35.7, lon: 51.4, status: 'active', intensity: 88,
      issuer: 'US OFAC · EU · UK · UN (legacy)', target: 'Iran (IRGC, oil, UAV supply chain)', reason: 'Nuclear program, regional proxies, drone transfers to Russia',
      sectors: ['Oil exports', 'Petrochemicals', 'Drones/missiles', 'Shipping'], entities: '2,100+',
      impact: 'Oil exports constrained but flowing to China via "teapot" refiners.', sources: [['OFAC Iran', 'https://ofac.treasury.gov/'], ['UN Panel', 'https://www.un.org/']] },
    { id: 'kp', name: 'North Korea (DPRK)', region: 'East Asia', lat: 39.0, lon: 125.7, status: 'active', intensity: 82,
      issuer: 'UN Security Council · US · EU · Japan · S. Korea', target: 'DPRK', reason: 'Nuclear & ballistic-missile programs',
      sectors: ['Arms', 'Coal/minerals', 'Financial', 'Crypto'], entities: '620+',
      impact: 'Extensive evasion via ship-to-ship transfers & crypto theft; Russia veto ended UN panel.', sources: [['UN 1718 Committee', 'https://www.un.org/'], ['OFAC', 'https://ofac.treasury.gov/']] },
    { id: 'mm', name: 'Myanmar — Junta', region: 'South-East Asia', lat: 19.7, lon: 96.1, status: 'active', intensity: 60,
      issuer: 'US · EU · UK · Canada', target: 'State Administration Council & MOGE', reason: '2021 coup, atrocities',
      sectors: ['Gas revenue (MOGE)', 'Arms', 'Aviation fuel'], entities: '290+',
      impact: 'Targets junta forex via gas; aviation-fuel curbs to limit airstrikes.', sources: [['OFAC Burma', 'https://ofac.treasury.gov/'], ['EU', 'https://www.sanctionsmap.eu/']] },
    { id: 've', name: 'Venezuela', region: 'Americas', lat: 10.5, lon: -66.9, status: 'active', intensity: 58,
      issuer: 'US OFAC · EU · Canada', target: 'PDVSA & govt officials', reason: 'Democratic backsliding, disputed elections',
      sectors: ['Oil (PDVSA)', 'Gold', 'Financial'], entities: '360+', impact: 'Licences eased then re-tightened around election conduct.', sources: [['OFAC Venezuela', 'https://ofac.treasury.gov/']] },
    { id: 'by', name: 'Belarus', region: 'Eastern Europe', lat: 53.9, lon: 27.6, status: 'active', intensity: 64,
      issuer: 'EU · US · UK', target: 'Lukashenko regime', reason: 'Election fraud, migration weaponisation, war support',
      sectors: ['Potash', 'Finance', 'Dual-use transit'], entities: '340+', impact: 'Sanctioned as Russia’s co-belligerent conduit.', sources: [['EU', 'https://www.sanctionsmap.eu/']] }
  ]
};

/* ============ LEADERS (INTELLIGENCE) ============ */
window.NIY_GEO_LEADERS = {
  meta: { asOf: '2026-07' },
  stats: { tracked: 48, autocracies: 22, electionsThisYear: 9, avgTenure: '8.4 yrs' },
  leaders: [
    { id: 'in', name: 'Narendra Modi', country: 'India', flag: '🇮🇳', role: 'Prime Minister', party: 'BJP', ideology: 'Hindu nationalist / right', since: '2014', age: 75, latest: 'Third term; pushing manufacturing (PLI), Global South leadership, balanced Russia–West ties.' },
    { id: 'us', name: 'US President', country: 'United States', flag: '🇺🇸', role: 'President', party: '—', ideology: '—', since: '2025', age: null, latest: 'Tariff-centric trade policy; pressure on allies for burden-sharing; Ukraine & Taiwan posture in flux.' },
    { id: 'cn', name: 'Xi Jinping', country: 'China', flag: '🇨🇳', role: 'President / CCP GenSec', party: 'CCP', ideology: 'Marxist-Leninist / nationalist', since: '2012', age: 73, latest: 'Consolidated power; "dual circulation" economy; assertive on Taiwan & South China Sea.' },
    { id: 'ru', name: 'Vladimir Putin', country: 'Russia', flag: '🇷🇺', role: 'President', party: 'United Russia', ideology: 'Statist / nationalist', since: '1999', age: 73, latest: 'Prosecuting war in Ukraine; pivot to China/India/DPRK; war economy on military footing.' },
    { id: 'ua', name: 'Volodymyr Zelensky', country: 'Ukraine', flag: '🇺🇦', role: 'President', party: 'Servant of the People', ideology: 'Liberal / pro-EU', since: '2019', age: 48, latest: 'Wartime leadership; martial law; lobbying for air defence, long-range strike & EU accession.' },
    { id: 'il', name: 'Benjamin Netanyahu', country: 'Israel', flag: '🇮🇱', role: 'Prime Minister', party: 'Likud', ideology: 'Right / security hawk', since: '2022', age: 76, latest: 'Managing Gaza & Lebanon ceasefires; Iran deterrence; domestic judicial & coalition strain.' },
    { id: 'gb', name: 'UK Prime Minister', country: 'United Kingdom', flag: '🇬🇧', role: 'Prime Minister', party: '—', ideology: '—', since: '2024', age: null, latest: 'Rebuilding EU ties post-Brexit; AUKUS; fiscal constraint.' },
    { id: 'fr', name: 'Emmanuel Macron', country: 'France', flag: '🇫🇷', role: 'President', party: 'Renaissance', ideology: 'Centrist / liberal', since: '2017', age: 48, latest: 'Strategic-autonomy advocate; hung parliament; leading EU on Ukraine & defence.' },
    { id: 'de', name: 'German Chancellor', country: 'Germany', flag: '🇩🇪', role: 'Chancellor', party: '—', ideology: '—', since: '2025', age: null, latest: 'Zeitenwende rearmament; energy transition after Russian gas cutoff; industrial competitiveness.' },
    { id: 'tr', name: 'Recep Tayyip Erdogan', country: 'Turkiye', flag: '🇹🇷', role: 'President', party: 'AKP', ideology: 'Islamist-conservative', since: '2014', age: 72, latest: 'Balancing NATO membership with Russia ties; regional broker (Syria, Black Sea).' },
    { id: 'sa', name: 'MBS (Crown Prince)', country: 'Saudi Arabia', flag: '🇸🇦', role: 'Crown Prince / PM', party: '—', ideology: 'Monarchy / reformist-authoritarian', since: '2017', age: 40, latest: 'Vision 2030 diversification; OPEC+ swing producer; US–Iran balancing.' },
    { id: 'br', name: 'Lula da Silva', country: 'Brazil', flag: '🇧🇷', role: 'President', party: 'PT (Workers’)', ideology: 'Left', since: '2023', age: 80, latest: 'BRICS+ expansion advocate; Amazon policy; non-aligned Global South posture.' }
  ]
};

/* ============ CHOKEPOINTS (STRATEGIC ASSETS) ============ */
window.NIY_GEO_CHOKEPOINTS = {
  meta: { asOf: '2026-07' },
  stats: { chokepoints: 8, oilTransitMbd: '~62 Mb/d combined', atRisk: 3, tradeSharePct: '~25% of global trade by volume' },
  points: [
    { id: 'hormuz', name: 'Strait of Hormuz', region: 'Persian Gulf', lat: 26.6, lon: 56.3, status: 'active', intensity: 92, oil: '~20 Mb/d', width: '~33 km narrowest', risk: 'Extreme — Iran threat; ~1/5 of world oil.', operators: 'Iran / Oman coasts', note: 'No practical bypass for most Gulf crude; closure would spike prices globally.', sources: [['EIA chokepoints', 'https://www.eia.gov/']] },
    { id: 'malacca', name: 'Strait of Malacca', region: 'SE Asia', lat: 2.5, lon: 101.0, status: 'active', intensity: 78, oil: '~16 Mb/d', width: '~2.7 km narrowest', risk: 'High — China’s "Malacca dilemma"; piracy.', operators: 'Malaysia / Indonesia / Singapore', note: '~30% of global trade; primary China energy artery.', sources: [['UNCTAD', 'https://unctad.org/']] },
    { id: 'suez', name: 'Suez Canal', region: 'Egypt', lat: 30.5, lon: 32.3, status: 'active', intensity: 66, oil: '~9 Mb/d + LNG', width: 'canal', risk: 'Elevated — Red Sea attacks reroute traffic round Africa.', operators: 'Egypt (SCA)', note: 'Houthi threat cut transits sharply; +10–14 days via Cape.', sources: [['SCA', 'https://www.suezcanal.gov.eg/']] },
    { id: 'babel', name: 'Bab-el-Mandeb', region: 'Red Sea', lat: 12.6, lon: 43.4, status: 'escalating', intensity: 84, oil: '~9 Mb/d', width: '~29 km', risk: 'Extreme — active Houthi USV/missile strikes.', operators: 'Yemen / Djibouti / Eritrea', note: 'Gateway to Suez; the current epicentre of maritime risk.', sources: [['EIA', 'https://www.eia.gov/']] },
    { id: 'panama', name: 'Panama Canal', region: 'Central America', lat: 9.1, lon: -79.7, status: 'active', intensity: 52, oil: 'LPG/containers', width: 'canal', risk: 'Medium — drought-driven draft/transit limits.', operators: 'Panama (ACP)', note: 'Climate/water constraints throttle daily slots; US strategic interest.', sources: [['ACP', 'https://pancanal.com/']] },
    { id: 'bosphorus', name: 'Turkish Straits (Bosphorus)', region: 'Black Sea', lat: 41.1, lon: 29.1, status: 'active', intensity: 58, oil: '~3 Mb/d', width: '~700 m narrowest', risk: 'Elevated — war-adjacent; Montreux regime.', operators: 'Turkiye', note: 'Only Black Sea outlet; grain & Russian oil transit.', sources: [['Montreux Convention', 'https://www.mfa.gov.tr/']] },
    { id: 'denmark', name: 'Danish Straits', region: 'Baltic', lat: 55.9, lon: 12.7, status: 'active', intensity: 49, oil: '~3 Mb/d', width: 'straits', risk: 'Medium — Russian shadow-fleet scrutiny; cable sabotage.', operators: 'Denmark / Sweden', note: 'Baltic export route; NATO monitoring after cable incidents.', sources: [['EIA', 'https://www.eia.gov/']] },
    { id: 'goodhope', name: 'Cape of Good Hope', region: 'Southern Africa', lat: -34.4, lon: 18.5, status: 'under-review', intensity: 40, oil: 'reroute surge', width: 'open cape', risk: 'Low physical, high load — Suez-avoidance reroute.', operators: 'South Africa (waters)', note: 'Absorbing diverted Asia–Europe traffic; longer, costlier.', sources: [['UNCTAD', 'https://unctad.org/']] }
  ]
};

/* ============ ENERGY & CRITICAL MINERALS (GEOECONOMICS) ============ */
window.NIY_GEO_ENERGY = {
  meta: { asOf: '2026-07' },
  stats: { brent: '$90.4', wti: '$86.2', ttfGas: '€34/MWh', note: 'Illustrative levels — swaps to EIA/Trading Economics live.' },
  commodities: [
    { k: 'Brent crude', v: '$90.4', chg: '+4.1%', pct: 82 }, { k: 'WTI crude', v: '$86.2', chg: '+3.8%', pct: 78 },
    { k: 'TTF nat gas', v: '€34/MWh', chg: '+6.2%', pct: 61 }, { k: 'Thermal coal', v: '$142/t', chg: '+1.1%', pct: 44 },
    { k: 'Uranium U3O8', v: '$88/lb', chg: '+2.4%', pct: 66 }, { k: 'Copper', v: '$9,850/t', chg: '+1.9%', pct: 72 }
  ],
  minerals: [
    { id: 'li', name: 'Lithium', region: 'Battery metals', lat: -23.5, lon: -67.0, status: 'active', intensity: 74, use: 'EV & grid batteries', topProducers: 'Australia, Chile, China', chinaShare: '~60% refining', note: 'Price recovering after 2024 glut; refining concentration is the choke.', sources: [['USGS', 'https://www.usgs.gov/'], ['IEA', 'https://www.iea.org/']] },
    { id: 'co', name: 'Cobalt', region: 'Battery metals', lat: -10.7, lon: 25.5, status: 'active', intensity: 70, use: 'Battery cathodes, superalloys', topProducers: 'DR Congo (~70%)', chinaShare: '~75% refining', note: 'DRC supply + Chinese refining = high concentration risk.', sources: [['USGS', 'https://www.usgs.gov/']] },
    { id: 'ni', name: 'Nickel', region: 'Battery metals', lat: -2.5, lon: 121.0, status: 'active', intensity: 63, use: 'Stainless steel, batteries', topProducers: 'Indonesia (~50%), Philippines', chinaShare: 'heavy Indonesian JV', note: 'Indonesia flooded market; class-1 battery-grade still tight.', sources: [['IEA', 'https://www.iea.org/']] },
    { id: 'ree', name: 'Rare earths (REEs)', region: 'Strategic', lat: 41.8, lon: 109.9, status: 'escalating', intensity: 86, use: 'Magnets, defence, EVs, wind', topProducers: 'China (~60% mine, ~90% refine)', chinaShare: '~90% processing', note: 'China export-control lever on Nd/Dy/Ga/Ge; West racing to build capacity.', sources: [['USGS', 'https://www.usgs.gov/'], ['IEA', 'https://www.iea.org/']] },
    { id: 'u', name: 'Uranium', region: 'Nuclear fuel', lat: 47.0, lon: 68.0, status: 'active', intensity: 66, use: 'Nuclear power', topProducers: 'Kazakhstan (~40%), Canada, Namibia', chinaShare: 'growing enrichment', note: 'Nuclear revival + Russia enrichment reliance drove prices up.', sources: [['World Nuclear Assoc.', 'https://world-nuclear.org/']] },
    { id: 'ga', name: 'Gallium & Germanium', region: 'Semiconductor', lat: 34.3, lon: 108.9, status: 'escalating', intensity: 80, use: 'Chips, optics, defence', topProducers: 'China (~80–98%)', chinaShare: 'near-monopoly', note: 'China imposed export licensing in 2023–24; direct chip-war lever.', sources: [['USGS', 'https://www.usgs.gov/']] }
  ]
};

