import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');
const js = path.join(root, 'public/legacy/js');
const outDir = path.join(root, 'src/data');

function write(name, data) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

const geo = { window: {}, result: null };
vm.runInNewContext(
  `${fs.readFileSync(path.join(js, '093-niy-geo-modules-data.js'), 'utf8')}\n${fs.readFileSync(path.join(js, '094-niy-geo-expand-data.js'), 'utf8')}\nresult = window.NIY_GEO_CHOKEPOINTS;`,
  geo,
);
const choke = geo.result;
if (!choke?.points?.length) throw new Error('no chokepoints');
const chokeFile = write('chokepoints.json', {
  asOf: choke.meta?.asOf || '2026-07',
  stats: choke.stats,
  points: choke.points,
});
console.log('chokepoints', choke.points.length, chokeFile);

const nw = fs.readFileSync(path.join(js, '115-niy-nuclear-watch-js.js'), 'utf8');
const start = nw.indexOf('  var SOURCES=');
const end = nw.indexOf('  selected=DATA[0];');
if (start < 0 || end < 0) throw new Error(`nuclear slice ${start} ${end}`);
const nwCtx = { result: null };
vm.runInNewContext(`${nw.slice(start, end)}\nresult = DATA;`, nwCtx);
if (!nwCtx.result?.length) throw new Error('no nuclear records');
const live = fs.readFileSync(path.join(js, '040.js'), 'utf8');
const arMatch = live.match(/var ARSENAL = (\[[\s\S]*?\n  \];)/);
const arsenalCtx = { result: [] };
if (arMatch) vm.runInNewContext(`result = ${arMatch[1]}`, arsenalCtx);
const nuclearFile = write('nuclear-watch.json', {
  asOf: '2026-08-24',
  prisAsOf: '26 Jul 2026',
  sipriAsOf: 'Jan 2026',
  strip: {
    operatingReactors: '417 operating',
    reactorPipeline: '77 building',
    identifiedUranium: '7.9345M tU',
    inventory: '12,187 warheads',
  },
  arsenal: (arsenalCtx.result || []).map((r) => ({ state: r[0], warheads: r[1], note: r[2] })),
  facilities: nwCtx.result,
});
console.log('nuclear', nwCtx.result.length, nuclearFile);

const infraPath = path.join(repo, 'data', 'embedded_csv', 'geopolitics_infra_projects.json');
const infraRows = JSON.parse(fs.readFileSync(infraPath, 'utf8'));
function infraCountry(region) {
  const s = String(region || '');
  if (/mauritius|agalega/i.test(s)) return 'Mauritius';
  if (/iran/i.test(s)) return 'Iran';
  if (/myanmar/i.test(s)) return 'Myanmar';
  if (/sri lanka/i.test(s)) return 'Sri Lanka';
  if (/india|pan-india|maharashtra|andaman|nicobar/i.test(s)) return 'India';
  const last = s.split(',').pop().trim();
  return last || s;
}
function slug(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
const projects = infraRows.map((p) => ({
  id: slug(p.project_name),
  name: p.project_name,
  sector: p.sector,
  region: p.country_region,
  country: infraCountry(p.country_region),
  status: p.status,
  expected: p.expected_completion,
  detail: p.detail,
}));
const infraFile = write('infra-projects.json', {
  asOf: '2026-07',
  note: 'Hand-compiled public strategic infrastructure register from geopolitics_infra_projects.csv.',
  projects,
});
console.log('infra', projects.length, infraFile);
