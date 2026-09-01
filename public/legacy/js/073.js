
let activeTier = "ndesk";
let activeIndex = 0;
let renderToken = 0; // guards against a slow fetch resolving after the user has moved on

let sidebarFilterTier = null;

function applySidebarFilter(term) {
  const q = term.trim().toLowerCase();
  document.querySelectorAll('#sidebarList .feat-item').forEach(btn => {
    btn.style.display = (!q || btn.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
  // Hide a bucket header if all its features are filtered out
  document.querySelectorAll('#sidebarList .sidebar-group').forEach(group => {
    const anyVisible = Array.from(group.querySelectorAll('.feat-item')).some(b => b.style.display !== 'none');
    group.style.display = anyVisible ? '' : 'none';
  });
}

// Canonical bucket display order — a deliberate, professional sequence
// (intelligence/analysis first, monitoring in the middle, tooling/markets
// last) so the sidebar reads as an organised desk, not a random list.
// Buckets not listed here fall to the end, alphabetically.
const BUCKET_ORDER = [
  "Conflict Intelligence",
  "Defense Intelligence",
  "Maritime & Border Security",
  "Diplomacy & Alliances",
  "Infra",
  "Legislative & Policy Intelligence",
  "Regulatory & Judicial",
  "Judicial Intelligence",
  "Electoral Data & Analytics",
  "Representative Intelligence",
  "Government Operations",
  "Political Operations Intelligence",
  "Hyperlocal Intelligence",
  "Governance & Civic Bodies",
  "Market Intelligence",
  "Prediction Markets",
  "News & Media Monitoring",
  "Data Markets & Community",
  "Workflow & Distribution",
];

function bucketSortRank(bucket) {
  const i = BUCKET_ORDER.indexOf(bucket);
  return i === -1 ? BUCKET_ORDER.length : i;
}

function renderSidebar() {
  const list = document.getElementById('sidebarList');
  list.innerHTML = "";
  const feats = featuresForTier(activeTier);

  // Group features by bucket while remembering each one's ORIGINAL index
  // (activeIndex refers to position in the tier's feature array, so it must
  // be preserved even though we're now displaying them grouped/reordered).
  const groups = new Map();
  feats.forEach((f, i) => {
    const bucket = f.bucket || "Other";
    if (!groups.has(bucket)) groups.set(bucket, []);
    groups.get(bucket).push({ f, i });
  });

  // Order the buckets by the canonical sequence, then alphabetically for any leftovers
  const orderedBuckets = [...groups.keys()].sort((a, b) => {
    const ra = bucketSortRank(a), rb = bucketSortRank(b);
    return ra !== rb ? ra - rb : a.localeCompare(b);
  });

  orderedBuckets.forEach(bucket => {
    const group = document.createElement('div');
    group.className = 'sidebar-group';

    const header = document.createElement('div');
    header.className = 'sidebar-group-label';
    header.textContent = bucket;
    group.appendChild(header);

    // Within a bucket, keep the features in rank order (their natural array order)
    groups.get(bucket).forEach(({ f, i }) => {
      const btn = document.createElement('button');
      btn.className = 'feat-item' + (i === activeIndex ? ' active' : '');
      btn.setAttribute('role', 'tab');
      const cachedRows = f.dataSource && csvCache[f.dataSource.csv];
      // Memoized: computing the worst signal over every row of every cached
      // CSV (bills 4.5k, questions 8k — some signals scan the whole dataset
      // per row) froze tab switches for seconds. Data is immutable in-session,
      // so one computation per csv+archetype is enough.
      let aggSignal = null;
      if (cachedRows) {
        window.__niyAggSig = window.__niyAggSig || {};
        const aggKey = f.dataSource.csv + '|' + f.archetype + '|' + cachedRows.length;
        if (aggKey in window.__niyAggSig) {
          aggSignal = window.__niyAggSig[aggKey];
        } else if (cachedRows.length <= 1500) {
          window.__niyAggSig[aggKey] = worstSignal(cachedRows.map(row => computeSignal(f.archetype, row, f.dataSource.csv, cachedRows)));
          aggSignal = window.__niyAggSig[aggKey];
        } else if (!window.__niyAggSig['pending|' + aggKey]) {
          // big CSV: computing the aggregate inline froze tab switches for
          // seconds — chunk it off-thread-of-interaction and repaint the
          // sidebar dot when it lands.
          window.__niyAggSig['pending|' + aggKey] = true;
          (async () => {
            try {
              let worst = null;
              for (let ri = 0; ri < cachedRows.length; ri += 600) {
                const part = cachedRows.slice(ri, ri + 600).map(row => computeSignal(f.archetype, row, f.dataSource.csv, cachedRows));
                part.push(worst);
                worst = worstSignal(part);
                await niyYield();
              }
              window.__niyAggSig[aggKey] = worst;
            } catch (e) { }
            delete window.__niyAggSig['pending|' + aggKey];
            try { renderSidebar(); } catch (e) { }
          })();
        }
      }
      const betaTag = !f.dataSource ? '<span class="beta-badge">AI</span>' : '';
      btn.innerHTML = `${signalMarkupHtml(aggSignal)}<span class="label">${escapeHtml(f.feature)}${betaTag}</span>`;
      btn.addEventListener('click', () => { activeIndex = i; renderAll(); });
      group.appendChild(btn);
    });

    list.appendChild(group);
  });

  if (activeTier !== sidebarFilterTier) {
    sidebarFilterInput.value = '';
    sidebarFilterTier = activeTier;
  }
  applySidebarFilter(sidebarFilterInput.value);
}

function cellToHtml(cell) {
  if (cell && typeof cell === 'object' && '__html' in cell) return cell.__html;
  return escapeHtml(cell);
}

// Full untruncated text for a hover tooltip — table-layout:fixed truncates
// long cells with an ellipsis to keep tables from blowing out the panel
// width, so every cell needs its complete value reachable on hover.
function cellToTitle(cell) {
  if (cell && typeof cell === 'object' && 'text' in cell) return cell.text;
  return String(cell == null ? "" : cell);
}

function renderEmptyState(container, note) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <div class="headline">${escapeHtml(S().dataPipelineHeadline)}</div>
    <div>${escapeHtml(note || S().dataPipelineDefault)}</div>
  `;
  container.appendChild(div);
}

// ---------- Toolbar: filter, export, Studio stub ----------

// Real structured filtering, not just a text search: for each column with a
// small-enough set of distinct values, a dropdown is offered (built once the
// table's actual data is known — see buildColumnFilterUI). Text search and
// every active dropdown combine with AND logic.
function getActiveFilters() {
  const text = (document.getElementById('rowFilter')?.value || '').trim().toLowerCase();
  const columnFilters = [...document.querySelectorAll('.column-filter-select')]
    .map(sel => ({ index: Number(sel.dataset.colIndex), value: sel.value }))
    .filter(f => f.value !== '');
  return { text, columnFilters };
}

function applyFilters() {
  const { text, columnFilters } = getActiveFilters();
  const matchesText = tr => !text || tr.textContent.toLowerCase().includes(text);

  // Column dropdowns are index-based against the PRIMARY table's column
  // layout — applying them to an extraDataSources block (which can have a
  // completely different set of columns) would filter on the wrong
  // semantics, so those only get the text search, not the dropdowns.
  document.querySelectorAll('#dataArea table.sample tbody tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    const matchesColumns = columnFilters.every(f => {
      const cell = cells[f.index];
      return cell && (cell.getAttribute('title') ?? cell.textContent) === f.value;
    });
    tr.style.display = (matchesText(tr) && matchesColumns) ? '' : 'none';
  });
  document.querySelectorAll('#detail [id^="dataArea"]:not(#dataArea) table.sample tbody tr').forEach(tr => {
    tr.style.display = matchesText(tr) ? '' : 'none';
  });
}

// Decides which columns are worth offering as a dropdown: too few distinct
// values (<2) isn't a filter, too many (e.g. a names/titles column where
// almost every row is unique) isn't a filter either — it's just the data.
function computeFilterableColumns(columns, bodyRows) {
  const filterable = [];
  columns.forEach((label, ci) => {
    const values = new Set(bodyRows.map(r => cellToTitle(r[ci])).filter(v => v !== ""));
    const uniqueRatio = values.size / bodyRows.length;
    if (values.size >= 2 && values.size <= 25 && uniqueRatio < 0.6) {
      filterable.push({ index: ci, label, values: [...values].sort() });
    }
  });
  return filterable;
}

function buildColumnFilterUI(filterableColumns) {
  const container = document.getElementById('columnFilters');
  if (!container) return;
  if (!filterableColumns.length) { container.innerHTML = ''; return; }
  container.innerHTML = filterableColumns.map(({ index, label, values }) => `
    <select class="column-filter-select toolbar-btn" data-col-index="${index}" aria-label="Filter by ${escapeHtml(label)}">
      <option value="">${escapeHtml(label)}: All</option>
      ${values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
    </select>
  `).join('');
  container.querySelectorAll('.column-filter-select').forEach(sel => {
    sel.addEventListener('change', applyFilters);
  });
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Reads from the DOM (not the underlying JS data array) so export always
// matches exactly what's on screen — respecting whatever row filter is
// currently applied. Cell values come from each <td>'s title attribute
// (already the full, untruncated value used for the hover tooltip), so
// export isn't corrupted by CSS ellipsis truncation or embedded <a> markup.
function getVisibleTableData(table) {
  const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
  const rows = [...table.querySelectorAll('tbody tr')]
    .filter(tr => tr.style.display !== 'none')
    .map(tr => [...tr.querySelectorAll('td')].map(td => td.getAttribute('title') ?? td.textContent.trim()));
  return { headers, rows };
}

// Scoped to the primary LIVE DATA table only — a feature's extraDataSources
// (e.g. the swing-analysis or "most active askers" secondary blocks) aren't
// included in export today.
function exportCurrentTable(format) {
  const table = document.querySelector('#dataArea table.sample');
  if (!table) return;
  // Filename always derives from the English feature name (stable, ASCII)
  // regardless of the active display language.
  const f = FEATURE_DATA[activeTier][activeIndex];
  const filenameBase = `niyantran-${activeTier}-${slugify(f.feature)}`;
  const { headers, rows } = getVisibleTableData(table);

  if (format === 'csv') {
    const lines = [headers.map(csvEscape).join(','), ...rows.map(r => r.map(csvEscape).join(','))];
    downloadBlob(lines.join('\r\n'), `${filenameBase}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const objects = rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    downloadBlob(JSON.stringify(objects, null, 2), `${filenameBase}.json`, 'application/json;charset=utf-8;');
  }
}

function showToolbarMessage(text) {
  const msg = document.getElementById('toolbarMsg');
  if (!msg) return;
  msg.textContent = text;
  clearTimeout(showToolbarMessage._t);
  showToolbarMessage._t = setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
}

function wireToolbar() {
  const filterInput = document.getElementById('rowFilter');
  let filterTimer;
  filterInput.addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilters, 150);
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => exportCurrentTable('csv'));
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportCurrentTable('json'));

  document.getElementById('studioBtn').addEventListener('click', () => {
    const f = featuresForTier(activeTier)[activeIndex];
    activeTier = 'datastudio';
    renderAll();
    if (f && f.dataSource && f.dataSource.csv && window.openDatasetInStudio) {
      window.openDatasetInStudio(f.dataSource.csv);
    }
  });
}

// Sorting + building a many-thousand-row table (the question database is
// ~99k rows) is expensive enough to redo it on every visit, even once the
// underlying CSV itself is cached — cache the built table by dataSource
// identity so revisiting a feature within the same session is instant.
const renderedBlockCache = new WeakMap();
// Column-dropdown definitions computed for a dataSource, cached alongside
// its rendered table so the cached-DOM fast path (below) can still rebuild
// the dropdown UI without re-deriving distinct-value sets from scratch.
const filterableColumnsCache = new WeakMap();

// Throttle-proof yield: hidden/background pages clamp chained setTimeout to
// ~1/minute (intensive wake-up throttling), which would stall chunked table
// streaming. MessageChannel tasks are not throttled, and the renderer can
// still paint between them.
const __niyChan = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const __niyQ = [];
if (__niyChan) __niyChan.port1.onmessage = () => { const f = __niyQ.shift(); if (f) f(); };
function niyPost(fn) { if (__niyChan) { __niyQ.push(fn); __niyChan.port2.postMessage(0); } else setTimeout(fn, 0); }
function niyYield() { return new Promise(r => niyPost(r)); }

async function renderDataBlock(container, columns, dataSource, token, archetype, isPrimary) {
  if (!dataSource) {
    renderEmptyState(container, S().dataPipelineGeneric);
    if (isPrimary) buildColumnFilterUI([]);
    return;
  }

  if (renderedBlockCache.has(dataSource)) {
    // Re-attach the cached DOM node directly — assigning innerHTML from a
    // cached *string* would still force a full HTML re-parse for a 99k-row
    // table, defeating the point of caching.
    const cached = renderedBlockCache.get(dataSource);
    // A previous visit's row filter may have left rows hidden on this same
    // cached node — clear that before re-showing it, since the filter input
    // itself resets to empty on every feature switch and would otherwise be
    // visually out of sync with the table underneath it. Excludes
    // expand-panel-row: an accordion panel's open/closed state is
    // independent of row filtering and should survive a revisit as-is.
    cached.querySelectorAll('tbody tr:not(.expand-panel-row)').forEach(tr => { tr.style.display = ''; });
    // Re-attaching thousands of cached rows forces a style recalc of every
    // node in one long task (~1s for the biggest tables). Park the rows in
    // a fragment, attach the light shell first (instant), then stream the
    // rows back in slices so the tier switch never blocks.
    const cachedTbody = cached.querySelector('tbody');
    const cachedRowNodes = cachedTbody ? Array.from(cachedTbody.children) : [];
    if (cachedRowNodes.length > 1500) {
      const parkFrag = document.createDocumentFragment();
      cachedRowNodes.forEach(r => parkFrag.appendChild(r));
      container.replaceChildren(cached);
      if (isPrimary) buildColumnFilterUI(filterableColumnsCache.get(dataSource) || []);
      (async () => {
        const SLICE = 500;
        for (let off = 0; off < cachedRowNodes.length; off += SLICE) {
          if (token !== renderToken) {
            // navigated away mid-stream — return the tail to the cached node
            while (parkFrag.firstChild) cachedTbody.appendChild(parkFrag.firstChild);
            return;
          }
          const stop = Math.min(off + SLICE, cachedRowNodes.length);
          for (let k = off; k < stop; k++) cachedTbody.appendChild(cachedRowNodes[k]);
          void cachedTbody.offsetHeight; // settle recalc per slice (see cold path)
          if (stop < cachedRowNodes.length) await niyYield();
        }
      })();
      return;
    }
    container.replaceChildren(cached);
    if (isPrimary) buildColumnFilterUI(filterableColumnsCache.get(dataSource) || []);
    return;
  }

  // Show something immediately — the CSV fetch+parse itself (not just the
  // later sort/render step) can take seconds for the largest datasets, and
  // an empty panel during that stretch reads as an unresponsive click.
  if (!csvCache[dataSource.csv]) {
    container.innerHTML = `<div class="callout">${escapeHtml(S().loadingCsv(dataSource.csv))}</div>`;
  }

  const rows = await loadCSV(dataSource.csv);
  if (token !== renderToken) return; // user navigated away while this was loading

  if (!rows.length) {
    renderEmptyState(container, dataSource.note
      ? `${S().noRowsLoaded(dataSource.csv)} ${dataSource.note}`
      : S().noRowsLoaded(dataSource.csv));
    if (isPrimary) buildColumnFilterUI([]);
    return;
  }

  // Building/sorting a many-thousand-row table blocks the main thread long
  // enough to look frozen (the question database alone is ~99k rows) — show
  // a loading line and let the browser paint it before doing that work.
  const isLarge = rows.length > 1200;
  if (isLarge) {
    container.innerHTML = `<div class="ds-skel" role="status" aria-label="Loading table"><i></i><i></i><i></i><i></i><i></i><i></i><span class="ds-skel-note">${escapeHtml(S().renderingRows(rows.length))}</span></div>`;
    // setTimeout (not requestAnimationFrame) — rAF can stall indefinitely in
    // a backgrounded/inactive tab, which would hang this render entirely.
    await new Promise(resolve => setTimeout(resolve, 30));
    if (token !== renderToken) return;
  }

  // Sort an index array so each displayed row remembers its raw-CSV position.
  // Row DETAIL (openRowDetail) and the analysis layer resolve records by raw
  // index — display order must never change row identity.
  const rawIdx = rows.map((_, ri) => ri);
  if (dataSource.sortKey) {
    rawIdx.sort((ia, ib) => {
      const av = dataSource.sortKey(rows[ia]), bv = dataSource.sortKey(rows[ib]);
      if (av < bv) return dataSource.sortDir === 'desc' ? 1 : -1;
      if (av > bv) return dataSource.sortDir === 'desc' ? -1 : 1;
      return 0;
    });
  }
  let sorted = rawIdx.map(ri => rows[ri]);

  const bodyRows = sorted.map(dataSource.rowMap);
  const headerHtml = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
  // Analysis side-data for expandable rows (currently only the Bill Passage
  // Probability Index sets `dataSource.expandable`) — loaded once up front
  // so the click handler wired up below can render a panel synchronously.
  const analysisData = dataSource.expandable ? await loadJSON(dataSource.expandable.file) : null;
  if (token !== renderToken) return;

  // Signal is computed from the RAW row (sorted[i]) — the field names the
  // signal engine looks for (current_stage, criminal_cases, etc.) come
  // straight from the CSV, not from whatever rowMap projected into display
  // columns. Prepended to the first cell of each row — with columns varying
  // per feature, "first cell" is the one position guaranteed to exist and
  // always be visible, rather than hand-mapping a "status column" per
  // archetype across 30 differently-shaped tables.
  const rowParts = bodyRows.map((r, i) => {
    const signal = computeSignal(archetype, sorted[i], dataSource.csv, sorted);
    const signalHtml = signalMarkupHtml(signal);
    const chevron = dataSource.expandable ? '<span class="expand-chevron">▸</span>' : '';
    const rowClass = dataSource.expandable ? ' class="expandable-row"' : '';
    const mainRow = `<tr${rowClass} data-row-idx="${i}" data-raw-idx="${rawIdx[i]}">${r.map((c, ci) => `<td title="${escapeHtml(cellToTitle(c))}">${ci === 0 ? chevron + signalHtml : ''}${cellToHtml(c)}</td>`).join('')}</tr>`;
    if (!dataSource.expandable) return mainRow;
    // Built empty and populated lazily on first expand (see click handler
    // below) — building all ~4,500 panels eagerly would mean parsing that
    // much extra markup up front for rows the user may never open.
    const panelRow = `<tr class="expand-panel-row" data-row-idx="${i}" style="display:none"><td colspan="${columns.length}"></td></tr>`;
    return mainRow + panelRow;
  });

  if (token !== renderToken) return;
  // Big tables get table-layout:fixed with column widths sampled from the
  // first rows — auto layout must measure EVERY cell to size columns, which
  // costs ~1s of reflow for a 9k-row table on every layout flush.
  let colgroupHtml = '', fixedStyle = '';
  if (rows.length > 1200) {
    const sample = bodyRows.slice(0, 40);
    const lens = columns.map((c, ci) => {
      let m = String(c).length;
      sample.forEach(r => { m = Math.max(m, Math.min(64, String(r[ci] == null ? '' : r[ci]).length)); });
      return Math.max(7, m) + (ci === 0 ? 4 : 0);
    });
    const totalLen = lens.reduce((a, b) => a + b, 0) || 1;
    colgroupHtml = '<colgroup>' + lens.map(l => `<col style="width:${(l / totalLen * 100).toFixed(1)}%">`).join('') + '</colgroup>';
    fixedStyle = ' style="table-layout:fixed"';
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <table class="sample"${fixedStyle}>
      ${colgroupHtml}
      <caption>${escapeHtml(S().liveCaption(dataSource.csv, rows.length))}</caption>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody></tbody>
    </table>
    ${dataSource.note ? `<button class="info-link" type="button">${escapeHtml(S().sourceMethodology)}</button>` : ''}
  `;
  // Feed the tbody in slices — one giant innerHTML parse of thousands of
  // rows blocks the main thread for ~a second on tier switch. The first
  // slice attaches immediately so the table paints; the rest stream in on
  // idle ticks. All wiring below runs after the final slice, so event
  // listeners see every row.
  const tbodyEl = wrapper.querySelector('tbody');
  const ROW_CHUNK = 250;
  tbodyEl.innerHTML = rowParts.slice(0, ROW_CHUNK).join('');
  if (rowParts.length > ROW_CHUNK) {
    container.replaceChildren(wrapper);
    for (let ci = ROW_CHUNK; ci < rowParts.length; ci += ROW_CHUNK) {
      await niyYield();
      if (token !== renderToken) return;
      tbodyEl.insertAdjacentHTML('beforeend', rowParts.slice(ci, ci + ROW_CHUNK).join(''));
      void tbodyEl.offsetHeight; // settle recalc for THIS slice — otherwise the whole bill lands on the next layout reader as one long task
    }
  }

  // Everything below used to run in ONE post-streaming microtask (~1.3s:
  // 4.5k per-row listeners + filter scan + caches). Yield first, and wire
  // the accordion via ONE delegated listener instead of one per row.
  await niyYield();
  if (token !== renderToken) return;

  if (dataSource.note) {
    wrapper.querySelector('.info-link').addEventListener('click', () => {
      openInfoModal(S().sourceMethodology, `<p>${escapeHtml(dataSource.note)}</p>`);
    });
  }

  if (dataSource.expandable) {
    wrapper.addEventListener('click', (niyEv) => {
      const tr = niyEv.target.closest && niyEv.target.closest('tr.expandable-row');
      if (!tr || !wrapper.contains(tr)) return;
      {
        const idx = Number(tr.dataset.rowIdx);
        const panelRow = wrapper.querySelector(`tr.expand-panel-row[data-row-idx="${idx}"]`);
        const nowExpanded = panelRow.style.display === 'none';
        panelRow.style.display = nowExpanded ? '' : 'none';
        tr.classList.toggle('expanded', nowExpanded);
        if (nowExpanded && !panelRow.dataset.built) {
          const rawRow = sorted[idx];
          const analysis = analysisData[rawRow[dataSource.expandable.key]];
          const td = panelRow.querySelector('td');
          // renderPanel is a function NAME (string), not a direct function
          // reference — feature-data.js loads before app.js defines these
          // renderer functions, so referencing them directly there would
          // throw a ReferenceError at feature-data.js's own load time.
          // Resolved here instead, once app.js (and everything else) has
          // definitely finished loading.
          const renderPanel = window[dataSource.expandable.renderPanel] || renderBillAnalysisPanel;
          td.innerHTML = renderPanel(analysis, rawRow);
          const methodologyBtn = td.querySelector('[data-methodology-btn]');
          if (methodologyBtn) {
            methodologyBtn.addEventListener('click', () => {
              openInfoModal(S().sourceMethodology, `<p>${escapeHtml(methodologyBtn.dataset.methodology)}</p>`);
            });
          }
          panelRow.dataset.built = '1';
        }
      }
    });
  }

  // This is the one, unavoidable HTML-parse cost for a dataset this size —
  // caching the resulting DOM node (not just the string) means it only
  // happens once per session; every later visit just re-attaches it.
  renderedBlockCache.set(dataSource, wrapper);
  await niyYield();
  if (token !== renderToken) return;
  if (isPrimary) {
    const filterableColumns = computeFilterableColumns(columns, bodyRows);
    filterableColumnsCache.set(dataSource, filterableColumns);
    buildColumnFilterUI(filterableColumns);
  }
  container.replaceChildren(wrapper);
}

// Renders the Bill Passage Probability Index's accordion panel: status line
// -> three stat cards (probability / precedent / days-in-stage) -> sectors
// pills -> key-terms pills -> state-stance bars (only if non-empty). Every
// field independently falls back to a "Pending analysis" state instead of
// ever rendering undefined/NaN — most of the ~4,576 tracked bills only have
// the probability/precedent stats (computed from the dataset's own
// historical outcomes) and not yet the Nemotron-derived sector/key-term
// tags, which are scoped to recently introduced bills (see bill_tagger.py).
function renderBillAnalysisPanel(analysis, rawRow) {
  const s = S();
  if (!analysis) {
    return `<div class="bill-panel"><div class="pending-note">${escapeHtml(s.pendingAnalysis)}</div></div>`;
  }
  const pp = analysis.passage_probability || {};
  const prec = analysis.precedent || {};
  const dur = analysis.stage_duration || {};
  const sectors = analysis.sectors || [];
  const keyTerms = analysis.key_terms || [];
  const stance = analysis.state_stance || [];

  const statValue = (val, suffix) => (val === null || val === undefined)
    ? `<div class="stat-value pending">${escapeHtml(s.pendingAnalysis)}</div>`
    : `<div class="stat-value">${escapeHtml(String(val))}${suffix || ''}</div>`;

  const signalLevel = (ratio) => ratio >= 2 / 3 ? 'green' : ratio >= 1 / 3 ? 'amber' : 'red';

  const bp = s.billPanel;
  const probabilityGauge = (pp.score === null || pp.score === undefined) ? '' : `
    <div class="gauge">
      <div class="gauge-track"><div class="gauge-fill gauge-${signalLevel(pp.score / 100)}" style="width:${pp.score}%"></div></div>
    </div>
  `;
  const methodologyLink = pp.methodology_note
    ? `<button class="info-link" type="button" data-methodology-btn data-methodology="${escapeHtml(pp.methodology_note)}">${escapeHtml(bp.methodology)}</button>`
    : '';

  const precedentBar = (prec.similar_bill_count) ? `
    <div class="gauge">
      <div class="gauge-track"><div class="gauge-fill gauge-${signalLevel(prec.similar_bill_passed_count / prec.similar_bill_count)}" style="width:${Math.round((prec.similar_bill_passed_count / prec.similar_bill_count) * 100)}%"></div></div>
    </div>
    <div class="stat-note">${escapeHtml(bp.precedentCount(prec.similar_bill_passed_count, prec.similar_bill_count))}</div>
  ` : `<div class="stat-value pending">${escapeHtml(s.pendingAnalysis)}</div>`;

  const statCards = `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(bp.passageProbability)}</div>
        ${statValue(pp.score, '%')}
        ${probabilityGauge}
        ${methodologyLink}
      </div>
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(bp.precedent)}</div>
        ${precedentBar}
      </div>
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(bp.daysInStage)}</div>
        ${statValue(dur.days_in_current_stage, 'd')}
        ${dur.typical_days_for_stage != null ? `<div class="stat-note">${escapeHtml(bp.typical(dur.typical_days_for_stage))}</div>` : ''}
      </div>
    </div>
  `;

  const sectorsHtml = sectors.length
    ? `<div class="pill-row">${sectors.map(sec => `<span class="pill-sector">${escapeHtml(sec)}</span>`).join('')}</div>`
    : `<div class="pending-note" style="margin-bottom:10px;">${escapeHtml(s.pendingAnalysis)}</div>`;

  const keyTermsHtml = keyTerms.length
    ? `<div class="pill-row">${keyTerms.map(kt => `<span class="pill-keyterm">${escapeHtml(kt)}</span>`).join('')}</div>`
    : '';

  const stanceHtml = stance.length ? `
    <div class="pill-row-label">${escapeHtml(bp.stateStance)}</div>
    <div class="stance-bars">
      ${stance.map(st => `
        <div class="stance-bar-row stance-${escapeHtml(st.stance)}">
          <span class="stance-who">${escapeHtml(st.state_or_party)}</span>
          <span class="stance-bar-track"><span class="stance-bar-fill" style="width:${Math.round((st.confidence || 0) * 100)}%"></span></span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const coverageHtml = renderCoverageSection(analysis.related_coverage, bp.relatedCoverage);
  const keyChangesHtml = renderDetailList(analysis.key_changes, bp.keyChanges);
  const briefHtml = analysis.brief ? `<div class="body-text">${escapeHtml(analysis.brief)}</div>` : '';
  const pdfUrl = analysis.enrichment?.pdf_links?.introduced;
  const pdfLinkHtml = pdfUrl ? `<a class="info-link" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" style="display:inline-block;margin:0 0 14px;">${escapeHtml(bp.downloadPdf)}</a>` : '';

  const billEmbedHtml = window.embedButtonHtml ? window.embedButtonHtml('Bill', rawRow.bill_name || 'Bill', () =>
    `<strong>${escapeHtml(rawRow.bill_name || '')}</strong><br>Stage: ${escapeHtml(rawRow.current_stage || '')}${pp.score != null ? '<br>Passage probability: ' + pp.score + '%' : ''}${analysis.brief ? '<br>' + escapeHtml(analysis.brief) : ''}`
  ) : '';

  return `
    <div class="bill-panel">
      <div class="status-line">${escapeHtml(rawRow.current_stage || '')}${pp.comparison_baseline ? ' · ' + escapeHtml(pp.comparison_baseline) : ''}</div>
      ${briefHtml}
      ${pdfLinkHtml}
      ${statCards}
      <div class="pill-row-label">${escapeHtml(bp.sectors)}</div>
      ${sectorsHtml}
      ${keyTerms.length ? `<div class="pill-row-label">${escapeHtml(bp.keyTerms)}</div>` : ''}
      ${keyTermsHtml}
      ${keyChangesHtml}
      ${stanceHtml}
      ${coverageHtml}
      ${cardActionsHtml(billEmbedHtml, pdfUrl, `Explain this bill's likely trajectory and why it matters: ${rawRow.bill_name || ''}. Current stage: ${rawRow.current_stage || ''}.${pp.score != null ? ' Passage probability estimate: ' + pp.score + '%.' : ''}${analysis.brief ? ' Context: ' + analysis.brief : ''}`)}
    </div>
  `;
}

// Shared by every expandable-panel renderer (bill index, sector mapper,
// regulatory watch, affidavit database) — a labeled list of real news
// links, with a defined "Pending analysis" empty state instead of just
// omitting the section.
function renderCoverageSection(coverage, label) {
  const s = S();
  if (!coverage || !coverage.length) {
    return `<div class="pill-row-label">${escapeHtml(label)}</div><div class="pending-note">${escapeHtml(s.pendingAnalysis)}</div>`;
  }
  return `
    <div class="pill-row-label">${escapeHtml(label)}</div>
    <div class="coverage-list">
      ${coverage.map(a => `
        <a class="coverage-item" href="${escapeHtml(a.link)}" target="_blank" rel="noopener">
          <span class="coverage-title">${escapeHtml(a.title)}</span>
          ${a.source ? `<span class="coverage-source">${escapeHtml(a.source)}</span>` : ''}
        </a>
      `).join('')}
    </div>
  `;
}

// Shared bullet-list renderer for "key changes" / "possible effects" style
// fields — returns '' (not a pending state) when empty, since these fields
// are optional context rather than a headline stat every row must show.
function renderDetailList(items, label) {
  if (!items || !items.length) return '';
  return `
    <div class="pill-row-label">${escapeHtml(label)}</div>
    <ul class="detail-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  `;
}

function formatRupees(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// Regulatory Body Watch's accordion panel: category badge, plain-English
// brief, possible-effects bullets, real news coverage, and a direct PDF
// link (RBI's own PDF host blocks automated fetches with a JS challenge,
// but the link works fine for a real user's browser — see
// scripts/regulatory_watch_enricher.py for what was actually verified).
// Sector Impact Mapper's accordion panel — reuses the exact same bill
// analysis data as the Bill Passage Probability Index (same
// national_bill_analysis.json, same bill id), just framed around "what
// changes for this sector" instead of "will this pass": sector pills up
// front, then the real key_changes extracted from the bill's own text
// (which — since Indian amendment bills state the old wording being struck
// and the new wording substituted — doubles as the old-law-vs-new-bill
// comparison) rather than a separately fetched old-Act text.
function renderSectorImpactPanel(analysis, rawRow) {
  const s = S();
  if (!analysis) {
    return `<div class="bill-panel"><div class="pending-note">${escapeHtml(s.pendingAnalysis)}</div></div>`;
  }
  const sip = s.sectorImpactPanel;
  const sectors = analysis.sectors || [];
  const sectorsHtml = sectors.length
    ? `<div class="pill-row">${sectors.map(sec => `<span class="pill-sector">${escapeHtml(sec)}</span>`).join('')}</div>`
    : `<div class="pending-note" style="margin-bottom:10px;">${escapeHtml(s.pendingAnalysis)}</div>`;
  const briefHtml = analysis.brief ? `<div class="body-text">${escapeHtml(analysis.brief)}</div>` : '';
  const pdfUrl = analysis.enrichment?.pdf_links?.introduced;
  const pdfLinkHtml = pdfUrl
    ? `<a class="info-link" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" style="display:inline-block;margin:0 0 14px;">${escapeHtml(s.billPanel.downloadPdf)}</a>`
    : '';
  const changesHtml = renderDetailList(analysis.key_changes, sip.oldVsNew);
  const coverageHtml = renderCoverageSection(analysis.related_coverage, s.billPanel.relatedCoverage);
  const sectorEmbedHtml = window.embedButtonHtml ? window.embedButtonHtml('Sector Impact', rawRow.bill_name || 'Bill', () =>
    `<strong>${escapeHtml(rawRow.bill_name || '')}</strong> — Sector Impact<br>Sectors: ${escapeHtml(sectors.join(', '))}${analysis.brief ? '<br>' + escapeHtml(analysis.brief) : ''}`
  ) : '';
  return `
    <div class="bill-panel">
      <div class="pill-row-label">${escapeHtml(sip.sectorsAffected)}</div>
      ${sectorsHtml}
      ${briefHtml}
      ${pdfLinkHtml}
      ${changesHtml}
      ${coverageHtml}
      ${cardActionsHtml(sectorEmbedHtml, pdfUrl, `What does this bill mean for the sectors it affects — ${sectors.join(', ') || 'the affected sectors'}? Bill: ${rawRow.bill_name || ''}.${analysis.brief ? ' Context: ' + analysis.brief : ''}`)}
    </div>
  `;
}

function renderRegulatoryPanel(analysis, rawRow) {
  const s = S();
  if (!analysis) {
    return `<div class="bill-panel"><div class="pending-note">${escapeHtml(s.pendingAnalysis)}</div></div>`;
  }
  const briefHtml = analysis.brief ? `<div class="body-text">${escapeHtml(analysis.brief)}</div>` : '';
  const pdfUrl = analysis.pdf_url || rawRow.pdf_url;
  const pdfLinkHtml = pdfUrl
    ? `<a class="info-link" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" style="display:inline-block;margin:0 0 14px;">${escapeHtml(s.billPanel.downloadPdf)}</a>`
    : '';
  const effectsHtml = renderDetailList(analysis.possible_effects, s.regulatoryPanel.possibleEffects);
  const coverageHtml = renderCoverageSection(analysis.related_coverage, s.billPanel.relatedCoverage);
  const regulatoryEmbedHtml = window.embedButtonHtml ? window.embedButtonHtml('Regulatory', rawRow.title || rawRow.circular_name || 'Circular', () =>
    `<strong>${escapeHtml(rawRow.title || rawRow.circular_name || '')}</strong>${analysis.category ? '<br>' + escapeHtml(analysis.category) : ''}${analysis.brief ? '<br>' + escapeHtml(analysis.brief) : ''}`
  ) : '';
  return `
    <div class="bill-panel">
      ${analysis.category ? `<div class="category-badge">${escapeHtml(analysis.category)}</div>` : ''}
      ${briefHtml}
      ${pdfLinkHtml}
      ${effectsHtml}
      ${coverageHtml}
      ${cardActionsHtml(regulatoryEmbedHtml, pdfUrl, `Explain the practical effect of this regulatory action: ${rawRow.title || rawRow.circular_name || ''}.${analysis.category ? ' Category: ' + analysis.category + '.' : ''}${analysis.brief ? ' Context: ' + analysis.brief : ''}`)}
    </div>
  `;
}

// Candidate Affidavit Database's accordion panel: a real 2019-vs-2024
// wealth comparison (myneta's own recontest-comparison tool, matched by
// candidate_id — see scripts/candidate_wealth_enricher.py) where
// available, and the criminal-case count already in the CSV — never a
// fabricated case-by-case description, since no source here publishes
// that level of detail.
function renderAffidavitPanel(analysis, rawRow) {
  const s = S();
  const ap = s.affidavitPanel;
  const criminalCases = Number(rawRow.criminal_cases) || 0;
  const affidavitEmbedHtml = window.embedButtonHtml ? window.embedButtonHtml('Affidavit', rawRow.name || 'Affidavit', () =>
    `<strong>${escapeHtml(rawRow.name || '')}</strong><br>Constituency: ${escapeHtml(rawRow.constituency || '')}<br>Criminal cases: ${criminalCases}<br>Party: ${escapeHtml(rawRow.party || '')}`
  ) : '';
  const casesHtml = `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(ap.criminalCases)}</div>
      <div class="stat-value${criminalCases === 0 ? ' pending' : ''}">${criminalCases}</div>
      <div class="stat-note">${escapeHtml(criminalCases > 0 ? ap.casesDeclaredNote(criminalCases) : ap.noCasesDeclared)}</div>
      <div style="margin-top:8px;">${affidavitEmbedHtml}</div>
    </div>
  `;

  let wealthHtml;
  if (analysis) {
    const max = Math.max(analysis.assets_2019, analysis.assets_2024) || 1;
    const assetsEmbedHtml = window.embedButtonHtml ? window.embedButtonHtml('Assets', (rawRow.name || 'Candidate') + ' — Assets', () =>
      `<strong>${escapeHtml(rawRow.name || '')}</strong> — Assets<br>2019: ${formatRupees(analysis.assets_2019)}<br>2024: ${formatRupees(analysis.assets_2024)}<br>Change: ${analysis.pct_increase >= 0 ? '+' : ''}${analysis.pct_increase}%`
    ) : '';
    wealthHtml = `
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(ap.wealthChange)}</div>
        <div class="wealth-row"><span class="wealth-year">2019</span><div class="gauge-track"><div class="gauge-fill gauge-amber" style="width:${Math.round(analysis.assets_2019 / max * 100)}%"></div></div><span class="wealth-amt">${formatRupees(analysis.assets_2019)}</span></div>
        <div class="wealth-row"><span class="wealth-year">2024</span><div class="gauge-track"><div class="gauge-fill gauge-amber" style="width:${Math.round(analysis.assets_2024 / max * 100)}%"></div></div><span class="wealth-amt">${formatRupees(analysis.assets_2024)}</span></div>
        <div class="stat-note">${analysis.pct_increase >= 0 ? '+' : ''}${analysis.pct_increase}% (${formatRupees(Math.abs(analysis.increase))})</div>
        <a class="info-link" href="${escapeHtml(analysis.source_url)}" target="_blank" rel="noopener">${escapeHtml(ap.viewComparison)}</a>
        <div style="margin-top:8px;">${assetsEmbedHtml}</div>
      </div>
    `;
  } else {
    wealthHtml = `
      <div class="stat-card">
        <div class="stat-label">${escapeHtml(ap.wealthChange)}</div>
        <div class="stat-value pending">${escapeHtml(s.pendingAnalysis)}</div>
        <div class="stat-note">${escapeHtml(ap.noRecontestData)}</div>
      </div>
    `;
  }

  return `
    <div class="bill-panel">
      <div class="stat-cards">${wealthHtml}${casesHtml}</div>
      ${cardActionsHtml('', rawRow.source_url, `Summarize what's notable about this candidate's declared assets and criminal cases: ${rawRow.name || ''}, ${rawRow.constituency || ''} (${rawRow.party || ''}). Declared assets: ${rawRow.total_assets || 'not available'}. Criminal cases: ${criminalCases}.`)}
    </div>
  `;
}

  /* ============ POLICY INTELLIGENCE GRAPH (real bill data + Groq) ============ */
  var __niyPig = { built: false, model: null, expanded: null, selected: null, query: '', stage: '', els: null, ai: {}, yearRange: null };
  // 14 real policy domains (tagged across bills) -> India's 3 economic sectors.
  // Every bill carries a real ministry 'sector' in the CSV; classify all 71 into
  // ~16 clean domains under India's 3 economic sectors (real mapping, no invention).
  function pigClassify(raw){
    var s=String(raw||'').toUpperCase();
    if(/AGRICULTUR|FARMER|RURAL|FISHER|ANIMAL|FOOD PROCESS|PANCHAYAT/.test(s)) return {sec:'Primary',dom:'Agriculture & Rural'};
    if(/ENVIRONMENT|FOREST|WATER|JAL|EARTH SCIENCE|CLIMATE/.test(s)) return {sec:'Primary',dom:'Environment & Water'};
    if(/MINE|COAL|MINERAL/.test(s)) return {sec:'Primary',dom:'Mining & Minerals'};
    if(/POWER|PETROLEUM|NATURAL GAS|ENERGY|RENEWABLE/.test(s)) return {sec:'Secondary',dom:'Energy'};
    if(/RAILWAY|SHIPPING|ROAD TRANSPORT|HIGHWAY|CIVIL AVIATION|PORT|TRANSPORT|URBAN DEVELOP|HOUSING/.test(s)) return {sec:'Secondary',dom:'Infrastructure & Transport'};
    if(/COMMERCE|INDUSTR|CORPORATE|TEXTILE|STEEL|HEAVY|MSME|MICRO|CHEMICAL|FERTILIZ/.test(s)) return {sec:'Secondary',dom:'Industry & Commerce'};
    if(/COMMUNICATION|ELECTRONIC|INFORMATION TECHNOLOGY|BROADCAST|INFORMATION AND BROAD|TELECOM/.test(s)) return {sec:'Secondary',dom:'Technology & Telecom'};
    if(/FINANCE|TAX|REVENUE|BANKING|INSURANCE/.test(s)) return {sec:'Services',dom:'Finance & Taxation'};
    if(/HOME AFFAIRS|DEFENCE|SECURITY/.test(s)) return {sec:'Services',dom:'Home & Defence'};
    if(/LAW AND JUSTICE|JUSTICE|LEGAL|PERSONNEL|GRIEVANCE|PARLIAMENT/.test(s)) return {sec:'Services',dom:'Law & Governance'};
    if(/HEALTH|FAMILY WELFARE|AYUSH/.test(s)) return {sec:'Services',dom:'Health'};
    if(/HUMAN RESOURCE|EDUCATION|SKILL|YOUTH/.test(s)) return {sec:'Services',dom:'Education & Skills'};
    if(/LABOUR|EMPLOYMENT/.test(s)) return {sec:'Services',dom:'Labour & Employment'};
    if(/SOCIAL JUSTICE|WOMEN|CHILD|TRIBAL|MINORIT|CONSUMER|DISABIL|SOCIAL/.test(s)) return {sec:'Services',dom:'Social Welfare'};
    if(/EXTERNAL AFFAIRS|FOREIGN|OVERSEAS/.test(s)) return {sec:'Services',dom:'External Affairs'};
    return {sec:'Services',dom:'General Legislation'};
  }
  // India GDP composition — approximate public figures (MoSPI / Economic Survey).
  var PIG_SEC_META = {
    Primary: { label: 'Primary', gdp: 18, emp: 43, blurb: 'Agriculture, allied & natural resources' },
    Secondary: { label: 'Secondary', gdp: 27, emp: 25, blurb: 'Industry, infrastructure & manufacturing' },
    Services: { label: 'Services', gdp: 55, emp: 32, blurb: 'Finance, digital, social & public administration' }
  };
  var PIG_MAX_BILLS = 12;

  function pigStagePassed(s) { return /passed|assent|act\b|enacted/i.test(s || ''); }
  function pigStageDead(s) { return /negativ|withdraw|lapse|reject/i.test(s || ''); }
  function pigBuildModel() {
    var bills = (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA['national_bill_tracker.csv']) || [];
    var A = (typeof EMBEDDED_JSON_DATA !== 'undefined' && EMBEDDED_JSON_DATA['national_bill_analysis.json']) || {};
    var nodes = {};
    nodes['india'] = { id: 'india', level: 0, label: 'India', children: [] };
    var sectorIds = [];
    Object.keys(PIG_SEC_META).forEach(function (sk) {
      var id = 'sec:' + sk; sectorIds.push(id);
      nodes[id] = { id: id, level: 1, label: PIG_SEC_META[sk].label, sector: sk, children: [], bills: [] };
      nodes['india'].children.push(id);
    });
    var domMap = {};
    bills.forEach(function (b) {
      var a = A[String(b.id)] || A[b.id] || {};
      var cls = pigClassify(b.sector);
      var domain = cls.dom, parentSec = cls.sec;
      var secs = (Array.isArray(a.sectors) && a.sectors.length) ? a.sectors : [domain];
      var domId = 'dom:' + domain;
      if (!domMap[domId]) {
        domMap[domId] = { id: domId, level: 2, label: domain, sector: parentSec, children: [], bills: [] };
        nodes[domId] = domMap[domId];
        nodes['sec:' + parentSec].children.push(domId);
      }
      var billNode = {
        id: 'bill:' + b.id, level: 3, label: (b.bill_name || 'Bill').replace(/^THE\s+/i, ''), children: [],
        raw: b, an: a, sectors: secs, domain: domain, sector: parentSec,
        stage: b.current_stage || '', passage: (a.passage_probability && a.passage_probability.score != null) ? a.passage_probability.score : null
      };
      nodes[billNode.id] = billNode;
      domMap[domId].children.push(billNode.id);
      domMap[domId].bills.push(billNode);
      nodes['sec:' + parentSec].bills.push(billNode);
    });
    // rank bills within a domain by passage then recency; keep the graph to what matters
    Object.values(domMap).forEach(function (d) {
      d.children.sort(function (x, y) { var dx=(nodes[x].raw.date_introduced||''),dy=(nodes[y].raw.date_introduced||''); if(dy!==dx) return dy<dx?-1:1; return (nodes[y].passage||0)-(nodes[x].passage||0); });
    });
    // sector rollups
    sectorIds.forEach(function (id) {
      var s = nodes[id];
      s.billCount = s.bills.length;
      s.passed = s.bills.filter(function (b) { return pigStagePassed(b.stage); }).length;
      s.active = s.bills.filter(function (b) { return !pigStagePassed(b.stage) && !pigStageDead(b.stage); }).length;
      var pv = s.bills.map(function (b) { return b.passage; }).filter(function (x) { return x != null; });
      s.avgPass = pv.length ? Math.round(pv.reduce(function (a, c) { return a + c; }, 0) / pv.length) : null;
      s.domainCount = s.children.length;
      // transparent composite impact score 0-100
      var meta = PIG_SEC_META[s.sector];
      s.impact = Math.min(100, Math.round(
        Math.min(1, s.billCount / 40) * 45 + (meta.gdp / 55) * 30 + ((s.avgPass || 0) / 100) * 25
      ));
      s.impactFactors = { bills: s.billCount, gdp: meta.gdp, avgPass: s.avgPass || 0 };
    });
    return { nodes: nodes, sectorIds: sectorIds, billTotal: bills.length, domainCount: Object.keys(domMap).length };
  }

  function pigVisibleChildren(id) {
    var m = __niyPig.model, n = m.nodes[id]; if (!n) return [];
    if (n.level === 0) return m.sectorIds;
    if (n.level === 1) return __niyPig.expanded.has(id) ? n.children : [];
    if (n.level === 2) { if (!__niyPig.expanded.has(id)) return []; var ch = n.children; var yr = __niyPig.yearRange; if (yr) ch = ch.filter(function (c) { var yy = pigYearOf(__niyPig.model.nodes[c]); return yy >= yr[0] && yy <= yr[1]; }); return ch.slice(0, PIG_MAX_BILLS); }
    return [];
  }
  function pigWeight(id) { var ch = pigVisibleChildren(id); if (!ch.length) return 1; return ch.reduce(function (s, c) { return s + pigWeight(c); }, 0); }

  var PIG_CX = 500, PIG_CY = 362, PIG_RINGS = [0, 150, 288, 408];
  function pigLayout() {
    var vis = {};
    function place(id, a0, a1, level) {
      var mid = (a0 + a1) / 2, r = PIG_RINGS[Math.min(level, 3)];
      vis[id] = { angle: mid, x: PIG_CX + r * Math.cos(mid), y: PIG_CY + r * Math.sin(mid), level: level };
      var ch = pigVisibleChildren(id); if (!ch.length) return;
      var tot = ch.reduce(function (s, c) { return s + pigWeight(c); }, 0), a = a0;
      ch.forEach(function (c) { var span = (a1 - a0) * (pigWeight(c) / tot); place(c, a, a + span, level + 1); a += span; });
    }
    place('india', -Math.PI / 2, Math.PI * 1.5, 0);
    return vis;
  }

  var PIG_NS = 'http://www.w3.org/2000/svg';
  function pigNodeStyle(n) {
    if (n.level === 0) return { r: 26, fill: 'url(#pigIndia)', stroke: '#B18A42', label: 14, tcol: '' };
    if (n.level === 1) return { r: 17, fill: '#2B332F', stroke: '#7A9254', label: 12, tcol: '' };
    if (n.level === 2) return { r: 10, fill: '#232B27', stroke: '#5A665C', label: 10.5, tcol: '' };
    var p = n.passage; var c = p == null ? '#747C76' : p >= 60 ? '#647C3C' : p >= 30 ? '#B18A42' : '#7B2E2E';
    if (pigStagePassed(n.stage)) c = '#647C3C'; if (pigStageDead(n.stage)) c = '#7B2E2E';
    return { r: 6, fill: c, stroke: 'rgba(255,255,255,.15)', label: 9.5, tcol: '' };
  }
  function pigEdgeTone(n) {
    if (n.level <= 2) return 'var(--line-bright)';
    if (pigStagePassed(n.stage)) return '#647C3C'; if (pigStageDead(n.stage)) return '#7B2E2E';
    var p = n.passage; return p == null ? '#747C76' : p >= 60 ? '#647C3C' : p >= 30 ? '#B18A42' : '#982F2F';
  }

  function pigRenderGraph() {
    var svg = document.getElementById('pigSvg'); if (!svg) return;
    var m = __niyPig.model, vis = pigLayout();
    var gE = document.getElementById('pigEdges'), gN = document.getElementById('pigNodes');
    var els = __niyPig.els;
    var q = __niyPig.query.toLowerCase();
    // edges
    var wantE = {};
    Object.keys(vis).forEach(function (id) {
      var n = m.nodes[id]; if (!n || id === 'india') return;
      var parent = id.indexOf('bill:') === 0 ? ('dom:' + n.domain) : id.indexOf('dom:') === 0 ? ('sec:' + n.sector) : 'india';
      if (!vis[parent]) return;
      var eid = parent + '>' + id; wantE[eid] = 1;
      var p = vis[parent], c = vis[id];
      var d = 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' Q' + ((p.x + c.x) / 2).toFixed(1) + ' ' + ((p.y + c.y) / 2).toFixed(1) + ' ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
      var el = els.edges[eid];
      if (!el) { el = document.createElementNS(PIG_NS, 'path'); el.setAttribute('class', 'pig-edge' + (n.level === 3 ? ' flow' : '')); gE.appendChild(el); els.edges[eid] = el; }
      el.setAttribute('d', d);
      el.style.stroke = pigEdgeTone(n);
      el.style.strokeWidth = (n.level === 1 ? 2.2 : n.level === 2 ? 1.5 : 1) + 'px';
    });
    Object.keys(els.edges).forEach(function (eid) { if (!wantE[eid]) { els.edges[eid].remove(); delete els.edges[eid]; } });
    // nodes (enter / update / exit)
    var want = {};
    Object.keys(vis).forEach(function (id) {
      var n = m.nodes[id], v = vis[id], st = pigNodeStyle(n); want[id] = 1;
      var g = els.nodes[id], entering = false;
      if (!g) {
        entering = true;
        g = document.createElementNS(PIG_NS, 'g'); g.setAttribute('class', 'pig-node'); g.dataset.id = id;
        var parentId = id === 'india' ? null : id.indexOf('bill:') === 0 ? ('dom:' + n.domain) : id.indexOf('dom:') === 0 ? ('sec:' + n.sector) : 'india';
        var pv = parentId && vis[parentId] ? vis[parentId] : v;
        g.setAttribute('transform', 'translate(' + pv.x.toFixed(1) + ',' + pv.y.toFixed(1) + ')');
        var circ = document.createElementNS(PIG_NS, 'circle'); g.appendChild(circ);
        var txt = document.createElementNS(PIG_NS, 'text'); g.appendChild(txt);
        gN.appendChild(g); els.nodes[id] = g;
        g.addEventListener('click', function (e) { e.stopPropagation(); pigClick(id); });
      }
      var circ = g.querySelector('circle'), txt = g.querySelector('text');
      circ.setAttribute('r', st.r); circ.setAttribute('fill', st.fill); circ.setAttribute('stroke', st.stroke);
      circ.setAttribute('stroke-width', n.level === 1 ? 2 : 1.2);
      var showLabel = n.level <= 2 || pigVisibleChildren('dom:' + (n.domain || '')).length <= 14 || __niyPig.selected === id;
      var label = n.level === 3 ? (n.label.length > 26 ? n.label.slice(0, 24) + '…' : n.label) : n.label;
      txt.textContent = showLabel ? label : '';
      txt.setAttribute('font-size', st.label); txt.setAttribute('text-anchor', v.x < PIG_CX - 4 ? 'end' : 'start');
      txt.setAttribute('x', (v.x < PIG_CX - 4 ? -(st.r + 5) : (st.r + 5))); txt.setAttribute('y', 3.5);
      txt.setAttribute('font-weight', n.level <= 1 ? 700 : 500);
      var setT = function () { g.setAttribute('transform', 'translate(' + v.x.toFixed(1) + ',' + v.y.toFixed(1) + ')'); };
      if (entering) requestAnimationFrame(function () { requestAnimationFrame(setT); }); else setT();
      g.classList.toggle('sel', __niyPig.selected === id);
      var dim = q && n.label.toLowerCase().indexOf(q) < 0 && !(n.raw && (n.raw.bill_name || '').toLowerCase().indexOf(q) >= 0);
      g.classList.toggle('dim', !!(q && n.level === 3 && dim));
    });
    Object.keys(els.nodes).forEach(function (id) {
      if (!want[id]) { var g = els.nodes[id]; g.style.opacity = '0'; setTimeout(function () { g.remove(); }, 400); delete els.nodes[id]; }
    });
  }

  function pigClick(id) {
    var n = __niyPig.model.nodes[id]; if (!n) return;
    var ex = __niyPig.expanded;
    if (n.level === 1) {
      if (ex.has(id)) { ex.delete(id); n.children.forEach(function (d) { ex.delete(d); }); }
      else { __niyPig.model.sectorIds.forEach(function (s) { if (s !== id) { ex.delete(s); __niyPig.model.nodes[s].children.forEach(function (d) { ex.delete(d); }); } }); ex.add(id); }
    } else if (n.level === 2) {
      if (ex.has(id)) ex.delete(id);
      else { var sib = __niyPig.model.nodes['sec:' + n.sector].children; sib.forEach(function (d) { if (d !== id) ex.delete(d); }); ex.add(id); }
    }
    __niyPig.selected = id;
    pigRenderGraph(); pigRenderPanel(id); pigSyncSectorCards();
  }

  function pigFmt(t) { var e = escapeHtml(String(t || '')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); return e.split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  function pigAiMount(host, id, prompt) {
    host.innerHTML = '<div class="pig-ai"><div class="h"><b>✦ AI ANALYST</b><span style="font-size:10.5px;color:var(--fg-faint)">grounded briefing · verify before publishing</span><button class="rf" title="Regenerate">↻</button></div><div class="bd"><div class="load">Analysing…</div></div></div>';
    var bd = host.querySelector('.bd');
    function render(text, eng) { bd.innerHTML = '<div>' + pigFmt(text) + '</div><div class="foot">AI analysis' + (eng ? ' · ' + escapeHtml(eng) : '') + ' · not a substitute for primary sources</div>'; }
    function run(force) {
      if (!force && __niyPig.ai[id]) { render(__niyPig.ai[id].t, __niyPig.ai[id].e); return; }
      bd.innerHTML = '<div class="load">Analysing…</div>';
      fetch('/api/askai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 480 }) })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.text) { __niyPig.ai[id] = { t: j.text, e: j.engine }; render(j.text, j.engine); }
          else bd.innerHTML = '<div class="foot">Briefing unavailable' + (j && j.error ? ' — ' + escapeHtml(String(j.error)) : '') + '. Use ↻ to retry.</div>';
        }).catch(function () { bd.innerHTML = '<div class="foot">Briefing unavailable — check connection, retry with ↻.</div>'; });
    }
    host.querySelector('.rf').addEventListener('click', function () { run(true); });
    run(false);
  }

  function pigRenderPanel(id) {
    var host = document.getElementById('pigRight'); if (!host) return;
    var n = __niyPig.model.nodes[id]; if (!n) { pigPanelEmpty(); return; }
    var h = '', ai = '';
    if (n.level === 3) {
      var a = n.an || {}, pp = a.passage_probability || {}, pre = a.precedent || {};
      var stage = n.stage || '—', tone = pigStagePassed(stage) ? 'g' : pigStageDead(stage) ? 'r' : 'a';
      h += '<div class="pig-p-kicker">' + escapeHtml(n.sector) + ' · ' + escapeHtml(n.domain) + ' · BILL</div>';
      h += '<div class="pig-p-title">' + escapeHtml(n.raw.bill_name || n.label) + '</div>';
      h += '<div class="pig-p-badges"><span class="pig-badge ' + tone + '">' + escapeHtml(stage) + '</span>' + (n.raw.house ? '<span class="pig-badge">' + escapeHtml(n.raw.house) + '</span>' : '') + (pp.confidence ? '<span class="pig-badge">' + escapeHtml(pp.confidence) + ' confidence</span>' : '') + '</div>';
      h += '<div class="pig-metric-row"><div class="pig-metric"><div class="k">Passage probability</div><div class="v grad">' + (pp.score != null ? pp.score + '%' : '—') + '</div></div><div class="pig-metric"><div class="k">Introduced</div><div class="v" style="font-size:13px">' + escapeHtml((n.raw.date_introduced || '').slice(0, 10) || '—') + '</div></div></div>';
      if (pre.base_rate_label) h += '<div class="pig-sec-h">Precedent</div><div class="pig-body-text">' + escapeHtml(pre.base_rate_label) + '.</div>';
      if (Array.isArray(a.key_terms) && a.key_terms.length) h += '<div class="pig-sec-h">Key terms</div><div class="pig-p-badges">' + a.key_terms.slice(0, 10).map(function (t) { return '<span class="pig-badge">' + escapeHtml(t) + '</span>'; }).join('') + '</div>';
      if (n.sectors.length > 1) h += '<div class="pig-sec-h">Cross-sector impact</div><div class="pig-p-badges">' + n.sectors.map(function (s) { return '<span class="pig-badge a">' + escapeHtml(s) + '</span>'; }).join('') + '</div>';
      if (Array.isArray(a.related_coverage) && a.related_coverage.length) h += '<div class="pig-sec-h">Related coverage</div>' + a.related_coverage.slice(0, 4).map(function (c) { return '<a class="pig-cov" href="' + escapeHtml(c.link || '#') + '" target="_blank" rel="noopener">' + escapeHtml(c.title || '') + '<span class="s">' + escapeHtml(c.source || '') + '</span></a>'; }).join('');
      h += '<div class="pig-sec-h">AI intelligence</div><div id="pigAi"></div>';
      ai = 'You are Niyantran, a policy-intelligence terminal for Indian analysts. Brief me on this bill: "' + (n.raw.bill_name || n.label) + '" (stage: ' + stage + '; domains: ' + n.sectors.join(', ') + '). In short paragraphs cover: (1) what it does in plain terms, (2) its economic impact and which sectors/industries gain or lose, (3) political and administrative implications, (4) what to watch next. ~160 words, neutral, specific. If unsure of a fact, say so.';
    } else if (n.level === 2) {
      var passed = n.bills.filter(function (b) { return pigStagePassed(b.stage); }).length;
      var pv = n.bills.map(function (b) { return b.passage; }).filter(function (x) { return x != null; });
      var avg = pv.length ? Math.round(pv.reduce(function (s, c) { return s + c; }, 0) / pv.length) : null;
      h += '<div class="pig-p-kicker">' + escapeHtml(n.sector) + ' · POLICY DOMAIN</div><div class="pig-p-title">' + escapeHtml(n.label) + '</div>';
      h += '<div class="pig-metric-row"><div class="pig-metric"><div class="k">Bills tracked</div><div class="v grad">' + n.bills.length + '</div></div><div class="pig-metric"><div class="k">Passed / enacted</div><div class="v">' + passed + '</div></div><div class="pig-metric"><div class="k">Avg passage odds</div><div class="v">' + (avg != null ? avg + '%' : '—') + '</div></div><div class="pig-metric"><div class="k">In progress</div><div class="v">' + n.bills.filter(function (b) { return !pigStagePassed(b.stage) && !pigStageDead(b.stage); }).length + '</div></div></div>';
      h += '<div class="pig-sec-h">Top bills</div><ul class="pig-list">' + n.bills.slice(0, 8).map(function (b) { return '<li data-go="' + b.id + '">' + escapeHtml(b.label.slice(0, 60)) + '<span class="st">' + escapeHtml(b.stage) + '</span></li>'; }).join('') + '</ul>';
      h += '<div class="pig-sec-h">AI intelligence</div><div id="pigAi"></div>';
      ai = 'You are Niyantran, a policy-intelligence terminal. Give a briefing on the "' + n.label + '" policy domain in India: the current legislative momentum, the main bodies/regulators involved, who is affected, and 2-3 developments to watch. ~150 words, neutral. There are ' + n.bills.length + ' bills tracked in this domain here.';
    } else if (n.level === 1) {
      var meta = PIG_SEC_META[n.sector];
      h += '<div class="pig-p-kicker">ECONOMIC SECTOR</div><div class="pig-p-title">' + escapeHtml(meta.label) + ' Sector</div><div class="pig-body-text" style="color:var(--fg-dim)">' + escapeHtml(meta.blurb) + '</div>';
      h += '<div class="pig-metric-row"><div class="pig-metric"><div class="k">GDP share (approx)</div><div class="v grad">' + meta.gdp + '%</div></div><div class="pig-metric"><div class="k">Employment (approx)</div><div class="v">' + meta.emp + '%</div></div><div class="pig-metric"><div class="k">Bills touching sector</div><div class="v">' + n.billCount + '</div></div><div class="pig-metric"><div class="k">AI impact score</div><div class="v grad">' + n.impact + '</div></div></div>';
      h += '<div class="pig-sec-h">Why this score</div><div class="pig-body-text">Composite of legislative load (' + n.impactFactors.bills + ' bills), economic weight (' + n.impactFactors.gdp + '% of GDP) and average passage odds (' + n.impactFactors.avgPass + '%). GDP/employment are approximate MoSPI figures.</div>';
      h += '<div class="pig-sec-h">Policy domains (' + n.domainCount + ')</div><ul class="pig-list">' + n.children.map(function (dId) { var d = __niyPig.model.nodes[dId]; return '<li data-go="' + dId + '">' + escapeHtml(d.label) + '<span class="st">' + d.bills.length + ' bills</span></li>'; }).join('') + '</ul>';
      h += '<div class="pig-sec-h">AI intelligence</div><div id="pigAi"></div>';
      ai = 'You are Niyantran, a policy-intelligence terminal. Brief me on how current Indian legislation and regulation is shaping the ' + meta.label + ' sector of the economy (' + meta.blurb + '). Cover the dominant policy themes, the sectors/industries most exposed, and the near-term outlook. ~150 words, neutral.';
    } else {
      h += '<div class="pig-p-kicker">NATIONAL OVERVIEW</div><div class="pig-p-title">India · Policy Impact</div>';
      h += '<div class="pig-metric-row"><div class="pig-metric"><div class="k">Bills tracked</div><div class="v grad">' + __niyPig.model.billTotal + '</div></div><div class="pig-metric"><div class="k">Policy domains</div><div class="v">' + __niyPig.model.domainCount + '</div></div></div>';
      h += '<div class="pig-body-text" style="margin-top:6px">Click a sector to reveal its policy domains, then a domain to reveal the bills reshaping it. Select any node for a live AI briefing grounded in the real legislative record.</div>';
      h += '<div class="pig-sec-h">AI intelligence</div><div id="pigAi"></div>';
      ai = 'You are Niyantran, a policy-intelligence terminal for India. Give a concise state-of-play on the current legislative and policy landscape in India — the most active domains, the highest-stakes bills in play, and what analysts should watch this quarter. ~150 words, neutral.';
    }
    host.innerHTML = '<div class="pig-panel">' + h + '</div>';
    host.querySelectorAll('[data-go]').forEach(function (li) { li.addEventListener('click', function () { pigClick(li.dataset.go); }); });
    var aiHost = host.querySelector('#pigAi'); if (aiHost && ai) pigAiMount(aiHost, id, ai);
  }
  function pigPanelEmpty() {
    var host = document.getElementById('pigRight'); if (!host) return;
    host.innerHTML = '<div class="pig-empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M11 7l-5 9M13 7l5 9"/></svg><p>Select any node to open its intelligence briefing.</p></div>';
  }
  function pigSyncSectorCards() {
    document.querySelectorAll('.pig-sec-card').forEach(function (c) {
      c.classList.toggle('on', __niyPig.expanded.has('sec:' + c.dataset.sec) || __niyPig.selected === 'sec:' + c.dataset.sec);
    });
  }

  function pigYearOf(n) { var m = /(\d{4})/.exec((n && n.raw && n.raw.date_introduced) || ''); return m ? +m[1] : 0; }
  function pigBuildTimeline() {
    var host = document.getElementById('pigTimeline'); if (!host) return;
    var bills = Object.keys(__niyPig.model.nodes).map(function (k) { return __niyPig.model.nodes[k]; }).filter(function (n) { return n.level === 3; });
    var counts = {}, min = 9999, max = 0;
    bills.forEach(function (b) { var y = pigYearOf(b); if (y < 1900) return; counts[y] = (counts[y] || 0) + 1; if (y < min) min = y; if (y > max) max = y; });
    if (max < min) { host.style.display = 'none'; return; }
    host.style.display = '';
    var years = []; for (var y = min; y <= max; y++) years.push(y);
    var maxC = Math.max.apply(null, years.map(function (y) { return counts[y] || 0; })) || 1;
    var bars = years.map(function (y) { var hh = Math.round((counts[y] || 0) / maxC * 100); return '<div class="pig-tl-bar" data-y="' + y + '" title="' + y + ': ' + (counts[y] || 0) + ' bills" style="height:' + Math.max(2, hh) + '%"></div>'; }).join('');
    host.innerHTML = '<div class="pig-tl-head"><span>Bills introduced by year \u2014 drag to filter</span><span id="pigTlLabel">' + min + '\u2013' + max + ' \u00b7 all years</span></div>'
      + '<div class="pig-tl-bars" id="pigTlBars">' + bars + '<div class="pig-tl-sel" id="pigTlSel" style="display:none"></div></div>'
      + '<div class="pig-tl-axis"><span>' + min + '</span><span>' + Math.round((min + max) / 2) + '</span><span>' + max + '</span></div>';
    var barsEl = document.getElementById('pigTlBars'), sel = document.getElementById('pigTlSel'), lbl = document.getElementById('pigTlLabel');
    var n = years.length, dragging = false, moved = false, aIdx = 0;
    function idxAt(cx) { var r = barsEl.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.floor((cx - r.left) / r.width * n))); }
    function paint(i0, i1) {
      var lo = Math.min(i0, i1), hi = Math.max(i0, i1);
      sel.style.display = 'block'; sel.style.left = (lo / n * 100) + '%'; sel.style.width = ((hi - lo + 1) / n * 100) + '%';
      [].forEach.call(barsEl.querySelectorAll('.pig-tl-bar'), function (b, k) { b.classList.toggle('in', k >= lo && k <= hi); });
      __niyPig.yearRange = [years[lo], years[hi]]; lbl.textContent = years[lo] + '\u2013' + years[hi] + ' \u00b7 filtered';
    }
    barsEl.addEventListener('pointerdown', function (e) { dragging = true; moved = false; aIdx = idxAt(e.clientX); try { barsEl.setPointerCapture(e.pointerId); } catch (x) {} paint(aIdx, aIdx); });
    barsEl.addEventListener('pointermove', function (e) { if (!dragging) return; moved = true; paint(aIdx, idxAt(e.clientX)); });
    barsEl.addEventListener('pointerup', function (e) {
      if (!dragging) return; dragging = false;
      if (!moved) { __niyPig.yearRange = null; sel.style.display = 'none'; [].forEach.call(barsEl.querySelectorAll('.pig-tl-bar'), function (x) { x.classList.remove('in'); }); lbl.textContent = min + '\u2013' + max + ' \u00b7 all years'; }
      pigRenderGraph(); if (__niyPig.selected) pigRenderPanel(__niyPig.selected);
    });
  }
  function pigInitPanZoom() {
    var svg = document.getElementById('pigSvg'), vp = document.getElementById('pigViewport'); if (!svg || !vp) return;
    var k = 1, x = 0, y = 0, drag = false, sx = 0, sy = 0;
    function apply() { vp.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + k.toFixed(3) + ')'); }
    function zoomAt(cx, cy, f) { var nk = Math.max(0.45, Math.min(4, k * f)); var r = svg.getBoundingClientRect(); var mx = (cx - r.left) / r.width * 1000, my = (cy - r.top) / r.height * 724; x = mx - (mx - x) * (nk / k); y = my - (my - y) * (nk / k); k = nk; apply(); }
    svg.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.9); }, { passive: false });
    svg.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('.pig-node')) return; drag = true; sx = e.clientX; sy = e.clientY; try { svg.setPointerCapture(e.pointerId); } catch (x2) {} });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; var r = svg.getBoundingClientRect(); x += (e.clientX - sx) / r.width * 1000; y += (e.clientY - sy) / r.height * 724; sx = e.clientX; sy = e.clientY; apply(); });
    svg.addEventListener('pointerup', function () { drag = false; });
    svg.addEventListener('pointercancel', function () { drag = false; });
    var tb = document.getElementById('pigToolbar');
    if (tb) tb.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var r = svg.getBoundingClientRect(); if (b.dataset.z === 'in') zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25); else if (b.dataset.z === 'out') zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.8); else { k = 1; x = 0; y = 0; apply(); } });
  }

  function niyMountPolicyGraph() {
    var feats = (typeof featuresForTier === 'function') ? featuresForTier(activeTier) : [];
    var f = feats && feats[activeIndex];
    if (!f || !f.pig) return;
    if (typeof renderToken !== 'undefined') renderToken++;      // cancel the stale feed render targeting #detail
    var d = document.getElementById('detail'); if (!d) return;
    d.classList.add('pig-host');
    if (!__niyPig.model) __niyPig.model = pigBuildModel();
    __niyPig.expanded = __niyPig.expanded || new Set();
    __niyPig.els = { nodes: {}, edges: {} };
    var m = __niyPig.model;
    d.innerHTML =
      '<div class="pig-wrap">'
      + '<div class="pig-top"><div class="pig-title"><b>Policy Intelligence Graph</b></div><div class="pig-sub">' + m.billTotal.toLocaleString('en-IN') + ' bills · ' + m.domainCount + ' domains · live</div>'
      + '<div class="pig-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="pigQ" placeholder="Search bills…" autocomplete="off"></div>'
      + '<button class="pig-chip" id="pigReset">Reset view</button></div>'
      + '<div class="pig-body">'
      + '<div class="pig-left"><div class="pig-rail-h">Economic sectors</div><div id="pigSecCards"></div></div>'
      + '<div class="pig-canvas"><div class="pig-graph"><svg id="pigSvg" viewBox="0 0 1000 724" preserveAspectRatio="xMidYMid meet">'
      + '<defs><radialGradient id="pigIndia" cx="40%" cy="35%"><stop offset="0%" stop-color="#8a6a2e"/><stop offset="100%" stop-color="#4a3a1a"/></radialGradient></defs>'
      + '<g id="pigViewport"><g id="pigEdges"></g><g id="pigNodes"></g></g></svg>' + '<div class="pig-toolbar" id="pigToolbar"><button type="button" data-z="in" title="Zoom in">+</button><button type="button" data-z="out" title="Zoom out">\u2212</button><button type="button" data-z="reset" title="Reset view">\u2921</button></div>'
      + '<div class="pig-hint">Click a node to expand · select for AI briefing</div>'
      + '<div class="pig-legend"><span><i style="background:#647C3C"></i>likely / passed</span><span><i style="background:#B18A42"></i>uncertain</span><span><i style="background:#982F2F"></i>unlikely / dead</span></div>'
      + '</div><div class="pig-timeline" id="pigTimeline"></div></div>'
      + '<div class="pig-right" id="pigRight"></div>'
      + '</div></div>';
    // sector cards
    document.getElementById('pigSecCards').innerHTML = m.sectorIds.map(function (id) {
      var s = m.nodes[id], meta = PIG_SEC_META[s.sector];
      return '<div class="pig-sec-card" data-sec="' + s.sector + '"><div class="n">' + meta.label + '<span class="imp">' + s.impact + '</span></div>'
        + '<div class="meta"><div><span class="k">GDP</span><span class="v">' + meta.gdp + '%</span></div><div><span class="k">Bills</span><span class="v">' + s.billCount + '</span></div><div><span class="k">Passed</span><span class="v">' + s.passed + '</span></div></div>'
        + '<div class="bar"><i style="width:' + s.impact + '%"></i></div></div>';
    }).join('');
    document.querySelectorAll('.pig-sec-card').forEach(function (c) { c.addEventListener('click', function () { pigClick('sec:' + c.dataset.sec); }); });
    var qi = document.getElementById('pigQ');
    qi.addEventListener('input', function () { __niyPig.query = qi.value.trim(); pigRenderGraph(); });
    document.getElementById('pigReset').addEventListener('click', function () { __niyPig.expanded = new Set(); __niyPig.selected = null; __niyPig.query = ''; qi.value = ''; pigRenderGraph(); pigPanelEmpty(); pigSyncSectorCards(); });
    document.getElementById('pigSvg').addEventListener('click', function () { /* background: keep selection */ });
    pigRenderGraph(); pigPanelEmpty(); pigSyncSectorCards(); pigBuildTimeline(); pigInitPanZoom();
  }


    /* ======= LIVE DATA OVERRIDE — agent snapshots replace baked-in CSVs at boot ======= */
  window.__niyLive = window.__niyLive || {};
  window.niyLoadLiveDatasets = async function () {
    try {
      var mf = await fetch('/data/_datasets.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      if (!mf) return;
      var list = mf.datasets || mf, keys = Object.keys(list), loaded = 0;
      await Promise.all(keys.map(async function (csv) {
        try {
          var name = typeof list[csv] === 'string' ? list[csv] : csv.replace(/.csv$/, '');
          var d = await fetch('/data/' + name + '.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; });
          var rows = d && (Array.isArray(d) ? d : d.rows);
          if (rows && rows.length && typeof EMBEDDED_CSV_DATA !== 'undefined') { var base = EMBEDDED_CSV_DATA[csv]; var okSchema = true; if (base && base.length && base[0]) { var bk = Object.keys(base[0]), hv = Object.keys(rows[0] || {}); var ov = bk.filter(function (k) { return hv.indexOf(k) >= 0; }).length; okSchema = ov >= Math.ceil(bk.length * 0.6); } if (okSchema) { EMBEDDED_CSV_DATA[csv] = rows; window.__niyLive[csv] = { at: (d && d.updated) || null, n: rows.length }; loaded++; } }
        } catch (e) { }
      }));
      if (loaded) {
        try { if (typeof csvCache !== 'undefined') Object.keys(csvCache).forEach(function (k) { delete csvCache[k]; }); } catch (e) { }
        try { if (window.__niyPig) window.__niyPig.model = null; } catch (e) { }
        try { if (typeof renderAll === 'function') renderAll(); } catch (e) { }
      }
    } catch (e) { }
  };
  setTimeout(function () { try { niyLoadLiveDatasets(); } catch (e) { } }, 60);

  window.__niyAnalystCache = window.__niyAnalystCache || {};
  function niyFmtAnalyst(t) {
    var e = escapeHtml(String(t || '')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return e.split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  // AI Analyst briefing — for features that have no structured dataSource yet.
  // A real, on-demand, clearly-labelled AI analysis of the exact topic (free
  // Groq/Gemini engine). NEVER fabricated data: it is framed and footnoted as
  // AI analysis to be verified against primary sources.
  function niyMountAnalyst() {
    try {
      var feats = (typeof featuresForTier === 'function') ? featuresForTier(activeTier) : ((typeof FEATURE_DATA !== 'undefined' && FEATURE_DATA[activeTier]) || []);
      var f = feats && feats[activeIndex];
      if (!f || f.dataSource) return;                       // live features already carry data
      var d = document.getElementById('detail');
      if (!d || d.querySelector('.niy-analyst')) return;    // idempotent per render
      var box = document.createElement('div');
      box.className = 'niy-analyst';
      box.innerHTML = '<div class="an-head"><span class="an-badge">\u2726 AI ANALYST</span>'
        + '<span class="an-note">On-demand briefing \u00b7 verify against primary sources</span>'
        + '<button class="an-refresh" type="button" title="Regenerate">\u21bb</button></div>'
        + '<div class="an-body"><div class="an-load">Generating briefing\u2026</div></div>'
        + '<div class="an-actions"><button class="an-ask" type="button">Ask a follow-up \u2192</button></div>';
      d.appendChild(box);
      var body = box.querySelector('.an-body');
      var key = activeTier + '::' + f.feature;
      var prompt = 'You are Niyantran, an intelligence terminal for Indian journalists and analysts. '
        + 'Write a concise, factual briefing on this topic: "' + f.feature + '"'
        + (f.bucket ? ' (category: ' + f.bucket + ')' : '') + '. '
        + (f.use ? 'What it covers: ' + f.use + '. ' : '')
        + 'Cover, in short paragraphs: (1) what it is and why it matters in India right now, '
        + '(2) the key bodies or players involved, (3) two or three current dynamics or recent developments to watch, '
        + '(4) where a journalist should look for primary/official sources. '
        + 'Be specific and neutral, about 160 words. If unsure of a fact, say so rather than inventing it.';
      function render(text, engine) {
        body.innerHTML = '<div class="an-text">' + niyFmtAnalyst(text) + '</div>'
          + '<div class="an-foot">AI analysis' + (engine ? ' \u00b7 ' + escapeHtml(engine) : '') + ' \u00b7 not a substitute for primary reporting</div>';
      }
      function run(force) {
        if (!force && __niyAnalystCache[key]) { render(__niyAnalystCache[key].text, __niyAnalystCache[key].engine); return; }
        body.innerHTML = '<div class="an-load">Generating briefing\u2026</div>';
        fetch('/api/askai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 440 }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.text) { __niyAnalystCache[key] = { text: j.text, engine: j.engine }; render(j.text, j.engine); }
            else { body.innerHTML = '<div class="an-err">Briefing unavailable right now' + (j && j.error ? ' \u2014 ' + escapeHtml(String(j.error)) : '') + '. Use \u21bb to retry, or ask the AI directly.</div>'; }
          })
          .catch(function () { body.innerHTML = '<div class="an-err">Briefing unavailable \u2014 check your connection, then retry with \u21bb.</div>'; });
      }
      box.querySelector('.an-refresh').addEventListener('click', function () { run(true); });
      box.querySelector('.an-ask').addEventListener('click', function () {
        var q = 'Give me a deeper analysis of "' + f.feature + '" for an Indian audience \u2014 recent developments, key players, and what to watch.';
        if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(q);
        else if (window.openGlobalAi) window.openGlobalAi();
      });
      run(false);
    } catch (e) { }
  }

  async function renderDetail() {
  const token = ++renderToken;
  const _feats = featuresForTier(activeTier);
  if (!_feats.length) return;
  if (activeIndex < 0 || activeIndex >= _feats.length) activeIndex = 0;
  const f = _feats[activeIndex];
  const d = document.getElementById('detail');
  const s = S();

  const extraBlocksHtml = (f.extraDataSources || [])
    .map((block, i) => `
      <div class="section-label">${escapeHtml(block.label.toUpperCase())}</div>
      <div id="dataArea${i}"></div>
    `).join('');

  d.innerHTML = `
    <div class="detail-head">
      <div class="detail-title-block">
        <div>
          <div class="detail-title">${escapeHtml(f.feature)}${!f.dataSource ? '<span class="beta-badge">AI</span>' : ''}</div>
          <div class="tags">
            <span class="tag">${escapeHtml(f.bucket)}</span>
            <span class="tag">${escapeHtml(tierLabel(activeTier))}</span>
            ${f.unique === 'Yes' ? `<span class="tag unique">${escapeHtml(s.uniqueTag)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="toolbar">
      <div class="filter-group">
        <span class="filter-glyph" aria-hidden="true"><span></span><span></span><span></span></span>
        <input id="rowFilter" type="text" class="filter-input" placeholder="${escapeHtml(s.rowFilterPlaceholder)}" autocomplete="off" spellcheck="false" aria-label="Filter the table below" ${f.dataSource ? '' : 'disabled'} />
      </div>
      <button id="exportCsvBtn" class="toolbar-btn" type="button" ${f.dataSource ? '' : 'disabled'}>${escapeHtml(s.exportCsv)}</button>
      <button id="exportJsonBtn" class="toolbar-btn" type="button" ${f.dataSource ? '' : 'disabled'}>${escapeHtml(s.exportJson)}</button>
      <button id="studioBtn" class="toolbar-btn" type="button" title="Open this dataset in Studio">${escapeHtml(s.openStudio)}</button>
      <div class="column-filters" id="columnFilters"></div>
    </div>
    <div class="toolbar-msg" id="toolbarMsg"></div>
    <div class="section-label">${escapeHtml(s.liveData)}</div>
    <div id="dataArea"></div>
    ${extraBlocksHtml}
  `;
  document.getElementById('breadcrumb').textContent = tierLabel(activeTier);
  wireToolbar();

  await renderDataBlock(document.getElementById('dataArea'), f.columns, f.dataSource, token, f.archetype, true);
  for (let i = 0; i < (f.extraDataSources || []).length; i++) {
    const block = f.extraDataSources[i];
    // extraDataSources blocks don't carry their own archetype — they inherit
    // the parent feature's, unless a block explicitly overrides it.
    await renderDataBlock(document.getElementById(`dataArea${i}`), block.columns, block.dataSource, token, block.archetype || f.archetype, false);
  }
  // renderSidebar() (called synchronously inside renderAll(), before this
  // await chain resolves) computes its aggregate dot from whatever's already
  // in csvCache — which, for a feature visited for the first time, is still
  // empty at that point. Re-render now that the fetch above has populated
  // the cache, so a feature's sidebar dot doesn't need a second, unrelated
  // click elsewhere to appear.
  if (token === renderToken) renderSidebar();
}

function renderTicker() {
  if (window.buildLiveTicker) window.buildLiveTicker();
}

function renderTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    const isActive = t.dataset.tier === activeTier;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

const SCOPE_ACTIONS_HTML = `
  <div class="scope-actions">
    <div class="scope-action-wrap">
      <button class="scope-action-btn" id="newFolderBtn" type="button"><span class="icon"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-11C1.67 13.5 1 12.83 1 12v-8.5z"/></svg></span> New Folder</button>
      <div class="scope-popover" id="newFolderPopover" hidden>
        <label>FOLDER NAME</label>
        <input type="text" id="newFolderNameInput" placeholder="e.g. Ukraine Watch" autocomplete="off" />
        <div class="popover-row"><button class="toolbar-btn" id="newFolderCreateBtn" type="button">Create</button></div>
      </div>
    </div>
    <div class="scope-action-wrap">
      <button class="scope-action-btn" id="categoryBtn" type="button"><span class="icon"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1.5 1h5.79c.4 0 .78.16 1.06.44l6.71 6.71a1.5 1.5 0 0 1 0 2.12l-4.79 4.79a1.5 1.5 0 0 1-2.12 0L1.44 8.35A1.5 1.5 0 0 1 1 7.29V1.5A.5.5 0 0 1 1.5 1z"/><circle cx="4.5" cy="4.5" r="1.1" fill="var(--panel)"/></svg></span> Category</button>
      <div class="scope-popover" id="categoryPopover" hidden>
        <label>CATEGORIES</label>
        <div class="category-chip-list" id="scopeCategoryChips"></div>
        <div class="popover-row">
          <input type="text" id="newCategoryNameInput" placeholder="Add category…" autocomplete="off" />
          <button class="toolbar-btn" id="newCategoryCreateBtn" type="button">+</button>
        </div>
      </div>
    </div>
    <button class="scope-action-btn" id="geoEmbedBtn" type="button"><span class="icon">⧉</span> Embed</button>
  </div>
`;
const SCOPE_BAR_HTML = {
  geopolitics: SCOPE_ACTIONS_HTML,
  national: `<div class="scope-field"><label>COUNTRY</label><select><option>India</option></select></div>${SCOPE_ACTIONS_HTML}`,
  /* V2 PASS 47: State and Local geography now comes from NiyScope (see #niy-scope-engine),
     which renders its own cascading State \u203a District \u203a Constituency \u203a Booth bar.
     These fixed selects are retired so no place name is hardcoded anywhere in the UI. */
  state: SCOPE_ACTIONS_HTML,
  local: SCOPE_ACTIONS_HTML,
};
function renderScopeBar() {
  const bar = document.getElementById('scopeBar');
  if (!bar) return;
  const html = SCOPE_BAR_HTML[activeTier];
  bar.hidden = !html;
  bar.innerHTML = html || '';
  if (html && window.wireGeoScopeActions) window.wireGeoScopeActions();
}
function renderAll() {
  document.body.classList.toggle('niy-alt-view', activeTier === 'ndesk' || activeTier === 'datastudio' || activeTier === 'brain');
  try { var _nbc = document.getElementById('niyBrain'); if (_nbc) _nbc.classList.toggle('show', activeTier === 'brain'); } catch (e) {}
  renderTabs();
  const studio = document.getElementById('dataStudio');
  const ndesk = document.getElementById('nDesk');
  const main = document.querySelector('.main');
  if (activeTier === 'datastudio') {
    main.style.display = 'none';
    studio.classList.add('show');
    if (ndesk) ndesk.classList.remove('show');
    document.getElementById('scopeBar').hidden = true;
    if (window.initDataStudio) window.initDataStudio();
  } else if (activeTier === 'ndesk') {
    main.style.display = 'none';
    studio.classList.remove('show');
    if (ndesk) ndesk.classList.add('show');
    document.getElementById('scopeBar').hidden = true;
    if (window.initNDesk) window.initNDesk();
  } else if (activeTier === 'brain') {
    main.style.display = 'none';
    studio.classList.remove('show');
    if (ndesk) ndesk.classList.remove('show');
    document.getElementById('scopeBar').hidden = true;
    if (window.initNiyBrain) window.initNiyBrain();
  } else {
    main.style.display = 'grid';
    studio.classList.remove('show');
    if (ndesk) ndesk.classList.remove('show');
    renderScopeBar();
    renderSidebar();
    renderDetail();
    try { niyMountAnalyst(); } catch (e) { }
    try { niyMountPolicyGraph(); } catch (e) { }
  }
  if (window.updateGlobalAiContext) window.updateGlobalAiContext();
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    activeTier = t.dataset.tier;
    activeIndex = 0;
    renderAll();
  });
});

// ---------- Info modal ----------
// Full source/methodology text for any feature lives here, one click away,
// instead of as an always-visible callout box under every table.
function openInfoModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('infoModal').hidden = false;
}
function closeInfoModal() {
  document.getElementById('infoModal').hidden = true;
}
document.getElementById('modalClose').addEventListener('click', closeInfoModal);
document.getElementById('infoModal').addEventListener('click', (e) => {
  if (e.target.id === 'infoModal') closeInfoModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('infoModal').hidden) closeInfoModal();
});

const sidebarFilterInput = document.getElementById('sidebarFilter');
let sidebarFilterTimer;
sidebarFilterInput.addEventListener('input', () => {
  clearTimeout(sidebarFilterTimer);
  sidebarFilterTimer = setTimeout(() => applySidebarFilter(sidebarFilterInput.value), 120);
});

document.querySelectorAll('.lang-btn').forEach(b => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});

const cmdInput = document.getElementById('cmdInput');
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (window.hideSearchSuggest) window.hideSearchSuggest(); return; }
  if (window.handleSearchKeydown && window.handleSearchKeydown(e)) return;
  if (e.key === 'Enter') {
    const val = cmdInput.value.trim().toUpperCase();
    const match = Object.entries(TIER_CODE).find(([tier, code]) => code === val || tier.toUpperCase() === val);
    if (match) {
      activeTier = match[0];
      activeIndex = 0;
      renderAll();
      cmdInput.value = '';
      cmdInput.placeholder = S().cmdPlaceholder;
      if (window.hideSearchSuggest) window.hideSearchSuggest();
    } else if (window.trySearchNavigate && window.trySearchNavigate(cmdInput.value.trim())) {
      cmdInput.value = '';
      if (window.hideSearchSuggest) window.hideSearchSuggest();
    } else {
      cmdInput.placeholder = S().cmdPlaceholderBad;
      cmdInput.value = '';
    }
  }
});
cmdInput.addEventListener('input', () => {
  if (window.renderSearchSuggest) window.renderSearchSuggest(cmdInput.value);
});
cmdInput.addEventListener('focus', () => {
  if (window.renderSearchSuggest) window.renderSearchSuggest(cmdInput.value);
});

document.addEventListener('keydown', (e) => {
  if (document.activeElement === cmdInput) return;
  if (activeTier === 'datastudio' || !FEATURE_DATA[activeTier]) return;
  const len = FEATURE_DATA[activeTier].length;
  if (e.key === 'ArrowDown') { activeIndex = (activeIndex + 1) % len; renderAll(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { activeIndex = (activeIndex - 1 + len) % len; renderAll(); e.preventDefault(); }
});

function updateClock() {
  const now = new Date();
  const istOpts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' };
  document.getElementById('clockTime').textContent = now.toLocaleTimeString('en-GB', istOpts) + ' IST';
  const dateOpts = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' };
  document.getElementById('clockDate').textContent = now.toLocaleDateString('en-GB', dateOpts).toUpperCase();
}
updateClock();
setInterval(updateClock, 1000);

// Set once real sync metadata resolves; null means "show the generic default
// text" so updateSyncNoteText() can re-render the right string in either
// language without re-fetching, e.g. when the user toggles EN/HI.
let lastSyncedText = null;

function updateSyncNoteText() {
  const el = document.getElementById('syncNote');
  if (!el) return;
  el.textContent = lastSyncedText ? S().lastSynced(lastSyncedText) : S().syncNoteDefault;
}

async function renderSyncNote() {
  try {
    const res = await fetch('data/sync_meta.json', { cache: 'no-store' });
    if (!res.ok) return;
    const meta = await res.json();
    const timestamps = Object.values(meta).map(m => new Date(m.last_synced)).filter(d => !isNaN(d));
    if (!timestamps.length) return;
    const mostRecent = new Date(Math.max(...timestamps));
    lastSyncedText = mostRecent.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    updateSyncNoteText();
  } catch (e) {
    // sync_meta.json missing or unreadable — leave the default status-bar text in place
  }
}
renderSyncNote();

document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
document.documentElement.lang = currentLang;
applyChromeStrings();

// ================================================================
// AUTH
// ================================================================
const VALID_USER = 'analyst@niyantran';
const VALID_PASS = '12345678#';

// Declared here (early) rather than near callAI further down, since
// checkAiStatus() runs at script-init time and needs these immediately —
// a later declaration would hit the temporal-dead-zone for a const.
const NIYANTRAN_KEY_STORAGE = 'niyantranAnthropicKey';
function getStoredApiKey() { return (localStorage.getItem(NIYANTRAN_KEY_STORAGE) || '').trim(); }
function setStoredApiKey(k) { if (k) localStorage.setItem(NIYANTRAN_KEY_STORAGE, k); else localStorage.removeItem(NIYANTRAN_KEY_STORAGE); }
window.hasApiKey = () => !!getStoredApiKey();
function checkAuth() {
  if (sessionStorage.getItem('niyantranAuthed') === '1') document.body.classList.remove('locked');
}
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  if (user === VALID_USER && pass === VALID_PASS) {
    sessionStorage.setItem('niyantranAuthed', '1');
    document.body.classList.remove('locked');
    errEl.textContent = '';
    document.getElementById('loginPass').value = '';
  } else {
    errEl.textContent = 'Invalid User ID or password.';
  }
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('niyantranAuthed');
  document.body.classList.add('locked');
  document.getElementById('profileMenu').hidden = true;
});
checkAuth();

// ================================================================
// THEME
// ================================================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('#themeToggle button').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  const quickBtn = document.getElementById('quickThemeBtn');
  if (quickBtn) quickBtn.textContent = theme === 'dark' ? '☀' : '☾';
}
applyTheme(localStorage.getItem('niyantranTheme') || 'dark');
document.querySelectorAll('#themeToggle button').forEach(b => {
  b.addEventListener('click', () => { localStorage.setItem('niyantranTheme', b.dataset.theme); applyTheme(b.dataset.theme); });
});
document.getElementById('quickThemeBtn').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('niyantranTheme', next);
  applyTheme(next);
});

// ================================================================
// AI STATUS PILL — reachability heartbeat for the local proxy
// ================================================================
let aiOnline = null;
async function checkAiStatus() {
  aiOnline = !!getStoredApiKey();
  const btn = document.getElementById('refreshBtn');
  if (btn) {
    btn.title = 'Refresh the current view — ' + (aiOnline
      ? 'AI features are enabled (search, Data Studio AI, and the assistant are available).'
      : 'AI runs on the desk engine. A personal API key (profile → AI API Key) is only needed for offline use.');
  }
}
checkAiStatus();
setInterval(checkAiStatus, 30000);

// ---------- Refresh button (replaces the old always-visible AI status pill;
// AI reachability is still shown in the Data Studio Overview stat card and
// in this button's tooltip, but the space itself now does something). ----------
function doRefresh() {
  const btn = document.getElementById('refreshBtn');
  const label = document.getElementById('refreshLabel');
  if (btn) btn.classList.add('spinning');
  if (label) label.textContent = 'Refreshing…';
  tickerPools = null; // force pools to rebuild in case underlying data view changed
  renderTickerContent();
  renderAll();
  checkAiStatus();
  if (activeTier === 'datastudio' && typeof renderDatasetGrid === 'function') renderDatasetGrid();
  setTimeout(() => {
    if (btn) btn.classList.remove('spinning');
    if (label) label.textContent = 'Refreshed';
    setTimeout(() => { if (label) label.textContent = 'Refresh'; }, 1200);
  }, 400);
}
document.getElementById('refreshBtn').addEventListener('click', doRefresh);

// ================================================================
// GLOBAL AI ASSISTANT — one floating entry point, aware of whatever
// tier/feature/dataset is currently on screen, available everywhere
// (including Data Studio) rather than duplicated per-view.
// ================================================================
let globalAiMessages = [];
let globalAiContextLabel = '';
function currentContextSummary() {
  if (activeTier === 'datastudio') {
    return { label: 'Data Studio', detail: 'The user is in Data Studio, the AI/data workspace of the terminal.' };
  }
  const f = featuresForTier(activeTier)[activeIndex];
  if (!f) return { label: tierLabel(activeTier), detail: `Tier: ${tierLabel(activeTier)}.` };
  /* V2 PASS 44: ground State/Local answers in the active geography scope. */
  let scopeNote = '';
  try {
    if ((activeTier === 'state' || activeTier === 'local') && window.NiyScope) {
      const sc = NiyScope.get(), sm = NiyScope.summary(), rg = NiyScope.registry().filter(x => x.code === sc.state)[0];
      if (rg && sm) scopeNote = ` Geography scope: ${rg.name}` + (sc.district ? ` \u203a ${sc.district}` : '') +
        (sc.ac ? ` \u203a AC ${sc.ac}` : '') + (sc.booth ? ` \u203a booth ${sc.booth}` : '') +
        `. In scope: ${sm.electors.toLocaleString('en-IN')} electors, ${sm.booths} booths, ${sm.acs} constituencies.`;
      else if (rg) scopeNote = ` Geography scope: ${rg.name} \u2014 roll data not yet ingested for this state.`;
    }
  } catch (e) {}
  let detail = `The user is viewing "${f.feature}" (${f.bucket}) in the ${tierLabel(activeTier)} section.`;
  if (f.dataSource && f.dataSource.csv && EMBEDDED_CSV_DATA[f.dataSource.csv]) {
    const rows = EMBEDDED_CSV_DATA[f.dataSource.csv];
    detail += ` Sample of the data currently on screen (from ${f.dataSource.csv}, ${rows.length.toLocaleString()} rows total):\n${JSON.stringify(rows.slice(0, 6)).slice(0, 2500)}`;
  } else {
    detail += ' This particular feature is a placeholder (BETA) with no live dataset wired up yet.';
  }
  return { label: `${tierLabel(activeTier)} · ${f.feature}`, detail: detail + scopeNote };
}
function updateGlobalAiContext() {
  const ctx = currentContextSummary();
  globalAiContextLabel = ctx.label;
  const ctxEl = document.getElementById('globalAiCtx');
  if (ctxEl) ctxEl.textContent = ctx.label;
}
function openGlobalAi() {
  updateGlobalAiContext();
  document.getElementById('globalAiDrawer').hidden = false;
  document.getElementById('globalAiInput').focus();
}
function closeGlobalAi() { document.getElementById('globalAiDrawer').hidden = true; }
document.getElementById('globalAiBtn').addEventListener('click', () => {
  const drawer = document.getElementById('globalAiDrawer');
  if (drawer.hidden) openGlobalAi(); else closeGlobalAi();
});
document.getElementById('globalAiClose').addEventListener('click', closeGlobalAi);
function appendGlobalAiMsg(role, text) {
  const log = document.getElementById('globalAiLog');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}
async function sendGlobalAiMessage() {
  const input = document.getElementById('globalAiInput');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  appendGlobalAiMsg('user', q);
  if (!globalAiMessages.length) {
    const ctx = currentContextSummary();
    globalAiMessages.push({
      role: 'system',
      content: "You are Niyantran AI, a dedicated research analyst embedded in the Niyantran Terminal (a governance/politics/finance intelligence dashboard covering geopolitics, national/state/local India, judiciary and finance). Behave like an analyst, not a generic chatbot: first analyse the records and documents provided in context, then supplement with live web data only where the context is insufficient. " + AI_POLICY + " When you rely on a specific record, dataset or imported document, cite it inline (name the dataset/CSV or the record title) so the analyst can trace every claim to its source." + '\n\n' + ctx.detail + (window.NiyAI && window.NiyAI.contextBlock ? window.NiyAI.contextBlock() : ''),
    });
  }
  globalAiMessages.push({ role: 'user', content: q });
  const pending = appendGlobalAiMsg('ai', '…');
  try {
    if (window.NiyAI && window.NiyAI.ensurePdfs) { if (window.NiyAI.hasPendingPdfs && window.NiyAI.hasPendingPdfs()) pending.textContent = 'Reading attached PDF…'; await window.NiyAI.ensurePdfs(); }
    const answer = await callAI(globalAiMessages, { noSearch: !niyWebSearchOn() });
    globalAiMessages.push({ role: 'assistant', content: answer });
    pending.textContent = answer;
  } catch (err) {
    pending.textContent = `AI unavailable — ${err.message}`;
  }
}
document.getElementById('globalAiSend').addEventListener('click', sendGlobalAiMessage);
document.getElementById('globalAiInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendGlobalAiMessage(); });
window.openGlobalAi = openGlobalAi;
window.updateGlobalAiContext = updateGlobalAiContext;

// ================================================================
// PROFILE MENU
// ================================================================
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const willShow = profileMenu.hidden;
  profileMenu.hidden = !willShow;
  profileBtn.setAttribute('aria-expanded', String(willShow));
});
document.addEventListener('click', (e) => { if (!e.target.closest('.profile-wrap')) profileMenu.hidden = true; });
document.getElementById('apiKeyMenuBtn').addEventListener('click', () => { profileMenu.hidden = true; openApiKeySettings(); });

// ================================================================
// AI PROXY CLIENT
// ================================================================
// Shared policy line for every AI system prompt in the app: ground answers
// in the terminal's own data first; every call has a real web_search tool
// available, but the model should only reach for it when the provided
// context genuinely doesn't cover the question or the user needs something
// more current.
const AI_POLICY = "The data/context given to you in this prompt is your primary source — if it already answers the question (including simple questions about what the user is currently looking at), answer directly from it and do NOT call web_search. Only call web_search when that context is clearly insufficient — e.g. it doesn't mention the topic at all, or the user explicitly needs something more current than what's provided. Calling web_search when the context already has the answer wastes a step and can pull in irrelevant results, so default to NOT using it. Never fabricate figures — say plainly when something isn't covered. If the prompt includes a source-document URL (e.g. a 'Primary source document:' link), use web_fetch to open and read that document before answering and cite it; use web_search for current developments and cite the pages you used. Keep answers tight and specific — aim for about 70 words (more only if the user asks for a full report or detailed analysis): the direct answer first, then the key facts and the source; no hedging or filler. NEVER end by offering to fetch or asking permission — if a document URL (e.g. pdf_url) or the live web would help the answer, call web_fetch / web_search yourself and answer from what you actually read, then cite it.";

// Calls Claude directly from the browser — no local proxy, no server to keep
// running. Accepts the same {role, content}[] shape every call site already
// uses; system-role messages are pulled out into Anthropic's separate
// `system` field, and the remaining turns are normalized to strictly
// alternate user/assistant (merging any accidental adjacent same-role
// entries) since the Messages API requires that shape.
function niyWebSearchOn() { try { var v = localStorage.getItem('niyWebSearch'); return v === null ? true : v === '1'; } catch (e) { return true; } }
window.niyWebSearchOn = niyWebSearchOn;
function niySyncWebToggles() { var on = niyWebSearchOn(); document.querySelectorAll('.ai-web-toggle').forEach(function (b) { b.classList.toggle('on', on); b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Web search ON — the AI can look up live information on the web. Click to turn off.' : 'Web search OFF — the AI answers only from the on-screen data and attached records. Click to turn on.'; }); }
window.niySyncWebToggles = niySyncWebToggles;
function niyToggleWebSearch() { try { localStorage.setItem('niyWebSearch', niyWebSearchOn() ? '0' : '1'); } catch (e) { } niySyncWebToggles(); if (typeof showToast === 'function') showToast('Web search ' + (niyWebSearchOn() ? 'ON' : 'OFF')); }
window.niyToggleWebSearch = niyToggleWebSearch;
document.addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('.ai-web-toggle'); if (b) { e.preventDefault(); niyToggleWebSearch(); } });
(function () { if (!document.getElementById('niy-aiwt-css')) { var s = document.createElement('style'); s.id = 'niy-aiwt-css'; s.textContent = '.ai-web-toggle{display:inline-flex;align-items:center;gap:5px;flex:none;border-radius:8px;padding:0 11px;height:38px;cursor:pointer;font:600 11px var(--font-mono,monospace);letter-spacing:.03em;border:1px solid var(--line-bright,rgba(255,255,255,.18));background:transparent;color:var(--fg-dim,#b9c2cc);transition:all .15s;white-space:nowrap}.ai-web-toggle .aiwt-i{font-size:12px;line-height:1}.ai-web-toggle.on{background:rgba(127,176,255,.16);border-color:rgba(127,176,255,.5);color:var(--ds-accent,#7fb0ff)}.ai-web-toggle.off{opacity:.72}.ai-web-toggle.off .aiwt-i{filter:grayscale(1) opacity(.7)}.ai-web-toggle.off .aiwt-lbl{text-decoration:line-through;text-decoration-thickness:1px}.ai-web-toggle:hover{border-color:var(--ds-accent,#7fb0ff)}.chat-input-row .ai-web-toggle{height:34px}'; document.head.appendChild(s); } setTimeout(niySyncWebToggles, 300); })();

async function callAI(messages, opts) {
  let system = '';
  const turns = [];
  for (const m of messages) {
    if (m.role === 'system') { system += (system ? '\n\n' : '') + m.content; continue; }
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (turns.length && turns[turns.length - 1].role === role) {
      turns[turns.length - 1].content += '\n\n' + m.content;
    } else {
      turns.push({ role, content: m.content });
    }
  }
  if (!turns.length || turns[0].role !== 'user') turns.unshift({ role: 'user', content: '(no user message provided)' });

  const useSearch = !(opts && opts.noSearch);

  // 1) Server-side proxy first — keeps the AI key off the public page (see /api/askai).
  try {
    const pr = await fetch('/api/askai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: system || undefined, messages: turns, model: (opts && opts.model) || undefined, max_tokens: (opts && opts.maxTokens) || 400, search: useSearch }),
    });
    if (pr.status !== 404 && pr.status !== 405 && pr.status !== 501) {
      let pd = null; try { pd = await pr.json(); } catch (_) { pd = null; }
      if (pd && typeof pd.text === 'string' && pd.text) return pd.text;
      if (pd && pd.error) throw Object.assign(new Error(pd.error), { fatal: /invalid|unauthor|401/i.test(pd.error) });
    }
  } catch (e) {
    if (e && (e.fatal || (e.message && /Anthropic|Overloaded|rate|invalid|unauthor/i.test(e.message)))) throw e;
    // else: proxy absent / network error → fall back to the direct browser call below
  }

  // 2) Fallback: direct browser call using the viewer's own key (offline / standalone file).
  const apiKey = getStoredApiKey();
  if (!apiKey) { const err = new Error('AI is temporarily unavailable — the analysis engine could not be reached. Try again in a moment (a personal API key can also be added via profile → AI API Key).'); err.code = 'NO_API_KEY'; throw err; }
  const maxAttempts = 2;
  let lastErr;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'web-fetch-2025-09-10',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: (opts && opts.maxTokens) || 1500,
          system: system || undefined,
          messages: turns,
          tools: useSearch ? [{ type: 'web_search_20250305', name: 'web_search' }, { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 5 }] : undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 401) throw Object.assign(new Error('Invalid API key — update it via profile (top right) → AI API Key.'), { fatal: true });
      if (res.status === 429) throw Object.assign(new Error('Rate limited — wait a moment and try again.'), { fatal: attempt === maxAttempts - 1 });
      if (!res.ok) throw new Error(`AI request failed (status ${res.status})`);

      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (!text) throw new Error('No response from AI');
      return text;
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = (e.name === 'AbortError') ? new Error('AI request timed out — try again.') : e;
      if (lastErr.fatal) break;
      if (attempt < maxAttempts - 1) await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw lastErr || new Error('AI request failed');
}

function openApiKeySettings() {
  const current = getStoredApiKey();
  const masked = current ? current.slice(0, 10) + '••••••••' : '';
  openInfoModal('AI API Key', `
    <p style="font-size:13px; color:var(--fg-dim); margin-bottom:14px; line-height:1.6;">
      Ask AI, terminal search, and Data Studio's AI features call Anthropic's API directly from this browser using your key. It is stored only in this browser's local storage and is sent only to api.anthropic.com — never anywhere else.
    </p>
    ${current ? `<p style="font-family:var(--font-mono); font-size:12px; color:var(--fg-faint); margin-bottom:10px;">Current key: ${escapeHtml(masked)}</p>` : ''}
    <input id="apiKeyInput" type="password" placeholder="sk-ant-..." style="width:100%; box-sizing:border-box; padding:10px; background:var(--panel-2); border:1px solid var(--line-bright); color:var(--fg); font-family:var(--font-mono); font-size:13px; margin-bottom:12px;" autocomplete="off" spellcheck="false" />
    <div style="display:flex; gap:8px;">
      <button class="toolbar-btn" id="apiKeySaveBtn" type="button">Save</button>
      ${current ? `<button class="toolbar-btn" id="apiKeyClearBtn" type="button">Clear</button>` : ''}
    </div>
  `);
  const input = document.getElementById('apiKeyInput');
  const saveBtn = document.getElementById('apiKeySaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) { setStoredApiKey(val); closeInfoModal(); if (typeof showToast === 'function') showToast('API key saved'); checkAiStatus(); }
  });
  const clearBtn = document.getElementById('apiKeyClearBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { setStoredApiKey(''); closeInfoModal(); if (typeof showToast === 'function') showToast('API key cleared'); checkAiStatus(); });
}
window.openApiKeySettings = openApiKeySettings;

function extractJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

// ================================================================
// SHARED RENDER HELPERS
// ================================================================
function genericTableHtml(headers, rows2d) {
  return `<table class="sample"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>
    ${rows2d.map((r, ri) => `<tr data-row-idx="${ri}">${r.map(c => `<td title="${escapeHtml(String(c ?? ''))}">${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`;
}
function renderBarChartSVG(container, labels, values, title) {
  if (!container) return;
  const w = 600, h = 200, gap = 10;
  const max = Math.max(...values, 1);
  const barW = (w - gap * (values.length + 1)) / Math.max(values.length, 1);
  const bars = values.map((v, i) => {
    const bh = (v / max) * (h - 40);
    const x = gap + i * (barW + gap);
    const y = h - 24 - bh;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="var(--white)"></rect>
      <text x="${x + barW / 2}" y="${h - 8}" font-size="9" fill="var(--fg-faint)" text-anchor="middle" font-family="monospace">${escapeHtml(String(labels[i]).slice(0, 10))}</text>
      <text x="${x + barW / 2}" y="${y - 4}" font-size="10" fill="var(--fg)" text-anchor="middle" font-family="monospace">${v}</text>`;
  }).join('');
  container.innerHTML = `<div class="section-label">${escapeHtml(String(title || '').toUpperCase())}</div>
    <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; max-width:600px;">${bars}</svg>`;
}
function computeQuickStats(rows, columns) {
  const numericCards = [];
  let chart = null;
  const sample = rows.slice(0, 500);
  for (const col of columns) {
    const nums = sample.map(r => parseFloat(String(r[col]).replace(/[^0-9.\-]/g, ''))).filter(n => !isNaN(n));
    if (nums.length > sample.length * 0.6 && nums.length > 3) {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      numericCards.push({ label: col, avg: avg % 1 === 0 ? avg.toLocaleString() : avg.toFixed(2) });
      if (numericCards.length >= 3) break;
    }
  }
  const catCol = columns.find(c => !numericCards.some(n => n.label === c));
  if (catCol) {
    const counts = {};
    sample.forEach(r => { const v = String(r[catCol] ?? '').trim() || '—'; counts[v] = (counts[v] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (entries.length > 1) chart = { title: `${catCol} — distribution (sample)`, labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }
  return { numericCards, chart };
}

// ================================================================
// LIVE TICKER — Bills / Government Transfers / War & Conflict / Breaking
// Pulled from the terminal's own embedded datasets (never fabricated),
// rotated on a timer so the bar visibly refreshes.
// ================================================================
// Interest-aligned so the top ticker can be personalized (see the "Topics" filter).
const TICKER_CATEGORIES = [
  { key: 'geopolitics', label: 'GEOPOLITICS', tier: 'geopolitics', build: () => (EMBEDDED_CSV_DATA['geopolitics_war_tracker.csv'] || []).map(r => `${r.conflict_name} — ${r.current_stage}`) },
  { key: 'national', label: 'NATIONAL', tier: 'national', build: () => {
      const a = (EMBEDDED_CSV_DATA['national_bill_tracker.csv'] || []).map(r => `${r.bill_name} — ${r.current_stage}`);
      const b = (EMBEDDED_CSV_DATA['national_tender_aggregator.csv'] || []).map(r => r.tender_title);
      return a.concat(b);
    } },
  { key: 'state', label: 'STATE', tier: 'up', build: () => {
      const a = (EMBEDDED_CSV_DATA['national_agmut_transfers.csv'] || []).map(r => `${r.officer_name} → ${r.new_posting}`);
      const b = (EMBEDDED_CSV_DATA['up_bureaucrat_transfers.csv'] || []).map(r => `${r.officer_name} → ${r.new_posting}`);
      return a.concat(b);
    } },
  { key: 'judiciary', label: 'JUDICIARY', tier: 'judiciary', build: () => (EMBEDDED_CSV_DATA['judiciary_sc_orders.csv'] || []).map(r => r.case_title) },
  { key: 'finance', label: 'FINANCE', tier: 'finance', build: () => (EMBEDDED_CSV_DATA['national_regulatory_watch.csv'] || []).map(r => r.title) },
  { key: 'climate', label: 'CLIMATE', tier: 'climate', build: () => (EMBEDDED_CSV_DATA['climate_cbam_watch.csv'] || []).map(r => r.milestone + ' · ' + r.date).concat((EMBEDDED_CSV_DATA['climate_carbon_pricing.csv'] || []).filter(r => +r.weighted_price_usd > 20).map(r => r.jurisdiction + ' carbon price $' + (+r.weighted_price_usd).toFixed(0) + '/t')) },
];
// Pools are computed once — the underlying datasets never change at
// runtime, so remapping the full 4,576-row bill tracker (etc.) on every
// tick was the main cost here. Only the cheap rotation index changes.
let tickerPools = null;
function getTickerPools() {
  if (!tickerPools) tickerPools = TICKER_CATEGORIES.map(cat => ({ key: cat.key, label: cat.label, tier: cat.tier, items: cat.build().filter(Boolean) }));
  return tickerPools;
}
let tickerRotation = 0;
let tickerTrackWidth = 0;
function tickerInterests() {
  let v = null; try { v = JSON.parse(localStorage.getItem('niyTickerInterests') || 'null'); } catch (e) { }
  if (!Array.isArray(v) || !v.length) return TICKER_CATEGORIES.map(c => c.key); // default: all topics
  return v;
}
function renderTickerContent() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const perCat = 3;
  const items = [];
  const enabled = tickerInterests();
  getTickerPools().forEach(cat => {
    if (!cat.items.length || enabled.indexOf(cat.key) < 0) return;
    const navTier = cat.tier || '';
    for (let i = 0; i < perCat; i++) {
      const item = cat.items[(tickerRotation + i) % cat.items.length];
      items.push(`<span class="ticker-item"${navTier ? ` data-tier="${navTier}" data-index="0" style="cursor:pointer"` : ''}><span class="cat cat-${cat.key}">${cat.label}</span>${escapeHtml(String(item))} <span class="ts">· ${now} IST</span></span>`);
    }
  });
  if (!items.length) items.push(`<span class="ticker-item"><span class="cat">TOPICS</span>Pick your topics with the “▤ Topics” button on the left →</span>`);
  const html = items.join('');
  track.innerHTML = html + html;
  tickerTrackWidth = track.scrollWidth / 2;
}
function initTickerFilter() {
  const btn = document.getElementById('tickerFilterBtn'), pop = document.getElementById('tickerFilterPop');
  if (!btn || !pop || btn.dataset.init) return; btn.dataset.init = '1';
  if (!document.getElementById('niy-ticker-css')) {
    const s = document.createElement('style'); s.id = 'niy-ticker-css';
    s.textContent = '.ticker-wrap{position:relative}'
      + '.ticker-filter-btn{position:absolute;left:0;top:0;bottom:0;z-index:5;background:#0d1117;border:none;border-right:1px solid rgba(255,255,255,.14);color:var(--fg-muted,#b9c2cc);font-size:11px;font-weight:700;letter-spacing:.02em;padding:0 12px;cursor:pointer;white-space:nowrap}'
      + '.ticker-filter-btn:hover{color:var(--fg,#e8edf2)}'
      + '.ticker-speed-btn{position:absolute;right:0;top:0;bottom:0;z-index:6;background:#0d1117;border:none;border-left:1px solid rgba(255,255,255,.14);color:var(--fg-muted,#b9c2cc);font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:0 11px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px}'
      + '.ticker-speed-btn:hover{color:var(--fg,#e8edf2)}'
      + '.ticker-speed-btn .dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;opacity:.85}'
      + '.ticker-filter-pop{position:absolute;left:0;top:100%;z-index:60;background:#12161c;border:1px solid rgba(255,255,255,.14);border-radius:0 0 10px 10px;padding:8px;min-width:200px;box-shadow:0 12px 30px rgba(0,0,0,.45)}'
      + '.ticker-filter-pop[hidden]{display:none}'
      + '.tfp-h{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-faint,#8a94a0);padding:2px 6px 6px}'
      + '.tfp-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--fg,#e8edf2);padding:6px;cursor:pointer;border-radius:6px}'
      + '.tfp-row:hover{background:rgba(255,255,255,.06)}'
      + '.cat-geopolitics{color:#ff6b6b}.cat-national{color:#7fb0ff}.cat-state{color:#f0b429}.cat-judiciary{color:#a78bfa}.cat-finance{color:#43d17f}.cat-climate{color:#35c28f}';
    document.head.appendChild(s);
  }
  const enabled = tickerInterests();
  pop.innerHTML = '<div class="tfp-h">Live ticker topics</div>' + TICKER_CATEGORIES.map(c =>
    '<label class="tfp-row"><input type="checkbox" data-k="' + c.key + '"' + (enabled.indexOf(c.key) >= 0 ? ' checked' : '') + '/> ' + c.label.charAt(0) + c.label.slice(1).toLowerCase() + '</label>').join('');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // The popover lives inside .ticker-wrap (overflow:hidden, needed to clip the
    // scrolling track), which would clip the dropdown to the ~30px bar. Relocate
    // it to <body> with fixed positioning anchored under the button so it renders
    // in full.
    if (pop.parentElement !== document.body) { document.body.appendChild(pop); pop.style.position = 'fixed'; }
    if (pop.hidden) { const r = btn.getBoundingClientRect(); pop.style.left = Math.round(r.left) + 'px'; pop.style.top = Math.round(r.bottom) + 'px'; }
    pop.hidden = !pop.hidden;
  });
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) pop.hidden = true; });
  pop.addEventListener('change', () => {
    const sel = Array.from(pop.querySelectorAll('input:checked')).map(i => i.dataset.k);
    try { localStorage.setItem('niyTickerInterests', JSON.stringify(sel)); } catch (e) { }
    tickerRotation = 0; renderTickerContent();
  });
}
// Driven by rAF at a constant px/s instead of a CSS @keyframes animation,
// which used to visibly jump every refresh because replacing innerHTML
// restarts a CSS animation from its 0% frame. A JS-owned transform persists
// across content refreshes, so the bar scrolls smoothly and at a speed that
// doesn't depend on how much text happens to be in it.
// Always animates — deliberately not gated behind prefers-reduced-motion,
// since this is the one component where continuous motion is the explicit,
// requested feature rather than decoration. Also not paused on hover, so
// it never looks stalled while someone's actually watching it.
const TICKER_SPEED_PX_S = 200;
const TICKER_SPEEDS = [{ k: 'slow', label: 'Slow', mult: 0.4 }, { k: 'normal', label: 'Normal', mult: 1 }, { k: 'fast', label: 'Fast', mult: 1.9 }];
let tickerSpeedIdx = (function () { try { var k = localStorage.getItem('niyTickerSpeed'); var i = TICKER_SPEEDS.findIndex(function (s) { return s.k === k; }); return i >= 0 ? i : 1; } catch (e) { return 1; } })();
let tickerOffset = 0;
let tickerLastTs = null;
let tickerRafId = null;
function tickerTick(ts) {
  const track = document.getElementById('tickerTrack');
  if (track && tickerTrackWidth <= 0 && track.scrollWidth > 0) tickerTrackWidth = track.scrollWidth / 2;
  if (track && tickerTrackWidth > 0 && tickerLastTs != null) {
    let dt = (ts - tickerLastTs) / 1000;
    if (dt > 0.25) dt = 0.25; // clamp huge gaps (tab was backgrounded) so it doesn't "jump"
    tickerOffset -= TICKER_SPEED_PX_S * TICKER_SPEEDS[tickerSpeedIdx].mult * dt;
    if (Math.abs(tickerOffset) >= tickerTrackWidth) tickerOffset += tickerTrackWidth;
    track.style.transform = `translateX(${tickerOffset}px)`;
  }
  tickerLastTs = ts;
  tickerRafId = requestAnimationFrame(tickerTick);
}
let tickerTimer = null;
function startTickerLoop() {
  renderTickerContent();
  if (tickerRafId) cancelAnimationFrame(tickerRafId);
  tickerLastTs = null;
  tickerRafId = requestAnimationFrame(tickerTick);
  if (tickerTimer) clearInterval(tickerTimer);
  tickerTimer = setInterval(() => { tickerRotation++; renderTickerContent(); }, 7000);
}
function buildLiveTicker() { renderTickerContent(); }
startTickerLoop();
try { initTickerFilter(); } catch (e) { }
function updateTickerSpeedBtn() { var b = document.getElementById('tickerSpeedBtn'); if (b) { b.innerHTML = '<span class="dot"></span>' + TICKER_SPEEDS[tickerSpeedIdx].label; b.title = 'Ticker speed: ' + TICKER_SPEEDS[tickerSpeedIdx].label + ' — click to cycle (Slow / Normal / Fast)'; } }
function initTickerSpeed() { var b = document.getElementById('tickerSpeedBtn'); if (!b) return; updateTickerSpeedBtn(); b.addEventListener('click', function (e) { e.stopPropagation(); tickerSpeedIdx = (tickerSpeedIdx + 1) % TICKER_SPEEDS.length; try { localStorage.setItem('niyTickerSpeed', TICKER_SPEEDS[tickerSpeedIdx].k); } catch (e2) { } updateTickerSpeedBtn(); }); }
try { initTickerSpeed(); } catch (e) { }
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { tickerLastTs = null; if (tickerRafId == null) tickerRafId = requestAnimationFrame(tickerTick); } });

// ================================================================
// DATASET CATALOG (shared by Data Studio, Search, Ticker sourcing)
// ================================================================
function friendlyDatasetName(key) {
  return key.replace(/\.(csv|json)$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function flattenShallow(val) {
  const out = {};
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    Object.entries(val).forEach(([k, v]) => { out[k] = (v && typeof v === 'object') ? JSON.stringify(v).slice(0, 160) : v; });
  } else {
    out.value = JSON.stringify(val);
  }
  return out;
}
const DATASET_CATALOG = [];
Object.keys(EMBEDDED_CSV_DATA).forEach(key => {
  const rows = EMBEDDED_CSV_DATA[key];
  if (!rows.length) return; // skip empty datasets (e.g. up_bill_tracker.csv)
  DATASET_CATALOG.push({ key, kind: 'csv', name: friendlyDatasetName(key), rowCount: rows.length, columns: Object.keys(rows[0]) });
});
Object.keys(EMBEDDED_JSON_DATA).forEach(key => {
  const obj = EMBEDDED_JSON_DATA[key];
  const ids = Object.keys(obj);
  if (!ids.length) return;
  // Only flatten one sample row up front for the catalog listing (name/row
  // count/columns) — flattening all rows for every JSON dataset at load
  // time was pure wasted work unless Data Studio is actually opened.
  const sample = Object.assign({ id: ids[0] }, flattenShallow(obj[ids[0]]));
  DATASET_CATALOG.push({ key, kind: 'json', name: friendlyDatasetName(key), rowCount: ids.length, columns: Object.keys(sample), _rows: null });
});
function getDatasetRows(entry) {
  if (entry.kind === 'csv') return EMBEDDED_CSV_DATA[entry.key];
  if (!entry._rows) {
    const obj = EMBEDDED_JSON_DATA[entry.key];
    entry._rows = Object.entries(obj).map(([id, val]) => Object.assign({ id }, flattenShallow(val)));
  }
  return entry._rows;
}

// ================================================================
// SEARCH — live suggestions + AI-powered mode
// ================================================================
function buildSearchIndex() {
  const idx = [];
  Object.keys(FEATURE_DATA).forEach(tier => {
    featuresForTier(tier).forEach((f, i) => idx.push({ type: 'feature', tier, index: i, label: f.feature, meta: tierLabel(tier) }));
  });
  DATASET_CATALOG.forEach(d => idx.push({ type: 'dataset', key: d.key, label: d.name, meta: `${d.rowCount.toLocaleString()} rows` }));
  return idx;
}
let SEARCH_INDEX = buildSearchIndex();
let suggestActiveIdx = -1;
let aiSearchMode = false;

document.getElementById('aiSearchBtn').addEventListener('click', () => {
  // If there's already a question typed, run it immediately — don't make
  // the user toggle a mode and then remember to press Enter separately.
  if (cmdInput.value.trim()) {
    aiSearchMode = false;
    document.getElementById('aiSearchBtn').classList.remove('active');
    runAiSearch(cmdInput.value.trim());
    return;
  }
  aiSearchMode = !aiSearchMode;
  document.getElementById('aiSearchBtn').classList.toggle('active', aiSearchMode);
  cmdInput.placeholder = aiSearchMode ? "Ask AI about this terminal's data, then press Enter…" : S().cmdPlaceholder;
  cmdInput.focus();
});

function renderSearchSuggest(query) {
  const panel = document.getElementById('searchSuggest');
  const q = query.trim(); const ql = q.toLowerCase();
  suggestActiveIdx = -1;
  if (aiSearchMode) { panel.hidden = true; return; }
  if (!q) { panel.hidden = true; panel.innerHTML = ''; return; }
  const nameMatches = SEARCH_INDEX.filter(item => item.label.toLowerCase().includes(ql) || ((window.__niyMono || {})[item.label] || '').toLowerCase() === ql).slice(0, 6);
  function paint(content) {
    let html = '';
    if (nameMatches.length) html += '<div class="suggest-sec">SECTIONS</div>' + nameMatches.map((m, i) => `<button type="button" class="suggest-item" data-i="${i}"><span class="suggest-title">${escapeHtml(m.label)}</span><span class="suggest-meta">${m.type === 'feature' ? 'FEATURE' : 'DATASET'} · ${escapeHtml(m.meta)}</span></button>`).join('');
    if (content && content.length) { const base = nameMatches.length; html += '<div class="suggest-sec">IN DATA</div>' + content.map((m, j) => `<button type="button" class="suggest-item" data-i="${base + j}"><span class="suggest-title">${escapeHtml(m.label)} <span class="suggest-hit">${m.count}${m.count >= 500 ? '+' : ''}</span></span><span class="suggest-meta">${escapeHtml(m.snippet.slice(0, 62))}…</span></button>`).join(''); }
    // WEB + AI rows always follow the terminal sections (terminal data first,
    // web second) so a search can never come back blank.
    const webItems = ql.length >= 2 ? [
      { label: 'Search the web for \u201c' + q + '\u201d', url: 'https://www.google.com/search?q=' + encodeURIComponent(q) },
      { label: 'News coverage of \u201c' + q + '\u201d', url: 'https://news.google.com/search?q=' + encodeURIComponent(q) },
      { label: 'Wikipedia: ' + q, url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(q) }
    ] : [];
    const baseW = nameMatches.length + ((content && content.length) ? content.length : 0);
    if (webItems.length) {
      html += '<div class="suggest-sec">WEB</div>' + webItems.map(function (w, j) {
        return '<button type="button" class="suggest-item" data-i="' + (baseW + j) + '"><span class="suggest-title">\ud83c\udf10 ' + escapeHtml(w.label) + '</span><span class="suggest-meta">OPENS IN A NEW TAB</span></button>';
      }).join('');
      html += '<button type="button" class="suggest-item" data-i="' + (baseW + webItems.length) + '"><span class="suggest-title">\u2726 Ask Niyantran AI: \u201c' + escapeHtml(q) + '\u201d</span><span class="suggest-meta">TERMINAL AI \u00b7 READS TERMINAL DATA FIRST</span></button>';
    }
    if (!html) { panel.innerHTML = '<div class="suggest-empty">Keep typing\u2026</div>'; panel._matches = []; panel.hidden = false; return; }
    panel.innerHTML = html;
    const all = nameMatches.concat((content || []).map(m => ({ type: 'content', tier: m.tier, index: m.index, q: q }))).concat(webItems.map(function (w) { return { type: 'web', url: w.url }; })).concat(webItems.length ? [{ type: 'ai', q: q }] : []);
    panel._matches = all;
    panel.querySelectorAll('.suggest-item').forEach(btn => btn.addEventListener('click', () => selectSearchResult(all[+btn.dataset.i])));
    panel.hidden = false;
  }
  paint(null);
  if (ql.length < 2) return;
  clearTimeout(window.__suggestT);
  window.__suggestT = setTimeout(() => { if ((cmdInput.value || '').trim().toLowerCase() !== ql) return; let cm = []; try { cm = contentSearch(ql); } catch (e) { } if (cm.length) paint(cm); }, 150);
}
var GEO_ARRAYS = {
  geo_conflicts: function () { return ((window.NIY_GEO_CONFLICTS || {}).conflicts) || []; },
  geo_leaders: function () { return ((window.NIY_GEO_LEADERS || {}).leaders) || []; },
  geo_sanctions: function () { return ((window.NIY_GEO_SANCTIONS || {}).programs) || []; },
  geo_chokepoints: function () { return ((window.NIY_GEO_CHOKEPOINTS || {}).points) || []; },
  geo_energy: function () { var e = window.NIY_GEO_ENERGY || {}; return [].concat(e.minerals || [], e.commodities || []); },
  geo_commodities: function () { return ((window.NIY_GEO_COMMODITIES || {}).groups) || []; }
};
function contentSources() {
  var out = [], seen = {};
  Object.keys(FEATURE_DATA).forEach(function (tier) {
    featuresForTier(tier).forEach(function (f, i) {
      var c = f.dataSource && f.dataSource.csv; if (!c || seen[c]) return;
      var rows = null;
      if (EMBEDDED_CSV_DATA[c] && EMBEDDED_CSV_DATA[c].length) rows = EMBEDDED_CSV_DATA[c];
      else if (GEO_ARRAYS[c]) { var g = GEO_ARRAYS[c](); if (g && g.length) rows = g; }
      if (rows) { seen[c] = 1; out.push({ tier: tier, index: i, label: f.feature, rows: rows }); }
    });
  });
  return out;
}
function contentSearch(q) {
  var needle = q.toLowerCase(), out = [], scanned = 0;
  var wre = (needle.length >= 3 && !/\s/.test(needle)) ? new RegExp('\\b' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  var srcs = contentSources();
  for (var s = 0; s < srcs.length; s++) {
    var src = srcs[s], rows = src.rows, count = 0, snip = '';
    for (var i = 0; i < rows.length; i++) {
      if (++scanned > 120000) break;
      var r = rows[i], hit = null;
      for (var k in r) {
        var v = r[k]; if (v == null) continue;
        var sv = (typeof v === 'object') ? JSON.stringify(v) : String(v);
        var ok = wre ? wre.test(sv) : (sv.toLowerCase().indexOf(needle) !== -1);
        if (ok) { hit = (typeof v === 'object') ? (r.name || r.title || r.conflict_name || src.label) : sv; break; }
      }
      if (hit) { count++; if (!snip) snip = hit; if (count >= 500) break; }
    }
    if (count) out.push({ label: src.label, count: count, snippet: snip, tier: src.tier, index: src.index });
  }
  return out.sort(function (a, b) { return b.count - a.count; }).slice(0, 8);
}
function handleSearchKeydown(e) {
  if (e.key === 'Enter' && aiSearchMode) { runAiSearch(cmdInput.value.trim()); e.preventDefault(); return true; }
  const panel = document.getElementById('searchSuggest');
  if (panel.hidden || !panel._matches || !panel._matches.length) return false;
  const items = Array.from(panel.querySelectorAll('.suggest-item'));
  if (e.key === 'ArrowDown') { suggestActiveIdx = Math.min(suggestActiveIdx + 1, items.length - 1); highlightSuggest(items); e.preventDefault(); return true; }
  if (e.key === 'ArrowUp') { suggestActiveIdx = Math.max(suggestActiveIdx - 1, 0); highlightSuggest(items); e.preventDefault(); return true; }
  if (e.key === 'Enter' && suggestActiveIdx >= 0) { selectSearchResult(panel._matches[suggestActiveIdx]); e.preventDefault(); return true; }
  return false;
}
function highlightSuggest(items) { items.forEach((it, i) => it.classList.toggle('kbd-active', i === suggestActiveIdx)); }
function trySearchNavigate(query) {
  const q = query.trim().toLowerCase();
  if (!q || aiSearchMode) return false;
  const exact = SEARCH_INDEX.find(item => item.label.toLowerCase() === q);
  const best = exact || SEARCH_INDEX.find(item => item.label.toLowerCase().includes(q));
  if (!best) return false;
  selectSearchResult(best);
  return true;
}
window.niyGoto = function (tier, label) {
      try {
        var idx = 0;
        if (label && typeof featuresForTier === 'function') {
          var fs2 = featuresForTier(tier) || [];
          for (var gi = 0; gi < fs2.length; gi++) { if (fs2[gi] && fs2[gi].feature === label) { idx = gi; break; } }
        }
        activeTier = tier; activeIndex = idx; renderAll();
        var mn = document.querySelector('.main'); if (mn) mn.scrollTop = 0;
      } catch (e) { }
    };
    function selectSearchResult(item) {
  if (item.type === 'web') { try { window.open(item.url, '_blank', 'noopener'); } catch (e) { } cmdInput.value = ''; hideSearchSuggest(); return; }
  if (item.type === 'ai') { cmdInput.value = ''; hideSearchSuggest(); if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(item.q); else if (window.openGlobalAi) window.openGlobalAi(); return; }
  if (item.type === 'feature') { activeTier = item.tier; activeIndex = item.index; renderAll(); }
  else if (item.type === 'content') { activeTier = item.tier; activeIndex = item.index; renderAll(); setTimeout(() => { const rf = document.getElementById('rowFilter'); if (rf) { rf.value = item.q; rf.dispatchEvent(new Event('input', { bubbles: true })); rf.focus(); } }, 140); }
  else { activeTier = 'datastudio'; renderAll(); openDatasetInStudio(item.key); }
  cmdInput.value = '';
  hideSearchSuggest();
}
function hideSearchSuggest() { document.getElementById('searchSuggest').hidden = true; }
document.addEventListener('click', (e) => { if (!e.target.closest('.cmdbar')) hideSearchSuggest(); });

async function runAiSearch(query) {
  if (!query) return;
  const panel = document.getElementById('searchSuggest');
  panel.hidden = false;
  panel.innerHTML = `<div class="ai-answer-panel"><div class="ai-q">${escapeHtml(query)}</div><div class="ai-loading">Thinking…</div></div>`;
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const relevant = SEARCH_INDEX.filter(item => words.some(w => item.label.toLowerCase().includes(w))).slice(0, 5);
  const context = relevant.map(r => `- ${r.label} (${r.type}, ${r.meta})`).join('\n');
  let extraData = '';
  const dsMatch = relevant.find(r => r.type === 'dataset');
  if (dsMatch) {
    const entry = DATASET_CATALOG.find(d => d.key === dsMatch.key);
    if (entry) extraData = `\nSample rows from ${entry.name}:\n${JSON.stringify(getDatasetRows(entry).slice(0, 8)).slice(0, 3000)}`;
  }
  try {
    const answer = await callAI([
      { role: 'system', content: "You are the Niyantran Terminal AI Search assistant — a governance/politics data dashboard covering geopolitics, national/state/local India, judiciary and finance data. Answer briefly and factually. " + AI_POLICY },
      { role: 'user', content: `Question: ${query}\n\nRelevant terminal items:\n${context || '(no direct keyword match found — answer from general knowledge if reasonable, and say so)'}${extraData}` },
    ]);
    panel.innerHTML = `<div class="ai-answer-panel"><div class="ai-q">${escapeHtml(query)}</div><div class="ai-a">${escapeHtml(answer)}</div></div>`;
  } catch (err) {
    panel.innerHTML = `<div class="ai-answer-panel"><div class="ai-q">${escapeHtml(query)}</div><div class="ai-offline-note">AI unavailable — ${escapeHtml(err.message)}</div></div>`;
  }
}

// ================================================================
// DATA STUDIO
// ================================================================
let studioInitialized = false;
let lastReport = null;
let uploadedFiles = [];
let assistantMessages = [];
let currentSlides = [];
let selectedTemplateId = 'title-bullets';
let sheetHeaders = ['Column A', 'Column B', 'Column C'];
let sheetRows = [['', '', ''], ['', '', ''], ['', '', '']];
const PPT_TEMPLATES = [
  { id: 'title-bullets', icon: '▤', name: 'Title & Bullets' },
  { id: 'data-highlight', icon: '▦', name: 'Data Highlight' },
  { id: 'exec-summary', icon: '▥', name: 'Executive Summary' },
  { id: 'comparison', icon: '▧', name: 'Comparison' },
];

// ================================================================
// N-DESK — Niyantran's Analysis Desk
// A live, topic-wise analytical feed scoped by fixed jurisdiction
// filters. Two entry points: importing a topic to get quick context,
// or asking the desk to generate a fuller analysis. Both call the AI
// directly (see callAI above) and append a card to a feed persisted
// in localStorage, so it reads as a living log across the session.
// ================================================================
const NDESK_SCOPE_LABELS = { geopolitics: 'Geopolitics', national: 'National', state: 'State', local: 'Local', };
  /* V2 PASS 47: label the State/Local chips from the active geography scope. */
  function ndeskScopeLabel(k) {
    try {
      if ((k === 'state' || k === 'local') && window.NiyScope) {
        const L = NiyScope.label(k);
        if (L) return (k === 'state' ? 'State: ' : 'Local: ') + L.charAt(0) + L.slice(1).toLowerCase();
      }
    } catch (e) {}
    return ndeskScopeLabel(k);
  }
let ndeskActiveScopes = new Set(Object.keys(NDESK_SCOPE_LABELS));
let ndeskInitialized = false;

function loadNDeskFeed() {
  try { return JSON.parse(localStorage.getItem('niyantranNDeskFeed') || '[]'); } catch (e) { return []; }
}
function saveNDeskFeed(list) {
  localStorage.setItem('niyantranNDeskFeed', JSON.stringify(list.slice(0, 50)));
}

function ndeskScopeContext() {
  const active = [...ndeskActiveScopes];
  const parts = [];
  if (active.includes('national') && typeof FEATURE_DATA !== 'undefined') {
    const sample = (FEATURE_DATA.national || []).slice(0, 3).map(f => f.feature).join(', ');
    if (sample) parts.push(`National desk currently tracks: ${sample}.`);
  }
  if (active.includes('state')) parts.push('State scope: Uttar Pradesh — Assembly, MLAs, state schemes and procurement.');
  if (active.includes('local')) parts.push('Local scope: Nagina assembly constituency, Bijnor district — booth-level data, ward works, local tenders.');
  if (active.includes('geopolitics')) parts.push('Geopolitics scope: active global conflicts and diplomatic developments.');
  return parts.join(' ');
}

function renderNDeskFeed() {
  const el = document.getElementById('ndeskFeed');
  if (!el) return;
  const feed = loadNDeskFeed().filter(item => item.scopes.some(s => ndeskActiveScopes.has(s)));
  if (!feed.length) {
    el.innerHTML = `<div class="ndesk-empty">No briefings yet for this scope. Use <b>Import Topic</b> to bring in something you're tracking, or <b>Ask for Analysis</b> to have the desk generate one.</div>`;
    return;
  }
  el.innerHTML = feed.map(item => `
    <div class="ndesk-card">
      <div class="ndesk-card-head">
        <div class="ndesk-card-topic">${escapeHtml(item.topic)}</div>
        <div class="ndesk-card-meta">
          ${item.scopes.map(s => `<span class="ndesk-card-tag">${escapeHtml(ndeskScopeLabel(s) || s)}</span>`).join('')}
          <span class="ndesk-card-time">${escapeHtml(item.kind)} · ${new Date(item.ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
        </div>
      </div>
      <div class="ndesk-card-body">${escapeHtml(item.body)}</div>
    </div>
  `).join('');
}

function ndeskAddCard(topic, kind, body) {
  const feed = loadNDeskFeed();
  feed.unshift({ topic, kind, body, scopes: [...ndeskActiveScopes], ts: Date.now() });
  saveNDeskFeed(feed);
  renderNDeskFeed();
}

async function ndeskRunAsk(topic, kind) {
  const el = document.getElementById('ndeskFeed');
  const loadingCard = document.createElement('div');
  loadingCard.className = 'ndesk-card';
  loadingCard.innerHTML = `<div class="ndesk-loading">Analysis Desk is working on "${escapeHtml(topic)}"…</div>`;
  if (el) el.prepend(loadingCard);
  try {
    const scopeCtx = ndeskScopeContext();
    const answer = await callAI([
      { role: 'system', content: 'You are Niyantran\'s Analysis Desk — a terse, editorial briefing service for political analysts and journalists. ' + AI_POLICY + '\n\nCurrent scope: ' + [...ndeskActiveScopes].map(s => ndeskScopeLabel(s)).join(', ') + '. ' + scopeCtx },
      { role: 'user', content: kind === 'Imported' ? `A user is importing this topic to track on the desk: "${topic}". Give a tight 3-4 sentence briefing: what it is, why it matters in the current scope, and one thing to watch next.` : `Give a briefing on: "${topic}". Cover what's happening, why it matters for the current scope, and the single most important next development to watch. 4-6 sentences.` },
    ], { maxTokens: 500 });
    ndeskAddCard(topic, kind, answer);
  } catch (e) {
    ndeskAddCard(topic, kind, `Could not generate this briefing — ${e.message}`);
  } finally {
    loadingCard.remove();
  }
}

function initNDesk() {
  if (ndeskInitialized) { renderNDeskFeed(); return; }
  ndeskInitialized = true;

  document.querySelectorAll('.ndesk-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const scope = chip.getAttribute('data-scope');
      if (ndeskActiveScopes.has(scope)) {
        if (ndeskActiveScopes.size > 1) ndeskActiveScopes.delete(scope); // keep at least one active
      } else {
        ndeskActiveScopes.add(scope);
      }
      chip.classList.toggle('active', ndeskActiveScopes.has(scope));
      renderNDeskFeed();
    });
  });

  document.getElementById('ndeskImportBtn').addEventListener('click', () => {
    openInfoModal('Import Topic', `
      <p style="font-size:13px; color:var(--fg-dim); margin-bottom:12px;">Bring a topic, headline, or bill name onto the desk. It'll be briefed against your current scope selection.</p>
      <input id="ndeskImportInput" type="text" placeholder="e.g. Delimitation Commission report" style="width:100%; box-sizing:border-box; padding:10px; background:var(--panel-2); border:1px solid var(--line-bright); color:var(--fg); font-family:var(--font-display); font-size:13px; margin-bottom:12px;" autocomplete="off" />
      <button class="toolbar-btn ndesk-primary" id="ndeskImportConfirm" type="button">Import</button>
    `);
    const input = document.getElementById('ndeskImportInput');
    if (input) input.focus();
    document.getElementById('ndeskImportConfirm').addEventListener('click', () => {
      const topic = input.value.trim();
      if (!topic) return;
      closeInfoModal();
      ndeskRunAsk(topic, 'Imported');
    });
  });

  document.getElementById('ndeskAskBtn').addEventListener('click', () => {
    openInfoModal('Ask for Analysis', `
      <p style="font-size:13px; color:var(--fg-dim); margin-bottom:12px;">Ask the Analysis Desk anything within your current scope — it'll generate a briefing and add it to the feed.</p>
      <input id="ndeskAskInput" type="text" placeholder="e.g. Which booths decided the last assembly result?" style="width:100%; box-sizing:border-box; padding:10px; background:var(--panel-2); border:1px solid var(--line-bright); color:var(--fg); font-family:var(--font-display); font-size:13px; margin-bottom:12px;" autocomplete="off" />
      <button class="toolbar-btn ndesk-primary" id="ndeskAskConfirm" type="button">Ask</button>
    `);
    const input = document.getElementById('ndeskAskInput');
    if (input) input.focus();
    document.getElementById('ndeskAskConfirm').addEventListener('click', () => {
      const topic = input.value.trim();
      if (!topic) return;
      closeInfoModal();
      ndeskRunAsk(topic, 'Analysis');
    });
  });

  renderNDeskFeed();
}
window.initNDesk = initNDesk;

function initDataStudio() {
  renderOverview();
  renderDatasetGridInto(document.getElementById('datasetGrid'), '', 'tables');
  renderDatasetGridInto(document.getElementById('overviewDatasetGrid'), '', 'overview');
  populatePptSourceSelect();
  populateSheetImportSelect();
  renderTemplateGallery();
  if (studioInitialized) return;
  studioInitialized = true;
  document.querySelectorAll('.studio-nav-item').forEach(btn => btn.addEventListener('click', () => switchStudioPane(btn.dataset.pane)));
  document.getElementById('overviewDatasetSearch').addEventListener('input', (e) => renderDatasetGridInto(document.getElementById('overviewDatasetGrid'), e.target.value, 'overview'));
  document.getElementById('tablesDatasetSearch').addEventListener('input', (e) => renderDatasetGridInto(document.getElementById('datasetGrid'), e.target.value, 'tables'));
  wireUploadZone();
  wireAssistantChat();
  document.getElementById('generateReportBtn').addEventListener('click', generateResearchReport);
  document.getElementById('generateSlidesBtn').addEventListener('click', generateSlides);
  document.getElementById('exportPptxBtn').addEventListener('click', exportSlidesToPptx);
  document.getElementById('sheetImportBtn').addEventListener('click', () => {
    const key = document.getElementById('sheetImportSelect').value;
    const entry = DATASET_CATALOG.find(d => d.key === key);
    if (entry) importIntoSheet(entry.columns, getDatasetRows(entry));
  });
  document.getElementById('sheetAddRowBtn').addEventListener('click', sheetAddRow);
  document.getElementById('sheetAddColBtn').addEventListener('click', sheetAddCol);
  document.getElementById('sheetAiFillBtn').addEventListener('click', sheetAiAssist);
  document.getElementById('sheetExportCsvBtn').addEventListener('click', sheetExportCsv);
  document.getElementById('sheetExportXlsxBtn').addEventListener('click', sheetExportXlsx);
  renderSheet();
}

function switchStudioPane(pane) {
  document.querySelectorAll('.studio-nav-item').forEach(b => b.classList.toggle('active', b.dataset.pane === pane));
  document.querySelectorAll('.studio-pane').forEach(p => { p.hidden = p.id !== `pane-${pane}`; });
  if (pane === 'saved' && typeof renderSavedPane === 'function') renderSavedPane();
}

function datasetDomain(key) {
  if (key.startsWith('geopolitics_')) return 'Geopolitics';
  if (key.startsWith('national_')) return 'National (India)';
  if (key.startsWith('up_')) return 'State (Uttar Pradesh)';
  if (key.startsWith('bijnor_') || key.startsWith('nagina_')) return 'Local (Nagina)';
  if (key.startsWith('judiciary_')) return 'Judiciary';
  if (key.startsWith('finance_')) return 'Finance';
  if (key.startsWith('climate_')) return 'Climate';
  return 'Other';
}
const DATASET_DOMAIN_ORDER = ['Geopolitics', 'National (India)', 'State (Uttar Pradesh)', 'Local (Nagina)', 'Judiciary', 'Finance', 'Climate', 'Other'];

function datasetCardHtml(d) {
  return `
    <div class="dataset-card" data-key="${escapeHtml(d.key)}">
      <div class="ds-name">${escapeHtml(d.name)}</div>
      <div class="ds-meta">${d.rowCount.toLocaleString()} rows · ${d.columns.length} cols · ${d.kind.toUpperCase()}</div>
      <div class="ds-actions">
        <button class="toolbar-btn ds-open" type="button">Open</button>
        <button class="toolbar-btn ds-analyze" type="button">✦ Analyze</button>
      </div>
    </div>`;
}
function renderDatasetGridInto(gridEl, filterText, targetPane) {
  if (!gridEl) return;
  const q = (filterText || '').trim().toLowerCase();
  const filtered = DATASET_CATALOG.filter((d) => !q || d.name.toLowerCase().includes(q));
  const groups = {};
  filtered.forEach((d) => { const g = datasetDomain(d.key); (groups[g] = groups[g] || []).push(d); });
  let html = '';
  DATASET_DOMAIN_ORDER.forEach((g) => {
    if (!groups[g] || !groups[g].length) return;
    html += `<div class="dataset-group-label">${escapeHtml(g.toUpperCase())} · ${groups[g].length}</div><div class="dataset-grid">${groups[g].map(datasetCardHtml).join('')}</div>`;
  });
  gridEl.innerHTML = html || '<div class="toolbar-msg">No datasets match your search.</div>';
  gridEl.querySelectorAll('.dataset-card').forEach((card) => {
    const key = card.dataset.key;
    card.querySelector('.ds-open').addEventListener('click', () => { switchStudioPane(targetPane === 'overview' ? 'tables' : targetPane); openDatasetInStudio(key); });
    card.querySelector('.ds-analyze').addEventListener('click', () => { switchStudioPane(targetPane === 'overview' ? 'tables' : targetPane); viewDataset(key, true); });
  });
}

function renderOverview() {
  const statsRow = document.getElementById('overviewStatsRow');
  const totalRows = DATASET_CATALOG.reduce((sum, d) => sum + d.rowCount, 0);
  statsRow.innerHTML = `
    <div class="studio-stat"><div class="stat-k">DATASETS</div><div class="stat-v">${DATASET_CATALOG.length}</div></div>
    <div class="studio-stat"><div class="stat-k">TOTAL ROWS</div><div class="stat-v">${totalRows.toLocaleString()}</div></div>
    <div class="studio-stat"><div class="stat-k">AI PROXY</div><div class="stat-v" style="font-size:14px; color:${aiOnline ? 'var(--signal-green)' : 'var(--signal-red)'};">${aiOnline ? 'Online' : 'Offline'}</div></div>
    <div class="studio-stat"><div class="stat-k">UPLOADED FILES</div><div class="stat-v">${uploadedFiles.length}</div></div>`;
  const actions = document.getElementById('overviewQuickActions');
  actions.innerHTML = `
    <button type="button" data-action="ask"><span class="qa-icon">✦</span>Ask AI a question<span class="beta-badge">BETA</span></button>
    <button type="button" data-action="upload"><span class="qa-icon">⇪</span>Upload a document<span class="beta-badge">BETA</span></button>
    <button type="button" data-action="sheet"><span class="qa-icon">▦</span>New sheet<span class="beta-badge">BETA</span></button>
    <button type="button" data-action="deck"><span class="qa-icon">▤</span>New presentation<span class="beta-badge">BETA</span></button>`;
  actions.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'ask') { if (window.openGlobalAi) openGlobalAi(); }
      else if (action === 'upload') { switchStudioPane('assistant'); document.getElementById('fileInput').click(); }
      else if (action === 'sheet') { switchStudioPane('sheets'); }
      else if (action === 'deck') { switchStudioPane('ppt'); }
    });
  });
}

function viewDataset(key, autoAnalyze) {
  const entry = DATASET_CATALOG.find(d => d.key === key);
  if (!entry) return;
  const rows = getDatasetRows(entry);
  const viewer = document.getElementById('datasetViewer');
  const stats = computeQuickStats(rows, entry.columns);
  viewer.innerHTML = `
    <div class="section-label">${escapeHtml(entry.name.toUpperCase())}</div>
    <div class="studio-stats-row">
      <div class="studio-stat"><div class="stat-k">ROWS</div><div class="stat-v">${rows.length.toLocaleString()}</div></div>
      <div class="studio-stat"><div class="stat-k">COLUMNS</div><div class="stat-v">${entry.columns.length}</div></div>
      ${stats.numericCards.map(c => `<div class="studio-stat"><div class="stat-k">${escapeHtml(c.label.toUpperCase())} (AVG)</div><div class="stat-v">${c.avg}</div></div>`).join('')}
    </div>
    ${stats.chart ? `<div class="studio-chart" id="dsChart"></div>` : ''}
    <div class="toolbar" style="border-bottom:none; margin-top:0;">
      <button class="toolbar-btn" id="dsAnalyzeAiBtn" type="button">✦ Ask AI to Analyze</button>
      <button class="toolbar-btn" id="dsExportSheetBtn" type="button">Send to Sheets</button>
    </div>
    <div class="studio-table-wrap">${genericTableHtml(entry.columns, rows.slice(0, 200).map(r => entry.columns.map(c => r[c])))}</div>
    ${rows.length > 200 ? `<div class="toolbar-msg">Showing first 200 of ${rows.length.toLocaleString()} rows.</div>` : ''}
    <div id="dsAiReport"></div>`;
  if (stats.chart) renderBarChartSVG(document.getElementById('dsChart'), stats.chart.labels, stats.chart.values, stats.chart.title);
  document.getElementById('dsAnalyzeAiBtn').addEventListener('click', () => analyzeDatasetWithAI(entry, rows));
  document.getElementById('dsExportSheetBtn').addEventListener('click', () => { importIntoSheet(entry.columns, rows); switchStudioPane('sheets'); });
  if (autoAnalyze) analyzeDatasetWithAI(entry, rows);
}

async function analyzeDatasetWithAI(entry, rows) {
  const out = document.getElementById('dsAiReport');
  if (!out) return;
  out.innerHTML = `<div class="ai-report"><div class="ai-loading">Analyzing ${rows.length.toLocaleString()} rows with AI…</div></div>`;
  const sample = rows.slice(0, 12);
  const prompt = `Dataset: ${entry.name}\nColumns: ${entry.columns.join(', ')}\nTotal rows: ${rows.length}\nSample rows (JSON):\n${JSON.stringify(sample).slice(0, 4000)}\n\nWrite a short analyst briefing (4-6 sentences) on what this dataset shows and any notable pattern in the sample. Be specific and factual, do not invent figures beyond what's given.`;
  try {
    const answer = await callAI([
      { role: 'system', content: 'You are an analyst assistant inside the Niyantran Terminal, a governance/politics data dashboard. Be concise, factual. ' + AI_POLICY },
      { role: 'user', content: prompt },
    ]);
    out.innerHTML = `<div class="ai-report"><p>${escapeHtml(answer).replace(/\n/g, '<br>')}</p></div>`;
  } catch (err) {
    out.innerHTML = `<div class="ai-report"><div class="ai-offline-note">AI unavailable — ${escapeHtml(err.message)}</div></div>`;
  }
}

function openDatasetInStudio(csvKey) {
  switchStudioPane('tables');
  viewDataset(csvKey, false);
  const card = document.querySelector(`.dataset-card[data-key="${csvKey.replace(/"/g, '\\"')}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.openDatasetInStudio = openDatasetInStudio;

// ---------- AI Research Assistant ----------
function wireUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
  input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
}
async function handleFiles(fileList) {
  for (const file of Array.from(fileList)) {
    const entry = { name: file.name, sizeKb: Math.round(file.size / 1024), content: '' };
    try { entry.content = await extractFileText(file); }
    catch (err) { entry.content = `[Could not read file: ${err.message}]`; }
    uploadedFiles.push(entry);
  }
  renderUploadedList();
}
async function extractFileText(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (['txt', 'md', 'csv', 'json'].includes(ext)) return await file.text();
  if (ext === 'pdf') {
    if (!window.pdfjsLib) throw new Error('PDF reader unavailable (check internet connection)');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 25);
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
      if (text.length > 30000) break;
    }
    return text;
  }
  if (ext === 'xlsx' || ext === 'xls') {
    if (!window.XLSX) throw new Error('Spreadsheet reader unavailable (check internet connection)');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
  }
  throw new Error('Unsupported file type');
}
function renderUploadedList() {
  const list = document.getElementById('uploadedList');
  list.innerHTML = uploadedFiles.map((f, i) => `
    <div class="uploaded-item">
      <div><div class="uf-name">${escapeHtml(f.name)}</div><div class="uf-meta">${f.sizeKb} KB</div></div>
      <button type="button" data-i="${i}" title="Remove">×</button>
    </div>`).join('');
  list.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { uploadedFiles.splice(+btn.dataset.i, 1); renderUploadedList(); }));
  document.getElementById('generateReportBtn').disabled = uploadedFiles.length === 0;
}
async function generateResearchReport() {
  const out = document.getElementById('reportOutput');
  out.innerHTML = `<div class="ai-report"><div class="ai-loading">Reading ${uploadedFiles.length} file(s) and generating report…</div></div>`;
  let context = uploadedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n');
  if (context.length > 14000) context = context.slice(0, 14000) + '\n[...truncated...]';
  const prompt = `You are analyzing the following uploaded file(s) for an analyst. Reply ONLY with strict JSON, no markdown fences, matching this shape:\n{"summary": "4-6 sentence summary", "insights": ["short insight", "..."], "table": {"headers": ["..."], "rows": [["...","..."]]} or null, "chart": {"title":"...","labels":["..."],"values":[1,2]} or null}\nOnly include a table/chart if the source material actually supports one; otherwise use null. Do not invent facts not present in the files.\n\n${context}`;
  try {
    const answer = await callAI([
      { role: 'system', content: 'You are the Niyantran Terminal AI Research Assistant. You analyze uploaded documents and produce grounded, factual reports as strict JSON. ' + AI_POLICY },
      { role: 'user', content: prompt },
    ], { max_tokens: 1400 });
    const json = extractJson(answer);
    lastReport = (json && json.summary) ? json : { summary: answer, insights: [], table: null, chart: null };
    renderReport(lastReport);
    populatePptSourceSelect();
    assistantMessages = [{ role: 'system', content: 'You are the Niyantran Terminal AI Research Assistant. Answer questions about the files the user uploaded. ' + AI_POLICY + '\n\n' + context }];
  } catch (err) {
    out.innerHTML = `<div class="ai-report"><div class="ai-offline-note">AI unavailable — ${escapeHtml(err.message)}</div></div>`;
  }
}
function renderReport(report) {
  const out = document.getElementById('reportOutput');
  let html = `<div class="ai-report"><h4>Summary</h4><p>${escapeHtml(report.summary || '').replace(/\n/g, '<br>')}</p>`;
  if (report.insights && report.insights.length) html += `<h4>Key Insights</h4><ul>${report.insights.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  if (report.table && report.table.headers) html += `<h4>Data</h4>${genericTableHtml(report.table.headers, report.table.rows || [])}`;
  if (report.chart && report.chart.labels) html += `<div id="reportChart"></div>`;
  html += `</div>`;
  out.innerHTML = html;
  if (report.chart && report.chart.labels) renderBarChartSVG(document.getElementById('reportChart'), report.chart.labels, report.chart.values, report.chart.title || 'Chart');
}
function wireAssistantChat() {
  const input = document.getElementById('assistantChatInput');
  const send = document.getElementById('assistantChatSend');
  const go = async () => {
    const q = input.value.trim();
    if (!q) return;
    if (!uploadedFiles.length) { appendChat('ai', 'Upload a file first so I have something to answer from.'); return; }
    appendChat('user', q);
    input.value = '';
    if (!assistantMessages.length) {
      const context = uploadedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n').slice(0, 14000);
      assistantMessages = [{ role: 'system', content: 'You are the Niyantran Terminal AI Research Assistant. ' + AI_POLICY + '\n\n' + context }];
    }
    assistantMessages.push({ role: 'user', content: q });
    appendChat('ai', '…');
    const log = document.getElementById('assistantChatLog');
    const pending = log.lastElementChild;
    try {
      const answer = await callAI(assistantMessages);
      assistantMessages.push({ role: 'assistant', content: answer });
      pending.textContent = answer;
    } catch (err) {
      pending.textContent = `AI unavailable — ${err.message}`;
    }
  };
  send.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
function appendChat(role, text) {
  const log = document.getElementById('assistantChatLog');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ---------- PPT Templates ----------
function populatePptSourceSelect() {
  const sel = document.getElementById('pptSourceSelect');
  const current = sel.value;
  const opts = ['<option value="blank">Blank template</option>'];
  if (lastReport) opts.push('<option value="report">Latest AI Research Report</option>');
  DATASET_CATALOG.forEach(d => opts.push(`<option value="ds:${escapeHtml(d.key)}">${escapeHtml(d.name)}</option>`));
  sel.innerHTML = opts.join('');
  if (current) sel.value = current;
}
function renderTemplateGallery() {
  const gal = document.getElementById('templateGallery');
  gal.innerHTML = PPT_TEMPLATES.map(t => `
    <div class="template-card ${t.id === selectedTemplateId ? 'selected' : ''}" data-tpl="${t.id}">
      <div class="tpl-icon">${t.icon}</div><div class="tpl-name">${escapeHtml(t.name)}</div>
    </div>`).join('');
  gal.querySelectorAll('.template-card').forEach(card => card.addEventListener('click', () => { selectedTemplateId = card.dataset.tpl; renderTemplateGallery(); }));
}
function generateSlides() {
  const source = document.getElementById('pptSourceSelect').value;
  const slides = [];
  if (source === 'report' && lastReport) {
    slides.push({ title: 'Research Summary', subtitle: 'Generated by Niyantran AI Research Assistant', text: lastReport.summary });
    if (lastReport.insights && lastReport.insights.length) slides.push({ title: 'Key Insights', bullets: lastReport.insights });
    if (lastReport.table && lastReport.table.headers) slides.push({ title: 'Data', subtitle: lastReport.table.headers.join(' · '), bullets: (lastReport.table.rows || []).slice(0, 6).map(r => r.join(' — ')) });
  } else if (source.startsWith('ds:')) {
    const entry = DATASET_CATALOG.find(d => d.key === source.slice(3));
    const rows = getDatasetRows(entry);
    const stats = computeQuickStats(rows, entry.columns);
    slides.push({ title: entry.name, subtitle: `${rows.length.toLocaleString()} rows · ${entry.columns.length} columns` });
    if (stats.numericCards.length) slides.push({ title: 'Key Metrics', bullets: stats.numericCards.map(c => `${c.label}: avg ${c.avg}`) });
    if (stats.chart) slides.push({ title: stats.chart.title, bullets: stats.chart.labels.map((l, i) => `${l}: ${stats.chart.values[i]}`) });
  } else {
    slides.push({ title: 'Untitled Presentation', subtitle: 'Niyantran Terminal', bullets: ['Pick a data source above, then Generate Slides', 'Or edit this slide directly — every field here is editable'] });
  }
  currentSlides = slides;
  renderSlideDeck();
  document.getElementById('exportPptxBtn').disabled = slides.length === 0 || !window.PptxGenJS;
}
function renderSlideDeck() {
  document.getElementById('slideDeck').innerHTML = currentSlides.map(s => `
    <div class="slide">
      <div class="slide-title" contenteditable="true">${escapeHtml(s.title || '')}</div>
      ${s.subtitle ? `<div class="slide-sub" contenteditable="true">${escapeHtml(s.subtitle)}</div>` : ''}
      ${s.text ? `<div contenteditable="true" style="font-size:14px; line-height:1.6;">${escapeHtml(s.text)}</div>` : ''}
      ${s.bullets && s.bullets.length ? `<ul contenteditable="true">${s.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');
}
async function exportSlidesToPptx() {
  if (!window.PptxGenJS) { showToolbarMessage('Presentation library unavailable (check internet connection).'); return; }
  const slideEls = document.querySelectorAll('#slideDeck .slide');
  if (!slideEls.length) return;
  const pptx = new PptxGenJS();
  slideEls.forEach(el => {
    const slide = pptx.addSlide();
    const title = el.querySelector('.slide-title')?.textContent || '';
    const sub = el.querySelector('.slide-sub')?.textContent || '';
    const bullets = Array.from(el.querySelectorAll('li')).map(li => li.textContent);
    const bodyEl = Array.from(el.querySelectorAll('div[contenteditable]')).find(d => !d.classList.contains('slide-title') && !d.classList.contains('slide-sub'));
    slide.addText(title, { x: 0.5, y: 0.4, fontSize: 28, bold: true });
    let y = 1.1;
    if (sub) { slide.addText(sub, { x: 0.5, y, fontSize: 12, color: '888888' }); y = 1.6; }
    if (bodyEl && bodyEl.textContent) { slide.addText(bodyEl.textContent, { x: 0.5, y, fontSize: 14, w: 9 }); y += 1.2; }
    if (bullets.length) slide.addText(bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.5, y, fontSize: 14, w: 9 });
  });
  await pptx.writeFile({ fileName: 'niyantran-deck.pptx' });
}

// ---------- Sheets ----------
function renderSheet() {
  const table = document.getElementById('sheetTable');
  const thead = `<tr><th class="row-head"></th>${sheetHeaders.map((h, i) => `<th contenteditable="true" data-col="${i}">${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = sheetRows.map((row, ri) => `<tr><td class="row-head">${ri + 1}</td>${row.map((cell, ci) => `<td contenteditable="true" data-row="${ri}" data-col="${ci}">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  table.innerHTML = thead + tbody;
  table.querySelectorAll('td[data-row]').forEach(td => td.addEventListener('blur', () => { sheetRows[+td.dataset.row][+td.dataset.col] = td.textContent; }));
  table.querySelectorAll('th[data-col]').forEach(th => th.addEventListener('blur', () => { sheetHeaders[+th.dataset.col] = th.textContent; }));
}
function sheetAddRow() { sheetRows.push(sheetHeaders.map(() => '')); renderSheet(); }
function sheetAddCol() { sheetHeaders.push(`Column ${String.fromCharCode(65 + (sheetHeaders.length % 26))}`); sheetRows.forEach(r => r.push('')); renderSheet(); }
function importIntoSheet(columns, rows) {
  sheetHeaders = columns.slice();
  sheetRows = rows.slice(0, 500).map(r => columns.map(c => String(r[c] ?? '')));
  renderSheet();
  showSheetMsg(`Imported ${Math.min(rows.length, 500).toLocaleString()} of ${rows.length.toLocaleString()} rows.`);
}
function populateSheetImportSelect() {
  document.getElementById('sheetImportSelect').innerHTML = DATASET_CATALOG.map(d => `<option value="${escapeHtml(d.key)}">${escapeHtml(d.name)}</option>`).join('');
}
function showSheetMsg(text) {
  const el = document.getElementById('sheetMsg');
  if (!el) return;
  el.textContent = text;
  clearTimeout(showSheetMsg._t);
  showSheetMsg._t = setTimeout(() => { el.textContent = ''; }, 4000);
}
function sheetExportCsv() {
  const lines = [sheetHeaders.map(csvEscape).join(',')].concat(sheetRows.map(r => r.map(csvEscape).join(',')));
  downloadBlob(lines.join('\n'), 'niyantran-sheet.csv', 'text/csv');
}
function sheetExportXlsx() {
  if (!window.XLSX) { showSheetMsg('Spreadsheet library unavailable (check internet connection).'); return; }
  const ws = XLSX.utils.aoa_to_sheet([sheetHeaders, ...sheetRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'niyantran-sheet.xlsx');
}
async function sheetAiAssist() {
  showSheetMsg('Asking AI…');
  const sample = sheetRows.slice(0, 10);
  const prompt = `Here is a spreadsheet.\nColumns: ${sheetHeaders.join(', ')}\nRows (sample):\n${sample.map(r => r.join(' | ')).join('\n')}\n\nSuggest ONE useful derived column for this sheet, computed per-row from the existing columns. Reply ONLY as strict JSON: {"columnName": "...", "values": ["value for row 1", "value for row 2", ...]} with exactly ${sheetRows.length} values, one per existing row in order. If nothing meaningful can be computed, reply {"columnName": null}.`;
  try {
    const answer = await callAI([
      { role: 'system', content: 'You are a spreadsheet assistant. Reply with strict JSON only, no prose, no markdown fences.' },
      { role: 'user', content: prompt },
    ]);
    const json = extractJson(answer);
    if (json && json.columnName && Array.isArray(json.values)) {
      sheetHeaders.push(json.columnName);
      sheetRows.forEach((r, i) => r.push(String(json.values[i] ?? '')));
      renderSheet();
      showSheetMsg(`AI added column "${json.columnName}".`);
    } else {
      showSheetMsg("AI could not suggest a derived column for this data.");
    }
  } catch (err) {
    showSheetMsg('AI unavailable — ' + (err && err.message ? err.message : 'try again in a moment.'));
  }
}

// ================================================================
// FOLDERS / CATEGORIES / EMBED — personal save-and-curate system for
// Bill, Affidavit, Assets, and Geopolitics content. Storage is local
// (localStorage) since this is a single-analyst tool with no backend.
// ================================================================
function loadFolders() { try { return JSON.parse(localStorage.getItem('niyantranFolders') || '[]'); } catch (e) { return []; } }
function saveFolders(list) { localStorage.setItem('niyantranFolders', JSON.stringify(list)); }
function loadCategories() {
  try {
    const c = JSON.parse(localStorage.getItem('niyantranCategories') || 'null');
    if (c && c.length) return c;
  } catch (e) {}
  return ['Bill', 'Affidavit', 'Assets', 'Geopolitics', 'War & Conflict', 'Other'];
}
function saveCategories(list) { localStorage.setItem('niyantranCategories', JSON.stringify(list)); }
function loadSavedItems() { try { return JSON.parse(localStorage.getItem('niyantranSavedItems') || '[]'); } catch (e) { return []; } }
function saveSavedItems(list) { localStorage.setItem('niyantranSavedItems', JSON.stringify(list)); }

function showToast(text) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

// Panels (Bill/Affidavit/Assets) build their Embed buttons via this
// registry rather than inline onclick, since they're injected as HTML
// strings: register a closure that builds the embeddable content lazily
// (only when the button is actually clicked), and delegate the click.
let embedRegistryCounter = 0;
const embedRegistry = {};
function embedButtonHtml(type, title, htmlBuilder) {
  const id = ++embedRegistryCounter;
  embedRegistry[id] = { type, title, htmlBuilder };
  return `<button type="button" class="embed-btn" data-embed-id="${id}"><span class="icon">⧉</span> Embed</button>`;
}
window.embedButtonHtml = embedButtonHtml;

// "View PDF" + "Ask AI" — shown alongside Embed on every expandable panel
// card (Bill, Sector Impact, Regulatory, Affidavit). Same lazy-registry
// pattern as Embed above: the AI prompt is only built into a real request
// when the button is actually clicked.
let cardAiRegistryCounter = 0;
const cardAiRegistry = {};
function cardActionsHtml(embedHtml, pdfUrl, aiPrompt) {
  const pdfHtml = pdfUrl
    ? `<a class="card-action-btn" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener"><span class="icon">⤓</span> View PDF</a>`
    : '';
  let aiHtml = '';
  if (aiPrompt) {
    const id = ++cardAiRegistryCounter;
    let grounded = aiPrompt;
    if (pdfUrl) grounded += '\n\nPrimary source document: ' + pdfUrl + '\nUse web_fetch to open and read that document, and web_search for the latest related developments, then answer with specific facts and cite your sources (the document plus any web pages).';
    else grounded += '\n\nUse web_search for the latest related developments and cite your sources.';
    cardAiRegistry[id] = grounded;
    aiHtml = `<button type="button" class="card-action-btn" data-card-ai-id="${id}"><span class="icon">✦</span> Ask AI</button>`;
  }
  return `<div class="card-actions-row">${embedHtml}${pdfHtml}${aiHtml}</div>`;
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-card-ai-id]');
  if (!btn) return;
  const prompt = cardAiRegistry[btn.dataset.cardAiId];
  if (prompt && window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(prompt);
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.embed-btn');
  if (!btn) return;
  const entry = embedRegistry[btn.dataset.embedId];
  if (entry) openEmbedDialog(entry.type, entry.title, entry.htmlBuilder());
});

let embedContext = null;
let embedSelectedCategory = null;
function openEmbedDialog(type, title, contentHtml) {
  embedContext = { type, title, html: contentHtml };
  document.getElementById('embedModalTitle').textContent = 'Embed — ' + title;
  populateEmbedFolderSelect();
  populateEmbedCategoryChips();
  document.getElementById('embedModal').hidden = false;
}
function populateEmbedFolderSelect() {
  const sel = document.getElementById('embedFolderSelect');
  const folders = loadFolders();
  sel.innerHTML = folders.length
    ? folders.map(f => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`).join('')
    : `<option value="">(no folders yet — create one below)</option>`;
}
function populateEmbedCategoryChips() {
  const wrap = document.getElementById('embedCategoryChips');
  const cats = loadCategories();
  if (!embedSelectedCategory || !cats.includes(embedSelectedCategory)) embedSelectedCategory = cats[0] || null;
  wrap.innerHTML = cats.map(c => `<button type="button" class="category-chip${c === embedSelectedCategory ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  wrap.querySelectorAll('.category-chip').forEach(chip => chip.addEventListener('click', () => { embedSelectedCategory = chip.dataset.cat; populateEmbedCategoryChips(); }));
}
document.getElementById('embedModalClose').addEventListener('click', () => { document.getElementById('embedModal').hidden = true; });
document.getElementById('embedCreateFolderBtn').addEventListener('click', () => {
  const input = document.getElementById('embedNewFolderInput');
  const name = input.value.trim();
  if (!name) return;
  const folders = loadFolders();
  const folder = { id: 'f' + Date.now(), name };
  folders.push(folder);
  saveFolders(folders);
  input.value = '';
  populateEmbedFolderSelect();
  document.getElementById('embedFolderSelect').value = folder.id;
});
document.getElementById('embedAddCategoryBtn').addEventListener('click', () => {
  const input = document.getElementById('embedNewCategoryInput');
  const name = input.value.trim();
  if (!name) return;
  const cats = loadCategories();
  if (!cats.includes(name)) { cats.push(name); saveCategories(cats); }
  embedSelectedCategory = name;
  input.value = '';
  populateEmbedCategoryChips();
});
function buildEmbedSnippet(title, contentHtml) {
  return `<div style="font-family:Arial,sans-serif;border:1px solid #ccc;border-radius:6px;padding:16px;max-width:480px;">
  <div style="font-weight:700;font-size:14px;margin-bottom:8px;">${String(title).replace(/</g, '&lt;')}</div>
  <div style="font-size:13px;line-height:1.6;color:#333;">${contentHtml}</div>
  <div style="font-size:10px;color:#999;margin-top:10px;">Embedded from Niyantran Terminal</div>
</div>`;
}
document.getElementById('embedConfirmBtn').addEventListener('click', async () => {
  if (!embedContext) return;
  const folderId = document.getElementById('embedFolderSelect').value;
  const folders = loadFolders();
  const folder = folders.find(f => f.id === folderId);
  const snippet = buildEmbedSnippet(embedContext.title, embedContext.html);
  try { await navigator.clipboard.writeText(snippet); } catch (e) { /* clipboard permission may be blocked; save still proceeds */ }
  const items = loadSavedItems();
  items.push({
    id: 'i' + Date.now(),
    folderId: folder ? folder.id : null,
    category: embedSelectedCategory || null,
    type: embedContext.type,
    title: embedContext.title,
    html: embedContext.html,
    tier: activeTier,
    savedAt: new Date().toISOString(),
  });
  saveSavedItems(items);
  document.getElementById('embedModal').hidden = true;
  showToast(folder ? `Embed code copied to clipboard — saved to "${folder.name}"` : 'Embed code copied to clipboard');
  if (document.getElementById('pane-saved') && !document.getElementById('pane-saved').hidden) renderSavedPane();
});

function buildCurrentFeatureSnapshot() {
  const f = featuresForTier(activeTier)[activeIndex];
  if (!f) return { title: tierLabel(activeTier), html: '' };
  let rowsHtml = '';
  if (f.dataSource && f.dataSource.csv && EMBEDDED_CSV_DATA[f.dataSource.csv] && EMBEDDED_CSV_DATA[f.dataSource.csv].length) {
    const rows = EMBEDDED_CSV_DATA[f.dataSource.csv].slice(0, 3);
    const cols = (f.columns && f.columns.length ? Object.keys(rows[0]) : Object.keys(rows[0])).slice(0, 2);
    rowsHtml = '<ul style="margin:8px 0 0 18px;padding:0;">' + rows.map(r => `<li>${escapeHtml(cols.map(c => r[c]).join(' — '))}</li>`).join('') + '</ul>';
  }
  return { title: f.feature, html: `<div>${escapeHtml(f.bucket)}</div>${rowsHtml}` };
}

// ---------- Geopolitics scope-bar action buttons (rebuilt every render,
// since renderScopeBar() replaces #scopeBar's innerHTML each tier switch) ----------
function wireGeoScopeActions() {
  const newFolderBtn = document.getElementById('newFolderBtn');
  const newFolderPopover = document.getElementById('newFolderPopover');
  const categoryBtn = document.getElementById('categoryBtn');
  const categoryPopover = document.getElementById('categoryPopover');
  const geoEmbedBtn = document.getElementById('geoEmbedBtn');
  if (!newFolderBtn) return;

  const closeAllPopovers = () => { newFolderPopover.hidden = true; categoryPopover.hidden = true; };
  newFolderBtn.addEventListener('click', (e) => { e.stopPropagation(); const willShow = newFolderPopover.hidden; closeAllPopovers(); newFolderPopover.hidden = !willShow; });
  categoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willShow = categoryPopover.hidden;
    closeAllPopovers();
    categoryPopover.hidden = !willShow;
    if (!categoryPopover.hidden) renderScopeCategoryChips();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.scope-action-wrap')) closeAllPopovers();
  });
  document.getElementById('newFolderCreateBtn').addEventListener('click', () => {
    const input = document.getElementById('newFolderNameInput');
    const name = input.value.trim();
    if (!name) return;
    const folders = loadFolders();
    folders.push({ id: 'f' + Date.now(), name });
    saveFolders(folders);
    input.value = '';
    showToast(`Folder "${name}" created`);
    newFolderPopover.hidden = true;
  });
  document.getElementById('newCategoryCreateBtn').addEventListener('click', () => {
    const input = document.getElementById('newCategoryNameInput');
    const name = input.value.trim();
    if (!name) return;
    const cats = loadCategories();
    if (!cats.includes(name)) { cats.push(name); saveCategories(cats); }
    input.value = '';
    renderScopeCategoryChips();
  });
  geoEmbedBtn.addEventListener('click', () => {
    const snap = buildCurrentFeatureSnapshot();
    openEmbedDialog('Geopolitics', snap.title, snap.html);
  });
}
function renderScopeCategoryChips() {
  const wrap = document.getElementById('scopeCategoryChips');
  if (!wrap) return;
  const cats = loadCategories();
  wrap.innerHTML = cats.map(c => `<span class="category-chip">${escapeHtml(c)}</span>`).join('');
}
window.wireGeoScopeActions = wireGeoScopeActions;

// ---------- Data Studio "Saved" pane ----------
function renderSavedPane() {
  const folders = loadFolders();
  const items = loadSavedItems();
  const nav = document.getElementById('savedFolderNav');
  const body = document.getElementById('savedItemsBody');
  if (!nav || !body) return;
  if (!window.__savedActiveFolder) window.__savedActiveFolder = 'all';
  const activeFolder = window.__savedActiveFolder;

  nav.innerHTML = [
    `<button class="studio-nav-item${activeFolder === 'all' ? ' active' : ''}" data-folder="all" type="button">All (${items.length})</button>`,
    ...folders.map(f => `<button class="studio-nav-item${activeFolder === f.id ? ' active' : ''}" data-folder="${escapeHtml(f.id)}" type="button">${escapeHtml(f.name)} (${items.filter(i => i.folderId === f.id).length})</button>`),
  ].join('');
  nav.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { window.__savedActiveFolder = b.dataset.folder; renderSavedPane(); }));

  const visible = activeFolder === 'all' ? items : items.filter(i => i.folderId === activeFolder);
  if (!visible.length) {
    body.innerHTML = `<div class="empty-state"><div class="headline">NOTHING SAVED YET</div>Use the ⧉ Embed button on a Bill, Affidavit, Assets, or Geopolitics card to save it here.</div>`;
    return;
  }
  body.innerHTML = `<div class="dataset-grid">` + visible.map(item => `
    <div class="dataset-card" data-item-id="${escapeHtml(item.id)}">
      <div class="ds-name">${escapeHtml(item.title)}</div>
      <div class="ds-meta">${escapeHtml(item.type)}${item.category ? ' · ' + escapeHtml(item.category) : ''} · ${escapeHtml(new Date(item.savedAt).toLocaleDateString('en-GB'))}</div>
      <div class="ds-actions">
        <button class="toolbar-btn saved-embed-btn" type="button">⧉ Embed</button>
        <button class="toolbar-btn saved-delete-btn" type="button">Remove</button>
      </div>
    </div>
  `).join('') + `</div>`;
  body.querySelectorAll('.saved-embed-btn').forEach(btn => btn.addEventListener('click', async () => {
    const card = btn.closest('.dataset-card');
    const item = visible.find(i => i.id === card.dataset.itemId);
    if (!item) return;
    try { await navigator.clipboard.writeText(buildEmbedSnippet(item.title, item.html)); showToast('Embed code copied to clipboard'); }
    catch (e) { showToast('Could not access clipboard'); }
  }));
  body.querySelectorAll('.saved-delete-btn').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.dataset-card');
    const remaining = loadSavedItems().filter(i => i.id !== card.dataset.itemId);
    saveSavedItems(remaining);
    renderSavedPane();
  }));
}

renderAll();


/* ============================================================
   NIYANTRAN TERMINAL — CONNECTIVE TISSUE
   Wires the existing subsystems into one coherent user journey.
   Additive only: relies on functions/globals already defined above.
   ============================================================ */
(function () {
  'use strict';
  try { if (!document.getElementById('niy-rdai-css')) { const s = document.createElement('style'); s.id = 'niy-rdai-css'; s.textContent = '.rd-ai{border:1px solid rgba(120,180,255,.3);background:rgba(120,180,255,.06);border-radius:10px;padding:12px 14px;margin-bottom:12px}.rd-ai .rd-sec-label{color:#7fb0ff}.rd-ai-brief{font-size:14px;line-height:1.55;color:var(--fg,#e8edf2);margin:2px 0 8px}.rd-ai-sub{font-size:12.5px;line-height:1.5;color:var(--fg-muted,#b9c2cc);margin-top:5px}.rd-ai-sub span{color:var(--fg-faint,#8a94a0);text-transform:uppercase;letter-spacing:.04em;font-size:10px;font-weight:700;margin-right:6px}.rd-ai-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.rd-ai-tag{font-size:11px;color:#7fb0ff;background:rgba(120,180,255,.12);border:1px solid rgba(120,180,255,.3);border-radius:999px;padding:2px 9px}'; document.head.appendChild(s); } } catch (e) { }

  // ---- helpers that read live app state (already-global) ----
  function curFeature() {
    try { return featuresForTier(activeTier)[activeIndex] || null; } catch (e) { return null; }
  }
  function curFeatureCsv() {
    const f = curFeature();
    return (f && f.dataSource && f.dataSource.csv) ? f.dataSource.csv : null;
  }
  function rowsForCsv(csv) {
    if (!csv) return [];
    if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[csv]) return EMBEDDED_CSV_DATA[csv];
    return [];
  }

  /* ----------------------------------------------------------
     1. ROW → DETAIL DRAWER
     A row is the atomic unit of a terminal. Clicking it opens a
     structured detail view with every field + contextual actions,
     instead of the row being inert.
     ---------------------------------------------------------- */
  function openRowDetail(rowEl) {
    const f = curFeature();
    if (!f) return;
    const csv = curFeatureCsv();
    const rows = rowsForCsv(csv);
    // Prefer the raw-CSV index (data-raw-idx) — display order may be sorted.
    const rawAttr = rowEl.getAttribute('data-raw-idx');
    const idx = parseInt(rawAttr != null ? rawAttr : rowEl.getAttribute('data-row-idx'), 10);
    const tds = Array.from(rowEl.querySelectorAll('td'));
    // Prefer the underlying object (full fields) over the visible cells (mapped subset)
    const obj = (!isNaN(idx) && rows[idx]) ? rows[idx] : null;

    const title = tds.length ? String(tds[0].textContent).slice(0, 90) : f.feature;

    // ---- Enriched research view: summary · timeline · documents ·
    //      related entities · full metadata · cross-links. Built from the
    //      row's own real fields — nothing is fabricated; empty sections
    //      simply don't render. ----
    const entries = obj
      ? Object.entries(obj).filter(([, v]) => String(v ?? '').trim() !== '')
      : tds.map(td => [td.getAttribute('data-col') || '', String(td.textContent || '').trim()]).filter(([, v]) => v);
    const prettyKey = k => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isUrl = v => /^https?:\/\//i.test(String(v).trim());
    const yearOf = v => { const m = String(v).match(/\b(19|20)\d{2}\b/); return m ? parseInt(m[0], 10) : null; };
    const isDateish = v => yearOf(v) !== null && !/^\s*(19|20)\d{2}\s*$/.test(String(v).replace(/[.,;]/g, '')) ? /(\b\d{1,2}[\/\-\s][A-Za-z]{3,}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,}\s+\d{4}|\b\d{4}\b)/.test(String(v)) : yearOf(v) !== null;

    // Documents / PDFs — any URL-valued field, surfaced prominently.
    const docEntries = entries.filter(([, v]) => isUrl(v));
    const docsHtml = docEntries.length ? `
      <div class="rd-section"><div class="rd-sec-label">DOCUMENTS &amp; SOURCES</div>
      <div class="rd-docs">${docEntries.map(([k, v]) => {
        const url = String(v).trim(); const isPdf = /\.pdf(\?|$)/i.test(url);
        return `<a class="rd-doc" href="${escapeHtml(url)}" target="_blank" rel="noopener"><span class="rd-doc-ic">${isPdf ? '⤓' : '↗'}</span><span class="rd-doc-t">${escapeHtml(prettyKey(k))}</span></a>`;
      }).join('')}</div></div>` : '';

    // Timeline — every date-bearing field, ordered chronologically.
    const dateEntries = entries.filter(([, v]) => !isUrl(v) && isDateish(v) && yearOf(v))
      .map(([k, v]) => ({ k, v: String(v).trim(), y: yearOf(v) }))
      .sort((a, b) => a.y - b.y);
    const timelineHtml = dateEntries.length ? `
      <div class="rd-section"><div class="rd-sec-label">TIMELINE</div>
      <div class="rd-timeline">${dateEntries.map(e => `<div class="rd-tl-item"><span class="rd-tl-dot"></span><div class="rd-tl-body"><div class="rd-tl-when">${escapeHtml(e.v)}</div><div class="rd-tl-what">${escapeHtml(prettyKey(e.k))}</div></div></div>`).join('')}</div></div>` : '';

    // Related entities — short categorical values (party, ministry, region…).
    const ENTITY_KEYS = /party|ministry|sector|region|state|constituency|vendor|origin|category|department|court|status|stage|company|sponsor|financier|country|cadre|scheme/i;
    const entityEntries = entries.filter(([k, v]) => ENTITY_KEYS.test(k) && !isUrl(v) && String(v).trim().length <= 60);
    const entityHtml = entityEntries.length ? `
      <div class="rd-section"><div class="rd-sec-label">RELATED ENTITIES</div>
      <div class="rd-entities">${entityEntries.map(([k, v]) => `<span class="rd-entity" title="${escapeHtml(prettyKey(k))}">${escapeHtml(String(v).trim())}</span>`).join('')}</div></div>` : '';

    // Full metadata grid — every non-URL field.
    const fieldsHtml = entries.filter(([, v]) => !isUrl(v)).map(([k, v]) =>
      `<div class="row-detail-field"><div class="rdf-key">${escapeHtml(prettyKey(k))}</div><div class="rdf-val">${escapeHtml(String(v).trim())}</div></div>`
    ).join('');

    // One-line synthesized summary from the most salient fields.
    const summaryBits = entries.filter(([, v]) => !isUrl(v)).slice(0, 4).map(([k, v]) => `${prettyKey(k)}: ${String(v).trim()}`);
    const summaryHtml = summaryBits.length ? `<div class="rd-summary">${escapeHtml(summaryBits.join('  ·  ')).slice(0, 400)}</div>` : '';

    // Niyantran analysis layer — grounded enrichment for this record (if the pipeline produced it).
    let analysisHtml = '';
    try {
      if (obj && csv && typeof EMBEDDED_JSON_DATA !== 'undefined') {
        const af = csv.replace(/\.csv$/i, '') + '_analysis.json';
        const bag = EMBEDDED_JSON_DATA[af] || {};
        // Prefer the row's real id; fall back to its file-order index
        // (data-row-idx) for features whose CSV has no id column.
        const a = (obj.id != null && (bag[String(obj.id)] || bag[obj.id])) || (!isNaN(idx) && bag[String(idx)]);
        if (a && a.brief) {
          const why = a.why_it_matters || (Array.isArray(a.possible_effects) ? a.possible_effects.join(' ') : a.possible_effects);
          const watch = Array.isArray(a.watch_for) ? a.watch_for.join(' ') : a.watch_for;
          const tags = Array.isArray(a.tags) ? a.tags : (Array.isArray(a.sectors) ? a.sectors : []);
          analysisHtml = '<div class="rd-section rd-ai"><div class="rd-sec-label">✦ NIYANTRAN ANALYSIS</div>'
            + '<div class="rd-ai-brief">' + escapeHtml(String(a.brief)) + '</div>'
            + (why ? '<div class="rd-ai-sub"><span>Why it matters</span>' + escapeHtml(String(why)) + '</div>' : '')
            + (watch ? '<div class="rd-ai-sub"><span>What to watch</span>' + escapeHtml(String(watch)) + '</div>' : '')
            + (tags.length ? '<div class="rd-ai-tags">' + tags.slice(0, 8).map(t => '<span class="rd-ai-tag">' + escapeHtml(String(t)) + '</span>').join('') + '</div>' : '')
            + '</div>';
        }
      }
    } catch (e) { }

    // Cross-links to related views.
    const related = getRelatedFeatures(f).slice(0, 4);
    const relatedHtml = related.length
      ? `<div class="row-detail-related">
           <div class="rdr-label">CROSS-LINKS · RELATED VIEWS</div>
           ${related.map(r => `<button class="rd-chip" data-nav-tier="${r.tier}" data-nav-index="${r.index}">${escapeHtml(r.feature)} <span class="rd-chip-tier">${escapeHtml(tierLabel(r.tier))}</span></button>`).join('')}
         </div>`
      : '';

    const body = `
      <div class="row-detail-meta">
        <span class="tag">${escapeHtml(f.bucket)}</span>
        <span class="tag">${escapeHtml(tierLabel(activeTier))}</span>
        ${f.archetype ? `<span class="tag">${escapeHtml(String(f.archetype).toUpperCase())}</span>` : ''}
        ${csv ? `<span class="tag">${escapeHtml(csv)}</span>` : ''}
      </div>
      ${analysisHtml}
      ${summaryHtml}
      ${timelineHtml}
      ${docsHtml}
      ${entityHtml}
      <div class="rd-section"><div class="rd-sec-label">ALL FIELDS</div>
        <div class="row-detail-fields">${fieldsHtml || '<div class="rdf-empty">No structured fields available for this row.</div>'}</div>
      </div>
      ${relatedHtml}
      <div class="row-detail-actions">
        <button class="toolbar-btn primary" id="rdAskAi">✦ Ask AI about this</button>
        <button class="toolbar-btn" id="rdAddAi">＋ Add to AI context</button>
        ${csv ? `<button class="toolbar-btn" id="rdOpenStudio">Open dataset in Studio</button>` : ''}
        <button class="toolbar-btn" id="rdSaveRow">Save to Watchlist</button>
      </div>
    `;
    // ---- INLINE accordion — every card expands in place, uniform with the
    //      Bill Passage Index (which uses its own dataSource.expandable path). ----
    const _rdNext = rowEl.nextElementSibling;
    if (_rdNext && _rdNext.classList.contains('niy-rd-panel-row')) { _rdNext.remove(); rowEl.classList.remove('niy-rd-open'); return; }
    const _rdTable = rowEl.closest('table');
    if (_rdTable) _rdTable.querySelectorAll('tr.niy-rd-panel-row').forEach(r => { if (r.previousElementSibling) r.previousElementSibling.classList.remove('niy-rd-open'); r.remove(); });
    const _rdPanelRow = document.createElement('tr'); _rdPanelRow.className = 'niy-rd-panel-row';
    const _rdCell = document.createElement('td'); _rdCell.colSpan = rowEl.children.length || 1;
    _rdCell.innerHTML = '<div class="niy-rd-panel"><div class="niy-rd-panel-head"><span class="niy-rd-panel-title">' + escapeHtml(title) + '</span><button class="niy-rd-close" type="button" aria-label="Close">✕</button></div>' + body + '</div>';
    _rdPanelRow.appendChild(_rdCell); rowEl.after(_rdPanelRow); rowEl.classList.add('niy-rd-open');
    _rdCell.querySelector('.niy-rd-close').addEventListener('click', () => { _rdPanelRow.remove(); rowEl.classList.remove('niy-rd-open'); });
    setTimeout(() => { try { _rdPanelRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }, 40);

    // Shared card-context object for the AI actions below.
    const cardCtx = {
      title, feature: f.feature, tier: activeTier, tierLabel: tierLabel(activeTier),
      bucket: f.bucket, csv, fields: obj || Object.fromEntries(entries),
      pdf_url: window.niyCardPdfUrl ? window.niyCardPdfUrl(obj || Object.fromEntries(entries)) : '',
    };
    const addBtn = document.getElementById('rdAddAi');
    if (addBtn) addBtn.addEventListener('click', () => {
      if (window.NiyAI && window.NiyAI.addCard) {
        window.NiyAI.addCard(cardCtx);
        addBtn.textContent = '✓ Added to AI context';
        addBtn.disabled = true;
      }
    });

    // wire the detail-drawer actions
    const askBtn = document.getElementById('rdAskAi');
    if (askBtn) askBtn.addEventListener('click', () => {
      closeInfoModal();
      const summary = (obj ? Object.entries(obj).slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('; ')
                           : tds.map(td => td.textContent).join(' | '));
      openGlobalAiWithPrompt(`Explain the significance of this ${f.feature} record and what a journalist or analyst should look into next:\n\n${summary}`);
    });
    const studioBtn = document.getElementById('rdOpenStudio');
    if (studioBtn) studioBtn.addEventListener('click', () => {
      closeInfoModal();
      activeTier = 'datastudio'; renderAll();
      if (window.openDatasetInStudio && csv) window.openDatasetInStudio(csv);
    });
    const saveBtn = document.getElementById('rdSaveRow');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      saveRowToWatchlist(f, title, obj || {});
      saveBtn.textContent = '✓ Saved';
      saveBtn.disabled = true;
    });
    // related-view navigation
    document.querySelectorAll('.rd-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        closeInfoModal();
        activeTier = chip.getAttribute('data-nav-tier');
        activeIndex = parseInt(chip.getAttribute('data-nav-index'), 10) || 0;
        renderAll();
      });
    });
  }

  // Delegate row clicks. We only handle rows that are NOT already interactive
  // via the app's own accordion (expandable-row) — those have their own rich
  // expand panels and we must not double-handle them. We target plain data
  // rows inside the feature detail's primary/extra data areas.
  function isPlainDataRow(row) {
    if (!row) return false;
    if (row.getAttribute('data-row-idx') == null) return false;
    if (row.classList.contains('expandable-row')) return false;   // app owns these
    if (row.classList.contains('expand-panel-row')) return false; // accordion body
    // must live inside the feature detail data area (not the studio sheet, etc.)
    if (!row.closest('#detail')) return false;
    return true;
  }
  // Tag plain rows as interactive (for cursor styling) whenever detail renders.
  // Chunked: marking 9k rows in one pass is a ~200ms task ×3 deferred calls.
  let mprToken = 0;
  function markPlainRows() {
    const all = document.querySelectorAll('#detail table.sample tbody tr[data-row-idx]');
    const myTok = ++mprToken;
    let i = 0;
    (function step() {
      if (myTok !== mprToken) return;
      const stop = Math.min(i + 1200, all.length);
      for (; i < stop; i++) {
        const tr = all[i];
        if (isPlainDataRow(tr) && !tr.classList.contains('nx-row')) {
          tr.classList.add('nx-row');
          tr.setAttribute('tabindex', '0');
          tr.setAttribute('role', 'button');
        }
      }
      if (i < all.length) niyPost(step);
    })();
  }
  // For the finance market feed a row IS a tradable instrument — open the rich
  // instrument card (candlesticks + broker quick trade) instead of the generic
  // inline detail, so clicking a stock anywhere shows the same premium card.
  function niyFinRowOpen(row) {
    try {
      if (typeof activeTier === 'undefined' || activeTier !== 'finance') return false;
      if (typeof curFeatureCsv !== 'function' || curFeatureCsv() !== 'finance_market_feed.csv') return false;
      if (typeof openFinInstrument !== 'function') return false;
      const rawAttr = row.getAttribute('data-raw-idx');
      const idx = parseInt(rawAttr != null ? rawAttr : row.getAttribute('data-row-idx'), 10);
      let name = '';
      try { const rows = rowsForCsv('finance_market_feed.csv'); if (!isNaN(idx) && rows[idx]) name = rows[idx].name; } catch (_) { }
      if (!name) { const nc = row.querySelector('td[data-col="name"]') || row.querySelectorAll('td')[1]; if (nc) name = (nc.textContent || '').trim(); }
      if (!name) return false;
      openFinInstrument(name);
      return true;
    } catch (e) { return false; }
  }
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-row-idx]');
    if (!row || !isPlainDataRow(row)) return;
    if (e.target.closest('a')) return;
    if (niyFinRowOpen(row)) return;
    openRowDetail(row);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const row = document.activeElement;
    if (row && row.matches && row.matches('tr[data-row-idx]') && isPlainDataRow(row)) {
      e.preventDefault();
      if (niyFinRowOpen(row)) return;
      openRowDetail(row);
    }
  });

  /* ----------------------------------------------------------
     2. RELATED-FEATURE GRAPH
     Same-bucket + same-tier features are conceptually linked;
     so are cross-tier features sharing a bucket (e.g. Tenders
     at National / State / Local). This makes datasets stop
     being islands.
     ---------------------------------------------------------- */
  function getRelatedFeatures(f) {
    if (!f) return [];
    const out = [];
    const seen = new Set();
    const tiers = Object.keys(FEATURE_DATA);
    // 1) same bucket, other tiers (the "follow this theme down the stack" move)
    tiers.forEach(tier => {
      (FEATURE_DATA[tier] || []).forEach((cand, index) => {
        if (cand.feature === f.feature) return;
        const key = tier + '::' + cand.feature;
        if (seen.has(key)) return;
        const bucketMatch = cand.bucket && f.bucket &&
          cand.bucket.toLowerCase().split(/\s|&/).some(w => w.length > 3 && f.bucket.toLowerCase().includes(w));
        if (bucketMatch) { out.push({ tier, index, feature: cand.feature, bucket: cand.bucket, score: (tier === activeTier ? 1 : 2) }); seen.add(key); }
      });
    });
    // rank: cross-tier same-theme first (more useful), then same-tier
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  /* ----------------------------------------------------------
     3. TICKER → NAVIGATION
     Each ticker item now carries the feature it came from and
     jumps there on click. The ticker becomes a live index of
     what's moving, not decoration.
     ---------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.ticker-item');
    if (!item) return;
    const tier = item.getAttribute('data-tier');
    const index = item.getAttribute('data-index');
    if (tier != null && index != null) {
      activeTier = tier;
      activeIndex = parseInt(index, 10) || 0;
      renderAll();
    }
  });

  /* ----------------------------------------------------------
     4. GLOBAL AI — context-primed prompts
     Give the AI a real entry point from any row / feature so
     it's not a blank drawer the user has to figure out.
     ---------------------------------------------------------- */
  function openGlobalAiWithPrompt(prefill) {
    if (typeof openGlobalAi === 'function') openGlobalAi();
    const input = document.getElementById('globalAiInput');
    if (input) {
      input.value = prefill;
      input.focus();
      // auto-grow if it's a textarea
      if (input.tagName === 'TEXTAREA') { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
    }
  }
  window.openGlobalAiWithPrompt = openGlobalAiWithPrompt;

  /* ----------------------------------------------------------
     5. WATCHLIST — save a row, not just a dataset
     Reuses the existing saved-items store so saved rows show up
     in the Saved pane alongside saved datasets.
     ---------------------------------------------------------- */
  function saveRowToWatchlist(f, title, obj) {
    let list;
    try { list = loadSavedItems(); } catch (e) { list = []; }
    const id = 'row_' + Date.now();
    list.unshift({
      id,
      type: 'row',
      title: title,
      feature: f.feature,
      tier: activeTier,
      tierLabel: tierLabel(activeTier),
      bucket: f.bucket,
      csv: (f.dataSource && f.dataSource.csv) || '',
      snapshot: obj,
      savedAt: new Date().toISOString(),
    });
    try { saveSavedItems(list); } catch (e) {}
    if (typeof showToast === 'function') showToast('Saved to Watchlist — see Data Studio → Saved');
  }
  window.saveRowToWatchlist = saveRowToWatchlist;

  /* ----------------------------------------------------------
     6. FEATURE-LEVEL "ASK AI" + "RELATED" in the detail toolbar
     Adds two buttons to every feature's toolbar so the AI and
     the related-graph are reachable at the feature level too,
     not just per-row. Runs after each renderDetail via a hook.
     ---------------------------------------------------------- */
  function injectFeatureToolbarActions() {
    const toolbar = document.querySelector('#detail .toolbar');
    if (!toolbar || toolbar.querySelector('#featAskAi')) return;
    const f = curFeature();
    if (!f) return;

    const askBtn = document.createElement('button');
    askBtn.id = 'featAskAi';
    askBtn.className = 'toolbar-btn';
    askBtn.type = 'button';
    askBtn.textContent = 'Ask AI';
    askBtn.title = 'Ask the AI assistant about this feature';
    askBtn.addEventListener('click', () => {
      openGlobalAiWithPrompt(`Give me a 3-point briefing on "${f.feature}" (${f.bucket}, ${tierLabel(activeTier)}) — what it tracks, why it matters right now, and the single most newsworthy thing in the current data.`);
    });

    const related = getRelatedFeatures(f);
    toolbar.appendChild(askBtn);

    if (related.length) {
      const relWrap = document.createElement('div');
      relWrap.className = 'feat-related-wrap';
      const relBtn = document.createElement('button');
      relBtn.id = 'featRelated';
      relBtn.className = 'toolbar-btn';
      relBtn.type = 'button';
      relBtn.textContent = 'Related ▾';
      const pop = document.createElement('div');
      pop.className = 'feat-related-pop';
      pop.hidden = true;
      pop.innerHTML = related.slice(0, 6).map(r =>
        `<button class="frp-item" data-nav-tier="${r.tier}" data-nav-index="${r.index}">${escapeHtml(r.feature)}<span class="frp-tier">${escapeHtml(tierLabel(r.tier))}</span></button>`
      ).join('');
      relBtn.addEventListener('click', (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; });
      document.addEventListener('click', () => { pop.hidden = true; });
      pop.addEventListener('click', (e) => {
        const it = e.target.closest('.frp-item');
        if (!it) return;
        activeTier = it.getAttribute('data-nav-tier');
        activeIndex = parseInt(it.getAttribute('data-nav-index'), 10) || 0;
        renderAll();
      });
      relWrap.appendChild(relBtn);
      relWrap.appendChild(pop);
      toolbar.appendChild(relWrap);
    }
  }

  /* ============================================================
     FINANCE TERMINAL — a markets dashboard (index strip w/ day-range
     bars, sector breadth, sector + policy-theme heatmaps, top movers,
     INDIA VIX, instrument drilldown, and a markets↔governance bridge)
     built ONLY from the real snapshot fields (open/high/low/last/
     change/pct). Single exchange-delayed snapshot → no fabricated
     time-series; prev-close and day-range are derived from real
     fields and labelled as such. ============================ */
  try {
    if (!document.getElementById('niy-fin-css')) {
      const fs = document.createElement('style'); fs.id = 'niy-fin-css';
      fs.textContent = "#niyFinDash{margin:2px 0 16px;font-variant-numeric:tabular-nums}.fin-topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}.fin-topbar-l{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--fg,#e8edf2)}.fin-topbar-r{font-size:10.5px;letter-spacing:.03em;color:#727c87}.fin-live-dot{width:6px;height:6px;border-radius:50%;background:#2fd57b;box-shadow:0 0 8px rgba(47,213,123,.7);animation:finPulse 2.4s infinite}@keyframes finPulse{0%{box-shadow:0 0 0 0 rgba(47,213,123,.45)}70%{box-shadow:0 0 0 7px rgba(47,213,123,0)}100%{box-shadow:0 0 0 0 rgba(47,213,123,0)}}.fin-delayed{font-size:8.5px;font-weight:700;letter-spacing:.1em;color:#d9a13c;border:1px solid rgba(217,161,60,.32);background:rgba(217,161,60,.07);border-radius:999px;padding:2px 8px}.fin-strip{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:thin}.fin-card{flex:1 1 0;min-width:150px;position:relative;text-align:left;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0) 52%),#10141b;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px 12px 15px;cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;box-shadow:0 4px 14px rgba(0,0,0,.22)}.fin-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.16);box-shadow:0 10px 26px rgba(0,0,0,.32)}.fin-card::before{content:'';position:absolute;left:0;top:11px;bottom:11px;width:2px;border-radius:2px;background:rgba(138,148,160,.45)}.fin-card.up::before{background:linear-gradient(180deg,#2fd57b,rgba(47,213,123,.12))}.fin-card.down::before{background:linear-gradient(180deg,#ff5d5d,rgba(255,93,93,.12))}.fin-card-name{font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#8d97a3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fin-card-last{font-size:21px;font-weight:650;letter-spacing:-.01em;color:var(--fg,#eef2f6);margin:5px 0 6px}.fin-card-chg{display:inline-flex;align-items:baseline;gap:4px;font-size:10.5px;font-weight:650;border-radius:6px;padding:2.5px 7px}.fin-card-chg.up{background:rgba(47,213,123,.09)}.fin-card-chg.down{background:rgba(255,93,93,.09)}.fin-card-chg.flat{background:rgba(138,148,160,.1)}.fin-card-chg span{opacity:.75;font-weight:550}#niyFinDash .up,.fin-modal .up{color:#2fd57b}#niyFinDash .down,.fin-modal .down{color:#ff6666}#niyFinDash .flat,.fin-modal .flat{color:#8a94a0}.fin-range{margin-top:11px}.fin-range-track{position:relative;height:3px;border-radius:2px;background:rgba(255,255,255,.08)}.fin-range-last{position:absolute;top:-2.5px;width:2px;height:8px;border-radius:1px;background:#eef2f6;box-shadow:0 0 5px rgba(238,242,246,.55);transform:translateX(-50%)}.fin-range-open{position:absolute;top:-1px;width:5px;height:5px;border-radius:50%;border:1px solid #6c757f;background:#10141b;transform:translate(-50%,0)}.fin-range-lh{display:flex;justify-content:space-between;font-size:9px;letter-spacing:.02em;color:#68717b;margin-top:5px}.fin-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}@media(max-width:720px){.fin-grid2{grid-template-columns:1fr}}.fin-panel{background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0) 46%),#0f1319;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 16px;margin-bottom:12px}.fin-panel-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;font-weight:700;letter-spacing:.13em;color:#939daa;margin-bottom:12px}.fin-panel-h::before{content:'';width:3px;height:10px;border-radius:2px;background:#39424e}.fin-panel-h.up::before{background:#2fd57b}.fin-panel-h.down::before{background:#ff5d5d}#niyFinDash .fin-panel-h.up,#niyFinDash .fin-panel-h.down{color:#939daa}.fin-h-sub{font-size:9.5px;font-weight:500;letter-spacing:.02em;color:#68717b;text-transform:none}.fin-breadth-bar{display:flex;gap:3px;height:8px}.fin-breadth-bar span{border-radius:4px}.fin-breadth-bar span.up{background:linear-gradient(90deg,#27b56a,#2fd57b)}.fin-breadth-bar span.flat{background:#39424e}.fin-breadth-bar span.down{background:linear-gradient(90deg,#ff5d5d,#dd4747)}.fin-breadth-legend{display:flex;justify-content:space-between;font-size:10.5px;font-weight:600;margin-top:9px}.fin-breadth-legend .flat{color:#727c87}.fin-breadth-avg{font-size:11px;color:#939daa;margin-top:7px}.fin-vix-v{font-size:30px;font-weight:650;letter-spacing:-.02em;color:var(--fg,#eef2f6);line-height:1}.fin-vix-mood{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:650;margin-top:9px}.fin-vix-chip{font-size:8.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:2.5px 9px}.fin-vix-chip.calm{color:#2fd57b;background:rgba(47,213,123,.08);border:1px solid rgba(47,213,123,.28)}.fin-vix-chip.normal{color:#9aa4b0;background:rgba(154,164,176,.08);border:1px solid rgba(154,164,176,.25)}.fin-vix-chip.elev{color:#d9a13c;background:rgba(217,161,60,.08);border:1px solid rgba(217,161,60,.3)}.fin-vix-chip.fear{color:#ff6666;background:rgba(255,93,93,.08);border:1px solid rgba(255,93,93,.3)}.fin-vix-note{font-size:10px;color:#68717b;margin-top:10px;line-height:1.55}.fin-heat{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:7px}.fin-tile{position:relative;text-align:left;border:1px solid rgba(255,255,255,.05);border-radius:9px;padding:9px 11px 8px;cursor:pointer;min-height:54px;display:flex;flex-direction:column;justify-content:space-between;gap:5px;background:linear-gradient(0deg,var(--heat,rgba(138,148,160,.08)),var(--heat,rgba(138,148,160,.08))),#10141b;transition:transform .12s ease,border-color .12s ease;overflow:hidden}.fin-tile:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.2);z-index:2}.fin-tile-name{font-size:9.5px;font-weight:650;letter-spacing:.05em;line-height:1.3;color:rgba(235,240,245,.82)}.fin-tile-pct{font-size:12px;font-weight:700;letter-spacing:.01em}.fin-tile.up .fin-tile-pct{color:#5ce8a4}.fin-tile.down .fin-tile-pct{color:#ff8585}.fin-tile.flat .fin-tile-pct{color:#9aa4b0}.fin-movers{display:flex;flex-direction:column}.fin-mv{display:grid;grid-template-columns:minmax(0,1fr) 56px 76px 56px;gap:10px;align-items:center;text-align:left;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.045);padding:7.5px 6px;cursor:pointer}.fin-mv:last-child{border-bottom:0}.fin-mv:hover{background:rgba(255,255,255,.03)}.fin-mv-n{font-size:11.5px;font-weight:550;color:#d9e0e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fin-mv-bar{height:4px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden}.fin-mv-bar i{display:block;height:100%;border-radius:2px;background:#8a94a0}.fin-mv.up .fin-mv-bar i{background:linear-gradient(90deg,rgba(47,213,123,.5),#2fd57b)}.fin-mv.down .fin-mv-bar i{background:linear-gradient(90deg,rgba(255,93,93,.5),#ff5d5d)}.fin-mv-l{font-size:11px;color:#8d97a3;text-align:right}.fin-mv-p{font-size:11.5px;font-weight:700;text-align:right}.fin-bridge{display:flex;gap:12px;align-items:flex-start;background:linear-gradient(90deg,rgba(127,176,255,.05),rgba(127,176,255,.012)),#0f1319;border:1px solid rgba(127,176,255,.16);border-radius:12px;padding:13px 15px}.fin-bridge-ic{font-size:16px;color:#8db8ff;line-height:1.3}.fin-bridge-tx{font-size:11.5px;line-height:1.65;color:#aab4c0}.fin-link{background:rgba(127,176,255,.09);border:1px solid rgba(127,176,255,.26);color:#8db8ff;border-radius:6px;padding:1px 8px;font-size:11px;cursor:pointer;font-weight:600;transition:background .12s}.fin-link:hover{background:rgba(127,176,255,.2)}.fin-modal-ov{position:fixed;inset:0;background:rgba(3,5,9,.7);backdrop-filter:blur(4px);z-index:9000;display:none;align-items:center;justify-content:center;padding:20px}.fin-modal-ov.show{display:flex}.fin-modal{width:min(680px,95vw);background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,0) 40%),#10141b;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:20px 22px;box-shadow:0 24px 70px rgba(0,0,0,.55);position:relative;font-variant-numeric:tabular-nums;max-height:calc(100vh - 36px);overflow-y:auto;overscroll-behavior:contain}.fin-modal-x{position:absolute;top:12px;right:14px;background:rgba(16,20,27,.55);backdrop-filter:blur(4px);border:0;color:#9aa3ad;font-size:19px;cursor:pointer;line-height:1;z-index:8;width:28px;height:28px;border-radius:7px}.fin-modal-x:hover{color:#eef2f6;background:rgba(40,48,60,.7)}.fin-modal-x:hover{color:#eef2f6}.fin-modal-name{font-size:15px;font-weight:700;letter-spacing:.02em;color:var(--fg,#eef2f6);padding-right:22px}.fin-modal-ex{font-size:10px;letter-spacing:.04em;color:#727c87;margin-top:3px}.fin-modal-price{display:flex;align-items:baseline;gap:12px;margin:15px 0 12px;flex-wrap:wrap}.fin-modal-last{font-size:30px;font-weight:650;letter-spacing:-.02em;color:var(--fg,#eef2f6)}.fin-modal-chg{font-size:13px;font-weight:650}.fin-modal-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0 6px}.fin-modal-grid div{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;font-size:13px;font-weight:650;color:var(--fg,#eef2f6)}.fin-modal-grid span{display:block;font-size:8.5px;font-weight:700;letter-spacing:.09em;color:#727c87;text-transform:uppercase;margin-bottom:4px}.fin-modal-bridge{font-size:11.5px;color:#aab4c0;margin-top:12px;line-height:1.55}.fin-modal-foot{font-size:9.5px;color:#68717b;margin-top:12px;line-height:1.5;border-top:1px solid rgba(255,255,255,.06);padding-top:10px}#niyOddsBoard{margin:2px 0 16px}.fin-odds-toggle{display:flex;gap:3px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:3px}.odds-tg{background:transparent;border:0;color:#8d97a3;font-size:11px;font-weight:600;padding:4.5px 12px;border-radius:6px;cursor:pointer;transition:color .12s}.odds-tg:hover{color:#dbe2e9}.odds-tg.active{background:rgba(127,176,255,.16);color:#a9c8ff}.odds-list{display:flex;flex-direction:column;gap:5px}.odds-row{display:grid;grid-template-columns:1fr 130px 90px 90px;gap:12px;align-items:center;padding:10px 13px;background:linear-gradient(180deg,rgba(255,255,255,.015),rgba(255,255,255,0)),#0f1319;border:1px solid rgba(255,255,255,.06);border-radius:10px;text-decoration:none;transition:border-color .12s,transform .12s}.odds-row:hover{border-color:rgba(127,176,255,.35);transform:translateY(-1px)}.odds-row.pol{border-left:2px solid #7fb0ff}.odds-q{font-size:12px;color:#dbe2e9;line-height:1.4}.odds-tag{font-size:8px;font-weight:700;letter-spacing:.08em;color:#8db8ff;border:1px solid rgba(127,176,255,.35);background:rgba(127,176,255,.07);border-radius:4px;padding:1.5px 5px;margin-right:7px;vertical-align:middle}.odds-prob{display:flex;align-items:center;gap:8px}.odds-prob-bar{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}.odds-prob-bar span{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#7fb0ff,#2fd57b)}.odds-prob-n{font-size:11.5px;font-weight:700;color:#eef2f6;min-width:34px;text-align:right}.odds-prob-na{color:#68717b;justify-content:flex-end}.odds-vol{font-size:11.5px;font-weight:650;color:#aab4c0;text-align:right}.odds-vol span{display:block;font-size:8.5px;font-weight:650;letter-spacing:.06em;color:#68717b;text-transform:uppercase;margin-bottom:1px}.odds-close{font-size:10.5px;color:#727c87;text-align:right}@media(max-width:720px){.odds-row{grid-template-columns:1fr auto;row-gap:6px}}#detail.niy-fin-on{overflow-y:auto}#detail.niy-fin-on #niyFinDash,#detail.niy-fin-on #niyOddsBoard{flex:0 0 auto}#detail.niy-fin-on .niy-split{flex:0 0 auto;height:72vh}";
      document.head.appendChild(fs);
    }
  } catch (e) { }

  const FIN_CSV = 'finance_market_feed.csv';
  const ODDS_CSV = 'finance_manifold_markets.csv';
  const FIN_SECTORS = ['NIFTY BANK', 'NIFTY IT', 'NIFTY AUTO', 'NIFTY FMCG', 'NIFTY PHARMA', 'NIFTY METAL', 'NIFTY REALTY', 'NIFTY MEDIA', 'NIFTY ENERGY', 'NIFTY OIL & GAS', 'NIFTY PSU BANK', 'NIFTY PRIVATE BANK', 'NIFTY FINANCIAL SERVICES', 'NIFTY HEALTHCARE INDEX', 'NIFTY CONSUMER DURABLES', 'NIFTY CHEMICALS', 'NIFTY CEMENT', 'NIFTY COMMODITIES', 'NIFTY INFRASTRUCTURE'];
  const FIN_THEMES = [['NIFTY INDIA DEFENCE', 'national'], ['NIFTY INDIA RAILWAYS PSU', 'national'], ['NIFTY INDIA MANUFACTURING', 'national'], ['NIFTY INDIA DIGITAL', 'national'], ['NIFTY EV & NEW AGE AUTOMOTIVE', 'national'], ['NIFTY HOUSING', 'national'], ['NIFTY INDIA TOURISM', 'national'], ['NIFTY INDIA CONSUMPTION', 'national'], ['NIFTY CPSE', 'finance'], ['NIFTY PSE', 'finance'], ['NIFTY CAPITAL MARKETS', 'finance'], ['NIFTY MNC', 'finance']];
  const FIN_HEADLINE = ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY MIDCAP 100', 'NIFTY SMALLCAP 100', 'INDIA VIX'];

  function finNum(v) { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : null; }
  function finRows() { try { return (EMBEDDED_CSV_DATA[FIN_CSV] || []); } catch (e) { return []; } }
  function finByName() { const m = {}; finRows().forEach(r => { m[r.name] = r; }); return m; }
  function finFmt(n) { if (n == null) return '—'; return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function finPctS(p) { if (p == null) return ''; return (p >= 0 ? '+' : '') + p.toFixed(2) + '%'; }
  function finDir(p) { return p == null ? 'flat' : (p > 0 ? 'up' : (p < 0 ? 'down' : 'flat')); }
  function finColor(p) {
    if (p == null) return 'rgba(138,148,160,.10)';
    const c = Math.max(-2, Math.min(2, p)) / 2;
    if (c >= 0) { const a = 0.08 + 0.40 * c; return 'rgba(38,180,105,' + a.toFixed(3) + ')'; }
    const a = 0.08 + 0.40 * (-c); return 'rgba(235,80,80,' + a.toFixed(3) + ')';
  }
  function finRangeBar(r) {
    const lo = finNum(r.low), hi = finNum(r.high), last = finNum(r.last), op = finNum(r.open);
    if (lo == null || hi == null || hi <= lo) return '';
    const pos = v => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const lastP = last == null ? null : pos(last), opP = op == null ? null : pos(op);
    return '<div class="fin-range"><div class="fin-range-track">'
      + (opP != null ? '<span class="fin-range-open" style="left:' + opP + '%" title="Open ' + finFmt(op) + '"></span>' : '')
      + (lastP != null ? '<span class="fin-range-last" style="left:' + lastP + '%" title="Last ' + finFmt(last) + '"></span>' : '')
      + '</div><div class="fin-range-lh"><span>L ' + finFmt(lo) + '</span><span>H ' + finFmt(hi) + '</span></div></div>';
  }
  function finCard(r) {
    if (!r) return '';
    const p = finNum(r.pct_change), ch = finNum(r.change), last = finNum(r.last), dir = finDir(p), isVix = /VIX/i.test(r.name);
    return '<button class="fin-card ' + dir + '" data-fin="' + escapeHtml(r.name) + '" type="button">'
      + '<div class="fin-card-name">' + escapeHtml(r.name) + '</div>'
      + '<div class="fin-card-last">' + finFmt(last) + '</div>'
      + '<div class="fin-card-chg ' + dir + '">' + (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬') + ' ' + (ch == null ? '' : finFmt(Math.abs(ch))) + ' <span>(' + finPctS(p) + ')</span></div>'
      + (isVix ? '' : finRangeBar(r)) + '</button>';
  }
  function finTileFrom(r) {
    if (!r) return '';
    const p = finNum(r.pct_change), d = finDir(p), label = r.name.replace(/^NIFTY\s+/, '').replace(/\s+INDEX$/, '');
    return '<button class="fin-tile ' + d + '" data-fin="' + escapeHtml(r.name) + '" style="--heat:' + finColor(p) + '" type="button"><span class="fin-tile-name">' + escapeHtml(label) + '</span><span class="fin-tile-pct">' + (d === 'up' ? '▲ ' : d === 'down' ? '▼ ' : '') + finPctS(p) + '</span></button>';
  }
  function finGoTier(tier) { try { const tab = document.querySelector('.tab[data-tier="' + tier + '"]'); if (tab) tab.click(); } catch (e) { } }
  // The detail view is restructured into a two-pane workbench
  // (#detail > .niy-split > [feed | work]); mount the dashboard FULL-WIDTH
  // above that split. Fall back to the data-area parent if the split isn't
  // built yet (early hook tick).
  function finMount(detail, el) {
    const split = detail.querySelector('.niy-split');
    if (split && split.parentElement) { split.parentElement.insertBefore(el, split); return; }
    const da = detail.querySelector('#dataArea');
    if (da && da.parentElement) { const lbl = da.previousElementSibling; da.parentElement.insertBefore(el, (lbl && lbl.classList && lbl.classList.contains('section-label')) ? lbl : da); return; }
    detail.appendChild(el);
  }

  // ---- Real daily candlestick charts (Yahoo public OHLC via /api/ohlc) --------
  const FIN_YSYM = { 'NIFTY 50': '^NSEI', 'NIFTY BANK': '^NSEBANK', 'NIFTY IT': '^CNXIT', 'NIFTY AUTO': '^CNXAUTO', 'NIFTY FMCG': '^CNXFMCG', 'NIFTY PHARMA': '^CNXPHARMA', 'NIFTY METAL': '^CNXMETAL', 'NIFTY REALTY': '^CNXREALTY', 'NIFTY MEDIA': '^CNXMEDIA', 'NIFTY ENERGY': '^CNXENERGY', 'NIFTY PSU BANK': '^CNXPSUBANK', 'NIFTY INFRASTRUCTURE': '^CNXINFRA', 'NIFTY FINANCIAL SERVICES': 'NIFTY_FIN_SERVICE.NS', 'NIFTY MIDCAP 100': 'NIFTY_MIDCAP_100.NS', 'NIFTY SMALLCAP 100': 'NIFTY_SMLCAP_100.NS', 'INDIA VIX': '^INDIAVIX' };
  function niyFinYSym(name) { return (window.NIY_YSYM && window.NIY_YSYM[name]) || FIN_YSYM[name] || ''; }
  function niyStockByName(name) { var a = window.NIY_STOCKS; if (!a) return null; for (var i = 0; i < a.length; i++) if (a[i].name === name) return a[i]; return null; }
  function niyMarketRec(name) { var s = niyStockByName(name); if (s) return { r: s, kind: 'equity' }; var M = window.NIY_MARKET; if (M) { for (var i = 0; i < M.length; i++) if (M[i].name === name) return { r: M[i], kind: M[i].kind || 'index' }; } var idx = (typeof finByName === 'function') ? finByName()[name] : null; if (idx) return { r: idx, kind: (idx.asset_type === 'stock' ? 'equity' : 'index') }; return null; }
  try { window.openFinInstrument = openFinInstrument; } catch (e) { }
  try { window.niyActive = function () { try { return { tier: activeTier, csv: curFeatureCsv() }; } catch (e) { return {}; } }; } catch (e) { }
  window.niyInstrumentSnapshot = function (name) { try { var r = niyMarketRec(name); if (!r) return null; var x = r.r; return { name: x.name, last: finNum(x.last), change: finNum(x.change), pct: finNum(x.pct_change), symbol: (typeof niyFinYSym === 'function' ? niyFinYSym(name) : ''), kind: r.kind, exchange: x.exchange || '' }; } catch (e) { return null; } };
  function finSpark(name) { try { var sym = (typeof niyFinYSym === 'function') ? niyFinYSym(name) : ''; var e = window.NIY_OHLC_EMBED && sym && window.NIY_OHLC_EMBED[sym]; if (!e || !e.c || e.c.length < 3) return ''; var c = e.c.slice(-24), lo = Math.min.apply(null, c), hi = Math.max.apply(null, c); if (hi <= lo) hi = lo + 1; var W = 60, H = 18, n = c.length, pts = []; for (var i = 0; i < n; i++) pts.push(((i / (n - 1)) * W).toFixed(1) + ',' + (H - ((c[i] - lo) / (hi - lo)) * (H - 3) - 1.5).toFixed(1)); var up = c[n - 1] >= c[0]; return '<svg class="fin-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (up ? '#26b469' : '#eb5050') + '" stroke-width="1.3"/></svg>'; } catch (e) { return ''; } }
  function niyFinChartCSS() {
    if (document.getElementById('niy-fin-chart-css')) return;
    const st = document.createElement('style'); st.id = 'niy-fin-chart-css';
    st.textContent = '.fin-chart-block{margin-top:16px;border-top:1px solid var(--line);padding-top:14px}'
      + '.fin-chart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}'
      + '.fin-chart-title{font:600 10px/1 var(--font-mono,monospace);letter-spacing:.09em;color:var(--fg-dim)}'
      + '.fin-chart-ranges{display:flex;gap:4px}'
      + '.fin-rg{font:600 10px var(--font-mono,monospace);padding:3px 9px;background:transparent;border:1px solid var(--line);color:var(--fg-dim);border-radius:5px;cursor:pointer;transition:all .15s}'
      + '.fin-rg:hover{color:var(--fg)}.fin-rg.active{background:var(--ds-accent,#7fb0ff);border-color:var(--ds-accent,#7fb0ff);color:#04121f}'
      + '.fin-chart{min-height:200px}.fin-chart-msg{padding:40px 14px;text-align:center;color:var(--fg-dim);font-size:12px;line-height:1.5}'
      + '.fin-cndl-svg{width:100%;height:auto;display:block}.fin-ax{fill:var(--fg-dim);font:10px var(--font-mono,monospace)}.fin-cndl-bars{animation:cndlWipe .6s cubic-bezier(.22,.61,.36,1) both}@keyframes cndlWipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}.fin-chart-note{font:500 9px var(--font-mono,monospace);color:#68717b;margin-top:6px;letter-spacing:.03em}'
      + '.fin-xp>.fin-panel-h{display:flex;align-items:center;gap:8px}.fin-xp-seg{display:inline-flex;gap:2px;margin-left:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:2px}.fin-xp-tg{font:600 10px var(--font-mono,monospace);letter-spacing:.05em;text-transform:uppercase;padding:4px 12px;border:0;background:transparent;color:var(--fg-dim,#8a94a0);border-radius:5px;cursor:pointer;transition:all .15s}.fin-xp-tg.active{background:var(--ds-accent,#7fb0ff);color:#04121f}.fin-xp-tools{display:flex;align-items:center;gap:10px;margin:11px 0 9px}.fin-xp-search{flex:1;min-width:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:7px 11px;color:var(--fg,#eef2f6);font:500 12px var(--font-display,system-ui,sans-serif);outline:none}.fin-xp-search:focus{border-color:var(--ds-accent,#7fb0ff)}.fin-xp-count{font:600 10px var(--font-mono,monospace);color:#68717b;white-space:nowrap}.fin-xp-wrap{max-height:330px;overflow-y:auto;border:1px solid rgba(255,255,255,.06);border-radius:9px}.fin-xp-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.fin-xp-table thead th{position:sticky;top:0;background:#0f131a;font:600 9px var(--font-mono,monospace);letter-spacing:.06em;text-transform:uppercase;color:#68717b;text-align:left;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08);z-index:1}.fin-xp-table th.num{text-align:right}.fin-xp-row{cursor:pointer;transition:background .12s}.fin-xp-row:hover{background:rgba(127,176,255,.06)}.fin-xp-table td{padding:7px 12px;font:500 12px var(--font-display,system-ui,sans-serif);color:var(--fg,#eef2f6);border-bottom:1px solid rgba(255,255,255,.04)}.fin-xp-table td.num{text-align:right;font-family:var(--font-mono,monospace);font-size:11px}.fin-xp-table td.up{color:#26b469}.fin-xp-table td.down{color:#eb5050}.fin-xp-nm{max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fin-xp-empty{padding:22px;text-align:center;color:#68717b}.fin-xp-seg{margin:10px 0 2px;flex-wrap:wrap}.fin-xp-tg{white-space:nowrap}'
      + '.fin-chart-stat{font-size:12px;margin-bottom:8px;color:var(--fg-dim)}.fin-chart-stat b{color:var(--fg);font-size:15px}'
      + '.fin-chart-stat .up{color:#26b469}.fin-chart-stat .down{color:#eb5050}'
      + '.fin-vol-list{display:flex;flex-direction:column;gap:7px}'
      + '.fin-vol-row{display:grid;grid-template-columns:130px 1fr 60px;align-items:center;gap:10px;background:transparent;border:0;padding:2px 0;cursor:pointer;text-align:left;width:100%}'
      + '.fin-vol-row:hover .fin-vol-n{color:var(--ds-accent,#7fb0ff)}'
      + '.fin-vol-n{font-size:11px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fin-vol-track{position:relative;height:15px;background:rgba(140,150,165,.10);border-radius:3px;overflow:hidden}'
      + '.fin-vol-fill{position:absolute;top:0;bottom:0;left:0;border-radius:3px}.fin-vol-fill.up{background:rgba(38,180,105,.5)}.fin-vol-fill.down{background:rgba(235,80,80,.5)}.fin-vol-fill.flat{background:rgba(140,150,165,.35)}'
      + '.fin-vol-last{position:absolute;top:-1px;bottom:-1px;width:2px;background:var(--fg)}'
      + '.fin-vol-v{font:600 11px var(--font-mono,monospace);text-align:right}.fin-vol-v.up{color:#26b469}.fin-vol-v.down{color:#eb5050}'
      + '.fin-chart{position:relative}.fin-cndl-svg{cursor:crosshair}.fin-chart-sub{color:#68717b;font-weight:500;font-size:10px;margin-left:5px}.fin-cndl-ax-r{fill:#8a94a0;font:9.5px var(--font-mono,monospace)}.fin-cndl-lastlbl{fill:#06121e;font:700 9.5px var(--font-mono,monospace)}.fin-sma{fill:none;stroke:#e0a852;stroke-width:1.4;opacity:.9;stroke-linejoin:round}.fin-cndl-lastline{stroke-width:1;stroke-dasharray:4 3;opacity:.75}.niy-cross line{stroke:rgba(200,212,228,.45);stroke-width:1;stroke-dasharray:3 3}.niy-cross circle.up{fill:#26b469}.niy-cross circle.down{fill:#eb5050}.niy-cross circle{stroke:#0b0f16;stroke-width:1.4}.niy-ct-tip{position:absolute;pointer-events:none;background:rgba(10,14,20,.97);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:7px 10px;font:500 10.5px var(--font-mono,monospace);color:#eef2f6;z-index:6;white-space:nowrap;box-shadow:0 8px 22px rgba(0,0,0,.55);display:none;min-width:128px}.niy-ct-tip .r{display:flex;justify-content:space-between;gap:16px;line-height:1.55}.niy-ct-tip .k{color:#68717b}.niy-ct-tip .up{color:#26b469}.niy-ct-tip .down{color:#eb5050}';
    document.head.appendChild(st);
  }
  function niyBuildCandles(d) {
    const O = [], H = [], L = [], C = [], T = [];
    for (let i = 0; i < d.t.length; i++) { if (d.o[i] == null || d.h[i] == null || d.l[i] == null || d.c[i] == null) continue; O.push(+d.o[i]); H.push(+d.h[i]); L.push(+d.l[i]); C.push(+d.c[i]); T.push(d.t[i]); }
    const m = O.length; if (!m) return { html: '<div class="fin-chart-msg">No candle data returned.</div>', empty: true };
    const W = 720, Hh = 340, padL = 10, padR = 60, padT = 8, padB = 24, plotW = W - padL - padR, plotH = Hh - padT - padB;
    let lo = Math.min.apply(null, L), hi = Math.max.apply(null, H); if (hi <= lo) hi = lo + 1;
    const gap = (hi - lo) * 0.06; lo -= gap; hi += gap;
    const xStep = m <= 1 ? 0 : plotW / (m - 1);
    const xOf = i => padL + i * xStep;
    const yOf = v => padT + (1 - (v - lo) / (hi - lo)) * plotH;
    const cw = Math.max(1.2, Math.min(11, xStep * 0.68));
    const nf = v => v.toLocaleString('en-IN', { maximumFractionDigits: hi < 100 ? 2 : 0 });
    const nf2 = v => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtD = ts => { try { return new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
    let axis = '';
    for (let g = 0; g <= 4; g++) { const v = lo + (hi - lo) * g / 4, yy = yOf(v); axis += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="rgba(140,150,165,.11)" stroke-width="1"/>'; axis += '<text x="' + (W - padR + 5) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="start" class="fin-cndl-ax-r">' + nf(v) + '</text>'; }
    const nLab = Math.min(6, m);
    for (let g = 0; g < nLab; g++) { const idx = Math.round(g * (m - 1) / (nLab - 1 || 1)), xx = xOf(idx); axis += '<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + padT + '" y2="' + (padT + plotH) + '" stroke="rgba(140,150,165,.06)" stroke-width="1"/>'; axis += '<text x="' + xx.toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="middle" class="fin-cndl-ax-r">' + fmtD(T[idx]) + '</text>'; }
    let bars = '';
    for (let i = 0; i < m; i++) { const up = C[i] >= O[i], col = up ? '#26b469' : '#eb5050', xi = xOf(i), yO = yOf(O[i]), yC = yOf(C[i]), bt = Math.min(yO, yC), bb = Math.max(yO, yC); bars += '<line x1="' + xi.toFixed(1) + '" x2="' + xi.toFixed(1) + '" y1="' + yOf(H[i]).toFixed(1) + '" y2="' + yOf(L[i]).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>'; bars += '<rect x="' + (xi - cw / 2).toFixed(1) + '" y="' + bt.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(1, bb - bt).toFixed(1) + '" fill="' + col + '"/>'; }
    let sma = '';
    if (m >= 5) { const win = Math.min(20, m); const pts = []; let sum = 0; for (let i = 0; i < m; i++) { sum += C[i]; if (i >= win) sum -= C[i - win]; if (i >= win - 1) pts.push(xOf(i).toFixed(1) + ',' + yOf(sum / win).toFixed(1)); } if (pts.length > 1) sma = '<polyline class="fin-sma" points="' + pts.join(' ') + '"/>'; }
    const last = C[m - 1], lastY = yOf(last), lastUp = C[m - 1] >= (C[m - 2] != null ? C[m - 2] : O[m - 1]), lc = lastUp ? '#26b469' : '#eb5050';
    const lastLine = '<line class="fin-cndl-lastline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + lastY.toFixed(1) + '" y2="' + lastY.toFixed(1) + '" stroke="' + lc + '"/>' + '<rect x="' + (W - padR) + '" y="' + (lastY - 8).toFixed(1) + '" width="' + padR + '" height="16" fill="' + lc + '" rx="2"/>' + '<text x="' + (W - padR + 5) + '" y="' + (lastY + 3.5).toFixed(1) + '" class="fin-cndl-lastlbl">' + nf(last) + '</text>';
    const cross = '<g class="niy-cross" style="display:none"><line class="cx-v" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + plotH) + '"/><line class="cx-h" x1="' + padL + '" x2="' + (W - padR) + '" y1="0" y2="0"/><circle class="cx-d" cx="0" cy="0" r="3.2"/></g>';
    const hit = '<rect class="niy-cross-hit" x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="transparent"/>';
    const first = C[0], chg = last - first, pct = first ? chg / first * 100 : 0, up = chg >= 0;
    const hdr = '<div class="fin-chart-stat"><b>' + nf2(last) + '</b> <span class="' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + Math.abs(chg).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' (' + pct.toFixed(2) + '%)</span> <span class="fin-chart-sub">' + m + ' sessions · SMA20</span></div>';
    const html = hdr + '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="fin-cndl-svg" preserveAspectRatio="xMidYMid meet">' + axis + '<g class="fin-cndl-bars">' + bars + '</g>' + sma + lastLine + cross + hit + '</svg>';
    return { html: html, empty: false, series: { T: T, O: O, H: H, L: L, C: C }, geom: { W: W, Hh: Hh, padL: padL, padR: padR, padT: padT, plotW: plotW, plotH: plotH, lo: lo, hi: hi, m: m, xStep: xStep } };
  }
  function niyRenderCandles(d) { return niyBuildCandles(d).html; }
  function niyWireCandles(el, built) {
    if (!built || built.empty) return;
    const svg = el.querySelector('.fin-cndl-svg'); if (!svg) return;
    const g = built.geom, s = built.series;
    const cross = svg.querySelector('.niy-cross'), cv = cross.querySelector('.cx-v'), ch = cross.querySelector('.cx-h'), cd = cross.querySelector('.cx-d');
    let tip = el.querySelector('.niy-ct-tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'niy-ct-tip'; el.appendChild(tip); }
    const xOf = i => g.padL + i * g.xStep;
    const yOf = v => g.padT + (1 - (v - g.lo) / (g.hi - g.lo)) * g.plotH;
    const fmtD = ts => { try { return new Date(ts * 1000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    const nf = v => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function move(ev) {
      const r = svg.getBoundingClientRect(); if (!r.width) return; const scale = r.width / g.W;
      let i = Math.round(((ev.clientX - r.left) / scale - g.padL) / (g.xStep || 1)); if (i < 0) i = 0; if (i >= g.m) i = g.m - 1;
      const xi = xOf(i), cy = yOf(s.C[i]), up = s.C[i] >= s.O[i];
      cross.style.display = ''; cv.setAttribute('x1', xi); cv.setAttribute('x2', xi); ch.setAttribute('y1', cy); ch.setAttribute('y2', cy); cd.setAttribute('cx', xi); cd.setAttribute('cy', cy); cd.setAttribute('class', 'cx-d ' + (up ? 'up' : 'down'));
      const dchg = i > 0 ? (s.C[i] - s.C[i - 1]) : 0, dpct = i > 0 && s.C[i - 1] ? dchg / s.C[i - 1] * 100 : 0;
      tip.innerHTML = '<div class="r"><span class="k">' + fmtD(s.T[i]) + '</span></div><div class="r"><span class="k">O</span><span>' + nf(s.O[i]) + '</span></div><div class="r"><span class="k">H</span><span>' + nf(s.H[i]) + '</span></div><div class="r"><span class="k">L</span><span>' + nf(s.L[i]) + '</span></div><div class="r"><span class="k">C</span><span class="' + (up ? 'up' : 'down') + '">' + nf(s.C[i]) + '</span></div><div class="r"><span class="k">Chg</span><span class="' + (dchg >= 0 ? 'up' : 'down') + '">' + (dchg >= 0 ? '+' : '') + dpct.toFixed(2) + '%</span></div>';
      tip.style.display = 'block';
      const elR = el.getBoundingClientRect(); let px = (r.left - elR.left) + xi * scale + 14, py = (r.top - elR.top) + cy * scale - 12;
      if (px + 150 > elR.width) px = (r.left - elR.left) + xi * scale - 158; if (px < 0) px = 2;
      tip.style.left = px.toFixed(0) + 'px'; tip.style.top = Math.max(0, py).toFixed(0) + 'px';
    }
    svg.addEventListener('mousemove', move);
    svg.addEventListener('mouseleave', function () { cross.style.display = 'none'; tip.style.display = 'none'; });
  }
  const NIY_RANGE_BARS = { '1mo': 23, '3mo': 66, '6mo': 130, '1y': 100000 };
  function niySliceSeries(full, range) { const n = NIY_RANGE_BARS[range] || 130, len = full.t.length, s = Math.max(0, len - n); return { t: full.t.slice(s), o: full.o.slice(s), h: full.h.slice(s), l: full.l.slice(s), c: full.c.slice(s) }; }
  async function niyLoadInstrumentChart(name, el, range) {
    const sym = niyFinYSym(name); range = range || '6mo';
    el.innerHTML = '<div class="fin-chart-msg">Loading candles…</div>';
    if (!sym) { el.innerHTML = '<div class="fin-chart-msg">No public daily-candle series is mapped for this instrument yet.</div>'; return; }
    let data = null, stored = false;
    try { const r = await fetch('/api/ohlc?symbol=' + encodeURIComponent(sym) + '&range=' + encodeURIComponent(range), { signal: AbortSignal.timeout(9000) }); if (r.ok) { const j = await r.json(); if (j && j.t && j.t.length) data = j; } } catch (e) { }
    if (!data && window.NIY_OHLC_EMBED && window.NIY_OHLC_EMBED[sym] && window.NIY_OHLC_EMBED[sym].t && window.NIY_OHLC_EMBED[sym].t.length) { data = niySliceSeries(window.NIY_OHLC_EMBED[sym], range); stored = true; }
    if (!data) { try { const r2 = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=' + range + '&interval=1d', { signal: AbortSignal.timeout(9000) }); if (r2.ok) { const jj = await r2.json(); const res = jj && jj.chart && jj.chart.result && jj.chart.result[0]; if (res && res.timestamp) { const q = res.indicators.quote[0]; data = { t: res.timestamp, o: q.open, h: q.high, l: q.low, c: q.close }; } } } catch (e) { } }
    if (!data || !data.t || !data.t.length) { el.innerHTML = '<div class="fin-chart-msg">Daily candles are unavailable right now — the market-data source could not be reached (this is expected when opening the standalone file offline). The live snapshot above is unaffected.</div>'; return; }
    var _built = niyBuildCandles(data); el.innerHTML = _built.html + (stored ? '<div class="fin-chart-note">Stored end-of-day history \u00B7 live intraday feed on the hosted build</div>' : ''); try { niyWireCandles(el, _built); } catch (e) { }
  }

  function openFinInstrument(name) {
    const _res = (typeof niyMarketRec === 'function') ? niyMarketRec(name) : null;
    const r = _res ? _res.r : finByName()[name]; if (!r) return;
    const _kind = _res ? _res.kind : ((r && r.asset_type === 'stock') ? 'equity' : 'index');
    const isStock = _kind === 'equity';
    const kindLabel = _kind === 'equity' ? 'Equity' : _kind === 'commodity' ? 'Commodity' : _kind === 'currency' ? 'Currency' : _kind === 'crypto' ? 'Crypto' : 'Index';
    const last = finNum(r.last), ch = finNum(r.change), p = finNum(r.pct_change), op = finNum(r.open), hi = finNum(r.high), lo = finNum(r.low);
    const prev = (last != null && ch != null) ? last - ch : null, dir = finDir(p);
    const theme = FIN_THEMES.find(t => t[0] === name);
    let ov = document.getElementById('finModal');
    if (!ov) { ov = document.createElement('div'); ov.id = 'finModal'; ov.className = 'fin-modal-ov'; document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); }); }
    ov.innerHTML = '<div class="fin-modal"><button class="fin-modal-x" type="button" aria-label="Close">×</button>'
      + '<div class="fin-modal-name">' + escapeHtml(r.name) + '</div><div class="fin-modal-ex">' + escapeHtml(r.exchange || 'NSE') + ' · ' + kindLabel + ' · exchange-delayed snapshot</div>'
      + '<div class="fin-modal-price"><span class="fin-modal-last">' + finFmt(last) + '</span><span class="fin-modal-chg ' + dir + '">' + (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬') + ' ' + (ch == null ? '' : finFmt(ch)) + ' (' + finPctS(p) + ')</span></div>'
      + finRangeBar(r)
      + '<div class="fin-modal-grid"><div><span>Open</span>' + finFmt(op) + '</div><div><span>High</span>' + finFmt(hi) + '</div><div><span>Low</span>' + finFmt(lo) + '</div><div><span>Prev close</span>' + finFmt(prev) + '</div><div><span>Day range</span>' + ((lo != null && hi != null) ? finFmt(hi - lo) : '—') + '</div><div><span>% change</span><b class="' + dir + '">' + finPctS(p) + '</b></div></div>'
      + (theme ? '<div class="fin-modal-bridge">Policy-linked theme. Cross-reference governance data in <button class="fin-link" data-tier-link="' + theme[1] + '">' + (theme[1] === 'national' ? 'National ▸ Bill Tracker' : 'Finance ▸ Regulatory Watch') + '</button>.</div>' : '')
      + '<div class="fin-chart-block"><div class="fin-chart-head"><span class="fin-chart-title">PRICE HISTORY · DAILY CANDLES</span><div class="fin-chart-ranges">' + ['1mo', '3mo', '6mo', '1y'].map(function (rg) { return '<button class="fin-rg' + (rg === '6mo' ? ' active' : '') + '" data-rg="' + rg + '" type="button">' + (rg === '1y' ? '1Y' : rg.replace('mo', 'M')) + '</button>'; }).join('') + '</div></div><div class="fin-chart" id="finChart"><div class="fin-chart-msg">Loading candles…</div></div></div>'
      + '<div class="fin-modal-foot">Headline price is a single exchange-delayed snapshot (typically 15–30 min behind live); prev close derived as last − change. Daily candles below are real end-of-day OHLC history from Yahoo Finance public data — where a symbol has no public series, the chart says so.</div></div>';
    ov.classList.add('show');
    ov.querySelector('.fin-modal-x').addEventListener('click', () => ov.classList.remove('show'));
    if (window.NiyWatch) window.NiyWatch.attachFollow(ov.querySelector('.fin-modal'), r.name);
    niyFinChartCSS();
    const _finChartEl = ov.querySelector('#finChart');
    if (window.BrokerQuickTrade) { const _bqtCard = ov.querySelector('.fin-modal'); if (_bqtCard) window.BrokerQuickTrade.attach(_bqtCard, { name: r.name, symbol: (typeof niyFinYSym === 'function' ? niyFinYSym(r.name) : ''), price: last, kind: _kind }); }
    if (_finChartEl) { niyLoadInstrumentChart(r.name, _finChartEl, '6mo'); ov.querySelectorAll('.fin-rg').forEach(b => b.addEventListener('click', () => { ov.querySelectorAll('.fin-rg').forEach(x => x.classList.remove('active')); b.classList.add('active'); niyLoadInstrumentChart(r.name, _finChartEl, b.getAttribute('data-rg')); })); }
    const lk = ov.querySelector('[data-tier-link]'); if (lk) lk.addEventListener('click', () => { ov.classList.remove('show'); finGoTier(lk.getAttribute('data-tier-link')); });
  }

  function buildMarketDash(detail) {
    niyFinChartCSS();
    const rows = finRows(); if (!rows.length) return;
    const byN = {}; rows.forEach(r => byN[r.name] = r); const get = n => byN[n];
    const cards = FIN_HEADLINE.map(n => finCard(get(n))).join('');
    const secRows = FIN_SECTORS.map(get).filter(Boolean);
    let adv = 0, dec = 0, unch = 0, sum = 0, c = 0;
    secRows.forEach(r => { const p = finNum(r.pct_change); if (p == null) return; c++; sum += p; if (p > 0) adv++; else if (p < 0) dec++; else unch++; });
    const tot = adv + dec + unch || 1, avg = c ? sum / c : 0;
    const vix = get('INDIA VIX'), vixV = vix ? finNum(vix.last) : null, vixP = vix ? finNum(vix.pct_change) : null;
    const vixMood = vixV == null ? '' : (vixV < 13 ? 'Calm' : vixV < 16 ? 'Normal' : vixV < 20 ? 'Elevated' : 'High fear');
    const secTiles = FIN_SECTORS.map(n => finTileFrom(get(n))).filter(Boolean).join('');
    const themeTiles = FIN_THEMES.map(t => finTileFrom(get(t[0]))).filter(Boolean).join('');
    const uni = FIN_SECTORS.concat(FIN_THEMES.map(t => t[0])).map(get).filter(r => r && finNum(r.pct_change) != null);
    const sorted = uni.slice().sort((x, y) => finNum(y.pct_change) - finNum(x.pct_change));
    const gain = sorted.slice(0, 6), lose = sorted.slice(-6).reverse();
    const maxAbs = sorted.length ? (Math.max(Math.abs(finNum(sorted[0].pct_change)), Math.abs(finNum(sorted[sorted.length - 1].pct_change))) || 1) : 1;
    const moverRow = r => { const p = finNum(r.pct_change), d = finDir(p), label = r.name.replace(/^NIFTY\s+/, ''); return '<button class="fin-mv ' + d + '" data-fin="' + escapeHtml(r.name) + '" type="button"><span class="fin-mv-n">' + escapeHtml(label) + '</span><span class="fin-mv-bar"><i style="width:' + Math.round(Math.abs(p) / maxAbs * 100) + '%"></i></span><span class="fin-mv-l">' + finFmt(finNum(r.last)) + '</span><span class="fin-mv-p ' + d + '">' + finPctS(p) + '</span></button>'; };
    const topSec = secRows.slice().sort((x, y) => finNum(y.pct_change) - finNum(x.pct_change))[0];
    const botSec = secRows.slice().sort((x, y) => finNum(x.pct_change) - finNum(y.pct_change))[0];
    const volData = secRows.map(r => { const hi = finNum(r.high), lo = finNum(r.low), last = finNum(r.last), ch = finNum(r.change), p = finNum(r.pct_change); const prev = (last != null && ch != null) ? last - ch : last; const rng = (hi != null && lo != null && prev) ? (hi - lo) / prev * 100 : null; return { name: r.name, rng, p, hi, lo, last }; }).filter(v => v.rng != null).sort((a, b) => b.rng - a.rng);
    const volMax = volData.length ? (volData[0].rng || 1) : 1;
    const volHtml = volData.map(v => { const d = finDir(v.p), pos = (v.hi > v.lo && v.last != null) ? Math.max(0, Math.min(100, (v.last - v.lo) / (v.hi - v.lo) * 100)) : 50, label = v.name.replace(/^NIFTY\s+/, ''); return '<button class="fin-vol-row" data-fin="' + escapeHtml(v.name) + '" type="button"><span class="fin-vol-n">' + escapeHtml(label) + '</span><span class="fin-vol-track"><span class="fin-vol-fill ' + d + '" style="width:' + Math.round(v.rng / volMax * 100) + '%"></span><span class="fin-vol-last" style="left:' + pos.toFixed(1) + '%"></span></span><span class="fin-vol-v ' + d + '">' + v.rng.toFixed(2) + '%</span></button>'; }).join('');
    const el = document.createElement('div'); el.id = 'niyFinDash';
    el.innerHTML = ''
      + '<div class="fin-topbar"><div class="fin-topbar-l"><span class="fin-live-dot"></span> MARKET SNAPSHOT <span class="fin-delayed">EXCHANGE-DELAYED</span></div><div class="fin-topbar-r">' + rows.length + ' instruments · NSE/BSE public feed</div></div>'
      + '<div class="fin-strip">' + cards + '</div>'
      + '<div class="fin-panel fin-xp"><div class="fin-panel-h">MARKET EXPLORER</div><div class="fin-xp-seg"></div><div class="fin-xp-tools"><input class="fin-xp-search" type="text" placeholder="Filter by name\u2026" aria-label="Filter instruments"><span class="fin-xp-count"></span></div><div class="fin-xp-wrap"><table class="fin-xp-table"><thead><tr><th>Instrument</th><th class="num">LTP</th><th class="num">Chg</th><th class="num">% Chg</th><th class="num">Trend</th></tr></thead><tbody class="fin-xp-body"></tbody></table></div></div>'
      + '<div class="fin-grid2"><div class="fin-panel"><div class="fin-panel-h">SECTOR BREADTH</div>'
      + '<div class="fin-breadth-bar"><span class="up" style="width:' + (adv / tot * 100) + '%"></span><span class="flat" style="width:' + (unch / tot * 100) + '%"></span><span class="down" style="width:' + (dec / tot * 100) + '%"></span></div>'
      + '<div class="fin-breadth-legend"><span class="up">▲ ' + adv + ' advancing</span><span class="flat">▬ ' + unch + '</span><span class="down">▼ ' + dec + ' declining</span></div>'
      + '<div class="fin-breadth-avg">Avg sector move <b class="' + finDir(avg) + '">' + finPctS(avg) + '</b></div></div>'
      + '<div class="fin-panel fin-vix"><div class="fin-panel-h">INDIA VIX · VOLATILITY</div><div class="fin-vix-v">' + finFmt(vixV) + '</div><div class="fin-vix-mood"><span class="fin-vix-chip ' + (vixV == null ? 'normal' : vixV < 13 ? 'calm' : vixV < 16 ? 'normal' : vixV < 20 ? 'elev' : 'fear') + '">' + vixMood + '</span>' + (vixP != null ? '<span class="' + finDir(-vixP) + '">' + finPctS(vixP) + '</span>' : '') + '</div><div class="fin-vix-note">Higher VIX = more expected turbulence. Rising VIX alongside falling indices signals risk-off positioning.</div></div></div>'
      + '<div class="fin-panel"><div class="fin-panel-h">SECTOR HEATMAP <span class="fin-h-sub">% change · click a sector for detail</span></div><div class="fin-heat">' + secTiles + '</div></div>'
      + (volHtml ? '<div class="fin-panel"><div class="fin-panel-h">SECTOR VOLATILITY &amp; STRESS <span class="fin-h-sub">day range as % of prev close · widest bar = most stressed · click for candles</span></div><div class="fin-vol-list">' + volHtml + '</div><div class="fin-vix-note" style="margin-top:9px">Intraday stress = today\'s high–low spread as a % of the previous close, from the single delayed snapshot. The tick shows where the last price sits within the day\'s range. This is a daily-range gauge, not annualised volatility.</div></div>' : '')
      + '<div class="fin-panel"><div class="fin-panel-h">POLICY-LINKED THEMES <span class="fin-h-sub">baskets that move with government action · click to drill in</span></div><div class="fin-heat">' + themeTiles + '</div></div>'
      + '<div class="fin-grid2"><div class="fin-panel"><div class="fin-panel-h up">TOP GAINERS</div><div class="fin-movers">' + gain.map(moverRow).join('') + '</div></div><div class="fin-panel"><div class="fin-panel-h down">TOP LOSERS</div><div class="fin-movers">' + lose.map(moverRow).join('') + '</div></div></div>'
      + (topSec && botSec ? '<div class="fin-bridge"><div class="fin-bridge-ic">⇄</div><div class="fin-bridge-tx"><b>Markets ↔ Governance.</b> Strongest sector now: <b class="up">' + escapeHtml(topSec.name.replace(/^NIFTY\s+/, '')) + ' ' + finPctS(finNum(topSec.pct_change)) + '</b> · weakest: <b class="down">' + escapeHtml(botSec.name.replace(/^NIFTY\s+/, '')) + ' ' + finPctS(finNum(botSec.pct_change)) + '</b>. Cross-reference the policy that moves them in <button class="fin-link" data-tier-link="national">National ▸ Bill Tracker</button> and <button class="fin-link" data-tier-link="finance">Finance ▸ Regulatory Watch</button>.</div></div>' : '');
    finMount(detail, el);
    el.querySelectorAll('[data-fin]').forEach(b => b.addEventListener('click', () => openFinInstrument(b.getAttribute('data-fin'))));
    (function () {
      const xp = el.querySelector('.fin-xp'); if (!xp) return;
      const seg = xp.querySelector('.fin-xp-seg'), body = xp.querySelector('.fin-xp-body'), search = xp.querySelector('.fin-xp-search'), count = xp.querySelector('.fin-xp-count');
      const mkt = () => window.NIY_MARKET || [];
      const byCat = c => mkt().filter(x => x.category === c);
      const map = r => ({ name: r.name, last: finNum(r.last), ch: finNum(r.change), p: finNum(r.pct_change) });
      const CATS = [
        { id: 'nse-index', label: 'NSE Indices', unit: ' indices', get: () => finRows().filter(r => r && r.name && /^(NIFTY|INDIA VIX)/i.test(r.name)).map(map) },
        { id: 'nse-stock', label: 'NSE Stocks', unit: ' stocks', get: () => (window.NIY_STOCKS || []).map(map) },
        { id: 'bse-index', label: 'BSE Indices', unit: ' indices', get: () => byCat('bse-index').map(map) },
        { id: 'bse-stock', label: 'BSE Stocks', unit: ' stocks', get: () => byCat('bse-stock').map(map) },
        { id: 'global-index', label: 'Global', unit: ' indices', get: () => byCat('global-index').map(map) },
        { id: 'commodity', label: 'Commodities', unit: ' commodities', get: () => byCat('commodity').map(map) },
        { id: 'currency', label: 'Currencies', unit: ' pairs', get: () => byCat('currency').map(map) },
        { id: 'crypto', label: 'Crypto', unit: ' assets', get: () => byCat('crypto').map(map) }
      ].filter(c => { try { return c.get().length > 0; } catch (e) { return false; } });
      if (!CATS.length) return;
      let cur = CATS[0].id;
      seg.innerHTML = CATS.map(c => '<button class="fin-xp-tg' + (c.id === cur ? ' active' : '') + '" data-cls="' + c.id + '" type="button">' + c.label + '</button>').join('');
      const catOf = () => CATS.find(c => c.id === cur) || CATS[0];
      function draw() {
        const cat = catOf(), q = (search.value || '').trim().toLowerCase();
        let list = cat.get().filter(x => x.last != null);
        if (q) list = list.filter(x => x.name.toLowerCase().indexOf(q) !== -1);
        list.sort((a, b) => a.name.localeCompare(b.name));
        count.textContent = list.length + cat.unit;
        body.innerHTML = list.slice(0, 600).map(function (x) { const d = finDir(x.p); return '<tr class="fin-xp-row" data-fin="' + escapeHtml(x.name) + '"><td class="fin-xp-nm">' + escapeHtml(x.name) + '</td><td class="num">' + finFmt(x.last) + '</td><td class="num ' + d + '">' + (x.ch == null ? '' : (x.ch >= 0 ? '+' : '') + finFmt(x.ch)) + '</td><td class="num ' + d + '">' + finPctS(x.p) + '</td><td class="fin-xp-spark">' + finSpark(x.name) + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="fin-xp-empty">No matches.</td></tr>';
        body.querySelectorAll('.fin-xp-row').forEach(function (tr) { tr.addEventListener('click', function () { openFinInstrument(tr.getAttribute('data-fin')); }); });
      }
      seg.querySelectorAll('.fin-xp-tg').forEach(function (b) { b.addEventListener('click', function () { seg.querySelectorAll('.fin-xp-tg').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); cur = b.getAttribute('data-cls'); search.value = ''; draw(); }); });
      search.addEventListener('input', draw);
      draw();
    })();

    el.querySelectorAll('.fin-link[data-tier-link]').forEach(b => b.addEventListener('click', () => finGoTier(b.getAttribute('data-tier-link'))));
  }

  function buildOddsBoard(detail) {
    let rows; try { rows = (EMBEDDED_CSV_DATA[ODDS_CSV] || []).slice(); } catch (e) { return; }
    if (!rows.length) return;
    rows.sort((a, b) => (finNum(b.volume_24h) || 0) - (finNum(a.volume_24h) || 0));
    const fmtVol = v => { const n = finNum(v); if (n == null) return '—'; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return String(Math.round(n)); };
    const fmtClose = t => { const n = finNum(t); if (!n) return ''; try { return new Date(n).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    const isPol = v => String(v).toLowerCase() === 'yes';
    const render = polOnly => (rows.filter(r => !polOnly || isPol(r.is_political)).slice(0, 40).map(r => {
      const prob = finNum(r.probability), pol = isPol(r.is_political);
      const probHtml = prob != null ? '<div class="odds-prob"><div class="odds-prob-bar"><span style="width:' + Math.max(0, Math.min(100, prob * 100)) + '%"></span></div><div class="odds-prob-n">' + Math.round(prob * 100) + '%</div></div>' : '<div class="odds-prob odds-prob-na">—</div>';
      return '<a class="odds-row ' + (pol ? 'pol' : '') + '" href="' + escapeHtml(r.source_url || '#') + '" target="_blank" rel="noopener"><div class="odds-q">' + (pol ? '<span class="odds-tag">POLITICAL</span>' : '') + escapeHtml(r.question || '') + '</div>' + probHtml + '<div class="odds-vol"><span>24h vol</span>' + fmtVol(r.volume_24h) + '</div><div class="odds-close">' + fmtClose(r.close_time) + '</div></a>';
    }).join(''));
    const el = document.createElement('div'); el.id = 'niyOddsBoard';
    el.innerHTML = '<div class="fin-topbar"><div class="fin-topbar-l"><span class="fin-live-dot"></span> PREDICTION MARKETS <span class="fin-delayed">MANIFOLD · LIVE API</span></div><div class="fin-odds-toggle"><button class="odds-tg active" data-pol="0" type="button">All markets</button><button class="odds-tg" data-pol="1" type="button">Political only</button></div></div><div class="odds-list">' + render(false) + '</div>';
    finMount(detail, el);
    const listEl = el.querySelector('.odds-list');
    el.querySelectorAll('.odds-tg').forEach(t => t.addEventListener('click', () => { el.querySelectorAll('.odds-tg').forEach(x => x.classList.remove('active')); t.classList.add('active'); listEl.innerHTML = render(t.getAttribute('data-pol') === '1'); }));
  }

  function renderFinanceDash() {
    try {
      const detail = document.getElementById('detail'); if (!detail) return;
      const old = detail.querySelector('#niyFinDash'); if (old) old.remove();
      const oldO = detail.querySelector('#niyOddsBoard'); if (oldO) oldO.remove();
      detail.classList.remove('niy-fin-on');
      if (typeof activeTier === 'undefined' || activeTier !== 'finance') return;
      const csv = curFeatureCsv();
      if (csv === FIN_CSV) buildMarketDash(detail);
      else if (csv === ODDS_CSV) buildOddsBoard(detail);
      // #detail is a fixed-height flex column; a tall dashboard would squeeze
      // the workbench split to 0. Make #detail scroll and pin the split height
      // so the hero scrolls away and the workbench stays a real pane below.
      if (detail.querySelector('#niyFinDash') || detail.querySelector('#niyOddsBoard')) detail.classList.add('niy-fin-on');
    } catch (e) { }
  }
  try { window.renderFinanceDash = renderFinanceDash; } catch (e) { }

  /* ============================================================
     NIYANTRAN CANVAS STUDIO — a Figma/Canva-style board inside the
     Studio tab. Infinite pan/zoom canvas; text, sticky notes, shapes,
     arrows, images; select/move/resize/rotate; multi-select + marquee;
     layers, properties, align, z-order; undo/redo; autosave + named
     projects; JSON import/export; PNG export (own canvas renderer, no
     external lib). "Import card" pulls any record from any tier into a
     rich card carrying its NIYANTRAN ANALYSIS (grounded enrichment),
     key fields, status and source link — nothing fabricated.
     ============================================================ */
  (function () {
    const LSKEY = 'niyStudioDoc', LSPROJ = 'niyStudioProjects';
    const TIER_KEYS = ['geopolitics', 'national', 'state', 'local', 'judiciary', 'finance', 'climate'];
    const TIER_COLORS = { geopolitics: '#ff6b6b', national: '#7fb0ff', state: '#f0b429', local: '#f97fb5', judiciary: '#a78bfa', finance: '#2fd57b', climate: '#35c28f' };
    const TIER_SHORT = { geopolitics: 'GEO', national: 'NAT', state: 'UP', local: 'LOC', judiciary: 'JUD', finance: 'FIN', climate: 'CLI' };
    const st = { inited: false, ui: {}, doc: null, sel: [], tool: 'select', z: 1, px: 80, py: 60, hist: [], redoS: [], clip: null, space: false, drag: null, editing: null, cm: { tier: 'national', feat: null } };

    function newDoc() { return { name: 'Untitled board', seq: 0, elements: [] }; }
    function uid() { return 'el' + (++st.doc.seq) + '_' + Date.now().toString(36).slice(-4); }
    function byId(id) { return st.doc.elements.find(e => e.id === id); }
    function selEls() { return st.sel.map(byId).filter(Boolean); }
    function saveNow() { try { localStorage.setItem(LSKEY, JSON.stringify(st.doc)); } catch (e) { } }
    let saveT; function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
    function snap() { return JSON.stringify(st.doc.elements); }
    function pushHist(pre) { st.hist.push(pre != null ? pre : snap()); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0; }
    function undo() { if (!st.hist.length) return; st.redoS.push(snap()); st.doc.elements = JSON.parse(st.hist.pop()); st.sel = st.sel.filter(id => byId(id)); renderAllEls(); refreshUI(); saveSoon(); }
    function redoFn() { if (!st.redoS.length) return; st.hist.push(snap()); st.doc.elements = JSON.parse(st.redoS.pop()); st.sel = st.sel.filter(id => byId(id)); renderAllEls(); refreshUI(); saveSoon(); }
    function toast(m) { try { if (typeof showToast === 'function') showToast(m); } catch (e) { } }
    function canvasActive() { const p = document.getElementById('pane-canvas'); const ds = document.getElementById('dataStudio'); return !!(p && !p.hidden && st.inited && ds && ds.classList.contains('show')); }

    // ---------- styles ----------
    try {
      if (!document.getElementById('niy-canvas-css')) {
        const s = document.createElement('style'); s.id = 'niy-canvas-css';
        s.textContent = "#pane-canvas{display:flex;flex-direction:column;height:calc(100vh - 215px);min-height:560px}" +
          ".cs-root{display:flex;flex-direction:column;flex:1;min-height:0;background:#0b0e13;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden}" +
          ".cs-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);background:#0e1218}" +
          ".cs-name{background:transparent;border:1px solid transparent;border-radius:6px;color:#e8edf2;font-size:12.5px;font-weight:650;padding:4px 8px;width:170px}" +
          ".cs-name:hover,.cs-name:focus{border-color:rgba(255,255,255,.12);outline:none;background:rgba(255,255,255,.03)}" +
          ".cs-sep{width:1px;height:18px;background:rgba(255,255,255,.08)}" +
          ".cs-btn{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;color:#c3ccd6;font-size:11px;font-weight:600;padding:4.5px 9px;cursor:pointer;transition:background .12s,color .12s}" +
          ".cs-btn:hover{background:rgba(255,255,255,.09);color:#eef2f6}" +
          ".cs-btn:disabled{opacity:.35;cursor:default}" +
          ".cs-btn.pri{background:rgba(127,176,255,.14);border-color:rgba(127,176,255,.32);color:#a9c8ff}" +
          ".cs-btn.pri:hover{background:rgba(127,176,255,.25)}" +
          ".cs-btn.danger:hover{background:rgba(255,93,93,.15);color:#ff8585;border-color:rgba(255,93,93,.3)}" +
          ".cs-zoom{min-width:46px;text-align:center}" +
          ".cs-spacer{flex:1}" +
          ".cs-mid{display:flex;flex:1;min-height:0}" +
          ".cs-toolbar{display:flex;flex-direction:column;gap:4px;padding:8px 6px;border-right:1px solid rgba(255,255,255,.06);background:#0e1218}" +
          ".cs-tool{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid transparent;border-radius:8px;color:#98a3af;font-size:14px;cursor:pointer;position:relative}" +
          ".cs-tool:hover{background:rgba(255,255,255,.06);color:#e8edf2}" +
          ".cs-tool.active{background:rgba(127,176,255,.16);border-color:rgba(127,176,255,.35);color:#a9c8ff}" +
          ".cs-tool .k{position:absolute;right:2px;bottom:1px;font-size:7px;color:#5b636e;font-weight:700}" +
          ".cs-viewport{position:relative;flex:1;min-width:0;overflow:hidden;outline:none;background-color:#0b0e13;background-image:radial-gradient(circle,rgba(255,255,255,.06) 1px,transparent 1.3px);cursor:default;touch-action:none}" +
          ".cs-viewport.pan{cursor:grab}.cs-viewport.panning{cursor:grabbing}.cs-viewport.draw{cursor:crosshair}" +
          ".cs-world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}" +
          ".cs-el{position:absolute;box-sizing:border-box}" +
          ".cs-el.sel{outline:1.5px solid #7fb0ff;outline-offset:0}" +
          ".cs-el .cs-content{width:100%;height:100%;overflow:hidden}" +
          ".cs-shape{width:100%;height:100%}" +
          ".cs-text{width:100%;height:100%;color:#e8edf2;line-height:1.35;white-space:pre-wrap;word-break:break-word;padding:2px 4px}" +
          ".cs-text:focus{outline:1px dashed rgba(127,176,255,.6)}" +
          ".cs-sticky{width:100%;height:100%;border-radius:6px;box-shadow:0 6px 16px rgba(0,0,0,.35);padding:12px;color:#14161a;font-weight:550;line-height:1.4;white-space:pre-wrap;word-break:break-word;font-size:13px}" +
          ".cs-sticky:focus{outline:1px dashed rgba(0,0,0,.5)}" +
          ".cs-img{width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none}" +
          ".cs-h{position:absolute;width:9px;height:9px;background:#0b0e13;border:1.5px solid #7fb0ff;border-radius:2.5px;z-index:5}" +
          ".cs-h[data-h=nw]{left:-5px;top:-5px;cursor:nwse-resize}.cs-h[data-h=n]{left:calc(50% - 4.5px);top:-5px;cursor:ns-resize}.cs-h[data-h=ne]{right:-5px;top:-5px;cursor:nesw-resize}.cs-h[data-h=e]{right:-5px;top:calc(50% - 4.5px);cursor:ew-resize}.cs-h[data-h=se]{right:-5px;bottom:-5px;cursor:nwse-resize}.cs-h[data-h=s]{left:calc(50% - 4.5px);bottom:-5px;cursor:ns-resize}.cs-h[data-h=sw]{left:-5px;bottom:-5px;cursor:nesw-resize}.cs-h[data-h=w]{left:-5px;top:calc(50% - 4.5px);cursor:ew-resize}" +
          ".cs-h[data-h=rot]{left:calc(50% - 4.5px);top:-26px;border-radius:50%;cursor:alias}" +
          ".cs-rotline{position:absolute;left:calc(50% - .5px);top:-17px;width:1px;height:12px;background:rgba(127,176,255,.6);z-index:4}" +
          ".cs-marquee{position:absolute;border:1px solid rgba(127,176,255,.7);background:rgba(127,176,255,.09);z-index:50;pointer-events:none}" +
          ".cs-empty{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;color:#5f6873;font-size:12px;line-height:2;pointer-events:none;letter-spacing:.03em}" +
          ".cs-empty b{color:#98a3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;font-size:10.5px}" +
          ".cs-side{width:230px;border-left:1px solid rgba(255,255,255,.06);background:#0e1218;display:flex;flex-direction:column;min-height:0}" +
          ".cs-side-h{font-size:9px;font-weight:700;letter-spacing:.13em;color:#727c87;padding:10px 12px 7px}" +
          ".cs-props{padding:0 12px 10px;border-bottom:1px solid rgba(255,255,255,.06)}" +
          ".cs-prow{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}" +
          ".cs-prow.one{grid-template-columns:1fr}" +
          ".cs-pf{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:3px 7px}" +
          ".cs-pf label{font-size:8.5px;font-weight:700;color:#68717b;letter-spacing:.05em}" +
          ".cs-pf input[type=number],.cs-pf input[type=text]{flex:1;min-width:0;background:transparent;border:0;color:#e8edf2;font-size:11px;outline:none;font-variant-numeric:tabular-nums}" +
          ".cs-pf input[type=color]{width:22px;height:18px;border:0;background:transparent;padding:0;cursor:pointer}" +
          ".cs-pf select{flex:1;background:transparent;border:0;color:#e8edf2;font-size:11px;outline:none}" +
          ".cs-pf select option{background:#12161d}" +
          ".cs-swatches{display:flex;gap:5px;margin:2px 0 6px}" +
          ".cs-sw{width:20px;height:20px;border-radius:5px;border:1px solid rgba(255,255,255,.15);cursor:pointer}" +
          ".cs-props-note{font-size:10.5px;color:#68717b;line-height:1.7;padding:4px 0 6px}" +
          ".cs-layers{flex:1;overflow-y:auto;padding:2px 6px 10px;scrollbar-width:thin}" +
          ".cs-layer{display:flex;align-items:center;gap:7px;width:100%;text-align:left;background:transparent;border:0;border-radius:6px;color:#aab4c0;font-size:11px;padding:5px 8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".cs-layer:hover{background:rgba(255,255,255,.05)}" +
          ".cs-layer.sel{background:rgba(127,176,255,.13);color:#cfe1ff}" +
          ".cs-layer .ic{width:14px;text-align:center;color:#727c87;flex:0 0 auto}" +
          ".cs-card{width:100%;height:100%;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0) 45%),#11151c;border:1px solid rgba(255,255,255,.09);border-left:3px solid var(--acc,#7fb0ff);border-radius:10px;padding:12px 13px;overflow:hidden;color:#e8edf2;user-select:none}" +
          ".cs-card-top{display:flex;align-items:center;gap:7px;margin-bottom:7px}" +
          ".cs-card-tier{font-size:8px;font-weight:800;letter-spacing:.1em;color:var(--acc,#7fb0ff);border:1px solid var(--acc,#7fb0ff);border-radius:4px;padding:1px 5px;opacity:.9}" +
          ".cs-card-feat{font-size:9px;font-weight:650;letter-spacing:.07em;color:#727c87;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".cs-card-status{margin-left:auto;font-size:8px;font-weight:700;letter-spacing:.06em;color:#d9a13c;border:1px solid rgba(217,161,60,.35);border-radius:999px;padding:1px 6px;white-space:nowrap}" +
          ".cs-card-title{font-size:13px;font-weight:700;line-height:1.35;margin-bottom:8px}" +
          ".cs-card-ana{background:rgba(127,176,255,.06);border:1px solid rgba(127,176,255,.2);border-radius:8px;padding:8px 10px;margin-bottom:8px}" +
          ".cs-card-ana-h{font-size:8px;font-weight:800;letter-spacing:.12em;color:#8db8ff;margin-bottom:5px}" +
          ".cs-card-brief{font-size:11px;line-height:1.5;color:#dbe2e9}" +
          ".cs-card-sub{font-size:10px;line-height:1.5;color:#aab4c0;margin-top:5px}" +
          ".cs-card-sub b{color:#8d97a3;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}" +
          ".cs-card-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}" +
          ".cs-card-tag{font-size:8.5px;font-weight:650;color:#8db8ff;background:rgba(127,176,255,.1);border:1px solid rgba(127,176,255,.25);border-radius:999px;padding:1px 7px}" +
          ".cs-card-noana{font-size:9.5px;color:#68717b;font-style:italic;margin-bottom:8px}" +
          ".cs-card-fields{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin-top:2px}" +
          ".cs-card-k{font-size:8.5px;font-weight:700;letter-spacing:.05em;color:#68717b;text-transform:uppercase;padding-top:1px}" +
          ".cs-card-v{font-size:10.5px;color:#c3ccd6;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".cs-card-src{display:inline-block;margin-top:8px;font-size:9px;font-weight:650;color:#8db8ff;letter-spacing:.04em}" +
          ".cs-pop{position:absolute;top:40px;left:10px;z-index:60;background:#12161d;border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 16px 44px rgba(0,0,0,.5);padding:10px;min-width:230px}" +
          ".cs-pop-h{font-size:9px;font-weight:700;letter-spacing:.12em;color:#727c87;margin-bottom:8px}" +
          ".cs-pop-row{display:flex;gap:6px;margin-bottom:8px}" +
          ".cs-pop-row input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#e8edf2;font-size:11px;padding:5px 8px;outline:none}" +
          ".cs-proj-item{display:flex;align-items:center;gap:6px;padding:4px 2px;border-radius:6px}" +
          ".cs-proj-item span{flex:1;font-size:11.5px;color:#c3ccd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".cs-cm-ov{position:fixed;inset:0;background:rgba(3,5,9,.72);backdrop-filter:blur(4px);z-index:9100;display:none;align-items:center;justify-content:center;padding:24px}" +
          ".cs-cm-ov.show{display:flex}" +
          ".cs-cm{width:min(880px,95vw);height:min(600px,88vh);background:#0e1218;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 26px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}" +
          ".cs-cm-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,.07)}" +
          ".cs-cm-head b{font-size:11px;font-weight:700;letter-spacing:.12em;color:#e8edf2}" +
          ".cs-cm-x{margin-left:auto;background:transparent;border:0;color:#727c87;font-size:20px;cursor:pointer;line-height:1}" +
          ".cs-cm-x:hover{color:#eef2f6}" +
          ".cs-cm-tiers{display:flex;gap:6px;flex-wrap:wrap;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.07)}" +
          ".cs-cm-tier{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:999px;color:#98a3af;font-size:10.5px;font-weight:650;letter-spacing:.05em;padding:4px 12px;cursor:pointer}" +
          ".cs-cm-tier.active{background:rgba(127,176,255,.15);border-color:rgba(127,176,255,.4);color:#a9c8ff}" +
          ".cs-cm-body{display:flex;flex:1;min-height:0}" +
          ".cs-cm-feats{width:250px;border-right:1px solid rgba(255,255,255,.07);overflow-y:auto;padding:8px;scrollbar-width:thin}" +
          ".cs-cm-feat{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:8px;padding:7px 10px;cursor:pointer}" +
          ".cs-cm-feat:hover{background:rgba(255,255,255,.05)}" +
          ".cs-cm-feat.active{background:rgba(127,176,255,.13)}" +
          ".cs-cm-feat .n{font-size:11.5px;font-weight:600;color:#dbe2e9;line-height:1.35}" +
          ".cs-cm-feat .c{font-size:9.5px;color:#68717b;margin-top:1px}" +
          ".cs-cm-rows{flex:1;display:flex;flex-direction:column;min-width:0}" +
          ".cs-cm-search{margin:10px 12px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#e8edf2;font-size:11.5px;padding:7px 11px;outline:none}" +
          ".cs-cm-search:focus{border-color:rgba(127,176,255,.4)}" +
          ".cs-cm-list{flex:1;overflow-y:auto;padding:0 12px 12px;scrollbar-width:thin}" +
          ".cs-cm-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.045);padding:8px 6px;cursor:pointer}" +
          ".cs-cm-row:hover{background:rgba(255,255,255,.04)}" +
          ".cs-cm-row .t{flex:1;min-width:0;font-size:11.5px;color:#dbe2e9;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
          ".cs-cm-row .s{font-size:10px;color:#68717b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}" +
          ".cs-cm-row .a{flex:0 0 auto;font-size:9px;font-weight:700;color:#8db8ff}" +
          ".cs-cm-row .add{flex:0 0 auto;font-size:9.5px;font-weight:700;color:#2fd57b;opacity:0;transition:opacity .15s}" +
          ".cs-cm-row.added .add{opacity:1}" +
          ".cs-cm-note{padding:8px 16px;font-size:9.5px;color:#68717b;border-top:1px solid rgba(255,255,255,.06)}" +
          "@media(max-width:900px){.cs-side{display:none}}";
        document.head.appendChild(s);
      }
    } catch (e) { }

    // ---------- pane + nav injection ----------
    function injectPane() {
      const nav = document.querySelector('#dataStudio .studio-nav');
      const body = document.querySelector('#dataStudio .studio-body');
      if (!nav || !body || document.getElementById('pane-canvas')) return;
      const btn = document.createElement('button');
      btn.className = 'studio-nav-item'; btn.type = 'button'; btn.dataset.pane = 'canvas';
      btn.textContent = 'Canvas';
      nav.insertBefore(btn, nav.firstChild);
      const pane = document.createElement('div');
      pane.className = 'studio-pane'; pane.id = 'pane-canvas'; pane.hidden = true;
      body.insertBefore(pane, body.firstChild);
    }
    injectPane();

    // ---------- UI build ----------
    function buildUI() {
      const pane = document.getElementById('pane-canvas'); if (!pane) return;
      pane.innerHTML = '<div class="cs-root">'
        + '<div class="cs-top">'
        + '<input class="cs-name" id="csName" spellcheck="false" title="Board name" />'
        + '<button class="cs-btn" id="csProj" type="button">Projects ▾</button>'
        + '<button class="cs-btn" id="csNew" type="button">New</button>'
        + '<span class="cs-sep"></span>'
        + '<button class="cs-btn" id="csUndo" type="button" title="Undo (Ctrl+Z)">↩</button>'
        + '<button class="cs-btn" id="csRedo" type="button" title="Redo (Ctrl+Y)">↪</button>'
        + '<span class="cs-sep"></span>'
        + '<span id="csCtx" style="display:inline-flex;gap:6px;align-items:center"></span>'
        + '<span class="cs-spacer"></span>'
        + '<button class="cs-btn" id="csZoomOut" type="button">−</button>'
        + '<button class="cs-btn cs-zoom" id="csZoomPct" type="button" title="Reset to 100%">100%</button>'
        + '<button class="cs-btn" id="csZoomIn" type="button">+</button>'
        + '<button class="cs-btn" id="csFit" type="button" title="Fit content">Fit</button>'
        + '<span class="cs-sep"></span>'
        + '<button class="cs-btn" id="csExpJson" type="button" title="Download board as JSON">JSON</button>'
        + '<button class="cs-btn" id="csImpJson" type="button" title="Load a board JSON">Open</button>'
        + '<button class="cs-btn pri" id="csExpPng" type="button" title="Export the board as a PNG image">Export PNG</button>'
        + '</div>'
        + '<div class="cs-mid">'
        + '<div class="cs-toolbar">'
        + '<button class="cs-tool active" data-tool="select" type="button" title="Select / move (V)">▲<span class="k">V</span></button>'
        + '<button class="cs-tool" data-tool="pan" type="button" title="Pan (H, or hold Space)">✋<span class="k">H</span></button>'
        + '<button class="cs-tool" data-tool="text" type="button" title="Text (T)">T<span class="k">T</span></button>'
        + '<button class="cs-tool" data-tool="sticky" type="button" title="Sticky note (S)">▤<span class="k">S</span></button>'
        + '<button class="cs-tool" data-tool="rect" type="button" title="Rectangle (R)">▭<span class="k">R</span></button>'
        + '<button class="cs-tool" data-tool="ellipse" type="button" title="Ellipse (O)">◯<span class="k">O</span></button>'
        + '<button class="cs-tool" data-tool="arrow" type="button" title="Arrow (L)">↗<span class="k">L</span></button>'
        + '<button class="cs-tool" id="csImg" type="button" title="Insert image">🖼</button>'
        + '<button class="cs-tool" id="csCard" type="button" title="Import a card from the terminal (C)">✦<span class="k">C</span></button>'
        + '</div>'
        + '<div class="cs-viewport" id="csVp" tabindex="0">'
        + '<div class="cs-world" id="csWorld"></div>'
        + '<div class="cs-marquee" id="csMarq" hidden></div>'
        + '<div class="cs-empty" id="csEmpty">An infinite board for briefs, investigations and story maps.<br/><b>T</b> text · <b>S</b> sticky · <b>R</b> shape · <b>L</b> arrow · <b>✦</b> import a card with its Niyantran Analysis</div>'
        + '</div>'
        + '<div class="cs-side">'
        + '<div class="cs-side-h">PROPERTIES</div><div class="cs-props" id="csProps"></div>'
        + '<div class="cs-side-h">LAYERS</div><div class="cs-layers" id="csLayers"></div>'
        + '</div>'
        + '</div></div>'
        + '<input type="file" id="csImgFile" accept="image/*" hidden /><input type="file" id="csJsonFile" accept=".json,application/json" hidden />';
      const $ = id => pane.querySelector('#' + id);
      st.ui = { pane, vp: $('csVp'), world: $('csWorld'), marq: $('csMarq'), empty: $('csEmpty'), props: $('csProps'), layers: $('csLayers'), name: $('csName'), ctx: $('csCtx'), zoomPct: $('csZoomPct'), imgFile: $('csImgFile'), jsonFile: $('csJsonFile') };
      wireTop(); wireTools(); wirePointer(); wireKeys();
    }

    // ---------- transforms ----------
    function applyTransform() {
      st.ui.world.style.transform = 'translate(' + st.px + 'px,' + st.py + 'px) scale(' + st.z + ')';
      st.ui.vp.style.backgroundSize = (24 * st.z) + 'px ' + (24 * st.z) + 'px';
      st.ui.vp.style.backgroundPosition = st.px + 'px ' + st.py + 'px';
      st.ui.zoomPct.textContent = Math.round(st.z * 100) + '%';
    }
    function toWorld(clientX, clientY) {
      const r = st.ui.vp.getBoundingClientRect();
      return { x: (clientX - r.left - st.px) / st.z, y: (clientY - r.top - st.py) / st.z };
    }
    function zoomAt(clientX, clientY, factor) {
      const r = st.ui.vp.getBoundingClientRect();
      const mx = clientX - r.left, my = clientY - r.top;
      const wx = (mx - st.px) / st.z, wy = (my - st.py) / st.z;
      st.z = Math.min(4, Math.max(0.1, st.z * factor));
      st.px = mx - wx * st.z; st.py = my - wy * st.z;
      applyTransform();
    }
    function fitContent() {
      const els = st.doc.elements; if (!els.length) { st.z = 1; st.px = 80; st.py = 60; applyTransform(); return; }
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      els.forEach(el => { const c = elCorners(el); c.forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }); });
      const r = st.ui.vp.getBoundingClientRect(), pad = 60;
      st.z = Math.min(2, Math.max(0.1, Math.min((r.width - pad * 2) / Math.max(40, x2 - x1), (r.height - pad * 2) / Math.max(40, y2 - y1))));
      st.px = (r.width - (x2 - x1) * st.z) / 2 - x1 * st.z;
      st.py = (r.height - (y2 - y1) * st.z) / 2 - y1 * st.z;
      applyTransform();
    }
    function elCorners(el) {
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2, a = (el.rot || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
      return [[el.x, el.y], [el.x + el.w, el.y], [el.x + el.w, el.y + el.h], [el.x, el.y + el.h]].map(p => {
        const dx = p[0] - cx, dy = p[1] - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
      });
    }

    // ---------- element rendering ----------
    function elInnerHTML(el) {
      const p = el.props || {};
      if (el.type === 'rect') return '<div class="cs-shape" style="background:' + (p.fill || '#1a2230') + ';border:' + (p.strokeW != null ? p.strokeW : 1) + 'px solid ' + (p.stroke || '#3d4a5c') + ';border-radius:' + (p.radius != null ? p.radius : 8) + 'px"></div>';
      if (el.type === 'ellipse') return '<div class="cs-shape" style="background:' + (p.fill || '#1a2230') + ';border:' + (p.strokeW != null ? p.strokeW : 1) + 'px solid ' + (p.stroke || '#3d4a5c') + ';border-radius:50%"></div>';
      if (el.type === 'arrow') return arrowSVG(el);
      if (el.type === 'text') return '<div class="cs-text" style="font-size:' + (p.size || 18) + 'px;color:' + (p.color || '#e8edf2') + ';font-weight:' + (p.weight || 500) + ';text-align:' + (p.align || 'left') + '">' + escapeHtml(p.text || '') + '</div>';
      if (el.type === 'sticky') return '<div class="cs-sticky" style="background:' + (p.color || '#f5d76e') + '">' + escapeHtml(p.text || '') + '</div>';
      if (el.type === 'image') return '<img class="cs-img" draggable="false" src="' + (p.src || '') + '" alt="" />';
      if (el.type === 'card') return cardHTML(p);
      return '';
    }
    function arrowSVG(el) {
      const p = el.props || {}, w = Math.max(2, el.w), h = Math.max(2, el.h), sw = p.strokeW || 2, col = p.stroke || '#8fa3b8';
      const x1 = 0, y1 = p.flip ? h : 0, x2 = w, y2 = p.flip ? 0 : h;
      const ang = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(8, sw * 4);
      const hx1 = x2 - hl * Math.cos(ang - 0.44), hy1 = y2 - hl * Math.sin(ang - 0.44);
      const hx2 = x2 - hl * Math.cos(ang + 0.44), hy2 = y2 - hl * Math.sin(ang + 0.44);
      let head = '';
      if (p.head !== false) head = '<polygon points="' + x2 + ',' + y2 + ' ' + hx1 + ',' + hy1 + ' ' + hx2 + ',' + hy2 + '" fill="' + col + '"/>';
      return '<svg width="100%" height="100%" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="overflow:visible;display:block"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round"/>' + head + '</svg>';
    }
    function cardHTML(p) {
      const acc = p.accent || TIER_COLORS[p.tier] || '#7fb0ff';
      let h = '<div class="cs-card" style="--acc:' + acc + '">';
      h += '<div class="cs-card-top"><span class="cs-card-tier">' + escapeHtml(p.tierShort || 'NIY') + '</span><span class="cs-card-feat">' + escapeHtml(p.feature || '') + '</span>' + (p.status ? '<span class="cs-card-status">' + escapeHtml(String(p.status).slice(0, 26)) + '</span>' : '') + '</div>';
      h += '<div class="cs-card-title">' + escapeHtml(p.title || 'Record') + '</div>';
      const a = p.analysis;
      if (a && (a.brief || a.why || a.watch)) {
        h += '<div class="cs-card-ana"><div class="cs-card-ana-h">✦ NIYANTRAN ANALYSIS</div>';
        if (a.brief) h += '<div class="cs-card-brief">' + escapeHtml(a.brief) + '</div>';
        if (a.why) h += '<div class="cs-card-sub"><b>Why it matters</b>' + escapeHtml(a.why) + '</div>';
        if (a.watch) h += '<div class="cs-card-sub"><b>Watch</b>' + escapeHtml(a.watch) + '</div>';
        if (a.tags && a.tags.length) h += '<div class="cs-card-tags">' + a.tags.map(t => '<span class="cs-card-tag">' + escapeHtml(t) + '</span>').join('') + '</div>';
        h += '</div>';
      } else {
        h += '<div class="cs-card-noana">No Niyantran analysis for this record yet — raw fields below.</div>';
      }
      if (p.fields && p.fields.length) {
        h += '<div class="cs-card-fields">' + p.fields.map(f => '<div class="cs-card-k">' + escapeHtml(String(f[0]).replace(/_/g, ' ')) + '</div><div class="cs-card-v" title="' + escapeHtml(String(f[1])) + '">' + escapeHtml(String(f[1])) + '</div>').join('') + '</div>';
      }
      if (p.url) h += '<span class="cs-card-src">⤓ source: ' + escapeHtml(String(p.url).replace(/^https?:\/\//, '').slice(0, 42)) + '…</span>';
      return h + '</div>';
    }
    function renderEl(el) {
      const d = document.createElement('div');
      d.className = 'cs-el'; d.dataset.id = el.id;
      d.innerHTML = '<div class="cs-content">' + elInnerHTML(el) + '</div>';
      styleEl(d, el);
      return d;
    }
    function styleEl(d, el) {
      d.style.left = el.x + 'px'; d.style.top = el.y + 'px';
      d.style.width = Math.max(2, el.w) + 'px'; d.style.height = Math.max(2, el.h) + 'px';
      d.style.transform = 'rotate(' + (el.rot || 0) + 'deg)';
      d.style.opacity = el.opacity != null ? el.opacity : 1;
    }
    function renderAllEls() {
      const w = st.ui.world; w.innerHTML = '';
      st.doc.elements.forEach(el => w.appendChild(renderEl(el)));
      renderSel();
      st.ui.empty.style.display = st.doc.elements.length ? 'none' : '';
    }
    function domFor(id) { return st.ui.world.querySelector('.cs-el[data-id="' + id + '"]'); }
    function updateElDom(el) {
      const d = domFor(el.id); if (!d) return;
      styleEl(d, el);
      if (el.type === 'arrow') d.querySelector('.cs-content').innerHTML = arrowSVG(el);
    }
    function rerenderEl(el) { const d = domFor(el.id); if (d) { d.querySelector('.cs-content').innerHTML = elInnerHTML(el); styleEl(d, el); } }
    function renderSel() {
      st.ui.world.querySelectorAll('.cs-el').forEach(d => {
        const isSel = st.sel.includes(d.dataset.id);
        d.classList.toggle('sel', isSel);
        d.querySelectorAll('.cs-h,.cs-rotline').forEach(h => h.remove());
        if (isSel && st.sel.length === 1) {
          ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot'].forEach(hn => {
            const h = document.createElement('div'); h.className = 'cs-h'; h.dataset.h = hn; d.appendChild(h);
          });
          const rl = document.createElement('div'); rl.className = 'cs-rotline'; d.appendChild(rl);
        }
      });
    }
    function setSel(ids) { st.sel = ids; renderSel(); refreshUI(); }

    // ---------- toolbar / topbar ----------
    function setTool(t) {
      st.tool = t;
      st.ui.pane.querySelectorAll('.cs-tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
      st.ui.vp.classList.toggle('pan', t === 'pan');
      st.ui.vp.classList.toggle('draw', ['text', 'sticky', 'rect', 'ellipse', 'arrow'].includes(t));
    }
    function wireTools() {
      st.ui.pane.querySelectorAll('.cs-tool[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
      st.ui.pane.querySelector('#csImg').addEventListener('click', () => st.ui.imgFile.click());
      st.ui.pane.querySelector('#csCard').addEventListener('click', openCardModal);
      st.ui.imgFile.addEventListener('change', e => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          const img = new Image();
          img.onload = () => {
            const sc = Math.min(1, 420 / img.width, 420 / img.height);
            addEl('image', { src: rd.result }, { w: Math.round(img.width * sc), h: Math.round(img.height * sc) });
          };
          img.src = rd.result;
        };
        rd.readAsDataURL(f);
        e.target.value = '';
      });
    }
    function wireTop() {
      const q = id => st.ui.pane.querySelector('#' + id);
      st.ui.name.addEventListener('change', () => { st.doc.name = st.ui.name.value.trim() || 'Untitled board'; saveSoon(); });
      q('csUndo').addEventListener('click', undo);
      q('csRedo').addEventListener('click', redoFn);
      q('csZoomIn').addEventListener('click', () => { const r = st.ui.vp.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); });
      q('csZoomOut').addEventListener('click', () => { const r = st.ui.vp.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2); });
      q('csZoomPct').addEventListener('click', () => { st.z = 1; applyTransform(); });
      q('csFit').addEventListener('click', fitContent);
      q('csNew').addEventListener('click', () => { pushHist(); st.doc.elements = []; st.doc.name = 'Untitled board'; st.ui.name.value = st.doc.name; setSel([]); renderAllEls(); saveSoon(); });
      q('csExpJson').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(st.doc, null, 1)], { type: 'application/json' }));
        a.download = (st.doc.name || 'board').replace(/[^\w\- ]+/g, '') + '.niyboard.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      });
      q('csImpJson').addEventListener('click', () => st.ui.jsonFile.click());
      st.ui.jsonFile.addEventListener('change', e => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const d = JSON.parse(rd.result);
            if (!d || !Array.isArray(d.elements)) throw new Error('bad');
            pushHist(); st.doc = { name: d.name || 'Imported board', seq: d.seq || (d.elements.length + 1000), elements: d.elements };
            st.ui.name.value = st.doc.name; setSel([]); renderAllEls(); fitContent(); saveSoon(); toast('Board loaded');
          } catch (err) { toast('Not a valid board JSON'); }
        };
        rd.readAsText(f); e.target.value = '';
      });
      q('csExpPng').addEventListener('click', exportPNG);
      q('csProj').addEventListener('click', toggleProjPop);
    }
    function toggleProjPop() {
      let pop = st.ui.pane.querySelector('.cs-pop');
      if (pop) { pop.remove(); return; }
      pop = document.createElement('div'); pop.className = 'cs-pop';
      const projs = loadProjects();
      pop.innerHTML = '<div class="cs-pop-h">SAVE THIS BOARD</div>'
        + '<div class="cs-pop-row"><input id="csProjName" placeholder="Project name…" value="' + escapeHtml(st.doc.name === 'Untitled board' ? '' : st.doc.name) + '"/><button class="cs-btn pri" id="csProjSave" type="button">Save</button></div>'
        + '<div class="cs-pop-h">SAVED PROJECTS</div>'
        + (Object.keys(projs).length ? Object.keys(projs).sort().map(n => '<div class="cs-proj-item"><span>' + escapeHtml(n) + '</span><button class="cs-btn" data-load="' + escapeHtml(n) + '" type="button">Open</button><button class="cs-btn danger" data-del="' + escapeHtml(n) + '" type="button">✕</button></div>').join('') : '<div class="cs-props-note">Nothing saved yet.</div>');
      st.ui.pane.querySelector('.cs-root').appendChild(pop);
      pop.querySelector('#csProjSave').addEventListener('click', () => {
        const n = pop.querySelector('#csProjName').value.trim(); if (!n) return;
        const all = loadProjects(); st.doc.name = n; all[n] = st.doc; st.ui.name.value = n;
        try { localStorage.setItem(LSPROJ, JSON.stringify(all)); } catch (e) { }
        saveSoon(); pop.remove(); toast('Saved "' + n + '"');
      });
      pop.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => {
        const d = loadProjects()[b.dataset.load]; if (!d) return;
        pushHist(); st.doc = JSON.parse(JSON.stringify(d)); st.ui.name.value = st.doc.name;
        setSel([]); renderAllEls(); fitContent(); saveSoon(); pop.remove();
      }));
      pop.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        const all = loadProjects(); delete all[b.dataset.del];
        try { localStorage.setItem(LSPROJ, JSON.stringify(all)); } catch (e) { }
        pop.remove(); toggleProjPop();
      }));
    }
    function loadProjects() { try { return JSON.parse(localStorage.getItem(LSPROJ) || '{}') || {}; } catch (e) { return {}; } }

    // ---------- element ops ----------
    function addEl(type, props, geo) {
      pushHist();
      const r = st.ui.vp.getBoundingClientRect();
      const c = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      const defs = { text: [220, 44], sticky: [170, 170], rect: [180, 110], ellipse: [130, 130], arrow: [170, 100], image: [320, 240], card: [340, 300] };
      const d = defs[type] || [160, 100];
      const el = {
        id: uid(), type: type,
        x: Math.round((geo && geo.x != null) ? geo.x : c.x - ((geo && geo.w) || d[0]) / 2),
        y: Math.round((geo && geo.y != null) ? geo.y : c.y - ((geo && geo.h) || d[1]) / 2),
        w: (geo && geo.w) || d[0], h: (geo && geo.h) || d[1], rot: 0, opacity: 1, props: props || {},
      };
      st.doc.elements.push(el);
      st.ui.world.appendChild(renderEl(el));
      st.ui.empty.style.display = 'none';
      setSel([el.id]); saveSoon();
      return el;
    }
    function delSel() {
      if (!st.sel.length) return;
      pushHist();
      st.doc.elements = st.doc.elements.filter(e => !st.sel.includes(e.id));
      setSel([]); renderAllEls(); saveSoon();
    }
    function dupSel() {
      const els = selEls(); if (!els.length) return;
      pushHist();
      const ids = [];
      els.forEach(el => {
        const c = JSON.parse(JSON.stringify(el)); c.id = uid(); c.x += 24; c.y += 24;
        st.doc.elements.push(c); ids.push(c.id);
      });
      renderAllEls(); setSel(ids); saveSoon();
    }
    function zMove(front) {
      const els = selEls(); if (!els.length) return;
      pushHist();
      st.doc.elements = st.doc.elements.filter(e => !st.sel.includes(e.id));
      if (front) st.doc.elements = st.doc.elements.concat(els); else st.doc.elements = els.concat(st.doc.elements);
      renderAllEls(); refreshUI(); saveSoon();
    }
    function alignSel(mode) {
      const els = selEls(); if (els.length < 2) return;
      pushHist();
      const x1 = Math.min.apply(null, els.map(e => e.x)), x2 = Math.max.apply(null, els.map(e => e.x + e.w));
      const y1 = Math.min.apply(null, els.map(e => e.y)), y2 = Math.max.apply(null, els.map(e => e.y + e.h));
      els.forEach(e => {
        if (mode === 'l') e.x = x1; if (mode === 'r') e.x = x2 - e.w; if (mode === 'cx') e.x = Math.round((x1 + x2) / 2 - e.w / 2);
        if (mode === 't') e.y = y1; if (mode === 'b') e.y = y2 - e.h; if (mode === 'cy') e.y = Math.round((y1 + y2) / 2 - e.h / 2);
        updateElDom(e);
      });
      refreshUI(); saveSoon();
    }

    // ---------- pointer interactions ----------
    function wirePointer() {
      const vp = st.ui.vp;
      vp.addEventListener('wheel', e => {
        if (!canvasActive()) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.09 : 1 / 1.09);
        else { st.px -= e.deltaX; st.py -= e.deltaY; applyTransform(); }
      }, { passive: false });

      vp.addEventListener('pointerdown', e => {
        if (st.editing) return;
        vp.focus();
        const pan = e.button === 1 || st.space || st.tool === 'pan';
        if (pan) {
          st.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: st.px, py: st.py };
          vp.classList.add('panning'); vp.setPointerCapture(e.pointerId); e.preventDefault(); return;
        }
        if (e.button !== 0) return;
        const w = toWorld(e.clientX, e.clientY);
        if (['text', 'sticky', 'rect', 'ellipse', 'arrow'].includes(st.tool)) {
          st.drag = { kind: 'draw', sx: w.x, sy: w.y, el: null };
          vp.setPointerCapture(e.pointerId); e.preventDefault(); return;
        }
        const hDiv = e.target.closest('.cs-h');
        const elDiv = e.target.closest('.cs-el');
        if (hDiv && elDiv && st.sel.length === 1) {
          const el = byId(st.sel[0]);
          const pre = snap();
          if (hDiv.dataset.h === 'rot') {
            const r = elDiv.getBoundingClientRect();
            st.drag = { kind: 'rotate', el: el, cx: r.left + r.width / 2, cy: r.top + r.height / 2, pre: pre };
          } else {
            st.drag = { kind: 'resize', el: el, h: hDiv.dataset.h, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, rot: el.rot || 0, pre: pre };
          }
          vp.setPointerCapture(e.pointerId); e.preventDefault(); return;
        }
        if (elDiv) {
          const id = elDiv.dataset.id;
          if (e.shiftKey) { setSel(st.sel.includes(id) ? st.sel.filter(x => x !== id) : st.sel.concat([id])); }
          else if (!st.sel.includes(id)) setSel([id]);
          const moved = selEls().map(el => ({ el: el, x: el.x, y: el.y }));
          st.drag = { kind: 'move', sx: e.clientX, sy: e.clientY, items: moved, pre: snap(), did: false };
          vp.setPointerCapture(e.pointerId); e.preventDefault(); return;
        }
        if (!e.shiftKey) setSel([]);
        st.drag = { kind: 'marquee', sx: e.clientX, sy: e.clientY, add: e.shiftKey ? st.sel.slice() : [] };
        vp.setPointerCapture(e.pointerId);
      });

      vp.addEventListener('pointermove', e => {
        const d = st.drag; if (!d) return;
        if (d.kind === 'pan') { st.px = d.px + (e.clientX - d.sx); st.py = d.py + (e.clientY - d.sy); applyTransform(); return; }
        if (d.kind === 'move') {
          const dx = (e.clientX - d.sx) / st.z, dy = (e.clientY - d.sy) / st.z;
          if (!d.did && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) d.did = true;
          d.items.forEach(it => { it.el.x = Math.round(it.x + dx); it.el.y = Math.round(it.y + dy); updateElDom(it.el); });
          refreshProps(); return;
        }
        if (d.kind === 'resize') {
          const rdx = (e.clientX - d.sx) / st.z, rdy = (e.clientY - d.sy) / st.z;
          const a = -(d.rot || 0) * Math.PI / 180;
          const dx = rdx * Math.cos(a) - rdy * Math.sin(a), dy = rdx * Math.sin(a) + rdy * Math.cos(a);
          const el = d.el; let x = d.ox, y = d.oy, w = d.ow, h = d.oh, hn = d.h;
          if (hn.includes('e')) w = d.ow + dx;
          if (hn.includes('s')) h = d.oh + dy;
          if (hn.includes('w')) { w = d.ow - dx; x = d.ox + dx; }
          if (hn.includes('n')) { h = d.oh - dy; y = d.oy + dy; }
          if (w < 12) { if (hn.includes('w')) x -= 12 - w; w = 12; }
          if (h < 12) { if (hn.includes('n')) y -= 12 - h; h = 12; }
          el.x = Math.round(x); el.y = Math.round(y); el.w = Math.round(w); el.h = Math.round(h);
          updateElDom(el); refreshProps(); return;
        }
        if (d.kind === 'rotate') {
          let deg = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI + 90;
          if (e.shiftKey) deg = Math.round(deg / 15) * 15;
          d.el.rot = Math.round(((deg % 360) + 360) % 360);
          updateElDom(d.el); refreshProps(); return;
        }
        if (d.kind === 'draw') {
          const w = toWorld(e.clientX, e.clientY);
          if (!d.el) {
            d.el = { id: uid(), type: st.tool, x: d.sx, y: d.sy, w: 1, h: 1, rot: 0, opacity: 1, props: defProps(st.tool) };
            if (st.tool === 'arrow') d.el.props.flip = false;
            st.doc.elements.push(d.el); st.ui.world.appendChild(renderEl(d.el)); st.ui.empty.style.display = 'none';
          }
          const el = d.el;
          if (el.type === 'arrow') {
            el.x = Math.min(d.sx, w.x); el.y = Math.min(d.sy, w.y);
            el.w = Math.max(2, Math.abs(w.x - d.sx)); el.h = Math.max(2, Math.abs(w.y - d.sy));
            el.props.flip = (w.x - d.sx) * (w.y - d.sy) < 0;
          } else {
            el.x = Math.round(Math.min(d.sx, w.x)); el.y = Math.round(Math.min(d.sy, w.y));
            el.w = Math.round(Math.abs(w.x - d.sx)); el.h = Math.round(Math.abs(w.y - d.sy));
          }
          updateElDom(el); return;
        }
        if (d.kind === 'marquee') {
          const r = vp.getBoundingClientRect(), m = st.ui.marq;
          const x1 = Math.min(d.sx, e.clientX) - r.left, y1 = Math.min(d.sy, e.clientY) - r.top;
          m.hidden = false;
          m.style.left = x1 + 'px'; m.style.top = y1 + 'px';
          m.style.width = Math.abs(e.clientX - d.sx) + 'px'; m.style.height = Math.abs(e.clientY - d.sy) + 'px';
          const a = toWorld(Math.min(d.sx, e.clientX), Math.min(d.sy, e.clientY));
          const b = toWorld(Math.max(d.sx, e.clientX), Math.max(d.sy, e.clientY));
          const hit = st.doc.elements.filter(el => el.x < b.x && el.x + el.w > a.x && el.y < b.y && el.y + el.h > a.y).map(el => el.id);
          setSel(Array.from(new Set(d.add.concat(hit))));
          return;
        }
      });

      function endDrag(e) {
        const d = st.drag; if (!d) return;
        st.drag = null;
        vp.classList.remove('panning');
        st.ui.marq.hidden = true;
        if (d.kind === 'move' && d.did) { st.hist.push(d.pre); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0; saveSoon(); }
        if (d.kind === 'resize' || d.kind === 'rotate') { st.hist.push(d.pre); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0; saveSoon(); }
        if (d.kind === 'draw') {
          if (d.el) {
            pushHistBeforeDraw(d);
            if (d.el.w < 8 && d.el.h < 8) {
              const defs = { text: [220, 44], sticky: [170, 170], rect: [180, 110], ellipse: [130, 130], arrow: [170, 100] };
              const dd = defs[d.el.type] || [160, 100];
              d.el.w = dd[0]; d.el.h = dd[1]; updateElDom(d.el);
            }
            setSel([d.el.id]); saveSoon();
            if (d.el.type === 'text' || d.el.type === 'sticky') startEdit(d.el.id, true);
          }
          setTool('select');
        }
        refreshUI();
      }
      function pushHistBeforeDraw(d) {
        // history entry = elements array WITHOUT the drawn element
        const without = st.doc.elements.filter(x => x.id !== d.el.id);
        st.hist.push(JSON.stringify(without)); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0;
      }
      vp.addEventListener('pointerup', endDrag);
      vp.addEventListener('pointercancel', endDrag);

      vp.addEventListener('dblclick', e => {
        const elDiv = e.target.closest('.cs-el'); if (!elDiv) return;
        const el = byId(elDiv.dataset.id); if (!el) return;
        if (el.type === 'text' || el.type === 'sticky') startEdit(el.id, false);
      });
    }
    function defProps(t) {
      if (t === 'text') return { text: 'Text', size: 18, color: '#e8edf2', weight: 500, align: 'left' };
      if (t === 'sticky') return { text: '', color: '#f5d76e' };
      if (t === 'rect') return { fill: '#1a2230', stroke: '#3d4a5c', strokeW: 1, radius: 8 };
      if (t === 'ellipse') return { fill: '#1a2230', stroke: '#3d4a5c', strokeW: 1 };
      if (t === 'arrow') return { stroke: '#8fa3b8', strokeW: 2, head: true };
      return {};
    }
    function startEdit(id, selectAll) {
      const el = byId(id), d = domFor(id); if (!el || !d) return;
      const box = d.querySelector('.cs-text,.cs-sticky'); if (!box) return;
      const pre = snap();
      st.editing = id;
      box.contentEditable = 'true'; box.focus();
      if (selectAll) { const r = document.createRange(); r.selectNodeContents(box); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      const commit = () => {
        box.contentEditable = 'false'; st.editing = null;
        const t = box.innerText.replace(/\n+$/, '');
        if (t !== (el.props.text || '')) {
          st.hist.push(pre); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0;
          el.props.text = t; saveSoon();
        }
        rerenderEl(el); renderSel(); refreshUI();
        box.removeEventListener('blur', commit);
      };
      box.addEventListener('blur', commit);
    }

    // ---------- keyboard ----------
    function wireKeys() {
      document.addEventListener('keydown', e => {
        if (!canvasActive() || st.editing) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
        if (k === ' ') { st.space = true; st.ui.vp.classList.add('pan'); e.preventDefault(); return; }
        if (mod && k === 'z' && !e.shiftKey) { undo(); e.preventDefault(); return; }
        if ((mod && k === 'y') || (mod && e.shiftKey && k === 'z')) { redoFn(); e.preventDefault(); return; }
        if (mod && k === 'd') { dupSel(); e.preventDefault(); return; }
        if (mod && k === 'a') { setSel(st.doc.elements.map(x => x.id)); e.preventDefault(); return; }
        if (mod && k === 'c') { if (st.sel.length) st.clip = JSON.stringify(selEls()); e.preventDefault(); return; }
        if (mod && k === 'v') {
          if (st.clip) {
            pushHist();
            const arr = JSON.parse(st.clip), ids = [];
            arr.forEach(el => { el.id = uid(); el.x += 28; el.y += 28; st.doc.elements.push(el); ids.push(el.id); });
            renderAllEls(); setSel(ids); saveSoon();
          }
          e.preventDefault(); return;
        }
        if (k === 'delete' || k === 'backspace') { delSel(); e.preventDefault(); return; }
        if (k === 'escape') { setSel([]); setTool('select'); closeCardModal(); return; }
        if (k.startsWith('arrow')) {
          const els = selEls(); if (!els.length) return;
          const step = e.shiftKey ? 10 : 1;
          pushHist();
          els.forEach(el => {
            if (k === 'arrowleft') el.x -= step; if (k === 'arrowright') el.x += step;
            if (k === 'arrowup') el.y -= step; if (k === 'arrowdown') el.y += step;
            updateElDom(el);
          });
          refreshProps(); saveSoon(); e.preventDefault(); return;
        }
        if (!mod) {
          if (k === 'v') setTool('select'); if (k === 'h') setTool('pan');
          if (k === 't') setTool('text'); if (k === 's') setTool('sticky');
          if (k === 'r') setTool('rect'); if (k === 'o') setTool('ellipse');
          if (k === 'l') setTool('arrow'); if (k === 'c') openCardModal();
        }
      });
      document.addEventListener('keyup', e => {
        if (e.key === ' ') { st.space = false; if (st.tool !== 'pan') st.ui.vp.classList.remove('pan'); }
      });
    }

    // ---------- side panel ----------
    function refreshUI() { refreshProps(); refreshLayers(); refreshCtx(); }
    function refreshCtx() {
      const c = st.ui.ctx; if (!c) return;
      const n = st.sel.length;
      if (!n) { c.innerHTML = ''; return; }
      let h = '<button class="cs-btn" data-a="front" title="Bring to front">⬆</button><button class="cs-btn" data-a="back" title="Send to back">⬇</button><button class="cs-btn" data-a="dup" title="Duplicate (Ctrl+D)">⧉</button><button class="cs-btn danger" data-a="del" title="Delete">🗑</button>';
      if (n > 1) h += '<span class="cs-sep"></span><button class="cs-btn" data-a="al" title="Align left">⇤</button><button class="cs-btn" data-a="acx" title="Align centers">⇹</button><button class="cs-btn" data-a="ar" title="Align right">⇥</button><button class="cs-btn" data-a="at" title="Align top">⤒</button><button class="cs-btn" data-a="acy" title="Align middles">⇳</button><button class="cs-btn" data-a="ab" title="Align bottom">⤓</button>';
      c.innerHTML = h;
      c.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'front') zMove(true); if (a === 'back') zMove(false);
        if (a === 'dup') dupSel(); if (a === 'del') delSel();
        if (a === 'al') alignSel('l'); if (a === 'ar') alignSel('r'); if (a === 'acx') alignSel('cx');
        if (a === 'at') alignSel('t'); if (a === 'ab') alignSel('b'); if (a === 'acy') alignSel('cy');
      }));
    }
    function pf(label, inner) { return '<div class="cs-pf"><label>' + label + '</label>' + inner + '</div>'; }
    function refreshProps() {
      const box = st.ui.props; if (!box) return;
      const els = selEls();
      if (!els.length) {
        box.innerHTML = '<div class="cs-props-note">' + st.doc.elements.length + ' element' + (st.doc.elements.length === 1 ? '' : 's') + ' on this board.<br/>Scroll to pan · Ctrl+scroll to zoom.<br/>Double-click text to edit it.</div>';
        return;
      }
      if (els.length > 1) {
        box.innerHTML = '<div class="cs-props-note">' + els.length + ' elements selected.<br/>Use the align tools in the top bar.</div>';
        return;
      }
      const el = els[0], p = el.props || {};
      let h = '<div class="cs-prow">' + pf('X', '<input type="number" data-p="x" value="' + Math.round(el.x) + '"/>') + pf('Y', '<input type="number" data-p="y" value="' + Math.round(el.y) + '"/>') + '</div>';
      h += '<div class="cs-prow">' + pf('W', '<input type="number" data-p="w" value="' + Math.round(el.w) + '"/>') + pf('H', '<input type="number" data-p="h" value="' + Math.round(el.h) + '"/>') + '</div>';
      h += '<div class="cs-prow">' + pf('ROT', '<input type="number" data-p="rot" value="' + (el.rot || 0) + '"/>') + pf('OP %', '<input type="number" min="0" max="100" data-p="op" value="' + Math.round((el.opacity != null ? el.opacity : 1) * 100) + '"/>') + '</div>';
      if (el.type === 'rect' || el.type === 'ellipse') {
        h += '<div class="cs-prow">' + pf('FILL', '<input type="color" data-k="fill" value="' + (p.fill || '#1a2230') + '"/>') + pf('LINE', '<input type="color" data-k="stroke" value="' + (p.stroke || '#3d4a5c') + '"/>') + '</div>';
        h += '<div class="cs-prow">' + pf('LN W', '<input type="number" min="0" data-k="strokeW" value="' + (p.strokeW != null ? p.strokeW : 1) + '"/>') + (el.type === 'rect' ? pf('RAD', '<input type="number" min="0" data-k="radius" value="' + (p.radius != null ? p.radius : 8) + '"/>') : '') + '</div>';
      }
      if (el.type === 'arrow') {
        h += '<div class="cs-prow">' + pf('LINE', '<input type="color" data-k="stroke" value="' + (p.stroke || '#8fa3b8') + '"/>') + pf('LN W', '<input type="number" min="1" data-k="strokeW" value="' + (p.strokeW || 2) + '"/>') + '</div>';
        h += '<div class="cs-prow one">' + pf('HEAD', '<select data-k="head"><option value="1"' + (p.head !== false ? ' selected' : '') + '>Arrowhead</option><option value="0"' + (p.head === false ? ' selected' : '') + '>Plain line</option></select>') + '</div>';
      }
      if (el.type === 'text') {
        h += '<div class="cs-prow">' + pf('SIZE', '<input type="number" min="8" data-k="size" value="' + (p.size || 18) + '"/>') + pf('COLOR', '<input type="color" data-k="color" value="' + (p.color || '#e8edf2') + '"/>') + '</div>';
        h += '<div class="cs-prow">' + pf('WGT', '<select data-k="weight"><option value="400"' + (String(p.weight) === '400' ? ' selected' : '') + '>Regular</option><option value="500"' + (!p.weight || String(p.weight) === '500' ? ' selected' : '') + '>Medium</option><option value="700"' + (String(p.weight) === '700' ? ' selected' : '') + '>Bold</option></select>') + pf('ALGN', '<select data-k="align"><option value="left"' + ((p.align || 'left') === 'left' ? ' selected' : '') + '>Left</option><option value="center"' + (p.align === 'center' ? ' selected' : '') + '>Center</option><option value="right"' + (p.align === 'right' ? ' selected' : '') + '>Right</option></select>') + '</div>';
      }
      if (el.type === 'sticky') {
        h += '<div class="cs-swatches">' + ['#f5d76e', '#ff9ff3', '#7bed9f', '#74b9ff', '#fab1a0', '#dfe6e9'].map(c => '<button class="cs-sw" data-sw="' + c + '" style="background:' + c + '" type="button"></button>').join('') + '</div>';
      }
      if (el.type === 'card') {
        h += '<div class="cs-prow one">' + pf('ACCENT', '<input type="color" data-k="accent" value="' + (p.accent || TIER_COLORS[p.tier] || '#7fb0ff') + '"/>') + '</div>';
        h += '<div class="cs-props-note">' + escapeHtml((p.tierShort || '') + ' · ' + (p.feature || '')) + '</div>';
      }
      box.innerHTML = h;
      box.querySelectorAll('[data-p]').forEach(inp => {
        inp.addEventListener('focus', () => { inp._pre = snap(); });
        inp.addEventListener('input', () => {
          const v = parseFloat(inp.value); if (!isFinite(v)) return;
          if (inp._pre && !inp._pushed) { st.hist.push(inp._pre); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0; inp._pushed = true; }
          const key = inp.dataset.p;
          if (key === 'op') el.opacity = Math.min(1, Math.max(0, v / 100));
          else el[key] = v;
          updateElDom(el); saveSoon();
        });
        inp.addEventListener('blur', () => { inp._pushed = false; });
      });
      box.querySelectorAll('[data-k]').forEach(inp => {
        const apply = () => {
          if (!inp._pushed) { st.hist.push(inp._pre || snap()); if (st.hist.length > 60) st.hist.shift(); st.redoS.length = 0; inp._pushed = true; }
          let v = inp.value;
          if (inp.type === 'number') v = parseFloat(v) || 0;
          if (inp.dataset.k === 'head') v = inp.value === '1';
          if (inp.dataset.k === 'weight') v = parseInt(inp.value, 10);
          el.props[inp.dataset.k] = v;
          rerenderEl(el); renderSel(); saveSoon();
        };
        inp.addEventListener('focus', () => { inp._pre = snap(); });
        inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', apply);
        inp.addEventListener('blur', () => { inp._pushed = false; });
      });
      box.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => {
        pushHist(); el.props.color = b.dataset.sw; rerenderEl(el); renderSel(); saveSoon();
      }));
    }
    function refreshLayers() {
      const box = st.ui.layers; if (!box) return;
      const icons = { text: 'T', sticky: '▤', rect: '▭', ellipse: '◯', arrow: '↗', image: '🖼', card: '✦' };
      box.innerHTML = st.doc.elements.slice().reverse().map(el => {
        const p = el.props || {};
        const label = el.type === 'card' ? (p.title || 'Card') : (el.type === 'text' || el.type === 'sticky') ? ((p.text || '').split('\n')[0] || el.type) : el.type;
        return '<button class="cs-layer' + (st.sel.includes(el.id) ? ' sel' : '') + '" data-id="' + el.id + '" type="button"><span class="ic">' + (icons[el.type] || '·') + '</span>' + escapeHtml(String(label).slice(0, 30)) + '</button>';
      }).join('') || '<div class="cs-props-note">Empty board.</div>';
      box.querySelectorAll('.cs-layer').forEach(b => b.addEventListener('click', e => {
        const id = b.dataset.id;
        if (e.shiftKey) setSel(st.sel.includes(id) ? st.sel.filter(x => x !== id) : st.sel.concat([id]));
        else setSel([id]);
      }));
    }

    // ---------- card import ----------
    function analysisFor(csv, row, idx) {
      try {
        if (typeof EMBEDDED_JSON_DATA === 'undefined') return null;
        // Legacy bag-name alias: bills predate the <csv>_analysis.json convention.
        const ALIAS = { 'national_bill_tracker.csv': 'national_bill_analysis.json' };
        const bag = EMBEDDED_JSON_DATA[ALIAS[csv] || (csv.replace(/\.csv$/i, '') + '_analysis.json')] || {};
        const a = (row.id != null && String(row.id).trim() !== '' && (bag[String(row.id)] || bag[row.id])) || bag[String(idx)] || null;
        if (!a) return null;
        const why = a.why_it_matters || (Array.isArray(a.possible_effects) ? a.possible_effects.join(' ') : a.possible_effects) || '';
        let watch = Array.isArray(a.watch_for) ? a.watch_for.join(' ') : (a.watch_for || '');
        if (!watch && Array.isArray(a.key_changes) && a.key_changes.length) watch = 'Key changes: ' + a.key_changes.slice(0, 2).map(String).join(' · ');
        const tags = (Array.isArray(a.tags) ? a.tags : (Array.isArray(a.sectors) ? a.sectors : [])).slice(0, 6).map(String);
        if (a.passage_probability && a.passage_probability.score != null) tags.unshift('Passage ~' + a.passage_probability.score + '%');
        const brief = a.brief || a.summary || '';
        const status = (a.enrichment && a.enrichment.real_status) ? String(a.enrichment.real_status) : (a.real_status || '');
        if (!brief && !why && !watch) return null;
        return { brief: String(brief), why: String(why || ''), watch: String(watch || ''), tags: tags, status: status };
      } catch (e) { return null; }
    }
    function rowTitle(f, row) {
      try { if (f.dataSource && f.dataSource.rowMap) { const m = f.dataSource.rowMap(row); if (m && m[0]) return String(m[0]); } } catch (e) { }
      for (const k in row) { const v = String(row[k] || '').trim(); if (v && !/^https?:/i.test(v) && k !== 'id') return v; }
      return 'Record';
    }
    function makeCardProps(tier, f, row, idx) {
      const csv = f.dataSource.csv;
      const entries = Object.entries(row).filter(kv => String(kv[1] || '').trim() !== '' && kv[0] !== 'id');
      const url = (entries.find(kv => /^https?:\/\//i.test(String(kv[1]).trim())) || [])[1] || '';
      const fields = entries.filter(kv => !/^https?:\/\//i.test(String(kv[1]).trim())).slice(0, 6).map(kv => [kv[0], String(kv[1]).slice(0, 80)]);
      const ana = analysisFor(csv, row, idx);
      return {
        tier: tier, tierShort: TIER_SHORT[tier] || 'NIY', feature: f.feature, csv: csv,
        title: rowTitle(f, row).slice(0, 120), fields: fields, url: url,
        analysis: ana, status: ana && ana.status ? ana.status : '',
        accent: TIER_COLORS[tier] || '#7fb0ff',
      };
    }
    function insertCard(tier, f, row, idx) {
      const el = addEl('card', makeCardProps(tier, f, row, idx), { w: 340, h: 120 });
      // auto-size to content once rendered
      const d = domFor(el.id);
      if (d) {
        const inner = d.querySelector('.cs-card');
        if (inner) { el.h = Math.min(600, Math.max(120, inner.scrollHeight + 4)); updateElDom(el); }
      }
      saveSoon();
      return el;
    }
    let cmOv = null;
    function openCardModal() {
      if (!st.inited) return;
      if (!cmOv) {
        cmOv = document.createElement('div'); cmOv.className = 'cs-cm-ov';
        cmOv.innerHTML = '<div class="cs-cm">'
          + '<div class="cs-cm-head"><b>✦ IMPORT CARD FROM TERMINAL</b><button class="cs-cm-x" type="button">×</button></div>'
          + '<div class="cs-cm-tiers"></div>'
          + '<div class="cs-cm-body"><div class="cs-cm-feats"></div>'
          + '<div class="cs-cm-rows"><input class="cs-cm-search" placeholder="Search records…"/><div class="cs-cm-list"></div></div></div>'
          + '<div class="cs-cm-note">Cards carry the record + its ✦ Niyantran Analysis (grounded enrichment). Records marked ✦ have analysis; others import with raw fields only. Click a record to add it — the picker stays open for multi-add.</div>'
          + '</div>';
        document.body.appendChild(cmOv);
        cmOv.addEventListener('click', e => { if (e.target === cmOv) closeCardModal(); });
        cmOv.querySelector('.cs-cm-x').addEventListener('click', closeCardModal);
        cmOv.querySelector('.cs-cm-search').addEventListener('input', renderCmRows);
      }
      cmOv.classList.add('show');
      renderCmTiers();
    }
    function closeCardModal() { if (cmOv) cmOv.classList.remove('show'); }
    function cmFeatures(tier) {
      try {
        return featuresForTier(tier).filter(f => f.dataSource && f.dataSource.csv && typeof EMBEDDED_CSV_DATA !== 'undefined' && (EMBEDDED_CSV_DATA[f.dataSource.csv] || []).length);
      } catch (e) { return []; }
    }
    function renderCmTiers() {
      const box = cmOv.querySelector('.cs-cm-tiers');
      box.innerHTML = TIER_KEYS.map(t => '<button class="cs-cm-tier' + (t === st.cm.tier ? ' active' : '') + '" data-t="' + t + '" type="button">' + escapeHtml((typeof TIER_LABEL !== 'undefined' && TIER_LABEL[t]) || t) + '</button>').join('');
      box.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { st.cm.tier = b.dataset.t; st.cm.feat = null; renderCmTiers(); }));
      renderCmFeats();
    }
    function renderCmFeats() {
      const feats = cmFeatures(st.cm.tier);
      if (!st.cm.feat || !feats.some(f => f.feature === st.cm.feat)) st.cm.feat = feats.length ? feats[0].feature : null;
      const box = cmOv.querySelector('.cs-cm-feats');
      box.innerHTML = feats.map(f => '<button class="cs-cm-feat' + (f.feature === st.cm.feat ? ' active' : '') + '" data-f="' + escapeHtml(f.feature) + '" type="button"><div class="n">' + escapeHtml(f.feature) + '</div><div class="c">' + (EMBEDDED_CSV_DATA[f.dataSource.csv] || []).length + ' records</div></button>').join('') || '<div class="cs-props-note" style="padding:8px">No datasets in this tier.</div>';
      box.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { st.cm.feat = b.dataset.f; renderCmFeats(); }));
      renderCmRows();
    }
    function renderCmRows() {
      const list = cmOv.querySelector('.cs-cm-list');
      const q = cmOv.querySelector('.cs-cm-search').value.trim().toLowerCase();
      const f = cmFeatures(st.cm.tier).find(x => x.feature === st.cm.feat);
      if (!f) { list.innerHTML = ''; return; }
      const rows = EMBEDDED_CSV_DATA[f.dataSource.csv] || [];
      const out = [];
      for (let i = 0; i < rows.length && out.length < 60; i++) {
        const row = rows[i];
        if (q && !Object.values(row).join(' ').toLowerCase().includes(q)) continue;
        out.push({ row: row, idx: i });
      }
      list.innerHTML = out.map(o => {
        const t = rowTitle(f, o.row);
        const hasAna = !!analysisFor(f.dataSource.csv, o.row, o.idx);
        const sub = Object.values(o.row).map(String).filter(v => v.trim() && v !== t && !/^https?:/i.test(v)).slice(0, 2).join(' · ');
        return '<button class="cs-cm-row" data-i="' + o.idx + '" type="button"><span class="t">' + escapeHtml(t.slice(0, 90)) + '</span><span class="s">' + escapeHtml(sub.slice(0, 60)) + '</span>' + (hasAna ? '<span class="a">✦</span>' : '') + '<span class="add">Added ✓</span></button>';
      }).join('') || '<div class="cs-props-note" style="padding:10px">No matching records.</div>';
      list.querySelectorAll('.cs-cm-row').forEach(b => b.addEventListener('click', () => {
        const idx = parseInt(b.dataset.i, 10);
        insertCard(st.cm.tier, f, (EMBEDDED_CSV_DATA[f.dataSource.csv] || [])[idx], idx);
        b.classList.add('added');
        setTimeout(() => b.classList.remove('added'), 1400);
      }));
    }

    // ---------- PNG export (own renderer — no external libs) ----------
    function rr(ctx, x, y, w, h, r) {
      r = Math.min(r || 0, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function wrapLines(ctx, text, maxW) {
      const out = [];
      String(text || '').split('\n').forEach(para => {
        let line = '';
        para.split(/\s+/).forEach(word => {
          const t = line ? line + ' ' + word : word;
          if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; }
          else line = t;
        });
        out.push(line);
      });
      return out;
    }
    function drawWrapped(ctx, text, x, y, maxW, lineH, maxLines) {
      const lines = wrapLines(ctx, text, maxW);
      const n = maxLines ? Math.min(lines.length, maxLines) : lines.length;
      for (let i = 0; i < n; i++) ctx.fillText(lines[i], x, y + i * lineH);
      return y + n * lineH;
    }
    function loadImg(src) { return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
    async function exportPNG() {
      const els = st.doc.elements;
      if (!els.length) { toast('Nothing to export — the board is empty'); return; }
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      els.forEach(el => elCorners(el).forEach(p => { x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y); }));
      const pad = 48, S = 2;
      const W = Math.ceil((x2 - x1 + pad * 2) * S), H = Math.ceil((y2 - y1 + pad * 2) * S);
      if (W * H > 268000000) { toast('Board too large to export at 2x'); return; }
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, W, H);
      ctx.scale(S, S); ctx.translate(pad - x1, pad - y1);
      const imgs = {};
      for (const el of els) if (el.type === 'image' && el.props && el.props.src) imgs[el.id] = await loadImg(el.props.src);
      const FF = '-apple-system,Segoe UI,Roboto,sans-serif';
      els.forEach(el => {
        const p = el.props || {};
        ctx.save();
        ctx.globalAlpha = el.opacity != null ? el.opacity : 1;
        ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
        ctx.rotate((el.rot || 0) * Math.PI / 180);
        ctx.translate(-el.w / 2, -el.h / 2);
        if (el.type === 'rect' || el.type === 'ellipse') {
          if (el.type === 'ellipse') { ctx.beginPath(); ctx.ellipse(el.w / 2, el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2); }
          else rr(ctx, 0, 0, el.w, el.h, p.radius != null ? p.radius : 8);
          ctx.fillStyle = p.fill || '#1a2230'; ctx.fill();
          if ((p.strokeW != null ? p.strokeW : 1) > 0) { ctx.strokeStyle = p.stroke || '#3d4a5c'; ctx.lineWidth = p.strokeW != null ? p.strokeW : 1; ctx.stroke(); }
        } else if (el.type === 'arrow') {
          const x1a = 0, y1a = p.flip ? el.h : 0, x2a = el.w, y2a = p.flip ? 0 : el.h;
          ctx.strokeStyle = p.stroke || '#8fa3b8'; ctx.lineWidth = p.strokeW || 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x1a, y1a); ctx.lineTo(x2a, y2a); ctx.stroke();
          if (p.head !== false) {
            const ang = Math.atan2(y2a - y1a, x2a - x1a), hl = Math.max(8, (p.strokeW || 2) * 4);
            ctx.fillStyle = p.stroke || '#8fa3b8';
            ctx.beginPath(); ctx.moveTo(x2a, y2a);
            ctx.lineTo(x2a - hl * Math.cos(ang - 0.44), y2a - hl * Math.sin(ang - 0.44));
            ctx.lineTo(x2a - hl * Math.cos(ang + 0.44), y2a - hl * Math.sin(ang + 0.44));
            ctx.closePath(); ctx.fill();
          }
        } else if (el.type === 'text') {
          ctx.fillStyle = p.color || '#e8edf2';
          ctx.font = (p.weight || 500) + ' ' + (p.size || 18) + 'px ' + FF;
          ctx.textBaseline = 'top';
          const lines = wrapLines(ctx, p.text || '', el.w - 8);
          lines.forEach((ln, i) => {
            let tx = 4;
            if (p.align === 'center') tx = (el.w - ctx.measureText(ln).width) / 2;
            if (p.align === 'right') tx = el.w - 4 - ctx.measureText(ln).width;
            ctx.fillText(ln, tx, 2 + i * (p.size || 18) * 1.35);
          });
        } else if (el.type === 'sticky') {
          rr(ctx, 0, 0, el.w, el.h, 6); ctx.fillStyle = p.color || '#f5d76e'; ctx.fill();
          ctx.fillStyle = '#14161a'; ctx.font = '550 13px ' + FF; ctx.textBaseline = 'top';
          ctx.save(); rr(ctx, 0, 0, el.w, el.h, 6); ctx.clip();
          drawWrapped(ctx, p.text || '', 12, 12, el.w - 24, 18);
          ctx.restore();
        } else if (el.type === 'image') {
          const im = imgs[el.id];
          if (im) {
            const sc = Math.min(el.w / im.width, el.h / im.height);
            const dw = im.width * sc, dh = im.height * sc;
            ctx.drawImage(im, (el.w - dw) / 2, (el.h - dh) / 2, dw, dh);
          }
        } else if (el.type === 'card') {
          rr(ctx, 0, 0, el.w, el.h, 10);
          ctx.fillStyle = '#11151c'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.save(); rr(ctx, 0, 0, el.w, el.h, 10); ctx.clip();
          ctx.fillStyle = p.accent || '#7fb0ff'; ctx.fillRect(0, 0, 3, el.h);
          ctx.textBaseline = 'top';
          let y = 12; const xL = 16, maxW = el.w - 30;
          ctx.fillStyle = p.accent || '#7fb0ff'; ctx.font = '800 8px ' + FF;
          ctx.fillText((p.tierShort || 'NIY') + '   ' + String(p.feature || '').toUpperCase().slice(0, 42), xL, y); y += 15;
          ctx.fillStyle = '#eef2f6'; ctx.font = '700 13px ' + FF;
          y = drawWrapped(ctx, p.title || '', xL, y, maxW, 17, 3) + 6;
          const a = p.analysis;
          if (a && (a.brief || a.why)) {
            ctx.fillStyle = '#8db8ff'; ctx.font = '800 8px ' + FF;
            ctx.fillText('✦ NIYANTRAN ANALYSIS', xL, y); y += 13;
            ctx.fillStyle = '#dbe2e9'; ctx.font = '400 11px ' + FF;
            if (a.brief) y = drawWrapped(ctx, a.brief, xL, y, maxW, 15, 5) + 4;
            ctx.fillStyle = '#aab4c0'; ctx.font = '400 10px ' + FF;
            if (a.why) y = drawWrapped(ctx, 'WHY: ' + a.why, xL, y, maxW, 14, 3) + 3;
            if (a.watch) y = drawWrapped(ctx, 'WATCH: ' + a.watch, xL, y, maxW, 14, 3) + 3;
            if (a.tags && a.tags.length) {
              ctx.font = '650 8.5px ' + FF; let tx = xL;
              a.tags.forEach(t => {
                const tw = ctx.measureText(t).width + 14;
                if (tx + tw > el.w - 14) return;
                rr(ctx, tx, y, tw, 14, 7); ctx.strokeStyle = 'rgba(127,176,255,.4)'; ctx.stroke();
                ctx.fillStyle = '#8db8ff'; ctx.fillText(t, tx + 7, y + 3.5);
                tx += tw + 5;
              });
              y += 20;
            }
          }
          (p.fields || []).forEach(fv => {
            ctx.fillStyle = '#68717b'; ctx.font = '700 8.5px ' + FF;
            ctx.fillText(String(fv[0]).replace(/_/g, ' ').toUpperCase().slice(0, 20), xL, y + 1);
            ctx.fillStyle = '#c3ccd6'; ctx.font = '400 10.5px ' + FF;
            ctx.fillText(String(fv[1]).slice(0, 52), xL + 92, y);
            y += 15;
          });
          ctx.restore();
        }
        ctx.restore();
      });
      const a = document.createElement('a');
      a.download = (st.doc.name || 'board').replace(/[^\w\- ]+/g, '') + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
      toast('PNG exported');
    }

    // ---------- boot / integration ----------
    function ensureCanvas() {
      if (st.inited) { applyTransform(); return; }
      st.inited = true;
      try { st.doc = JSON.parse(localStorage.getItem(LSKEY) || '') || newDoc(); } catch (e) { st.doc = newDoc(); }
      if (!st.doc || !Array.isArray(st.doc.elements)) st.doc = newDoc();
      buildUI();
      st.ui.name.value = st.doc.name || 'Untitled board';
      renderAllEls(); applyTransform(); refreshUI();
    }
    let firstStudioOpen = true;
    const _origInitStudio = window.initDataStudio;
    window.initDataStudio = function () {
      try { if (typeof _origInitStudio === 'function') _origInitStudio.apply(this, arguments); } catch (e) { }
      injectPane();
      if (firstStudioOpen) {
        firstStudioOpen = false;
        try { ensureCanvas(); if (typeof switchStudioPane === 'function') switchStudioPane('canvas'); } catch (e) { }
      }
    };
    const _origSwitchPane = window.switchStudioPane;
    if (typeof _origSwitchPane === 'function') {
      window.switchStudioPane = function (pane) {
        _origSwitchPane.apply(this, arguments);
        if (pane === 'canvas') { ensureCanvas(); try { st.ui.vp.focus(); } catch (e) { } }
      };
    }
    try { window.NiyStudio = { st: st, ensure: ensureCanvas, addEl: addEl, undo: undo, redo: redoFn, setTool: setTool, openCardModal: openCardModal, closeCardModal: closeCardModal, insertCard: insertCard, exportPNG: exportPNG, fit: fitContent, align: alignSel, dup: dupSel, del: delSel }; } catch (e) { }
  })();


  // Hook renderDetail: run our injection right after the original renders.
  if (typeof window.renderDetail === 'function' || typeof renderDetail === 'function') {
    const _rd = (typeof window.renderDetail === 'function') ? window.renderDetail : renderDetail;
    const wrapped = async function () {
      const r = await _rd.apply(this, arguments);
      // slight defer so the async data block + toolbar exist
      setTimeout(() => { injectFeatureToolbarActions(); markPlainRows(); }, 0);
      // finance markets dashboard — runs once the detail + data block exist
      setTimeout(renderFinanceDash, 60);
      setTimeout(renderFinanceDash, 500);
      // data blocks resolve asynchronously — re-mark once they've landed
      setTimeout(markPlainRows, 400);
      setTimeout(markPlainRows, 1200);
      return r;
    };
    try { window.renderDetail = wrapped; } catch (e) {}
    try { renderDetail = wrapped; } catch (e) {}
  }
  // Also observe the detail node as a safety net (covers cached re-renders)
  const detailNode = document.getElementById('detail');
  if (detailNode && 'MutationObserver' in window) {
    let moTimer;
    const mo = new MutationObserver(() => {
      clearTimeout(moTimer);
      moTimer = setTimeout(() => { injectFeatureToolbarActions(); markPlainRows(); }, 60);
    });
    mo.observe(detailNode, { childList: true, subtree: true });
  }

  /* ----------------------------------------------------------
     7. OVERVIEW QUICK ACTIONS
     The empty overviewQuickActions container now offers the
     three highest-intent entry points, so a fresh login has a
     clear first move instead of a wall of panes.
     ---------------------------------------------------------- */
  function renderOverviewQuickActions() {
    const el = document.getElementById('overviewQuickActions');
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.innerHTML = `
      <div class="qa-grid">
        <button class="qa-card" data-qa="national"><div class="qa-k">START HERE</div><div class="qa-t">National Intelligence</div><div class="qa-d">Bills, MPs, tenders & signals across Parliament.</div></button>
        <button class="qa-card" data-qa="up"><div class="qa-k">STATE</div><div class="qa-t">Uttar Pradesh</div><div class="qa-d">Assembly, MLAs, schemes & state procurement.</div></button>
        <button class="qa-card" data-qa="local"><div class="qa-k">GROUND</div><div class="qa-t">Local desk</div><div class="qa-d">Booth-level data, ward works & local tenders.</div></button>
        <button class="qa-card qa-ai" data-qa="ai"><div class="qa-k">ASK</div><div class="qa-t">AI Research Assistant →</div><div class="qa-d">Ask a question across every dataset in the terminal.</div></button>
      </div>`;
    el.querySelectorAll('.qa-card').forEach(card => {
      card.addEventListener('click', () => {
        const t = card.getAttribute('data-qa');
        if (t === 'ai') { openGlobalAiWithPrompt(''); return; }
        activeTier = t; activeIndex = 0; renderAll();
      });
    });
  }
  // render quick actions whenever the overview pane becomes visible
  const overviewPane = document.getElementById('pane-overview');
  if (overviewPane && 'MutationObserver' in window) {
    const mo2 = new MutationObserver(() => { if (!overviewPane.hidden) renderOverviewQuickActions(); });
    mo2.observe(overviewPane, { attributes: true, attributeFilter: ['hidden'] });
  }
  renderOverviewQuickActions();

})();


const SHEET_SOURCE_META = {
 "geopolitics::Global War & Conflict Tracker": {
  "sources": "UCDP (Uppsala); ACLED for higher-frequency events",
  "link": "https://ucdp.uu.se/apidocs/ ; https://acleddata.com",
  "notes": "UCDP: free API w/ token. ACLED: free academic tier, paid commercial licence above thresholds",
  "flag": "Free w/ Registration",
  "clientele": "Geopolitical/defence analysts, insurers, journalists",
  "interactive": "Live conflict map; status filter; escalation timeline; 'since' sort",
  "status": "Live"
 },
 "geopolitics::Global Geopolitics News Monitor": {
  "sources": "GDELT Project (global news events, tone); optionally NewsAPI",
  "link": "https://www.gdeltproject.org ; https://newsapi.org",
  "notes": "GDELT DOC 2.0 API is free/open (huge coverage); NewsAPI has a free-limited + paid tier",
  "flag": "Open/Free",
  "clientele": "Analysts, journalists, all segments",
  "interactive": "Country/topic news feed; tone & volume charts; entity co-occurrence",
  "status": "Pipeline pending"
 },
 "geopolitics::Major Infrastructure & Strategic Projects Tracker": {
  "sources": "World Bank Projects API; AidData (China overseas lending)",
  "link": "https://projects.worldbank.org ; https://www.aiddata.org",
  "notes": "World Bank Projects API open/free; AidData open datasets",
  "flag": "Open/Free",
  "clientele": "Investors, infra consultancies, government",
  "interactive": "Project map by financier/sector; completion tracker",
  "status": "Live"
 },
 "geopolitics::Defense Modernization & Procurement Watch": {
  "sources": "SIPRI Arms Transfers + Military Expenditure databases",
  "link": "https://www.sipri.org/databases",
  "notes": "Free bulk data export; no formal REST API",
  "flag": "Open/Free",
  "clientele": "Defence analysts, investors, journalists",
  "interactive": "Arms-flow Sankey; spend-%-GDP comparator; modernisation timeline",
  "status": "Live"
 },
 "geopolitics::Strategic Alliances Watch": {
  "sources": "GDELT events; UN Treaty Collection; MEA (India) releases",
  "link": "https://www.gdeltproject.org ; https://treaties.un.org ; https://mea.gov.in",
  "notes": "GDELT free; UN Treaty DB free (no API); MEA releases free (no API)",
  "flag": "Free w/ Registration",
  "clientele": "Analysts, journalists, government",
  "interactive": "Alliance network graph; diplomatic-event timeline",
  "status": "Pipeline pending"
 },
 "finance::NSE/BSE Delayed Market Feed": {
  "sources": "TrueData; Global Datafeeds (GFDL); NSE/BSE delayed subscription",
  "link": "https://truedata.in ; https://globaldatafeeds.in",
  "notes": "Delayed data is cheaper but redistribution is still licensed by SEBI/exchanges — legal review needed",
  "flag": "Paid/Licensed",
  "clientele": "Investors, traders, analysts",
  "interactive": "Delayed ticker panels; index heatmap; watchlist",
  "status": "Live"
 },
 "finance::Prediction Market Political Odds": {
  "sources": "Polymarket API; Kalshi; Metaculus",
  "link": "https://docs.polymarket.com ; https://kalshi.com ; https://www.metaculus.com",
  "notes": "Polymarket has a public API; NOTE: real-money election prediction markets are legally restricted in India — check compliance before surfacing to Indian users",
  "flag": "Free w/ Registration",
  "clientele": "Investors, political analysts, journalists",
  "interactive": "Live odds panel; odds-over-time chart",
  "status": "Live"
 },
 "finance::Election Forecast Aggregator": {
  "sources": "Pollsters (CVoter, Axis, etc. — proprietary); academic models",
  "link": "N/A (pollster licensing)",
  "notes": "Pollster data is proprietary/licensed; academic models vary — mostly manual/licensed ingestion",
  "flag": "Paid/Licensed",
  "clientele": "Investors, parties, journalists",
  "interactive": "Forecast aggregate; pollster-spread chart",
  "status": "Pipeline pending"
 },
 "national::Bill Passage Probability Index": {
  "sources": "sansad.in (LS/RS); PRS Legislative Research (CC-BY 4.0)",
  "link": "https://sansad.in ; https://prsindia.org/billtrack",
  "notes": "sansad.in structured HTML (no API); PRS is CC-BY 4.0, reusable w/ attribution. Probability is an internal model on stage + party numbers",
  "flag": "Internal/Build",
  "clientele": "Analysts, journalists, investors tracking regulation",
  "interactive": "Probability index; stage tracker; proposer/interest tag; expand-row detail",
  "status": "Live"
 },
 "national::Sector Impact Mapper": {
  "sources": "Internal model over PRS/sansad bill text + a sector taxonomy",
  "link": "N/A",
  "notes": "Not an external source — an internal classification/mapping layer",
  "flag": "Internal/Build",
  "clientele": "Investors, sector analysts",
  "interactive": "Bill-to-sector impact map; filter by sector",
  "status": "Live"
 },
 "national::Regulatory Body Watch (RBI/SEBI/TRAI/CCI)": {
  "sources": "RBI, SEBI, TRAI, CCI, IRDAI official sites",
  "link": "https://www.rbi.org.in ; https://www.sebi.gov.in ; https://www.trai.gov.in ; https://www.cci.gov.in",
  "notes": "No unified API; each publishes PDFs/HTML — per-regulator scraping pipelines needed",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Compliance/legal, investors, journalists",
  "interactive": "Regulator activity feed; sector enforcement tracker",
  "status": "Live"
 },
 "national::Central Tender Aggregator + Constituency Filter": {
  "sources": "GeM (Govt e-Marketplace); CPPP / eProcure",
  "link": "https://gem.gov.in ; https://eprocure.gov.in",
  "notes": "GeM bulk reporting for registered entities; CPPP browsable, no open API",
  "flag": "Free w/ Registration",
  "clientele": "Businesses, investors, journalists",
  "interactive": "Tender map by constituency/sector/value",
  "status": "Live"
 },
 "national::Statement & Quote Tracker with Contradiction Detection": {
  "sources": "News aggregation (GDELT/NewsAPI) + PIB + parliamentary record; Anthropic API for contradiction analysis",
  "link": "https://www.gdeltproject.org ; https://pib.gov.in ; https://docs.claude.com",
  "notes": "News feed paid/licensed depending on vendor; contradiction detection needs Anthropic API key (billed)",
  "flag": "Paid/Licensed",
  "clientele": "Journalists, opposition research, analysts",
  "interactive": "Quote timeline per person; AI-flagged contradictions; source links",
  "status": "Pipeline pending"
 },
 "national::National Morning Brief (Auto-digest)": {
  "sources": "Internal — synthesises ingested feeds; Anthropic API for the write-up",
  "link": "https://docs.claude.com",
  "notes": "Anthropic API key required; grounded in the day's ingested data",
  "flag": "Paid/Licensed",
  "clientele": "All subscribers (esp. time-poor decision-makers)",
  "interactive": "One-tap daily brief; topic filters; export",
  "status": "Pipeline pending"
 },
 "national::Candidate Affidavit Database (Structured + API)": {
  "sources": "ADR / MyNeta.info; ECI affidavit filings",
  "link": "https://myneta.info ; https://affidavit.eci.gov.in",
  "notes": "ADR data downloadable under their open policy; the 'Structured + API' layer is Reea's own value-add on top",
  "flag": "Free w/ Registration",
  "clientele": "Journalists, civil society, investors (regulatory risk)",
  "interactive": "Asset-change-over-terms tracker; criminal-case flag; API access",
  "status": "Live"
 },
 "national::Policy Pipeline Tracker (Draft-to-Gazette)": {
  "sources": "Ministry consultation portals; eGazette; PRS",
  "link": "https://egazette.gov.in ; https://prsindia.org",
  "notes": "Consultation drafts + gazette are separate document sources, no unified API — stitched pipeline",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Policy analysts, compliance, industry bodies",
  "interactive": "Draft-to-gazette stage tracker; comment-period alerts",
  "status": "Live"
 },
 "national::Parliamentary Question Database": {
  "sources": "sansad.in Questions; PRS",
  "link": "https://sansad.in ; https://prsindia.org",
  "notes": "sansad.in structured HTML (no API); PRS CC-BY mirror available (Vonter/india-representatives-activity on GitHub)",
  "flag": "Free w/ Registration",
  "clientele": "Journalists, analysts, researchers",
  "interactive": "PQ search by MP/ministry/topic; answer linkage",
  "status": "Live"
 },
 "national::Delimitation Impact Simulator": {
  "sources": "Internal — ECI constituency data + Census population",
  "link": "https://censusindia.gov.in",
  "notes": "Simulator built on open Census + ECI boundary data; no external API",
  "flag": "Internal/Build",
  "clientele": "Political analysts, parties, journalists, government",
  "interactive": "Adjustable-parameter seat simulator; before/after map",
  "status": "Live"
 },
 "national::Bureaucratic Transfers — AGMUT Cadre": {
  "sources": "DoPT orders; press reports",
  "link": "https://dopt.gov.in",
  "notes": "Orders published as documents, no API — scraping/curation",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Journalists, civil society, policy watchers",
  "interactive": "Posting/transfer timeline by officer; UNCONFIRMED flag",
  "status": "Live"
 },
 "national::Cabinet Decisions": {
  "sources": "PIB (Press Information Bureau) cabinet releases",
  "link": "https://pib.gov.in",
  "notes": "PIB releases are HTML/PDF, no formal API — scrape",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Analysts, journalists, investors",
  "interactive": "Decision feed w/ priority tag; View PDF; date sort",
  "status": "Live"
 },
 "judiciary::Supreme Court Order & Judgment Feed": {
  "sources": "sci.gov.in; Indian Kanoon API; eCourts/NJDG",
  "link": "https://www.sci.gov.in ; https://www.indiankanoon.org/api/ ; https://njdg.ecourts.gov.in",
  "notes": "sci.gov.in judgments are downloadable PDFs (no API); Indian Kanoon offers a paid/commercial API; NJDG dashboards free (no open API)",
  "flag": "Paid/Licensed",
  "clientele": "Law firms, legal researchers, journalists",
  "interactive": "Precedent citation graph; judge judgment-history profile; constitutional-reference search",
  "status": "Live"
 },
 "judiciary::NGT Environmental Litigation Tracker": {
  "sources": "NGT official site",
  "link": "https://www.greentribunal.gov.in",
  "notes": "Orders downloadable, no API",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Environmental lawyers, ESG analysts, journalists",
  "interactive": "Environmental case tracker by state/sector",
  "status": "New (outline)"
 },
 "judiciary::CAT & Consumer Disputes (NCDRC) Watch": {
  "sources": "CAT official site",
  "link": "https://cgat.gov.in",
  "notes": "Orders downloadable, no API",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Legal researchers, civil servants",
  "interactive": "Case tracker by bench",
  "status": "New (outline)"
 },
 "state::Bureaucrat Transfer & Posting Tracker (State Cadre)": {
  "sources": "State government DoP orders; press reports",
  "link": "N/A (per-state gov portals + press)",
  "notes": "Transfer orders as documents/press, no API — curation with UNCONFIRMED flag until verified",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Journalists, civil society, businesses",
  "interactive": "Transfer timeline; service filter; UNCONFIRMED tag; date filter",
  "status": "Live"
 },
 "state::Cabinet Decisions": {
  "sources": "State DIPR / press releases",
  "link": "N/A (per-state gov portals)",
  "notes": "Press/PDF, no API — scrape per state",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Analysts, journalists, investors",
  "interactive": "Decision feed w/ priority; View PDF; date sort",
  "status": "Live"
 },
 "state::MLA Report Card + Statement Tracker": {
  "sources": "State assembly records; ADR MyNeta (MLA affidavits); PRS state briefs",
  "link": "https://myneta.info ; https://prsindia.org/bills/state-legislative-briefs",
  "notes": "MLA-level activity is sparsely covered — mostly manual build + ADR affidavits",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Regional journalists, constituents, consultants",
  "interactive": "MLA scorecard; statement timeline",
  "status": "Live"
 },
 "state::Booth-level Results Database": {
  "sources": "ECI Form 20; LokDhaba (TCPD, Ashoka); Harvard Dataverse Form-20 sets",
  "link": "https://lokdhaba.ashoka.edu.in ; https://results.eci.gov.in",
  "notes": "LokDhaba is free & cleaned (1962+, constituency level, downloadable CSV); Form-20 booth data free but PDF-heavy",
  "flag": "Open/Free",
  "clientele": "Political analysts, journalists, parties",
  "interactive": "Booth-level result map; swing analysis; turnout overlay",
  "status": "Pipeline pending"
 },
 "state::Governor Assent Tracker": {
  "sources": "Raj Bhavan communications; assembly records; PRS",
  "link": "https://prsindia.org",
  "notes": "No API — status tracked from assembly records + press",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Analysts, journalists, legal researchers",
  "interactive": "Assent-status tracker; time-pending counter",
  "status": "Pipeline pending"
 },
 "state::State Tender Aggregator (State e-Procurement)": {
  "sources": "State eProcurement portals (nprocure, etc.); CPPP",
  "link": "https://eprocure.gov.in",
  "notes": "State portals vary; many use NIC eProcurement, no unified open API — per-state ingestion",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Businesses, investors, journalists",
  "interactive": "Tender map by district/sector/value",
  "status": "Pipeline pending"
 },
 "state::Assembly Proceedings Digest (Vernacular, Translated)": {
  "sources": "State assembly sites / NeVA; Anthropic API for translation & digest",
  "link": "https://neva.gov.in ; https://docs.claude.com",
  "notes": "Proceedings from NeVA/assembly sites (no clean API); translation/digest via Anthropic API (billed)",
  "flag": "Paid/Licensed",
  "clientele": "Analysts, journalists across language barriers",
  "interactive": "Translated proceedings feed; AI digest; search",
  "status": "Pipeline pending"
 },
 "state::Party Organisation Map": {
  "sources": "Party websites; ECI recognised-parties list",
  "link": "https://www.eci.gov.in",
  "notes": "No API — manual curation from party sites + ECI recognition data",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Political analysts, journalists",
  "interactive": "Org-hierarchy graph; office-bearer directory",
  "status": "Pipeline pending"
 },
 "state::Centre-State Fund Flow Tracker": {
  "sources": "PFMS; Finance Commission; RBI State Finances study",
  "link": "https://pfms.nic.in ; https://www.rbi.org.in",
  "notes": "PFMS dashboard (no API); RBI State Finances is a free annual PDF/Excel",
  "flag": "Free w/ Registration",
  "clientele": "Economists, investors, journalists",
  "interactive": "Fund-flow Sankey; devolution vs utilisation chart",
  "status": "Pipeline pending"
 },
 "state::MLA Defection & Anti-defection Case Tracker": {
  "sources": "Assembly Speaker rulings; court records; PRS analysis",
  "link": "https://prsindia.org",
  "notes": "No API — cases tracked from rulings/press",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Political analysts, legal researchers, journalists",
  "interactive": "Case status tracker; defection timeline",
  "status": "Pipeline pending"
 },
 "state::District Media Monitor (Vernacular District Editions)": {
  "sources": "Regional press; media-monitoring vendors",
  "link": "N/A (vendor-dependent)",
  "notes": "Regional/vernacular press monitoring typically requires a paid media-monitoring feed",
  "flag": "Paid/Licensed",
  "clientele": "Political consultants, journalists, comms teams",
  "interactive": "District news feed; sentiment/theme tags",
  "status": "Pipeline pending"
 },
 "judiciary::UP High Court (Allahabad) Order Feed": {
  "sources": "eCourts/NJDG; individual HC sites; Indian Kanoon",
  "link": "https://njdg.ecourts.gov.in ; https://www.indiankanoon.org/api/",
  "notes": "NJDG aggregates HC data (dashboard, no clean API); Indian Kanoon paid API",
  "flag": "Paid/Licensed",
  "clientele": "Law firms, legal researchers, journalists",
  "interactive": "HC case tracker by state; order feed",
  "status": "Live"
 },
 "local::Panchayat Seat Reservation Rotation Tracker": {
  "sources": "State Election Commission notifications; state Panchayati Raj dept",
  "link": "N/A (per-state SEC)",
  "notes": "SEC rotation notifications are PDFs, no API — per-state scrape/curation ('unique to this tier')",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Local candidates, parties, journalists",
  "interactive": "Reservation-by-seat map; rotation-cycle timeline",
  "status": "Pipeline pending"
 },
 "local::Municipal & Panchayat Tender Aggregator": {
  "sources": "Municipal/ULB e-procurement; state SEC/PR portals",
  "link": "N/A (city/state portals)",
  "notes": "Fragmented across ULBs, no unified API — city-by-city ingestion",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Local contractors, businesses, journalists",
  "interactive": "Local tender map by ward/panchayat",
  "status": "Live"
 },
 "local::Urban Master Plan & Land Use Change Tracker": {
  "sources": "Town & Country Planning depts; development authorities (DDA etc.)",
  "link": "N/A (per-authority)",
  "notes": "Master plans are PDFs/GIS per authority, no unified API",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Real-estate investors, urban planners, RWAs",
  "interactive": "Land-use change map; plan-version diff",
  "status": "Pipeline pending"
 },
 "local::MGNREGA Works & Muster Roll Tracker": {
  "sources": "MGNREGA MIS (nrega.nic.in); data.gov.in",
  "link": "https://nrega.nic.in ; https://data.gov.in",
  "notes": "MGNREGA MIS is very granular & public (works, muster rolls, payments) but structured as MIS reports, not a clean API — scrape/ingest",
  "flag": "Free w/ Registration",
  "clientele": "Civil society, researchers, journalists, auditors",
  "interactive": "Works/muster-roll table; payment-delay flags; panchayat drill-down",
  "status": "Live"
 },
 "local::Ward/Panchayat Results Database": {
  "sources": "State Election Commissions (distinct from ECI)",
  "link": "N/A (per-state SEC)",
  "notes": "Each state SEC runs local polls separately; results in PDFs, no unified API",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Local political analysts, parties, journalists",
  "interactive": "Ward-level result map; incumbency tracker",
  "status": "Live"
 },
 "local::Building Permission & Plan Sanction Monitor": {
  "sources": "Municipal Online Building Permission Systems (OBPAS)",
  "link": "N/A (per-city)",
  "notes": "OBPAS portals are per-city, no unified API — city-by-city",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Real-estate, contractors, RWAs, journalists",
  "interactive": "Permit feed by ward; sanction-status tracker",
  "status": "Live"
 },
 "local::Local Officer Directory + Transfer Tracker (BDO/SDO/EO)": {
  "sources": "State gov directories; transfer orders",
  "link": "N/A (per-state)",
  "notes": "Directories/orders published as documents, no API — curation",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Citizens, journalists, businesses",
  "interactive": "Officer directory; transfer timeline by post",
  "status": "Live"
 },
 "local::Councillor & Pradhan Profiles + Report Cards": {
  "sources": "State SEC filings; affidavits (where mandated)",
  "link": "N/A (per-state SEC)",
  "notes": "Local-rep data sparse/uneven across states, no API — manual build",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Constituents, local journalists, civil society",
  "interactive": "Rep profile cards; report-card scoring",
  "status": "Live"
 },
 "judiciary::Bijnor District Court Case Tracker": {
  "sources": "eCourts Services; NJDG (district layer)",
  "link": "districts.ecourts.gov.in ; njdg.ecourts.gov.in",
  "notes": "eCourts district portals cover all district courts; NJDG has district-level pendency; structured pages — scrape",
  "flag": "No Public API (manual/scrape)",
  "clientele": "Local lawyers, litigants, journalists, businesses",
  "interactive": "District case tracker; status search by CNR/case number",
  "status": "New (outline)"
 }
};

/* V2 PASS 61: catalog hoisted to its own <script> so an unrelated error in this file cannot lose it */


/* ================================================================
   SOURCE MAP INTEGRATION (from Niyantran_Terminal_Source_Map_v2.xlsx)
   - Attaches real provenance (source, link, access flag, clientele)
     to every existing feature.
   - Adds the sheet's outlined-but-unbuilt features as first-class
     pipeline-pending entries, each properly bucketed.
   - Surfaces the Access Flag as a visible badge, so a user can tell
     at a glance whether a node is free, licensed, or scrape-only.
   NOTE: the workbook contains NO API keys — only provider names and
   access tiers. Keys are still entered at runtime (profile → AI API
   Key) and never embedded in this file.
   ================================================================ */
(function () {
  if (typeof FEATURE_DATA === 'undefined') return;

  // 1. Enrich existing features with provenance from the sheet
  Object.keys(FEATURE_DATA).forEach(tier => {
    FEATURE_DATA[tier].forEach(f => {
      const meta = SHEET_SOURCE_META[tier + '::' + f.feature];
      if (meta) f.sourceMeta = meta;
    });
  });

  // 2. Append the sheet's new (outlined) features, deduped by name
  /* V2 PASS 44: State and Local are now driven entirely by ingested geography packs;
     the sheet's legacy outline features for those two tiers are no longer appended. */
  /* V2 PASS 53: sheet outlines append to State/Local again — the geography features lead, the analyst features follow. */
  Object.keys(SHEET_NEW_FEATURES).forEach(tier => {
    if (!FEATURE_DATA[tier]) FEATURE_DATA[tier] = [];
    const existing = new Set(FEATURE_DATA[tier].map(f => f.feature));
    SHEET_NEW_FEATURES[tier].forEach(nf => {
      if (existing.has(nf.feature)) return;
      FEATURE_DATA[tier].push(nf);
    });
  });

  // 3. Extend the canonical bucket order with the sheet's new buckets,
  //    inserted so each sits beside its conceptual neighbours rather
  //    than being appended arbitrarily at the end.
  const EXTRA_ORDER = [
    'Conflict Intelligence','Defense Intelligence','Maritime & Border Security',
    'Diplomacy & Alliances','Infra','Comparative Governance',
    'Legislative & Policy Intelligence','Regulatory & Judicial',
    'Judicial Intelligence','Judicial Analytics','International Courts',
    'Comparative Jurisprudence','Tribunals','Court Operations',
    'Justice System Data','Legal Research',
    'Electoral Data & Analytics','Representative Intelligence',
    'Government Operations','Political Operations Intelligence',
    'Audit & Oversight','Public Finance','Development Indicators',
    'Comparative Analytics','Service Delivery','Hyperlocal Intelligence',
    'Governance & Civic Bodies',
    'Market Intelligence','Macro & Economic Indicators',
    'Sector & Industry Intelligence','Trade & Sanctions','Prediction Markets',
    'Analytical Tools','News & Media Monitoring',
    'Data Markets & Community','Workflow & Distribution',
  ];
  if (typeof BUCKET_ORDER !== 'undefined') {
    BUCKET_ORDER.length = 0;
    EXTRA_ORDER.forEach(b => BUCKET_ORDER.push(b));
  }

  // 4. Access-flag badge: a compact, honest signal of data availability.
  const FLAG_CLASS = {
    'Open/Free': 'flag-open',
    'Free w/ Registration': 'flag-reg',
    'Paid/Licensed': 'flag-paid',
    'No Public API (manual/scrape)': 'flag-scrape',
    'Internal/Build': 'flag-internal',
  };
  const FLAG_SHORT = {
    'Open/Free': 'OPEN',
    'Free w/ Registration': 'REG',
    'Paid/Licensed': 'LICENSED',
    'No Public API (manual/scrape)': 'SCRAPE',
    'Internal/Build': 'INTERNAL',
  };
  window.accessFlagBadge = function (meta) {
    if (!meta || !meta.flag) return '';
    const cls = FLAG_CLASS[meta.flag] || 'flag-internal';
    const short = FLAG_SHORT[meta.flag] || meta.flag;
    return `<span class="access-flag ${cls}" title="${escapeHtml(meta.flag)}">${escapeHtml(short)}</span>`;
  };

  // 5. Provenance modal — now available for EVERY feature (live or
  //    pending), not just ones that already had a dataSource note.
  window.openProvenanceModal = function (f) {
    const m = f.sourceMeta;
    if (!m) return;
    const row = (label, val, isLink) => {
      if (!val) return '';
      const body = isLink
        ? String(val).split(';').map(u => {
            const t = u.trim(); if (!t || t === 'N/A') return escapeHtml(t);
            return /^https?:\/\//i.test(t)
              ? `<a href="${escapeHtml(t)}" target="_blank" rel="noopener" class="row-detail-link">${escapeHtml(t.replace(/^https?:\/\//,''))}↗</a>`
              : escapeHtml(t);
          }).join('<br>')
        : escapeHtml(val);
      return `<div class="row-detail-field"><div class="rdf-key">${escapeHtml(label)}</div><div class="rdf-val">${body}</div></div>`;
    };
    openInfoModal('Source & methodology', `
      <div class="row-detail-meta">
        ${window.accessFlagBadge(m)}
        ${m.status ? `<span class="tag">${escapeHtml(m.status)}</span>` : ''}
      </div>
      <div class="row-detail-fields">
        ${row('Primary source(s)', m.sources)}
        ${row('Link', m.link, true)}
        ${row('Access notes', m.notes)}
        ${row('Suggested clientele', m.clientele)}
        ${row('Terminal features', m.interactive)}
      </div>
    `);
  };

  // 6. Inject the badge + provenance button into the feature detail header.
  //    Deliberately idempotent per-element rather than guarded by a single
  //    "wired" flag on the header: the detail pane re-renders asynchronously
  //    (the data block lands after the header), so a one-shot flag could mark
  //    the header done before the toolbar existed and the button would never
  //    appear. Checking for each element separately lets the observer safely
  //    re-run until both are in place.
  function decorateDetail() {
    const f = featuresForTier(activeTier)[activeIndex];
    if (!f || !f.sourceMeta) return;

    const tags = document.querySelector('#detail .tags');
    if (tags && !tags.querySelector('.access-flag')) {
      tags.insertAdjacentHTML('beforeend', window.accessFlagBadge(f.sourceMeta));
    }
    const toolbar = document.querySelector('#detail .toolbar');
    if (toolbar && !toolbar.querySelector('#featProvenance')) {
      const btn = document.createElement('button');
      btn.id = 'featProvenance';
      btn.className = 'toolbar-btn';
      btn.type = 'button';
      btn.textContent = 'ⓘ Source';
      btn.title = 'Where this data comes from, and on what terms';
      btn.addEventListener('click', () => window.openProvenanceModal(f));
      toolbar.appendChild(btn);
    }
  }
  const detailNode = document.getElementById('detail');
  if (detailNode && 'MutationObserver' in window) {
    let t;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(decorateDetail, 60); })
      .observe(detailNode, { childList: true, subtree: true });
  }
  // Also re-run on an explicit render, covering the first paint before any mutation
  if (typeof window.renderDetail === 'function') {
    const _rd = window.renderDetail;
    window.renderDetail = async function () {
      const r = await _rd.apply(this, arguments);
      setTimeout(decorateDetail, 0);
      setTimeout(decorateDetail, 500);
      setTimeout(decorateDetail, 1400);
      return r;
    };
  }

  if (typeof renderAll === 'function') renderAll();
})();

