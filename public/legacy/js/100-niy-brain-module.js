
/* THE BRAIN — Phase 0: event bus + dataset watcher.
   Namespaced entirely under window.NiyBrain. Every entry point try/catch'd so a
   Brain failure can never break the rest of the terminal. This block is a CLASSIC
   script placed AFTER block 067, so the bare identifier EMBEDDED_CSV_DATA (a
   top-level `const` in the shared global lexical environment) resolves here. It is
   NOT on window and cannot be reached from a Web Worker — data is projected in. */
(function () {
  'use strict';
  try {

    var NiyBrain = window.NiyBrain = window.NiyBrain || {};
    NiyBrain.version = '0.1.0-phase0';

    /* ---- tiny hash: FNV-1a over a string, returned base36 -------------------- */
    function fnv1a(str) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return (h >>> 0).toString(36);
    }
    NiyBrain.fnv1a = fnv1a;

    /* Cheap per-dataset fingerprint: rowCount + ':' + fnv1a(first + mid + last row).
       Lets us suppress no-op rebuilds when a module reassigns an identical array. */
    function fingerprint(rows) {
      if (!Array.isArray(rows)) return '0:x';
      var n = rows.length;
      if (n === 0) return '0:e';
      var mid = n >> 1;
      var s;
      try {
        s = JSON.stringify(rows[0]) + '|' + JSON.stringify(rows[n - 1]) + '|' + JSON.stringify(rows[mid]);
      } catch (e) { s = 'n' + n; }
      return n + ':' + fnv1a(s);
    }
    NiyBrain.fingerprint = fingerprint;

    /* ---- NiyBrain.bus — minimal pub/sub, no deps ---------------------------- */
    NiyBrain.bus = (function () {
      var map = Object.create(null);
      return {
        on: function (ev, fn) {
          if (typeof fn !== 'function') return function () {};
          (map[ev] || (map[ev] = [])).push(fn);
          return function () { NiyBrain.bus.off(ev, fn); };
        },
        off: function (ev, fn) {
          var a = map[ev]; if (!a) return;
          var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
        },
        emit: function (ev, payload) {
          var a = map[ev]; if (!a) return;
          a.slice().forEach(function (fn) { try { fn(payload); } catch (e) {} });
        },
        _events: function () { return Object.keys(map); }
      };
    })();

    /* ---- NiyBrain.watch — three-layer dataset change detection --------------
       Layer 1: accessor traps on every existing key (fires synchronously on overwrite).
       Layer 2: 5s key-sweep — new keys, plus a fingerprint safety net for any
                key whose trap could not be installed. setInterval >= 500ms, so
                block 004 hard-gates it while the tab is hidden (free quiet mode).
       Layer 3: explicit NiyBrain.notify(key) + a manual Rebuild button (UI). */
    NiyBrain.watch = (function () {
      var store   = Object.create(null);  // real array values behind the getters
      var trapped = Object.create(null);  // key -> true once an accessor is installed
      var fp      = Object.create(null);  // key -> last fingerprint
      var staleKeys = Object.create(null); // key -> {since,keptRows} when an empty overwrite was rejected
      var emitLog = Object.create(null);  // key -> emit count (verification aid)
      var started = false;
      var lastKeyCount = 0;
      // DERIVED keys: recomputed at runtime from OTHER data, never a source of truth.
      // `geo_local_*` / `geo_state_*` are reshaped, scope-filtered views of window.NIY_GEO
      // (block 031's publish()). A refresh worker that writes one would be silently
      // obliterated on the next scope change — and, worse, would leave the view inconsistent
      // with its inputs. Reject those writes (see applyRefresh). Extend this list from the
      // derivation blocks / the ingestion design as more derived keys appear.
      var derived = Object.create(null);
      var derivedPat = [/^geo_(local|state)_/];
      function isDerived(k) { if (derived[k]) return true; for (var i = 0; i < derivedPat.length; i++) if (derivedPat[i].test(k)) return true; return false; }

      function target() {
        // EMBEDDED_CSV_DATA is a lexical const, not on window; resolve it directly.
        try { return (typeof EMBEDDED_CSV_DATA !== 'undefined') ? EMBEDDED_CSV_DATA : null; }
        catch (e) { return null; }
      }

      function fire(key, reason) {
        var rows = store[key];
        emitLog[key] = (emitLog[key] || 0) + 1;
        NiyBrain.bus.emit('dataset:updated', {
          key: key,
          rowCount: Array.isArray(rows) ? rows.length : 0,
          fingerprint: fp[key],
          reason: reason || 'change',
          at: Date.now()
        });
      }

      function installTrap(obj, key, emitOnInstall) {
        if (trapped[key]) return;
        var current;
        try { current = obj[key]; } catch (e) { current = undefined; }
        store[key] = current;
        fp[key] = fingerprint(current);
        try {
          Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: true,
            get: function () { return store[key]; },
            set: function (v) {
              // Defence-in-depth (§6.3 FS7): a refresh that replaces a previously NON-EMPTY
              // dataset with an EMPTY one is the single most dangerous live-fetch failure — a
              // source silently going to zero does not just lose rows, it changes what appears
              // to CONVERGE (a missing family looks exactly like a quiet week). Reject it: keep
              // the prior data, mark the key visibly STALE, and do NOT rebuild from the empty.
              // The fetch layer should also guard this; the Brain guards it too, on purpose.
              var prev = store[key];
              var prevNonEmpty = Array.isArray(prev) && prev.length > 0;
              var newEmpty = !Array.isArray(v) || v.length === 0;
              if (prevNonEmpty && newEmpty) {
                staleKeys[key] = { since: (staleKeys[key] && staleKeys[key].since) || Date.now(), keptRows: prev.length };
                fire(key, 'rejected-empty');       // announce staleness, NOT a data change; store[key] stays prev
                return;
              }
              if (staleKeys[key] && !newEmpty) delete staleKeys[key];   // real data returned → clear stale
              store[key] = v;
              var nf = fingerprint(v);
              if (nf !== fp[key]) { fp[key] = nf; fire(key, 'set'); }
            }
          });
          trapped[key] = true;
        } catch (e) {
          /* Non-configurable (shouldn't happen for these plain data props). Fall
             back to fingerprint polling in the sweep — value stays a plain prop. */
          trapped[key] = false;
        }
        if (emitOnInstall) fire(key, 'new-key');
      }

      function sweep() {
        var obj = target(); if (!obj) return;
        var keys;
        try { keys = Object.keys(obj); } catch (e) { return; }
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (!(k in fp)) {
            // Brand-new dataset key: trap it and announce it.
            installTrap(obj, k, true);
          } else if (trapped[k] === false) {
            // Trap install failed earlier: detect change by fingerprint diff.
            var nf = fingerprint(obj[k]);
            if (nf !== fp[k]) { store[k] = obj[k]; fp[k] = nf; fire(k, 'sweep'); }
          }
        }
        lastKeyCount = keys.length;
      }

      function start() {
        if (started) return false;
        var obj = target();
        if (!obj) return false;              // EMBEDDED_CSV_DATA not ready yet
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) installTrap(obj, keys[i], false);
        lastKeyCount = keys.length;
        started = true;
        setInterval(sweep, 5000);            // >=500ms => quiet-mode gated by block 004
        return true;
      }

      /* Boot may still be async (block 073 loads /data/*.json after this script
         executes). Retry start() until EMBEDDED_CSV_DATA is present, then stop. */
      function boot() {
        if (start()) return;
        var tries = 0;
        var iv = setInterval(function () {
          if (start() || ++tries > 40) clearInterval(iv);
        }, 500);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else { boot(); }

      return {
        start: start,
        sweep: sweep,
        keys: function () { var o = target(); return o ? Object.keys(o) : []; },
        fingerprints: function () { var out = {}; Object.keys(fp).forEach(function (k) { out[k] = fp[k]; }); return out; },
        emitLog: function () { var out = {}; Object.keys(emitLog).forEach(function (k) { out[k] = emitLog[k]; }); return out; },
        isTrapped: function (k) { return !!trapped[k]; },
        // Keys whose data went stale because an empty overwrite was rejected (FS7 guard).
        // The freshness UI should surface these as "not updated since …", never silently.
        staleKeys: function () { var o = {}; Object.keys(staleKeys).forEach(function (k) { o[k] = staleKeys[k]; }); return o; },
        isDerived: isDerived,
        markDerived: function (k) { derived[k] = 1; },
        // The guarded entry point a fetch/ingestion worker MUST use — never a raw
        // EMBEDDED_CSV_DATA[key] = rows assignment. Rejects two known-bad refreshes:
        //   (1) DERIVED keys (would be recomputed away / left inconsistent), and
        //   (2) an EMPTY payload replacing non-empty data (a source silently going to zero
        //       looks exactly like a quiet week — keep the prior data, mark it stale).
        // Only a legitimate, non-empty refresh of a source key reaches the accessor trap.
        applyRefresh: function (key, rows) {
          if (isDerived(key)) return { ok: false, reason: 'derived', message: key + ' is DERIVED (recomputed at runtime) — do not write it; change its inputs instead' };
          var o = target(); var prev = o ? o[key] : undefined;
          var prevNonEmpty = Array.isArray(prev) && prev.length > 0;
          var newEmpty = !Array.isArray(rows) || rows.length === 0;
          if (prevNonEmpty && newEmpty) { staleKeys[key] = { since: (staleKeys[key] && staleKeys[key].since) || Date.now(), keptRows: prev.length }; return { ok: false, reason: 'empty', message: key + ' refresh was empty — prior data kept, marked stale' }; }
          if (!o) return { ok: false, reason: 'no-store' };
          o[key] = rows;                     // fires the accessor trap → dataset:updated → rebuild
          if (staleKeys[key]) delete staleKeys[key];
          return { ok: true, key: key, rows: Array.isArray(rows) ? rows.length : 0 };
        },
        _store: store
      };
    })();

    /* ---- NiyBrain.notify(key) — explicit "this dataset changed" signal ------- */
    NiyBrain.notify = function (key) {
      try {
        var obj = (typeof EMBEDDED_CSV_DATA !== 'undefined') ? EMBEDDED_CSV_DATA : null;
        if (!obj || !(key in obj)) return false;
        // Recompute fingerprint and always announce (explicit caller intent).
        var rows = obj[key];
        var fp = fingerprint(rows);
        NiyBrain.watch._store[key] = rows;
        NiyBrain.bus.emit('dataset:updated', {
          key: key, rowCount: Array.isArray(rows) ? rows.length : 0,
          fingerprint: fp, reason: 'notify', at: Date.now()
        });
        return true;
      } catch (e) { return false; }
    };

    /* ---- NiyBrain.selftest() — grows per phase; logs a pass/fail table ------- */
    NiyBrain.selftest = function (quiet) {
      var rows = [];
      function ok(name, pass, note) { rows.push({ test: name, result: pass ? 'PASS' : 'FAIL', note: note || '' }); }
      try {
        ok('bus exists', !!(NiyBrain.bus && NiyBrain.bus.on && NiyBrain.bus.emit));
        ok('watch started', NiyBrain.watch.keys().length > 0, NiyBrain.watch.keys().length + ' datasets');
        // pub/sub round-trip
        var got = null, off = NiyBrain.bus.on('__brain_selftest__', function (p) { got = p; });
        NiyBrain.bus.emit('__brain_selftest__', { hi: 1 }); off();
        ok('bus round-trip', got && got.hi === 1);
        // fingerprint stability + sensitivity
        var a = [{ x: 1 }, { x: 2 }, { x: 3 }];
        var f1 = fingerprint(a), f2 = fingerprint(a.slice());
        var f3 = fingerprint(a.concat([{ x: 4 }]));
        ok('fingerprint stable on identical', f1 === f2, f1);
        ok('fingerprint changes on edit', f1 !== f3);
      } catch (e) { ok('selftest ran', false, String(e && e.message || e)); }
      if (!quiet) { try { if (console.table) console.table(rows); else console.log(rows); } catch (e) {} }
      return rows;
    };

    try { console.log('%c[NiyBrain] Phase 0 online — bus + watcher installed', 'color:#6ab7ff'); } catch (e) {}

  } catch (e) {
    /* Fail silently: the Brain must never break the terminal. */
    try { console.warn('[NiyBrain] init failed, terminal unaffected:', e); } catch (_) {}
  }
})();

/* THE BRAIN — Phase 1: ontology engine (indexing + validate + resolvers).
   Reads the data-only window.NIY_BRAIN_ONTOLOGY block. Fail-silent. */
(function () {
  'use strict';
  try {
    var NiyBrain = window.NiyBrain = window.NiyBrain || {};
    function O() { return window.NIY_BRAIN_ONTOLOGY || null; }
    var idx = null;

    function build() {
      var o = O(); if (!o) return null;
      var m = { sector:{}, theme:{}, institution:{}, commodity:{}, company:{},
                tickerToCompany:{}, companiesBySector:{}, sectorsByInstitution:{} };
      (o.sectors||[]).forEach(function (s) { m.sector[s.id] = s; });
      (o.themes||[]).forEach(function (t) { m.theme[t.id] = t; });
      (o.institutions||[]).forEach(function (i) {
        m.institution[i.id] = i;
        (i.governs||[]).forEach(function (sid) { (m.sectorsByInstitution[i.id] = m.sectorsByInstitution[i.id] || []).push(sid); });
      });
      (o.commodities||[]).forEach(function (c) { m.commodity[c.id] = c; });
      (o.companies||[]).forEach(function (c) {
        m.company[c.id] = c;
        (c.tickers||[]).forEach(function (tk) { m.tickerToCompany[tk] = c.id; });
        (m.companiesBySector[c.sector] = m.companiesBySector[c.sector] || []).push(c.id);
      });
      return m;
    }
    function index() { if (!idx) idx = build(); return idx; }
    function rebuildIndex() { idx = null; return index(); }

    // A ticker is valid iff it exists in NIY_YSYM values or NIY_OHLC_EMBED keys.
    function validTicker(tk) {
      try {
        var y = window.NIY_YSYM;
        if (y) { for (var k in y) { if (y[k] === tk) return true; } }
        if (window.NIY_OHLC_EMBED && Object.prototype.hasOwnProperty.call(window.NIY_OHLC_EMBED, tk)) return true;
      } catch (e) {}
      return false;
    }

    /* Build-time validator: every referenced id resolves, every ticker exists,
       no company lacks a sector. Returns {errors,warnings,counts}. */
    function validate() {
      var o = O(), errors = [], warnings = [];
      if (!o) { errors.push('NIY_BRAIN_ONTOLOGY not loaded'); return { errors: errors, warnings: warnings, counts: {} }; }
      var S = {}, T = {}, I = {}, C = {}, P = {}, G = {};
      (o.sectors||[]).forEach(function (s) { if (S[s.id]) errors.push('dup sector id ' + s.id); S[s.id] = 1; });
      (o.themes||[]).forEach(function (t) { if (T[t.id]) errors.push('dup theme id ' + t.id); T[t.id] = 1; });
      (o.institutions||[]).forEach(function (i) { if (I[i.id]) errors.push('dup institution id ' + i.id); I[i.id] = 1; });
      (o.commodities||[]).forEach(function (c) { if (C[c.id]) errors.push('dup commodity id ' + c.id); C[c.id] = 1; });
      (o.geographies||[]).forEach(function (g) { if (G[g.id]) errors.push('dup geography id ' + g.id); G[g.id] = 1; });
      (o.companies||[]).forEach(function (c) { if (P[c.id]) errors.push('dup company id ' + c.id); P[c.id] = 1; });
      (o.sectors||[]).forEach(function (s) { if (s.indexSymbol && !validTicker(s.indexSymbol)) errors.push('sector ' + s.id + ' indexSymbol ' + s.indexSymbol + ' not in NIY_YSYM/OHLC'); });
      (o.themes||[]).forEach(function (t) { (t.sectors||[]).forEach(function (x) { if (!S[x]) errors.push('theme ' + t.id + ' -> unknown sector ' + x); }); });
      (o.institutions||[]).forEach(function (i) { (i.governs||[]).forEach(function (x) { if (!S[x]) errors.push('institution ' + i.id + ' governs unknown sector ' + x); }); });
      (o.commodities||[]).forEach(function (c) { (c.producers||[]).concat(c.consumers||[]).forEach(function (r) { if (!P[r] && !S[r]) warnings.push('commodity ' + c.id + ' ref ' + r + ' resolves to neither company nor sector'); }); });
      (o.companies||[]).forEach(function (c) {
        if (c.tier !== 'thin' && (!c.sector || !S[c.sector])) errors.push('company ' + c.id + ' sector "' + c.sector + '" invalid/missing');
        if (c.tier !== 'thin') (c.tickers||[]).forEach(function (tk) { if (!validTicker(tk)) errors.push('company ' + c.id + ' ticker ' + tk + ' not in NIY_YSYM/OHLC'); }); // thin tickers are identity-only, not in the priced OHLC universe
        (c.themes||[]).forEach(function (th) { if (!T[th]) errors.push('company ' + c.id + ' theme ' + th + ' unknown'); });
        (c.exposures||[]).forEach(function (e) {
          if (e.type === 'institution' && !I[e.id]) errors.push('company ' + c.id + ' exposure institution ' + e.id + ' unknown');
          if (e.type === 'commodity' && !C[e.id]) errors.push('company ' + c.id + ' exposure commodity ' + e.id + ' unknown');
          if (e.type === 'theme' && !T[e.id]) errors.push('company ' + c.id + ' exposure theme ' + e.id + ' unknown');
          if (e.type === 'geography' && !G[e.id]) errors.push('company ' + c.id + ' exposure geography ' + e.id + ' unknown');
        });
      });
      var counts = {
        sectors: (o.sectors||[]).length, themes: (o.themes||[]).length,
        institutions: (o.institutions||[]).length, commodities: (o.commodities||[]).length,
        companies: (o.companies||[]).length, priced: (o.companies||[]).filter(function (c) { return c.priced; }).length
      };
      return { errors: errors, warnings: warnings, counts: counts };
    }

    NiyBrain.ontology = {
      data: O, index: index, rebuildIndex: rebuildIndex, validate: validate, validTicker: validTicker,
      sector: function (id) { var m = index(); return m && m.sector[id]; },
      theme: function (id) { var m = index(); return m && m.theme[id]; },
      institution: function (id) { var m = index(); return m && m.institution[id]; },
      commodity: function (id) { var m = index(); return m && m.commodity[id]; },
      company: function (id) { var m = index(); return m && m.company[id]; },
      companiesInSector: function (sid) { var m = index(); return (m && m.companiesBySector[sid]) || []; },
      companyByTicker: function (tk) { var m = index(); return m && m.tickerToCompany[tk]; },
      sectorIndexSymbol: function (sid) { var s = this.sector(sid); return s ? s.indexSymbol : null; }
    };

    /* Extend selftest with the ontology gate (acceptance test #4). */
    var prev = NiyBrain.selftest;
    NiyBrain.selftest = function () {
      var rows = prev ? prev.call(NiyBrain, true) : [];
      try {
        var v = NiyBrain.ontology.validate();
        rows.push({ test: 'ontology validate() zero errors', result: v.errors.length === 0 ? 'PASS' : 'FAIL',
                    note: v.errors.length + ' err / ' + v.warnings.length + ' warn · ' + JSON.stringify(v.counts) });
      } catch (e) { rows.push({ test: 'ontology validate ran', result: 'FAIL', note: String(e && e.message || e) }); }
      try { if (console.table) console.table(rows); else console.log(rows); } catch (e) {}
      return rows;
    };

    try { console.log('%c[NiyBrain] Phase 1 ontology engine ready', 'color:#6ab7ff'); } catch (e) {}
  } catch (e) { try { console.warn('[NiyBrain] ontology engine init failed:', e); } catch (_) {} }
})();

/* ---- Phase 2: pipeline ---- */
/* THE BRAIN — Phase 2 pipeline (projector + Aho-Corasick matcher + graph + scoring).
   Pure, dependency-free. Runs identically in Node (module.exports) and inside the
   Web Worker (worker wraps NiyBrainPipeline). Never touches the DOM or globals. */
