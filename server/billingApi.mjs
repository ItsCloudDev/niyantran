/**
 * Razorpay billing API (server-only secrets).
 *
 *   GET  /api/billing/config
 *   POST /api/billing/create-order   { planId, yearly, userId, email, name }
 *   POST /api/billing/verify        { orderId, paymentId, signature, planId, yearly, userId }
 */
import crypto from 'crypto';
import { loadEnv } from './loadEnv.mjs';

loadEnv();

const USD_TO_INR = Number(process.env.BILLING_USD_INR || 83);

const PLAN_USD = {
  pro: { monthly: 49, yearly: 41 },
  enterprise: { monthly: 149, yearly: 124 },
};

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function keys() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  return { keyId, keySecret, enabled: Boolean(keyId && keySecret) };
}

function amountPaise(planId, yearly) {
  const id = String(planId || '').toLowerCase();
  const row = PLAN_USD[id];
  if (!row) return 0;
  const usd = yearly ? row.yearly : row.monthly;
  const inr = Math.round(Number(usd) * USD_TO_INR);
  return Math.max(100, inr * 100); // Razorpay min ~₹1
}

async function razorpayFetch(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = keys();
  if (!keyId || !keySecret) throw new Error('Razorpay keys are not configured.');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.description || data?.error?.reason || `Razorpay ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function verifySignature(orderId, paymentId, signature) {
  const { keySecret } = keys();
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return false;
  }
}

export async function handleBillingApi(req, res, url) {
  if (!url.pathname.startsWith('/api/billing')) return false;

  if (url.pathname === '/api/billing/config' && req.method === 'GET') {
    const { keyId, enabled } = keys();
    json(res, {
      provider: 'razorpay',
      enabled,
      keyId: enabled ? keyId : '',
      currency: 'INR',
      usdToInr: USD_TO_INR,
      demoFallback: !enabled,
    });
    return true;
  }

  if (url.pathname === '/api/billing/create-order' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const planId = String(body.planId || '').toLowerCase();
      const yearly = Boolean(body.yearly);
      if (!PLAN_USD[planId]) {
        json(res, { ok: false, reason: 'Unknown plan.' }, 400);
        return true;
      }
      const { enabled, keyId } = keys();
      if (!enabled) {
        json(res, { ok: false, reason: 'Razorpay is not configured on this server.', demoFallback: true }, 503);
        return true;
      }
      const amount = amountPaise(planId, yearly);
      const receipt = `niy_${planId}_${Date.now()}`.slice(0, 40);
      const order = await razorpayFetch('/orders', {
        method: 'POST',
        body: {
          amount,
          currency: 'INR',
          receipt,
          notes: {
            planId,
            yearly: String(yearly),
            userId: String(body.userId || ''),
            email: String(body.email || ''),
          },
        },
      });
      json(res, {
        ok: true,
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        planId,
        yearly,
      });
    } catch (err) {
      json(res, { ok: false, reason: err.message || 'Could not create order.' }, err.status || 500);
    }
    return true;
  }

  if (url.pathname === '/api/billing/verify' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const orderId = String(body.orderId || '');
      const paymentId = String(body.paymentId || '');
      const signature = String(body.signature || '');
      const planId = String(body.planId || '').toLowerCase();
      const yearly = Boolean(body.yearly);
      if (!orderId || !paymentId || !signature) {
        json(res, { ok: false, reason: 'Missing payment fields.' }, 400);
        return true;
      }
      if (!verifySignature(orderId, paymentId, signature)) {
        json(res, { ok: false, reason: 'Payment signature mismatch.' }, 400);
        return true;
      }
      // Optional: fetch payment to confirm captured
      try {
        const payment = await razorpayFetch(`/payments/${paymentId}`);
        if (payment.status && payment.status !== 'captured' && payment.status !== 'authorized') {
          json(res, { ok: false, reason: `Payment status is ${payment.status}.` }, 400);
          return true;
        }
      } catch {
        /* signature already verified */
      }
      json(res, {
        ok: true,
        planId,
        yearly,
        orderId,
        paymentId,
      });
    } catch (err) {
      json(res, { ok: false, reason: err.message || 'Verification failed.' }, 500);
    }
    return true;
  }

  json(res, { ok: false, reason: 'Not found.' }, 404);
  return true;
}

export function billingApiPlugin() {
  return {
    name: 'niyantran-billing-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const host = req.headers.host || 'localhost';
          const url = new URL(req.url || '/', `http://${host}`);
          if (!(await handleBillingApi(req, res, url))) next();
        } catch (err) {
          next(err);
        }
      });
    },
  };
}
