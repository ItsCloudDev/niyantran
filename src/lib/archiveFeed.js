/**
 * Static-host archive for desks when /api/feature-feed is not deployed.
 * Reads bundled registers and /data/embedded_csv — never invents rows.
 */
import features from '../data/html-feature-map.json';
import registry from '../data/source-registry.json';
import manifest from '../../public/data/embedded_csv/_manifest.json';
import alliances from '../data/alliances.json';
import sanctions from '../data/sanctions.json';
import globalAid from '../data/global-aid.json';
import geoConflicts from '../data/geo-conflicts.json';
import infraProjects from '../data/infra-projects.json';
import nuclearWatch from '../data/nuclear-watch.json';
import chokepoints from '../data/chokepoints.json';
import leaders from '../data/leaders.json';
import commodities from '../data/commodities.json';
import criticalMinerals from '../data/critical-minerals.json';
import energy from '../data/energy.json';
import { flattenAlliance } from './alliances.js';
import { flattenSanction } from './sanctions.js';
import { flattenAppeal } from './globalAid.js';
import { flattenChokepoint, flattenInfra, flattenNuclear } from './strategicAssets.js';
import { flattenLeader, commoditiesFromPack } from './globalResources.js';
import { flattenEnergyMineral, flattenMineralRef } from './geonomics.js';

const TIER_ALIAS = {
  home: 'home',
  global: 'geopolitics',
  geopolitics: 'geopolitics',
  national: 'national',
  state: 'state',
  local: 'local',
  law: 'judiciary',
  judiciary: 'judiciary',
  economics: 'finance',
  finance: 'finance',
  carbon: 'climate',
  climate: 'climate',
  sports: 'sports',
  entertainment: 'entertainment',
};

const datasetToFile = {};
for (const row of manifest) {
  datasetToFile[row.key] = row.file;
  datasetToFile[row.key.replace(/\.csv$/i, '')] = row.file;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveTier(raw) {
  return TIER_ALIAS[norm(raw)] || norm(raw);
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') continue;
    if (typeof v === 'object' && v.value != null) return String(v.value);
    if (typeof v === 'object' && v.url) return String(v.url);
    if (typeof v === 'object') continue;
    return String(v);
  }
  return '';
}

function flattenRow(item) {
  const src = item && typeof item === 'object' && !Array.isArray(item) ? item : { value: item };
  const out = { ...src };
  out.date =
    pick(src, [
      'date',
      'date_introduced',
      'seendate',
      'pubDate',
      'published',
      'datetime',
      'year',
      'started',
      'since',
    ]) || '';
  out.title =
    pick(src, [
      'title',
      'bill_name',
      'billName',
      'name',
      'headline',
      'topic',
      'policy_name',
      'tender_title',
      'officer_name',
      'mp_name',
      'project_name',
      'conflict_name',
      'subject',
      'question',
    ]) || '';
  out.source_url =
    pick(src, ['source_url', 'url', 'link', 'html_url', 'document_url', 'pdf_url']) || '';
  return out;
}

function envelope({ feature, rows, adapter, note, fallback, kind, meta, timeline }) {
  return {
    ok: true,
    feature: feature.htmlFeature || feature,
    rows: rows || [],
    source: {
      adapter: adapter || 'embedded',
      links: [...new Set((rows || []).map((r) => r.source_url).filter(Boolean))],
      note: note || 'Last-known-good archive (static host).',
      gdelt: false,
      kind: kind || '',
    },
    coverage: { from: '', through: '', exhaustive: false },
    fallback: fallback !== false,
    timeline: Array.isArray(timeline) ? timeline : [],
    meta: meta || null,
  };
}

function matchFeature(tier, featureName) {
  const t = resolveTier(tier);
  const n = norm(featureName);
  const list = t === 'home' ? features : features.filter((f) => f.htmlTier === t);
  let feat = list.find((f) => norm(f.htmlFeature) === n) || features.find((f) => norm(f.htmlFeature) === n);
  if (!feat) feat = list.find((f) => norm(f.workbookFunctions) === n);
  if (!feat && n) {
    feat = list.find((f) => norm(f.htmlFeature).includes(n) || n.includes(norm(f.htmlFeature)));
  }
  const entries = (feat?.registryKeys || [])
    .map((k) => registry.find((r) => r.key === k))
    .filter(Boolean);
  if (!entries.length && feat) {
    const byName = registry.find(
      (r) => r.htmlTier === (feat.htmlTier || t) && norm(r.htmlFeature) === norm(feat.htmlFeature),
    );
    if (byName) entries.push(byName);
  }
  return { feat, entry: entries[0] || null };
}

function datasetFileName(dataset) {
  if (!dataset) return null;
  const key = String(dataset).trim();
  if (datasetToFile[key]) return datasetToFile[key];
  const noCsv = key.replace(/\.csv$/i, '');
  if (datasetToFile[noCsv]) return datasetToFile[noCsv];
  return `${noCsv}.json`;
}

async function loadEmbedded(dataset, signal) {
  const file = datasetFileName(dataset);
  if (!file) return [];
  const res = await fetch(`/data/embedded_csv/${file}`, { signal });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  if (Array.isArray(json)) return json.map(flattenRow);
  return [];
}

