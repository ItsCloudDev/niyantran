/* V2 PASS 61 feature catalog (data only — cannot throw) */window.SHEET_NEW_FEATURES = {
 "geopolitics": [
  {
   "bucket": "Comparative Governance",
   "feature": "World Constitutions",
   "use": "Full constitutional text, amendments, cross-country comparison (outline item)",
   "money": "Target clientele: Analysts, academics, legal researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Constitute Project",
    "link": "https://www.constituteproject.org",
    "notes": "Public API for text search/comparison; free non-commercial, check commercial reuse",
    "flag": "Free w/ Registration",
    "clientele": "Analysts, academics, legal researchers",
    "interactive": "Side-by-side constitution comparator; topic search",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Comparative Governance",
   "feature": "Growth Indicators",
   "use": "Composite development & governance indices per country",
   "money": "Target clientele: All segments.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "WHO GHO; UNESCO UIS; World Bank; UNDP HDR; V-Dem; RSF",
    "link": "https://www.who.int/data/gho ; https://api.worldbank.org ; https://hdr.undp.org ; https://www.v-dem.net",
    "notes": "WHO GHO free OData; World Bank free; UNDP/V-Dem/RSF free downloads. NOTE: confirm what 'BDR' denotes before sourcing",
    "flag": "Open/Free",
    "clientele": "All segments",
    "interactive": "Multi-indicator radar per country; index trendlines",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Maritime & Border Security",
   "feature": "Transit",
   "use": "Live global ship tracking (real-time AIS) on a dotted world map — vessels glow, coloured by cargo type (oil/gas tankers, dry cargo, container and more). Focus on chokepoints like Hormuz, Suez and Malacca.",
   "money": "Target clientele: Geopolitics & commodity desks, journalists, analysts.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Vessel", "Type", "Position", "Speed"],
   "dataSource": { "csv": "seaborne_ais" },
   "sourceMeta": { "sources": "aisstream.io (real-time AIS)", "link": "https://aisstream.io", "notes": "Live AIS positions over WebSocket; nothing stored. The map is pure vector dots, not tiles.", "flag": "Live API", "clientele": "Geopolitics & commodity desks", "interactive": "Dotted world map with live glowing ships by cargo type; chokepoint region focus", "status": "Live" }
  },
  {
   "bucket": "Conflict Intelligence",
   "feature": "Conflicts",
   "use": "Every major armed conflict on one screen: dotted world map, intensity, fatalities & displacement, key actors and external supporters, ceasefire tracker, incident timeline and an AI outlook.",
   "money": "Target clientele: Geopolitics & risk desks, defence-adjacent business, newsrooms.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Conflict", "Region", "Status", "Intensity"],
   "dataSource": { "csv": "geo_conflicts" },
   "sourceMeta": { "sources": "ACLED · UCDP · ISW · UN OCHA · UNHCR", "link": "https://acleddata.com/", "notes": "Curated intelligence dossier from public reporting; estimates labelled. Swaps to a live event API (ACLED/GDELT) with no UI change.", "flag": "Open/Free", "clientele": "Geopolitics & risk desks", "interactive": "Dotted conflict map, intensity bars, timeline, entity cards, AI outlook, watchlist, export", "status": "Live" }
  },
  {
   "bucket": "Diplomacy",
   "feature": "Sanctions",
   "use": "Every major sanctions programme on one screen: issuers, targets, sectors, listed entities, economic impact, recent designations, targeted-country map and AI analysis.",
   "money": "Target clientele: Geopolitics, risk & policy desks; newsrooms.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Programme","Target","Issuer","Intensity"],
   "dataSource": { "csv": "geo_sanctions" },
   "sourceMeta": { "sources": "Curated public sources", "link": "https://acleddata.com/", "notes": "Intelligence dossier from public sources; estimates labelled. Swaps to a live API with no UI change.", "flag": "Open/Free", "clientele": "Geopolitics & risk desks", "interactive": "World map, designation bars, timeline, programme dossiers, AI, export", "status": "Live" }
  },
  {
   "bucket": "Intelligence",
   "feature": "Heads of State",
   "use": "Structured profiles of the leaders who move geopolitics: country, party, ideology, tenure, latest posture, with an AI alignment/succession read.",
   "money": "Target clientele: Geopolitics, risk & policy desks; newsrooms.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Leader","Country","Party","Since"],
   "dataSource": { "csv": "geo_leaders" },
   "sourceMeta": { "sources": "Curated public sources", "link": "https://acleddata.com/", "notes": "Intelligence dossier from public sources; estimates labelled. Swaps to a live API with no UI change.", "flag": "Open/Free", "clientele": "Geopolitics & risk desks", "interactive": "Leader monogram grid, government-type breakdown, AI alignment read, export", "status": "Live" }
  },
  {
   "bucket": "Diplomacy",
   "feature": "Global Aid",
   "use": "Global humanitarian & development aid flows: donors, recipients, appeal coverage and aid diplomacy, with an AI analyst brief.",
   "money": "Target clientele: Policy desks, NGOs, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "OECD DAC; UN OCHA FTS; AidData",
    "link": "https://stats.oecd.org ; https://fts.unocha.org ; https://www.aiddata.org",
    "notes": "OECD and OCHA FTS publish free APIs/downloads; AidData datasets free for research",
    "flag": "Open/Free",
    "clientele": "Policy desks, NGOs, journalists",
    "interactive": "Donor-recipient flow map; appeal coverage bars; aid diplomacy watch",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Strategic Assets",
   "feature": "Nuclear Watch",
   "use": "Civil and strategic nuclear landscape: reactor fleets, fuel-cycle & enrichment programmes, arsenals and doctrine signals, with an AI analyst brief.",
   "money": "Target clientele: Geopolitics, risk & policy desks; newsrooms.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "IAEA PRIS; SIPRI Yearbook; NTI",
    "link": "https://pris.iaea.org ; https://www.sipri.org ; https://www.nti.org",
    "notes": "IAEA PRIS reactor data free; SIPRI/NTI publish free public datasets & profiles",
    "flag": "Open/Free",
    "clientele": "Geopolitics & risk desks",
    "interactive": "Reactor fleet map; programme dossiers; doctrine timeline",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Geoeconomics",
   "feature": "Global Trade",
   "use": "World trade flows and dependencies: top corridors, export controls, tariff moves and supply-chain rerouting, with an AI analyst brief.",
   "money": "Target clientele: Geopolitics, trade & policy desks; newsrooms.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "UN Comtrade; WTO Stats; World Bank WITS",
    "link": "https://comtrade.un.org ; https://stats.wto.org ; https://wits.worldbank.org",
    "notes": "UN Comtrade and WITS free APIs; WTO stats portal free downloads",
    "flag": "Open/Free",
    "clientele": "Trade & policy desks",
    "interactive": "Corridor flow map; tariff & export-control timeline; dependency matrix",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Geoeconomics",
   "feature": "Critical Minerals",
   "use": "The minerals that decide industrial power: lithium, cobalt, rare earths and more \u2014 reserves, production concentration, processing chokeholds and export curbs, with an AI analyst brief.",
   "money": "Target clientele: Geopolitics, commodity & industrial desks.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "USGS Mineral Commodity Summaries; IEA Critical Minerals; BGS",
    "link": "https://www.usgs.gov/centers/national-minerals-information-center ; https://www.iea.org/topics/critical-minerals",
    "notes": "USGS MCS free annual data; IEA critical-minerals datasets free; BGS world mineral statistics free",
    "flag": "Open/Free",
    "clientele": "Commodity & industrial desks",
    "interactive": "Concentration bars; supply-chain map; export-curb timeline",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Strategic Assets",
   "feature": "Satellite Infrastructure",
   "use": "Orbital assets as strategic infrastructure: constellations, ground stations, launch cadence and counter-space signals, with an AI analyst brief.",
   "money": "Target clientele: Geopolitics, defence-adjacent & telecom desks.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "UCS Satellite Database; CelesTrak; Jonathan's Space Report",
    "link": "https://celestrak.org ; https://planet4589.org",
    "notes": "CelesTrak TLEs free; UCS database free download; JSR launch logs free",
    "flag": "Open/Free",
    "clientele": "Defence-adjacent & telecom desks",
    "interactive": "Constellation explorer; launch cadence bars; counter-space watch",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Strategic Assets",
   "feature": "Maritime Choke-Points",
   "use": "The world critical maritime chokepoints: oil transit, risk ranking, operators and current threat, on a dotted map with AI closure-scenario analysis.",
   "money": "Target clientele: Geopolitics, risk & policy desks; newsrooms.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Chokepoint","Region","Oil transit","Risk"],
   "dataSource": { "csv": "geo_chokepoints" },
   "sourceMeta": { "sources": "Curated public sources", "link": "https://acleddata.com/", "notes": "Intelligence dossier from public sources; estimates labelled. Swaps to a live API with no UI change.", "flag": "Open/Free", "clientele": "Geopolitics & risk desks", "interactive": "Chokepoint map, risk bars, dossiers, AI scenarios, export", "status": "Live" }
  },
  {
   "bucket": "Geoeconomics",
   "feature": "Energy",
   "use": "The geoeconomic leverage map: oil/gas benchmarks plus the critical minerals where supply concentration is a coercive weapon.",
   "money": "Target clientele: Geopolitics, risk & policy desks; newsrooms.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Commodity","Level","Change","Leverage"],
   "dataSource": { "csv": "geo_energy" },
   "sourceMeta": { "sources": "Curated public sources", "link": "https://acleddata.com/", "notes": "Intelligence dossier from public sources; estimates labelled. Swaps to a live API with no UI change.", "flag": "Open/Free", "clientele": "Geopolitics & risk desks", "interactive": "Commodity bars, mineral leverage dossiers, map, AI, export", "status": "Live" }
  },
  {
   "bucket": "Intelligence",
   "feature": "Global Commodities",
   "use": "A live commodities board across energy, base metals, precious and agriculture, with the geopolitical risk premium and AI inflation-transmission analysis.",
   "money": "Target clientele: Geoeconomics, macro & policy desks.",
   "unique": "Yes",
   "archetype": "live",
   "columns": ["Commodity", "Level", "Change", "Complex"],
   "dataSource": { "csv": "geo_commodities" },
   "sourceMeta": { "sources": "Trading Economics, CME, World Bank", "link": "https://tradingeconomics.com/commodities", "notes": "Illustrative levels; swaps to a live commodities API with no UI change.", "flag": "Open/Free", "clientele": "Macro & geoeconomics desks", "interactive": "Commodity complex bars, risk premium, AI inflation transmission, export", "status": "Live" }
  }
 ],
 "finance": [
  {
   "bucket": "Market Intelligence",
   "feature": "Live Global Stock Exchanges",
   "use": "Real-time feeds across NYSE, NASDAQ, TSX, Tadawul, ASX, etc. (outline item)",
   "money": "Target clientele: Investors, traders.",
   "unique": "No",
   "archetype": "tracker",
   "columns": ["Exchange / Index", "Region", "Level", "1D %", "1M %"],
   "dataSource": { "csv": "finance_world_exchanges.csv", "rowMap": r => [r.name, r.region, r.level, r.d1, r.dM], "note": "Live index levels for the world's major exchanges via the terminal's market-data proxy (Yahoo Finance OHLC)." },
   "sourceMeta": {
    "sources": "Twelve Data (multi-exchange); ICE Consolidated (Tadawul); Refinitiv/Bloomberg (enterprise)",
    "link": "https://twelvedata.com ; https://developer.ice.com",
    "notes": "Tiered paid APIs; free tiers are US-only/delayed. LIKELY THE SINGLE LARGEST RECURRING COST in the whole build",
    "flag": "Paid/Licensed",
    "clientele": "Investors, traders",
    "interactive": "Live multi-exchange ticker; index heatmap; watchlist",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Macro & Economic Indicators",
   "feature": "Economic Overview of All Countries",
   "use": "GDP, trade balance, macro snapshot per country (outline item)",
   "money": "Target clientele: All segments.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "World Bank API; IMF DataMapper API",
    "link": "https://api.worldbank.org ; https://www.imf.org/external/datamapper/api/help",
    "notes": "Both free, no key",
    "flag": "Open/Free",
    "clientele": "All segments",
    "interactive": "Country economic dashboard; GDP comparator",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Macro & Economic Indicators",
   "feature": "Key Financial Indicators (GDP, CPI, PMI, Emp-to-Pop)",
   "use": "Standard macro indicator time series (outline item)",
   "money": "Target clientele: Economists, investors, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": ["Country", "Indicator", "Latest", "Year"],
   "dataSource": { "csv": "finance_world_indicators.csv", "rowMap": r => [r.country, r.indicator, r.latest, r.year], "note": "World Bank Open Data API (free, no key): latest GDP growth, CPI inflation and unemployment for major economies. PMI needs a licensed source and is intentionally absent rather than invented." },
   "sourceMeta": {
    "sources": "IMF IFS; World Bank; ILOSTAT",
    "link": "https://data.imf.org ; https://api.worldbank.org ; https://ilostat.ilo.org/data/",
    "notes": "All free (IMF/World Bank no key; ILOSTAT free bulk API)",
    "flag": "Open/Free",
    "clientele": "Economists, investors, journalists",
    "interactive": "Indicator time-series with country overlay",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Sector & Industry Intelligence",
   "feature": "Sector Policy — Power/Energy/Green/Critical Minerals",
   "use": "Sector policy, capacity, supply chains (outline item)",
   "money": "Target clientele: Energy/policy analysts, investors.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "IEA; IRENA; USGS Mineral Commodity Summaries",
    "link": "https://www.iea.org/data-and-statistics ; https://www.irena.org/Data ; https://www.usgs.gov",
    "notes": "IEA partly paid; IRENA & USGS free",
    "flag": "Paid/Licensed",
    "clientele": "Energy/policy analysts, investors",
    "interactive": "Energy-mix comparator; critical-minerals supply map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Trade & Sanctions",
   "feature": "Trade Agreements & Economic Sanctions",
   "use": "RTAs, tariff schedules, trade-affecting sanctions (outline item)",
   "money": "Target clientele: Trade analysts, exporters, investors.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "WTO RTA Database; UN Comtrade+",
    "link": "https://rtais.wto.org ; https://comtradeplus.un.org",
    "notes": "WTO RTA free (no API); Comtrade+ free-tier + paid bulk",
    "flag": "Free w/ Registration",
    "clientele": "Trade analysts, exporters, investors",
    "interactive": "Trade-flow Sankey; tariff comparator",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Sector & Industry Intelligence",
   "feature": "Top Financial & Business Players",
   "use": "Largest companies/banks/investors by region (outline item)",
   "money": "Target clientele: Investors, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "OpenCorporates; Forbes Global 2000 (editorial)",
    "link": "https://opencorporates.com/api_documentation/API-Documentation",
    "notes": "OpenCorporates paid API (limited free tier); Forbes rankings copyrighted",
    "flag": "Paid/Licensed",
    "clientele": "Investors, journalists",
    "interactive": "Company profile cards; ownership network graph",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Analytical Tools",
   "feature": "Economic Simulator",
   "use": "What-if macro shock modelling (tariffs, rates, commodities) (outline item)",
   "money": "Target clientele: Analysts, students, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Internal — uses World Bank/IMF indicators as inputs",
    "link": "N/A",
    "notes": "A modelling feature, not an external source",
    "flag": "Internal/Build",
    "clientele": "Analysts, students, government",
    "interactive": "Adjustable-parameter macro simulator",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Sector & Industry Intelligence",
   "feature": "AI & the Tech Industry",
   "use": "AI/tech investment, players, and policy (outline item)",
   "money": "Target clientele: Investors, tech analysts, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "OECD AI Observatory; Stanford AI Index; Crunchbase",
    "link": "https://oecd.ai ; https://aiindex.stanford.edu ; https://data.crunchbase.com",
    "notes": "OECD/Stanford free; Crunchbase API paid",
    "flag": "Paid/Licensed",
    "clientele": "Investors, tech analysts, journalists",
    "interactive": "AI investment map; policy tracker by country",
    "status": "New (outline)"
   }
  }
 ],
 "judiciary": [
  {
   "bucket": "International Courts",
   "feature": "ICC Proceedings",
   "use": "International Criminal Court dockets, filings, judgments (outline item)",
   "money": "Target clientele: Legal researchers, journalists, NGOs.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "ICC official case system",
    "link": "https://www.icc-cpi.int/cases",
    "notes": "Structured pages, no public API — scrape within ToS or seek data agreement",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal researchers, journalists, NGOs",
    "interactive": "Case timeline; charge/verdict tracker by situation",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "International Courts",
   "feature": "ICJ Proceedings",
   "use": "International Court of Justice contentious cases & advisory opinions (outline item)",
   "money": "Target clientele: Legal researchers, journalists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "ICJ official documents",
    "link": "https://www.icj-cij.org/case",
    "notes": "Documents downloadable (PDF), no API",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal researchers, journalists, government",
    "interactive": "Case status tracker; state-vs-state dispute map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Comparative Jurisprudence",
   "feature": "Supreme Courts & precedent — United States",
   "use": "Case law, opinions, docket tracking",
   "money": "Target clientele: Law firms, legal researchers, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "CourtListener / Free Law Project (RECAP)",
    "link": "https://www.courtlistener.com/help/api/",
    "notes": "Free public REST API, no cost, registration for higher rate limits",
    "flag": "Free w/ Registration",
    "clientele": "Law firms, legal researchers, journalists",
    "interactive": "Precedent citation graph; docket tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Comparative Jurisprudence",
   "feature": "Supreme Courts & precedent — other common-law jurisdictions",
   "use": "UK, Commonwealth, and other national high courts",
   "money": "Target clientele: Law firms, legal researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "UK Supreme Court website; CommonLII / WorldLII",
    "link": "https://www.supremecourt.uk ; http://www.commonlii.org",
    "notes": "Mostly downloadable judgments, no unified API — will need per-country ingestion",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Law firms, legal researchers",
    "interactive": "Cross-jurisdiction precedent comparator",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "International Courts",
   "feature": "WTO Dispute Settlement",
   "use": "Trade disputes, panels, rulings",
   "money": "Target clientele: Trade lawyers, exporters, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "WTO DS database",
    "link": "wto.org/english/tratop_e/dispu_e",
    "notes": "Searchable structured DB — scrape",
    "flag": "Open/Free",
    "clientele": "Trade lawyers, exporters, analysts",
    "interactive": "Dispute tracker by country/sector",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "International Courts",
   "feature": "Regional Int'l Courts (ECtHR / CJEU / ITLOS)",
   "use": "European & maritime international courts",
   "money": "Target clientele: International-law researchers, firms.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "ECtHR HUDOC; CJEU; ITLOS",
    "link": "hudoc.echr.coe.int ; curia.europa.eu ; itlos.org",
    "notes": "ECtHR HUDOC has a free API; others downloadable",
    "flag": "Open/Free",
    "clientele": "International-law researchers, firms",
    "interactive": "Cross-court case search; citation graph",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "Judge Analytics (Ruling Patterns)",
   "use": "Reversal rates, time-to-disposal, state-vs-petitioner tendencies, bench patterns",
   "money": "Target clientele: Law firms, litigators, legal-analytics buyers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Derived from Indian Kanoon / eCourts judgment corpus",
    "link": "indiankanoon.org/api",
    "notes": "Internal analytics over judgment corpus; no off-the-shelf source",
    "flag": "Internal/Build",
    "clientele": "Law firms, litigators, legal-analytics buyers",
    "interactive": "Judge scorecard; ruling-pattern charts; reversal-rate ranking",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "Case Pendency & Disposal Analytics",
   "use": "Pendency by court/case-type/age; disposal-rate trends",
   "money": "Target clientele: Policy analysts, law firms, journalists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NJDG (National Judicial Data Grid)",
    "link": "njdg.ecourts.gov.in",
    "notes": "Rich pendency data, dashboard-style, no clean API — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Policy analysts, law firms, journalists, government",
    "interactive": "Pendency heatmap; oldest-pending tracker; disposal trends",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "Precedent / Citation Network",
   "use": "Which judgments cite which; authority strengthening/eroding over time",
   "money": "Target clientele: Law firms, legal researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Citation extraction from Indian Kanoon",
    "link": "indiankanoon.org/api",
    "notes": "Internal graph built on judgment corpus",
    "flag": "Internal/Build",
    "clientele": "Law firms, legal researchers",
    "interactive": "Precedent authority graph; citation timeline",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Intelligence",
   "feature": "Constitutional Bench Tracker",
   "use": "Pending constitution-bench matters, referrals, expected impact",
   "money": "Target clientele: Legal researchers, journalists, policy analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Supreme Court Observer; sci.gov.in",
    "link": "scobserver.in ; sci.gov.in",
    "notes": "SCObserver free editorial tracking (no API) — curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal researchers, journalists, policy analysts",
    "interactive": "Pending-matter tracker; impact tags",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Court Operations",
   "feature": "Cause-List / Hearing Scheduler",
   "use": "Daily cause lists — what's being heard tomorrow",
   "money": "Target clientele: Law firms, litigators.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eCourts services; SC/HC cause lists",
    "link": "ecourts.gov.in",
    "notes": "Cause lists published daily (structured pages) — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Law firms, litigators",
    "interactive": "Tomorrow's-hearings feed; case-watch alerts",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Tribunals",
   "feature": "NCLT / NCLAT (Insolvency)",
   "use": "Insolvency & company-law case orders",
   "money": "Target clientele: Insolvency professionals, investors, banks.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NCLT/NCLAT official sites",
    "link": "nclt.gov.in ; nclat.nic.in",
    "notes": "Orders as PDFs, no API",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Insolvency professionals, investors, banks",
    "interactive": "IBC case tracker; resolution-status feed",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Tribunals",
   "feature": "Sector Tribunals (ITAT / TDSAT / SAT / DRT)",
   "use": "Tax, telecom, securities, debt-recovery tribunal orders",
   "money": "Target clientele: Tax/telecom/securities lawyers, banks.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Respective tribunal sites",
    "link": "itat.gov.in ; tdsat.gov.in ; sat.gov.in",
    "notes": "Orders downloadable, no API",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Tax/telecom/securities lawyers, banks",
    "interactive": "Tribunal-specific case tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Legal Research",
   "feature": "Professional Case-Law Database",
   "use": "Full annotated case law (professional standard)",
   "money": "Target clientele: Law firms, corporate legal, courts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "SCC Online; Manupatra",
    "link": "scconline.com ; manupatra.com",
    "notes": "Paid subscription/API — the professional standard in India",
    "flag": "Paid/Licensed",
    "clientele": "Law firms, corporate legal, courts",
    "interactive": "Deep case search; headnotes; annotations",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Court Operations",
   "feature": "HC Case Status & Cause Lists",
   "use": "Live case status and daily cause lists for the state's High Court",
   "money": "Target clientele: Lawyers, litigants, businesses.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eCourts HC Services",
    "link": "hcservices.ecourts.gov.in",
    "notes": "Case status by CNR + daily cause lists (structured pages) — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Lawyers, litigants, businesses",
    "interactive": "Case-status search by CNR; tomorrow's-hearings feed; case-watch alerts",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "HC Pendency & Disposal Analytics",
   "use": "Pendency by case-type/age and disposal rates for the HC",
   "money": "Target clientele: Policy analysts, law firms, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NJDG (High Court drill-down)",
    "link": "njdg.ecourts.gov.in",
    "notes": "Rich HC-level pendency data, dashboard-style, no clean API — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Policy analysts, law firms, journalists",
    "interactive": "HC pendency heatmap; oldest-pending tracker; disposal trends",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "HC Judge Profiles & Bench Analytics",
   "use": "Sitting judges, tenure, bench composition, ruling patterns",
   "money": "Target clientele: Law firms, litigators, legal-analytics buyers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "HC establishment rolls; derived from Indian Kanoon corpus",
    "link": "(per-HC site) ; indiankanoon.org/api",
    "notes": "Directory from HC sites; analytics layer built internally",
    "flag": "Internal/Build",
    "clientele": "Law firms, litigators, legal-analytics buyers",
    "interactive": "Judge scorecard; bench-composition view; reversal-rate ranking",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Intelligence",
   "feature": "HC Constitutional & PIL Tracker",
   "use": "Writ petitions, PILs, and constitutional matters before the HC",
   "money": "Target clientele: Legal researchers, journalists, NGOs, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "HC sites; news; legal trackers",
    "link": "(per-HC site)",
    "notes": "Tracked from HC orders + press — curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal researchers, journalists, NGOs, government",
    "interactive": "PIL/writ tracker; matter-status feed; impact tags",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Intelligence",
   "feature": "HC vs State Government Litigation",
   "use": "Cases where the state government is a party; interim orders against the state",
   "money": "Target clientele: Policy analysts, journalists, businesses, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eCourts; state law department records",
    "link": "hcservices.ecourts.gov.in",
    "notes": "Party-based filtering of HC case data — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Policy analysts, journalists, businesses, government",
    "interactive": "State-as-party tracker; adverse-order feed",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Court Operations",
   "feature": "District Court Cause Lists",
   "use": "Daily cause lists — what each district court hears tomorrow",
   "money": "Target clientele: Local lawyers, litigants.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eCourts Services (district cause lists)",
    "link": "districts.ecourts.gov.in",
    "notes": "Cause lists published daily per district court — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Local lawyers, litigants",
    "interactive": "Tomorrow's-hearings feed; court/judge filter; case-watch alerts",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Judicial Analytics",
   "feature": "District Court Pendency & Disposal",
   "use": "Pendency by case-type/age and disposal rates at district level",
   "money": "Target clientele: Policy analysts, legal-aid bodies, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NJDG (district drill-down)",
    "link": "njdg.ecourts.gov.in",
    "notes": "Rich district-level pendency data, dashboard — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Policy analysts, legal-aid bodies, journalists",
    "interactive": "Pendency heatmap by district; oldest-pending tracker; disposal trends",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Justice System Data",
   "feature": "Undertrial & Prison Data",
   "use": "Undertrial population, prison occupancy, bail pendency (district/state)",
   "money": "Target clientele: Legal-aid orgs, journalists, researchers, NGOs.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NCRB \"Prison Statistics India\"",
    "link": "ncrb.gov.in",
    "notes": "Annual PDF/Excel, no API — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal-aid orgs, journalists, researchers, NGOs",
    "interactive": "Undertrial-ratio tracker; prison-occupancy map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Justice System Data",
   "feature": "Legal Aid & Lok Adalat Tracker",
   "use": "Legal-services coverage, Lok Adalat cases settled, DLSA activity",
   "money": "Target clientele: Legal-aid orgs, government, researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NALSA; District Legal Services Authorities",
    "link": "nalsa.gov.in",
    "notes": "NALSA publishes statistics; district data varies — curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Legal-aid orgs, government, researchers",
    "interactive": "Lok Adalat settlement tracker; legal-aid coverage map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Court Operations",
   "feature": "Local Judge & Court Directory",
   "use": "District/sessions judges, court establishment, jurisdiction",
   "money": "Target clientele: Lawyers, litigants, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eCourts; High Court establishment rolls",
    "link": "districts.ecourts.gov.in",
    "notes": "Directory pages, no API — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Lawyers, litigants, journalists",
    "interactive": "Judge/court directory; jurisdiction lookup",
    "status": "New (outline)"
   }
  }
 ],
 "national": [
  {
   "bucket": "Sector & Industry Intelligence",
   "feature": "Industry Updates (Ministry Data)",
   "use": "https://docs.google.com/spreadsheets/d/1a9JUpN0dIhm0VvrBF4qU2wjBZFDX-0KO/edit?gid=591815238#gid=591815238&range=1:25",
   "money": "",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "",
    "link": "",
    "notes": "",
    "flag": "",
    "clientele": "",
    "interactive": "",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "Budget Utilisation & Schemes",
   "use": "Scheme-wise allocation vs utilisation (outline item)",
   "money": "Target clientele: Policy analysts, journalists, civil society.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Union Budget docs; data.gov.in; PFMS",
    "link": "https://www.indiabudget.gov.in ; https://data.gov.in ; https://pfms.nic.in",
    "notes": "data.gov.in has an API (free key); budget docs are PDFs; PFMS dashboard no API",
    "flag": "Free w/ Registration",
    "clientele": "Policy analysts, journalists, civil society",
    "interactive": "Scheme utilisation heatmap; budget-vs-actual tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Representative Intelligence",
   "feature": "MP Profiles & Performance (MPLAD, attendance, debates)",
   "use": "Attendance, bills tabled, zero-hour/PQ activity, MPLAD spend, affidavits (outline item)",
   "money": "Target clientele: Journalists, civil society, constituents.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "PRS MP Track; MPLADS portal; ADR",
    "link": "https://prsindia.org/mptrack ; https://mplads.gov.in ; https://myneta.info",
    "notes": "PRS CC-BY (GitHub mirror exists); MPLADS dashboard no API",
    "flag": "Free w/ Registration",
    "clientele": "Journalists, civil society, constituents",
    "interactive": "MP scorecard; constituency-visit map; MPLAD spend tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Government Operations",
   "feature": "Centre-sanctioned Projects & Completion Rate",
   "use": "Status of centrally sponsored projects/schemes (outline item)",
   "money": "Target clientele: Investors, infra analysts, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "data.gov.in scheme dashboards",
    "link": "https://data.gov.in",
    "notes": "Partial via data.gov.in API; PRAGATI is internal-gov (not public)",
    "flag": "Free w/ Registration",
    "clientele": "Investors, infra analysts, journalists",
    "interactive": "Completion-rate dashboard by state/sector",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Electoral Data & Analytics",
   "feature": "LS Manifestos & Promises Tracker",
   "use": "Party manifesto commitments vs delivery over a term (outline item)",
   "money": "Target clientele: Journalists, civil society, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Party manifestos; ADR/PRS post-poll trackers",
    "link": "https://myneta.info ; https://prsindia.org",
    "notes": "No structured API — manifesto text needs NLP extraction each cycle",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Journalists, civil society, analysts",
    "interactive": "Promise-vs-delivery tracker by sector/constituency",
    "status": "New (outline)"
   }
  }
 ],
 "state": [
  {
   "bucket": "Public Finance",
   "feature": "State Economic Data (GSDP, sectors)",
   "use": "State GSDP, sector composition, per-capita income (outline item)",
   "money": "Target clientele: Investors, economists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "MOSPI; data.gov.in",
    "link": "https://www.mospi.gov.in ; https://data.gov.in",
    "notes": "MOSPI downloads; some via data.gov.in API",
    "flag": "Free w/ Registration",
    "clientele": "Investors, economists",
    "interactive": "GSDP comparator; sector composition chart",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Comparative Analytics",
   "feature": "Cross-State Comparison Engine",
   "use": "Same indicator across all states, ranked & mapped (fiscal, crime, GSDP, power, schemes)",
   "money": "Target clientele: Investors, analysts, journalists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NITI Aayog indices; MOSPI; RBI; NCRB",
    "link": "niti.gov.in ; mospi.gov.in",
    "notes": "NITI indices clean & comparative (free); others aggregated in",
    "flag": "Open/Free",
    "clientele": "Investors, analysts, journalists, government",
    "interactive": "Ranked state comparator; choropleth map; indicator switcher",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "State Fiscal Deep-Dive",
   "use": "Debt-to-GSDP, own-tax vs transfers, off-budget borrowing, guarantees",
   "money": "Target clientele: SDL/bond investors, economists, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "RBI \"State Finances: A Study of Budgets\"",
    "link": "rbi.org.in",
    "notes": "Free annual publication (PDF/Excel), no API",
    "flag": "Open/Free",
    "clientele": "SDL/bond investors, economists, journalists",
    "interactive": "Debt-to-GSDP tracker; revenue-mix chart; borrowing flags",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "SDL Auction & Borrowing Tracker",
   "use": "State Development Loan issuance & yields",
   "money": "Target clientele: Bond investors, treasuries, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "RBI SDL auction data",
    "link": "rbi.org.in",
    "notes": "RBI publishes auction results, structured — scrape",
    "flag": "Open/Free",
    "clientele": "Bond investors, treasuries, analysts",
    "interactive": "Issuance calendar; yield-spread chart",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Audit & Oversight",
   "feature": "CAG Audit Tracker",
   "use": "State audit reports flagging financial irregularities",
   "money": "Target clientele: Journalists, oversight bodies, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Comptroller & Auditor General",
    "link": "cag.gov.in",
    "notes": "Reports as PDFs, no API — curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Journalists, oversight bodies, analysts",
    "interactive": "Audit-flag feed; irregularity tracker by department",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Legislative & Policy Intelligence",
   "feature": "Legislative Productivity Comparison",
   "use": "Sitting days, bills vs ordinances, questions answered, across assemblies",
   "money": "Target clientele: Analysts, journalists, civil society.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "PRS state briefs; assembly records",
    "link": "prsindia.org/bills/state-legislative-briefs",
    "notes": "PRS CC-BY 4.0; some manual",
    "flag": "Free w/ Registration",
    "clientele": "Analysts, journalists, civil society",
    "interactive": "Cross-state productivity chart; ordinance-frequency tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Legislative & Policy Intelligence",
   "feature": "Governor Friction & President's Rule Tracker",
   "use": "Assent delays, President's Rule history, ordinance frequency (political-risk signal)",
   "money": "Target clientele: Analysts, journalists, legal researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Raj Bhavan communications; assembly records; PRS",
    "link": "prsindia.org",
    "notes": "No API — tracked from records + press",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Analysts, journalists, legal researchers",
    "interactive": "Friction/political-risk index; President's-Rule timeline",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "NITI Aayog State Indices",
   "use": "SDG India Index, health/education/water indices",
   "money": "Target clientele: Analysts, government, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NITI Aayog",
    "link": "niti.gov.in",
    "notes": "Clean, comparative, free downloads",
    "flag": "Open/Free",
    "clientele": "Analysts, government, journalists",
    "interactive": "Index comparator; state ranking; trend chart",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Performance Tracker (Composite)",
   "use": "Single 360° scorecard per district rolling up development, governance, and service indicators into a ranked index",
   "money": "Target clientele: District admin, investors, policy analysts, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NITI Aayog Aspirational Districts Programme; data.gov.in district datasets",
    "link": "ndap.niti.gov.in ; data.gov.in",
    "notes": "ADP dashboard is the anchor — clean, comparative, district-level; NDAP normalises many district datasets under one platform",
    "flag": "Open/Free",
    "clientele": "District admin, investors, policy analysts, journalists",
    "interactive": "Composite district score; cross-district ranking; choropleth map; indicator switcher",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Health & Nutrition Indicators",
   "use": "Immunisation, institutional births, malnutrition, health-infra availability",
   "money": "Target clientele: Health-policy analysts, NGOs, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NFHS district factsheets; HMIS; NITI ADP",
    "link": "nfhs.i,ihmisreports (mohfw) ; ndap.niti.gov.in",
    "notes": "NFHS district factsheets structured; HMIS dashboard — scrape",
    "flag": "Open/Free",
    "clientele": "Health-policy analysts, NGOs, government",
    "interactive": "Health scorecard; district drill-down; trend vs state avg",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Education Indicators",
   "use": "Enrolment, dropout, learning outcomes, school infrastructure",
   "money": "Target clientele: Education analysts, NGOs, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "UDISE+ district reports; ASER (learning outcomes)",
    "link": "udiseplus.gov.in ; asercentre.org",
    "notes": "UDISE+ structured district data; ASER free reports",
    "flag": "Open/Free",
    "clientele": "Education analysts, NGOs, government",
    "interactive": "Enrolment/dropout tracker; learning-outcome map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Economic & Livelihood Indicators",
   "use": "District GDP (where available), bank credit, MSME density, employment",
   "money": "Target clientele: Investors, lenders, economists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "RBI district credit data; MSME Udyam; state DES",
    "link": "data.gov.in ; dashboard.msme.gov.in",
    "notes": "Udyam district-wise structured; RBI credit data downloadable",
    "flag": "Free w/ Registration",
    "clientele": "Investors, lenders, economists",
    "interactive": "Credit-deposit ratio map; MSME-density chart",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Agriculture & Rural Indicators",
   "use": "Crop area/yield, irrigation, MGNREGA person-days, PMAY-G housing",
   "money": "Target clientele: Rural-dev analysts, NGOs, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Agriculture census; MGNREGA MIS; PMAY-G dashboard",
    "link": "nrega.nic.in ; pmayg.nic.in",
    "notes": "MGNREGA & PMAY-G granular MIS data — scrape/ingest",
    "flag": "Free w/ Registration",
    "clientele": "Rural-dev analysts, NGOs, government",
    "interactive": "Yield map; rural-scheme uptake tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Infrastructure & Connectivity",
   "use": "Road/rail access, electrification, water, telecom coverage",
   "money": "Target clientele: Infra investors, planners, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "PM Gati Shakti; SAUBHAGYA/power data; TRAI district coverage",
    "link": "pmgatishakti.gov.in",
    "notes": "Gati Shakti geospatial; power/telecom coverage — mixed",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Infra investors, planners, government",
    "interactive": "Connectivity heatmap; infra-gap flags",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Governance & Grievance Indicators",
   "use": "Grievance-redressal rates, e-governance uptake, scheme saturation",
   "money": "Target clientele: Government, journalists, civil society.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "CPGRAMS; state grievance portals; district collectorate data",
    "link": "pgportal.gov.in",
    "notes": "CPGRAMS dashboard; district portals vary — scrape/curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Government, journalists, civil society",
    "interactive": "Grievance-response scorecard; scheme-saturation tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "District Crime & Safety Indicators",
   "use": "Crime rate, women's safety, response indicators at district level",
   "money": "Target clientele: Analysts, journalists, residents, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "NCRB \"Crime in India\"; state police district data",
    "link": "ncrb.gov.in",
    "notes": "NCRB annual PDF/Excel (district tables), no API — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Analysts, journalists, residents, government",
    "interactive": "Crime-rate district map; safety-indicator dashboard",
    "status": "New (outline)"
   }
  }
 ],
 "local": [
  {
   "bucket": "Audit & Oversight",
   "feature": "MGNREGA Anomaly & Delay Analytics",
   "use": "Payment-delay flags, ghost-worker anomaly detection, works-completion by panchayat (analytics layer on top of the basic tracker)",
   "money": "Target clientele: Civil society, auditors, researchers, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "MGNREGA MIS (nrega.nic.in)",
    "link": "nrega.nic.in",
    "notes": "Granular national MIS data; internal analytics/anomaly layer on top",
    "flag": "Internal/Build",
    "clientele": "Civil society, auditors, researchers, journalists",
    "interactive": "Delay-flag map; anomaly detection; completion-rate scoring",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "Local Body Finance Tracker",
   "use": "Finance Commission grants devolved vs utilised, per-capita",
   "money": "Target clientele: Policy analysts, investors, researchers.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "15th Finance Commission; CityFinance.in",
    "link": "fincomindia.nic.in ; cityfinance.in",
    "notes": "CityFinance is a genuine ULB municipal-finance portal — structured",
    "flag": "Open/Free",
    "clientele": "Policy analysts, investors, researchers",
    "interactive": "Grant devolution tracker; per-capita utilisation map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "Municipal Own-Revenue & Solvency Health",
   "use": "Property tax & own-revenue vs grant dependence (solvency signal)",
   "money": "Target clientele: Municipal-bond investors, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "CityFinance.in; ULB budgets",
    "link": "cityfinance.in",
    "notes": "Structured municipal-finance data; some manual",
    "flag": "Open/Free",
    "clientele": "Municipal-bond investors, analysts",
    "interactive": "Own-revenue vs grants chart; solvency scorecard",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Service Delivery",
   "feature": "Service-Delivery Scorecards",
   "use": "Sanitation, water coverage, grievance-response times",
   "money": "Target clientele: Urban planners, residents, journalists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Swachh Survekshan; city grievance portals",
    "link": "swachhsurvekshan.org",
    "notes": "Swachh rankings clean & comparative; portals vary by city",
    "flag": "Open/Free",
    "clientele": "Urban planners, residents, journalists, government",
    "interactive": "Service scorecard; ranking map; response-time tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Hyperlocal Intelligence",
   "feature": "Flagship-City Deep Dashboard",
   "use": "Deep single-city view (budget, ward works, property tax, permits, grievances) for 5–10 best-data cities",
   "money": "Target clientele: Urban investors, planners, local journalists, RWAs.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "City open-data portals (BBMP, Delhi, Pune, Surat, Hyderabad)",
    "link": "(per-city portals)",
    "notes": "Depth-over-breadth strategy; city-by-city ingestion",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Urban investors, planners, local journalists, RWAs",
    "interactive": "Single-city 360° dashboard; ward drill-down",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Development Indicators",
   "feature": "ULB/GP Performance Tracker (Composite)",
   "use": "Single scorecard per municipality/gram panchayat rolling up finance, service delivery & governance into a ranked index",
   "money": "Target clientele: Local admin, municipal-bond investors, analysts, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "CityFinance.in; eGramSwaraj; NITI NDAP",
    "link": "cityfinance.in ; egramswaraj.gov.in",
    "notes": "CityFinance covers ULB finances; eGramSwaraj is the national GP planning/accounting system — structured, no clean API",
    "flag": "Open/Free",
    "clientele": "Local admin, municipal-bond investors, analysts, journalists",
    "interactive": "Composite ULB/GP score; cross-body ranking; drill-down map",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "GP Finance & GPDP Tracker",
   "use": "Gram Panchayat Development Plan, fund receipt vs expenditure, 15th FC grant utilisation",
   "money": "Target clientele: Rural-dev analysts, auditors, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eGramSwaraj; 15th Finance Commission",
    "link": "egramswaraj.gov.in ; fincomindia.nic.in",
    "notes": "eGramSwaraj holds GPDP + accounting for ~2.5L panchayats; MIS-style, scrape/ingest",
    "flag": "Free w/ Registration",
    "clientele": "Rural-dev analysts, auditors, government",
    "interactive": "GPDP progress tracker; grant utilisation map; expenditure-mix chart",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "Municipal Finance & Solvency",
   "use": "Property-tax collection, own-revenue vs grants, borrowing, credit ratings",
   "money": "Target clientele: Municipal-bond investors, analysts.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "CityFinance.in; municipal-bond disclosures",
    "link": "cityfinance.in",
    "notes": "Structured municipal-finance portal; bond disclosures via SEBI",
    "flag": "Open/Free",
    "clientele": "Municipal-bond investors, analysts",
    "interactive": "Own-revenue vs grants chart; solvency scorecard; rating tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Public Finance",
   "feature": "Property Tax & Own-Revenue Efficiency",
   "use": "Tax base coverage, collection efficiency, demand vs collection",
   "money": "Target clientele: Investors, urban economists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "ULB portals; CityFinance.in",
    "link": "cityfinance.in",
    "notes": "Collection data partly in CityFinance; rest per-ULB — scrape",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Investors, urban economists, government",
    "interactive": "Collection-efficiency ranking; demand-vs-collection gap",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Service Delivery",
   "feature": "Service Delivery Scorecards (Urban)",
   "use": "Sanitation, water supply, waste, grievance-response times",
   "money": "Target clientele: Urban planners, residents, journalists, government.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "Swachh Survekshan; AMRUT; city grievance portals",
    "link": "swachhsurvekshan.org ; amrut.gov.in",
    "notes": "Swachh & AMRUT rankings clean & comparative; grievance portals vary",
    "flag": "Open/Free",
    "clientele": "Urban planners, residents, journalists, government",
    "interactive": "Service scorecard; ranking map; response-time tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Service Delivery",
   "feature": "GP Service & Asset Tracker",
   "use": "Assets created, water/sanitation coverage, works completed at GP level",
   "money": "Target clientele: Rural-dev analysts, NGOs, auditors.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "eGramSwaraj (asset directory); MGNREGA MIS",
    "link": "egramswaraj.gov.in ; nrega.nic.in",
    "notes": "Asset directory + works data structured but MIS-style — scrape",
    "flag": "Free w/ Registration",
    "clientele": "Rural-dev analysts, NGOs, auditors",
    "interactive": "GP asset map; works-completion tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Electoral Data & Analytics",
   "feature": "Local Body Election & Incumbency",
   "use": "ULB/GP election results, incumbency, reservation status",
   "money": "Target clientele: Local political analysts, parties, journalists.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "State Election Commissions",
    "link": "(per-state SEC)",
    "notes": "Each state SEC runs local polls; results in PDFs, no unified API — curate",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Local political analysts, parties, journalists",
    "interactive": "Ward/GP result map; incumbency & reservation tracker",
    "status": "New (outline)"
   }
  },
  {
   "bucket": "Representative Intelligence",
   "feature": "Elected Rep Profiles & Report Cards",
   "use": "Councillor/Sarpanch/Pradhan profiles, attendance, performance",
   "money": "Target clientele: Constituents, local journalists, civil society.",
   "unique": "No",
   "archetype": "tracker",
   "columns": [
    "Item",
    "Status",
    "Detail"
   ],
   "dataSource": null,
   "sourceMeta": {
    "sources": "State SEC filings; affidavits (where mandated)",
    "link": "(per-state SEC)",
    "notes": "Sparse & uneven across states, no API — manual build",
    "flag": "No Public API (manual/scrape)",
    "clientele": "Constituents, local journalists, civil society",
    "interactive": "Rep profile cards; report-card scoring",
    "status": "New (outline)"
   }
  }
 ]
};