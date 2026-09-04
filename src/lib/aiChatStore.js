const KEY = 'niyantranAiChats';
const EVENT = 'niy-ai-chats';
const MAX_CHATS = 40;
const MAX_ATTACH = 12;

function uid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.chats)) return parsed;
  } catch {
    /* empty */
  }
  return { chats: [], activeId: '' };
}

function write(state) {
  const chats = (state.chats || []).slice(0, MAX_CHATS);
  const activeId = chats.some((c) => c.id === state.activeId) ? state.activeId : chats[0]?.id || '';
  const next = { chats, activeId };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

export function loadAiState() {
  return read();
}

export function subscribeAiChats(fn) {
  const on = () => fn(read());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function createAiChat(partial = {}) {
  const state = read();
  const chat = {
    id: uid(),
    title: partial.title || 'New research',
    roleId: partial.roleId || 'AUTO',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    attachments: [],
  };
  return write({ chats: [chat, ...state.chats], activeId: chat.id });
}

export function setActiveAiChat(id) {
  const state = read();
  return write({ ...state, activeId: id });
}

export function renameAiChat(id, title) {
  const state = read();
  return write({
    ...state,
    chats: state.chats.map((c) => (c.id === id ? { ...c, title: String(title || c.title).slice(0, 80), updatedAt: Date.now() } : c)),
  });
}

export function deleteAiChat(id) {
  const state = read();
  const chats = state.chats.filter((c) => c.id !== id);
  return write({ chats, activeId: state.activeId === id ? chats[0]?.id || '' : state.activeId });
}

export function activeAiChat() {
  const state = read();
  return state.chats.find((c) => c.id === state.activeId) || null;
}

export function ensureAiChat() {
  const state = read();
  if (state.activeId && state.chats.some((c) => c.id === state.activeId)) return state;
  return createAiChat();
}

export function setChatRole(id, roleId) {
  const state = read();
  return write({
    ...state,
    chats: state.chats.map((c) => (c.id === id ? { ...c, roleId, updatedAt: Date.now() } : c)),
  });
}

export function setChatAttachments(id, attachments) {
  const state = read();
  const list = (attachments || []).slice(0, MAX_ATTACH);
  return write({
    ...state,
    chats: state.chats.map((c) => (c.id === id ? { ...c, attachments: list, updatedAt: Date.now() } : c)),
  });
}

export function addChatAttachments(id, incoming) {
  const state = read();
  const chat = state.chats.find((c) => c.id === id);
  if (!chat) return state;
  const seen = new Set((chat.attachments || []).map((a) => a.id || `${a.kind}:${a.title}:${a.url || ''}`));
  const extra = [];
  for (const a of incoming || []) {
    const key = a.id || `${a.kind}:${a.title}:${a.url || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push({ ...a, id: a.id || uid() });
  }
  return setChatAttachments(id, [...(chat.attachments || []), ...extra]);
}

export function appendAiMessage(id, message) {
  const state = read();
  const chat = state.chats.find((c) => c.id === id);
  if (!chat) return state;
  const messages = [...(chat.messages || []), { ...message, id: message.id || uid(), at: Date.now() }];
  let title = chat.title;
  if ((!title || title === 'New research') && message.role === 'user') {
    title = String(message.content || 'Research').replace(/\s+/g, ' ').slice(0, 48);
  }
  const chats = [{ ...chat, title, messages, updatedAt: Date.now() }, ...state.chats.filter((c) => c.id !== id)];
  return write({ chats, activeId: id });
}

export function patchAiMessage(id, messageId, patch) {
  const state = read();
  return write({
    ...state,
    chats: state.chats.map((c) =>
      c.id === id
        ? {
            ...c,
            updatedAt: Date.now(),
            messages: (c.messages || []).map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          }
        : c,
    ),
  });
}