function geoConflictRows(pack) {
  return (pack?.conflicts || [])
    .filter((c) => c && c.id && c.name && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon)))
    .map((c) => {
      const sources = (c.sources || []).filter(
        (s) => Array.isArray(s) && String(s[0] || '').trim() && /^https?:\/\//i.test(String(s[1] || '')),
      );
      const actors = (c.actors || []).filter((x) => String(x || '').trim());
      const row = {
        id: c.id,
        name: c.name,
        title: c.name,
        conflict_name: c.name,
        region: c.region || '',
        status: c.status || '',
        current_stage: c.status || '',
        intensity: c.intensity,
        since: c.since || '',
        started: c.since || '',
        date: c.since || '',
        fatalitiesEst: c.fatalitiesEst || '',
        displaced: c.displaced || '',
        latest: c.latest || '',
        latest_development: c.latest || '',
        actors: actors.join(' · '),
        lat: Number(c.lat),
        lon: Number(c.lon),
        source_url: sources[0]?.[1] || '',
        sources_json: JSON.stringify(sources),
      };
      sources.forEach((s, i) => {
        row[`source_${i + 1}`] = s[0];
        row[`source_${i + 1}_url`] = s[1];
      });
      return row;
    });
}

export function hasRealRows(body) {
  const rows = body?.rows || [];
  if (!rows.length) return false;
  return rows[0]?.status !== 'source_status';
}

export async function fetchArchiveFeature({ tier, feature, signal } = {}) {
  const n = norm(feature);
  const { feat, entry } = matchFeature(tier, feature);
  if (!feat) {
    return envelope({
      feature: feature || '',
      rows: [],
      adapter: 'embedded',
      note: 'No matching feature map row.',
    });
  }

  const dataset = entry?.dataset || feat.dataset || '';
  const name = feat.htmlFeature || '';

  if (/^infra$/i.test(name) || dataset === 'geopolitics_infra_projects.csv') {
    const rows = (infraProjects.projects || []).map(flattenInfra);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: infraProjects.asOf },
        note: 'Strategic infrastructure register (static archive).',
      });
    }
  }

  if (/^nuclear watch$/i.test(name)) {
    const rows = (nuclearWatch.facilities || []).map(flattenNuclear);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: nuclearWatch.asOf, strip: nuclearWatch.strip || {}, arsenal: nuclearWatch.arsenal || [] },
        note: 'Nuclear facility register (static archive).',
      });
    }
  }

  if (/^maritime choke-?points$/i.test(name) || dataset === 'geo_chokepoints') {
    const rows = (chokepoints.points || []).map(flattenChokepoint);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: chokepoints.asOf, stats: chokepoints.stats || {} },
        note: 'Maritime chokepoint register (static archive).',
      });
    }
  }

  if (/^heads of state$/i.test(name) || dataset === 'geo_leaders') {
    const rows = (leaders.leaders || []).map(flattenLeader).filter((r) => r.name);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: leaders.asOf, stats: leaders.stats },
        note: 'World-leaders register (static archive).',
      });
    }
  }

  if (/^global commodities$/i.test(name) || dataset === 'geo_commodities') {
    const rows = commoditiesFromPack(commodities);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: commodities.meta?.asOf, stats: commodities.stats, groups: commodities.groups || [] },
        note: commodities.meta?.note || 'Commodity benchmark board (static archive).',
      });
    }
  }

  if (/^critical minerals$/i.test(name)) {
    const rows = (criticalMinerals.minerals || []).map(flattenMineralRef);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        meta: { asOf: criticalMinerals.asOf },
        note: 'Critical minerals register (static archive).',
      });
    }
  }

  if (/^energy$/i.test(name) || dataset === 'geo_energy') {
    const rows = (energy.minerals || []).map(flattenEnergyMineral);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { asOf: energy.meta?.asOf, stats: energy.stats, commodities: energy.commodities || [] },
        note: 'Energy and critical-minerals register (static archive).',
      });
    }
  }

  if (/^sanctions$/i.test(name)) {
    const rows = (sanctions.programs || []).map(flattenSanction);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        timeline: sanctions.timeline || [],
        meta: { asOf: sanctions.asOf, stats: sanctions.stats, byTarget: sanctions.byTarget },
        note: 'Sanctions programme register (static archive).',
      });
    }
  }

  if (/^global aid$/i.test(name)) {
    const rows = (globalAid.appeals || []).map(flattenAppeal);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { wire: globalAid.wire || [] },
        note: 'Global aid appeal register (static archive).',
      });
    }
  }

  if (/^alliances$/i.test(name)) {
    const rows = (alliances.alliances || []).map((p) => flattenAlliance(p, alliances.memberFlags || {}));
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        meta: { verified: alliances.verified, memberFlags: alliances.memberFlags || {} },
        note: 'Alliance and bloc register (static archive).',
      });
    }
  }

  if (dataset === 'geo_conflicts' || /^conflicts$/i.test(name) || n === 'conflicts') {
    const rows = geoConflictRows(geoConflicts);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        kind: 'dossier',
        timeline: geoConflicts.timeline || [],
        meta: geoConflicts.meta || null,
        note: 'Open Fronts conflict register (static archive).',
      });
    }
  }

  const archiveKeys = [
    dataset,
    /policy intelligence graph/i.test(name) ? 'national_bill_tracker.csv' : '',
    /mp profiles|mp report cards/i.test(name) ? 'national_mp_report_card.csv' : '',
    n === 'markets' || n === 'briefing' ? 'finance_market_feed.csv' : '',
  ].filter(Boolean);

  for (const key of archiveKeys) {
    const rows = await loadEmbedded(key, signal);
    if (rows.length) {
      return envelope({
        feature: feat,
        rows,
        note: 'Last-known-good archive from the shipped dataset.',
      });
    }
  }

  return envelope({
    feature: feat,
    rows: [],
    adapter: 'embedded',
    note: 'No last-known-good archive for this module on the static host.',
  });
}
