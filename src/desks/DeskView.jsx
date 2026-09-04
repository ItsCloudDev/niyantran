import { useEffect, useMemo, useState } from 'react';
import { fetchFeature } from '../lib/featureFeed.js';
import { cellText, feedKindLabel, filterRows, isArticleHref, sortRows } from '../lib/normalise.js';
import { isGithubCsvRow } from '../lib/githubCsv.js';
import { cellOf, feedColumns } from '../lib/columns.js';
import { isConflictsFeature } from '../lib/conflictsMonitor.js';
import { isTransitFeature } from '../lib/transit.js';
import { isAlliancesFeature } from '../lib/alliances.js';
import { isSanctionsFeature } from '../lib/sanctions.js';
import { isGlobalAidFeature } from '../lib/globalAid.js';
import { isChokepointsFeature, isNuclearWatchFeature } from '../lib/strategicAssets.js';
import { isGlobalResourcesTable, isHeadsOfStateFeature, isGlobalCommoditiesFeature } from '../lib/globalResources.js';
import { isEnergyFeature, isGeonomicsTable } from '../lib/geonomics.js';
import {
  isBudgetFeature,
  isDelimitationFeature,
  isIndustryFeature,
  isManifestosFeature,
  isMorningBriefFeature,
  isMpCardsFeature,
  isNationalTable,
  isPolicyGraphFeature,
  isProjectsFeature,
  isStatementsFeature,
} from '../lib/national.js';
import PolicyGraphDesk from './PolicyGraphDesk.jsx';
import MpCardsDesk from './MpCardsDesk.jsx';
import DelimitationDesk from './DelimitationDesk.jsx';
import ManifestosDesk from './ManifestosDesk.jsx';
import BudgetDesk from './BudgetDesk.jsx';
import ProjectsDesk from './ProjectsDesk.jsx';
import MorningBriefDesk from './MorningBriefDesk.jsx';
import StatementsDesk from './StatementsDesk.jsx';
import IndustryDesk from './IndustryDesk.jsx';
import { tenderCloseBand, applyVizFilter } from '../lib/nationalKpi.js';
import FeedLoader from '../shell/FeedLoader.jsx';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';
import TableFilterPop from '../shell/TableFilterPop.jsx';
import ConflictsMonitor from './ConflictsMonitor.jsx';
import TransitDesk from './TransitDesk.jsx';
import AlliancesMonitor from './AlliancesMonitor.jsx';
import SanctionsMonitor from './SanctionsMonitor.jsx';
import GlobalAidMonitor from './GlobalAidMonitor.jsx';
import NuclearWatch from './NuclearWatch.jsx';
import ChokepointsDesk from './ChokepointsDesk.jsx';
import LeadersDesk from './LeadersDesk.jsx';
import CommoditiesDesk from './CommoditiesDesk.jsx';
import EnergyDesk from './EnergyDesk.jsx';

