import features from '../data/html-feature-map.json';
import registry from '../data/source-registry.json';

export const TABS = [
  { id: 'home', label: 'Home', labelHi: 'मुखपृष्ठ', tier: 'home' },
  { id: 'global', label: 'Global', labelHi: 'वैश्विक', tier: 'geopolitics' },
  { id: 'national', label: 'National', labelHi: 'राष्ट्रीय', tier: 'national' },
  { id: 'state', label: 'State', labelHi: 'राज्य', tier: 'state' },
  { id: 'local', label: 'Local', labelHi: 'स्थानीय', tier: 'local' },
  { id: 'law', label: 'Law', labelHi: 'विधि', tier: 'judiciary' },
  { id: 'economics', label: 'Economics', labelHi: 'अर्थव्यवस्था', tier: 'finance' },
  { id: 'carbon', label: 'Carbon', labelHi: 'कार्बन', tier: 'climate' },
  { id: 'sports', label: 'Sports', labelHi: 'खेल', tier: 'sports' },
  { id: 'entertainment', label: 'Entertainment', labelHi: 'मनोरंजन', tier: 'entertainment' },
];

const registryByKey = new Map(registry.map((r) => [r.key, r]));

export function allModules() {
  return features;
}

const STATE_DESKS = [
  'Constituency Register',
  'Election Results 2017–2024',
  'Split-Ticket & Competitiveness',
  'MLA Directory',
  'MLA Report Card + Statement Tracker',
  'Roll Demography',
  'Community Bloc Matrix',
  'SIR Roll Churn',
  'Registration Gap',
  'District Media Monitor (Vernacular District Editions)',
  'District Performance Tracker (Composite)',
  'State Governance Brief',
  'Assembly Proceedings Digest (Vernacular, Translated)',
  'Governor Assent Tracker',
  'Cabinet Decisions',
  'Bureaucrat Transfer & Posting Tracker (State Cadre)',
  'State Tender Aggregator (State e-Procurement)',
  'CAG Audit Tracker',
  'State Fiscal Deep-Dive',
  'Centre-State Fund Flow Tracker',
];

const LOCAL_DESKS = [
  'Local Governance Brief',
  'Booth-level Results Database',
  'Booth Register',
  'Booth Demography',
  'Booth Bloc Composition',
  'Booth-level Roll Churn',
  'Booth Political History',
  'Swing Booths',
  'Anchor Booths',
  'Hyperlocal News Aggregator',
  'Municipal Watch',
  'Panchayat Watch',
  'Municipal & Panchayat Tender Aggregator',
  'Municipal Finance & Solvency',
  'MGNREGA Works & Muster Roll Tracker',
  'Gram Panchayat Development Plan (GPDP) Fund Tracker',
  'Councillor & Pradhan Profiles + Report Cards',
  'Local Officer Directory + Transfer Tracker (BDO/SDO/EO)',
];

const STATE_DESK_SET = new Set(STATE_DESKS);
const LOCAL_DESK_SET = new Set(LOCAL_DESKS);

export function modulesForTier(tier) {
  const list = features.filter((f) => f.htmlTier === tier);
  if (tier === 'state') return list.filter((f) => STATE_DESK_SET.has(f.htmlFeature));
  if (tier === 'local') return list.filter((f) => LOCAL_DESK_SET.has(f.htmlFeature));
  return list;
}

export function catalogModules() {
  return TABS.filter((t) => t.id !== 'home').flatMap((t) => modulesForTier(t.tier));
}

// Match HTML BUCKET_REMAP in public/legacy/js/074.js so Security includes
// Global Intelligence (Defense Intelligence), not Strategic Assets.
const GEO_BUCKET_LABEL = [
  { re: /^(conflict intelligence|defense intelligence|maritime & border security)$/i, label: 'Security' },
  { re: /^diplomacy/i, label: 'Diplomacy' },
  { re: /^(strategic assets|infra)$/i, label: 'Strategic Assets' },
  { re: /^(news & media monitoring|comparative governance|intelligence)$/i, label: 'Global Resources' },
  { re: /^geoeconom/i, label: 'Geonomics' },
];

