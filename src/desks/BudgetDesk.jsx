import { BUDGET_KEY, BUDGET_SCHEMES } from '../data/nationalCurated.js';
import { applyVizFilter } from '../lib/nationalKpi.js';
import { VizFilterChip } from '../shell/AnalyticsViz.jsx';
import TableFilterPop from '../shell/TableFilterPop.jsx';

export default function BudgetDesk({ selected, onSelect, vizFilter, onClearViz }) {
  const all = BUDGET_SCHEMES.map(([scheme, allocation_cr]) => ({
    scheme,
    allocation_cr,
    title: scheme,
  }));
  const schemeRows = all.filter((r) => applyVizFilter(r, vizFilter));
  const feed = { feature: 'Budget Utilisation Tracker', rows: all };
  return (
    <div className="nat-panel">
      <div className="feed-head">
        <h1>BUDGET & SCHEMES</h1>
        <span className="live-feed">CURATED</span>
        <VizFilterChip vizFilter={vizFilter} onClear={onClearViz} />
        <TableFilterPop feed={feed} vizFilter={vizFilter} onClearViz={onClearViz} />
      </div>
      <div className="desk-strip">
        <span>UNION BUDGET 2025–26 — KEY NUMBERS</span>
        <span>CURATED · VERIFY AGAINST INDIABUDGET.GOV.IN · PDF IS AUTHORITATIVE</span>
      </div>
      <div className="table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Value</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_KEY.map(([measure, value, note]) => (
              <tr key={measure}>
                <td>{measure}</td>
                <td className="num">{value}</td>
                <td>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="nat-subh">Major scheme allocations — 2025–26 BE</h3>
      <p className="desk-note">APPROXIMATE. Allocation only — no actuals, no BE vs RE, no unutilised balance. Scheme-level utilisation is refuted.</p>
      <div className="table-wrap">
        <table className="feed-table">
          <thead>
            <tr>
              <th>Scheme</th>
              <th>Allocation (₹ crore, approx.)</th>
            </tr>
          </thead>
          <tbody>
            {schemeRows.map((r) => (
              <tr key={r.scheme} className={selected?.scheme === r.scheme ? 'on' : ''} onClick={() => onSelect?.(r)}>
                <td>{r.scheme}</td>
                <td className="num">~{r.allocation_cr.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
