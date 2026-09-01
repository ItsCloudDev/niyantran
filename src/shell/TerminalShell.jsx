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

export default function TerminalShell() {
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

  const active = TABS.find((t) => t.id === tab) || TABS[0];
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
        const next = { col: it.filterCol, value: it.filterValue || it.label, values: it.filterValues };
        if (prev && prev.col === next.col && String(prev.value) === String(next.value)) return null;
        return next;
      });
    }
    window.addEventListener('niy-viz-filter', onViz);
    return () => window.removeEventListener('niy-viz-filter', onViz);
  }, []);

  useEffect(() => {
    setVizFilter(null);
  }, [tab, featureName]);

  useEffect(() => {
    const r = parseDeskHash();
    if (r.tab === 'home' && !(typeof location !== 'undefined' && location.hash)) return undefined;
    writeDeskHash(r.tab, r.feature, { replace: true });
    return undefined;
  }, []);

  useEffect(() => {
    function onPop() {
      const r = parseDeskHash();
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
  }, []);

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return catalogModules()
      .filter((m) => `${m.htmlFeature} ${m.bucket} ${m.htmlTier}`.toLowerCase().includes(n))
      .slice(0, 12);
  }, [q]);

  function onDesk(id) {
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
    const r = resolveDeskRoute(nextTab, feature);
    setTab(r.tab);
    setFeatureName(r.feature);
    setQ('');
    setSelected(null);
    writeDeskHash(r.tab, r.feature);
  }

  function openHit(mod) {
    const dest = TABS.find((t) => t.tier === mod.htmlTier);
    onOpen({ tab: dest?.id || 'national', feature: mod.htmlFeature });
  }

  const billRecordOpen = (isImpactRecordFeature(featureName) || isGithubCsvRow(selected)) && selected;

  return (
    <div className={`terminal theme-${theme}`}>
      <div className={`load-bar${loading ? ' on' : ''}`} />
      <header className="topbar">
        <div className="brand" title="Niyantran">
          <i className="brand-mark">N</i>
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
          <span className="avatar" title="analyst@niyantran">
            A
          </span>
        </div>
      </header>
      <DeskNav tab={tab} featureName={featureName} lang={lang} onDesk={onDesk} onFeature={onFeature} />
      <div className={`workspace${tab === 'home' ? ' home' : ''}${isConflictsFeature(featureName) ? ' conflicts-holistic' : ''}${isChokepointsFeature(featureName) || isEnergyFeature(featureName) || isNationalFullscreen(featureName) ? ' choke-holistic' : ''}${isGeoResourceDossier(featureName) ? ' geo-holistic' : ''}${isTransitFeature(featureName) ? ' transit-map' : ''}${isNationalFullscreen(featureName) ? ' pig-holistic' : ''}${billRecordOpen ? ' bill-record' : ''}`}>
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
        {tab !== 'home' && !isConflictsFeature(featureName) && !isChokepointsFeature(featureName) && !isEnergyFeature(featureName) && !isGeoResourceDossier(featureName) && !isNationalFullscreen(featureName) && (
          <RightRail feed={feed} selected={selected} onSelect={onSelect} lang={lang} loading={loading} vizFilter={vizFilter} />
        )}
      </div>
    </div>
  );
}
