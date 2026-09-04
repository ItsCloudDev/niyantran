import { useState } from 'react';
import { loadAiModels, resetAiModels, saveAiModels } from '../lib/aiModelsStore.js';

export function AiModelsPage() {
  const [roles, setRoles] = useState(() => loadAiModels());
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState({});

  function patch(id, field, value) {
    setRoles((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value };
        if (field === 'model') {
          next.provider = String(value).toLowerCase().includes('gemini') ? 'gemini' : 'deepseek';
        }
        return next;
      }),
    );
    setMsg('');
  }

  function onSave(e) {
    e.preventDefault();
    saveAiModels(roles);
    setMsg('AI models and keys saved in this browser. The research tab picks them up immediately.');
  }

  function onReset() {
    setRoles(resetAiModels());
    setMsg('Restored shipped defaults.');
  }

  return (
    <>
      <h1 className="adm-h1">AI models</h1>
      <p className="adm-lede">
        Four research roles. Keys stay in this browser (admin local storage) and are sent only to the same-origin
        <code> /api/ai/chat </code> proxy. Paste keys here — they are not committed. Desk training prompts live on the
        <b>AI personas</b> tab.
      </p>
      <form onSubmit={onSave}>
        <div className="adm-plans">
          {roles.map((r) => (
            <article key={r.id} className="adm-plan">
              <h3>{r.label}</h3>
              <p className="adm-plan-id">{r.id}</p>
              <div className="adm-form">
                <label className="adm-field span2">
                  <span>Display name</span>
                  <input value={r.label} onChange={(e) => patch(r.id, 'label', e.target.value)} />
                </label>
                <label className="adm-field span2">
                  <span>When to use</span>
                  <input value={r.hint} onChange={(e) => patch(r.id, 'hint', e.target.value)} />
                </label>
                <label className="adm-field">
                  <span>Provider</span>
                  <select value={r.provider} onChange={(e) => patch(r.id, 'provider', e.target.value)}>
                    <option value="deepseek">DeepSeek</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </label>
                <label className="adm-field">
                  <span>Model id</span>
                  <input value={r.model} onChange={(e) => patch(r.id, 'model', e.target.value)} />
                </label>
                <label className="adm-field span2">
                  <span>API key</span>
                  <span className="adm-inline">
                    <input
                      type={show[r.id] ? 'text' : 'password'}
                      value={r.key}
                      autoComplete="off"
                      onChange={(e) => patch(r.id, 'key', e.target.value)}
                    />
                    <button
                      type="button"
                      className="adm-btn ghost"
                      onClick={() => setShow((s) => ({ ...s, [r.id]: !s[r.id] }))}
                    >
                      {show[r.id] ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
              </div>
            </article>
          ))}
        </div>
        <div className="adm-actions">
          <button className="adm-btn" type="submit">
            Save AI config
          </button>
          <button className="adm-btn ghost" type="button" onClick={onReset}>
            Restore defaults
          </button>
          {msg ? <span className="adm-msg">{msg}</span> : null}
        </div>
      </form>
    </>
  );
}
