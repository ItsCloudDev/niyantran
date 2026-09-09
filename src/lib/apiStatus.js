import registry from '../data/source-registry.json';

export const STATUS = {
  live: { id: 'live', label: 'Live', copy: 'Live API returning rows' },
  archive: { id: 'archive', label: 'Archive', copy: 'Live failed · archived feed showing' },
  local: { id: 'local', label: 'Local pack', copy: 'Live URL not used · local data showing' },
  inactive: { id: 'inactive', label: 'Inactive', copy: 'No live rows and no archive showing' },
};

const CURATED = [
  ['GLOBAL', 'Transit', 'live', 'OpenSky air via /api/air. Ships: Digitraffic Baltic (or AISSTREAM_KEY for global).'],
  ['GLOBAL', 'Satellite Infrastructure', 'live', 'Launch Library + CelesTrak upcoming objects.'],
  ['GLOBAL', 'World Constitutions', 'live', 'Constitute Project in-force constitutions.'],
  ['GLOBAL', 'Growth Indicators', 'live', 'World Bank WDI growth series.'],
  ['GLOBAL', 'Global Trade', 'live', 'World Bank trade / GDP series.'],
  ['ECONOMICS', 'Top Financial & Business Players', 'live', 'Wikidata SPARQL · Indian enterprise CEOs (P169). Identity only — no rankings or market cap.'],
  ['ECONOMICS', 'Economic Simulator', 'live', 'World Bank India GDP growth (NY.GDP.MKTP.KD.ZG). Historical baseline — not a forecast.'],
  ['SPORTS', 'Indian Sports Wire', 'live', 'Google News RSS · India hockey/badminton/kabaddi/athletics/chess (7d).'],
  ['SPORTS', 'Sports Business & Media Rights', 'live', 'Wikidata SPARQL · Indian leagues and owners. Not broadcast-rights valuations.'],
  ['NATIONAL', 'Industry Updates (Ministry Data)', 'live', 'World Bank India industry WDI rows.'],
  ['NATIONAL', 'Regulatory Body Watch (RBI/SEBI/TRAI/CCI)', 'archive', 'API not reachable · fallback: national_regulatory_watch archive.'],
  ['NATIONAL', 'Cabinet Decisions', 'archive', 'PIB RSS not reachable · fallback: national_cabinet_decisions archive.'],
  ['NATIONAL', 'Central Tender Aggregator + Constituency Filter', 'archive', 'eProcure API not active · fallback: tender archive.'],
  ['NATIONAL', 'Policy Pipeline Tracker (Draft-to-Gazette)', 'live', 'PIB Press Releases + Features RSS (www.pib.gov.in).'],
  ['GLOBAL', 'Open Fronts', 'local', 'GDELT API configured · not active · fallback: HTML dossier pack.'],
  ['GLOBAL', 'Conflicts', 'local', 'ReliefWeb API configured · not active · fallback: local conflict dossiers.'],
  ['GLOBAL', 'Global Intelligence', 'local', 'Shown as Defence Procurement Intelligence · GDELT/API configured · HTML pack fallback.'],
  ['GLOBAL', 'Alliances', 'local', 'GDELT API configured · not active · fallback: local alliance register.'],
  ['GLOBAL', 'Sanctions', 'local', 'OFAC API configured · not active · fallback: local programme register. Overlay lists are live.'],
  ['GLOBAL', 'Global Aid', 'local', 'ReliefWeb API configured · not active · fallback: local appeal register. FTS overlay is live.'],
  ['GLOBAL', 'Infra', 'local', 'World Bank API configured · not active · fallback: local infra register. Overlay is live.'],
  ['GLOBAL', 'Nuclear Watch', 'local', 'GDELT API configured · not active · fallback: local facility register.'],
  ['GLOBAL', 'Maritime Choke-Points', 'local', 'GDELT API configured · not active · fallback: local chokepoint register. PortWatch overlay is live.'],
  ['GLOBAL', 'Heads of State', 'local', 'Wikidata overlay is live · fallback: local pack.'],
  ['GLOBAL', 'Global Commodities', 'local', 'World Bank Pink Sheet API configured · not active · fallback: local series.'],
  ['GLOBAL', 'Critical Minerals', 'local', 'GDELT API configured · not active · fallback: USGS-basis register.'],
  ['GLOBAL', 'Energy', 'local', 'World Bank API configured · not active · fallback: local series.'],
  ['NATIONAL', 'Bill Passage Probability Index', 'local', 'Sansad API configured · not active · fallback: national_bill_tracker 4,576 rows.'],
  ['NATIONAL', 'Policy Intelligence Graph', 'local', 'Sansad API configured · not active · fallback: national_bill_tracker graph.'],
  ['NATIONAL', 'Parliamentary Question Database', 'local', 'eLibrary API configured · not active · fallback: questions archive.'],
  ['NATIONAL', 'Candidate Affidavit Database (Structured + API)', 'local', 'Harvard Dataverse API configured · not active · fallback: MyNeta/ADR file.'],
  ['NATIONAL', 'MP Profiles & Performance (MPLAD, attendance, debates)', 'local', 'Sansad API configured · not active · fallback: MP report card pack.'],
  ['NATIONAL', 'Bureaucratic Transfers — AGMUT Cadre', 'local', 'GDELT API configured · not active · fallback: gazetted register.'],
  ['NATIONAL', 'Delimitation Impact Simulator', 'local', 'Internal simulator · no public API.'],
  ['NATIONAL', 'LS Manifestos & Promises Tracker', 'local', 'No API · curated Union 2024 pack.'],
  ['NATIONAL', 'Centre-sanctioned Projects & Completion Rate', 'local', 'World Bank API configured · not active · fallback: curated flagships.'],
  ['NATIONAL', 'Budget Utilisation & Schemes', 'local', 'No API · Budget at a Glance curated figures.'],
  ['GLOBAL', 'Geopolitics News Wire', 'live', 'GDELT DOC 2.0 when available; else live BBC World RSS (still Live, not Archive).'],
  ['NATIONAL', 'Statement & Quote Tracker with Contradiction Detection', 'live', 'GDELT person coverage (or Google News RSS). Mentions only — no contradiction verdict.'],
  ['NATIONAL', 'National Morning Brief (Auto-digest)', 'live', 'PIB RSS + GDELT India/economy (paced) · News RSS fallback.'],
];

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const curatedMap = new Map(CURATED.map(([desk, feature, status, note]) => [`${norm(desk)}::${norm(feature)}`, { status, note }]));

