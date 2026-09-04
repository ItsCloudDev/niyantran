const KEY = 'niyantranUsers';
const EVENT = 'niy-users';

export const SEED_USER = {
  id: 'seed-analyst',
  name: 'Lead Analyst',
  email: 'analyst@niyantran',
  password: '12345678#',
  plan: 'enterprise',
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

export function loadUsers() {
  const saved = readRaw();
  if (saved && saved.length) {
    if (!saved.some((u) => u.email === SEED_USER.email)) return [SEED_USER, ...saved];
    return saved;
  }
  return [SEED_USER];
}

export function saveUsers(users) {
  localStorage.setItem(KEY, JSON.stringify(users));
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

export function authenticateUser(email, password) {
  const needle = String(email || '').trim().toLowerCase();
  const pass = String(password || '');
  const hit = loadUsers().find((u) => String(u.email).toLowerCase() === needle);
  if (!hit) return { ok: false, reason: 'Unknown user ID.' };
  if (!hit.active) return { ok: false, reason: 'This account is suspended.' };
  if (hit.password !== pass) return { ok: false, reason: 'Invalid user ID or password.' };
  return { ok: true, user: hit };
}

export function createUser({ name, email, password, plan }) {
  const users = loadUsers();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false, reason: 'Email and password are required.' };
  if (users.some((u) => String(u.email).toLowerCase() === cleanEmail)) {
    return { ok: false, reason: 'That user ID already exists.' };
  }
  const next = {
    id: `u-${Date.now()}`,
    name: String(name || '').trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: String(password),
    plan: plan || 'explorer',
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveUsers([next, ...users]);
  return { ok: true, user: next };
}

export function updateUser(id, patch) {
  const users = loadUsers().map((u) => (u.id === id ? { ...u, ...patch, id: u.id, email: u.email } : u));
  saveUsers(users);
}

export function removeUser(id) {
  if (id === SEED_USER.id) return { ok: false, reason: 'The seed analyst cannot be removed.' };
  saveUsers(loadUsers().filter((u) => u.id !== id));
  return { ok: true };
}
