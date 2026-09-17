/**
 * Razorpay billing API + GST tax invoices (CR-17).
 *
 *   GET  /api/billing/config
 *   GET  /api/billing/quote?planId=&yearly=&buyerGstin=&buyerStateCode=
 *   POST /api/billing/create-order   { planId, yearly, userId, email, name, buyerGstin?, buyerStateCode?, buyerAddress? }
 *   POST /api/billing/verify        { orderId, paymentId, signature, planId, yearly, userId, email, name, buyer* }
 *   POST /api/billing/invoice       { planId, yearly, email, name, …, provider?, paymentId?, orderId? }  // demo/record
 *   GET  /api/billing/invoices?email=
 *   GET  /api/billing/invoice/:id   HTML tax invoice
 */
import crypto from 'crypto';
import { loadEnv } from './loadEnv.mjs';
import { getDb, queryAll, run } from './db.mjs';
import {
  computeGstQuote,
  nextInvoiceNumber,
  newInvoiceId,
  renderInvoiceHtml,
  sellerFromEnv,
  STATE_CODES,
} from './gstBilling.mjs';

loadEnv();

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function html(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
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

function quoteFromBody(body) {
  return computeGstQuote({
    planId: body.planId,
    yearly: body.yearly,
    buyerGstin: body.buyerGstin || body.gstin,
    buyerStateCode: body.buyerStateCode || body.stateCode,
  });
}

function rowToInvoice(r) {
  const payload = (() => {
    try {
      return JSON.parse(r.payload_json || '{}');
    } catch {
      return {};
    }
  })();
  return {
    id: r.id,
    invoiceNo: r.invoice_no,
    email: r.user_email,
    userId: r.user_id,
    planId: r.plan_id,
    yearly: Number(r.yearly) === 1,
    currency: r.currency,
    taxable: r.taxable,
    cgst: r.cgst,
    sgst: r.sgst,
    igst: r.igst,
    total: r.total,
    taxSplit: r.tax_split,
    usdList: r.usd_list,
    usdToInr: r.usd_to_inr,
    buyerName: r.buyer_name,
    buyerGstin: r.buyer_gstin,
    buyerStateCode: r.buyer_state_code,
    buyerAddress: r.buyer_address,
    paymentId: r.payment_id,
    orderId: r.order_id,
    provider: r.provider,
    issuedAt: r.issued_at,
    ...payload,
  };
}

async function persistInvoice({ quote, buyer, payment }) {
  const database = await getDb();
  const count = queryAll(database, `SELECT COUNT(*) AS n FROM invoices`)[0]?.n || 0;
  const id = newInvoiceId();
  const invoiceNo = nextInvoiceNumber(Number(count) || 0);
  const issuedAt = new Date().toISOString();
  const seller = sellerFromEnv();
  const buyerStateCode = quote.buyerStateCode || '';
  const inv = {
    id,
    invoiceNo,
    planId: quote.planId,
    planLabel: quote.planLabel,
    period: quote.period,
    yearly: quote.yearly,
    currency: 'INR',
    taxable: quote.taxable,
    cgst: quote.cgst,
    sgst: quote.sgst,
    igst: quote.igst,
    total: quote.total,
    taxSplit: quote.taxSplit,
    usdList: quote.usdList,
    usdToInr: quote.usdToInr,
    sac: quote.sac,
    sacDesc: quote.sacDesc,
    buyerName: buyer.name || '',
    buyerEmail: buyer.email || '',
    buyerGstin: buyer.gstin || '',
    buyerStateCode,
    buyerStateName: STATE_CODES[buyerStateCode] || '',
    buyerAddress: buyer.address || '',
    paymentId: payment?.paymentId || '',
    orderId: payment?.orderId || '',
    provider: payment?.provider || 'razorpay',
    issuedAt,
  };
  run(
    database,
    `INSERT INTO invoices (
      id, invoice_no, user_email, user_id, plan_id, yearly, currency,
      taxable, cgst, sgst, igst, total, tax_split, usd_list, usd_to_inr,
      buyer_name, buyer_gstin, buyer_state_code, buyer_address,
      payment_id, order_id, provider, payload_json, issued_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      invoiceNo,
      String(buyer.email || '').toLowerCase(),
      buyer.userId || null,
      quote.planId,
      quote.yearly ? 1 : 0,
      'INR',
      quote.taxable,
      quote.cgst,
      quote.sgst,
      quote.igst,
      quote.total,
      quote.taxSplit,
      quote.usdList,
      quote.usdToInr,
      buyer.name || null,
      buyer.gstin || null,
      buyerStateCode || null,
      buyer.address || null,
      payment?.paymentId || null,
      payment?.orderId || null,
      payment?.provider || 'razorpay',
      JSON.stringify({
        planLabel: inv.planLabel,
        period: inv.period,
        sac: inv.sac,
        sacDesc: inv.sacDesc,
        buyerEmail: inv.buyerEmail,
        buyerStateName: inv.buyerStateName,
        sellerGstin: seller.gstin,
      }),
      issuedAt,
    ],
  );
  return inv;
}

export async function handleBillingApi(req, res, url) {
  if (!url.pathname.startsWith('/api/billing')) return false;

  if (url.pathname === '/api/billing/config' && req.method === 'GET') {
    const { keyId, enabled } = keys();
    const seller = sellerFromEnv();
    json(res, {
      provider: 'razorpay',
      enabled,
      keyId: enabled ? keyId : '',
      currency: 'INR',
      usdToInr: Number(process.env.BILLING_USD_INR || 83),
      gstRate: 0.18,
      sac: seller.sac,
      sellerStateCode: seller.stateCode,
      sellerGstinConfigured: Boolean(seller.gstin),
      demoFallback: !enabled,
      states: Object.entries(STATE_CODES).map(([code, name]) => ({ code, name })),
    });
    return true;
  }

  if (url.pathname === '/api/billing/quote' && req.method === 'GET') {
    const quote = computeGstQuote({
      planId: url.searchParams.get('planId'),
      yearly: url.searchParams.get('yearly') === '1' || url.searchParams.get('yearly') === 'true',
      buyerGstin: url.searchParams.get('buyerGstin') || '',
      buyerStateCode: url.searchParams.get('buyerStateCode') || '',
    });
    if (!quote) {
      json(res, { ok: false, reason: 'Unknown plan.' }, 400);
      return true;
    }
    json(res, { ok: true, quote, seller: sellerFromEnv() });
    return true;
  }

  if (url.pathname === '/api/billing/create-order' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const quote = quoteFromBody(body);
      if (!quote) {
        json(res, { ok: false, reason: 'Unknown plan.' }, 400);
        return true;
      }
      const { enabled, keyId } = keys();
      if (!enabled) {
        json(res, { ok: false, reason: 'Razorpay is not configured on this server.', demoFallback: true, quote }, 503);
        return true;
      }
      const receipt = `niy_${quote.planId}_${Date.now()}`.slice(0, 40);
      const order = await razorpayFetch('/orders', {
        method: 'POST',
        body: {
          amount: quote.amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            planId: quote.planId,
            yearly: String(quote.yearly),
            userId: String(body.userId || ''),
            email: String(body.email || ''),
            taxable: String(quote.taxable),
            gst: String(quote.gstAmount),
            taxSplit: quote.taxSplit,
          },
        },
      });
      json(res, {
        ok: true,
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        planId: quote.planId,
        yearly: quote.yearly,
        quote,
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
      if (!orderId || !paymentId || !signature) {
        json(res, { ok: false, reason: 'Missing payment fields.' }, 400);
        return true;
      }
      if (!verifySignature(orderId, paymentId, signature)) {
        json(res, { ok: false, reason: 'Payment signature mismatch.' }, 400);
        return true;
      }
      try {
        const payment = await razorpayFetch(`/payments/${paymentId}`);
        if (payment.status && payment.status !== 'captured' && payment.status !== 'authorized') {
          json(res, { ok: false, reason: `Payment status is ${payment.status}.` }, 400);
          return true;
        }
      } catch {
        /* signature already verified */
      }
      const quote = quoteFromBody(body);
      if (!quote) {
        json(res, { ok: false, reason: 'Unknown plan.' }, 400);
        return true;
      }
      const invoice = await persistInvoice({
        quote,
        buyer: {
          email: body.email,
          name: body.name,
          userId: body.userId,
          gstin: body.buyerGstin || body.gstin,
          address: body.buyerAddress,
        },
        payment: { paymentId, orderId, provider: 'razorpay' },
      });
      json(res, {
        ok: true,
        planId: quote.planId,
        yearly: quote.yearly,
        orderId,
        paymentId,
        invoice,
        quote,
      });
    } catch (err) {
      json(res, { ok: false, reason: err.message || 'Verification failed.' }, 500);
    }
    return true;
  }

  // Demo / local record invoice (when Razorpay keys missing).
  if (url.pathname === '/api/billing/invoice' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const quote = quoteFromBody(body);
      if (!quote) {
        json(res, { ok: false, reason: 'Unknown plan.' }, 400);
        return true;
      }
      if (!body.email) {
        json(res, { ok: false, reason: 'email required' }, 400);
        return true;
      }
      const invoice = await persistInvoice({
        quote,
        buyer: {
          email: body.email,
          name: body.name,
          userId: body.userId,
          gstin: body.buyerGstin || body.gstin,
          address: body.buyerAddress,
        },
        payment: {
          paymentId: body.paymentId || `demo_${Date.now()}`,
          orderId: body.orderId || '',
          provider: body.provider || 'demo',
        },
      });
      json(res, { ok: true, invoice, quote });
    } catch (err) {
      json(res, { ok: false, reason: err.message || 'Could not create invoice.' }, 500);
    }
    return true;
  }

  if (url.pathname === '/api/billing/invoices' && req.method === 'GET') {
    const email = String(url.searchParams.get('email') || '')
      .trim()
      .toLowerCase();
    if (!email) {
      json(res, { ok: false, reason: 'email required' }, 400);
      return true;
    }
    const database = await getDb();
    const rows = queryAll(
      database,
      `SELECT * FROM invoices WHERE user_email = ? ORDER BY issued_at DESC LIMIT 50`,
      [email],
    ).map(rowToInvoice);
    json(res, { ok: true, invoices: rows });
    return true;
  }

  const invMatch = url.pathname.match(/^\/api\/billing\/invoice\/([^/]+)$/);
  if (invMatch && req.method === 'GET') {
    const database = await getDb();
    const id = decodeURIComponent(invMatch[1]);
    const row =
      queryAll(database, `SELECT * FROM invoices WHERE id = ? OR invoice_no = ?`, [id, id])[0] || null;
    if (!row) {
      html(res, '<p>Invoice not found.</p>', 404);
      return true;
    }
    html(res, renderInvoiceHtml(rowToInvoice(row), sellerFromEnv()));
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
