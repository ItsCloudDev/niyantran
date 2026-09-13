/** Walkthrough copy when a desk is opened without a module selected. */

const DESK_INTRO = {
  global:
    'Global has five dropdowns on the top strip. Open a dropdown, pick a module, then work the table or map. Nothing loads until you choose one.',
  national:
    'National groups legislation, elections, representatives, operations and the economy. Use each dropdown to open one register at a time.',
  state:
    'State covers the assembly, the roll, districts, legislature, operations and finance. Pick a module from a dropdown to load its table.',
  local:
    'Local is booth- and municipality-scoped. Choose a dropdown module for the register you need; filters apply after it loads.',
  law:
    'Law holds courts, analytics, tribunals and comparative jurisprudence. Open a dropdown, then a feed, for orders or research tables.',
  economics:
    'Economics covers markets, macro and trade, sectors and prediction markets. Select a module from the strip to open its board.',
  carbon:
    'Carbon covers border mechanisms, markets, India ICM and registry wires. Pick one module; each uses its own columns and sources.',
  sports:
    'Sports groups scores, football, India sports and business wires. Choose a module from a dropdown to open that feed.',
  entertainment:
    'Entertainment covers screens, industry wires, music and screen intelligence. Open a dropdown module for the register you want.',
};

const MODULE_BLURB = {
  'Open Fronts': 'Structured conflict register — theatre, region, type, intensity and trend.',
  Conflicts: 'Map of named theatres with sourced dossiers. Click a marker for the record.',
  'Global Intelligence': 'Defence and security reporting context for the same Security strip.',
  Transit: 'Live aircraft and ship positions by region. Filters sit under the map.',
  Alliances: 'Alliance and bloc register with member flags and source links.',
  Sanctions: 'Sanctions and restrictive-measure dossiers.',
  'Global Aid': 'Humanitarian appeal register and related wire.',
  Infra: 'Strategic infrastructure assets on a shared register layout.',
  'Nuclear Watch': 'Nuclear and delivery-system watch list.',
  'Satellite Infrastructure': 'Satellite and space infrastructure register.',
  'Maritime Choke-Points': 'Chokepoint map and shipping-lane dossiers.',
  'Geopolitics News Wire': 'Topic news wire for geopolitics coverage.',
  'World Constitutions': 'Comparative constitution reference table.',
  'Growth Indicators': 'World Bank and macro growth series.',
  'Heads of State': 'Incumbent leaders directory.',
  'Global Commodities': 'Commodity board and related series.',
  'Global Trade': 'Trade policy and flow tables.',
  'Critical Minerals': 'Critical-mineral supply and policy register.',
  Energy: 'Energy infrastructure and policy desk.',
  'Bill Passage Probability Index': 'Union bills since 1952 — stage, house and passage fields.',
  'Policy Intelligence Graph': 'Policy graph over the bill and related national corpus.',
  'Parliamentary Question Database': 'Lok Sabha / Rajya Sabha questions with member and ministry.',
  'Cabinet Decisions': 'Cabinet and PIB decision rows.',
};

const BUCKET_BLURB = {
  Security: 'Conflict theatres, open fronts, intelligence context and live transit.',
  Diplomacy: 'Alliances, sanctions and aid.',
  'Strategic Assets': 'Infra, nuclear, satellites and maritime chokepoints.',
  'Global Resources': 'Wires, constitutions, growth, leaders and commodities.',
  Geonomics: 'Trade, critical minerals and energy.',
  'Legislative & Policy Intelligence': 'Bills, policy graph, pipeline, questions and regulators.',
  'Electoral Data & Analytics': 'Affidavits, delimitation and manifesto trackers.',
  'Representative & Media Intelligence': 'Statements, MP profiles and morning brief.',
  'Government Operations': 'Tenders, transfers, cabinet and centre-sanctioned projects.',
  'Economy, Finance & Industry': 'Budget utilisation and industry updates.',
};

export function deskIntro(tabId) {
  return DESK_INTRO[tabId] || 'Use the dropdowns on this desk to open a module. Each module is a separate feed with its own columns and sources.';
}

export function moduleBlurb(featureName) {
  const name = String(featureName || '').trim();
  if (MODULE_BLURB[name]) return MODULE_BLURB[name];
  return 'Open this module for its table or map. Provenance stays on the feed header.';
}

export function bucketBlurb(label) {
  return BUCKET_BLURB[label] || 'Open the dropdown and pick a module to load that feed.';
}
