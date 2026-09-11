const KEY = 'niyantranAiModels.v3';
const EVENT = 'niy-ai-models';

/**
 * Models shown in AI research (same set we had before).
 * Gemini slots are live; DeepSeek stays visible but locked until its key is wired.
 */
export const AI_PROVIDERS = [
  {
    id: 'gemini-lite',
    label: 'Gemini - Lite',
    model: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    enabled: true,
    hint: 'Default — fast briefing and desk questions',
  },
  {
    id: 'gemini-flash',
    label: 'Gemini - Flash',
    model: 'gemini-3.7-flash',
    provider: 'gemini',
    enabled: true,
    hint: 'Heavier synthesis / visual research',
  },
  {
    id: 'deepseek-flash',
    label: 'DeepSeek - Flash',
    model: 'deepseek-v4-flash',
    provider: 'deepseek',
    enabled: false,
    hint: 'Not connected yet',
  },
  {
    id: 'deepseek-pro',
    label: 'DeepSeek - Pro',
    model: 'deepseek-v4-pro',
    provider: 'deepseek',
    enabled: false,
    hint: 'Not connected yet',
  },
];

const DEFAULT_PROVIDER = AI_PROVIDERS.find((p) => p.enabled) || AI_PROVIDERS[0];

/** Research role map — routes through Gemini while DeepSeek is parked. */
export const AI_ROLES = [
  {
    id: 'DEFAULT_ANALYST',
    label: 'Default analyst',
    hint: 'Everyday briefing, tables, and multi-desk questions.',
    model: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    key: '',
  },
  {
    id: 'EXPERT_ESCALATION',
    label: 'Expert escalation',
    hint: 'Harder synthesis when the lite pass is not enough.',
    model: 'gemini-3.7-flash',
    provider: 'gemini',
    key: '',
  },
  {
    id: 'PDF_PARSER',
    label: 'PDF parser',
    hint: 'Read PDFs, scans, and attached documents.',
    model: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    key: '',
  },
  {
    id: 'VISUAL_RESEARCH',
    label: 'Visual research',
    hint: 'Charts, maps, images, and screenshot-backed questions.',
    model: 'gemini-3.7-flash',
    provider: 'gemini',
    key: '',
  },
];

function providerOf(model, fallback) {
  const m = String(model || '').toLowerCase();
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('deepseek')) return 'deepseek';
  return fallback || 'gemini';
}

export function getAiProvider(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || DEFAULT_PROVIDER;
}

export function activeAiProvider() {
  return AI_PROVIDERS.find((p) => p.enabled) || DEFAULT_PROVIDER;
}

/** Compact pill label: `Gemini - Lite`. */
export function shortModelLabel(role) {
  const hit = AI_PROVIDERS.find((p) => p.model === role?.model || p.id === role?.id);
  if (hit) return hit.label;
  const provider = String(role?.provider || providerOf(role?.model, '')).toLowerCase();
  const brand = provider === 'deepseek' ? 'DeepSeek' : 'Gemini';
  const m = String(role?.model || '').toLowerCase();
  let tag = '';
  if (m.includes('pro')) tag = 'Pro';
  else if (m.includes('lite')) tag = 'Lite';
  else if (m.includes('flash')) tag = 'Flash';
  else {
    const parts = m.split(/[-_]/).filter(Boolean);
    const last = parts[parts.length - 1] || '';
    tag = last ? last.charAt(0).toUpperCase() + last.slice(1) : '';
  }
  return tag ? `${brand} - ${tag}` : brand;
}

function clean(saved) {
  const byId = new Map((Array.isArray(saved) ? saved : []).map((r) => [r.id, r]));
  return AI_ROLES.map((base) => {
    const extra = byId.get(base.id) || {};
    // Force Gemini while other providers are parked — ignore stale deepseek localStorage.
    const model = String(extra.model || base.model).trim() || base.model;
    const forcedGemini = !String(model).toLowerCase().includes('gemini')
      ? base.model
      : model;
    return {
      ...base,
      label: String(extra.label || base.label),
      hint: String(extra.hint || base.hint),
      model: forcedGemini,
      provider: 'gemini',
      key: '',
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
    const hit = roles.find((r) => r.id === preferredId);
    if (hit) return { ...hit, provider: 'gemini', model: hit.model.includes('gemini') ? hit.model : DEFAULT_PROVIDER.model };
  }
  const kinds = (attachments || [])
    .flatMap((a) => [
      a.kind,
      a.mime,
      a.url,
      ...((a.files || []).map((f) => f.kind || f.url || f.mime || '')),
      ...(a.urls || []),
    ])
    .map((x) => String(x || '').toLowerCase());
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
