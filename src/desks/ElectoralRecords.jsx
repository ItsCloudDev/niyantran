import { MANIFESTO_LIBRARY } from '../data/nationalCurated.js';
import { allocateSeats } from '../lib/nationalKpi.js';

function field(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function Tile({ k, v }) {
  return (
    <article className="nat-tile">
      <h4>{k}</h4>
      <strong>{v || 'Not published'}</strong>
    </article>
  );
}

export function AffidavitRecord({ row, onClear, onAskAi }) {
  const name = field(row, ['name', 'title']);
  const casesRaw = field(row, ['criminal_cases']) || '0';
  const n = Number(String(casesRaw).replace(/[^0-9.\-]/g, '')) || 0;
  const src = row.source_url;
  const pdf = row.pdf_url || (/\.pdf(\?|$)/i.test(String(src || '')) ? src : '');
  return (
    <div className="brec erec">
      <div className="brec-head">
        <div className="brec-titleblock">
          <h2>{name}</h2>
          <p className="brec-p muted" style={{ marginTop: 6, marginBottom: 0 }}>
            {[field(row, ['constituency']), field(row, ['party'])].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="brec-headbtns">
          {src ? (
            <a className="brec-ghost" href={src} target="_blank" rel="noreferrer">
              ↓ Source document
            </a>
          ) : (
            <span className="brec-ghost off">↓ Source document</span>
          )}
          <button type="button" className="brec-ghost" onClick={onClear}>
            All candidates
          </button>
        </div>
      </div>
      <div className="aff-cols">
        <section>
          <h3>WEALTH CHANGE (2019 → 2024)</h3>
          <div className="aff-empty">Pending analysis</div>
          <p>
            This candidate didn’t contest in 2019, or wasn’t matched to a 2019 record. That sentence cannot separate a genuine
            first-timer from a failed match, so this desk does not flag first-time candidates.
          </p>
        </section>
        <section>
          <h3>CRIMINAL CASES</h3>
          <strong className="aff-n">{n}</strong>
          <p>
            {n} case(s) declared in the nomination affidavit. Individual case detail (sections, court, status) isn’t published in this
            source — see the affidavit for full particulars. Pending cases and convictions are not separate columns here — Form 26
            separates them; this register does not.
          </p>
          <span className="brec-ghost off" title="Embed is host wiring — not in this build">
            ⊕ Embed
          </span>
        </section>
      </div>
      <div className="nat-tiles">
        <Tile k="Education" v={field(row, ['education'])} />
        <Tile k="Declared assets" v={field(row, ['total_assets'])} />
        <Tile k="Liabilities" v={field(row, ['liabilities'])} />
      </div>
      <p className="brec-p muted">Profession, photo and last two elections are not in this schema. No gauge, score, grade or ranking on a named person.</p>
      <div className="brec-actions">
        {pdf ? (
          <a href={pdf} target="_blank" rel="noreferrer">
            ↓ View PDF
          </a>
        ) : src ? (
          <a href={src} target="_blank" rel="noreferrer" title="This source is an affidavit page, not a PDF file">
            ↓ View PDF
          </a>
        ) : (
          <span className="off">↓ View PDF</span>
        )}
        <button type="button" className="ai" onClick={() => onAskAi?.()}>
          ✦ Ask AI
        </button>
      </div>
    </div>
  );
}

export function DelimitationRecord({ row, rows, meta, onClear, onAskAi }) {
  const scenario = (rows || []).filter((r) => r.name && r.proj != null);
  const data = scenario.length ? scenario : allocateSeats(meta?.house || 753);
  const house = meta?.house || data.reduce((s, r) => s + r.proj, 0);
  const gain = [...data].filter((r) => r.d > 0).sort((a, b) => b.d - a.d)[0];
  const lose = [...data].filter((r) => r.d < 0).sort((a, b) => a.d - b.d)[0];
  const d = Number(row.d) || 0;
  const popM = row.pop != null ? (Number(row.pop) / 1000).toFixed(1) : '—';
  return (
    <div className="brec erec">
      <div className="brec-head">
        <div className="brec-titleblock">
          <h2>{field(row, ['name', 'title'])}</h2>
          <p className="brec-p muted" style={{ marginTop: 6, marginBottom: 0 }}>
            House of {house} · largest remainder · NCP 2011–36 · illustrative
          </p>
        </div>
        <div className="brec-headbtns">
          <button type="button" className="brec-ghost" onClick={onClear}>
            All states
          </button>
        </div>
      </div>
      <div className="nat-kpi-row">
        <article>
          <h3>Seats before</h3>
          <strong>{row.now ?? '—'}</strong>
        </article>
        <article>
          <h3>Seats after</h3>
          <strong>{row.proj ?? '—'}</strong>
        </article>
        <article className={d > 0 ? 'ok' : d < 0 ? 'bad' : ''}>
          <h3>Net change</h3>
          <strong>
            {d > 0 ? '+' : ''}
            {d}
          </strong>
        </article>
        <article>
          <h3>Largest gainer</h3>
          <strong>{gain?.name || '—'}</strong>
          <span>{gain ? `+${gain.d}` : ''}</span>
        </article>
        <article>
          <h3>Largest loser</h3>
          <strong>{lose?.name || '—'}</strong>
          <span>{lose ? String(lose.d) : ''}</span>
        </article>
      </div>
      <p className="brec-p">
        2026 population (proj.): {popM} million. Largest gainer / loser are for this scenario, not a ranking of this state.
      </p>
      <p className="brec-p muted">
        Population-projection year, freeze-year toggle, total-seats slider and apportionment method are not built. This pane reads the
        baseline instrument already on the desk — it is not a second scenario engine.
      </p>
      <div className="brec-actions">
        <span className="off" title="Not built — use the house-size chips on the desk">
          Run scenario
        </span>
        <span className="off" title="Not built — choose 543 · current house on the desk">
          Reset to baseline
        </span>
        <span className="off" title="Not built">
          Compare with baseline
        </span>
        <span className="off" title="Not built">
          Export scenario
        </span>
        <button type="button" className="ai" onClick={() => onAskAi?.()}>
          ✦ Ask AI
        </button>
      </div>
    </div>
  );
}

export function ManifestoRecord({ row, onClear, onAskAi }) {
  const promise = field(row, ['promise', 'title']);
  const domain = field(row, ['domain']);
  const status = field(row, ['verifiable_status', 'status']);
  const src = row.source_url;
  return (
    <div className="brec erec">
      <div className="brec-head">
        <div className="brec-titleblock">
          <h2>{promise}</h2>
          {domain ? <p className="brec-p muted" style={{ marginTop: 6, marginBottom: 0 }}>{domain}</p> : null}
        </div>
        <div className="brec-headbtns">
          <button type="button" className="brec-ghost" onClick={onClear}>
            All promises
          </button>
        </div>
      </div>
      <div className="aff-cols">
        <section>
          <h3>COMMITMENT</h3>
          <p>{promise}</p>
        </section>
        <section>
          <h3>EVIDENCE TRAIL</h3>
          <span className="erec-chip">{status || 'No verifiable status in this row'}</span>
          <p>
            Neutral evidence-status only. Fulfilled / Broken is deliberately absent — an automated verdict on a named party is an
            editorial claim. The `_sarkariwaade_verdict` field is not shown.
          </p>
        </section>
      </div>
      <p className="brec-p muted">
        PDF of a named manifesto, sector-wise money, a key-offerings summary and a 16-step evidence ladder are not in this tracker.
        State commitments (Punjab / Himachal / Gujarat / Goa) are not ingested — licence unresolved.
      </p>
      <div className="brec-actions">
        <button type="button" onClick={onClear}>
          All promises
        </button>
        {src ? (
          <a href={src} target="_blank" rel="noreferrer">
            Open source document
          </a>
        ) : (
          <span className="off" title="No per-promise source URL in this tracker">
            Open source document
          </span>
        )}
        <button type="button" className="ai" onClick={() => onAskAi?.()}>
          ✦ Ask AI
        </button>
      </div>
      <h4 className="nat-subh">Party documents — not this promise</h4>
      <ul className="nat-lib">
        {MANIFESTO_LIBRARY.map(([lab, href]) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noreferrer">
              {lab}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
