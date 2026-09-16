import { useState } from 'react';
import { USER_TYPES, userTypeOf } from '../lib/userTypes.js';
import {
  DEFAULT_PERSONA_PROMPTS,
  loadPersonaPrompts,
  resetPersonaPrompt,
  resetPersonaPrompts,
  savePersonaPrompts,
} from '../lib/personaPromptsStore.js';
import AdminPersonaChat from './AdminPersonaChat.jsx';

export function AiPersonasPage() {
  const [drafts, setDrafts] = useState(() => loadPersonaPrompts());
  const [typeId, setTypeId] = useState('student');
  const [msg, setMsg] = useState('');
  const meta = userTypeOf(typeId);
  const text = drafts[typeId] || '';
  const chars = text.length;
  const shipped = (DEFAULT_PERSONA_PROMPTS[typeId] || '').length;

  function onSave() {
    savePersonaPrompts(drafts);
    setMsg('Persona drafts saved for the admin probe only. Live desk chats keep using shipped src/data/personas/*.md on the server.');
  }

  return (
    <>
      <h1 className="adm-h1">AI personas</h1>
      <p className="adm-lede">
        Shipped persona files power live desk chats (server-side). Edits here are for the admin probe only and are not
        sent to production chats — save locally to try wording, then promote by updating{' '}
        <code>src/data/personas/*.md</code>. Never shown to the user.
      </p>
      <div className="adm-persona-types" role="tablist">
        {USER_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={typeId === t.id}
            className={typeId === t.id ? 'on' : ''}
            onClick={() => setTypeId(t.id)}
          >
            {t.short}
          </button>
        ))}
      </div>
      <div className="adm-persona-work">
        <div className="adm-card">
          <label className="adm-field">
            <span>
              {meta.label} · {chars.toLocaleString()} characters
              {shipped ? ` · shipped default ${shipped.toLocaleString()}` : ''}
            </span>
            <textarea
              className="adm-persona-body"
              value={text}
              spellCheck={false}
              onChange={(e) => {
                const value = e.target.value;
                setDrafts((map) => ({ ...map, [typeId]: value }));
                setMsg('');
              }}
            />
          </label>
          <p className="adm-hint">
            The probe uses this draft even before you save. Leave empty only for the generic research assistant.
          </p>
          <div className="adm-actions">
            <button className="adm-btn" type="button" onClick={onSave}>
              Save persona prompts
            </button>
            <button
              className="adm-btn ghost"
              type="button"
              onClick={() => {
                const next = resetPersonaPrompt(typeId);
                setDrafts(next);
                setMsg(`Restored shipped prompt for ${meta.short}.`);
              }}
            >
              Restore this type
            </button>
            <button
              className="adm-btn ghost"
              type="button"
              onClick={() => {
                setDrafts(resetPersonaPrompts());
                setMsg('Restored shipped prompts for every type.');
              }}
            >
              Restore all defaults
            </button>
            {msg ? <span className="adm-msg">{msg}</span> : null}
          </div>
        </div>
        <AdminPersonaChat typeId={typeId} personaPrompt={text} />
      </div>
    </>
  );
}
