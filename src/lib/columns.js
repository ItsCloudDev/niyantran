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
    test: /^economic overview of all countries$/i,
    cols: [
      { key: 'country', label: 'ECONOMY', fallback: 'title', dot: true, keep: true },
      { key: 'year', label: 'YEAR', num: true },
      { key: 'gdp_usd_bn', label: 'GDP (US$ BN)', num: true, keep: true },
    ],
  },
  {
    test: /^key financial indicators/i,
    cols: [
      { key: 'country', label: 'ECONOMY', fallback: 'title', dot: true, keep: true },
      { key: 'year', label: 'YEAR', num: true },
      { key: 'gdp_growth', label: 'GDP GROWTH %', num: true },
      { key: 'inflation', label: 'CPI %', num: true },
      { key: 'emp_to_pop', label: 'EMP-TO-POP %', num: true },
    ],
  },
  {
    test: /growth indicator/i,
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
  {
    test: /^constituency register$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'district', label: 'DISTRICT' },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'booths', label: 'BOOTHS', num: true },
      { key: 'bloc', label: 'LEADING BLOC' },
      { key: 'leadPct', label: 'LEAD %', num: true },
      { key: 'status', label: 'STATUS 2022', pill: true },
    ],
  },
  {
    test: /^roll demography$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'male', label: 'MALE', num: true },
      { key: 'female', label: 'FEMALE', num: true },
      { key: 'sexRatio', label: 'SEX RATIO', num: true },
      { key: 'medianAge', label: 'MEDIAN AGE', num: true },
      { key: 'young', label: '18-25 %', num: true },
      { key: 'senior', label: '60+ %', num: true },
    ],
  },
  {
    test: /^community bloc matrix$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'catholic', label: 'CATHOLIC %', num: true },
      { key: 'muslim', label: 'MUSLIM %', num: true },
      { key: 'st', label: 'HINDU ST %', num: true },
      { key: 'obc', label: 'HINDU OBC %', num: true },
      { key: 'general', label: 'HINDU GEN %', num: true },
      { key: 'sc', label: 'HINDU SC %', num: true },
    ],
  },
  {
    test: /^election results 2017/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'w2017', label: '2017' },
      { key: 'w2019', label: '2019' },
      { key: 'w2022', label: '2022' },
      { key: 'pct2022', label: '2022 %', num: true },
      { key: 'margin2022', label: '2022 MARGIN', num: true },
      { key: 'w2024', label: '2024' },
      { key: 'distinct', label: 'DISTINCT WINNERS', num: true },
    ],
  },
  {
    test: /^split-ticket/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'ac22', label: 'AC 2022 %', num: true },
      { key: 'ls24', label: 'LS 2024 %', num: true },
      { key: 'gap', label: 'SPLIT GAP', num: true },
      { key: 'inPlay', label: 'IN-PLAY ELECTORS', num: true },
      { key: 'inPlayPct', label: 'IN-PLAY %', num: true },
      { key: 'status', label: 'STATUS 2022', pill: true },
    ],
  },
  {
    test: /^sir roll churn$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'draft', label: 'DRAFT', num: true },
      { key: 'final', label: 'FINAL', num: true },
      { key: 'added', label: 'ADDED', num: true },
      { key: 'removed', label: 'REMOVED', num: true },
      { key: 'net', label: 'NET', num: true },
      { key: 'netPct', label: 'NET %', num: true },
    ],
  },
  {
    test: /^registration gap$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'aged', label: 'AGED 18-19', num: true },
      { key: 'missing', label: 'MISSING 18-19', num: true },
      { key: 'pct', label: '% OF SEAT', num: true },
    ],
  },
  {
    test: /^booth register$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'households', label: 'HOUSEHOLDS', num: true },
      { key: 'ops', label: 'OPS CLASS', pill: true },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'bloc', label: 'LEADING BLOC' },
    ],
  },
  {
    test: /^booth demography$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'sexRatio', label: 'SEX RATIO', num: true },
      { key: 'meanAge', label: 'MEAN AGE', num: true },
      { key: 'senior', label: '60+ %', num: true },
      { key: 'young', label: '18-25 %', num: true },
      { key: 'male', label: 'MALE', num: true },
      { key: 'female', label: 'FEMALE', num: true },
      { key: 'electors', label: 'ELECTORS', num: true },
    ],
  },
  {
    test: /^booth bloc composition$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'catholic', label: 'CATHOLIC', num: true },
      { key: 'muslim', label: 'MUSLIM', num: true },
      { key: 'st', label: 'HINDU ST', num: true },
      { key: 'obc', label: 'HINDU OBC', num: true },
      { key: 'general', label: 'HINDU GEN', num: true },
      { key: 'sc', label: 'HINDU SC', num: true },
      { key: 'bloc', label: 'LEADING BLOC', pill: true },
    ],
  },
  {
    test: /^booth-level roll churn$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'added', label: 'SIR ADDED', num: true },
      { key: 'removed', label: 'SIR REMOVED', num: true },
      { key: 'net', label: 'NET', num: true },
      { key: 'netPct', label: 'NET %', num: true },
      { key: 'electors', label: 'ELECTORS', num: true },
    ],
  },
  {
    test: /^booth political history$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'l17', label: '2017' },
      { key: 'l19', label: '2019' },
      { key: 'l22', label: '2022' },
      { key: 'l24', label: '2024' },
      { key: 'flips', label: 'FLIPS', num: true },
      { key: 'margin24', label: '2024 MARGIN', num: true },
      { key: 'turnout', label: 'TURNOUT 2024 %', num: true },
    ],
  },
  {
    test: /^booth-level results/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'status', label: '2022 BAND', pill: true },
      { key: 'l22', label: '2022' },
      { key: 'l24', label: '2024' },
      { key: 'margin24', label: '2024 MARGIN', num: true },
      { key: 'bloc', label: 'LEADING BLOC' },
    ],
  },
  {
    test: /^swing booths$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'bloc', label: 'LEADING BLOC' },
      { key: 'leadPct', label: 'LEAD %', num: true },
      { key: 'enc', label: 'ENC', num: true },
    ],
  },
  {
    test: /^anchor booths$/i,
    cols: [
      { key: 'boothNo', label: 'BOOTH', fallback: 'title', dot: true, keep: true },
      { key: 'station', label: 'STATION', keep: true },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'bloc', label: 'LEADING BLOC' },
      { key: 'leadPct', label: 'LEAD %', num: true },
    ],
  },
  {
    test: /^local governance brief$/i,
    cols: [
      { key: 'name', label: 'CONSTITUENCY', fallback: 'title', dot: true },
      { key: 'ac', label: 'AC' },
      { key: 'electors', label: 'ELECTORS', num: true },
      { key: 'booths', label: 'BOOTHS', num: true },
      { key: 'w2022', label: '2022' },
      { key: 'margin2022', label: 'WON BY %', num: true },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'w2017', label: '2017' },
      { key: 'w2024', label: '2024' },
    ],
  },
  {
    test: /^supreme court order/i,
    cols: [
      { key: 'case_title', label: 'CASE', fallback: 'title', dot: true, keep: true },
      { key: 'diary_no', label: 'DIARY' },
      { key: 'date', label: 'ORDER DATE' },
      { key: 'topic', label: 'TOPIC', pill: true },
      { key: 'court', label: 'COURT' },
    ],
  },
  {
    test: /^order archive by topic/i,
    cols: [
      { key: 'topic', label: 'TOPIC', pill: true, keep: true },
      { key: 'case_title', label: 'CASE', fallback: 'title', dot: true, keep: true },
      { key: 'diary_no', label: 'DIARY' },
      { key: 'date', label: 'ORDER DATE' },
      { key: 'court', label: 'COURT' },
    ],
  },
  {
    test: /^nclt/i,
    cols: [
      { key: 'entity', label: 'ENTITY', fallback: 'title', dot: true, keep: true },
      { key: 'subject', label: 'MATTER' },
      { key: 'remarks', label: 'ORDER', pill: true },
      { key: 'court', label: 'SOURCE' },
      { key: 'date', label: 'DATE' },
      { key: 'insolvency_professional', label: 'IP' },
    ],
  },
  {
    test: /supreme courts & precedent — united states/i,
    cols: [
      { key: 'title', label: 'CASE', fallback: 'caseName', dot: true, keep: true },
      { key: 'date', label: 'FILED' },
      { key: 'cite', label: 'CITE' },
      { key: 'status', label: 'STATUS', pill: true },
      { key: 'docket', label: 'DOCKET' },
      { key: 'court', label: 'COURT' },
    ],
  },
  {
    test: /^nse\/bse delayed market feed$/i,
    cols: [
      { key: 'name', label: 'INDEX / STOCK', fallback: 'title', dot: true, keep: true },
      { key: 'exchange', label: 'VENUE', pill: true },
      { key: 'last', label: 'LAST', num: true },
      { key: 'change', label: 'CHANGE', num: true },
      { key: 'pct_change', label: 'CHG %', num: true },
      { key: 'open', label: 'OPEN', num: true },
      { key: 'high', label: 'HIGH', num: true },
      { key: 'low', label: 'LOW', num: true },
    ],
  },
  {
    test: /^live global stock exchanges$/i,
    cols: [
      { key: 'name', label: 'INDEX', fallback: 'title', dot: true, keep: true },
      { key: 'venue', label: 'VENUE', fallback: 'exchange', pill: true },
      { key: 'last', label: 'LAST', num: true },
      { key: 'change', label: 'CHANGE', num: true },
      { key: 'pct_change', label: 'CHG %', num: true },
      { key: 'date', label: 'AS OF' },
    ],
  },
  {
    test: /^trade agreements/i,
    cols: [
      { key: 'subject', label: 'NOTIFICATION', fallback: 'title', dot: true, keep: true },
      { key: 'notification_no', label: 'NO.' },
      { key: 'date', label: 'DATE' },
      { key: 'year', label: 'YEAR' },
    ],
  },
  {
    test: /^sector policy/i,
    cols: [
      { key: 'year', label: 'YEAR', num: true, keep: true },
      { key: 'country', label: 'COUNTRY' },
      { key: 'indicator', label: 'SERIES', fallback: 'title', keep: true },
      { key: 'value', label: 'VALUE', num: true },
    ],
  },
  {
    test: /^top financial & business players$/i,
    cols: [
      { key: 'person', label: 'CHIEF EXECUTIVE', fallback: 'title', dot: true, keep: true },
      { key: 'company', label: 'ENTERPRISE', keep: true },
    ],
  },
  {
    test: /^prediction market political odds$/i,
    cols: [
      { key: 'question', label: 'MARKET', fallback: 'title', dot: true, keep: true },
      { key: 'probability', label: 'YES %', num: true },
      { key: 'volume_24h', label: 'VOL 24H', num: true },
      { key: 'total_volume', label: 'VOLUME', num: true },
      { key: 'date', label: 'CLOSES' },
    ],
  },
  {
    test: /^carbon border/i,
    cols: [
      { key: 'milestone', label: 'MILESTONE', fallback: 'title', dot: true, keep: true },
      { key: 'jurisdiction', label: 'JURISDICTION', pill: true },
      { key: 'date', label: 'DATE' },
      { key: 'detail', label: 'SCOPE / NOTE', keep: true },
    ],
  },
  {
    test: /^global carbon pricing tracker$/i,
    cols: [
      { key: 'jurisdiction', label: 'JURISDICTION', fallback: 'title', dot: true, keep: true },
      { key: 'ets_status', label: 'ETS', pill: true },
      { key: 'carbon_tax', label: 'TAX' },
      { key: 'coverage_pct', label: 'COVERAGE %', num: true },
      { key: 'weighted_price_usd', label: 'USD / tCO2e', num: true },
      { key: 'year', label: 'YEAR', num: true },
    ],
  },
  {
    test: /^carbon price monitor$/i,
    cols: [
      { key: 'jurisdiction', label: 'JURISDICTION', fallback: 'title', dot: true, keep: true },
      { key: 'year', label: 'YEAR', num: true },
      { key: 'weighted_price_usd', label: 'WEIGHTED USD/t', num: true },
      { key: 'ets_price_usd', label: 'ETS USD/t', num: true },
    ],
  },
  {
    test: /^ets & tax adoption timeline$/i,
    cols: [
      { key: 'jurisdiction', label: 'JURISDICTION', fallback: 'title', dot: true, keep: true },
      { key: 'first_instrument_year', label: 'FIRST YEAR', num: true },
      { key: 'carbon_tax_since', label: 'TAX SINCE', num: true },
      { key: 'ets_since', label: 'ETS SINCE', num: true },
      { key: 'instruments', label: 'INSTRUMENTS', pill: true },
    ],
  },
  {
    test: /^india ccts/i,
    cols: [
      { key: 'milestone', label: 'MILESTONE', fallback: 'title', dot: true, keep: true },
      { key: 'date', label: 'DATE' },
      { key: 'detail', label: 'LEGAL BASIS / NOTE', keep: true },
    ],
  },
  {
    test: /^carbon registry wire$/i,
    cols: [
      { key: 'title', label: 'PUBLICATION', fallback: 'title', dot: true, keep: true },
      { key: 'registry', label: 'REGISTRY', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /^climate newswire$/i,
    cols: [
      { key: 'title', label: 'HEADLINE', fallback: 'title', dot: true, keep: true },
      { key: 'outlet', label: 'OUTLET', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /^cricket wire$|^football wire$|^indian sports wire$/i,
    cols: [
      { key: 'title', label: 'HEADLINE', fallback: 'title', dot: true, keep: true },
      { key: 'outlet', label: 'OUTLET', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /^fixtures & results|^isl tracker$/i,
    cols: [
      { key: 'title', label: 'FIXTURE', fallback: 'title', dot: true, keep: true },
      { key: 'league', label: 'LEAGUE', pill: true },
      { key: 'date', label: 'DATE' },
      { key: 'home', label: 'HOME' },
      { key: 'away', label: 'AWAY' },
      { key: 'home_score', label: 'HS', num: true },
      { key: 'away_score', label: 'AS', num: true },
      { key: 'status', label: 'STATUS', pill: true },
    ],
  },
  {
    test: /^sports business/i,
    cols: [
      { key: 'league', label: 'LEAGUE', fallback: 'title', dot: true, keep: true },
      { key: 'owner', label: 'OWNER' },
    ],
  },
  {
    test: /^athlete index$/i,
    cols: [
      { key: 'person', label: 'ATHLETE', fallback: 'title', dot: true, keep: true },
      { key: 'sport', label: 'SPORT', pill: true },
    ],
  },
  {
    test: /^tv & streaming tonight$/i,
    cols: [
      { key: 'show', label: 'SHOW', fallback: 'title', dot: true, keep: true },
      { key: 'network', label: 'NETWORK', pill: true },
      { key: 'country', label: 'COUNTRY', pill: true },
      { key: 'time', label: 'AIRTIME' },
      { key: 'episode', label: 'EPISODE', keep: true },
    ],
  },
  {
    test: /^box office tracker$/i,
    cols: [
      { key: 'film', label: 'FILM', fallback: 'title', dot: true, keep: true },
      { key: 'release_date', label: 'RELEASE' },
      { key: 'box_office', label: 'BOX OFFICE (WD)', num: true },
    ],
  },
  {
    test: /^entertainment news wire$|^bollywood & film wire$/i,
    cols: [
      { key: 'title', label: 'HEADLINE', fallback: 'title', dot: true, keep: true },
      { key: 'outlet', label: 'OUTLET', pill: true },
      { key: 'date', label: 'DATE' },
    ],
  },
  {
    test: /^music charts/i,
    cols: [
      { key: 'rank', label: 'RANK', num: true },
      { key: 'track', label: 'TRACK', fallback: 'title', dot: true, keep: true },
      { key: 'artist', label: 'ARTIST' },
      { key: 'album', label: 'ALBUM' },
    ],
  },
  {
    test: /^ott & studio intelligence$/i,
    cols: [
      { key: 'service', label: 'NAME', fallback: 'title', dot: true, keep: true },
      { key: 'kind', label: 'KIND', pill: true },
      { key: 'owner', label: 'OWNER' },
    ],
  },
  {
    test: /^celebrity influence index$/i,
    cols: [
      { key: 'person', label: 'PERSON', fallback: 'title', dot: true, keep: true },
      { key: 'followers', label: 'FOLLOWERS (WD)', num: true },
    ],
  },
];

export function feedColumns(feature, rows) {
  const preset = PRESETS.find((p) => p.test.test(feature || ''));
  if (preset) {
    return preset.cols.filter((c) => {
      if (c.keep) return true;
      return rows.some((r) => {
        const v = r[c.key];
        if (v != null && String(v).trim() !== '') return true;
        if (!c.fallback) return false;
        const f = r[c.fallback];
        return f != null && String(f).trim() !== '';
      });
    });
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
