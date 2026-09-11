import { pickAiRole, activeAiProvider } from './aiModelsStore.js';
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
}) {
  const role = pickAiRole(attachments, roleId);
  const live = activeAiProvider();
  // Live traffic: Gemini only. DeepSeek chips stay visible but locked.
  const model =
    (modelOverride && String(modelOverride).toLowerCase().includes('gemini') && modelOverride) ||
    (String(role.model || '').toLowerCase().includes('gemini') ? role.model : null) ||
    live.model;
  const typeId = userTypeOf(userType || sessionUser()?.type).id;
  const personaPrompt = override != null ? String(override) : personaPromptFor(typeId);
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: role.id,
      model,
      provider: 'gemini',
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
  return { ...body, role: { ...role, provider: 'gemini', model: body.model || model } };
}
