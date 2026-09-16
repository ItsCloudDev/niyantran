/** First-run tours — localStorage only (no server accounts yet). */

export const HOME_TOUR_KEY = 'niyOnboardHomeDone';
const DESK_TOUR_PREFIX = 'niyTour:';

export function isHomeTourDone() {
  try {
    return localStorage.getItem(HOME_TOUR_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHomeTourDone() {
  try {
    localStorage.setItem(HOME_TOUR_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isDeskTourDone(deskId) {
  const id = String(deskId || '').trim();
  if (!id || id === 'home') return true;
  try {
    return localStorage.getItem(`${DESK_TOUR_PREFIX}${id}`) === '1';
  } catch {
    return true;
  }
}

export function markDeskTourDone(deskId) {
  const id = String(deskId || '').trim();
  if (!id) return;
  try {
    localStorage.setItem(`${DESK_TOUR_PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
}

export const HOME_TOUR_STEPS = [
  {
    title: 'Home brief',
    body: 'Hot topics, markets and latest rows land here. Open any card to jump into a desk.',
  },
  {
    title: 'Desk strip',
    body: 'National, Law, Global and the rest live on the top strip. Each desk opens modules from its dropdowns.',
  },
  {
    title: 'Ask AI',
    body: 'Drag a row into Ask AI, or open the dock from the corner. Provenance stays on the record.',
  },
];

export const DESK_TOUR_STEPS = [
  {
    title: 'Pick a module',
    body: 'Use the dropdown pills on this desk to open one feed at a time.',
  },
  {
    title: 'Work the table',
    body: 'Search, filter and select a row. The right rail shows evidence for the selection.',
  },
  {
    title: 'Keep provenance',
    body: 'Source labels stay on the feed. The terminal shows the record — it does not tell you what to conclude.',
  },
];
