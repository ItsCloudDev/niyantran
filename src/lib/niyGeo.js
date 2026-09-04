/**
 * Ingested geography pack (Goa). GitHub contents URLs in the workbook are
 * extract sources — they return directory listings, not desk tables.
 */

const FEATURE_DATASET = {
  'Constituency Register': 'geo_state_seats',
  'Roll Demography': 'geo_state_demog',
  'Community Bloc Matrix': 'geo_state_blocs',
  'Election Results 2017–2024': 'geo_state_results',
  'Election Results 2017-2024': 'geo_state_results',
  'Split-Ticket & Competitiveness': 'geo_state_split',
  'SIR Roll Churn': 'geo_state_churn',
  'Registration Gap': 'geo_state_gap',
  'Booth Register': 'geo_local_booths',
  'Booth Demography': 'geo_local_demog',
  'Booth Bloc Composition': 'geo_local_blocs',
  'Booth Political History': 'geo_local_history',
  'Swing Booths': 'geo_local_swing',
  'Anchor Booths': 'geo_local_anchor',
  'Booth-level Roll Churn': 'geo_local_churn',
  'Booth-level Results Database': 'geo_local_results',
  'Local Governance Brief': 'geo_local_brief',
};

const DATASET_KEYS = new Set([
  'geo_state_seats',
  'geo_state_demog',
  'geo_state_blocs',
  'geo_state_results',
  'geo_state_split',
  'geo_state_churn',
  'geo_state_gap',
  'geo_local_booths',
  'geo_local_demog',
  'geo_local_blocs',
  'geo_local_history',
  'geo_local_swing',
  'geo_local_anchor',
  'geo_local_churn',
  'geo_local_results',
  'geo_local_brief',
]);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function geoDatasetFor(feature, dataset) {
  const ds = String(dataset || '').trim();
  if (DATASET_KEYS.has(ds)) return ds;
  const n = String(feature || '').trim();
  if (FEATURE_DATASET[n]) return FEATURE_DATASET[n];
  const hit = Object.keys(FEATURE_DATASET).find((k) => norm(k) === norm(n));
  return hit ? FEATURE_DATASET[hit] : '';
}

export function isGeoDesk(feature, dataset) {
  return Boolean(geoDatasetFor(feature, dataset));
}

function idx(cols, name) {
  return (cols || []).indexOf(name);
}

