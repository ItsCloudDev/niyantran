/**
 * Sensitive demographic / political datasets — methodology notes and
 * display shaping so “leading bloc” is not shown as hard fact.
 */

const BLOC_SHARE_KEYS = ['catholic', 'muslim', 'st', 'obc', 'general', 'sc'];

export function isSensitiveBlocFeature(feature) {
  return /^(community bloc matrix|booth bloc composition)$/i.test(String(feature || ''));
}

export function isSensitiveFeature(feature) {
  const f = String(feature || '');
  return (
    isSensitiveBlocFeature(f) ||
    /^candidate affidavits$/i.test(f) ||
    /^prisons/i.test(f) ||
    /^constituency register$/i.test(f) ||
    /^booth register$/i.test(f)
  );
}

/** Plain-language note shown above the table / in the rail. */
export function sensitiveNoteFor(feature) {
  const f = String(feature || '');
  if (/^community bloc matrix$/i.test(f)) {
    return {
      tone: 'warn',
      title: 'Estimated community shares — not a census count',
      body:
        'These figures are modelled from the electoral roll (surname and community tags), not a house-to-house census. Shares under about 3% are hidden as too thin to trust. “Leading bloc” means the largest estimated share on this roll — treat it as a working estimate, not a fixed fact. Use for research context only; do not rank people or communities from this page alone.',
    };
  }
  if (/^booth bloc composition$/i.test(f)) {
    return {
      tone: 'warn',
      title: 'Booth community mix — estimated, with small cells hidden',
      body:
        'Numbers come from surname classification on the booth roll. Very small booths and tiny shares are blanked so they are not over-read. “Leading bloc” is the largest estimated group at that booth, not proof of who lives there. Export and share with care; this is sensitive research data.',
    };
  }
  if (/^candidate affidavits$/i.test(f)) {
    return {
      tone: 'warn',
      title: 'Affidavit figures need careful comparison',
      body:
        'Assets and cases come from candidate filings and can differ by election year and form. Pending cases are not the same as convictions. Compare like with like, and check the source year before drawing conclusions.',
    };
  }
  if (/^prisons/i.test(f)) {
    return {
      tone: 'warn',
      title: 'Prison and undertrial figures',
      body:
        'Capacity and undertrial shares depend on the reporting period and definition used by the source. This page does not rank prisons. Read the period and source before comparing states.',
    };
  }
  if (/^constituency register$|^booth register$/i.test(f)) {
    return {
      tone: 'warn',
      title: 'Leading bloc is an estimate',
      body:
        'Where a leading community label appears, it is an estimated share from roll modelling — not a census fact. Open Community Bloc Matrix / Booth Bloc Composition for the full share breakdown and method note.',
    };
  }
  return null;
}

