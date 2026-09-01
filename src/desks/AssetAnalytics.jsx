import { useMemo } from 'react';
import GeoHeatMap from './GeoHeatMap.jsx';
import { deskCopy, heatFor, hydrateAsset, strategicKind } from '../lib/strategicAssets.js';

export default function AssetAnalytics({ row, rows, featureName, onResearch }) {
  const kind = strategicKind(featureName);
  const copy = deskCopy(kind);
  const list = useMemo(
    () => (rows || []).map((r) => hydrateAsset(r, kind)).filter((p) => p?.id),
    [rows, kind],
  );
  const p = hydrateAsset(row, kind);
  if (!p) return null;
  const src = p.source;
  const facts =
    kind === 'chokepoint'
      ? [
          ['Region', p.region],
          ['Operators', p.operators],
          ['Oil / cargo', p.oil],
          ['Narrowest', p.width],
        ]
      : kind === 'infra'
        ? [
            ['Sector', p.sector],
            ['Location', p.region],
            ['Status', p.status],
            ['Expected completion', p.expected],
          ]
        : kind === 'nuclear'
          ? [
              ['Operator / authority', p.operators],
              ['Public scope', p.scope],
              ['Published capacity', p.capacity],
              ['Safeguards / oversight', p.safeguards],
            ]
          : [
              ['Provider', p.provider],
              ['Pad', p.pad],
              ['NET (UTC)', p.expected],
              ['Status', p.status],
            ];
  return (
    <div className="alw">
      <header className="alw-head">
        <i className="alw-mark" />
        <div className="alw-headcopy">
          <h2>{p.name}</h2>
          <p>
            {p.facilityKind || p.sector || p.provider || p.region} · {p.country || p.region}
          </p>
        </div>
        <span className="alw-status">{p.status}</span>
      </header>
      <GeoHeatMap
        records={heatFor(kind, p, list)}
        title={copy.mapTitle(p)}
        subtitle={copy.mapSub(p)}
        legend={copy.legend}
        fit={copy.fit}
        ariaLabel={copy.mapTitle(p)}
      />
      <section className="alw-section">
        <div className="alw-sechead">
          <b>Record at a glance</b>
          <span>Source fields · not inferred scores</span>
        </div>
        <div className="alw-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="alw-fact">
              <label>{label}</label>
              <strong title={value}>{value || '—'}</strong>
            </div>
          ))}
        </div>
        <div className="alw-official">
          <div className="alw-official-top">
            <label>{kind === 'nuclear' ? `Latest verified public record · ${p.row?.checked || ''}` : 'Recorded note'}</label>
            {src ? (
              <a className="alw-source" href={src} target="_blank" rel="noreferrer">
                {p.sourceLabel || 'Source'} ↗
              </a>
            ) : null}
          </div>
          <p>{p.note || p.risk || 'No additional note is attached to this record.'}</p>
        </div>
      </section>
      <div className="alw-brief">
        <label>AI analyst brief</label>
        <p>
          {kind === 'nuclear'
            ? `${p.name} is recorded as ${p.status.toLowerCase()}. Coordinate precision is ${String(p.precision || 'public').toLowerCase()}. Verify operational change against ${p.sourceLabel || 'the cited source'} — do not infer inventory, readiness or safeguards conclusions the record does not state.`
            : kind === 'chokepoint'
              ? `${p.name} sits on ${p.region}. The register records ${p.operators} as operators and ${p.oil} as the transit descriptor. This is operator and routing geography, not a forecast of closure.`
              : kind === 'infra'
                ? `${p.name} is a ${p.sector.toLowerCase()} record in ${p.region}, currently ${p.status}. Expected completion is ${p.expected || 'not stated'}. Status is the latest public milestone, not a delivery score.`
                : `${p.name} is listed as an upcoming launch by ${p.provider || 'an unnamed provider'} from ${p.pad || p.country || 'an unnamed pad'}. NET ${p.expected || 'is not stated'}.`}
        </p>
      </div>
      <div className="alw-actions">
        <button type="button" className="alw-ai" onClick={() => onResearch?.(p)}>
          Research this record
        </button>
        <span className="alw-method">Source-linked register. No effectiveness, readiness or disruption score is implied.</span>
      </div>
    </div>
  );
}
