import { useEffect, useState } from 'react';
import { ensureDeskBrief } from '../lib/deskBrief.js';
import { BarList, ColumnChart, DonutChart, Heatmap, PieChart, Sparkline, VizCard } from './AnalyticsViz.jsx';

const BAND_CLS = {
  strong: 'ok',
  moderate: '',
  weak: 'warn',
  speculative: 'warn',
};

/** Bold leading "Label:" and **markdown** spans in brief copy. */
function RichText({ text }) {
  const raw = String(text || '');
  const labeled = raw.match(/^([^:]{1,48}):\s*([\s\S]+)$/);
  const body = labeled ? labeled[2] : raw;
  const nodes = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(body))) {
    if (m.index > last) nodes.push(body.slice(last, m.index));
    nodes.push(<strong key={`b-${m.index}`}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < body.length) nodes.push(body.slice(last));
  if (labeled) {
    return (
      <>
        <strong className="desk-intel-label">{labeled[1]}:</strong> {nodes}
      </>
    );
  }
  return <>{nodes}</>;
}

export default function DeskIntel({ feed, selected, loading }) {
  const [brief, setBrief] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const feature = feed?.feature || '';
  const tier = feed?.tier || '';
  const rowKey =
    selected?.record_id ||
    selected?.id ||
    selected?.source_url ||
    selected?.title ||
    selected?.name ||
    '';

  useEffect(() => {
    if (loading || !feature || !selected || selected.status === 'source_status') {
      setBrief(null);
      setErr('');
      setBusy(false);
      return undefined;
    }
    const ac = new AbortController();
    let alive = true;
    setBusy(true);
    setErr('');
    ensureDeskBrief({
      feature,
      tier,
      row: selected,
      sourceNote: feed?.source?.note || '',
      signal: ac.signal,
    })
      .then((b) => {
        if (!alive) return;
        setBrief(b);
      })
      .catch((e) => {
        if (!alive || e?.name === 'AbortError') return;
        setErr(e.message || String(e));
        setBrief(null);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      ac.abort();
    };
  }, [feature, tier, rowKey, feed?.source?.note, loading, selected]);

  if (!feature) return null;

  if (!selected || selected.status === 'source_status') {
    return (
      <section className="desk-intel desk-intel-idle" aria-label="Entry brief">
        <header className="desk-intel-head">
          <div>
            <p className="desk-intel-kicker">Entry brief</p>
            <h3>Select a row to organise this entry</h3>
          </div>
        </header>
        <p className="desk-intel-idle-copy muted">
          Intelligence runs on the single record you pick in the table — not the whole desk.
        </p>
      </section>
    );
  }

  return (
    <section className="desk-intel" aria-label="Entry brief">
      <header className="desk-intel-head">
        <div>
          <p className="desk-intel-kicker">Entry brief</p>
          <h3>{brief?.headline || (busy ? 'Organising this entry…' : 'Entry intelligence')}</h3>
        </div>
        <div className="desk-intel-meta">
          {brief?.cached ? <span className="desk-intel-pill cached">Saved</span> : null}
          {brief && !brief.cached ? <span className="desk-intel-pill fresh">Fresh</span> : null}
          {busy ? <span className="desk-intel-pill busy">Working</span> : null}
        </div>
      </header>

      {err ? <p className="banner warn desk-intel-err">{err}</p> : null}

      {busy && !brief ? (
        <div className="desk-intel-skeleton" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {brief ? (
        <>
          {brief.summary?.length ? (
            <ul className="desk-intel-summary">
              {brief.summary.map((s) => (
                <li key={s}>
                  <RichText text={s} />
                </li>
              ))}
            </ul>
          ) : null}

          {brief.kpis?.length ? (
            <div className="kpi-grid desk-intel-kpis">
              {brief.kpis.map((k) => (
                <article
                  key={k.label}
                  className={`kpi-card${k.tone === 'ok' ? ' ok' : k.tone === 'warn' ? ' warn' : k.tone === 'bad' ? ' bad' : ''}`}
                >
                  <h3>{k.label}</h3>
                  <strong>{k.value}</strong>
                  <span>{k.sub}</span>
                </article>
              ))}
            </div>
          ) : null}

          {brief.findings?.length ? (
            <div className="desk-intel-findings">
              {brief.findings.map((f) => (
                <article key={f.title} className={`desk-intel-finding band-${BAND_CLS[f.band] || f.band || 'moderate'}`}>
                  <header>
                    <strong>{f.title}</strong>
                    <span className="desk-intel-band">{f.band}</span>
                  </header>
                  <p>
                    <RichText text={f.detail} />
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {brief.charts?.map((c) => (
            <VizCard key={`${c.type}-${c.title}`} title={c.title} hint={c.hint || 'Chart from this entry’s fields.'}>
              {c.type === 'bars' ? <BarList items={c.items} /> : null}
              {c.type === 'columns' ? <ColumnChart items={c.items} /> : null}
              {c.type === 'pie' ? <PieChart items={c.items} /> : null}
              {c.type === 'donut' ? <DonutChart items={c.items} unit="parts" /> : null}
              {c.type === 'matrix' && c.matrix ? <Heatmap matrix={c.matrix} /> : null}
              {c.type === 'spark' ? (
                <Sparkline
                  series={c.series}
                  peak={c.peak || c.series?.reduce((a, b) => ((b.n || 0) > (a?.n || 0) ? b : a), c.series?.[0])}
                  from={c.from}
                  through={c.through}
                />
              ) : null}
            </VizCard>
          ))}

          {brief.caveats?.length ? (
            <p className="desk-note desk-intel-caveats">{brief.caveats.join(' · ')}</p>
          ) : null}

          <p className="desk-intel-foot muted">
            Organised from this selected row
            {brief.generatedAt ? ` · ${new Date(brief.generatedAt).toLocaleString()}` : null}
            {brief.cached
              ? ' · saved until this entry’s data changes'
              : ' · saved; refreshes only when this entry changes'}
          </p>
        </>
      ) : null}
    </section>
  );
}
