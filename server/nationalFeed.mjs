/**
 * National desk APIs — Niyantran_National_KPI_review_v5_2.pptx
 * Embedded registers uncapped. Live URLs as listed. Never invent rows.
 * Policy pipeline: do not extend Google News.
 */
import {
  BUDGET_KEY,
  BUDGET_SCHEMES,
  FLAGSHIP_PROGRAMMES,
  UNION_PROMISES,
} from '../src/data/nationalCurated.js';
import { allocateSeats } from '../src/lib/nationalKpi.js';

const WB_MANF = 'https://api.worldbank.org/v2/country/IND/indicator/NV.IND.MANF.ZS?format=json&date=2000:2030&per_page=100';
const WB_IND = 'https://api.worldbank.org/v2/country/IND/indicator/NV.IND.TOTL.ZS?format=json&date=2000:2030&per_page=100';
const RBI_NOTES = 'https://www.rbi.org.in/notifications_rss.xml';
const RBI_PRESS = 'https://www.rbi.org.in/pressreleases_rss.xml';
const SEBI_RSS = 'https://www.sebi.gov.in/sebirss.xml';
const PIB_RSS = 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3';

function featName(feat) {
  return String(feat?.htmlFeature || '');
}
function heading(feat) {
  return String(feat?.workbookFunctions || feat?.htmlFeature || '').toUpperCase();
}

