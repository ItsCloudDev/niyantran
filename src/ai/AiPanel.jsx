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
import { AI_PROVIDERS, activeAiProvider, shortModelLabel } from '../lib/aiModelsStore.js';
import { sessionUser } from '../lib/userStore.js';
import { filesFromDrop, materializeAiDrop, openAiResearch, readAiDrag } from '../lib/aiDrop.js';
import { AiBrandIcon } from './AiBrandIcon.jsx';
import AiMarkdown from './AiMarkdown.jsx';

function contextLabel({ attachments, selected, featureName }) {
  const attached = (attachments || []).map((a) => a.title || a.feature).filter(Boolean);
  const picked =
    selected?.conflict_name ||
    selected?.bill_name ||
    selected?.subject ||
    selected?.title ||
    selected?.name;
  return String(attached[0] || picked || featureName || 'this material').trim();
}

function contextualPrompts({ attachments, selected, featureName }) {
  const topic = contextLabel({ attachments, selected, featureName });
  const hay = `${featureName || ''} ${topic}`.toLowerCase();

  if (/conflict|front|war|security|defen[cs]e/.test(hay)) {
    return [
      `Build a dated timeline of the recorded changes in ${topic}.`,
      `Separate verified facts, actor claims and unresolved points for ${topic}.`,
      `Which actors, regions and institutions are most relevant to this dossier?`,
    ];
  }
  if (/bill|legislat|parliament|policy|cabinet/.test(hay)) {
    return [
      `Explain the current recorded stage of ${topic} and what changed most recently.`,
      `Which institutions, sectors and provisions does ${topic} touch?`,
      `Compare the attached record with related measures in this packet.`,
    ];
  }
  if (/court|judg|case|law|verdict/.test(hay)) {
    return [
      `State the issue, holding and reasoning documented for ${topic}.`,
      `Identify the provisions and precedents cited in the attached material.`,
      `What is explicit in the record, and what would require further legal research?`,
    ];
  }
  if (/econom|market|budget|trade|carbon|commodit/.test(hay)) {
    return [
      `Summarise the latest recorded change in ${topic} and its measurement basis.`,
      `Which series or entities provide the most useful comparison for ${topic}?`,
      `Flag gaps, revisions or incompatible units in the attached data.`,
    ];
  }
  if (/transit|ship|air|flight|vessel/.test(hay)) {
    return [
      `Explain what this position record confirms about ${topic}.`,
      `Separate live fields from inferred or unavailable route details.`,
      `What should I compare across the attached transit records?`,
    ];
  }
  return [
    `What does the attached material document about ${topic}?`,
    `Organise the evidence into a short chronology and key entities.`,
    `Where is the record specific, and where is more evidence needed?`,
  ];
}

function Ico({ name, size = 16 }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z" fill="currentColor" stroke="none" />
          <path d="M19 13l.7 2.1L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.9L19 13z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9z" />
          <path d="M14 3v6h6M9 13h6M9 17h4" />
        </svg>
      );
    case 'doc-plus':
      return (
        <svg {...common} strokeWidth="1.6">
          <path d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V9z" />
          <path d="M13 3v6h6" />
          <path d="M10 14h4M12 12v4" />
        </svg>
      );
    case 'clip':
      return (
        <svg {...common}>
          <path d="M21 12.5l-8.2 8.2a5 5 0 01-7.1-7.1l9.2-9.2a3.2 3.2 0 014.5 4.5L10.2 18" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M3.4 20.6l17.8-8.1c.8-.4.8-1.5 0-1.9L3.4 2.5c-.7-.3-1.4.3-1.2 1l1.7 6.5c.1.4.4.7.8.8l8.1 1.2-8.1 1.2c-.4.1-.7.4-.8.8L2.2 19.6c-.2.7.5 1.3 1.2 1z" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="M6 14l6-6 6 6" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12l4 4L19 6" />
        </svg>
      );
    default:
      return null;
  }
}

function pickRoleForProvider(id) {
  if (id === 'gpt-astra') return 'EXPERT_ESCALATION';
  if (id === 'gemini-flash') return 'VISUAL_RESEARCH';
  return 'DEFAULT_ANALYST';
}

const RECOMMENDED_IDS = ['gemini-lite', 'gemini-flash'];

