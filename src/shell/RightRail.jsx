import { useEffect, useRef, useState } from 'react';
import FeedLoader from './FeedLoader.jsx';
import { feedOverview } from '../lib/analytics.js';
import { BarList, Heatmap, Sparkline, VizCard } from './AnalyticsViz.jsx';
import RecordDetail from './RecordDetail.jsx';
import AiPanel from '../ai/AiPanel.jsx';
import AlliancesAnalytics from '../desks/AlliancesAnalytics.jsx';
import SanctionsAnalytics from '../desks/SanctionsAnalytics.jsx';
import GlobalAidAnalytics from '../desks/GlobalAidAnalytics.jsx';
import NuclearAnalytics from '../desks/NuclearAnalytics.jsx';
import { isAlliancesFeature } from '../lib/alliances.js';
import { isSanctionsFeature } from '../lib/sanctions.js';
import { isGlobalAidFeature } from '../lib/globalAid.js';
import { isNuclearWatchFeature } from '../lib/strategicAssets.js';
import { isGlobalResourcesTable } from '../lib/globalResources.js';
import { isGeonomicsTable } from '../lib/geonomics.js';
import { isNationalTable } from '../lib/national.js';
import NationalRecord from '../desks/NationalRecord.jsx';

function recordLabel(row) {
  return String(row?.conflict_name || row?.title || row?.bill_name || row?.name || '').trim();
}

export default function RightRail({ feed, selected, onSelect, lang, loading, vizFilter }) {
  const [tab, setTab] = useState('analytics');
  const bodyRef = useRef(null);
  const hi = lang === 'hi';
  const overview = feedOverview(feed);
  const gdelt = Boolean(feed?.source?.gdelt);
  const status = feed?.rows?.[0]?.status === 'source_status';
  const alliances = isAlliancesFeature(feed?.feature);
  const sanctions = isSanctionsFeature(feed?.feature);
  const aid = isGlobalAidFeature(feed?.feature);
  const nuclear = isNuclearWatchFeature(feed?.feature);
  const indicators =
    /^infra$/i.test(feed?.feature || '') ||
    /^satellite infrastructure$/i.test(feed?.feature || '') ||
    isGlobalResourcesTable(feed?.feature) ||
    isGeonomicsTable(feed?.feature) ||
    isNationalTable(feed?.feature);
  const dossier = alliances || sanctions || aid || nuclear;
  const analyticsTitle = dossier ? 'EVENT ANALYTICS' : overview.title;

  useEffect(() => {
    if (selected) setTab('analytics');
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [selected]);

  return (
    <aside className="right-rail">
      <div className="rail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'analytics'}
          className={tab === 'analytics' ? 'on' : ''}
          onClick={() => setTab('analytics')}
          title={selected ? recordLabel(selected) : overview.title}
        >
          {analyticsTitle}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ai'}
          className={tab === 'ai' ? 'on' : ''}
          onClick={() => setTab('ai')}
        >
          {hi ? 'एआई अनुसंधान' : 'AI research'}
        </button>
      </div>
      {tab === 'ai' ? (
        <AiPanel feed={feed} selected={selected} lang={lang} />
      ) : (
        <div ref={bodyRef} className={`rail-body${loading ? ' is-loading' : ''}${selected ? ' rd-body' : ''}`}>
          {loading && <FeedLoader label="Updating overview…" />}
          {gdelt && <p className="banner warn">GDELT reporting search — not an official dataset.</p>}
          {feed?.fallback && !status && (
            <p className="banner">Live call did not return rows. Charts below use last-known-good archive.</p>
          )}
          {status && (
            <p className="banner">
              Labelled source status only. No records were invented.
              {feed?.rows?.[0]?.host ? ` Configured host: ${feed.rows[0].host}.` : ''}
            </p>
          )}

          {selected && isNationalTable(feed?.feature) ? (
            <NationalRecord
              row={selected}
              feature={feed?.feature}
              rows={feed?.rows || []}
              meta={feed?.meta}
              liveCount={(feed?.rows || []).filter((r) => r.status !== 'source_status').length}
              onClear={() => onSelect?.(null)}
              onAskAi={() => setTab('ai')}
            />
          ) : selected && alliances ? (
            <AlliancesAnalytics
              row={selected}
              rows={feed?.rows || []}
              flags={feed?.meta?.memberFlags || {}}
              onSelect={onSelect}
              onResearch={() => setTab('ai')}
            />
          ) : selected && sanctions ? (
            <SanctionsAnalytics row={selected} onResearch={() => setTab('ai')} />
          ) : selected && aid ? (
            <GlobalAidAnalytics
              row={selected}
              rows={feed?.rows || []}
              onSelect={onSelect}
              onResearch={() => setTab('ai')}
            />
          ) : selected && nuclear ? (
            <NuclearAnalytics
              row={selected}
              rows={feed?.rows || []}
              onSelect={onSelect}
              onResearch={() => setTab('ai')}
            />
          ) : selected && !indicators ? (
            <>
              <RecordDetail row={selected} feed={feed} onClear={() => onSelect?.(null)} />
              <h3 className="rd-charts-label">{overview.title}</h3>
            </>
          ) : !indicators ? (
            <p className="rail-empty">Select a row in the feed to inspect the record.</p>
          ) : null}

          {!dossier && !(selected && isNationalTable(feed?.feature)) && (
            <>
              <div className="kpi-grid">
                {overview.kpis.map((k) => (
                  <article key={k.label} className={`kpi-card${k.tone === 'ok' ? ' ok' : k.tone === 'warn' ? ' warn' : k.tone === 'bad' ? ' bad' : ''}`}>
                    <h3>{k.label}</h3>
                    <strong>{k.value}</strong>
                    <span>{k.sub}</span>
                  </article>
                ))}
              </div>
              {overview.charts.map((c) => (
                <VizCard key={c.title} title={c.title} hint={c.hint}>
                  {c.type === 'matrix' && (
                    <Heatmap
                      matrix={c.matrix}
                      active={vizFilter}
                      rowFilterCol={c.rowFilterCol}
                      colFilterCol={c.colFilterCol}
                      colFilterMap={c.colFilterMap}
                      onPick={(it) => {
                        window.dispatchEvent(new CustomEvent('niy-viz-filter', { detail: it }));
                      }}
                    />
                  )}
                  {c.type === 'bars' && (
                    <BarList
                      items={c.items}
                      active={vizFilter}
                      onPick={(it) => {
                        window.dispatchEvent(new CustomEvent('niy-viz-filter', { detail: it }));
                      }}
                    />
                  )}
                  {c.type === 'spark' && (
                    <Sparkline series={c.series} peak={c.peak} from={c.from} through={c.through} />
                  )}
                  {c.type === 'note' && <p className="viz-foot">{c.hint}</p>}
                </VizCard>
              ))}
              {overview.note ? <p className="desk-note">{overview.note}</p> : null}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
