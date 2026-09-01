import { parseINR, tenderCloseBand } from '../lib/nationalKpi.js';
import BillRecordPane from './BillRecordPane.jsx';
import { AffidavitRecord, DelimitationRecord, ManifestoRecord } from './ElectoralRecords.jsx';

function field(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function Tile({ k, v, tone }) {
  return (
    <article className={`nat-tile${tone ? ` ${tone}` : ''}`}>
      <h4>{k}</h4>
      <strong>{v || '—'}</strong>
    </article>
  );
}

function SourceBtn({ href, label }) {
  if (!href) return null;
  return (
    <a className="nat-rec-btn" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function BillRecord({ row, onClear, onAskAi, liveCount, desk }) {
  return <BillRecordPane row={row} onClear={onClear} onAskAi={onAskAi} liveCount={liveCount} desk={desk} />;
}

function MpRecord({ row, onClear }) {
  const committees = field(row, ['committees']);
  const attendance = field(row, ['attendance_pct']);
  return (
    <div className="nat-rec">
      <header>
        <h2>{field(row, ['mp_name', 'name', 'title'])}</h2>
        <button type="button" onClick={onClear}>
          All records
        </button>
      </header>
      <p className="muted">
        {[field(row, ['party']), field(row, ['constituency']), field(row, ['state'])].filter(Boolean).join(' · ')}
      </p>
      <div className="nat-tiles">
        <Tile k="Questions raised" v={field(row, ['questions_asked']) || 'Not recorded in this dataset'} />
        <Tile k="Committee membership" v={committees || 'not recorded in this dataset'} />
        <Tile k="Attendance" v={attendance || 'Not in this dataset'} />
        <Tile k="MPLADS / projects" v="No column, no source" />
      </div>
      <p className="desk-note">
        Empty attendance is not “did not attend”. MPLADS fund utilisation is a recorded genuine absence in Indian public data. The other
        170 committee blanks must read “not recorded in this dataset”, never “none”.
      </p>
      <div className="nat-rec-actions">
        <SourceBtn href={row.source_url} label="↗ Source" />
      </div>
    </div>
  );
}

function TenderRecord({ row, onClear }) {
  const value = parseINR(row.value_inr);
  const band = tenderCloseBand(row);
  const buyer = field(row, ['ministry_department', 'buyer']);
  return (
    <div className="nat-rec">
      <header>
        <h2>{field(row, ['tender_title', 'title'])}</h2>
        <button type="button" onClick={onClear}>
          All tenders
        </button>
      </header>
      <p className={`nat-close-lab ${band.tone}`}>{band.label}</p>
      <div className="nat-tiles">
        <Tile k="Tender scale" v={value ? `₹${(value / 1e7).toFixed(2)} Cr` : 'Unscored · no value'} />
        <Tile k="Bids close" v={field(row, ['deadline'])} />
        <Tile k="Buyer" v={buyer || 'Not published'} />
        <Tile k="Sector" v={field(row, ['sector']) || 'Not published — no sector column'} />
      </div>
      <p className="desk-note">
        Statutory ladder (only when a value is published): Routine ≤ ₹50L (GFR Rule 162) / Standard ₹50L–2Cr / Substantial ₹2Cr–200Cr /
        Major &gt; ₹200Cr. Below ₹2 Cr, or with no value, naming companies would overstate the contract.
      </p>
      <div className="nat-src-cards">
        <article>
          <h4>CPPP</h4>
          <p>Live notices. No value on these rows.</p>
        </article>
        <article>
          <h4>GeM BidPlus</h4>
          <p>Would add value. robots.txt bars automated retrieval — not wired.</p>
        </article>
        <article>
          <h4>BidAssist</h4>
          <p>Licensed, paid. Not in this build.</p>
        </article>
      </div>
      <div className="nat-rec-actions">
        <SourceBtn href={row.source_url} label="↗ Source" />
      </div>
    </div>
  );
}

function TransferRecord({ row, onClear }) {
  return (
    <div className="nat-rec">
      <header>
        <h2>{field(row, ['officer_name', 'title'])}</h2>
        <button type="button" onClick={onClear}>
          All postings
        </button>
      </header>
      <div className="nat-tiles">
        <Tile k="Cadre" v={field(row, ['cadre'])} />
        <Tile k="Batch year" v={field(row, ['batch_year'])} />
        <Tile k="Order date" v={field(row, ['order_date', 'date'])} />
        <Tile k="State / UT" v={field(row, ['jurisdiction'])} />
      </div>
      <p>
        <strong>From</strong> {field(row, ['previous_posting']) || '—'}
      </p>
      <p>
        <strong>To</strong> {field(row, ['new_posting']) || '—'}
      </p>
      <p className="desk-note">Awards are not a field on these 29 rows. No award list was invented.</p>
      <div className="nat-rec-actions">
        <SourceBtn href={row.source_url} label="↓ Source document" />
      </div>
    </div>
  );
}

function QuestionRecord({ row, onClear }) {
  return (
    <div className="nat-rec">
      <header>
        <h2>{field(row, ['subject', 'title'])}</h2>
        <button type="button" onClick={onClear}>
          All questions
        </button>
      </header>
      <div className="nat-tiles">
        <Tile k="Ministry" v={field(row, ['ministry'])} />
        <Tile k="Asked by" v={[field(row, ['mp_name']), field(row, ['party']), field(row, ['house'])].filter(Boolean).join(' · ')} />
        <Tile k="Type" v={field(row, ['question_type'])} />
        <Tile k="Reported" v={field(row, ['date'])} />
      </div>
      <p className="desk-note">
        No answer text on this row — that is the gap, not volume. Authored analysis covers 0.4% of the register, so it does not lead this
        pane.
      </p>
      <div className="nat-rec-actions">
        <SourceBtn href={row.source_url} label="↗ Source" />
      </div>
    </div>
  );
}

function RegulatoryRecord({ row, onClear }) {
  return (
    <div className="nat-rec">
      <header>
        <h2>{field(row, ['title'])}</h2>
        <button type="button" onClick={onClear}>
          All notices
        </button>
      </header>
      <div className="nat-tiles">
        <Tile k="Regulator" v={field(row, ['regulator'])} />
        <Tile k="Action type" v={field(row, ['action_type']) || '—'} />
        <Tile k="Reported" v={field(row, ['date'])} />
        <Tile k="Tags" v="—" />
      </div>
      <div className="nat-rec-actions">
        <SourceBtn href={row.pdf_url} label="↓ Download PDF" />
        <SourceBtn href={row.detail_url || row.source_url} label="↗ Source" />
      </div>
    </div>
  );
}

function GenericRecord({ row, onClear, noun }) {
  const title = field(row, ['policy_name', 'topic', 'title', 'name', 'promise', 'programme']);
  const skip = new Set(['source_url', 'status', 'pdf_url', 'id']);
  const tiles = Object.entries(row || {}).filter(([k, v]) => !skip.has(k) && v && String(v).length < 80);
  return (
    <div className="nat-rec">
      <header>
        <h2>{title || 'Record'}</h2>
        <button type="button" onClick={onClear}>
          All {noun}
        </button>
      </header>
      <div className="nat-tiles">
        {tiles.slice(0, 6).map(([k, v]) => (
          <Tile key={k} k={k.replace(/_/g, ' ')} v={String(v)} />
        ))}
      </div>
      {/news\.google\.com/i.test(row.source_url || '') ? (
        <p className="desk-note">
          This row’s source_url is news.google.com. Google News ToS restricts commercial use — the link is shown as provenance, not as a
          feed to extend.
        </p>
      ) : null}
      <div className="nat-rec-actions">
        <SourceBtn href={row.pdf_url} label="↓ View PDF" />
        <SourceBtn href={row.source_url} label="↗ Source" />
      </div>
    </div>
  );
}

export default function NationalRecord({ row, feature, onClear, onAskAi, liveCount, rows, meta }) {
  const f = String(feature || '');
  if (/bill passage/i.test(f)) return <BillRecord row={row} onClear={onClear} onAskAi={onAskAi} liveCount={liveCount} desk="bill" />;
  if (/candidate affidavit/i.test(f)) return <AffidavitRecord row={row} onClear={onClear} onAskAi={onAskAi} />;
  if (/delimitation/i.test(f)) return <DelimitationRecord row={row} rows={rows} meta={meta} onClear={onClear} onAskAi={onAskAi} />;
  if (/mp profiles|mp report/i.test(f)) return <MpRecord row={row} onClear={onClear} />;
  if (/central tender/i.test(f)) return <TenderRecord row={row} onClear={onClear} />;
  if (/agmut|bureaucratic transfers/i.test(f)) return <TransferRecord row={row} onClear={onClear} />;
  if (/parliamentary question/i.test(f)) return <BillRecord row={row} onClear={onClear} onAskAi={onAskAi} liveCount={liveCount} desk="question" />;
  if (/regulatory body watch/i.test(f)) return <BillRecord row={row} onClear={onClear} onAskAi={onAskAi} liveCount={liveCount} desk="regulatory" />;
  if (/statement/i.test(f)) {
    return (
      <div className="nat-rec">
        <header>
          <h2>{field(row, ['title'])}</h2>
          <button type="button" onClick={onClear}>
            All coverage
          </button>
        </header>
        <div className="nat-tiles">
          <Tile k="Seen" v={field(row, ['date'])} />
          <Tile k="Source" v={field(row, ['source']) || 'GDELT'} />
        </div>
        <p className="desk-note">
          This is a news-search hit, not a statement. Document-diff (two dated primary documents side by side) is not built. No
          contradiction verdict.
        </p>
        <div className="nat-rec-actions">
          <SourceBtn href={row.source_url} label="↗ Source" />
        </div>
      </div>
    );
  }
  if (/policy pipeline/i.test(f)) return <BillRecord row={row} onClear={onClear} onAskAi={onAskAi} liveCount={liveCount} desk="pipeline" />;
  if (/cabinet/i.test(f)) return <GenericRecord row={row} onClear={onClear} noun="decisions" />;
  if (/manifestos/i.test(f)) return <ManifestoRecord row={row} onClear={onClear} onAskAi={onAskAi} />;
  return <GenericRecord row={row} onClear={onClear} noun="records" />;
}
