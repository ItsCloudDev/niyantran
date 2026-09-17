/**
 * Lightweight product analytics (A-19).
 * Posts to /api/analytics/event when the Vite server is up; queues in localStorage otherwise.
 */

const QUEUE_KEY = 'niyAnalyticsQueue';
const SESSION_KEY = 'niyAnalyticsSession';

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s-${Date.now().toString(36)}`;
  }
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* ignore */
  }
}

async function postOne(evt) {
  const res = await fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evt),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({ ok: true }));
}

export async function flushAnalyticsQueue() {
  const q = readQueue();
  if (!q.length) return;
  const remain = [];
  for (const evt of q) {
    try {
      await postOne(evt);
    } catch {
      remain.push(evt);
    }
  }
  writeQueue(remain);
}

/**
 * @param {string} name  e.g. persona_selected | tour_done | ai_export | desk_open
 * @param {Record<string, unknown>} [props]
 */
export function trackProductEvent(name, props = {}) {
  const evt = {
    name: String(name || '').slice(0, 120),
    props: props && typeof props === 'object' ? props : {},
    sessionId: sessionId(),
    userEmail: (() => {
      try {
        const u = JSON.parse(sessionStorage.getItem('niyantranUser') || 'null');
        return u?.email || '';
      } catch {
        return '';
      }
    })(),
    at: new Date().toISOString(),
  };
  if (!evt.name) return;

  postOne(evt)
    .then(() => flushAnalyticsQueue())
    .catch(() => {
      const q = readQueue();
      q.push(evt);
      writeQueue(q);
    });
}

// Best-effort flush on load (dev server up).
if (typeof window !== 'undefined') {
  setTimeout(() => {
    flushAnalyticsQueue().catch(() => {});
  }, 1500);
}
