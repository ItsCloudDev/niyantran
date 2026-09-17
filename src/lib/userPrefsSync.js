/**
 * A-15 — sync watchlist / AI chats / tours to SQLite via /api/user-prefs.
 * LocalStorage remains the working copy; server is the cross-device backup.
 */
import { sessionUser } from './userStore.js';
import { loadWatchlist, applyWatchlistFromServer, DEFAULT_WATCHLIST } from './watchlistStore.js';
import { loadAiState, applyAiStateFromServer } from './aiChatStore.js';
import { readToursState, applyToursFromServer } from './onboarding.js';

const DIRTY = 'niy-prefs-dirty';
let pushTimer = null;
let hydrating = false;
let lastEmail = '';

function emailOf() {
  try {
    return String(sessionUser()?.email || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

function slimAiChats(state) {
  const chats = (state?.chats || []).slice(0, 40).map((c) => ({
    id: c.id,
    title: c.title,
    roleId: c.roleId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messages: (c.messages || []).slice(-100).map((m) => ({
      id: m.id,
      role: m.role,
      content: String(m.content || '').slice(0, 24000),
      at: m.at,
      model: m.model,
      error: m.error,
    })),
    attachments: (c.attachments || []).slice(0, 12).map((a) => {
      const { dataUrl, file, bytes, ...rest } = a || {};
      return rest;
    }),
  }));
  const activeId = chats.some((c) => c.id === state?.activeId) ? state.activeId : chats[0]?.id || '';
  return { chats, activeId };
}

function collectLocalPrefs() {
  return {
    watchlist: loadWatchlist(),
    aiChats: slimAiChats(loadAiState()),
    tours: readToursState(),
  };
}

export function schedulePrefsPush(kind) {
  if (hydrating) return;
  const email = emailOf();
  if (!email) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushPrefs(kind).catch(() => {});
  }, 600);
}

export async function pushPrefs() {
  const email = emailOf();
  if (!email) return { ok: false, reason: 'no-session' };
  const prefs = collectLocalPrefs();
  try {
    const res = await fetch('/api/user-prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...prefs }),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/**
 * Pull server prefs into local stores. If server is empty, upload local once.
 */
export async function hydrateUserPrefs(emailOverride) {
  const email = String(emailOverride || emailOf())
    .trim()
    .toLowerCase();
  if (!email) return { ok: false, reason: 'no-email' };
  lastEmail = email;
  hydrating = true;
  try {
    const res = await fetch(`/api/user-prefs?email=${encodeURIComponent(email)}`);
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    const body = await res.json();
    const prefs = body?.prefs || {};
    const hasServer =
      (Array.isArray(prefs.watchlist) && prefs.watchlist.length) ||
      (prefs.aiChats && Array.isArray(prefs.aiChats.chats) && prefs.aiChats.chats.length) ||
      (prefs.tours && (prefs.tours.home || Object.keys(prefs.tours.desks || {}).length));

    if (hasServer) {
      if (Array.isArray(prefs.watchlist) && prefs.watchlist.length) {
        applyWatchlistFromServer(prefs.watchlist);
      }
      if (prefs.aiChats && Array.isArray(prefs.aiChats.chats)) {
        applyAiStateFromServer(prefs.aiChats);
      }
      if (prefs.tours) {
        applyToursFromServer(prefs.tours);
      }
      return { ok: true, source: 'server' };
    }

    // Seed defaults into local if empty, then upload.
    if (!loadWatchlist()?.length) {
      applyWatchlistFromServer(DEFAULT_WATCHLIST);
    }
    hydrating = false;
    await pushPrefs();
    return { ok: true, source: 'local-upload' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    hydrating = false;
  }
}

/** Call once after app boot when authed. */
let prefsSyncStarted = false;
export function startUserPrefsSync() {
  if (!prefsSyncStarted) {
    prefsSyncStarted = true;
    window.addEventListener(DIRTY, () => schedulePrefsPush());
  }
  const email = emailOf();
  if (email && email !== lastEmail) {
    hydrateUserPrefs(email).catch(() => {});
  }
}

export function markPrefsDirty(kind) {
  window.dispatchEvent(new CustomEvent(DIRTY, { detail: { kind } }));
}
