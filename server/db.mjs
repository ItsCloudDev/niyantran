/**
 * Local SQLite store (sql.js / WASM) for accounts + product analytics.
 * File: tmp/niyantran.sqlite — fine for single-node dev; swap to better-sqlite3 later if needed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(APP_ROOT, 'tmp', 'niyantran.sqlite');

let SQL = null;
let db = null;

function ensureDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

function persist() {
  if (!db) return;
  ensureDir();
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function migrate(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'explorer',
      type TEXT NOT NULL DEFAULT 'analyst',
      active INTEGER NOT NULL DEFAULT 1,
      persona_id TEXT,
      plan_status TEXT DEFAULT 'free',
      trial_ends_at TEXT,
      billing_yearly INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);
  // Additive columns for older DBs.
  const cols = queryAll(database, `PRAGMA table_info(users)`).map((r) => r.name);
  const add = (name, ddl) => {
    if (!cols.includes(name)) database.run(`ALTER TABLE users ADD COLUMN ${ddl}`);
  };
  add('plan_status', 'plan_status TEXT DEFAULT \"free\"');
  add('trial_ends_at', 'trial_ends_at TEXT');
  add('billing_yearly', 'billing_yearly INTEGER DEFAULT 0');
  database.run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      props_json TEXT,
      session_id TEXT,
      user_email TEXT,
      created_at TEXT NOT NULL
    );
  `);
  database.run(`CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_events(name);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);`);
}

export async function getDb() {
  if (db) return db;
  SQL = SQL || (await initSqlJs());
  ensureDir();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  migrate(db);
  persist();
  return db;
}

export function saveDb() {
  persist();
}

export function dbPath() {
  return DB_PATH;
}

export function queryAll(database, sql, params = []) {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function run(database, sql, params = []) {
  database.run(sql, params);
  persist();
}
