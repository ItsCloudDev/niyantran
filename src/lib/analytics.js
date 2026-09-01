import { nationalOverview } from './nationalKpi.js';

const SKIP = new Set([
  'date',
  'title',
  'source_url',
  'reporting_search',
  'detail',
  'latest_development',
  'summary',
  'id',
  'url',
  'link',
]);

const INTENSITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const TREND_ORDER = ['Escalating', 'Stable', 'Easing'];

export function dataRows(rows) {
  return (rows || []).filter((r) => r && r.status !== 'source_status');
}

function val(row, key) {
  if (!key) return '';
  const v = row[key];
  if (v == null) return '';
  return String(v).trim();
}

function findKey(rows, names) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0] || {});
  for (const n of names) {
    const hit = keys.find((k) => k.toLowerCase() === n.toLowerCase());
    if (hit) return hit;
  }
  return '';
}

function intensityBucket(raw) {
  const s = String(raw || '').toLowerCase();
  if (/critic/.test(s)) return 'Critical';
  if (/\bhigh\b/.test(s)) return 'High';
  if (/medium|moderat/.test(s)) return 'Medium';
  if (/\blow\b|calm|minor/.test(s)) return 'Low';
  return '';
}

function trendBucket(raw) {
  const s = String(raw || '').toLowerCase();
  if (/escalat/.test(s)) return 'Escalating';
  if (/eas(e|ing)|de-?escalat|improving/.test(s)) return 'Easing';
  if (/stable|unchanged|static/.test(s)) return 'Stable';
  return raw ? String(raw) : '';
}

function cardinality(rows, key) {
  const s = new Set();
  for (const r of rows) {
    const v = val(r, key);
    if (v && v.length < 80) s.add(v);
  }
  return s.size;
}

function inferCats(rows) {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).filter((k) => !SKIP.has(k));
  const scored = keys
    .map((k) => {
      const c = cardinality(rows, k);
      const preferred = /region|intens|status|stage|trend|house|sector|ministr|country|type|party|exchange/i.test(k)
        ? 8
        : 0;
      return { key: k, c, score: preferred + (c >= 2 && c <= 18 ? 6 : c > 18 && c <= 40 ? 2 : -4) };
    })
    .filter((x) => x.c >= 2 && x.c <= 40)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.key);
}

