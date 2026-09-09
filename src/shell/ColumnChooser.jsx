import { useEffect, useRef, useState } from 'react';

/**
 * Optional columns beyond the page-family default (5–7).
 * Reset returns to the default visible set.
 */
export default function ColumnChooser({ allCols = [], visibleKeys = [], onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const defaults = allCols.filter((c) => c.default !== false).map((c) => c.key);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (allCols.length <= 7 && allCols.every((c) => c.default !== false)) return null;

  function toggle(key) {
    const set = new Set(visibleKeys);
    if (set.has(key)) {
      if (set.size <= 1) return;
      set.delete(key);
    } else {
      set.add(key);
    }
    onChange([...set]);
  }

  return (
    <div className="col-chooser" ref={root}>
      <button
        type="button"
        className="ghost-btn tiny"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Columns
      </button>
      {open && (
        <div className="col-chooser-pop" role="dialog" aria-label="Choose columns">
          <p className="col-chooser-hint">Default shows up to seven columns. Extra fields stay here.</p>
          <ul>
            {allCols.map((c) => (
              <li key={c.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleKeys.includes(c.key)}
                    disabled={c.dot && visibleKeys.includes(c.key) && visibleKeys.length === 1}
                    onChange={() => toggle(c.key)}
                  />
                  <span>{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ghost-btn tiny"
            onClick={() => {
              onChange(defaults.slice(0, 7));
              setOpen(false);
            }}
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
