export default function FeedLoader({ label = 'Loading feed…' }) {
  return (
    <div className="feed-loader" role="status" aria-live="polite">
      <i className="spinner" />
      <span>{label}</span>
    </div>
  );
}
