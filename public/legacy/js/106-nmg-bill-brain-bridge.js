
/* ============================================================================
   THE BRAIN → Bill Passage Index analytics bridge  (additive, fail-silent)
   ----------------------------------------------------------------------------
   Selecting a bill in the Live Feed swaps the Analytics pane from the "bills
   tracked" overview to that bill's IMPACT VIEW, drawn from the Policy
   Intelligence Graph / Brain:

     · what the bill does            (its own extracted brief — never invented)
     · where the impact lands        (sectors · companies · other segments)
     · how the impact travels        (a short paragraph per derivation path)
     · an interactive mind-graph     (hover / focus / click, filter, table twin)

   Connection strength is carried by THREE encodings, never colour alone —
   green/amber/red is a reserved status palette whose green↔amber pair sits in
   the CVD floor band and whose amber fails 3:1 on this surface. So every link
   also carries a distinct node SHAPE (diamond / disc / ring) and a written
   band label, and the Full reasoning report carries a full table of every link.

   Additive only. Zero edits to existing code; removal = delete this block.
   ========================================================================== */
(function () {
  'use strict';
  try {
    if (window.__NMG_BILL_BRIDGE__) return; window.__NMG_BILL_BRIDGE__ = 1;

    /* ---------------- utils ---------------- */
    function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function objVals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
    function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    function titleCase(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }
    function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }
    function cssVar(n, fb) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(n); return (v && v.trim()) || fb; } catch (e) { return fb; } }

    var BAND_ORDER = ['Strong', 'Moderate', 'Weak', 'Speculative'];
    var BORD = { Strong: 4, Moderate: 3, Weak: 2, Speculative: 1 };
    function safeCol(c) { return /^[#a-zA-Z0-9(),.%\s-]+$/.test(c) ? c : '#9AA1A8'; }
    function col(b) {
      if (b === 'Strong') return safeCol(cssVar('--signal-green', '#2FA254'));
      if (b === 'Moderate') return safeCol(cssVar('--signal-amber', '#E79A24'));
      if (b === 'Weak') return safeCol(cssVar('--signal-red', '#D93B2B'));
      return safeCol(cssVar('--fg-faint', '#9AA1A8'));
    }
    function okBand(b) { return BORD[b] ? b : 'Speculative'; }   // whitelist: b reaches class attributes
    function stronger(a, b) { if (!a) return b; if (!b) return a; return (BORD[a] || 0) >= (BORD[b] || 0) ? a : b; }
    function scoreBand(s) { s = +s || 0; return s >= 0.045 ? 'Strong' : s >= 0.018 ? 'Moderate' : s >= 0.007 ? 'Weak' : 'Speculative'; }
    // Plain-language gloss for the band — the label never travels alone as a colour.
    var BAND_GLOSS = {
      Strong: 'strong link', Moderate: 'moderate link',
      Weak: 'weak link', Speculative: 'speculative link'
    };

    /* ---------------- which desks this view serves ----------------
       One engine, four features. Each entry says where the record lives, which
       fields carry its name/stage/date/subject, and what its analysis JSON is
       called. Adding a fifth desk is a config entry, not new code. */
    var FEATURES = [
      { key: 'bill', csv: 'national_bill_tracker.csv',
        match: /bill passage|policy intelligence graph/i,
        noun: 'bill', backLabel: 'All bills',
        nameF: 'bill_name', stageF: 'current_stage', dateF: 'date_introduced',
        subjectF: 'sector', houseF: 'house', srcF: 'source_url',
        analysis: 'national_bill_analysis.json',
        changesTitle: 'Key changes in the bill', changesF: 'key_changes' },

      { key: 'pipeline', csv: 'national_policy_pipeline.csv',
        match: /policy pipeline/i,
        noun: 'policy', backLabel: 'All policies',
        nameF: 'policy_name', stageF: 'stage', dateF: 'date_reported',
        subjectF: 'ministry', srcF: 'source_url',
        analysis: 'national_policy_pipeline_analysis.json',
        changesTitle: 'Why it matters', changesF: 'why_it_matters' },

      { key: 'question', csv: 'national_question_database.csv',
        match: /parliamentary question/i,
        noun: 'question', backLabel: 'All questions',
        nameF: 'subject', stageF: 'question_type', dateF: 'date',
        subjectF: 'ministry', houseF: 'house', srcF: 'source_url',
        analysis: 'national_question_database_analysis.json',
        changesTitle: 'Why it matters', changesF: 'why_it_matters' },

      { key: 'regulatory', csv: 'national_regulatory_watch.csv',
        match: /regulatory (body )?watch/i,
        noun: 'notice', backLabel: 'All notices',
        nameF: 'title', stageF: 'action_type', dateF: 'date',
        subjectF: 'regulator', srcF: 'detail_url', pdfF: 'pdf_url',
        analysis: 'national_regulatory_watch_analysis.json',
        changesTitle: 'Possible effects', changesF: 'possible_effects' },

      // Tenders are a procurement record, not a legislative one: the "stage" is a
      // bid status and the "date" is a closing deadline. The impact question is
      // also different — a bill's reach is qualitative, a tender's is a contract
      // size — so this desk adds a scale test the others do not have.
      { key: 'tender', csv: 'national_tender_aggregator.csv',
        match: /central tender|tender aggregator/i,
        noun: 'tender', backLabel: 'All tenders',
        nameF: 'tender_title', stageF: 'status', dateF: 'deadline',
        subjectF: 'sector', srcF: 'source_url',
        analysis: 'national_tender_aggregator_analysis.json',
        changesTitle: 'What is being procured', changesF: 'scope_items',
        // CPPP prefixes its widget rows with a serial number that is not part of
        // the tender's name.
        cleanName: function (n) { return String(n || '').replace(/^\s*\d{1,4}[.)]\s*/, '').trim(); } },

      /* ---- hoist desks ----
         These have no linkage model to build: what the reader wants is the detail
         card the terminal ALREADY writes under the row (analysis brief, timeline,
         documents, all fields, cross-links). So the merge here is literal — that
         card is moved into the Analytics pane rather than re-authored, which is
         both the faithful reading of "show it in Analytics" and the only version
         that cannot drift from what the desk itself says. */
      { key: 'affidavit',  mode: 'hoist', match: /candidate affidavit/i,
        noun: 'candidate', backLabel: 'All candidates' },
      { key: 'delim',      mode: 'hoist', match: /delimitation (impact )?simulator/i,
        noun: 'scenario',  backLabel: 'All scenarios' },
      { key: 'manifesto',  mode: 'hoist', match: /manifestos? (&|and) promises|manifestos? .*tracker/i,
        noun: 'promise',   backLabel: 'All promises' },
      { key: 'mpcard',     mode: 'hoist', match: /mp report cards|mp profiles/i,
        noun: 'record',    backLabel: 'All records' },
      { key: 'transfer',   mode: 'hoist', match: /ias\/ips transfers|bureaucratic transfers/i,
        noun: 'posting',   backLabel: 'All postings' },
      { key: 'cabinet',    mode: 'hoist', match: /cabinet decisions/i,
        noun: 'decision',  backLabel: 'All decisions' },
      { key: 'projects',   mode: 'hoist', match: /central projects|centre-sanctioned projects/i,
        noun: 'programme', backLabel: 'All programmes' },
      { key: 'budget',     mode: 'hoist', match: /budget (&|and) schemes|budget utilisation/i,
        noun: 'line',      backLabel: 'All lines' }
    ];
    function isHoist(cfg) { return !!(cfg && cfg.mode === 'hoist'); }
    var HOIST_GEN = 0;   // retires a pending hoist when a newer row is selected

    /* ---------------- tender scale ----------------
       "Big enough to matter" is not a judgement call here — Indian procurement law
       already draws the lines, so the bands below are the statutory ones rather
       than round numbers picked to look tidy:
         Rs 50 lakh   GFR 2017 Rule 162 — ceiling for a Limited Tender Enquiry.
                      At or under it, a contract is a routine work order.
         Rs 2 crore   GeM's own cut-off for a "high-value" bid.
         Rs 200 crore GFR 2017 Rule 161(iv), as amended 15 May 2020 — no Global
                      Tender Enquiry may be invited at or below this figure, so
                      crossing it is what admits foreign bidders.
       Company-level impact is asserted only from the Rs 2 crore band upward. */
    // The boundaries are inclusive/exclusive exactly as the rules are written:
    // Rule 162 permits an LTE "up to Rs 50 lakhs", so Rs 50 lakh itself is still
    // routine; GeM's high-value bar is "Rs 2 crore and above"; and Rule 161(iv)
    // bars a GTE "upto Rs. 200 Crore", so Rs 200 crore exactly does NOT clear it.
    var TSCALE = [
      { k: 'routine',     label: 'Routine',     hit: function (n) { return n <= 5e6; },
        note: 'at or below the Rs 50 lakh limited-tender ceiling (GFR 2017 Rule 162)' },
      { k: 'standard',    label: 'Standard',    hit: function (n) { return n > 5e6 && n < 2e7; },
        note: 'above the limited-tender ceiling but below GeM\u2019s high-value bar' },
      { k: 'substantial', label: 'Substantial', hit: function (n) { return n >= 2e7 && n <= 2e9; },
        note: 'at or above GeM\u2019s Rs 2 crore high-value bid cut-off' },
      { k: 'major',       label: 'Major',       hit: function (n) { return n > 2e9; },
        note: 'above the Rs 200 crore global-tender bar (GFR 2017 Rule 161(iv))' }
    ];
    // Parses the value field in the shapes an Indian procurement feed actually
    // uses: a plain figure, a grouped figure, or a crore/lakh phrase.
    function tenderValue(rec) {
      var raw = String((rec && rec.value_inr) || '').trim();
      if (!raw) return { known: false, raw: '' };
      var t = raw.toLowerCase().replace(/,/g, '');
      // A negative figure is corrupt data, not a small tender — reject it rather
      // than silently dropping the sign and calling it Rs 500.
      if (/-\s*[0-9]/.test(t)) return { known: false, raw: raw };
      var m = t.match(/([0-9]+(?:\.[0-9]+)?)\s*([a-z]*)/);
      if (!m) return { known: false, raw: raw };
      var n = parseFloat(m[1]); if (!isFinite(n) || n <= 0) return { known: false, raw: raw };
      var u = m[2] || '';
      // A unit that follows the figure but is not recognised must REJECT the value,
      // not fall through as plain rupees: "2 Crs" silently becoming Rs 2 turns a
      // Rs 2 crore contract into a routine one and prints a figure that appears in
      // no source.
      if (!u) return { known: true, raw: raw, n: n };
      if (/^crores?$|^crs?$/.test(u)) return { known: true, raw: raw, n: n * 1e7 };
      if (/^lakhs?$|^lacs?$/.test(u)) return { known: true, raw: raw, n: n * 1e5 };
      if (/^thousands?$|^k$/.test(u)) return { known: true, raw: raw, n: n * 1e3 };
      if (/^millions?$|^mn$/.test(u)) return { known: true, raw: raw, n: n * 1e6 };
      if (/^billions?$|^bn$/.test(u)) return { known: true, raw: raw, n: n * 1e9 };
      if (/^rs$|^inr$|^rupees?$|^only$|^approx$|^est$/.test(u)) return { known: true, raw: raw, n: n };
      return { known: false, raw: raw };
    }
    function tenderScale(v) {
      if (!v || !v.known) return null;
      for (var i = 0; i < TSCALE.length; i++) { if (TSCALE[i].hit(v.n)) return TSCALE[i]; }
      return TSCALE[0];
    }
    // Compact form for the fact tile, which is ~120px wide: "24.5 Cr", "40 L".
    function inrShort(n) {
      if (n == null || !isFinite(n)) return '';
      if (n >= 1e7) return (n / 1e7).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + ' Cr';
      if (n >= 1e5) return (n / 1e5).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + ' L';
      return Math.round(n).toLocaleString('en-IN');
    }
    // Rs 1,23,45,678 -> "Rs 1.23 crore". Indian grouping, not thousands.
    function inr(n) {
      if (n == null || !isFinite(n)) return '\u2014';
      if (n >= 1e7) return 'Rs ' + (n / 1e7).toFixed(n >= 1e9 ? 0 : 2).replace(/\.00$/, '') + ' crore';
      if (n >= 1e5) return 'Rs ' + (n / 1e5).toFixed(n >= 1e7 ? 0 : 2).replace(/\.00$/, '') + ' lakh';
      return 'Rs ' + Math.round(n).toLocaleString('en-IN');
    }
    // Whether the graph is allowed to name companies for this record.
    function tenderNamesCompanies(model) {
      if (!model || !model.cfg || model.cfg.key !== 'tender') return true;
      var sc = model.tender && model.tender.scale;
      return !!(sc && (sc.k === 'substantial' || sc.k === 'major'));
    }

    /* ---------------- terminal globals (guarded) ---------------- */
    function curCsv() {
      try { if (typeof curFeatureCsv === 'function') return curFeatureCsv() || ''; } catch (e) {}
      var f = curFeature(); return (f && f.dataSource && f.dataSource.csv) || '';
    }
    function curFeature() { try { if (typeof currentFeature === 'function') return currentFeature(); } catch (e) {} return null; }
    function rowsFor(csv) {
      try { if (typeof rowsForCsv === 'function') { var r = rowsForCsv(csv); if (r && r.length) return r; } } catch (e) {}
      try { if (typeof CSV === 'function') { var c = CSV(); if (c && c[csv]) return c[csv]; } } catch (e) {}
      try { if (typeof EMBEDDED_CSV_DATA !== 'undefined' && EMBEDDED_CSV_DATA[csv]) return EMBEDDED_CSV_DATA[csv]; } catch (e) {}
      return [];
    }
    function recAnalysis(cfg, id) {
      if (!cfg || !cfg.analysis || id == null) return null;
      try { if (typeof EMBEDDED_JSON_DATA !== 'undefined') { var A = EMBEDDED_JSON_DATA[cfg.analysis]; if (A) return A[String(id)] || null; } } catch (e) {}
      return null;
    }
    function billAnalysis(model) { return model ? recAnalysis(model.cfg, model.bill.id) : null; }
    function featureTitle() {
      var f = curFeature(); if (f && f.feature) return f.feature;
      var el = document.querySelector('#detail .detail-title'); return el ? (el.textContent || '').trim() : '';
    }
    // The active desk is decided by the CSV when we can see it, and by the
    // feature title otherwise — titles are shortened in the nav ("Bill Passage
    // Index" vs "Bill Passage Probability Index"), so neither signal alone is enough.
    // The hoist desks are National-only, and several of their titles ("Cabinet
    // Decisions", "Budget & Schemes") also exist on other tiers against different
    // data. The sidebar is the one honest tier signal in the DOM, so it gates them.
    function natActive() {
      var list = document.getElementById('sidebarList'); if (!list) return false;
      var hit = 0, want = (typeof NAT_ORDER !== 'undefined' && NAT_ORDER) || [];
      if (!want.length) return false;
      list.querySelectorAll('.niy-acc-name').forEach(function (n) {
        if (want.indexOf((n.textContent || '').trim()) >= 0) hit++;
      });
      return hit >= 3;
    }
    // Two signals, and during a desk swap they disagree for about a second: the
    // title updates on one tick and the feed on another. Trusting either alone
    // opens the wrong desk's view over the other desk's rows — a bill's linkage
    // brain rendered over the affidavit table, which is what happened when this
    // was title-first. So they have to agree, and when they don't we stand down.
    function activeFeature() {
      var csv = curCsv(), t = featureTitle(), i;
      var byCsv = null, byTitle = null;
      for (i = 0; i < FEATURES.length; i++) { if (csv && FEATURES[i].csv === csv) { byCsv = FEATURES[i]; break; } }
      for (i = 0; i < FEATURES.length; i++) {
        if (!FEATURES[i].match.test(t)) continue;
        if (isHoist(FEATURES[i]) && !natActive()) continue;   // hoist desks are National-only
        byTitle = FEATURES[i]; break;
      }
      if (byTitle && csv) {
        // the title names a csv-backed desk, but the feed is showing another one
        if (byTitle.csv && byTitle.csv !== csv) return byCsv;
        // the title names a hoist desk while the feed still holds a tracked csv
        if (isHoist(byTitle) && byCsv) return byCsv;
      }
      return byTitle || byCsv;
    }
    function billViewActive() { return !!activeFeature(); }
    function analyticsPane() { return document.querySelector('#detail .niy-pane-analytics'); }

    /* ---------------- read the clicked row ---------------- */
    function billFromRow(row, cfg) {
      cfg = cfg || activeFeature(); if (!cfg) return null;
      var csv = cfg.csv;
      var rows = rowsFor(csv);
      var a = row.getAttribute('data-raw-idx'); if (a == null) a = row.getAttribute('data-row-idx');
      var idx = parseInt(a, 10);
      var rec = (!isNaN(idx) && rows[idx]) ? rows[idx] : null;
      var cells = row.querySelectorAll('td');
      var cellName = cells[0] ? (cells[0].textContent || '').replace(/^[▸▾▶\s]+/, '').trim() : '';
      // A sane bill title is short; anything longer is a panel/blob and must not be
      // trusted as a name (belt-and-braces against the accordion-row case).
      if (cellName.length > 160) cellName = '';
      // Index-vs-display mismatch is silent and catastrophic (right name, wrong
      // record → wrong graph). Always cross-check the indexed row against the
      // name actually on screen, and fall back to a name lookup when they differ.
      // The name may not be in the first cell on every desk (Regulatory Watch puts
      // the regulator first), so cross-check the row's whole text, not just cell 0.
      var rowText = norm(row.textContent || '');
      var nn = norm(cellName);
      function nameOf(r) { return r ? String(r[cfg.nameF] || '') : ''; }
      if (!rec || (nn && norm(nameOf(rec)) !== nn && rowText.indexOf(norm(nameOf(rec))) < 0)) {
        var found = null;
        for (var i = 0; i < rows.length; i++) {
          var cand = norm(nameOf(rows[i]));
          if (!cand) continue;
          if (cand === nn || (cand.length > 8 && rowText.indexOf(cand) >= 0)) { found = rows[i]; break; }
        }
        if (found) rec = found;
      }
      var name = nameOf(rec) || cellName;
      if (name && typeof cfg.cleanName === 'function') { try { name = cfg.cleanName(name) || name; } catch (e) {} }
      if (!name) return null;
      var rawDate = rec && cfg.dateF ? String(rec[cfg.dateF] || '') : '';
      return {
        rec: rec, cfg: cfg, csv: csv, name: name,
        id: rec && rec.id != null ? rec.id : (rec ? String(rows.indexOf(rec)) : null),
        stage: (rec && cfg.stageF ? String(rec[cfg.stageF] || '') : '') || '',
        introduced: rawDate ? rawDate.split(' ')[0] : '',
        sector: (rec && cfg.subjectF ? String(rec[cfg.subjectF] || '') : '') || ''
      };
    }

    /* ---------------- PRIMARY: live Brain graph ---------------- */
    function tokenOverlap(a, b) {
      var A = a.split(' ').filter(Boolean), B = b.split(' ').filter(Boolean); if (!A.length || !B.length) return 0;
      var set = {}; B.forEach(function (t) { set[t] = 1; }); var hit = 0; A.forEach(function (t) { if (set[t]) hit++; });
      return 100 * hit / Math.max(A.length, B.length);
    }
    function getGraph() {
      try {
        var NB = window.NiyBrain; if (!NB || !NB.graph) return null;
        var g = NB.graph.get && NB.graph.get(); if (g && g.nodes) return g;
        g = NB.graph.ensure && NB.graph.ensure(); return (g && g.nodes) ? g : null;
      } catch (e) { return null; }
    }
    function ontName(kind, id) {
      if (!id) return '';
      try { var ix = window.NiyBrain.ontology; var o = ix[kind] && ix[kind](id); return (o && o.name) || String(id); } catch (e) { return String(id); }
    }
    function brainModel(bill) {
      var G = getGraph(); if (!G) return null;
      var ix = null; try { ix = window.NiyBrain.ontology; } catch (e) {}
      var evId = null, ev = null;
      if (bill.id != null) { evId = 'event:' + bill.csv + '#' + bill.id; ev = G.nodes[evId]; }
      if (!ev) {
        var nn = norm(bill.name), best = null, bs = -1;
        for (var id in G.nodes) {
          var n = G.nodes[id]; if (!n || n.type !== 'event' || n.dataset !== bill.csv) continue;
          var ln = norm(n.label); if (!ln) continue;
          var sc = (ln === nn) ? 100 : ((ln.indexOf(nn) >= 0 || nn.indexOf(ln) >= 0) ? 72 : tokenOverlap(ln, nn));
          if (sc > bs) { bs = sc; best = n; }
        }
        if (best && bs >= 55) { ev = best; evId = best.id; }
      }
      if (!ev) return null;
      var companies = [], sectorsMap = {}, segMap = {};
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i]; if (e.from !== evId) continue;
        if (e.type === 'TOUCHES') {
          var co = G.nodes[e.to]; if (!co) continue;
          var band = e.band || scoreBand(e.structural != null ? e.structural : e.score);
          var via = e.via || {};
          var sid = via.sector;
          if (!sid && ix) { try { var c = ix.company((co.id || '').slice(8)); sid = c && c.sector; } catch (_) {} }
          var viaLabel = '';
          var viaInst = via.institution ? ontName('institution', via.institution) : '';
          if (e.path === 'P2') viaLabel = (viaInst ? viaInst + ' → ' : '') + ontName('sector', sid);
          else if (e.path === 'P3') viaLabel = ontName('theme', via.theme);
          else if (e.path === 'P4') viaLabel = ontName('commodity', via.commodity);
          else if (e.path === 'P5') viaLabel = via.geography || '';
          companies.push({
            nt: 'company', id: co.id, name: co.label, band: okBand(band), path: e.path, viaLabel: viaLabel, viaInst: viaInst,
            sectorName: sid ? ontName('sector', sid) : '',
            score: (e.salience != null ? e.salience : e.structural) || 0
          });
          if (sid) {
            var prev = sectorsMap[sid];
            sectorsMap[sid] = { nt: 'sector', id: sid, name: ontName('sector', sid), band: okBand(stronger(prev && prev.band, band)), n: ((prev && prev.n) || 0) + 1 };
          }
        } else if (e.type === 'ON_THEME') {
          var th = G.nodes[e.to]; if (th) segMap['t:' + e.to] = { nt: 'segment', id: e.to, name: th.label, kind: 'theme', band: 'Moderate' };
        } else if (e.type === 'MENTIONS') {
          var t = G.nodes[e.to]; if (!t) continue;
          if (t.type === 'institution') segMap['i:' + e.to] = { nt: 'segment', id: e.to, name: t.label, kind: 'institution', band: 'Strong' };
          else if (t.type === 'commodity') segMap['c:' + e.to] = { nt: 'segment', id: e.to, name: t.label, kind: 'commodity', band: 'Moderate' };
          else if (t.type === 'geography') segMap['g:' + e.to] = { nt: 'segment', id: e.to, name: t.label, kind: 'geography', band: 'Weak' };
        }
      }
      if (!companies.length && !Object.keys(sectorsMap).length && !Object.keys(segMap).length) return null;
      companies.sort(function (a, b) { return (BORD[b.band] - BORD[a.band]) || (b.score - a.score); });
      return { source: 'brain', cfg: bill.cfg, bill: bill, companies: companies, sectors: objVals(sectorsMap), segments: objVals(segMap) };
    }

    /* ---------------- FALLBACK: Brain ontology ---------------- */
    function ontologyModel(bill) {
      var O = window.NIY_BRAIN_ONTOLOGY; if (!O) return null;
      var text = ' ' + norm((bill.name || '') + ' ' + (bill.sector || '')) + ' ';
      if (norm(bill.name) === '') return null;
      // Whole-token match only — a naive substring match fires "cement" inside
      // "advancement" and "finance" inside "refinance".
      function inText(phrase) { var q = norm(phrase); return !!q && q.length > 1 && text.indexOf(' ' + q + ' ') >= 0; }
      function hitKw(list) { if (!list) return false; for (var i = 0; i < list.length; i++) { if (inText(list[i])) return true; } return false; }
      var secHit = {}, themeHit = {}, instHit = {}, commHit = {};
      var secDirect = {};
      (O.sectors || []).forEach(function (s) { if (inText(s.name) || hitKw(s.keywords)) { secHit[s.id] = s; secDirect[s.id] = 1; } });
      (O.themes || []).forEach(function (t) { if (inText(t.name) || hitKw(t.keywords)) themeHit[t.id] = t; });
      (O.commodities || []).forEach(function (c) { if (inText(c.name) || hitKw(c.keywords)) commHit[c.id] = c; });
      (O.institutions || []).forEach(function (ins) {
        var al = (ins.aliases || []).concat([ins.name]);
        for (var i = 0; i < al.length; i++) { if (norm(al[i]).length > 2 && inText(al[i])) { instHit[ins.id] = ins; break; } }
      });
      var sMeta = {}; (O.sectors || []).forEach(function (s) { sMeta[s.id] = s; });
      var govBy = {};
      Object.keys(instHit).forEach(function (id) {
        (instHit[id].governs || []).forEach(function (sid) { if (sMeta[sid]) { if (!secHit[sid]) secHit[sid] = sMeta[sid]; govBy[sid] = instHit[id].name; } });
      });

      var comps = {};
      (O.companies || []).forEach(function (c) {
        var al = (c.aliases || []).concat([c.name, c.legalName]); var named = false;
        for (var i = 0; i < al.length; i++) { if (norm(al[i]).length >= 3 && inText(al[i])) { named = true; break; } }
        var secName = sMeta[c.sector] ? sMeta[c.sector].name : c.sector;
        if (named) { comps[c.id] = { nt: 'company', id: 'company:' + c.id, name: c.name, band: 'Strong', path: 'P1', viaLabel: '', sectorName: secName, score: 3 }; return; }
        if (secHit[c.sector]) {
          comps[c.id] = comps[c.id] || { nt: 'company', id: 'company:' + c.id, name: c.name, band: 'Moderate', path: 'P2', sectorName: secName,
            viaInst: govBy[c.sector] || '', viaLabel: (govBy[c.sector] ? govBy[c.sector] + ' → ' : '') + secName, score: 2 }; return;
        }
        var th = (c.themes || []).filter(function (t) { return themeHit[t]; })[0];
        if (th) { comps[c.id] = comps[c.id] || { nt: 'company', id: 'company:' + c.id, name: c.name, band: 'Weak', path: 'P3', viaLabel: themeHit[th].name, sectorName: secName, score: 1 }; return; }
        (c.exposures || []).forEach(function (e) {
          if (e && e.type === 'commodity' && commHit[e.id] && !comps[c.id]) comps[c.id] = { nt: 'company', id: 'company:' + c.id, name: c.name, band: 'Weak', path: 'P4', viaLabel: commHit[e.id].name, sectorName: secName, score: 1 };
        });
      });

      var sectors = Object.keys(secHit).map(function (id) {
        return { nt: 'sector', id: id, name: secHit[id].name, band: secDirect[id] ? 'Strong' : 'Moderate', n: 0 };
      });
      // The bill's OWN declared sector/ministry is metadata on record, not an
      // inference — always surface it so no bill renders as a blank graph.
      if (bill.sector) {
        var raw = String(bill.sector).trim();
        if (norm(raw) && !sectors.some(function (s) { return norm(s.name) === norm(raw); })) {
          sectors.unshift({ nt: 'sector', id: 'raw:' + norm(raw), name: titleCase(raw), band: 'Moderate', n: 0, declared: true });
        }
      }
      var segs = [];
      Object.keys(instHit).forEach(function (id) { segs.push({ nt: 'segment', id: id, name: instHit[id].name, kind: 'institution', band: 'Strong' }); });
      Object.keys(themeHit).forEach(function (id) { segs.push({ nt: 'segment', id: id, name: themeHit[id].name, kind: 'theme', band: 'Moderate' }); });
      Object.keys(commHit).forEach(function (id) { segs.push({ nt: 'segment', id: id, name: commHit[id].name, kind: 'commodity', band: 'Moderate' }); });
      var companies = objVals(comps).sort(function (a, b) { return (BORD[b.band] - BORD[a.band]) || (b.score - a.score); });
      if (!companies.length && !sectors.length && !segs.length) return null;
      return { source: 'ontology', cfg: bill.cfg, bill: bill, companies: companies, sectors: sectors, segments: segs };
    }

    /* ---------------- the impact prose ----------------
       Every sentence below is assembled from data already on record: the bill's
       own extracted brief, its sector tag, and the derivation path the Brain
       used. Nothing is generated about what a bill "will do" to a company, and
       the wording never implies a bill names a company unless the path is P1. */

    // The prose below is written with "bill" as the record noun because that is the
    // desk it was written for. W() rewrites it for whichever desk is open. It is only
    // ever applied to strings authored HERE — never to entity names, which must not
    // be rewritten.
    function nounOf(m) { return (m && m.cfg && m.cfg.noun) || 'bill'; }
    function W(t, m) {
      var noun = nounOf(m || VIEW.model);
      if (!t || noun === 'bill') return t;
      return String(t)
        .replace(/\bbill’s\b/g, noun + '’s')
        .replace(/\bThe bill\b/g, 'The ' + noun)
        .replace(/\bthe bill\b/g, 'the ' + noun)
        .replace(/\bthis bill\b/g, 'this ' + noun)
        .replace(/\bBill\b/g, titleCase(noun))
        .replace(/\bbill\b/g, noun);
    }

    var PATHS = [
      { p: 'P1', head: 'Named on the bill’s record',
        why: function () { return 'The company’s name appears in the text held for this bill in the tracker. This is the only path where the record names the company itself, rather than reaching it through a sector, theme or commodity.'; } },
      { p: 'P2', head: 'Through the ministry or regulator',
        why: function (via, it) {
          var inst = (it && it.viaInst) || '', sec = (it && it.sectorName) || 'this sector';
          if (inst) return 'The bill is an action by ' + inst + ', which governs ' + sec +
            '. Every company in that sector is exposed to the rule change, so this link is sector-level — the bill does not name these companies individually.';
          return 'The bill lands on ' + sec + ' and these companies sit in that sector, so the exposure is sector-level — the bill does not name them individually.';
        } },
      { p: 'P3', head: 'Through a policy theme',
        why: function (via, it) { return 'The bill engages the ' + (via || 'policy') + ' theme, and these companies carry that theme in their business mix. The link is thematic, not a mention.'; } },
      { p: 'P4', head: 'Through a commodity',
        why: function (via, it) { return 'The bill moves conditions around ' + (via || 'a commodity') + ', and these companies produce or consume it, so their input or output economics shift with it.'; } },
      { p: 'P5', head: 'Through foreign exposure',
        why: function (via, it) { return 'These companies run declared operations in ' + (via || 'the named geography') + ' in a matching line of business, so a cross-border measure reaches them there.'; } }
    ];
    function pathMeta(p) { for (var i = 0; i < PATHS.length; i++) if (PATHS[i].p === p) return PATHS[i]; return { p: p, head: 'Connected', why: function () { return ''; } }; }

    function whatItDoes(model) {
      if (model && model.cfg && model.cfg.key === 'tender') { try { return tenderWhatItDoes(model); } catch (e) {} }
      var a = billAnalysis(model);
      // Every field below is defensive: the analysis JSON is external data and a
      // string where an array is expected must not throw (or silently render
      // the first two CHARACTERS of a brief).
      function arr(v) { return Array.isArray(v) ? v : (v ? [String(v)] : []); }
      if (a && a.brief && String(a.brief).trim().length > 30) return String(a.brief).trim();
      var cf = (model.cfg && model.cfg.changesF) || 'key_changes';
      var kc = a ? arr(a[cf]) : [];
      if (kc.length) return kc.slice(0, 2).join(' ');
      var bits = [];
      var secs = a ? arr(a.sectors) : [];
      var noun = (model.cfg && model.cfg.noun) || 'record';
      var secTag = secs.length ? secs.join(', ') : (model.bill.sector ? titleCase(model.bill.sector) : '');
      if (secTag) bits.push('This ' + noun + ' is tagged to ' + secTag + '.');
      var kt = a ? arr(a.key_terms) : [];
      if (kt.length) bits.push('Its text turns on ' + kt.slice(0, 4).join(', ') + '.');
      if (!bits.length) bits.push('No brief has been extracted for this ' + noun + ' yet — the impact below is derived from its subject matter and the body behind it.');
      return bits.join(' ');
    }

    function universeLabel() {
      try { var n = (window.NIY_BRAIN_ONTOLOGY.companies || []).length; if (n) return 'the Brain’s ' + n + '-company universe'; } catch (e) {}
      return 'the Brain’s company universe';
    }
    function whereItLands(model) {
      var nC = model.companies.length, nS = model.sectors.length, nG = model.segments.length;
      function nBand(b) { return model.companies.filter(function (c) { return c.band === b; }).length; }
      var strong = nBand('Strong'), mod = nBand('Moderate'), weak = nBand('Weak'), spec = nBand('Speculative');
      var s = '';
      // A tender with no companies shown is usually a tender whose companies were
      // WITHHELD on size, which is the opposite of "nothing resolved". Saying the
      // generic line here would be a plain falsehood, so tenders answer for
      // themselves.
      if (!nC && model.cfg && model.cfg.key === 'tender') {
        var t = model.tender || {}, nE = (t.eligible || []).length;
        if (nE) {
          return 'This tender reaches ' + (nS ? nS + ' ' + plural(nS, 'sector') : 'no tracked sector') +
                 (nG ? ' and ' + nG + ' ' + plural(nG, 'segment') : '') + '. ' +
                 nE + ' ' + plural(nE, 'company', 'companies') + ' in those sectors could bid for it, but ' +
                 (t.value && t.value.known
                   ? 'at ' + inr(t.value.n) + ' the contract is below the Rs 2 crore high-value bar, so no company is shown as impacted.'
                   : 'no contract value is published, so no company is shown as impacted.');
        }
        return 'This tender reaches ' + (nS ? nS + ' ' + plural(nS, 'sector') : 'no tracked sector') +
               (nG ? ' and ' + nG + ' ' + plural(nG, 'segment') : '') +
               ', and no company in the Brain’s universe resolves to its scope.';
      }
      if (!nC) {
        // Do NOT assert WHY there is no company link. Zero companies can mean the
        // measure is administrative, or simply that its subject sits outside the
        // ontology's 259-company coverage — the graph cannot tell those apart, so
        // it says so rather than picking the flattering reading.
        s = 'No company in ' + universeLabel() + ' resolves to this bill, so it draws no company-level link. ' +
            'It reaches ' + (nS ? nS + ' ' + plural(nS, 'sector') : 'no tracked sector') +
            (nG ? ' and ' + nG + ' ' + plural(nG, 'segment') : '') + '. ' +
            'That either means the measure is administrative rather than market-facing, or that its subject sits outside the ontology’s current company coverage — the graph does not guess between the two.';
        return s;
      }
      s = 'The impact fans out to ' + nC + ' ' + plural(nC, 'company', 'companies') +
          ' across ' + nS + ' ' + plural(nS, 'sector') +
          (nG ? ', plus ' + nG + ' related ' + plural(nG, 'segment') : '') + '. ';
      var parts = [];
      if (strong) parts.push(strong + ' strong');
      if (mod) parts.push(mod + ' moderate');
      if (weak) parts.push(weak + ' weak');
      if (spec) parts.push(spec + ' speculative');
      s += 'By strength that is ' + parts.join(', ') + ' ' + plural(strong + mod + weak + spec, 'link') + '. ';
      var top = model.companies[0];
      if (top) s += 'The tightest exposure sits with ' + top.name + (top.sectorName ? ' (' + top.sectorName + ')' : '') + '. ';
      s += strong ? '' : 'No connection here is strong enough to imply a direct, company-specific consequence.';
      return W(s.trim(), model);
    }

    /* ---------------- where tender data comes from ----------------
       Three routes, and they are not interchangeable. The terminal reads CPPP
       today, which is why every tender renders unscored: that feed publishes no
       contract value. GeM is the route that would fix that. BidAssist is the paid
       shortcut. Each entry says what it GIVES and what it LACKS, because the gap
       between them is the whole reason this desk cannot score anything yet. */
    var TENDER_SOURCES = [
      { k: 'cppp', role: 'feed', roleLabel: 'Live feed',
        name: 'CPPP — Central Public Procurement Portal',
        access: 'Open, no login',
        gives: 'Tender title, closing date and time, status, and a direct link. This is what the terminal reads today: the portal’s “Latest Tenders” widget, which carries about ten currently-active notices and refreshes every 15 minutes.',
        lacks: 'No contract value, department, sector or location — the widget does not publish them, which is why every tender on this desk is unscored. The e-Publishing app adds browsing by closing date, location, classification and archive, and a Results of Tenders (AOC) list, but neither exposes an estimated or an awarded value: the AOC listing carries only date, title/reference, organisation chain and the AOC link.',
        links: [
          ['e-Publishing portal', 'https://eprocure.gov.in/epublish/app'],
          ['Results of Tenders (AOC)', 'https://eprocure.gov.in/epublish/app?page=ResultOfTenders&service=page'],
          ['Tenders by organisation', 'https://eprocure.gov.in/epublish/app?page=FrontEndTendersByOrganisation&service=page']
        ] },
      { k: 'gem', role: 'enrich', roleLabel: 'Adds value',
        name: 'GeM — Government e-Marketplace (BidPlus)',
        access: 'Open to browse; bulk reporting needs a registered account',
        gives: 'Bid listings carrying a value, filterable by value band — GeM treats a bid of Rs 2 crore and above as high-value, the same cut-off this desk scores against — plus buying organisation and item category. This is the route that would let every tender here be scored instead of left unscored.',
        lacks: 'Not read by this session: gem.gov.in disallows automated retrieval in robots.txt, so the fields above come from GeM’s published search documentation, not from a page this build fetched. Treat the field list as unconfirmed until a scrape actually lands.',
        links: [
          ['All bids', 'https://bidplus.gem.gov.in/all-bids'],
          ['Global bids', 'https://bidplus-global.gem.gov.in/'],
          ['GeM statistics', 'https://gem.gov.in/statistics']
        ] },
      { k: 'bidassist', role: 'paid', roleLabel: 'Licensed',
        name: 'BidAssist — commercial aggregator',
        access: 'Paid subscription',
        gives: 'CPPP, GeM and state-portal tenders consolidated into one feed with value, buyer and category already normalised — the fastest way to get a scored tender desk without building three scrapers.',
        lacks: 'Licensed data. The subscription terms, not the technology, decide whether rows can be redistributed inside a terminal, so this is a build-time input to check before it is a source to cite.',
        links: [['Pricing', 'https://bidassist.com/pricing']] }
    ];

    function tenderSourceBlock(model) {
      if (!model || !model.cfg || model.cfg.key !== 'tender') return '';
      var h = '<div class="nmg-sec"><h4 class="nmg-h4">Where tender data comes from</h4>';
      h += TENDER_SOURCES.map(function (s) {
        var role = ['feed', 'enrich', 'paid'].indexOf(s.role) >= 0 ? s.role : 'paid';
        return '<div class="nmg-dsrc nmg-dsrc-' + role + '">' +
          '<div class="nmg-dsrc-h"><span class="nmg-dsrc-n">' + esc(s.name) + '</span>' +
            '<span class="nmg-dsrc-tag">' + esc(s.roleLabel) + '</span></div>' +
          '<div class="nmg-dsrc-a">' + esc(s.access) + '</div>' +
          '<p class="nmg-p"><b>Gives.</b> ' + esc(s.gives) + '</p>' +
          '<p class="nmg-p nmg-p-list"><b>Does not give.</b> ' + esc(s.lacks) + '</p>' +
          '<div class="nmg-dsrc-links">' + s.links.map(function (l) {
            return '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + ' ↗</a>';
          }).join('') + '</div>' +
        '</div>';
      }).join('');
      h += '</div>';
      return h;
    }

    /* The terminal already has one place that answers "where does this come from" —
       the ⓘ Source button, which reads f.sourceMeta. Adding a second answer in the
       pane without updating that one would leave the two disagreeing, so the
       feature's own provenance record is rewritten to match. */
    function patchTenderSourceMeta() {
      if (typeof FEATURE_DATA === 'undefined' || !FEATURE_DATA || !FEATURE_DATA.national) return;
      var list = FEATURE_DATA.national;
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!f || !f.dataSource || f.dataSource.csv !== 'national_tender_aggregator.csv') continue;
        if (f.sourceMeta && f.sourceMeta.__nmg) return;
        var links = [];
        TENDER_SOURCES.forEach(function (s) { s.links.forEach(function (l) { links.push(l[1]); }); });
        f.sourceMeta = {
          __nmg: 1,
          sources: 'CPPP / eProcure (live feed today) · GeM BidPlus (adds contract value) · BidAssist (commercial aggregator)',
          link: links.join(' ; '),
          notes: TENDER_SOURCES.map(function (s) {
            return s.roleLabel.toUpperCase() + ' — ' + s.name + ' (' + s.access + '). GIVES: ' + s.gives + ' DOES NOT GIVE: ' + s.lacks;
          }).join('  ||  '),
          flag: 'No Public API (manual/scrape)',
          clientele: 'Businesses, investors, journalists',
          interactive: 'Tender feed with scale scoring against GFR 2017 and GeM thresholds; sector and eligible-bidder mapping through the Policy Intelligence Graph',
          status: 'Live (CPPP) — value fields pending a GeM or BidAssist ingest'
        };
        return;
      }
    }

    /* ---------------- tenders: scale, then sector, then companies ----------------
       A tender is demand, not law. Its reach is therefore a question of size:
       a boundary-wall repair and a national highway package are the same KIND of
       record and nothing alike in effect. So the model is scored before it is
       rendered, and company links are withheld below the high-value bar rather
       than shown with a caveat nobody reads. */
    function applyTenderScale(model, bill) {
      // A tender whose text matches nothing in the ontology still has a size, a
      // buyer and a deadline — all of which the desk is there to show. Dropping to
      // the bare "no link" paragraph would throw that away, so the tender desk
      // always gets a model, even an empty one.
      if (!model && bill && bill.cfg && bill.cfg.key === 'tender') {
        model = { source: 'ontology', cfg: bill.cfg, bill: bill, companies: [], sectors: [], segments: [] };
      }
      if (!model || !model.cfg || model.cfg.key !== 'tender') return model;
      var v = tenderValue(model.bill.rec || {});
      var sc = tenderScale(v);
      // Keep the full list even when it is not asserted — the pane reports how many
      // firms were eligible, which is a different and honest claim.
      // Who a tender can reach is not who a policy can reach. A firm linked by
      // theme (P3), commodity (P4) or geography (P5) is exposed to a RULE; it is
      // not thereby a bidder for a works contract. Only two paths survive here:
      // the firm is named in the tender text (P1), or it operates in a sector the
      // text resolves to (P2). Keeping the rest would let the prose claim "N firms
      // sit in those sectors" over a table that counts far fewer.
      var secSet = {};
      model.sectors.forEach(function (x) { secSet[norm(x.name)] = 1; });
      var named = model.companies.filter(function (c) { return c.path === 'P1'; });
      // A firm kept because it operates in a resolved sector is reached THROUGH that
      // sector, whatever path first surfaced it. Leaving a theme-derived "Weak · via
      // Digital payments" label on it would make the graph tell a different story
      // from the sector table counting it as a bidder, so it is re-banded to the
      // path that is actually doing the work.
      var inSector = model.companies.filter(function (c) { return c.sectorName && secSet[norm(c.sectorName)]; })
        .map(function (c) {
          if (c.path === 'P1' || c.path === 'P2') return c;
          var d = {}; for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) d[k] = c[k];
          d.path = 'P2'; d.band = 'Moderate'; d.viaInst = ''; d.viaLabel = c.sectorName; d.score = 2;
          return d;
        });
      var inIds = {}; inSector.forEach(function (c) { inIds[c.id] = 1; });
      var namedOnly = named.filter(function (c) { return !inIds[c.id]; });
      model.tender = { value: v, scale: sc, eligible: inSector, named: namedOnly };
      // A name printed on the record is a fact at any contract size, so P1 is never
      // withheld; the sector-level bidder set is.
      model.companies = tenderNamesCompanies(model) ? inSector.concat(namedOnly) : namedOnly.slice();
      return model;
    }

    function tenderWhatItDoes(model) {
      var r = model.bill.rec || {}, bits = [];
      var tt = String(model.bill.name).replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
      bits.push('The notice covers: ' + tt + '.');
      var org = String(r.ministry_department || '').trim();
      if (org) bits.push('It is issued by ' + org + '.');
      if (r.deadline) bits.push('Bids close ' + String(r.deadline).trim() + '.');
      if (r.status) bits.push('The notice is currently ' + String(r.status).trim().toLowerCase() + '.');
      bits.push('This is the tender text as published — no scope has been extracted from the bid documents themselves.');
      return bits.join(' ');
    }

    // One line per sector: how many firms could bid, and what an order of this
    // size actually does there. The verdict column is driven by the scale band,
    // so it can never say "material" about a contract that is not.
    function tenderSectorRows(model) {
      var t = model.tender || {}, sc = t.scale, elig = t.eligible || [];
      var byS = {};
      elig.forEach(function (c) { var k = c.sectorName || 'Unclassified'; byS[k] = (byS[k] || 0) + 1; });
      // eligible is built FROM the resolved sector set, so every key in byS is one of
      // these rows and the column sums to exactly the count the prose quotes.
      var verdict = !sc
        ? 'Scope places the work here; the effect cannot be quantified without a contract value.'
        : (sc.k === 'routine' || sc.k === 'standard')
          ? 'No measurable sector effect — the order is below the size at which sector demand shifts.'
          : sc.k === 'substantial'
            ? 'A high-value order enters the sector’s pipeline; felt by firms with capacity in this line of work.'
            : 'An order of this scale is a visible addition to sector demand and can move the year’s book for whoever wins it.';
      return model.sectors.slice(0, 8).map(function (sec) {
        return { name: sec.name, band: sec.band, n: byS[sec.name] || 0, verdict: verdict };
      });
    }

    function tenderBlock(model) {
      if (!model || !model.cfg || model.cfg.key !== 'tender') return '';
      var t = model.tender || {}, v = t.value || {}, sc = t.scale;
      var elig = t.eligible || [], namedOnly = t.named || [];
      var secNames = model.sectors.slice(0, 4).map(function (s) { return s.name; });
      var anySec = secNames.length > 0;
      var secList = anySec ? secNames.join(', ') : '';
      var nE = elig.length;
      // A company NAMED in the tender text is a different and much stronger claim
      // than "operates in this sector", so it is reported separately and is never
      // folded into the bidder count the sector table has to reconcile with.
      var namedLine = namedOnly.length
        ? ' ' + namedOnly.length + ' ' + plural(namedOnly.length, 'company', 'companies') + ' (' +
          namedOnly.slice(0, 3).map(function (c) { return c.name; }).join(', ') +
          (namedOnly.length > 3 ? ', ' + '\u2026' : '') + ') ' + plural(namedOnly.length, 'is', 'are') +
          ' named in the tender text itself and stays on the graph whatever the contract is worth.'
        : '';
      var head, p1;

      if (!v.known) {
        head = 'Contract value not published';
        p1 = 'The CPPP live-tender widget this feed reads does not publish a contract value, and size is what decides whether a procurement order reaches a sector at all. ' +
             'So this tender is not scored. What follows reads only its scope, from the tender text itself: ' +
             (anySec ? 'the work sits in ' + secList + '. ' : 'nothing in the text resolves to a sector the ontology tracks. ') +
             (nE ? nE + ' ' + plural(nE, 'company', 'companies') + ' in the Brain’s universe operate in ' + plural(model.sectors.length, 'that sector', 'those sectors') + ' and could bid, but they are not shown as impacted — a company link on a tender is a claim about who can win the contract, and that cannot be supported without knowing what the contract is worth.'
                 : 'No company in the Brain’s universe operates in the ' + plural(model.sectors.length, 'sector', 'sectors') + ' this text resolves to.') + namedLine;
      } else if (sc.k === 'routine' || sc.k === 'standard') {
        head = sc.label + ' — ' + inr(v.n);
        p1 = 'At ' + inr(v.n) + ' this is a ' + sc.label.toLowerCase() + ' work order, ' + sc.note + '. ' +
             'A contract this size is a single site’s job, not a sector event: it does not move order books, prices or capacity' +
             (anySec ? ' in ' + secList + '. ' : ' anywhere the graph tracks. ') +
             (nE ? nE + ' ' + plural(nE, 'firm') + ' in the Brain’s universe ' + plural(nE, 'sits', 'sit') + ' in ' + plural(model.sectors.length, 'that sector', 'those sectors') + ' and ' + plural(nE, 'is', 'are') + ' eligible to bid, but naming them as impacted would overstate a contract of this size, so the graph does not.'
                 : 'No company in the Brain’s universe operates in the ' + plural(model.sectors.length, 'sector', 'sectors') + ' this text resolves to.') + namedLine;
      } else {
        head = sc.label + ' — ' + inr(v.n);
        p1 = 'At ' + inr(v.n) + ' this tender is ' + sc.note + ', which is large enough to register as demand' +
             (anySec ? ' in ' + secList + '. ' : ', but nothing in its text resolves to a sector the ontology tracks. ') +
             (nE ? 'The ' + nE + ' ' + plural(nE, 'company', 'companies') + ' below are the firms in the Brain’s universe that sit in ' + plural(model.sectors.length, 'that sector', 'those sectors') + ' — they are who the order flow could reach. The graph does not know who bid or who won: a link here is eligible exposure, not an award.'
                 : 'No company in the Brain’s universe operates in the ' + plural(model.sectors.length, 'sector', 'sectors') + ' this text resolves to, so the order lands on a sector the graph tracks but on no firm it holds.') + namedLine;
      }

      var skey = sc ? sc.k : 'none';
      if (['routine', 'standard', 'substantial', 'major', 'none'].indexOf(skey) < 0) skey = 'none';
      var rows = tenderSectorRows(model);
      var tbl = rows.length
        ? '<table class="nmg-tbl nmg-ttbl"><thead><tr><th>Sector</th><th>Firms that could bid</th><th>What the order does there</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td>' + esc(r.name) + '</td><td class="nmg-tnum">' + r.n + '</td><td>' + esc(r.verdict) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="nmg-p">This tender’s text resolves to no sector the ontology tracks, so there is nothing to score.</p>';

      return '<div class="nmg-sec nmg-tsec">' +
        '<h4 class="nmg-h4">What this tender moves</h4>' +
        '<div class="nmg-tscale nmg-tsc-' + skey + '">' +
          '<span class="nmg-tdot" aria-hidden="true"></span>' +
          '<span class="nmg-tscale-h">' + esc(head) + '</span>' +
          '<span class="nmg-tscale-s">' + esc(v.known ? 'scored against GFR 2017 and GeM thresholds' : 'not scored — no value on record') + '</span>' +
        '</div>' +
        '<p class="nmg-p">' + esc(p1) + '</p>' +
        tbl +
        '<p class="nmg-p nmg-p-list">Bands: Rs 50 lakh is the limited-tender ceiling in GFR 2017 Rule 162; Rs 2 crore is GeM’s high-value bid cut-off; Rs 200 crore is the global-tender bar in GFR 2017 Rule 161(iv) as amended in May 2020. Sector-level company links are asserted only from the Rs 2 crore band upward. Firms linked to this text only by policy theme, commodity or geography are excluded here — those paths describe exposure to a rule, not the ability to win a works contract.</p>' +
        '</div>';
    }

    // Wraps a handler so nothing this feature does can ever throw into the host.
    function safe(fn) { return function (a) { try { return fn.call(this, a); } catch (e) { try { console.warn('[NMG]', e); } catch (_) {} } }; }

    /* ---------------- view state ---------------- */
    var VIEW = { model: null, band: 'all', kind: 'all', fact: null, impact: null, mode: 'graph', pinned: null, showAllCo: false, detail: false, flat: [] };
    var CAP_CO = 12, CAP_CO_MAX = 24, CAP_S = 10, CAP_G = 10;
    function filtered(list) { return VIEW.band === 'all' ? list : list.filter(function (x) { return x.band === VIEW.band; }); }
    function useKind(k) { return VIEW.kind === 'all' || VIEW.kind === k; }
    function shownSectors(m) { return useKind('sector') ? filtered(m.sectors) : []; }
    function shownCompanies(m) { return useKind('company') ? filtered(m.companies) : []; }
    function shownSegments(m) { return useKind('segment') ? filtered(m.segments) : []; }

    /* ================= ANIMATED FORCE GRAPH =================
       A live force simulation on a dark canvas: nodes glow, links carry the
       link-strength colour, the layout settles and can be nudged by dragging.
       Node COLOUR + SHAPE both carry the band (diamond = strong, disc =
       moderate, ring = weak) — the status trio's green↔red pair sits in the
       CVD floor band, which is only legal with that secondary encoding.
       Node TYPE is carried by a horizontal bias (companies right, sectors and
       segments left), the label, and the legend.
       ======================================================== */
    var GCOL = { Strong: '#34D399', Moderate: '#E0A81F', Weak: '#F87171', Speculative: '#8A94A6' };
    var SIM = null;

    function stopSim() { if (SIM && SIM.raf) { cancelAnimationFrame(SIM.raf); SIM.raf = 0; } SIM = null; }

    function graphData(model) {
      var co = shownCompanies(model), se = shownSectors(model), sg = shownSegments(model);
      var coShown = co.slice(0, VIEW.showAllCo ? CAP_CO_MAX : CAP_CO);
      var nodes = [{ id: '__bill', kind: 'bill', name: model.bill.name, sub: model.bill.stage || 'Bill', band: 'Strong', r: 15, bias: 0, item: null }];
      var links = [];
      function add(it, kind, bias, r) {
        var id = kind + ':' + (it.id || it.name);
        nodes.push({ id: id, kind: kind, name: it.name, band: okBand(it.band), r: r, bias: bias, item: it });
        links.push({ s: 0, t: nodes.length - 1, band: okBand(it.band) });
      }
      se.slice(0, CAP_S).forEach(function (x) { add(x, 'sector', -1, 9); });
      sg.slice(0, CAP_G).forEach(function (x) { add(x, 'segment', -1, 7.5); });
      coShown.forEach(function (x) { add(x, 'company', 1, 6.5); });
      return { nodes: nodes, links: links, hiddenCo: co.length - coShown.length, totalCo: co.length };
    }

    function runSim(g, W, H) {
      var N = g.nodes, L = g.links;
      // seed: bill centred, everything else on a ring on its own side
      var leftN = N.filter(function (n) { return n.bias < 0; }).length || 1;
      var rightN = N.filter(function (n) { return n.bias > 0; }).length || 1;
      var li = 0, ri = 0;
      N.forEach(function (n, i) {
        if (i === 0) { n.x = W / 2; n.y = Math.min(H / 2, H - 78); n.vx = n.vy = 0; n.fx = n.x; n.fy = n.y; return; }
        var t, R = Math.min(W, H) * 0.34;
        if (n.bias < 0) { t = Math.PI * (0.55 + 0.9 * (li++ / leftN)); }
        else { t = Math.PI * (-0.45 + 0.9 * (ri++ / rightN)); }
        n.x = W / 2 + R * Math.cos(t) + (i % 5 - 2) * 6;
        n.y = H / 2 + R * Math.sin(t) + (i % 3 - 1) * 6;
        n.vx = n.vy = 0;
      });
      var rest = { Strong: 0.26, Moderate: 0.34, Weak: 0.42, Speculative: 0.46 };
      return {
        nodes: N, links: L, W: W, H: H, alpha: 1, raf: 0,
        tick: function () {
          var a = this.alpha, W2 = this.W, H2 = this.H;
          // repulsion (n is small: 25–40 nodes, so all-pairs is fine)
          for (var i = 0; i < N.length; i++) {
            for (var j = i + 1; j < N.length; j++) {
              var A = N[i], B = N[j], dx = B.x - A.x, dy = B.y - A.y;
              var d2 = dx * dx + dy * dy; if (d2 < 1) { d2 = 1; dx = (i - j) || 1; }
              var d = Math.sqrt(d2);
              var sameSide = (A.bias === B.bias) && A.bias !== 0;
              var minD = (A.r + B.r) * (sameSide ? 3.4 : 2.4);
              var f = (1250 + (d < minD ? 5200 : 0)) / d2 * a;
              var ux = dx / d, uy = dy / d;
              A.vx -= ux * f; A.vy -= uy * f; B.vx += ux * f; B.vy += uy * f;
              // Labels run horizontally, so two same-side nodes at a similar y
              // collide as TEXT even when their discs are far apart. Repulsion is
              // radial and cannot see that — push them apart on y explicitly.
              if (sameSide) {
                var ady = Math.abs(dy);
                if (ady < 19) {
                  var push = (19 - ady) * 0.16 * a * (dy >= 0 ? 1 : -1);
                  A.vy -= push; B.vy += push;
                }
              }
            }
          }
          // springs to the bill
          var minWH = Math.min(W2, H2);
          for (var k = 0; k < L.length; k++) {
            var e = L[k], S = N[e.s], T = N[e.t];
            var ddx = T.x - S.x, ddy = T.y - S.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            var want = minWH * (rest[e.band] || 0.45);
            var sp = (dd - want) * 0.012 * a;
            var sx = ddx / dd * sp, sy = ddy / dd * sp;
            T.vx -= sx; T.vy -= sy; S.vx += sx * 0.15; S.vy += sy * 0.15;
          }
          // side bias + gentle centring
          for (var m = 1; m < N.length; m++) {
            var n = N[m];
            var targetX = W2 / 2 + n.bias * minWH * 0.34;
            n.vx += (targetX - n.x) * 0.022 * a;
            n.vy += (H2 / 2 - n.y) * 0.007 * a;
            n.vx *= 0.86; n.vy *= 0.86;
            if (n.fx == null) { n.x += n.vx; n.y += n.vy; } else { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; }
            // Labels run outward from the node, so the side a node sits on needs
            // room for its text; the top toolbar and bottom legend are no-go bands.
            var padOut = 140, mid = W2 / 2;
            var loX = n.bias < 0 ? padOut : mid + 34, hiX = n.bias > 0 ? W2 - padOut : mid - 34;
            n.x = Math.max(loX, Math.min(hiX, n.x));
            n.y = Math.max(34 + n.r, Math.min(H2 - 42 - n.r, n.y));
          }
          this.alpha *= 0.982;
        }
      };
    }

    function graphCard(model) {
      var g = graphData(model);
      var W = 620, H = Math.max(290, Math.min(660, 150 + g.nodes.length * 15));
      var defs = '';
      ['Strong', 'Moderate', 'Weak', 'Speculative'].forEach(function (b) {
        defs += '<radialGradient id="nmgGlow' + b + '"><stop offset="0%" stop-color="' + GCOL[b] + '" stop-opacity=".55"/>' +
                '<stop offset="55%" stop-color="' + GCOL[b] + '" stop-opacity=".13"/>' +
                '<stop offset="100%" stop-color="' + GCOL[b] + '" stop-opacity="0"/></radialGradient>';
      });
      defs += '<radialGradient id="nmgGlowBill"><stop offset="0%" stop-color="#EE5A2C" stop-opacity=".5"/>' +
              '<stop offset="60%" stop-color="#EE5A2C" stop-opacity=".12"/><stop offset="100%" stop-color="#EE5A2C" stop-opacity="0"/></radialGradient>';

      var linksSvg = g.links.map(function (e, i) {
        return '<line class="nmg-l" data-l="' + i + '" stroke="' + GCOL[e.band] + '" stroke-width="' +
          (e.band === 'Strong' ? 1.7 : e.band === 'Moderate' ? 1.25 : 0.9) + '" stroke-opacity="' +
          (e.band === 'Strong' ? .62 : e.band === 'Moderate' ? .48 : .34) + '" x1="0" y1="0" x2="0" y2="0"/>';
      }).join('');

      var nodesSvg = g.nodes.map(function (n, i) {
        if (i === 0) {
          return '<g class="nmg-n nmg-n-bill" data-n="0">' +
            '<circle class="nmg-halo" r="46" fill="url(#nmgGlowBill)"/>' +
            '<circle r="' + n.r + '" fill="#141B2C" stroke="#EE5A2C" stroke-width="1.8"/>' +
            '<text class="nmg-glabel nmg-glabel-bill" y="' + (n.r + 15) + '" text-anchor="middle">' + esc(clip(n.name, 34)) + '</text>' +
            '<text class="nmg-gsub" y="' + (n.r + 27) + '" text-anchor="middle">' + esc(clip(n.sub, 30)) + '</text></g>';
        }
        var c = GCOL[n.band], shape;
        if (n.band === 'Strong') shape = '<path d="M0 ' + (-n.r) + 'L' + n.r + ' 0L0 ' + n.r + 'L' + (-n.r) + ' 0Z" fill="' + c + '"/>';
        else if (n.band === 'Moderate') shape = '<circle r="' + (n.r * .85) + '" fill="' + c + '"/>';
        else shape = '<circle r="' + (n.r * .8) + '" fill="#0C1322" stroke="' + c + '" stroke-width="2"/>';
        var right = n.bias > 0;
        return '<g class="nmg-n" data-n="' + i + '" tabindex="0" role="button" aria-label="' + esc(n.name + ', ' + BAND_GLOSS[n.band] + ', ' + n.kind) + '">' +
          '<circle class="nmg-halo" r="' + (n.r * 3.1) + '" fill="url(#nmgGlow' + n.band + ')"/>' +
          '<circle class="nmg-hit" r="17" fill="transparent"/>' + shape +
          '<text class="nmg-glabel" x="' + (right ? n.r + 9 : -(n.r + 9)) + '" y="3.5" text-anchor="' + (right ? 'start' : 'end') + '">' +
          esc(clip(n.name, 20)) + '</text></g>';
      }).join('');

      var legend =
        '<div class="nmg-legend">' +
          '<span class="nmg-lg-t">Link strength</span>' +
          ['Strong', 'Moderate', 'Weak'].map(function (b) {
            return '<span class="nmg-lg"><span class="nmg-gl nmg-gl-' + b + '"></span>' + b + '</span>';
          }).join('') +
          '<span class="nmg-lg-sep"></span>' +
          '<span class="nmg-lg nmg-lg-q">← sectors &amp; segments</span>' +
          '<span class="nmg-lg nmg-lg-q">companies →</span>' +
        '</div>';

      return {
        g: g, W: W, H: H,
        html:
          '<div class="nmg-canvas">' +
            '<div class="nmg-gbar">' +
              '<span class="nmg-gcount">' + g.nodes.length + ' nodes · ' + g.links.length + ' links</span>' +
              '<button type="button" class="nmg-gbtn" data-act="fit" title="Re-centre the layout">Fit</button>' +
              '<button type="button" class="nmg-gbtn" data-act="rebuild" title="Re-run the layout">↻ Rebuild</button>' +
            '</div>' +
            legend +
            '<svg class="nmg-gsvg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Impact linkage graph for ' + esc(model.bill.name) + '">' +
              '<defs>' + defs + '</defs>' +
              '<g class="nmg-links">' + linksSvg + '</g><g class="nmg-nodes">' + nodesSvg + '</g>' +
            '</svg>' +
            '<div class="nmg-tip" hidden></div>' +
          '</div>' +
          (g.hiddenCo > 0
            ? '<button type="button" class="nmg-showall">Show all ' + Math.min(g.totalCo, 24) + ' companies in the graph</button>'
            : '')
      };
    }

    function wireGraph(pane, card) {
      var svg = pane.querySelector('.nmg-gsvg'); if (!svg) return;
      var g = card.g, W = card.W, H = card.H;
      var nodeEls = svg.querySelectorAll('.nmg-n'), linkEls = svg.querySelectorAll('.nmg-l');
      var tip = pane.querySelector('.nmg-tip');
      stopSim();
      SIM = runSim(g, W, H);

      function paint() {
        for (var i = 0; i < g.nodes.length; i++) {
          var n = g.nodes[i];
          nodeEls[i].setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')');
        }
        for (var k = 0; k < g.links.length; k++) {
          var e = g.links[k], S = g.nodes[e.s], T = g.nodes[e.t], el = linkEls[k];
          el.setAttribute('x1', S.x.toFixed(1)); el.setAttribute('y1', S.y.toFixed(1));
          el.setAttribute('x2', T.x.toFixed(1)); el.setAttribute('y2', T.y.toFixed(1));
        }
      }
      function loop() {
        if (!SIM || !svg.isConnected) { stopSim(); return; }
        SIM.tick(); paint();
        if (SIM.alpha > 0.006) SIM.raf = requestAnimationFrame(loop);
        else SIM.raf = 0;
      }
      SIM.raf = requestAnimationFrame(loop);
      function reheat(a) { if (!SIM) return; SIM.alpha = Math.max(SIM.alpha, a || 0.45); if (!SIM.raf) SIM.raf = requestAnimationFrame(loop); }

      function hilite(i, on) {
        for (var k = 0; k < g.links.length; k++) {
          var e = g.links[k], hot = (e.t === i || e.s === i);
          linkEls[k].classList.toggle('hot', !!(on && hot));
          linkEls[k].classList.toggle('dim', !!(on && !hot));
        }
        for (var m = 0; m < nodeEls.length; m++) {
          var isMe = (m === i) || (on && m === 0);
          nodeEls[m].classList.toggle('hot', !!(on && isMe));
          nodeEls[m].classList.toggle('dim', !!(on && !isMe));
        }
      }
      function showTip(n, ev) {
        if (!tip || !n || !n.item) return;
        tip.innerHTML = '';
        var a = document.createElement('div'); a.className = 'nmg-tip-n'; a.textContent = n.name;
        var b = document.createElement('div'); b.className = 'nmg-tip-b';
        var sw = document.createElement('span'); sw.className = 'nmg-gl nmg-gl-' + n.band; b.appendChild(sw);
        b.appendChild(document.createTextNode(BAND_GLOSS[n.band] + ' · ' + n.kind + (n.item.path ? ' · ' + n.item.path : '')));
        tip.appendChild(a); tip.appendChild(b);
        if (n.item.viaLabel) { var c = document.createElement('div'); c.className = 'nmg-tip-v'; c.textContent = 'via ' + n.item.viaLabel; tip.appendChild(c); }
        tip.hidden = false; moveTip(ev);
      }
      function moveTip(ev) {
        if (!tip || tip.hidden || !ev) return;
        var host = (pane.querySelector('.nmg-canvas') || pane).getBoundingClientRect(), r = tip.getBoundingClientRect();
        var x = ev.clientX - host.left + 14, y = ev.clientY - host.top + 14;
        if (x + r.width > host.width - 6) x = ev.clientX - host.left - r.width - 14;
        if (y + r.height > host.height - 6) y = Math.max(4, ev.clientY - host.top - r.height - 12);
        tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
      }
      function toSvg(ev) {
        var r = svg.getBoundingClientRect();
        return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
      }
      Array.prototype.forEach.call(nodeEls, function (el, i) {
        if (i === 0) return;
        var dragging = false;
        el.addEventListener('pointerenter', safe(function (ev) { if (!dragging) { hilite(i, true); showTip(g.nodes[i], ev); } }));
        el.addEventListener('pointermove', safe(function (ev) { if (dragging) { var p = toSvg(ev); g.nodes[i].fx = p.x; g.nodes[i].fy = p.y; reheat(0.3); } else moveTip(ev); }));
        el.addEventListener('pointerleave', safe(function () { if (!dragging) { hilite(i, false); if (tip) tip.hidden = true; } }));
        el.addEventListener('pointerdown', safe(function (ev) {
          dragging = true; el.setPointerCapture && el.setPointerCapture(ev.pointerId);
          var p = toSvg(ev); g.nodes[i].fx = p.x; g.nodes[i].fy = p.y; reheat(0.5);
          VIEW.pinned = g.nodes[i].item; refreshDetail(pane);
        }));
        el.addEventListener('pointerup', safe(function () { dragging = false; g.nodes[i].fx = null; g.nodes[i].fy = null; reheat(0.35); }));
        el.addEventListener('focus', safe(function () { hilite(i, true); VIEW.pinned = g.nodes[i].item; refreshDetail(pane); }));
        el.addEventListener('blur', safe(function () { hilite(i, false); }));
        el.addEventListener('keydown', safe(function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); VIEW.pinned = g.nodes[i].item; refreshDetail(pane); }
        }));
      });
      pane.querySelectorAll('.nmg-gbtn').forEach(function (b) {
        b.addEventListener('click', safe(function () {
          if (b.dataset.act === 'fit') { g.nodes.forEach(function (n, i) { if (i) { n.fx = null; n.fy = null; } }); reheat(0.9); }
          else { SIM = runSim(g, W, H); SIM.raf = requestAnimationFrame(loop); }
        }));
      });
      var sa = pane.querySelector('.nmg-showall');
      if (sa) sa.addEventListener('click', safe(function () { VIEW.showAllCo = true; renderBody(pane); }));
    }

    /* ---------------- table twin (WCAG-clean equivalent) ---------------- */
    function buildTable(model, unfiltered) {
      var S = unfiltered ? model.sectors : shownSectors(model);
      var C = unfiltered ? model.companies : shownCompanies(model);
      var G = unfiltered ? model.segments : shownSegments(model);
      var rows = [];
      S.forEach(function (s) { rows.push({ name: s.name, type: 'Sector', band: s.band, path: '', via: s.declared ? W('Declared sector on the bill record') : '' }); });
      C.forEach(function (c) { rows.push({ name: c.name, type: 'Company', band: c.band, path: c.path, via: c.viaLabel || c.sectorName }); });
      G.forEach(function (g) { rows.push({ name: g.name, type: titleCase(g.kind), band: g.band, path: '', via: '' }); });
      if (!rows.length) return '<div class="nmg-none">No connections at this filter.</div>';
      var h = '<div class="nmg-tblwrap"><table class="nmg-tbl"><thead><tr><th>Entity</th><th>Type</th><th>Link strength</th><th>Path</th><th>How it connects</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        h += '<tr><td class="nmg-td-n">' + esc(r.name) + '</td><td>' + esc(r.type) + '</td>' +
          '<td>' + bandChip(r.band) + '</td><td class="nmg-td-p">' + esc(r.path || '—') + '</td><td class="nmg-td-v">' + esc(r.via || '—') + '</td></tr>';
      });
      return h + '</tbody></table></div>';
    }
    function bandChip(b) {
      b = okBand(b);
      return '<span class="nmg-chip nmg-chip-' + b + '"><span class="nmg-glyph nmg-glyph-' + b + '" aria-hidden="true"></span>' + esc(b) + '</span>';
    }

    /* ---------------- grouped mechanisms (shared by prose + report) ---------------- */
    function mechanisms(model, useFilter) {
      var groups = {}, order = [];
      var list = useFilter ? shownCompanies(model) : model.companies;
      list.forEach(function (c) {
        var key = (c.path || '?') + '|' + (c.viaLabel || '');
        if (!groups[key]) { groups[key] = { path: c.path, item: c, list: [] }; order.push(key); }
        groups[key].list.push(c);
      });
      order.sort(function (a, b) {
        var P = ['P1', 'P2', 'P3', 'P4', 'P5'];
        var pa = P.indexOf(groups[a].path), pb = P.indexOf(groups[b].path);
        if (pa < 0) pa = 9; if (pb < 0) pb = 9;
        return pa - pb || groups[b].list.length - groups[a].list.length;
      });
      return order.map(function (k) { return groups[k]; });
    }

    function buildPathProse(model) {
      var gs = mechanisms(model, true), out = '', shown = 0, MAXG = 6, hidden = 0;
      gs.forEach(function (g) {
        if (shown >= MAXG) { hidden += g.list.length; return; }
        shown++;
        var meta = pathMeta(g.path), why = W(meta.why(g.item.viaLabel || '', g.item));
        var names = g.list.slice(0, 6).map(function (c) { return c.name; }).join(', ');
        var more = g.list.length > 6 ? ' and ' + (g.list.length - 6) + ' more' : '';
        out += '<div class="nmg-path">' +
          '<div class="nmg-path-h">' + esc(W(meta.head)) + '<span class="nmg-path-n">' + g.list.length + ' ' + plural(g.list.length, 'company', 'companies') + '</span></div>' +
          (why ? '<p class="nmg-p">' + esc(why) + '</p>' : '') +
          '<p class="nmg-p nmg-p-list">Reaches ' + esc(names) + esc(more) + '.</p></div>';
      });
      if (hidden) out += '<p class="nmg-p nmg-p-list">' + hidden + ' further ' + plural(hidden, 'company', 'companies') + ' connect by other routes — Full reasoning lists every one.</p>';
      if (!out) {
        out = '<div class="nmg-path"><p class="nmg-p">' +
          (model.companies.length
            ? W('No company matches the current strength filter. Clear it to see how this bill reaches the rest.')
            : W('No derivation path carries this bill to a company in the Brain’s universe, so none is drawn. What is shown above — its sector and the institutions it engages — is the full extent of what the evidence supports.')) +
          '</p></div>';
      }
      return out;
    }

    /* ---------------- DETAILED ANALYSIS report ---------------- */
    var MEANS = {
      P1: { is: 'The company’s own name appears in the text held for this bill.',
            so: 'Anything the bill does lands on this company by name, so it is the one case where you can read the effect off the bill itself without an intermediate step.',
            not: 'It does not tell you the size or direction of the effect — only that the company is explicitly in scope.' },
      P2: { is: 'The bill is an institutional action, and the institution governs a sector this company sits in.',
            so: 'Any obligation, permission or cost the bill creates for that sector applies to this company as a participant in it — the same rule, arriving through the sector rather than by name.',
            not: 'It does not mean the bill mentions the company, and it does not weigh the company against its peers: every company in the sector inherits the same link.' },
      P3: { is: 'The bill engages a policy theme that this company carries in its business mix.',
            so: 'Where the bill shifts the conditions attached to that theme, the part of the company’s business built on it moves with them.',
            not: 'It does not mean the theme is material to the company’s revenue. The graph knows the theme is present, not how large it is.' },
      P4: { is: 'The bill moves conditions around a commodity this company produces or consumes.',
            so: 'Input or output economics for that commodity shift, which reaches the company through its cost base or its realisations.',
            not: 'It does not model hedging, contracts or pass-through, any of which can absorb the effect entirely.' },
      P5: { is: 'The company has declared operations in a geography the bill names, in a matching line of business.',
            so: 'A cross-border measure reaches the company where those operations sit.',
            not: 'It does not size the exposure — a declared operation may be a small share of the business.' }
    };
    function reportRow(label, text) {
      return '<div class="nmg-rr"><div class="nmg-rr-k">' + esc(label) + '</div><div class="nmg-rr-v">' + esc(text) + '</div></div>';
    }
    function buildReport(model) {
      var h = '<div class="nmg-report">';
      h += '<p class="nmg-p">' + esc(W('This is the full reasoning behind every line drawn in the graph above: what each connection is, ' +
        'what it licenses you to say, and what it does not. Read it as structural research linkage — the graph establishes that a ' +
        'route exists between this bill and an entity, never how large the consequence is.'), model) + '</p>';

      // 1. the bill itself
      var a = billAnalysis(model);
      h += '<div class="nmg-rsec"><h5 class="nmg-h5">1 · The measure</h5>';
      h += reportRow(titleCase(model.cfg.noun), model.bill.name);
      if (model.bill.stage) h += reportRow('Stage', model.bill.stage);
      if (model.bill.sector) h += reportRow('Sector on record', titleCase(model.bill.sector));
      h += reportRow('What it does', whatItDoes(model));
      function arr(v) { return Array.isArray(v) ? v : (v ? [String(v)] : []); }
      var kc = a ? arr(a[(model.cfg && model.cfg.changesF) || 'key_changes']) : [];
      if (kc.length) {
        h += '<div class="nmg-rr"><div class="nmg-rr-k">' + esc((model.cfg && model.cfg.changesTitle) || 'Clause changes') + '</div><div class="nmg-rr-v"><ul class="nmg-ul">' +
          kc.slice(0, 6).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>';
      }
      var kt = a ? arr(a.key_terms) : [];
      if (kt.length) h += reportRow('Key terms', kt.slice(0, 10).join(' · '));
      h += '</div>';

      // 2. mechanism by mechanism
      var gs = mechanisms(model, false);
      h += '<div class="nmg-rsec"><h5 class="nmg-h5">2 · Each linkage, and why it exists</h5>';
      if (!gs.length) {
        h += '<p class="nmg-p">' + esc(W('No company-level linkage resolved for this bill, so there is no mechanism to set out. ' +
          'The sectors and segments in the graph come from the bill’s own record and the institutions its text engages.', model)) + '</p>';
      }
      gs.forEach(function (g, i) {
        var meta = pathMeta(g.path), M = MEANS[g.path] || null;
        h += '<div class="nmg-rblock">';
        h += '<div class="nmg-rblock-h"><span class="nmg-rbadge">' + esc(g.path || '—') + '</span>' + esc(W(meta.head)) +
             '<span class="nmg-path-n">' + g.list.length + ' ' + plural(g.list.length, 'company', 'companies') + '</span></div>';
        if (g.item.viaLabel) h += '<div class="nmg-chain">' + esc(clip(model.bill.name, 34)) + ' → ' + esc(g.item.viaLabel) + ' → ' + esc(g.list[0].name) + (g.list.length > 1 ? ' (+' + (g.list.length - 1) + ')' : '') + '</div>';
        h += reportRow('The connection', W(meta.why(g.item.viaLabel || '', g.item), model));
        if (M) {
          h += reportRow('What it is', W(M.is, model));
          h += reportRow('How it impacts them', W(M.so, model));
          h += reportRow('What it does not mean', W(M.not, model));
        }
        // per-company strength table
        h += '<table class="nmg-tbl nmg-tbl-mini"><thead><tr><th>Company</th><th>Sector</th><th>Strength</th></tr></thead><tbody>' +
          g.list.slice(0, 12).map(function (c) {
            return '<tr><td class="nmg-td-n">' + esc(c.name) + '</td><td>' + esc(c.sectorName || '—') + '</td><td>' + bandChip(c.band) + '</td></tr>';
          }).join('') + '</tbody></table>';
        if (g.list.length > 12) h += '<p class="nmg-p nmg-p-list">+ ' + (g.list.length - 12) + ' more, listed in full below.</p>';
        h += '</div>';
      });
      h += '</div>';

      // 3. sectors and segments
      h += '<div class="nmg-rsec"><h5 class="nmg-h5">3 · Sectors and other segments</h5>';
      if (model.sectors.length) {
        h += '<p class="nmg-p">' + esc(W('Sectors are the layer most of this bill’s reach travels through — a rule aimed at a sector arrives at every company inside it.', model)) + '</p>';
        h += '<table class="nmg-tbl nmg-tbl-mini"><thead><tr><th>Sector</th><th>Strength</th><th>Why it is here</th></tr></thead><tbody>' +
          model.sectors.map(function (s) {
            return '<tr><td class="nmg-td-n">' + esc(s.name) + '</td><td>' + bandChip(s.band) + '</td><td class="nmg-td-v">' +
              esc(s.declared ? W('Recorded against the bill in the tracker.', model) : (s.band === 'Strong' ? W('The bill’s own text engages this sector.', model) : 'Reached through an institution that governs it, or through a company inside it.')) +
              '</td></tr>';
          }).join('') + '</tbody></table>';
      } else h += '<p class="nmg-p">No sector resolved for this bill.</p>';
      if (model.segments.length) {
        h += '<table class="nmg-tbl nmg-tbl-mini"><thead><tr><th>Segment</th><th>Type</th><th>Why it is here</th></tr></thead><tbody>' +
          model.segments.map(function (s) {
            var why = s.kind === 'institution' ? 'Named on the bill’s record — the body whose action the rest of the graph flows from.'
              : s.kind === 'theme' ? 'A policy theme the bill’s text engages; it carries the bill to companies that share no direct mention.'
              : s.kind === 'commodity' ? 'A commodity whose conditions the bill touches, reaching producers and consumers.'
              : s.kind === 'geography' ? 'A geography the bill names, reaching companies with declared operations there.' : '';
            return '<tr><td class="nmg-td-n">' + esc(s.name) + '</td><td>' + esc(titleCase(s.kind || '')) + '</td><td class="nmg-td-v">' + esc(W(why, model)) + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      h += '</div>';

      // 4. method
      h += '<div class="nmg-rsec"><h5 class="nmg-h5">4 · How to read the strengths</h5>' +
        '<p class="nmg-p">' + esc(W('Strength is structural, not temporal: it describes how tightly the route binds the bill to the entity, ' +
          'and it does not decay because the bill is old. A four-month-old ministry-to-sector link is exactly as real as a fresh one.', model)) + '</p>' +
        reportRow('Strong', W('The route is direct — the record names the entity, or the bill’s own text engages it.', model)) +
        reportRow('Moderate', 'One inference step: an institution that governs the sector, or a sector the company sits in.') +
        reportRow('Weak', 'Two or more steps, or a broad fan-out — a theme or commodity shared with many others. Treat as a lead to check, not a finding.') +
        reportRow('Source', model.source === 'brain'
          ? 'The live Policy Intelligence Graph, scored on the same structural paths the Brain uses across the terminal.'
          : 'The Brain ontology plus the bill’s own record — this bill has not been materialised into the live graph.') +
        '<p class="nmg-p nmg-p-list">' + esc('Legal and market information for research. Not investment advice, and no price or return implication is intended anywhere in this report.') + '</p>' +
        '</div>';

      // 5. every link in one table — the plain-text equivalent of the graph, which
      // matters more now that colour-coded strength has no filter row of its own.
      h += '<div class="nmg-rsec"><h5 class="nmg-h5">5 · Every link in one table</h5>' +
        buildTable(model, true) + '</div>';

      return h + '</div>';
    }

    /* ---------------- detail card ---------------- */
    function detailCard(it) {
      if (!it) return '<div class="nmg-detail nmg-detail-empty">Hover, drag or select any node in the graph to read how this bill reaches it.</div>';
      var kind = it.nt === 'company' ? 'Company' : (it.kind ? titleCase(it.kind) : 'Sector');
      var why;
      if (it.nt === 'company' && it.path) why = W(pathMeta(it.path).why(it.viaLabel, it));
      else if (it.nt === 'company') why = 'This company is connected to the bill in the graph, but the derivation path was not recorded on the link.';
      else if (it.kind === 'institution') why = W('This body appears on the bill’s record — it is the institution whose action the rest of the graph flows from.');
      else if (it.kind === 'theme') why = W('The bill’s record engages this policy theme, which is how it reaches companies that share no direct mention with it.');
      else if (it.kind === 'commodity') why = W('The bill touches conditions around this commodity, reaching producers and consumers of it.');
      else if (it.kind === 'geography') why = W('The bill’s record names this geography, which is how it reaches companies with declared operations there.');
      else if (it.declared) why = W('This is the sector recorded against the bill in the tracker.');
      else why = W('Companies in this sector carry the bill’s exposure; the sector is the layer through which the rule reaches them.');
      var M = it.path ? MEANS[it.path] : null;
      return '<div class="nmg-detail">' +
        '<div class="nmg-detail-top"><span class="nmg-detail-n">' + esc(it.name) + '</span>' + bandChip(it.band) + '</div>' +
        '<div class="nmg-detail-meta">' + esc(kind) + (it.sectorName ? ' · ' + esc(it.sectorName) : '') + (it.path ? ' · path ' + esc(it.path) : '') + '</div>' +
        (it.viaLabel && VIEW.model ? '<div class="nmg-chain">' + esc(clip(VIEW.model.bill.name, 30)) + ' → ' + esc(it.viaLabel) + ' → ' + esc(it.name) + '</div>' : '') +
        '<p class="nmg-p">' + esc(why) + '</p>' +
        (M ? '<p class="nmg-p nmg-p-list">' + esc(W(M.so)) + '</p>' : '') +
        '</div>';
    }
    function refreshDetail(pane) {
      var slot = pane.querySelector('.nmg-detail-slot'); if (slot) slot.innerHTML = detailCard(VIEW.pinned);
    }

    /* ---------------- render ---------------- */
    function statTile(n, label, sub) {
      return '<div class="nmg-stat"><div class="nmg-stat-v">' + esc(String(n)) + '</div><div class="nmg-stat-l">' + esc(label) + '</div>' +
        (sub ? '<div class="nmg-stat-s">' + esc(sub) + '</div>' : '') + '</div>';
    }
    function arrOf(v) { return Array.isArray(v) ? v : (v ? [String(v)] : []); }

    // ---- compact fact boxes: one tight row, each expanding into a shared panel ----
    // Five small tiles rather than three big bands — the pane is ~600px and the
    // detail behind each one is only wanted on demand, so it lives behind "Read more".
    function factData(model) {
      // Bills carry a probability model; the other desks do not, so they get tiles
      // built from what their own record actually holds.
      if (model.cfg && model.cfg.key !== 'bill') return genericFacts(model);
      var a = billAnalysis(model) || {};
      var pp = a.passage_probability || {}, pr = a.precedent || {}, du = a.stage_duration || {};
      var score = (pp.score === null || pp.score === undefined) ? null : pp.score;
      var days = (du.days_in_current_stage === null || du.days_in_current_stage === undefined) ? null : du.days_in_current_stage;
      var typical = (du.typical_days_for_stage === null || du.typical_days_for_stage === undefined) ? null : du.typical_days_for_stage;
      var secs = arrOf(a.sectors);
      if (!secs.length && model.bill.sector) secs = [titleCase(model.bill.sector)];
      var terms = arrOf(a.key_terms);
      var out = [];

      out.push({
        k: 'prob', label: 'Passage probability',
        value: score == null ? '—' : score + '%',
        tone: score == null ? '' : (score >= 66 ? 'Strong' : score >= 33 ? 'Moderate' : 'Weak'),
        bar: score,
        more: score == null
          ? '<p class="nmg-p">No probability has been computed for this bill.</p>'
          : '<p class="nmg-p">' + esc(pp.methodology_note || 'Computed from the outcomes of comparable bills already resolved in this dataset.') + '</p>' +
            (pp.comparison_baseline ? '<div class="nmg-kv"><span>Baseline</span><span>' + esc(pp.comparison_baseline) + '</span></div>' : '') +
            (pp.confidence ? '<div class="nmg-kv"><span>Confidence</span><span>' + esc(titleCase(pp.confidence)) + '</span></div>' : '')
      });

      out.push({
        k: 'prec', label: 'Precedent',
        value: pr.similar_bill_count ? (pr.similar_bill_passed_count + ' of ' + pr.similar_bill_count) : '—',
        more: pr.similar_bill_count
          ? '<p class="nmg-p">' + esc(pr.base_rate_label || '') + '</p><p class="nmg-p nmg-p-list">' +
            esc('The base rate comes from this dataset\u2019s own historically tracked bills carrying the same tag \u2014 it is what usually happened, not a forecast for this one.') + '</p>'
          : '<p class="nmg-p">No comparable resolved bills on record for this tag.</p>'
      });

      out.push({
        k: 'stage', label: 'Days in stage',
        value: days == null ? '—' : days + 'd',
        more: '<div class="nmg-kv"><span>Current stage</span><span>' + esc(model.bill.stage || 'Unknown') + '</span></div>' +
          (days == null ? '<p class="nmg-p">Time in the current stage has not been computed for this bill.</p>'
                        : '<div class="nmg-kv"><span>Days elapsed</span><span>' + days + '</span></div>') +
          (typical ? '<div class="nmg-kv"><span>Typical for this stage</span><span>~' + typical + ' days</span></div>' : '') +
          (model.bill.introduced ? '<div class="nmg-kv"><span>Introduced</span><span>' + esc(model.bill.introduced) + '</span></div>' : '') +
          (model.bill.rec && model.bill.rec.house ? '<div class="nmg-kv"><span>House</span><span>' + esc(model.bill.rec.house) + '</span></div>' : '')
      });

      out.push({
        k: 'sector', label: 'Sector it covers',
        value: secs.length ? clip(secs[0], 15) : '—',
        sub: secs.length > 1 ? '+' + (secs.length - 1) + ' more' : '',
        more: (secs.length
          ? '<div class="nmg-chips">' + secs.map(function (x) { return '<span class="nmg-pill">' + esc(x) + '</span>'; }).join('') + '</div>'
          : '<p class="nmg-p">This bill has not been sector-tagged.</p>') +
          (model.bill.sector ? '<div class="nmg-kv"><span>Sponsoring ministry on record</span><span>' + esc(titleCase(model.bill.sector)) + '</span></div>' : '')
      });

      out.push({
        k: 'terms', label: 'Key terms',
        // Show a real term, not just a bare count — "7 terms" tells the reader nothing.
        value: terms.length ? clip(terms[0], 13) : '—',
        sub: terms.length > 1 ? '+' + (terms.length - 1) : '',
        more: terms.length
          ? '<div class="nmg-chips">' + terms.map(function (x) { return '<span class="nmg-pill nmg-pill-q">' + esc(x) + '</span>'; }).join('') + '</div>'
          : '<p class="nmg-p">No key terms have been extracted for this bill yet.</p>'
      });

      return out;
    }

    // Tender tiles answer the question this desk is actually asked: how big, by
    // when, and who is buying.
    function tenderFacts(model, r) {
      var t = model.tender || {}, v = t.value || {}, sc = t.scale, out = [];
      var nE = (t.eligible || []).length;

      out.push({
        k: 'scale', label: 'Tender scale',
        value: sc ? sc.label : 'Unscored',
        sub: v.known ? inrShort(v.n) : 'no value',
        more: (v.known
          ? '<div class="nmg-kv"><span>Contract value</span><span>' + esc(inr(v.n)) + '</span></div>' +
            '<div class="nmg-kv"><span>As published</span><span>' + esc(v.raw) + '</span></div>' +
            '<p class="nmg-p">' + esc('This tender is ' + sc.note + '.') + '</p>'
          : '<p class="nmg-p">No contract value is published for this tender. The CPPP live-tender widget this feed reads exposes the title, closing time, status and a link — not the estimated value, department or location. Without a value the tender cannot be placed on the size ladder, so it is left unscored rather than guessed.</p>' +
            '<p class="nmg-p nmg-p-list">GeM’s BidPlus listings do carry a value and filter on it at the same Rs 2 crore high-value mark this ladder uses, so a GeM ingest is what would turn this tile from Unscored into a band. See "Where tender data comes from" at the foot of this pane.</p>') +
          '<p class="nmg-p nmg-p-list">Ladder: Rs 50 lakh limited-tender ceiling (GFR 2017 Rule 162) · Rs 2 crore GeM high-value bid · Rs 200 crore global-tender bar (GFR 2017 Rule 161(iv), amended May 2020).</p>'
      });

      out.push({
        k: 'close', label: 'Bids close',
        value: model.bill.introduced || '—',
        more: '<div class="nmg-kv"><span>Closing</span><span>' + esc(String(r.deadline || '—')) + '</span></div>' +
              (r.status ? '<div class="nmg-kv"><span>Status</span><span>' + esc(r.status) + '</span></div>' : '')
      });

      out.push({
        k: 'buyer', label: 'Buyer',
        value: String(r.ministry_department || '').trim() || 'Not published',
        more: String(r.ministry_department || '').trim()
          ? '<div class="nmg-kv"><span>Department</span><span>' + esc(r.ministry_department) + '</span></div>' +
            (r.location ? '<div class="nmg-kv"><span>Location</span><span>' + esc(r.location) + '</span></div>' : '')
          : '<p class="nmg-p">The widget does not expose the buying department for this tender. The issuing office can usually be read from the tender text itself, but it is not a structured field on this record, so nothing is asserted here.</p>'
      });

      out.push({
        k: 'sector', label: 'Sector read',
        value: model.sectors.length ? clip(model.sectors[0].name, 14) : '—',
        sub: model.sectors.length > 1 ? '+' + (model.sectors.length - 1) : '',
        more: model.sectors.length
          ? '<div class="nmg-chips">' + model.sectors.map(function (x) { return '<span class="nmg-pill">' + esc(x.name) + '</span>'; }).join('') + '</div>' +
            '<p class="nmg-p">Read from the tender text against the Brain ontology. The record itself carries no sector tag.</p>'
          : '<p class="nmg-p">Nothing in this tender’s text matches a sector the ontology tracks.</p>'
      });

      out.push({
        k: 'bidders', label: 'Could bid',
        value: nE ? String(nE) : '0',
        sub: (nE && !model.companies.length) ? 'withheld' : '',
        more: nE
          ? '<p class="nmg-p">' + esc(nE + ' ' + plural(nE, 'company', 'companies') + ' in the Brain’s universe operate in the sectors this tender touches.') + '</p>' +
            (model.companies.length
              ? '<p class="nmg-p">The tender clears the high-value bar, so these are shown in the graph as exposed — as eligible bidders, not as awardees.</p>'
              : '<p class="nmg-p">They are not shown as impacted: ' + (v.known ? 'the contract sits below the Rs 2 crore high-value bar.' : 'no contract value is published, so no size claim can be made.') + '</p>')
          : '<p class="nmg-p">No company in the Brain’s universe operates in the sectors this tender touches.</p>'
      });

      return out.slice(0, 5);
    }

    // Tiles for the non-bill desks, driven by the record + its analysis JSON.
    function genericFacts(model) {
      var cfg = model.cfg, r = model.bill.rec || {}, a = billAnalysis(model) || {};
      var out = [], tags = arrOf(a.tags);
      function tile(k, label, value, more, sub) { if (value) out.push({ k: k, label: label, value: clip(String(value), 15), sub: sub || '', more: more }); }

      if (cfg.key === 'tender') return tenderFacts(model, r);

      tile('subject', cfg.key === 'regulatory' ? 'Regulator' : cfg.key === 'question' ? 'Ministry' : 'Ministry',
        model.bill.sector || '—',
        '<div class="nmg-kv"><span>On record</span><span>' + esc(titleCase(model.bill.sector || '—')) + '</span></div>' +
        (a.category ? '<div class="nmg-kv"><span>Category</span><span>' + esc(a.category) + '</span></div>' : ''));

      if (cfg.key === 'question' && r.mp_name) {
        tile('mp', 'Asked by', r.mp_name,
          '<div class="nmg-kv"><span>Member</span><span>' + esc(r.mp_name) + '</span></div>' +
          (r.party ? '<div class="nmg-kv"><span>Party</span><span>' + esc(r.party) + '</span></div>' : '') +
          (r.house ? '<div class="nmg-kv"><span>House</span><span>' + esc(r.house) + '</span></div>' : ''));
      }
      tile('stage', cfg.key === 'question' ? 'Type' : cfg.key === 'regulatory' ? 'Action type' : 'Stage',
        model.bill.stage || '—',
        '<div class="nmg-kv"><span>' + esc(cfg.key === 'question' ? 'Question type' : 'Stage') + '</span><span>' + esc(model.bill.stage || '—') + '</span></div>' +
        (r.status ? '<div class="nmg-kv"><span>Status</span><span>' + esc(r.status) + '</span></div>' : ''));

      tile('date', 'Reported', model.bill.introduced || '—',
        '<div class="nmg-kv"><span>Date on record</span><span>' + esc(model.bill.introduced || '—') + '</span></div>');

      if (a.category && cfg.key === 'regulatory') {
        tile('cat', 'Category', a.category, '<p class="nmg-p">' + esc(a.category) + '</p>');
      }
      out.push({
        k: 'tags', label: 'Tags',
        value: tags.length ? clip(tags[0], 13) : '—',
        sub: tags.length > 1 ? '+' + (tags.length - 1) : '',
        more: tags.length
          ? '<div class="nmg-chips">' + tags.map(function (t) { return '<span class="nmg-pill nmg-pill-q">' + esc(t) + '</span>'; }).join('') + '</div>'
          : '<p class="nmg-p">No tags were extracted for this ' + esc(cfg.noun) + '.</p>'
      });
      return out.slice(0, 5);
    }

    function factRow(model) {
      var facts = factData(model);
      var open = null;
      var h = '<div class="nmg-facts">';
      facts.forEach(function (f) {
        var on = VIEW.fact === f.k; if (on) open = f;
        var bar = (f.k === 'prob' && f.bar != null)
          ? '<div class="nmg-bar"><div class="nmg-bar-f" style="width:' + Math.max(0, Math.min(100, f.bar)) + '%;background:' + col(f.tone || 'Speculative') + '"></div></div>' : '';
        h += '<button type="button" class="nmg-fact' + (on ? ' on' : '') + '" data-fact="' + f.k + '" aria-expanded="' + (on ? 'true' : 'false') + '">' +
          '<span class="nmg-fact-l">' + esc(f.label) + '</span>' +
          '<span class="nmg-fact-v">' + esc(f.value) + (f.sub ? '<span class="nmg-fact-s">' + esc(f.sub) + '</span>' : '') + '</span>' +
          bar +
          '<span class="nmg-fact-more">' + (on ? 'Close' : 'Read more') + '</span>' +
          '</button>';
      });
      h += '</div>';
      if (open) {
        h += '<div class="nmg-factpanel"><div class="nmg-factpanel-h">' + esc(open.label) +
             '<button type="button" class="nmg-factclose" aria-label="Close">×</button></div>' + open.more + '</div>';
      }
      return h;
    }

    function keyChangesBlock(model) {
      var a = billAnalysis(model) || {}, cfg = model.cfg || {};
      var kc = arrOf(a[cfg.changesF || 'key_changes']);
      var extra = cfg.key !== 'bill' && a.watch_for ? String(a.watch_for) : '';
      if (!kc.length && !extra) return '';
      return '<div class="nmg-sec"><h4 class="nmg-h4">' + esc(cfg.changesTitle || 'Key changes') + '</h4>' +
        (kc.length ? '<ul class="nmg-changes">' + kc.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (extra ? '<h4 class="nmg-h4" style="margin-top:12px">What to watch for</h4><p class="nmg-p">' + esc(extra) + '</p>' : '') +
        '</div>';
    }

    // The PDF lives in a different place on each desk: bills keep a stage-keyed map
    // under enrichment.pdf_links, regulatory notices carry a flat pdf_url.
    function pdfUrlFor(model) {
      var a = billAnalysis(model) || {}, r = model.bill.rec || {}, cfg = model.cfg || {};
      if (cfg.pdfF && r[cfg.pdfF]) return String(r[cfg.pdfF]);
      if (a.pdf_url) return String(a.pdf_url);
      var pl = a.enrichment && a.enrichment.pdf_links;
      if (pl) {
        var order = ['gazetted', 'passed_both', 'passed_rs', 'passed_ls', 'introduced'];
        for (var i = 0; i < order.length; i++) { if (pl[order[i]]) return String(pl[order[i]]); }
      }
      // Some desks (parliamentary questions) point source_url straight at a PDF.
      var su = cfg.srcF ? r[cfg.srcF] : (r.source_url || '');
      if (su && /\.pdf(\?|$)/i.test(String(su))) return String(su);
      return '';
    }
    function coverageBlock(model) {
      var a = billAnalysis(model) || {}, cfg = model.cfg || {};
      var rc = Array.isArray(a.related_coverage) ? a.related_coverage : [];
      var r = model.bill.rec || {};
      var src = (cfg.srcF && r[cfg.srcF]) || r.source_url || '';
      var pdf = pdfUrlFor(model);
      var h = '<div class="nmg-sec"><h4 class="nmg-h4">Related coverage</h4>';
      if (rc.length) {
        h += '<div class="nmg-cov">' + rc.slice(0, 5).map(function (x) {
          return '<a class="nmg-cov-i" href="' + esc(x.link || '#') + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="nmg-cov-t">' + esc(clip(x.title || 'Untitled', 120)) + '</span>' +
            '<span class="nmg-cov-s">' + esc(x.source || '') + (x.published ? ' · ' + esc(String(x.published).slice(0, 16)) : '') + '</span></a>';
        }).join('') + '</div>';
      } else {
        h += '<p class="nmg-p nmg-p-list">No linked coverage on record for this ' + esc(cfg.noun || 'record') + '.</p>';
      }
      h += '<div class="nmg-actions">' +
        (pdf ? '<a class="nmg-act" href="' + esc(pdf) + '" target="_blank" rel="noopener noreferrer">↓ View PDF</a>'
             : '<span class="nmg-act nmg-act-off" title="No PDF on record">↓ View PDF</span>') +
        (src ? '<a class="nmg-act" href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">↗ Source</a>' : '') +
        '<button type="button" class="nmg-act nmg-act-ai">✦ Ask AI</button>' +
        '</div>';
      return h + '</div>';
    }

    // Hands the record to the terminal's own AI workspace with the linkage as context.
    function askAiAbout(model) {
      try {
        var lines = ['Context from the Niyantran linkage brain (structural research linkage, not advice):',
          (model.cfg.noun || 'record') + ': ' + model.bill.name];
        if (model.bill.stage) lines.push('Stage: ' + model.bill.stage);
        if (model.bill.sector) lines.push('On record under: ' + model.bill.sector);
        lines.push('Impacts ' + model.sectors.length + ' sector(s), ' + model.companies.length + ' company(ies), ' + model.segments.length + ' segment(s).');
        mechanisms(model, false).slice(0, 4).forEach(function (g) {
          lines.push('- ' + pathMeta(g.path).head + (g.item.viaLabel ? ' via ' + g.item.viaLabel : '') + ': ' +
            g.list.slice(0, 5).map(function (c) { return c.name; }).join(', '));
        });
        lines.push('', 'Explain the mechanism connecting these, using only the linkages above. No investment advice, price targets or predictions.');
        var card = { title: model.bill.name, feature: featureTitle(), csv: model.bill.csv, fields: { stage: model.bill.stage, subject: model.bill.sector } };
        if (typeof openAiWorkspace === 'function') openAiWorkspace(lines.join('\n'), card);
        else if (typeof window.openGlobalAiWithPrompt === 'function') window.openGlobalAiWithPrompt(lines.join('\n'));
        else { var b = document.querySelector('#detail .niy-mode[data-mode="ai"]'); if (b) b.click(); }
      } catch (e) { try { console.warn('[NMG] ask ai', e); } catch (_) {} }
    }
    function renderBody(pane) {
      var model = VIEW.model; if (!model) return;
      var body = pane.querySelector('.nmg-body'); if (!body) return;

      if (VIEW.detail) {                      // "Full reasoning" replaces the summary
        stopSim();
        body.innerHTML = buildReport(model);
        return;
      }

      var nEnt = model.companies.length + model.sectors.length + model.segments.length;
      // One node and no links is not a graph. When nothing resolved, the canvas is
      // replaced by the reason rather than a lonely dot the reader has to interpret.
      var card = nEnt ? graphCard(model) : null;
      var viz = card ? card.html
        : '<div class="nmg-noviz"><b>Nothing to plot.</b> Nothing in this ' + esc(model.cfg.noun) +
          '\u2019s text resolves to a sector, company or segment the Brain tracks, so there is no linkage to draw.' +
          (model.bill.sector ? ' The only subject on its record is ' + esc(titleCase(model.bill.sector)) + '.' : '') + '</div>';

      body.innerHTML =
        factRow(model) +
        tenderBlock(model) +
        '<div class="nmg-sec"><h4 class="nmg-h4">Linkage brain — what this ' + esc(model.cfg.noun) + ' connects to</h4>' +
          '<div class="nmg-viz">' + viz + '</div>' +
          (nEnt ? '<div class="nmg-impactbtns">' +
            '<button type="button" class="nmg-ibtn' + (VIEW.impact === 'lands' ? ' on' : '') + '" data-impact="lands" aria-expanded="' + (VIEW.impact === 'lands') + '">Where the impact lands</button>' +
            '<button type="button" class="nmg-ibtn' + (VIEW.impact === 'travels' ? ' on' : '') + '" data-impact="travels" aria-expanded="' + (VIEW.impact === 'travels') + '">How the impact travels</button>' +
          '</div>' : '') +
          (VIEW.impact === 'lands'
            ? '<div class="nmg-impactpanel"><p class="nmg-p">' + esc(whereItLands(model)) + '</p></div>' : '') +
          (VIEW.impact === 'travels'
            ? '<div class="nmg-impactpanel">' + buildPathProse(model) + '</div>' : '') +
          (nEnt ? '<div class="nmg-detail-slot">' + detailCard(VIEW.pinned) + '</div>' : '') +
        '</div>' +
        '<div class="nmg-sec"><h4 class="nmg-h4">What this ' + esc(model.cfg.noun) + ' does</h4>' +
          '<p class="nmg-p">' + esc(whatItDoes(model)) + '</p></div>' +
        keyChangesBlock(model) +
        coverageBlock(model) +
        tenderSourceBlock(model) +
        '<div class="nmg-foot">' +
          (model.source === 'brain'
            ? 'Links come from the live Policy Intelligence Graph, scored on the same structural paths the Brain uses everywhere.'
            : 'This ' + esc(model.cfg.noun) + ' is not yet materialised in the live graph, so links are resolved from the Brain ontology and its own record.') +
        ' Structural research linkage — not investment advice.</div>';

      if (card) wireGraph(pane, card);

      body.querySelectorAll('.nmg-ibtn').forEach(function (b) {
        b.addEventListener('click', safe(function () {
          VIEW.impact = (VIEW.impact === b.dataset.impact) ? null : b.dataset.impact;
          renderBody(pane);
        }));
      });
      var aiBtn = body.querySelector('.nmg-act-ai');
      if (aiBtn) aiBtn.addEventListener('click', safe(function () { askAiAbout(model); }));
      body.querySelectorAll('.nmg-fact').forEach(function (b) {
        b.addEventListener('click', safe(function () {
          VIEW.fact = (VIEW.fact === b.dataset.fact) ? null : b.dataset.fact;
          renderBody(pane);
        }));
      });
      var fc = body.querySelector('.nmg-factclose');
      if (fc) fc.addEventListener('click', safe(function (e) { e.stopPropagation(); VIEW.fact = null; renderBody(pane); }));

      // table rows drive the same detail card the graph does
      // The entity table and the tender sector table share .nmg-tbl for styling, but
      // only the entity table's rows map 1:1 onto shownSectors+shownCompanies+
      // shownSegments. Wiring the tender rows here made row 0 ("Telecom") pin
      // whatever entity sat at index 0 — a company, displayed under a sector name.
      body.querySelectorAll('.nmg-tbl:not(.nmg-ttbl) tbody tr').forEach(function (tr, i) {
        tr.addEventListener('click', safe(function () {
          var all = shownSectors(model).concat(shownCompanies(model), shownSegments(model));
          if (all[i]) { VIEW.pinned = all[i]; refreshDetail(pane); }
          body.querySelectorAll('.nmg-tbl:not(.nmg-ttbl) tbody tr').forEach(function (x) { x.classList.toggle('on', x === tr); });
        }));
      });
    }

    function syncTopBar(pane) {
      var db = pane.querySelector('.nmg-detailbtn');
      if (db) { db.textContent = VIEW.detail ? '‹ Back to summary' : 'Full reasoning'; db.setAttribute('aria-expanded', VIEW.detail ? 'true' : 'false'); db.classList.toggle('on', VIEW.detail); }
      var tools = pane.querySelector('.nmg-toolgroup');
      if (tools) tools.style.display = VIEW.detail ? 'none' : '';
    }

    // The document button sits with the title so it is reachable without scrolling.
    // Cross-origin PDFs ignore the download attribute and open in a tab instead —
    // that is the browser's rule, not something the label should pretend otherwise.
    function headPdfBtn(model) {
      var pdf = pdfUrlFor(model);
      if (!pdf) return '<span class="nmg-back nmg-act-off" title="No PDF on record for this ' + esc(model.cfg.noun) + '">↓ Download PDF</span>';
      return '<a class="nmg-back nmg-back-pdf" href="' + esc(pdf) + '" target="_blank" rel="noopener noreferrer" download title="Open or download the source PDF">↓ Download PDF</a>';
    }

    function renderModel(pane, model) {
      stopSim();
      VIEW.model = model; VIEW.band = 'all'; VIEW.kind = 'all'; VIEW.fact = null; VIEW.impact = null; VIEW.mode = 'graph'; VIEW.pinned = null; VIEW.showAllCo = false; VIEW.detail = false;
      if (!pane.__nmgSaved) { pane.__nmgOrig = pane.innerHTML; pane.__nmgSaved = true; }
      pane.__nmgActive = true; pane.__nmgKey = featureTitle();

      var counts = { Strong: 0, Moderate: 0, Weak: 0, Speculative: 0 };
      model.companies.concat(model.sectors, model.segments).forEach(function (x) { counts[x.band] = (counts[x.band] || 0) + 1; });
      var total = model.companies.length + model.sectors.length + model.segments.length;
      // What the bill impacts IS the filter — clicking one narrows every view below
      // to it. Link strength stays on the graph (colour + shape + legend) but is no
      // longer a filter row: the counts people want are the entity counts.
      // "Impacted" is the right word for a bill. It is the wrong word for a routine
      // tender, whose sectors are in scope but demonstrably unmoved — and the sector
      // table two inches below says exactly that. Tenders get scope wording instead.
      var isT = model.cfg && model.cfg.key === 'tender';
      var kinds = [
        { k: 'all', label: 'Everything', n: total },
        { k: 'sector', label: plural(model.sectors.length, 'Sector') + (isT ? ' in scope' : ' impacted'), n: model.sectors.length },
        { k: 'company', label: plural(model.companies.length, 'Company', 'Companies') + (isT ? ' exposed' : ' impacted'), n: model.companies.length },
        { k: 'segment', label: plural(model.segments.length, 'Segment') + (isT ? ' in scope' : ' impacted'), n: model.segments.length }
      ].filter(function (x) { return x.k === 'all' || x.n; });
      var kindHtml = kinds.map(function (x) {
        return '<button type="button" class="nmg-kchip' + (x.k === 'all' ? ' on' : '') + '" data-kind="' + x.k + '" aria-pressed="' + (x.k === 'all') + '">' +
          '<span class="nmg-kn">' + x.n + '</span>' + esc(x.label) + '</button>';
      }).join('');

      pane.innerHTML =
        '<div class="nmg-wrap">' +
          '<div class="nmg-head">' +
            '<div class="nmg-titlerow">' +
              '<h3 class="nmg-title">' + esc(model.bill.name) + '</h3>' +
              '<div class="nmg-headbtns">' +
                '<button type="button" class="nmg-detailbtn" aria-expanded="false" title="Full reasoning behind every link">Full reasoning</button>' +
                headPdfBtn(model) +
                '<button type="button" class="nmg-back">' + esc(model.cfg.backLabel) + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (total ? '<div class="nmg-toolgroup">' +
            '<div class="nmg-frow"><span class="nmg-frow-l">Links</span>' +
              '<div class="nmg-kinds" role="group" aria-label="Filter by what the record impacts">' + kindHtml + '</div></div>' +
          '</div>' : '') +
          '<div class="nmg-body"></div>' +
        '</div>';

      renderBody(pane); syncTopBar(pane);
      var backBtn = pane.querySelector('.nmg-back');
      if (backBtn) backBtn.addEventListener('click', safe(function () { restoreOverview(pane); }));
      var db = pane.querySelector('.nmg-detailbtn');
      if (db) db.addEventListener('click', safe(function () {
        VIEW.detail = !VIEW.detail; renderBody(pane); syncTopBar(pane);
        var sc = pane.querySelector('.nmg-body'); if (sc) pane.scrollTop = Math.max(0, sc.offsetTop - 12);
      }));
      pane.querySelectorAll('.nmg-kchip').forEach(function (b) {
        b.addEventListener('click', safe(function () {
          VIEW.kind = b.dataset.kind; VIEW.pinned = null; VIEW.showAllCo = false;
          pane.querySelectorAll('.nmg-kchip').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
          renderBody(pane);
        }));
      });
    }

    /* ================= HOIST MODE =================
       The terminal writes a full record card under the row: an analysis brief,
       a timeline, documents, related entities, every field, cross-links and the
       AI actions. On these desks that card IS the analysis, so it is MOVED (not
       copied) into the Analytics pane. Moving keeps the host's own click handlers
       bound — the Ask-AI button, the document links and the cross-links all keep
       working, which a cloned copy would silently lose. */
    // The host inserts its card with rowEl.after(panelRow), so the panel is ALWAYS
    // the clicked row's immediate next sibling. Falling back to "the first panel on
    // screen" when that lookup fails would hoist whichever record happened to be
    // open — the wrong one — and, worse, would report success and stop waiting for
    // the right one. No panel means not ready (or closed), and the caller decides.
    function isPanelRow(n) {
      return !!(n && n.classList && (n.classList.contains('niy-rd-panel-row') || n.classList.contains('expand-panel-row')));
    }
    function panelRowFor(row) {
      if (!row) return null;
      var n = row.nextElementSibling;
      return isPanelRow(n) ? n : null;
    }
    function panelBodyOf(pr) {
      if (!pr) return null;
      return pr.querySelector('.niy-rd-panel') || pr.querySelector('.bill-panel') || pr.querySelector('td');
    }
    function hoistName(row, pr) {
      var t = pr && pr.querySelector('.niy-rd-panel-title');
      var n = t ? (t.textContent || '').trim() : '';
      if (!n) {
        var c = row.querySelector('td');
        n = c ? (c.textContent || '').replace(/^[▸▾▶\s]+/, '').trim() : '';
      }
      // anything this long is a flattened panel, not a record name
      if (n.length > 160) n = n.slice(0, 157) + '…';
      return n;
    }
    // Each panel puts its document somewhere different — the rd-panel in a
    // DOCUMENTS section, the affidavit panel in a "View PDF" link — so look for the
    // structural slot first and fall back to matching the link's own label.
    function hoistDocUrl(src) {
      if (!src) return '';
      var a = src.querySelector('.rd-docs a[href], a.rd-doc[href], a[href*=".pdf"]');
      if (!a) {
        var links = src.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
          if (/view pdf|source|document|affidavit|download/i.test(links[i].textContent || '')) { a = links[i]; break; }
        }
      }
      var h = a ? a.getAttribute('href') || '' : '';
      return /^https?:/i.test(h) ? h : '';
    }

    function renderHoist(pane, row, cfg) {
      var pr = panelRowFor(row);
      var src = panelBodyOf(pr);
      if (!src || !src.children.length) return false;

      var name = hoistName(row, pr);
      if (!name) return false;
      var pdf = hoistDocUrl(src);

      // Collect the card BEFORE the pane is touched. Wiping first and discovering
      // afterwards that there was nothing worth moving (a panel still streaming, or
      // one that is nothing but a title bar) left the reader with an empty pane and
      // a back button whose handler had not been attached yet.
      var wrapCls = src.classList.contains('niy-rd-panel') ? 'niy-rd-panel'
                  : src.classList.contains('bill-panel') ? 'bill-panel' : '';
      var host = document.createElement('div');
      host.className = (wrapCls ? wrapCls + ' ' : '') + 'nmg-hoisted';
      Array.prototype.slice.call(src.children).forEach(function (k) {
        // the panel's own title bar and tier/bucket/csv chips duplicate the header
        // this pane already draws, so they are dropped rather than moved
        if (k.classList && (k.classList.contains('niy-rd-panel-head') || k.classList.contains('row-detail-meta'))) return;
        host.appendChild(k);
      });
      if (!host.children.length) return false;

      stopSim();
      VIEW.model = null; VIEW.pinned = null; VIEW.detail = false; VIEW.fact = null; VIEW.impact = null;
      if (!pane.__nmgSaved) { pane.__nmgOrig = pane.innerHTML; pane.__nmgSaved = true; }
      pane.__nmgActive = true; pane.__nmgKey = featureTitle(); pane.__nmgHoist = true;

      pane.innerHTML =
        '<div class="nmg-wrap">' +
          '<div class="nmg-head"><div class="nmg-titlerow">' +
            '<h3 class="nmg-title">' + esc(name) + '</h3>' +
            '<div class="nmg-headbtns">' +
              (pdf
                ? '<a class="nmg-back nmg-back-pdf" href="' + esc(pdf) + '" target="_blank" rel="noopener noreferrer" title="Open the source document">↓ Source document</a>'
                : '<span class="nmg-back nmg-act-off" title="No document on record for this ' + esc(cfg.noun) + '">↓ Source document</span>') +
              '<button type="button" class="nmg-back">' + esc(cfg.backLabel) + '</button>' +
            '</div>' +
          '</div></div>' +
          '<div class="nmg-body"></div>' +
        '</div>';

      pane.querySelector('.nmg-body').appendChild(host);

      var backBtn = pane.querySelector('.nmg-back:not(.nmg-back-pdf)');
      if (backBtn && backBtn.tagName === 'BUTTON') backBtn.addEventListener('click', safe(function () { closeHoist(pane); }));
      return true;
    }

    // The card was MOVED, so the host's panel row is now an empty shell that its own
    // toggle still counts as "open" — leaving it there makes the next click on that
    // row a no-op close, and the reader has to click twice to get the record back.
    // Clearing it puts the host's accordion back in sync with what is on screen.
    function closeHoist(pane) {
      try {
        var scope = document.querySelector('#detail .niy-col-feed') || document;
        scope.querySelectorAll('tr.niy-rd-panel-row').forEach(function (r) {
          var prev = r.previousElementSibling;
          if (prev && prev.classList) prev.classList.remove('niy-rd-open');
          r.remove();
        });
      } catch (e) {}
      restoreOverview(pane);
    }

    function renderEmpty(pane, bill) {
      stopSim();
      VIEW.model = null; VIEW.pinned = null; VIEW.band = 'all'; VIEW.mode = 'graph'; VIEW.flat = []; VIEW.detail = false;
      if (!pane.__nmgSaved) { pane.__nmgOrig = pane.innerHTML; pane.__nmgSaved = true; }
      pane.__nmgActive = true;
      pane.innerHTML =
        '<div class="nmg-wrap"><div class="nmg-head">' +
        '<div class="nmg-titlerow"><h3 class="nmg-title">' + esc(bill.name) + '</h3>' +
        '<div class="nmg-headbtns"><button type="button" class="nmg-back">' + esc((bill.cfg && bill.cfg.backLabel) || 'Back') + '</button></div></div></div>' +
        '<div class="nmg-sec"><p class="nmg-p">The Brain draws no link between this ' + esc((bill.cfg && bill.cfg.noun) || 'record') + ' and any tracked sector, company or segment: no derivation path resolved. ' +
        'That either means the measure reaches nothing the graph tracks, or that its subject sits outside the current ontology coverage — the graph does not guess between the two' +
        (bill.sector ? '. The only sector on its record is ' + esc(titleCase(bill.sector)) + '.' : '.') +
        '</p></div></div>';
      var eb = pane.querySelector('.nmg-back');
      if (eb) eb.addEventListener('click', safe(function () { restoreOverview(pane); }));
    }

    function restoreOverview(pane) {
      if (!pane || !pane.__nmgSaved) return;
      stopSim();
      pane.innerHTML = pane.__nmgOrig;
      pane.__nmgSaved = false; pane.__nmgActive = false; pane.__nmgKey = ''; pane.__nmgHoist = false;
      try { pane.__nmgOrig = ''; } catch (e) {}
      VIEW.model = null; VIEW.pinned = null;
      try { document.querySelectorAll('#detail .nmg-row-sel').forEach(function (r) { r.classList.remove('nmg-row-sel'); }); } catch (e) {}
    }
    function ensureAnalyticsVisible() {
      try {
        var pa = document.querySelector('#detail .niy-pane-analytics');
        if (pa && pa.hidden) { var b = document.querySelector('#detail .niy-mode[data-mode="analytics"]'); if (b) b.click(); }
      } catch (e) {}
    }

    function onBillSelected(row) {
      var pane = analyticsPane(); if (!pane) return;
      var cfg = activeFeature(); if (!cfg) return;
      if (isHoist(cfg)) {
        ensureAnalyticsVisible();
        pane = analyticsPane(); if (!pane) return;
        // The host builds its card synchronously on this same click, so this
        // normally succeeds first time. The retry covers the desks whose panel
        // lands a frame later — but a retry loop that cannot be cancelled and never
        // rechecks where it is will happily move the NEXT desk's card into a pane
        // that has since been torn down. So each attempt re-validates, and a newer
        // selection retires the older loop.
        var gen = ++HOIST_GEN, tries = 0;
        (function attempt() {
          if (gen !== HOIST_GEN) return;                       // a newer click owns the pane
          var live = analyticsPane();
          if (!live || live !== pane || !pane.isConnected) return;   // the pane was rebuilt
          if (!row.isConnected) return;                        // the feed was rebuilt
          if (activeFeature() !== cfg) return;                 // the desk changed
          var okH = false;
          try { okH = renderHoist(pane, row, cfg); } catch (e) { okH = false; }
          if (okH) {
            try {
              document.querySelectorAll('#detail .nmg-row-sel').forEach(function (r) { r.classList.remove('nmg-row-sel'); });
              row.classList.add('nmg-row-sel');
            } catch (e) {}
            return;
          }
          // The host toggles its own card shut when the same row is clicked twice.
          // No panel on a settled desk means closed, not pending — so close with it
          // instead of spinning for a card that is not coming back.
          if (tries > 2 && !panelRowFor(row)) { try { restoreOverview(pane); } catch (e) {} return; }
          if (++tries < 24) setTimeout(attempt, 50);
        })();
        return;
      }
      var bill = billFromRow(row, cfg); if (!bill) return;
      ensureAnalyticsVisible();
      pane = analyticsPane(); if (!pane) return;
      var model = null;
      try { model = brainModel(bill); } catch (e) { model = null; }
      if (!model) { try { model = ontologyModel(bill); } catch (e) { model = null; } }
      try { model = applyTenderScale(model, bill); } catch (e) {}
      if (model) renderModel(pane, model); else renderEmpty(pane, bill);
      try {
        document.querySelectorAll('#detail .nmg-row-sel').forEach(function (r) { r.classList.remove('nmg-row-sel'); });
        row.classList.add('nmg-row-sel');
      } catch (e) {}
    }

    document.addEventListener('click', function (e) {
      try {
        if (e.target.closest && e.target.closest('a')) return;
        if (e.target.closest && e.target.closest('.nmg-wrap')) return;
        var row = e.target.closest && e.target.closest('#detail tr[data-row-idx]');
        if (!row) return;
        // The app's accordion body is itself a row that carries data-row-idx. A click
        // inside it must resolve to the bill it belongs to, never be read as a bill
        // row of its own — otherwise the whole panel's text becomes the "bill name".
        if (row.classList.contains('expand-panel-row') || row.classList.contains('niy-rd-panel-row')) {
          var prev = row.previousElementSibling;
          while (prev && !(prev.matches('tr[data-row-idx]') &&
                 !prev.classList.contains('expand-panel-row') && !prev.classList.contains('niy-rd-panel-row'))) prev = prev.previousElementSibling;
          if (!prev) return;
          row = prev;
        }
        if (!billViewActive()) return;
        setTimeout(function () { try { onBillSelected(row); } catch (err2) { try { console.warn('[NMG]', err2); } catch (_) {} } }, 0);
      } catch (err) {}
    });

    setInterval(function () {
      try {
        patchTenderSourceMeta();     // the catalogue is rebuilt after boot on some paths
        var onBill = billViewActive();
        document.body.classList.toggle('nmg-merged', onBill);
        try { mergeHeadRow(); } catch (e) {}
        if (!onBill) return;
        var pane = analyticsPane(); if (!pane) return;
        if (pane.__nmgActive && !pane.querySelector('.nmg-wrap')) { pane.__nmgActive = false; pane.__nmgSaved = false; pane.__nmgOrig = ''; stopSim(); }
        if (pane.__nmgActive) return;
        if (pane.querySelector('.nmg-hint')) return;
        var h = document.createElement('div'); h.className = 'nmg-hint';
        var hcfg = activeFeature();
        h.innerHTML = '<span class="nmg-hint-i" aria-hidden="true">↗</span><span>' + (isHoist(hcfg)
          ? 'Select any row in the Live Feed to open its <b>full record</b> here — the analysis, timeline, documents and every field, without anything opening under the row.'
          : 'Select any ' + esc((hcfg && hcfg.noun) || 'bill') + ' in the Live Feed to open its <b>linkage brain</b> — the sectors, companies and segments it reaches, and the reasoning behind each link.') + '</span>';
        pane.insertBefore(h, pane.firstChild);
      } catch (e) {}
    }, 900);

    /* ================= ONE-LINE HEADER =================
       The stock chrome spends two bands on labels: the detail head (segment name +
       Source + overflow + export) and, right under it, the column heads (LIVE FEED /
       ANALYTICS · AI WORKSPACE). This folds the second band up into the first.

       Direction matters. The column heads are REBUILT by layoutDetail() on every
       feature change, so hoisting them is safe — if the split is torn down we simply
       re-hoist the fresh ones. Pushing the title DOWN into the split would be the
       opposite: layoutDetail() removes the stale split wholesale, and the title
       block would go with it and never come back.
       ================================================== */
    function mergeHeadRow() {
      var detail = document.getElementById('detail'); if (!detail) return;
      var head = detail.querySelector('.detail-head'); if (!head) return;
      var split = detail.querySelector('.niy-split'); if (!split) return;
      var colHead = split.querySelector('.niy-col-feed > .niy-col-head');
      var workHead = split.querySelector('.niy-col-work > .niy-work-head');

      function hoist(src, cls) {
        if (!src || src.dataset.nmgMoved) return;
        // a rebuild leaves the previous group orphaned in the head — drop it first
        var old = head.querySelector('.' + cls); if (old) old.remove();
        var g = document.createElement('div'); g.className = cls;
        while (src.firstChild) g.appendChild(src.firstChild);
        src.dataset.nmgMoved = '1';
        src.classList.add('nmg-head-folded');
        head.appendChild(g);
      }
      hoist(colHead, 'nmg-feedgrp');
      hoist(workHead, 'nmg-workgrp');
    }

    // The 900ms watcher alone leaves a visible flash of the two-band layout every
    // time a desk is opened. Observing #detail's DIRECT children catches the moment
    // .niy-split is swapped in — childList without subtree, so the 9,000 row inserts
    // of a big feed do not fire it. Coalesced to one call per frame.
    (function observeDetail() {
      try {
        var d = document.getElementById('detail');
        if (!d) { setTimeout(observeDetail, 500); return; }
        if (d.__nmgObserved) return; d.__nmgObserved = 1;
        var pending = false;
        var mo = new MutationObserver(function () {
          if (pending) return; pending = true;
          requestAnimationFrame(function () { pending = false; try { mergeHeadRow(); } catch (e) {} });
        });
        mo.observe(d, { childList: true });
        try { mergeHeadRow(); } catch (e) {}
      } catch (e) {}
    })();

    // setWorkMode() maintains the Analytics/AI active state with
    // split.querySelectorAll('.niy-mode') — once those buttons live in the head they
    // are outside .niy-split, so the panes still switch but the indicator stops
    // updating. This keeps the indicator honest without touching the host code.
    document.addEventListener('click', function (e) {
      try {
        var m = e.target.closest && e.target.closest('#detail .niy-mode');
        if (!m || !m.parentElement) return;
        Array.prototype.forEach.call(m.parentElement.querySelectorAll('.niy-mode'), function (x) {
          x.classList.toggle('active', x === m);
        });
      } catch (err) {}
    }, true);

    /* ---------------- styles ---------------- */
    var CSS = [
      '.nmg-wrap{position:relative;animation:nmgIn .24s cubic-bezier(.2,.7,.3,1) both;}',
      '@keyframes nmgIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
      '@keyframes nmgFade{from{opacity:0}to{opacity:1}}',

      '.nmg-hint{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.5;color:var(--fg-muted,#6b7280);background:var(--panel-2,rgba(0,0,0,.03));border:1px solid var(--hairline,rgba(0,0,0,.08));border-radius:9px;padding:10px 12px;margin:0 0 14px;}',
      '.nmg-hint b{color:var(--fg,#15181B);font-weight:650;}',
      '.nmg-hint-i{color:var(--accent,#EE5A2C);font-weight:700;}',

      '.nmg-head{margin-bottom:12px;}',
      '.nmg-back{font:600 10.5px/1 inherit;color:var(--fg-muted,#5b6470);background:var(--panel-2,rgba(0,0,0,.04));border:1px solid var(--hairline,rgba(0,0,0,.12));border-radius:7px;padding:7px 9px;cursor:pointer;white-space:nowrap;transition:background .14s,color .14s,border-color .14s;}',
      '.nmg-back:hover{background:var(--panel-3,#fff);border-color:var(--fg-muted,#6b7280);color:var(--fg,#15181B);}',
      '.nmg-back:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:3px;border-radius:3px;}',
      '.nmg-back-pdf{text-decoration:none;display:inline-flex;align-items:center;}',
      '.nmg-headbtns .nmg-act-off{opacity:.45;cursor:not-allowed;}',
      /* Title owns the left half and wraps inside it; the buttons hold the right
         and never get pushed onto their own row by a long name. They wrap among
         themselves if the pane gets narrow. */
      '.nmg-titlerow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:nowrap;}',
      '.nmg-title{font:650 15.5px/1.35 inherit;color:var(--fg,#15181B);margin:0;flex:1 1 0;max-width:50%;min-width:0;overflow-wrap:anywhere;}',
      /* sized to its own content so the three never split across rows; the title
         fills whatever is left, capped at half the row. */
      '.nmg-headbtns{display:flex;align-items:flex-start;justify-content:flex-end;gap:5px;flex:0 0 auto;flex-wrap:wrap;}',
      '.nmg-sub{display:flex;gap:6px;flex-wrap:wrap;}',
      '.nmg-tag{font:600 10.5px/1 inherit;color:var(--fg,#15181B);background:var(--panel-2,rgba(0,0,0,.04));border:1px solid var(--hairline,rgba(0,0,0,.08));border-radius:999px;padding:5px 9px;}',
      '.nmg-tag-q{color:var(--fg-muted,#6b7280);font-weight:500;}',

      '.nmg-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;}',
      '.nmg-controls .nmg-views{margin-left:auto;}',
      '.nmg-toolgroup{display:flex;flex-direction:column;gap:6px;margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid var(--hairline,rgba(0,0,0,.08));}',
      '.nmg-frow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
      '.nmg-frow-l{font:700 8.5px/1 inherit;letter-spacing:.11em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);min-width:42px;flex:none;white-space:nowrap;}',
      '.nmg-kinds{display:flex;gap:5px;flex-wrap:wrap;}',
      '.nmg-kchip{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 inherit;color:var(--fg-muted,#6b7280);background:none;border:1px solid var(--hairline,rgba(0,0,0,.1));border-radius:999px;padding:6px 11px;cursor:pointer;transition:background .12s,border-color .12s,color .12s;}',
      '.nmg-kchip:hover{background:var(--panel-2,rgba(0,0,0,.04));color:var(--fg,#15181B);}',
      '.nmg-kchip.on{background:var(--fg,#15181B);border-color:var(--fg,#15181B);color:var(--panel-3,#fff);}',
      '.nmg-kchip:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '.nmg-kn{font-weight:700;font-variant-numeric:tabular-nums;}',

      /* compact fact tiles + shared read-more panel */
      '.nmg-facts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px;}',
      '.nmg-fact{flex:1 1 84px;min-width:84px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:3px;text-align:left;background:var(--panel-2,rgba(0,0,0,.025));border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:9px;padding:8px 9px;cursor:pointer;overflow:hidden;transition:border-color .14s,background .14s,transform .14s;}',
      '.nmg-fact:hover{background:var(--panel-3,#fff);border-color:var(--accent,#EE5A2C);transform:translateY(-1px);}',
      '.nmg-fact.on{background:var(--panel-3,#fff);border-color:var(--accent,#EE5A2C);box-shadow:0 0 0 1px var(--accent,#EE5A2C) inset;}',
      '.nmg-fact:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '.nmg-fact-l{font:700 8px/1.3 inherit;letter-spacing:.07em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);min-height:21px;}',
      '.nmg-fact-v{display:flex;align-items:baseline;gap:4px;font:650 13.5px/1.15 inherit;color:var(--fg,#15181B);margin-top:auto;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.nmg-fact-s{font:500 9.5px/1 inherit;color:var(--fg-faint,#9AA1A8);}',
      '.nmg-fact-more{font:600 9px/1 inherit;color:var(--accent,#EE5A2C);margin-top:2px;}',
      '.nmg-fact.on .nmg-fact-more{color:var(--fg-muted,#6b7280);}',
      '.nmg-factpanel{background:var(--panel-3,#fff);border:1px solid var(--accent,#EE5A2C);border-radius:9px;padding:11px 13px;margin:0 0 12px;animation:nmgIn .18s ease both;}',
      '.nmg-factpanel-h{display:flex;align-items:center;justify-content:space-between;font:700 9px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);margin-bottom:9px;}',
      '.nmg-factclose{background:none;border:0;font:400 16px/1 inherit;color:var(--fg-faint,#9AA1A8);cursor:pointer;padding:0 2px;}',
      '.nmg-factclose:hover{color:var(--accent,#EE5A2C);}',
      '.nmg-kv{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-top:1px solid var(--hairline,rgba(0,0,0,.05));font:400 11.5px/1.5 inherit;color:var(--fg-muted,#5b6470);}',
      '.nmg-kv span:first-child{color:var(--fg-faint,#9AA1A8);font-weight:600;font-size:10.5px;}',
      '.nmg-kv span:last-child{text-align:right;}',
      '.nmg-tbl tbody tr{cursor:pointer;}',
      '.nmg-tbl tbody tr.on td{background:var(--panel-2,rgba(238,90,44,.07));box-shadow:inset 2px 0 0 var(--accent,#EE5A2C);}',
      '.nmg-filters{display:flex;gap:5px;flex-wrap:wrap;}',
      '.nmg-fchip{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 inherit;color:var(--fg-muted,#6b7280);background:none;border:1px solid var(--hairline,rgba(0,0,0,.1));border-radius:999px;padding:6px 10px;cursor:pointer;transition:background .12s,border-color .12s,color .12s;}',
      '.nmg-fchip:hover{background:var(--panel-2,rgba(0,0,0,.04));color:var(--fg,#15181B);}',
      '.nmg-fchip.on{background:var(--fg,#15181B);border-color:var(--fg,#15181B);color:var(--panel-3,#fff);}',
      '.nmg-fchip:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '.nmg-fn{font-weight:500;opacity:.72;font-variant-numeric:tabular-nums;}',
      '.nmg-views{display:inline-flex;border:1px solid var(--hairline,rgba(0,0,0,.1));border-radius:8px;overflow:hidden;}',
      '.nmg-vbtn{font:600 11px/1 inherit;color:var(--fg-muted,#6b7280);background:none;border:0;padding:7px 13px;cursor:pointer;transition:background .12s,color .12s;}',
      '.nmg-vbtn+.nmg-vbtn{border-left:1px solid var(--hairline,rgba(0,0,0,.1));}',
      '.nmg-vbtn:hover{background:var(--panel-2,rgba(0,0,0,.04));}',
      '.nmg-vbtn.on{background:var(--fg,#15181B);color:var(--panel-3,#fff);}',
      '.nmg-vbtn:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:-2px;}',

      '.nmg-glyph{width:9px;height:9px;display:inline-block;flex:none;}',
      '.nmg-glyph-Strong{background:var(--signal-green,#2FA254);transform:rotate(45deg);}',
      '.nmg-glyph-Moderate{background:var(--signal-amber,#E79A24);border-radius:50%;}',
      '.nmg-glyph-Weak{border:2px solid var(--signal-red,#D93B2B);border-radius:50%;}',
      '.nmg-glyph-Speculative{border:2px solid var(--fg-faint,#9AA1A8);border-radius:50%;}',

      '.nmg-stats{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap;}',
      '.nmg-stat{min-width:150px;}',
      '.nmg-stat-s{font:400 9.5px/1.4 inherit;color:var(--fg-faint,#9AA1A8);margin-top:5px;}',
      '.nmg-bar{height:3px;width:100%;border-radius:3px;background:var(--hairline,rgba(0,0,0,.09));overflow:hidden;}',
      '.nmg-bar-f{height:100%;border-radius:3px;}',
      '.nmg-band2{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap;}',
      '.nmg-box{flex:1;min-width:210px;background:var(--panel-2,rgba(0,0,0,.025));border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:9px;padding:10px 12px;}',
      '.nmg-box-t{font:700 9px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);margin-bottom:8px;}',
      '.nmg-box-e{font:400 11px/1.4 inherit;color:var(--fg-faint,#9AA1A8);}',
      '.nmg-box-s{font:400 9.5px/1.4 inherit;color:var(--fg-faint,#9AA1A8);margin-top:7px;}',
      '.nmg-chips{display:flex;gap:5px;flex-wrap:wrap;}',
      '.nmg-pill{font:600 10.5px/1 inherit;color:var(--fg,#15181B);background:var(--panel-3,#fff);border:1px solid var(--hairline,rgba(0,0,0,.1));border-radius:6px;padding:5px 8px;}',
      '.nmg-pill-q{font-weight:500;color:var(--fg-muted,#5b6470);}',
      '.nmg-changes{margin:0;padding-left:0;list-style:none;}',
      '.nmg-changes li{position:relative;padding-left:16px;margin-bottom:6px;font:400 12.5px/1.6 inherit;color:var(--fg-muted,#5b6470);}',
      '.nmg-changes li:before{content:"";position:absolute;left:0;top:9px;width:7px;height:1.5px;background:var(--accent,#EE5A2C);}',
      '.nmg-cov{display:flex;flex-direction:column;gap:1px;border:1px solid var(--hairline,rgba(0,0,0,.08));border-radius:9px;overflow:hidden;}',
      '.nmg-cov-i{display:block;padding:9px 11px;background:var(--panel-2,rgba(0,0,0,.02));text-decoration:none;border-bottom:1px solid var(--hairline,rgba(0,0,0,.05));transition:background .12s;}',
      '.nmg-cov-i:last-child{border-bottom:0;}',
      '.nmg-cov-i:hover{background:var(--panel-3,#fff);}',
      '.nmg-cov-t{display:block;font:600 11.5px/1.45 inherit;color:var(--fg,#15181B);}',
      '.nmg-cov-s{display:block;font:400 10px/1.4 inherit;color:var(--fg-faint,#9AA1A8);margin-top:3px;}',
      '.nmg-src{display:inline-block;margin-top:8px;font:600 11px/1 inherit;color:var(--accent,#EE5A2C);text-decoration:none;}',
      '.nmg-src:hover{text-decoration:underline;}',
      '.nmg-stat{flex:1;background:var(--panel-2,rgba(0,0,0,.025));border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:9px;padding:10px 12px;}',
      '.nmg-stat-v{font:650 21px/1.05 inherit;color:var(--fg,#15181B);}',
      '.nmg-stat-l{font:600 10px/1 inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);margin-top:5px;}',

      /* ---- the dark linkage canvas ---- */
      '.nmg-canvas{position:relative;border-radius:13px;overflow:hidden;background:radial-gradient(ellipse 70% 60% at 50% 44%,#182339 0%,#0E1626 55%,#080D18 100%);border:1px solid rgba(120,150,200,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);animation:nmgFade .35s ease both;}',
      '.nmg-gbar{position:absolute;top:9px;left:11px;right:11px;display:flex;align-items:center;gap:7px;z-index:3;pointer-events:none;}',
      '.nmg-gcount{font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;color:rgba(190,205,230,.55);margin-right:auto;}',
      '.nmg-gbtn{pointer-events:auto;font:600 10.5px/1 inherit;color:rgba(210,225,245,.8);background:rgba(255,255,255,.06);border:1px solid rgba(150,180,220,.18);border-radius:7px;padding:5px 10px;cursor:pointer;transition:background .14s,color .14s;}',
      '.nmg-gbtn:hover{background:rgba(255,255,255,.13);color:#fff;}',
      '.nmg-gbtn:focus-visible{outline:2px solid #EE5A2C;outline-offset:2px;}',
      '.nmg-legend{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:13px;flex-wrap:wrap;padding:8px 12px;pointer-events:none;background:linear-gradient(to top,rgba(8,13,24,.92),rgba(8,13,24,0));}',
      '.nmg-lg-t{font:700 8.5px/1 inherit;letter-spacing:.13em;text-transform:uppercase;color:rgba(180,200,230,.5);}',
      '.nmg-lg{display:inline-flex;align-items:center;gap:6px;font:500 10px/1 inherit;color:rgba(214,226,244,.86);}',
      '.nmg-lg-q{color:rgba(170,190,215,.5);font-size:9.5px;}',
      '.nmg-lg-sep{width:1px;height:11px;background:rgba(150,180,220,.22);}',
      '.nmg-gl{width:9px;height:9px;flex:none;display:inline-block;}',
      '.nmg-gl-Strong{background:#34D399;transform:rotate(45deg);}',
      '.nmg-gl-Moderate{background:#E0A81F;border-radius:50%;}',
      '.nmg-gl-Weak{border:2px solid #F87171;border-radius:50%;}',
      '.nmg-gl-Speculative{border:2px solid #8A94A6;border-radius:50%;}',
      '.nmg-gsvg{display:block;width:100%;height:auto;touch-action:none;}',
      '.nmg-glabel{font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;fill:rgba(219,230,247,.9);paint-order:stroke;stroke:rgba(8,13,24,.85);stroke-width:2.6px;stroke-linejoin:round;pointer-events:none;}',
      '.nmg-glabel-bill{font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;fill:#fff;}',
      '.nmg-gsub{font:500 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;fill:rgba(190,205,230,.6);paint-order:stroke;stroke:rgba(8,13,24,.85);stroke-width:2.4px;pointer-events:none;}',
      '.nmg-n{cursor:grab;transition:opacity .16s;}',
      '.nmg-n:active{cursor:grabbing;}',
      '.nmg-n.dim{opacity:.2;}',
      '.nmg-n.hot .nmg-glabel{fill:#fff;font-weight:700;}',
      '.nmg-n .nmg-halo{transition:opacity .2s;}',
      '.nmg-n.hot .nmg-halo{opacity:1.35;}',
      '.nmg-n:focus{outline:none;}',
      '.nmg-n:focus-visible .nmg-hit{stroke:#EE5A2C;stroke-width:2;fill:none;}',
      '.nmg-l{transition:stroke-opacity .16s,stroke-width .16s;}',
      '.nmg-l.dim{stroke-opacity:.07;}',
      '.nmg-l.hot{stroke-opacity:1;stroke-width:2.6;}',
      '.nmg-showall{margin-top:9px;font:600 11px/1 inherit;color:var(--fg-muted,#6b7280);background:none;border:1px dashed var(--hairline,rgba(0,0,0,.16));border-radius:7px;padding:7px 12px;cursor:pointer;}',
      '.nmg-showall:hover{color:var(--fg,#15181B);border-style:solid;}',

      '.nmg-tip{position:absolute;z-index:6;pointer-events:none;background:rgba(9,14,26,.95);border:1px solid rgba(150,180,220,.2);color:#EAF0FA;border-radius:8px;padding:8px 11px;box-shadow:0 6px 20px rgba(0,0,0,.5);max-width:250px;}',
      '.nmg-tip-n{font:650 12px/1.3 inherit;}',
      '.nmg-tip-b{display:flex;align-items:center;gap:6px;font:500 10.5px/1.4 inherit;opacity:.82;margin-top:4px;}',
      '.nmg-tip-v{font:400 10.5px/1.4 inherit;opacity:.62;margin-top:3px;}',

      '.nmg-viz{margin:0 0 13px;}',
      '.nmg-sec{margin:0 0 15px;}',
      '.nmg-h4{font:700 9.5px/1 inherit;letter-spacing:.13em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);margin:0 0 7px;}',
      '.nmg-sec .nmg-p+.nmg-h4{margin-top:13px;}',
      '.nmg-p{font:400 12.5px/1.62 inherit;color:var(--fg-muted,#5b6470);margin:0 0 4px;max-width:74ch;}',
      '.nmg-p-list{color:var(--fg-faint,#8b9199);font-size:11.5px;}',

      /* --- tender scale strip: the verdict has to be readable before the prose --- */
      '.nmg-tsec{background:var(--panel-2,rgba(0,0,0,.022));border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:9px;padding:12px 13px 10px;}',
      '.nmg-tscale{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 9px;padding:8px 11px;border-radius:7px;background:var(--panel-3,#fff);border:1px solid var(--hairline,rgba(0,0,0,.08));border-left-width:3px;}',
      '.nmg-tdot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;}',
      '.nmg-tscale-h{font:700 12.5px/1.2 inherit;color:var(--fg,#15181B);}',
      '.nmg-tscale-s{font:500 10.5px/1 inherit;color:var(--fg-faint,#9AA1A8);margin-left:auto;}',
      /* Scale is size, not sentiment. Borrowing the Strong/Moderate/Weak hues here
         would read as a verdict AND collide with the link-strength legend sitting
         directly below, so this uses a neutral weight ramp and lets the words carry
         the meaning. */
      '.nmg-tsc-major{border-left-color:var(--accent,#EE5A2C);} .nmg-tsc-major .nmg-tdot{background:var(--accent,#EE5A2C);}',
      '.nmg-tsc-substantial{border-left-color:var(--accent,#EE5A2C);opacity:1;} .nmg-tsc-substantial .nmg-tdot{background:var(--accent,#EE5A2C);opacity:.62;}',
      '.nmg-tsc-standard{border-left-color:#9AA1A8;} .nmg-tsc-standard .nmg-tdot{background:#9AA1A8;}',
      '.nmg-tsc-routine{border-left-color:#B6BDC6;} .nmg-tsc-routine .nmg-tdot{background:#B6BDC6;}',
      '.nmg-tsc-none{border-left-style:dashed;border-left-color:#B6BDC6;} .nmg-tsc-none .nmg-tdot{background:transparent;border:1.5px dashed #B6BDC6;}',
      '.nmg-ttbl{margin-top:10px;}',
      '.nmg-ttbl tbody tr{cursor:default;}',
      /* --- tender data-source cards ---
         Prefixed nmg-dsrc, NOT nmg-src: .nmg-src is already taken by the inline
         source link in coverageBlock, whose ".nmg-src:hover{text-decoration:underline}"
         underlined an entire card on hover. The role suffix also avoids "-value",
         because the app ships "#detail [class*='-v']{line-height:1.15!important}",
         which substring-matches it and squashes the card's leading. */
      '.nmg-dsrc{border:1px solid var(--hairline,rgba(0,0,0,.08));border-left-width:3px;border-radius:8px;padding:10px 12px 9px;margin:0 0 9px;background:var(--panel-2,rgba(0,0,0,.018));}',
      '.nmg-dsrc-h{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin-bottom:2px;}',
      '.nmg-dsrc-n{font:650 12.5px/1.3 inherit;color:var(--fg,#15181B);}',
      '.nmg-dsrc-tag{font:700 8.5px/1 inherit;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:999px;border:1px solid currentColor;}',
      '.nmg-dsrc-a{font:500 10.5px/1 inherit;color:var(--fg-faint,#9AA1A8);margin-bottom:6px;}',
      '.nmg-dsrc .nmg-p b{color:var(--fg,#15181B);font-weight:650;}',
      '.nmg-dsrc-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;}',
      '.nmg-dsrc-links a{font:600 10.5px/1 inherit;text-decoration:none;padding:5px 8px;border-radius:6px;border:1px solid var(--hairline,rgba(0,0,0,.12));background:var(--panel-3,#fff);color:var(--fg-muted,#5b6470);white-space:nowrap;}',
      '.nmg-dsrc-links a:hover{border-color:var(--accent,#EE5A2C);color:var(--accent,#EE5A2C);}',
      /* The tag colour says which role a source plays and the word says it too, so
         the badge never depends on hue alone. */
      '.nmg-dsrc-feed{border-left-color:var(--accent,#EE5A2C);} .nmg-dsrc-feed .nmg-dsrc-tag{color:var(--accent,#EE5A2C);}',
      '.nmg-dsrc-enrich{border-left-color:#2FA254;} .nmg-dsrc-enrich .nmg-dsrc-tag{color:#2FA254;}',
      '.nmg-dsrc-paid{border-left-color:#9AA1A8;} .nmg-dsrc-paid .nmg-dsrc-tag{color:#78818B;}',
      /* the hoisted card keeps the host's own panel class, so the host's panel CSS
         still applies; only the bits that assumed a full-width table row are reset */
      '.nmg-hoisted{margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;}',
      '.nmg-hoisted > *:first-child{margin-top:0!important;}',
      '.nmg-hoisted .rd-section:first-child{border-top:0!important;padding-top:0!important;}',
      '.nmg-noviz{background:var(--panel-2,rgba(0,0,0,.025));border:1px dashed var(--hairline,rgba(0,0,0,.14));border-radius:8px;padding:14px 15px;font:400 12.5px/1.6 inherit;color:var(--fg-muted,#5b6470);}',
      '.nmg-noviz b{color:var(--fg,#15181B);font-weight:650;}',
      '.nmg-ttbl .nmg-tnum{text-align:right;font-variant-numeric:tabular-nums;width:1%;white-space:nowrap;}',

      '.nmg-detail{background:var(--panel-2,rgba(0,0,0,.025));border:1px solid var(--hairline,rgba(0,0,0,.07));border-left:2px solid var(--accent,#EE5A2C);border-radius:8px;padding:11px 13px;margin:0 0 15px;}',
      '.nmg-detail-empty{border-left-color:var(--hairline,rgba(0,0,0,.12));font:400 11.5px/1.5 inherit;color:var(--fg-faint,#9AA1A8);}',
      '.nmg-detail-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}',
      '.nmg-detail-n{font:650 13px/1.3 inherit;color:var(--fg,#15181B);}',
      '.nmg-detail-meta{font:500 10.5px/1 inherit;color:var(--fg-faint,#9AA1A8);margin:5px 0 7px;}',
      '.nmg-chain{font:500 11px/1.5 inherit;color:var(--fg-muted,#5b6470);background:var(--panel-3,#fff);border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:6px;padding:6px 9px;margin-bottom:7px;}',
      '.nmg-chip{display:inline-flex;align-items:center;gap:5px;font:600 10px/1 inherit;color:var(--fg-muted,#5b6470);background:var(--panel-3,#fff);border:1px solid var(--hairline,rgba(0,0,0,.1));border-radius:999px;padding:4px 8px;white-space:nowrap;}',

      '.nmg-path{padding:11px 0;border-top:1px solid var(--hairline,rgba(0,0,0,.07));}',
      '.nmg-path:first-of-type{border-top:0;padding-top:2px;}',
      '.nmg-path-h{display:flex;align-items:baseline;gap:9px;font:650 12px/1.3 inherit;color:var(--fg,#15181B);margin-bottom:5px;}',
      '.nmg-path-n{font:500 10.5px/1 inherit;color:var(--fg-faint,#9AA1A8);}',

      /* ---- detailed analysis ---- */
      '.nmg-detailbtn{font:650 10.5px/1 inherit;color:var(--panel-3,#fff);background:var(--accent,#EE5A2C);border:1px solid var(--accent,#EE5A2C);border-radius:7px;padding:7px 9px;cursor:pointer;white-space:nowrap;transition:filter .14s,background .14s,color .14s;}',
      '.nmg-detailbtn:hover{filter:brightness(1.08);}',
      '.nmg-detailbtn.on{background:var(--fg,#15181B);border-color:var(--fg,#15181B);}',
      '.nmg-detailbtn:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '.nmg-report{margin-top:12px;animation:nmgIn .22s ease both;}',
      '.nmg-rsec{margin:0 0 16px;padding:13px;background:var(--panel-2,rgba(0,0,0,.022));border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:10px;}',
      '.nmg-h5{font:700 10px/1 inherit;letter-spacing:.11em;text-transform:uppercase;color:var(--accent,#EE5A2C);margin:0 0 10px;}',
      '.nmg-rr{display:grid;grid-template-columns:minmax(96px,20%) 1fr;gap:10px;padding:6px 0;border-top:1px solid var(--hairline,rgba(0,0,0,.05));}',
      '.nmg-rr:first-of-type{border-top:0;}',
      '.nmg-rr-k{font:700 9.5px/1.5 inherit;letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);}',
      '.nmg-rr-v{font:400 12px/1.6 inherit;color:var(--fg-muted,#5b6470);}',
      '.nmg-ul{margin:0;padding-left:16px;}',
      '.nmg-ul li{margin-bottom:3px;}',
      '.nmg-rblock{padding:12px;margin:0 0 10px;background:var(--panel-3,#fff);border:1px solid var(--hairline,rgba(0,0,0,.07));border-radius:9px;}',
      '.nmg-rblock-h{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font:650 12.5px/1.3 inherit;color:var(--fg,#15181B);margin-bottom:8px;}',
      '.nmg-rbadge{font:700 9.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--panel-3,#fff);background:var(--fg,#15181B);border-radius:5px;padding:4px 6px;}',
      '.nmg-tbl-mini{margin-top:9px;}',

      '.nmg-tblwrap{overflow-x:auto;border:1px solid var(--hairline,rgba(0,0,0,.08));border-radius:9px;}',
      '.nmg-tbl{width:100%;border-collapse:collapse;font-size:11.5px;}',
      '.nmg-tbl th{text-align:left;font:700 9.5px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);padding:9px 11px;background:var(--panel-2,rgba(0,0,0,.03));border-bottom:1px solid var(--hairline,rgba(0,0,0,.08));white-space:nowrap;}',
      '.nmg-tbl td{padding:8px 11px;border-bottom:1px solid var(--hairline,rgba(0,0,0,.05));color:var(--fg-muted,#5b6470);vertical-align:middle;}',
      '.nmg-tbl tbody tr:last-child td{border-bottom:0;}',
      '.nmg-tbl tbody tr:hover td{background:var(--panel-2,rgba(0,0,0,.022));}',
      '.nmg-td-n{color:var(--fg,#15181B);font-weight:600;}',
      '.nmg-td-p{font-variant-numeric:tabular-nums;color:var(--fg-faint,#9AA1A8);}',
      '.nmg-td-v{max-width:300px;}',
      '.nmg-none{font:400 12px/1.6 inherit;color:var(--fg-faint,#9AA1A8);padding:26px 4px;text-align:center;}',
      '.nmg-foot{font:400 10.5px/1.55 inherit;color:var(--fg-faint,#9AA1A8);margin-top:14px;padding-top:11px;border-top:1px solid var(--hairline,rgba(0,0,0,.07));}',
      /* The open record is unmistakable in the feed. The app ships
         "#detail table.sample tbody tr td{background:transparent!important}" — a
         (1 id, 1 class, 4 elements) selector — so these must carry at least as much
         specificity to win, hence the full table path plus the row class. */
      '#detail table.sample tbody tr.nmg-row-sel > td{background:rgba(238,90,44,.11)!important;}',
      '#detail table.sample tbody tr.nmg-row-sel > td:first-child{box-shadow:inset 3px 0 0 var(--accent,#EE5A2C)!important;}',
      '#detail table.sample tbody tr.nmg-row-sel > td{font-weight:600!important;}',

      '.nmg-impactbtns{display:flex;gap:7px;flex-wrap:wrap;margin:11px 0 0;}',
      '.nmg-ibtn{flex:1 1 180px;font:650 11.5px/1 inherit;color:var(--fg,#15181B);background:var(--panel-2,rgba(0,0,0,.03));border:1px solid var(--hairline,rgba(0,0,0,.11));border-radius:9px;padding:11px 13px;cursor:pointer;text-align:left;transition:background .14s,border-color .14s,color .14s;}',
      '.nmg-ibtn:before{content:"▸ ";color:var(--accent,#EE5A2C);}',
      '.nmg-ibtn:hover{background:var(--panel-3,#fff);border-color:var(--accent,#EE5A2C);}',
      '.nmg-ibtn.on{background:var(--fg,#15181B);border-color:var(--fg,#15181B);color:var(--panel-3,#fff);}',
      '.nmg-ibtn.on:before{content:"▾ ";color:var(--panel-3,#fff);}',
      '.nmg-ibtn:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '.nmg-impactpanel{margin-top:9px;padding:12px 13px;background:var(--panel-2,rgba(0,0,0,.022));border:1px solid var(--hairline,rgba(0,0,0,.08));border-radius:9px;animation:nmgIn .18s ease both;}',
      '.nmg-impactpanel .nmg-path:first-of-type{padding-top:0;}',

      '.nmg-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;}',
      '.nmg-act{display:inline-flex;align-items:center;gap:5px;font:600 11px/1 inherit;color:var(--fg,#15181B);background:var(--panel-2,rgba(0,0,0,.04));border:1px solid var(--hairline,rgba(0,0,0,.12));border-radius:8px;padding:8px 12px;cursor:pointer;text-decoration:none;transition:background .14s,border-color .14s,color .14s;}',
      '.nmg-act:hover{background:var(--panel-3,#fff);border-color:var(--accent,#EE5A2C);color:var(--accent,#EE5A2C);}',
      '.nmg-act-ai{background:var(--accent,#EE5A2C);border-color:var(--accent,#EE5A2C);color:var(--panel-3,#fff);}',
      '.nmg-act-ai:hover{filter:brightness(1.08);background:var(--accent,#EE5A2C);color:var(--panel-3,#fff);}',
      '.nmg-act-off{opacity:.45;cursor:not-allowed;}',
      '.nmg-act-off:hover{background:var(--panel-2,rgba(0,0,0,.04));border-color:var(--hairline,rgba(0,0,0,.12));color:var(--fg,#15181B);}',
      '.nmg-act:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      /* merged view: the per-row accordion is replaced by the Analytics pane */
      /* Two different expanders ship in this terminal: the bill-style accordion
         (tr.expand-panel-row) and the record-detail panel used by tenders and the
         newer desks (tr.niy-rd-panel-row). Merging the view into Analytics means
         suppressing both, or the tender desk keeps opening a card under the row. */
      'body.nmg-merged #detail tr.expand-panel-row{display:none!important;}',
      'body.nmg-merged #detail tr.niy-rd-panel-row{display:none!important;}',
      /* ================= TERMINAL CHROME DENSITY =================
         Applies to every feature detail view, not just this one.

         The stock header wastes a lot of room: 16px/12px vertical padding around a
         25px title, and a toolbar that is pushed hard right (margin-left:auto +
         justify-content:flex-end), leaving ~900px of dead space between the segment
         name and the first control at a 2000px window.

         This is done with CSS ordering rather than by moving nodes, because
         layoutDetail() re-appends the toolbar into the head on every feature
         change — anything relocated in the DOM would be put back on the next render.
         ============================================================ */
      '#detail .detail-head{padding-top:6px!important;padding-bottom:5px!important;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged{margin-bottom:6px!important;padding-bottom:6px!important;gap:6px 10px!important;align-items:center!important;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged .detail-title-block{flex:0 0 auto;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged .toolbar{margin-left:10px!important;justify-content:flex-start!important;flex:0 1 auto!important;padding-bottom:0!important;gap:6px!important;align-items:center;}',
      /* segment name, then Source and the overflow/export menu, then the filter box
         takes the slack, with Filters parked at the far right */
      '#detail.niy-laid-out .toolbar > .toolbar-btn{order:1;}',
      /* .niy-more carries a large computed margin-left (~570px) that is what really
         strands the overflow + export cluster at the far edge */
      /* the app pins this with "body.niy-feature #detail .toolbar .niy-more
         {margin-left:auto!important}" — beating it needs the body prefix too */
      'body.niy-feature #detail.niy-laid-out .toolbar .niy-more{order:2;margin-left:6px!important;}',
      '#detail.niy-laid-out .toolbar > .niy-more{order:2;margin-left:6px!important;}',
      '#detail.niy-laid-out .toolbar > .feat-related-wrap{order:3;}',
      /* the export cluster ships with margin-left:auto, which is what actually
         strands it at the far edge — neutralise it and seat it with the rest */
      '#detail.niy-laid-out .toolbar > .niy-hdr-actions{order:3;margin-left:6px!important;}',
      '#detail.niy-laid-out .toolbar > .niy-primary{order:3;margin-left:0!important;}',
      /* the desk search takes the slack on the RIGHT so the row fills edge to edge
         instead of leaving a dead half once the controls group next to the name */
      '#detail.niy-laid-out .toolbar > .filter-group{order:4;flex:0 1 300px!important;min-width:130px;margin-left:6px!important;}',
      '#detail.niy-laid-out .toolbar > .filter-group .filter-input{width:100%!important;}',
      '#detail.niy-laid-out .toolbar > .niy-filt{order:5;margin-left:6px!important;}',
      /* the filter button ships taller than its neighbours and alone sets the row
         height on the desks that have one — match it to the rest */
      '#detail.niy-laid-out .toolbar > .niy-filt > button{width:26px!important;height:26px!important;padding:4px!important;}',

      /* --- Export removed; the overflow menu keeps Ask AI / Related --- */
      '#detail .toolbar > .niy-hdr-actions{display:none!important;}',

      /* --- the column-head band, folded up into the header row --- */
      '#detail .nmg-head-folded{display:none!important;}',
      /* reading order on the one line: segment name -> LIVE FEED -> Source/overflow,
         then the analytics tabs pinned right. Done with flex order so no node moves. */
      '#detail.niy-laid-out .detail-head.niy-head-merged > .detail-title-block{order:1;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged > .nmg-feedgrp{order:2;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged > .toolbar{order:3;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged > .nmg-workgrp{order:4;}',
      '#detail .nmg-feedgrp{display:flex;align-items:center;gap:8px;margin-left:16px;padding-left:16px;border-left:1px solid var(--hairline,rgba(0,0,0,.12));}',
      '#detail .nmg-workgrp{display:flex;align-items:center;gap:10px;margin-left:auto;padding-left:16px;border-left:1px solid var(--hairline,rgba(0,0,0,.12));}',
      '#detail .nmg-feedgrp .niy-col-title{font:700 9.5px/1 inherit;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);white-space:nowrap;}',
      '#detail .nmg-workgrp .niy-work-modes{display:flex;gap:2px;}',
      '#detail .nmg-feedgrp .niy-col-toggle,#detail .nmg-workgrp .niy-col-toggle{opacity:.55;}',
      '#detail .nmg-feedgrp .niy-col-toggle:hover,#detail .nmg-workgrp .niy-col-toggle:hover{opacity:1;}',
      /* the panes now start straight after the single header line. The stock
         .section-label is hidden with a class but still contributes 22px of
         margin-top — half the remaining gap came from an element you cannot see. */
      '#detail.niy-laid-out .niy-col-body{padding-top:0!important;}',
      '#detail .niy-col-body > .section-label.niy-hide{display:none!important;margin:0!important;height:0!important;}',
      '#detail.niy-laid-out .detail-head{margin-bottom:2px!important;}',
      '#detail.niy-laid-out .detail-head.niy-head-merged{margin-bottom:2px!important;}',
      '#detail.niy-laid-out .niy-split{margin-top:0!important;}',
      /* the column padding is pinned by "html body #detail .niy-split > .niy-col-feed
         {padding:16px!important}" — a (1 id, 2 class, 2 element) selector, so the
         override has to carry the html/body prefix too. Only the TOP is trimmed;
         the side padding stays. */
      'html body #detail.niy-laid-out .niy-split > .niy-col-feed{padding-top:4px!important;}',
      'html body #detail.niy-laid-out .niy-split > .niy-col-work{padding-top:4px!important;}',
      'html body #detail.niy-laid-out .niy-col-feed table.sample{margin-top:2px!important;}',
      '#detail.niy-laid-out .toolbar-msg{margin:0!important;padding:0!important;}',
      '#detail.niy-laid-out .toolbar-msg:empty{display:none!important;}',
      /* the panes gain the height the header gives back */
      '#detail.niy-laid-out .niy-col-head{padding-top:6px!important;padding-bottom:6px!important;}',

      '@media (prefers-reduced-motion:reduce){.nmg-wrap,.nmg-canvas,.nmg-report,.nmg-n,.nmg-l{animation:none!important;transition:none!important;}}'
    ].join('');
    /* ================= NATIONAL DESK STRUCTURE =================
       The host consolidates raw buckets into five display groups per tier
       (BUCKET_REMAP -> enhanceSidebar), and it does that from FEATURE_DATA, which
       is shared across tiers. So the National desk is restructured HERE, at
       display time, exactly like the host's own consolidation pass — rename the
       five groups, move two features between them, and set the order.

       Three things make this safe rather than fragile:
        - it only fires when the National signature is on screen (>=4 of the five
          original bucket names), so State/Geopolitics/Local/Finance are untouched;
        - the original name is stamped once into data-nmg-orig, because the host's
          nameAll() re-derives data-name FROM the visible text and would otherwise
          erase the only key we have;
        - group icons are chosen by name from maps that simply return early on an
          unknown key, so a renamed group keeps the icon it already had. */
    var NAT_FROM = {
      'Representative & Media Intelligence': 'Media',
      'Legislative & Policy Intelligence': 'Legislative & Policy',
      'Electoral Data & Analytics': 'Electoral',
      'Government Operations': 'Gov. Operations',
      'Economy, Finance & Industry': 'Economy & Finance'
    };
    var NAT_ORDER = ['Media', 'Legislative & Policy', 'Electoral', 'Gov. Operations', 'Economy & Finance'];
    // Two features sit under the wrong desk once the groups are renamed: MP report
    // cards are an electoral record, and the statement tracker is a media one.
    var NAT_MOVE = [
      { re: /MP Report Cards|MP Profiles & Performance/i, to: 'Electoral' },
      { re: /Statements? & Contradictions|Statement & Quote Tracker/i, to: 'Media' }
    ];

    function natGroups(list) {
      return Array.prototype.slice.call(list.querySelectorAll('.sidebar-group'))
        .filter(function (g) { return g.querySelector('.niy-acc-name'); });
    }
    function natOrigName(g) {
      var head = g.querySelector('.niy-acc-head') || g.querySelector('.sidebar-group-label');
      var nm = g.querySelector('.niy-acc-name');
      if (!head || !nm) return '';
      var cur = (nm.textContent || '').trim();
      if (head.dataset.nmgOrig) return head.dataset.nmgOrig;
      head.dataset.nmgOrig = cur;
      return cur;
    }
    function natSignature(list) {
      var hit = 0;
      natGroups(list).forEach(function (g) { if (NAT_FROM[natOrigName(g)]) hit++; });
      return hit;
    }
    function natFix() {
      var list = document.getElementById('sidebarList'); if (!list) return;
      var groups = natGroups(list); if (groups.length < 4) return;
      if (natSignature(list) < 4) return;            // not the National desk

      var byNew = {};
      groups.forEach(function (g) {
        var to = NAT_FROM[natOrigName(g)];
        if (to) byNew[to] = g;
      });

      // 1. move the two features that changed desk
      NAT_MOVE.forEach(function (rule) {
        var target = byNew[rule.to]; if (!target) return;
        var body = target.querySelector('.niy-acc-body'); if (!body) return;
        list.querySelectorAll('.feat-item').forEach(function (it) {
          if (!rule.re.test(it.textContent || '')) return;
          if (it.parentElement === body) return;
          body.appendChild(it);
        });
      });

      // 2. rename, and re-count after the moves
      Object.keys(byNew).forEach(function (nm) {
        var g = byNew[nm];
        var span = g.querySelector('.niy-acc-name');
        if (span && (span.textContent || '').trim() !== nm) span.textContent = nm;
        var cnt = g.querySelector('.niy-acc-count');
        var n = g.querySelectorAll('.feat-item').length;
        if (cnt && cnt.textContent !== String(n)) cnt.textContent = String(n);
        var ico = g.querySelector('.niy-gicon');
        if (ico && ico.title !== nm) ico.title = nm;
        // A group emptied by a move would render as a bare header, so hide it. But
        // only ever UN-hide a group we hid ourselves: the host's search filter also
        // writes display:none on groups with no matching item, and clearing that
        // every 900ms brings all five groups back in the middle of a search.
        if (!n) { g.style.display = 'none'; g.dataset.nmgHid = '1'; }
        else if (g.dataset.nmgHid) { g.style.display = ''; delete g.dataset.nmgHid; }
      });

      // 3. order. Anything unrecognised keeps its relative place at the end rather
      //    than being dropped — this pass must never lose a group.
      var want = [];
      NAT_ORDER.forEach(function (nm) { if (byNew[nm]) want.push(byNew[nm]); });
      groups.forEach(function (g) { if (want.indexOf(g) < 0) want.push(g); });
      // Re-appending only the elements that look out of place does NOT sort a list:
      // every append shifts the ones behind it, so a single pass can leave the order
      // wrong (children [C,A,B] against want [A,B,C] ends up [B,A,C]). Either the
      // order is already right and we touch nothing, or we re-append the whole set
      // in order, which is correct by construction.
      var moved = false;
      for (var i = 0; i < want.length; i++) { if (list.children[i] !== want[i]) { moved = true; break; } }
      if (moved) {
        for (var j = 0; j < want.length; j++) list.appendChild(want[j]);
      }
      if (moved) {
        // re-appending detaches and re-attaches, which resets a transitioning
        // max-height mid-flight; anything still open is pinned back open.
        list.querySelectorAll('.sidebar-group').forEach(function (g) {
          var head = g.querySelector('.niy-acc-head'), body = g.querySelector('.niy-acc-body');
          if (head && body && head.classList.contains('open')) body.style.maxHeight = 'none';
        });
      }
      // a body that gained an item while open would clip at its old pixel height
      list.querySelectorAll('.sidebar-group').forEach(function (g) {
        var head = g.querySelector('.niy-acc-head'), body = g.querySelector('.niy-acc-body');
        if (head && body && head.classList.contains('open') && body.style.maxHeight !== 'none') body.style.maxHeight = 'none';
      });
    }

    (function watchNav() {
      var pending = false, inside = false;
      function run() { inside = true; try { natFix(); } catch (e) {} inside = false; }
      function ping() {
        if (pending || inside) return;          // our own writes must not re-trigger us
        pending = true;
        requestAnimationFrame(function () { pending = false; run(); });
      }
      run();
      // Observe the sidebar CONTAINER, not the list: the host replaces #sidebarList
      // wholesale on a catalogue rebuild, and an observer bound to the old node goes
      // deaf. Watching the parent subtree costs nothing here — the sidebar holds ~20
      // nodes, unlike #detail, where a subtree observer would fire on 9,000 rows.
      var root = document.getElementById('sidebar') || document.getElementById('sidebarList');
      var mo = new MutationObserver(ping);
      if (root) mo.observe(root, { childList: true, subtree: true });
      // belt and braces: the sidebar itself can be replaced on a tier switch
      setInterval(function () {
        try {
          var r = document.getElementById('sidebar') || document.getElementById('sidebarList');
          if (r && r !== root) { root = r; try { mo.disconnect(); } catch (e) {} mo.observe(root, { childList: true, subtree: true }); }
          run();
        } catch (e) {}
      }, 900);
    })();

    var st = document.createElement('style'); st.id = 'nmg-style'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);

    try { patchTenderSourceMeta(); } catch (e) {}
    try { window.__NMG_TENDER__ = { value: tenderValue, scale: tenderScale, inr: inr, sources: TENDER_SOURCES }; } catch (e) {}
    try { console.log('%c[NMG] Linkage brain online', 'color:#EE5A2C'); } catch (e) {}
  } catch (e) {
    try { console.warn('[NMG] init failed, terminal unaffected:', e); } catch (_) {}
  }
})();