function num(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function blankTinyShare(v, minPct = 3) {
  const n = num(v);
  if (n == null) return '—';
  if (n > 0 && n < minPct) return '—';
  return n;
}

function shareFromCount(count, electors, minPct = 3) {
  const c = num(count);
  const e = num(electors);
  if (c == null || e == null || e <= 0) return '—';
  const pct = Math.round((c / e) * 1000) / 10;
  if (pct > 0 && pct < minPct) return '—';
  return pct;
}

function leadingFromShares(row, keys) {
  let best = null;
  let bestV = -1;
  for (const k of keys) {
    const n = num(row[k]);
    if (n != null && n > bestV) {
      bestV = n;
      best = k;
    }
  }
  if (!best || bestV < 3) return { bloc: '', leadPct: null };
  const labels = {
    catholic: 'Catholic',
    muslim: 'Muslim',
    st: 'Hindu ST',
    obc: 'Hindu OBC',
    general: 'Hindu General',
    sc: 'Hindu SC',
    other: 'Other / residual',
  };
  return { bloc: `${labels[best] || best} (est.)`, leadPct: bestV };
}

/**
 * Shape bloc rows for safer display: shares, residual, suppressed cells,
 * and an estimated leading-bloc label.
 */
export function shapeSensitiveRows(feature, rows) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const f = String(feature || '');

  if (/^community bloc matrix$/i.test(f)) {
    return rows.map((r) => {
      if (r?.status === 'source_status') return r;
      const shares = {};
      let knownShown = 0;
      let knownAll = 0;
      for (const k of BLOC_SHARE_KEYS) {
        const original = num(r[k]);
        if (original != null) knownAll += original;
        const v = blankTinyShare(r[k], 3);
        shares[k] = v;
        const n = num(v);
        if (n != null) knownShown += n;
      }
      const unclassifiedRaw = num(r.unclassified);
      let other = unclassifiedRaw;
      if (other == null) {
        other = Math.max(0, Math.round((100 - knownAll) * 10) / 10);
      }
      // Fold suppressed tiny cells into residual so the row still adds up.
      const suppressed = Math.max(0, Math.round((knownAll - knownShown) * 10) / 10);
      if (other == null) other = 0;
      other = Math.round((other + suppressed) * 10) / 10;
      if (other > 0 && other < 3) other = null;
      const withShares = { ...r, ...shares, other: other == null || other === 0 ? '—' : other };
      const lead = leadingFromShares(withShares, [...BLOC_SHARE_KEYS, 'other']);
      return {
        ...withShares,
        bloc: lead.bloc || r.bloc || '',
        leadPct: lead.leadPct,
        methodology:
          'Modelled electoral-roll community shares. Small cells suppressed. Leading bloc is an estimate.',
        confidence: 'Estimated',
      };
    });
  }

  if (/^booth bloc composition$/i.test(f)) {
    return rows.map((r) => {
      if (r?.status === 'source_status') return r;
      const electors = num(r.electors);
      const thinBooth = electors != null && electors > 0 && electors < 40;
      const raw = {};
      const shares = {};
      let knownCount = 0;
      for (const k of BLOC_SHARE_KEYS) {
        const c = num(r[k]);
        raw[k] = r[k];
        if (c != null) knownCount += c;
        shares[k] = thinBooth ? '—' : shareFromCount(r[k], electors, 3);
      }
      let otherPct = '—';
      let otherRaw = null;
      if (!thinBooth && electors != null && electors > 0) {
        otherRaw = Math.max(0, electors - knownCount);
        otherPct = shareFromCount(otherRaw, electors, 3);
      }
      const withShares = { ...r, ...shares, other: otherPct, _blocRaw: raw, _otherRaw: otherRaw };
      const lead = leadingFromShares(withShares, [...BLOC_SHARE_KEYS, 'other']);
      return {
        ...withShares,
        bloc: thinBooth ? '—' : lead.bloc || (r.bloc ? `${r.bloc} (est.)` : ''),
        leadPct: thinBooth ? null : lead.leadPct,
        methodology:
          'Surname-classified booth roll. Shares shown; tiny cells and thin booths blanked. Leading bloc is an estimate.',
        confidence: thinBooth ? 'Suppressed — thin booth' : 'Estimated',
      };
    });
  }

  if (/^constituency register$|^booth register$/i.test(f)) {
    return rows.map((r) => {
      if (r?.status === 'source_status' || !r?.bloc) return r;
      const label = String(r.bloc);
      if (/\(est\.\)/i.test(label)) return r;
      return { ...r, bloc: `${label} (est.)` };
    });
  }

  return rows;
}

export function applySensitiveShapingToFeed(feed) {
  if (!feed || !isSensitiveFeature(feed.feature)) return feed;
  const note = sensitiveNoteFor(feed.feature);
  const rows = shapeSensitiveRows(feed.feature, feed.rows || []);
  const metaNote = [feed.meta?.note, note?.body].filter(Boolean).join(' ');
  return {
    ...feed,
    rows,
    meta: {
      ...(feed.meta || {}),
      sensitive: true,
      sensitiveTitle: note?.title || '',
      note: metaNote,
    },
  };
}