function countBy(rows, key, mapFn, order) {
  const m = new Map();
  for (const r of rows) {
    const k = mapFn ? mapFn(val(r, key)) : val(r, key);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  if (order?.length) {
    const rest = [...m.keys()].filter((k) => !order.includes(k)).sort((a, b) => m.get(b) - m.get(a));
    return [...order.filter((k) => m.has(k)), ...rest].map((label) => ({ label, value: m.get(label) }));
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

function crosstab(rows, rowKey, colKey, colOrder, rowLimit = 10) {
  const colSet = new Set();
  const rowSet = [];
  const seenRow = new Set();
  const grid = new Map();
  for (const r of rows) {
    let ck = val(r, colKey);
    if (colOrder) ck = intensityBucket(ck) || ck;
    const rk = val(r, rowKey);
    if (!rk || !ck) continue;
    colSet.add(ck);
    if (!seenRow.has(rk)) {
      seenRow.add(rk);
      rowSet.push(rk);
    }
    const k = `${rk}\t${ck}`;
    grid.set(k, (grid.get(k) || 0) + 1);
  }
  const cols = colOrder?.length ? colOrder : [...colSet];
  let body = rowSet.map((rk) => {
    const cells = cols.map((ck) => grid.get(`${rk}\t${ck}`) || 0);
    return { label: rk, cells, total: cells.reduce((a, b) => a + b, 0) };
  });
  body.sort((a, b) => b.total - a.total);
  const hidden = Math.max(0, body.length - rowLimit);
  body = body.slice(0, rowLimit);
  const colTotals = cols.map((_, i) => body.reduce((s, r) => s + r.cells[i], 0));
  const grand = body.reduce((s, r) => s + r.total, 0);
  const colMax = cols.map((_, i) => Math.max(1, ...body.map((r) => r.cells[i]), colTotals[i]));
  return { cols, rows: body, colTotals, grand, colMax, hidden };
}

function onsetYear(raw) {
  const years = String(raw || '').match(/\b(?:19|20)\d{2}\b/g);
  if (!years) return null;
  return Number(years[0]);
}

function yearSeries(rows, key, fromYear = 2004) {
  const counts = new Map();
  let older = 0;
  for (const r of rows) {
    const y = onsetYear(val(r, key));
    if (!y) continue;
    if (y < fromYear) older += 1;
    else counts.set(y, (counts.get(y) || 0) + 1);
  }
  if (!counts.size) return null;
  const maxY = Math.max(...counts.keys());
  const series = [];
  for (let y = fromYear; y <= maxY; y++) series.push({ year: y, n: counts.get(y) || 0 });
  const peak = series.reduce((a, b) => (b.n > a.n ? b : a), series[0]);
  return { series, peak, from: fromYear, through: maxY, older };
}

function pct(part, whole) {
  if (!whole) return '—';
  return `${Math.round((100 * part) / whole)}%`;
}

function barTone(label, variant) {
  const s = String(label || '').toLowerCase();
  if (variant === 'trend') {
    if (/escalat/.test(s)) return 'escalate';
    if (/eas/.test(s)) return 'ease';
    return 'stable';
  }
  if (variant === 'intensity') {
    if (/critic/.test(s)) return 'escalate';
    if (/high/.test(s)) return 'highbar';
    if (/low/.test(s)) return 'ease';
    return 'stable';
  }
  if (variant === 'infra') {
    if (/operational|implemented/.test(s)) return 'ease';
    if (/construction|development|negotiation/.test(s)) return 'escalate';
    return 'highbar';
  }
  if (variant === 'posture') {
    if (/low-intensity|frozen|inactive/.test(s)) return 'gradient';
    return 'stable';
  }
  return 'gradient';
}

function withTones(items, variant) {
  return items.map((it) => ({ ...it, tone: barTone(it.label, variant) }));
}

function isNationalFeature(feature, feed) {
  if (feed?.tier === 'national') return true;
  return /bill passage|policy intelligence|policy pipeline|parliamentary question|regulatory body|candidate affidavit|delimitation|manifestos|mp profiles|statement|morning brief|central tender|agmut|bureaucratic transfers|cabinet decisions|centre-sanctioned|budget utilisation|industry updates/i.test(
    String(feature || ''),
  );
}

export function feedOverview(feed) {
  const rows = dataRows(feed?.rows);
  const n = rows.length;
  const feature = feed?.feature || 'Feed';
  if (isNationalFeature(feature, feed)) return nationalOverview(feed);
  const base = {
    title: overviewTitle(feature),
    kpis: [],
    charts: [],
    note: feed?.source?.note || '',
  };
  if (!n) {
    base.kpis = [
      { label: 'ROWS', value: 0, sub: 'no records in this view' },
      { label: 'LIVE', value: '—', sub: 'no table to summarise' },
      { label: 'COVERAGE', value: '—', sub: feed?.coverage?.from || 'see source status' },
      { label: 'ADAPTER', value: (feed?.source?.adapter || '—').toUpperCase(), sub: 'labelled status only' },
    ];
    return base;
  }

  if (/^infra$/i.test(feature)) {
    const operational = rows.filter((r) => /^(operational|implemented)/i.test(val(r, 'status'))).length;
    const regions = new Set(rows.map((r) => val(r, 'region') || val(r, 'country')).filter(Boolean)).size;
    const sectors = new Set(rows.map((r) => val(r, 'sector')).filter(Boolean)).size;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'PROJECTS', value: n, sub: 'strategic assets' },
      { label: 'OPERATIONAL', value: operational, sub: 'commissioned', tone: 'ok' },
      { label: 'REGIONS', value: regions, sub: 'covered' },
      { label: 'SECTORS', value: sectors, sub: 'ports, corridors…' },
    ];
    base.charts = [
      {
        type: 'bars',
        title: 'PROJECTS BY STATUS',
        hint: 'Counts from this register. Status is the latest public milestone, not a delivery score.',
        items: withTones(countBy(rows, 'status'), 'infra'),
      },
    ];
    return base;
  }

  if (/^satellite infrastructure$/i.test(feature)) {
    const providers = new Set(rows.map((r) => val(r, 'provider')).filter(Boolean)).size;
    const pads = new Set(rows.map((r) => val(r, 'pad') || val(r, 'country')).filter(Boolean)).size;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'LAUNCHES', value: n, sub: 'upcoming roster' },
      { label: 'PROVIDERS', value: providers, sub: 'in this window' },
      { label: 'PADS', value: pads, sub: 'launch geographies' },
      { label: 'SOURCE', value: 'LIVE', sub: 'The Space Devs' },
    ];
    base.charts = [
      {
        type: 'bars',
        title: 'BY STATUS',
        items: withTones(countBy(rows, 'status'), 'infra'),
      },
    ];
    return base;
  }

  if (/^world constitutions$/i.test(feature)) {
    const years = rows.map((r) => Number(val(r, 'enacted'))).filter((y) => Number.isFinite(y) && y > 0);
    const latest = years.length ? Math.max(...years) : '—';
    const oldest = years.length ? Math.min(...years) : '—';
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'IN FORCE', value: n, sub: 'constitutions' },
      { label: 'LATEST', value: latest, sub: 'year enacted' },
      { label: 'EARLIEST', value: oldest, sub: 'year enacted' },
      { label: 'SOURCE', value: 'LIVE', sub: 'Constitute Project' },
    ];
    base.charts = [
      {
        type: 'bars',
        title: 'ENACTED BY DECADE',
        hint: 'Counts from Constitute Project in-force records. Year is enactment, not last amendment.',
        items: withTones(
          countBy(rows, 'enacted', (y) => {
            const yr = Number(y);
            if (!Number.isFinite(yr) || yr < 1000) return 'Unknown';
            return `${Math.floor(yr / 10) * 10}s`;
          }),
          'infra',
        ),
      },
    ];
    return base;
  }

  if (/^growth indicators$/i.test(feature)) {
    const withGdp = rows.filter((r) => val(r, 'gdp_growth')).length;
    const year = [...new Set(rows.map((r) => val(r, 'year')).filter(Boolean))][0] || '—';
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'ECONOMIES', value: n, sub: 'World Bank set' },
      { label: 'WITH GDP', value: withGdp, sub: 'most recent year' },
      { label: 'YEAR', value: year, sub: 'indicator vintage' },
      { label: 'SOURCE', value: 'LIVE', sub: 'World Bank' },
    ];
    return base;
  }

  if (/^heads of state$/i.test(feature)) {
    const withHog = rows.filter((r) => val(r, 'head_of_government') && val(r, 'head_of_government') !== '—').length;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'STATES', value: n, sub: 'in this table' },
      { label: 'WITH HoG', value: withHog || n, sub: withHog ? 'head of government named' : 'profiles' },
      { label: 'SOURCE', value: feed?.fallback ? 'REGISTER' : 'LIVE', sub: feed?.fallback ? 'curated pack' : 'Wikidata' },
      { label: 'COVERAGE', value: feed?.fallback ? (feed?.meta?.asOf || '—') : 'UN', sub: feed?.fallback ? 'as of' : 'member states' },
    ];
    return base;
  }

  if (/^global commodities$/i.test(feature)) {
    const groups = new Set(rows.map((r) => val(r, 'group')).filter(Boolean)).size;
    const up = rows.filter((r) => /^\+/.test(val(r, 'change'))).length;
    const down = rows.filter((r) => /^-/.test(val(r, 'change'))).length;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'BENCHMARKS', value: n, sub: 'in this board' },
      { label: 'COMPLEXES', value: groups || 4, sub: 'energy, metals…' },
      { label: 'UP', value: up, sub: 'printed change', tone: 'ok' },
      { label: 'DOWN', value: down, sub: 'printed change' },
    ];
    base.charts = [
      {
        type: 'bars',
        title: 'BY GROUP',
        hint: 'Counts from the HTML commodity board. Levels are as-of the pack date, not a live ticker.',
        items: withTones(countBy(rows, 'group'), 'infra'),
      },
    ];
    return base;
  }

  if (/^global trade$/i.test(feature)) {
    const withShare = rows.filter((r) => val(r, 'trade_gdp') && val(r, 'trade_gdp') !== '—').length;
    const year = [...new Set(rows.map((r) => val(r, 'year')).filter(Boolean))][0] || '—';
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'ECONOMIES', value: n, sub: 'World Bank set' },
      { label: 'WITH TRADE/GDP', value: withShare, sub: 'published share' },
      { label: 'YEAR', value: year, sub: 'indicator vintage' },
      { label: 'SOURCE', value: 'LIVE', sub: 'World Bank' },
    ];
    return base;
  }

  if (/^critical minerals$/i.test(feature)) {
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'MINERALS', value: n, sub: 'in this register' },
      { label: 'BASIS', value: 'USGS', sub: 'commodity summaries' },
      { label: 'AS OF', value: feed?.meta?.asOf || '2025', sub: 'curated reference' },
      { label: 'FEED', value: 'REGISTER', sub: 'not a live ticker' },
    ];
    return base;
  }

  const intensityKey = findKey(rows, ['intensity']);
  const regionKey = findKey(rows, ['region', 'country', 'countryname']);
  const stageKey = findKey(rows, ['current_stage', 'stage']);
  const trendKey = findKey(rows, ['trend']);
  const typeKey = findKey(rows, ['conflict_type', 'type']);
  const houseKey = findKey(rows, ['house']);
  const sectorKey = findKey(rows, ['sector', 'ministry']);
  const startedKey = findKey(rows, ['started', 'date_introduced', 'date', 'year']);
  const cats = inferCats(rows);

  if (intensityKey && regionKey) {
    const active = rows.filter((r) => /active|fighting|hostil/i.test(val(r, stageKey))).length;
    const high = rows.filter((r) => /critic|high/i.test(val(r, intensityKey))).length;
    const esc = rows.filter((r) => /escalat/i.test(val(r, trendKey))).length;
    base.title = /front/i.test(feature) ? 'FRONTS OVERVIEW' : overviewTitle(feature);
    base.kpis = [
      { label: 'CONFLICTS TRACKED', value: n, sub: 'active / recent worldwide' },
      { label: 'ACTIVE HOSTILITIES', value: active, sub: 'currently fighting' },
      { label: 'HIGH INTENSITY', value: pct(high, n), sub: `${high} critical / high` },
      { label: 'ESCALATING', value: pct(esc, n), sub: `${esc} trending upward` },
    ];
    base.charts.push({
      type: 'matrix',
      title: 'CONCENTRATION — REGION × INTENSITY',
      hint: 'Cell counts from this table. Empty cells have no rows. Not a statistical measure.',
      matrix: crosstab(rows, regionKey, intensityKey, INTENSITY_ORDER, 10),
    });
    if (trendKey) {
      base.charts.push({
        type: 'bars',
        title: 'ESCALATION MOMENTUM',
        hint: 'Row counts by the trend field in this table.',
        items: withTones(countBy(rows, trendKey, trendBucket, TREND_ORDER), 'trend'),
      });
    }
    base.charts.push({
      type: 'bars',
      title: 'INTENSITY PROFILE',
      hint: 'Row counts by the intensity field in this table.',
      items: withTones(countBy(rows, intensityKey, intensityBucket, INTENSITY_ORDER), 'intensity'),
    });
    if (typeKey) {
      base.charts.push({
        type: 'bars',
        title: 'CONFLICT TYPOLOGY',
        hint: 'Row counts by conflict type. Top groups shown.',
        items: withTones(countBy(rows, typeKey).slice(0, 8), 'gradient'),
      });
    }
    if (stageKey) {
      base.charts.push({
        type: 'bars',
        title: 'CONFLICT POSTURE',
        hint: 'Row counts by current stage in this table.',
        items: withTones(countBy(rows, stageKey), 'posture'),
      });
    }
    const spark = yearSeries(rows, startedKey);
    if (spark) {
      base.charts.push({
        type: 'spark',
        title: 'CONFLICT ONSETS BY YEAR',
        hint: spark.older
          ? `Onsets ${spark.from}–${spark.through} from the started field. ${spark.older} earlier records are outside this window.`
          : `Onsets ${spark.from}–${spark.through} from the started field.`,
        ...spark,
      });
    }
    return base;
  }

  if (/bill passage/i.test(feature)) {
    const passed = rows.filter((r) => /pass|enact|assent/i.test(val(r, 'current_stage') || val(r, 'status'))).length;
    const ls = rows.filter((r) => /lok/i.test(val(r, houseKey))).length;
    const col = cats.find((k) => k !== houseKey) || 'current_stage';
    base.title = 'BILLS OVERVIEW';
    base.kpis = [
      { label: 'BILLS IN VIEW', value: n, sub: feed?.coverage?.exhaustive ? 'exhaustive archive + live' : 'rows loaded' },
      { label: 'LOK SABHA', value: ls, sub: `${n - ls} other house / unmarked` },
      { label: 'PASSED / ENACTED', value: passed, sub: 'stage label in the table' },
      { label: 'FROM', value: (feed?.coverage?.from || '—').slice(0, 4) || '—', sub: feed?.coverage?.through || '' },
    ];
    base.charts.push({
      type: 'matrix',
      title: `COUNTS — HOUSE × ${String(col).replace(/_/g, ' ').toUpperCase()}`,
      hint: 'Counts from this table, not a statistical measure.',
      matrix: crosstab(rows, houseKey, col, null, 8),
    });
    base.charts.push({
      type: 'bars',
      title: 'BY HOUSE',
      items: withTones(countBy(rows, houseKey), 'gradient'),
      hint: 'Row counts by house.',
    });
    if (findKey(rows, ['current_stage'])) {
      base.charts.push({
        type: 'bars',
        title: 'BY STAGE',
        items: withTones(countBy(rows, 'current_stage').slice(0, 8), 'posture'),
        hint: 'Row counts by current stage.',
      });
    }
    const spark = yearSeries(rows, startedKey, 1952);
    if (spark) {
      base.charts.push({
        type: 'spark',
        title: 'INTRODUCED BY YEAR',
        hint: spark.hint || `Year parsed from the date field (${spark.from}–${spark.through}).`,
        ...spark,
      });
    }
    return base;
  }

  if (/parliamentary question/i.test(feature)) {
    const starred = rows.filter((r) => /star/i.test(val(r, 'question_type'))).length;
    const mins = new Set(rows.map((r) => val(r, 'ministry')).filter(Boolean)).size;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'QUESTIONS', value: n, sub: 'in this view' },
      { label: 'STARRED', value: starred, sub: `${n - starred} unstarred / other` },
      { label: 'MINISTRIES', value: mins, sub: 'named in this table' },
      { label: 'SOURCE', value: feed?.fallback ? 'ARCHIVE' : 'LIVE', sub: 'Sansad / register' },
    ];
    base.charts = [{ type: 'bars', title: 'BY MINISTRY', items: withTones(countBy(rows, 'ministry').slice(0, 8), 'gradient'), hint: 'Row counts by ministry.' }];
    return base;
  }

  if (/regulatory body watch/i.test(feature)) {
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'ITEMS', value: n, sub: 'circulars / notices' },
      { label: 'REGULATORS', value: new Set(rows.map((r) => val(r, 'regulator')).filter(Boolean)).size, sub: 'in this view' },
      { label: 'SOURCE', value: feed?.fallback ? 'ARCHIVE' : 'LIVE', sub: 'RSS or register' },
      { label: 'FEED', value: 'WATCH', sub: 'not an enforcement score' },
    ];
    base.charts = [{ type: 'bars', title: 'BY REGULATOR', items: withTones(countBy(rows, 'regulator'), 'infra'), hint: 'Row counts by issuing regulator.' }];
    return base;
  }

  if (/candidate affidavit/i.test(feature)) {
    const withCases = rows.filter((r) => Number(val(r, 'criminal_cases')) > 0).length;
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'CANDIDATES', value: n, sub: 'in this register' },
      { label: 'WITH CASES', value: withCases, sub: 'criminal_cases > 0' },
      { label: 'PARTIES', value: new Set(rows.map((r) => val(r, 'party')).filter(Boolean)).size, sub: 'named' },
      { label: 'SOURCE', value: 'REGISTER', sub: 'MyNeta / ADR basis' },
    ];
    return base;
  }

  if (/mp profiles/i.test(feature)) {
    base.title = 'KEY INDICATORS';
    base.kpis = [
      { label: 'MEMBERS', value: n, sub: 'in this roster' },
      { label: 'PARTIES', value: new Set(rows.map((r) => val(r, 'party')).filter(Boolean)).size, sub: 'named' },
      { label: 'STATES', value: new Set(rows.map((r) => val(r, 'state')).filter(Boolean)).size, sub: 'named' },
      { label: 'SOURCE', value: feed?.fallback ? 'ARCHIVE' : 'LIVE', sub: 'Sansad / register' },
    ];
    return base;
  }

  const a = cats[0] || sectorKey;
  const b = cats[1];
  const distinct = a ? new Set(rows.map((r) => val(r, a)).filter(Boolean)).size : 0;
  const grouped = a ? countBy(rows, a) : [];
  const top = grouped[0];
  base.kpis = [
    { label: 'ROWS', value: n, sub: feed?.fallback ? 'last-known-good archive' : 'live feed' },
    { label: a ? String(a).replace(/_/g, ' ').toUpperCase() : 'FIELDS', value: distinct || Object.keys(rows[0] || {}).length, sub: a ? 'distinct values' : 'columns present' },
    { label: 'LARGEST GROUP', value: top ? pct(top.value, n) : '—', sub: top ? String(top.label).slice(0, 42) : 'no category field' },
    { label: 'SOURCE', value: feed?.fallback ? 'ARCHIVE' : feed?.source?.gdelt ? 'GDELT' : 'LIVE', sub: feed?.source?.adapter || '' },
  ];
  if (a && b && a !== b) {
    base.charts.push({
      type: 'matrix',
      title: `COUNTS — ${labelize(a)} × ${labelize(b)}`,
      hint: 'Counts from this table, not a statistical measure.',
      matrix: crosstab(rows, a, b, null, 10),
    });
  }
  for (const key of cats.slice(0, 3)) {
    base.charts.push({
      type: 'bars',
      title: labelize(key),
      hint: `Row counts by ${key.replace(/_/g, ' ')}.`,
      items: withTones(countBy(rows, key).slice(0, 8), 'gradient'),
    });
  }
  const spark = yearSeries(rows, startedKey, 2000);
  if (spark) {
    base.charts.push({
      type: 'spark',
      title: 'BY YEAR',
      hint: `Years parsed from dated fields (${spark.from}–${spark.through}).`,
      ...spark,
    });
  }
  return base;
}

