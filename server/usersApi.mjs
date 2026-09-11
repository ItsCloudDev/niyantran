/**
 * Shared issued-user store for Admin + marketing login.
 * File-backed so localhost and 127.0.0.1 (separate localStorage) still see the same seats.
 *
 *   GET  /api/users
 *   PUT  /api/users   { users: [...] }
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const USERS_FILE = path.join(APP_ROOT, 'tmp', 'issued-users.json');

const SEEDS = [
  {
    id: 'seed-analyst',
    name: 'Lead Analyst',
    email: 'analyst@niyantran',
    password: '12345678#',
    plan: 'enterprise',
    type: 'analyst',
    active: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'seed-student',
    name: 'Student Desk',
    email: 'student@niyantran',
    password: '12345678#',
    plan: 'pro',
    type: 'student',
    active: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

function json(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function ensureDir() {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}

function normalize(u) {
  if (!u || typeof u !== 'object') return null;
  const email = String(u.email || '')
    .trim()
    .toLowerCase();
  if (!email) return null;
  return {
    id: String(u.id || `u-${email}`),
    name: String(u.name || email.split('@')[0]),
    email,
    password: String(u.password || ''),
    plan: String(u.plan || 'explorer'),
    type: String(u.type || 'analyst'),
    active: u.active !== false,
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

function mergeWithSeeds(list) {
  const byEmail = new Map();
  for (const s of SEEDS) byEmail.set(s.email, { ...s });
  for (const u of list || []) {
    const n = normalize(u);
    if (!n) continue;
    const seed = SEEDS.find((s) => s.email === n.email);
    if (seed) {
      byEmail.set(n.email, {
        ...seed,
        ...n,
        id: seed.id,
        email: seed.email,
        password: seed.password,
        type: n.type || seed.type,
        active: n.active !== false,
      });
      continue;
    }
    byEmail.set(n.email, n);
  }
  return [...byEmail.values()];
}

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const list = Array.isArray(parsed?.users) ? parsed.users : Array.isArray(parsed) ? parsed : [];
      return mergeWithSeeds(list);
    }
  } catch {
    /* fall through */
  }
  return mergeWithSeeds([]);
}

function writeUsers(users) {
  ensureDir();
  const list = mergeWithSeeds(users);
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: list, updatedAt: new Date().toISOString() }, null, 2));
  return list;
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) break;
  }
  return body;
}

export async function handleUsersApi(req, res, next) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  if (!url.pathname.startsWith('/api/users')) {
    next();
    return;
  }

  if (url.pathname === '/api/users' && req.method === 'GET') {
    return json(res, { ok: true, users: readUsers() });
  }

  if (url.pathname === '/api/users' && req.method === 'PUT') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      const list = Array.isArray(payload.users) ? payload.users : [];
      const users = writeUsers(list);
      return json(res, { ok: true, users });
    } catch (err) {
      return json(res, { ok: false, error: err.message || String(err) }, 400);
    }
  }

  return json(res, { ok: false, error: 'GET or PUT only' }, 405);
}

export function usersApiPlugin() {
  return {
    name: 'niyantran-users-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleUsersApi(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const p = handleUsersApi(req, res, next);
        if (p && p.catch) p.catch(next);
      });
    },
  };
}
