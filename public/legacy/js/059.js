/* V2PASS88 scatter — for charts that must relate two measures, not re-rank one */(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function nf(v) {
    var a = Math.abs(v);
    if (a >= 100000) return (v / 100000).toFixed(1) + 'L';
    if (a >= 1000) return (v / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
    return String(Math.round(v * 10) / 10);
  }
  function scatter(pts, o) {
    o = o || {};
    var W = 320, H = 208, L = 40, RG = 10, T = 10, BM = 34;
    pts = (pts || []).filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); });
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    s.setAttribute('class', 'ngv-scatter');
    s.style.width = '100%'; s.style.height = 'auto'; s.style.display = 'block'; s.style.margin = '2px 0 10px';
    if (!pts.length) return s;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (o.zero) { x0 = Math.min(0, x0); y0 = Math.min(0, y0); }
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) y1 = y0 + 1;
    var pdx = (x1 - x0) * 0.07, pdy = (y1 - y0) * 0.09;
    x0 -= pdx; x1 += pdx; y0 -= pdy; y1 += pdy;
    function px(v) { return L + (v - x0) / (x1 - x0) * (W - L - RG); }
    function py(v) { return T + (1 - (v - y0) / (y1 - y0)) * (H - T - BM); }
    function ln(a, b, c, d, op, dash) {
      var e = document.createElementNS(NS, 'line');
      e.setAttribute('x1', a); e.setAttribute('y1', b); e.setAttribute('x2', c); e.setAttribute('y2', d);
      e.setAttribute('stroke', 'currentColor'); e.setAttribute('stroke-width', '1');
      e.setAttribute('opacity', op); if (dash) e.setAttribute('stroke-dasharray', dash);
      s.appendChild(e); return e;
    }
    function tx(x, y, t, an) {
      var e = document.createElementNS(NS, 'text');
      e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('font-size', '8.4');
      e.setAttribute('text-anchor', an || 'middle'); e.setAttribute('fill', 'currentColor');
      e.setAttribute('opacity', '.55'); e.textContent = t; s.appendChild(e); return e;
    }
    [0, 0.5, 1].forEach(function (f) {
      var v = y0 + (y1 - y0) * f, y = py(v);
      ln(L, y, W - RG, y, f === 0 ? '.20' : '.09');
      tx(L - 5, y + 3, nf(v), 'end');
    });
    [0, 0.5, 1].forEach(function (f) {
      var v = x0 + (x1 - x0) * f;
      tx(px(v), H - BM + 14, nf(v));
    });
    ln(L, T, L, H - BM, '.20');
    if (o.diagonal) {
      var a = Math.max(x0, y0), b = Math.min(x1, y1);
      if (b > a) ln(px(a), py(a), px(b), py(b), '.34', '3 3');
    }
    pts.forEach(function (p) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', px(p.x)); c.setAttribute('cy', py(p.y)); c.setAttribute('r', o.r || 3.2);
      c.setAttribute('fill', p.c || '#35657A'); c.setAttribute('opacity', '.82');
      var ti = document.createElementNS(NS, 'title'); ti.textContent = p.l || '';
      c.appendChild(ti); s.appendChild(c);
    });
    if (o.xlab) tx(L + (W - L - RG) / 2, H - 5, o.xlab);
    if (o.ylab) {
      var yl = tx(0, 0, o.ylab);
      yl.setAttribute('transform', 'translate(10,' + (T + (H - T - BM) / 2) + ') rotate(-90)');
    }
    return s;
  }
  function ready() {
    if (window.__niyGoaViz) { window.__niyGoaViz.scatter = scatter; return true; }
    return false;
  }
  if (!ready()) { var n = 0, iv = setInterval(function () { if (ready() || ++n > 60) clearInterval(iv); }, 100); }
  window.__niyScatter = scatter;
})();