/**
 * Rewrite registry rows whose primary feed is a GDELT product-name search
 * (or blocked adapter with GDELT-only URLs) to News RSS + real-topic GDELT.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const regPath = path.join(root, 'src/data/source-registry.json');
const mapPath = path.join(root, 'src/data/html-feature-map.json');

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'tracker', 'monitor', 'digest', 'database',
  'index', 'simulator', 'aggregator', 'brief', 'wire', 'editions', 'vernacular',
  'translated', 'structured', 'api', 'composite', 'auto', 'deep', 'dive',
]);

const TOPIC = {
  'assembly proceedings digest':
    'India ("Vidhan Sabha" OR "assembly proceedings" OR "legislative assembly" OR "assembly session")',
  'governor assent tracker':
    'India (governor) (assent OR "returned the bill" OR "withheld assent" OR ordinance)',
  'cabinet decisions':
    'India (cabinet) (decision OR approves OR approved OR "cabinet meeting")',
  'bureaucrat transfer & posting tracker':
    'India (IAS OR IPS OR bureaucrat OR "chief secretary") (transfer OR transferred OR posting OR posted)',
  'cag audit tracker': 'India (CAG OR "Comptroller and Auditor General") (audit OR report)',
  'state fiscal deep-dive': 'India ("state budget" OR "fiscal deficit" OR "state finances" OR FRBM)',
  'centre-state fund flow tracker':
    'India ("finance commission" OR "centrally sponsored" OR "centre-state" OR "tax devolution")',
};

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicFor(name) {
  const n = norm(name);
  for (const [k, q] of Object.entries(TOPIC)) {
    if (n.includes(k)) return q;
  }
  const cleaned = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[–—&+/|,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
    .slice(0, 6);
  const orBits = words.length
    ? words.map((w) => `"${w}"`).join(' OR ')
    : `"${cleaned.slice(0, 40)}"`;
  return `India (${orBits})`;
}

function newsUrl(name) {
  return (
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(`${topicFor(name)} when:7d`) +
    '&hl=en-IN&gl=IN&ceid=IN:en'
  );
}

function gdeltUrl(name) {
  let q = topicFor(name);
  if (!/sourcelang:/i.test(q)) q += ' sourcelang:english';
  return (
    'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
    encodeURIComponent(q) +
    '&mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=100'
  );
}

function isGdelt(u) {
  return /gdeltproject\.org/i.test(u || '');
}

function isProduct(u) {
  return isGdelt(u) && /[?&]query=%22[^&%]{6,}%22/i.test(u || '');
}

const BLOCKED = new Set(['scrape', 'licensed', 'download-or-html', 'internal', '']);

const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
let n = 0;
const keys = [];

for (const e of reg) {
  if (/^geo_/i.test(e.dataset || '')) continue;
  const primary = e.primaryFeedUrl || '';
  // Keep non-GDELT primaries (Wikidata, PIB, Sansad, World Bank, …).
  if (primary && !isGdelt(primary)) continue;
  const blocked = BLOCKED.has(String(e.adapter || '').toLowerCase());
  const product = isProduct(primary) || isProduct(e.openLiveFallback || '');
  const gdeltPrimary = isGdelt(primary);
  if (!(product || (blocked && gdeltPrimary))) continue;

  const news = newsUrl(e.htmlFeature);
  const gdelt = gdeltUrl(e.htmlFeature);
  e.adapter = 'news-search';
  e.primaryFeedUrl = news;
  e.openLiveFallback = gdelt;
  e.sourceUrls = `${news}\n${gdelt}`;
  e.domains = 'news.google.com, api.gdeltproject.org';
  e.source =
    'Google News RSS [primary; XML; none] | GDELT DOC 2.0 API [open-live-fallback; JSON; none]';
  e.implementationState = 'LIVE SEARCH + archive/status fallback';
  e.format = 'XML';
  e.method = 'GET';
  e.auth = 'none';
  e.notes =
    (e.notes ? e.notes + ' ' : '') +
    'Rewritten: never query GDELT for the product name; News RSS first.';
  e.role = e.role === 'discovery' ? 'primary_of_record' : e.role;
  e.endpointCount = '2.0';
  n += 1;
  keys.push(e.key);

  for (const f of map) {
    if ((f.registryKeys || []).includes(e.key) || f.htmlFeature === e.htmlFeature) {
      f.adapters = 'news-search';
      f.source = news;
      f.developerNote =
        'Google News RSS topic search · GDELT real-topic fallback · never product-name search';
      if (f.role === 'discovery') f.role = 'primary_of_record';
    }
  }
}

fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + '\n');
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
console.log('rewrote', n, 'registry rows');
console.log(keys.join('\n'));
