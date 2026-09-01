import { useState } from 'react';
import Login from './Login.jsx';
import TerminalShell from './shell/TerminalShell.jsx';

export default function App() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('niyantranAuthed') === '1',
  );

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return <TerminalShell />;
}
