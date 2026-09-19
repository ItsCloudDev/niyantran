import { briefFromExtract, extractSource } from '../../server/sourceExtract.mjs';
import { isExtractableSourceUrl, isHubListingUrl } from '../../src/lib/sourceUrls.js';

export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET only' });
    return;
  }
  try {
    const target = String(req.query?.url || '');
    const title = String(req.query?.title || '');
    if (!target || isHubListingUrl(target) || !isExtractableSourceUrl(target)) {
      res.status(400).json({
        ok: false,
        error: 'URL is a registry hub or non-document link — not extractable as source body',
        url: target,
      });
      return;
    }
    const got = await extractSource(target);
    const brief = briefFromExtract(got.text || '', { title, max: 1100 });
    res.status(200).json({
      ok: true,
      url: got.url,
      kind: got.kind,
      mime: got.mime,
      bytes: got.bytes,
      error: got.error || null,
      text: got.text || '',
      brief,
      hasBinary: Boolean(got.base64),
    });
  } catch (err) {
    const msg = err.message || String(err);
    res.status(/required/i.test(msg) ? 400 : 502).json({ ok: false, error: msg });
  }
}
