/**
 * D14 — Central Tender board: only show tenders whose deadline is still open.
 * An all-expired board is worse than empty.
 */
function parseDeadline(raw) {
  const s = String(raw || '').replace(/-/g, ' ');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isOpenTender(row, now = Date.now()) {
  const d = parseDeadline(row?.deadline);
  return Boolean(d && d.getTime() > now);
}

export function applyOpenTenderFilterToFeed(feed) {
  const feature = String(feed?.feature || '');
  if (!/central tender|tender aggregator/i.test(feature)) return feed;
  const rows = Array.isArray(feed?.rows) ? feed.rows : [];
  if (!rows.length) return feed;
  const open = rows.filter((r) => isOpenTender(r));
  const expired = rows.length - open.length;
  if (!expired) return feed;
  return {
    ...feed,
    rows: open,
    meta: {
      ...(feed.meta || {}),
      tenderExpiredHidden: expired,
      boardNote:
        open.length === 0
          ? `All ${expired} archived tenders have passed their deadline. The board stays empty rather than listing expired notices.`
          : `Hidden ${expired} expired tender${expired === 1 ? '' : 's'}; showing ${open.length} still open.`,
    },
    source: {
      ...(feed.source || {}),
      note:
        open.length === 0
          ? 'No open tenders in the archive (deadlines passed). Not a live eProcure feed.'
          : feed.source?.note,
    },
  };
}