const BUCKET_REMAP = {
  national: {
    'Public Finance': 'Economy, Finance & Industry',
    'Sector & Industry Intelligence': 'Economy, Finance & Industry',
    'Regulatory & Judicial': 'Legislative & Policy Intelligence',
    'News & Media Monitoring': 'Representative & Media Intelligence',
    'Representative Intelligence': 'Representative & Media Intelligence',
  },
  state: {
    Electoral: 'State of Play',
    'Electoral Roll': 'The Roll',
    Elections: 'State of Play',
    'Roll Integrity': 'The Roll',
    'Community & Society': 'The Roll',
    'News & Media Monitoring': 'Districts',
    'Development Indicators': 'Districts',
    Governance: 'Legislature',
    'Legislative & Policy Intelligence': 'Legislature',
    'Government Operations': 'Government Operations',
    'Public Finance': 'Public Finance',
    'Audit & Oversight': 'Public Finance',
    'Electoral Data & Analytics': 'State of Play',
    'Representative Intelligence': 'State of Play',
  },
  local: {
    'Audit & Oversight': 'Public Finance',
    'Development Indicators': 'Service Delivery',
    'News & Media Monitoring': 'Hyperlocal Intelligence',
  },
  judiciary: { 'Legal Research': 'Judicial Analytics' },
  finance: {
    'Analytical Tools': 'Macro, Trade & Economy',
    'Macro & Economic Indicators': 'Macro, Trade & Economy',
    'Trade & Sanctions': 'Macro, Trade & Economy',
  },
};

const BUCKET_ORDER = {
  geopolitics: ['Security', 'Diplomacy', 'Strategic Assets', 'Global Resources', 'Geonomics'],
  national: [
    'Legislative & Policy Intelligence',
    'Electoral Data & Analytics',
    'Representative & Media Intelligence',
    'Government Operations',
    'Economy, Finance & Industry',
  ],
  state: [
    'State of Play',
    'The Roll',
    'Districts',
    'Legislature',
    'Government Operations',
    'Public Finance',
  ],
  local: [
    'Assembly',
    'Booths',
    'Contest Analysis',
    'Local Wires',
    'Municipality',
    'Panchayats',
    'Representatives',
  ],
  judiciary: [
    'Judicial Intelligence',
    'Judicial Analytics',
    'International Courts',
    'Comparative Jurisprudence',
    'Tribunals',
    'Court Operations',
    'Justice System Data',
  ],
  finance: [
    'Market Intelligence',
    'Macro, Trade & Economy',
    'Sector & Industry Intelligence',
    'Prediction Markets',
  ],
  climate: ['Border Mechanisms', 'Carbon Markets', 'India Carbon Market', 'Registries & Wire'],
  sports: ['Scores & Fixtures', 'Football Desk', 'India Sports Desk', 'Sports Business'],
  entertainment: ['Screens & Streaming', 'Industry Wire', 'Music', 'Screen Intelligence'],
};

