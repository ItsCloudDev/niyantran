import { useState } from 'react';

const USER = 'analyst@niyantran';
const PASS = '12345678#';
const HERO = '/niyantran-hero.mp4';

export default function Login({ onSuccess }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = String(fd.get('user') || '').trim();
    const pass = String(fd.get('pass') || '');
    setPending(true);
    setError('');
    if (user === USER && pass === PASS) {
      sessionStorage.setItem('niyantranAuthed', '1');
      onSuccess();
      return;
    }
    setError('Invalid user ID or password.');
    setPending(false);
  }

  return (
    <div className="login-shell">
      <video
        className="login-video"
        src={HERO}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="login-veil" />
      <div className="login-wordmark">NIYANTRAN</div>
      <div className="login-card-col">
        <main className="login-box">
          <div className="login-mark" aria-hidden="true">
            ◐
          </div>
          <div className="login-brand">
            NIYANTRAN <span>TERMINAL</span>
          </div>
          <div className="login-title">ANALYST ACCESS ONLY</div>
          <form onSubmit={handleSubmit} autoComplete="off">
            <label className="login-field">
              <span>USER ID</span>
              <input name="user" type="text" autoComplete="username" spellCheck="false" required autoFocus />
            </label>
            <label className="login-field">
              <span>PASSWORD</span>
              <input name="pass" type="password" autoComplete="current-password" required />
            </label>
            <button className="login-submit" type="submit" disabled={pending}>
              {pending ? 'SIGNING IN…' : 'SIGN IN'}
            </button>
            <div className="login-error" role="alert">
              {error}
            </div>
          </form>
          <div className="login-hint">Restricted terminal. Access is limited to authorized analysts.</div>
        </main>
      </div>
    </div>
  );
}
