/**
 * Client helpers for the marketing homepage intro video.
 */

const EVENT = 'niy-marketing-intro-video';

export function emptyIntroVideo() {
  return {
    ok: true,
    enabled: true,
    title: 'What nter.pro is',
    subtitle: 'A short walkthrough for visitors deciding whether to sign in.',
    videoUrl: '',
    externalUrl: '',
    posterUrl: '',
    fileName: '',
    updatedAt: '',
    bytes: 0,
    hasVideo: false,
  };
}

export async function fetchIntroVideo(signal) {
  try {
    const res = await fetch('/api/marketing/intro-video', { signal });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) return emptyIntroVideo();
    return { ...emptyIntroVideo(), ...body };
  } catch {
    return emptyIntroVideo();
  }
}

export async function saveIntroVideoMeta(patch) {
  const res = await fetch('/api/marketing/intro-video', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error(body?.error || `Save failed (${res.status})`);
  window.dispatchEvent(new Event(EVENT));
  return body;
}

export async function uploadIntroVideo(file, onProgress) {
  if (!file) throw new Error('Choose a video file first.');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/marketing/intro-video');
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('X-Filename', file.name || 'intro-video.mp4');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok) {
        window.dispatchEvent(new Event(EVENT));
        resolve(body);
      } else {
        reject(new Error(body?.error || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
}

export async function clearIntroVideo() {
  const res = await fetch('/api/marketing/intro-video', { method: 'DELETE' });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error(body?.error || `Clear failed (${res.status})`);
  window.dispatchEvent(new Event(EVENT));
  return body;
}

export function subscribeIntroVideo(fn) {
  const on = () => fn();
  window.addEventListener(EVENT, on);
  return () => window.removeEventListener(EVENT, on);
}

/** Turn a YouTube/Vimeo/mp4 URL into an embeddable form. */
export function videoPlayback(meta) {
  const external = String(meta?.externalUrl || '').trim();
  const file = String(meta?.videoUrl || '').trim();
  if (file) {
    return { kind: 'file', src: file, poster: meta?.posterUrl || '' };
  }
  if (!external) return { kind: 'none' };

  const yt =
    external.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/) ||
    external.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (yt) {
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  }
  const vim = external.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) {
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vim[1]}` };
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(external) || /^https?:\/\//i.test(external)) {
    return { kind: 'file', src: external, poster: meta?.posterUrl || '' };
  }
  return { kind: 'iframe', src: external };
}