const FEATURE_ORDER = {
  geopolitics: {
    Security: ['Open Fronts', 'Conflicts', 'Global Intelligence', 'Transit'],
    Diplomacy: ['Alliances', 'Sanctions', 'Global Aid'],
    'Strategic Assets': ['Infra', 'Nuclear Watch', 'Satellite Infrastructure', 'Maritime Choke-Points'],
    'Global Resources': [
      'Geopolitics News Wire',
      'World Constitutions',
      'Growth Indicators',
      'Heads of State',
      'Global Commodities',
    ],
    Geonomics: ['Global Trade', 'Critical Minerals', 'Energy'],
  },
  national: {
    'Legislative & Policy Intelligence': [
      'Bill Passage Probability Index',
      'Policy Intelligence Graph',
      'Policy Pipeline Tracker (Draft-to-Gazette)',
      'Parliamentary Question Database',
      'Regulatory Body Watch (RBI/SEBI/TRAI/CCI)',
    ],
    'Electoral Data & Analytics': [
      'Candidate Affidavit Database (Structured + API)',
      'Delimitation Impact Simulator',
      'LS Manifestos & Promises Tracker',
    ],
    'Representative & Media Intelligence': [
      'Statement & Quote Tracker with Contradiction Detection',
      'MP Profiles & Performance (MPLAD, attendance, debates)',
      'National Morning Brief (Auto-digest)',
    ],
    'Government Operations': [
      'Central Tender Aggregator + Constituency Filter',
      'Bureaucratic Transfers — AGMUT Cadre',
      'Cabinet Decisions',
      'Centre-sanctioned Projects & Completion Rate',
    ],
    'Economy, Finance & Industry': ['Budget Utilisation & Schemes', 'Industry Updates (Ministry Data)'],
  },
  state: {
    'State of Play': [
      'Constituency Register',
      'Election Results 2017–2024',
      'Split-Ticket & Competitiveness',
      'MLA Directory',
      'MLA Report Card + Statement Tracker',
    ],
    'The Roll': ['Roll Demography', 'Community Bloc Matrix', 'SIR Roll Churn', 'Registration Gap'],
    Districts: [
      'District Media Monitor (Vernacular District Editions)',
      'District Performance Tracker (Composite)',
    ],
    Legislature: [
      'State Governance Brief',
      'Assembly Proceedings Digest (Vernacular, Translated)',
      'Governor Assent Tracker',
    ],
    'Government Operations': [
      'Cabinet Decisions',
      'Bureaucrat Transfer & Posting Tracker (State Cadre)',
      'State Tender Aggregator (State e-Procurement)',
    ],
    'Public Finance': ['CAG Audit Tracker', 'State Fiscal Deep-Dive', 'Centre-State Fund Flow Tracker'],
  },
  local: {
    Assembly: ['Local Governance Brief', 'Booth-level Results Database'],
    Booths: ['Booth Register', 'Booth Demography', 'Booth Bloc Composition', 'Booth-level Roll Churn'],
    'Contest Analysis': ['Booth Political History', 'Swing Booths', 'Anchor Booths'],
    'Local Wires': ['Hyperlocal News Aggregator', 'Municipal Watch', 'Panchayat Watch'],
    Municipality: ['Municipal & Panchayat Tender Aggregator', 'Municipal Finance & Solvency'],
    Panchayats: [
      'MGNREGA Works & Muster Roll Tracker',
      'Gram Panchayat Development Plan (GPDP) Fund Tracker',
    ],
    Representatives: [
      'Councillor & Pradhan Profiles + Report Cards',
      'Local Officer Directory + Transfer Tracker (BDO/SDO/EO)',
    ],
  },
  judiciary: {
    'Judicial Intelligence': [
      'Supreme Court Order & Judgment Feed',
      'Order Archive by Topic (Cross-Court)',
      'District Court Case Tracker',
      'UP High Court (Allahabad) Order Feed',
      'NGT Environmental Litigation Tracker',
      'CAT & Consumer Disputes (NCDRC) Watch',
      'Constitutional Bench Tracker',
      'HC Constitutional & PIL Tracker',
      'HC vs State Government Litigation',
    ],
    'Judicial Analytics': [
      'Judge Analytics (Ruling Patterns)',
      'Case Pendency & Disposal Analytics',
      'Precedent / Citation Network',
      'HC Pendency & Disposal Analytics',
      'HC Judge Profiles & Bench Analytics',
      'District Court Pendency & Disposal',
      'Professional Case-Law Database',
    ],
    'International Courts': [
      'ICC Proceedings',
      'ICJ Proceedings',
      'WTO Dispute Settlement',
      "Regional Int'l Courts (ECtHR / CJEU / ITLOS)",
    ],
    'Comparative Jurisprudence': [
      'Supreme Courts & precedent — United States',
      'Supreme Courts & precedent — other common-law jurisdictions',
    ],
    Tribunals: [
      'NCLT / NCLAT (Insolvency)',
      'Sector Tribunals (ITAT / TDSAT / SAT / DRT)',
    ],
    'Court Operations': [
      'Cause-List / Hearing Scheduler',
      'HC Case Status & Cause Lists',
      'District Court Cause Lists',
      'Local Judge & Court Directory',
    ],
    'Justice System Data': ['Undertrial & Prison Data', 'Legal Aid & Lok Adalat Tracker'],
  },
  finance: {
    'Market Intelligence': ['NSE/BSE Delayed Market Feed', 'Live Global Stock Exchanges'],
    'Macro, Trade & Economy': [
      'Economic Overview of All Countries',
      'Key Financial Indicators (GDP, CPI, PMI, Emp-to-Pop)',
      'Trade Agreements & Economic Sanctions',
      'Economic Simulator',
    ],
    'Sector & Industry Intelligence': [
      'Sector Policy — Power/Energy/Green/Critical Minerals',
      'Top Financial & Business Players',
      'AI & the Tech Industry',
    ],
    'Prediction Markets': ['Prediction Market Political Odds', 'Election Forecast Aggregator'],
  },
  climate: {
    'Border Mechanisms': ['Carbon Border (CBAM) Watch'],
    'Carbon Markets': [
      'Global Carbon Pricing Tracker',
      'Carbon Price Monitor',
      'ETS & Tax Adoption Timeline',
    ],
    'India Carbon Market': ['India CCTS & Green Credits'],
    'Registries & Wire': ['Carbon Registry Wire', 'Climate Newswire'],
  },
  sports: {
    'Scores & Fixtures': ['Cricket Wire', 'Fixtures & Results — World Leagues'],
    'Football Desk': ['Football Wire', 'ISL Tracker'],
    'India Sports Desk': ['Indian Sports Wire', 'Sports Governance & Policy'],
    'Sports Business': ['Sports Business & Media Rights', 'Athlete Index'],
  },
  entertainment: {
    'Screens & Streaming': ['TV & Streaming Tonight', 'Box Office Tracker'],
    'Industry Wire': ['Entertainment News Wire', 'Bollywood & Film Wire'],
    Music: ['Music Charts — India Top 25', 'Music Charts — Global Top 25'],
    'Screen Intelligence': ['OTT & Studio Intelligence', 'Celebrity Influence Index'],
  },
};

