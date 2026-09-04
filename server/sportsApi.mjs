/**
 * Sports live proxies — TheSportsDB, ESPN ISL, Wikidata.
 * No GDELT.
 */
import {
  ISL_ESPN,
  ISL_SPORTSDB,
  WD_ATHLETES_Q,
  WD_LEAGUES_Q,
  WORLD_LEAGUES,
  espnScoreboardRows,
  sportsDbRows,
  wikidataAthleteRows,
  wikidataLeagueRows,
} from '../src/lib/sportsPack.js';

const UA = 'Mozilla/5.0 (compatible; NiyantranTerminal/1.0; Sports)';
const FETCH_MS = 20_000;
const SPARQL_MS = 45_000;
const TTL = 15 * 60 * 1000;
const WD_TTL = 24 * 60 * 60 * 1000;

let fxCache = null;
let fxAt = 0;
let islCache = null;
let islAt = 0;
let lgCache = null;
let lgAt = 0;
let atCache = null;
let atAt = 0;

async function getJson(url, extraHeaders = {}, timeoutMs = FETCH_MS) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: 'application/json', 'User-Agent': UA, ...extraHeaders },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function sportsDb(kind, id) {
  return `https://www.thesportsdb.com/api/v1/json/3/${kind}.php?id=${id}`;
}

export async function loadWorldFixtures() {
  if (fxCache && Date.now() - fxAt < TTL) return fxCache;
  const rows = [];
  await Promise.all(
    WORLD_LEAGUES.map(async (lg) => {
      for (const kind of ['eventsnextleague', 'eventspastleague']) {
        try {
          const json = await getJson(sportsDb(kind, lg.id));
          rows.push(...sportsDbRows(json, lg.name));
        } catch {
          /* skip a missing window */
        }
      }
    }),
  );
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.league).localeCompare(String(b.league)));
  fxCache = { ok: true, source: 'thesportsdb', rows };
  fxAt = Date.now();
  return fxCache;
}

export async function loadIsl() {
  if (islCache && Date.now() - islAt < TTL) return islCache;
  try {
    const json = await getJson(ISL_ESPN);
    const rows = espnScoreboardRows(json, 'Indian Super League');
    if (rows.length) {
      islCache = { ok: true, source: 'espn', rows };
      islAt = Date.now();
      return islCache;
    }
  } catch {
    /* SportsDB */
  }
  const rows = [];
  for (const kind of ['eventsnextleague', 'eventspastleague']) {
    try {
      const json = await getJson(sportsDb(kind, ISL_SPORTSDB));
      rows.push(...sportsDbRows(json, 'Indian Super League'));
    } catch {
      /* skip */
    }
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  islCache = { ok: true, source: 'thesportsdb', rows };
  islAt = Date.now();
  return islCache;
}

function wdUrl(q) {
  return `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`;
}

export async function loadSportsLeagues() {
  if (lgCache && Date.now() - lgAt < WD_TTL) return lgCache;
  const json = await getJson(wdUrl(WD_LEAGUES_Q), { Accept: 'application/sparql-results+json' }, SPARQL_MS);
  const rows = wikidataLeagueRows(json);
  lgCache = { ok: true, source: 'wikidata', rows };
  lgAt = Date.now();
  return lgCache;
}

export async function loadAthletes() {
  if (atCache && Date.now() - atAt < WD_TTL) return atCache;
  const json = await getJson(wdUrl(WD_ATHLETES_Q), { Accept: 'application/sparql-results+json' }, SPARQL_MS);
  const rows = wikidataAthleteRows(json);
  atCache = { ok: true, source: 'wikidata', rows };
  atAt = Date.now();
  return atCache;
}
