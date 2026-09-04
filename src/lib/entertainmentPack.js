/**
 * Entertainment desk. GDELT news searches are not schedules, charts, box-office
 * tables, TRAI filings or celebrity directories.
 */

import { isoDate } from './carbonPack.js';

export function entertainmentSlice(feature) {
  const n = String(feature || '');
  const hit = [
    [/^tv & streaming tonight$/i, 'tv'],
    [/^box office tracker$/i, 'box'],
    [/^entertainment news wire$/i, 'variety'],
    [/^bollywood & film wire$/i, 'bollywood'],
    [/^music charts.*india/i, 'music-in'],
    [/^music charts.*global|^music charts.*us/i, 'music-us'],
    [/^ott & studio intelligence$/i, 'ott'],
    [/^celebrity influence index$/i, 'celebrity'],
  ].find(([re]) => re.test(n));
  return hit ? hit[1] : '';
}

export function entertainmentNote(slice, extra = '') {
  const notes = {
    tv: 'TVmaze schedule for India and the United States — show, network and airtime. Not a GDELT search.',
    box: 'Wikidata Indian films released from 2024, with box-office (P2142) when present. Not weekend BOI / Box Office Mojo charts.',
    variety: 'Variety RSS — screen-trade headlines. Not a GDELT search.',
    bollywood:
      'NDTV Movies RSS, with Google News Bollywood as the declared fallback wire. Not a GDELT search.',
    'music-in': "Apple Music most-played songs, India. iTunes Top Songs is the fallback. Not a GDELT search.",
    'music-us': "Apple Music most-played songs, United States. iTunes Top Songs is the fallback. Not a GDELT search.",
    ott: 'Wikidata Indian video-on-demand services and film production companies with owners. Not TRAI subscriber, pricing or slate tables.',
    celebrity:
      'Wikidata Indian actors, singers and directors with a public follower count (P8687). Brand slates and box-office pull are not in this pull.',
  };
  const base = notes[slice] || 'Entertainment pack.';
  return extra ? `${base} ${extra}` : base;
}