function rowsOf(entry) {
  const n = Number(entry.embeddedRows);
  return Number.isFinite(n) ? n : 0;
}

/** Google News RSS / GDELT reporting-search feeds — live by design; embeddedRows are often 0. */
function isNewsSearchFeed(entry) {
  const adapter = String(entry.adapter || '');
  if (adapter === 'news-search') return true;
  const blob = [
    entry.primaryFeedUrl,
    entry.sourceUrls,
    entry.domains,
    entry.source,
    entry.openLiveFallback,
  ]
    .filter(Boolean)
    .join(' ');
  return /news\.google\.com|gdeltproject\.org/i.test(blob);
}

function heuristic(entry) {
  const state = String(entry.implementationState || '');
  const rows = rowsOf(entry);
  const adapter = String(entry.adapter || '');
  const newsWire = isNewsSearchFeed(entry);

  if (/SOURCE-LIBRARY STATUS FALLBACK/i.test(state) && rows <= 0) {
    if (newsWire) {
      return {
        status: 'live',
        note: 'Google News / GDELT reporting search configured · probe the desk to confirm current rows.',
      };
    }
    return { status: 'inactive', note: 'API configured · returned empty · no archive fallback.' };
  }
  if (/CREDENTIAL OR LICENCE REQUIRED/i.test(state) && rows <= 0) {
    return { status: 'inactive', note: 'API requires credential or licence · no data showing.' };
  }
  if (/CONNECTOR REQUIRES TERMS REVIEW/i.test(state) && rows <= 0) {
    return { status: 'inactive', note: 'API connector parked pending terms review · no data showing.' };
  }
  // LIVE SEARCH with 0 embedded rows used to force Inactive — wrong for News RSS / GDELT wires.
  if ((/LIVE SEARCH/i.test(state) || newsWire) && rows <= 0) {
    if (newsWire || /LIVE SEARCH|LIVE API/i.test(state)) {
      return {
        status: 'live',
        note: newsWire
          ? 'Live News RSS / reporting search configured · probe the desk to confirm current rows.'
          : 'Live search API configured · probe the desk to confirm current rows.',
      };
    }
    return { status: 'inactive', note: 'Live search API configured · returned empty.' };
  }
  if (rows > 0 && (/CONNECTOR REQUIRES TERMS REVIEW/i.test(state) || /DOWNLOAD\/HTML/i.test(state))) {
    return { status: 'archive', note: 'API not active · fallback: archived feed showing.' };
  }
  if (rows > 0 && /EMBEDDED ARCHIVE READY/i.test(state)) {
    return { status: 'local', note: 'API configured · not active · fallback: local pack showing.' };
  }
  if (rows > 0 && (/LIVE API/i.test(state) || newsWire)) {
    return {
      status: 'live',
      note: newsWire
        ? 'Live News RSS / reporting search · archive fallback ready.'
        : 'Live API returning rows · archive fallback ready.',
    };
  }
  if (rows > 0 && /LIVE SEARCH/i.test(state)) {
    return { status: 'live', note: 'Live search feed configured · probe confirms rows when refreshed.' };
  }
  if (rows > 0 && /INTERNAL ROUTE/i.test(state)) {
    return { status: 'local', note: 'Internal route · fallback: managed archive showing.' };
  }
  if (rows > 0) {
    return { status: 'local', note: 'API not active · fallback: local/embedded rows showing.' };
  }
  if (/LIVE API/i.test(state) || adapter === 'api' || newsWire) {
    return { status: 'live', note: 'Live API configured · probe the desk to confirm current rows.' };
  }
  if (/INTERNAL ROUTE/i.test(state)) {
    return { status: 'local', note: 'Internal simulator / managed route.' };
  }
  return { status: 'inactive', note: 'No live API returning rows · no archive fallback.' };
}

export function classifyApis() {
  return registry.map((entry) => {
    const hit = curatedMap.get(`${norm(entry.desk)}::${norm(entry.htmlFeature)}`) || heuristic(entry);
    const meta = STATUS[hit.status] || STATUS.inactive;
    return {
      key: entry.key,
      desk: entry.desk,
      feature: entry.htmlFeature,
      htmlTier: entry.htmlTier,
      adapter: entry.adapter,
      source: entry.source,
      url: entry.primaryFeedUrl || '',
      rows: rowsOf(entry),
      implementation: entry.implementationState,
      access: entry.access,
      refreshMinutes: entry.refreshMinutes,
      status: meta.id,
      statusLabel: meta.label,
      note: hit.note,
    };
  });
}

export function apiStats(rows = classifyApis()) {
  const counts = { live: 0, archive: 0, local: 0, inactive: 0 };
  for (const row of rows) counts[row.status] += 1;
  return { total: rows.length, ...counts };
}
