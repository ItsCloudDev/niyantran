import { PIG_SEC_META } from '../data/nationalCurated.js';

export function pigClassify(raw) {
  const s = String(raw || '').toUpperCase();
  if (/AGRICULTUR|FARMER|RURAL|FISHER|ANIMAL|FOOD PROCESS|PANCHAYAT/.test(s)) return { sec: 'Primary', dom: 'Agriculture & Rural' };
  if (/ENVIRONMENT|FOREST|WATER|JAL|EARTH SCIENCE|CLIMATE/.test(s)) return { sec: 'Primary', dom: 'Environment & Water' };
  if (/MINE|COAL|MINERAL/.test(s)) return { sec: 'Primary', dom: 'Mining & Minerals' };
  if (/POWER|PETROLEUM|NATURAL GAS|ENERGY|RENEWABLE/.test(s)) return { sec: 'Secondary', dom: 'Energy' };
  if (/RAILWAY|SHIPPING|ROAD TRANSPORT|HIGHWAY|CIVIL AVIATION|PORT|TRANSPORT|URBAN DEVELOP|HOUSING/.test(s)) {
    return { sec: 'Secondary', dom: 'Infrastructure & Transport' };
  }
  if (/COMMERCE|INDUSTR|CORPORATE|TEXTILE|STEEL|HEAVY|MSME|MICRO|CHEMICAL|FERTILIZ/.test(s)) {
    return { sec: 'Secondary', dom: 'Industry & Commerce' };
  }
  if (/COMMUNICATION|ELECTRONIC|INFORMATION TECHNOLOGY|BROADCAST|INFORMATION AND BROAD|TELECOM/.test(s)) {
    return { sec: 'Secondary', dom: 'Technology & Telecom' };
  }
  if (/FINANCE|TAX|REVENUE|BANKING|INSURANCE/.test(s)) return { sec: 'Services', dom: 'Finance & Taxation' };
  if (/HOME AFFAIRS|DEFENCE|SECURITY/.test(s)) return { sec: 'Services', dom: 'Home & Defence' };
  if (/LAW AND JUSTICE|JUSTICE|LEGAL|PERSONNEL|GRIEVANCE|PARLIAMENT/.test(s)) return { sec: 'Services', dom: 'Law & Governance' };
  if (/HEALTH|FAMILY WELFARE|AYUSH/.test(s)) return { sec: 'Services', dom: 'Health' };
  if (/HUMAN RESOURCE|EDUCATION|SKILL|YOUTH/.test(s)) return { sec: 'Services', dom: 'Education & Skills' };
  if (/LABOUR|EMPLOYMENT/.test(s)) return { sec: 'Services', dom: 'Labour & Employment' };
  if (/SOCIAL JUSTICE|WOMEN|CHILD|TRIBAL|MINORIT|CONSUMER|DISABIL|SOCIAL/.test(s)) return { sec: 'Services', dom: 'Social Welfare' };
  if (/EXTERNAL AFFAIRS|FOREIGN|OVERSEAS/.test(s)) return { sec: 'Services', dom: 'External Affairs' };
  return { sec: 'Services', dom: 'General Legislation' };
}

export function pigStagePassed(s) {
  return /passed|assent|act\b|enacted/i.test(s || '');
}

export function pigStageDead(s) {
  return /negativ|withdraw|lapse|reject/i.test(s || '');
}

export function pigYearOf(row) {
  const m = /(\d{4})/.exec(String(row?.date_introduced || ''));
  return m ? Number(m[1]) : 0;
}

