import { runAiChat } from '../../server/aiApi.mjs';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const out = await runAiChat(payload);
    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err.message || String(err);
    res.status(/missing|invalid json/i.test(msg) ? 400 : 502).json({ ok: false, error: msg });
  }
}
