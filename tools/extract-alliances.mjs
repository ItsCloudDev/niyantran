import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'public/legacy/js/111-niy-alliances-workbench-js.js');
const src = fs.readFileSync(file, 'utf8');
const start = src.indexOf("var FEATURE='");
const end = src.indexOf('  var selected=');
if (start < 0 || end < 0) throw new Error(`slice fail ${start} ${end}`);
const ctx = { result: null };
vm.runInNewContext(`${src.slice(start, end)}\nresult = { verified: VERIFIED, alliances: AL, memberFlags: MEMBER_FLAGS };`, ctx);
const out = path.join(root, 'src/data/alliances.json');
fs.writeFileSync(out, JSON.stringify(ctx.result, null, 2));
console.log(ctx.result.alliances.length, Object.keys(ctx.result.memberFlags).length, out);
