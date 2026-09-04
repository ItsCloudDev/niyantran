import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogModules, TABS } from '../desks/catalog.js';
import HomeDesk from '../desks/HomeDesk.jsx';
import DeskView from '../desks/DeskView.jsx';
import DeskNav from './DeskNav.jsx';
import RightRail from './RightRail.jsx';
import { Icon } from './Icons.jsx';
import { isConflictsFeature } from '../lib/conflictsMonitor.js';
import { isTransitFeature } from '../lib/transit.js';
import { isChokepointsFeature } from '../lib/strategicAssets.js';
import { isGeoResourceDossier } from '../lib/globalResources.js';
import { isEnergyFeature } from '../lib/geonomics.js';
import { isNationalFullscreen, isImpactRecordFeature } from '../lib/national.js';
import { isGithubCsvRow } from '../lib/githubCsv.js';
import { firstFeature, parseDeskHash, resolveDeskRoute, writeDeskHash } from '../lib/deskRoute.js';
import { kickHomeRefreshIfDue } from '../lib/homeCache.js';
import { canOpenDesk, clearSessionUser, sessionUser, tabsForType, userTypeOf } from '../lib/userStore.js';
import AiDock from '../ai/AiDock.jsx';

export default function TerminalShell({ onLogout }) {
  const start = parseDeskHash();
  const [tab, setTab] = useState(start.tab);
  const [featureName, setFeatureName] = useState(start.feature);
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('light');
  const [q, setQ] = useState('');
  const [feed, setFeed] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [vizFilter, setVizFilter] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const user = sessionUser();
  const typeId = userTypeOf(user?.type).id;
  const typeMeta = userTypeOf(typeId);
  const deskTabs = tabsForType(typeId);

  const active = deskTabs.find((t) => t.id === tab) || TABS.find((t) => t.id === tab) || TABS[0];
  const hi = lang === 'hi';
  const onFeed = useCallback((body) => setFeed(body), []);
  const onSelect = useCallback((row) => setSelected(row), []);
  const onLoading = useCallback((v) => setLoading(Boolean(v)), []);
  const onClearViz = useCallback(() => setVizFilter(null), []);

  useEffect(() => {
    function onViz(e) {
      const it = e.detail;
      if (!it?.filterCol) {
        setVizFilter(null);
        return;
      }
      setVizFilter((prev) => {
        const next = {
          col: it.filterCol,
          value: it.filterValue || it.label,
          values: it.filterValues,
          map: it.filterMap,
        };
        const list = Array.isArray(prev) ? prev : prev?.col ? [prev] : [];
        const i = list.findIndex(
          (x) =>
            x.col === next.col &&
            String(x.value) === String(next.value) &&
            String(x.map || '') === String(next.map || ''),
        );
        if (i >= 0) {
          const out = list.filter((_, j) => j !== i);
          return out.length ? out : null;
        }
        return [...list, next];
      });
    }
    window.addEventListener('niy-viz-filter', onViz);
    return () => window.removeEventListener('niy-viz-filter', onViz);
  }, []);

  useEffect(() => {
    setVizFilter(null);
  }, [tab, featureName]);

  useEffect(() => {
    kickHomeRefreshIfDue();
    const id = setInterval(() => kickHomeRefreshIfDue(), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const land = sessionStorage.getItem('niyantranLand');
    if (land) sessionStorage.removeItem('niyantranLand');
    const hash = typeof location !== 'undefined' ? location.hash : '';
    const emptyHash = !hash || hash === '#' || hash === '#/';
    let r = parseDeskHash();
    if (land && canOpenDesk(typeId, land) && emptyHash) {
      r = resolveDeskRoute(land, land === 'home' ? '' : firstFeature(land));
    } else if (!canOpenDesk(typeId, r.tab)) {
      const fallback = userTypeOf(typeId).startTab || 'home';
      r = resolveDeskRoute(fallback, fallback === 'home' ? '' : firstFeature(fallback));
    }
    setTab(r.tab);
    setFeatureName(r.feature);
    if (r.tab === 'home' && emptyHash && r.tab === parseDeskHash().tab) return;
    writeDeskHash(r.tab, r.feature, { replace: true });
  }, [typeId]);

  useEffect(() => {
    function onPop() {
      let r = parseDeskHash();
      if (!canOpenDesk(typeId, r.tab)) {
        const fallback = userTypeOf(typeId).startTab || 'home';
        r = resolveDeskRoute(fallback, fallback === 'home' ? '' : firstFeature(fallback));
        writeDeskHash(r.tab, r.feature, { replace: true });
      }
      setTab(r.tab);
      setFeatureName(r.feature);
      setSelected(null);
      setVizFilter(null);
    }
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [typeId]);

  const allowedTiers = useMemo(
    () => new Set(deskTabs.map((t) => t.tier)),
    [deskTabs],
  );

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return catalogModules()
      .filter((m) => allowedTiers.has(m.htmlTier))
      .filter((m) => `${m.htmlFeature} ${m.bucket} ${m.htmlTier}`.toLowerCase().includes(n))
      .slice(0, 12);
  }, [q, allowedTiers]);

  function onDesk(id) {
    if (!canOpenDesk(typeId, id)) return;
    const r = resolveDeskRoute(id, id === 'home' ? '' : firstFeature(id));
    setTab(r.tab);
    setFeatureName(r.feature);
    setSelected(null);
    setQ('');
    writeDeskHash(r.tab, r.feature);
  }

  function onFeature(name) {
    const r = resolveDeskRoute(tab, name);
    setTab(r.tab);
    setFeatureName(r.feature);
    setSelected(null);
    writeDeskHash(r.tab, r.feature);
  }

  function onOpen({ tab: nextTab, feature }) {
    if (!canOpenDesk(typeId, nextTab)) return;
    const r = resolveDeskRoute(nextTab, feature);
    setTab(r.tab);
    setFeatureName(r.feature);
    setQ('');
    setSelected(null);
    writeDeskHash(r.tab, r.feature);
  }

  function openHit(mod) {
    const dest = deskTabs.find((t) => t.tier === mod.htmlTier);
    if (!dest) return;
    onOpen({ tab: dest.id, feature: mod.htmlFeature });
  }

  const billRecordOpen = (isImpactRecordFeature(featureName) || isGithubCsvRow(selected)) && selected;
  const showRail =
    !aiOpen &&
    tab !== 'home' &&
    !isConflictsFeature(featureName) &&
    !isChokepointsFeature(featureName) &&
    !isEnergyFeature(featureName) &&
    !isGeoResourceDossier(featureName) &&
    !isNationalFullscreen(featureName);

  return (
    <div className={`terminal theme-${theme}`}>
      <div className={`load-bar${loading ? ' on' : ''}`} />
      <header className="topbar">
        <div className="brand" title="Niyantran Terminal">
          <img src="/brand/logo.png?v=2" alt="" />
          <span>TERMINAL</span>
        </div>
        <div className="cmd">
          <Icon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={hi ? 'खोजें' : 'Search desks, modules, records'}
            aria-label="Command search"
          />
          <button type="button" className="icon-btn ghost" disabled title="Voice search not configured">
            <Icon name="mic" />
          </button>
          {hits.length > 0 && (
            <ul className="cmd-hits">
              {hits.map((m) => (
                <li key={`${m.htmlTier}-${m.htmlFeature}`}>
                  <button type="button" onClick={() => openHit(m)}>
                    <strong>{m.htmlFeature}</strong>
                    <span>
                      {m.htmlTier} · {m.bucket}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={() => setLang(hi ? 'en' : 'hi')}>
            {hi ? 'HI' : 'EN'}
          </button>
          <button type="button" className="icon-btn" disabled title="Notifications not configured">
            <Icon name="bell" />
          </button>
          <button type="button" className="tv-btn" disabled title="Live TV placeholder">
            <span className="live-dot" />
            LIVE TV
          </button>
          <button
            type="button"
            className={`icon-btn${loading ? ' spin' : ''}`}
            onClick={() => setReload((n) => n + 1)}
            title="Refresh feed"
          >
            <Icon name="refresh" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title="Theme"
          >
            <Icon name="info" />
          </button>
          <span className="user-chip" title={`${user?.email || ''} · ${typeMeta.label}`}>
            <span className="avatar">{(user?.name || 'A').charAt(0).toUpperCase()}</span>
            <span className="user-type">{typeMeta.short}</span>
          </span>
          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              clearSessionUser();
              if (typeof location !== 'undefined') location.hash = '#/';
              onLogout?.();
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <DeskNav tab={tab} featureName={featureName} lang={lang} onDesk={onDesk} onFeature={onFeature} tabs={deskTabs} />
      <div className={`workspace${tab === 'home' ? ' home' : ''}${isConflictsFeature(featureName) ? ' conflicts-holistic' : ''}${isChokepointsFeature(featureName) || isEnergyFeature(featureName) || isNationalFullscreen(featureName) ? ' choke-holistic' : ''}${isGeoResourceDossier(featureName) ? ' geo-holistic' : ''}${isTransitFeature(featureName) ? ' transit-map' : ''}${isNationalFullscreen(featureName) ? ' pig-holistic' : ''}${billRecordOpen ? ' bill-record' : ''}${aiOpen ? ' ai-open' : ''}`}>
        <main className="main-col">
          {tab === 'home' ? (
            <HomeDesk onOpen={onOpen} onFeed={onFeed} onSelect={onSelect} onLoading={onLoading} reload={reload} />
          ) : (
            <DeskView
              key={`${active.tier}:${featureName}`}
              tier={active.tier}
              featureName={featureName}
              onFeed={onFeed}
              selected={selected}
              onSelect={onSelect}
              onLoading={onLoading}
              reload={reload}
              vizFilter={vizFilter}
              onClearViz={onClearViz}
            />
          )}
        </main>
        {showRail && (
          <RightRail feed={feed} selected={selected} onSelect={onSelect} lang={lang} loading={loading} vizFilter={vizFilter} />
        )}
        <AiDock feed={feed} selected={selected} tab={tab} featureName={featureName} lang={lang} onOpenChange={setAiOpen} />
      </div>
    </div>
  );
}