export function rssWireRows(raw, outlet) {
  return (raw || [])
    .map((r) => {
      const title = String(r.title || '').trim();
      if (!title) return null;
      return {
        title,
        outlet: r.outlet || outlet || '',
        date: isoDate(r.date),
        source_url: r.source_url || r.link || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function tvmazeRows(list, country) {
  return (Array.isArray(list) ? list : [])
    .map((ep) => {
      const show = ep?.show || {};
      const name = String(show.name || '').trim();
      if (!name) return null;
      const net = show.network || show.webChannel || {};
      const episode =
        `S${ep.season ?? '?'}E${ep.number ?? '?'}` + (ep.name ? ` · ${ep.name}` : '');
      return {
        title: name,
        show: name,
        network: net.name || '—',
        country: country || net.country?.code || '',
        time: ep.airtime || '',
        episode,
        date: isoDate(ep.airstamp || ep.airdate),
        source_url: ep.url || show.url || '',
      };
    })
    .filter(Boolean);
}

function appleResult(r, i) {
  const track = String(r?.name || r?.title || '').trim();
  if (!track) return null;
  return {
    title: track,
    rank: String(r?.rank || i + 1),
    track,
    artist: r?.artistName || r?.artist || '',
    album: r?.collectionName || r?.album || '',
    date: isoDate(r?.releaseDate),
    source_url: r?.url || r?.link || '',
  };
}

export function appleChartRows(json) {
  const results = json?.feed?.results;
  if (Array.isArray(results) && results.length) {
    return results.map((r, i) => appleResult(r, i)).filter(Boolean);
  }
  const entries = json?.feed?.entry || [];
  return entries
    .map((e, i) =>
      appleResult(
        {
          name: e?.['im:name']?.label,
          artistName: e?.['im:artist']?.label,
          collectionName: e?.['im:collection']?.['im:name']?.label,
          url: Array.isArray(e?.link)
            ? e.link.find((l) => l?.attributes?.rel === 'alternate')?.attributes?.href
            : e?.link?.attributes?.href || e?.id?.label,
          releaseDate: e?.['im:releaseDate']?.label,
        },
        i,
      ),
    )
    .filter(Boolean);
}

function wdLabel(b, key) {
  const v = b?.[key]?.value || '';
  return /^Q[0-9]+$/.test(v) ? '' : v;
}

function wdQty(b, key) {
  const v = b?.[key]?.value;
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} bn`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} m`;
  if (n >= 1e3) return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return String(n);
}

export function wikidataFilmRows(json) {
  const bindings = json?.results?.bindings || [];
  const seen = new Set();
  const rows = [];
  for (const b of bindings) {
    const film = wdLabel(b, 'filmLabel');
    if (!film) continue;
    const date = isoDate(b.releaseDate?.value);
    const k = `${film}|${date}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({
      title: film,
      film,
      release_date: date,
      date,
      box_office: wdQty(b, 'boxOffice') || '—',
      source_url: b.film?.value || 'https://www.wikidata.org/',
    });
  }
  return rows.sort((a, b) => String(b.release_date).localeCompare(String(a.release_date)));
}

export function wikidataOttRows(json) {
  const bindings = json?.results?.bindings || [];
  const seen = new Set();
  const rows = [];
  for (const b of bindings) {
    const name = wdLabel(b, 'itemLabel');
    if (!name) continue;
    const kind = wdLabel(b, 'kind') || '—';
    const owner = wdLabel(b, 'ownerLabel') || '—';
    const k = `${name}|${kind}|${owner}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({
      title: name,
      service: name,
      kind,
      owner,
      source_url: b.item?.value || 'https://www.wikidata.org/',
    });
  }
  return rows.sort(
    (a, b) => String(a.kind).localeCompare(String(b.kind)) || String(a.service).localeCompare(String(b.service)),
  );
}

export function wikidataCelebrityRows(json) {
  const bindings = json?.results?.bindings || [];
  const seen = new Set();
  const rows = [];
  for (const b of bindings) {
    const person = wdLabel(b, 'personLabel');
    if (!person) continue;
    const n = Number(b.followers?.value);
    const followers = Number.isFinite(n) ? n : 0;
    if (seen.has(person)) continue;
    seen.add(person);
    rows.push({
      title: person,
      person,
      followers: wdQty(b, 'followers') || '—',
      _followers: followers,
      source_url: b.person?.value || 'https://www.wikidata.org/',
    });
  }
  return rows.sort((a, b) => b._followers - a._followers).map(({ _followers, ...r }) => r);
}

export const VARIETY_RSS = 'https://variety.com/feed/';
export const BOLLYWOOD_RSS = 'https://feeds.feedburner.com/ndtvmovies-latest';
export const BOLLYWOOD_NEWS_RSS =
  'https://news.google.com/rss/search?q=Bollywood+OR+%22Hindi+cinema%22+OR+%22Tamil+cinema%22+when:7d&hl=en-IN&gl=IN&ceid=IN:en';

export const TVMAZE_IN = 'https://api.tvmaze.com/schedule?country=IN';
export const TVMAZE_US = 'https://api.tvmaze.com/schedule?country=US';

export const APPLE_IN = 'https://rss.marketingtools.apple.com/api/v2/in/music/most-played/25/songs.json';
export const APPLE_US = 'https://rss.marketingtools.apple.com/api/v2/us/music/most-played/25/songs.json';
export const ITUNES_IN = 'https://itunes.apple.com/in/rss/topsongs/limit=25/json';
export const ITUNES_US = 'https://itunes.apple.com/us/rss/topsongs/limit=25/json';

export const WD_FILMS_Q =
  'SELECT ?film ?filmLabel ?releaseDate ?boxOffice WHERE { ' +
  '?film wdt:P31 wd:Q11424; wdt:P495 wd:Q668; wdt:P577 ?releaseDate. ' +
  'OPTIONAL { ?film wdt:P2142 ?boxOffice. } ' +
  'FILTER(?releaseDate > "2024-01-01T00:00:00Z"^^xsd:dateTime) ' +
  'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ' +
  'ORDER BY DESC(?releaseDate) LIMIT 250';

export const WD_OTT_Q =
  'SELECT ?item ?itemLabel ?owner ?ownerLabel ?kind WHERE { ' +
  '{ ?item wdt:P31/wdt:P279* wd:Q159688; wdt:P17 wd:Q668. BIND("OTT" AS ?kind) } ' +
  'UNION { ?item wdt:P31/wdt:P279* wd:Q1762059; wdt:P17 wd:Q668. BIND("Studio" AS ?kind) } ' +
  'OPTIONAL { ?item wdt:P127 ?owner. } ' +
  'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 400';

export const WD_CELEB_Q =
  'SELECT ?person ?personLabel ?followers WHERE { ' +
  '{ SELECT ?person (MAX(?f) AS ?followers) WHERE { ' +
  '?person wdt:P27 wd:Q668; wdt:P106 ?occ; wdt:P8687 ?f. ' +
  'VALUES ?occ { wd:Q33999 wd:Q10800557 wd:Q177220 wd:Q2526255 } } ' +
  'GROUP BY ?person ORDER BY DESC(?followers) LIMIT 250 } ' +
  'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }';
