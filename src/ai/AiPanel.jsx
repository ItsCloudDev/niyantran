import { useEffect, useMemo, useRef, useState } from 'react';
import { sendAiChat } from '../lib/aiClient.js';
import {
  activeAiChat,
  addChatAttachments,
  appendAiMessage,
  createAiChat,
  deleteAiChat,
  ensureAiChat,
  setActiveAiChat,
  setChatAttachments,
  setChatRole,
  subscribeAiChats,
} from '../lib/aiChatStore.js';
import { loadAiModels, pickAiRole, shortModelLabel, subscribeAiModels } from '../lib/aiModelsStore.js';
import { sessionUser } from '../lib/userStore.js';
import { filesFromDrop, materializeAiDrop, openAiResearch, readAiDrag } from '../lib/aiDrop.js';
import AiMarkdown from './AiMarkdown.jsx';

export default function AiPanel({ feed, selected, tab, featureName, lang, seed, onSeedConsumed, compact }) {
  const hi = lang === 'hi';
  const [state, setState] = useState(() => ensureAiChat());
  const [roles, setRoles] = useState(() => loadAiModels());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const scroller = useRef(null);
  const box = useRef(null);

  const chat = useMemo(
    () => state.chats.find((c) => c.id === state.activeId) || state.chats[0] || null,
    [state],
  );

  useEffect(() => subscribeAiChats(setState), []);
  useEffect(() => subscribeAiModels(setRoles), []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat?.messages?.length, busy]);

  useEffect(() => {
    if (!seed) return undefined;
    if (seed.attachFeed && !feed && !seed.row && !seed.drop && !seed.droppedFiles?.length) return undefined;
    let cancelled = false;
    (async () => {
      const st = ensureAiChat();
      const id = st.activeId;
      if (seed.drop) {
        const bits = await materializeAiDrop(seed.drop, { feed, feature: featureName, tier: tab });
        if (!cancelled) addChatAttachments(id, bits);
      }
      if (seed.droppedFiles?.length && !cancelled) addChatAttachments(id, seed.droppedFiles);
      if (seed.row) {
        const bits = await materializeAiDrop(
          { kind: 'row', row: seed.row, feature: featureName, tab, title: seed.row.title || seed.row.name },
          { feed, feature: featureName },
        );
        if (!cancelled) addChatAttachments(id, bits);
      } else if (seed.attachFeed && feed) {
        const bits = await materializeAiDrop({ kind: 'feed', feature: feed.feature, tab }, { feed });
        if (!cancelled) addChatAttachments(id, bits);
      }
      if (seed.prompt && !cancelled) setDraft(seed.prompt);
      if (!cancelled) onSeedConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [seed, feed, featureName, tab, onSeedConsumed]);

  async function attachDrop(payload) {
    const st = ensureAiChat();
    const bits = await materializeAiDrop(payload, { feed, feature: featureName, tier: tab });
    addChatAttachments(st.activeId, bits);
    openAiResearch();
  }

  async function attachCurrent() {
    const st = ensureAiChat();
    if (selected) {
      await attachDrop({ kind: 'row', row: selected, feature: featureName, tab, title: selected.conflict_name || selected.title || selected.name });
      return;
    }
    if (feed?.feature) {
      await attachDrop({ kind: 'feed', feature: feed.feature, tab });
    }
  }

  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const payload = readAiDrag(e);
    if (payload) await attachDrop(payload);
    const dropped = await filesFromDrop(e);
    if (dropped.length) {
      const st = ensureAiChat();
      addChatAttachments(st.activeId, dropped);
    }
  }

  function removePin(id) {
    if (!chat) return;
    setChatAttachments(
      chat.id,
      (chat.attachments || []).filter((a) => a.id !== id),
    );
  }

  async function send(e) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const st = ensureAiChat();
    const id = st.activeId;
    const current = activeAiChat();
    const attachments = current?.attachments || [];
    appendAiMessage(id, { role: 'user', content: text });
    setDraft('');
    setErr('');
    setBusy(true);
    try {
      const history = [...(current?.messages || []), { role: 'user', content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const out = await sendAiChat({
        roleId: current?.roleId || 'AUTO',
        messages: history.filter((m) => m.role === 'user' || m.role === 'assistant'),
        attachments,
        userType: sessionUser()?.type,
      });
      appendAiMessage(id, {
        role: 'assistant',
        content: out.text,
        model: out.model,
        provider: out.provider,
        roleUsed: out.role?.id,
      });
    } catch (ex) {
      const msg = ex.message || String(ex);
      setErr(msg);
      appendAiMessage(id, { role: 'assistant', content: `Could not complete that pass: ${msg}`, error: true });
    } finally {
      setBusy(false);
    }
  }

  const resolved = pickAiRole(chat?.attachments, chat?.roleId);

  return (
    <div
      className={`ai-shell${compact ? ' compact' : ''}${dragOver ? ' drop' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="ai-tabs">
        <button type="button" className="ai-new" onClick={() => createAiChat({ roleId: chat?.roleId || 'AUTO' })}>
          {hi ? '+ नई' : '+ New'}
        </button>
        <div className="ai-tabs-scroll" role="tablist" aria-label={hi ? 'चैट' : 'Chats'}>
          {(state.chats || []).map((c) => (
            <div key={c.id} className={`ai-tab${c.id === chat?.id ? ' on' : ''}`}>
              <button type="button" role="tab" aria-selected={c.id === chat?.id} onClick={() => setActiveAiChat(c.id)}>
                {c.title || 'New research'}
              </button>
              <button
                type="button"
                className="ai-del"
                aria-label="Delete chat"
                onClick={() => {
                  deleteAiChat(c.id);
                  ensureAiChat();
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-main">
        <header className="ai-bar">
          <button type="button" className="ai-attach-now" onClick={attachCurrent}>
            {hi ? 'यह पंक्ति जोड़ें' : 'Attach selected row'}
          </button>
        </header>

        <div ref={scroller} className="ai-history">
          <div className="ai-msg ai-msg-sys">
            {hi
              ? 'तालिका की पंक्ति यहाँ खींचें। PDF/CSV जुड़ने पर मॉडल उन्हें पढ़ेगा।'
              : 'Drag a row from the table — Russia–Ukraine War, a bill, a scheme. Linked PDFs, CSVs and sources are opened with your question.'}
          </div>
          {(chat?.attachments || []).length > 0 && (
            <div className="ai-pins">
              {chat.attachments.map((a) => (
                <span key={a.id} className="ai-pin" title={a.feature || a.kind}>
                  {a.title}
                  {a.files?.some((f) => f.kind === 'pdf') ? ' · PDF' : ''}
                  {a.files?.some((f) => f.kind === 'csv') ? ' · CSV' : ''}
                  <button type="button" aria-label="Remove attachment" onClick={() => removePin(a.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {(chat?.messages || []).filter((m) => m.role !== 'system').map((m) => (
            <div key={m.id} className={`ai-msg ai-msg-${m.role}${m.error ? ' err' : ''}`}>
              <span>{m.role === 'user' ? (hi ? 'आप' : 'You') : m.model || 'Niyantran'}</span>
              {m.role === 'assistant' && !m.error ? <AiMarkdown text={m.content} /> : m.content}
            </div>
          ))}
          {busy && (
            <div className="ai-msg ai-msg-assistant">
              <span>Niyantran</span>
              {hi ? 'पढ़ रहा है…' : 'Reading attached sources…'}
            </div>
          )}
        </div>

        <div className="ai-end">
          {err ? <p className="ai-foot warn">{err}</p> : null}
          {!(chat?.messages || []).length && (
            <div className="ai-suggest">
              {[
                'What does this packet actually document?',
                'List source URLs and what each one supports.',
                'Where is the evidence thin or missing?',
              ].map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => { setDraft(s); box.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <form className="ai-composer" onSubmit={send}>
            <textarea
              ref={box}
              rows={2}
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={hi ? 'इस संदर्भ के बारे में पूछें…' : 'Ask across the attached desks and files…'}
            />
            <div className="ai-compose-row">
              <select
                className="ai-model"
                aria-label={hi ? 'मॉडल' : 'Model'}
                title={`${resolved.label} · ${resolved.model}`}
                value={chat?.roleId || 'AUTO'}
                onChange={(e) => chat && setChatRole(chat.id, e.target.value)}
              >
                <option value="AUTO" title={`${resolved.label} · ${resolved.model}`}>
                  auto [{resolved.provider || 'model'}]
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} title={`${r.label} · ${r.model}`}>
                    {shortModelLabel(r)}
                  </option>
                ))}
              </select>
              <button className="ai-send" type="submit" disabled={busy || !draft.trim()}>
                {hi ? 'भेजें' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
