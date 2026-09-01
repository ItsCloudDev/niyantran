import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_ALIASES, countryKey } from '../lib/alliances.js';

const GEOJSON =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson';

let geoPromise = null;
function loadGeo() {
  if (!geoPromise) {
    geoPromise = fetch(GEOJSON, { mode: 'cors' }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }
  return geoPromise;
}

function pt(c) {
  return [((Number(c[0]) + 180) / 360) * 1000, ((90 - Number(c[1])) / 180) * 500];
}
function rings(g) {
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.reduce((a, p) => a.concat(p), []);
  return [];
}
function pathD(g) {
  return rings(g)
    .map((r) =>
      r
        .map((c, i) => {
          const q = pt(c);
          return `${i ? 'L' : 'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`;
        })
        .join('') + 'Z',
    )
    .join('');
}
function bboxOf(g) {
  const b = [1e9, 1e9, -1e9, -1e9];
  rings(g).forEach((r) => {
    r.forEach((c) => {
      const q = pt(c);
      b[0] = Math.min(b[0], q[0]);
      b[1] = Math.min(b[1], q[1]);
      b[2] = Math.max(b[2], q[0]);
      b[3] = Math.max(b[3], q[1]);
    });
  });
  return b;
}
function featureKeys(f) {
  const p = f.properties || {};
  return [p.ADMIN, p.NAME, p.NAME_LONG, p.SOVEREIGNT, p.FORMAL_EN, p.GEOUNIT, p.NAME_EN, p.ISO_A3]
    .filter(Boolean)
    .map((v) => countryKey(v, COUNTRY_ALIASES));
}

export default function GeoHeatMap({ records, title, subtitle, legend, fit = true, onPick, ariaLabel }) {
  const rootRef = useRef(null);
  const [fc, setFc] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState([0, 0, 1000, 500]);
  const [home, setHome] = useState([0, 0, 1000, 500]);
  const [tip, setTip] = useState(null);
  const drag = useRef(null);
  const byKey = useMemo(() => {
    const m = {};
    (records || []).forEach((r) => {
      if (r?.country) m[countryKey(r.country, COUNTRY_ALIASES)] = r;
    });
    return m;
  }, [records]);

  useEffect(() => {
    let on = true;
    loadGeo()
      .then((g) => {
        if (on) setFc(g);
      })
      .catch((e) => {
        if (on) setErr(e.message || String(e));
      });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (!fc) return;
    const matches = [];
    for (const f of fc.features || []) {
      if (featureKeys(f).some((k) => byKey[k])) matches.push(f);
    }
    let next = [0, 0, 1000, 500];
    if (fit !== false && matches.length && matches.length < 80) {
      const b = [1e9, 1e9, -1e9, -1e9];
      matches.forEach((f) => {
        const x = bboxOf(f.geometry);
        b[0] = Math.min(b[0], x[0]);
        b[1] = Math.min(b[1], x[1]);
        b[2] = Math.max(b[2], x[2]);
        b[3] = Math.max(b[3], x[3]);
      });
      const w = b[2] - b[0];
      const hh = b[3] - b[1];
      if (w < 720 && hh < 390) {
        const pad = Math.max(18, Math.max(w, hh) * 0.12);
        next = [Math.max(0, b[0] - pad), Math.max(0, b[1] - pad), Math.min(1000, w + pad * 2), Math.min(500, hh + pad * 2)];
      }
    }
    setHome(next);
    setView(next);
  }, [fc, byKey, fit]);

  function zoom(kind) {
    if (kind === 'fit') {
      setView(home.slice());
      return;
    }
    const f = kind === 'in' ? 0.78 : 1.28;
    const cx = view[0] + view[2] / 2;
    const cy = view[1] + view[3] / 2;
    const nw = Math.max(45, Math.min(1000, view[2] * f));
    const nh = Math.max(24, Math.min(500, view[3] * f));
    setView([Math.max(0, Math.min(1000 - nw, cx - nw / 2)), Math.max(0, Math.min(500 - nh, cy - nh / 2)), nw, nh]);
  }

  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY, v: view.slice() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    const rr = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / rr.width) * drag.current.v[2];
    const dy = ((e.clientY - drag.current.y) / rr.height) * drag.current.v[3];
    const v = drag.current.v;
    setView([
      Math.max(0, Math.min(1000 - v[2], v[0] - dx)),
      Math.max(0, Math.min(500 - v[3], v[1] - dy)),
      v[2],
      v[3],
    ]);
  }

  return (
    <div className={`niy-geoheat${fc ? ' is-ready' : ''}`} ref={rootRef}>
      <div className="niy-gh-top">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      <svg
        viewBox={view.join(' ')}
        preserveAspectRatio="xMidYMid meet"
        aria-label={ariaLabel || title}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {(fc?.features || []).map((f, i) => {
          let rec = null;
          for (const k of featureKeys(f)) {
            if (byKey[k]) {
              rec = byKey[k];
              break;
            }
          }
          const n = (f.properties && (f.properties.NAME_EN || f.properties.ADMIN || f.properties.NAME)) || '';
          return (
            <path
              key={i}
              className={`niy-gh-country${rec ? ' is-member' : ''}${rec?.focus ? ' is-focus' : ''}`}
              d={pathD(f.geometry)}
              style={rec ? { fill: rec.color } : undefined}
              onClick={() => {
                if (rec && onPick) onPick(rec);
              }}
              onMouseMove={(e) => {
                if (!rec || !rootRef.current) return;
                const rr = rootRef.current.getBoundingClientRect();
                setTip({
                  x: Math.min(rr.width - 230, Math.max(8, e.clientX - rr.left + 12)),
                  y: Math.min(rr.height - 62, Math.max(42, e.clientY - rr.top + 12)),
                  rec,
                  n,
                });
              }}
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
      </svg>
      <div className="niy-gh-controls">
        <button type="button" onClick={() => zoom('in')} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoom('out')} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => zoom('fit')}>
          Fit
        </button>
      </div>
      {tip && (
        <div className="niy-gh-tip show" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.rec.country}</b>
          <span>
            {tip.rec.label}
            {tip.rec.detail ? ` · ${tip.rec.detail}` : ''}
          </span>
        </div>
      )}
      <div className="niy-gh-loading">{err ? 'Country boundary layer unavailable · retry when online' : 'Loading verified country boundaries…'}</div>
      <div className="niy-gh-legend">
        {(legend || []).map(([l, c]) => (
          <span key={l}>
            <i style={{ '--gh': c }} />
            {l}
          </span>
        ))}
      </div>
      <a className="niy-gh-source" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
        Natural Earth · public-domain boundaries ↗
      </a>
    </div>
  );
}
