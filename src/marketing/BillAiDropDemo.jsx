import { useEffect, useRef, useState } from 'react';

const BILLS = [
  'The Finance Bill, 2026',
  'The Boilers Bill, 2024',
  'The Banking Laws (Amendment) Bill, 2024',
  'The Tribunals Reforms Bill, 2026',
];

const CYCLE_MS = 8000;
/** Swap while card + reply are both hidden (≈86–94% of the CSS cycle). */
const SWAP_AT_MS = Math.round(CYCLE_MS * 0.88);

/**
 * CR-05 — drag-a-bill-into-AI loop (decorative marketing animation).
 * Motion is CSS-driven; JS only advances the bill label while the card is invisible.
 */
export default function BillAiDropDemo() {
  const [idx, setIdx] = useState(0);
  const [reduced, setReduced] = useState(false);
  const swapRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const advance = () => setIdx((n) => (n + 1) % BILLS.length);
    const arm = () => {
      clearTimeout(swapRef.current);
      swapRef.current = window.setTimeout(advance, SWAP_AT_MS);
    };
    arm();
    const loop = window.setInterval(arm, CYCLE_MS);
    return () => {
      clearInterval(loop);
      clearTimeout(swapRef.current);
    };
  }, [reduced]);

  const bill = BILLS[idx];

  return (
    <div className={`mkt-bill-demo${reduced ? ' is-static' : ''}`} aria-hidden="true">
      <div className="mkt-bill-demo-stage" style={{ '--bill-cycle': `${CYCLE_MS}ms` }}>
        <div className="mkt-bill-flyer">
          <div className="mkt-bill-card">
            <span className="tag">BILL</span>
            <strong>{bill}</strong>
            <em>Lok Sabha · introduced</em>
            <span className="grip">⠿ drag</span>
          </div>
        </div>

        <svg className="mkt-bill-trail" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
          <path
            className="mkt-bill-trail-path"
            d="M8 40 C 70 8, 130 72, 192 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 8"
          />
        </svg>

        <div className="mkt-ai-dock">
          <header>
            <span>Ask AI</span>
            <i />
          </header>
          <div className="drop-zone">
            <span className="mkt-ai-hint hint-idle">Drop a record here</span>
            <span className="mkt-ai-hint hint-drop">Receiving bill…</span>
            <p className="mkt-ai-hint hint-reply">
              Linked: passage stage, house, and source for <b>{bill}</b>. Evidence only — no recommendation.
            </p>
          </div>
        </div>
      </div>
      <p className="mkt-bill-demo-cap">
        Drag any bill row into Ask AI — the dock keeps the record and asks with provenance attached.
      </p>
    </div>
  );
}