export async function serveNational(ctx) {
  const { feat, dataset, primary, links, coverage, loadEmbedded, tryUrls, envelope, statusRow } = ctx;
  const name = featName(feat);
  const tier = 'national';
  const archive =
    loadEmbedded(dataset) ||
    (/policy intelligence graph/i.test(name) ? loadEmbedded('national_bill_tracker.csv') : null) ||
    (/mp profiles/i.test(name) ? loadEmbedded('national_mp_report_card.csv') : null);

  if (/^bill passage/i.test(name)) {
    const rows = archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://sansad.in/api_rs/legislation/getBills?page=1&size=100&sortOn=billIntroducedDate&sortBy=desc'],
      coverage: { from: '1952-01-01', through: 'present', exhaustive: true },
      fallback: false,
      note: 'national_bill_tracker.csv — 1952–present. Sansad getBills is not wired for refresh. current_stage only; no passing date, so passed-per-year is not drawn. probability_score is a stored column, not a simulator.',
      meta: { section: 'BILL PASSAGE INDEX', status: 'REGISTER · SANSAD / PRS ARCHIVE', heading: heading(feat) },
    });
  }

  if (/policy intelligence graph/i.test(name)) {
    const rows = archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://sansad.in/api_rs/legislation/getBills?page=1&size=100&sortOn=billIntroducedDate&sortBy=desc'],
      coverage: { from: '1952-01-01', through: 'present', exhaustive: true },
      fallback: false,
      kind: 'graph',
      note: 'Sansad getBills is not wired for refresh. Register holds current_stage only — passed counts are stage labels, not passing dates.',
      meta: { section: 'POLICY INTELLIGENCE GRAPH', status: 'REGISTER · SANSAD / PRS ARCHIVE', heading: heading(feat) },
    });
  }

  if (/policy pipeline/i.test(name)) {
    const rows = (archive || []).map((r, i) => ({ ...r, id: r.id != null ? r.id : String(i) }));
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://egazette.gov.in/'],
      coverage,
      fallback: true,
      note: 'Eight-row register. news.google.com is the actual source of these rows and is impermissible to extend (ToS + robots.txt). Gazette of India is the correct source and is not wired.',
      meta: { section: 'POLICY PIPELINE — DRAFT TO GAZETTE', status: 'ARCHIVE · DO NOT EXTEND GOOGLE NEWS', heading: heading(feat) },
    });
  }

  if (/parliamentary question/i.test(name)) {
    const rows = archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://elibrary.sansad.in/'],
      coverage,
      fallback: false,
      note: 'Answer text is absent from every row. elibrary.sansad.in DSpace is not wired. Sub-label is honest about a loaded sample.',
      meta: { section: 'PARLIAMENTARY QUESTIONS', status: 'ARCHIVE · LARGEST NATIONAL DATASET', heading: heading(feat) },
    });
  }

  if (/regulatory body watch/i.test(name)) {
    const live = await tryUrls([RBI_NOTES, RBI_PRESS, SEBI_RSS, primary].filter(Boolean));
    const rows = live.rows.length ? live.rows : archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: live.rows.length ? 'live' : 'embedded',
      links: [RBI_NOTES, RBI_PRESS, SEBI_RSS],
      coverage,
      fallback: !live.rows.length,
      note: live.rows.length
        ? 'RBI / SEBI RSS. A one-shot RBI pull is ~7 items. TRAI / CBDT / IBBI / CCI are not wired, so a “Regulators” count of 1 is the RBI-only register.'
        : 'Regulator RSS did not return rows. Showing the last-known-good register (121 rows).',
      meta: {
        section: 'REGULATORY WATCH — RBI / SEBI / TRAI / CCI',
        status: live.rows.length ? 'LIVE · REGULATOR RSS' : 'ARCHIVE · LAST-KNOWN-GOOD',
        heading: heading(feat),
      },
    });
  }

  if (/candidate affidavit/i.test(name) && archive?.length) {
    return envelope({
      tier,
      feature: feat,
      rows: archive,
      adapter: 'embedded',
      links: ['https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/26863'],
      coverage,
      fallback: false,
      note: 'MyNeta / ADR basis already shipped. ADR terms bar commercial use, resale, redistribution and scraping. ECI + kaarana/AffidavitManagement is the compliant re-source and is not wired. No crimometer score.',
      meta: { section: 'CANDIDATE AFFIDAVITS', status: 'REGISTER · LICENCE-BLOCKED TO EXTEND', heading: heading(feat) },
    });
  }

  if (/delimitation/i.test(name)) {
    const rows = allocateSeats(753);
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'internal',
      links: links || [],
      coverage: { from: '2011', through: '2036', exhaustive: false },
      fallback: false,
      kind: 'simulator',
      note: 'SIMULATION · LARGEST REMAINDER · NCP 2011–36 PROJECTIONS · ILLUSTRATIVE. Analytics consume this output so the pane is not “unwired”.',
      meta: {
        section: 'SEAT REALLOCATION SIMULATOR',
        status: 'SIMULATION · LARGEST REMAINDER · NCP 2011–36 · ILLUSTRATIVE',
        heading: heading(feat),
        kind: 'simulator',
      },
    });
  }

  if (/manifestos/i.test(name)) {
    const rows = UNION_PROMISES.map(([promise, domain, verifiable_status]) => ({
      promise,
      domain,
      verifiable_status,
      title: promise,
      cycle: '2024',
    }));
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://www.bjp.org/manifesto', 'https://manifesto.inc.in/'],
      coverage: { from: '2024', through: '2024', exhaustive: false },
      fallback: false,
      note: 'CURATED · AS OF JAN 2026 · VERIFY AGAINST GAZETTE / PIB. Verifiable status, not fulfilled/broken. Sarkari Vaade 346-commitment package is not ingested (licence unresolved).',
      meta: { section: 'UNION MANIFESTO TRACKER — 2024', status: 'CURATED · VERIFY AGAINST GAZETTE / PIB', heading: heading(feat) },
    });
  }

  if (/mp profiles/i.test(name)) {
    const rows = archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://sansad.in/api_ls/member?page=1&size=100'],
      coverage,
      fallback: false,
      kind: 'cards',
      note: 'national_mp_report_card.csv — current house. Attendance empty in every row. Committees filled on most rows; blanks read “not recorded”, never “none”.',
      meta: { section: 'MP REPORT CARDS', status: 'REGISTER · 18TH LOK SABHA', heading: heading(feat) },
    });
  }

  if (/statement/i.test(name)) {
    return envelope({
      tier,
      feature: feat,
      rows: [],
      adapter: 'news-search',
      links: ['https://api.gdeltproject.org/'],
      coverage: { through: '7d' },
      fallback: true,
      gdelt: true,
      kind: 'wire',
      note: 'Person selector drives a GDELT coverage chart in the desk. Coverage volume, not statements. No contradiction verdict.',
      meta: { section: 'STATEMENT COVERAGE — GDELT 2.0', status: 'LIVE WIRE', heading: heading(feat) },
    });
  }

  if (/morning brief/i.test(name)) {
    return envelope({
      tier,
      feature: feat,
      rows: [],
      adapter: 'news-search',
      links: [PIB_RSS],
      coverage: { through: '7d' },
      fallback: true,
      gdelt: true,
      kind: 'panel',
      note: 'Panel: Top of the Day, Government Wire (PIB), Economy. PIB labelled offline when /api/rss is unreachable.',
      meta: { section: 'MORNING BRIEF', status: 'LIVE WIRE', heading: heading(feat) },
    });
  }

  if (/central tender/i.test(name) && archive?.length) {
    return envelope({
      tier,
      feature: feat,
      rows: archive,
      adapter: 'embedded',
      links: ['https://eprocure.gov.in/epublish/app?page=FrontEndTendersByOrganisation&service=page'],
      coverage,
      fallback: true,
      note: 'eProcure is HTML-gated. value_inr, sector, ministry_department and location are empty in all rows — Total Value must not print ₹0. GeM BidPlus robots.txt bars automated retrieval.',
      meta: { section: 'CENTRAL TENDERS', status: 'ARCHIVE · EPROCURE LAST-KNOWN-GOOD', heading: heading(feat) },
    });
  }

  if (/bureaucratic transfers|agmut/i.test(name) && archive?.length) {
    return envelope({
      tier,
      feature: feat,
      rows: archive,
      adapter: 'embedded',
      links: ['https://mha.gov.in/', 'https://services.delhi.gov.in/orders/378'],
      coverage,
      fallback: false,
      note: 'AGMUT cadre transfer register as gazetted. services.delhi.gov.in/orders/378 is not wired. Awards are not a field.',
      meta: { section: 'IAS / IPS TRANSFERS (AGMUT)', status: 'REGISTER · GAZETTED ORDERS', heading: heading(feat) },
    });
  }

  if (/cabinet decisions/i.test(name)) {
    const live = await tryUrls([PIB_RSS, primary].filter(Boolean));
    const rows = live.rows.length ? live.rows : archive || [];
    if (!rows.length) return null;
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: live.rows.length ? 'live' : 'embedded',
      links: [PIB_RSS],
      coverage,
      fallback: !live.rows.length,
      note: live.rows.length
        ? 'PIB RSS — cabinet-tagged items as published.'
        : 'PIB RSS did not return rows. Showing the last-known-good cabinet register (6 rows). PIB PRID archive is not wired.',
      meta: {
        section: 'CABINET DECISIONS',
        status: live.rows.length ? 'LIVE · PIB RSS' : 'ARCHIVE · LAST-KNOWN-GOOD',
        heading: heading(feat),
      },
    });
  }

  if (/centre-sanctioned|central projects/i.test(name)) {
    const rows = FLAGSHIP_PROGRAMMES.map(([programme, domain, verifiable_status, activity]) => ({
      programme,
      domain,
      verifiable_status,
      activity,
      title: programme,
    }));
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://ipm.mospi.gov.in/'],
      coverage: { from: '2026-01', through: '2026-01', exhaustive: false },
      fallback: false,
      note: 'Eight flagship programmes. PAIMANA not wired — no original/revised cost, expenditure or end dates. Winning bidder is dropped (refuted).',
      meta: { section: 'FLAGSHIP PROGRAMMES', status: 'CURATED · AS OF JAN 2026', heading: heading(feat) },
    });
  }

  if (/industry updates/i.test(name)) {
    const live = await tryUrls([WB_MANF, WB_IND, primary].filter(Boolean));
    if (live.rows.length) {
      return envelope({
        tier,
        feature: feat,
        rows: live.rows,
        adapter: 'live',
        links: [WB_MANF, WB_IND],
        coverage,
        fallback: false,
        note: 'World Bank NV.IND.MANF.ZS / NV.IND.TOTL.ZS — India, % of GDP. Units and issuing authority on the chart. Fiscal deficit, forex, IIP, WPI are not wired.',
        meta: { section: 'INDUSTRY UPDATES — WORLD BANK', status: 'LIVE · WORLD BANK WDI', heading: heading(feat) },
      });
    }
    return envelope({
      tier,
      feature: feat,
      rows: statusRow({
        adapter: 'api',
        url: WB_MANF,
        reason: 'World Bank open-data API unreachable from this network — it will retry automatically.',
        featureName: name,
      }),
      adapter: 'api',
      links: [WB_MANF],
      coverage,
      fallback: false,
      note: 'World Bank open-data API unreachable from this network — it will retry automatically.',
    });
  }

  if (/budget utilisation|budget & schemes/i.test(name)) {
    const rows = [
      ...BUDGET_KEY.map(([measure, value, note]) => ({ title: measure, value, note, kind: 'headline' })),
      ...BUDGET_SCHEMES.map(([scheme, allocation_cr]) => ({
        title: scheme,
        scheme,
        allocation_cr,
        kind: 'scheme',
      })),
    ];
    return envelope({
      tier,
      feature: feat,
      rows,
      adapter: 'embedded',
      links: ['https://www.indiabudget.gov.in/'],
      coverage: { from: '2025', through: '2026', exhaustive: false },
      fallback: false,
      note: 'CURATED · VERIFY AGAINST INDIABUDGET.GOV.IN. PDF is authoritative if Excel disagrees. Allocation only — scheme-level utilisation is refuted.',
      meta: { section: 'UNION BUDGET 2025–26', status: 'CURATED · APPROXIMATE', heading: heading(feat) },
    });
  }

  return null;
}
