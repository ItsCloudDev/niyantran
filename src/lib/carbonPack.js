/**
 * Carbon desk projectors. GDELT news searches are not CBAM milestones, carbon prices, or registry notices.
 * World Bank EN.GHG.CO2 is emissions, not a carbon price — do not substitute it for the pricing tables.
 */

function num(v) {
  if (v == null || v === '') return '';
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : '';
}

function dec(v, d = 1) {
  const n = num(v);
  return n === '' ? '' : n.toFixed(d);
}

export function isoDate(s) {
  const raw = String(s || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const t = Date.parse(raw);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return raw;
}

const SLICE = [
  [/^carbon border/i, 'cbam'],
  [/^global carbon pricing tracker$/i, 'pricing'],
  [/^carbon price monitor$/i, 'monitor'],
  [/^ets & tax adoption timeline$/i, 'ets'],
  [/^india ccts/i, 'ccts'],
  [/^carbon registry wire$/i, 'registry'],
  [/^climate newswire$/i, 'news'],
];

export function carbonSlice(feature) {
  const n = String(feature || '');
  const hit = SLICE.find(([re]) => re.test(n));
  return hit ? hit[1] : '';
}

export function isCarbonExtract(feature) {
  const s = carbonSlice(feature);
  return s === 'cbam' || s === 'pricing' || s === 'monitor' || s === 'ets' || s === 'ccts' || s === 'registry' || s === 'news';
}

export function carbonNote(slice, extra = '') {
  const notes = {
    cbam: 'Extracted EU/UK CBAM milestone table with official sources (EUR-Lex, Commission, GOV.UK). Not a news search.',
    pricing:
      'Extracted jurisdiction carbon-price table (instrument, coverage, emissions-weighted USD/t). World Bank EN.GHG.CO2 is emissions, not a price, and was not used.',
    monitor: 'Extracted emissions-weighted carbon price by jurisdiction and year (USD/tCO2e). Not a news search.',
    ets: 'Extracted first carbon-pricing year by jurisdiction — ETS against tax, from the 1990 Nordic pioneers. Not a news search.',
    ccts: 'Extracted CCTS and Green Credit Programme milestones with MoP/BEE/MoEFCC sources. Not a news search.',
    registry:
      'Registry publications from Verra, Puro.earth and Isometric where a dated public notice exists. Not a GDELT search.',
    news: 'Headlines from Carbon Brief, Mongabay India and Climate Home News. Not a generic GDELT climate search.',
  };
  const base = notes[slice] || 'Carbon pack.';
  return extra ? `${base} ${extra}` : base;
}

export function cbamRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.milestone || r.title || '').trim();
      if (!title) return null;
      return {
        title,
        milestone: title,
        jurisdiction: r.jurisdiction || '',
        date: isoDate(r.date),
        detail: r.detail || '',
        source_url: r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function pricingRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.jurisdiction || r.title || '').trim();
      if (!title) return null;
      return {
        title,
        jurisdiction: title,
        iso3: r.iso3 || '',
        ets_status: r.ets_status || '',
        carbon_tax: r.carbon_tax || '',
        coverage_pct: dec(r.coverage_pct),
        ets_coverage_pct: dec(r.ets_coverage_pct),
        tax_coverage_pct: dec(r.tax_coverage_pct),
        weighted_price_usd: dec(r.weighted_price_usd, 2),
        ets_price_usd: dec(r.ets_price_usd, 2),
        year: r.data_year || r.year || '',
        source_url: r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.jurisdiction).localeCompare(String(b.jurisdiction)));
}

export function monitorRows(raw) {
  return (raw || [])
    .map((r) => {
      const j = String(r.jurisdiction || '').trim();
      const year = String(r.year || '').trim();
      if (!j || !year) return null;
      return {
        title: `${j} ${year}`,
        jurisdiction: j,
        year,
        date: year,
        weighted_price_usd: dec(r.weighted_price_usd, 2),
        ets_price_usd: dec(r.ets_price_usd, 2),
        source_url: r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.year).localeCompare(String(a.year)) || String(a.jurisdiction).localeCompare(String(b.jurisdiction)));
}

export function etsRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.jurisdiction || r.title || '').trim();
      if (!title) return null;
      return {
        title,
        jurisdiction: title,
        first_instrument_year: r.first_instrument_year || '',
        year: r.first_instrument_year || '',
        ets_since: r.ets_since || '',
        carbon_tax_since: r.carbon_tax_since || '',
        instruments: r.instruments || '',
        source_url: r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.first_instrument_year).localeCompare(String(b.first_instrument_year)) || String(a.jurisdiction).localeCompare(String(b.jurisdiction)));
}

export function cctsRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.milestone || r.title || '').trim();
      if (!title) return null;
      return {
        title,
        milestone: title,
        date: isoDate(r.date),
        detail: r.detail || '',
        source_url: r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function registryRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.title || '').trim();
      if (!title) return null;
      return {
        title,
        registry: r.registry || r.outlet || '',
        date: isoDate(r.date),
        source_url: r.link || r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function newsRows(raw) {
  return (raw || [])
    .map((r) => {
      const title = String(r.title || '').trim();
      if (!title) return null;
      return {
        title,
        outlet: r.source || r.outlet || '',
        date: isoDate(r.date),
        source_url: r.link || r.source_url || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function carbonRows(slice, packs) {
  if (slice === 'cbam') return cbamRows(packs?.cbam);
  if (slice === 'pricing') return pricingRows(packs?.pricing);
  if (slice === 'monitor') return monitorRows(packs?.monitor);
  if (slice === 'ets') return etsRows(packs?.ets);
  if (slice === 'ccts') return cctsRows(packs?.ccts);
  if (slice === 'registry') return registryRows(packs?.registry);
  if (slice === 'news') return newsRows(packs?.news);
  return [];
}

export const NEWS_FEEDS = [
  { outlet: 'Carbon Brief', url: 'https://www.carbonbrief.org/feed/' },
  { outlet: 'Mongabay India', url: 'https://india.mongabay.com/feed/' },
  { outlet: 'Climate Home News', url: 'https://www.climatechangenews.com/feed/' },
];

export const REGISTRY_FEEDS = [{ registry: 'Verra', url: 'https://verra.org/feed/' }];

export function carbonDataset(slice) {
  return {
    cbam: 'climate_cbam_watch.csv',
    pricing: 'climate_carbon_pricing.csv',
    monitor: 'climate_price_series.csv',
    ets: 'climate_ets_timeline.csv',
    ccts: 'climate_india_ccts.csv',
    registry: 'climate_registry_wire.csv',
    news: 'climate_news.csv',
  }[slice] || '';
}
