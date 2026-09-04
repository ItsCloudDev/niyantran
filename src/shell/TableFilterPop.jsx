import { useEffect, useMemo, useRef, useState } from 'react';
import { tableFilterGroups } from '../lib/analytics.js';
import { vizFilterList, vizFilterOn } from '../lib/nationalKpi.js';
import { Icon } from './Icons.jsx';

export function selectedValues(current, allValue = '') {
  if (Array.isArray(current)) return current;
  if (current == null || current === '' || current === allValue || current === 'all' || current === 'All') return [];
  return [current];
}

export function matchesChoice(current, value, allValue = '') {
  const sel = selectedValues(current, allValue);
  if (!sel.length) return true;
  return sel.map(String).includes(String(value));
}

export function choiceGroup(title, values, current, setCurrent, { allValue = '', allLabel = 'All' } = {}) {
  const opts = values.map((v) => (v && typeof v === 'object' ? v : { value: v, label: v }));
  const selected = selectedValues(current, allValue);
  return {
    id: title,
    title,
    options: [
      { label: allLabel, on: selected.length === 0, onPick: () => setCurrent(allValue) },
      ...opts.map((o) => ({
        label: o.label,
        on: selected.map(String).includes(String(o.value)),
        onPick: () => {
          const has = selected.map(String).includes(String(o.value));
          const next = has ? selected.filter((x) => String(x) !== String(o.value)) : [...selected, o.value];
          setCurrent(next.length ? next : allValue);
        },
      })),
    ],
  };
}

export default function TableFilterPop({
  feed,
  groups: groupsProp,
  extraGroups,
  q,
  onQ,
  searchPlaceholder = 'Search this table',
  vizFilter,
  onClearViz,
  disabled,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const feedGroups = useMemo(() => {
    if (groupsProp) return groupsProp;
    if (!feed) return [];
    return tableFilterGroups(feed);
  }, [feed, groupsProp]);
  const groups = useMemo(() => [...feedGroups, ...(extraGroups || [])], [feedGroups, extraGroups]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const extraOn = (extraGroups || []).some((g) => g.options?.some((o, i) => i > 0 && o.on));
  const list = vizFilterList(vizFilter);
  const active = Boolean(q?.trim() || list.length || extraOn);

  function pick(opt) {
    if (typeof opt.onPick === 'function') {
      opt.onPick();
      return;
    }
    window.dispatchEvent(new CustomEvent('niy-viz-filter', { detail: opt }));
  }

  function clearAll() {
    onQ?.('');
    onClearViz?.();
    (extraGroups || []).forEach((g) => g.options?.[0]?.onPick?.());
  }

  return (
    <div className={`tbl-filter ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className={`tbl-filter-btn${open || active ? ' on' : ''}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Table filters"
        title="Filters"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="filter" size={15} />
        {active ? <i className="tbl-filter-dot" /> : null}
      </button>
      {open ? (
        <div className="tbl-filter-pop" role="dialog" aria-label="Table filters">
          {onQ ? (
            <label className="tbl-filter-search">
              <Icon name="search" size={14} />
              <input
                value={q || ''}
                onChange={(e) => onQ(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                autoFocus
              />
            </label>
          ) : null}
          {active ? (
            <button type="button" className="tbl-filter-clear" onClick={clearAll}>
              Clear filters
            </button>
          ) : null}
          {groups.map((g) => (
            <div key={g.id || g.title} className="tbl-filter-group">
              <h4>{g.title}</h4>
              <div className="tbl-filter-opts">
                {g.options.map((opt) => {
                  const on =
                    opt.on ??
                    vizFilterOn(vizFilter, opt.filterCol || g.col, opt.filterValue || opt.label, opt.filterMap || g.map);
                  return (
                    <button key={`${opt.filterCol || g.col || ''}|${opt.label}`} type="button" className={on ? 'on' : ''} onClick={() => pick(opt)}>
                      <span>{opt.label}</span>
                      {opt.n != null ? <em>{opt.n}</em> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!groups.length && !onQ ? <p className="tbl-filter-empty">No filters for this table.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
