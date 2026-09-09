import { useEffect, useState } from 'react';
import AiPanel from './AiPanel.jsx';

export default function AiDock({ feed, selected, tab, featureName, lang, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    function onOpen(e) {
      setOpen(true);
      if (e.detail && Object.keys(e.detail).length) setSeed(e.detail);
    }
    window.addEventListener('niy-ai-open', onOpen);
    return () => window.removeEventListener('niy-ai-open', onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <aside className="ai-dock" role="complementary" aria-label="AI research">
      <header className="ai-dock-h">
        <div>
          <b>AI research</b>
          <span>Drop a table row</span>
        </div>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>
      </header>
      <AiPanel
        feed={feed}
        selected={selected}
        tab={tab}
        featureName={featureName}
        lang={lang}
        seed={seed}
        onSeedConsumed={() => setSeed(null)}
      />
    </aside>
  );
}