(function (root) {
  'use strict';

  // ---- text utils ----------------------------------------------------------
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function isWordChar(ch) { return ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9'; }

  // ---- Aho-Corasick (case-folded, word-boundary aware) ---------------------
  function AhoCorasick() {
    this.next = [Object.create(null)]; this.fail = [0]; this.out = [null]; this.built = false;
  }
  AhoCorasick.prototype.add = function (pattern, payload) {
    var s = norm(pattern); if (!s) return;
    var node = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (this.next[node][c] === undefined) {
        this.next.push(Object.create(null)); this.fail.push(0); this.out.push(null);
        this.next[node][c] = this.next.length - 1;
      }
      node = this.next[node][c];
    }
    (this.out[node] || (this.out[node] = [])).push({ len: s.length, payload: payload });
  };
  AhoCorasick.prototype.build = function () {
    var q = [], root = 0, k;
    for (k in this.next[root]) { var v = this.next[root][k]; this.fail[v] = root; q.push(v); }
    while (q.length) {
      var u = q.shift();
      for (k in this.next[u]) {
        var w = this.next[u][k], f = this.fail[u];
        while (f !== root && this.next[f][k] === undefined) f = this.fail[f];
        this.fail[w] = (this.next[f][k] !== undefined && this.next[f][k] !== w) ? this.next[f][k] : root;
        if (this.out[this.fail[w]]) this.out[w] = (this.out[w] || []).concat(this.out[this.fail[w]]);
        q.push(w);
      }
    }
    this.built = true;
  };
  // returns array of {payload, start, end}; word-boundary enforced on both ends
  AhoCorasick.prototype.search = function (text) {
    var s = norm(text), node = 0, res = [], root = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      while (node !== root && this.next[node][c] === undefined) node = this.fail[node];
      if (this.next[node][c] !== undefined) node = this.next[node][c];
      var outs = this.out[node];
      if (outs) for (var j = 0; j < outs.length; j++) {
        var len = outs[j].len, start = i - len + 1, end = i;
        var beforeOk = start === 0 || !isWordChar(s[start - 1]);
        var afterOk = end === s.length - 1 || !isWordChar(s[end + 1]);
        if (beforeOk && afterOk) res.push({ payload: outs[j].payload, start: start, end: end });
      }
    }
    return res;
  };

  // ---- common English words that collide with single-word company names ----
  var COMMON_WORDS = {};
  ('page amber trent titan eternal trident sail ola sona blue max sun star mint atul '
   + 'india power finance coal steel metal media energy services trust force union central '
   + 'bank canara indian federal reliance').split(' ').forEach(function (w) { COMMON_WORDS[w] = 1; });

  function isStrongPattern(s) {
    s = norm(s);
    if (s.indexOf(' ') >= 0) return true;           // multi-word => strong
    if (COMMON_WORDS[s]) return false;              // common single word => weak
    if (/^[a-z]{2,3}$/.test(s)) return false;       // 2-3 char ticker-like => weak
    return s.length >= 4;                            // distinctive single word (incl. NTPC/ONGC) => strong
  }

  // ---- build matcher + structural institution dictionary -------------------
  function buildMatcher(ont) {
    var ac = new AhoCorasick();
    var instColumnDict = Object.create(null); // normalized alias -> instId (exact column lookup)

    // companies: name + aliases (+ ticker roots). tag strong/weak.
    (ont.companies || []).forEach(function (c) {
      var seen = {};
      (c.aliases || []).concat([c.name]).forEach(function (a) {
        var n = norm(a); if (!n || seen[n]) return;
        // single-token aliases must be >=4 chars: a 2-3 char token (OIL, BEL, ACC,
        // MRF, LT...) collides with common words / appears inside other words.
        if (n.indexOf(' ') < 0 && n.length <= 3) return;
        seen[n] = 1;
        ac.add(a, { type: 'company', id: c.id, sector: c.sector, strong: isStrongPattern(a) });
      });
    });
    // institutions: fuzzy patterns only for DISTINCTIVE aliases (multiword or acronym);
    // ALL aliases go into the exact column dict (incl. bare ministry words like POWER).
    (ont.institutions || []).forEach(function (i) {
      (i.aliases || []).concat([i.name]).forEach(function (a) {
        var n = norm(a); if (!n) return;
        instColumnDict[n] = i.id;
        var distinctive = n.indexOf(' ') >= 0 || /^[a-z]{3,6}$/.test(n) && a === a.toUpperCase();
        var bareMinistryWord = /^(power|finance|coal|steel|defence|railways|labour|mines|textiles|health|education|shipping|communications|welfare|culture|tourism|planning|welfare)$/.test(n);
        if (distinctive && !bareMinistryWord && n.length >= 3) ac.add(a, { type: 'institution', id: i.id, strong: true });
      });
    });
    // commodities: name + keywords
    (ont.commodities || []).forEach(function (c) {
      [c.name].concat(c.keywords || []).forEach(function (a) {
        var n = norm(a); if (n.length < 4) return;
        ac.add(a, { type: 'commodity', id: c.id, kw: n, strong: true });
      });
    });
    // themes: keywords. Carry the normalized keyword (kw) so the projector can count
    // DISTINCT theme keywords per event — the P3 corroboration gate needs "was this
    // theme hit by one keyword or several?", not just presence.
    (ont.themes || []).forEach(function (t) {
      (t.keywords || []).forEach(function (a) {
        var n = norm(a); if (n.length < 4) return;
        ac.add(a, { type: 'theme', id: t.id, kw: n, strong: n.indexOf(' ') >= 0 });
      });
    });
    // sectors: keywords (used only as corroboration for weak company matches)
    (ont.sectors || []).forEach(function (s) {
      (s.keywords || []).forEach(function (a) {
        var n = norm(a); if (n.length < 4) return;
        ac.add(a, { type: 'sector', id: s.id, kw: n, strong: true });
      });
    });
    // geographies: aliases + keywords (foreign only matter for P5)
    (ont.geographies || []).forEach(function (g) {
      (g.aliases || []).concat(g.keywords || []).forEach(function (a) {
        var n = norm(a); if (n.length < 2) return;
        ac.add(a, { type: 'geography', id: g.id, strong: n.length >= 4 });
      });
    });
    ac.build();
    return { ac: ac, instColumnDict: instColumnDict };
  }

  // ---- ontology indexes ----------------------------------------------------
  function indexOntology(ont) {
    var ix = { company: {}, sector: {}, theme: {}, commodity: {}, institution: {}, geography: {},
               companiesBySector: {}, companiesByTheme: {}, companiesByCommodity: {}, companiesByGeo: {},
               companiesByForeignOps: {}, sectorsByCommodity: {}, sectorsByInstitution: {} };
    (ont.sectors || []).forEach(function (s) { ix.sector[s.id] = s; });
    (ont.themes || []).forEach(function (t) { ix.theme[t.id] = t; });
    (ont.commodities || []).forEach(function (c) { ix.commodity[c.id] = c; });
    (ont.geographies || []).forEach(function (g) { ix.geography[g.id] = g; });
    (ont.institutions || []).forEach(function (i) { ix.institution[i.id] = i; ix.sectorsByInstitution[i.id] = i.governs || []; });
    (ont.companies || []).forEach(function (c) {
      ix.company[c.id] = c;
      // THIN TIER: identity-only companies are eligible for P1 (direct name match) ONLY.
      // Excluding them from companiesBySector keeps them out of the P2 sector fan-out (a
      // ministry action must not reach hundreds of small-caps); they carry no themes/
      // exposures/foreignOps, so P3/P4/P5 already exclude them. Curated cos (no `tier`) unchanged.
      if (c.tier !== 'thin') (ix.companiesBySector[c.sector] = ix.companiesBySector[c.sector] || []).push(c.id);
      (c.themes || []).forEach(function (th) { (ix.companiesByTheme[th] = ix.companiesByTheme[th] || []).push(c.id); });
      (c.exposures || []).forEach(function (e) {
        if (e.type === 'commodity') { (ix.companiesByCommodity[e.id] = ix.companiesByCommodity[e.id] || []).push(c.id); (ix.sectorsByCommodity[e.id] = ix.sectorsByCommodity[e.id] || Object.create(null))[c.sector] = 1; }
        if (e.type === 'geography' && e.id !== 'IN') (ix.companiesByGeo[e.id] = ix.companiesByGeo[e.id] || []).push(c.id);
      });
      // foreignOperations (P5): declared PLANTS/subsidiaries/major assets abroad —
      // NOT revenue or billing exposure. This is the distinction that separates JLR
      // manufacturing in the UK from an IT firm billing UK clients. One geo may appear
      // once per company here (dedupe defensively).
      var foSeen = {};
      (c.foreignOperations || []).forEach(function (o) {
        if (o.geo && o.geo !== 'IN' && !foSeen[o.geo]) { foSeen[o.geo] = 1; (ix.companiesByForeignOps[o.geo] = ix.companiesByForeignOps[o.geo] || []).push(c.id); }
      });
    });
    return ix;
  }

  // ---- projector helpers ---------------------------------------------------
  var DATE_RE = /date|time|deadline|updated|published|as[_ ]?of|reported|introduced|_on$|^on$|started|commenced|since/i;
  var TITLE_HINT = /bill|title|headline|subject|case|policy|tender|program|topic|project|decision|scheme|conflict|order|manifesto|promise|initiative|programme|reform|matter|development|detail|_name$/i;
  // person / meta columns that must never be chosen as an event title
  var PERSON_META = /^(mp|mla|member|officer|candidate|person|bureaucrat)_?name$|^(name|party|house|state|constituency|question_type|status|priority|category|type|regulator|ministry|sector|stage)$/i;
  var NON_TITLE = /url|link|pdf|source|^id$|_id$|score|prob|pct|_num$|date|time/i;

  function parseDate(v) {
    if (v == null || v === '') return null;
    var s = String(v).trim();
    // A bare number is an id / row-index / count — NEVER an event date. This is the
    // root of the old bug: Date.parse('2001') succeeds, so a numeric id column looked
    // date-like and got picked as the date field, feeding recency from row numbers.
    if (/^\d+(\.\d+)?$/.test(s)) return null;
    // Day-first DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY (Indian govt convention; Date.parse
    // rejects the dotted form outright). Year is anchored last so ISO YYYY-MM-DD falls through.
    var dm = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if (dm) { var t2 = Date.parse(dm[3] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[1]).slice(-2)); if (!isNaN(t2)) return t2; }
    // Native Date.parse is too lenient: it pulls the year out of free-text status prose
    // ("In force since 2005" → 2005, "Tax since 2014" → 2014), which lets a status column
    // masquerade as a date. Only hand it strings that actually START date-shaped — a digit
    // or a month name. Prose starting with a word ("In", "Tax", "No ETS") falls through.
    if (/^(?:\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)) {
      var t = Date.parse(s);
      if (!isNaN(t)) return t;
    }
    var m = s.match(/(\d{1,2})[-\/ ]([A-Za-z]{3,})[-\/ ](\d{4})/); // 12 Mar 2024
    if (m) { t = Date.parse(m[3] + '-' + m[2] + '-' + m[1]); if (!isNaN(t)) return t; }
    // Coarse: a 4-digit year at the START of a short string (war_tracker `started` =
    // "2020 (flare 2023)", "since 2019", "c. 2021"). Jan 1 of that year — inception/
    // approximate. START-ANCHORED on purpose: a year merely *embedded* in a string must
    // NOT match, or a diary number "26263 / 2026" or a status "…since 2005" would be
    // mistaken for a date (the id-as-date class). Bare numbers already returned null above.
    var ym = s.match(/^(?:since|from|circa|c\.?|~|est\.?)?\s*(19\d{2}|20\d{2})\b/i);
    if (ym) { var t3 = Date.parse(ym[1] + '-01-01'); if (!isNaN(t3)) return t3; }
    return null;
  }
  // RESOLVED(phase7): question_database's DD.MM.YYYY dates now parse (see parseDate), and
  // a numeric 'id' can no longer be mistaken for a date (bare numbers return null). The
  // reason correct dates USED to break the graph — recency was multiplied into edge
  // existence + the confidence band — is fixed structurally: recency is now confined to
  // `salience` (ordering), out of `structural` (existence/band). Correct dates are now a
  // pure win for salience and cost the edge population nothing.

  function inferColumns(rows, instColumnDict, hints) {
    if (!rows || !rows.length) return null;
    var keys = Object.keys(rows[0] || {});
    var sample = rows.slice(0, Math.min(60, rows.length));
    var stats = {};
    keys.forEach(function (k) {
      var vals = sample.map(function (r) { return r[k]; }).filter(function (v) { return v != null && v !== ''; });
      var n = vals.length || 1;
      var avgLen = vals.reduce(function (a, v) { return a + String(v).length; }, 0) / n;
      var dateHits = vals.filter(function (v) { return parseDate(v) != null; }).length / n;
      var instHits = vals.filter(function (v) { return instColumnDict[norm(v)] != null; }).length / n;
      var uniq = new Set(vals.map(function (v) { return String(v); })).size / n;
      stats[k] = { avgLen: avgLen, dateHits: dateHits, instHits: instHits, uniq: uniq };
    });
    // date field
    var dateField = null, best = 0;
    keys.forEach(function (k) {
      if (stats[k].avgLen > 40) return;  // dates are short; a long-text col is never the date field
      if (/^id$|_id$|^sr|_num$|count|index|serial|s_no|^no$|rank/i.test(k)) return;  // id/index columns are never the date, even if their values Date.parse
      // A name-matched date column (date/started/deadline…) only needs 30% of its values
      // to parse — messy real-world date columns (war_tracker `started` = coarse years)
      // should not be silently dropped. An UNnamed column still needs 60% to be trusted.
      var minHits = DATE_RE.test(k) ? 0.3 : 0.6;
      if (stats[k].dateHits >= minHits && stats[k].dateHits > best) { best = stats[k].dateHits; dateField = k; }
    });
    // institution fields (structured): >30% resolve to an institution alias
    var instFields = keys.filter(function (k) { return stats[k].instHits >= 0.3; });
    // title field
    var titleField = null, tScore = -1;
    keys.forEach(function (k) {
      if (k === dateField || instFields.indexOf(k) >= 0) return;
      if (PERSON_META.test(k)) return;                 // never title on a person/meta column
      var s = stats[k], sc = s.avgLen;
      if (TITLE_HINT.test(k)) sc += 40;
      if (NON_TITLE.test(k)) sc -= 60;
      if (s.avgLen < 4) sc -= 40;
      if (sc > tScore) { tScore = sc; titleField = k; }
    });
    // text fields (longish strings, not date/inst/title)
    var textFields = keys.filter(function (k) { return k !== dateField && k !== titleField && instFields.indexOf(k) < 0 && stats[k].avgLen >= 25 && !/url|link|pdf/i.test(k); });
    // entity fields (short-ish high-cardinality strings, not the above) — scanned by fuzzy matcher
    var entityFields = keys.filter(function (k) {
      return k !== dateField && k !== titleField && textFields.indexOf(k) < 0 && instFields.indexOf(k) < 0
        && stats[k].avgLen >= 3 && stats[k].avgLen < 60 && !/url|link|pdf|^id|_id$|score|prob|pct|_num$/i.test(k);
    });
    // brainHints (extensibility contract §2.2): a data source may override any inferred
    // column. Absence changes nothing; presence wins over inference.
    if (hints) {
      var has = function (c) { return c && keys.indexOf(c) >= 0; };
      if (has(hints.dateColumn)) dateField = hints.dateColumn;
      if (has(hints.titleColumn)) titleField = hints.titleColumn;
      if (hints.textColumns) textFields = hints.textColumns.filter(has);
      if (hints.entityColumns) entityFields = hints.entityColumns.filter(has);
    }
    return { dateField: dateField, titleField: titleField, textFields: textFields, entityFields: entityFields, instFields: instFields };
  }

  // ---- source trust + event type per dataset -------------------------------
  function sourceTrustFor(key, arche, hints) {
    if (hints && typeof hints.sourceTrust === 'number') return hints.sourceTrust;
    var k = key.toLowerCase();
    if (/regulat|gazette|cabinet|sc_orders|judiciary|rbi|sebi/.test(k)) return 1.0;
    if (/tender|procurement/.test(k) || arche === 'tender') return 0.95;
    // Legislator activity (parliamentary questions, MP/MLA report cards) is a weak
    // INQUIRY signal, not an action — down-weight hard so its high volume + recency
    // cannot swamp the graph. A pointed question that names a company still survives.
    if (/question|report_card|mp_report|mla_report/.test(k)) return 0.4;
    if (/affidavit|transfer|bill_tracker|policy_pipeline|manifesto/.test(k) || arche === 'transfer') return 0.85;
    if (arche === 'tracker' || arche === 'directory') return 0.85;
    if (arche === 'media' || /news|wire|feed/.test(k)) return 0.7;
    if (arche === 'live') return 0.7;
    return 0.75;
  }
  function eventTypeFor(key, arche, hints, bucket) {
    if (hints && hints.eventType) return hints.eventType;
    var k = key.toLowerCase();
    if (/bill_tracker/.test(k)) return 'legislation';
    if (/policy_pipeline|policy/.test(k)) return 'policy';
    if (/tender/.test(k)) return 'procurement';
    if (/regulat/.test(k)) return 'regulatory_action';
    if (/sc_orders|judic|court/.test(k)) return 'court_order';
    if (/cabinet/.test(k)) return 'cabinet_decision';
    if (/procurement|defense|defence/.test(k)) return 'procurement';
    if (/transfer|agmut/.test(k)) return 'personnel';
    if (/war|conflict/.test(k)) return 'conflict';
    if (/infra|project/.test(k)) return 'project';
    if (/affidavit|candidate/.test(k)) return 'disclosure';
    if (/report_card|question|mp_|mla_/.test(k)) return 'legislative_activity';
    if (/news|wire|feed|media/.test(k) || arche === 'media') return 'news';
    return 'event';
  }

  // ---- main build ----------------------------------------------------------
  // Event types where the institution is the ACTOR (P2 governance fan-out allowed).
  var ALLOW_P2 = { legislation: 1, policy: 1, regulatory_action: 1, court_order: 1, cabinet_decision: 1, procurement: 1, news: 1 };
  // Trade-relevant themes that make a foreign-geography linkage (P5) meaningful.
  var TRADE_THEMES = ['import_duty', 'carbon_border', 'metal_export_duty', 'crude_cycle', 'steel_cycle', 'ethanol_blending'];
  // Step 7: routine / procedural institutional OUTPUT is not an institutional ACTION.
  // Extends the Phase 2 "action, not inquiry" rule (which gated question_database out of
  // P2) to regulatory_watch's scheduled liquidity operations, statistical/bulletin
  // releases, surveys, and administrative notices. A daily T-bill auction or a weekly
  // statistical supplement is the central bank's procedural output, not a directive that
  // acts on an NBFC — so it must not fan out to a whole sector via P2. KEPT as actions
  // (deliberately NOT matched): monetary penalties, Directions/enforcement, master
  // directions, licence/registration changes, rule-changing circulars, policy-rate
  // decisions. Scoped to regulatory_watch so a bill that merely says "auction" is safe.
  var P2_ROUTINE_RE = /\bauction\b|treasury bill|t-?bill\b|variable rate repo|\bvrr+\b|reverse repo|money market operation|open market operation|\bomo\b|government stock|underwriting|liquidity adjustment|\blaf\b|standing deposit facility|marginal standing facility|bulletin|statistical supplement|weekly statistical|sectoral deployment|lending and deposit rates|international investment position|\biip\b|invisibles|international trade in (services|banking)|\bsurvey\b|financial stability report|handbook of statistics|provisional data|premature redemption|redemption price|floating rate savings bond|\bfrsb\b|sovereign gold bond|\bsgb\b|citizen.?s charter|processing of applications|\bappoints\b|appointment of|new executive director|date extension|extension of (the )?(last )?date|corrigendum|statement of position|external debt|money supply|indicative calendar|market borrowings by|meets representatives/;
  // Confidence band from score (ordinal). Calibrated to the score distribution; the
  // UI always shows the label, the number only on hover. Never a bare decimal.
  function band(s) { return s >= 0.045 ? 'Strong' : s >= 0.018 ? 'Moderate' : s >= 0.007 ? 'Weak' : 'Speculative'; }

  // ---- dataset role classifier (single source of truth) --------------------
  // The projector OWNS this: a dataset's role decides whether its rows may become
  // event nodes at all. `event` projects; `reference` (state/structure about people
  // or places, not occurrences that act on a company) and `excluded` (price/numeric
  // series, prediction markets) never project. Wired into build() below AND surfaced
  // to coverage() via the API so classification lives in exactly one place — a
  // `reference` booth-demography row can never become a Strong company edge from a
  // person's name (the Balkrishna false-positive class this whole design prevents).
  function roleOf(key) {
    if (/manifold|market_feed|price_series|_series$|ohlc/.test(key)) return 'excluded';
    // electoral/booth data + candidate affidavits (disclosures about people, not
    // occurrences that act on a company) + legislator registers = reference.
    if (/booth|swing_analysis|_roll|_results|report_card|mp_report|mla_report|delimit|demograph|geo_state|geo_local|bloc|affidavit|candidate/.test(key)) return 'reference';
    // routine statistical releases + stock (not flow) tables: macro indicators, installed-capacity,
    // sanctions REGISTRY snapshots. Step 7 removed exactly this class from P2 (−1,792 edges) — if it
    // landed as `event` with an institution attached, the macro fan-out returns. Reference enriches; no link.
    if (/macro_indicator|worldbank|imf_macro|mospi|_capacity|ofac_(entit|sanction)|_sdn/.test(key)) return 'reference';
    // personnel postings (bureaucrat/AGMUT transfers) act on no listed company;
    // registry_wire is an external carbon-registry methodology feed (Verra/Gold
    // Standard) that names no Indian entity — both enrich, neither is a market event.
    if (/transfer|bureaucrat|registry_wire/.test(key)) return 'reference';
    return 'event';
  }
  function excludeReason(key) {
    if (/manifold/.test(key)) return 'prediction market — speculative, not events';
    if (/market_feed|price_series|_series$|ohlc/.test(key)) return 'price/numeric series — reference; the sparkline consumes it';
    return 'no defensible market linkage';
  }
  function refReason(key) {
    if (/booth|_results|swing|_roll|geo_state|geo_local|bloc|demograph/.test(key)) return 'electoral/booth data — no defensible market linkage; may enrich geography nodes only';
    if (/affidavit|candidate/.test(key)) return 'candidate financial disclosure — about a person, not an occurrence that acts on a company';
    if (/transfer|bureaucrat/.test(key)) return 'personnel postings — no direct company linkage; the officer, not the firm, moves';
    if (/registry_wire/.test(key)) return 'external carbon-registry methodology feed — names no Indian entity; enriches the carbon_credit theme only';
    if (/report_card|mp_report|mla_report/.test(key)) return 'legislator activity register — enriches, not an event stream';
    return 'state/structure, not dated occurrences';
  }

  var _cache = null; // { ver, m (matcher), ix (ontology index) }

  // ---- proper-noun guard (matcher root-cause fix) --------------------------
  // A common-noun SUBJECT keyword (commodity/theme/sector) matched INSIDE a proper noun —
  // an organisation name or an "A vs B" litigation caption — is a name, not the subject.
  // "steel" in "…BHILAI STEEL PLANT…", "power" in "X POWER LIMITED". Returns true when
  // EVERY occurrence of kw in the text is name-embedded (no clean subject use) → suppress.
  // Company/institution matches are NOT guarded — they are meant to be proper nouns. This
  // is the matcher-level cause behind booth-"Balkrishna" and the judiciary party-name hits.
  // Only UNAMBIGUOUS name-embeddings: private-company suffixes and litigation "vs" captions.
  // NOT "…Authority/Corporation/Board" — "[Sector] Regulatory Authority Bill" (telecom, coal,
  // aviation) is genuinely ABOUT that sector; the word before the regulator is the subject.
  // Sampling proved the broader list over-fired on legitimate sector bills. (The clearest
  // proper-noun class — judiciary captions — is handled at the dataset level: judiciary is
  // P1-only. This matcher guard mops up private-company mentions in the remaining datasets.)
  var NAME_DESIG_RE = /\b(limited|ltd|pvt|versus|vs)\b/i;
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function properNounEmbedded(text, kw) {
    if (!kw || kw.length < 3) return false;
    var re; try { re = new RegExp('\\b' + reEsc(kw) + '\\b', 'ig'); } catch (e) { return false; }
    var mm, anyClean = false, anyEmbedded = false, guard = 0;
    while ((mm = re.exec(text)) && guard++ < 40) {
      var s = mm.index, e = re.lastIndex;
      var before = text.slice(Math.max(0, s - 24), s), after = text.slice(e, e + 24);
      var vsCap = /\b(vs\.?|versus)\b/i.test(before) || /\b(vs\.?|versus)\b/i.test(after);
      var desigAfter = NAME_DESIG_RE.test(after.slice(0, 22)), desigBefore = NAME_DESIG_RE.test(before.slice(-22));
      if (vsCap || desigAfter || desigBefore) anyEmbedded = true; else anyClean = true;
      if (mm.index === re.lastIndex) re.lastIndex++;
    }
    return anyEmbedded && !anyClean;
  }

  function build(datasets, ont, opts) {
    opts = opts || {};
    // Degrade to an empty graph, never throw, on missing inputs (§6.3 failure states:
    // ontology block failed to load / EMBEDDED_CSV_DATA absent). graph.build() also
    // pre-checks, but the raw pipeline API must be safe on its own.
    if (!ont || !ont.version || !datasets) {
      return { nodes: Object.create(null), edges: [], stats: { nodeByType: {}, edgeByType: {}, touches: 0, byPathDataset: {}, skippedDatasets: [], threshold: (opts.threshold != null ? opts.threshold : 0.18), bandBoundariesDescriptive: {}, timing: {}, degraded: 'missing ontology or datasets' } };
    }
    var NOW = opts.now || Date.parse('2026-08-08');
    var THRESH = (opts.threshold != null) ? opts.threshold : 0.18;
    var MAX_EDGES_PER_EVENT = opts.maxEdgesPerEvent || 40;
    var featureMeta = opts.featureMeta || {}; // key -> {archetype,bucket,hints}
    var t0 = nowMs();

    // Cache the matcher + ontology index across builds — they only change when the
    // ontology version changes. This makes a rebuild essentially just row-processing,
    // keeping incremental/refresh rebuilds fast (Phase 5).
    if (!_cache || _cache.ver !== ont.version || opts.freshMatcher) {
      _cache = { ver: ont.version, m: buildMatcher(ont), ix: indexOntology(ont) };
    }
    var m = _cache.m, ix = _cache.ix;
    var tMatch0 = nowMs();

    // Incremental support: opts.seed = {nodes,edges} to start from; opts.only = set of
    // dataset keys to (re)process. Everything else is carried over from the seed.
    var seed = opts.seed;
    var nodes = seed ? seed.nodes : Object.create(null);   // id -> node
    var edges = seed ? seed.edges : [];
    var linkSet = Object.create(null);                     // dedupe structural (hub) edges
    if (seed) for (var _si = 0; _si < edges.length; _si++) { var _se = edges[_si]; if (_se.type !== 'TOUCHES' && _se.type !== 'SOURCED_FROM') linkSet[_se.type + _se.from + _se.to] = 1; }
    function ensureNode(id, type, label, extra) {
      if (!nodes[id]) { nodes[id] = { id: id, type: type, label: label, degree: 0 }; if (extra) for (var k in extra) nodes[id][k] = extra[k]; }
      return nodes[id];
    }
    // ontology nodes (companies/sectors/etc created lazily as referenced)
    function companyNode(cid) { var c = ix.company[cid]; return c ? ensureNode('company:' + cid, 'company', c.name, { sector: c.sector, priced: c.priced, tickers: c.tickers, ownership: c.ownership }) : null; }
    function hubNode(type, id) {
      var e = ix[type] && ix[type][id]; if (!e) return null;
      return ensureNode(type + ':' + id, type, e.name, type === 'sector' ? { indexSymbol: e.indexSymbol } : null);
    }
    function link(type, from, to) {
      if (!nodes[from] || !nodes[to]) return;
      var lk = type + from + to; if (linkSet[lk]) return; linkSet[lk] = 1;
      edges.push({ type: type, from: from, to: to });
      nodes[from].degree++; nodes[to].degree++;
    }

    var tProj = 0, tGraph = 0, tScore = 0;
    var byPathDataset = {};   // dataset -> {P1,P2,P3,P4,P5}
    var pnSuppress = { commodity: 0, theme: 0, sector: 0 };   // proper-noun-guard suppressions
    var eventEdgeCount = {};
    var allScores = [];
    var truncatedEvents = 0, droppedEdges = 0;
    var skippedDatasets = [];

    Object.keys(datasets).forEach(function (key) {
      if (opts.only && !opts.only[key]) return;   // incremental: process only dirty datasets
      var rows = datasets[key]; if (!Array.isArray(rows) || !rows.length) return;
      // Gate on dataset ROLE (single source of truth, roleOf above). Only `event`
      // datasets may project rows into event nodes + TOUCHES. `reference` (electoral/
      // booth demography, candidate affidavits, legislator registers, personnel
      // transfers, external registry feeds) and `excluded` (price/numeric series,
      // prediction markets) never project — a person's name in a booth table must not
      // become a company edge. This supersedes the old ad-hoc skip regex and is a
      // strict superset of it, so no previously-projected `event` dataset is affected.
      var role = roleOf(key);
      if (role !== 'event') { skippedDatasets.push(key + '(' + role + ')'); return; }
      var meta = featureMeta[key] || {};
      var pStart = nowMs();
      var cols = inferColumns(rows, m.instColumnDict, meta.hints);
      tProj += nowMs() - pStart;
      if (!cols) return;
      // If the inferred title is mostly numeric, this is a series/table, not events.
      if (cols.titleField) {
        var tv = rows.slice(0, 40).map(function (r) { return String(r[cols.titleField] || ''); });
        var numeric = tv.filter(function (v) { return v && /^[\d.,%\s-]+$/.test(v); }).length / (tv.length || 1);
        if (numeric > 0.6) { skippedDatasets.push(key + '(numeric)'); return; }
      }
      var sourceTrust = sourceTrustFor(key, meta.archetype, meta.hints);
      var eventType = eventTypeFor(key, meta.archetype, meta.hints, meta.bucket);
      var dsNode = ensureNode('dataset:' + key, 'dataset', key, { eventType: eventType, sourceTrust: sourceTrust });
      byPathDataset[key] = byPathDataset[key] || { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };

      for (var ri = 0; ri < rows.length; ri++) {
        var r = rows[ri];
        var title = cols.titleField ? String(r[cols.titleField] || '') : '';
        var textParts = [title];
        cols.textFields.forEach(function (f) { textParts.push(String(r[f] || '')); });
        cols.entityFields.forEach(function (f) { textParts.push(String(r[f] || '')); });
        var scanText = textParts.join(' . ');
        var t = cols.dateField ? parseDate(r[cols.dateField]) : null;

        var gStart = nowMs();
        var hits = m.ac.search(scanText);
        // collect matches by type
        var comp = {}, inst = {}, comm = {}, theme = {}, sect = {}, geo = {};
        var themeKw = {};   // themeId -> { kw:1 } set of DISTINCT keywords hit (for P3 corroboration)
        // Proper-noun guard (matcher-level): a common-noun SUBJECT keyword matched only
        // INSIDE a proper noun/caption is a name, not the subject — suppress it. Fast path:
        // only runs when the text carries a name-designation/vs signal at all.
        var hasNameSignal = NAME_DESIG_RE.test(scanText), pnCache = {};
        function pnGuard(kw, typeKey) { if (!hasNameSignal) return false; if (kw in pnCache) { if (pnCache[kw]) pnSuppress[typeKey]++; return pnCache[kw]; } var v = properNounEmbedded(scanText, kw); pnCache[kw] = v; if (v) pnSuppress[typeKey]++; return v; }
        hits.forEach(function (h) {
          var p = h.payload;
          if (p.type === 'company') { (comp[p.id] = comp[p.id] || { strong: false, sector: p.sector }); if (p.strong) comp[p.id].strong = true; }
          else if (p.type === 'institution') inst[p.id] = 1;
          else if (p.type === 'commodity') { if (!pnGuard(p.kw, 'commodity')) comm[p.id] = 1; }
          else if (p.type === 'theme') { if (!pnGuard(p.kw, 'theme')) { theme[p.id] = 1; (themeKw[p.id] = themeKw[p.id] || Object.create(null))[p.kw || '?'] = 1; } }
          else if (p.type === 'sector') { if (!pnGuard(p.kw, 'sector')) sect[p.id] = 1; }
          else if (p.type === 'geography') geo[p.id] = 1;
        });
        // structural institutions from columns (exact)
        cols.instFields.forEach(function (f) { var id = m.instColumnDict[norm(r[f])]; if (id) inst[id] = 1; });

        // false-positive guard for weak company matches
        Object.keys(comp).forEach(function (cid) {
          if (comp[cid].strong) return;
          var c = ix.company[cid]; if (!c) { delete comp[cid]; return; }
          var corrob = sect[c.sector] || false;
          if (!corrob) { for (var iid in inst) { if ((ix.sectorsByInstitution[iid] || []).indexOf(c.sector) >= 0) { corrob = true; break; } } }
          if (!corrob) (c.themes || []).forEach(function (th) { if (theme[th]) corrob = true; });
          if (!corrob) (c.exposures || []).forEach(function (e) { if (e.type === 'commodity' && comm[e.id]) corrob = true; });
          if (!corrob) delete comp[cid];
        });

        var entitiesMentioned = Object.keys(comp).length + Object.keys(inst).length + Object.keys(comm).length + Object.keys(theme).length;
        var specificity = 1 / (1 + Math.log(1 + entitiesMentioned));
        var ageDays = (t != null) ? Math.max(0, (NOW - t) / 86400000) : null;
        var recency = (ageDays == null) ? 0.5 : Math.max(0.15, Math.exp(-ageDays / 30));

        // assemble candidate TOUCHES for this event (dedupe by company, keep best path)
        var cand = {};   // cid -> best {path, pathStrength, exposureStrength, targets, via}
        function offer(cid, path, pathStrength, exposureStrength, targets, via) {
          if (!ix.company[cid]) return;
          var e = cand[cid];
          var s = pathStrength * exposureStrength; // provisional (fanOut applied after target count known)
          if (!e || s > e._rank) cand[cid] = { path: path, pathStrength: pathStrength, exposureStrength: exposureStrength, targets: targets, via: via, _rank: s };
        }

        // P1 direct
        var p1ids = Object.keys(comp); var p1n = p1ids.length;
        p1ids.forEach(function (cid) { offer(cid, 'P1', 1.0, 1.0, p1n, null); });

        // P2 institutional — ONLY when the event is an institutional ACTION.
        // A bill/regulation/cabinet decision/tender/court order is the institution
        // acting on a sector. A parliamentary QUESTION addressed to a ministry, an
        // MP report card, or a bureaucrat transfer is NOT an action that governs a
        // sector, so it must not fan out to every company the ministry governs.
        // Step 7: nor is ROUTINE regulatory output (auctions, bulletins, surveys,
        // admin notices) in regulatory_watch — see P2_ROUTINE_RE above.
        // Step 7 verification: an institution named as a PARTY to litigation in a case
        // title is not that institution taking an action on a sector (same name-match-in-
        // non-action-text error as booth demography) — exclude judiciary from P2 entirely.
        // Its P1 (direct company name in the case title) and P4 (commodity) edges stay.
        var p2Routine = (key === 'national_regulatory_watch.csv') && P2_ROUTINE_RE.test(norm(title));
        // Judiciary produces P1 and NOTHING else. A Supreme Court case caption is a PARTY
        // LIST, not a subject description — the one reliable fact is who the litigants are,
        // which P1 (a listed company named in the caption) consumes correctly. Its P2
        // (institution as a party), P3 (theme keyword in a caption) and P4 (a commodity word
        // inside an org name — "…BHILAI STEEL PLANT…") are all name-matches-in-a-proper-noun,
        // the same class as booth "Balkrishna". Structured subject cols are 208/220 "Other".
        // P1-ONLY family: case-caption / insolvency datasets whose text is a PARTY name, not a
        // subject. A commodity/theme word inside a party name ("GOODWILL IRON & STEEL TRADERS PVT
        // LTD") is a name-collision, not a steel-sector signal — the same class as judiciary case
        // captions. So SC orders, IBBI announcements, and the NCLT/NCLAT tribunals are P1-only:
        // the named party gets a direct P1 edge and nothing fans out to P2/P3/P4/P5.
        var p1OnlyDs = /^(judiciary_sc_orders|national_ibbi_announcements|judiciary_nclt_orders|judiciary_nclat_orders)\.csv$/.test(key);
        // Sectors this event corroborates: named directly, or covered by a theme it hits,
        // or mapped to by a commodity it names. Used to GRADE P2 fan-out — a ministry that
        // governs many sectors firing into a sector the document says nothing about is the
        // P2 analogue of the P3 theme fan-out. (Diagnostic only for now: recorded on `via`,
        // does not yet change edge strength — that is the graded fix if the gate fails.)
        var p2Corrob = Object.create(null);
        Object.keys(sect).forEach(function (sid) { p2Corrob[sid] = 1; });
        Object.keys(theme).forEach(function (th) { ((ix.theme[th] && ix.theme[th].sectors) || []).forEach(function (sid) { p2Corrob[sid] = 1; }); });
        Object.keys(comm).forEach(function (co) { var m = ix.sectorsByCommodity[co]; if (m) for (var sid in m) p2Corrob[sid] = 1; });
        if (ALLOW_P2[eventType] && !p2Routine && !p1OnlyDs) Object.keys(inst).forEach(function (iid) {
          var secs = ix.sectorsByInstitution[iid] || []; if (!secs.length) return;
          var breadth = secs.length;
          var targets = []; secs.forEach(function (sid) { (ix.companiesBySector[sid] || []).forEach(function (cid) { targets.push(cid); }); });
          var tn = targets.length; if (!tn) return;
          targets.forEach(function (cid) {
            var c = ix.company[cid];
            // a single-sector ministry is trivially corroborated by the governs relation itself.
            var corrob = (breadth === 1) || !!p2Corrob[c.sector];
            var es = 0.7; (c.exposures || []).forEach(function (e) { if (e.type === 'institution' && e.id === iid) es = e.strength; });
            offer(cid, 'P2', 0.6, es, tn, { institution: iid, sector: c.sector, govBreadth: breadth, sectorCorroborated: corrob });
          });
        });

        // P3 thematic — event-level CORROBORATION gate (Step 6). A single generic keyword
        // is not enough to claim an event is about a theme and fan it out to every company
        // on that theme. The event must be CONFIDENTLY about the theme:
        //   (a) >= 2 DISTINCT theme keywords hit, OR
        //   (b) 1 keyword + a corroborating sector or institution in the SAME event —
        //       a sector the theme spans is named, or an institution that governs one of
        //       the theme's sectors is present.
        // Same discipline as the P5 geographic gate: a lone word ("highway", "capex",
        // "incentive scheme") is a corroborant, not a generator. This is what lifts P3
        // off the 4/6 floor. `road_highways -> KEC` from a bare "highway" no longer fires.
        if (!p1OnlyDs) Object.keys(theme).forEach(function (th) {
          var kwCount = themeKw[th] ? Object.keys(themeKw[th]).length : 1;
          var confident = kwCount >= 2;
          if (!confident) {
            var tsecs = (ix.theme[th] && ix.theme[th].sectors) || [];
            for (var si = 0; si < tsecs.length; si++) { if (sect[tsecs[si]]) { confident = true; break; } }
            if (!confident) { for (var iid in inst) { var gv = ix.sectorsByInstitution[iid] || []; for (var gi = 0; gi < gv.length; gi++) { if (tsecs.indexOf(gv[gi]) >= 0) { confident = true; break; } } if (confident) break; } }
          }
          if (!confident) return;   // uncorroborated single-keyword theme hit → not a linkage
          var targets = ix.companiesByTheme[th] || []; var tn = targets.length; if (!tn) return;
          targets.forEach(function (cid) { offer(cid, 'P3', 0.45, 0.6, tn, { theme: th }); });
        });

        // P4 commodity
        if (!p1OnlyDs) Object.keys(comm).forEach(function (co) {
          var targets = ix.companiesByCommodity[co] || []; var tn = targets.length; if (!tn) return;
          targets.forEach(function (cid) {
            var c = ix.company[cid]; var es = 0.5; (c.exposures || []).forEach(function (e) { if (e.type === 'commodity' && e.id === co) es = e.strength; });
            offer(cid, 'P4', 0.5, es, tn, { commodity: co });
          });
        });

        // P5 geographic — DECLARED FOREIGN OPERATIONS only (Step 6 rebuild). A trade-
        // relevant theme (CBAM, import/export duty, crude/steel cycle) or a conflict that
        // names a commodity opens the geographic vector — a country named in an otherwise
        // domestic event is not a linkage. Then P5 fires ONLY for a company that has
        // DECLARED OPERATIONS in that geography: a plant, a subsidiary, or a major asset
        // (company.foreignOperations) — NOT revenue or billing exposure. This is the
        // distinction the path exists for: a UK carbon rule reaches Tata Motors because
        // JLR MANUFACTURES in the UK, and must NOT reach an IT/pharma name that merely
        // BILLS UK/US clients (HCL US:0.7 == Tata Motors UK:0.7 as bare exposure — which
        // is exactly why bare exposure was abandoned). Operations, not exposure.
        var themesHere = TRADE_THEMES.filter(function (th) { return theme[th]; });
        var geoAllowed = !p1OnlyDs && (themesHere.length > 0 || (eventType === 'conflict' && Object.keys(comm).length > 0));
        if (geoAllowed) {
          // The event's trade regime only reaches CERTAIN lines of business. A CBAM/ETS
          // event covers the sectors those trade-themes span (metal, cement, chemicals) —
          // it reaches a steel or aluminium plant, NOT a pharma plant that merely happens
          // to sit in the same country. So a P5 edge needs operations in the geo AND a
          // line-of-business match: the operation's sector is one the event's trade-theme
          // covers, or the company is exposed to a commodity the event names (the conflict
          // path). Without the LOB match, "company has a plant in the EU + EU published a
          // carbon rule" is the exposure-only fallacy P5 was rebuilt to kill.
          var coveredSectors = Object.create(null);
          themesHere.forEach(function (th) { ((ix.theme[th] && ix.theme[th].sectors) || []).forEach(function (sid) { coveredSectors[sid] = 1; }); });
          Object.keys(geo).forEach(function (g) {
            if (g === 'IN') return;
            var targets = ix.companiesByForeignOps[g] || []; var tn = targets.length; if (!tn) return;
            targets.forEach(function (cid) {
              var c = ix.company[cid];
              var ops = (c.foreignOperations || []).filter(function (o) { return o.geo === g; });
              if (!ops.length) return;               // no declared operations in this geo → not a P5 linkage
              var lob = !!coveredSectors[c.sector];   // operation's sector is covered by the event's trade regime
              if (!lob) (c.exposures || []).forEach(function (e) { if (e.type === 'commodity' && comm[e.id]) lob = true; });
              if (!lob) return;                       // plant in geo but wrong line of business → not a linkage
              // operations strength: a plant/subsidiary is a strong structural tie (0.5–0.9),
              // scaled by how much of the business sits there; a major_asset ranks a touch lower.
              var rs = 0; ops.forEach(function (o) { if ((o.revenueShare || 0) > rs) rs = o.revenueShare || 0; });
              var hardAsset = ops.some(function (o) { return o.type === 'manufacturing' || o.type === 'subsidiary_operations'; });
              var es = Math.max(0.5, Math.min(0.9, (hardAsset ? 0.55 : 0.45) + 0.5 * rs));
              offer(cid, 'P5', 0.25, es, tn, { geography: g, operations: ops.map(function (o) { return o.type + ':' + o.entity; }) });
            });
          });
        }

        // score candidates
        var eid = 'event:' + key + '#' + (r.id != null ? r.id : ri);
        var scored = [];
        Object.keys(cand).forEach(function (cid) {
          var e = cand[cid];
          var fanOut = 1 / Math.sqrt(1 + e.targets);
          // TWO scores, deliberately separated:
          //   structural = does this edge EXIST, and how strong is the linkage → drives the
          //                threshold and the confidence band. Timeless: recency-free, so a
          //                4-month-old Ministry-of-Coal→coal edge is exactly as real as a fresh one.
          //   salience   = should the user LOOK at this now → drives ordering, default view, Phase 8.
          //                convergence/valence/novelty are Phase 8; until then they are 1 (identity).
          var structural = e.pathStrength * sourceTrust * specificity * e.exposureStrength * fanOut;
          var salience = structural * recency; // * convergence * valence * novelty (Phase 8)
          scored.push({ cid: cid, path: e.path, structural: structural, salience: salience, via: e.via,
            comps: { pathStrength: e.pathStrength, recency: recency, sourceTrust: sourceTrust, specificity: specificity, exposureStrength: e.exposureStrength, fanOut: fanOut } });
        });
        tGraph += nowMs() - gStart;

        var sStart = nowMs();
        // threshold + per-event cap (A3). Both gate EXISTENCE, so both key on structural,
        // never recency — an edge's right to exist does not decay with the calendar.
        scored = scored.filter(function (x) { return x.structural >= THRESH; });
        if (!scored.length) { tScore += nowMs() - sStart; continue; }
        scored.sort(function (a, b) { return b.structural - a.structural; });
        var truncated = false, dropped = 0;
        if (scored.length > MAX_EDGES_PER_EVENT) { dropped = scored.length - MAX_EDGES_PER_EVENT; scored = scored.slice(0, MAX_EDGES_PER_EVENT); truncated = true; truncatedEvents++; droppedEdges += dropped; }

        // materialize event node + edges
        var evNode = ensureNode(eid, 'event', title || (eventType + ' ' + (r.id || ri)), { dataset: key, eventType: eventType, t: t, rowId: (r.id != null ? r.id : ri), truncated: truncated, dropped: dropped });
        edges.push({ type: 'SOURCED_FROM', from: eid, to: 'dataset:' + key }); nodes[eid].degree++; dsNode.degree++;
        // Hub edges from this event's matches (the STRUCTURE the graph is drawn on).
        Object.keys(inst).forEach(function (iid) { if (hubNode('institution', iid)) link('MENTIONS', eid, 'institution:' + iid); });
        Object.keys(comm).forEach(function (co) { if (hubNode('commodity', co)) link('MENTIONS', eid, 'commodity:' + co); });
        Object.keys(geo).forEach(function (gid) { if (gid !== 'IN' && hubNode('geography', gid)) link('MENTIONS', eid, 'geography:' + gid); });
        Object.keys(theme).forEach(function (th) { if (hubNode('theme', th)) link('ON_THEME', eid, 'theme:' + th); });
        // TOUCHES: kept, scored, evidence-carrying — NOT a default-drawn edge.
        scored.forEach(function (x) {
          companyNode(x.cid);
          edges.push({ type: 'TOUCHES', from: eid, to: 'company:' + x.cid, path: x.path, structural: x.structural, salience: x.salience, score: x.structural, band: null, via: x.via, components: x.comps });
          byPathDataset[key][x.path]++;
          nodes[eid].degree++; nodes['company:' + x.cid].degree++;
          allScores.push(x.structural);
        });
        eventEdgeCount[eid] = scored.length;
        tScore += nowMs() - sStart;
      }
    });

    // ---- static ontology scaffold: the hub structure the layout hangs on -----
    // For every materialised company: IN_SECTOR + EXPOSED_TO. For every institution
    // that is a node (mentioned) and governs: GOVERNS to its sector hubs.
    Object.keys(nodes).forEach(function (nid) {
      var n = nodes[nid];
      if (n.type !== 'company') return;
      var c = ix.company[nid.slice(8)]; if (!c) return;
      if (hubNode('sector', c.sector)) link('IN_SECTOR', nid, 'sector:' + c.sector);
      (c.themes || []).forEach(function (th) { if (hubNode('theme', th)) link('EXPOSED_TO', nid, 'theme:' + th); });
      (c.exposures || []).forEach(function (e) {
        if (e.type === 'commodity' && hubNode('commodity', e.id)) link('EXPOSED_TO', nid, 'commodity:' + e.id);
        else if (e.type === 'geography' && e.id !== 'IN' && hubNode('geography', e.id)) link('EXPOSED_TO', nid, 'geography:' + e.id);
      });
    });
    (ont.institutions || []).forEach(function (i) {
      if (!nodes['institution:' + i.id]) return;               // only mentioned institutions
      (i.governs || []).forEach(function (sid) { if (hubNode('sector', sid)) link('GOVERNS', 'institution:' + i.id, 'sector:' + sid); });
    });

    // ---- quantile-based confidence bands -------------------------------------
    // Absolute thresholds are meaningless once fanOut compresses the score range,
    // so bands are relative to THIS graph's TOUCHES distribution: Strong = top 10%,
    // Moderate = next 25%, Weak = next 40%, Speculative = bottom 25%.
    // Bands are quantiles over STRUCTURAL (linkage strength), never salience — "Strong"
    // must mean strong linkage, not recent linkage.
    var touchEdges = edges.filter(function (e) { return e.type === 'TOUCHES'; });
    // Step 7: bands assigned by RANK, not by a value threshold. Thousands of P2 edges
    // score an identical structural value (most terms are constant for a ministry→sector
    // edge), so a `>= cut` test swept the whole tie mass across the Strong cut and put
    // Strong at 15% instead of 10%. Sorting ascending by structural and breaking ties by
    // SALIENCE fixes both: the distribution lands at exactly 10/25/40/25 by count, and
    // among structurally identical edges the more recent/convergent one wins the higher
    // band (meaningful, not arbitrary). Strong = top 10%, Moderate = next 25%, Weak =
    // next 40%, Speculative = bottom 25%.
    var ranked = touchEdges.slice().sort(function (a, b) { return (a.structural - b.structural) || ((a.salience || 0) - (b.salience || 0)); });
    var nT = ranked.length;
    var iWeak = Math.floor(0.25 * nT), iModerate = Math.floor(0.65 * nT), iStrong = Math.floor(0.90 * nT);
    // rank (1 = strongest linkage) + total, so the panel can expose RANK not the bare
    // structural score: the band is now decided by rank, and two edges with an identical
    // score can legitimately land in different bands (the tie cluster is still there — it
    // was only stopped from sweeping the cut). Showing rank makes that honest and visible.
    ranked.forEach(function (e, i) { e.band = i >= iStrong ? 'Strong' : i >= iModerate ? 'Moderate' : i >= iWeak ? 'Weak' : 'Speculative'; e.rank = nT - i; e.rankTotal = nT; });
    var cutWeak = nT ? ranked[Math.min(nT - 1, iWeak)].structural : 0;
    var cutModerate = nT ? ranked[Math.min(nT - 1, iModerate)].structural : 0;
    var cutStrong = nT ? ranked[Math.min(nT - 1, iStrong)].structural : 0;
    var scoresSorted = ranked.map(function (e) { return e.structural; });
    allScores = scoresSorted;   // ensure deciles reflect the FULL touch set (matters when seeded)

    var t1 = nowMs();
    // stats
    var nodeByType = {}, edgeByType = {};
    Object.keys(nodes).forEach(function (id) { nodeByType[nodes[id].type] = (nodeByType[nodes[id].type] || 0) + 1; });
    edges.forEach(function (e) { edgeByType[e.type] = (edgeByType[e.type] || 0) + 1; });
    allScores.sort(function (a, b) { return a - b; });
    var deciles = [];
    for (var d = 0; d <= 10; d++) { var idx = Math.min(allScores.length - 1, Math.floor(d / 10 * allScores.length)); deciles.push(allScores.length ? +allScores[Math.max(0, idx)].toFixed(4) : 0); }
    var topEvents = Object.keys(eventEdgeCount).map(function (eid) { return { event: eid, title: nodes[eid] && nodes[eid].label, edges: eventEdgeCount[eid] }; })
      .sort(function (a, b) { return b.edges - a.edges; }).slice(0, 10);

    return {
      nodes: nodes, edges: edges,
      stats: {
        nodeByType: nodeByType, edgeByType: edgeByType,
        touches: edgeByType.TOUCHES || 0,
        byPathDataset: byPathDataset,
        scoreDeciles: deciles,
        topEvents: topEvents,
        truncatedEvents: truncatedEvents, droppedEdges: droppedEdges,
        skippedDatasets: skippedDatasets,
        properNounSuppressed: pnSuppress,   // subject-keyword matches suppressed inside proper nouns/captions
        threshold: THRESH,
        // DESCRIPTIVE only — the structural value at each rank boundary this build. Bands are
        // assigned by RANK (10/25/40/25), not by these values, so they are NOT thresholds and
        // shift every rebuild. Never store, cache, or document them as band cutoffs.
        bandBoundariesDescriptive: { Strong: cutStrong, Moderate: cutModerate, Weak: cutWeak },
        timing: { total: t1 - t0, projection: Math.round(tProj), matching: Math.round(tGraph), scoring: Math.round(tScore), setup: Math.round(tMatch0 - t0) }
      }
    };
  }

  function nowMs() { try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); } catch (e) { return Date.now(); } }

  // Incremental refresh: re-project/re-extract ONLY the dirty datasets. Removes their
  // event nodes + incident edges from prev, then rebuilds just those, carrying over the
  // rest. Confidence bands are recomputed over the full merged TOUCHES set.
  function buildIncremental(datasets, ont, opts, prev, dirtyKeys) {
    opts = opts || {};
    var dirty = {}; (dirtyKeys || []).forEach(function (k) { dirty[k] = 1; });
    var nodes = prev.nodes, edges = prev.edges, removeEvent = {};
    Object.keys(nodes).forEach(function (id) { var n = nodes[id]; if (n.type === 'event' && dirty[n.dataset]) { removeEvent[id] = 1; delete nodes[id]; } });
    var kept = [];
    for (var i = 0; i < edges.length; i++) { var e = edges[i]; if (removeEvent[e.from] || removeEvent[e.to]) { if (nodes[e.from]) nodes[e.from].degree--; if (nodes[e.to]) nodes[e.to].degree--; continue; } kept.push(e); }
    var o2 = {}; for (var k in opts) o2[k] = opts[k];
    o2.seed = { nodes: nodes, edges: kept }; o2.only = dirty;
    return build(datasets, ont, o2);
  }

  var API = { build: build, buildIncremental: buildIncremental, AhoCorasick: AhoCorasick, buildMatcher: buildMatcher, indexOntology: indexOntology, inferColumns: inferColumns, parseDate: parseDate, norm: norm, roleOf: roleOf, excludeReason: excludeReason, refReason: refReason };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.NiyBrain = root.NiyBrain || {}; root.NiyBrain.pipeline = API; }
})(typeof self !== 'undefined' ? self : this);

