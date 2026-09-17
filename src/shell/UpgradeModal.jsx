import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { checkoutPlans, completeCheckout } from '../lib/billing.js';
import { entitlementOf, trialDaysLeft } from '../lib/planEntitlements.js';
import { sessionUser } from '../lib/userStore.js';

export default function UpgradeModal({
  open,
  reason = 'desk',
  deskLabel = '',
  onClose,
  onUpgraded,
  forcePlan = null,
}) {
  const user = sessionUser();
  const ent = entitlementOf(user);
  const [yearly, setYearly] = useState(false);
  const [planId, setPlanId] = useState(forcePlan || (ent.plan === 'explorer' ? 'pro' : ent.plan === 'pro' ? 'enterprise' : 'pro'));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const plans = useMemo(() => checkoutPlans().filter((p) => p.id !== 'explorer'), []);

  useEffect(() => {
    if (!open) return undefined;
    setErr('');
    setMsg('');
    setPlanId(forcePlan || (ent.plan === 'explorer' ? 'pro' : 'enterprise'));
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, forcePlan, ent.plan, onClose]);

  if (!open) return null;

  const picked = plans.find((p) => p.id === planId) || plans[0];
  const price = picked ? (yearly && picked.yearly != null ? picked.yearly : picked.monthly) : 0;
  const trialLeft = trialDaysLeft(user);

  const title =
    reason === 'export'
      ? 'Export needs a paid plan'
      : reason === 'copy'
        ? 'Copy is limited on this plan'
        : reason === 'trial'
          ? 'You are on a free trial'
          : reason === 'data'
            ? 'Full data needs an upgrade'
            : deskLabel
              ? `Unlock ${deskLabel}`
              : 'Upgrade your access';

  const lead =
    reason === 'trial'
      ? `Trial seats show a capped record set and block copy/export. ${trialLeft ? `${trialLeft} day${trialLeft === 1 ? '' : 's'} left.` : 'Trial ended.'} Buy a plan to keep working without prompts.`
      : reason === 'export' || reason === 'copy'
        ? 'Explorer and trial seats cannot copy or export records. Upgrade to Professional or Enterprise to download with provenance.'
        : 'Explorer includes 5 core desks for your persona. Upgrade to open every desk and full coverage.';

  async function onPay() {
    setBusy(true);
    setErr('');
    setMsg('');
    const res = await completeCheckout({ planId: picked?.id || 'pro', yearly, user });
    setBusy(false);
    if (!res.ok) {
      setErr(res.reason || 'Checkout failed.');
      return;
    }
    if (res.mode === 'demo') {
      setMsg(res.reason || 'Demo gateway — seat upgraded. Add Razorpay keys to .env for live charges.');
    } else if (res.mode === 'razorpay') {
      setMsg('Payment verified. Your seat is upgraded.');
    } else {
      setMsg('Plan updated.');
    }
    onUpgraded?.(res.user);
    setTimeout(() => onClose?.(), res.mode === 'demo' ? 1200 : 700);
  }

  return createPortal(
    <div className="plan-up-root" role="presentation">
      <button type="button" className="plan-up-scrim" aria-label="Close" onClick={onClose} />
      <div className="plan-up-card" role="dialog" aria-modal="true" aria-labelledby="plan-up-title">
        <header className="plan-up-head">
          <div>
            <p className="plan-up-kicker">BILLING</p>
            <h2 id="plan-up-title">{title}</h2>
          </div>
          <button type="button" className="plan-up-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="plan-up-lead">{lead}</p>

        <div className="plan-up-bill">
          <button type="button" className={!yearly ? 'on' : ''} onClick={() => setYearly(false)}>
            Monthly
          </button>
          <button type="button" className={yearly ? 'on' : ''} onClick={() => setYearly(true)}>
            Yearly · save 17%
          </button>
        </div>

        <div className="plan-up-plans" role="radiogroup" aria-label="Plan">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={planId === p.id}
              className={`plan-up-plan${planId === p.id ? ' on' : ''}${p.popular ? ' pop' : ''}`}
              onClick={() => setPlanId(p.id)}
            >
              {p.popular ? <em>Popular</em> : null}
              <strong>{p.name}</strong>
              <span className="amt">
                ${yearly && p.yearly != null ? p.yearly : p.monthly}
                <small>{p.unit}</small>
              </span>
              <span className="who">{p.who}</span>
            </button>
          ))}
        </div>

        <div className="plan-up-actions">
          <button type="button" className="plan-up-pay" disabled={busy || !picked} onClick={onPay}>
            {busy ? 'Opening checkout…' : `Upgrade to ${picked?.name || 'Pro'} · $${price}${picked?.unit || ''}`}
          </button>
          <button type="button" className="plan-up-later" onClick={onClose}>
            Not now
          </button>
        </div>
        {msg ? <p className="plan-up-ok">{msg}</p> : null}
        {err ? (
          <p className="plan-up-err" role="alert">
            {err}
          </p>
        ) : null}
        <p className="plan-up-note">
          Checkout runs through <b>Razorpay</b> (INR). Configure <code>RAZORPAY_KEY_ID</code> and{' '}
          <code>RAZORPAY_KEY_SECRET</code> in <code>.env</code>, then restart the dev server. Without keys, a demo
          upgrade is used locally and nothing is charged.
        </p>
      </div>
    </div>,
    document.body,
  );
}
