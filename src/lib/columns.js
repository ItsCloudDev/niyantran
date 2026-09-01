import { displayColumns } from './normalise.js';

const PRESETS = [
  {
    test: /^conflicts$/i,
    cols: [
      { key: 'conflict_name', label: 'THEATRE', fallback: 'title', dot: true },
      { key: 'region', label: 'REGION' },
      { key: 'current_stage', label: 'POSTURE', fallback: 'status', pill: true },
      { key: 'since', label: 'SINCE' },
      { key: 'fatalitiesEst', label: 'CASUALTIES' },
      { key: 'displaced', label: 'DISPLACEMENT' },
      { key: 'source_1', label: 'SOURCE' },
    ],
  },
  {
    test: /global intelligence/i,
    cols: [
      { key: 'program_name', label: 'PROGRAMME', fallback: 'title', dot: true },
      { key: 'category', label: 'CATEGORY' },
      { key: 'stage', label: 'STAGE', pill: true },
      { key: 'vendor_or_origin', label: 'VENDOR / ORIGIN' },
    ],
  },
  {
    test: /^alliances$/i,
    cols: [
      { key: 'title', label: 'ALLIANCE / BLOC', fallback: 'name', dot: true },
      { key: 'category', label: 'STRUCTURE' },
      { key: 'region', label: 'REGION' },
      { key: 'memberCount', label: 'ROSTER' },
      { key: 'obligation_class', label: 'OBLIGATION', pill: true },
      { key: 'latestDate', label: 'LATEST RECORD' },
    ],
  },
  {
    test: /^sanctions$/i,
    cols: [
      { key: 'title', label: 'PROGRAMME', fallback: 'name', dot: true },
      { key: 'issuer', label: 'ISSUERS' },
      { key: 'region', label: 'REGION' },
      { key: 'regime_type', label: 'TYPE', fallback: 'type' },
      { key: 'programme_status', label: 'STATUS', fallback: 'status', pill: true },
      { key: 'entities', label: 'LISTED SCOPE' },
    ],
  },
  {
    test: /^infra$/i,
    cols: [
      { key: 'title', label: 'PROJECT', fallback: 'name', dot: true },
      { key: 'sector', label: 'SECTOR' },
      { key: 'region', label: 'REGION' },
      { key: 'status', label: 'STATUS', pill: true },
    ],
  },
  {
    test: /^nuclear watch$/i,
    cols: [
      { key: 'title', label: 'FACILITY', fallback: 'name', dot: true },
      { key: 'country', label: 'COUNTRY' },
      { key: 'facility_kind', label: 'CLASS', fallback: 'kind' },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'latest', label: 'LATEST RECORD', fallback: 'note' },
    ],
  },
  {
    test: /^satellite infrastructure$/i,
    cols: [
      { key: 'title', label: 'LAUNCH', fallback: 'name', dot: true },
      { key: 'provider', label: 'PROVIDER' },
      { key: 'pad', label: 'PAD' },
      { key: 'net', label: 'NET (UTC)', fallback: 'expected' },
      { key: 'status', label: 'STATUS', pill: true },
    ],
  },
  {
    test: /^maritime choke-?points$/i,
    cols: [
      { key: 'title', label: 'ASSET', fallback: 'name', dot: true },
      { key: 'region', label: 'REGION' },
      { key: 'operators', label: 'OPERATORS' },
      { key: 'oil', label: 'OIL / CARGO' },
      { key: 'status', label: 'STATUS', pill: true },
    ],
  },
  {
    test: /^global aid$/i,
    cols: [
      { key: 'title', label: 'PROGRAMME', fallback: 'name', dot: true },
      { key: 'agency', label: 'INSTITUTION' },
      { key: 'region', label: 'REGION' },
      { key: 'requirement', label: 'REQUIREMENT' },
      { key: 'appeal_status', label: 'STATUS', fallback: 'status', pill: true },
      { key: 'dataThrough', label: 'DATA THROUGH' },
    ],
  },
  {
    test: /^transit$/i,
    cols: [
      { key: 'title', label: 'NAME', fallback: 'name', dot: true },
      { key: 'type', label: 'TYPE', pill: true },
      { key: 'location', label: 'LOCATION' },
      { key: 'speed', label: 'SPEED' },
      { key: 'destination', label: 'DESTINATION' },
    ],
  },
  {
    test: /open fronts/i,
    cols: [
      { key: 'conflict_name', label: 'CONFLICT', fallback: 'title', dot: true },
      { key: 'region', label: 'REGION' },
      { key: 'conflict_type', label: 'TYPE' },
      { key: 'current_stage', label: 'STATUS', pill: true },
      { key: 'intensity', label: 'INTENSITY', pill: true },
      { key: 'trend', label: 'TREND', pill: true },
    ],
  },
  {
    test: /bill passage/i,
    cols: [
      { key: 'bill_name', label: 'BILL', fallback: 'title' },
      { key: 'house', label: 'HOUSE' },
      { key: 'sector', label: 'SECTOR' },
      { key: 'current_stage', label: 'STAGE', pill: true },
      { key: 'date_introduced', label: 'INTRODUCED', fallback: 'date' },
      { key: 'probability_score', label: 'PASSAGE', num: true },
    ],
  },
  {
    test: /policy pipeline/i,
    cols: [
      { key: 'policy_name', label: 'POLICY', fallback: 'title', dot: true },
      { key: 'ministry', label: 'MINISTRY' },
      { key: 'stage', label: 'STAGE', pill: true },
      { key: 'date_reported', label: 'REPORTED', fallback: 'date' },
    ],
  },
  {
    test: /parliamentary question/i,
    cols: [
      { key: 'subject', label: 'QUESTION', fallback: 'title', dot: true },
      { key: 'mp_name', label: 'MEMBER' },
      { key: 'ministry', label: 'MINISTRY' },
      { key: 'question_type', label: 'TYPE', pill: true },
      { key: 'date', label: 'TABLED' },
    ],
  },
  {
    test: /regulatory body watch/i,
    cols: [
      { key: 'title', label: 'INSTRUMENT', fallback: 'name', dot: true },
      { key: 'regulator', label: 'REGULATOR' },
      { key: 'action_type', label: 'TYPE', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /candidate affidavit/i,
    cols: [
      { key: 'name', label: 'CANDIDATE', fallback: 'title', dot: true },
      { key: 'constituency', label: 'CONSTITUENCY' },
      { key: 'party', label: 'PARTY' },
      { key: 'criminal_cases', label: 'CASES', num: true },
      { key: 'education', label: 'EDUCATION' },
      { key: 'total_assets', label: 'ASSETS' },
      { key: 'liabilities', label: 'LIABILITIES' },
    ],
  },
  {
    test: /central tender/i,
    cols: [
      { key: 'tender_title', label: 'TENDER', fallback: 'title', dot: true },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'deadline', label: 'DEADLINE' },
      { key: '_closes', label: 'CLOSES' },
      { key: 'value_inr', label: 'VALUE' },
    ],
  },
  {
    test: /agmut|bureaucratic transfers/i,
    cols: [
      { key: 'officer_name', label: 'OFFICER', fallback: 'title', dot: true },
      { key: 'cadre', label: 'CADRE' },
      { key: 'jurisdiction', label: 'STATE / UT' },
      { key: 'new_posting', label: 'NEW POSTING' },
      { key: 'order_date', label: 'ORDER', fallback: 'date' },
    ],
  },
  {
    test: /cabinet decisions/i,
    cols: [
      { key: 'topic', label: 'DECISION', fallback: 'title', dot: true },
      { key: 'priority', label: 'PRIORITY', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /centre-sanctioned projects/i,
    cols: [
      { key: 'project_name', label: 'PROJECT', fallback: 'title', dot: true },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'totalamt', label: 'AMOUNT', fallback: 'totalamt' },
      { key: 'boardapprovaldate', label: 'APPROVED', fallback: 'date' },
    ],
  },
  {
    test: /industry updates/i,
    cols: [
      { key: 'date', label: 'YEAR', fallback: 'year', num: true },
      { key: 'value', label: 'INDUSTRY % OF GDP', num: true },
      { key: 'country', label: 'ECONOMY', fallback: 'title' },
    ],
  },
  {
    test: /mp profiles/i,
    cols: [
      { key: 'mp_name', label: 'MEMBER', fallback: 'title', dot: true },
      { key: 'party', label: 'PARTY' },
      { key: 'constituency', label: 'SEAT' },
      { key: 'state', label: 'STATE' },
      { key: 'questions_asked', label: 'QUESTIONS', num: true },
    ],
  },
  {
    test: /growth indicator|key financial|economic overview/i,
    cols: [
      { key: 'country', label: 'ECONOMY', fallback: 'title', dot: true },
      { key: 'year', label: 'YEAR', fallback: 'date', num: true },
      { key: 'gdp_growth', label: 'GDP GROWTH %', num: true },
      { key: 'inflation', label: 'INFLATION %', num: true },
      { key: 'unemployment', label: 'UNEMPLOYMENT %', num: true },
      { key: 'indicator', label: 'INDICATOR' },
      { key: 'value', label: 'VALUE', num: true },
    ],
  },
  {
    test: /^world constitutions$/i,
    cols: [
      { key: 'country', label: 'COUNTRY', fallback: 'title', dot: true },
      { key: 'enacted', label: 'ENACTED', num: true },
    ],
  },
  {
    test: /^heads of state$/i,
    cols: [
      { key: 'country', label: 'COUNTRY', fallback: 'title', dot: true },
      { key: 'head_of_state', label: 'HEAD OF STATE' },
      { key: 'head_of_government', label: 'HEAD OF GOVERNMENT' },
      { key: 'role', label: 'ROLE' },
      { key: 'since', label: 'SINCE' },
    ],
  },
  {
    test: /^global commodities$/i,
    cols: [
      { key: 'commodity', label: 'BENCHMARK', fallback: 'title', dot: true },
      { key: 'group', label: 'GROUP' },
      { key: 'level', label: 'LEVEL', num: true },
      { key: 'change', label: 'CHANGE', num: true },
    ],
  },
  {
    test: /^geopolitics news wire$/i,
    cols: [
      { key: 'title', label: 'HEADLINE', fallback: 'name', dot: true },
      { key: 'date', label: 'SEEN' },
    ],
  },
  {
    test: /^global trade$/i,
    cols: [
      { key: 'country', label: 'ECONOMY', fallback: 'title', dot: true },
      { key: 'year', label: 'YEAR', num: true },
      { key: 'exports_bn', label: 'MERCH. EXPORTS (US$ BN)', num: true },
      { key: 'trade_gdp', label: 'TRADE (% OF GDP)', num: true },
    ],
  },
  {
    test: /^critical minerals$/i,
    cols: [
      { key: 'mineral', label: 'MINERAL', fallback: 'title', dot: true },
      { key: 'producers', label: 'LEADING PRODUCERS' },
      { key: 'note', label: 'STRATEGIC NOTE' },
    ],
  },
];

export function feedColumns(feature, rows) {
  const preset = PRESETS.find((p) => p.test.test(feature || ''));
  if (preset) {
    return preset.cols.filter((c) => rows.some((r) => r[c.key] || (c.fallback && r[c.fallback])));
  }
  const keys = displayColumns(rows).filter((k) => k !== 'source_url' && k !== 'reporting_search');
  return keys.map((k, i) => ({
    key: k,
    label: k.replace(/_/g, ' ').toUpperCase(),
    fallback: k === 'title' ? 'name' : '',
    dot: i === 0,
  }));
}

export function cellOf(row, col) {
  const v = row[col.key];
  if (v != null && String(v).trim() !== '') return String(v);
  if (col.fallback && row[col.fallback] != null) return String(row[col.fallback]);
  return '';
}
