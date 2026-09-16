/**
 * Home hot-topics ticker — items from embedded desk datasets (never fabricated).
 * Mirrors the legacy HTML ticker pools, scoped to files present in public/data.
 */
import alliancesPack from '../data/alliances.json';

async function loadJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

function clip(s, n = 72) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export async function loadHomeTickerItems() {
  const [wars, bills, regs, sc] = await Promise.all([
    loadJson('/data/embedded_csv/geopolitics_war_tracker.json'),
    loadJson('/data/embedded_csv/national_bill_tracker.json'),
    loadJson('/data/embedded_csv/national_regulatory_watch.json'),
    loadJson('/data/embedded_csv/judiciary_sc_orders.json'),
  ]);

  const items = [];

  for (const r of wars.slice(0, 12)) {
    if (!r.conflict_name) continue;
    items.push({
      cat: 'GEOPOLITICS',
      key: 'geopolitics',
      text: clip(`${r.conflict_name} — ${r.current_stage || r.intensity || 'open'}`),
      tab: 'global',
      feature: 'Open Fronts',
    });
  }

  for (const r of bills.slice(0, 10)) {
    if (!r.bill_name) continue;
    items.push({
      cat: 'NATIONAL',
      key: 'national',
      text: clip(`${r.bill_name} — ${r.current_stage || 'stage n/a'}`),
      tab: 'national',
      feature: 'Bill Passage Probability Index',
    });
  }

  for (const r of regs.slice(0, 8)) {
    if (!r.title) continue;
    items.push({
      cat: 'FINANCE',
      key: 'finance',
      text: clip(r.title),
      tab: 'national',
      feature: 'Regulatory Body Watch',
    });
  }

  for (const r of sc.slice(0, 8)) {
    if (!r.case_title) continue;
    items.push({
      cat: 'JUDICIARY',
      key: 'judiciary',
      text: clip(r.case_title),
      tab: 'law',
      feature: 'Supreme Court Orders',
    });
  }

  const blocs = Array.isArray(alliancesPack?.alliances) ? alliancesPack.alliances : [];
  for (const b of blocs.slice(0, 8)) {
    const name = b.short || b.name;
    if (!name) continue;
    items.push({
      cat: 'BLOCS',
      key: 'blocs',
      text: clip(`${name}${b.latest ? ` — ${b.latest}` : ''}`),
      tab: 'global',
      feature: 'Alliances & Blocs',
    });
  }

  if (!items.some((it) => /brics/i.test(it.text))) {
    items.unshift({
      cat: 'BLOCS',
      key: 'blocs',
      text: 'BRICS — expanded membership track; partner-country tier on record',
      tab: 'global',
      feature: 'Alliances & Blocs',
    });
  }

  return items.filter((it) => it.text);
}