function labelize(k) {
  return String(k || '').replace(/_/g, ' ').toUpperCase();
}

function overviewTitle(feature) {
  const f = String(feature || 'FEED').toUpperCase();
  if (/OPEN FRONTS|FRONT/.test(f)) return 'FRONTS OVERVIEW';
  if (/^ALLIANCES$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/^SANCTIONS$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/^GLOBAL AID$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/^INFRA$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^NUCLEAR WATCH$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/^SATELLITE INFRASTRUCTURE$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^WORLD CONSTITUTIONS$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^GROWTH INDICATORS$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^HEADS OF STATE$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^GLOBAL COMMODITIES$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^GLOBAL TRADE$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^CRITICAL MINERALS$/.test(f.trim())) return 'KEY INDICATORS';
  if (/^ENERGY$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/^MARITIME CHOKE-?POINTS$/.test(f.trim())) return 'EVENT ANALYTICS';
  if (/BILL PASSAGE|POLICY INTELLIGENCE GRAPH|PARLIAMENTARY QUESTION|REGULATORY BODY WATCH|CANDIDATE AFFIDAVIT|MP PROFILES|POLICY PIPELINE|CABINET|CENTRAL TENDER|AGMUT|BUDGET|INDUSTRY UPDATES|MANIFESTOS|DELIMITATION|MORNING BRIEF|STATEMENT/.test(f)) {
    return 'KEY INDICATORS';
  }
  if (/BILL/.test(f)) return 'BILLS OVERVIEW';
  const short = f.replace(/[^A-Z0-9 ]/g, '').split(' ').slice(0, 3).join(' ');
  return `${short || 'FEED'} OVERVIEW`;
}

