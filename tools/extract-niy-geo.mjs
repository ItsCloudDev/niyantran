import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'public/legacy/js/027-niy-geo-data.js');
const out = path.join(root, 'src/data/niy-geo.json');

const geo = {};
const ctx = { window: { NIY_GEO: geo }, NIY_GEO: geo, result: null };
vm.runInNewContext(`${fs.readFileSync(src, 'utf8')}\nresult = window.NIY_GEO || NIY_GEO;`, ctx);
const data = ctx.result;
if (!data?.packs?.GA?.booths?.length) throw new Error('NIY_GEO.packs.GA missing booths');

const live = Object.entries(data.packs || {}).filter(([, p]) => p && Array.isArray(p.booths) && p.booths.length);
const pack = {
  vintage: data.packs.GA.vintage || 'SIR final roll 2026 · elections 2017–2024',
  registry: data.registry || [],
  packs: Object.fromEntries(live),
};
fs.writeFileSync(out, `${JSON.stringify(pack)}\n`);
const ga = pack.packs.GA;
console.log(
  'niy-geo',
  'seats',
  ga.seats?.length,
  'booths',
  ga.booths?.length,
  'bytes',
  fs.statSync(out).size,
  out,
);
