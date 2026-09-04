import { TABS } from '../desks/catalog.js';

export const DEFAULT_USER_TYPE = 'analyst';

export const USER_TYPES = [
  {
    id: 'student',
    label: 'Students + UPSC/PSC Aspirants',
    short: 'Student / UPSC',
    hint: 'Polity, current affairs, and exam-facing desks.',
    desks: ['home', 'national', 'state', 'local', 'law', 'economics', 'global', 'carbon'],
    startTab: 'national',
  },
  {
    id: 'journalist',
    label: 'Journalists',
    short: 'Journalist',
    hint: 'Newsroom coverage across every desk.',
    desks: 'all',
    startTab: 'home',
  },
  {
    id: 'lawyer',
    label: 'Lawyers',
    short: 'Lawyer',
    hint: 'Judgments, statute, and parliamentary record.',
    desks: ['home', 'law', 'national', 'state', 'global'],
    startTab: 'law',
  },
  {
    id: 'policy',
    label: 'Policy',
    short: 'Policy',
    hint: 'Legislation, government operations, and briefs.',
    desks: ['home', 'national', 'state', 'local', 'global', 'law', 'carbon', 'economics'],
    startTab: 'national',
  },
  {
    id: 'analyst',
    label: 'Research and Financial Analyst',
    short: 'Analyst',
    hint: 'Full terminal — research, markets, and every desk.',
    desks: 'all',
    startTab: 'home',
  },
];

const ALL_DESK_IDS = TABS.map((t) => t.id);

export function userTypeOf(id) {
  return USER_TYPES.find((t) => t.id === id) || USER_TYPES.find((t) => t.id === DEFAULT_USER_TYPE);
}

export function desksForType(typeId) {
  const spec = userTypeOf(typeId).desks;
  if (!spec || spec === 'all') return ALL_DESK_IDS;
  const allow = new Set(spec);
  allow.add('home');
  return ALL_DESK_IDS.filter((id) => allow.has(id));
}

export function tabsForType(typeId) {
  const allow = new Set(desksForType(typeId));
  return TABS.filter((t) => allow.has(t.id));
}

export function canOpenDesk(typeId, tabId) {
  return desksForType(typeId).includes(tabId);
}
