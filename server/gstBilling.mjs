/**
 * CR-17 remainder — INR + GST quote / tax invoice helpers.
 * Digital SaaS treated as online information service (SAC 998314), GST @ 18%.
 * Intra-state (buyer state = seller): CGST 9% + SGST 9%. Else IGST 18%.
 */
import crypto from 'crypto';

export const GST_RATE = 0.18;
export const SAC_CODE = '998314';
export const SAC_DESC = 'Information technology design and development services / online information retrieval';

const PLAN_USD = {
  pro: { monthly: 49, yearly: 41, label: 'Professional' },
  enterprise: { monthly: 149, yearly: 124, label: 'Enterprise' },
};

/** ISO state codes used on GSTIN (first 2 digits). */
export const STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export function planCatalog() {
  return PLAN_USD;
}

export function sellerFromEnv() {
  const stateCode = String(process.env.BILLING_GST_STATE_CODE || '27').padStart(2, '0').slice(0, 2);
  return {
    legalName: process.env.BILLING_LEGAL_NAME || 'Niyantran Research Technologies',
    tradeName: process.env.BILLING_TRADE_NAME || 'Niyantran Terminal',
    gstin: process.env.BILLING_GSTIN || '',
    address: process.env.BILLING_ADDRESS || 'India',
    stateCode,
    stateName: STATE_CODES[stateCode] || process.env.BILLING_GST_STATE || 'Maharashtra',
    email: process.env.BILLING_EMAIL || 'billing@niyantran',
    sac: process.env.BILLING_SAC || SAC_CODE,
    sacDesc: process.env.BILLING_SAC_DESC || SAC_DESC,
  };
}

