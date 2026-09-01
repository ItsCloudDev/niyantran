
/* ============================================================================
   NIYANTRAN — National Desk Change Order.  Additive, fail-silent.
   ----------------------------------------------------------------------------
   One appended <script id="nmg-national-desk-changes"> before <\/body>.
   Zero edits to existing code; removal restores the file byte-for-byte.

   CR-0  terminal-wide inline record strip + seeded Ask AI      [this session]

   Everything here is wrapped so it cannot throw into the host: the outer IIFE
   is a try, every listener goes through safe(), and every read of a terminal
   global is guarded. If any of it fails the terminal behaves exactly as it
   does today, minus the strip.
   ========================================================================== */
(function () {
  'use strict';
  try {
    if (window.__NMG_NDC__) return; window.__NMG_NDC__ = 1;

    /* ---------------- utils ---------------- */
    function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/[<]/g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    function safe(fn) {
      return function (a) {
        try { return fn.call(this, a); }
        catch (e) { try { console.warn('[NMG/NDC]', e); } catch (_) {} }
      };
    }
    /* The terminal's own globals, read the only way that actually works.
       EMBEDDED_CSV_DATA, EMBEDDED_JSON_DATA, activeTier and activeIndex are
       declared as script-level `const`/`let` in classic scripts, so they live
       in the global LEXICAL environment and are NOT properties of `window`
       -- window.EMBEDDED_CSV_DATA is undefined. They resolve only as bare
       identifiers, which is also why this block has to be appended AFTER the
       blocks that declare them. Each read is wrapped because a bare
       identifier that was never declared throws a ReferenceError. */
    function G_csv()   { try { return EMBEDDED_CSV_DATA; } catch (e) { return undefined; } }
    function G_json()  { try { return EMBEDDED_JSON_DATA; } catch (e) { return undefined; } }
    function G_tier()  { try { return activeTier; } catch (e) { return undefined; } }
    function G_index() { try { return activeIndex; } catch (e) { return undefined; } }
    function G_feats() { try { return featuresForTier; } catch (e) { return undefined; } }
    function G_label() { try { return tierLabel; } catch (e) { return undefined; } }
    function G_brain() { try { return window.NiyBrain; } catch (e) { return undefined; } }

    /* ================================================================
       CR-0 — the inline record strip
       ================================================================
       V21 deliberately suppressed the under-row accordion and merged the
       record card into the Analytics pane
       ("body.nmg-merged #detail tr.expand-panel-row{display:none}").
       That stays. This is NOT a revival of the accordion: it is a separate
       three-line row that carries the analysis paragraph, the record's tag
       chips and an Ask AI button, and nothing else. The full analytics keep
       opening in the Analytics pane exactly as they do today.
       ================================================================ */

    /* ---- desk config -------------------------------------------------
       CR-0 applies to EVERY desk on EVERY tier, so it is not driven by a
       desk table at all — it reads whatever `featuresForTier(activeTier)`
       reports. The only per-desk configuration it needs is the one place
       where the host's own filename derivation is wrong.

       The host derives a record's analysis file mechanically, in
       openRowDetail():  csv.replace(/\.csv$/,'') + '_analysis.json'.
       That is right for every dataset in the build except the bill
       tracker, whose analysis ships as `national_bill_analysis.json`
       (no "_tracker"). The consequence in the shipped terminal is that
       bills — the largest analysed dataset on the National desk — render
       their record card with NO Niyantran analysis block at all.

       This map is the exception list, not a parallel desk table. The
       linkage-brain block's own FEATURES table already records the same
       fact (`analysis: 'national_bill_analysis.json'`) but does not export
       it, and reading it would mean editing that file. See
       docs/specs/NIYANTRAN_NationalDeskChanges.md, "Config duplication". */
    var ANALYSIS_FILE = { 'national_bill_tracker.csv': 'national_bill_analysis.json' };
    function analysisFileFor(csv) {
      return ANALYSIS_FILE[csv] || String(csv).replace(/\.csv$/i, '') + '_analysis.json';
    }

    /* ---- which desk is open -----------------------------------------
       Same discipline as the linkage brain's activeFeature(): two signals
       that must agree. `featuresForTier(activeTier)[activeIndex]` is the
       state, the rendered .detail-title is the DOM, and during a desk swap
       they disagree for about a second. Trusting the state alone would
       read the NEW desk's rows array with the OLD desk's row indices and
       render one record's analysis over another record's row.

       The title is shortened through DISPLAY_NAMES ("Parliamentary
       Question Database" renders as "Parliamentary Questions"), and
       shortenLabelEl() stashes the full name in the title attribute — so
       the attribute is checked first and the text second. No new
       title-first path: the title is only ever a veto here, never the
       thing that decides which desk is open. */
    function deskNow() {
      var ft = G_feats(), at = G_tier(), ai = G_index();
      if (typeof ft !== 'function' || typeof at !== 'string' || typeof ai !== 'number') return null;
      var f = null;
      try { f = ft(at)[ai] || null; } catch (e) { return null; }
      if (!f || !f.dataSource || !f.dataSource.csv) return null;
      var el = document.querySelector('#detail .detail-title');
      if (!el) return null;
      var txt = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) txt += el.childNodes[i].textContent;
      }
      var shown = (el.getAttribute('title') || txt).trim();
      if (!shown || norm(shown) !== norm(f.feature)) return null;   // mid-swap: stand down
      return { f: f, csv: f.dataSource.csv, tier: at };
    }

    /* ---- resolve the clicked row to its record ----------------------
       Display order may be sorted, so data-raw-idx is the raw-CSV index
       and data-row-idx is the display one — the host itself prefers the
       raw attribute and so do we.

       The index is then CROSS-CHECKED against what is on screen. Reading
       rows[idx] out of the desk we think is open is exactly how one
       record's analysis ends up printed under another record's row when a
       feed re-render lands between the click and this call. If the first
       cell's text is not one of the record's own values, we render no
       strip rather than a wrong one. */
    function isPanelRow(n) {
      return !!(n && n.classList && (n.classList.contains('niy-rd-panel-row') ||
                n.classList.contains('expand-panel-row') || n.classList.contains('nmg-strip-row')));
    }
    function recordFor(row, desk) {
      // The bill desk interleaves hidden tr.expand-panel-row rows that carry a
      // data-row-idx of their own. The click handler already refuses them, but
      // this is also a public verification hook, so it refuses them here too --
      // a panel row's index resolves to a real record and would look correct.
      if (!row || isPanelRow(row)) return null;
      var data = G_csv();
      if (!data) return null;
      var rows = data[desk.csv] || [];
      if (!rows.length) return null;
      var a = row.getAttribute('data-raw-idx');
      if (a == null) a = row.getAttribute('data-row-idx');
      var idx = parseInt(a, 10);
      var rec = (!isNaN(idx) && rows[idx]) ? rows[idx] : null;
      if (!rec) return null;

      var c0 = row.querySelector('td');
      // the cell's title attribute carries the full value; its text may be
      // truncated by the desk's rowMap, so prefer the attribute
      var cell = c0 ? norm(c0.getAttribute('title') || c0.textContent) : '';
      if (cell) {
        var ok = false, k;
        for (k in rec) {
          if (!Object.prototype.hasOwnProperty.call(rec, k)) continue;
          var v = norm(rec[k]);
          if (!v) continue;
          if (v === cell || v.indexOf(cell) === 0 || cell.indexOf(v) === 0) { ok = true; break; }
        }
        if (!ok) return null;
      }
      var id = (rec.id != null && String(rec.id).trim() !== '') ? String(rec.id) : String(idx);
      // Every value the row is already showing, delimited so a short value
      // cannot match inside a longer one.
      var onScreen = '\u0001';
      row.querySelectorAll('td').forEach(function (td) {
        var t = norm(td.getAttribute('title') || td.textContent);
        if (t) onScreen += t + '\u0001\u0001';
      });
      return { rec: rec, idx: idx, id: id, csv: desk.csv, onScreen: onScreen,
               cell: c0 ? (c0.getAttribute('title') || c0.textContent || '').trim() : '' };
    }

    /* ---- the analysis layer ------------------------------------------
       Keyed by the record's real id, falling back to its raw index — the
       same resolution order the host uses, so the strip and the host's own
       record card can never name different analyses for one row. */
    function analysisBag(csv) {
      var J = G_json();
      if (!J) return null;
      return J[analysisFileFor(csv)] || null;
    }
    function analysisFor(csv, id, idx) {
      var bag = analysisBag(csv);
      if (!bag) return null;
      return bag[id] || bag[String(idx)] || null;
    }
    // How much of this dataset the analysis pipeline has actually covered.
    // The strip prints this in its empty state, because "no analysis on this
    // row" and "this dataset is 0.4% analysed" are different facts and the
    // reader is entitled to the second one.
    var COV = {};
    function coverage(csv) {
      if (COV[csv]) return COV[csv];
      var data = G_csv() || {};
      var bag = analysisBag(csv);
      var out = {
        rows: (data[csv] || []).length,
        analysed: bag ? Object.keys(bag).filter(function (k) { return bag[k] && bag[k].brief; }).length : 0,
        haveFile: !!bag
      };
      COV[csv] = out;
      return out;
    }

    /* ---- tags ---------------------------------------------------------
       Two distinct kinds, never mixed and never presented as the same
       thing: tags the analysis pipeline resolved, and the record's own
       categorical field values. The second are facts off the row, not an
       interpretation of it, so they carry their own style and their own
       written label. */
    var FIELD_TAGS = /^(party|ministry|house|question_type|action_type|regulator|sector|state|constituency|status|stage|current_stage|priority|category|department|court|cadre|scheme|bucket|registry|jurisdiction|bloc|type)$/i;
    // Keys that are plumbing, not content.
    var FIELD_SKIP = /^(id|_.*|.*_url|url|link|href|pdf|slug|guid|uid|idx|index|rank|lat|lon|lng)$/i;
    var LOOKS_NUMBER = /^[-+]?[\d.,%\s]+$/;
    var LOOKS_DATE = /^\d{1,4}[-./]\d{1,2}([-./]\d{1,4})?/;
    var LOOKS_URL = /^(https?:|www\.|mailto:)/i;

    /* A field is worth showing as a chip when it reads as a category rather
       than as a measurement, an identifier or the record's own name. The
       whitelist above is the stable, semantic half; this shape test is the
       half that keeps working on the next dataset nobody has named yet.
       Without it, eight of the thirty-six desks with rows render "no tags"
       purely because their columns are not called "party" or "ministry". */
    function chipWorthy(k, v, onScreen) {
      if (FIELD_SKIP.test(k)) return false;
      if (!v || v.length > 44) return false;
      if (LOOKS_URL.test(v) || LOOKS_NUMBER.test(v) || LOOKS_DATE.test(v)) return false;
      // A chip has to ADD something. Every value the row already displays --
      // whichever column it sits in -- is dropped, so the strip never repeats
      // the ministry and the subject the reader is already looking at.
      if (onScreen && onScreen.indexOf('\u0001' + norm(v) + '\u0001') >= 0) return false;
      return true;
    }
    function tagsFor(rec, a, onScreen) {
      if (a) {
        var t = Array.isArray(a.tags) ? a.tags : (Array.isArray(a.sectors) ? a.sectors : []);
        t = t.map(function (x) { return String(x).trim(); }).filter(Boolean);
        if (t.length) return { kind: 'tags', list: t.slice(0, 5) };
      }
      var named = [], shaped = [], onRow = 0, k;
      for (k in rec) {
        if (!Object.prototype.hasOwnProperty.call(rec, k)) continue;
        var v = String(rec[k] == null ? '' : rec[k]).trim();
        if (!chipWorthy(k, v, null)) continue;              // shape test only
        if (!chipWorthy(k, v, onScreen)) { onRow++; continue; }   // already visible
        (FIELD_TAGS.test(k) ? named : shaped).push({ k: k, v: v });
      }
      // An empty chip row has two different causes and they are not the same
      // fact, so they do not get the same sentence.
      return { kind: 'fields', list: named.concat(shaped).slice(0, 4),
               why: onRow ? 'every field on this record is already shown in the row'
                          : 'this record carries no tag or category field' };
    }

    /* ---- is the AI workspace actually reachable? ----------------------
       A dead Ask AI click is a failure, not a degradation, so the button
       is disabled and LABELLED whenever the workspace cannot answer.

       Two ways it can answer: the server-side /api/askai proxy, or the
       viewer's own stored key (callAI falls back to a direct browser call).
       So: a stored key is decisive; on file:// there is no proxy to reach;
       otherwise the endpoint is probed once per page load with a GET.
       404-with-no-JSON means the function is not deployed. A live function
       invoked with the wrong method answers 405/400, which counts as
       present.

       What this CANNOT detect is a deployed function that is broken or out
       of credit — that surfaces inside the workspace as the host's own
       error line, with the seeded context already attached, which is a
       labelled failure rather than a dead button. */
    var AI = { state: 'unknown', probed: false };
    function aiKey() { try { return !!(window.hasApiKey && window.hasApiKey()); } catch (e) { return false; } }
    function aiProbe() {
      if (AI.probed) return; AI.probed = true;
      if (typeof window.openAiWorkspace !== 'function') { AI.state = 'off'; return; }
      if (aiKey()) { AI.state = 'on'; return; }
      if (location.protocol === 'file:') { AI.state = 'off'; repaintStrips(); return; }
      try {
        fetch('/api/askai', { method: 'GET', cache: 'no-store' }).then(function (r) {
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          AI.state = (r.status === 404 && ct.indexOf('json') < 0) ? 'off' : 'on';
          repaintStrips();
        })['catch'](function () { AI.state = 'off'; repaintStrips(); });
      } catch (e) { AI.state = 'off'; }
    }
    function aiReady() {
      if (typeof window.openAiWorkspace !== 'function') return false;
      if (aiKey()) return true;
      return AI.state !== 'off';           // 'unknown' renders live; the probe corrects it
    }

    /* ---- the seed payload ---------------------------------------------
       CR-0's actual work. The button already exists in three places; what
       did not exist is the record arriving in the workspace WITH its
       context, so the reader's first message does not have to restate it.

       Carried: record name, desk, tier, dataset key, row id, the resolved
       tags, the record's own fields (which are what the fact tiles are
       drawn from), the analysis fields, and the linkage entities the Brain
       has already computed for this record. */
    function linkageFor(csv, id, name) {
      var out = { available: false, why: '', entities: [], counts: {} };
      var NB = G_brain();
      if (!NB || !NB.graph) { out.why = 'the linkage brain is not loaded in this build'; return out; }
      var G = null;
      try { G = NB.graph.get && NB.graph.get(); } catch (e) {}
      if (!G) { try { G = NB.graph.ensure && NB.graph.ensure(); } catch (e) { G = null; } }
      if (!G || !G.nodes) { out.why = 'the linkage graph could not be built'; return out; }

      var evId = 'event:' + csv + '#' + id;
      if (!G.nodes[evId]) {
        // fall back to a label match within this dataset only
        var nn = norm(name), best = null, k;
        for (k in G.nodes) {
          var n = G.nodes[k];
          if (!n || n.type !== 'event' || n.dataset !== csv) continue;
          if (norm(n.label) === nn) { best = k; break; }
        }
        evId = best;
      }
      if (!evId) {
        out.why = 'this record has no node in the linkage graph (not every row is materialised)';
        return out;
      }
      out.available = true;
      var seen = {};
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i];
        if (e.from !== evId || e.type !== 'TOUCHES') continue;
        var t = G.nodes[e.to];
        if (!t) continue;
        out.counts[t.type] = (out.counts[t.type] || 0) + 1;
        if (seen[e.to] || out.entities.length >= 24) continue;
        seen[e.to] = 1;
        out.entities.push({
          name: t.label, type: t.type, band: e.band, path: e.path,
          via: e.via || null, rank: e.rank || null
        });
      }
      return out;
    }

    var SCALAR = /^(string|number|boolean)$/;
    function seedFor(desk, rr, a) {
      var fields = {}, k;
      for (k in rr.rec) {
        if (!Object.prototype.hasOwnProperty.call(rr.rec, k)) continue;
        var v = rr.rec[k];
        if (v == null || String(v).trim() === '') continue;
        fields[k] = String(v);
      }
      var analysis = {};
      if (a) {
        for (k in a) {
          if (!Object.prototype.hasOwnProperty.call(a, k)) continue;
          var av = a[k];
          // an empty field is not a fact about the record; carrying it into
          // the prompt as "state_stance: " invites the model to fill it in
          if (SCALAR.test(typeof av)) { if (String(av).trim() !== '') analysis[k] = av; }
          else if (Array.isArray(av) && av.length && av.every(function (x) { return SCALAR.test(typeof x); })) analysis[k] = av;
        }
      }
      var tl = G_label();
      return {
        record: rr.cell || fields[Object.keys(fields)[0]] || '(unnamed row)',
        desk: desk.f.feature,
        tier: desk.tier,
        tier_label: (typeof tl === 'function') ? tl(desk.tier) : desk.tier,
        bucket: desk.f.bucket || '',
        dataset: rr.csv,
        row_id: rr.id,
        row_index: rr.idx,
        tags: tagsFor(rr.rec, a, rr.onScreen),
        fields: fields,
        analysis: analysis,
        linkage: linkageFor(rr.csv, rr.id, rr.cell),
        coverage: coverage(rr.csv)
      };
    }

    // The prompt the workspace opens with. Every line is data already on
    // record — nothing here is generated, and the closing instruction keeps
    // the answer inside the same guardrails the rest of the terminal
    // follows: no advice, no targets, no predicted moves.
    function seedPrompt(s) {
      var L = [];
      L.push('Context attached from the Niyantran terminal (a record already on screen — you do not need to ask for it):');
      L.push('Record: ' + s.record);
      L.push('Desk: ' + s.desk + '  ·  Tier: ' + s.tier_label + '  ·  Dataset: ' + s.dataset + '  ·  Row id: ' + s.row_id);
      if (s.tags.kind === 'tags' && s.tags.list.length) L.push('Tags: ' + s.tags.list.join(', '));
      else if (s.tags.list.length) {
        L.push('Record fields: ' + s.tags.list.map(function (t) { return t.k + '=' + t.v; }).join('  ·  '));
      }
      var fk = Object.keys(s.fields);
      if (fk.length) {
        L.push('All fields on this row:');
        fk.forEach(function (k) { L.push('  ' + k + ': ' + clip(s.fields[k], 300)); });
      }
      var ak = Object.keys(s.analysis);
      if (ak.length) {
        L.push('Niyantran analysis already computed for this row:');
        ak.forEach(function (k) {
          var v = s.analysis[k];
          L.push('  ' + k + ': ' + clip(Array.isArray(v) ? v.join(', ') : String(v), 500));
        });
      } else {
        L.push('Niyantran analysis: none on record for this row (' + s.coverage.analysed +
               ' of ' + s.coverage.rows + ' rows in this dataset carry one). Do not invent one.');
      }
      if (s.linkage.available) {
        L.push('Linkage brain — what this record already connects to (structural research linkage, not advice):');
        s.linkage.entities.forEach(function (e) {
          L.push('  ' + e.type + ': ' + e.name + '  [' + (e.band || '?') + ' · path ' + (e.path || '?') + ']');
        });
        var ck = Object.keys(s.linkage.counts);
        if (ck.length) L.push('  totals: ' + ck.map(function (k) { return s.linkage.counts[k] + ' ' + k; }).join(', '));
      } else {
        L.push('Linkage brain: no linkage on record for this row — ' + s.linkage.why + '. Do not infer one.');
      }
      L.push('');
      L.push('Answer from the record above and the datasets in this terminal first. Cite the dataset or record you use. ' +
             'No investment advice, no price targets, no predicted moves, and no verdict on any named person or party.');
      return L.join('\n');
    }

    // Delegates to the host's own opener. A second element carrying id
    // "rdAskAi" would bind getElementById to the hidden original and leave
    // the visible button dead, so the strip declares no id at all and calls
    // window.openAiWorkspace directly with the card the host expects.
    function askAi(desk, rr, a) {
      var s = seedFor(desk, rr, a);
      var tl = G_label();
      var card = {
        title: clip(s.record, 80),
        feature: s.desk,
        tier: s.tier,
        tierLabel: s.tier_label,
        bucket: s.bucket,
        csv: s.dataset,
        fields: s.fields,
        pdf_url: (window.niyCardPdfUrl ? (window.niyCardPdfUrl(s.fields) || '') : '')
      };
      window.__NMG_LAST_SEED__ = s;      // read by the CR-0 verification gate
      window.openAiWorkspace(seedPrompt(s), card);
    }

    /* ---- the strip ----------------------------------------------------
       Three lines, hard: two of analysis paragraph (clamped, full text on
       hover) and one of chips + button. It is a table row so the feed's own
       re-render disposes of it, and it never touches the row grid — see the
       column-width gate in the spec. */
    function stripHtml(desk, rr, a) {
      var cov = coverage(rr.csv);
      var brief = a && a.brief ? String(a.brief) : '';
      var txt, note = '';
      if (brief) {
        txt = '<p class="nmg-strip-txt" title="' + esc(brief) + '">' + esc(brief) + '<\/p>';
      } else {
        // Named absence with the reason, and the two kinds of absence kept
        // apart: a dataset with no analysis file at all has not been through
        // the pipeline; a dataset with one has, and this row was not covered.
        note = cov.haveFile
          ? 'No Niyantran analysis on record for this row — ' + cov.analysed + ' of ' + cov.rows +
            ' rows in this dataset have been analysed so far.'
          : 'This dataset has not been through the analysis pipeline yet — no Niyantran analysis exists for any of its ' + cov.rows + ' rows.';
        txt = '<p class="nmg-strip-txt nmg-strip-note" title="' + esc(note) + '">' + esc(note) + '<\/p>';
      }

      var tg = tagsFor(rr.rec, a, rr.onScreen), tagHtml;
      if (tg.kind === 'tags') {
        tagHtml = '<span class="nmg-strip-lab">Tags<\/span>' + tg.list.map(function (t) {
          return '<span class="nmg-strip-tag">' + esc(clip(t, 30)) + '<\/span>';
        }).join('');
      } else if (tg.list.length) {
        tagHtml = '<span class="nmg-strip-lab">Fields<\/span>' + tg.list.map(function (t) {
          return '<span class="nmg-strip-tag nmg-strip-tag-f" title="' + esc(t.k) + '">' + esc(clip(t.v, 30)) + '<\/span>';
        }).join('');
      } else {
        tagHtml = '<span class="nmg-strip-lab">No tags \u2014 ' + esc(tg.why || '') + '<\/span>';
      }

      var ok = aiReady();
      var btn = ok
        ? '<button type="button" class="nmg-strip-ai">✦ Ask AI<\/button>'
        : '<button type="button" class="nmg-strip-ai nmg-strip-off" disabled aria-disabled="true" ' +
          'title="This build has no analysis backend: /api/askai is not deployed and no personal API key is set.">' +
          '✦ Ask AI — unavailable in this build<\/button>';

      return '<div class="nmg-strip">' + txt +
        '<div class="nmg-strip-foot"><span class="nmg-strip-tags">' + tagHtml + '<\/span>' + btn + '<\/div><\/div>';
    }

    /* The strip is a full-width table row, and several feeds render a table
       WIDER than the column that holds it (Regulatory Watch 818px in a 725px
       column, Supreme Court orders 825 in 725). Measured: on those desks the
       Ask AI button sat 72-79px past the right edge of the scroller and was
       simply not on screen -- a button the reader cannot see is a dead button,
       which is the one failure mode CR-0 rules out.

       So when, and only when, the feed actually scrolls sideways, the strip's
       content is pinned to the scroller's left edge and bounded to its visible
       width. The row itself still spans the table, so nothing about the grid
       changes; only the content inside it stops running off the edge. */
    function scrollerOf(el) {
      var n = el && el.parentElement;
      while (n && n !== document.body) {
        var ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return n;
        n = n.parentElement;
      }
      return null;
    }
    function fitStrip(tr) {
      try {
        var box = tr && tr.querySelector('.nmg-strip'); if (!box) return;
        var tbl = tr.closest('table'); if (!tbl) return;
        var sc = scrollerOf(tbl); if (!sc) return;
        var cs = getComputedStyle(sc);
        var padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
        var avail = sc.clientWidth - padL - padR;
        var tw = tbl.getBoundingClientRect().width;
        // Never wider than the table itself, or the strip would create the very
        // horizontal overflow it exists to survive. Applied unconditionally
        // rather than only when the feed is currently overflowing: a live wire
        // or a virtualised feed can widen its table after the strip lands, and
        // a fit decided on a stale overflow reading left the button off screen
        // on whichever desk had re-rendered last.
        box.style.width = Math.max(240, Math.min(avail, tw)) + 'px';
        // position:sticky was tried here so the strip would follow a sideways
        // scroll. It does not take effect in this DOM -- an ancestor of the
        // feed table establishes a containing block, and the cell measured at
        // exactly its unstuck position with position:sticky applied to either
        // the cell or this box. So the strip scrolls with the table, like every
        // other cell in it: the button is on screen at the feed's own scroll
        // position on every desk, and scrolling right moves it off exactly as
        // it moves the row's first column off. Dead CSS that does not do what
        // its comment claims is worse than the honest limitation.
      } catch (e) {}
    }
    window.addEventListener('resize', safe(function () {
      document.querySelectorAll('#detail tr.nmg-strip-row').forEach(fitStrip);
    }));

    function clearStrips(except) {
      try {
        document.querySelectorAll('#detail tr.nmg-strip-row').forEach(function (r) {
          if (r !== except) r.remove();
        });
      } catch (e) {}
    }
    // Re-render whatever is on screen when the AI probe resolves, so the
    // button's label is never stale.
    function repaintStrips() {
      try {
        document.querySelectorAll('#detail tr.nmg-strip-row').forEach(function (r) {
          var btn = r.querySelector('.nmg-strip-ai');
          if (!btn) return;
          var ok = aiReady();
          if (ok === !btn.disabled) return;
          var row = r.__nmgRow;
          if (row && row.isConnected) { r.remove(); attach(row); }
        });
      } catch (e) {}
    }

    function attach(row) {
      var desk = deskNow(); if (!desk) return false;
      var rr = recordFor(row, desk); if (!rr) return false;
      var a = analysisFor(rr.csv, rr.id, rr.idx);

      var tr = document.createElement('tr');
      tr.className = 'nmg-strip-row';
      tr.setAttribute('data-nmg-strip', '1');
      var td = document.createElement('td');
      td.colSpan = row.children.length || 1;
      td.innerHTML = stripHtml(desk, rr, a);
      tr.appendChild(td);
      tr.__nmgRow = row;
      tr.__nmgFor = row.getAttribute('data-raw-idx') + '/' + row.getAttribute('data-row-idx');

      // Placement. The host opens its own record card with
      // rowEl.after(panelRow) and CLOSES it on a second click by testing
      // rowEl.nextElementSibling for .niy-rd-panel-row. Inserting the strip
      // between the two would break that toggle, so the strip goes after the
      // panel row when one is present. Under body.nmg-merged the panel row is
      // display:none, so the strip still reads as sitting directly under the
      // row; without the linkage-brain block it sits under the open card,
      // which is the honest place for it.
      var anchor = row;
      var nx = row.nextElementSibling;
      if (nx && nx.classList && (nx.classList.contains('niy-rd-panel-row') || nx.classList.contains('expand-panel-row'))) anchor = nx;
      anchor.after(tr);

      fitStrip(tr);

      var btn = tr.querySelector('.nmg-strip-ai');
      if (btn && !btn.disabled) btn.addEventListener('click', safe(function (e) {
        e.stopPropagation();
        askAi(desk, rr, a);
      }));
      return true;
    }

    /* ---- wiring -------------------------------------------------------
       One delegated click listener, deferred a tick so the host's own
       synchronous openRowDetail() has already inserted its panel and we can
       see where to sit relative to it. */
    function ownStripFor(row) {
      var n = row.nextElementSibling;
      for (var i = 0; i < 3 && n; i++) {
        if (n.classList && n.classList.contains('nmg-strip-row')) return n;
        if (!(n.classList && (n.classList.contains('niy-rd-panel-row') || n.classList.contains('expand-panel-row')))) return null;
        n = n.nextElementSibling;
      }
      return null;
    }

    document.addEventListener('click', function (e) {
      try {
        if (!e.target.closest) return;
        if (e.target.closest('a')) return;
        if (e.target.closest('.nmg-strip')) return;          // clicks inside the strip are its own
        if (e.target.closest('.nmg-wrap')) return;           // the Analytics pane owns its clicks
        var row = e.target.closest('#detail tr[data-row-idx]');
        if (!row) return;
        // The host's own panel body is itself a <tr data-row-idx>. A click
        // inside it belongs to the row that owns it, never to a row of its own.
        if (isPanelRow(row)) return;
        setTimeout(safe(function () {
          var mine = ownStripFor(row);
          if (mine) { mine.remove(); return; }               // second click on the same row closes it
          clearStrips();
          attach(row);
        }), 0);
      } catch (err) {}
    });

    // The host and the linkage brain both offer a way back out of a record.
    // When either is used the strip is stale, so it goes with them.
    document.addEventListener('click', function (e) {
      try {
        if (!e.target.closest) return;
        if (e.target.closest('.niy-rd-close') || e.target.closest('.nmg-back')) {
          setTimeout(safe(function () { clearStrips(); }), 0);
        }
      } catch (err) {}
    }, true);

    /* ---- styles -------------------------------------------------------
       Class names are prefixed nmg-strip- and checked against the bundle:
       #detail [class*=-v] pins line-height, [class*="-ov"] paints an overlay
       background, and the scope bar restyles [class*="tag"]/[class*="badge"]
       — none of these names contain -v, -ov, chip, pill, badge or source,
       and the tag rule is scoped to .scope-bar. */
    var CSS = [
      /* The strip is a <td> inside table.sample, so it inherits the feed's own
         cell styling -- and a single-cell row is BOTH td:first-child and
         td:last-child, which is where the interesting collisions live:

           .sample td:last-child{white-space:nowrap!important}   -- measured:
             a 471-character brief rendered on ONE unwrapped line, clipped with
             no ellipsis. The line-clamp cannot fire on text that never wraps.
           .sample td:last-child{font-family:mono;font-size:11px;color:faint}
           .sample td:first-child{padding-left:16px!important;font-weight:550}
           html body #detail .niy-col-feed table.sample tbody tr td:first-child
             ::before  -- paints a 9px signal dot at left:8px, on every row.
           #detail table.sample tbody tr td{background:transparent!important}
           #detail table.sample tbody tr:hover{background:...!important}
           .niy-col-feed table.sample tbody tr:hover td:first-child{
             color:#14458F!important;text-decoration:underline}

         Each override below carries one class more than the rule it beats --
         the signal-dot rule is (1 id, 2 classes, 7 elements), so its override
         adds .nmg-strip-row for (1,3,7). Stacking !important on an equal
         selector would not have won any of these. */
      'html body #detail .niy-col-feed table.sample tbody tr.nmg-strip-row > td:first-child::before{content:none!important;display:none!important;}',
      /* html body #detail .niy-col-feed table.sample tbody tr td:first-child
         pins padding-left:26px at (1 id, 2 classes, 7 elements) -- it beat the
         shorter reset below and pushed the strip 26px right of the table, which
         is what put the Ask AI button past the edge of the scroller. */
      'html body #detail .niy-col-feed table.sample tbody tr.nmg-strip-row > td:first-child{padding:0!important;}',
      '#detail table.sample tbody tr.nmg-strip-row > td{background:var(--panel-2,rgba(20,30,45,.04))!important;padding:0!important;' +
        'white-space:normal!important;font-family:inherit!important;font-size:inherit!important;font-weight:400!important;' +
        'color:inherit!important;vertical-align:top!important;text-decoration:none!important;' +
        'border-bottom:1px solid var(--hairline,rgba(0,0,0,.09))!important;box-shadow:inset 3px 0 0 var(--accent,#EE5A2C)!important;}',
      '#detail table.sample tbody tr.nmg-strip-row:hover > td{background:var(--panel-2,rgba(20,30,45,.04))!important;}',
      'html body #detail .niy-col-feed table.sample tbody tr.nmg-strip-row:hover > td:first-child{color:inherit!important;text-decoration:none!important;}',
      '#detail table.sample tbody tr.nmg-strip-row{cursor:default;}',

      /* Three lines, and the box is told so: two clamped lines of paragraph
         plus one row of chips. min-width:0 + overflow:hidden keep the
         full-width colspan cell from widening the columns on the desks that
         render with table-layout:auto. */
      /* The bundle ships a bare-element rule
            button,.btn,.toolbar-btn,...{font-size:12.5px!important;font-weight:530!important}
         at (0,0,1)-with-!important, which beat the `font:` shorthand here and
         made the control row 34px instead of ~23px. Every size below is
         therefore pinned !important so the three-line geometry is a fact
         rather than a hope. */
      '#detail .nmg-strip{display:block;padding:7px 12px 8px;overflow:hidden;min-width:0;}',
      '#detail .nmg-strip-txt{margin:0 0 6px;font-size:12px!important;line-height:1.45!important;font-weight:400!important;color:var(--fg-muted,#5b6470);white-space:normal;overflow-wrap:anywhere;' +
        'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-width:0;}',
      '#detail .nmg-strip-note{color:var(--fg-faint,#9AA1A8);font-style:italic;}',
      '#detail .nmg-strip-foot{display:flex;align-items:center;gap:8px;min-width:0;}',
      '#detail .nmg-strip-tags{display:flex;align-items:center;gap:5px;flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap;padding-right:2px;' +
        /* a chip cut off mid-word reads as a rendering bug; the fade says the
           row simply ran out of width */
        '-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);}',
      '#detail .nmg-strip-lab{font-size:8.5px!important;line-height:1!important;font-weight:700!important;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-faint,#9AA1A8);flex:0 0 auto;}',
      '#detail .nmg-strip-tag{font-size:10px!important;line-height:1!important;font-weight:600!important;color:var(--fg-muted,#5b6470);background:var(--panel-3,#fff);' +
        'border:1px solid var(--hairline,rgba(0,0,0,.12));border-radius:999px;padding:4px 8px!important;flex:0 0 auto;max-width:170px;overflow:hidden;text-overflow:ellipsis;}',
      /* Record fields are facts off the row, tags are the pipeline's reading
         of it. Different border and a different written label, so the two are
         never taken for one another. */
      '#detail .nmg-strip-tag-f{border-style:dashed;color:var(--fg-faint,#9AA1A8);}',
      '#detail .nmg-strip-ai{flex:0 0 auto;font-size:11px!important;line-height:1!important;font-weight:650!important;color:var(--panel-3,#fff);background:var(--accent,#EE5A2C);' +
        'border:1px solid var(--accent,#EE5A2C);border-radius:7px;padding:5px 9px!important;cursor:pointer;white-space:nowrap;}',
      '#detail .nmg-strip-ai:hover{filter:brightness(1.08);}',
      '#detail .nmg-strip-ai:focus-visible{outline:2px solid var(--accent,#EE5A2C);outline-offset:2px;}',
      '#detail .nmg-strip-off{background:var(--panel-3,#fff);border-color:var(--hairline,rgba(0,0,0,.16));' +
        'color:var(--fg-faint,#9AA1A8);cursor:not-allowed;font-weight:600!important;}',
      '#detail .nmg-strip-off:hover{filter:none;}',
      '@media (prefers-reduced-motion:reduce){#detail .nmg-strip{animation:none!important;transition:none!important;}}'
    ].join('');

    var st = document.createElement('style');
    st.id = 'nmg-ndc-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);

    aiProbe();

    /* ---- verification hooks -------------------------------------------
       Read by tools/verify_national_desk_changes.mjs. Additive and inert:
       nothing in the feature reads them back. */
    window.NmgNDC = {
      cr: ['CR-0'],
      deskNow: deskNow,
      recordFor: recordFor,
      analysisFileFor: analysisFileFor,
      coverage: coverage,
      seedFor: seedFor,
      seedPrompt: seedPrompt,
      ai: function () { return { state: AI.state, ready: aiReady(), key: aiKey(), proto: location.protocol }; },
      lastSeed: function () { return window.__NMG_LAST_SEED__ || null; }
    };
    try { console.log('%c[NMG/NDC] CR-0 inline record strip online', 'color:#EE5A2C'); } catch (e) {}
  } catch (e) {
    try { console.warn('[NMG/NDC] init failed, terminal unaffected:', e); } catch (_) {}
  }
})();

