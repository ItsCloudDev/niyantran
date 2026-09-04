import { useEffect, useState } from 'react';
import MarketingSite from './marketing/MarketingSite.jsx';
import TerminalShell from './shell/TerminalShell.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { startSiteHead } from './lib/siteHead.js';

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

export default function App() {
  const [admin, setAdmin] = useState(isAdminPath);
  const [legal, setLegal] = useState(isLegalPath);
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('niyantranAuthed') === '1');

  useEffect(() => startSiteHead(), []);

  useEffect(() => {
    const sync = () => {
      setAdmin(isAdminPath());
      setLegal(isLegalPath());
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (admin) return <AdminApp />;

  if (legal || !authed) {
    return <MarketingSite onAuthed={() => setAuthed(true)} />;
  }

  return <TerminalShell onLogout={() => setAuthed(false)} />;
}