export default function AiPanel({ feed, selected, tab, featureName, lang, seed, onSeedConsumed, compact, onClose }) {
  const hi = lang === 'hi';
  const [state, setState] = useState(() => ensureAiChat());
  const [providerId, setProviderId] = useState(() => activeAiProvider().id);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const scroller = useRef(null);
  const box = useRef(null);
  const fileRef = useRef(null);
  const modelRef = useRef(null);

  const chat = useMemo(
    () => state.chats.find((c) => c.id === state.activeId) || state.chats[0] || null,
    [state],
  );
  const picked = AI_PROVIDERS.find((p) => p.id === providerId && p.enabled) || activeAiProvider();
  const attachments = chat?.attachments || [];
  const messages = (chat?.messages || []).filter((m) => m.role !== 'system');
  const emptyThread = messages.length === 0;

  useEffect(() => subscribeAiChats(setState), []);
  useEffect(() => {
    const live = activeAiProvider().id;
    if (!AI_PROVIDERS.find((p) => p.id === providerId)?.enabled) setProviderId(live);
  }, [providerId]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [chat?.messages?.length, busy]);

  useEffect(() => {
    if (!modelOpen) return undefined;
    function onDoc(e) {
      if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [modelOpen]);

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

  async function onPickFiles(e) {
    const list = [...(e.target.files || [])];
    e.target.value = '';
    if (!list.length) return;
    const dropped = await filesFromDrop({ dataTransfer: { files: list, items: [] } });
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

  function selectProvider(p) {
    if (!p.enabled) return;
    setProviderId(p.id);
    setModelOpen(false);
    if (chat) setChatRole(chat.id, pickRoleForProvider(p.id));
  }

  async function send(e) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const st = ensureAiChat();
    const id = st.activeId;
    const current = activeAiChat();
    const pins = current?.attachments || [];
    appendAiMessage(id, { role: 'user', content: text });
    setDraft('');
    setErr('');
    setBusy(true);
    try {
      const history = [...(current?.messages || []), { role: 'user', content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const model = AI_PROVIDERS.find((p) => p.id === providerId && p.enabled) || activeAiProvider();
      const out = await sendAiChat({
        roleId: current?.roleId || 'AUTO',
        messages: history.filter((m) => m.role === 'user' || m.role === 'assistant'),
        attachments: pins,
        userType: sessionUser()?.type,
        model: model.model,
        provider: model.provider,
      });
      appendAiMessage(id, {
        role: 'assistant',
        content: out.text,
        model: shortModelLabel({ model: out.model, provider: out.provider, id: model.id }) || model.label,
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

  const suggestions = useMemo(
    () => contextualPrompts({ attachments: chat?.attachments, selected, featureName }),
    [chat?.attachments, selected, featureName],
  );

  const recommended = AI_PROVIDERS.filter((p) => RECOMMENDED_IDS.includes(p.id));
  const others = AI_PROVIDERS.filter((p) => !RECOMMENDED_IDS.includes(p.id));

  return (
    <div
      className={`ai-shell ai-shell-v2${compact ? ' compact' : ''}${dragOver ? ' drop' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <header className="ai-v2-head">
        <div className="ai-v2-title">
          <Ico name="sparkles" size={18} />
          <b>{hi ? 'एआई अनुसंधान' : 'AI Research'}</b>
        </div>
        {onClose ? (
          <button type="button" className="ai-v2-close" onClick={onClose} aria-label={hi ? 'बंद करें' : 'Close'}>
            ×
          </button>
        ) : null}
      </header>

      <div className="ai-v2-tabs" role="tablist" aria-label={hi ? 'चैट' : 'Chats'}>
        <button
          type="button"
          className="ai-v2-new"
          onClick={() => createAiChat({ roleId: chat?.roleId || 'AUTO' })}
        >
          <Ico name="doc" size={14} />
          {hi ? 'नया अनुसंधान' : 'New research'}
        </button>
        <div className="ai-v2-tab-scroll">
          {(state.chats || []).map((c) => (
            <div key={c.id} className={`ai-v2-tab${c.id === chat?.id ? ' on' : ''}`}>
              <button type="button" role="tab" aria-selected={c.id === chat?.id} onClick={() => setActiveAiChat(c.id)}>
                {c.title || (hi ? 'नया अनुसंधान' : 'New research')}
              </button>
              {(state.chats || []).length > 1 ? (
                <button
                  type="button"
                  className="ai-v2-tab-x"
                  aria-label="Delete chat"
                  onClick={() => {
                    deleteAiChat(c.id);
                    ensureAiChat();
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="ai-v2-body">
        <div className="ai-v2-attach-row">
          <button type="button" className="ai-v2-attach-btn" onClick={() => fileRef.current?.click()}>
            <Ico name="clip" size={14} />
            {hi ? 'फ़ाइलें जोड़ें' : 'Attach files'}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.csv,.txt,.json,.png,.jpg,.jpeg,.webp"
            onChange={onPickFiles}
          />
        </div>

        <div className={`ai-v2-drop${dragOver ? ' on' : ''}${attachments.length ? ' has-files' : ''}`}>
          <Ico name="doc-plus" size={28} />
          <p>{hi ? 'तालिका से पंक्ति खींचें — या फ़ाइलें यहाँ छोड़ें' : 'Drag a row from the table — or drop files here'}</p>
        </div>

        {attachments.length > 0 ? (
          <ul className="ai-v2-files">
            {attachments.map((a) => (
              <li key={a.id}>
                <Ico name="doc" size={15} />
                <span title={a.title}>{a.title}</span>
                <button type="button" aria-label="Remove" onClick={() => removePin(a.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div ref={scroller} className="ai-v2-history">
          {messages.map((m) => (
            <div key={m.id} className={`ai-msg ai-msg-${m.role}${m.error ? ' err' : ''}`}>
              <span>{m.role === 'user' ? (hi ? 'आप' : 'You') : m.model || picked.label}</span>
              {m.role === 'assistant' && !m.error ? <AiMarkdown text={m.content} /> : m.content}
            </div>
          ))}
          {busy ? (
            <div className="ai-msg ai-msg-assistant">
              <span>{picked.label}</span>
              {hi ? 'पढ़ रहा है…' : 'Reading attached sources…'}
            </div>
          ) : null}
        </div>

        {emptyThread && !busy ? (
          <div className="ai-suggest ai-v2-suggest">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => {
                  setDraft(s);
                  box.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ai-v2-foot">
        {err ? <p className="ai-foot warn">{err}</p> : null}
        <form className="ai-v2-composer" onSubmit={send}>
          <button type="button" className="ai-v2-comp-clip" onClick={() => fileRef.current?.click()} aria-label="Attach">
            <Ico name="clip" size={16} />
          </button>
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
            placeholder={hi ? 'अपनी फ़ाइलों के बारे में पूछें…' : 'Ask a question about your files...'}
          />
          <button className="ai-v2-send" type="submit" disabled={busy || !draft.trim()} aria-label={hi ? 'भेजें' : 'Send'}>
            <Ico name="send" size={16} />
          </button>
        </form>

        <div className="ai-v2-model" ref={modelRef}>
          <button
            type="button"
            className={`ai-v2-model-btn${modelOpen ? ' open' : ''}`}
            aria-expanded={modelOpen}
            onClick={() => setModelOpen((v) => !v)}
          >
            <AiBrandIcon id={picked.provider} size={16} />
            <span>{picked.label.replace(/\s*-\s*/, ' ')}</span>
            <Ico name="chevron" size={14} />
          </button>
          {modelOpen ? (
            <div className="ai-v2-model-menu" role="listbox" aria-label={hi ? 'मॉडल' : 'Model'}>
              <p className="ai-v2-model-sec">{hi ? 'अनुशंसित' : 'Recommended'}</p>
              {recommended.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={p.id === picked.id}
                  className={`ai-v2-model-opt${p.id === picked.id ? ' on' : ''}${p.enabled ? '' : ' locked'}`}
                  disabled={!p.enabled}
                  title={p.enabled ? p.hint : p.hint}
                  onClick={() => selectProvider(p)}
                >
                  <AiBrandIcon id={p.provider} size={16} />
                  <span>{p.label.replace(/\s*-\s*/, ' ')}</span>
                  {p.id === picked.id ? <Ico name="check" size={14} /> : null}
                </button>
              ))}
              <p className="ai-v2-model-sec">{hi ? 'अन्य मॉडल' : 'Other models'}</p>
              {others.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={p.id === picked.id}
                  className={`ai-v2-model-opt${p.id === picked.id ? ' on' : ''}${p.enabled ? '' : ' locked'}`}
                  disabled={!p.enabled}
                  title={p.enabled ? p.hint : p.hint}
                  onClick={() => selectProvider(p)}
                >
                  <AiBrandIcon id={p.provider} size={16} />
                  <span>{p.label.replace(/\s*-\s*/, ' ')}</span>
                  {p.id === picked.id ? <Ico name="check" size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
