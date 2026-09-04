import { useEffect, useRef, useState } from 'react';
import { authenticateUser } from '../lib/userStore.js';

const TICKS = [
  'GLOBAL',
  'NATIONAL',
  'LAW',
  'ECONOMICS',
  'CARBON',
  'SPORTS',
  'ENTERTAINMENT',
  'BRAIN',
  'LEGISLATIVE',
  'ELECTORAL',
];

function Field({ mouse }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pal = ['#012ea1', '#4f1d90', '#c81322', '#176b55'];
    const nodes = Array.from({ length: 56 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00042,
      vy: (Math.random() - 0.5) * 0.00042,
      r: 1.1 + Math.random() * 1.7,
      c: pal[i % pal.length],
    }));
    let raf = 0;

    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    function frame() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      if (!reduced) {
        const mx = mouse.current.x;
        const my = mouse.current.y;
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
          n.x = Math.min(1, Math.max(0, n.x));
          n.y = Math.min(1, Math.max(0, n.y));
          const dx = mx - n.x;
          const dy = my - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.045 && d2 > 0.0002) {
            n.x += dx * 0.012;
            n.y += dy * 0.012;
          }
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (d > 150) continue;
          ctx.strokeStyle = `rgba(1,46,161,${0.22 * (1 - d / 150)})`;
          ctx.beginPath();
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.c;
        ctx.globalAlpha = 0.62;
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mouse]);

  return <canvas ref={ref} className="mkt-login-canvas" aria-hidden="true" />;
}

export default function LoginPage({ onSuccess }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const mouse = useRef({ x: 0.72, y: 0.42 });
  const root = useRef(null);

  function onMove(e) {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    mouse.current = { x, y };
    el.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    el.style.setProperty('--px', `${((x - 0.5) * 28).toFixed(2)}px`);
    el.style.setProperty('--py', `${((y - 0.5) * 18).toFixed(2)}px`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = String(fd.get('user') || '').trim();
    const pass = String(fd.get('pass') || '');
    setPending(true);
    setError('');
    const res = authenticateUser(user, pass);
    if (res.ok) {
      sessionStorage.setItem('niyantranAuthed', '1');
      sessionStorage.setItem('niyantranUser', res.user.email);
      onSuccess();
      return;
    }
    setError(res.reason || 'Invalid user ID or password.');
    setPending(false);
  }

  return (
    <div className="mkt-login" ref={root} onMouseMove={onMove}>
      <div className="mkt-login-art" aria-hidden="true">
        <Field mouse={mouse} />
        <span className="grid" />
        <span className="spot" />
        <span className="scan" />
        <span className="radar">
          <i />
        </span>
        <span className="ring r1" />
        <span className="ring r2" />
        <span className="ring r3" />
        <span className="sat s1" />
        <span className="sat s2" />
        <span className="sh navy" />
        <span className="sh sand" />
        <span className="sh purple" />
        <span className="sh red" />
        <div className="ticks">
          <div>
            {[...TICKS, ...TICKS].map((t, i) => (
              <span key={`${t}-${i}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <main className="mkt-login-card">
        <p className="live">
          <i /> SYS/READY
        </p>
        <div className="mark">
          <img src="/brand/logo.png?v=2" alt="" />
        </div>
        <h1>TERMINAL</h1>
        <div className="tag">ANALYST ACCESS</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <label className="mkt-field">
            <span>User ID</span>
            <input name="user" type="text" autoComplete="username" spellCheck="false" required autoFocus />
          </label>
          <label className="mkt-field">
            <span>Password</span>
            <input name="pass" type="password" autoComplete="current-password" required />
          </label>
          <button className="mkt-cta" type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="mkt-err" role="alert">
            {error}
          </div>
        </form>
        <div className="mkt-login-hint">Restricted terminal. Sign in with an issued analyst ID.</div>
      </main>
    </div>
  );
}
