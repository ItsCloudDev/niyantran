const KEY = 'niyantranAiModels';
const EVENT = 'niy-ai-models';

const DEEPSEEK_KEY = '';
const GEMINI_KEY = '';

export const AI_ROLES = [
  {
    id: 'DEFAULT_ANALYST',
    label: 'Default analyst',
    hint: 'Everyday briefing, tables, and multi-desk questions.',
    model: 'deepseek-v4-flash',
    provider: 'deepseek',
    key: DEEPSEEK_KEY,
  },
  {
    id: 'EXPERT_ESCALATION',
    label: 'Expert escalation',
    hint: 'Harder synthesis when the flash pass is not enough.',
    model: 'deepseek-v4-pro',
    provider: 'deepseek',
    key: DEEPSEEK_KEY,
  },
  {
    id: 'PDF_PARSER',
    label: 'PDF parser',
    hint: 'Read PDFs, scans, and attached documents.',
    model: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    key: GEMINI_KEY,
  },
  {
    id: 'VISUAL_RESEARCH',
    label: 'Visual research',
    hint: 'Charts, maps, images, and screenshot-backed questions.',
    model: 'gemini-3.7-flash',
    provider: 'gemini',
    key: GEMINI_KEY,
  },
];

function providerOf(model, fallback) {
  const m = String(model || '').toLowerCase();
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('deepseek')) return 'deepseek';
  return fallback || 'deepseek';
}

/** Compact pill label: `deepseek [flash]`, `gemini [lite]`. */
export function shortModelLabel(role) {
  const provider = String(role?.provider || providerOf(role?.model, '')).toLowerCase();
  const brand = provider === 'deepseek' ? 'deepseek' : provider === 'gemini' ? 'gemini' : (provider || 'model');
  const m = String(role?.model || '').toLowerCase();
  let tag = '';
  if (m.includes('pro')) tag = 'pro';
  else if (m.includes('lite')) tag = 'lite';
  else if (m.includes('flash')) tag = 'flash';
  else {
    const parts = m.split(/[-_]/).filter(Boolean);
    tag = parts[parts.length - 1] || '';
  }
  return tag ? `${brand} [${tag}]` : brand;
}

function clean(saved) {
  const byId = new Map((Array.isArray(saved) ? saved : []).map((r) => [r.id, r]));
  return AI_ROLES.map((base) => {
    const extra = byId.get(base.id) || {};
    const model = String(extra.model || base.model).trim() || base.model;
    return {
      ...base,
      label: String(extra.label || base.label),
      hint: String(extra.hint || base.hint),
      model,
      provider: extra.provider || providerOf(model, base.provider),
      key: String(extra.key != null ? extra.key : base.key).trim(),
    };
  });
}

export function loadAiModels() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return clean(JSON.parse(raw));
  } catch {
    /* defaults */
  }
  return clean([]);
}

export function saveAiModels(roles) {
  const value = clean(roles);
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  return value;
}

export function resetAiModels() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
  return loadAiModels();
}

export function getAiRole(id) {
  return loadAiModels().find((r) => r.id === id) || loadAiModels()[0];
}

export function pickAiRole(attachments = [], preferredId) {
  const roles = loadAiModels();
  if (preferredId && preferredId !== 'AUTO') {
    return roles.find((r) => r.id === preferredId) || roles[0];
  }
  const kinds = (attachments || []).flatMap((a) => [
    a.kind,
    a.mime,
    a.url,
    ...((a.files || []).map((f) => f.kind || f.url || f.mime || '')),
    ...((a.urls || [])),
  ]).map((x) => String(x || '').toLowerCase());
  if (kinds.some((k) => k.includes('pdf') || k.endsWith('.pdf'))) {
    return roles.find((r) => r.id === 'PDF_PARSER') || roles[0];
  }
  if (kinds.some((k) => /image|png|jpe?g|webp|gif|chart|map/.test(k))) {
    return roles.find((r) => r.id === 'VISUAL_RESEARCH') || roles[0];
  }
  return roles.find((r) => r.id === 'DEFAULT_ANALYST') || roles[0];
}

export function subscribeAiModels(fn) {
  const on = () => fn(loadAiModels());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}
