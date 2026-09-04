import { useEffect, useState } from 'react';
import { applyVizFilter } from '../lib/nationalKpi.js';
import TableFilterPop from '../shell/TableFilterPop.jsx';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';

function parseRssItems(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return [...doc.querySelectorAll('item')].map((it) => {
    const g = (k) => it.querySelector(k)?.textContent?.trim() || '';
    return { title: g('title'), source_url: g('link'), date: g('pubDate'), source: 'PIB' };
  }).filter((x) => x.title);
}

export default function MorningBriefDesk({ onSelect, onFeed, vizFilter, onClearViz }) {
  const [top, setTop] = useState({ rows: [], err: '' });
  const [pib, setPib] = useState({ rows: [], err: '' });
  const [eco, setEco] = useState({ rows: [], err: '' });
  const [q, setQ] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    const gdelt = (q) =>
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=12`;
    const mapArts = (j) =>
      (j?.articles || []).map((a) => ({
        title: a.title,
        date: a.seendate,
        source_url: a.url,
        reporting_search: 'GDELT DOC 2.0 — news reporting search, not an official dataset',
      }));

    fetch(`/api/rss?url=${encodeURIComponent(gdelt('sourcecountry:IN (India OR government OR parliament)'))}`, { signal: ac.signal })
      .then((r) => r.text())
      .then((t) => setTop({ rows: mapArts(JSON.parse(t)), err: '' }))
      .catch(() => setTop({ rows: [], err: 'GDELT wire unreachable from this network — it will retry automatically.' }));

    fetch(`/api/rss?url=${encodeURIComponent('https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3')}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error('offline');
        return r.text();
      })
      .then((xml) => {
        const rows = parseRssItems(xml);
        if (!rows.length) throw new Error('empty');
        setPib({ rows, err: '' });
      })
      .catch(() => setPib({ rows: [], err: 'PIB releases arrive through the backend (/api/rss) and it is not reachable.' }));

    fetch(`/api/rss?url=${encodeURIComponent(gdelt('(economy OR RBI OR rupee OR markets) sourcecountry:IN'))}`, { signal: ac.signal })
      .then((r) => r.text())
      .then((t) => setEco({ rows: mapArts(JSON.parse(t)), err: '' }))
      .catch(() => setEco({ rows: [], err: 'GDELT wire unreachable from this network — it will retry automatically.' }));

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const rows = [...top.rows, ...pib.rows, ...eco.rows];
    onFeed?.({
      ok: true,
      tier: 'national',
      feature: 'National Morning Brief (Auto-digest)',
      rows,
      source: { adapter: pib.err ? 'news-search' : 'live', gdelt: true, note: 'Panel, not a table. PIB labelled offline when unreachable.' },
      coverage: { through: '7d' },
      fallback: Boolean(top.err || pib.err),
      meta: {
        heading: 'MORNING BRIEF',
        items: rows.length,
        pib: pib.err ? 'OFFLINE' : String(pib.rows.length),
        ministries: pib.rows.length ? 'PIB window' : 'PIB offline',
      },
    });
  }, [top, pib, eco, onFeed]);

  function match(r) {
    if (!applyVizFilter(r, vizFilter)) return false;
    if (!q.trim()) return true;
    return `${r.title || ''} ${r.source || ''}`.toLowerCase().includes(q.trim().toLowerCase());
  }

  function Block({ title, pack }) {
    const rows = (pack.rows || []).filter(match);
    return (
      <section className="nat-brief-sec">
        <h2>{title}</h2>
        {pack.err ? <p className="banner warn">{pack.err}</p> : null}
        <ul>
          {rows.slice(0, 12).map((r, i) => (
            <li key={r.source_url || i}>
              <button type="button" onClick={() => onSelect?.(r)}>
                {r.title}
              </button>
              <span>{r.date || r.source || ''}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const items = top.rows.length + pib.rows.length + eco.rows.length;

  return (
    <div className="nat-panel">
      <div className="feed-head">
        <h1>MORNING BRIEF</h1>
        <span className="live-feed">{items ? `${items} ITEMS` : 'OFFLINE'}</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
        <TableFilterPop
          feed={{ feature: 'National Morning Brief (Auto-digest)', rows: [...top.rows, ...pib.rows, ...eco.rows] }}
          q={q}
          onQ={setQ}
          searchPlaceholder="Search headlines"
          vizFilter={vizFilter}
          onClearViz={onClearViz}
        />
      </div>
      <p className="desk-note">
        Three sections: Top of the Day (India), Government Wire (PIB), Economy (India). Nothing classifies a story into Politics / Sports /
        Tech today. Sports already has its own tier.
      </p>
      <Block title="Top of the Day — India" pack={top} />
      <Block title="Government Wire — PIB" pack={pib} />
      <Block title="Economy — India" pack={eco} />
    </div>
  );
}
