import { DEFAULT_USER_TYPE, userTypeOf } from './userTypes.js';

const KEY = 'niyantranUsers';
const EVENT = 'niy-users';
const SESSION_KEY = 'niyantranUser';

export { USER_TYPES, userTypeOf, desksForType, tabsForType, canOpenDesk, DEFAULT_USER_TYPE } from './userTypes.js';

export const SEED_USER = {
  id: 'seed-analyst',
  name: 'Lead Analyst',
  email: 'analyst@niyantran',
  password: '12345678#',
  plan: 'enterprise',
  type: 'analyst',
  active: true,
  createdAt: '2026-01-15T00:00:00.000Z',
};

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {
    /* empty */
  }
  return null;
}

function normalize(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    ...user,
    type: userTypeOf(user.type).id,
  };
}

export function loadUsers() {
  const saved = readRaw();
  let list = saved && saved.length ? saved : [SEED_USER];
  if (!list.some((u) => u.email === SEED_USER.email)) list = [SEED_USER, ...list];
  return list.map(normalize).filter(Boolean);
}

export function saveUsers(users) {
  localStorage.setItem(KEY, JSON.stringify(users.map(normalize).filter(Boolean)));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeUsers(fn) {
  const on = () => fn(loadUsers());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function toPublicUser(user, typeOverride) {
  const u = normalize(user);
  if (!u) return null;
  const { password: _pw, ...rest } = u;
  return {
    ...rest,
    type: userTypeOf(typeOverride || u.type).id,
  };
}

export function authenticateUser(email, password) {
  const needle = String(email || '').trim().toLowerCase();
  const pass = String(password || '');
  const hit = loadUsers().find((u) => String(u.email).toLowerCase() === needle);
  if (!hit) return { ok: false, reason: 'Unknown user ID.' };
  if (!hit.active) return { ok: false, reason: 'This account is suspended.' };
  if (hit.password !== pass) return { ok: false, reason: 'Invalid user ID or password.' };
  return { ok: true, user: hit };
}

export function createUser({ name, email, password, plan, type }) {
  const users = loadUsers();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false, reason: 'Email and password are required.' };
  if (users.some((u) => String(u.email).toLowerCase() === cleanEmail)) {
    return { ok: false, reason: 'That user ID already exists.' };
  }
  const next = normalize({
    id: `u-${Date.now()}`,
    name: String(name || '').trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: String(password),
    plan: plan || 'explorer',
    type: type || DEFAULT_USER_TYPE,
    active: true,
    createdAt: new Date().toISOString(),
  });
  saveUsers([next, ...users]);
  return { ok: true, user: next };
}

export function updateUser(id, patch) {
  const users = loadUsers().map((u) => {
    if (u.id !== id) return u;
    const next = { ...u, ...patch, id: u.id, email: u.email };
    if (patch.type != null) next.type = userTypeOf(patch.type).id;
    return next;
  });
  saveUsers(users);
}

export function removeUser(id) {
  if (id === SEED_USER.id) return { ok: false, reason: 'The seed analyst cannot be removed.' };
  saveUsers(loadUsers().filter((u) => u.id !== id));
  return { ok: true };
}

export function setSessionUser(user) {
  const pub = toPublicUser(user);
  sessionStorage.setItem('niyantranAuthed', '1');
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(pub));
  return pub;
}

export function sessionUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.email) return toPublicUser(parsed);
      if (typeof parsed === 'string') {
        const hit = loadUsers().find((u) => String(u.email).toLowerCase() === parsed.toLowerCase());
        return hit ? toPublicUser(hit) : toPublicUser({ ...SEED_USER, email: parsed });
      }
    }
  } catch {
    /* empty */
  }
  const email = sessionStorage.getItem(SESSION_KEY);
  if (email && !email.startsWith('{')) {
    const hit = loadUsers().find((u) => String(u.email).toLowerCase() === email.toLowerCase());
    return hit ? toPublicUser(hit) : toPublicUser({ ...SEED_USER, email });
  }
  return toPublicUser(SEED_USER);
}

export function clearSessionUser() {
  sessionStorage.removeItem('niyantranAuthed');
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('niyantranLand');
}
