import { useEffect, useMemo, useRef, useState } from 'react';
import { PERSONAS, applyPersonaForUser } from '../lib/personas.js';
import {
  createUser,
  hydrateUsersFromServer,
  setSessionUser,
  userTypeOf,
} from '../lib/userStore.js';
import { trackProductEvent } from '../lib/productAnalytics.js';
import { normalizePlanId, startTrialFields, TRIAL_DAYS } from '../lib/planEntitlements.js';
import { loadPricing } from '../lib/pricingStore.js';
import { hydrateUserPrefs } from '../lib/userPrefsSync.js';

function planFromRoute() {
  const raw = String(location.hash || '')
    .replace(/^#/, '')
    .replace(/^\/+/, '')
    .toLowerCase();
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  const params = new URLSearchParams(q);
  const fromQuery = params.get('plan');
  if (fromQuery) return normalizePlanId(fromQuery);
  const parts = raw.split(/[/?#]/).filter(Boolean);
  if (parts[0] === 'signup' && parts[1]) return normalizePlanId(parts[1]);
  return 'explorer';
}

export default function SignupPage({ onSuccess, onLogin }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [personaId, setPersonaId] = useState('');
  const [planId, setPlanId] = useState(() => planFromRoute());
  const root = useRef(null);
  const plans = useMemo(() => loadPricing().filter((p) => p.id !== 'gov'), []);

  useEffect(() => {
    hydrateUsersFromServer().catch(() => {});
  }, []);

  useEffect(() => {
    const sync = () => setPlanId(planFromRoute());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

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
    const name = String(fd.get('name') || '').trim();
    const user = String(fd.get('user') || '').trim();
    const pass = String(fd.get('pass') || '');
    const pass2 = String(fd.get('pass2') || '');
    setPending(true);
    setError('');

    if (!personaId) {
      setError('Choose who you are working as.');
      setPending(false);
      return;
    }
    if (pass !== pass2) {
      setError('Passwords do not match.');
      setPending(false);
      return;
    }

    try {
      await hydrateUsersFromServer();
    } catch {
      /* local-only */
    }

    const planFields = startTrialFields(planId);
    const res = createUser({
      name,
      email: user,
      password: pass,
      type: personaId,
      personaId,
      ...planFields,
    });
    if (!res.ok) {
      setError(res.reason || 'Could not create account.');
      setPending(false);
      return;
    }

    const type = userTypeOf(res.user.type).id;
    applyPersonaForUser(res.user);
    setSessionUser({ ...res.user, type, personaId: type });
    sessionStorage.setItem('niyantranLand', userTypeOf(type).startTab);
    trackProductEvent('persona_selected', { personaId: type, source: 'signup', plan: planFields.plan });
    trackProductEvent('plan_selected', { plan: planFields.plan, status: planFields.planStatus });
    await hydrateUserPrefs(res.user.email);
    onSuccess();
  }

  return (
    <div className="mkt-login mkt-login-globe mkt-signup" ref={root} onMouseMove={onMove}>
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
      <main className="mkt-login-card mkt-signup-card">
        <p className="live">
          <i /> SYS/READY
        </p>
        <div className="mark">
          <img src="/brand/logo.png?v=2" alt="" />
        </div>
        <h1>CREATE ACCESS</h1>
        <div className="tag">SIGN UP</div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mkt-signup-block">
            <h2 className="mkt-signup-label">Plan</h2>
            <p className="mkt-signup-lead">
              Explorer is free (5 core desks). Professional / Enterprise start a {TRIAL_DAYS}-day trial with no card —
              capped data, no copy/export, upgrade prompts until you buy.
            </p>
            <div className="mkt-signup-plan-grid" role="radiogroup" aria-label="Plan">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={planId === p.id}
                  className={`mkt-signup-plan${planId === p.id ? ' on' : ''}`}
                  onClick={() => setPlanId(p.id)}
                >
                  <strong>{p.name}</strong>
                  <span>
                    {p.id === 'explorer'
                      ? 'Free · 5 core desks'
                      : `$${p.monthly}/mo · ${TRIAL_DAYS}-day trial, no card`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mkt-signup-block">
            <h2 className="mkt-signup-label">Who are you working as?</h2>
            <p className="mkt-signup-lead">Sets your free-tier core desks and start desk.</p>
            <div className="mkt-signup-persona-grid" role="radiogroup" aria-label="Working as">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={personaId === p.id}
                  className={`mkt-signup-persona tone-${p.tone}${personaId === p.id ? ' on' : ''}`}
                  onClick={() => setPersonaId(p.id)}
                >
                  <strong>{p.label}</strong>
                  <span>{p.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="mkt-field">
            <span>Name</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label className="mkt-field">
            <span>User ID</span>
            <input
              name="user"
              type="text"
              autoComplete="username"
              spellCheck="false"
              required
              placeholder="you@org or handle"
            />
          </label>
          <label className="mkt-field">
            <span>Password</span>
            <input name="pass" type="password" autoComplete="new-password" required minLength={6} />
          </label>
          <label className="mkt-field">
            <span>Confirm password</span>
            <input name="pass2" type="password" autoComplete="new-password" required minLength={6} />
          </label>
          <button className="mkt-cta" type="submit" disabled={pending}>
            {pending
              ? 'Creating…'
              : planId === 'explorer'
                ? 'Create free account'
                : `Start ${TRIAL_DAYS}-day trial`}
          </button>
          <div className="mkt-err" role="alert">
            {error}
          </div>
        </form>

        <p className="mkt-auth-switch">
          Already have access?{' '}
          <button type="button" onClick={onLogin}>
            Sign in
          </button>
        </p>
      </main>
    </div>
  );
}
