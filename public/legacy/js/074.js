
/* ============================================================
   NIYANTRAN TERMINAL — ENHANCEMENT LAYER v2  (loads last)
   Additive only. Provides:
     • 60/40 split: sticky filters on top, live feed (left) +
       Live Analytics (right), draggable divider + maximize
       toggles, layout persisted (Req 1)
     • Analyst-grade, domain-specific visualizations with a
       methodology (i) icon on every chart & KPI block (Req 2)
     • Sidebar accordion — one category open at a time (Req 3)
     • Concise module names, enriched card detail, AI context
       tray (from v1)
   All metrics are computed from the terminal's own embedded
   datasets — no external calls, no fabricated numbers.
   ============================================================ */
(function () {
  'use strict';
  const esc = window.escapeHtml || (s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const CSV = () => (typeof EMBEDDED_CSV_DATA !== 'undefined' ? EMBEDDED_CSV_DATA : {});
  const JSN = () => (typeof EMBEDDED_JSON_DATA !== 'undefined' ? EMBEDDED_JSON_DATA : {});
  const SYNC = () => (typeof EMBEDDED_SYNC_META !== 'undefined' ? EMBEDDED_SYNC_META : {});

  /* ============ concise module names ============ */
  const DISPLAY_NAMES = { /* V2 PASS 52 */
    'Centre-sanctioned Projects & Completion Rate': 'Central Projects',
    'Budget Utilisation & Schemes': 'Budget & Schemes',
    'Industry Updates (Ministry Data)': 'Industry Updates',
    'MP Profiles & Performance (MPLAD, attendance, debates)': 'MP Report Cards',
    'LS Manifestos & Promises Tracker': 'Manifestos & Promises',
    'Judge Analytics (Ruling Patterns)': 'Judge Analytics',
    'Case Pendency & Disposal Analytics': 'Pendency & Disposal',
    'Precedent / Citation Network': 'Citation Network',
    'Supreme Courts & precedent \u2014 United States': 'US Supreme Court',
    'Supreme Courts & precedent \u2014 other common-law jurisdictions': 'Commonwealth Courts',
    "Regional Int'l Courts (ECtHR / CJEU / ITLOS)": 'Regional Courts',
    'NCLT / NCLAT (Insolvency)': 'Insolvency Courts',
    'Sector Tribunals (ITAT / TDSAT / SAT / DRT)': 'Sector Tribunals',
    'Cause-List / Hearing Scheduler': 'Hearing Scheduler',
    'HC Case Status & Cause Lists': 'HC Cause Lists',
    'HC Pendency & Disposal Analytics': 'HC Pendency',
    'HC Judge Profiles & Bench Analytics': 'HC Bench Analytics',
    'HC Constitutional & PIL Tracker': 'HC PIL Tracker',
    'HC vs State Government Litigation': 'HC vs State',
    'District Court Pendency & Disposal': 'District Pendency',
    'Undertrial & Prison Data': 'Prisons & Undertrials',
    'Legal Aid & Lok Adalat Tracker': 'Legal Aid & Lok Adalats',
    'Local Judge & Court Directory': 'Court Directory',
    'Professional Case-Law Database': 'Case-Law Library',
    'Constitutional Bench Tracker': 'Constitution Benches',
    'Key Financial Indicators (GDP, CPI, PMI, Emp-to-Pop)': 'Key Indicators',
    'Economic Overview of All Countries': 'Country Economies',
    'Sector Policy \u2014 Power/Energy/Green/Critical Minerals': 'Sector Policy',
    'Trade Agreements & Economic Sanctions': 'Trade & Sanctions',
    'Top Financial & Business Players': 'Business Leaders',
    'Election Forecast Aggregator': 'Election Forecasts',
    'Live Global Stock Exchanges': 'World Exchanges',
    'AI & the Tech Industry': 'AI & Tech',
    'Music Charts \u2014 India Top 25': 'India Top 25',
    'Music Charts \u2014 Global Top 25': 'Global Top 25',
    'Fixtures & Results \u2014 World Leagues': 'World Fixtures',

    'Global War & Conflict Tracker': 'War & Conflict Tracker',
    'Global Geopolitics News Monitor': 'Geopolitics News',
    'Major Infrastructure & Strategic Projects Tracker': 'Infra',
    'Defense Modernization & Procurement Watch': 'Global Intelligence',
    'Strategic Alliances Watch': 'Alliances',
    'Bill Passage Probability Index': 'Bill Passage Index',
    'Parliamentary Question Database': 'Parliamentary Questions',
    'Candidate Affidavit Database (Structured + API)': 'Candidate Affidavits',
    'Central Tender Aggregator + Constituency Filter': 'Central Tenders',
    'Centre-State Fund Flow Tracker': 'Centre–State Fund Flows',
    'Regulatory Body Watch (RBI/SEBI/TRAI/CCI)': 'Regulatory Watch',
    'Policy Pipeline Tracker (Draft-to-Gazette)': 'Policy Pipeline',
    'Bureaucratic Transfers — AGMUT Cadre': 'IAS/IPS Transfers (AGMUT)',
    'MLA Report Card + Statement Tracker': 'MLA Report Cards',
    'Statement & Quote Tracker with Contradiction Detection': 'Statements & Contradictions',
    'National Morning Brief (Auto-digest)': 'Morning Brief',
    'Delimitation Impact Simulator': 'Delimitation Simulator',
    'Supreme Court Order & Judgment Feed': 'Supreme Court Feed',
    'UP High Court (Allahabad) Order Feed': 'Allahabad HC Feed',
    'Order Archive by Topic (Cross-Court)': 'Order Archive',
    'NGT Environmental Litigation Tracker': 'NGT Litigation',
    'CAT & Consumer Disputes (NCDRC) Watch': 'CAT & NCDRC Watch',
    'Bijnor District Court Case Tracker': 'District Court Cases',
    'NSE/BSE Delayed Market Feed': 'Equity Market Feed',
    'Prediction Market Political Odds': 'Political Prediction Markets',
    'Bureaucrat Transfer & Posting Tracker (State Cadre)': 'State Cadre Transfers',
    'Assembly Proceedings Digest (Vernacular, Translated)': 'Assembly Proceedings',
    'MLA Defection & Anti-defection Case Tracker': 'Anti-Defection Tracker',
    'State Tender Aggregator (State e-Procurement)': 'State Tenders',
    'Election Forecast Aggregator': 'Election Forecasts',
    'Booth-level Results Database': 'Booth-Level Results',
    'Ward/Panchayat Results Database': 'Ward/Panchayat Results',
    'Councillor & Pradhan Profiles + Report Cards': 'Councillor & Pradhan Cards',
    'Local Officer Directory + Transfer Tracker (BDO/SDO/EO)': 'Local Officer Directory',
    'MGNREGA Works & Muster Roll Tracker': 'MGNREGA Works',
    'Gram Panchayat Development Plan (GPDP) Fund Tracker': 'GPDP Fund Tracker',
    'Municipal & Panchayat Tender Aggregator': 'Municipal Tenders',
    'Panchayat Seat Reservation Rotation Tracker': 'Reservation Rotation',
    'Building Permission & Plan Sanction Monitor': 'Building Permissions',
    'Urban Master Plan & Land Use Change Tracker': 'Master Plan & Land Use',
    'Hyperlocal News Aggregator': 'Hyperlocal News',
    'District Media Monitor (Vernacular District Editions)': 'District Media Monitor',
  };
  function shortName(f) { return DISPLAY_NAMES[f.feature] || f.feature; }
  function shortenLabelEl(el) {
    if (!el) return;
    let full = '';
    el.childNodes.forEach(n => { if (n.nodeType === 3) full += n.textContent; });
    full = full.trim();
    const short = DISPLAY_NAMES[full];
    if (short && short !== full) {
      let done = false;
      el.childNodes.forEach(n => { if (!done && n.nodeType === 3 && n.textContent.trim()) { n.textContent = short; done = true; } });
      if (!done) el.insertBefore(document.createTextNode(short), el.firstChild);
      el.setAttribute('title', full);
    }
  }
  function applyNames() {
    document.querySelectorAll('#sidebarList .feat-item .label').forEach(shortenLabelEl);
    shortenLabelEl(document.querySelector('#detail .detail-title'));
  }

  /* ============ small data helpers ============ */
  function toNum(v) { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; }
  function parseINR(s) { const head = String(s == null ? '' : s).split('~')[0]; const d = head.replace(/[^0-9]/g, ''); return d ? parseInt(d, 10) : 0; }
  function yearOf(v) { const m = String(v == null ? '' : v).match(/\b(19|20)\d{2}\b/); return m ? parseInt(m[0], 10) : null; }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function fmtCr(n) { if (n == null) return '—'; if (n >= 1e7) return (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + ' Cr'; if (n >= 1e5) return (n / 1e5).toFixed(1) + ' L'; return n.toLocaleString('en-IN'); }
  function prettyKey(k) { return String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function countBy(rows, key) { const m = new Map(); for (let i = 0; i < rows.length; i++) { const v = String(rows[i][key] == null ? '' : rows[i][key]).trim(); if (!v) continue; m.set(v, (m.get(v) || 0) + 1); } return m; }
  function countByFn(rows, fn) { const m = new Map(); for (let i = 0; i < rows.length; i++) { const v = fn(rows[i]); if (v == null || v === '') continue; m.set(v, (m.get(v) || 0) + 1); } return m; }
  function topPairs(map, n) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n || 8); }
  function minYear(rows, key) { let lo = null; for (let i = 0; i < rows.length; i++) { const y = yearOf(rows[i][key]); if (y != null && (lo == null || y < lo)) lo = y; } return lo; }
  function stageClass(v) {
    const s = String(v).toLowerCase();
    if (/passed|assented|notified|implemented|disposed|resolved|elected|won|approved|completed|operational|allowed|delivery|contract signed/.test(s)) return 'g';
    if (/lapsed|withdrawn|rejected|dismissed|stayed|lost|cancelled|terminated|denied/.test(s)) return 'r';
    if (/introduced|pending|committee|report|under review|reserved|ongoing|active|proposed|draft|in progress|fragile|trials|planned|rfp|tender/.test(s)) return 'a';
    return '';
  }
  function fmtSync(csv) { const meta = SYNC()[csv.replace(/\.csv$/, '')]; if (!meta || !meta.last_synced) return null; const d = new Date(meta.last_synced); if (isNaN(d)) return null; return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

  /* ============ methodology info icon ============ */
  let infoCounter = 0; const infoRegistry = {};
  function infoIcon(info) { if (!info) return ''; const id = ++infoCounter; infoRegistry[id] = info; return `<button class="niy-info" type="button" data-niy-info="${id}" title="Methodology & sources" aria-label="Methodology and sources">i</button>`; }
  function methodologyHtml(info) {
    const row = (label, val) => val ? `<div class="niy-meth-row"><div class="niy-meth-k">${esc(label)}</div><div class="niy-meth-v">${esc(val)}</div></div>` : '';
    return `<div class="niy-meth">${row('Data source', info.source)}${row('Methodology', info.method)}${row('Calculation', info.calc)}${row('Update frequency', info.freq)}${row('Assumptions', info.assume)}${row('Limitations', info.limits)}</div>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-niy-info]'); if (!b) return;
    e.stopPropagation();
    const info = infoRegistry[b.dataset.niyInfo];
    if (info && typeof openInfoModal === 'function') openInfoModal(info.title || 'Methodology & Sources', methodologyHtml(info));
  });

  /* ============ chart primitives (interactive, theme-aware) ============ */
  function chartCard(title, info, inner) { return `<div class="niy-chart"><div class="niy-chart-hd"><div class="niy-chart-t">${esc(title)}</div>${infoIcon(info)}</div>${inner}</div>`; }
  function kpi(k, v, sub, cls) { return `<div class="niy-kpi"><div class="niy-kpi-k">${esc(k)}</div><div class="niy-kpi-v ${cls || ''}">${v}</div>${sub ? `<div class="niy-kpi-sub">${esc(sub)}</div>` : ''}</div>`; }
  // Bars carry data-* so a single delegated engine can drive tooltips,
  // hover-highlight of matching feed rows, and click-to-cross-filter.
  function barsHtml(pairs, opts) {
    opts = opts || {};
    if (!pairs.length) return '<div class="niy-viz-empty">No data.</div>';
    const total = opts.total || pairs.reduce((s, p) => s + Math.abs(p[1]), 0);
    const max = Math.max(...pairs.map(p => Math.abs(p[1])), 1);
    const fcol = opts.filterCol || '';
    return pairs.map(([label, val], i) => {
      const w = Math.max(2, Math.round(Math.abs(val) / max * 100));
      let cls = '';
      if (opts.toneMap) cls = opts.toneMap[label] || ''; else if (opts.colorize) cls = stageClass(label);
      else if (opts.signed) cls = val >= 0 ? 'g' : 'r';
      const p = total ? Math.round(Math.abs(val) / total * 100) : 0;
      const disp = opts.fmt ? opts.fmt(val) : (opts.pct ? val + '%' : Math.abs(val).toLocaleString());
      const clickable = fcol ? ' niy-clickable' : '';
      return `<div class="niy-dist-row${clickable}" data-cat="${esc(label)}" data-disp="${esc(disp)}" data-pct="${p}" data-rank="${i + 1}" data-of="${pairs.length}"${fcol ? ` data-filter-col="${esc(fcol)}"` : ''}>` +
        `<div class="niy-dist-label" title="${esc(label)}">${esc(label)}</div>` +
        `<div class="niy-dist-track"><div class="niy-dist-bar ${cls}" data-w="${w}" style="width:${w}%"></div></div>` +
        `<div class="niy-dist-val">${esc(disp)}</div></div>`;
    }).join('');
  }
  function funnelHtml(steps) {
    if (!steps.length) return '<div class="niy-viz-empty">No data.</div>';
    const first = steps[0][1] || 1;
    const max = Math.max(...steps.map(s => s[1]), 1);
    return steps.map(([label, val]) => {
      const w = Math.max(2, Math.round(val / max * 100));
      const p = first ? Math.round(val / first * 100) : 0;
      return `<div class="niy-dist-row" data-cat="${esc(label)}" data-disp="${val.toLocaleString()} · ${p}%" data-pct="${p}"><div class="niy-dist-label" title="${esc(label)}">${esc(label)}</div><div class="niy-dist-track"><div class="niy-dist-bar" data-w="${w}" style="width:${w}%"></div></div><div class="niy-dist-val">${val.toLocaleString()} · ${p}%</div></div>`;
    }).join('');
  }
  function sparkHtml(pairs, opts) {
    opts = opts || {};
    if (pairs.length < 2) return '<div class="niy-viz-empty">Not enough time-series data.</div>';
    const w = 560, h = 132, pad = 10, top = 16;
    const max = Math.max(...pairs.map(p => p.y), 1);
    const n = pairs.length;
    const xw = (w - pad * 2) / Math.max(n - 1, 1);
    const pts = pairs.map((p, i) => [pad + i * xw, h - pad - (p.y / max) * (h - pad - top)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `M${pts[0][0].toFixed(1)} ${h - pad} ` + pts.map(p => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ` L${pts[n - 1][0].toFixed(1)} ${h - pad} Z`;
    const fcol = opts.filterCol || '';
    const hit = pts.map((p, i) => `<circle class="niy-spark-dot${fcol ? ' niy-clickable' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="transparent" data-cat="${esc(pairs[i].x)}" data-disp="${pairs[i].y.toLocaleString()} records"${fcol ? ` data-filter-col="${esc(fcol)}"` : ''}></circle>`).join('');
    const dots = pts.map(p => `<circle class="niy-spark-vis" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"></circle>`).join('');
    return `<svg class="niy-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="niy-spark-area" d="${area}"></path><path class="niy-spark-line" d="${line}"></path>${dots}${hit}</svg><div class="niy-spark-axis"><span>${esc(pairs[0].x)}</span><span>peak ${max.toLocaleString()}</span><span>${esc(pairs[n - 1].x)}</span></div>`;
  }
  function breadthHtml(adv, dec) {
    const t = (adv + dec) || 1;
    return `<div class="niy-breadth"><div class="niy-breadth-adv" style="width:${(adv / t * 100).toFixed(1)}%"></div><div class="niy-breadth-dec" style="width:${(dec / t * 100).toFixed(1)}%"></div></div><div class="niy-breadth-lab"><span class="sig-green">▲ ${adv} advancing</span><span class="sig-red">${dec} declining ▼</span></div>`;
  }
  // Cross-tab heatmap: rowKey (top-N) x colKey (fixed colOrder). Cell shade = count
  // intensity (opacity), hue = per-column tone. A genuine 2-D analytic, reusable across tiers.
  function matrixHtml(rows, rowKey, colKey, opts) {
    opts = opts || {};
    const colOrder = opts.colOrder || [...new Set(rows.map(r => String(r[colKey] || '').trim()).filter(Boolean))];
    const hues = opts.hues || {};
    const rowTot = new Map();
    rows.forEach(r => { const k = String(r[rowKey] || '').trim(); if (k) rowTot.set(k, (rowTot.get(k) || 0) + 1); });
    let rowNames = [...rowTot.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    if (opts.n) rowNames = rowNames.slice(0, opts.n);
    const cell = {}; let mx = 1;
    rowNames.forEach(rn => { cell[rn] = {}; colOrder.forEach(c => cell[rn][c] = 0); });
    rows.forEach(r => { const rk = String(r[rowKey] || '').trim(); const ck = String(r[colKey] || '').trim(); if (cell[rk] && ck in cell[rk]) { cell[rk][ck]++; if (cell[rk][ck] > mx) mx = cell[rk][ck]; } });
    const colTot = {}; colOrder.forEach(c => colTot[c] = rowNames.reduce((s, rn) => s + cell[rn][c], 0));
    const gcols = '110px repeat(' + colOrder.length + ', 1fr) 44px';
    let html = '<div class="niy-mtx" style="grid-template-columns:' + gcols + '">';
    html += '<div class="niy-mtx-cnr"></div>';
    colOrder.forEach(c => { html += '<div class="niy-mtx-ch" title="' + esc(c) + '">' + esc(c) + '</div>'; });
    html += '<div class="niy-mtx-ch niy-mtx-tot">Σ</div>';
    rowNames.forEach(rn => {
      html += '<div class="niy-mtx-rh" title="' + esc(rn) + '">' + esc(rn) + '</div>';
      colOrder.forEach(c => {
        const v = cell[rn][c]; const a = v ? (0.16 + 0.84 * (v / mx)) : 0;
        const hue = hues[c] || '#6b7cff';
        const st = v ? ('background:' + hue + ';opacity:' + a.toFixed(2)) : '';
        html += '<div class="niy-mtx-cell' + (v ? ' on' : '') + '"' + (opts.filterRow || opts.filterCol ? ' data-cat="' + esc(rn) + '"' : '') + '><span class="niy-mtx-fill" style="' + st + '"></span><span class="niy-mtx-n">' + (v || '') + '</span></div>';
      });
      html += '<div class="niy-mtx-tot">' + rowTot.get(rn) + '</div>';
    });
    html += '<div class="niy-mtx-rh niy-mtx-tot">Σ</div>';
    colOrder.forEach(c => { html += '<div class="niy-mtx-tot">' + colTot[c] + '</div>'; });
    html += '<div class="niy-mtx-tot">' + rows.length + '</div>';
    html += '</div>';
    return html;
  }
  // convenience chart builders — cDist is cross-filterable by its own column
  function cDist(rows, key, title, info, opts) {
    opts = Object.assign({ filterCol: key, total: rows.length }, opts || {});
    const pairs = topPairs(countBy(rows, key), opts.n || 8);
    return chartCard(title, info, barsHtml(pairs, opts));
  }
  function cSparkYear(rows, key, title, info, opts) {
    opts = opts || {};
    const m = new Map();
    for (let i = 0; i < rows.length; i++) { const y = yearOf(rows[i][key]); if (y) m.set(y, (m.get(y) || 0) + 1); }
    let years = [...m.keys()].sort((a, b) => a - b);
    if (years.length < 2) return '';
    if (opts.last && years.length > opts.last) years = years.slice(-opts.last);
    return chartCard(title, info, sparkHtml(years.map(y => ({ x: y, y: m.get(y) })), { filterCol: key }));
  }

  /* ============ methodology text (established frameworks) ============ */
  const INFO = {
    // Bills
    billsKPI: { title: 'Key Indicators — Legislation', source: 'Lok Sabha & Rajya Sabha bill lists (sansad.in); PRS Legislative Research bill track.', method: 'Every tracked bill is classified by its current legislative stage; indicators aggregate that snapshot across all bills in the dataset.', calc: 'Passage rate = bills at "Passed Both Houses" ÷ total tracked. Active pipeline = bills at Introduced, Committee Stage, Report Presented, or passed in a single House.', freq: 'On each data-pipeline sync (see the Last Sync figure).', assume: '"Passed Both Houses" is treated as legislative success; Presidential assent and gazetting are downstream and tracked separately.', limits: 'This is a stage snapshot, not a per-session flow; the archive spans multiple Lok Sabhas, so counts mix parliaments.' },
    billsPipeline: { title: 'Legislative Status by Stage', source: 'sansad.in bill stages; PRS Legislative Research.', method: 'Bills are ordered along the constitutional sequence (Introduction → Committee scrutiny → Passage in one House → Passage in both Houses → assent) and counted at their current stage.', calc: 'Each bar = number of tracked bills currently at that stage; the % is the share of all tracked bills (a composition, not a cohort conversion rate). "Passed One House" combines Passed LS and Passed RS.', freq: 'Per data-pipeline sync.', assume: 'A bill occupies exactly one current stage.', limits: 'A stock snapshot, not a flow: bills that lapsed with an earlier Lok Sabha still show at their final recorded stage, so later stages can exceed earlier ones.' },
    billsTrend: { title: 'Legislative Activity Over Time', source: 'sansad.in date-of-introduction field.', method: 'Counts bills by the calendar year in which they were introduced — a proxy for legislative workload/activity.', calc: 'Group by year(date_introduced); count per year (last 15 years shown).', freq: 'Per sync.', assume: 'Introduction date is present and correctly parsed.', limits: 'Session timing means activity clusters in Budget/Monsoon/Winter sessions; annual bars can straddle two sessions.' },
    billsSector: { title: 'Legislative Agenda by Sector', source: 'Sponsoring ministry / sector field (sansad.in), with deeper tags for 2023+ bills.', method: 'Distribution of bills across policy sectors reveals where legislative attention concentrates.', calc: 'Count of bills per sector (top 8).', freq: 'Per sync.', assume: 'The sector field is a reasonable proxy for policy domain.', limits: 'For older bills the field is the raw sponsoring ministry, not a normalised sector taxonomy.' },
    // Affidavits
    affKPI: { title: 'Key Indicators — Candidate Affidavits', source: 'Self-sworn candidate affidavits (Form 26, ECI), as digitised by ADR / MyNeta (LokSabha 2024).', method: 'Aggregates declared criminal cases and assets across candidates — the standard ADR electoral-integrity lens.', calc: '% with criminal cases = candidates with criminal_cases > 0 ÷ total. % crorepati = candidates with declared assets > ₹1 crore ÷ total.', freq: 'Per election cycle / affidavit revision.', assume: 'Rupee assets parsed from the declared figure; "crorepati" threshold = ₹1 crore, per ADR convention.', limits: 'Affidavits are self-declared; pending cases are not convictions; "serious" vs ordinary cases cannot be separated without the underlying IPC sections.' },
    affCrim: { title: 'Criminal Antecedents', source: 'ADR / MyNeta affidavit database.', method: 'Candidates are bucketed by the number of pending criminal cases they declared.', calc: 'Buckets: 0 (clean), 1–2, 3–5, 6+ cases; count of candidates per bucket.', freq: 'Per cycle.', assume: 'criminal_cases is the count of pending cases from the affidavit.', limits: 'Case counts do not weight severity; declared ≠ convicted.' },
    affWealth: { title: 'Declared Assets Distribution', source: 'ADR / MyNeta affidavit database (total assets).', method: 'Candidates bucketed by declared net assets to show the wealth profile of the field.', calc: 'Rupee value parsed from the declared string; buckets <₹1 Cr, ₹1–5 Cr, ₹5–25 Cr, ₹25 Cr+.', freq: 'Per cycle.', assume: 'The leading rupee figure in the affidavit is total assets.', limits: 'Movable+immovable combined; valuations self-assessed and often conservative.' },
    affParty: { title: 'Criminality by Party', source: 'ADR / MyNeta affidavit database.', method: 'Share of each party’s candidates who declared at least one criminal case — an ADR-style party comparison.', calc: 'For parties with ≥5 candidates: (candidates with cases ÷ party candidates) × 100 (top 8 by share).', freq: 'Per cycle.', assume: 'Party labels are as recorded in the affidavit.', limits: 'Small-N parties excluded; independents grouped as declared.' },
    // MP / MLA
    mpKPI: { title: 'Key Indicators — Legislator Performance', source: 'sansad.in member pages; PRS MP Track.', method: 'Summarises legislative activity (questions asked, committee memberships, attendance where available).', calc: 'Median questions asked across members; attendance availability = share of members with a recorded attendance figure.', freq: 'Per session update.', assume: 'Questions asked reflects starred + unstarred questions attributed to the member.', limits: 'Attendance is sparsely populated in this snapshot; committee text is semi-structured.' },
    mpActivity: { title: 'Legislative Activity by Party', source: 'sansad.in questions data.', method: 'Average number of questions asked per member, by party — a proxy for floor engagement.', calc: 'Mean(questions_asked) per party for parties with ≥5 members (top 8).', freq: 'Per session.', assume: 'Even attribution of questions to the listed member.', limits: 'Does not adjust for tenure, ministerial roles (ministers ask fewer), or by-election entrants.' },
    mpDist: { title: 'Engagement Distribution', source: 'sansad.in questions data.', method: 'Distribution of members by how many questions they asked — shows the long tail of activity.', calc: 'Buckets of questions_asked (0, 1–50, 51–150, 151–300, 300+); count of members.', freq: 'Per session.', assume: 'questions_asked is numeric.', limits: 'Volume ≠ quality of scrutiny.' },
    // Questions DB
    qKPI: { title: 'Key Indicators — Parliamentary Questions', source: 'sansad.in questions (starred/unstarred).', method: 'Measures scrutiny volume and its distribution across ministries and members.', calc: 'Totals and distinct counts of ministries and members over the loaded sample.', freq: 'Per session sitting.', assume: 'Ministry field identifies the ministry to which the question was addressed.', limits: 'Loaded sample (not the full 98k archive) for responsiveness.' },
    qMinistry: { title: 'Scrutiny Pressure by Ministry', source: 'sansad.in questions data.', method: 'Which ministries face the most questions — a measure of accountability pressure / salience.', calc: 'Count of questions per ministry (top 8).', freq: 'Per sitting.', assume: 'One ministry per question.', limits: 'Volume reflects salience and portfolio size, not necessarily performance.' },
    qTrend: { title: 'Questions Over Time', source: 'sansad.in question dates.', method: 'Question volume by year — tracks sitting intensity.', calc: 'Group by year(date); count.', freq: 'Per sitting.', assume: 'Date parsed correctly.', limits: 'Recesses and dissolutions create gaps.' },
    // War tracker
    warKPI: { title: 'Key Indicators — Conflict Tracker', source: 'Hand-compiled from public reporting; analogues: ACLED, UCDP (Uppsala), ISW situation reports.', method: 'Tracks major active/recent conflicts with a coded status and start date.', calc: 'Active = status "active"; fragile ceasefires flagged separately; longevity = current year − start year.', freq: 'Manual review (a live build would poll ACLED/UCDP).', assume: 'Status coding follows the reporting consensus at review time.', limits: 'A curated ~10-conflict sample, not a live event feed; no sub-national event counts.' },
    warRegion: { title: 'Conflicts by Region', source: 'Curated conflict list.', method: 'Geographic concentration of tracked conflicts.', calc: 'Count of conflicts per region.', freq: 'Manual review.', assume: 'One primary region per conflict.', limits: 'Small sample; cross-regional conflicts assigned a primary region.' },
    warStatus: { title: 'Conflict Posture', source: 'Curated conflict list.', method: 'Distribution of conflicts by current status (active / ceasefire fragile / under review) — escalation posture.', calc: 'Count per status (colour-coded by escalation).', freq: 'Manual review.', assume: 'Status is the latest coded state.', limits: 'Coarse three-state coding.' },
    warMatrix: { title: 'Concentration — Region × Intensity', source: 'Compiled conflict list (CFR/UCDP/ACLED taxonomies).', method: 'Cross-tabulates every tracked conflict by world region and analyst-coded intensity to show where severe violence concentrates.', calc: 'Cell = count of conflicts in that region at that intensity; hue = intensity band, opacity ∝ count. Σ = row/column totals.', freq: 'Manual review.', assume: 'One primary region and one intensity band per conflict.', limits: 'Intensity is an ordinal analyst coding (Critical→Low), not a casualty count.' },
    warType: { title: 'Conflict Typology', source: 'Compiled conflict list.', method: 'Distribution across conflict types (interstate war, civil war, insurgency, jihadist, territorial/maritime dispute, criminal, frozen) — the structural mix of global conflict.', calc: 'Count per type (top 8).', freq: 'Manual review.', assume: 'Single dominant type per conflict.', limits: 'Some conflicts blend types; the dominant character is coded.' },
    warIntensity: { title: 'Intensity Profile', source: 'Compiled conflict list.', method: 'How many conflicts sit in each intensity band — the severity distribution of the caseload.', calc: 'Count per band, ordered Critical → Low; colour by severity.', freq: 'Manual review.', assume: 'Ordinal coding by scale of violence and strategic significance.', limits: 'Ordinal estimate, not a fatality measure.' },
    warTrend: { title: 'Escalation Momentum', source: 'Compiled conflict list.', method: 'Directional trend of each conflict (Escalating / Stable / Easing) — the momentum of the global caseload, not its stock.', calc: 'Count per trend; red = escalating, green = easing.', freq: 'Manual review.', assume: 'Trend reflects the most recent coded trajectory.', limits: 'Short-horizon judgement; can flip quickly.' },
    // Defence
    defKPI: { title: 'Key Indicators — Global Intelligence', source: 'MoD Acquisition Wing / DRDO / DPSU public releases; analogue: SIPRI Arms Transfers.', method: 'Tracks major acquisition programmes by stage, category and vendor origin.', calc: 'Indigenous share = programmes with an Indian vendor/origin ÷ total (Atmanirbhar lens).', freq: 'On MoD/DAC announcements.', assume: 'Stage taxonomy follows the DAP/DPP procurement phases.', limits: 'Curated sample of well-documented programmes.' },
    defStage: { title: 'Acquisition Pipeline by Stage', source: 'MoD/DAC public releases.', method: 'Where programmes sit in the procurement cycle (RFP → trials → contract → delivery).', calc: 'Count of programmes per stage (colour-coded by maturity).', freq: 'On announcements.', assume: 'A programme has one current stage.', limits: 'Small sample; stages simplified.' },
    defCat: { title: 'Programmes by Category', source: 'MoD/DAC public releases.', method: 'Force-structure focus across platform categories (aircraft, submarines, missiles, drones…).', calc: 'Count per category.', freq: 'On announcements.', assume: 'Single primary category per programme.', limits: 'Curated sample.' },
    // Infra
    infraKPI: { title: 'Key Indicators — Infra', source: 'World Bank Projects API; Sagarmala / National Infrastructure Pipeline dashboards; AidData (overseas).', method: 'Tracks major strategic projects by status, sector and region.', calc: 'Operational share and count of distinct regions from the project list.', freq: 'On official project updates.', assume: 'Status reflects the latest public milestone.', limits: 'Curated sample of well-documented projects.' },
    infraStatus: { title: 'Projects by Status', source: 'NIP / Sagarmala / World Bank.', method: 'Delivery posture across projects (planned → under construction → operational).', calc: 'Count per status (colour-coded).', freq: 'On updates.', assume: 'One status per project.', limits: 'Small sample.' },
    infraSector: { title: 'Projects by Sector', source: 'NIP / Sagarmala / World Bank.', method: 'Sectoral spread (ports, corridors, energy…).', calc: 'Count per sector.', freq: 'On updates.', assume: 'Single primary sector.', limits: 'Curated sample.' },
    infraTime: { title: 'Expected Completions', source: 'Project expected-completion field.', method: 'When tracked projects are slated to complete — a delivery timeline.', calc: 'Group by year(expected_completion); count.', freq: 'On updates.', assume: 'Completion year parsed from the field.', limits: 'Announced targets frequently slip.' },
    // SC orders
    scKPI: { title: 'Key Indicators — Supreme Court Feed', source: 'Supreme Court of India (sci.gov.in) orders & judgments.', method: 'Tracks recent orders by topic and date to profile the docket.', calc: 'Distinct topics; orders in the last 30 days from the latest order date.', freq: 'Near-daily on court working days.', assume: 'Topic tags derived from the case metadata.', limits: 'A recent window (not the full docket); topic tagging is approximate.' },
    scTopic: { title: 'Docket Composition by Topic', source: 'sci.gov.in orders.', method: 'Distribution of orders across subject areas (bail/criminal, civil, service, etc.).', calc: 'Count of orders per topic (top 8).', freq: 'Near-daily.', assume: 'One primary topic per order.', limits: 'Topic labels approximate; a bench may hear mixed matters.' },
    scTrend: { title: 'Orders Over Time', source: 'sci.gov.in order dates.', method: 'Judicial output cadence by year.', calc: 'Group by year(order_date); count.', freq: 'Near-daily.', assume: 'Order date parsed.', limits: 'Vacations reduce output; sample window is recent.' },
    // Market
    mktKPI: { title: 'Key Indicators — Market Internals', source: 'NSE/BSE end-of-day / delayed feed (indices and instruments).', method: 'Classic market-breadth internals computed across the instruments in the feed.', calc: 'Advancers = instruments with % change > 0; decliners < 0. Breadth = advancers vs decliners; average % change across instruments.', freq: 'Delayed feed — NOT real-time.', assume: '% change is versus previous close.', limits: 'This is a DELAYED feed; indices and single stocks are mixed, so breadth is indicative, not an exchange-wide A/D line.' },
    mktBreadth: { title: 'Market Breadth (Advance/Decline)', source: 'NSE/BSE delayed feed.', method: 'The advance–decline balance is a standard internals gauge of participation.', calc: 'Count of instruments up vs down on the day.', freq: 'Delayed.', assume: 'Prev-close basis for % change.', limits: 'Mixed universe (indices + stocks); not the full market.' },
    mktMovers: { title: 'Top Movers', source: 'NSE/BSE delayed feed.', method: 'Largest positive and negative % moves — where the day’s action is.', calc: 'Top gainers and losers by pct_change.', freq: 'Delayed.', assume: 'pct_change is same-day vs prev close.', limits: 'Low-liquidity names can show outsized moves.' },
    // Booth
    boothKPI: { title: 'Key Indicators — Booth-Level Results', source: 'ECI Form 20 booth-level results (Nagina AC); Lokdhaba (Ashoka/TCPD).', method: 'Booth-level margins profile competitiveness across polling stations.', calc: 'Leading party by booths won; marginal booths = victory margin < 5 percentage points; average winner vote share.', freq: 'Per election.', assume: 'Latest election_year used unless mixed; margin = winner% − runner-up%.', limits: 'Booth boundaries change across delimitation; multiple election years may be mixed in the raw table.' },
    boothParty: { title: 'Booths Won by Party', source: 'ECI Form 20 / Lokdhaba.', method: 'Party dominance measured by number of booths led.', calc: 'Count of booths per winning_party.', freq: 'Per election.', assume: 'One winner per booth.', limits: 'Mixes election years unless filtered; booth count ≠ vote count.' },
    boothMargin: { title: 'Competitiveness (Victory Margin)', source: 'ECI Form 20 / Lokdhaba.', method: 'Distribution of booths by victory margin — identifies swing/marginal booths for ground targeting.', calc: 'Margin = winner_vote_share − runner_up_vote_share; buckets <5, 5–10, 10–20, 20–40, 40+ pp.', freq: 'Per election.', assume: 'Vote-share fields are percentages of valid votes.', limits: 'Two-party margin only; ignores multi-cornered splits beyond runner-up.' },
    // Tenders
    tenderKPI: { title: 'Key Indicators — Public Tenders', source: 'Central Public Procurement Portal (eprocure.gov.in) / GeM; ministry tender notices.', method: 'Aggregates live tenders by value, sector and deadline proximity.', calc: 'Total value = sum(value_inr); closing soon = tenders with a deadline within 14 days.', freq: 'On portal refresh.', assume: 'Declared tender value is the estimated contract value.', limits: 'Small sample; values as published, pre-award.' },
    tenderSector: { title: 'Tenders by Sector', source: 'eprocure/GeM notices.', method: 'Where procurement demand concentrates.', calc: 'Count of tenders per sector.', freq: 'On refresh.', assume: 'Single sector per tender.', limits: 'Small sample.' },
    tenderValue: { title: 'Procurement Value by Sector', source: 'eprocure/GeM notices.', method: 'Rupee value of tenders by sector — where the money is.', calc: 'Sum(value_inr) per sector (top sectors).', freq: 'On refresh.', assume: 'Value is comparable across tenders.', limits: 'Outsized single tenders can dominate.' },
    // Regulatory
    regKPI: { title: 'Key Indicators — Regulatory Watch', source: 'RBI / SEBI / TRAI / CCI notifications and orders; e-Gazette.', method: 'Tracks regulatory action volume and cadence across regulators.', calc: 'Distinct regulators; actions in the last 30 days; most active regulator.', freq: 'On issuance.', assume: 'Each row is one regulatory action/notification.', limits: 'Coverage depends on what each regulator publishes.' },
    regBody: { title: 'Actions by Regulator', source: 'Regulator websites / e-Gazette.', method: 'Which regulators are most active in the window.', calc: 'Count of actions per regulator.', freq: 'On issuance.', assume: 'Regulator attributed per row.', limits: 'Volume ≠ significance.' },
    regTrend: { title: 'Regulatory Cadence', source: 'Regulator publication dates.', method: 'Action volume over time.', calc: 'Group by year(date); count.', freq: 'On issuance.', assume: 'Date parsed.', limits: 'Reporting gaps possible.' },
    // Transfers
    transferKPI: { title: 'Key Indicators — Bureaucratic Transfers', source: 'DoPT / cadre transfer orders (AGMUT / state cadre).', method: 'Profiles transfer activity by jurisdiction, cadre and recency.', calc: 'Distinct jurisdictions; transfers in the last 90 days.', freq: 'On order issuance.', assume: 'Each row is one posting change.', limits: 'Small sample; unconfirmed rows flagged in the feed.' },
    transferJur: { title: 'Transfers by Jurisdiction', source: 'Transfer orders.', method: 'Where postings are churning.', calc: 'Count per jurisdiction (or cadre).', freq: 'On issuance.', assume: 'One jurisdiction per order.', limits: 'Small sample.' },
    transferBatch: { title: 'Officers by Batch Year', source: 'Transfer orders (batch year).', method: 'Seniority profile of officers being moved.', calc: 'Count per batch year.', freq: 'On issuance.', assume: 'Batch year present.', limits: 'Small sample.' },
    // generic
    genericKPI: (csv, n) => ({ title: 'Key Indicators', source: `Module dataset (${csv}) — bundled snapshot / data pipeline.`, method: 'The dataset is auto-profiled; the most informative categorical and date fields drive these indicators.', calc: `${n.toLocaleString()} records; distinct-value counts and date coverage from detected fields.`, freq: 'Per data-pipeline sync (see Last Sync).', assume: 'Auto-detected fields are representative of the dataset.', limits: 'Generic profiling — a bespoke analyst view for this module is on the roadmap.' }),
    genericDist: (csv) => ({ title: 'Category Distribution', source: `Module dataset (${csv}).`, method: 'Record counts across the most informative categorical field.', calc: 'Count of records per category (top values).', freq: 'Per sync.', assume: 'The charted field is categorical.', limits: 'Auto-selected field; may not be the most analytically salient.' }),
    genericTime: (csv) => ({ title: 'Records Over Time', source: `Module dataset (${csv}).`, method: 'Record counts by year of the detected date field.', calc: 'Group by year; count.', freq: 'Per sync.', assume: 'A parseable date field exists.', limits: 'Auto-detected date field.' }),
  };

  /* ============ per-dataset analyst visualizations ============ */
  const VIZ_SPECS = {
    'national_bill_tracker.csv': (all) => {
      const total = all.length, sc = countBy(all, 'current_stage');
      const passedBoth = sc.get('Passed Both Houses') || 0;
      const introduced = sc.get('Introduced') || 0;
      const inCommittee = (sc.get('Committee Stage') || 0) + (sc.get('Report Presented') || 0);
      const passedOne = (sc.get('Passed LS') || 0) + (sc.get('Passed RS') || 0);
      const kpis = [
        kpi('Bills Tracked', total.toLocaleString(), 'since ' + (minYear(all, 'date_introduced') || '—')),
        kpi('Passed Both Houses', passedBoth.toLocaleString(), pct(passedBoth, total) + '% of tracked', 'sig-green'),
        kpi('Not Yet Enacted', (introduced + inCommittee + passedOne).toLocaleString(), 'introduced → single house', 'sig-amber'),
        kpi('Policy Sectors', String(countBy(all, 'sector').size), 'distinct sectors'),
      ];
      const stageOrder = [['Introduced', introduced], ['In Committee', inCommittee], ['Passed One House', passedOne], ['Passed Both Houses', passedBoth]].filter(s => s[1] > 0);
      const charts = [
        chartCard('Legislative status by stage', INFO.billsPipeline, barsHtml(stageOrder, { fmt: v => v.toLocaleString() + ' · ' + pct(v, total) + '%' })),
        cSparkYear(all, 'date_introduced', 'Bills introduced per year', INFO.billsTrend, { last: 15 }),
        cDist(all, 'sector', 'Legislative agenda by sector', INFO.billsSector, { n: 8 }),
      ];
      return { kpis, charts, kpiInfo: INFO.billsKPI };
    },
    'national_candidate_affidavit.csv': (all) => {
      const total = all.length;
      const withCrim = all.filter(r => (toNum(r.criminal_cases) || 0) > 0).length;
      const crore = all.filter(r => parseINR(r.total_assets) >= 1e7).length;
      const assetVals = all.map(r => parseINR(r.total_assets)).filter(v => v > 0).sort((a, b) => a - b);
      const median = assetVals.length ? assetVals[Math.floor(assetVals.length / 2)] : null;
      const kpis = [
        kpi('Candidates', total.toLocaleString(), 'affidavits analysed'),
        kpi('With Criminal Cases', pct(withCrim, total) + '%', withCrim.toLocaleString() + ' candidates', 'sig-red'),
        kpi('Crorepati', pct(crore, total) + '%', 'assets > ₹1 Cr', 'sig-amber'),
        kpi('Median Assets', fmtCr(median), 'declared net worth'),
      ];
      const crimBuckets = countByFn(all, r => { const n = toNum(r.criminal_cases) || 0; return n === 0 ? '0 (clean)' : n <= 2 ? '1–2' : n <= 5 ? '3–5' : '6+'; });
      const crimPairs = ['0 (clean)', '1–2', '3–5', '6+'].map(k => [k, crimBuckets.get(k) || 0]).filter(p => p[1]);
      const assetBuckets = countByFn(all, r => { const v = parseINR(r.total_assets); return v < 1e7 ? '< ₹1 Cr' : v < 5e7 ? '₹1–5 Cr' : v < 25e7 ? '₹5–25 Cr' : '₹25 Cr+'; });
      const assetPairs = ['< ₹1 Cr', '₹1–5 Cr', '₹5–25 Cr', '₹25 Cr+'].map(k => [k, assetBuckets.get(k) || 0]).filter(p => p[1]);
      // party criminality
      const byParty = {};
      all.forEach(r => { const p = (r.party || '').trim(); if (!p) return; byParty[p] = byParty[p] || { n: 0, c: 0 }; byParty[p].n++; if ((toNum(r.criminal_cases) || 0) > 0) byParty[p].c++; });
      const partyPairs = Object.entries(byParty).filter(([, v]) => v.n >= 5).map(([p, v]) => [p, pct(v.c, v.n)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const charts = [
        chartCard('Criminal antecedents', INFO.affCrim, barsHtml(crimPairs, {})),
        chartCard('Declared assets distribution', INFO.affWealth, barsHtml(assetPairs, {})),
        chartCard('Candidates with cases, by party (%)', INFO.affParty, barsHtml(partyPairs, { pct: true })),
      ];
      return { kpis, charts, kpiInfo: INFO.affKPI };
    },
    'national_mp_report_card.csv': (all) => mpLike(all, 'mp_name', INFO),
    'up_mla_report_card.csv': (all) => mpLike(all, 'mla_name', INFO),
    'national_question_database.csv': (all) => {
      const kpis = [
        kpi('Questions', all.length.toLocaleString(), 'in loaded sample'),
        kpi('Ministries', String(countBy(all, 'ministry').size), 'addressed'),
        kpi('Members', String(countBy(all, 'mp_name').size), 'asking questions'),
        kpi('Coverage', ((minYear(all, 'date') || '') + '–' + (new Date().getFullYear())), 'by date'),
      ];
      const charts = [
        cDist(all, 'ministry', 'Scrutiny pressure by ministry', INFO.qMinistry, { n: 8 }),
        cSparkYear(all, 'date', 'Questions over time', INFO.qTrend, { last: 12 }),
        cDist(all, 'question_type', 'By question type', INFO.qMinistry, { n: 6 }),
      ];
      return { kpis, charts, kpiInfo: INFO.qKPI };
    },
    'geopolitics_war_tracker.csv': (all) => {
      const norm = s => String(s || '').toLowerCase();
      // The live GDELT news-wire replaces this CSV at runtime (schema: title/source/outlets/country).
      // When those rows are present, render news-wire analytics instead of the structured-conflict ones.
      if (all.length && !all.some(r => r.conflict_type || r.intensity)) {
        const infoWire = { title: 'Live Conflict Wire', source: 'GDELT 2.0 Document API (api.gdeltproject.org) \u2014 global news monitoring, no key.', method: 'Aggregates and de-duplicates worldwide news coverage of conflict / security events, tagged by region and source.', calc: 'Counts of reports by region, source and referenced country over the current window.', freq: 'Continuous (edge-cached ~20 min).', assume: 'One primary region / country per report as tagged.', limits: 'Reflects MEDIA-COVERAGE volume, not ground-truth intensity; syndication partly deduped.' };
        const regs = countBy(all, 'region'), srcs = countBy(all, 'source'), ctys = countBy(all, 'country');
        const topReg = topPairs(regs, 1)[0];
        const kpisL = [
          kpi('Live Reports', all.length.toLocaleString(), 'aggregated & deduped'),
          kpi('Active Regions', String(regs.size), 'with reporting', 'sig-amber'),
          kpi('Sources', String(srcs.size), 'outlets reporting'),
          kpi('Top Theatre', topReg ? topReg[0] : '\u2014', topReg ? pct(topReg[1], all.length) + '% of reports' : '', 'sig-red'),
        ];
        const chartsL = [
          cDist(all, 'region', 'Reporting volume by region', infoWire, { n: 10 }),
          cDist(all, 'source', 'Most active sources', infoWire, { n: 10 }),
          cDist(all, 'country', 'Countries in focus', infoWire, { n: 12 }),
        ].filter(Boolean);
        const base = (window.__niyWarBaseline || (typeof EMBEDDED_CSV_DATA !== 'undefined' ? (EMBEDDED_CSV_DATA['geopolitics_war_tracker.csv'] || []) : [])).filter(r => r.conflict_type || r.intensity);
        if (base.length) {
          const HUES0 = { Critical: '#e5484d', High: '#e0793f', Medium: '#e5a33f', Low: '#3fae6b' };
          const intP = ['Critical', 'High', 'Medium', 'Low'].map(k => [k, base.filter(r => r.intensity === k).length]).filter(p => p[1]);
          const trP = ['Escalating', 'Stable', 'Easing'].map(k => [k, base.filter(r => r.trend === k).length]).filter(p => p[1]);
          chartsL.push(
            chartCard('Concentration — region × intensity', INFO.warMatrix, matrixHtml(base, 'region', 'intensity', { colOrder: ['Critical', 'High', 'Medium', 'Low'], hues: HUES0, n: 10 })),
            chartCard('Escalation momentum', INFO.warTrend, barsHtml(trP, { toneMap: { Escalating: 'r', Stable: 'a', Easing: 'g' }, total: base.length })),
            chartCard('Intensity profile', INFO.warIntensity, barsHtml(intP, { toneMap: { Critical: 'r', High: 'r', Medium: 'a', Low: 'g' }, total: base.length })),
            chartCard('Conflict typology', INFO.warType, barsHtml(topPairs(countBy(base, 'conflict_type'), 8), { total: base.length })),
            chartCard('Conflict posture', INFO.warStatus, barsHtml(topPairs(countBy(base, 'current_stage'), 6), { colorize: true, total: base.length })),
            cSparkYear(base, 'started', 'Conflict onsets by year', INFO.warKPI, { last: 20 })
          );
        }
        return { kpis: kpisL, charts: chartsL, kpiInfo: infoWire };
      }
      const active = all.filter(r => /active/.test(norm(r.current_stage))).length;
      const hi = all.filter(r => /critical|high/.test(norm(r.intensity))).length;
      const esc = all.filter(r => /escalat/.test(norm(r.trend))).length;
      const interstate = all.filter(r => /interstate/.test(norm(r.conflict_type))).length;
      const kpis = [
        kpi('Conflicts Tracked', String(all.length), 'active / recent worldwide'),
        kpi('Active Hostilities', String(active), 'currently fighting', 'sig-red'),
        kpi('High-Intensity', pct(hi, all.length) + '%', hi + ' critical / high', 'sig-amber'),
        kpi('Escalating', pct(esc, all.length) + '%', esc + ' trending upward', esc > all.length * 0.3 ? 'sig-red' : 'sig-amber'),
      ];
      const HUES = { Critical: '#e5484d', High: '#e0793f', Medium: '#e5a33f', Low: '#3fae6b' };
      const intPairs = ['Critical', 'High', 'Medium', 'Low'].map(k => [k, all.filter(r => r.intensity === k).length]).filter(p => p[1]);
      const trPairs = ['Escalating', 'Stable', 'Easing'].map(k => [k, all.filter(r => r.trend === k).length]).filter(p => p[1]);
      const charts = [
        chartCard('Concentration — region \u00d7 intensity', INFO.warMatrix, matrixHtml(all, 'region', 'intensity', { colOrder: ['Critical', 'High', 'Medium', 'Low'], hues: HUES, n: 10 })),
        chartCard('Escalation momentum', INFO.warTrend, barsHtml(trPairs, { toneMap: { Escalating: 'r', Stable: 'a', Easing: 'g' }, filterCol: 'trend', total: all.length })),
        chartCard('Intensity profile', INFO.warIntensity, barsHtml(intPairs, { toneMap: { Critical: 'r', High: 'r', Medium: 'a', Low: 'g' }, filterCol: 'intensity', total: all.length })),
        cDist(all, 'conflict_type', 'Conflict typology', INFO.warType, { n: 8 }),
        chartCard('Conflict posture', INFO.warStatus, barsHtml(topPairs(countBy(all, 'current_stage'), 6), { colorize: true, filterCol: 'current_stage', total: all.length })),
        cSparkYear(all, 'started', 'Conflict onsets by year', INFO.warKPI, { last: 20 }),
      ];
      return { kpis, charts, kpiInfo: INFO.warKPI };
    },
    'geopolitics_defense_procurement.csv': (all) => {
      const indig = all.filter(r => /india|drdo|hal|bel|indigen|\bdpsu\b/i.test(r.vendor_or_origin || '')).length;
      const kpis = [
        kpi('Programmes', String(all.length), 'tracked'),
        kpi('Categories', String(countBy(all, 'category').size), 'platform types'),
        kpi('Indigenous', pct(indig, all.length) + '%', 'Indian vendor/origin', 'sig-green'),
        kpi('Stages', String(countBy(all, 'stage').size), 'in procurement cycle'),
      ];
      const charts = [
        chartCard('Acquisition pipeline by stage', INFO.defStage, barsHtml(topPairs(countBy(all, 'stage'), 8), { colorize: true, filterCol: 'stage', total: all.length })),
        cDist(all, 'category', 'Programmes by category', INFO.defCat, { n: 8 }),
        cDist(all, 'vendor_or_origin', 'By vendor / origin', INFO.defKPI, { n: 8 }),
      ];
      return { kpis, charts, kpiInfo: INFO.defKPI };
    },
    'geopolitics_infra_projects.csv': (all) => {
      const oper = all.filter(r => /operational|complete|commission/i.test(r.status || '')).length;
      const kpis = [
        kpi('Projects', String(all.length), 'strategic assets'),
        kpi('Operational', String(oper), 'commissioned', 'sig-green'),
        kpi('Regions', String(countBy(all, 'country_region').size), 'covered'),
        kpi('Sectors', String(countBy(all, 'sector').size), 'ports, corridors…'),
      ];
      const charts = [
        chartCard('Projects by status', INFO.infraStatus, barsHtml(topPairs(countBy(all, 'status'), 8), { colorize: true, filterCol: 'status', total: all.length })),
        cDist(all, 'sector', 'Projects by sector', INFO.infraSector, { n: 8 }),
        cSparkYear(all, 'expected_completion', 'Expected completions', INFO.infraTime, {}),
      ];
      return { kpis, charts, kpiInfo: INFO.infraKPI };
    },
    'judiciary_sc_orders.csv': (all) => {
      const dates = all.map(r => new Date(String(r.order_date).replace(/-/g, ' '))).filter(d => !isNaN(d));
      const latest = dates.length ? new Date(Math.max(...dates)) : null;
      const last30 = latest ? all.filter(r => { const d = new Date(String(r.order_date).replace(/-/g, ' ')); return !isNaN(d) && (latest - d) <= 30 * 864e5; }).length : 0;
      const kpis = [
        kpi('Orders', String(all.length), 'in recent window'),
        kpi('Topics', String(countBy(all, 'topic').size), 'subject areas'),
        kpi('Last 30 Days', String(last30), 'orders issued', 'sig-amber'),
        kpi('Latest', latest ? latest.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—', 'most recent order'),
      ];
      const charts = [
        cDist(all, 'topic', 'Docket composition by topic', INFO.scTopic, { n: 8 }),
        cSparkYear(all, 'order_date', 'Orders over time', INFO.scTrend, { last: 10 }),
      ];
      return { kpis, charts, kpiInfo: INFO.scKPI };
    },
    'finance_market_feed.csv': (all) => {
      const chg = all.map(r => ({ name: r.name, p: toNum(r.pct_change) })).filter(x => x.p != null);
      const adv = chg.filter(x => x.p > 0).length, dec = chg.filter(x => x.p < 0).length;
      const avg = chg.length ? (chg.reduce((a, x) => a + x.p, 0) / chg.length) : 0;
      const kpis = [
        kpi('Instruments', String(all.length), 'indices + stocks'),
        kpi('Advancing', String(adv), 'up on the day', 'sig-green'),
        kpi('Declining', String(dec), 'down on the day', 'sig-red'),
        kpi('Avg Change', (avg >= 0 ? '+' : '') + avg.toFixed(2) + '%', 'breadth tilt', avg >= 0 ? 'sig-green' : 'sig-red'),
      ];
      const sorted = chg.slice().sort((a, b) => b.p - a.p);
      const movers = sorted.slice(0, 5).concat(sorted.slice(-5).reverse()).map(x => [x.name, x.p]);
      const charts = [
        chartCard('Market breadth (advance/decline)', INFO.mktBreadth, breadthHtml(adv, dec)),
        chartCard('Top movers (% change)', INFO.mktMovers, barsHtml(movers, { signed: true, fmt: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%' })),
        cDist(all, 'exchange', 'Instruments by exchange', INFO.mktKPI, { n: 6 }),
      ];
      return { kpis, charts, kpiInfo: INFO.mktKPI };
    },
    'nagina_booth_results.csv': (all) => {
      // focus on the latest election year present
      const years = [...countBy(all, 'election_year').keys()].map(Number).filter(Boolean).sort((a, b) => b - a);
      const latest = years[0];
      const rows = latest ? all.filter(r => Number(r.election_year) === latest) : all;
      const partyWins = topPairs(countBy(rows, 'winning_party'), 1);
      const lead = partyWins.length ? partyWins[0][0] : '—';
      const margins = rows.map(r => (toNum(r.winner_vote_share) || 0) - (toNum(r.runner_up_vote_share) || 0)).filter(m => m > 0);
      const marginal = margins.filter(m => m < 5).length;
      const avgShare = rows.length ? (rows.reduce((a, r) => a + (toNum(r.winner_vote_share) || 0), 0) / rows.length) : 0;
      const kpis = [
        kpi('Booths', rows.length.toLocaleString(), latest ? 'in ' + latest : 'all years'),
        kpi('Leading Party', lead, 'most booths led'),
        kpi('Marginal Booths', String(marginal), 'margin < 5 pp', 'sig-amber'),
        kpi('Avg Winner Share', avgShare.toFixed(1) + '%', 'of valid votes'),
      ];
      const marginBuckets = countByFn(rows, r => { const m = (toNum(r.winner_vote_share) || 0) - (toNum(r.runner_up_vote_share) || 0); if (m <= 0) return null; return m < 5 ? '< 5 pp' : m < 10 ? '5–10' : m < 20 ? '10–20' : m < 40 ? '20–40' : '40+ pp'; });
      const marginPairs = ['< 5 pp', '5–10', '10–20', '20–40', '40+ pp'].map(k => [k, marginBuckets.get(k) || 0]).filter(p => p[1]);
      const charts = [
        chartCard('Booths won by party', INFO.boothParty, barsHtml(topPairs(countBy(rows, 'winning_party'), 8), { filterCol: 'winning_party', total: rows.length })),
        chartCard('Competitiveness (victory margin)', INFO.boothMargin, barsHtml(marginPairs, {})),
      ];
      return { kpis, charts, kpiInfo: INFO.boothKPI };
    },
    'national_tender_aggregator.csv': (all) => {
      const totalVal = all.reduce((a, r) => a + parseINR(r.value_inr), 0);
      const soon = all.filter(r => { const d = new Date(String(r.deadline).replace(/-/g, ' ')); return !isNaN(d) && (d - Date.now()) <= 14 * 864e5 && (d - Date.now()) > 0; }).length;
      const kpis = [
        kpi('Tenders', String(all.length), 'live/tracked'),
        kpi('Total Value', '₹' + fmtCr(totalVal), 'estimated'),
        kpi('Closing ≤14d', String(soon), 'deadline soon', 'sig-amber'),
        kpi('Sectors', String(countBy(all, 'sector').size), 'covered'),
      ];
      const bySectorVal = new Map();
      all.forEach(r => { const s = (r.sector || 'Other').trim(); bySectorVal.set(s, (bySectorVal.get(s) || 0) + parseINR(r.value_inr)); });
      const valPairs = [...bySectorVal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      const charts = [
        cDist(all, 'sector', 'Tenders by sector', INFO.tenderSector, { n: 8 }),
        chartCard('Procurement value by sector', INFO.tenderValue, barsHtml(valPairs, { fmt: v => '₹' + fmtCr(v) })),
        chartCard('By status', INFO.tenderKPI, barsHtml(topPairs(countBy(all, 'status'), 6), { colorize: true, filterCol: 'status', total: all.length })),
      ];
      return { kpis, charts, kpiInfo: INFO.tenderKPI };
    },
    'national_regulatory_watch.csv': (all) => {
      const byReg = countBy(all, 'regulator');
      const dates = all.map(r => new Date(String(r.date))).filter(d => !isNaN(d));
      const latest = dates.length ? new Date(Math.max(...dates)) : null;
      const last30 = latest ? all.filter(r => { const d = new Date(String(r.date)); return !isNaN(d) && (latest - d) <= 30 * 864e5; }).length : 0;
      const top = topPairs(byReg, 1);
      const kpis = [
        kpi('Actions', String(all.length), 'notifications/orders'),
        kpi('Regulators', String(byReg.size), 'tracked'),
        kpi('Last 30 Days', String(last30), 'recent actions', 'sig-amber'),
        kpi('Most Active', top.length ? top[0][0] : '—', top.length ? top[0][1] + ' actions' : ''),
      ];
      const charts = [
        chartCard('Actions by regulator', INFO.regBody, barsHtml(topPairs(byReg, 8), { filterCol: 'regulator', total: all.length })),
        cSparkYear(all, 'date', 'Regulatory cadence', INFO.regTrend, { last: 8 }),
      ];
      return { kpis, charts, kpiInfo: INFO.regKPI };
    },
    'national_agmut_transfers.csv': (all) => transfersViz(all),
    'up_bureaucrat_transfers.csv': (all) => transfersViz(all),
  };

  function mpLike(all, nameKey, INFO) {
    const qNums = all.map(r => toNum(r.questions_asked)).filter(v => v != null).sort((a, b) => a - b);
    const median = qNums.length ? qNums[Math.floor(qNums.length / 2)] : 0;
    const withAtt = all.filter(r => toNum(r.attendance_pct) != null).length;
    const kpis = [
      kpi('Members', all.length.toLocaleString(), 'tracked'),
      kpi('Median Questions', String(median), 'per member'),
      kpi('Parties', String(countBy(all, 'party').size), 'represented'),
      kpi('Attendance Data', pct(withAtt, all.length) + '%', 'of members', withAtt ? '' : 'sig-red'),
    ];
    const byParty = {};
    all.forEach(r => { const p = (r.party || '').trim(); if (!p) return; const q = toNum(r.questions_asked); byParty[p] = byParty[p] || { n: 0, q: 0 }; byParty[p].n++; if (q != null) byParty[p].q += q; });
    const partyAvg = Object.entries(byParty).filter(([, v]) => v.n >= 5).map(([p, v]) => [p, Math.round(v.q / v.n)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const buckets = countByFn(all, r => { const q = toNum(r.questions_asked); if (q == null) return null; return q === 0 ? '0' : q <= 50 ? '1–50' : q <= 150 ? '51–150' : q <= 300 ? '151–300' : '300+'; });
    const bucketPairs = ['0', '1–50', '51–150', '151–300', '300+'].map(k => [k, buckets.get(k) || 0]).filter(p => p[1]);
    const charts = [
      chartCard('Legislative activity by party (avg questions)', INFO.mpActivity, barsHtml(partyAvg, {})),
      chartCard('Engagement distribution', INFO.mpDist, barsHtml(bucketPairs, {})),
      cDist(all, 'party', 'Members by party', INFO.mpKPI, { n: 8 }),
    ];
    return { kpis, charts, kpiInfo: INFO.mpKPI };
  }
  function transfersViz(all) {
    const dates = all.map(r => new Date(String(r.order_date).replace(/-/g, ' '))).filter(d => !isNaN(d));
    const latest = dates.length ? new Date(Math.max(...dates)) : null;
    const recent = latest ? all.filter(r => { const d = new Date(String(r.order_date).replace(/-/g, ' ')); return !isNaN(d) && (latest - d) <= 90 * 864e5; }).length : 0;
    const jurKey = all[0] && ('jurisdiction' in all[0]) ? 'jurisdiction' : 'cadre';
    const kpis = [
      kpi('Transfers', String(all.length), 'posting changes'),
      kpi(prettyKey(jurKey) + 's', String(countBy(all, jurKey).size), 'covered'),
      kpi('Last 90 Days', String(recent), 'recent moves', 'sig-amber'),
      kpi('Batches', String(countBy(all, 'batch_year').size), 'seniority span'),
    ];
    const charts = [
      chartCard('Transfers by ' + jurKey, INFO.transferJur, barsHtml(topPairs(countBy(all, jurKey), 8), {})),
      chartCard('Officers by batch year', INFO.transferBatch, barsHtml(topPairs(countBy(all, 'batch_year'), 8), {})),
    ];
    return { kpis, charts, kpiInfo: INFO.transferKPI };
  }

  /* ============ generic fallback ============ */
  const PRIORITY_CAT = /stage|status|category|sector|region|party|type|state|ministry|court|cadre|reservation|result|winner|stance|department|instrument|scheme|priority|topic|regulator/i;
  const PRIORITY_DATE = /date|since|started|introduced|completion|assent|year|as_on|updated|filed|decided|deadline|reported/i;
  function analyzeColumns(rows) {
    // Column-TYPE detection only — charts count the full dataset separately.
    // A stride sample bounds the per-cell regex work on 5–10k-row tables
    // (this ran as a ~500ms main-thread task) while preserving the ratios
    // the pickers score on; nonEmpty is scaled back to full-dataset terms.
    let sample = rows;
    if (rows.length > 1000) {
      const step = Math.ceil(rows.length / 1000);
      sample = [];
      for (let si = 0; si < rows.length; si += step) sample.push(rows[si]);
    }
    const scale = rows.length / (sample.length || 1);
    const keys = Object.keys(sample[0] || {}); const N = sample.length;
    return keys.map(k => {
      let ne = 0, len = 0, yr = 0; const distinct = new Set();
      for (let i = 0; i < N; i++) { const v = String(sample[i][k] == null ? '' : sample[i][k]).trim(); if (!v) continue; ne++; len += v.length; if (distinct.size < 200) distinct.add(v); if (/\b(19|20)\d{2}\b/.test(v)) yr++; }
      return { k, distinct: distinct.size, nonEmpty: Math.round(ne * scale), avgLen: ne ? len / ne : 0, yearRatio: ne ? yr / ne : 0 };
    });
  }
  function pickCategorical(stats, N, exclude) {
    let best = null, bs = -1e9;
    stats.forEach(s => {
      if (exclude && exclude.has(s.k)) return; if (!s.nonEmpty) return;
      let sc = 0;
      if (s.distinct >= 2 && s.distinct <= 40) sc += (s.distinct <= 14 ? 32 : 16); else sc -= 20;
      if (s.avgLen < 26) sc += 10; if (s.avgLen > 45) sc -= 30;
      if (PRIORITY_CAT.test(s.k)) sc += 26;
      sc += (s.nonEmpty / N) * 10;
      if (s.distinct === s.nonEmpty && s.nonEmpty > 5) sc -= 45;
      if (sc > bs) { bs = sc; best = s; }
    });
    return bs > 5 ? best : null;
  }
  function pickDate(stats) { let best = null, bs = -1e9; stats.forEach(s => { if (s.yearRatio < 0.55 || !s.nonEmpty) return; let sc = s.yearRatio * 20; if (PRIORITY_DATE.test(s.k)) sc += 20; if (sc > bs) { bs = sc; best = s; } }); return best; }
  function genericViz(f, all) {
    // Auto-derived REAL analytics for any dataset without a hand-written spec:
    // share-of-top KPI, year-over-year momentum, cross-tab heatmap — never bare counts.
    const csv = f.dataSource.csv;
    const rows = all.length > 20000 ? all.slice(0, 20000) : all;
    const stats = analyzeColumns(rows);
    const cat = pickCategorical(stats, rows.length, null);
    const date = pickDate(stats);
    const cat2 = pickCategorical(stats, rows.length, new Set([cat && cat.k].filter(Boolean)));
    const kpis = [kpi('Records', all.length.toLocaleString(), 'tracked in this module')];
    if (cat) {
      const tp = topPairs(countBy(rows, cat.k), 1)[0];
      if (tp) kpis.push(kpi('Top ' + prettyKey(cat.k), '<span style="font-size:16px">' + esc(String(tp[0]).slice(0, 20)) + '</span>', pct(tp[1], rows.length) + '% of records'));
    }
    if (date) {
      const yc = {};
      rows.forEach(r => { const m = String(r[date.k] || '').match(/(19|20)\d{2}/); if (m) yc[m[0]] = (yc[m[0]] || 0) + 1; });
      const yrs = Object.keys(yc).sort(); const last = yrs[yrs.length - 1], prev = yrs[yrs.length - 2];
      if (last && prev) { const dl = yc[last] - yc[prev]; kpis.push(kpi(last + ' momentum', (dl >= 0 ? '\u25b2 ' : '\u25bc ') + Math.abs(dl), 'vs ' + prev + ' (' + yc[prev] + ' records)', dl >= 0 ? 'sig-green' : 'sig-red')); }
      else if (last) kpis.push(kpi('Latest year', last, yc[last] + ' records'));
    }
    if (cat2) kpis.push(kpi(prettyKey(cat2.k), String(cat2.distinct) + (cat2.distinct >= 200 ? '+' : ''), 'distinct tracked'));
    if (kpis.length < 4 && cat) kpis.push(kpi('Classified', pct(rows.filter(r => String(r[cat.k] || '').trim()).length, rows.length) + '%', 'records carry ' + prettyKey(cat.k)));
    const charts = [];
    if (cat) charts.push(cDist(rows, cat.k, 'By ' + prettyKey(cat.k), INFO.genericDist(csv), { n: 8, colorize: /stage|status|trend|intensity|state/i.test(cat.k) }));
    if (date) charts.push(cSparkYear(rows, date.k, 'Records over time', INFO.genericTime(csv), { last: 12 }));
    if (cat2) charts.push(cDist(rows, cat2.k, 'By ' + prettyKey(cat2.k), INFO.genericDist(csv), { n: 8 }));
    if (cat && cat2 && cat.distinct <= 12 && cat2.distinct <= 10) {
      try { charts.push(chartCard('Concentration \u2014 ' + prettyKey(cat.k) + ' \u00d7 ' + prettyKey(cat2.k), INFO.genericDist(csv), matrixHtml(rows, cat.k, cat2.k, { n: 10 }))); } catch (e) { }
    }
    return { kpis, charts: charts.filter(Boolean), kpiInfo: INFO.genericKPI(csv, all.length) };
  }

  function buildVizSections(f) {
    const ds = f && f.dataSource; if (!ds || !ds.csv) return null;
    const all = CSV()[ds.csv] || []; if (!all.length) return null;
    try {
      const spec = VIZ_SPECS[ds.csv];
      if (spec) { const out = spec(all, f); return { kpis: out.kpis || [], charts: (out.charts || []).filter(Boolean), kpiInfo: out.kpiInfo || INFO.genericKPI(ds.csv, all.length) }; }
      return genericViz(f, all);
    } catch (e) { return genericViz(f, all); }
  }
  function vizHtml(f) {
    const s = buildVizSections(f);
    if (!s) return `<div class="niy-viz-empty">No live dataset is wired to this module yet. Analytics appear once its pipeline connects.</div>`;
    return `<div class="niy-kpis-wrap"><div class="niy-kpis-hd"><span>Key Indicators</span>${infoIcon(s.kpiInfo)}</div><div class="niy-kpis">${s.kpis.join('')}</div></div>` +
      (s.charts.length ? `<div class="niy-charts">${s.charts.join('')}</div>` : '');
  }

  /* ============ multi-pane workspace (feed | analytics/AI) ============ */
  let layoutRatio = 58, collapse = '', workMode = 'analytics'; // collapse: ''|only-feed|only-work
  function loadLayout() {
    try {
      const r = +localStorage.getItem('niyLayoutRatio'); if (r >= 22 && r <= 82) layoutRatio = r;
      const c = localStorage.getItem('niyCollapse'); if (c === 'only-feed' || c === 'only-work' || c === '') collapse = c;
      const wm = localStorage.getItem('niyWorkMode'); if (wm === 'ai' || wm === 'analytics') workMode = wm;
    } catch (e) { }
  }
  function saveLayout() { try { localStorage.setItem('niyLayoutRatio', String(layoutRatio)); localStorage.setItem('niyCollapse', collapse); localStorage.setItem('niyWorkMode', workMode); } catch (e) { } }
  function currentFeature() { if (activeTier === 'datastudio' || activeTier === 'ndesk') return null; try { return featuresForTier(activeTier)[activeIndex] || null; } catch (e) { return null; } }
  function isSplitTier() { return activeTier !== 'datastudio' && activeTier !== 'ndesk'; }

  function applySplitRatio(split) { const feed = split.querySelector('.niy-col-feed'), work = split.querySelector('.niy-col-work'); if (feed) feed.style.flexBasis = layoutRatio + '%'; if (work) work.style.flexBasis = (100 - layoutRatio) + '%'; }
  function applyState(split) {
    split.classList.remove('only-feed', 'only-work'); if (collapse) split.classList.add(collapse);
    const fb = split.querySelector('[data-max="feed"]'), wb = split.querySelector('[data-max="work"]');
    if (fb) { fb.textContent = collapse === 'only-feed' ? '⤡' : '⤢'; fb.title = collapse === 'only-feed' ? 'Restore split' : 'Maximize feed'; }
    if (wb) { wb.textContent = collapse === 'only-work' ? '⤡' : '⤢'; wb.title = collapse === 'only-work' ? 'Restore split' : 'Maximize this pane'; }
  }

  // Divider drag — pointer events for a fluid, high-FPS resize.
  let dragging = false, dragSplit = null;
  document.addEventListener('mousemove', e => { if (!dragging || !dragSplit) return; const r = dragSplit.getBoundingClientRect(); let p = (e.clientX - r.left) / r.width * 100; p = Math.max(22, Math.min(82, p)); layoutRatio = Math.round(p); applySplitRatio(dragSplit); });
  document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; document.body.classList.remove('niy-resizing'); if (dragSplit) { const d = dragSplit.querySelector('.niy-divider'); if (d) d.classList.remove('drag'); } saveLayout(); });

  function setWorkMode(mode, focus) {
    workMode = mode; saveLayout();
    const split = document.querySelector('#detail .niy-split'); if (!split) return;
    if (mode === 'ai' && collapse === 'only-feed') { collapse = ''; applyState(split); }
    split.classList.toggle('work-ai', mode === 'ai');
    split.querySelectorAll('.niy-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const pa = split.querySelector('.niy-pane-analytics'), pai = split.querySelector('.niy-pane-ai');
    if (pa) pa.hidden = mode !== 'analytics';
    if (pai) pai.hidden = mode !== 'ai';
    const clr = split.querySelector('.niy-ai-clear'); if (clr) clr.hidden = mode !== 'ai';
    if (mode === 'ai') { renderAiContext(); renderAiLog(true); if (focus) { const inp = split.querySelector('.niy-ai-input'); if (inp) setTimeout(() => inp.focus(), 30); } }
  }

  function layoutDetail() {
    if (!isSplitTier()) return;
    const detail = document.getElementById('detail'); if (!detail) return;
    const head = detail.querySelector('.detail-head'); if (!head) return;
    const f = currentFeature(); if (!f) return;
    const key = activeTier + '|' + activeIndex;
    if (detail.dataset.niyKey === key && detail.querySelector('.niy-split')) return;
    try {
      detail.dataset.niyKey = key;
      compactToolbar(detail);
      // Merge the filter toolbar INTO the title row so the two bands become one
      // — reclaims a full row of vertical space for the content panes.
      const tb = detail.querySelector('.toolbar');
      if (tb && tb.parentElement !== head) { head.appendChild(tb); head.classList.add('niy-head-merged'); }
      const stale = detail.querySelector('.niy-split'); if (stale) stale.remove();
      detail.classList.add('niy-laid-out');

      const split = document.createElement('div'); split.className = 'niy-split';
      const feed = document.createElement('div'); feed.className = 'niy-col niy-col-feed';
      const divider = document.createElement('div'); divider.className = 'niy-divider'; divider.title = 'Drag to resize · double-click to reset';
      const work = document.createElement('div'); work.className = 'niy-col niy-col-work';
      const hasData = f.dataSource && f.dataSource.csv && (CSV()[f.dataSource.csv] || []).length;

      feed.innerHTML = `<div class="niy-col-head"><span class="niy-col-title">Live Feed</span><button class="niy-col-toggle" data-max="feed" type="button">⤢</button></div>`;
      work.innerHTML = `<div class="niy-work-head">
          <div class="niy-work-modes">
            <button class="niy-mode" data-mode="analytics" type="button">Analytics</button>
            <button class="niy-mode" data-mode="ai" type="button">AI Workspace</button>
          </div>
          <div class="niy-work-tools">
            <span class="niy-cf-chip" hidden></span>
            <button class="niy-ai-clear" data-act="clear-chat" type="button" hidden title="Clear conversation">Clear</button>
            <button class="niy-col-toggle" data-max="work" type="button">⤢</button>
          </div>
        </div>
        <div class="niy-work-body">
          <div class="niy-pane niy-pane-analytics"></div>
          <div class="niy-pane niy-pane-ai" hidden>
            <div class="niy-ai-context"></div>
            <div class="niy-ai-log"></div>
            <div class="niy-ai-input-row"><textarea class="niy-ai-input" rows="1" placeholder="Ask a research question, or drag Live Feed rows in as context…"></textarea><button class="ai-web-toggle" type="button" aria-pressed="true"><span class="aiwt-i">🌐</span><span class="aiwt-lbl">Web</span></button><button class="niy-ai-send" type="button">Ask</button></div>
          </div>
        </div>`;

      const feedBody = document.createElement('div'); feedBody.className = 'niy-col-body';
      Array.from(detail.children).forEach(ch => {
        if (ch === head) return;
        if (ch.classList && (ch.classList.contains('toolbar') || ch.classList.contains('toolbar-msg') || ch.classList.contains('niy-split'))) return;
        feedBody.appendChild(ch);
      });
      const primaryArea = feedBody.querySelector('#dataArea');
      const primaryLabel = primaryArea && primaryArea.previousElementSibling;
      if (primaryLabel && primaryLabel.classList && primaryLabel.classList.contains('section-label')) primaryLabel.classList.add('niy-hide');
      feed.appendChild(feedBody);

      split.appendChild(feed); split.appendChild(divider); split.appendChild(work);
      detail.appendChild(split);

      // analytics content + entrance animation
      const anaPane = work.querySelector('.niy-pane-analytics');
      anaPane.innerHTML = vizHtml(f);
      animateBars(anaPane);

      applySplitRatio(split); applyState(split);
      divider.addEventListener('mousedown', e => { dragging = true; dragSplit = split; divider.classList.add('drag'); document.body.classList.add('niy-resizing'); e.preventDefault(); });
      divider.addEventListener('dblclick', () => { layoutRatio = 58; collapse = ''; applySplitRatio(split); applyState(split); saveLayout(); });
      split.querySelectorAll('.niy-col-toggle').forEach(btn => btn.addEventListener('click', () => {
        const w = btn.dataset.max;
        if (w === 'feed') collapse = (collapse === 'only-feed') ? '' : 'only-feed';
        else collapse = (collapse === 'only-work') ? '' : 'only-work';
        applyState(split); saveLayout();
      }));
      split.querySelectorAll('.niy-mode').forEach(b => b.addEventListener('click', () => setWorkMode(b.dataset.mode, true)));
      const clr = split.querySelector('.niy-ai-clear'); if (clr) clr.addEventListener('click', clearChat);
      const send = split.querySelector('.niy-ai-send'); if (send) send.addEventListener('click', sendAiMessage);
      if (typeof niySyncWebToggles === 'function') niySyncWebToggles();
      const inp = split.querySelector('.niy-ai-input');
      if (inp) { inp.addEventListener('input', () => autoGrow(inp)); inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }); }
      wireDrop(work);
      setWorkMode(workMode, false);
      markFeedDraggable();
    } catch (e) { detail.classList.remove('niy-laid-out'); }
  }

  function compactToolbar(detail) {
    const tb = detail.querySelector('.toolbar'); if (!tb || tb.querySelector('.niy-more')) return;
    const btns = ['exportCsvBtn', 'exportJsonBtn', 'studioBtn'].map(id => tb.querySelector('#' + id)).filter(Boolean);
    if (btns.length < 2) return;
    const wrap = document.createElement('div'); wrap.className = 'niy-more';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'toolbar-btn niy-more-btn'; trigger.textContent = '⋯'; trigger.title = 'Export & more actions';
    const menu = document.createElement('div'); menu.className = 'niy-more-menu'; menu.hidden = true;
    btns.forEach(b => { b.classList.add('niy-more-item'); menu.appendChild(b); });
    trigger.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', () => { menu.hidden = true; });
    wrap.appendChild(trigger); wrap.appendChild(menu); tb.appendChild(wrap);
  }
  function featureCard(f) {
    const csv = f.dataSource && f.dataSource.csv;
    const rows = (csv && CSV()[csv]) || [];
    const fields = { records: rows.length };
    if (rows.length) fields.sample_rows = JSON.stringify(rows.slice(0, 5)).slice(0, 1800);
    return { title: 'VIEW · ' + f.feature, feature: f.feature, tier: activeTier, tierLabel: tierLabel(activeTier), bucket: f.bucket, csv: csv || '', fields };
  }

  /* ============ interactive analytics engine ============ */
  let tipEl;
  function tipNode() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'niyTip'; tipEl.hidden = true; document.body.appendChild(tipEl); } return tipEl; }
  function positionTip(x, y) { const t = tipNode(); const r = t.getBoundingClientRect(); let nx = x + 14, ny = y + 16; if (nx + r.width > innerWidth - 8) nx = x - r.width - 14; if (ny + r.height > innerHeight - 8) ny = y - r.height - 14; t.style.left = Math.max(6, nx) + 'px'; t.style.top = Math.max(6, ny) + 'px'; }
  function showBarTip(row, x, y) {
    const cat = row.dataset.cat, disp = row.dataset.disp, p = row.dataset.pct, rank = row.dataset.rank, of = row.dataset.of, fcol = row.dataset.filterCol;
    const t = tipNode();
    t.innerHTML = `<div class="niy-tip-t">${esc(cat)}</div><div class="niy-tip-v">${esc(disp)}${p && p !== '0' ? ` · <b>${p}%</b> of total` : ''}</div>` +
      `<div class="niy-tip-m">${rank && of ? `Rank ${rank} of ${of}` : ''}${fcol ? `${rank ? ' · ' : ''}click to cross-filter the Live Feed` : ''}</div>`;
    t.hidden = false; positionTip(x, y);
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  let hlCat = null;
  function highlightFeed(cat) {
    if (cat === hlCat) return; hlCat = cat;
    const rows = document.querySelectorAll('.niy-col-feed table.sample tbody tr[data-row-idx]');
    if (rows.length > 900) return; // keep hover lag-free on very large tables
    const needle = cat ? String(cat).toLowerCase() : null;
    rows.forEach(tr => { tr.classList.toggle('niy-feed-hl', !!needle && tr.textContent.toLowerCase().indexOf(needle) !== -1); });
  }
  function updateFilterChip(cat) {
    const chip = document.querySelector('#detail .niy-cf-chip'); if (!chip) return;
    if (!cat) { chip.hidden = true; chip.innerHTML = ''; return; }
    chip.hidden = false; chip.innerHTML = `<span>⚑ ${esc(cat)}</span><button class="niy-cf-x" type="button" aria-label="Clear filter">×</button>`;
    chip.querySelector('.niy-cf-x').addEventListener('click', clearCrossFilter);
  }
  function clearCrossFilter() {
    const rf = document.getElementById('rowFilter'); if (rf) { rf.value = ''; rf.dispatchEvent(new Event('input', { bubbles: true })); }
    document.querySelectorAll('.niy-cf-active').forEach(r => r.classList.remove('niy-cf-active'));
    updateFilterChip(null);
  }
  function crossFilter(mark) {
    const cat = mark.dataset.cat; const rf = document.getElementById('rowFilter'); if (!rf) return;
    const wasActive = mark.classList.contains('niy-cf-active');
    document.querySelectorAll('.niy-cf-active').forEach(r => r.classList.remove('niy-cf-active'));
    if (wasActive) { rf.value = ''; updateFilterChip(null); }
    else { rf.value = cat; mark.classList.add('niy-cf-active'); updateFilterChip(cat); }
    rf.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function animateBars(root) { /* bars render at final width directly now; rAF was unreliable and left charts blank ("vanishing"). No-op kept so all call sites stay valid. */ }
  function initInteractivity() {
    if (document._niyInteractive) return; document._niyInteractive = true;
    document.addEventListener('mouseover', e => {
      const row = e.target.closest('.niy-dist-row[data-cat]'); if (row) { showBarTip(row, e.clientX, e.clientY); if (row.dataset.filterCol) highlightFeed(row.dataset.cat); return; }
      const dot = e.target.closest('.niy-spark-dot'); if (dot) { showBarTip(dot, e.clientX, e.clientY); }
    });
    document.addEventListener('mousemove', e => { if (tipEl && !tipEl.hidden) positionTip(e.clientX, e.clientY); });
    document.addEventListener('mouseout', e => {
      const row = e.target.closest('.niy-dist-row[data-cat], .niy-spark-dot');
      if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) { hideTip(); highlightFeed(null); }
    });
    document.addEventListener('click', e => {
      const mark = e.target.closest('.niy-dist-row.niy-clickable, .niy-spark-dot.niy-clickable');
      if (mark) { crossFilter(mark); }
    });
    // The row-detail modal's "Ask AI" calls a closure-scoped opener we can't
    // reassign — intercept it at capture phase and route into the AI pane,
    // attaching the record itself as grounding context.
    document.addEventListener('click', e => {
      const b = e.target.closest('#rdAskAi'); if (!b || !isSplitTier()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const title = ((document.getElementById('modalTitle') || {}).textContent || 'Record').slice(0, 80);
      const fields = {};
      document.querySelectorAll('#modalBody .row-detail-field').forEach(fd => { const k = fd.querySelector('.rdf-key'), v = fd.querySelector('.rdf-val'); if (k && v) fields[k.textContent.trim()] = v.textContent.trim(); });
      const f = currentFeature() || {};
      const card = { title, feature: f.feature || '', tier: activeTier, tierLabel: tierLabel(activeTier), bucket: f.bucket || '', csv: (f.dataSource && f.dataSource.csv) || '', fields, pdf_url: window.niyCardPdfUrl ? window.niyCardPdfUrl(fields) : '' };
      if (typeof closeInfoModal === 'function') closeInfoModal();
      openAiWorkspace('Analyse this ' + (f.feature || 'record') + ' record and flag what a journalist or analyst should investigate next.', card);
    }, true);
  }

  /* ============ AI workspace (in-pane, persistent) ============ */
  function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  function aiSystem() {
    let ctx = ''; try { ctx = currentContextSummary().detail; } catch (e) { }
    const policy = (typeof AI_POLICY !== 'undefined') ? AI_POLICY : 'Ground answers in the provided data first; never fabricate figures.';
    return 'You are Niyantran AI, a dedicated research analyst embedded in the Niyantran intelligence terminal. Analyse the attached records and the on-screen data first, then supplement with live web data only where needed. ' + policy +
      ' When you rely on a specific record, dataset or attached card, cite it inline (name the dataset/CSV or record title) so the analyst can trace every claim.\n\n' + ctx + (window.NiyAI && window.NiyAI.contextBlock ? window.NiyAI.contextBlock() : '');
  }
  function renderAiLog(scroll) {
    const log = document.querySelector('#detail .niy-pane-ai .niy-ai-log'); if (!log) return;
    const msgs = (typeof globalAiMessages !== 'undefined' ? globalAiMessages : []).filter(m => m.role === 'user' || m.role === 'assistant');
    log.innerHTML = msgs.length
      ? msgs.map(m => `<div class="niy-ai-msg ${m.role === 'assistant' ? 'ai' : 'user'}">${esc(m.content)}</div>`).join('')
      : `<div class="niy-ai-empty"><div class="niy-ai-empty-t">AI Research Workspace</div><div class="niy-ai-empty-d">Ask anything about this section, or drag Live Feed rows in to ground the answer in specific records. Every answer cites its sources; conversations persist until you clear them.</div></div>`;
    if (scroll) log.scrollTop = log.scrollHeight;
  }
  function renderAiContext() {
    const c = document.querySelector('#detail .niy-pane-ai .niy-ai-context'); if (!c) return;
    const cards = window.NiyAI.cards;
    if (!cards.length) { c.innerHTML = `<div class="niy-ai-drop-hint">⊕ Drag Live Feed rows here to attach them as context</div>`; return; }
    c.innerHTML = `<div class="niy-ai-ctx-hd"><span>${cards.length} card${cards.length > 1 ? 's' : ''} attached as context</span><button class="niy-ai-ctx-clear" type="button">Clear</button></div>` +
      `<div class="niy-ai-ctx-chips">${cards.map((cd, i) => `<span class="niy-ai-chip"><span title="${esc(cd.title)}">${esc(cd.title)}</span><button data-i="${i}" type="button" aria-label="Remove">×</button></span>`).join('')}</div>`;
    c.querySelector('.niy-ai-ctx-clear').addEventListener('click', () => window.NiyAI.clear());
    c.querySelectorAll('.niy-ai-chip button').forEach(b => b.addEventListener('click', () => window.NiyAI.removeCard(+b.dataset.i)));
  }
  async function sendAiMessage() {
    const inp = document.querySelector('#detail .niy-pane-ai .niy-ai-input'); if (!inp) return;
    const q = inp.value.trim(); if (!q) return;
    if (typeof globalAiMessages === 'undefined') return;
    inp.value = ''; autoGrow(inp);
    if (!globalAiMessages.length) globalAiMessages.push({ role: 'system', content: aiSystem() });
    globalAiMessages.push({ role: 'user', content: q });
    renderAiLog(true);
    const log = document.querySelector('#detail .niy-pane-ai .niy-ai-log');
    const pend = document.createElement('div'); pend.className = 'niy-ai-msg ai niy-ai-pending'; pend.textContent = 'Analysing sources…';
    if (log) { log.appendChild(pend); log.scrollTop = log.scrollHeight; }
    try { if (window.NiyAI && window.NiyAI.ensurePdfs) { if (window.NiyAI.hasPendingPdfs && window.NiyAI.hasPendingPdfs()) pend.textContent = 'Reading attached PDF…'; await window.NiyAI.ensurePdfs(); } const ans = await callAI(globalAiMessages, { noSearch: !niyWebSearchOn() }); globalAiMessages.push({ role: 'assistant', content: ans }); }
    catch (err) { globalAiMessages.push({ role: 'assistant', content: 'AI unavailable — ' + (err && err.message || err) }); }
    renderAiLog(true);
  }
  function clearChat() { if (typeof globalAiMessages !== 'undefined') globalAiMessages.length = 0; renderAiLog(true); }
  function openAiWorkspace(prefill, card) {
    if (!isSplitTier()) { if (typeof openGlobalAi === 'function') openGlobalAi(); if (prefill) { const i = document.getElementById('globalAiInput'); if (i) { i.value = prefill; i.focus(); } } return; }
    layoutDetail();
    if (card) window.NiyAI.addCard(card);
    setWorkMode('ai', true);
    if (prefill != null && prefill !== '') { const inp = document.querySelector('#detail .niy-pane-ai .niy-ai-input'); if (inp) { inp.value = prefill; autoGrow(inp); inp.focus(); } }
  }
  window.openAiWorkspace = openAiWorkspace;

  /* ============ drag Live Feed rows → AI context ============ */
  let dragRowEl = null;
  function rowElToCard(tr) {
    const f = currentFeature(); if (!f || !tr) return null;
    const table = tr.closest('table'); if (!table) return null;
    const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim());
    const fields = {}; heads.forEach((h, i) => { if (h) fields[h] = cells[i] || ''; });
    const title = (cells.find(c => c) || f.feature).slice(0, 80);
    let pdf_url = ''; { const as = Array.from(tr.querySelectorAll('a[href]')); const pa = as.find(a => /\.pdf(\?|#|$)/i.test(a.getAttribute('href') || '')) || as.find(a => /order|notice|judg|circular|document|pdf|download/i.test(a.textContent || '')); if (pa) pdf_url = pa.href; }
    if (!pdf_url) { try { const d = document.getElementById('detail'); const da = d ? Array.from(d.querySelectorAll('a[href]')) : []; const dp = da.find(a => /\.pdf(\?|#|$)/i.test(a.getAttribute('href') || '')) || da.find(a => /view pdf|download pdf|download/i.test((a.textContent || '').toLowerCase())); if (dp) pdf_url = dp.href; } catch (e) { } }
    if (!pdf_url) { const uv = Object.values(fields).map(v => String(v || '').trim()).find(v => /^https?:\/\/\S+\.pdf(\?|#|$)/i.test(v)); if (uv) pdf_url = uv; }
    return { title, feature: f.feature, tier: activeTier, tierLabel: tierLabel(activeTier), bucket: f.bucket, csv: (f.dataSource && f.dataSource.csv) || '', fields, pdf_url };
  }
  // Delegated + chunked: per-row listeners on a 9k-row feed meant ~18k
  // handlers and a multi-hundred-ms attribute pass on every render.
  let mfdToken = 0;
  function markFeedDraggable() {
    const feed = document.querySelector('.niy-col-feed');
    if (feed && !feed.dataset.niyDragWired) {
      feed.dataset.niyDragWired = '1';
      feed.addEventListener('dragstart', e => {
        const tr = e.target.closest && e.target.closest('tr[data-row-idx]');
        if (!tr || !tr.dataset.niyDrag) return;
        dragRowEl = tr;
        try { e.dataTransfer.setData('text/plain', 'niy-card'); e.dataTransfer.effectAllowed = 'copy'; } catch (x) { }
        const sp = document.querySelector('#detail .niy-split'); if (sp) sp.classList.add('niy-dragging');
      });
      feed.addEventListener('dragend', () => { const sp = document.querySelector('#detail .niy-split'); if (sp) sp.classList.remove('niy-dragging'); });
    }
    const all = document.querySelectorAll('.niy-col-feed table.sample tbody tr[data-row-idx]:not([data-niy-drag])');
    const myTok = ++mfdToken;
    let i = 0;
    (function step() {
      if (myTok !== mfdToken) return;
      const stop = Math.min(i + 1200, all.length);
      for (; i < stop; i++) { all[i].dataset.niyDrag = '1'; all[i].setAttribute('draggable', 'true'); }
      if (i < all.length) niyPost(step);
    })();
  }
  function wireDrop(work) {
    work.addEventListener('dragover', e => { if (dragRowEl) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; work.classList.add('niy-drop-over'); } });
    work.addEventListener('dragleave', e => { if (!work.contains(e.relatedTarget)) work.classList.remove('niy-drop-over'); });
    work.addEventListener('drop', e => { e.preventDefault(); work.classList.remove('niy-drop-over'); const card = rowElToCard(dragRowEl); dragRowEl = null; if (card) openAiWorkspace(null, card); });
  }

  /* ============ AI context store (tray + pane + badge) ============ */
  // Extract the readable text of an attached card's source PDF so the AI can
  // READ it before answering. Proxy first (bypasses gov-host CORS on the
  // deployed site), then a direct fetch (standalone / CORS-open hosts). Real
  // text only — a failed/blocked fetch returns '' and the AI is told so.
  window.niyFetchPdfText = async function (url) {
    if (!url || !window.pdfjsLib) return '';
    let buf = null;
    try { const r = await fetch('/api/fetchpdf?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(22000) }); if (r.ok) { const ct = (r.headers.get('content-type') || '').toLowerCase(); if (ct.includes('pdf') || ct.includes('octet')) buf = await r.arrayBuffer(); } } catch (e) { }
    if (!buf || buf.byteLength < 200) { try { const r2 = await fetch(url, { signal: AbortSignal.timeout(22000) }); if (r2.ok) buf = await r2.arrayBuffer(); } catch (e) { } }
    if (!buf || buf.byteLength < 200) return '';
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let text = ''; const maxPages = Math.min(pdf.numPages, 30);
      for (let p = 1; p <= maxPages; p++) { const page = await pdf.getPage(p); const content = await page.getTextContent(); text += content.items.map(it => it.str).join(' ') + '\n'; if (text.length > 40000) break; }
      text = text.trim();
      // Scanned / image-only PDF (no text layer) -> free OCR fallback.
      if (text.replace(/\s/g, '').length < 60) { try { const ocr = await window.niyOcrPdf(pdf); if (ocr && ocr.replace(/\s/g, '').length > text.replace(/\s/g, '').length) text = ocr; } catch (e) { } }
      return text;
    } catch (e) { return ''; }
  };
  // Free OCR for scanned PDFs: render each page to a canvas and recognise it with
  // Tesseract.js (Apache-2.0, unlimited, runs entirely in the user's browser — no
  // API, no cost, no key). Capped to the first pages for responsiveness. Online
  // only (pulls the engine from a CDN); a text PDF never reaches this path.
  window.niyOcrPdf = async function (pdf) {
    if (!window.Tesseract) { try { await window.niyLoadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'); } catch (e) { return ''; } }
    if (!window.Tesseract || !pdf) return '';
    let worker;
    try { worker = await Tesseract.createWorker('eng'); } catch (e) { return ''; }
    let out = ''; const n = Math.min(pdf.numPages, 8);
    try {
      for (let p = 1; p <= n; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const res = await worker.recognize(canvas);
        out += ((res && res.data && res.data.text) || '') + '\n';
        if (out.length > 30000) break;
      }
    } catch (e) { } finally { try { await worker.terminate(); } catch (e) { } }
    return out.trim();
  };
  window.niyLoadScript = function (src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[data-niy-lib="' + src + '"]')) return resolve();
      const s = document.createElement('script'); s.src = src; s.async = true; s.setAttribute('data-niy-lib', src);
      s.onload = function () { resolve(); }; s.onerror = function () { reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
  };
  // Pick the best document/PDF URL out of a record's real fields.
  window.niyCardPdfUrl = function (fields) {
    if (!fields) return '';
    const urls = Object.values(fields).map(v => String(v == null ? '' : v).trim()).filter(v => /^https?:\/\//i.test(v));
    return urls.find(v => /\.pdf(\?|#|$)/i.test(v)) || urls.find(v => /order|notice|judg|circular|document|gazette|affidavit/i.test(v)) || '';
  };

  window.NiyAI = {
    cards: [],
    _pending: {},
    _startPdf(c) { const url = c.pdf_url; if (!url) return; c._pdfState = c._pdfState || 'loading'; if (!this._pending[url]) this._pending[url] = window.niyFetchPdfText(url); this._pending[url].then(txt => { c._pdfText = txt || ''; c._pdfState = txt ? 'ready' : 'empty'; try { renderAiContext(); } catch (e) { } }).catch(() => { c._pdfState = 'error'; }); },
    hasPendingPdfs() { return this.cards.some(c => c.pdf_url && (c._pdfState === 'loading' || c._pdfState === undefined)); },
    async ensurePdfs() { this.cards.forEach(c => { if (c.pdf_url && c._pdfState === undefined) this._startPdf(c); }); const urls = [...new Set(this.cards.filter(c => c.pdf_url).map(c => c.pdf_url))]; await Promise.allSettled(urls.map(u => this._pending[u]).filter(Boolean)); if (typeof globalAiMessages !== 'undefined') this.cards.forEach(c => { if (c._pdfText && !c._pdfPushed) { c._pdfPushed = true; globalAiMessages.push({ role: 'system', content: '[ATTACHED PDF — extracted text of "' + c.title + '" (' + (c.pdf_url || '') + '). Read this fully before answering and cite it as the source document.]\n' + String(c._pdfText).slice(0, 24000) }); } }); return true; },
    _cardText(c) { const f = c.fields || {}; const body = Object.entries(f).slice(0, 40).map(([k, v]) => `${k}: ${v}`).join('\n'); const pdfNote = c.pdf_url ? `\n[Attached source PDF: ${c.pdf_url}${c._pdfState === 'ready' ? ' — full text supplied in a separate note below' : c._pdfState === 'loading' ? ' — being read…' : c._pdfState === 'empty' || c._pdfState === 'error' ? ' — could not be read automatically; use web_fetch on the URL' : ''}]` : ''; return `• ${c.title} — ${c.feature} (${c.tierLabel || c.tier}${c.csv ? ', ' + c.csv : ''})\n${body}${pdfNote}`; },
    contextBlock() { if (!this.cards.length) return ''; return '\n\n=== ATTACHED CARDS (the analyst pinned these records — treat them as a primary source and cite them by title) ===\n' + this.cards.map(c => this._cardText(c)).join('\n\n'); },
    addCard(c) { if (!c) return; this.cards.push(c); this.renderTray(); renderAiContext(); this.updateBadge(); if (c.pdf_url && window.niyFetchPdfText) this._startPdf(c); if (typeof globalAiMessages !== 'undefined' && globalAiMessages.length) globalAiMessages.push({ role: 'system', content: '[The analyst attached another record]\n' + this._cardText(c) }); if (typeof showToast === 'function') showToast('Attached to AI context'); },
    removeCard(i) { this.cards.splice(i, 1); this.renderTray(); renderAiContext(); this.updateBadge(); },
    clear() { this.cards = []; this.renderTray(); renderAiContext(); this.updateBadge(); },
    updateBadge() { const btn = document.getElementById('globalAiBtn'); if (!btn) return; let b = btn.querySelector('.niy-ai-badge'); if (!this.cards.length) { if (b) b.remove(); return; } if (!b) { b = document.createElement('span'); b.className = 'niy-ai-badge'; btn.appendChild(b); } b.textContent = this.cards.length; },
    renderTray() {
      const drawer = document.getElementById('globalAiDrawer'); if (!drawer) return;
      let tray = document.getElementById('niyAiTray');
      if (!tray) { tray = document.createElement('div'); tray.id = 'niyAiTray'; const head = drawer.querySelector('.global-ai-head'); if (head) head.insertAdjacentElement('afterend', tray); else drawer.insertBefore(tray, drawer.firstChild); }
      if (!this.cards.length) { tray.hidden = true; tray.innerHTML = ''; return; }
      tray.hidden = false;
      tray.innerHTML = `<div class="niy-tray-head"><span class="niy-tray-label">${this.cards.length} card${this.cards.length > 1 ? 's' : ''} in context</span><button class="niy-tray-clear" type="button">Clear all</button></div><div class="niy-tray-chips">${this.cards.map((c, i) => `<span class="niy-tray-chip"><span title="${esc(c.title)}">${esc(c.title)}</span><button type="button" data-i="${i}" aria-label="Remove">×</button></span>`).join('')}</div>`;
      tray.querySelector('.niy-tray-clear').addEventListener('click', () => this.clear());
      tray.querySelectorAll('.niy-tray-chip button').forEach(b => b.addEventListener('click', () => this.removeCard(+b.dataset.i)));
    },
  };


  /* ============ sidebar: category consolidation + accordion ============ */
  // Every category must hold >=2 meaningful sub-features. Singleton buckets are
  // merged into a thematically-related sibling (display-time only; FEATURE_DATA
  // is untouched). Result: no category ever shows a single lonely item.
  const BUCKET_REMAP = {
    geopolitics: {
      'Conflict Intelligence': 'Security', 'Defense Intelligence': 'Security', 'Maritime & Border Security': 'Security',
      'Diplomacy & Alliances': 'Diplomacy', 'Diplomacy': 'Diplomacy',
      'News & Media Monitoring': 'Global Resources', 'Comparative Governance': 'Global Resources', 'Intelligence': 'Global Resources',
      'Infra': 'Strategic Assets', 'Strategic Assets': 'Strategic Assets',
      'Geoeconomics': 'Geonomics',
    },
    national: {
      'Public Finance': 'Economy, Finance & Industry', 'Sector & Industry Intelligence': 'Economy, Finance & Industry',
      'Regulatory & Judicial': 'Legislative & Policy Intelligence',
      'News & Media Monitoring': 'Representative & Media Intelligence', 'Representative Intelligence': 'Representative & Media Intelligence',
    },
    state: {
      'Audit & Oversight': 'Public Finance',
      'Electoral Data & Analytics': 'Electoral & Political Analytics', 'Comparative Analytics': 'Electoral & Political Analytics', 'Political Operations Intelligence': 'Electoral & Political Analytics',
      'News & Media Monitoring': 'Representative & Media Intelligence', 'Representative Intelligence': 'Representative & Media Intelligence',
    },
    local: {
      'Audit & Oversight': 'Public Finance', 'Development Indicators': 'Service Delivery', 'News & Media Monitoring': 'Hyperlocal Intelligence',
    },
    judiciary: { 'Legal Research': 'Judicial Analytics' },
    finance: { 'Analytical Tools': 'Macro, Trade & Economy', 'Macro & Economic Indicators': 'Macro, Trade & Economy', 'Trade & Sanctions': 'Macro, Trade & Economy' },
  };
  function remapBucket(tier, bucket) { const m = BUCKET_REMAP[tier]; return (m && m[bucket]) || bucket; }

  function collapseBody(body) {
    if (!body) return;
    if (body.style.maxHeight === 'none' || body.style.maxHeight === '') { body.style.maxHeight = body.scrollHeight + 'px'; requestAnimationFrame(() => { body.style.maxHeight = '0px'; }); }
    else { body.style.maxHeight = '0px'; }
  }
  function openGroup(g, instant) {
    const list = document.getElementById('sidebarList'); if (!list || !g) return;
    list.querySelectorAll('.sidebar-group').forEach(x => {
      const head = x.querySelector('.niy-acc-head'), body = x.querySelector('.niy-acc-body');
      if (x === g) {
        if (head) head.classList.add('open');
        if (!body) return;
        if (instant) { body.style.transition = 'none'; body.style.maxHeight = 'none'; requestAnimationFrame(() => { body.style.transition = ''; }); }
        else {
          body.style.maxHeight = body.scrollHeight + 'px';
          const te = () => { if (head.classList.contains('open')) body.style.maxHeight = 'none'; body.removeEventListener('transitionend', te); };
          body.addEventListener('transitionend', te);
        }
      } else {
        if (head) head.classList.remove('open');
        // instant path: collapse WITHOUT collapseBody's scrollHeight read —
        // that forced a style recalc of every freshly-streamed table row
        // (hundreds of ms on the big tiers) during every tab switch.
        if (instant && body) { body.style.transition = 'none'; body.style.maxHeight = '0px'; requestAnimationFrame(() => { body.style.transition = ''; }); }
        else collapseBody(body);
      }
    });
  }
  function toggleGroup(g) { const head = g.querySelector('.niy-acc-head'); if (head && head.classList.contains('open')) { head.classList.remove('open'); collapseBody(g.querySelector('.niy-acc-body')); } else openGroup(g, false); }
  function groupByName(name) { return Array.from(document.querySelectorAll('#sidebarList .sidebar-group')).find(g => { const n = g.querySelector('.niy-acc-name'); return n && n.textContent === name; }) || null; }

  function enhanceSidebar() {
    const list = document.getElementById('sidebarList'); if (!list) return;
    applyNames();
    if (list.dataset.niyGrouped === '1' && list.querySelector('.niy-acc-body')) return;
    const tier = activeTier;
    const groups = Array.from(list.querySelectorAll('.sidebar-group')); if (!groups.length) return;
    // collect feat-items by remapped category, preserving first-seen order
    const order = []; const map = new Map();
    groups.forEach(g => {
      const label = g.querySelector('.sidebar-group-label');
      const orig = label ? label.textContent.replace(/[▸\s]+$/, '').trim() : '';
      const target = remapBucket(tier, orig);
      if (!map.has(target)) { map.set(target, []); order.push(target); }
      Array.from(g.querySelectorAll('.feat-item')).forEach(it => map.get(target).push(it));
    });
    let activeTarget = null;
    map.forEach((items, name) => { if (items.some(it => it.classList.contains('active'))) activeTarget = name; });
    list.innerHTML = '';
    order.forEach(name => {
      const items = map.get(name);
      const g = document.createElement('div'); g.className = 'sidebar-group';
      const head = document.createElement('div'); head.className = 'sidebar-group-label niy-acc-head';
      head.innerHTML = `<span class="niy-acc-name">${esc(name)}</span><span class="niy-acc-meta"><span class="niy-acc-count">${items.length}</span><span class="niy-acc-chev">▸</span></span>`;
      const body = document.createElement('div'); body.className = 'niy-acc-body';
      items.forEach(it => body.appendChild(it));
      g.appendChild(head); g.appendChild(body); list.appendChild(g);
      head.addEventListener('click', () => toggleGroup(g));
    });
    list.dataset.niyGrouped = '1';
    openGroup(groupByName(activeTarget) || list.querySelector('.sidebar-group'), true);
  }

  /* ============ premium top navigation ============ */
  const TAB_ICONS = {
    geopolitics: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/></svg>',
    national: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3l8 5H4l8-5z"/></svg>',
    state: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    local: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    judiciary: '<svg viewBox="0 0 24 24"><path d="M12 3v18M6 21h12M4 8l4-2 4 2M4 8l-2 5a3 3 0 0 0 6 0L6 8m10 0l4-2M16 8l-2 5a3 3 0 0 0 6 0l-2-5M8 6l8-2"/></svg>',
    finance: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 4 8-8M21 8v5h-5"/></svg>',
    climate: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M18 3v4h-4"/><path d="M9.5 13.5c0-2 1.5-3.5 4.5-4-0.4 3-1.9 4.4-4.5 5z"/></svg>',
    ndesk: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5"/></svg>',
    sports: '<svg viewBox="0 0 24 24"><path d="M8 4.4h8v4.6a4 4 0 0 1-8 0z"/><path d="M8 5.6H5.4a2.7 2.7 0 0 0 2.9 3M16 5.6h2.6a2.7 2.7 0 0 1-2.9 3"/><path d="M12 13v2.6M9.4 19.6h5.2M10.2 15.6h3.6v4h-3.6z"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24"><path d="M4 10h16v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z"/><path d="m4 10-1-3.4L19.4 3l1 3.4z"/><path d="m7.6 9 2.3-3.7M12.4 7.7l2.3-3.7"/></svg>',
    datastudio: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  };
  const LIVE_TIERS = new Set(['geopolitics', 'national', 'state', 'finance']);
  function enhanceTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    if (!tabs.length || document.querySelector('.tab .tab-ico')) return;
    tabs.forEach(t => {
      const tier = t.dataset.tier;
      if (TAB_ICONS[tier]) { const ico = document.createElement('span'); ico.className = 'tab-ico'; ico.innerHTML = TAB_ICONS[tier]; t.insertBefore(ico, t.firstChild); }
      if (LIVE_TIERS.has(tier)) { const d = document.createElement('span'); d.className = 'tab-live'; d.title = 'Live activity in this section'; t.appendChild(d); }
    });
  }

  /* ============================================================
     LIVE TV — official news-channel media-monitoring workspace
     Watch official YouTube Live streams inside the terminal with
     the InTruth fact-checker panel alongside. Add a channel by
     dropping one object below (channelId OR liveUrl OR videoId).
     ============================================================ */
  // The InTruth interface is a Chrome extension, which cannot be iframed into
  // a web page. If InTruth (or any open-source live fact-checker) exposes an
  // embeddable WEB url, set it here and it renders in the right panel verbatim.
  // Left empty, the panel shows a native InTruth surface and does NOT run any
  // Niyantran AI inference (per spec).
  const INTRUTH_URL = '';
  // liveUrl = the channel's current 24x7 live video (embeds reliably and plays;
  // if a stream has ended, YouTube serves that video's recording — never a
  // black frame). channelId is kept as a fallback / for reference. To add or
  // fix a channel, drop in its live watch URL.
  const yt = id => 'https://www.youtube.com/watch?v=' + id;
  const LIVE_TV_CHANNELS = [
    { name: 'DD News', short: 'DD', color: '#C8102E', lang: 'Hindi · English', liveUrl: yt('qD6GkaU2lD0'), channelId: 'UCUB_yGV7wtjWFP_uw3RtT2A' },
    { name: 'NDTV 24x7', short: 'NDTV', color: '#E4002B', lang: 'English', liveUrl: yt('I8643WY0BgA'), channelId: 'UCZFMm1mMw0F81Z37aaEzTUA' },
    { name: 'NDTV India', short: 'ND', color: '#C8102E', lang: 'Hindi', liveUrl: yt('-fQyqVqi7GI'), channelId: 'UCILN0T5If7XcAdIN2gnwoLQ' },
    { name: 'India TV', short: 'ITV', color: '#F58220', lang: 'Hindi', liveUrl: yt('Xmm3Kr5P1Uw'), channelId: 'UCttspZesZIDEwwpVIgoZtWQ' },
    { name: 'Republic TV', short: 'R', color: '#E4002B', lang: 'English', liveUrl: yt('6_lMzaYo-9A'), channelId: 'UCwqusr8YDwM-3mEYTDeJHzw' },
    { name: 'CNN-News18', short: 'N18', color: '#CC0000', lang: 'English', liveUrl: yt('F9srB2yIbB4'), channelId: 'UCef1-8eOpJgud7szVPlZQAQ' },
    { name: 'News18 India', short: '18', color: '#C8102E', lang: 'Hindi', liveUrl: yt('v0RN0CeJ7LI'), channelId: 'UCPP3etACgdUWvizcES1dJ8Q' },
    { name: 'Aaj Tak', short: 'AT', color: '#E11B22', lang: 'Hindi', liveUrl: yt('ChQPEkASCb4'), channelId: 'UCt4t-jeY85JegMlZ-E5UWtA' },
    { name: 'ABP News', short: 'ABP', color: '#ED1C24', lang: 'Hindi', liveUrl: yt('wwYkM7ULSIU'), channelId: 'UCRWFSbif-RFENbBrSiez1DA' },
    { name: 'TV9 Bharatvarsh', short: 'TV9', color: '#1D4E9C', lang: 'Hindi', liveUrl: yt('TjrT2yRHegE'), channelId: 'UCOutOIcn_oho8pyVN3Ng-Pg' },
    { name: 'Times Now', short: 'TN', color: '#C8102E', lang: 'English', liveUrl: yt('Q-3yA6NsTfU'), channelId: 'UC6RJ7-PaXg6TIH2BzZfTV7w' },
    { name: 'Mirror Now', short: 'MN', color: '#6D2E86', lang: 'English', channelId: 'UCWCEYVwSqr7Epo6sSCfUgiw' },
    { name: 'Zee News', short: 'ZEE', color: '#D4111E', lang: 'Hindi', liveUrl: yt('WtocMQLuuHE'), channelId: 'UCIvaYmXn910QMdemBG3v1pQ' },
    { name: 'News24', short: 'N24', color: '#F7941E', lang: 'Hindi', liveUrl: yt('F8GhnUic554'), channelId: 'UCuzS3rPQAYqHcLWqOFuY0pw' },
    { name: 'India Today TV', short: 'IT', color: '#EC1C24', lang: 'English', liveUrl: yt('9NH-hAV3H6M'), channelId: 'UCYPvAwZP8pZhSMW8qs7cVCw' },
    { name: 'CNBC-TV18', short: 'CNBC', color: '#005C9E', lang: 'Business', liveUrl: yt('1_Ih0JYmkjI'), channelId: 'UCmRbHAgG2k2vDUvb3xsEunQ' },
    { name: 'ET Now', short: 'ET', color: '#8E24AA', lang: 'Business', liveUrl: yt('v-HldpGnVT8'), channelId: 'UCI_mwTKUhicNzFrhm33MzBQ' },
    { name: 'WION', short: 'WION', color: '#0A3D62', lang: 'Global', liveUrl: yt('vfszY1JYbMc'), channelId: 'UC_gUM8rL-Lrg6O3adPW9K1g' },
  ];
  window.LIVE_TV_CHANNELS = LIVE_TV_CHANNELS; // exposed so channels can be added at runtime

  function parseYtId(url) { const m = String(url || '').match(/(?:v=|youtu\.be\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; }
  function ytEmbedSrc(ch, opts) {
    opts = opts || {};
    const p = 'autoplay=1&mute=' + (opts.mute === false ? '0' : '1') + '&modestbranding=1&rel=0&playsinline=1';
    if (opts.fallback && ch.fallbackVideoId) return 'https://www.youtube.com/embed/' + ch.fallbackVideoId + '?' + p;
    if (ch.videoId) return 'https://www.youtube.com/embed/' + ch.videoId + '?' + p;
    if (ch.liveUrl) { const v = parseYtId(ch.liveUrl); if (v) return 'https://www.youtube.com/embed/' + v + '?' + p; }
    if (ch.channelId) return 'https://www.youtube.com/embed/live_stream?channel=' + ch.channelId + '&' + p;
    return null;
  }

  // Reliable live playback: YouTube's keyless `embed/live_stream?channel=` is
  // deprecated/flaky, so we resolve the channel's CURRENT live video id via the
  // free YouTube Data API (key stored locally) and embed that. Without a key,
  // the user pastes a live URL per channel. Explicit videoId/liveUrl always win.
  function getYtKey() { try { return localStorage.getItem('niyYtApiKey') || ''; } catch (e) { return ''; } }
  function setYtKey(k) { try { localStorage.setItem('niyYtApiKey', k || ''); } catch (e) { } }
  const liveIdCache = {};
  async function resolveLiveVideoId(ch) {
    const key = getYtKey(); if (!key || !ch.channelId) return null;
    const c = liveIdCache[ch.channelId]; if (c && Date.now() - c.ts < 300000) return c.v;
    const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=id&eventType=live&type=video&channelId=' + encodeURIComponent(ch.channelId) + '&key=' + encodeURIComponent(key));
    if (!res.ok) { const e = new Error('api ' + res.status); e.status = res.status; throw e; }
    const data = await res.json();
    const v = (data && data.items && data.items[0] && data.items[0].id && data.items[0].id.videoId) || null;
    if (v) liveIdCache[ch.channelId] = { v: v, ts: Date.now() };
    return v;
  }
  function ltvVideoSrc(id) { return 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&modestbranding=1&rel=0&playsinline=1'; }

  let ltvBuilt = false, ltvActive = null, ltvToken = 0, ltvPlayer = null, ytApiP = null;
  // Load YouTube's IFrame Player API once. Plain <iframe src> embeds often show
  // a black frame because YouTube can't validate the embedding origin; the API
  // passes origin correctly and is the reliable way to embed + switch streams.
  function ensureYtApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiP) return ytApiP;
    ytApiP = new Promise(res => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (typeof prev === 'function') { try { prev(); } catch (e) { } } res(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
    });
    return ytApiP;
  }
  function buildLiveTv() {
    if (ltvBuilt) return; ltvBuilt = true;
    const o = document.createElement('div'); o.id = 'niyLiveTv'; o.hidden = true;
    o.innerHTML = `
      <div class="ltv-topbar">
        <div class="ltv-brand">NIYANTRAN <span>LIVE TV</span></div>
        <div class="ltv-now" hidden></div>
        <div class="ltv-spacer"></div>
        <div class="ltv-hint">Official live news · Live fact-check · <span style="color:var(--signal-green)">BUILD S14 · collapsible</span></div>
        <button class="ltv-close" type="button" aria-label="Close Live TV">✕</button>
      </div>
      <div class="ltv-strip" role="tablist" aria-label="Channels"></div>
      <div class="ltv-viewer">
        <div class="ltv-stage">
          <div class="ltv-video-wrap">
            <div class="ltv-video" id="ltvPlayerHost"></div>
            <div class="ltv-offline" hidden></div>
          </div>
          <div class="ltv-statusbar">
            <span class="ltv-sb-live"><span class="ltv-dot"></span> LIVE</span>
            <span class="ltv-sb-name"></span>
            <span class="ltv-sb-state"></span>
            <span class="ltv-sb-note">If a channel is off-air, YouTube shows its latest available broadcast.</span>
          </div>
        </div>
        <aside class="ltv-intruth">
          <div class="ltv-intruth-head"><span class="ltv-it-logo">✓</span> Live Intelligence <span class="ltv-it-tag">FACT-CHECK</span><span class="ltv-head-actions"><button class="ltv-head-btn ltv-settings-btn" type="button" title="Use your own API key (smarter model)" aria-label="Settings">⚙</button><button class="ltv-head-btn ltv-collapse-btn" type="button" title="Minimize panel" aria-label="Minimize panel">⟩</button></span></div>
          <div class="ltv-intruth-body"></div>
        </aside>
        <button class="ltv-panel-reopen" type="button" title="Show fact-check panel">✓ Fact-check</button>
      </div>`;
    document.body.appendChild(o);
    o.querySelector('.ltv-close').addEventListener('click', closeLiveTv);
    renderStrip();
    renderIntruthPanel();
    const cbtn = o.querySelector('.ltv-collapse-btn'), rbtn = o.querySelector('.ltv-panel-reopen'), sbtn = o.querySelector('.ltv-settings-btn');
    if (cbtn) cbtn.addEventListener('click', () => o.classList.add('ltv-panel-collapsed'));
    if (rbtn) rbtn.addEventListener('click', () => o.classList.remove('ltv-panel-collapsed'));
    if (sbtn) sbtn.addEventListener('click', () => NiyLive.openSettings());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !o.hidden) closeLiveTv(); });
  }
  function renderStrip() {
    const strip = document.querySelector('#niyLiveTv .ltv-strip'); if (!strip) return;
    strip.innerHTML = LIVE_TV_CHANNELS.map((ch, i) => `<button class="ltv-chip${ltvActive === ch ? ' active' : ''}" data-i="${i}" type="button" title="${esc(ch.name)}">
        <span class="ltv-chip-logo" style="background:${ch.color}">${esc(ch.short || ch.name.slice(0, 3))}<span class="ltv-chip-livedot"></span></span>
        <span class="ltv-chip-name">${esc(ch.name)}</span>
      </button>`).join('');
    strip.querySelectorAll('.ltv-chip').forEach(c => c.addEventListener('click', () => openChannel(LIVE_TV_CHANNELS[+c.dataset.i])));
    const act = strip.querySelector('.ltv-chip.active'); if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function injectLiveCss() {
    if (document.getElementById('niy-live-css')) return;
    const s = document.createElement('style'); s.id = 'niy-live-css';
    s.textContent =
        '.ltv-fc-transcript{max-height:150px;overflow-y:auto;font-size:13px;line-height:1.55;color:var(--fg,#e8edf2);background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 12px}'
      + '.ltv-tl{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)}'
      + '.ltv-tl:last-child{border-bottom:0}'
      + '.ltv-tl-o{display:block;color:var(--fg,#e8edf2)}'
      + '.ltv-tl-t{display:block;color:var(--fg-faint,#8a94a0);font-size:12px;margin-top:2px}'
      + '.ltv-tl-wait{color:var(--fg-faint,#8a94a0)}'
      + '.ltv-live-pill{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.02em;padding:2px 8px;border-radius:999px;margin-left:6px;vertical-align:middle}'
      + '.ltv-live-on{background:rgba(35,197,110,.15);color:#43d17f;border:1px solid rgba(35,197,110,.4)}'
      + '.ltv-live-wait{background:rgba(240,180,40,.15);color:#e9b949;border:1px solid rgba(240,180,40,.4)}'
      + '.ltv-live-off{background:rgba(150,150,150,.12);color:#9aa4ad;border:1px solid rgba(150,150,150,.3)}'
      + '.ltv-lang-toggle{display:inline-flex;gap:3px;margin-left:6px;vertical-align:middle}'
      + '.ltv-lang-toggle button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--fg-faint,#8a94a0);font-size:10px;font-weight:600;padding:2px 7px;border-radius:6px;cursor:pointer}'
      + '.ltv-lang-toggle button.on{background:rgba(80,140,255,.18);border-color:rgba(80,140,255,.5);color:#7fb0ff}'
      + '.ltv-fc-card.ltv-fc-live{box-shadow:inset 3px 0 0 rgba(35,197,110,.55)}'
      + '.ltv-live-toggle{float:right;background:rgba(35,197,110,.14);border:1px solid rgba(35,197,110,.42);color:#43d17f;font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;cursor:pointer}'
      + '.ltv-live-toggle.on{background:rgba(228,0,43,.14);border-color:rgba(228,0,43,.45);color:#ff6b6b}'
      + '.ltv-live-toggle:hover{filter:brightness(1.15)}'
      + '.ltv-head-actions{float:right;display:inline-flex;gap:4px}'
      + '.ltv-head-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--fg-muted,#b9c2cc);cursor:pointer;font-size:12px;line-height:1;padding:3px 7px;border-radius:6px}'
      + '.ltv-head-btn:hover{color:var(--fg,#e8edf2);background:rgba(255,255,255,.12)}'
      + '.ltv-viewer{position:relative}'
      + '.ltv-panel-reopen{display:none;position:absolute;top:12px;right:12px;z-index:6;background:rgba(18,22,28,.85);border:1px solid rgba(35,197,110,.45);color:#43d17f;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer}'
      + '#niyLiveTv.ltv-panel-collapsed .ltv-intruth{display:none !important}'
      + '#niyLiveTv.ltv-panel-collapsed .ltv-stage{flex:1 1 100% !important;max-width:100% !important;width:100% !important}'
      + '#niyLiveTv.ltv-panel-collapsed .ltv-panel-reopen{display:inline-block}'
      + '.niy-smart-modal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px}'
      + '.niy-smart-modal[hidden]{display:none !important}'
      + '.niy-smart-card{background:#12161c;border:1px solid rgba(255,255,255,.12);border-radius:14px;max-width:460px;width:100%;padding:20px;color:var(--fg,#e8edf2);font-size:13px;box-shadow:0 20px 60px rgba(0,0,0,.5)}'
      + '.niy-smart-h{display:flex;justify-content:space-between;align-items:center;font-size:16px;font-weight:600;margin-bottom:8px}'
      + '.niy-smart-x{background:none;border:none;color:var(--fg-faint,#8a94a0);font-size:16px;cursor:pointer}'
      + '.niy-smart-p{color:var(--fg-muted,#b9c2cc);line-height:1.5;margin:0 0 12px}'
      + '.niy-smart-card label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint,#8a94a0);margin:10px 0 4px}'
      + '.niy-smart-card input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:var(--fg,#e8edf2);font-size:13px}'
      + '.niy-smart-adv{text-transform:none;letter-spacing:0;opacity:.7}'
      + '.niy-smart-hint{margin-top:8px;font-size:11px;color:var(--fg-faint,#8a94a0);line-height:1.5}'
      + '.niy-smart-hint code{background:rgba(255,255,255,.08);padding:1px 4px;border-radius:4px}'
      + '.niy-smart-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}'
      + '.niy-smart-btns button{padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;border:1px solid transparent}'
      + '.niy-smart-clear{background:none;border:1px solid rgba(255,255,255,.15);color:var(--fg-muted,#b9c2cc)}'
      + '.niy-smart-save{background:#2f6bff;color:#fff}';
    document.head.appendChild(s);
  }
  function renderIntruthPanel() {
    const body = document.querySelector('#niyLiveTv .ltv-intruth-body'); if (!body || body.dataset.built) return;
    body.dataset.built = '1';
    injectLiveCss();
    body.innerHTML = `
      <div class="ltv-it-sec ltv-transcript-sec">
        <div class="ltv-it-sec-h"><span class="ltv-sec-title">Live transcript</span><span class="ltv-live-pill" hidden></span><span class="ltv-lang-toggle"><button type="button" data-l="both" class="on">Both</button><button type="button" data-l="hi">हिं</button><button type="button" data-l="en">EN</button></span><button class="ltv-live-toggle" type="button">● Enable</button></div>
        <div class="ltv-fc-transcript"><span class="ltv-fc-ph">Press <b>Enable</b>, choose <b>this tab</b>, tick <b>Share tab audio</b>, and un-mute the channel. Transcript shows Hindi &amp; English.</span></div>
      </div>
      <div class="ltv-it-sec ltv-fc-claims-sec">
        <div class="ltv-it-sec-h"><span class="ltv-fc-feedlabel">Fact-checks</span><button class="ltv-fc-refresh" type="button" title="Recent published fact-checks" aria-label="Refresh">⟳</button></div>
        <div class="ltv-fc-claims"><span class="ltv-fc-ph">Verified claims from the broadcast appear here.</span></div>
      </div>`;
    const ref = body.querySelector('.ltv-fc-refresh');
    if (ref) ref.addEventListener('click', () => NiyLive.loadFeed());
    const tog = body.querySelector('.ltv-live-toggle');
    if (tog) tog.addEventListener('click', () => NiyLive.toggleLive());
    body.querySelectorAll('.ltv-lang-toggle button').forEach(b => b.addEventListener('click', () => NiyLive.setTLang(b.dataset.l)));
    NiyLive.syncModeUI();
    const inp = body.querySelector('.ltv-it-ask input'), ask = body.querySelector('.ltv-it-ask button');
    if (ask) ask.addEventListener('click', () => NiyLive.checkClaim(inp.value));
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') NiyLive.checkClaim(inp.value); });
  }
  /* ============================================================
     LIVE FACT-CHECK PANEL (cheapest config — NO transcription)
     • Feed: recent PUBLISHED fact-checks (Google Fact Check Tools
       API — free; key held server-side by the factcheck function,
       or client-side via localStorage.niyGoogleFactKey), keyed to
       the channel's topics/language. No audio, no permission.
     • Check a claim: analyst pastes a claim → a published verdict
       if one exists, else an AI assessment via the free NVIDIA
       Nemotron function (panelLLM). Clearly labelled.
     • Context: a 2-sentence channel note via the same AI.
     No Whisper, no tab-share, no Claude, no cost for the viewer.
     ============================================================ */
  /* ---- LLM router: prefer the free NVIDIA Nemotron proxy (a Netlify Function
     that holds the key server-side — no CORS, key never in the browser),
     fall back to the terminal AI (Anthropic) if the function isn't deployed ---- */
  let manthanUp = null; // null unknown · true reachable · false absent
  async function callManthan(messages, opts) {
    opts = opts || {};
    let res;
    try { res = await fetch('/api/manthan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'), content: m.content })), model: opts.model, max_tokens: opts.maxTokens || 700, temperature: opts.temperature }) }); }
    catch (e) { manthanUp = false; throw new Error('manthan-absent'); } // network error → treat as not deployed
    if (res.status === 404 || res.status === 501 || res.status === 405) { manthanUp = false; throw new Error('manthan-absent'); }
    let data = {}; try { data = await res.json(); } catch (e) { manthanUp = false; throw new Error('manthan-absent'); } // non-JSON = not our function
    if (!res.ok || data.error) throw new Error(data.error || ('Manthan ' + res.status));
    manthanUp = true; return (data.text || '').trim();
  }
  function anthropicReady() { return typeof callAI === 'function' && (typeof getStoredApiKey !== 'function' || !!getStoredApiKey()); }
  /* Optional BYO "smarter model" — the viewer can paste their own OpenAI-compatible
     API key (OpenAI, Groq, …) to run the fact-checks / translation on a stronger
     model. Stored client-side only. Preferred over the built-in free model. */
  function smartReady() { try { return !!(localStorage.getItem('niySmartKey') || '').trim(); } catch (e) { return false; } }
  async function callSmart(messages, opts) {
    opts = opts || {};
    let key = '', base = '', model = '';
    try { key = (localStorage.getItem('niySmartKey') || '').trim(); base = (localStorage.getItem('niySmartBase') || '').trim(); model = (localStorage.getItem('niySmartModel') || '').trim(); } catch (e) { }
    if (!key) throw new Error('no-smart');
    base = (base || 'https://api.openai.com/v1').replace(/\/+$/, '');
    model = model || 'gpt-4o-mini';
    const r = await fetch(base + '/chat/completions', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'), content: m.content })), max_tokens: opts.maxTokens || 700, temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2 })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data && data.error && data.error.message) || ('smart-model ' + r.status));
    return ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
  }
  async function panelLLM(messages, opts) {
    if (smartReady()) { try { return await callSmart(messages, opts); } catch (e) { /* fall back to built-in */ } }
    if (manthanUp !== false) { try { return await callManthan(messages, opts); } catch (e) { if (e.message !== 'manthan-absent' && !anthropicReady()) throw e; } }
    if (anthropicReady()) return await callAI(messages, opts);
    throw new Error('No AI available — the built-in AI function isn’t reachable and no key is set.');
  }
  function llmReady() { return smartReady() || manthanUp !== false || anthropicReady(); }

  /* ---- Google Fact Check Tools search: try the same-origin function first
     (key hidden server-side), then a client-side key from localStorage
     (niyGoogleFactKey). Returns {claims:[...]} or null. ---- */
  let factFn = null; // null unknown · true up · false absent/no-key
  async function factSearch(query, lang) {
    query = (query || '').toString().slice(0, 300);
    if (factFn !== false) {
      try {
        const res = await fetch('/api/factcheck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, languageCode: lang || 'en' }) });
        if (res.status === 404 || res.status === 501 || res.status === 405) { factFn = false; }
        else {
          const d = await res.json().catch(() => ({}));
          if (d && d.error === 'no-key') { factFn = false; }            // deployed but unconfigured → try a client key
          else if (d && Array.isArray(d.claims)) { factFn = true; return d; }
          else if (d && d.error) { factFn = true; return { claims: [] }; } // upstream error, function is live
        }
      } catch (e) { factFn = false; }
    }
    let key = ''; try { key = localStorage.getItem('niyGoogleFactKey') || ''; } catch (e) { }
    if (!key) return null;
    try {
      const u = 'https://factchecktools.googleapis.com/v1alpha1/claims:search?query=' + encodeURIComponent(query) + '&languageCode=' + encodeURIComponent(lang || 'en') + '&pageSize=10&key=' + encodeURIComponent(key);
      const res = await fetch(u); if (!res.ok) return null; return await res.json();
    } catch (e) { return null; }
  }

  const NIY_FC_TOPICS = ['Narendra Modi', 'Rahul Gandhi', 'GST', 'Supreme Court India', 'India election', 'inflation India', 'Adani', 'reservation India', 'Parliament India', 'RBI India', 'unemployment India', 'farmers India', 'vaccine India', 'India China border'];
  function niyShuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  const NiyLive = {
    channel: null, curVideoId: null, feedToken: 0,
    ws: null, wsState: 'off', pendingWatch: null,
    tlines: [], pending: '', liveSeen: [], extracting: false, captureActive: false, recorder: null, tlang: 'both',
    _q(sel) { return document.querySelector('#niyLiveTv ' + sel); },
    marker() { },
    stop() { try { this._send({ type: 'stop' }); } catch (e) { } try { this.stopCapture(); } catch (e) { } },

    /* ---- live-transcript worker (runs on the user's own PC, reached via a free
       Cloudflare tunnel; URL in localStorage.niyWorkerUrl). When set, the feed
       is driven by the ACTUAL broadcast (Whisper transcript → claims → verdicts);
       when empty, the published fact-check feed is used instead. ---- */
    workerUrl() { let u = ''; try { u = localStorage.getItem('niyWorkerUrl') || ''; } catch (e) { } u = (u || window.NIY_WORKER_URL || '').trim().replace(/\/+$/, ''); return u; },
    liveMode() { return !!this.workerUrl(); },
    setWorker(u) {
      u = (u || '').trim();
      try { if (u) localStorage.setItem('niyWorkerUrl', u); else localStorage.removeItem('niyWorkerUrl'); } catch (e) { }
      try { if (this.ws) this.ws.close(); } catch (e) { } this.ws = null; this.wsState = 'off';
      this.syncModeUI();
      if (u) { this.connect(); if (this.channel) this.onChannel(this.channel, this.curVideoId); }
      else { this.tlines = []; this.renderTranscript(); if (this.channel) this.loadFeed(); }
    },
    connect() {
      const url = this.workerUrl(); if (!url) return;
      let w = url; if (/^https?:\/\//i.test(w)) w = w.replace(/^http/i, 'ws');
      if (!/^wss?:\/\//i.test(w)) w = (location.protocol === 'https:' ? 'wss://' : 'ws://') + w;
      this.wsState = 'connecting'; this.setLiveStatus();
      let ws; try { ws = new WebSocket(w); } catch (e) { this.wsState = 'off'; this.setLiveStatus('bad URL'); return; }
      this.ws = ws;
      ws.onopen = () => { this.wsState = 'on'; this.setLiveStatus(); if (this.pendingWatch) { this._send(this.pendingWatch); this.pendingWatch = null; } else if (this.channel && this.curVideoId) this.sendWatch(); };
      ws.onmessage = (ev) => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; } this.onWsMsg(d); };
      ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; this.wsState = 'off'; this.setLiveStatus(); if (this.liveMode()) setTimeout(() => { if (!this.ws && this.liveMode()) this.connect(); }, 4000); };
      ws.onerror = () => { try { ws.close(); } catch (e) { } };
    },
    _send(o) { try { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } } catch (e) { } return false; },
    sendWatch() { const w = { type: 'watch', videoId: this.curVideoId, channelId: this.channel && this.channel.channelId, lang: this.langCode() }; if (!this._send(w)) this.pendingWatch = w; },
    onWsMsg(d) {
      if (d.type === 'status') this.setLiveStatus(d.detail ? (d.state + ' · ' + d.detail) : d.state);
      else if (d.type === 'transcript' && d.text) this.handleTranscript(d.text);
      else if (d.type === 'error') this.setLiveStatus('error: ' + (d.message || ''));
    },

    onChannel(ch, videoId) {
      this.channel = ch;
      this.curVideoId = videoId || (ch && (ch.videoId || (ch.liveUrl && parseYtId(ch.liveUrl)))) || null;
      this.setContext(ch);
      this.syncModeUI();
      if (this.captureActive) {
        // tab capture follows this tab automatically; just reset the working state
        this.tlines = []; this.pending = ''; this.liveSeen = []; this.extracting = false;
        this.renderTranscript(); this.clearLiveFeed('Listening to the broadcast…');
      } else if (this.workerUrl()) {
        this.tlines = []; this.pending = ''; this.liveSeen = []; this.extracting = false;
        this.renderTranscript(); this.clearLiveFeed('Listening to the broadcast…');
        if (!this.ws) this.connect(); else this.sendWatch();
      } else {
        this.clearLiveFeed('Enable live fact-check to verify this broadcast — or tap ⟳ for recent published fact-checks.');
      }
    },
    langCode() { const l = (this.channel && this.channel.lang || '').toLowerCase(); return (l.indexOf('hindi') >= 0 || l === 'hi') ? 'hi' : 'en'; },

    /* ---- transcript → check-worthy claims → verdicts ---- */
    setTLang(l) { this.tlang = l || 'both'; const box = this._q('.ltv-lang-toggle'); if (box) box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.l === this.tlang)); this.renderTranscript(); },
    openSettings() {
      let m = document.getElementById('niySmartModal');
      if (m) { m.hidden = false; return; }
      let key = '', base = '', model = '';
      try { key = localStorage.getItem('niySmartKey') || ''; base = localStorage.getItem('niySmartBase') || ''; model = localStorage.getItem('niySmartModel') || ''; } catch (e) { }
      m = document.createElement('div'); m.id = 'niySmartModal'; m.className = 'niy-smart-modal';
      m.innerHTML = '<div class="niy-smart-card">'
        + '<div class="niy-smart-h">Use a smarter model <button class="niy-smart-x" type="button" aria-label="Close">✕</button></div>'
        + '<p class="niy-smart-p">Optional. Paste your own <b>OpenAI-compatible</b> API key to run the transcript translation &amp; fact-checks on a stronger model. Stored only in this browser — leave blank to use the built-in free AI.</p>'
        + '<label>API key</label><input class="niy-smart-key" type="password" placeholder="sk-… (OpenAI) or gsk_… (Groq)" value="' + esc(key) + '" />'
        + '<label>Model</label><input class="niy-smart-model" type="text" placeholder="gpt-4o-mini" value="' + esc(model) + '" />'
        + '<label>API base URL <span class="niy-smart-adv">(advanced — for non-OpenAI providers)</span></label><input class="niy-smart-base" type="text" placeholder="https://api.openai.com/v1" value="' + esc(base) + '" />'
        + '<div class="niy-smart-hint">OpenAI: model <code>gpt-4o</code> (default base). &nbsp;Groq (free): base <code>https://api.groq.com/openai/v1</code>, model <code>llama-3.3-70b-versatile</code>.</div>'
        + '<div class="niy-smart-btns"><button class="niy-smart-clear" type="button">Clear</button><button class="niy-smart-save" type="button">Save</button></div>'
        + '</div>';
      document.body.appendChild(m);
      const close = () => { m.hidden = true; };
      m.addEventListener('click', e => { if (e.target === m) close(); });
      m.querySelector('.niy-smart-x').addEventListener('click', close);
      m.querySelector('.niy-smart-save').addEventListener('click', () => {
        const k = m.querySelector('.niy-smart-key').value.trim(), mo = m.querySelector('.niy-smart-model').value.trim(), b = m.querySelector('.niy-smart-base').value.trim();
        try {
          if (k) localStorage.setItem('niySmartKey', k); else localStorage.removeItem('niySmartKey');
          if (mo) localStorage.setItem('niySmartModel', mo); else localStorage.removeItem('niySmartModel');
          if (b) localStorage.setItem('niySmartBase', b); else localStorage.removeItem('niySmartBase');
        } catch (e) { }
        close(); this.setLiveStatus(k ? 'smart model on' : undefined);
      });
      m.querySelector('.niy-smart-clear').addEventListener('click', () => {
        try { localStorage.removeItem('niySmartKey'); localStorage.removeItem('niySmartModel'); localStorage.removeItem('niySmartBase'); } catch (e) { }
        m.querySelector('.niy-smart-key').value = ''; m.querySelector('.niy-smart-model').value = ''; m.querySelector('.niy-smart-base').value = '';
      });
    },
    _isHallucination(text) {
      const t = text.trim().toLowerCase();
      if (t.replace(/[^a-z0-9ऀ-ॿঀ-৿ఀ-౿]/g, '').length < 4) return true;
      // Whisper invents these on silence / music / ad segments (multilingual)
      const junk = ['thanks for watching', 'thank you for watching', 'thank you.', 'please subscribe', 'subscribe to', 'like and subscribe', 'subtitles by', 'amara.org', 'all rights reserved', 'music playing', '[music]', '♪', 'transcription by', 'terima kasih', 'gracias por ver', 'copyright '];
      if (junk.some(j => t === j || t.includes(j))) return true;
      // near-duplicate of the previous kept line (Whisper loops a phrase on sustained non-speech)
      const last = this.tlines[this.tlines.length - 1];
      if (last && last.orig) {
        const norm = s => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿঀ-৿ఀ-౿ ]/g, ' ').split(/\s+/).filter(Boolean);
        const a = norm(text), b = norm(last.orig);
        if (a.length && b.length) { const bs = new Set(b); const inter = a.filter(w => bs.has(w)).length; if (inter / Math.max(a.length, b.length) > 0.7) return true; }
      }
      return false;
    },
    handleTranscript(text) {
      text = (text || '').trim(); if (!text) return;
      if (this._isHallucination(text)) return;
      const line = { orig: text, lang: this.langCode(), trans: '' };
      this.tlines.push(line); while (this.tlines.length > 6) this.tlines.shift();
      this.renderTranscript();
      this.translateLine(line);
      this.pending += ' ' + text;
      if (this.pending.trim().length >= 220 && !this.extracting) { const t = this.pending.trim(); this.pending = ''; this.extractClaims(t); }
    },
    async translateLine(line) {
      if (!llmReady() || !line.orig) return;
      const targetName = line.lang === 'hi' ? 'English' : 'Hindi';
      try {
        const t = await panelLLM([
          { role: 'system', content: 'Translate this live news caption to ' + targetName + '. Output ONLY the translation — no quotes, no notes, no preamble.' },
          { role: 'user', content: line.orig }
        ], { maxTokens: 180, temperature: 0, noSearch: true });
        line.trans = (t || '').trim();
        this.renderTranscript();
      } catch (e) { }
    },
    renderTranscript() {
      const el = this._q('.ltv-fc-transcript'); if (!el) return;
      if (!this.tlines.length) { el.innerHTML = '<span class="ltv-fc-ph">Waiting for audio…</span>'; return; }
      const mode = this.tlang || 'both';
      el.innerHTML = this.tlines.map(l => {
        const orig = esc(l.orig || ''); const trans = esc(l.trans || '');
        if (mode === 'hi') return '<div class="ltv-tl">' + (l.lang === 'hi' ? orig : (trans || '<span class="ltv-tl-wait">…</span>')) + '</div>';
        if (mode === 'en') return '<div class="ltv-tl">' + (l.lang === 'en' ? orig : (trans || '<span class="ltv-tl-wait">…</span>')) + '</div>';
        return '<div class="ltv-tl"><span class="ltv-tl-o">' + orig + '</span>' + (trans ? '<span class="ltv-tl-t">' + trans + '</span>' : '') + '</div>';
      }).join('');
      el.scrollTop = el.scrollHeight;
    },
    async extractClaims(text) {
      if (!llmReady() || !text) return; this.extracting = true;
      try {
        const raw = await panelLLM([
          { role: 'system', content: 'You extract check-worthy factual claims from a live news transcript (Hindi, English, or mixed). Return ONLY a JSON array of 0 to 3 short, self-contained claim statements in English (names, numbers, dates, events, attributions). Skip opinions, questions and anchor chatter. If nothing is check-worthy return []. No markdown, no prose.' },
          { role: 'user', content: text }
        ], { maxTokens: 300, noSearch: true, temperature: 0 });
        let arr = []; try { arr = JSON.parse((raw || '').replace(/```json/gi, '').replace(/```/g, '').trim()); } catch (e) { arr = []; }
        if (!Array.isArray(arr)) arr = [];
        for (const claim of arr.slice(0, 3)) { if (typeof claim === 'string' && claim.trim().length > 8) await this.verifyLive(claim.trim()); }
      } catch (e) { } finally { this.extracting = false; }
    },
    isDupLive(claim) {
      const norm = claim.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
      for (const prev of this.liveSeen) { const b = new Set(prev); let inter = 0; norm.forEach(w => { if (b.has(w)) inter++; }); const uni = new Set(norm.concat(prev)).size || 1; if (inter / uni > 0.6) return true; }
      this.liveSeen.push(norm); while (this.liveSeen.length > 40) this.liveSeen.shift(); return false;
    },
    async verifyLive(claim) {
      if (this.isDupLive(claim)) return;
      const wrap = this._q('.ltv-fc-claims'); if (!wrap) return;
      const ph = wrap.querySelector('.ltv-fc-ph'); if (ph) wrap.innerHTML = '';
      let r = null; try { r = await factSearch(claim, this.langCode()); } catch (e) { }
      const c = r && r.claims && r.claims[0]; const rev = c && c.claimReview && c.claimReview[0];
      if (rev) {
        const verdict = this.mapRating(rev.textualRating); const pub = (rev.publisher && rev.publisher.name) || 'Fact-check';
        const src = rev.url ? `<a href="${esc(rev.url)}" target="_blank" rel="noopener">${esc(pub)}↗</a>` : esc(pub);
        this.prependCard(wrap, this.verdictClass(verdict), (rev.textualRating || verdict) + ' · published', claim, esc(rev.title || c.text || ''), 'Source: ' + src);
        return;
      }
      if (!llmReady()) return;
      try {
        const sys = 'You are a fact-checker for live Indian TV news. A claim was just heard on air and no published fact-check exists yet. Use web search to check it, then answer in 1-2 sentences. Begin with EXACTLY ONE word — TRUE, FALSE, MISLEADING, or UNVERIFIED — then a specific reason grounded in what you found (state the fact; do NOT say a source was not provided — you have web access). Use UNVERIFIED only if you genuinely could not find anything, and then name the authoritative source that would settle it. No markdown.';
        const msgs = [{ role: 'system', content: sys }, { role: 'user', content: 'CLAIM: ' + claim }];
        let ans;
        // Prefer a web-search-capable model (askai proxy / Anthropic) so the
        // verdict is real. The free Nemotron path has no web access and only
        // returns \"unverified, no source provided\" boilerplate.
        try { ans = await callAI(msgs, { maxTokens: 260 }); }
        catch (e) { ans = await panelLLM(msgs, { maxTokens: 260 }); }
        const t = (ans || '').trim(); const first = (t.split(/[\s,.:—-]/)[0] || '').toUpperCase();
        const vc = first === 'TRUE' ? 'g' : first === 'FALSE' ? 'r' : first === 'MISLEADING' ? 'a' : 'u';
        this.prependCard(wrap, vc, (first || 'UNVERIFIED') + ' · AI assessment', claim, esc(t.replace(/^\S+[\s,.:—-]+/, '')), 'Not a verified fact-check · Niyantran AI');
      } catch (e) { }
    },
    prependCard(wrap, vClass, head, claim, body, foot) {
      const card = document.createElement('div'); card.className = 'ltv-fc-card ltv-fc-live ltv-fc-' + vClass;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      card.innerHTML = `<div class="ltv-fc-card-h"><span class="ltv-fc-verdict">${esc(head)}</span><span class="ltv-fc-time">LIVE · ${esc(time)}</span></div>` +
        `<div class="ltv-fc-claim">${esc(claim)}</div>` + (body ? `<div class="ltv-fc-exp">${body}</div>` : '') + `<div class="ltv-fc-src">${foot}</div>`;
      wrap.insertBefore(card, wrap.firstChild); while (wrap.children.length > 30) wrap.removeChild(wrap.lastChild);
    },
    clearLiveFeed(msg) { const wrap = this._q('.ltv-fc-claims'); if (wrap) wrap.innerHTML = `<span class="ltv-fc-ph">${esc(msg || '')}</span>`; },
    /* live mode is active while capturing tab audio (simple default) or a worker
       WS is connected (advanced, only if localStorage.niyWorkerUrl is set). */
    liveActive() { return this.captureActive || (!!this.ws && this.wsState === 'on'); },
    syncModeUI() {
      const live = this.liveActive();
      const lbl = this._q('.ltv-fc-feedlabel'); if (lbl) lbl.textContent = live ? 'Live claims from this broadcast' : 'Fact-check feed';
      const btn = this._q('.ltv-live-toggle'); if (btn) { btn.textContent = this.captureActive ? '■ Stop live fact-check' : '● Enable live fact-check'; btn.classList.toggle('on', this.captureActive); }
      this.setLiveStatus();
    },
    setLiveStatus(txt) {
      const pill = this._q('.ltv-live-pill'); if (!pill) return;
      const busy = this.captureActive || this.wsState === 'on' || this.wsState === 'connecting';
      if (!busy && !txt) { pill.hidden = true; return; }
      pill.hidden = false;
      const state = this.captureActive ? 'on' : this.wsState;
      pill.className = 'ltv-live-pill ltv-live-' + (state === 'on' ? 'on' : state === 'connecting' ? 'wait' : 'off');
      pill.textContent = txt || (this.captureActive ? 'listening (tab audio)' : state === 'connecting' ? 'connecting…' : 'off');
    },
    toggleLive() {
      if (this.captureActive) { this.stopCapture(); return; }
      if (this.workerUrl()) { this.connect(); this.syncModeUI(); if (this.channel) this.sendWatch(); return; }
      this.startCapture();
    },
    async startCapture() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { alert('Live capture needs a modern browser over https.'); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); }
      catch (e) { this.setLiveStatus('share cancelled'); return; }
      const atracks = stream.getAudioTracks();
      if (!atracks.length) { stream.getTracks().forEach(t => t.stop()); this.setLiveStatus('no tab audio'); alert('No tab audio was shared.\n\nClick Enable again → pick THIS tab → tick “Share tab audio”.\nAlso un-mute the channel (speaker icon) so there is sound to transcribe.'); return; }
      this._display = stream; this.mediaStream = new MediaStream(atracks);
      this.captureActive = true; this.tlines = []; this.pending = ''; this.liveSeen = []; this.extracting = false;
      this.renderTranscript(); this.clearLiveFeed('Listening to the broadcast…'); this.syncModeUI();
      stream.getTracks().forEach(t => t.addEventListener('ended', () => this.stopCapture()));
      this._recordLoop();
    },
    stopCapture() {
      if (!this.captureActive && !this._display) { this.syncModeUI(); return; }
      this.captureActive = false;
      try { clearTimeout(this._recTimer); } catch (e) { }
      try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch (e) { }
      this.recorder = null;
      try { if (this._display) this._display.getTracks().forEach(t => t.stop()); } catch (e) { }
      this._display = null; this.mediaStream = null;
      this.setLiveStatus(); this.syncModeUI();
      if (this.channel) this.clearLiveFeed('Live fact-check stopped. Enable again, or tap ⟳ for recent published fact-checks.');
    },
    _recordLoop() {
      const pick = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let mime = ''; for (const m of pick) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) { mime = m; break; } } catch (e) { } }
      const startOne = () => {
        if (!this.captureActive || !this.mediaStream) return;
        let chunks = []; let rec;
        try { rec = new MediaRecorder(this.mediaStream, mime ? { mimeType: mime } : undefined); }
        catch (e) { this.setLiveStatus('recorder error'); return; }
        this.recorder = rec;
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => { if (chunks.length) { const blob = new Blob(chunks, { type: mime || 'audio/webm' }); this._sendClip(blob); } if (this.captureActive) startOne(); };
        try { rec.start(); } catch (e) { this.setLiveStatus('recorder error'); return; }
        this.setLiveStatus();
        this._recTimer = setTimeout(() => { try { if (rec.state !== 'inactive') rec.stop(); } catch (e) { } }, 6500);
      };
      startOne();
    },
    async _sendClip(blob) {
      if (!blob || blob.size < 1400) return; // ~silence / too short
      try {
        const res = await fetch('/api/transcribe?lang=' + this.langCode(), { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob });
        if (!res.ok) { this.setLiveStatus('transcribe ' + res.status); return; }
        const d = await res.json().catch(() => ({}));
        if (d && d.text) this.handleTranscript(d.text);
      } catch (e) { this.setLiveStatus('transcribe offline'); }
    },

    async setContext(ch) {
      const el = this._q('.ltv-fc-context'); if (!el || !ch) return;
      el.innerHTML = '<span class="ltv-fc-ph">…</span>';
      const fallback = ch.name + ' — live Indian news channel' + (ch.lang ? ' (' + ch.lang + ')' : '') + '.';
      if (!llmReady()) { el.textContent = fallback; return; }
      const tok = ++this.feedToken;
      try {
        const a = await panelLLM([{ role: 'system', content: 'In 2 neutral sentences, say what this Indian news channel covers and what a viewer should watch for when fact-checking it. No preamble, no markdown.' }, { role: 'user', content: 'Channel: ' + ch.name + (ch.lang ? ' (' + ch.lang + ')' : '') }], { maxTokens: 150, noSearch: true });
        if (tok === this.feedToken) el.textContent = (a && a.trim()) || fallback;
      } catch (e) { if (tok === this.feedToken) el.textContent = fallback; }
    },

    async loadFeed() {
      const wrap = this._q('.ltv-fc-claims'); if (!wrap) return;
      const tok = ++this.feedToken;
      wrap.innerHTML = '<span class="ltv-fc-ph">Loading recent fact-checks…</span>';
      const lang = this.langCode();
      const topics = niyShuffle(NIY_FC_TOPICS).slice(0, 5);
      let all = [];
      for (const t of topics) { if (tok !== this.feedToken) return; const r = await factSearch(t, lang); if (r && r.claims) all = all.concat(r.claims); }
      if (lang === 'hi' && all.length < 4) { for (const t of topics) { if (tok !== this.feedToken) return; const r = await factSearch(t, 'en'); if (r && r.claims) all = all.concat(r.claims); } }
      if (tok !== this.feedToken) return;
      const seen = {}, items = [];
      for (const c of all) { const rev = (c.claimReview && c.claimReview[0]) || {}; const k = rev.url || (c.text || ''); if (!k || seen[k]) continue; seen[k] = 1; items.push(c); }
      items.sort((a, b) => { const da = (a.claimReview && a.claimReview[0] && a.claimReview[0].reviewDate) || a.claimDate || ''; const db = (b.claimReview && b.claimReview[0] && b.claimReview[0].reviewDate) || b.claimDate || ''; return (db + '').localeCompare(da + ''); });
      const top = items.slice(0, 14);
      if (!top.length) {
        wrap.innerHTML = '<span class="ltv-fc-ph">No fact-check feed yet. Add a free Google Fact Check Tools API key (Netlify env <b>GOOGLE_FACTCHECK_KEY</b>, or <b>localStorage.niyGoogleFactKey</b>) to enable it. The “Check a claim” box below still works.</span>';
        return;
      }
      wrap.innerHTML = ''; top.forEach(c => this.appendPublished(wrap, c));
    },

    appendPublished(wrap, c) {
      const rev = (c.claimReview && c.claimReview[0]) || {};
      const verdict = this.mapRating(rev.textualRating);
      const pub = (rev.publisher && rev.publisher.name) || 'Fact-check';
      const date = ((rev.reviewDate || c.claimDate || '') + '').slice(0, 10);
      const src = rev.url ? `<a href="${esc(rev.url)}" target="_blank" rel="noopener">${esc(pub)}↗</a>` : esc(pub);
      const card = document.createElement('div'); card.className = 'ltv-fc-card ltv-fc-' + this.verdictClass(verdict);
      card.innerHTML = `<div class="ltv-fc-card-h"><span class="ltv-fc-verdict">${esc(rev.textualRating || verdict)} · published</span><span class="ltv-fc-time">${esc(date)}</span></div>` +
        `<div class="ltv-fc-claim">${esc(c.text || rev.title || '')}</div>` +
        (c.claimant ? `<div class="ltv-fc-exp">Claimed by ${esc(c.claimant)}</div>` : '') +
        `<div class="ltv-fc-src">Source: ${src}</div>`;
      wrap.appendChild(card);
    },

    async checkClaim(q) {
      q = (q || '').trim(); if (!q) return;
      const inp = this._q('.ltv-it-ask input'); if (inp) inp.value = '';
      const el = this._q('.ltv-fc-answer'); if (!el) return; el.hidden = false;
      el.innerHTML = `<div class="ltv-fc-q">${esc(q)}</div><div class="ltv-fc-a">Checking…</div>`;
      const a = el.querySelector('.ltv-fc-a');
      let r = null; try { r = await factSearch(q, this.langCode()); } catch (e) { }
      const c = r && r.claims && r.claims[0]; const rev = c && c.claimReview && c.claimReview[0];
      if (rev) {
        const pub = (rev.publisher && rev.publisher.name) || 'source';
        a.innerHTML = `<strong>${esc(rev.textualRating || this.mapRating(rev.textualRating))} · published fact-check</strong><br>${esc(rev.title || c.text || '')}` + (rev.url ? ` <a href="${esc(rev.url)}" target="_blank" rel="noopener">${esc(pub)}↗</a>` : '');
        return;
      }
      if (!llmReady()) { a.textContent = 'No published fact-check found. Deploy the NVIDIA function (or add a Google Fact Check key) to get an assessment.'; return; }
      try {
        const ans = await panelLLM([{ role: 'system', content: 'You assess a factual claim heard on a news broadcast. No verified fact-check is available. In 2-4 sentences: say whether it is plausible, what specific evidence would confirm or refute it, and what to check. Make clear this is an AI assessment, not a verified verdict. No preamble, no markdown.' }, { role: 'user', content: 'CLAIM: ' + q }], { maxTokens: 400 });
        a.innerHTML = `<strong>AI assessment — not a verified fact-check</strong><br>${esc((ans || '').trim())}`;
      } catch (e) { a.textContent = 'Assessment failed — ' + (e && e.message || e); }
    },

    mapRating(r) { const t = (r || '').toLowerCase(); if (/false|incorrect|pants|fake|no evidence|hoax|misattributed/.test(t)) return 'False'; if (/misleading|partly|half|mixture|distort|exagger|missing context|unproven/.test(t)) return 'Misleading'; if (/true|correct|accurate/.test(t)) return 'Substantially True'; return 'Unverified'; },
    verdictClass(v) { const t = (v || '').toLowerCase(); if (/^(true|substantially)/.test(t)) return 'g'; if (t === 'false') return 'r'; if (t === 'misleading') return 'a'; return 'u'; },
  };
  window.NiyLive = NiyLive;
  try { if (NiyLive.liveMode()) NiyLive.connect(); } catch (e) { }


  // Direct play — clicking a channel loads its live stream instantly with zero
  // setup: an explicit videoId/liveUrl if given, otherwise the channel's own
  // live feed via /embed/live_stream?channel=<id> (no API key, no prompts).
  function ltvState(t, cls) { const el = document.querySelector('#niyLiveTv .ltv-sb-state'); if (el) { el.textContent = t ? ('· ' + t) : ''; el.style.color = cls || 'var(--fg-faint)'; } }
  function ltvPlayerError(ch, code) {
    const off = document.querySelector('#niyLiveTv .ltv-offline'); if (!off) return;
    const map = { 2: 'Invalid video ID', 5: 'HTML5 playback error', 100: 'Video is private or was removed', 101: 'The broadcaster disabled playback on other sites', 150: 'The broadcaster disabled playback on other sites' };
    off.hidden = false;
    off.innerHTML = `<div class="ltv-off-t">${esc(ch.name)} — can't play (error ${code})</div><div class="ltv-off-d">${esc(map[code] || 'Unknown player error')}.${(code === 101 || code === 150) ? ' This stream blocks external embedding — try another channel.' : ''} If every channel fails with a network error, an ad/DNS blocker on this network may be blocking YouTube.</div>`;
  }
  /* Resolve a channel's CURRENT live video id via the ytlive function (reads the
     channel's /live page server-side — no key, no quota). Falls back to the
     hardcoded liveUrl/videoId if the function is absent (e.g. opened as a plain
     file, not deployed) or the channel can't be resolved. Cached ~6 min. */
  let ytliveFn = null;               // null unknown · false absent
  const ltvLiveCache = {};           // key -> { videoId, t }
  async function resolveLiveId(ch) {
    const hard = ch.videoId || (ch.liveUrl && parseYtId(ch.liveUrl)) || null;
    if (!ch.channelId && !ch.handle) return hard;
    const key = ch.channelId || ch.handle;
    const c = ltvLiveCache[key];
    if (c && Date.now() - c.t < 6 * 60 * 1000) return c.videoId || hard;
    if (ytliveFn === false) return hard;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch('/api/ytlive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId: ch.channelId, handle: ch.handle }), signal: ctrl.signal });
      clearTimeout(to);
      if (res.status === 404 || res.status === 501 || res.status === 405) { ytliveFn = false; return hard; }
      const d = await res.json().catch(() => ({}));
      if (d && d.videoId) { ltvLiveCache[key] = { videoId: d.videoId, t: Date.now() }; return d.videoId; }
      return hard; // function is live but couldn't resolve → hardcoded fallback
    } catch (e) { ytliveFn = false; return hard; }
  }
  async function openChannel(ch) {
    if (!ch) return; ltvActive = ch; const tok = ++ltvToken;
    const o = document.getElementById('niyLiveTv'); if (!o) return;
    const now = o.querySelector('.ltv-now'); now.hidden = false; now.innerHTML = `<span class="ltv-dot"></span> ${esc(ch.name)}`;
    o.querySelector('.ltv-sb-name').textContent = ch.name + (ch.lang ? ' · ' + ch.lang : '');
    renderStrip(); // instant switch — the InTruth panel is never reloaded
    // Live Intelligence panel is (re)bound after the live video id resolves (below).
    const wrap = o.querySelector('.ltv-video-wrap');
    const off = o.querySelector('.ltv-offline');
    // Tear down any previous player + host FIRST, so a prior channel's async
    // error/state events (each closes over its own channel) can never fire a
    // stale "error" card over the channel the user just switched to.
    if (ltvPlayer && ltvPlayer.destroy) { try { ltvPlayer.destroy(); } catch (e) { } }
    ltvPlayer = null;
    let host = document.getElementById('ltvPlayerHost'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'ltvPlayerHost'; host.className = 'ltv-video'; wrap.insertBefore(host, off);
    ltvState('finding current live…', 'var(--signal-amber)');
    const videoId = await resolveLiveId(ch);
    if (tok !== ltvToken) return; // user switched channels while resolving
    try { if (window.NiyLive) NiyLive.onChannel(ch, videoId); } catch (e) { }
    const host2 = document.getElementById('ltvPlayerHost'); if (!host2) return;
    if (!videoId) {
      off.hidden = false; ltvState('no stream', 'var(--signal-amber)');
      off.innerHTML = `<div class="ltv-off-t">No live stream set for ${esc(ch.name)}</div><div class="ltv-off-d">Add a YouTube live URL (or videoId) for this channel in its config.</div>`;
      return;
    }
    off.hidden = true; ltvState('loading YouTube…', 'var(--signal-amber)');
    await ensureYtApi();
    if (tok !== ltvToken) return; // user switched channels while the API loaded
    ltvState('starting…', 'var(--signal-amber)');
    try {
      ltvPlayer = new YT.Player('ltvPlayerHost', {
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%', videoId: videoId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: e => { if (tok !== ltvToken) return; try { e.target.mute(); e.target.playVideo(); } catch (x) { } ltvState('ready', 'var(--signal-green)'); },
          onStateChange: e => { if (tok !== ltvToken) return; const m = { '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' }; ltvState(m[String(e.data)] || ('state ' + e.data), e.data === 1 ? 'var(--signal-green)' : 'var(--signal-amber)'); if (e.data === 1 || e.data === 3) off.hidden = true; },
          onError: e => { if (tok !== ltvToken) return; ltvState('ERROR ' + e.data, 'var(--signal-red)'); ltvPlayerError(ch, e.data); },
        },
      });
    } catch (e) {
      ltvState('exception', 'var(--signal-red)');
      off.hidden = false; off.innerHTML = `<div class="ltv-off-t">Could not start the player</div><div class="ltv-off-d">${esc(e && e.message || 'YouTube player error')}.</div>`;
    }
  }
  function openLiveTv() { try { console.info('[Niyantran] LIVE TV build S14 · collapsible panel + BYO smart-model key'); } catch (e) { } buildLiveTv(); const o = document.getElementById('niyLiveTv'); o.hidden = false; document.body.classList.add('niy-livetv-open'); const def = ltvActive || LIVE_TV_CHANNELS.find(c => c.name === 'Aaj Tak') || LIVE_TV_CHANNELS[0]; openChannel(def); }
  function closeLiveTv() { const o = document.getElementById('niyLiveTv'); if (!o) return; try { if (window.NiyLive) NiyLive.stop(); } catch(e){} if (ltvPlayer && ltvPlayer.stopVideo) { try { ltvPlayer.stopVideo(); } catch (e) { } } o.hidden = true; document.body.classList.remove('niy-livetv-open'); }
  window.openLiveTv = openLiveTv;
  function injectLiveTvButton() {
    const refresh = document.getElementById('refreshBtn'); if (!refresh || document.getElementById('niyLiveTvBtn')) return;
    const btn = document.createElement('button'); btn.id = 'niyLiveTvBtn'; btn.type = 'button'; btn.className = 'niy-livetv-btn'; btn.title = 'Live TV — official news channels with InTruth fact-check';
    btn.innerHTML = '<span class="niy-livetv-dot"></span> LIVE TV';
    refresh.parentNode.insertBefore(btn, refresh);
    btn.addEventListener('click', openLiveTv);
  }

  /* ============ boot ============ */
  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
  // Route every AI entry point into the in-pane workspace (on split tiers).
  function routeAiEntryPoints() {
    window.openGlobalAiWithPrompt = function (prefill) {
      if (isSplitTier()) openAiWorkspace(prefill || '');
      else { if (typeof openGlobalAi === 'function') openGlobalAi(); const i = document.getElementById('globalAiInput'); if (i && prefill) { i.value = prefill; i.focus(); } }
    };
    const btn = document.getElementById('globalAiBtn');
    if (btn && !btn.dataset.niyRouted) {
      const clone = btn.cloneNode(true); clone.dataset.niyRouted = '1';
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', () => { if (isSplitTier()) openAiWorkspace(''); else if (typeof openGlobalAi === 'function') openGlobalAi(); });
      if (window.NiyAI) window.NiyAI.updateBadge();
    }
  }
  function initPanelSliders() {
    if (!document.getElementById('niy-sliders-css')) {
      const s = document.createElement('style'); s.id = 'niy-sliders-css';
      s.textContent =
          'body.niy-sb-collapsed .main{grid-template-columns:1fr !important}'
        + 'body.niy-sb-collapsed #sidebar{display:none !important}'
        + '.niy-sb-toggle{margin-left:6px;flex:0 0 auto;background:none;border:1px solid var(--line,#262626);color:var(--fg-muted,#b9c2cc);border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:13px;line-height:1}'
        + '.niy-sb-toggle:hover{color:var(--fg,#e8edf2)}'
        + '.niy-sb-rail{display:none;position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:40;background:#12161c;color:#b9c2cc;border:1px solid var(--line,#262626);border-left:none;border-radius:0 8px 8px 0;padding:12px 5px;cursor:pointer;font-size:14px}'
        + 'body.niy-sb-collapsed .niy-sb-rail{display:block}'
        + '.ticker-actions{position:absolute;right:0;top:0;bottom:0;display:flex;z-index:6}'
        + '.ticker-actions button{background:#0d1117;border:none;border-left:1px solid rgba(255,255,255,.14);color:var(--fg-muted,#b9c2cc);font-size:12px;padding:0 11px;cursor:pointer;line-height:1}'
        + '.ticker-actions button:hover{color:var(--fg,#e8edf2)}'
        + '.ticker-actions button.on{color:#43d17f}'
        + 'body.niy-ticker-collapsed .ticker-track{display:none}'
        + 'body.niy-focus .tabs{display:none !important}'
        + 'body.niy-focus .scope-bar{display:none !important}'
        + 'body.niy-split-tier #globalAiBtn{display:none !important}';
      document.head.appendChild(s);
    }
    function niySizeDetail() {
      const d = document.getElementById('detail'); if (!d) return;
      // Fill the .main grid cell EXACTLY (it already flex-fills the terminal),
      // so no thin black strip is left at the bottom. Fall back to the viewport
      // calc only before layout settles.
      const main = d.closest('.main');
      let h;
      if (main && main.clientHeight > 60) h = main.clientHeight;
      else h = Math.max(220, window.innerHeight - d.getBoundingClientRect().top);
      d.style.setProperty('height', h + 'px', 'important'); d.style.setProperty('max-height', 'none', 'important');
      const sbEl = document.getElementById('sidebar'); if (sbEl) { sbEl.style.setProperty('height', h + 'px', 'important'); sbEl.style.setProperty('max-height', 'none', 'important'); }
    }
    window.niySizeDetail = niySizeDetail;
    if (!window.__niyResizeBound) { window.__niyResizeBound = 1; window.addEventListener('resize', niySizeDetail); }
    const detailEl = document.getElementById('detail');
    if (detailEl && !detailEl.dataset.niyObs) {
      detailEl.dataset.niyObs = '1';
      const upd = () => { document.body.classList.toggle('niy-split-tier', !!detailEl.querySelector('.niy-pane-ai')); niySizeDetail(); };
      new MutationObserver(upd).observe(detailEl, { childList: true });
      setTimeout(upd, 60);
    }
    const sb = document.getElementById('sidebar'), main = document.querySelector('.main');
    if (sb && main && !sb.dataset.niySl) {
      sb.dataset.niySl = '1';
      const filt = sb.querySelector('.sidebar-filter') || sb;
      const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'niy-sb-toggle'; cb.title = 'Collapse feature list'; cb.setAttribute('aria-label', 'Collapse feature list'); cb.textContent = '«';
      filt.appendChild(cb);
      const rail = document.createElement('button'); rail.type = 'button'; rail.className = 'niy-sb-rail'; rail.title = 'Show feature list'; rail.setAttribute('aria-label', 'Show feature list'); rail.textContent = '»';
      main.appendChild(rail);
      const applySB = () => { let c = false; try { c = localStorage.getItem('niySidebarCollapsed') === '1'; } catch (e) { } document.body.classList.toggle('niy-sb-collapsed', c); };
      cb.addEventListener('click', () => { try { localStorage.setItem('niySidebarCollapsed', '1'); } catch (e) { } applySB(); });
      rail.addEventListener('click', () => { try { localStorage.setItem('niySidebarCollapsed', '0'); } catch (e) { } applySB(); });
      applySB();
    }
    const tw = document.querySelector('.ticker-wrap');
    if (tw && !tw.dataset.niySl) {
      tw.dataset.niySl = '1';
      const acts = document.createElement('div'); acts.className = 'ticker-actions';
      const fb = document.createElement('button'); fb.type = 'button'; fb.title = 'Focus mode — hide the tier tabs & toolbar below the ticker for more feed/AI space'; fb.textContent = '⤢';
      const tc = document.createElement('button'); tc.type = 'button'; tc.title = 'Hide / show the live ticker';
      acts.appendChild(fb); acts.appendChild(tc); tw.appendChild(acts);
      const applyFocus = () => { let c = false; try { c = localStorage.getItem('niyFocusMode') === '1'; } catch (e) { } document.body.classList.toggle('niy-focus', c); fb.classList.toggle('on', c); niySizeDetail(); };
      fb.addEventListener('click', () => { let c = false; try { c = localStorage.getItem('niyFocusMode') === '1'; localStorage.setItem('niyFocusMode', c ? '0' : '1'); } catch (e) { } applyFocus(); });
      const applyTC = () => { let c = false; try { c = localStorage.getItem('niyTickerCollapsed') === '1'; } catch (e) { } document.body.classList.toggle('niy-ticker-collapsed', c); tc.textContent = c ? '▸' : '▾'; niySizeDetail(); };
      tc.addEventListener('click', () => { let c = false; try { c = localStorage.getItem('niyTickerCollapsed') === '1'; localStorage.setItem('niyTickerCollapsed', c ? '0' : '1'); } catch (e) { } applyTC(); });
      applyFocus(); applyTC();
    }
  }
  function boot() {
    loadLayout();
    enhanceTabs();
    initInteractivity();
    routeAiEntryPoints();
    injectLiveTvButton();
    try { initPanelSliders(); } catch (e) { }
    const detail = document.getElementById('detail'), sidebar = document.getElementById('sidebarList');
    if (detail && 'MutationObserver' in window) { const run = debounce(() => { layoutDetail(); markFeedDraggable(); }, 50); new MutationObserver(run).observe(detail, { childList: true, subtree: true }); }
    if (sidebar && 'MutationObserver' in window) { const run = debounce(enhanceSidebar, 50); new MutationObserver(run).observe(sidebar, { childList: true, subtree: true }); }
    const fi = document.getElementById('sidebarFilter'); if (fi && sidebar) fi.addEventListener('input', () => { sidebar.classList.toggle('niy-acc-search', !!fi.value.trim()); });
    setTimeout(() => { enhanceTabs(); layoutDetail(); enhanceSidebar(); markFeedDraggable(); }, 150);
    setTimeout(() => { layoutDetail(); enhanceSidebar(); markFeedDraggable(); }, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