export default function DeskView({
  tier,
  featureName,
  onFeed,
  selected,
  onSelect,
  onLoading,
  reload,
  vizFilter,
  onClearViz,
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const [feed, setFeed] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQ('');
    onSelect(null);
  }, [tier, featureName, onSelect]);

  useEffect(() => {
    if (!featureName) return undefined;
    if (isTransitFeature(featureName)) {
      return undefined;
    }
    if (
      isStatementsFeature(featureName) ||
      isMorningBriefFeature(featureName) ||
      isDelimitationFeature(featureName) ||
      isManifestosFeature(featureName)
    ) {
      setLoading(false);
      onLoading?.(false);
      return undefined;
    }
    const ac = new AbortController();
    setLoading(true);
    onLoading?.(true);
    setErr('');
    fetchFeature({ tier, feature: featureName, signal: ac.signal })
      .then((body) => {
        if (ac.signal.aborted) return;
        setFeed(body);
        onFeed(body);
        onSelect(null);
      })
      .catch((e) => {
        if (e.name === 'AbortError' || ac.signal.aborted) return;
        setErr(e.message || String(e));
        setFeed(null);
        onFeed(null);
      })
      .finally(() => {
        if (ac.signal.aborted) return;
        setLoading(false);
        onLoading?.(false);
      });
    return () => ac.abort();
  }, [tier, featureName, onFeed, onSelect, onLoading, reload]);

  const filtered = useMemo(() => {
    let rows = filterRows(feed?.rows || [], q);
    rows = rows.filter((r) => applyVizFilter(r, vizFilter));
    return sortRows(rows, sort.key || undefined, sort.dir);
  }, [feed, q, sort, vizFilter]);

  const cols = useMemo(() => feedColumns(feed?.feature || featureName, filtered), [feed, featureName, filtered]);
  const statusRow = !loading && feed?.rows?.length === 1 && feed.rows[0]?.status === 'source_status' ? feed.rows[0] : null;
  const kindLabel = loading ? 'LOADING' : feedKindLabel(feed) || '—';
  const liveOn = kindLabel === 'LIVE FEED';

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  if (isTransitFeature(featureName)) {
    return <TransitDesk onFeed={onFeed} onSelect={onSelect} onLoading={onLoading} reload={reload} />;
  }

  if (isAlliancesFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide alliances-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading alliance register…" />}
          {!loading && (
            <AlliancesMonitor
              feed={feed}
              selected={selected}
              onSelect={onSelect}
              flags={feed?.meta?.memberFlags || {}}
              vizFilter={vizFilter}
              onClearViz={onClearViz}
            />
          )}
        </div>
      </div>
    );
  }

  if (isSanctionsFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide alliances-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading sanctions register…" />}
          {!loading && <SanctionsMonitor feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isGlobalAidFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide alliances-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading aid register…" />}
          {!loading && <GlobalAidMonitor feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isNuclearWatchFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide nww-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading nuclear register…" />}
          {!loading && <NuclearWatch feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isChokepointsFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide cpd-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading chokepoint dossier…" />}
          {!loading && <ChokepointsDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isEnergyFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide cpd-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading energy dossier…" />}
          {!loading && <EnergyDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isPolicyGraphFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide desk-res pig-host">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading policy graph…" />}
          {!loading && <PolicyGraphDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isDelimitationFeature(featureName)) {
    return (
      <div className="desk desk-wide desk-res">
        <DelimitationDesk selected={selected} onFeed={onFeed} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
    );
  }

  if (isManifestosFeature(featureName)) {
    return (
      <div className="desk desk-wide desk-res">
        <ManifestosDesk selected={selected} onFeed={onFeed} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
    );
  }

  if (isBudgetFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide desk-res">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading budget figures…" />}
          {!loading && <BudgetDesk selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isProjectsFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide desk-res">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading programmes…" />}
          {!loading && <ProjectsDesk selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isMorningBriefFeature(featureName)) {
    return (
      <div className="desk desk-wide desk-res">
        <MorningBriefDesk onFeed={onFeed} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
    );
  }

  if (isStatementsFeature(featureName)) {
    return (
      <div className="desk desk-wide desk-res">
        <StatementsDesk onFeed={onFeed} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
    );
  }

  if (isMpCardsFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide desk-res">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading MP roster…" />}
          {!loading && <MpCardsDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isIndustryFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide desk-res">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading industry series…" />}
          {!loading && <IndustryDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isIndustryFeature(featureName) && statusRow) {
    return (
      <div className="desk desk-wide desk-res">
        {err && <p className="banner warn">{err}</p>}
        <IndustryDesk feed={feed} statusRow={statusRow} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
    );
  }

  if (isHeadsOfStateFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide gld-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading leader register…" />}
          {!loading && <LeadersDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isGlobalCommoditiesFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide gld-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`alliances-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading commodity board…" />}
          {!loading && <CommoditiesDesk feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  if (isConflictsFeature(featureName) && !statusRow) {
    return (
      <div className="desk desk-wide conflicts-desk">
        {err && <p className="banner warn">{err}</p>}
        <div className={`conflicts-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label="Loading conflict monitor…" />}
          {!loading && <ConflictsMonitor feed={feed} selected={selected} onSelect={onSelect} vizFilter={vizFilter} onClearViz={onClearViz} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`desk desk-wide${isGlobalResourcesTable(featureName) || isGeonomicsTable(featureName) || isNationalTable(featureName) ? ' desk-res' : ''}`}>
      <div className="feed-col compact">
        <div className="feed-head">
          <h1>
            {(feed?.meta?.heading || featureName || 'FEED').toUpperCase()}
            <span className={`live-feed ${liveOn ? 'on' : ''}`}>{kindLabel}</span>
          </h1>
          <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
          {!statusRow && (
            <TableFilterPop
              feed={feed}
              q={q}
              onQ={setQ}
              searchPlaceholder="Search this table"
              vizFilter={vizFilter}
              onClearViz={onClearViz}
              disabled={loading}
            />
          )}
          <span className="muted">
            {loading
              ? 'Fetching…'
              : statusRow
                ? 'No live rows'
                : `${filtered.length}${feed?.rows && filtered.length !== feed.rows.length ? ` / ${feed.rows.length}` : ''} rows${feed?.coverage?.exhaustive ? ' · exhaustive' : ''}`}
          </span>
        </div>
        {err && <p className="banner warn">{err}</p>}
        {feed?.meta?.section && !statusRow && (
          <div className="desk-strip">
            <span>{feed.meta.section}</span>
            {feed.meta.status ? <span>{feed.meta.status}</span> : null}
          </div>
        )}
        {feed?.meta?.note && !statusRow && <p className="desk-note">{feed.meta.note}</p>}
        <div className={`table-wrap${loading ? ' is-loading' : ''}`}>
          {loading && <FeedLoader label={`Loading ${featureName || 'feed'}…`} />}
          {statusRow ? (
            <div className="source-status-card">
              <p className="source-status-kicker">Source status</p>
              <h2>{statusRow.title}</h2>
              <p>{statusRow.detail}</p>
              {statusRow.fail_reason && <p className="muted">Reason: {statusRow.fail_reason}</p>}
              {statusRow.host && <p className="muted">Configured host: {statusRow.host}</p>}
              {feed?.source?.gdelt && (
                <p className="muted">
                  GDELT is a news reporting search, not an official dataset. Nothing was invented to fill this table.
                </p>
              )}
              {feed?.source?.note && !feed.source.gdelt && <p className="muted">{feed.source.note}</p>}
            </div>
          ) : (
            <table className="feed-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key}>
                      <button type="button" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        {sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !filtered.length ? (
                  <tr>
                    <td colSpan={Math.max(cols.length, 1)} className="load-cell">
                      Fetching rows from the feature feed…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length || 1}>No rows in this view.</td>
                  </tr>
                ) : (
                  filtered.slice(0, ['geo-pack', 'law-pack', 'finance-pack', 'carbon-pack'].includes(feed?.source?.kind) || feed?.tier === 'finance' || feed?.tier === 'climate' || feed?.tier === 'sports' || feed?.tier === 'entertainment' ? 2500 : 400).map((row, i) => {
                    const rowId = `${cellOf(row, cols[0] || { key: 'title' })}|${i}`;
                    const on =
                      selected === row ||
                      (selected &&
                        (selected.conflict_name || selected.title) &&
                        (selected.conflict_name || selected.title) === (row.conflict_name || row.title));
                    const close = /central tender/i.test(featureName) ? tenderCloseBand(row) : null;
                    const rowClass = [on ? 'on' : '', close?.tone ? `close-${close.tone}` : ''].filter(Boolean).join(' ');
                    return (
                      <tr
                        key={rowId}
                        className={rowClass}
                        onClick={() => onSelect(on ? null : row)}
                      >
                        {cols.map((c, ci) => {
                          const text = c.key === '_closes' ? tenderCloseBand(row).label : cellOf(row, c);
                          const href =
                            isArticleHref(row.source_url) &&
                            row.status !== 'source_status' &&
                            !isGithubCsvRow(row)
                              ? row.source_url
                              : '';
                          return (
                            <td
                              key={c.key}
                              title={text}
                              className={[c.num ? 'num' : '', c.key === 'station' ? 'station-cell' : ''].filter(Boolean).join(' ') || undefined}
                            >
                              {ci === 0 ? (
                                <span className="name-cell">
                                  <i className="status-dot" />
                                  {href ? (
                                    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                      {cellText(text)}
                                    </a>
                                  ) : (
                                    <span className="name-link">{cellText(text)}</span>
                                  )}
                                </span>
                              ) : c.pill ? (
                                <span className="soft-pill">{cellText(text)}</span>
                              ) : (
                                cellText(text)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
