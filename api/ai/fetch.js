import { runAiFetch } from '../../server/aiApi.mjs';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET only' });
    return;
  }
  try {
    const target = String(req.query?.url || '');
    const out = await runAiFetch(target);
    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err.message || String(err);
    res.status(/required/i.test(msg) ? 400 : 502).json({ ok: false, error: msg });
  }
}
