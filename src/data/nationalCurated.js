/** Curated National-desk tables from the V24 KPI review. Do not invent extra rows. */

export const DELIM_STATES = [
  ['Uttar Pradesh', 238100, 80],
  ['Bihar', 127800, 40],
  ['Maharashtra', 126400, 48],
  ['West Bengal', 99600, 42],
  ['Madhya Pradesh', 87600, 29],
  ['Rajasthan', 82400, 25],
  ['Tamil Nadu', 76800, 39],
  ['Gujarat', 71500, 26],
  ['Karnataka', 69300, 28],
  ['Andhra Pradesh', 53200, 25],
  ['Odisha', 47100, 21],
  ['Jharkhand', 40100, 14],
  ['Telangana', 38200, 17],
  ['Assam', 36300, 14],
  ['Kerala', 35800, 20],
  ['Punjab', 30800, 13],
  ['Haryana', 30700, 10],
  ['Chhattisgarh', 30200, 11],
  ['Delhi', 21600, 7],
  ['Jammu & Kashmir', 13600, 5],
  ['Uttarakhand', 11800, 5],
  ['Himachal Pradesh', 7500, 4],
  ['Tripura', 4200, 2],
  ['Meghalaya', 3400, 2],
  ['Manipur', 3300, 2],
  ['Nagaland', 2300, 1],
  ['Goa', 1600, 2],
  ['Arunachal Pradesh', 1600, 2],
  ['Puducherry', 1600, 1],
  ['Mizoram', 1300, 1],
  ['Chandigarh', 1200, 1],
  ['D&N Haveli and Daman & Diu', 1200, 2],
  ['Sikkim', 700, 1],
  ['Andaman & Nicobar', 400, 1],
  ['Ladakh', 300, 1],
  ['Lakshadweep', 70, 1],
];

export const DELIM_SIZES = [
  [543, '543 · current house'],
  [753, '753 · expanded'],
  [848, '848 · debated ceiling'],
];

export const UNION_PROMISES = [
  ['Ayushman Bharat cover for all citizens 70+', 'Health', 'Launched Oct 2024 — enrolment live'],
  ['3 crore additional PMAY houses', 'Housing', 'Cabinet approved Aug 2024 — rollout ongoing'],
  ['One Nation One Election', 'Governance', '129th Amendment Bill introduced Dec 2024 — before JPC'],
  ['Uniform Civil Code', 'Governance', 'Uttarakhand state UCC in force (2025); national law pending'],
  ['Free foodgrain (PMGKAY) for 5 years', 'Welfare', 'Extension in force — ongoing'],
  ['3 crore Lakhpati Didis', 'Livelihoods', 'NRLM programme ongoing — counts contested; verify NRLM data'],
  ['Women’s reservation (Nari Shakti Vandan)', 'Representation', 'Enacted 2023 — implementation tied to census + delimitation'],
  ['Mudra loan ceiling to ₹20 lakh', 'Finance', 'Raised Oct 2024 — in force'],
  ['Anti paper-leak law', 'Education', 'Public Examinations Act 2024 — in force'],
  ['Vande Bharat & rail modernisation', 'Infrastructure', 'Fleet expansion ongoing'],
];

export const MANIFESTO_LIBRARY = [
  ['BJP — Sankalp Patra 2024', 'https://www.bjp.org/manifesto'],
  ['INC — Nyay Patra 2024', 'https://manifesto.inc.in/'],
  ['ECI — Model Code & party documents', 'https://www.eci.gov.in/'],
  ['Manifesto Project (research corpus)', 'https://manifesto-project.wzb.eu/'],
];

export const LS18_SEATS = [
  ['BJP', 240],
  ['INC', 99],
  ['SP', 37],
  ['AITC', 29],
  ['DMK', 22],
  ['TDP', 16],
  ['JD(U)', 12],
  ['SS (UBT)', 9],
  ['NCP (SP)', 8],
  ['Others', 71],
];

export const LS18_FACTS = [
  ['Members', '543', 'Elected strength'],
  ['Women MPs', '74 (13.6%)', 'Highest count to date'],
  ['First-time MPs', '~280 (52%)', 'Turnover at the 2024 election'],
  ['Average age', '~56 years', 'ECI / PRS published profile'],
];

export const LS18_PROFILE = [
  ['Women MPs', 74],
  ['First-time MPs', 280],
  ['Returning MPs', 263],
];

