import { useEffect, useRef, useState } from 'react';
import { applyPersonaForUser } from '../lib/personas.js';
import {
  authenticateUser,
  hydrateUsersFromServer,
  setSessionUser,
  userTypeOf,
} from '../lib/userStore.js';
import { hydrateUserPrefs } from '../lib/userPrefsSync.js';

export default function LoginPage({ onSuccess, onSignup }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [userId, setUserId] = useState('');
  const [pass, setPass] = useState('');
  const root = useRef(null);
  const demoMode =
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('demo') === '1';

  useEffect(() => {
    hydrateUsersFromServer().catch(() => {});
  }, []);

  useEffect(() => {
    if (!demoMode) return;
    setUserId('analyst@niyantran');
    setPass('12345678#');
  }, [demoMode]);

  function onMove(e) {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    el.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    el.style.setProperty('--px', `${((x - 0.5) * 16).toFixed(2)}px`);
    el.style.setProperty('--py', `${((y - 0.5) * 10).toFixed(2)}px`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = String(fd.get('user') || '').trim();
    const pass = String(fd.get('pass') || '');
    setPending(true);
    setError('');
    try {
      await hydrateUsersFromServer();
    } catch {
      /* local-only */
    }
    const res = authenticateUser(user, pass);
    if (res.ok) {
      const type = userTypeOf(res.user.personaId || res.user.type).id;
      applyPersonaForUser({ ...res.user, type, personaId: type });
      setSessionUser({ ...res.user, type, personaId: type });
      sessionStorage.setItem('niyantranLand', userTypeOf(type).startTab);
      await hydrateUserPrefs(res.user.email);
      onSuccess();
      return;
    }
    setError(res.reason || 'Invalid user ID or password.');
    setPending(false);
  }

  return (
    <div className="mkt-login mkt-login-globe" ref={root} onMouseMove={onMove}>
      <div className="mkt-login-art" aria-hidden="true">
        <img className="mkt-login-bg" src="/brand/bg.png?v=1" alt="" />
        <span className="mkt-pr-gridlines mkt-login-grid" />
        <div className="mkt-login-orb">
          <span className="mkt-halo" />
          <img className="mkt-globe mkt-globe-slow" src="/brand/globe.png?v=3" alt="" />
        </div>
        <span className="sh navy" />
        <span className="sh sand" />
        <span className="sh red" />
      </div>
      <main className="mkt-login-card">
        <p className="live">
          <i /> SYS/READY
        </p>
        <div className="mark">
          <img src="/brand/logo.png?v=2" alt="" />
        </div>
        <h1>TERMINAL</h1>
        <div className="tag">DESK ACCESS</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <label className="mkt-field">
            <span>User ID</span>
            <input
              name="user"
              type="text"
              autoComplete="username"
              spellCheck="false"
              required
              autoFocus
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </label>
          <label className="mkt-field">
            <span>Password</span>
            <input
              name="pass"
              type="password"
              autoComplete="current-password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          <button className="mkt-cta" type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="mkt-err" role="alert">
            {error}
          </div>
        </form>
        {demoMode ? (
          <div className="mkt-login-hint">Demo mode (?demo=1): analyst@niyantran / 12345678#</div>
        ) : null}
        <p className="mkt-auth-switch">
          New here?{' '}
          <button type="button" onClick={onSignup}>
            Create an account
          </button>
        </p>
      </main>
    </div>
  );
}