const TONE_RGB = {
  crit: [192, 80, 80],
  high: [196, 110, 48],
  med: [196, 150, 40],
  low: [56, 130, 88],
};

export function matrixCellStyle(colLabel, value, colMax, sequential) {
  if (sequential) {
    if (!value) return { background: '#d7dde6', color: 'transparent' };
    const t = Math.min(1, value / Math.max(colMax || 1, 1));
    const mix = 0.42 + t * 0.58;
    const r = Math.round(255 + (40 - 255) * mix);
    const g = Math.round(255 + (70 - 255) * mix);
    const b = Math.round(255 + (110 - 255) * mix);
    return { background: `rgb(${r},${g},${b})`, color: mix > 0.58 ? '#fff' : '#243044' };
  }
  const s = String(colLabel || '').toLowerCase();
  let tone = 'med';
  if (/critic/.test(s)) tone = 'crit';
  else if (/^high/.test(s)) tone = 'high';
  else if (/low/.test(s)) tone = 'low';
  else if (/medium|moderat/.test(s)) tone = 'med';
  if (!value) {
    return { background: '#f3f4f6', color: 'transparent' };
  }
  const t = Math.min(1, value / Math.max(colMax || 1, 1));
  const [r, g, b] = TONE_RGB[tone];
  const mix = 0.28 + t * 0.72;
  const rr = Math.round(255 + (r - 255) * mix);
  const gg = Math.round(255 + (g - 255) * mix);
  const bb = Math.round(255 + (b - 255) * mix);
  const dark = mix > 0.55;
  return { background: `rgb(${rr},${gg},${bb})`, color: dark ? '#fff' : '#3f3f46' };
}