/* ---- Phase 2: graph orchestrator ---- */

/* THE BRAIN — Phase 2: graph orchestrator (main thread).
   Reads the lexical EMBEDDED_CSV_DATA + FEATURE_DATA (available because this is a
   classic script after block 067) and the window.NIY_BRAIN_ONTOLOGY, then runs the
   pipeline. Matching+graph currently run in-thread (~130ms, non-blocking); Phase 3
   moves them into the shared layout Web Worker. EMBEDDED_CSV_DATA is never posted
   anywhere — projection reads it here and only compact rows would cross to a worker. */
(function () {
  'use strict';
  try {
    var NiyBrain = window.NiyBrain = window.NiyBrain || {};

    // Build csv -> {archetype,bucket,hints} from the feature catalogs. brainHints
    // (the extensibility contract) is picked up here when a dataSource declares it.
    function featureMetaFromCatalog() {
      var meta = {};
      function ingest(arr) {
        (arr || []).forEach(function (f) {
          if (f && f.dataSource && f.dataSource.csv) {
            meta[f.dataSource.csv] = { archetype: f.archetype || null, bucket: f.bucket || null, hints: f.dataSource.brainHints || null };
          }
        });
      }
      try { if (typeof FEATURE_DATA !== 'undefined') Object.keys(FEATURE_DATA).forEach(function (t) { ingest(FEATURE_DATA[t]); }); } catch (e) {}
      try { var SNF = window.SHEET_NEW_FEATURES; if (SNF) Object.keys(SNF).forEach(function (t) { ingest(Array.isArray(SNF[t]) ? SNF[t] : (SNF[t] && SNF[t].features)); }); } catch (e) {}
      return meta;
    }

    var _last = null;
    NiyBrain.graph = {
      threshold: 0.006,     // recalibrated (phase7) over the recency-free STRUCTURAL score:
                            // ~18.6k defensible edges (candidate ceiling 18.68k), all 5 paths.
                            // Old 0.003 was tuned over recency-laden scores and is not comparable.
      build: function (opts) {
        opts = opts || {};
        try {
          if (typeof EMBEDDED_CSV_DATA === 'undefined' || !NiyBrain.pipeline) return null;
          var ont = window.NIY_BRAIN_ONTOLOGY; if (!ont) return null;
          NiyBrain.bus.emit('graph:progress', { phase: 'building' });
          var meta = featureMetaFromCatalog();
          var th = (opts.threshold != null) ? opts.threshold : NiyBrain.graph.threshold;
          var g = NiyBrain.pipeline.build(EMBEDDED_CSV_DATA, ont, { threshold: th, featureMeta: meta, now: opts.now });
          _last = g;
          NiyBrain.bus.emit('graph:ready', { stats: g.stats });
          return g;
        } catch (e) { try { console.warn('[NiyBrain] graph build failed:', e); } catch (_) {} return null; }
      },
      // Incremental refresh (Phase 5): re-extract only the dirty datasets against the
      // last graph. Falls back to a full build if anything is missing.
      buildIncremental: function (dirtyKeys) {
        try {
          if (!_last || typeof EMBEDDED_CSV_DATA === 'undefined' || !NiyBrain.pipeline || !NiyBrain.pipeline.buildIncremental) return NiyBrain.graph.build();
          var ont = window.NIY_BRAIN_ONTOLOGY; if (!ont) return null;
          var g = NiyBrain.pipeline.buildIncremental(EMBEDDED_CSV_DATA, ont, { threshold: NiyBrain.graph.threshold, featureMeta: featureMetaFromCatalog() }, _last, dirtyKeys);
          _last = g; NiyBrain.bus.emit('graph:ready', { stats: g.stats });
          return g;
        } catch (e) { try { console.warn('[NiyBrain] incremental failed; full rebuild', e); } catch (_) {} return NiyBrain.graph.build(); }
      },
      get: function () { return _last; },
      stats: function () { return _last ? _last.stats : null; },
      ensure: function () { return _last || NiyBrain.graph.build(); }
    };

    // ---- Phase 7: coverage matrix -------------------------------------------
    // role: event (produces event nodes + TOUCHES) | reference (state/structure,
    // never an event) | excluded (with a stated reason). Every event dataset that
    // produces ZERO TOUCHES gets a diagnostic — that's a bug, not a fact.
    // Classification is owned by the projector (NiyBrain.pipeline.roleOf) so coverage()
    // and build() can never disagree about what a dataset is. These delegate; if the
    // pipeline is somehow absent, everything is treated as an event (fail-open for the
    // read-only coverage view only — build() has its own local roleOf).
    function roleOf(key) { return (NiyBrain.pipeline && NiyBrain.pipeline.roleOf) ? NiyBrain.pipeline.roleOf(key) : 'event'; }
    function excludeReason(key) { return (NiyBrain.pipeline && NiyBrain.pipeline.excludeReason) ? NiyBrain.pipeline.excludeReason(key) : ''; }
    function refReason(key) { return (NiyBrain.pipeline && NiyBrain.pipeline.refReason) ? NiyBrain.pipeline.refReason(key) : ''; }
    // Date-coverage: a dataset that silently has no parseable date can never enter a
    // recency window (the Pulse). This has failed silently twice (question_database's
    // DD.MM.YYYY, then war_tracker/physical). Compute % of rows with a parseable date,
    // which column, and the age spread — every coverage() call, as a first-class field.
    function dateCoverage(key, rows) {
      try {
        var P = NiyBrain.pipeline; if (!P || !P.parseDate) return null;
        if (!NiyBrain._covMatcher || NiyBrain._covMatcherVer !== window.NIY_BRAIN_ONTOLOGY.version) {
          NiyBrain._covMatcher = P.buildMatcher(window.NIY_BRAIN_ONTOLOGY);
          NiyBrain._covMatcherVer = window.NIY_BRAIN_ONTOLOGY.version;
        }
        var cols = P.inferColumns(rows, NiyBrain._covMatcher.instColumnDict, null);
        var field = cols && cols.dateField;
        var NOW = Date.parse('2026-08-08');
        var n = rows.length || 1, parsed = 0, ages = [], future = 0;
        rows.forEach(function (r) {
          var t = field ? P.parseDate(r[field]) : null;
          if (t == null) return;
          parsed++;
          var age = (NOW - t) / 86400000;
          if (age < 0) future++; else ages.push(age);
        });
        ages.sort(function (a, b) { return a - b; });
        var med = ages.length ? Math.round(ages[Math.floor(ages.length / 2)]) : null;
        return {
          dateField: field || null,
          datePct: +(100 * parsed / n).toFixed(1),
          ageMinDays: ages.length ? Math.round(ages[0]) : null,
          ageMedDays: med,
          ageMaxDays: ages.length ? Math.round(ages[ages.length - 1]) : null,
          futureDated: future
        };
      } catch (e) { return { error: String(e && e.message || e) }; }
    }
    NiyBrain.coverage = function () {
      var g = NiyBrain.graph.ensure(); if (!g || typeof EMBEDDED_CSV_DATA === 'undefined') return null;
      var evByDs = {}, touchByDs = {}, pathByDs = {};
      Object.keys(g.nodes).forEach(function (id) { var n = g.nodes[id]; if (n.type === 'event') evByDs[n.dataset] = (evByDs[n.dataset] || 0) + 1; });
      g.edges.forEach(function (e) { if (e.type !== 'TOUCHES') return; var ev = g.nodes[e.from]; if (!ev) return; touchByDs[ev.dataset] = (touchByDs[ev.dataset] || 0) + 1; (pathByDs[ev.dataset] = pathByDs[ev.dataset] || {})[e.path] = ((pathByDs[ev.dataset] || {})[e.path] || 0) + 1; });
      var out = {};
      Object.keys(EMBEDDED_CSV_DATA).forEach(function (key) {
        var rows = EMBEDDED_CSV_DATA[key]; if (!Array.isArray(rows)) return;
        var role = roleOf(key);
        var events = evByDs[key] || 0, touches = touchByDs[key] || 0;
        var rec = { role: role, rows: rows.length, events: events, touches: touches, paths: pathByDs[key] || {}, date: rows.length ? dateCoverage(key, rows) : null };
        if (role === 'excluded') rec.excludedReason = excludeReason(key);
        else if (role === 'reference') rec.reason = refReason(key);
        else if (touches === 0) rec.diagnostic = events === 0 ? 'no event nodes in graph — every projected row either matched no company OR its best path scored below the ' + NiyBrain.graph.threshold + ' threshold; inspect with pipeline.inferColumns + a threshold:0 build' : 'events materialised but no company matched — ontology/keyword gap for this desk';
        out[key] = rec;
      });
      return out;
    };
    // Date-coverage matrix — report every time; a dataset below 100% parseable is a
    // defect line, not a footnote. `family` marks which Pulse family the dataset feeds.
    NiyBrain.coverage.dates = function () {
      var c = NiyBrain.coverage(); if (!c) return;
      var rows = Object.keys(c).map(function (k) {
        var r = c[k], d = r.date || {};
        return { dataset: k.replace('.csv', ''), role: r.role, rows: r.rows, touches: r.touches,
          dateField: d.dateField || '—', datePct: (d.datePct == null ? '—' : d.datePct + '%'),
          ageMin: d.ageMinDays, ageMed: d.ageMedDays, ageMax: d.ageMaxDays, future: d.futureDated || 0,
          flag: (d.datePct == null || d.datePct < 100) ? (r.role === 'event' ? 'DEFECT: <100% dated' : 'partial') : '' };
      });
      try { if (console.table) console.table(rows); else console.log(rows); } catch (e) {}
      return rows;
    };
    NiyBrain.coverage.print = function () {
      var c = NiyBrain.coverage(); if (!c) return;
      var rows = Object.keys(c).map(function (k) { var r = c[k]; return { dataset: k.replace('.csv', ''), role: r.role, rows: r.rows, events: r.events, touches: r.touches, paths: Object.keys(r.paths).map(function (p) { return p + ':' + r.paths[p]; }).join(' '), note: r.excludedReason || r.reason || r.diagnostic || '' }; });
      try { console.table(rows); } catch (e) { console.log(rows); }
      return rows;
    };

    // --- DEV-ONLY refresh simulator ------------------------------------------
    // Re-stamps a fraction of every event dataset's rows with RECENT dates and writes
    // them back THROUGH THE REAL WATCHER PATH — reassigning EMBEDDED_CSV_DATA[key] (a
    // property set, legal on a const object) fires the accessor trap; a brand-new key is
    // caught by the 5s sweep. This lets Step 0 and the freshness path be tested against
    // "fresh" data with no backend. Recency-weighted spread (most events recent). Gated
    // behind NiyBrain.flags.devSimulate; never reachable from the UI. Remove/keep-gated
    // before ship. Undated families (war_tracker/infra/defense) get a fresh `date` column.
    NiyBrain._simulateRefresh = function (opts) {
      opts = opts || {};
      if (!(NiyBrain.flags && NiyBrain.flags.devSimulate) && !opts.force) {
        try { console.warn('[NiyBrain] _simulateRefresh is DEV-ONLY — set NiyBrain.flags.devSimulate=true or pass {force:true}'); } catch (e) {}
        return null;
      }
      if (typeof EMBEDDED_CSV_DATA === 'undefined') return null;
      var D = EMBEDDED_CSV_DATA, P = NiyBrain.pipeline;
      var NOW = opts.now || Date.parse('2026-08-08');
      var spread = opts.spreadDays || 30;
      var frac = (opts.fraction != null) ? opts.fraction : 1;
      var rnd = opts.rand || Math.random;
      if (!NiyBrain._simMatcher || NiyBrain._simMatcherVer !== window.NIY_BRAIN_ONTOLOGY.version) {
        NiyBrain._simMatcher = P.buildMatcher(window.NIY_BRAIN_ONTOLOGY);
        NiyBrain._simMatcherVer = window.NIY_BRAIN_ONTOLOGY.version;
      }
      var keys = opts.datasets || Object.keys(D).filter(function (k) { return P.roleOf(k) === 'event'; });
      var manifest = {};
      keys.forEach(function (key) {
        var rows = D[key]; if (!Array.isArray(rows) || !rows.length) return;
        var cols = P.inferColumns(rows, NiyBrain._simMatcher.instColumnDict, null);
        var field = (cols && cols.dateField) || 'date';   // undated families get a fresh `date` column
        var stamped = 0, minAge = 1e9, maxAge = -1;
        var next = rows.map(function (r) {
          var rr = {}; for (var k in r) rr[k] = r[k];
          if (rnd() <= frac) {
            var age = spread * Math.pow(rnd(), 2);         // recency-weighted: most events recent
            rr[field] = new Date(NOW - age * 86400000).toISOString().slice(0, 10);
            stamped++; if (age < minAge) minAge = age; if (age > maxAge) maxAge = age;
          }
          return rr;
        });
        D[key] = next;                                     // reassign → real accessor trap fires
        manifest[key] = { rows: rows.length, stamped: stamped, dateField: field, ageMinDays: Math.round(minAge), ageMaxDays: Math.round(maxAge) };
      });
      return manifest;
    };

    // --- DEV-ONLY fps probe --------------------------------------------------
    // Samples requestAnimationFrame deltas over `seconds` and returns p50 / p95 / worst
    // frame + fps, so the number is repeatable rather than a one-off console snippet. To
    // measure interaction cost, drag/zoom the graph continuously while it runs. Headless
    // preview throttles rAF, so a real number needs a REAL visible browser window — treat
    // any result from a background/headless tab as invalid. Gated behind NiyBrain.flags.devFps.
    NiyBrain._fps = function (seconds, opts) {
      opts = opts || {};
      if (!(NiyBrain.flags && NiyBrain.flags.devFps) && !opts.force) {
        try { console.warn('[NiyBrain] _fps is DEV-ONLY — set NiyBrain.flags.devFps=true or pass {force:true}'); } catch (e) {}
        return null;
      }
      seconds = seconds || 5;
      return new Promise(function (resolve) {
        var deltas = [], last = null, start = null;
        function tick(ts) {
          if (start == null) { start = ts; last = ts; requestAnimationFrame(tick); return; }
          deltas.push(ts - last); last = ts;
          if (ts - start < seconds * 1000) requestAnimationFrame(tick);
          else {
            deltas.sort(function (a, b) { return a - b; });
            var n = deltas.length, q = function (p) { return n ? +deltas[Math.min(n - 1, Math.floor(p * n))].toFixed(2) : 0; };
            var worst = n ? +Math.max.apply(null, deltas).toFixed(2) : 0, fps = function (ms) { return ms > 0 ? +(1000 / ms).toFixed(1) : 0; };
            resolve({ seconds: seconds, frames: n, p50_ms: q(0.5), p95_ms: q(0.95), worst_ms: worst, fps_p50: fps(q(0.5)), fps_p95: fps(q(0.95)), fps_worst: fps(worst), visibility: document.visibilityState });
          }
        }
        requestAnimationFrame(tick);
      });
    };

    /* Extend selftest with Phase 2 acceptance checks (#5 build<4s, #7 every TOUCHES
       edge exposes path+evidence+components). */
    var prev = NiyBrain.selftest;
    NiyBrain.selftest = function () {
      var rows = prev ? prev.call(NiyBrain, true) : [];
      try {
        var t0 = (performance && performance.now) ? performance.now() : Date.now();
        var g = NiyBrain.graph.build();
        var dt = ((performance && performance.now) ? performance.now() : Date.now()) - t0;
        rows.push({ test: 'graph build < 4s', result: (g && dt < 4000) ? 'PASS' : 'FAIL', note: Math.round(dt) + 'ms · ' + (g ? g.stats.touches : 0) + ' TOUCHES' });
        var touches = g ? g.edges.filter(function (e) { return e.type === 'TOUCHES'; }) : [];
        var wellFormed = touches.length > 0 && touches.every(function (e) { return e.path && e.components && typeof e.structural === 'number' && typeof e.salience === 'number'; });
        rows.push({ test: 'every TOUCHES has path+components+score', result: wellFormed ? 'PASS' : 'FAIL', note: touches.length + ' edges' });
        var haveEvidence = touches.every(function (e) { return g.nodes[e.from] && g.nodes[e.from].type === 'event'; });
        rows.push({ test: 'every TOUCHES traces to an event (evidence)', result: haveEvidence ? 'PASS' : 'FAIL' });
      } catch (e) { rows.push({ test: 'graph selftest ran', result: 'FAIL', note: String(e && e.message || e) }); }
      try { if (console.table) console.table(rows); else console.log(rows); } catch (e) {}
      return rows;
    };

    try { console.log('%c[NiyBrain] Phase 2 pipeline + graph orchestrator ready', 'color:#6ab7ff'); } catch (e) {}
  } catch (e) { try { console.warn('[NiyBrain] graph orchestrator init failed:', e); } catch (_) {} }
})();

