import { useState } from 'react';
import { LS18_FACTS } from '../data/nationalCurated.js';
import { applyVizFilter } from '../lib/nationalKpi.js';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';
import TableFilterPop from '../shell/TableFilterPop.jsx';

export default function MpCardsDesk({ feed, selected, onSelect, vizFilter, onClearViz }) {
  const rows = feed?.rows || [];
  const [q, setQ] = useState('');
  const filtered = rows.filter((r) => {
    if (!applyVizFilter(r, vizFilter)) return false;
    if (!q.trim()) return true;
    const hay = `${r.mp_name || ''} ${r.constituency || ''} ${r.party || ''} ${r.state || ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="nat-mp">
      <div className="feed-head">
        <h1>MP REPORT CARDS</h1>
        <span className="live-feed">{filtered.length} members</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
        <TableFilterPop
          feed={feed}
          q={q}
          onQ={setQ}
          searchPlaceholder="Search name or constituency"
          vizFilter={vizFilter}
          onClearViz={onClearViz}
        />
      </div>
      <div className="desk-strip">
        <span>18TH LOK SABHA — COMPOSITION REFERENCE + MEMBER REGISTER</span>
        <span>CURATED · PUBLIC RECORD · AS OF THE 2024 ELECTION</span>
      </div>
      <div className="nat-facts">
        {LS18_FACTS.map(([m, v, n]) => (
          <article key={m}>
            <h3>{m}</h3>
            <strong>{v}</strong>
            <span>{n}</span>
          </article>
        ))}
      </div>
      <p className="desk-note">
        Attendance is empty in every register row — that is a source gap, not zero attendance. Tenure and 1947–present lists need a
        historical corpus this CSV does not carry.
      </p>
      <div className="nat-mp-grid">
        {filtered.slice(0, 400).map((r, i) => {
          const name = r.mp_name || r.name || r.title || 'Member';
          const on = selected === r;
          const committees = r.committees && String(r.committees).trim();
          return (
            <button key={r.id || `${name}|${i}`} type="button" className={`nat-mp-card${on ? ' on' : ''}`} onClick={() => onSelect?.(r)}>
              <strong>{name}</strong>
              <span>{[r.party, r.constituency || r.state].filter(Boolean).join(' · ') || r.house || '—'}</span>
              <em>
                {r.questions_asked ? `${r.questions_asked} questions` : ''}
                {committees ? ` · ${String(committees).split(';')[0]}` : r.questions_asked ? '' : 'committees not recorded in this dataset'}
              </em>
            </button>
          );
        })}
      </div>
    </div>
  );
}
