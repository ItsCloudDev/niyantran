export function isWorldConstitutionsFeature(name) {
  return /^world constitutions$/i.test(String(name || '').trim());
}

export function isGrowthIndicatorsFeature(name) {
  return /^growth indicators$/i.test(String(name || '').trim());
}

export function isHeadsOfStateFeature(name) {
  return /^heads of state$/i.test(String(name || '').trim());
}

export function isGlobalCommoditiesFeature(name) {
  return /^global commodities$/i.test(String(name || '').trim());
}

export function isNewsWireFeature(name) {
  return /^geopolitics news wire$/i.test(String(name || '').trim());
}

export function isGeoResourceDossier(name) {
  return isHeadsOfStateFeature(name) || isGlobalCommoditiesFeature(name);
}

export function isGlobalResourcesTable(name) {
  return isWorldConstitutionsFeature(name) || isGrowthIndicatorsFeature(name);
}

export function flattenLeader(p) {
  return {
    id: p.id || '',
    title: p.name || p.country || '',
    name: p.name || '',
    country: p.country || '',
    flag: p.flag || '',
    role: p.role || '',
    party: p.party || '',
    ideology: p.ideology || '',
    since: p.since || '',
    age: p.age == null ? '' : p.age,
    latest: p.latest || '',
    source_url: 'https://www.wikidata.org/',
  };
}

export function flattenCommodity(item, group) {
  const [name, level, change, pct] = Array.isArray(item) ? item : [];
  return {
    title: name || '',
    commodity: name || '',
    group: group || '',
    level: level || '',
    change: change || '',
    pct: Number(pct) || 0,
    source_url: 'https://www.worldbank.org/en/research/commodity-markets',
  };
}

export function commoditiesFromPack(pack) {
  const rows = [];
  for (const grp of pack?.groups || []) {
    for (const item of grp.items || []) {
      rows.push(flattenCommodity(item, grp.g));
    }
  }
  return rows;
}
