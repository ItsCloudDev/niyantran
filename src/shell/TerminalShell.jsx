import { useCallback, useEffect, useMemo, useState } from 'react';
import { bucketsFor, catalogModules, modulesForTier, TABS } from '../desks/catalog.js';
import HomeDesk from '../desks/HomeDesk.jsx';
import DeskView from '../desks/DeskView.jsx';
import DeskGuide from '../desks/DeskGuide.jsx';
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
import { parseDeskHash, resolveDeskRoute, writeDeskHash } from '../lib/deskRoute.js';
import { kickHomeRefreshIfDue } from '../lib/homeCache.js';
import { canOpenDesk, clearSessionUser, sessionUser, tabsForType, userTypeOf } from '../lib/userStore.js';
import { setPageTitle } from '../lib/siteHead.js';
import AiDock from '../ai/AiDock.jsx';
import OnboardingTour from './OnboardingTour.jsx';
import { clearPersonaPrefs } from '../lib/personas.js';

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
  const [liveTvOpen, setLiveTvOpen] = useState(false);
  const user = sessionUser();
  const typeId = userTypeOf(user?.type).id;
  const typeMeta = userTypeOf(typeId);
  const deskTabs = tabsForType(typeId);

  const active = deskTabs.find((t) => t.id === tab) || TABS.find((t) => t.id === tab) || TABS[0];
  const hi = lang === 'hi';

  useEffect(() => {
    const desk = active?.label || tab || 'Terminal';
    const feat = String(featureName || '').trim();
    setPageTitle(feat ? `${feat} · ${desk}` : desk === 'Home' ? 'Terminal' : desk);
  }, [tab, featureName, active?.label]);

  useEffect(() => {
    if (!liveTvOpen) return undefined;
    function onDoc(e) {
      if (e.target?.closest?.('.tv-wrap')) return;
      setLiveTvOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setLiveTvOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [liveTvOpen]);

  const onFeed = useCallback((body) => setFeed(body), []);
  const onSelect = useCallback((row) => setSelected(row), []);
  const onLoading = useCallback((v) => setLoading(Boolean(v)), []);
  const onClearViz = useCallback(() => setVizFilter(null), []);
  const guideMode = tab !== 'home' && !String(featureName || '').trim();
  const deskBuckets = useMemo(
    () => (tab === 'home' ? [] : bucketsFor(modulesForTier(active.tier), active.tier)),
    [tab, active.tier],
  );
  const activeModule = useMemo(() => {
    if (!featureName || tab === 'home') return null;
    return (
      modulesForTier(active.tier).find((m) => m.htmlFeature === featureName) ||
      catalogModules().find((m) => m.htmlFeature === featureName) ||
      null
    );
  }, [tab, active.tier, featureName]);
  const feedTier = activeModule?.htmlTier || active.tier;

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
    setFeed(null);
    setSelected(null);
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
      r = resolveDeskRoute(land, '');
    } else if (!canOpenDesk(typeId, r.tab)) {
      const fallback = userTypeOf(typeId).startTab || 'home';
      r = resolveDeskRoute(fallback, '');
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
        r = resolveDeskRoute(fallback, '');
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

  const allowedTiers = useMemo(() => {
    const s = new Set(deskTabs.map((t) => t.tier));
    // Booth / municipal modules live under State in the nav but remain local-tier in the map.
    if (s.has('state')) s.add('local');
    return s;
  }, [deskTabs]);

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
    const r = resolveDeskRoute(id, '');
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
    let dest = deskTabs.find((t) => t.tier === mod.htmlTier);
    if (!dest && mod.htmlTier === 'local') dest = deskTabs.find((t) => t.id === 'state');
    if (!dest) return;
    onOpen({ tab: dest.id, feature: mod.htmlFeature });
  }

  const billRecordOpen = (isImpactRecordFeature(featureName) || isGithubCsvRow(selected)) && selected;
  const showRail =
    !aiOpen &&
    tab !== 'home' &&
    !guideMode &&
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
          <button type="button" className="icon-btn" disabled title="Notifications not configured (Beta)">
            <Icon name="bell" />
          </button>
          <div className="tv-wrap">
            <button
              type="button"
              className="tv-btn"
              onClick={() => setLiveTvOpen((v) => !v)}
              title="Live TV is in Beta — no stream connected yet"
              aria-expanded={liveTvOpen}
            >
              <span className="live-dot" />
              LIVE TV
              <span className="beta-pill">Beta</span>
            </button>
            {liveTvOpen ? (
              <div className="live-tv-pop" role="dialog" aria-label="Live TV">
                <header>
                  <strong>Live TV</strong>
                  <span className="beta-pill">Beta</span>
                  <button type="button" className="ghost-btn tiny" onClick={() => setLiveTvOpen(false)}>
                    Close
                  </button>
                </header>
                <p>No stream is connected on this build. The control is labelled Beta until a feed URL is wired.</p>
              </div>
            ) : null}
          </div>
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
              clearPersonaPrefs();
              if (typeof location !== 'undefined') location.hash = '#/';
              onLogout?.();
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <DeskNav tab={tab} featureName={featureName} lang={lang} onDesk={onDesk} onFeature={onFeature} tabs={deskTabs} />
      <div className={`workspace${tab === 'home' ? ' home' : ''}${guideMode ? ' desk-guide-mode' : ''}${isConflictsFeature(featureName) ? ' conflicts-holistic' : ''}${isChokepointsFeature(featureName) || isEnergyFeature(featureName) || isNationalFullscreen(featureName) ? ' choke-holistic' : ''}${isGeoResourceDossier(featureName) ? ' geo-holistic' : ''}${isTransitFeature(featureName) ? ' transit-map' : ''}${isNationalFullscreen(featureName) ? ' pig-holistic' : ''}${billRecordOpen ? ' bill-record' : ''}${aiOpen ? ' ai-open' : ''}`}>
        <main className="main-col">
          {tab === 'home' ? (
            <HomeDesk onOpen={onOpen} onFeed={onFeed} onSelect={onSelect} onLoading={onLoading} reload={reload} />
          ) : guideMode ? (
            <DeskGuide
              tab={tab}
              label={hi ? active.labelHi : active.label}
              buckets={deskBuckets}
              onFeature={onFeature}
            />
          ) : (
            <DeskView
              key={`${feedTier}:${featureName}`}
              tier={feedTier}
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
      {tab === 'home' ? <OnboardingTour kind="home" /> : <OnboardingTour kind="desk" deskId={tab} />}
    </div>
  );
}
