import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = path.join(root, 'public/legacy/js');
const shared = { window: {}, result: null };
const a = fs.readFileSync(path.join(js, '093-niy-geo-modules-data.js'), 'utf8');
const b = fs.readFileSync(path.join(js, '094-niy-geo-expand-data.js'), 'utf8');
vm.runInNewContext(`${a}\n${b}\nresult = window.NIY_GEO_SANCTIONS;`, shared);

const wb = fs.readFileSync(path.join(js, '112-niy-sanctions-workbench-js.js'), 'utf8');
const metaStart = wb.indexOf('  var META={');
const metaEnd = wb.indexOf('  function defaultMeta');
if (metaStart < 0 || metaEnd < 0) throw new Error('META slice fail');
const metaCtx = { result: null };
vm.runInNewContext(`${wb.slice(metaStart, metaEnd)}\nresult = META;`, metaCtx);

const pack = shared.result;
if (!pack?.programs?.length) throw new Error('no programs');
const programs = pack.programs.map((p) => {
  const m = metaCtx.result[p.id] || {};
  return {
    ...p,
    type: m.type || 'Targeted sanctions programme',
    basis: m.basis || 'Issuer-specific statutory and regulatory authorities',
    instruments: m.instruments || ['Asset freezes', 'Transaction restrictions'],
    exemptions: m.exemptions || ['Humanitarian activity subject to applicable licences'],
    watch: m.watch || [],
    market: m.market || [],
    trail: m.trail || [],
  };
});

const out = path.join(root, 'src/data/sanctions.json');
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      asOf: pack.meta?.asOf || '',
      stats: pack.stats || {},
      byTarget: pack.byTarget || [],
      timeline: pack.timeline || [],
      programs,
    },
    null,
    2,
  ),
);
console.log(programs.length, out);
