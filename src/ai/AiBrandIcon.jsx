/** Brand marks for Gemini / DeepSeek model chips. */

export function AiBrandIcon({ id, size = 14 }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 24 24', 'aria-hidden': true };
  switch (String(id || '').toLowerCase()) {
    case 'gemini':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M12 2.2 13.7 9l6.8.3-5.3 4.3 1.8 6.5L12 16.4 6.9 20.1l1.8-6.5L3.5 9.3 10.3 9 12 2.2z"
          />
        </svg>
      );
    case 'deepseek':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M4 12c0-4.4 3.6-8 8-8 3.1 0 5.8 1.8 7.1 4.4C17.4 6.6 14.9 5.5 12 5.5 8.4 5.5 5.5 8.4 5.5 12S8.4 18.5 12 18.5c2.9 0 5.4-1.1 7.1-2.9C17.8 18.2 15.1 20 12 20c-4.4 0-8-3.6-8-8zm10.2-.8c0 1.8-1.4 3.3-3.2 3.3S7.8 13 7.8 11.2 9.2 7.9 11 7.9s3.2 1.5 3.2 3.3zm2.5 1.1c.9 0 1.6-.8 1.6-1.7s-.7-1.7-1.6-1.7-1.6.8-1.6 1.7.7 1.7 1.6 1.7z"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
      );
  }
}
