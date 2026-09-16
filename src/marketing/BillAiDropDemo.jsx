import { useEffect, useState } from 'react';

const BILLS = [
  'The Finance Bill, 2026',
  'The Boilers Bill, 2024',
  'The Banking Laws (Amendment) Bill, 2024',
];

/**
 * CR-05 — drag-a-bill-into-AI loop (decorative marketing animation).
 * Honours prefers-reduced-motion via CSS; JS only cycles the label.
 */
export default function BillAiDropDemo() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | drag | drop | reply

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPhase('reply');
      return undefined;
    }
    let t = 0;
    const id = setInterval(() => {
      t = (t + 1) % 8;
      if (t === 0) {
        setIdx((n) => (n + 1) % BILLS.length);
        setPhase('idle');
      } else if (t === 1 || t === 2) setPhase('drag');
      else if (t === 3) setPhase('drop');
      else setPhase('reply');
    }, 900);
    return () => clearInterval(id);
  }, []);

  const bill = BILLS[idx];

  return (
    <div className={`mkt-bill-demo phase-${phase}`} aria-hidden="true">
      <div className="mkt-bill-demo-stage">
        <div className="mkt-bill-card">
          <span className="tag">BILL</span>
          <strong>{bill}</strong>
          <em>Lok Sabha · introduced</em>
          <span className="grip">⠿ drag</span>
        </div>
        <div className="mkt-bill-path" />
        <div className={`mkt-ai-dock${phase === 'drop' || phase === 'reply' ? ' hot' : ''}`}>
          <header>
            <span>Ask AI</span>
            <i />
          </header>
          <div className="drop-zone">
            {phase === 'idle' || phase === 'drag' ? 'Drop a record here' : null}
            {phase === 'drop' ? 'Receiving bill…' : null}
            {phase === 'reply' ? (
              <p>
                Linked: passage stage, house, and source columns for <b>{bill}</b>. No recommendation —
                evidence only.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mkt-bill-demo-cap">
        Drag any bill row into Ask AI — the dock keeps the record and asks with provenance attached.
      </p>
    </div>
  );
}
