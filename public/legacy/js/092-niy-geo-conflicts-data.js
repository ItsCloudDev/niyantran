
/* Niyantran — GEOPOLITICS · Conflicts intelligence dataset.
   Real, publicly-documented armed conflicts (curated from ACLED / UCDP / ISW /
   UN OCHA / UNHCR public reporting). Estimates are labelled and ranges, never
   fake precision. Split into logical sub-datasets per the intel-terminal spec;
   each maps 1:1 to an API response later (swap the object, keep the renderer).
   lat/lon = a representative centroid for the map marker. intensity 0-100 is an
   analyst composite (event tempo × lethality × escalation). */
window.NIY_GEO_CONFLICTS = {
  meta: { asOf: '2026-07', sourcesNote: 'Curated from public reporting; figures are estimates unless a primary source is cited.' },

  stats: {
    activeConflicts: 32, escalatingCount: 7, ceasefireFragile: 5,
    fatalities12mo: '160,000–210,000', displacedTotal: '122M+', newThisMonth: 3
  },

  // regional rollup for the breakdown panel
  regions: [
    { region: 'Middle East & N. Africa', active: 9, intensity: 78, share: 0.30 },
    { region: 'Sub-Saharan Africa', active: 11, intensity: 71, share: 0.34 },
    { region: 'Eastern Europe', active: 2, intensity: 92, share: 0.08 },
    { region: 'South & Central Asia', active: 5, intensity: 54, share: 0.16 },
    { region: 'East Asia & Pacific', active: 2, intensity: 41, share: 0.06 },
    { region: 'Americas', active: 3, intensity: 47, share: 0.06 }
  ],

  conflicts: [
    { id: 'rus-ukr', name: 'Russia–Ukraine War', region: 'Eastern Europe', lat: 48.4, lon: 37.8,
      status: 'active', intensity: 95, since: '2022-02', fatalitiesEst: '~500k casualties (both sides, est.)', displaced: '6.5M refugees + 3.7M IDP',
      actors: ['Russian Armed Forces', 'Ukrainian Armed Forces'], supporters: ['NATO/US/EU → Ukraine', 'North Korea, Iran → Russia'],
      equipment: ['ATACMS, HIMARS, F-16', 'Shahed-136, Iskander, glide bombs'],
      latest: 'Grinding attritional front around Donetsk & Zaporizhzhia; sustained long-range strike exchanges on energy grid.',
      sources: [['ISW daily assessment', 'https://www.understandingwar.org/'], ['UNHCR Ukraine', 'https://data.unhcr.org/en/situations/ukraine']] },
    { id: 'isr-gaza', name: 'Israel–Hamas (Gaza)', region: 'Middle East & N. Africa', lat: 31.4, lon: 34.4,
      status: 'ceasefire-fragile', intensity: 74, since: '2023-10', fatalitiesEst: '45,000+ (Gaza MoH); 1,200+ (Israel, Oct 7)', displaced: '~1.9M in Gaza',
      actors: ['Israel (IDF)', 'Hamas', 'Palestinian Islamic Jihad'],
      supporters: ['US → Israel', 'Iran → Hamas/PIJ'], equipment: ['Precision munitions, armour', 'Rockets, tunnels, IEDs'],
      latest: 'Phased ceasefire and hostage-for-prisoner exchanges holding unevenly; reconstruction and governance unresolved.',
      sources: [['UN OCHA oPt', 'https://www.ochaopt.org/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'isr-hez', name: 'Israel–Hezbollah (Lebanon)', region: 'Middle East & N. Africa', lat: 33.4, lon: 35.5,
      status: 'ceasefire-fragile', intensity: 58, since: '2023-10', fatalitiesEst: '4,000+ (Lebanon, est.)', displaced: '~1.2M (peak)',
      actors: ['Israel (IDF)', 'Hezbollah'], supporters: ['US → Israel', 'Iran → Hezbollah'],
      equipment: ['Airstrikes, SIGINT ops', 'Precision-guided missiles, drones'],
      latest: 'US/France-brokered ceasefire largely holding; sporadic strikes on claimed Hezbollah rearmament.',
      sources: [['UNIFIL', 'https://unifil.unmissions.org/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'sudan', name: 'Sudan Civil War', region: 'Sub-Saharan Africa', lat: 15.5, lon: 32.5,
      status: 'escalating', intensity: 88, since: '2023-04', fatalitiesEst: '20,000–150,000 (wide est.)', displaced: '12M+ (world’s largest)',
      actors: ['Sudanese Armed Forces (SAF)', 'Rapid Support Forces (RSF)'],
      supporters: ['Egypt → SAF (reported)', 'UAE → RSF (reported)'], equipment: ['Air power, artillery', 'Technicals, drones'],
      latest: 'Famine confirmed in parts of Darfur/Kordofan; battle for El Fasher; mass atrocities documented.',
      sources: [['UN OCHA Sudan', 'https://www.unocha.org/sudan'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'myanmar', name: 'Myanmar Civil War', region: 'South & Central Asia', lat: 21.9, lon: 95.9,
      status: 'active', intensity: 72, since: '2021-02', fatalitiesEst: '50,000+ (est.)', displaced: '3.5M IDP',
      actors: ['State Administration Council (junta)', 'PDF + ethnic armed orgs (Three Brotherhood Alliance)'],
      supporters: ['Russia, China → junta (arms)', ''], equipment: ['Airstrikes, artillery', 'Drones, captured arms'],
      latest: 'Resistance holds large rural areas; junta losing border towns; conscription law driving flight.',
      sources: [['UN OHCHR Myanmar', 'https://www.ohchr.org/en/countries/myanmar'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'sahel', name: 'Sahel Insurgency (Mali/Niger/Burkina)', region: 'Sub-Saharan Africa', lat: 14.5, lon: 0.5,
      status: 'escalating', intensity: 79, since: '2012', fatalitiesEst: '~15,000 (12mo, est.)', displaced: '3M+ across the region',
      actors: ['JNIM (al-Qaeda)', 'ISGS (Islamic State Sahel)', 'AES juntas + Wagner/Africa Corps'],
      supporters: ['Russia (Africa Corps) → juntas', ''], equipment: ['Motorcycles, IEDs, ambush', 'Attack drones, Mi-24'],
      latest: 'Jihadist blockades on towns; French/US withdrawal; regional deaths at record highs.',
      sources: [['ACLED Sahel', 'https://acleddata.com/'], ['UNHCR', 'https://www.unhcr.org/']] },
    { id: 'drc-m23', name: 'DRC — M23 / Rwanda', region: 'Sub-Saharan Africa', lat: -1.7, lon: 29.2,
      status: 'escalating', intensity: 76, since: '2022', fatalitiesEst: '7,000+ (2025, est.)', displaced: '7M+ IDP (eastern DRC)',
      actors: ['M23', 'FARDC (DRC army)', 'Wazalendo militias'],
      supporters: ['Rwanda → M23 (UN panel)', 'SADC/Burundi → DRC'], equipment: ['Advanced infantry kit', 'Ageing armour, drones'],
      latest: 'M23 seized Goma & Bukavu; regional war risk; mediation via Luanda/Nairobi processes.',
      sources: [['UN Group of Experts DRC', 'https://www.un.org/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'yemen', name: 'Yemen / Red Sea', region: 'Middle East & N. Africa', lat: 15.4, lon: 44.2,
      status: 'active', intensity: 62, since: '2014', fatalitiesEst: '150,000+ (cumulative)', displaced: '4.5M IDP',
      actors: ['Houthis (Ansar Allah)', 'Yemen govt / PLC', 'US/UK (Red Sea strikes)'],
      supporters: ['Iran → Houthis', 'Saudi/UAE coalition → govt'], equipment: ['Anti-ship & ballistic missiles, USV', 'Airstrikes, naval escort'],
      latest: 'Houthi attacks on Red Sea shipping disrupt Suez traffic; intermittent US/UK/Israel strikes.',
      sources: [['UN OCHA Yemen', 'https://www.unocha.org/yemen'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'somalia', name: 'Somalia — al-Shabaab', region: 'Sub-Saharan Africa', lat: 2.0, lon: 45.3,
      status: 'active', intensity: 60, since: '2006', fatalitiesEst: '~6,000 (12mo, est.)', displaced: '3.8M IDP',
      actors: ['al-Shabaab', 'Somali National Army', 'ATMIS/AUSSOM'],
      supporters: ['US (AFRICOM strikes) → govt', ''], equipment: ['Airstrikes, SOF', 'VBIEDs, complex assaults'],
      latest: 'Government offensive stalled; al-Shabaab reclaims central towns; AU mission transition strained.',
      sources: [['ACLED Somalia', 'https://acleddata.com/'], ['UN OCHA', 'https://www.unocha.org/somalia']] },
    { id: 'haiti', name: 'Haiti — Gang Conflict', region: 'Americas', lat: 18.5, lon: -72.3,
      status: 'escalating', intensity: 66, since: '2023', fatalitiesEst: '~5,600 (2024, UN)', displaced: '1M+ IDP',
      actors: ['Viv Ansanm gang coalition', 'Haitian National Police', 'Kenya-led MSS mission'],
      supporters: ['US/UN → MSS mission', ''], equipment: ['Small arms, trafficked weapons', 'Armoured vehicles'],
      latest: 'Gangs control ~85% of Port-au-Prince; transitional council fragile; MSS under-resourced.',
      sources: [['UN Integrated Office Haiti', 'https://binuh.unmissions.org/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'syria', name: 'Syria — Post-Assad Transition', region: 'Middle East & N. Africa', lat: 34.8, lon: 38.9,
      status: 'under-review', intensity: 49, since: '2024-12', fatalitiesEst: 'sectarian clashes ongoing', displaced: '7.2M IDP (legacy)',
      actors: ['HTS-led interim govt', 'SDF (Kurdish-led)', 'Residual ISIS cells'],
      supporters: ['Türkiye → interim/SNA', 'US → SDF (counter-ISIS)'], equipment: ['Captured stockpiles', 'Airstrikes (US/Israel)'],
      latest: 'Interim govt consolidating after Assad’s fall; coastal sectarian violence; SDF integration talks.',
      sources: [['ACLED Syria', 'https://acleddata.com/'], ['UN OCHA Syria', 'https://www.unocha.org/syrian-arab-republic']] },
    { id: 'isr-iran', name: 'Israel–Iran Direct Exchange', region: 'Middle East & N. Africa', lat: 32.4, lon: 51.7,
      status: 'ceasefire-fragile', intensity: 68, since: '2024', fatalitiesEst: 'limited, high-escalation risk', displaced: '—',
      actors: ['Israel (IDF, Mossad)', 'Iran (IRGC)'], supporters: ['US → Israel (air defence)', 'Axis of Resistance → Iran'],
      equipment: ['Standoff strike, F-35, air defence', 'Ballistic & cruise missiles, drones'],
      latest: 'Direct missile/air exchanges over 2024–25 marked a threshold shift; uneasy pause with strike-back risk.',
      sources: [['IISS analysis', 'https://www.iiss.org/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'ind-pak', name: 'India–Pakistan (LoC / Kashmir)', region: 'South & Central Asia', lat: 34.1, lon: 74.4,
      status: 'under-review', intensity: 44, since: '1947', fatalitiesEst: 'low-level, periodic spikes', displaced: '—',
      actors: ['India', 'Pakistan', 'militant proxies'], supporters: ['—', '—'],
      equipment: ['Artillery, air defence, SF', 'Artillery, militant infiltration'],
      latest: 'Ceasefire understanding (2021) largely holds; periodic militant incidents and cross-border tension.',
      sources: [['MEA / ISPR statements', 'https://www.mea.gov.in/'], ['ACLED', 'https://acleddata.com/']] },
    { id: 'nigeria', name: 'Nigeria — Boko Haram / ISWAP', region: 'Sub-Saharan Africa', lat: 11.8, lon: 13.2,
      status: 'active', intensity: 57, since: '2009', fatalitiesEst: '350,000+ (cumulative, incl. indirect)', displaced: '2.2M IDP (Lake Chad)',
      actors: ['ISWAP', 'Boko Haram (JAS)', 'Nigerian Armed Forces + MNJTF'],
      supporters: ['MNJTF (regional) → govt', ''], equipment: ['Airstrikes, ground ops', 'Drones, ambush, VBIED'],
      latest: 'ISWAP resurgent in the north-east with drone use; banditry and farmer-herder violence compound crisis.',
      sources: [['ACLED Nigeria', 'https://acleddata.com/'], ['UN OCHA', 'https://www.unocha.org/nigeria']] }
  ],

  // recent notable incidents for the timeline (most-recent first)
  timeline: [
    { date: '2026-07-18', region: 'Red Sea', text: 'Houthi USV strike on a tanker off Hodeidah; oil above $90.', sev: 'high' },
    { date: '2026-07-15', region: 'Sudan', text: 'RSF assault on El Fasher; UN warns of atrocity risk to civilians.', sev: 'critical' },
    { date: '2026-07-12', region: 'Eastern DRC', text: 'M23 advances toward Uvira; SADC states weigh response.', sev: 'high' },
    { date: '2026-07-09', region: 'Ukraine', text: 'Large-scale drone/missile barrage on Kyiv & Kharkiv grid.', sev: 'high' },
    { date: '2026-07-05', region: 'Sahel', text: 'JNIM blockade tightens around Bamako supply routes.', sev: 'high' },
    { date: '2026-06-30', region: 'Gaza', text: 'Ceasefire phase-2 talks stall over governance & withdrawal maps.', sev: 'medium' },
    { date: '2026-06-24', region: 'Myanmar', text: 'Resistance seizes another Rakhine township from junta forces.', sev: 'medium' },
    { date: '2026-06-19', region: 'Haiti', text: 'Gangs storm two more PAP districts; MSS reinforcements delayed.', sev: 'high' }
  ]
};

