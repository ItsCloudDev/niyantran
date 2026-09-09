/**
 * Live same-origin /api/* is available on the Vite+Node local stack.
 * Production static (Vercel) only ships /api/ai/* today — calling the rest
 * produces NOT_FOUND noise (D2). Opt in with VITE_LIVE_API=1 when serverless
 * routes are actually deployed.
 */
export function liveApiEnabled() {
  try {
    if (import.meta.env.VITE_LIVE_API === '1') return true;
    if (import.meta.env.VITE_LIVE_API === '0') return false;
    return Boolean(import.meta.env.DEV);
  } catch {
    return false;
  }
}