export const STATEMENT_LEADERS = [
  'Narendra Modi',
  'Amit Shah',
  'Rahul Gandhi',
  'Nirmala Sitharaman',
  'S. Jaishankar',
  'Mallikarjun Kharge',
  'Yogi Adityanath',
  'Mamata Banerjee',
];

export const FLAGSHIP_PROGRAMMES = [
  ['PM Gati Shakti', 'Multi-modal logistics master plan', 'National master plan operational; NMP portal live', 'Active'],
  ['Bharatmala Pariyojana', 'Highways', 'Phase-I corridors under construction — revised timelines', 'Active'],
  ['Sagarmala', 'Ports & coastal economy', 'Port modernisation + connectivity projects ongoing', 'Active'],
  ['Dedicated Freight Corridors', 'Rail freight', 'EDFC complete; WDFC final stretches', 'Active'],
  ['Jal Jeevan Mission', 'Rural tap water', 'Coverage expanded from 17% (2019) — mission extended', 'Active'],
  ['PMAY (urban + rural)', 'Housing', 'Next-phase target of 3 crore additional houses approved 2024', 'Active'],
  ['Vande Bharat programme', 'Passenger rail', 'Fleet expansion + sleeper variant trials', 'Active'],
  ['Smart Cities Mission', 'Urban', 'Mission period closed; projects transitioned to states', 'Inactive'],
];

export const BUDGET_KEY = [
  ['Total expenditure', '~₹50.65 lakh crore', 'Budget estimate'],
  ['Capital expenditure', '~₹11.21 lakh crore', 'Effective capex higher with grants-in-aid'],
  ['Fiscal deficit target', '4.4% of GDP', 'Glide path continues'],
  ['Receipts (excl. borrowings)', '~₹34.96 lakh crore', 'Tax + non-tax + capital receipts'],
  ['Income-tax relief', 'Nil tax up to ₹12 lakh', 'New regime, incl. rebate'],
];

export const BUDGET_SCHEMES = [
  ['MGNREGA', 86000],
  ['Jal Jeevan Mission', 67000],
  ['PM-KISAN', 63500],
  ['Samagra Shiksha', 41250],
  ['National Health Mission', 37227],
  ['PM Gram Sadak Yojana', 19000],
  ['PM-POSHAN', 12500],
  ['Ayushman Bharat PM-JAY', 9406],
];

export const PIG_SEC_META = {
  Primary: { label: 'Primary', gdp: 18, emp: 43, blurb: 'Agriculture, allied & natural resources' },
  Secondary: { label: 'Secondary', gdp: 27, emp: 25, blurb: 'Industry, infrastructure & manufacturing' },
  Services: { label: 'Services', gdp: 55, emp: 32, blurb: 'Finance, digital, social & public administration' },
};

export const INDUSTRY_V1 = [
  { id: 'manf', label: 'Manufacturing share of GDP', units: '% of GDP', authority: 'World Bank', indicator: 'NV.IND.MANF.ZS' },
  { id: 'ind', label: 'Industry incl. construction', units: '% of GDP', authority: 'World Bank', indicator: 'NV.IND.TOTL.ZS' },
  { id: 'gdp', label: 'GDP (current US$)', units: 'US$', authority: 'World Bank', indicator: 'NY.GDP.MKTP.CD' },
  { id: 'pcap', label: 'GDP per capita', units: 'US$', authority: 'World Bank', indicator: 'NY.GDP.PCAP.CD' },
  { id: 'cpi', label: 'CPI inflation', units: '%', authority: 'World Bank', indicator: 'FP.CPI.TOTL.ZG' },
  { id: 'uem', label: 'Unemployment', units: '% of labour force', authority: 'World Bank', indicator: 'SL.UEM.TOTL.ZS' },
  { id: 'debt', label: 'Debt-to-GDP', units: '% of GDP', authority: 'not wired', indicator: '' },
  { id: 'wpi', label: 'WPI', units: 'index', authority: 'not wired — MoSPI / Office of the Economic Adviser', indicator: '' },
  { id: 'iip', label: 'IIP', units: 'index', authority: 'not wired — MoSPI', indicator: '' },
  { id: 'fiscal', label: 'Fiscal deficit', units: '% of GDP', authority: 'not wired — CGA monthly XLSM', indicator: '' },
  { id: 'forex', label: 'Forex reserves', units: 'US$', authority: 'not wired — RBI DBIE (JS-only)', indicator: '' },
];