export function buildPigModel(bills) {
  const rows = bills || [];
  const nodes = {};
  nodes.india = { id: 'india', level: 0, label: 'India', children: [] };
  const sectorIds = [];
  Object.keys(PIG_SEC_META).forEach((sk) => {
    const id = `sec:${sk}`;
    sectorIds.push(id);
    nodes[id] = { id, level: 1, label: PIG_SEC_META[sk].label, sector: sk, children: [], bills: [] };
    nodes.india.children.push(id);
  });
  const domMap = {};
  rows.forEach((b) => {
    const cls = pigClassify(b.sector);
    const domain = cls.dom;
    const parentSec = cls.sec;
    const domId = `dom:${domain}`;
    if (!domMap[domId]) {
      domMap[domId] = { id: domId, level: 2, label: domain, sector: parentSec, children: [], bills: [] };
      nodes[domId] = domMap[domId];
      nodes[`sec:${parentSec}`].children.push(domId);
    }
    const score = b.probability_score != null && b.probability_score !== '' ? Number(b.probability_score) : null;
    const billNode = {
      id: `bill:${b.id}`,
      level: 3,
      label: String(b.bill_name || 'Bill').replace(/^THE\s+/i, ''),
      children: [],
      raw: b,
      domain,
      sector: parentSec,
      stage: b.current_stage || '',
      passage: Number.isFinite(score) ? score : null,
      year: pigYearOf(b),
    };
    nodes[billNode.id] = billNode;
    domMap[domId].children.push(billNode.id);
    domMap[domId].bills.push(billNode);
    nodes[`sec:${parentSec}`].bills.push(billNode);
  });
  Object.values(domMap).forEach((d) => {
    d.children.sort((x, y) => {
      const dx = nodes[x].raw.date_introduced || '';
      const dy = nodes[y].raw.date_introduced || '';
      if (dy !== dx) return dy < dx ? -1 : 1;
      return (nodes[y].passage || 0) - (nodes[x].passage || 0);
    });
  });
  sectorIds.forEach((id) => {
    const s = nodes[id];
    s.billCount = s.bills.length;
    s.passed = s.bills.filter((b) => pigStagePassed(b.stage)).length;
    s.active = s.bills.filter((b) => !pigStagePassed(b.stage) && !pigStageDead(b.stage)).length;
    s.domainCount = s.children.length;
  });
  const years = rows.map(pigYearOf).filter((y) => y >= 1900);
  return {
    nodes,
    sectorIds,
    billTotal: rows.length,
    domainCount: Object.keys(domMap).length,
    yearMin: years.length ? Math.min(...years) : 1952,
    yearMax: years.length ? Math.max(...years) : 2026,
  };
}

const CX = 500;
const CY = 362;
const RINGS = [0, 150, 288, 408];
const MAX_BILLS = 12;

function visibleChildren(model, expanded, yearRange, id) {
  const n = model.nodes[id];
  if (!n) return [];
  if (n.level === 0) return model.sectorIds;
  if (n.level === 1) return expanded.has(id) ? n.children : [];
  if (n.level === 2) {
    if (!expanded.has(id)) return [];
    let ch = n.children;
    if (yearRange) {
      ch = ch.filter((c) => {
        const yy = model.nodes[c].year;
        return yy >= yearRange[0] && yy <= yearRange[1];
      });
    }
    return ch.slice(0, MAX_BILLS);
  }
  return [];
}

function weight(model, expanded, yearRange, id) {
  const ch = visibleChildren(model, expanded, yearRange, id);
  if (!ch.length) return 1;
  return ch.reduce((s, c) => s + weight(model, expanded, yearRange, c), 0);
}

export function pigLayout(model, expanded, yearRange) {
  const vis = {};
  function place(id, a0, a1, level) {
    const mid = (a0 + a1) / 2;
    const r = RINGS[Math.min(level, 3)];
    vis[id] = { angle: mid, x: CX + r * Math.cos(mid), y: CY + r * Math.sin(mid), level };
    const ch = visibleChildren(model, expanded, yearRange, id);
    if (!ch.length) return;
    const tot = ch.reduce((s, c) => s + weight(model, expanded, yearRange, c), 0);
    let a = a0;
    ch.forEach((c) => {
      const span = (a1 - a0) * (weight(model, expanded, yearRange, c) / tot);
      place(c, a, a + span, level + 1);
      a += span;
    });
  }
  place('india', -Math.PI / 2, Math.PI * 1.5, 0);
  return vis;
}

export function pigNodeStyle(n) {
  if (n.level === 0) return { r: 26, fill: '#8a6a2e', stroke: '#B18A42' };
  if (n.level === 1) return { r: 17, fill: '#2B332F', stroke: '#7A9254' };
  if (n.level === 2) return { r: 10, fill: '#232B27', stroke: '#5A665C' };
  let c = n.passage == null ? '#747C76' : n.passage >= 60 ? '#647C3C' : n.passage >= 30 ? '#B18A42' : '#7B2E2E';
  if (pigStagePassed(n.stage)) c = '#647C3C';
  if (pigStageDead(n.stage)) c = '#7B2E2E';
  return { r: 6, fill: c, stroke: 'rgba(255,255,255,.15)' };
}

export function pigEdgeTone(n) {
  if (n.level <= 2) return '#c9b896';
  if (pigStagePassed(n.stage)) return '#647C3C';
  if (pigStageDead(n.stage)) return '#7B2E2E';
  const p = n.passage;
  return p == null ? '#747C76' : p >= 60 ? '#647C3C' : p >= 30 ? '#B18A42' : '#982F2F';
}

export function pigYearCounts(model) {
  const counts = {};
  Object.values(model.nodes).forEach((n) => {
    if (n.level !== 3 || n.year < 1900) return;
    counts[n.year] = (counts[n.year] || 0) + 1;
  });
  const years = [];
  for (let y = model.yearMin; y <= model.yearMax; y++) years.push(y);
  const maxC = Math.max(1, ...years.map((y) => counts[y] || 0));
  return { years, counts, maxC };
}

export { PIG_SEC_META };
