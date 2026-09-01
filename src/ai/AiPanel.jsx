const SUGGESTIONS = [
  'What does this record document?',
  'Which source URL backs this row?',
  'Summarise coverage and freshness for this module.',
];

export default function AiPanel({ feed, selected, lang }) {
  const hi = lang === 'hi';
  const contextTitle = selected?.conflict_name || selected?.title || selected?.bill_name || selected?.name || feed?.feature || '';

  return (
    <div className="ai-panel">
      <div className="ai-history">
        <div className="ai-msg ai-msg-sys">
          {hi
            ? 'AI मार्ग अभी कॉन्फ़िगर नहीं है। कोई उत्तर उत्पन्न नहीं किया जाएगा।'
            : 'AI route not configured. Send is disabled until GROQ_API_KEY exists on the proxy. No answers are generated here.'}
        </div>
        {contextTitle ? (
          <div className="ai-msg ai-msg-ctx">
            <span>{hi ? 'चयनित पंक्ति' : 'Selected row'}</span>
            {contextTitle}
          </div>
        ) : (
          <div className="ai-msg ai-msg-ctx muted">
            {hi ? 'कोई पंक्ति चयनित नहीं।' : 'Select a feed row to attach it as context.'}
          </div>
        )}
      </div>
      <div className="ai-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled>
            {s}
          </button>
        ))}
      </div>
      <form
        className="ai-composer"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <textarea
          rows={3}
          placeholder={hi ? 'संदेश लिखें…' : 'Ask about the selected record…'}
          disabled
        />
        <button type="submit" disabled>
          {hi ? 'भेजें' : 'Send'}
        </button>
      </form>
      <p className="ai-foot">AI route not configured.</p>
    </div>
  );
}
