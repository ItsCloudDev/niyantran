export async function fetchFeature({ tier, feature, signal } = {}) {
  const q = new URLSearchParams();
  if (tier) q.set('tier', tier);
  if (feature) q.set('feature', feature);
  const res = await fetch(`/api/feature-feed?${q.toString()}`, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error(body?.error || `feature-feed HTTP ${res.status}`);
  }
  return body;
}
