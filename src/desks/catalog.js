import features from '../data/html-feature-map.json';
import registry from '../data/source-registry.json';

export const TABS = [
  { id: 'home', label: 'HOME', labelHi: 'मुखपृष्ठ', tier: 'home' },
  { id: 'global', label: 'GLOBAL', labelHi: 'वैश्विक', tier: 'geopolitics' },
  { id: 'national', label: 'NATIONAL', labelHi: 'राष्ट्रीय', tier: 'national' },
  { id: 'state', label: 'STATE', labelHi: 'राज्य', tier: 'state' },
  { id: 'local', label: 'LOCAL', labelHi: 'स्थानीय', tier: 'local' },
  { id: 'law', label: 'LAW', labelHi: 'विधि', tier: 'judiciary' },
  { id: 'economics', label: 'ECONOMICS', labelHi: 'अर्थव्यवस्था', tier: 'finance' },
  { id: 'carbon', label: 'CARBON', labelHi: 'कार्बन', tier: 'climate' },
  { id: 'sports', label: 'SPORTS', labelHi: 'खेल', tier: 'sports' },
  { id: 'entertainment', label: 'ENTERTAINMENT', labelHi: 'मनोरंजन', tier: 'entertainment' },
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

const STATE_DESK_SET = new Set(STATE_DESKS);

export function modulesForTier(tier) {
  const list = features.filter((f) => f.htmlTier === tier);
  if (tier !== 'state') return list;
  return list.filter((f) => STATE_DESK_SET.has(f.htmlFeature));
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
      if (!label && tier === 'state') continue;
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