export function bucketLabel(name, tier) {
  if (tier === 'geopolitics') {
    const hit = GEO_BUCKET_LABEL.find((x) => x.re.test(name || ''));
    return hit?.label || name;
  }
  const map = BUCKET_REMAP[tier];
  return (map && map[name]) || name;
}

export function bucketsFor(mods, tier) {
  const featOrderByBucket = FEATURE_ORDER[tier] || {};
  const merged = new Map();
  for (const m of mods) {
    let label;
    if (FEATURE_ORDER[tier]) {
      label = Object.keys(featOrderByBucket).find((k) => featOrderByBucket[k].includes(m.htmlFeature));
      if (!label && (tier === 'state' || tier === 'local' || tier === 'judiciary' || tier === 'finance' || tier === 'climate' || tier === 'sports' || tier === 'entertainment')) continue;
    }
    if (!label) label = bucketLabel(m.bucket || 'Desk', tier);
    if (!merged.has(label)) merged.set(label, { name: m.bucket, label, items: [] });
    merged.get(label).items.push(m);
  }
  const order = BUCKET_ORDER[tier];
  const list = [...merged.values()]
    .map((b) => {
      const featOrder = featOrderByBucket[b.label];
      if (!featOrder) return b;
      const items = [...b.items]
        .filter((m) => featOrder.includes(m.htmlFeature))
        .sort((a, c) => featOrder.indexOf(a.htmlFeature) - featOrder.indexOf(c.htmlFeature));
      return { ...b, items };
    })
    .filter((b) => b.items.length);
  if (!order) return list;
  return list.sort((a, b) => {
    const ai = order.indexOf(a.label);
    const bi = order.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function bucketContaining(buckets, featureName) {
  return buckets.find((b) => b.items.some((m) => m.htmlFeature === featureName)) || buckets[0] || null;
}

export function registryEntries(mod) {
  return (mod?.registryKeys || []).map((k) => registryByKey.get(k)).filter(Boolean);
}

export function primaryAdapter(mod) {
  const entry = registryEntries(mod)[0];
  return (entry?.adapter || mod?.adapters || '').split(/[|,]/)[0].trim().toLowerCase() || 'unmapped';
}

export const HOME_SHORTCUTS = [
  { tab: 'national', tier: 'national', feature: 'Bill Passage Probability Index', label: 'Bill Passage Tracker' },
  { tab: 'global', tier: 'geopolitics', feature: 'Open Fronts', label: 'Open Fronts' },
  { tab: 'global', tier: 'geopolitics', feature: 'Growth Indicators', label: 'World Bank growth' },
  { tab: 'national', tier: 'national', feature: 'Parliamentary Question Database', label: 'Parliamentary questions' },
  { tab: 'global', tier: 'geopolitics', feature: 'Geopolitics News Wire', label: 'Geopolitics wire' },
  { tab: 'carbon', tier: 'climate', feature: 'Global Carbon Pricing Tracker', label: 'Carbon pricing' },
];
