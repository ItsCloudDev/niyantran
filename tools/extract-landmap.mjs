import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'public/legacy/js/082-niy-landmap.js'), 'utf8');
const m = src.match(/w:(\d+),h:(\d+),b:"([^"]+)"/);
if (!m) throw new Error('NIY_LANDMAP not found');
const out = path.join(root, 'src/data/landmap.json');
fs.writeFileSync(out, JSON.stringify({ w: Number(m[1]), h: Number(m[2]), b: m[3] }));
console.log(`wrote ${out} w=${m[1]} h=${m[2]} b=${m[3].length}`);
