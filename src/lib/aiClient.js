import { pickAiRole, activeAiProvider, AI_PROVIDERS } from './aiModelsStore.js';
import { personaPromptFor } from './personaPromptsStore.js';
import { sessionUser, userTypeOf } from './userStore.js';

export async function sendAiChat({
  roleId,
  messages,
  attachments,
  files,
  signal,
  userType,
  personaPrompt: override,
  model: modelOverride,
  provider: providerOverride,
}) {
  const role = pickAiRole(attachments, roleId);
  const live = activeAiProvider();
  const picked =
    AI_PROVIDERS.find((p) => p.enabled && p.model === modelOverride) ||
    AI_PROVIDERS.find((p) => p.enabled && p.id === providerOverride) ||
    live;
  const model = (modelOverride && String(modelOverride).trim()) || picked.model || role.model || live.model;
  let provider = String(
    (['gemini', 'openrouter', 'deepseek', 'openai', 'gpt'].includes(String(providerOverride || '').toLowerCase())
      ? providerOverride
      : null) ||
      picked.provider ||
      role.provider ||
      live.provider ||
      'gemini',
  ).toLowerCase();
  if (provider === 'openai' || provider === 'gpt') provider = 'openrouter';

  const typeId = userTypeOf(userType || sessionUser()?.type).id;
  const personaPrompt = override != null ? String(override) : personaPromptFor(typeId);
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: role.id,
      model,
      provider,
      userType: typeId,
      personaPrompt,
      messages,
      attachments,
      files: files || attachments?.flatMap((a) => a.files || []) || [],
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || `AI HTTP ${res.status}`);
  }
  return {
    ...body,
    role: { ...role, provider: body.provider || provider, model: body.model || model },
  };
}
