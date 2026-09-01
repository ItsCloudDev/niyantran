import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TABS } from '../desks/catalog.js';
import { Icon, TAB_ICON } from './Icons.jsx';

export default function DeskSidebar({ tab, lang, onDesk, onClose }) {
  const hi = lang === 'hi';

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function labelOf(t) {
    if (hi) return t.labelHi;
    return t.label.charAt(0) + t.label.slice(1).toLowerCase();
  }

  function pick(id) {
    onDesk(id);
    onClose();
  }

  return createPortal(
    <div className="desk-side-root" role="presentation">
      <button type="button" className="desk-side-scrim" aria-label={hi ? 'बंद करें' : 'Close menu'} onClick={onClose} />
      <aside className="desk-side" role="dialog" aria-modal="true" aria-labelledby="desk-side-title">
        <header className="desk-side-head">
          <h2 id="desk-side-title">{hi ? 'डेस्क' : 'Desks'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={hi ? 'बंद करें' : 'Close'}>
            <Icon name="close" />
          </button>
        </header>
        <nav className="desk-side-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'on' : ''}
              onClick={() => pick(t.id)}
            >
              <Icon name={TAB_ICON[t.id] || 'globe'} size={16} />
              <span>{labelOf(t)}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>,
    document.body,
  );
}