/* ---- Phase 4: narrative ---- */

/* THE BRAIN — Phase 4: narrative layer.
   A short, checkable explanation of the mechanism behind a TOUCHES connection.
   Generates lazily, ONLY for Strong/Moderate edges. Advice language is rejected by
   a post-processor; non-P1 narratives must open by disclaiming that the source does
   not name the company. Cached in IndexedDB by fingerprint. If /api/brain-note is
   absent, falls through to callAI and caches client-side only. Never fails the panel.

   ── /api/brain-note (backend, to be added; NOT present in the static file build) ──
   POST { fingerprint, pathType, path, evidence:[{dataset,date,title,snippet}],
          company, sector, institution }
   - hit  -> return { note }              (KV cache with TTL, not a database)
   - miss -> call LLM with SYSTEM_PROMPT, store note under fingerprint (TTL ~30d), return
   - stores NO user data; evidence snippets capped 200 chars, max 8 rows.
   Reference handler is provided alongside this build; see NiyBrain.narrative.SYSTEM_PROMPT. */
(function () {
  'use strict';
  try {
    var NiyBrain = window.NiyBrain = window.NiyBrain || {};
    if (NiyBrain.narrative) return;
    // Feature flags. narrative defaults OFF: the Phase-4 quality gate (50 generations,
    // hand-read for advice terms + hallucinations) cannot run without an LLM backend,
    // so the layer must not be reachable by a user until that gate is cleared and
    // TODO(legal) is reviewed. Flip NiyBrain.flags.narrative = true to enable.
    NiyBrain.flags = NiyBrain.flags || { narrative: false, devSimulate: false, devFps: false };
    if (NiyBrain.flags.devSimulate == null) NiyBrain.flags.devSimulate = false;
    if (NiyBrain.flags.devFps == null) NiyBrain.flags.devFps = false;

    // system prompt — VERBATIM from the spec (B3). Closed-world; do NOT append AI_POLICY.
    var SYSTEM_PROMPT = [
      'You explain why a governance or news event is structurally connected to an Indian listed company.',
      '',
      'You are given: an explicit connection path, its path type, and the evidence rows that produced it.',
      '',
      'If the path type is not "direct mention", your FIRST sentence must state plainly that the source',
      'does not name the company, and name the inference step that connects them. Never imply the document',
      'refers to the company when it does not.',
      '',
      'Write exactly three short paragraphs, no headings, no lists:',
      '1. The mechanism. How does this event reach this company\'s business? Name the specific channel —',
      '   input cost, regulated tariff, order book, licence, demand, competitive position.',
      '2. What to watch. What observable, publicly reportable thing would tell a reader this connection is',
      '   actually playing out?',
      '3. What would falsify it. What would show this connection does not matter here?',
      '',
      'Absolute rules:',
      '- Use ONLY facts present in the evidence rows and the connection path. Introduce nothing else.',
      '  If the evidence does not support a claim, say the evidence does not show it.',
      '- Do not search the web. Do not use outside knowledge about the company beyond its sector.',
      '- Never write buy, sell, hold, accumulate, avoid, overweight, underweight, or any synonym.',
      '- Never give a price target, an expected return, a percentage move, or a time horizon for a price.',
      '- Never predict the direction of a share price. Describe a mechanism, not an outcome.',
      '- Where the connection is weak or indirect, say so plainly in the first sentence.',
      '- Under 140 words total. Plain English. No hedging filler.'
    ].join('\n');

    var REMINDER = '\n\nYour previous attempt violated a rule (advice term, a % near the company name, or — for a non-direct path — you did not open by stating the source does not name the company). Rewrite, obeying every absolute rule.';

    // advice / prediction blocklist (B4)
    var BLOCK = ['buy', 'sell', 'hold', 'accumulate', 'avoid', 'overweight', 'underweight',
      'target price', 'price target', 'upside', 'downside', 'rally', 'crash', 'will rise',
      'will fall', 'expect the stock', 'should benefit', 'poised to'];

    function esc(s) { return String(s == null ? '' : s); }
    function firstSentence(t) { var m = String(t).trim().match(/^[\s\S]*?[.!?](\s|$)/); return m ? m[0].trim() : String(t).trim(); }
    // a disclaiming opener for non-P1 paths
    function hasDisclaimer(fs) {
      return /(does not name|doesn'?t name|not named|does not mention|doesn'?t mention|no mention of|not a mention|reaches (it|the company)|sector-level|indirect|not because the (order|bill|document|source) names)/i.test(fs);
    }
    // % within 40 chars of the company name
    function pctNearName(text, name) {
      if (!name) return false;
      var low = String(text).toLowerCase(), nm = String(name).toLowerCase();
      var re = /%/g, m;
      while ((m = re.exec(low))) {
        var s = Math.max(0, m.index - 40), e = Math.min(low.length, m.index + 40);
        if (low.slice(s, e).indexOf(nm) >= 0) return true;
      }
      return false;
    }
    function postProcess(text, companyName) {
      var low = ' ' + String(text).toLowerCase() + ' ';
      for (var i = 0; i < BLOCK.length; i++) {
        var term = BLOCK[i];
        // word-boundary for single words; substring for multiword phrases
        var hit = term.indexOf(' ') >= 0 ? low.indexOf(term) >= 0 : new RegExp('\\b' + term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b').test(low);
        if (hit) return { ok: false, reason: 'blocklist:' + term };
      }
      if (pctNearName(text, companyName)) return { ok: false, reason: 'pct-near-name' };
      return { ok: true };
    }

    function fingerprint(o) {
      var ev = (o.evidenceHashes || []).slice().sort().join(',');
      var s = (window.NIY_BRAIN_ONTOLOGY ? window.NIY_BRAIN_ONTOLOGY.version : '0') + '|' + o.pathType + '|' + o.eventId + '|' + (o.institutionId || '') + '|' + (o.sectorId || '') + '|' + (o.themeId || '') + '|' + o.companyId + '|' + ev;
      return NiyBrain.fnv1a(s);
    }

    // ---- IndexedDB cache -----------------------------------------------------
    var DB = null;
    function db() {
      if (DB) return DB;
      DB = new Promise(function (res) {
        try {
          var r = indexedDB.open('niy-brain-notes', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('notes'); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
      return DB;
    }
    function cacheGet(fp) {
      return db().then(function (d) { if (!d) return null; return new Promise(function (res) { try { var t = d.transaction('notes').objectStore('notes').get(fp); t.onsuccess = function () { res(t.result || null); }; t.onerror = function () { res(null); }; } catch (e) { res(null); } }); });
    }
    function cachePut(fp, val) {
      return db().then(function (d) { if (!d) return; try { d.transaction('notes', 'readwrite').objectStore('notes').put(val, fp); } catch (e) {} });
    }

    function buildMessages(ctx, remind) {
      var lines = ['Connection path type: ' + ctx.pathType, 'Path: ' + ctx.pathText, 'Company: ' + ctx.company + ' (sector: ' + ctx.sector + ')'];
      if (ctx.institution) lines.push('Institution: ' + ctx.institution);
      lines.push('', 'Evidence rows:');
      ctx.evidence.forEach(function (e, i) { lines.push((i + 1) + '. [' + e.dataset + ' · ' + (e.date || 'undated') + '] ' + e.title + (e.snippet ? (' — ' + e.snippet) : '')); });
      return [{ role: 'system', content: SYSTEM_PROMPT + (remind ? REMINDER : '') }, { role: 'user', content: lines.join('\n') }];
    }

    async function callBackendOrAI(payload, messages) {
      // Prefer the KV-cached backend; fall through to direct callAI; cache client-side either way.
      try {
        var r = await fetch('/api/brain-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) { var j = await r.json(); if (j && j.note) return j.note; }
      } catch (e) {}
      if (typeof callAI === 'function') return await callAI(messages, { noSearch: true, maxTokens: 400 });
      throw new Error('no-backend');
    }

    var rejects = [];
    NiyBrain.narrative = {
      SYSTEM_PROMPT: SYSTEM_PROMPT, BLOCK: BLOCK, postProcess: postProcess, fingerprint: fingerprint,
      firstSentence: firstSentence, hasDisclaimer: hasDisclaimer, pctNearName: pctNearName,
      rejects: function () { return rejects.slice(); },
      bust: function (ctx) { try { var fp = fingerprint(ctx); return db().then(function (d) { if (d) try { d.transaction('notes', 'readwrite').objectStore('notes').delete(fp); } catch (e) {} }); } catch (e) {} },
      // ctx: {pathType,pathText,company,companyId,sector,sectorId,institution,institutionId,themeId,eventId,evidence:[{dataset,date,title,snippet}],evidenceHashes,band}
      generate: async function (ctx) {
        try {
          if (ctx.band !== 'Strong' && ctx.band !== 'Moderate') return { status: 'not-explained' };
          var fp = fingerprint(ctx);
          var cached = await cacheGet(fp);
          if (cached) return { status: 'ok', text: cached, cached: true };
          var payload = { fingerprint: fp, pathType: ctx.pathType, path: ctx.pathText, evidence: ctx.evidence.map(function (e) { return { dataset: e.dataset, date: e.date, title: e.title, snippet: (e.snippet || '').slice(0, 200) }; }).slice(0, 8), company: ctx.company, sector: ctx.sector, institution: ctx.institution };
          var attempt = 0, text = '', pp = { ok: false };
          while (attempt < 2) {
            text = await callBackendOrAI(payload, buildMessages(ctx, attempt > 0));
            pp = postProcess(text, ctx.company);
            var discOk = ctx.pathType === 'P1' || hasDisclaimer(firstSentence(text));
            if (pp.ok && discOk) break;
            rejects.push({ fp: fp, reason: pp.ok ? 'no-disclaimer' : pp.reason, attempt: attempt });
            attempt++;
          }
          var discFinal = ctx.pathType === 'P1' || hasDisclaimer(firstSentence(text));
          if (!pp.ok || !discFinal) return { status: 'failed' };
          await cachePut(fp, text);
          return { status: 'ok', text: text };
        } catch (e) { return { status: 'error', error: String(e && e.message || e) }; }
      }
    };

    // Pre-warm the top ~200 Strong edges in the background, one at a time, only while
    // the Brain tab is visible. Uses setInterval (>=500ms) so block 004 gates it.
    var warmQueue = null, warming = false;
    NiyBrain.narrative.prewarm = function (buildCtx) {
      try {
        var G = NiyBrain.graph.get(); if (!G) return;
        warmQueue = G.edges.filter(function (e) { return e.type === 'TOUCHES' && e.band === 'Strong'; })
          .sort(function (a, b) { return (b.salience != null ? b.salience : b.score) - (a.salience != null ? a.salience : a.score); }).slice(0, 200);
        setInterval(function () {
          if (warming || !warmQueue || !warmQueue.length) return;
          var nb = document.getElementById('niyBrain'); if (!nb || !nb.classList.contains('show')) return;
          warming = true; var edge = warmQueue.shift();
          try { var ctx = buildCtx(edge); NiyBrain.narrative.generate(ctx).then(function () { warming = false; }, function () { warming = false; }); }
          catch (e) { warming = false; }
        }, 4000);
      } catch (e) {}
    };

    try { console.log('%c[NiyBrain] Phase 4 narrative layer ready', 'color:#6ab7ff'); } catch (e) {}
  } catch (e) { try { console.warn('[NiyBrain] narrative init failed', e); } catch (_) {} }
})();

/* ---- Phase 3: renderer / UI ---- */

/* THE BRAIN — Phase 3: renderer (tab, container, layout worker, Canvas 2D).
   Namespaced under NiyBrain. Node type is encoded by FORM (not colour); the only
   colour is --accent for selection/hover/overlay, and the three signal tokens are
   reserved for confidence bands. Fail-silent. */
(function () {
  'use strict';
  try {
    var NiyBrain = window.NiyBrain = window.NiyBrain || {};
    if (NiyBrain.ui) return;

    // ---- Barnes-Hut layout worker (source string; spawned via Blob) ----------
    var WORKER_SRC = `
    'use strict';
    var N=0, ids=[], type=[], deg=[], px, py, vx, vy, adj=[], W=2600, H=2600, ticks=360;
    function seed(nodes, edges){
      N=nodes.length; ids=new Array(N); type=new Array(N); deg=new Float32Array(N);
      px=new Float32Array(N); py=new Float32Array(N); vx=new Float32Array(N); vy=new Float32Array(N);
      var idx={}; for(var i=0;i<N;i++){ ids[i]=nodes[i].id; type[i]=nodes[i].type; deg[i]=nodes[i].degree||1; idx[nodes[i].id]=i; }
      adj=[]; for(i=0;i<N;i++) adj.push([]);
      var sectorAngle={}, sc=0, sectorN=0;
      for(i=0;i<N;i++) if(type[i]==='sector') sectorN++;
      // hubs on a large ring, sectors outermost so companies fan around them
      var hubRing={sector:1.0, institution:0.66, theme:0.72, commodity:0.6, geography:0.55, dataset:0.5};
      var si=0;
      for(i=0;i<N;i++){
        if(type[i]==='sector'){ var a=(si++/Math.max(1,sectorN))*6.28318; sectorAngle[ids[i]]=a; px[i]=Math.cos(a)*W*0.42; py[i]=Math.sin(a)*H*0.42; }
      }
      var hubCount={}, hi={};
      for(i=0;i<N;i++){ var hr=hubRing[type[i]]; if(hr!=null && type[i]!=='sector'){ hi[type[i]]=(hi[type[i]]||0); } }
      // count hubs per type for ring placement
      var perType={}; for(i=0;i<N;i++){ if(hubRing[type[i]]!=null && type[i]!=='sector'){ perType[type[i]]=(perType[type[i]]||0)+1; } }
      var seen={};
      for(i=0;i<N;i++){
        var t=type[i];
        if(t==='sector') continue;
        if(hubRing[t]!=null){ seen[t]=(seen[t]||0); var a2=(seen[t]++/Math.max(1,perType[t]))*6.28318 + (t.charCodeAt(0)%7); var r2=W*0.42*hubRing[t]; px[i]=Math.cos(a2)*r2; py[i]=Math.sin(a2)*r2; }
        else { px[i]=(Math.cos(i*2.399)* (0.05+ (i%50)/50) )*W*0.3; py[i]=(Math.sin(i*2.399)*(0.05+(i%50)/50))*H*0.3; }
      }
      // build adjacency from hub edges (each carries a spring weight + rest length);
      // seed companies near their SECTOR hub specifically so lobes can form.
      for(var e=0;e<edges.length;e++){ var a=idx[edges[e].from], b=idx[edges[e].to]; if(a==null||b==null) continue; var w=edges[e].w||1, rl=edges[e].rest||120; adj[a].push([b,w,rl]); adj[b].push([a,w,rl]); }
      for(i=0;i<N;i++){
        if(type[i]==='company'||type[i]==='event'){
          var nb=adj[i], anchor=-1, want=(type[i]==='company')?'sector':'institution';
          for(var k=0;k<nb.length;k++){ if(type[nb[k][0]]===want){ anchor=nb[k][0]; break; } }
          if(anchor<0) for(k=0;k<nb.length;k++){ var tt=type[nb[k][0]]; if(tt==='sector'||tt==='institution'||tt==='theme'){ anchor=nb[k][0]; break; } }
          if(anchor>=0){ px[i]=px[anchor]+(Math.cos(i*1.7)* (type[i]==='company'?45:140)); py[i]=py[anchor]+(Math.sin(i*1.7)*(type[i]==='company'?45:140)); }
        }
      }
    }
    // Force sim: (a) ALL-PAIRS repulsion among the ~130 hub nodes gives long-range
    // separation so sectors/institutions spread into distinct lobes; (b) local
    // spatial-grid repulsion prevents leaf-node overlap; (c) hub-edge springs pull
    // companies to their sector and events to the institution/theme they hit, so
    // each hub becomes a lobe centre; (d) very weak centring; (e) collision.
    function layout(onProgress){
      var Kloc=1400, Khub=95000, spring=0.02, center=0.00022, damp=0.9, coll=16;
      var hubIdx=[]; for(var h=0;h<N;h++){ var tt=type[h]; if(tt==='sector'||tt==='institution'||tt==='theme'||tt==='commodity'||tt==='geography') hubIdx.push(h); }
      for(var it=0; it<ticks; it++){
        var alpha=Math.max(0.03, 1 - it/ticks);
        var minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
        for(var i=0;i<N;i++){ if(px[i]<minx)minx=px[i]; if(py[i]<miny)miny=py[i]; if(px[i]>maxx)maxx=px[i]; if(py[i]>maxy)maxy=py[i]; }
        var size=Math.max(maxx-minx,maxy-miny)+1;
        var cell=Math.max(55, size/48), grid={};
        for(i=0;i<N;i++){ var gx=Math.floor(px[i]/cell), gy=Math.floor(py[i]/cell), key=gx+','+gy; (grid[key]||(grid[key]=[])).push(i); }
        var fx=new Float32Array(N), fy=new Float32Array(N);
        // local grid repulsion (anti-overlap)
        for(i=0;i<N;i++){
          var gx2=Math.floor(px[i]/cell), gy2=Math.floor(py[i]/cell);
          for(var ox=-1;ox<=1;ox++) for(var oy=-1;oy<=1;oy++){
            var cellArr=grid[(gx2+ox)+','+(gy2+oy)]; if(!cellArr) continue;
            for(var j2=0;j2<cellArr.length;j2++){ var j=cellArr[j2]; if(j===i) continue;
              var dx=px[i]-px[j], dy=py[i]-py[j], d2=dx*dx+dy*dy+0.01, d=Math.sqrt(d2);
              var f=Kloc/d2; fx[i]+=dx/d*f; fy[i]+=dy/d*f;
              if(d<coll){ var push=(coll-d)*0.6; fx[i]+=dx/d*push; fy[i]+=dy/d*push; }
            }
          }
          fx[i]-=px[i]*center; fy[i]-=py[i]*center;
        }
        // long-range all-pairs repulsion among hubs -> separates the lobes
        for(var a=0;a<hubIdx.length;a++){ var ia=hubIdx[a];
          for(var b=a+1;b<hubIdx.length;b++){ var ib=hubIdx[b];
            var dx2=px[ia]-px[ib], dy2=py[ia]-py[ib], dd=dx2*dx2+dy2*dy2+1, dl=Math.sqrt(dd);
            var ff=Khub/dd; var ux2=dx2/dl*ff, uy2=dy2/dl*ff;
            fx[ia]+=ux2; fy[ia]+=uy2; fx[ib]-=ux2; fy[ib]-=uy2;
          }
        }
        // springs on hub edges — per-edge weight + rest length. IN_SECTOR is strong &
        // short (companies cling to their sector) while EXPOSED_TO is weak & long
        // (shared themes/commodities don't drag sectors together) -> genuine lobes.
        for(i=0;i<N;i++){ var nb=adj[i]; for(var k=0;k<nb.length;k++){ var j=nb[k][0]; if(j<i) continue; var w=nb[k][1], rest=nb[k][2];
          var dx=px[j]-px[i], dy=py[j]-py[i], d=Math.sqrt(dx*dx+dy*dy)+0.01;
          var f=spring*w*(d-rest); var ux=dx/d*f, uy=dy/d*f;
          fx[i]+=ux; fy[i]+=uy; fx[j]-=ux; fy[j]-=uy;
        }}
        for(i=0;i<N;i++){
          vx[i]=(vx[i]+fx[i])*damp; vy[i]=(vy[i]+fy[i])*damp;
          var sp=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]); var maxv=55; if(sp>maxv){ vx[i]*=maxv/sp; vy[i]*=maxv/sp; }
          px[i]+=vx[i]*alpha; py[i]+=vy[i]*alpha;
          if(!isFinite(px[i])){ px[i]=0; vx[i]=0; } if(!isFinite(py[i])){ py[i]=0; vy[i]=0; }
          if(px[i]>6e4)px[i]=6e4; else if(px[i]<-6e4)px[i]=-6e4; if(py[i]>6e4)py[i]=6e4; else if(py[i]<-6e4)py[i]=-6e4;
        }
        if(it%40===0 && onProgress) onProgress(it/ticks);
      }
    }
    onmessage=function(ev){
      var d=ev.data;
      if(d.cmd==='layout'){
        ticks=d.ticks||360; W=d.w||2600; H=d.h||2600;
        seed(d.nodes, d.edges);
        layout(function(p){ postMessage({type:'progress', p:p}); });
        var out=new Float32Array(N*2); for(var i=0;i<N;i++){ out[i*2]=px[i]; out[i*2+1]=py[i]; }
        postMessage({type:'done', ids:ids, pos:out.buffer}, [out.buffer]);
      } else if(d.cmd==='nudge'){
        // Keep prior positions; new nodes seed near a positioned neighbour; short settle.
        ticks=d.ticks||70; W=d.w||2600; H=d.h||2600;
        seed(d.nodes, d.edges);
        var prev=d.positions||{};
        for(var i=0;i<N;i++){ var pp=prev[ids[i]]; if(pp){ px[i]=pp[0]; py[i]=pp[1]; vx[i]=0; vy[i]=0; } }
        for(i=0;i<N;i++){ if(!prev[ids[i]]){ var nb=adj[i]; for(var k=0;k<nb.length;k++){ var q=prev[ids[nb[k][0]]]; if(q){ px[i]=q[0]+Math.cos(i*1.7)*55; py[i]=q[1]+Math.sin(i*1.7)*55; break; } } } }
        layout(function(p){ postMessage({type:'progress', p:p}); });
        var o2=new Float32Array(N*2); for(i=0;i<N;i++){ o2[i*2]=px[i]; o2[i*2+1]=py[i]; }
        postMessage({type:'done', ids:ids, pos:o2.buffer, nudge:true}, [o2.buffer]);
      }
    };
    `;

    NiyBrain.ui = { inited: false };

    // exposed to renderAll() in block 073
    window.initNiyBrain = function () {
      try { NiyBrain.ui.open(); } catch (e) { try { console.warn('[NiyBrain] open failed', e); } catch (_) {} }
    };

    // Build CSS + DOM lazily on first open.
    var el = {};   // dom refs
    var G = null;  // graph
    var pos = {};  // id -> {x,y}
    var view = { z: 1, cx: 0, cy: 0 };
    var worker = null, rafId = null, laidOut = false;
    var hoverNode = null, selNode = null, dragging = false, dragMoved = false, dragSt = null;
    var showDirect = false, onlyPaths = false, focusSet = null, selInfo = null;
    // Phase 5 freshness state
    var dirty = {}, refreshTimer = null, refreshedThisSession = 0, datasetSeenAt = {}, freshWired = false, pendingRefresh = false;
    var highlightTouches = null;   // new-connection overlay for "show me"

    var NODE_FORM = {
      event: 'dot', company: 'ring', sector: 'ocircle', institution: 'square',
      theme: 'diamond', commodity: 'triangle', geography: 'osquare', dataset: 'odot'
    };

    function css() {
      if (document.getElementById('niy-brain-css')) return;
      var s = document.createElement('style'); s.id = 'niy-brain-css';
      s.textContent = [
        '#niyBrain{position:fixed;inset:0;z-index:40;background:var(--panel,#121714);display:none;flex-direction:column;font-family:var(--font-display,system-ui)}',
        '#niyBrain.show{display:flex}',
        '#niyBrain .nb-top{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--ds-hair,rgba(255,255,255,.1));flex-wrap:wrap}',
        '#niyBrain .nb-title{font-weight:700;letter-spacing:.02em;font-size:14px;color:var(--fg,#eaeaea)}',
        '#niyBrain .nb-sub{font-size:11px;color:var(--fg-faint,#9aa1a8)}',
        '#niyBrain .nb-body{flex:1;display:flex;min-height:0}',
        '#niyBrain .nb-canvaswrap{flex:1;position:relative;min-width:0}',
        '#niyBrain canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}',
        '#niyBrain canvas.grabbing{cursor:grabbing}',
        '#niyBrain .nb-hud{position:absolute;left:12px;bottom:12px;display:flex;gap:6px;align-items:center;background:var(--ds-surface,rgba(13,14,16,.94));border:1px solid var(--ds-hair,rgba(255,255,255,.1));border-radius:var(--ds-r-s,6px);padding:4px 6px;font-family:var(--font-mono,monospace);font-size:11px;color:var(--fg-dim,#8f8f8f)}',
        '#niyBrain .nb-hud button{background:transparent;border:1px solid var(--ds-hair,rgba(255,255,255,.1));color:var(--fg,#eaeaea);width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:13px;line-height:1}',
        '#niyBrain .nb-hud button:hover{background:var(--ds-wash,rgba(255,255,255,.045))}',
        '#niyBrain .nb-legend{position:absolute;right:12px;top:12px;background:var(--ds-surface,rgba(13,14,16,.94));border:1px solid var(--ds-hair,rgba(255,255,255,.1));border-radius:var(--ds-r-s,6px);padding:8px 10px;font-size:11px;color:var(--fg-dim,#8f8f8f);max-width:180px}',
        '#niyBrain .nb-legend .lg{display:flex;align-items:center;gap:7px;padding:2px 0;cursor:pointer;user-select:none}',
        '#niyBrain .nb-legend .lg.off{opacity:.35}',
        '#niyBrain .nb-legend svg{width:16px;height:16px;flex:none}',
        '#niyBrain .nb-tip{position:absolute;pointer-events:none;background:var(--ds-surface,rgba(13,14,16,.96));border:1px solid var(--ds-hair-2,rgba(255,255,255,.18));border-radius:6px;padding:5px 8px;font-size:11px;color:var(--fg,#eaeaea);box-shadow:var(--ds-shadow-1);display:none;z-index:5;max-width:260px}',
        '#niyBrain .nb-tip .t-type{color:var(--fg-faint,#9aa1a8);font-family:var(--font-mono,monospace);font-size:10px;text-transform:uppercase;letter-spacing:.04em}',
        '#niyBrain .nb-disclaimer{font-size:10px;color:var(--fg-faint,#9aa1a8);margin-left:auto;max-width:420px;text-align:right;line-height:1.3}',
        '#niyBrain .nb-progress{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:var(--fg-dim,#8f8f8f);font-size:12px;font-family:var(--font-mono,monospace)}',
        '#niyBrain .nb-progress .bar{width:180px;height:3px;background:var(--ds-hair,rgba(255,255,255,.1));border-radius:2px;overflow:hidden}',
        '#niyBrain .nb-progress .bar i{display:block;height:100%;background:var(--accent,#E0552A);width:0}',
        // filters row
        '#niyBrain .nb-filters{display:flex;align-items:center;gap:14px;padding:6px 14px;border-bottom:1px solid var(--ds-hair,rgba(255,255,255,.1));font-size:11px;color:var(--fg-dim,#8f8f8f);flex-wrap:wrap}',
        '#niyBrain .nb-filters label{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none}',
        '#niyBrain .nb-filters input[type=range]{width:120px;accent-color:var(--accent,#E0552A)}',
        '#niyBrain .nb-filters input[type=text]{background:var(--ds-wash,rgba(255,255,255,.05));border:1px solid var(--ds-hair,rgba(255,255,255,.1));border-radius:5px;color:var(--fg,#eaeaea);padding:3px 8px;font-size:11px;width:150px;font-family:var(--font-display)}',
        '#niyBrain .nb-filters .seg{display:flex;border:1px solid var(--ds-hair,rgba(255,255,255,.1));border-radius:5px;overflow:hidden}',
        '#niyBrain .nb-filters .seg button{background:transparent;border:0;color:var(--fg-dim,#8f8f8f);padding:3px 9px;cursor:pointer;font-size:11px;font-family:var(--font-display)}',
        '#niyBrain .nb-filters .seg button.on{background:var(--accent,#E0552A);color:#fff}',
        '#niyBrain .nb-rebuild{background:transparent;border:1px solid var(--ds-hair,rgba(255,255,255,.1));color:var(--fg-dim,#8f8f8f);border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;font-family:var(--font-display)}',
        '#niyBrain .nb-rebuild:hover{background:var(--ds-wash,rgba(255,255,255,.05))}',
        '#niyBrain .nb-fresh{margin-left:auto;font-family:var(--font-mono,monospace);font-size:10px;color:var(--fg-faint,#9aa1a8);display:flex;gap:10px;align-items:center}',
        '#niyBrain .nb-fresh b{color:var(--fg-dim,#8f8f8f);font-weight:600}',
        '#niyBrain .nb-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%) translateY(20px);opacity:0;transition:all var(--ds-dur-2,240ms) var(--ds-ease);background:var(--ds-surface,rgba(13,14,16,.96));border:1px solid var(--ds-hair-2,rgba(255,255,255,.18));border-radius:8px;padding:9px 14px;font-size:12px;color:var(--fg,#eaeaea);box-shadow:var(--ds-shadow-2);display:flex;gap:12px;align-items:center;pointer-events:none;z-index:6}',
        '#niyBrain .nb-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}',
        '#niyBrain .nb-toast button{background:transparent;border:1px solid var(--accent,#E0552A);color:var(--accent,#E0552A);border-radius:5px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:var(--font-display)}',
        // side panel
        '#niyBrain .nb-panel{width:0;overflow:hidden;transition:width var(--ds-dur-2,240ms) var(--ds-ease);border-left:1px solid var(--ds-hair,rgba(255,255,255,.1));background:var(--ds-surface,rgba(13,14,16,.96))}',
        '#niyBrain .nb-panel.open{width:380px}',
        '#niyBrain .nb-panel-in{width:380px;height:100%;overflow-y:auto;padding:14px 16px}',
        '#niyBrain .nb-p-name{font-size:16px;font-weight:700;color:var(--fg,#eaeaea);line-height:1.25}',
        '#niyBrain .nb-p-type{font-family:var(--font-mono,monospace);font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint,#9aa1a8);margin-top:2px}',
        '#niyBrain .nb-sec{margin-top:16px}',
        '#niyBrain .nb-sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-faint,#9aa1a8);margin:0 0 8px;font-weight:700}',
        '#niyBrain .nb-sec.named h4{color:var(--fg,#eaeaea);border-top:2px solid var(--accent,#E0552A);padding-top:8px}',
        '#niyBrain .nb-row{padding:7px 0;border-bottom:1px solid var(--ds-hair,rgba(255,255,255,.07));font-size:12px;color:var(--fg,#eaeaea)}',
        '#niyBrain .nb-row .chain{color:var(--fg-dim,#8f8f8f);font-size:11px;margin-top:3px;line-height:1.4}',
        '#niyBrain .nb-band{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:3px;vertical-align:middle;margin-left:6px}',
        '#niyBrain .nb-rank{display:inline-block;font-size:9px;font-weight:600;color:var(--fg-dim,#8f8f8f);vertical-align:middle;margin-left:5px;font-variant-numeric:tabular-nums;letter-spacing:.02em;cursor:help}',
        '#niyBrain .nb-rank .nb-rank-tot{opacity:.55}',
        '#niyBrain .nb-band.Strong{background:rgba(76,154,90,.16);color:var(--signal-green,#4c9a5a);border:1px solid var(--signal-green,#4c9a5a)}',
        '#niyBrain .nb-band.Moderate{background:rgba(201,154,63,.16);color:var(--signal-amber,#c99a3f);border:1px solid var(--signal-amber,#c99a3f)}',
        '#niyBrain .nb-band.Weak{background:rgba(184,86,79,.14);color:var(--signal-red,#b8564f);border:1px solid var(--signal-red,#b8564f)}',
        '#niyBrain .nb-band.Speculative{background:var(--ds-wash);color:var(--fg-faint,#9aa1a8);border:1px solid var(--ds-hair-2,rgba(255,255,255,.18))}',
        '#niyBrain .nb-ev{padding:7px 9px;margin:6px 0;background:var(--ds-wash,rgba(255,255,255,.05));border:1px solid var(--ds-hair,rgba(255,255,255,.1));border-radius:6px;cursor:pointer;font-size:12px;color:var(--fg,#eaeaea)}',
        '#niyBrain .nb-ev:hover{border-color:var(--accent-line,var(--ds-accent-line))}',
        '#niyBrain .nb-ev .meta{font-family:var(--font-mono,monospace);font-size:10px;color:var(--fg-faint,#9aa1a8);margin-top:3px}',
        '#niyBrain .nb-machine{font-size:11px;color:var(--fg-faint,#9aa1a8);font-style:italic;padding:8px;border:1px dashed var(--ds-hair-2,rgba(255,255,255,.18));border-radius:6px}',
        '#niyBrain .nb-machine-tag{font-style:normal;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint,#9aa1a8);border:1px solid var(--ds-hair-2,rgba(255,255,255,.18));border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:middle}',
        '#niyBrain .nb-why p{font-size:12px;line-height:1.5;color:var(--fg,#eaeaea);margin:0 0 8px}',
        '#niyBrain .nb-why-ctrls{display:flex;gap:8px;margin-top:6px}',
        '#niyBrain .nb-why-ctrls button{background:transparent;border:1px solid var(--ds-hair,rgba(255,255,255,.1));color:var(--fg-dim,#8f8f8f);border-radius:5px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:var(--font-display)}',
        '#niyBrain .nb-why-ctrls button:hover{background:var(--ds-wash,rgba(255,255,255,.05))}',
        '#niyBrain .nb-ask{margin-top:10px;width:100%;background:var(--accent,#E0552A);color:#fff;border:0;border-radius:6px;padding:8px;font-size:12px;cursor:pointer;font-family:var(--font-display)}',
        '#niyBrain .nb-p-close{float:right;background:transparent;border:0;color:var(--fg-faint,#9aa1a8);font-size:18px;cursor:pointer;line-height:1}',
        '#niyBrain .nb-spark{margin-top:8px}',
        '#niyBrain .nb-noprice{font-size:11px;color:var(--fg-faint,#9aa1a8);margin-top:8px;font-style:italic}',
        '#niyBrain .nb-tickers{font-family:var(--font-mono,monospace);font-size:11px;color:var(--fg-dim,#8f8f8f);margin-top:4px}',
        // table overlay
        '#niyBrain .nb-table-wrap{position:absolute;inset:0;background:var(--panel,#121714);overflow:auto;display:none;padding:0}',
        '#niyBrain .nb-table-wrap.show{display:block}',
        '#niyBrain table.nb-table{width:100%;border-collapse:collapse;font-size:12px}',
        '#niyBrain table.nb-table th{position:sticky;top:0;background:var(--ds-surface,rgba(13,14,16,.96));text-align:left;padding:8px 10px;color:var(--fg-faint,#9aa1a8);font-size:10px;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;border-bottom:1px solid var(--ds-hair,rgba(255,255,255,.1))}',
        '#niyBrain table.nb-table td{padding:6px 10px;border-bottom:1px solid var(--ds-hair,rgba(255,255,255,.06));color:var(--fg,#eaeaea)}',
        '#niyBrain table.nb-table td.num{font-family:var(--font-mono,monospace);text-align:right;color:var(--fg-dim,#8f8f8f)}'
      ].join('\n');
      document.head.appendChild(s);
    }

    function formSvg(type, size, stroke) {
      size = size || 14; var c = size / 2, r = size * 0.34;
      var ink = 'var(--fg,#eaeaea)';
      function w(inner) { return '<svg viewBox="0 0 ' + size + ' ' + size + '">' + inner + '</svg>'; }
      switch (NODE_FORM[type]) {
        case 'dot': return w('<circle cx="' + c + '" cy="' + c + '" r="' + (r * 0.7) + '" fill="' + ink + '"/>');
        case 'ring': return w('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + ink + '"/><circle cx="' + c + '" cy="' + c + '" r="' + (r + 1.4) + '" fill="none" stroke="var(--fg-faint,#9aa1a8)" stroke-width="1"/>');
        case 'ocircle': return w('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + ink + '" stroke-width="2"/>');
        case 'square': return w('<rect x="' + (c - r) + '" y="' + (c - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" fill="' + ink + '"/>');
        case 'diamond': return w('<rect x="' + (c - r) + '" y="' + (c - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" fill="' + ink + '" transform="rotate(45 ' + c + ' ' + c + ')"/>');
        case 'triangle': return w('<path d="M' + c + ' ' + (c - r) + ' L' + (c + r) + ' ' + (c + r) + ' L' + (c - r) + ' ' + (c + r) + ' Z" fill="' + ink + '"/>');
        case 'osquare': return w('<rect x="' + (c - r) + '" y="' + (c - r) + '" width="' + (r * 2) + '" height="' + (r * 2) + '" fill="none" stroke="' + ink + '" stroke-width="2"/>');
        case 'odot': return w('<circle cx="' + c + '" cy="' + c + '" r="' + (r * 0.7) + '" fill="none" stroke="var(--fg-faint,#9aa1a8)" stroke-width="1.2"/>');
      }
      return '';
    }

    // Date window: default last 90 days of dated events (FIX 3). Undated events
    // (structural, no timestamp) always show. 0 = all time.
    var NOW = Date.parse('2026-08-08');
    var windowDays = 90;
    function eventInWindow(n) {
      if (n.type !== 'event') return true;
      if (windowDays === 0) return true;
      if (n.t == null) return true;                 // undated structural events always show
      return (NOW - n.t) <= windowDays * 86400000;
    }
    var hiddenByWindow = 0;

    var TYPE_ORDER = ['event', 'company', 'sector', 'institution', 'theme', 'commodity', 'geography'];
    var TYPE_LABEL = { event: 'Events', company: 'Companies', sector: 'Sectors', institution: 'Institutions', theme: 'Themes', commodity: 'Commodities', geography: 'Geographies', dataset: 'Datasets' };
    var typeOn = { event: 1, company: 1, sector: 1, institution: 1, theme: 1, commodity: 1, geography: 1, dataset: 0 };

    function buildDom() {
      css();
      var nb = document.getElementById('niyBrain');
      if (!nb) { nb = document.createElement('div'); nb.id = 'niyBrain'; document.body.appendChild(nb); }
      nb.innerHTML =
        '<div class="nb-top">' +
          '<span class="nb-title">The Brain</span>' +
          '<span class="nb-sub" id="nbSub">building…</span>' +
          '<span class="nb-disclaimer">Surfaces publicly-reported connections for research — not investment advice. Every link shows its evidence; verify at source.</span>' +
        '</div>' +
        '<div class="nb-filters">' +
          '<input type="text" id="nbSearch" placeholder="Search  ( / )" autocomplete="off">' +
          '<label>Window <input type="range" id="nbWindow" min="0" max="365" step="15" value="90"><span id="nbWindowLbl">90d</span></label>' +
          '<label title="Draw the 16,981 scored TOUCHES edges over the hub graph (dense)"><input type="checkbox" id="nbDirect"> Show direct connections</label>' +
          '<label title="Collapse to event → hub → sector → company chains for the selection"><input type="checkbox" id="nbPaths"> Only paths to market</label>' +
          '<span class="seg"><button id="nbViewGraph" class="on">Graph</button><button id="nbViewTable">Table</button></span>' +
          '<button id="nbRebuild" class="nb-rebuild" title="Full rebuild from current data">↻ Rebuild</button>' +
          '<span class="nb-fresh" id="nbFresh"></span>' +
        '</div>' +
        '<div class="nb-body">' +
          '<div class="nb-canvaswrap">' +
            '<canvas id="nbCanvas"></canvas>' +
            '<div class="nb-hud"><button data-z="out">−</button><button data-z="in">+</button><button data-z="reset">⌂</button><span id="nbZoom">100%</span></div>' +
            '<div class="nb-legend" id="nbLegend"></div>' +
            '<div class="nb-tip" id="nbTip"></div>' +
            '<div class="nb-table-wrap" id="nbTableWrap"></div>' +
            '<div class="nb-toast" id="nbToast"></div>' +
            '<div class="nb-progress" id="nbProg"><div>laying out the graph…</div><div class="bar"><i id="nbProgBar"></i></div></div>' +
          '</div>' +
          '<div class="nb-panel" id="nbPanel"><div class="nb-panel-in" id="nbPanelIn"></div></div>' +
        '</div>';
      el.nb = nb; el.canvas = nb.querySelector('#nbCanvas'); el.tip = nb.querySelector('#nbTip');
      el.sub = nb.querySelector('#nbSub'); el.zoom = nb.querySelector('#nbZoom');
      el.legend = nb.querySelector('#nbLegend'); el.prog = nb.querySelector('#nbProg'); el.progBar = nb.querySelector('#nbProgBar');
      el.panel = nb.querySelector('#nbPanel'); el.panelIn = nb.querySelector('#nbPanelIn');
      el.tableWrap = nb.querySelector('#nbTableWrap');
      el.ctx = el.canvas.getContext('2d');
      buildLegend();
      wireCanvas();
      wireDouble();
      wireFilters();
    }

    function buildLegend() {
      el.legend.innerHTML = TYPE_ORDER.map(function (t) {
        return '<div class="lg' + (typeOn[t] ? '' : ' off') + '" data-t="' + t + '">' + formSvg(t, 16) + '<span>' + TYPE_LABEL[t] + '</span></div>';
      }).join('');
      el.legend.querySelectorAll('.lg').forEach(function (r) {
        r.addEventListener('click', function () { var t = r.dataset.t; typeOn[t] = typeOn[t] ? 0 : 1; r.classList.toggle('off', !typeOn[t]); });
      });
    }

    // ---- tab injection -------------------------------------------------------
    function injectTab() {
      try {
        var tabs = document.querySelector('.tabs[role="tablist"]') || document.querySelector('.tabs');
        if (!tabs || tabs.querySelector('[data-tier="brain"]')) return;
        var studioTab = tabs.querySelector('[data-tier="datastudio"]');
        var b = document.createElement('button');
        b.className = 'tab'; b.setAttribute('data-tier', 'brain'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
        b.textContent = 'Brain';
        if (studioTab && studioTab.nextSibling) tabs.insertBefore(b, studioTab.nextSibling); else tabs.appendChild(b);
        b.addEventListener('click', function () {
          try { window.activeTier = 'brain'; } catch (e) {}
          try { activeTier = 'brain'; } catch (e) {}
          try { activeIndex = 0; } catch (e) {}
          if (typeof renderAll === 'function') renderAll();
        });
      } catch (e) {}
    }

    // ---- open / layout / render ---------------------------------------------
    NiyBrain.ui.open = function () {
      if (!el.nb) buildDom();
      document.getElementById('niyBrain').classList.add('show');
      if (!NiyBrain.ui.inited) {
        NiyBrain.ui.inited = true;
        startBuild();
        wireFreshness();
        try { if (NiyBrain.narrative && NiyBrain.narrative.prewarm) NiyBrain.narrative.prewarm(function (e) { return buildNarrativeCtx(e, true); }); } catch (x) {}
      } else { updateFreshness(); }
      resize(); startLoop();
    };

    function startBuild() {
      G = NiyBrain.graph.ensure();
      if (!G) { el.sub.textContent = 'graph unavailable'; return; }
      el.sub.textContent = G.stats.nodeByType ? (Object.keys(G.nodes).length + ' nodes · laying out…') : 'laying out…';
      // prepare layout payload (hub edges only)
      var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 };
      // Only lay out nodes in the current window (events filtered by date); hubs and
      // companies always in. Recount hidden events for the freshness/window readout.
      hiddenByWindow = 0;
      var inLayout = {};
      Object.keys(G.nodes).forEach(function (id) { var n = G.nodes[id]; if (n.type === 'dataset') return; if (eventInWindow(n)) inLayout[id] = 1; else hiddenByWindow++; });
      var nodes = Object.keys(inLayout).map(function (id) { var n = G.nodes[id]; return { id: id, type: n.type, degree: n.degree }; });
      var edges = layoutEdges(inLayout);
      try {
        var blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = function (ev) {
          var d = ev.data;
          if (d.type === 'progress') { if (el.progBar) el.progBar.style.width = Math.round(d.p * 100) + '%'; }
          else if (d.type === 'done') {
            var arr = new Float32Array(d.pos);
            for (var i = 0; i < d.ids.length; i++) pos[d.ids[i]] = { x: arr[i * 2], y: arr[i * 2 + 1] };
            if (window.__brainShape) window.__brainShape(pos, G);   // NEURAL SKIN: warp blob → brain silhouette
            laidOut = true; if (el.prog) el.prog.style.display = 'none';
            el.sub.textContent = d.ids.length + ' shown · ' + hiddenByWindow + ' events outside ' + windowDays + 'd window · avg degree ' + avgDegree().toFixed(1);
            if (!d.nudge) { resize(); fitView(); }
            updateFreshness(); saveState();
          }
        };
        // Reopening is instant: if a saved layout for this ontology version covers the
        // current nodes, apply it and skip the full 360-tick pass. Else lay out fresh.
        restoreState().then(function (st) {
          var ok = st && st.ontVer === (window.NIY_BRAIN_ONTOLOGY || {}).version && st.pos;
          var savedIds = ok ? Object.keys(st.pos) : [];
          var covered = ok && nodes.filter(function (n) { return st.pos[n.id]; }).length >= nodes.length * 0.9;
          // Reject a stale saved layout whose node set differs too much, or that has
          // collapsed to a point (a degenerate save from mid-session churn).
          var countOk = ok && Math.abs(savedIds.length - nodes.length) <= nodes.length * 0.12;
          var span = 0;
          if (ok && savedIds.length) { var mnx = 1e18, mxx = -1e18, mny = 1e18, mxy = -1e18; savedIds.forEach(function (id) { var p = st.pos[id]; if (p.x < mnx) mnx = p.x; if (p.x > mxx) mxx = p.x; if (p.y < mny) mny = p.y; if (p.y > mxy) mxy = p.y; }); span = Math.max(mxx - mnx, mxy - mny); }
          if (covered && countOk && span > 300) {
            pos = st.pos; if (st.view) view = st.view; if (st.typeOn) { for (var k in st.typeOn) typeOn[k] = st.typeOn[k]; }
            if (window.__brainShape) window.__brainShape(pos, G);   // NEURAL SKIN: warp restored layout → brain silhouette
            laidOut = true; if (el.prog) el.prog.style.display = 'none';
            el.sub.textContent = Object.keys(pos).length + ' shown · restored · avg degree ' + avgDegree().toFixed(1);
            resize(); buildLegend(); updateFreshness();
          } else {
            worker.postMessage({ cmd: 'layout', nodes: nodes, edges: edges, ticks: 360, w: 2600, h: 2600 });
          }
        });
      } catch (e) { console.warn('[NiyBrain] worker failed', e); }
    }

    function avgDegree() { var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 }; var h = G.edges.filter(function (e) { return HUB[e.type]; }).length; return 2 * h / Object.keys(G.nodes).length; }

    function resize() {
      if (!el.canvas) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = el.canvas.clientWidth, h = el.canvas.clientHeight;
      // Some headless/detached contexts report 0 for a laid-out element; fall back to
      // the wrap's box, then the window, then a sane default, so we never draw into nothing.
      if (!w || !h) { var wrap = el.canvas.parentElement; if (wrap) { var r = wrap.getBoundingClientRect(); w = r.width; h = r.height; } }
      if (!w || !h) { w = window.innerWidth || 0; h = (window.innerHeight || 0) - 96; }
      if (!w || !h) { w = 1280; h = 677; }
      el.canvas.width = w * dpr; el.canvas.height = h * dpr; el.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      el._w = w; el._h = h;
    }

    function fitView() {
      var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, k = 0;
      for (var id in pos) { var p = pos[id]; if (!isFinite(p.x) || !isFinite(p.y)) continue; k++; if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x; if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y; }
      if (!k) return;
      view.cx = (minx + maxx) / 2; view.cy = (miny + maxy) / 2;
      var w = el._w || 800, h = el._h || 600;
      view.z = Math.max(0.05, Math.min(w / (maxx - minx + 160), h / (maxy - miny + 160), 1.2));
      updateZoom();
    }
    NiyBrain.ui.debug = function () { var s = []; var ks = Object.keys(pos).slice(0, 4); ks.forEach(function (id) { s.push([id, pos[id]]); }); return { view: JSON.parse(JSON.stringify(view)), n: Object.keys(pos).length, sample: s, w: el._w, h: el._h }; };
    // Verification aid: some headless/hidden tabs pause rAF+setTimeout so the loop
    // stalls; a real visible tab paints at 60fps. This lets a test pump one frame.
    NiyBrain.ui.redraw = function () { try { draw(); return true; } catch (e) { return String(e && e.stack || e); } };
    // Faithful, environment-independent picture of the CURRENT layout: draws the
    // worker positions onto a fresh untransformed canvas so headless dpr/viewport
    // quirks can't corrupt it. Returns a small JPEG data-URL (base64, no prefix).
    NiyBrain.ui.debugImage = function (W, H) {
      W = W || 900; H = H || 480;
      var oc = document.createElement('canvas'); oc.width = W; oc.height = H;
      var x = oc.getContext('2d'); x.fillStyle = '#0a0f1a'; x.fillRect(0, 0, W, H);
      var ids = Object.keys(pos), minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, k = 0;
      ids.forEach(function (id) { var n = G.nodes[id]; if (!n || !nodeVisible(n)) return; var p = pos[id]; if (!isFinite(p.x) || !isFinite(p.y)) return; k++; if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x; if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y; });
      if (!k) return null;
      var pad = 24, sx = (W - 2 * pad) / (maxx - minx || 1), sy = (H - 2 * pad) / (maxy - miny || 1), s = Math.min(sx, sy);
      function T(p) { return [pad + (p.x - minx) * s, pad + (p.y - miny) * s]; }
      var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 };
      x.strokeStyle = 'rgba(20,25,30,0.18)'; x.lineWidth = 0.5;
      G.edges.forEach(function (e) { if (!HUB[e.type]) return; var a = G.nodes[e.from], b = G.nodes[e.to]; if (!a || !b || !nodeVisible(a) || !nodeVisible(b)) return; var pa = pos[e.from], pb = pos[e.to]; if (!pa || !pb) return; var A = T(pa), B = T(pb); x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(B[0], B[1]); x.stroke(); });
      var col = { event: '#5a6570', company: '#1a1f26', sector: '#c0392b', institution: '#2c3e50', theme: '#8e44ad', commodity: '#16794b', geography: '#b7791f', dataset: '#999' };
      ids.forEach(function (id) { var n = G.nodes[id]; if (!n || !nodeVisible(n)) return; var p = pos[id]; if (!isFinite(p.x)) return; var P = T(p); var r = (n.type === 'event' ? 1.2 : 2) + Math.sqrt(n.degree || 1) * (n.type === 'sector' ? 1.1 : 0.6); x.fillStyle = col[n.type] || '#333'; x.beginPath(); x.arc(P[0], P[1], r, 0, 6.2832); x.fill(); });
      return oc.toDataURL('image/jpeg', 0.72).replace(/^data:image\/jpeg;base64,/, '');
    };

    function nodeVisible(n) { return typeOn[n.type] && eventInWindow(n); }
    function toScreen(x, y) { return [(x - view.cx) * view.z + el._w / 2, (y - view.cy) * view.z + el._h / 2]; }
    function toWorld(sx, sy) { return [(sx - el._w / 2) / view.z + view.cx, (sy - el._h / 2) / view.z + view.cy]; }

    // GALAXY: uniform size PER TYPE (every company the same, every event the same, …)
    function nodeRadius(n) { var Z = { event:2.4, company:4.4, sector:7.5, institution:6, theme:6, commodity:5.5, geography:6, dataset:4 }; return Z[n.type] || 4; }
    // spring [weight, restLength] per hub-edge type. IN_SECTOR dominates so companies
    // form tight per-sector lobes; EXPOSED_TO is weak+long so shared themes don't merge sectors.
    function edgeWeight(t) {
      if (t === 'IN_SECTOR') return [3.8, 42];
      if (t === 'EXPOSED_TO') return [0.3, 190];
      if (t === 'GOVERNS') return [0.5, 130];
      if (t === 'MENTIONS' || t === 'ON_THEME') return [1.0, 115];
      return [1.0, 120];
    }
    function layoutEdges(inLayout) { var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 }; return G.edges.filter(function (e) { return HUB[e.type] && inLayout[e.from] && inLayout[e.to]; }).map(function (e) { var wr = edgeWeight(e.type); return { from: e.from, to: e.to, w: wr[0], rest: wr[1] }; }); }

    function draw() {
      if (!el.ctx || !laidOut) return;
      if (!el._w || !el._h) { resize(); if (!el._w || !el._h) return; }
      var ctx = el.ctx, w = el._w, h = el._h;
      ctx.clearRect(0, 0, w, h);
      // NEURAL SKIN / GALAXY: deep space background (starfield + core glow via the skin block)
      if (window.__galaxyBg) { window.__galaxyBg(ctx, w, h, toScreen); }
      else { var _bg=ctx.createRadialGradient(w*0.5,h*0.46,40,w*0.5,h*0.5,Math.max(w,h)*0.85); _bg.addColorStop(0,'#0e1626'); _bg.addColorStop(0.55,'#0a0f1a'); _bg.addColorStop(1,'#05070d'); ctx.fillStyle=_bg; ctx.fillRect(0,0,w,h); }
      // §6.3: an empty graph (no data / everything below threshold) degrades to a STATED
      // absence, not a silent blank canvas.
      var _hasContent = false; for (var _k in G.nodes) { var _t = G.nodes[_k].type; if (_t === 'event' || _t === 'company') { _hasContent = true; break; } }
      if (!_hasContent) { ctx.fillStyle = cssVar('--fg-faint', '#9aa1a8'); ctx.font = '13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No connections in this view.', w / 2, h / 2); ctx.textAlign = 'left'; return; }
      // NEURAL SKIN: canvas palette (light or dark per window.__NB_LIGHT)
      var _lite = !!window.__NB_LIGHT;
      var accent = '#e2603a', ink = _lite ? '#1b2330' : '#e8edf6', dim = _lite ? '#5b6470' : '#8592a8', hair = _lite ? 'rgba(40,60,100,0.10)' : 'rgba(120,150,210,0.12)';
      var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 };
      function shown(n, id) { return nodeVisible(n) && (!focusSet || focusSet[id]); }
      function alphaOf(id) { return selInfo ? (selInfo.nb[id] ? 1 : 0.1) : 1; }
      // (1) optional global TOUCHES layer (muted) when "Show direct connections" is on
      if (showDirect && !onlyPaths) {
        ctx.lineWidth = 1;
        for (var di = 0; di < G.edges.length; di++) {
          var de = G.edges[di]; if (de.type !== 'TOUCHES') continue;
          var da = G.nodes[de.from], db = G.nodes[de.to]; if (!shown(da, de.from) || !shown(db, de.to)) continue;
          var dpa = pos[de.from], dpb = pos[de.to]; if (!dpa || !dpb) continue;
          var dsa = toScreen(dpa.x, dpa.y), dsb = toScreen(dpb.x, dpb.y);
          ctx.strokeStyle = accent; ctx.globalAlpha = 0.05; ctx.beginPath(); ctx.moveTo(dsa[0], dsa[1]); ctx.lineTo(dsb[0], dsb[1]); ctx.stroke();
        }
      }
      // (2) hub edges — curved "synapses"; highlighted + animated (flowing) on hover/selection
      var _now = (window.performance && performance.now ? performance.now() : 0);
      var _pal = window.__NB_PAL || {};
      ctx.lineCap = 'round';
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i]; if (!HUB[e.type]) continue;
        var a = G.nodes[e.from], b = G.nodes[e.to]; if (!a || !b) continue;
        if (!shown(a, e.from) || !shown(b, e.to)) continue;
        if (onlyPaths && selInfo && !(selInfo.nb[e.from] && selInfo.nb[e.to])) continue;
        var pa = pos[e.from], pb = pos[e.to]; if (!pa || !pb) continue;
        var sa = toScreen(pa.x, pa.y), sb = toScreen(pb.x, pb.y);
        if ((sa[0] < -50 && sb[0] < -50) || (sa[0] > w + 50 && sb[0] > w + 50)) continue;
        // curved control point (perpendicular bow) → organic, never straight
        var mx = (sa[0]+sb[0])/2, my = (sa[1]+sb[1])/2, dx = sb[0]-sa[0], dy = sb[1]-sa[1], len = Math.sqrt(dx*dx+dy*dy) || 1;
        var bow = Math.min(34, len*0.16), cxp = mx - dy/len*bow, cyp = my + dx/len*bow;
        var _hi = (hoverNode && (a === hoverNode || b === hoverNode)) || (selNode && (a === selNode || b === selNode));
        if (_hi) {
          var col = _pal[((a === hoverNode || a === selNode) ? b.type : a.type)] || accent;
          ctx.strokeStyle = col; ctx.globalAlpha = 0.95; ctx.lineWidth = 1.8;
          ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.setLineDash([5, 7]); ctx.lineDashOffset = -((_now * 0.06) % 12);   // flow
        } else {
          ctx.strokeStyle = hair; ctx.globalAlpha = 0.5 * Math.min(alphaOf(e.from), alphaOf(e.to)); ctx.lineWidth = 1;
          ctx.shadowBlur = 0; ctx.setLineDash([]);
        }
        ctx.beginPath(); ctx.moveTo(sa[0], sa[1]); ctx.quadraticCurveTo(cxp, cyp, sb[0], sb[1]); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      // (3) selection TOUCHES overlay — accent, banded, always over the dimmed graph
      if (selInfo && selInfo.touches.length) {
        ctx.lineWidth = 1.4;
        for (var ti = 0; ti < selInfo.touches.length; ti++) {
          var te = selInfo.touches[ti]; var tpa = pos[te.from], tpb = pos[te.to]; if (!tpa || !tpb) continue;
          var ta = G.nodes[te.from], tb = G.nodes[te.to]; if (!shown(ta, te.from) || !shown(tb, te.to)) continue;
          var tsa = toScreen(tpa.x, tpa.y), tsb = toScreen(tpb.x, tpb.y);
          ctx.strokeStyle = bandColor(te.band, accent); ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.moveTo(tsa[0], tsa[1]); ctx.lineTo(tsb[0], tsb[1]); ctx.stroke();
        }
      }
      // (3b) new-connection highlight ("show me" after a background refresh)
      if (highlightTouches && highlightTouches.length) {
        ctx.lineWidth = 1.8;
        for (var hh = 0; hh < highlightTouches.length; hh++) {
          var he = highlightTouches[hh], hpa = pos[he.from], hpb = pos[he.to]; if (!hpa || !hpb) continue;
          var ha = toScreen(hpa.x, hpa.y), hb = toScreen(hpb.x, hpb.y);
          ctx.strokeStyle = accent; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(ha[0], ha[1]); ctx.lineTo(hb[0], hb[1]); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // nodes
      var labelZoom = view.z > 0.55, topDeg = [];
      for (var id in G.nodes) {
        var n = G.nodes[id]; if (!shown(n, id)) continue;
        var p = pos[id]; if (!p) continue;
        var s = toScreen(p.x, p.y); if (s[0] < -20 || s[0] > w + 20 || s[1] < -20 || s[1] > h + 20) continue;
        var r = nodeRadius(n) * Math.max(0.6, Math.min(1.6, view.z));
        ctx.globalAlpha = alphaOf(id);
        drawForm(ctx, n.type, s[0], s[1], r, ink, dim, (n === selNode || n === hoverNode) ? accent : null);
        if (n.type !== 'event' && n.type !== 'company') topDeg.push([n, s, r]);
      }
      ctx.globalAlpha = 1;
      // labels (LOD: hubs always when zoomed a bit; events/companies only when zoomed in)
      ctx.font = '11px ' + cssVar('--font-display', 'sans-serif'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if (view.z > 0.4) {
        topDeg.sort(function (a, b) { return b[0].degree - a[0].degree; });
        var kmax = view.z > 0.9 ? topDeg.length : Math.min(40, topDeg.length);
        for (var t = 0; t < kmax; t++) { var nd = topDeg[t]; ctx.fillStyle = dim; ctx.fillText(clip(nd[0].label, 22), nd[1][0], nd[1][1] + nd[2] + 2); }
      }
      if (labelZoom && view.z > 0.9) {
        for (var id2 in G.nodes) { var n2 = G.nodes[id2]; if (n2.type !== 'company' && n2.type !== 'event') continue; if (!nodeVisible(n2)) continue; var p2 = pos[id2]; if (!p2) continue; var s2 = toScreen(p2.x, p2.y); if (s2[0] < 0 || s2[0] > w || s2[1] < 0 || s2[1] > h) continue; if (n2.degree < 3 && view.z < 1.4) continue; ctx.fillStyle = n2.type === 'company' ? ink : dim; ctx.fillText(clip(n2.label, 18), s2[0], s2[1] + 8); }
      }
    }

    function drawForm(ctx, type, x, y, r, ink, dim, hi) {
      ctx.save();
      // NEURAL SKIN: every node is a uniform "neuron" — COLOUR alone carries type (no shapes).
      // Palette shared with the legend via window.__NB_PAL; glow gives the living-brain feel.
      var PAL = window.__NB_PAL || {};
      var _lite = !!window.__NB_LIGHT;
      var base = hi ? (_lite ? '#1b2330' : '#ffffff') : (PAL[type] || ink);
      ctx.shadowColor = base; ctx.shadowBlur = _lite ? (hi ? 10 : 5) : (hi ? 16 : 9);
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      ctx.shadowBlur = 0;
      // inner highlight → depth
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.24, Math.max(0.8, r * 0.26), 0, 6.2832); ctx.fill();
      ctx.restore();
    }

    function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    function cssVar(name, fb) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; } }

    // Objective structure metric: is the layout lobed or a disc? For each company,
    // compare distance to its OWN sector hub vs the mean distance to ALL sector hubs.
    // clustering = 1 - (ownDist / meanDistToAllHubs). ~0 => disc (own hub no closer
    // than any other); high => tight lobes. Also reports hub spread.
    NiyBrain.ui.structureMetrics = function () {
      var hubs = [];
      Object.keys(pos).forEach(function (id) { var n = G.nodes[id]; if (n && n.type === 'sector' && nodeVisible(n)) hubs.push({ id: id.slice(7), x: pos[id].x, y: pos[id].y }); });
      if (hubs.length < 2) return { error: 'no hubs' };
      // hub spread: mean pairwise distance / graph radius
      var cx = 0, cy = 0; hubs.forEach(function (h) { cx += h.x; cy += h.y; }); cx /= hubs.length; cy /= hubs.length;
      var hubRad = 0; hubs.forEach(function (h) { hubRad += Math.hypot(h.x - cx, h.y - cy); }); hubRad /= hubs.length;
      // Silhouette: a = distance to OWN sector hub, b = distance to NEAREST OTHER hub,
      // s = (b - a) / max(a, b). Above ~0.35 => genuine lobes; below ~0.15 => a disc
      // with only local attachment. This is the honest test (unlike own-vs-mean, which
      // any spring force satisfies).
      var sil = [], ownDsum = 0, n = 0;
      Object.keys(pos).forEach(function (id) {
        var node = G.nodes[id]; if (!node || node.type !== 'company' || !nodeVisible(node)) return;
        var co = NiyBrain.ontology.company(id.slice(8)); if (!co) return;
        var own = null; for (var i = 0; i < hubs.length; i++) if (hubs[i].id === co.sector) { own = hubs[i]; break; }
        if (!own) return;
        var p = pos[id], a = Math.hypot(p.x - own.x, p.y - own.y), b = 1e18;
        for (i = 0; i < hubs.length; i++) { if (hubs[i] === own) continue; var d = Math.hypot(p.x - hubs[i].x, p.y - hubs[i].y); if (d < b) b = d; }
        sil.push((b - a) / Math.max(a, b, 1e-6)); ownDsum += a; n++;
      });
      sil.sort(function (a, b) { return a - b; });
      var silMean = sil.reduce(function (a, b) { return a + b; }, 0) / (sil.length || 1);
      // mean inter-hub distance
      var ih = 0, ihc = 0; for (var x = 0; x < hubs.length; x++) for (var y = x + 1; y < hubs.length; y++) { ih += Math.hypot(hubs[x].x - hubs[y].x, hubs[x].y - hubs[y].y); ihc++; }
      var meanInterHub = ih / (ihc || 1), meanOwnHub = ownDsum / (n || 1);
      return {
        hubs: hubs.length, companiesScored: n, hubSpreadRadius: Math.round(hubRad),
        silhouetteMean: +silMean.toFixed(3), silhouetteMedian: +(sil[Math.floor(sil.length / 2)] || 0).toFixed(3),
        shareNegative: +(sil.filter(function (s) { return s < 0; }).length / (sil.length || 1)).toFixed(3),
        interHubOverOwnHub: +(meanInterHub / (meanOwnHub || 1)).toFixed(2),
        verdict: silMean > 0.35 ? 'lobes' : silMean < 0.15 ? 'disc-with-local-attachment' : 'ambiguous'
      };
    };

    // ---- interaction ---------------------------------------------------------
    function hitTest(sx, sy) {
      var best = null, bestD = 14 * 14;
      for (var id in G.nodes) { var n = G.nodes[id]; if (!nodeVisible(n)) continue; var p = pos[id]; if (!p) continue; var s = toScreen(p.x, p.y); var dx = s[0] - sx, dy = s[1] - sy, d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = n; } }
      return best;
    }

    function wireCanvas() {
      var c = el.canvas;
      c.addEventListener('wheel', function (e) { e.preventDefault(); var r = c.getBoundingClientRect(); var mx = e.clientX - r.left, my = e.clientY - r.top; var wpt = toWorld(mx, my); view.z *= (e.deltaY < 0 ? 1.15 : 0.87); view.z = Math.max(0.08, Math.min(6, view.z)); var np = toScreen(wpt[0], wpt[1]); view.cx += (np[0] - mx) / view.z; view.cy += (np[1] - my) / view.z; updateZoom(); }, { passive: false });
      c.addEventListener('pointerdown', function (e) { dragging = true; dragMoved = false; dragSt = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; c.classList.add('grabbing'); try { c.setPointerCapture(e.pointerId); } catch (x) {} });
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        if (dragging) { var ddx = e.clientX - dragSt.x, ddy = e.clientY - dragSt.y; if (Math.abs(ddx) + Math.abs(ddy) > 3) dragMoved = true; view.cx = dragSt.cx - ddx / view.z; view.cy = dragSt.cy - ddy / view.z; el.tip.style.display = 'none'; }
        else { var n = hitTest(mx, my); if (n !== hoverNode) { hoverNode = n; showTip(n, mx, my); } else if (n) moveTip(mx, my); }
      });
      c.addEventListener('pointerup', function (e) { c.classList.remove('grabbing'); if (dragging && !dragMoved) { var r = c.getBoundingClientRect(); var n = hitTest(e.clientX - r.left, e.clientY - r.top); selNode = n || null; if (NiyBrain.ui.onSelect) NiyBrain.ui.onSelect(n); } else if (dragging && dragMoved) { saveStateDebounced(); } dragging = false; });
      el.nb.querySelector('.nb-hud').addEventListener('click', function (e) { var z = e.target && e.target.dataset && e.target.dataset.z; if (!z) return; if (z === 'in') view.z = Math.min(6, view.z * 1.25); else if (z === 'out') view.z = Math.max(0.08, view.z * 0.8); else if (z === 'reset') fitView(); updateZoom(); });
      window.addEventListener('resize', function () { if (document.getElementById('niyBrain').classList.contains('show')) resize(); });
    }
    function updateZoom() { if (el.zoom) el.zoom.textContent = Math.round(view.z * 100) + '%'; saveStateDebounced(); }
    function showTip(n, mx, my) { if (!n) { el.tip.style.display = 'none'; return; } el.tip.innerHTML = '<div class="t-type">' + n.type + ' · deg ' + n.degree + '</div>' + clip(n.label, 60); el.tip.style.display = 'block'; moveTip(mx, my); }
    function moveTip(mx, my) { el.tip.style.left = (mx + 14) + 'px'; el.tip.style.top = (my + 12) + 'px'; }

    function startLoop() {
      if (rafId) return;
      (function loop() {
        // Stop entirely when the tab is hidden or the Brain view is not showing; the
        // visibilitychange handler restarts us. rAF is already throttled, but the
        // force worker and redraws should idle completely rather than spin.
        if (document.hidden || !document.getElementById('niyBrain').classList.contains('show')) { rafId = null; return; }
        try { draw(); } catch (e) {}
        rafId = requestAnimationFrame(loop);
      })();
    }

    // ---- selection, panel, evidence ----------------------------------------
    function bandColor(b, accent) {
      if (b === 'Strong') return cssVar('--signal-green', '#4c9a5a');
      if (b === 'Moderate') return cssVar('--signal-amber', '#c99a3f');
      if (b === 'Weak') return cssVar('--signal-red', '#b8564f');
      if (b === 'Speculative') return cssVar('--fg-faint', '#9aa1a8');
      return accent;
    }
    var PATH_GROUP = [
      { p: 'P1', cls: 'named', head: 'Named directly', note: '' },
      { p: 'P2', cls: '', head: 'Via regulator or ministry', note: 'Sector-level connection — the institution governs the sector, not a mention of the company.' },
      { p: 'P3', cls: '', head: 'Via theme', note: '' },
      { p: 'P4', cls: '', head: 'Via commodity', note: '' },
      { p: 'P5', cls: '', head: 'Via foreign exposure', note: 'Thin coverage — trade/tariff-driven links only.' }
    ];

    function computeSelInfo(n) {
      if (!n) return null;
      var id = n.id, nb = {}; nb[id] = 1;
      var touches = [];
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i];
        if (e.type === 'TOUCHES') { if (e.from === id || e.to === id) { touches.push(e); nb[e.from] = 1; nb[e.to] = 1; } }
        else if (e.from === id) nb[e.to] = 1; else if (e.to === id) nb[e.from] = 1;
      }
      return { nb: nb, touches: touches };
    }

    NiyBrain.ui.onSelect = function (n) {
      if (n) { highlightTouches = null; focusSet = null; }
      selNode = n || null; selInfo = n ? computeSelInfo(n) : null;
      if (!n) { closePanel(); return; }
      renderPanel(n);
    };
    function closePanel() { selNode = null; selInfo = null; if (el.panel) el.panel.classList.remove('open'); if (pendingRefresh) { pendingRefresh = false; setTimeout(function () { doRefresh(false); }, 60); } }

    function csvToFeature(csv) {
      try {
        var tiers = (typeof FEATURE_DATA !== 'undefined') ? FEATURE_DATA : null; if (!tiers) return null;
        for (var t in tiers) { var arr = tiers[t]; for (var i = 0; i < arr.length; i++) { if (arr[i].dataSource && arr[i].dataSource.csv === csv) return { tier: t, feature: arr[i].feature, idx: i }; } }
      } catch (e) {}
      return null;
    }

    function sparkSvg(ticker) {
      try {
        var O = window.NIY_OHLC_EMBED; if (!O) return null;
        var d = O[ticker] || O[ticker + '.NS'] || O[ticker.replace('.NS', '')]; if (!d) return null;
        var c = d.c || d.close || d.o; if (!c || c.length < 2) return null;
        var step = Math.max(1, Math.floor(c.length / 48)), pts = [];
        for (var i = 0; i < c.length; i += step) pts.push(c[i]); pts.push(c[c.length - 1]);
        var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), rng = (mx - mn) || 1;
        var W = 120, H = 30, up = c[c.length - 1] >= c[0];
        var col = up ? cssVar('--signal-green', '#4c9a5a') : cssVar('--signal-red', '#b8564f');
        var dstr = pts.map(function (v, k) { return (k ? 'L' : 'M') + (k / (pts.length - 1) * W).toFixed(1) + ' ' + (H - (v - mn) / rng * H).toFixed(1); }).join(' ');
        return '<svg class="nb-spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + dstr + '" fill="none" stroke="' + col + '" stroke-width="1.4"/></svg>';
      } catch (e) { return null; }
    }

    function niyGotoFor(csv) {
      var f = csvToFeature(csv); if (!f || typeof niyGoto !== 'function') return;
      try { niyGoto(f.tier, f.idx); } catch (e) { try { niyGoto(f.tier, f.feature); } catch (x) {} }
    }
    NiyBrain.ui._goto = niyGotoFor;

    function evidenceRow(ev) {
      var csv = ev.dataset, d = ev.t ? new Date(ev.t) : null;
      var date = d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'undated';
      var trunc = ev.truncated ? ' · showing top 40 of ' + (40 + (ev.dropped || 0)) + ' connections' : '';
      return '<div class="nb-ev" data-csv="' + esc(csv) + '"><div>' + esc(clip(ev.label, 90)) + '</div><div class="meta">' + esc(csv.replace('.csv', '')) + ' · ' + date + trunc + '</div></div>';
    }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function nfmt(x) { return (x == null) ? '—' : String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function renderPanel(n) {
      var ix = NiyBrain.ontology, html = '';
      html += '<button class="nb-p-close" title="Close (Esc)">×</button>';
      html += '<div class="nb-p-name">' + esc(n.label) + '</div><div class="nb-p-type">' + n.type + ' · degree ' + n.degree + '</div>';

      if (n.type === 'company') {
        var co = ix.company(n.id.slice(8));
        if (co) {
          html += '<div class="nb-p-type" style="margin-top:6px">' + esc((ix.sector(co.sector) || {}).name || co.sector) + (co.ownership ? ' · ' + co.ownership.toUpperCase() : '') + '</div>';
          if (co.tickers && co.tickers.length) { html += '<div class="nb-tickers">' + co.tickers.join(' · ') + '</div>'; var sp = sparkSvg(co.tickers[0]); html += sp || '<div class="nb-noprice">No embedded price series for this instrument.</div>'; }
          else html += '<div class="nb-noprice">No embedded price series — this name is tracked for linkage only.</div>';
        }
      }

      // What this touches — grouped by path (company: incoming; event: outgoing)
      var touches = selInfo ? selInfo.touches.slice() : [];
      var isCompany = n.type === 'company';
      touches = touches.filter(function (e) { return isCompany ? e.to === n.id : (n.type === 'event' ? e.from === n.id : true); });
      // Order by salience — the strongest-and-most-recent surface first — while the band beside
      // each row still reflects structural strength. The two can disagree, and that's the point.
      touches.sort(function (a, b) { return (b.salience != null ? b.salience : b.score) - (a.salience != null ? a.salience : a.score); });
      html += '<div class="nb-sec"><h4>What this ' + (isCompany ? 'connects to' : 'touches') + ' — ' + touches.length + ' link' + (touches.length === 1 ? '' : 's') + '</h4>';
      if (!touches.length) html += '<div class="nb-machine">No scored connections in the current window.</div>';
      // Method note: the confidence band is a RANK slice of every scored connection, not a
      // score threshold — so the rank, not the bare linkage number, is what decides the band.
      // Among connections of equal linkage strength, the more recent one ranks higher.
      var _rt = touches[0] ? touches[0].rankTotal : 0;
      if (touches.length && _rt) html += '<div class="nb-machine" style="margin-bottom:6px">Band = where this linkage ranks among all ' + nfmt(_rt) + ' scored connections (Strong = top 10%). Ties in linkage strength are broken by recency. Rows below are ordered by salience — strongest-and-most-recent first.</div>';
      PATH_GROUP.forEach(function (grp) {
        var rows = touches.filter(function (e) { return e.path === grp.p; });
        if (!rows.length) { if (grp.p === 'P1' && isCompany) html += '<div class="nb-sec named"><h4>' + grp.head + '</h4><div class="nb-machine">No source in this window names this company directly.</div></div>'; return; }
        html += '<div class="nb-sec ' + grp.cls + '"><h4>' + grp.head + ' (' + rows.length + ')</h4>';
        if (grp.note) html += '<div class="nb-machine" style="margin-bottom:6px">' + grp.note + '</div>';
        rows.slice(0, 8).forEach(function (e) {
          var other = G.nodes[isCompany ? e.from : e.to];
          var _st = (e.structural != null ? e.structural : e.score), _sa = (e.salience != null ? e.salience : e.score);
          var _rankTxt = (e.rank != null && e.rankTotal) ? ('ranked ' + nfmt(e.rank) + ' of ' + nfmt(e.rankTotal)) : '';
          var _bandTitle = (_rankTxt ? _rankTxt + ' by linkage — ' + e.band + '. Band set by rank; among equal linkage the more recent connection ranks higher. ' : '') + '(linkage ' + _st.toFixed(4) + ' · salience ' + _sa.toFixed(4) + ')';
          html += '<div class="nb-row">' + esc(clip(other ? other.label : '', 60)) + '<span class="nb-band ' + e.band + '" title="' + esc(_bandTitle) + '">' + e.band + '</span>' +
            (_rankTxt ? '<span class="nb-rank" title="' + esc(_bandTitle) + '">#' + nfmt(e.rank) + '<span class="nb-rank-tot">/' + nfmt(e.rankTotal) + '</span></span>' : '') +
            '<div class="chain">' + esc(chainText(e, isCompany)) + '</div></div>';
        });
        if (rows.length > 8) html += '<div class="nb-p-type">+ ' + (rows.length - 8) + ' more</div>';
        html += '</div>';
      });
      html += '</div>';

      // Evidence — the actual source event rows (above any prose, always)
      var evs = {};
      touches.forEach(function (e) { var ev = G.nodes[isCompany ? e.from : n.id]; if (ev && ev.type === 'event') evs[ev.id] = ev; });
      if (n.type === 'event') evs[n.id] = n;
      var evList = Object.keys(evs).map(function (k) { return evs[k]; }).slice(0, 12);
      if (evList.length) {
        html += '<div class="nb-sec"><h4>Evidence — source rows</h4>';
        evList.forEach(function (ev) { html += evidenceRow(ev); });
        html += '</div>';
      }

      // Why this connection exists — Phase 4 narrative for the top-scored connection.
      var topEdge = touches[0];
      html += '<div class="nb-sec" id="nbWhySec"><h4>Why this connection exists <span class="nb-machine-tag">machine-generated</span></h4>' +
        '<div id="nbWhy" class="nb-why"></div>' +
        '<div class="nb-why-ctrls"><button id="nbRegen" type="button">Regenerate</button><button id="nbWrong" type="button">This looks wrong</button></div></div>';

      // Ask about this
      html += '<button class="nb-ask" id="nbAsk">Ask the AI workspace about this</button>';

      el.panelIn.innerHTML = html;
      el.panel.classList.add('open');
      el.panelIn.querySelector('.nb-p-close').addEventListener('click', function () { closePanel(); });
      el.panelIn.querySelectorAll('.nb-ev').forEach(function (r) { r.addEventListener('click', function () { niyGotoFor(r.dataset.csv); }); });
      var ask = el.panelIn.querySelector('#nbAsk'); if (ask) ask.addEventListener('click', function () { askAI(n, touches); });
      // narrative for the top connection
      if (topEdge && NiyBrain.narrative) {
        loadNarrative(topEdge, isCompany, false);
        var rg = el.panelIn.querySelector('#nbRegen'); if (rg) rg.addEventListener('click', function () { loadNarrative(topEdge, isCompany, true); });
        var wr = el.panelIn.querySelector('#nbWrong'); if (wr) wr.addEventListener('click', function () { try { var ctx = buildNarrativeCtx(topEdge, isCompany); (window.__niyBrainWrong = window.__niyBrainWrong || []).push({ fp: NiyBrain.narrative.fingerprint(ctx), at: Date.now() }); wr.textContent = 'Flagged — thank you'; wr.disabled = true; } catch (e) {} });
      } else { var w = el.panelIn.querySelector('#nbWhy'); if (w) w.innerHTML = '<div class="nb-machine">No scored connection to explain in this window.</div>'; var cs = el.panelIn.querySelector('.nb-why-ctrls'); if (cs) cs.style.display = 'none'; }
    }

    function buildNarrativeCtx(edge, isCompany) {
      var ix = NiyBrain.ontology, ev = G.nodes[edge.from], comp = G.nodes[edge.to];
      var co = ix.company((comp.id || '').slice(8)) || {};
      var evid = [{ dataset: (ev.dataset || '').replace('.csv', ''), date: ev.t ? new Date(ev.t).toISOString().slice(0, 10) : '', title: ev.label, snippet: '' }];
      var instId = edge.via && edge.via.institution, secId = (edge.via && edge.via.sector) || co.sector;
      return {
        band: edge.band, pathType: edge.path, pathText: chainText(edge, isCompany),
        company: comp.label, companyId: (comp.id || '').slice(8),
        sector: (ix.sector(secId) || {}).name || secId || co.sector,
        sectorId: secId, institution: instId ? ((ix.institution(instId) || {}).name || instId) : '', institutionId: instId,
        themeId: edge.via && edge.via.theme, eventId: ev.id,
        evidence: evid, evidenceHashes: [NiyBrain.fnv1a(ev.id || '')]
      };
    }

    function loadNarrative(edge, isCompany, force) {
      var slot = el.panelIn && el.panelIn.querySelector('#nbWhy'); if (!slot) return;
      // Flag-gated: off by default until the Phase-4 quality gate + legal review clear.
      if (!(NiyBrain.flags && NiyBrain.flags.narrative)) {
        slot.innerHTML = '<div class="nb-machine">Machine-generated explanations are turned off pending review. The structural path and the source evidence above stand on their own.</div>';
        var cc = el.panelIn.querySelector('.nb-why-ctrls'); if (cc) cc.style.display = 'none';
        return;
      }
      // Band is read at RENDER time (edge.band is current), before any cache is consulted,
      // so a cached note never renders on an edge a rebuild has demoted to Weak/Speculative.
      if (edge.band !== 'Strong' && edge.band !== 'Moderate') {
        slot.innerHTML = '<div class="nb-machine">This connection is too indirect to explain usefully — the path and sources are above.</div>';
        var c = el.panelIn.querySelector('.nb-why-ctrls'); if (c) c.style.display = 'none';
        return;
      }
      slot.innerHTML = '<div class="nb-machine">Reading the sources…</div>';
      var ctx = buildNarrativeCtx(edge, isCompany);
      if (force) { try { NiyBrain.narrative.bust && NiyBrain.narrative.bust(ctx); } catch (e) {} }
      NiyBrain.narrative.generate(ctx).then(function (r) {
        if (!el.panelIn || !el.panelIn.querySelector('#nbWhy')) return;
        if (r.status === 'ok') {
          var paras = String(r.text).split(/\n{1,}/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
          slot.innerHTML = paras + (r.cached ? '' : '');
        } else if (r.status === 'not-explained') {
          slot.innerHTML = '<div class="nb-machine">This connection is too indirect to explain usefully — the path and sources are above.</div>';
        } else {
          slot.innerHTML = '<div class="nb-machine">No explanation available for this connection. The structural path and evidence are shown above.</div>';
        }
      });
    }

    function chainText(e, isCompany) {
      var ix = NiyBrain.ontology, ev = G.nodes[e.from], comp = G.nodes[e.to];
      var evT = clip(ev ? ev.label : '', 34), cT = comp ? comp.label : '';
      if (e.path === 'P1') return evT + ' — names → ' + cT;
      if (e.path === 'P2') return evT + ' → ' + ((ix.institution(e.via.institution) || {}).name || e.via.institution) + ' → ' + ((ix.sector(e.via.sector) || {}).name || e.via.sector) + ' → ' + cT;
      if (e.path === 'P3') return evT + ' → ' + ((ix.theme(e.via.theme) || {}).name || e.via.theme) + ' → ' + cT;
      if (e.path === 'P4') return evT + ' → ' + ((ix.commodity(e.via.commodity) || {}).name || e.via.commodity) + ' → ' + cT;
      if (e.path === 'P5') return evT + ' → ' + (((ix.geography && ix.geography(e.via.geography)) || {}).name || e.via.geography) + ' → ' + cT;   // guard: ontology has no geography() accessor
      return evT + ' → ' + cT;
    }

    function askAI(n, touches) {
      try {
        var ix = NiyBrain.ontology, lines = ['Context from the Niyantran Brain graph (research linkage, not advice):', 'Node: ' + n.label + ' (' + n.type + ')'];
        touches.slice(0, 6).forEach(function (e) { lines.push('- ' + chainText(e, n.type === 'company') + ' [' + e.band + ']'); });
        lines.push('', 'Explain the mechanism connecting these, using only the linkages above. Do not give investment advice, price targets, or predictions.');
        if (window.openGlobalAiWithPrompt) window.openGlobalAiWithPrompt(lines.join('\n'));
      } catch (e) {}
    }

    // ---- filters, table, focus, esc ----------------------------------------
    function wireFilters() {
      var q = el.nb.querySelector('#nbSearch');
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { flyToSearch(q.value); } e.stopPropagation(); });
      var win = el.nb.querySelector('#nbWindow'), lbl = el.nb.querySelector('#nbWindowLbl');
      win.addEventListener('input', function () { windowDays = +win.value; lbl.textContent = windowDays === 0 ? 'all' : windowDays + 'd'; });
      win.addEventListener('change', function () { rebuildLayout(); });
      el.nb.querySelector('#nbDirect').addEventListener('change', function (e) { showDirect = e.target.checked; });
      el.nb.querySelector('#nbPaths').addEventListener('change', function (e) { onlyPaths = e.target.checked; });
      var vg = el.nb.querySelector('#nbViewGraph'), vt = el.nb.querySelector('#nbViewTable');
      vg.addEventListener('click', function () { vg.classList.add('on'); vt.classList.remove('on'); el.tableWrap.classList.remove('show'); });
      vt.addEventListener('click', function () { vt.classList.add('on'); vg.classList.remove('on'); renderTable(); el.tableWrap.classList.add('show'); });
    }

    // Window/filter change: re-filter by the new window and NUDGE (preserve positions,
    // seed newly-visible nodes near a neighbour) rather than reset the whole layout.
    function rebuildLayout() { if (!G || !worker) { startBuild(); return; } if (el.prog) el.prog.style.display = 'flex'; applyGraph(G, false); }
    var _saveT = null;
    function saveStateDebounced() { if (_saveT) clearTimeout(_saveT); _saveT = setTimeout(saveState, 800); }

    function flyToSearch(qs) {
      qs = (qs || '').toLowerCase().trim(); if (!qs) return;
      var best = null, bestScore = 1e9;
      for (var id in G.nodes) { var n = G.nodes[id]; if (!pos[id]) continue; var lbl = (n.label || '').toLowerCase(); var idx = lbl.indexOf(qs); if (idx >= 0) { var sc = idx + Math.abs(lbl.length - qs.length) * 0.1; if (sc < bestScore) { bestScore = sc; best = n; } } }
      if (best) { view.cx = pos[best.id].x; view.cy = pos[best.id].y; view.z = Math.max(view.z, 2.6); updateZoom(); NiyBrain.ui.onSelect(best); }   // GALAXY: zoom into the selected region
    }

    function renderTable() {
      var rows = [];
      G.edges.forEach(function (e) { if (e.type !== 'TOUCHES') return; var ev = G.nodes[e.from], co = G.nodes[e.to]; if (!ev || !co) return; if (!eventInWindow(ev)) return; rows.push({ ev: ev.label, csv: ev.dataset, date: ev.t, path: e.path, co: co.label, sector: (NiyBrain.ontology.sector((NiyBrain.ontology.company(co.id.slice(8)) || {}).sector) || {}).name || '', band: e.band, structural: (e.structural != null ? e.structural : e.score), salience: (e.salience != null ? e.salience : e.score) }); });
      rows.sort(function (a, b) { return b.salience - a.salience; });   // default order = what to look at now
      rows = rows.slice(0, 2000);
      var h = '<table class="nb-table"><thead><tr><th>Event</th><th>Dataset</th><th>Date</th><th>Path</th><th>Company</th><th>Sector</th><th>Confidence</th><th>Linkage</th><th>Salience</th></tr></thead><tbody>';
      rows.forEach(function (r) { var d = r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'; h += '<tr><td>' + esc(clip(r.ev, 50)) + '</td><td>' + esc(r.csv.replace('.csv', '')) + '</td><td>' + d + '</td><td>' + r.path + '</td><td>' + esc(r.co) + '</td><td>' + esc(r.sector) + '</td><td><span class="nb-band ' + r.band + '">' + r.band + '</span></td><td class="num">' + r.structural.toFixed(4) + '</td><td class="num">' + r.salience.toFixed(4) + '</td></tr>'; });
      h += '</tbody></table>';
      el.tableWrap.innerHTML = h;
    }

    function focusOn(n) { if (!n) { focusSet = null; return; } var set = {}; set[n.id] = 1; if (selInfo) for (var k in selInfo.nb) set[k] = 1; // 1-hop from selInfo
      // extend to 2-hop
      var one = Object.keys(set);
      G.edges.forEach(function (e) { if (set[e.from] && !set[e.to]) set[e.to] = 2; else if (set[e.to] && !set[e.from]) set[e.from] = 2; });
      focusSet = set;
    }

    // Escape: capture-phase, acts only when the Brain tab is active AND no modal/overlay
    // is open (so block 032's universal-escape still wins for those). Order: focus -> selection -> nothing.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var brainActive = document.getElementById('niyBrain') && document.getElementById('niyBrain').classList.contains('show');
      if (!brainActive) return;
      // A modal/overlay is "open" only if it is actually visible (not merely latent in
      // the DOM). getClientRects() is empty for display:none subtrees. Let block 032 win then.
      var cands = document.querySelectorAll('#infoModal, .niy-modal, [role="dialog"], .modal-box');
      var modalOpen = [].some.call(cands, function (m) { return m.getClientRects().length > 0 && getComputedStyle(m).visibility !== 'hidden' && !m.hasAttribute('hidden'); });
      if (modalOpen) return;                       // let block 032 handle modals
      if (highlightTouches || focusSet) { highlightTouches = null; focusSet = null; e.stopPropagation(); e.preventDefault(); }
      else if (selNode) { NiyBrain.ui.onSelect(null); e.stopPropagation(); e.preventDefault(); }
      // else: do nothing (never leave the tab on Escape)
    }, true);

    // double-click -> focus mode
    function wireDouble() { el.canvas.addEventListener('dblclick', function (e) { var r = el.canvas.getBoundingClientRect(); var n = hitTest(e.clientX - r.left, e.clientY - r.top); if (n) { NiyBrain.ui.onSelect(n); focusOn(n); } else focusSet = null; }); }
    // '/' focuses search
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.getElementById('niyBrain') && document.getElementById('niyBrain').classList.contains('show')) { var q = el.nb && el.nb.querySelector('#nbSearch'); if (q && document.activeElement !== q) { e.preventDefault(); q.focus(); } } });

    // ---- Phase 5: freshness & refresh --------------------------------------
    function tKey(e) { return e.from + '' + e.to + '' + e.path; }
    function touchesKeySet(g) { var s = {}; g.edges.forEach(function (e) { if (e.type === 'TOUCHES') s[tKey(e)] = e; }); return s; }
    function diffTouches(oldG, newG) {
      var oldS = touchesKeySet(oldG), added = [], datasets = {};
      newG.edges.forEach(function (e) { if (e.type !== 'TOUCHES') return; if (!oldS[tKey(e)]) { added.push(e); var ev = newG.nodes[e.from]; if (ev) datasets[ev.dataset] = 1; } });
      return { added: added, addedDatasets: Object.keys(datasets) };
    }

    // Subscribe to dataset:updated; mark dirty; debounce 1500ms; refresh in background.
    function wireFreshness() {
      if (freshWired) return; freshWired = true;
      try {
        NiyBrain.bus.on('dataset:updated', function (p) {
          if (!p || !p.key) return;
          dirty[p.key] = 1; datasetSeenAt[p.key] = Date.now(); refreshedThisSession++;
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(function () { refreshTimer = null; doRefresh(false); }, 1500);
          updateFreshness();
        });
      } catch (e) {}
      var rb = el.nb && el.nb.querySelector('#nbRebuild');
      if (rb) rb.addEventListener('click', function () { doRefresh(true); });
      // Stop the render loop when hidden; block 004 throttles rAF but we also idle.
      document.addEventListener('visibilitychange', function () { if (!document.hidden && document.getElementById('niyBrain').classList.contains('show')) startLoop(); });
      updateFreshness();
    }

    function doRefresh(manual) {
      try {
        if (!G) return;
        // Do not re-lay-out under the user: defer a background refresh while a node is
        // selected; it's applied when the selection clears (see closePanel).
        if (!manual && selNode) { pendingRefresh = true; updateFreshness(); return; }
        var oldG = G;
        var dirtyKeys = Object.keys(dirty);
        NiyBrain.bus.emit('graph:progress', { phase: 'projecting' });
        if (manual && el.prog) { el.prog.style.display = 'flex'; el.prog.querySelector('div').textContent = 'rebuilding…'; if (el.progBar) el.progBar.style.width = '30%'; }
        // background refresh: re-extract only dirty datasets (fast); manual: full rebuild.
        var newG = (manual || !dirtyKeys.length) ? NiyBrain.graph.build() : NiyBrain.graph.buildIncremental(dirtyKeys);
        if (!newG) return;
        if (el.progBar) el.progBar.style.width = '60%';
        var diff = diffTouches(oldG, newG);
        dirty = {};
        applyGraph(newG, manual);            // preserve positions, nudge (or full relayout if manual)
        if (!manual && diff.added.length) {
          showToast(diff.addedDatasets.length + ' dataset' + (diff.addedDatasets.length === 1 ? '' : 's') + ' refreshed · ' + diff.added.length + ' new connection' + (diff.added.length === 1 ? '' : 's'), diff.added);
        }
        updateFreshness();
      } catch (e) { try { console.warn('[NiyBrain] refresh failed', e); } catch (_) {} }
    }

    function applyGraph(newG, fullRelayout) {
      G = newG; selNode = null; selInfo = null;
      var HUB = { SOURCED_FROM: 1, MENTIONS: 1, ON_THEME: 1, GOVERNS: 1, IN_SECTOR: 1, EXPOSED_TO: 1 };
      hiddenByWindow = 0;
      var inLayout = {}; var newIds = [];
      Object.keys(G.nodes).forEach(function (id) { var n = G.nodes[id]; if (n.type === 'dataset') return; if (eventInWindow(n)) { inLayout[id] = 1; if (!pos[id]) newIds.push(id); } else hiddenByWindow++; });
      var nodes = Object.keys(inLayout).map(function (id) { var n = G.nodes[id]; return { id: id, type: n.type, degree: n.degree }; });
      var edges = layoutEdges(inLayout);
      // prune stale positions (nodes that no longer exist)
      Object.keys(pos).forEach(function (id) { if (!inLayout[id]) delete pos[id]; });
      if (!worker) { startBuild(); return; }
      worker.postMessage({ cmd: fullRelayout ? 'layout' : 'nudge', nodes: nodes, edges: edges, positions: pos, ticks: fullRelayout ? 300 : 70, w: 2600, h: 2600 });
    }

    function updateFreshness() {
      var f = el.nb && el.nb.querySelector('#nbFresh'); if (!f) return;
      var live = window.__niyLive || {};
      var n = 0, oldest = 0, nowT = Date.now();
      Object.keys(live).forEach(function (k) { var at = live[k] && live[k].at ? Date.parse(live[k].at) : null; if (at) { n++; var age = nowT - at; if (age > oldest) oldest = age; } });
      Object.keys(datasetSeenAt).forEach(function (k) { var age = nowT - datasetSeenAt[k]; if (age > oldest) oldest = age; });
      var total = NiyBrain.watch ? NiyBrain.watch.keys().length : 0;
      f.innerHTML = '<span><b>' + total + '</b> datasets</span><span><b>' + refreshedThisSession + '</b> refreshed this session</span>' + (oldest ? ('<span>oldest · ' + agoStr(oldest) + '</span>') : '');
    }
    function agoStr(ms) { var s = ms / 1000; if (s < 90) return Math.round(s) + 's ago'; var m = s / 60; if (m < 90) return Math.round(m) + 'm ago'; var h = m / 60; if (h < 36) return Math.round(h) + 'h ago'; return Math.round(h / 24) + 'd ago'; }

    var toastTimer = null;
    function showToast(msg, addedEdges) {
      var t = el.nb && el.nb.querySelector('#nbToast'); if (!t) return;
      t.innerHTML = '<span>' + esc(msg) + '</span><button id="nbToastShow">show me</button><button id="nbToastX" style="border-color:var(--ds-hair)">dismiss</button>';
      t.classList.add('show');
      var show = t.querySelector('#nbToastShow'), x = t.querySelector('#nbToastX');
      if (show) show.addEventListener('click', function () {
        highlightTouches = addedEdges;
        var set = {}; addedEdges.forEach(function (e) { set[e.from] = 1; set[e.to] = 1; });
        focusSet = set; t.classList.remove('show');
      });
      if (x) x.addEventListener('click', function () { t.classList.remove('show'); });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 12000);
    }

    // ---- persistence (IndexedDB): reopening is instant ----------------------
    function stateStore() {
      return new Promise(function (res) { try { var r = indexedDB.open('niy-brain-state', 1); r.onupgradeneeded = function () { r.result.createObjectStore('state'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); } });
    }
    function saveState() {
      try {
        var payload = { pos: pos, view: view, windowDays: windowDays, typeOn: typeOn, at: Date.now(), ontVer: (window.NIY_BRAIN_ONTOLOGY || {}).version };
        stateStore().then(function (d) { if (d) try { d.transaction('state', 'readwrite').objectStore('state').put(payload, 'brain'); } catch (e) {} });
      } catch (e) {}
    }
    function restoreState() {
      return stateStore().then(function (d) { if (!d) return null; return new Promise(function (res) { try { var t = d.transaction('state').objectStore('state').get('brain'); t.onsuccess = function () { res(t.result || null); }; t.onerror = function () { res(null); }; } catch (e) { res(null); } }); });
    }

    // inject tab as soon as the bar exists
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectTab); else injectTab();
    setTimeout(injectTab, 400); setTimeout(injectTab, 1500);

    try { console.log('%c[NiyBrain] Phase 3 renderer ready', 'color:#6ab7ff'); } catch (e) {}
  } catch (e) { try { console.warn('[NiyBrain] UI init failed', e); } catch (_) {} }
})();

