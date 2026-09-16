import { useEffect, useState } from 'react';
import {
  DESK_TOUR_STEPS,
  HOME_TOUR_STEPS,
  isDeskTourDone,
  isHomeTourDone,
  markDeskTourDone,
  markHomeTourDone,
} from '../lib/onboarding.js';

/**
 * Lightweight first-run coachmarks (CR-08).
 * Home: once. Each desk: 3 steps on first entry.
 */
export default function OnboardingTour({ kind, deskId }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (kind === 'home') {
      setOpen(!isHomeTourDone());
      setI(0);
      return;
    }
    if (kind === 'desk' && deskId) {
      setOpen(!isDeskTourDone(deskId));
      setI(0);
    }
  }, [kind, deskId]);

  if (!open) return null;

  const steps = kind === 'home' ? HOME_TOUR_STEPS : DESK_TOUR_STEPS;
  const step = steps[i] || steps[0];
  const last = i >= steps.length - 1;

  function finish() {
    if (kind === 'home') markHomeTourDone();
    else if (deskId) markDeskTourDone(deskId);
    setOpen(false);
  }

  function next() {
    if (last) finish();
    else setI((n) => n + 1);
  }

  return (
    <div className="niy-tour" role="dialog" aria-label="First-run tour">
      <div className="niy-tour-card">
        <p className="niy-tour-kicker">
          {kind === 'home' ? 'Home tour' : 'Desk tour'} · {i + 1}/{steps.length}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="niy-tour-actions">
          <button type="button" className="ghost" onClick={finish}>
            Skip
          </button>
          <button type="button" onClick={next}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
