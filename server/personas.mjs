/**
 * Shipped persona prompts — server source of truth for live chats (A-07).
 * Client localStorage edits must not poison /api/ai/chat unless probe=true.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '../src/data/personas');

const IDS = ['student', 'journalist', 'lawyer', 'policy', 'analyst'];
const cache = new Map();

function readOne(id) {
  if (cache.has(id)) return cache.get(id);
  try {
    const text = fs.readFileSync(path.join(DIR, `${id}.md`), 'utf8').trim();
    cache.set(id, text);
    return text;
  } catch {
    cache.set(id, '');
    return '';
  }
}

export function shippedPersonaPrompt(typeId) {
  const id = IDS.includes(String(typeId || '').toLowerCase())
    ? String(typeId).toLowerCase()
    : 'analyst';
  return readOne(id);
}
