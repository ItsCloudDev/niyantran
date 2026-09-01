import { fetchArchiveFeature, hasRealRows } from './archiveFeed.js';

export async function fetchFeature({ tier, feature, signal } = {}) {
  const q = new URLSearchParams();
  if (tier) q.set('tier', tier);
  if (feature) q.set('feature', feature);
  const url = `/api/feature-feed?${q.toString()}`;

  let apiBody = null;
  let apiStatus = 0;
  try {
    const res = await fetch(url, { signal });
    apiStatus = res.status;
    apiBody = await res.json().catch(() => null);
    if (res.ok && hasRealRows(apiBody)) return apiBody;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
  }

  const archive = await fetchArchiveFeature({ tier, feature, signal });
  if (hasRealRows(archive)) {
    return {
      ...archive,
      fallback: true,
      source: {
        ...(archive.source || {}),
        note:
          archive.source?.note ||
          'Live API is not on this host. Showing the last-known-good archive.',
      },
    };
  }

  if (apiBody) return apiBody;
  throw new Error(apiBody?.error || `feature-feed HTTP ${apiStatus || 404}`);
}
