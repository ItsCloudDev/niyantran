/**
 * Checkout / payment helpers — Razorpay Orders flow.
 * Server holds RAZORPAY_KEY_SECRET; browser only gets key id + order id.
 * Without keys configured, falls back to a labelled demo upgrade (dev only).
 */
import { loadPricing } from './pricingStore.js';
import { paidFields, normalizePlanId, planOf } from './planEntitlements.js';
import { sessionUser, setSessionUser, updateUser, loadUsers } from './userStore.js';
import { trackProductEvent } from './productAnalytics.js';

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Razorpay failed to load')));
      return;
    }
    const s = document.createElement('script');
    s.src = RAZORPAY_SRC;
    s.async = true;
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('Razorpay failed to load'));
    document.head.appendChild(s);
  });
}

export async function fetchBillingConfig() {
  try {
    const res = await fetch('/api/billing/config');
    if (!res.ok) return { enabled: false, demoFallback: true, provider: 'razorpay' };
    return await res.json();
  } catch {
    return { enabled: false, demoFallback: true, provider: 'razorpay' };
  }
}

export function applyPaidPlan(user, planId, yearly = false, paymentMeta = {}) {
  const patch = {
    ...paidFields(planId, yearly),
    lastPaymentId: paymentMeta.paymentId || null,
    lastOrderId: paymentMeta.orderId || null,
  };
  if (user?.id) updateUser(user.id, patch);
  const next = { ...user, ...patch };
  setSessionUser(next);
  trackProductEvent('plan_upgraded', {
    planId: patch.plan,
    yearly: Boolean(yearly),
    provider: paymentMeta.provider || 'unknown',
  });
  return next;
}

async function openRazorpayCheckout({ keyId, orderId, amount, currency, plan, yearly, seat, meta }) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    const rzp = new Razorpay({
      key: keyId,
      amount,
      currency: currency || 'INR',
      name: 'Niyantran Terminal',
      description: `${meta?.name || plan} · ${yearly ? 'yearly' : 'monthly'}`,
      order_id: orderId,
      prefill: {
        name: seat.name || '',
        email: String(seat.email || '').includes('@') ? seat.email : '',
      },
      notes: { plan, yearly: String(yearly), userId: seat.id || '' },
      theme: { color: '#012ea1' },
      handler: async (response) => {
        try {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId: plan,
              yearly,
              userId: seat.id || '',
            }),
          });
          const body = await verify.json().catch(() => ({}));
          if (!verify.ok || !body.ok) {
            resolve({ ok: false, reason: body.reason || 'Payment could not be verified.', mode: 'razorpay' });
            return;
          }
          const next = applyPaidPlan(seat, plan, yearly, {
            provider: 'razorpay',
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
          });
          resolve({ ok: true, user: next, mode: 'razorpay', paymentId: response.razorpay_payment_id });
        } catch (err) {
          resolve({ ok: false, reason: err.message || 'Verification failed.', mode: 'razorpay' });
        }
      },
      modal: {
        ondismiss() {
          resolve({ ok: false, reason: 'Payment cancelled.', mode: 'razorpay' });
        },
      },
    });
    rzp.on('payment.failed', (resp) => {
      const reason = resp?.error?.description || 'Payment failed. Try again or contact support.';
      resolve({ ok: false, reason, mode: 'razorpay' });
    });
    rzp.open();
  });
}

/**
 * Complete a purchase for the signed-in user.
 */
export async function completeCheckout({ planId, yearly = false, user } = {}) {
  const plan = normalizePlanId(planId);
  if (plan === 'explorer') {
    const patch = { plan: 'explorer', planStatus: 'free', trialEndsAt: null, billingYearly: false };
    if (user?.id) updateUser(user.id, patch);
    const next = { ...(user || sessionUser()), ...patch };
    setSessionUser(next);
    return { ok: true, user: next, mode: 'free' };
  }
  if (plan === 'gov') {
    return { ok: false, reason: 'Government plans are issued by sales — use Contact Sales.', mode: 'sales' };
  }
  const seat = user || sessionUser();
  if (!seat?.email) return { ok: false, reason: 'Sign in before upgrading.' };

  const meta = planOf(plan);
  const config = await fetchBillingConfig();

  if (config.enabled) {
    try {
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan,
          yearly,
          userId: seat.id || '',
          email: seat.email || '',
          name: seat.name || '',
        }),
      });
      const order = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !order.ok) {
        if (order.demoFallback) {
          /* fall through to demo */
        } else {
          return { ok: false, reason: order.reason || 'Could not start Razorpay checkout.', mode: 'razorpay' };
        }
      } else {
        return openRazorpayCheckout({
          keyId: order.keyId || config.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          plan,
          yearly,
          seat,
          meta,
        });
      }
    } catch (err) {
      return { ok: false, reason: err.message || 'Could not open payment gateway.', mode: 'razorpay' };
    }
  }

  // Demo gateway when keys are missing (local/dev).
  const next = applyPaidPlan(seat, plan, yearly, { provider: 'demo' });
  return {
    ok: true,
    user: next,
    mode: 'demo',
    reason: 'Demo upgrade — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env for live checkout.',
  };
}

export function checkoutPlans() {
  return loadPricing().filter((p) => p.id !== 'gov');
}

export function refreshSessionFromStore() {
  const cur = sessionUser();
  if (!cur?.email) return cur;
  const hit = loadUsers().find((u) => String(u.email).toLowerCase() === String(cur.email).toLowerCase());
  if (hit) return setSessionUser(hit);
  return cur;
}
