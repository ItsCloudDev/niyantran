import { useEffect, useState } from 'react';
import MarketingSite from './marketing/MarketingSite.jsx';
import TerminalShell from './shell/TerminalShell.jsx';
import PersonaChooser from './shell/PersonaChooser.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { startSiteHead } from './lib/siteHead.js';
import { readPersonaId } from './lib/personas.js';
import './shell/onboarding.css';

function pathKey() {
  return location.pathname.replace(/\/+$/, '') || '/';
}

function isAdminPath() {
  return pathKey() === '/admin';
}

function isLegalPath() {
  const p = pathKey();
  return p === '/privacy' || p === '/terms';
}

function isMarketingOverlayPath() {
  const raw = String(location.hash || '')
    .replace(/^#/, '')
    .replace(/^\/+/, '')
    .toLowerCase();
  return raw.startsWith('pricing') || raw.startsWith('login');
}

export default function App() {
  const [admin, setAdmin] = useState(isAdminPath);
  const [legal, setLegal] = useState(isLegalPath);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('niyantranAuthed') === '1');
  const [mktOverlay, setMktOverlay] = useState(isMarketingOverlayPath);
  const [personaReady, setPersonaReady] = useState(() => Boolean(readPersonaId()));

  useEffect(() => startSiteHead(), []);

  useEffect(() => {
    const sync = () => {
      setAdmin(isAdminPath());
      setLegal(isLegalPath());
      setMktOverlay(isMarketingOverlayPath());
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  if (admin) return <AdminApp />;

  // A-10: pricing / login hash must still resolve when already signed in.
  if (legal || !authed || mktOverlay) {
    return (
      <MarketingSite
        onAuthed={() => {
          setAuthed(true);
          setMktOverlay(false);
          setPersonaReady(Boolean(readPersonaId()));
          if (location.hash.toLowerCase().includes('login') || location.hash.toLowerCase().includes('pricing')) {
            location.hash = '#/';
          }
        }}
      />
    );
  }

  if (!personaReady) {
    return <PersonaChooser onDone={() => setPersonaReady(true)} />;
  }

  return (
    <TerminalShell
      onLogout={() => {
        setAuthed(false);
        setPersonaReady(Boolean(readPersonaId()));
      }}
    />
  );
}
