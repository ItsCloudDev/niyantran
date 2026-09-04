import { matrixCellStyle } from '../lib/analytics.js';
import { vizFilterList, vizFilterOn } from '../lib/nationalKpi.js';
import { Icon } from './Icons.jsx';

export function VizCard({ title, hint, children }) {
  return (
    <section className="viz-card">
      <header>
        <i className="viz-mark" />
        <h3>{title}</h3>
        <span className="viz-info" title={hint || 'Counts from this table.'}>
          <Icon name="info" size={14} />
        </span>
      </header>
      {children}
    </section>
  );
}

export function Heatmap({ matrix, onPick, active, rowFilterCol, colFilterCol, colFilterMap }) {
  if (!matrix?.rows?.length) return null;
  const cols = matrix.cols;
  const rowOn = (label) => Boolean(rowFilterCol && vizFilterOn(active, rowFilterCol, label, ''));
  const colOn = (label) => Boolean(colFilterCol && vizFilterOn(active, colFilterCol, label, colFilterMap));
  return (
    <div className="heat">
      <div className="heat-grid" style={{ '--heat-cols': cols.length }}>
        <span className="heat-corner" />
        {cols.map((c) =>
          colFilterCol ? (
            <button
              key={c}
              type="button"
              className={`heat-colh is-filter${colOn(c) ? ' on' : ''}`}
              onClick={() => onPick?.({ filterCol: colFilterCol, filterValue: c, label: c, filterMap: colFilterMap })}
              title={`Filter: ${c}`}
            >
              {String(c)}
            </button>
          ) : (
            <span key={c} className="heat-colh">
              {String(c)}
            </span>
          ),
        )}
        <span className="heat-colh">Σ</span>
        {matrix.rows.flatMap((r) => [
          rowFilterCol ? (
            <button
              key={`${r.label}-h`}
              type="button"
              className={`heat-rowh is-filter${rowOn(r.label) ? ' on' : ''}`}
              onClick={() => onPick?.({ filterCol: rowFilterCol, filterValue: r.label, label: r.label })}
              title={r.label}
            >
              {r.label}
            </button>
          ) : (
            <span key={`${r.label}-h`} className="heat-rowh" title={r.label}>
              {r.label}
            </span>
          ),
          ...r.cells.map((n, i) => (
            <span key={`${r.label}-${cols[i]}`} className="heat-cell" style={matrixCellStyle(cols[i], n, matrix.colMax[i], matrix.sequential)}>
              {n || ''}
            </span>
          )),
          <span key={`${r.label}-s`} className="heat-sum">
            {r.total}
          </span>,
        ])}
        <span className="heat-rowh">Σ</span>
        {matrix.colTotals.map((n, i) => (
          <span key={cols[i]} className="heat-sum">
            {n}
          </span>
        ))}
        <span className="heat-sum grand">{matrix.grand}</span>
      </div>
      {matrix.hidden ? <p className="viz-foot">{matrix.hidden} further regions not shown — ranked by row count.</p> : null}
    </div>
  );
}

export function BarList({ items, onPick, active }) {
  const max = Math.max(1, ...items.map((x) => Math.abs(x.value)));
  return (
    <ul className="bar-list">
      {items.map((it) => {
        const clickable = Boolean(onPick && it.filterCol);
        const on = clickable && vizFilterOn(active, it.filterCol, it.filterValue || it.label, it.filterMap);
        return (
          <li key={it.label}>
            <button
              type="button"
              className={`bar-lab${clickable ? ' is-filter' : ''}${on ? ' on' : ''}`}
              disabled={!clickable}
              aria-pressed={clickable ? on : undefined}
              onClick={() => onPick?.(it)}
              title={it.filterCol ? `Filter feed: ${it.label}` : it.label}
            >
              {it.label}
            </button>
            <span className="bar-track">
              <i className={`bar-fill tone-${it.tone || 'gradient'}`} style={{ width: `${(100 * Math.abs(it.value)) / max}%` }} />
            </span>
            <span className="bar-n">{it.display != null ? it.display : it.value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function VizFilterChip({ vizFilter, onClear }) {
  const list = vizFilterList(vizFilter);
  if (!list.length) return null;
  return (
    <span className="viz-chips">
      {list.map((f) => (
        <button
          key={`${f.col}|${f.map || ''}|${f.value}`}
          type="button"
          className="nls-chip on"
          title="Remove this filter"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('niy-viz-filter', {
                detail: { filterCol: f.col, filterValue: f.value, filterMap: f.map, filterValues: f.values, label: f.value },
              }),
            )
          }
        >
          {f.value} ×
        </button>
      ))}
      {list.length > 1 ? (
        <button type="button" className="nls-chip" onClick={onClear}>
          Clear all
        </button>
      ) : null}
    </span>
  );
}

export function Sparkline({ series, peak, from, through }) {
  if (!series?.length) return null;
  const w = 320;
  const h = 86;
  const max = Math.max(1, ...series.map((p) => p.n));
  const step = series.length > 1 ? (w - 8) / (series.length - 1) : w;
  const pts = series.map((p, i) => {
    const x = 4 + i * step;
    const y = h - 18 - (p.n / max) * (h - 28);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h - 18} L4,${h - 18} Z`;
  return (
    <div className="spark">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Onsets ${from} to ${through}`}>
        <path d={area} className="spark-area" />
        <path d={d} className="spark-line" />
      </svg>
      <div className="spark-axis">
        <span>{from}</span>
        <span>peak {peak?.n ?? 0}</span>
        <span>{through}</span>
      </div>
    </div>
  );
}
