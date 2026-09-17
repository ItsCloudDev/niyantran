/** First-run tours — localStorage working copy; SQLite sync via userPrefsSync (A-15). */

export const HOME_TOUR_KEY = 'niyOnboardHomeDone';
const DESK_TOUR_PREFIX = 'niyTour:';
const DESK_TOUR_INDEX = 'niyTourDesks';

function emitDirty() {
  try {
    window.dispatchEvent(new CustomEvent('niy-prefs-dirty', { detail: { kind: 'tours' } }));
  } catch {
    /* ignore */
  }
}

function readDeskMap() {
  try {
    const raw = localStorage.getItem(DESK_TOUR_INDEX);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    /* ignore */
  }
  // Migrate scattered niyTour:* keys into one map when present.
  const desks = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DESK_TOUR_PREFIX) && localStorage.getItem(k) === '1') {
        desks[k.slice(DESK_TOUR_PREFIX.length)] = true;
      }
    }
  } catch {
    /* ignore */
  }
  return desks;
}

function writeDeskMap(desks) {
  localStorage.setItem(DESK_TOUR_INDEX, JSON.stringify(desks || {}));
}

export function readToursState() {
  return {
    home: isHomeTourDone(),
    desks: readDeskMap(),
  };
}

/** Apply server tours without re-pushing. Union with local (done wins). */
export function applyToursFromServer(tours) {
  if (!tours || typeof tours !== 'object') return readToursState();
  const local = readToursState();
  const home = Boolean(tours.home || local.home);
  const desks = { ...local.desks, ...(tours.desks || {}) };
  try {
    if (home) localStorage.setItem(HOME_TOUR_KEY, '1');
    writeDeskMap(desks);
    for (const id of Object.keys(desks)) {
      if (desks[id]) localStorage.setItem(`${DESK_TOUR_PREFIX}${id}`, '1');
    }
  } catch {
    /* ignore */
  }
  return { home, desks };
}

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
    emitDirty();
  } catch {
    /* ignore */
  }
}

export function isDeskTourDone(deskId) {
  const id = String(deskId || '').trim();
  if (!id || id === 'home') return true;
  try {
    if (localStorage.getItem(`${DESK_TOUR_PREFIX}${id}`) === '1') return true;
    return Boolean(readDeskMap()[id]);
  } catch {
    return true;
  }
}

export function markDeskTourDone(deskId) {
  const id = String(deskId || '').trim();
  if (!id) return;
  try {
    localStorage.setItem(`${DESK_TOUR_PREFIX}${id}`, '1');
    const desks = readDeskMap();
    desks[id] = true;
    writeDeskMap(desks);
    emitDirty();
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