export function usdToInrRate() {
  const n = Number(process.env.BILLING_USD_INR || 83);
  return Number.isFinite(n) && n > 0 ? n : 83;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function stateFromGstin(gstin) {
  const g = String(gstin || '')
    .trim()
    .toUpperCase();
  if (g.length >= 2 && /^\d{2}/.test(g)) return g.slice(0, 2);
  return '';
}

/**
 * Build a taxable quote in INR (rupees, not paise).
 * List prices are USD exclusive of GST; convert then add GST.
 */
export function computeGstQuote({ planId, yearly = false, buyerGstin = '', buyerStateCode = '' } = {}) {
  const id = String(planId || '').toLowerCase();
  const row = PLAN_USD[id];
  if (!row) return null;
  const seller = sellerFromEnv();
  const fx = usdToInrRate();
  const usd = yearly ? row.yearly : row.monthly;
  const taxable = round2(Number(usd) * fx);
  const buyerCode =
    stateFromGstin(buyerGstin) ||
    String(buyerStateCode || '')
      .padStart(2, '0')
      .slice(0, 2) ||
    '';
  const intra = Boolean(buyerCode && buyerCode === seller.stateCode);
  const gstAmount = round2(taxable * GST_RATE);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (intra) {
    cgst = round2(gstAmount / 2);
    sgst = round2(gstAmount - cgst);
  } else {
    igst = gstAmount;
  }
  const total = round2(taxable + cgst + sgst + igst);
  return {
    planId: id,
    planLabel: row.label,
    yearly: Boolean(yearly),
    period: yearly ? 'yearly' : 'monthly',
    currency: 'INR',
    usdList: usd,
    usdToInr: fx,
    taxable,
    gstRate: GST_RATE,
    cgst,
    sgst,
    igst,
    gstAmount: round2(cgst + sgst + igst),
    total,
    amountPaise: Math.max(100, Math.round(total * 100)),
    taxSplit: intra ? 'cgst_sgst' : 'igst',
    buyerStateCode: buyerCode || null,
    sellerStateCode: seller.stateCode,
    sac: seller.sac,
    sacDesc: seller.sacDesc,
  };
}

export function nextInvoiceNumber(existingCount = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  // Indian FY starts April
  const fyStart = m >= 4 ? y : y - 1;
  const fyEnd = String((fyStart + 1) % 100).padStart(2, '0');
  const fy = `${String(fyStart).slice(-2)}${fyEnd}`;
  const seq = String(existingCount + 1).padStart(5, '0');
  return `NIY/${fy}/${seq}`;
}

export function newInvoiceId() {
  return `inv_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Printable tax invoice HTML (GST-style). */
export function renderInvoiceHtml(inv, seller) {
  const s = seller || sellerFromEnv();
  const taxRows =
    inv.taxSplit === 'cgst_sgst'
      ? `<tr><td>CGST @ 9%</td><td class="r">${inr(inv.cgst)}</td></tr>
         <tr><td>SGST @ 9%</td><td class="r">${inr(inv.sgst)}</td></tr>`
      : `<tr><td>IGST @ 18%</td><td class="r">${inr(inv.igst)}</td></tr>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Tax Invoice ${esc(inv.invoiceNo)}</title>
<style>
  body{font:14px/1.45 system-ui,Segoe UI,sans-serif;color:#131313;margin:32px;max-width:820px}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:.04em}
  .muted{color:#666;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}
  th{background:#f6f4f0;font-size:12px}
  td.r,th.r{text-align:right}
  .tot{font-weight:700;font-size:15px}
  .stamp{margin-top:28px;font-size:12px;color:#444}
  @media print{body{margin:12px} .noprint{display:none}}
</style>
</head>
<body>
  <p class="muted noprint"><button onclick="window.print()">Print / Save PDF</button></p>
  <h1>TAX INVOICE</h1>
  <p class="muted">${esc(inv.invoiceNo)} · ${esc(inv.issuedAt?.slice(0, 10) || '')} · ${esc(inv.currency || 'INR')}</p>
  <div class="grid">
    <div>
      <strong>Supplier</strong><br/>
      ${esc(s.legalName)}<br/>
      ${esc(s.tradeName)}<br/>
      ${esc(s.address)}<br/>
      State: ${esc(s.stateName)} (${esc(s.stateCode)})<br/>
      ${s.gstin ? `GSTIN: <b>${esc(s.gstin)}</b><br/>` : '<span class="muted">GSTIN not configured — set BILLING_GSTIN in .env</span><br/>'}
      ${esc(s.email)}
    </div>
    <div>
      <strong>Bill to</strong><br/>
      ${esc(inv.buyerName || '—')}<br/>
      ${esc(inv.buyerEmail || '')}<br/>
      ${inv.buyerAddress ? `${esc(inv.buyerAddress)}<br/>` : ''}
      ${inv.buyerStateName ? `State: ${esc(inv.buyerStateName)} (${esc(inv.buyerStateCode || '')})<br/>` : ''}
      ${inv.buyerGstin ? `GSTIN: <b>${esc(inv.buyerGstin)}</b>` : 'GSTIN: Unregistered / B2C'}
    </div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Description</th><th>SAC</th><th class="r">Taxable</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${esc(inv.planLabel)} plan — ${esc(inv.period)} subscription<br/><span class="muted">${esc(inv.sacDesc || s.sacDesc)}</span></td>
        <td>${esc(inv.sac || s.sac)}</td>
        <td class="r">${inr(inv.taxable)}</td>
      </tr>
    </tbody>
  </table>
  <table>
    <tbody>
      <tr><td>Taxable value</td><td class="r">${inr(inv.taxable)}</td></tr>
      ${taxRows}
      <tr class="tot"><td>Total (INR)</td><td class="r">${inr(inv.total)}</td></tr>
    </tbody>
  </table>
  <p class="muted">USD list ${esc(inv.usdList)} × FX ${esc(inv.usdToInr)} → taxable INR (exclusive of GST). Payment via ${esc(inv.provider || 'razorpay')}${inv.paymentId ? ` · ${esc(inv.paymentId)}` : ''}.</p>
  <p class="stamp">This is a computer-generated tax invoice for subscription software. Amounts in Indian Rupees.</p>
</body>
</html>`;
}
