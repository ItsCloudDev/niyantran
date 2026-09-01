let booted = false;

function loadCss(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[data-niy-legacy="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.niyLegacy = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load ' + href));
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

export async function bootLegacy(onProgress) {
  if (booted) return;
  booted = true;

  window.NIY_KEYS = window.NIY_KEYS || {};
  sessionStorage.setItem('niyantranAuthed', '1');

  onProgress?.(8, 'Loading styles…');
  await loadCss('/legacy/css/terminal.css');

  onProgress?.(18, 'Mounting terminal…');
  const bodyHtml = await fetch('/legacy/body.html').then((r) => {
    if (!r.ok) throw new Error('legacy body missing — run npm run extract');
    return r.text();
  });
  const host = document.createElement('div');
  host.id = 'niy-legacy-mount';
  host.innerHTML = bodyHtml;
  document.body.appendChild(host);

  const login = document.getElementById('loginScreen');
  if (login) login.style.display = 'none';
  document.body.classList.remove('locked');

  onProgress?.(35, 'Loading terminal engine…');
  await loadScript('/legacy/all.js');

  document.body.classList.remove('locked');
  onProgress?.(100, 'Ready');
}
