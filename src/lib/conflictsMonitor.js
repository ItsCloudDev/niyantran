export function isConflictsFeature(name) {
  return /^conflicts$/i.test(String(name || '').trim());
}

const STATUS = {
  escalating: { label: 'Deteriorating', short: 'Deteriorating', color: '#ce3f34', order: 0 },
  active: { label: 'Active hostilities', short: 'Active', color: '#d97932', order: 1 },
  'ceasefire-fragile': { label: 'Fragile ceasefire', short: 'Ceasefire', color: '#a86e17', order: 2 },
  'under-review': { label: 'Monitored', short: 'Monitored', color: '#2f6eaa', order: 3 },
};

export function statusOf(s) {
  return STATUS[s] || { label: s || 'Monitored', short: s || 'Monitored', color: '#64748b', order: 4 };
}

export function regionGroup(r) {
  const s = String(r || '').toLowerCase();
  if (/europe|caucasus|ukraine/.test(s)) return 'Europe';
  if (/middle east|n\. africa|north africa|gaza|red sea/.test(s)) return 'Middle East & North Africa';
  if (/sub-saharan|africa|sudan|sahel|drc/.test(s)) return 'Sub-Saharan Africa';
  if (/south|central asia|myanmar/.test(s)) return 'South & Central Asia';
  if (/east asia|pacific/.test(s)) return 'East Asia & Pacific';
  if (/america|haiti/.test(s)) return 'Americas';
  return String(r || '').trim() || 'Other';
}

export function parseSources(row) {
  const out = [];
  const seen = new Set();
  if (row?.sources_json) {
    try {
      const arr = JSON.parse(row.sources_json);
      for (const s of arr) {
        if (Array.isArray(s) && s[1] && /^https?:\/\//i.test(s[1]) && !seen.has(s[1])) {
          seen.add(s[1]);
          out.push({ label: s[0] || 'Source', url: s[1] });
        }
      }
    } catch {
      /* ignore malformed dossier json */
    }
  }
  for (let i = 1; i <= 6; i++) {
    const url = row?.[`source_${i}_url`];
    const label = row?.[`source_${i}`];
    if (url && /^https?:\/\//i.test(url) && !seen.has(url)) {
      seen.add(url);
      out.push({ label: label || `Source ${i}`, url });
    }
  }
  if (row?.source_url && /^https?:\/\//i.test(row.source_url) && !seen.has(row.source_url)) {
    out.push({ label: 'Source', url: row.source_url });
  }
  return out;
}

export function theatresFromFeed(feed) {
  return (feed?.rows || [])
    .filter((r) => r && r.status !== 'source_status' && r.id)
    .map((r) => ({
      id: r.id,
      name: r.conflict_name || r.name || r.title,
      region: r.region || '',
      lat: Number(r.lat),
      lon: Number(r.lon),
      status: r.current_stage || r.status || '',
      intensity: r.intensity,
      since: r.since || r.started || '',
      fatalitiesEst: r.fatalitiesEst || '',
      displaced: r.displaced || '',
      latest: r.latest || r.latest_development || '',
      actors: String(r.actors || '')
        .split(/\s*·\s*/)
        .map((x) => x.trim())
        .filter(Boolean),
      sources: parseSources(r),
      row: r,
    }))
    .filter((c) => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lon));
}

export function ordered(conflicts) {
  return conflicts.slice().sort((a, b) => statusOf(a.status).order - statusOf(b.status).order);
}

export function statsFor(conflicts) {
  const regions = {};
  conflicts.forEach((c) => {
    regions[regionGroup(c.region)] = 1;
  });
  return {
    tracked: conflicts.length,
    deteriorating: conflicts.filter((c) => c.status === 'escalating').length,
    ceasefires: conflicts.filter((c) => c.status === 'ceasefire-fragile').length,
    regions: Object.keys(regions).length,
    sourceLinked: conflicts.filter((c) => c.sources?.length).length,
  };
}

export function markerPos(c) {
  return {
    left: `${(3.5 + ((Number(c.lon) + 180) / 360) * 93).toFixed(3)}%`,
    top: `${(4.2 + ((90 - Number(c.lat)) / 180) * 94).toFixed(3)}%`,
  };
}