function num(v) {
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(n) {
  const x = num(n);
  return x == null ? '—' : x.toLocaleString('en-IN');
}

function col(cols, row, name) {
  const i = idx(cols, name);
  return i < 0 ? '' : row[i];
}

function byCols(rows, cols, extra) {
  return (rows || []).map((r) => {
    const o = {};
    extra.forEach(([k, name]) => {
      o[k] = col(cols, r, name);
    });
    return o;
  });
}

function sizeBandOf(electors) {
  const e = Number(electors) || 0;
  if (e < 300) return 'under 300';
  if (e < 600) return '300–600';
  if (e < 900) return '600–900';
  if (e < 1200) return '900–1200';
  return '1200+';
}

function take(row, keys) {
  const o = {};
  for (const k of keys) {
    if (row[k] == null || row[k] === '') continue;
    o[k] = row[k];
  }
  return o;
}

function livePack(pack) {
  const packs = pack?.packs || {};
  return packs.GA || Object.values(packs).find((p) => p?.booths?.length) || null;
}

export function seatObjs(P) {
  if (!P) return [];
  const C = P.seatCols;
  return (P.seats || []).map((r) => ({
    ac: col(C, r, 'AC'),
    name: col(C, r, 'Constituency'),
    district: col(C, r, 'District'),
    taluka: col(C, r, 'Taluka'),
    electors: col(C, r, 'Electors'),
    booths: col(C, r, 'Booths'),
    bloc: col(C, r, 'Leading bloc'),
    leadPct: col(C, r, 'Leading %'),
    status: col(C, r, 'Status 2022'),
    male: col(C, r, 'Male'),
    female: col(C, r, 'Female'),
    sexRatio: col(C, r, 'Sex ratio'),
    medianAge: col(C, r, 'Median age'),
    young: col(C, r, '18-25 %'),
    senior: col(C, r, '60+ %'),
    households: col(C, r, 'Households'),
    ac22: col(C, r, 'BJP AC 2022'),
    ls24: col(C, r, 'BJP LS 2024'),
    gap: col(C, r, 'Split-ticket gap'),
    inPlay: col(C, r, 'In-play electors'),
    inPlayPct: col(C, r, 'In-play %'),
    flips: col(C, r, 'Mean booth flips'),
    distinct: col(C, r, 'Distinct winners'),
  }));
}

export function boothObjs(P) {
  if (!P) return [];
  const C = P.boothCols;
  return (P.booths || []).map((r) => {
    const add = num(col(C, r, 'SIR added')) || 0;
    const rem = num(col(C, r, 'SIR removed')) || 0;
    const el = num(col(C, r, 'Electors')) || 0;
    return {
      ac: col(C, r, 'AC'),
      booth: col(C, r, 'Booth'),
      station: col(C, r, 'Polling station'),
      electors: el,
      male: col(C, r, 'Male'),
      female: col(C, r, 'Female'),
      sexRatio: col(C, r, 'Sex ratio'),
      meanAge: col(C, r, 'Mean age'),
      young: col(C, r, '18-25 %'),
      senior: col(C, r, '60+ %'),
      households: col(C, r, 'Households'),
      bloc: col(C, r, 'Leading bloc'),
      leadPct: col(C, r, 'Leading %'),
      enc: col(C, r, 'ENC'),
      ops: col(C, r, 'Ops class'),
      l17: col(C, r, 'Lead 2017'),
      l19: col(C, r, 'Lead 2019'),
      l22: col(C, r, 'Lead 2022'),
      l24: col(C, r, 'Lead 2024'),
      flips: col(C, r, 'Flips'),
      status: col(C, r, 'Status'),
      margin24: col(C, r, '2024 margin'),
      turnout: col(C, r, 'Turnout 2024 %'),
      added: add,
      removed: rem,
      net: add - rem,
      netPct: el ? Math.round(((add - rem) / el) * 1000) / 10 : 0,
      catholic: col(C, r, 'Catholic'),
      muslim: col(C, r, 'Muslim'),
      st: col(C, r, 'Hindu ST'),
      obc: col(C, r, 'Hindu OBC'),
      general: col(C, r, 'Hindu General'),
      sc: col(C, r, 'Hindu SC'),
    };
  });
}

function seatBrief(s) {
  const el = num(s.electors);
  const gap = num(s.gap);
  const inp = num(s.inPlayPct);
  const lead = num(s.leadPct);
  const brief = `${s.name} has ${fmt(el)} electors across ${fmt(s.booths)} booths in ${s.district} (${s.taluka} taluka). The leading community bloc is ${s.bloc} at ${lead}% of the roll, and the seat entered 2022 rated "${s.status}".`;
  const why = `BJP polled ${s.ac22}% here at the 2022 Assembly against ${s.ls24}% at the 2024 Lok Sabha — a split-ticket gap of ${gap} points. ${fmt(s.inPlay)} electors (${inp}% of the seat) sit in booths classified as in play.`;
  const watch =
    `The seat has had ${s.distinct} distinct winners across the last four polls; booths here flip ${s.flips} times on average. ` +
    (inp >= 60
      ? 'Persuasion, not turnout, is the lever in this seat.'
      : inp >= 35
        ? 'A mixed seat: both persuasion and turnout operations matter.'
        : 'A turnout seat: the blocs are settled and mobilisation decides it.');
  return { brief, why_it_matters: why, watch_for: watch, tags: [s.name, s.district, s.bloc, s.status].filter(Boolean) };
}

function boothBrief(b) {
  const bits = [
    `Booth ${b.booth} of AC ${b.ac}${b.station ? ` — ${b.station}` : ''}`,
    b.electors != null && b.electors !== '' ? `holds ${fmt(b.electors)} electors` : '',
    b.households ? `in ${fmt(b.households)} households` : '',
    b.bloc ? `Leading bloc: ${b.bloc}${b.leadPct != null && b.leadPct !== '' ? ` at ${b.leadPct}%` : ''}` : '',
    b.ops ? `Ops class ${b.ops}` : '',
    b.status ? `status "${b.status}"` : '',
  ].filter(Boolean);
  const brief = `${bits.join('. ')}.`;
  const led = [b.l17, b.l19, b.l22, b.l24].filter(Boolean);
  const why = led.length
    ? `The booth led ${led.join(' → ')} across 2017–2024${b.flips != null && b.flips !== '' ? ` and flipped ${b.flips} time${num(b.flips) === 1 ? '' : 's'}` : ''}.${b.margin24 != null && b.margin24 !== '' ? ` 2024: margin ${b.margin24} points` : ''}${b.turnout != null && b.turnout !== '' ? ` on ${b.turnout}% turnout` : ''}.`
    : b.enc != null && b.enc !== ''
      ? `Effective number of communities (ENC) ${b.enc}.`
      : '';
  const net = num(b.net);
  const watch =
    net == null
      ? b.meanAge
        ? `Mean age ${b.meanAge}; ${b.young}% aged 18–25, ${b.senior}% aged 60+.`
        : ''
      : 'SIR revision ' +
        (net > 0 ? `added a net ${fmt(net)}` : net < 0 ? `removed a net ${fmt(-net)}` : 'left') +
        (net !== 0 ? ` names (${b.netPct}% of the booth). ` : ' the roll unchanged. ') +
        (b.meanAge ? `Mean age ${b.meanAge}; ${b.young}% aged 18–25, ${b.senior}% aged 60+.` : '');
  return {
    brief,
    why_it_matters: why,
    watch_for: watch,
    tags: [`AC ${b.ac}`, `Booth ${b.booth}`, b.bloc, b.ops, b.status].filter(Boolean),
  };
}

function withSeatMeta(row, seats) {
  const s = seats.find((x) => String(x.ac) === String(row.ac));
  const title = s?.name || `AC ${row.ac}`;
  return { ...row, name: s?.name || '', title, ...seatBrief(s || { ...row, name: title }) };
}

function withBoothMeta(row) {
  const title = row.station ? `Booth ${row.booth} · ${row.station}` : `Booth ${row.booth}`;
  const boothNo = row.ac != null && row.ac !== '' && row.booth != null && row.booth !== ''
    ? `${row.ac}/${row.booth}`
    : '';
  return { title, name: row.station || title, boothNo, ...boothBrief(row) };
}

const SEAT_COLS = {
  geo_state_seats: ['ac', 'name', 'district', 'taluka', 'electors', 'booths', 'bloc', 'leadPct', 'status'],
  geo_state_demog: ['ac', 'name', 'electors', 'male', 'female', 'sexRatio', 'medianAge', 'young', 'senior', 'households'],
  geo_state_split: ['ac', 'name', 'ac22', 'ls24', 'gap', 'inPlay', 'inPlayPct', 'flips', 'status'],
};

const BOOTH_COLS = {
  geo_local_booths: ['ac', 'booth', 'station', 'electors', 'households', 'bloc', 'leadPct', 'status', 'ops'],
  geo_local_demog: ['ac', 'booth', 'station', 'electors', 'male', 'female', 'sexRatio', 'meanAge', 'young', 'senior'],
  geo_local_blocs: ['ac', 'booth', 'station', 'electors', 'catholic', 'muslim', 'st', 'obc', 'general', 'sc', 'bloc'],
  geo_local_history: ['ac', 'booth', 'station', 'l17', 'l19', 'l22', 'l24', 'flips', 'margin24', 'turnout'],
  geo_local_churn: ['ac', 'booth', 'station', 'electors', 'added', 'removed', 'net', 'netPct'],
  geo_local_results: ['ac', 'booth', 'station', 'electors', 'status', 'l22', 'l24', 'margin24', 'bloc', 'leadPct'],
};

export function geoRows(pack, feature, dataset) {
  const key = geoDatasetFor(feature, dataset);
  const P = livePack(pack);
  if (!key || !P) return [];
  const seats = seatObjs(P);
  const booths = boothObjs(P);

  if (SEAT_COLS[key]) {
    return seats.map((s) => ({ ...take(s, SEAT_COLS[key]), title: s.name, ...seatBrief(s) }));
  }

  if (key === 'geo_state_blocs') {
    const rows = byCols(P.blocs, P.blocCols, [
      ['ac', 'AC'],
      ['electors', 'Electors'],
      ['catholic', 'Catholic %'],
      ['muslim', 'Muslim %'],
      ['st', 'Hindu ST %'],
      ['obc', 'Hindu OBC %'],
      ['general', 'Hindu General %'],
      ['sc', 'Hindu SC %'],
      ['unclassified', 'Unclassified %'],
    ]);
    return rows.map((r) => withSeatMeta(r, seats));
  }

  if (key === 'geo_state_results') {
    const rows = byCols(P.results, P.resultCols, [
      ['ac', 'AC'],
      ['w2017', '2017 Assembly winner'],
      ['w2019', '2019 Lok Sabha winner'],
      ['w2022', '2022 Assembly winner'],
      ['pct2022', '2022 Assembly %'],
      ['margin2022', '2022 Assembly margin'],
      ['w2024', '2024 Lok Sabha winner'],
    ]);
    return rows.map((r) => {
      const s = seats.find((x) => String(x.ac) === String(r.ac));
      return withSeatMeta({ ...r, distinct: s?.distinct }, seats);
    });
  }

  if (key === 'geo_state_churn') {
    const rows = byCols(P.churn, P.churnCols, [
      ['ac', 'AC'],
      ['draft', 'Draft'],
      ['final', 'Final'],
      ['added', 'Added'],
      ['removed', 'Removed'],
      ['net', 'Net'],
      ['netPct', 'Net %'],
    ]);
    return rows.map((r) => withSeatMeta(r, seats));
  }

  if (key === 'geo_state_gap') {
    const rows = byCols(P.gap, P.gapCols, [
      ['ac', 'AC'],
      ['electors', 'Electors'],
      ['aged', 'Aged 18-19'],
      ['missing', 'Missing 18-19'],
      ['pct', '% of seat'],
    ]);
    return rows.map((r) => withSeatMeta(r, seats));
  }

  if (key === 'geo_local_swing') {
    const rows = byCols(P.swing, P.swingCols, [
      ['ac', 'AC'],
      ['booth', 'Booth'],
      ['station', 'Polling station'],
      ['electors', 'Electors'],
      ['bloc', 'Leading bloc'],
      ['leadPct', 'Leading %'],
      ['enc', 'ENC'],
    ]);
    return rows.map((r) => ({ ...r, ...withBoothMeta({ ...r, status: 'Swing' }) }));
  }

  if (key === 'geo_local_anchor') {
    const rows = byCols(P.anchor, P.anchorCols, [
      ['ac', 'AC'],
      ['booth', 'Booth'],
      ['station', 'Polling station'],
      ['electors', 'Electors'],
      ['bloc', 'Leading bloc'],
      ['leadPct', 'Leading %'],
    ]);
    return rows.map((r) => ({ ...r, ...withBoothMeta({ ...r, status: 'Anchor' }) }));
  }

  if (key === 'geo_local_brief') {
    const results = byCols(P.results, P.resultCols, [
      ['ac', 'AC'],
      ['w2017', '2017 Assembly winner'],
      ['w2019', '2019 Lok Sabha winner'],
      ['w2022', '2022 Assembly winner'],
      ['pct2022', '2022 Assembly %'],
      ['margin2022', '2022 Assembly margin'],
      ['w2024', '2024 Lok Sabha winner'],
    ]);
    const resOf = {};
    results.forEach((r) => {
      resOf[String(r.ac)] = r;
    });
    return seats.map((s) => {
      const r = resOf[String(s.ac)] || {};
      return {
        ...take(s, ['ac', 'name', 'district', 'taluka', 'electors', 'booths', 'status']),
        w2017: r.w2017,
        w2019: r.w2019,
        w2022: r.w2022,
        pct2022: r.pct2022,
        margin2022: r.margin2022,
        w2024: r.w2024,
        title: s.name,
        ...seatBrief(s),
      };
    });
  }

  if (BOOTH_COLS[key]) {
    return booths.map((b) => {
      const row = { ...take(b, BOOTH_COLS[key]), ...withBoothMeta(b) };
      if (key === 'geo_local_booths') row.sizeBand = sizeBandOf(b.electors);
      return row;
    });
  }

  return [];
}

export function geoNote(pack) {
  const P = livePack(pack);
  const vintage = P?.vintage || pack?.vintage || '';
  return `Ingested geography pack${vintage ? ` — ${vintage}` : ''}. The workbook GitHub URL is the extract source, not the live table.`;
}
