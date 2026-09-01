
/* The client refresh path — the ONLY app-code change the ingestion service requires.
   Diffs the server manifest (/api/datasets) against what the session has applied, pulls the
   changed keys (/api/dataset/<key>) and writes each through NiyBrain.watch.applyRefresh — the
   only supported path: it fires the accessor trap (existing keys) or is caught by the ~5s
   sweep (new keys), and rejects derived/empty writes rather than corrupting the graph. New
   datasets appear "within seconds", never "live". Rejections are surfaced, never swallowed.
   Base URL defaults to same-origin /api/* (window.NIY_INGEST_BASE overrides for local dev). */
(function () {
  if (window.__niyRefreshInstalled) return; window.__niyRefreshInstalled = 1;
  var BASE = (window.NIY_INGEST_BASE || '');
  var lastSeen = Object.create(null); // key -> lastUpdated the session has already applied

  function j(u, opts) { return fetch(BASE + u, opts).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.json(); }); }

  function refresh() {
    setStatus('Checking sources…');
    return j('/api/datasets').then(function (manifest) {
      var changed = manifest.filter(function (m) { return m.status === 'ok' && m.lastUpdated && lastSeen[m.key] !== m.lastUpdated; });
      if (!changed.length) { render(manifest, []); setStatus('Up to date.'); return { changed: 0, results: [] }; }
      return Promise.all(changed.map(function (m) {
        return j('/api/dataset/' + encodeURIComponent(m.key)).then(function (rows) {
          var res = (window.NiyBrain && NiyBrain.watch) ? NiyBrain.watch.applyRefresh(m.key, rows) : { ok: false, reason: 'no NiyBrain' };
          if (res.ok) lastSeen[m.key] = m.lastUpdated;
          return { key: m.key, ok: res.ok, reason: res.reason || '', rows: rows.length };
        }).catch(function (e) { return { key: m.key, ok: false, reason: e.message, rows: 0 }; });
      })).then(function (results) {
        render(manifest, results);
        var rejected = results.filter(function (r) { return !r.ok; });
        setStatus(results.filter(function (r) { return r.ok; }).length + ' updated within seconds' +
          (rejected.length ? ' · ' + rejected.length + ' rejected: ' + rejected.map(function (r) { return r.key.replace('.csv', '') + '(' + r.reason + ')'; }).join(', ') : ''));
        return { changed: changed.length, results: results };
      });
    }).catch(function (e) { setStatus('Refresh failed: ' + e.message); throw e; });
  }

  function el(id) { return document.getElementById(id); }
  function ensureUI() {
    if (el('niyRefreshCtl')) return;
    var wrap = document.createElement('div'); wrap.id = 'niyRefreshCtl';
    wrap.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;font:11px/1.4 var(--font-mono,monospace);background:var(--panel,#111);color:var(--fg,#ddd);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 10px;max-width:340px;box-shadow:0 6px 22px rgba(0,0,0,.5);display:none';
    wrap.innerHTML = '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><button id="niyRefreshBtn" style="cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.3);color:inherit;border-radius:6px;padding:3px 8px;font:inherit">⟳ Refresh sources</button><span id="niyRefreshStatus" style="opacity:.85"></span></div><div id="niyRefreshList" style="margin-top:6px;max-height:170px;overflow:auto"></div>';
    document.body.appendChild(wrap);
    el('niyRefreshBtn').addEventListener('click', function () { refresh(); });
    setInterval(function () { var a = document.querySelector('.tab[data-tier="brain"].active'); wrap.style.display = a ? 'block' : 'none'; }, 800);
    j('/api/datasets').then(function (m) { render(m, []); }).catch(function () { setStatus('(ingestion API not reachable)'); });
  }
  function setStatus(t) { ensureUI(); var s = el('niyRefreshStatus'); if (s) s.textContent = t; }
  function render(manifest, results) {
    ensureUI(); var box = el('niyRefreshList'); if (!box) return;
    var resMap = {}; results.forEach(function (r) { resMap[r.key] = r; });
    box.innerHTML = manifest.map(function (m) {
      var stale = m.status === 'stale' || m.status === 'rejected-empty' || m.status === 'rejected-derived';
      var r = resMap[m.key];
      var dot = stale ? '<span style="color:var(--signal-amber,#e0913f)">● stale</span>'
        : (r && !r.ok ? '<span style="color:var(--signal-red,#e5484d)">● ' + r.reason + '</span>'
        : '<span style="opacity:.6">● ' + m.status + '</span>');
      return '<div style="display:flex;justify-content:space-between;gap:8px"><span>' + m.key.replace('.csv', '') + '</span><span>' + (m.lastUpdated ? m.lastUpdated.slice(0, 16).replace('T', ' ') : '—') + ' ' + dot + '</span></div>';
    }).join('');
  }

  if (window.NiyBrain) NiyBrain.refresh = refresh;
  window.NiyRefresh = { refresh: refresh, _lastSeen: lastSeen };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureUI); else ensureUI();
})();
