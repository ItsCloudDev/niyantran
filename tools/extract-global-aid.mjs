import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'public/legacy/js/113-niy-global-aid-workbench-js.js'), 'utf8');
const start = src.indexOf('  var SOURCES={');
const end = src.indexOf('  function isActive()');
if (start < 0 || end < 0) throw new Error(`slice fail ${start} ${end}`);
const ctx = { result: null };
vm.runInNewContext(`${src.slice(start, end)}\nresult = { appeals: buildData(), wire: WIRE, sources: SOURCES };`, ctx);
const out = path.join(root, 'src/data/global-aid.json');
fs.writeFileSync(out, JSON.stringify(ctx.result, null, 2));
console.log(ctx.result.appeals.length, ctx.result.wire.length, out);
