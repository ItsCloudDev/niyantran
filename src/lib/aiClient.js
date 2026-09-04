import { pickAiRole } from './aiModelsStore.js';
import { personaPromptFor } from './personaPromptsStore.js';
import { sessionUser, userTypeOf } from './userStore.js';

export async function sendAiChat({ roleId, messages, attachments, files, signal, userType, personaPrompt: override }) {
  const role = pickAiRole(attachments, roleId);
  const typeId = userTypeOf(userType || sessionUser()?.type).id;
  const personaPrompt = override != null ? String(override) : personaPromptFor(typeId);
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: role.id,
      model: role.model,
      provider: role.provider,
      key: role.key,
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
  return { ...body, role };
}
