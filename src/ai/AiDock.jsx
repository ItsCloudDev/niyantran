import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AiPanel from './AiPanel.jsx';
import { AI_DND, filesFromDrop, readAiDrag } from '../lib/aiDrop.js';

export default function AiDock({ feed, selected, tab, featureName, lang, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const [armed, setArmed] = useState(false);

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
    function isAiDrag(e) {
      const types = [...(e.dataTransfer?.types || [])];
      return types.includes(AI_DND) || types.includes('Files');
    }
    function onOver(e) {
      if (isAiDrag(e)) setArmed(true);
    }
    function onEnd() {
      setArmed(false);
    }
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragend', onEnd);
    window.addEventListener('drop', onEnd);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragend', onEnd);
      window.removeEventListener('drop', onEnd);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function takeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setArmed(false);
    const payload = readAiDrag(e);
    const droppedFiles = await filesFromDrop(e);
    setOpen(true);
    if (payload || droppedFiles.length) setSeed({ drop: payload || undefined, droppedFiles });
  }

  return (
    <>
      {!open &&
        createPortal(
          <button
            type="button"
            className={`ai-fab${armed ? ' armed' : ''}`}
            onClick={() => setOpen(true)}
            onDragOver={(e) => {
              e.preventDefault();
              setArmed(true);
            }}
            onDrop={takeDrop}
          >
            AI
            <span>Research</span>
          </button>,
          document.body,
        )}
      {open && (
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
      )}
    </>
  );
}
