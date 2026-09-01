import { useEffect, useMemo, useState } from 'react';
import { fetchGithubCsv, githubCsvUrl } from '../lib/githubCsv.js';
import { cellText, displayColumns } from '../lib/normalise.js';

export default function CsvTablePane({ row }) {
  const [body, setBody] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr('');
    setBody(null);
    fetchGithubCsv(row, ac.signal)
      .then((got) => {
        if (!ac.signal.aborted) setBody(got);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [row]);

  const cols = useMemo(() => displayColumns(body?.rows || []).map((key) => ({ key, label: key })), [body]);
  const href = githubCsvUrl(row);

  return (
    <div className="rd-csv">
      <div className="rd-section">
        <div className="rd-sec-label">CSV TABLE</div>
        {href ? (
          <div className="rd-docs">
            <a className="rd-doc" href={href} target="_blank" rel="noreferrer">
              <span className="rd-doc-ic">↗</span>
              <span>Raw file</span>
            </a>
          </div>
        ) : null}
      </div>
      {loading ? <p className="rd-csv-note">Loading table…</p> : null}
      {err ? <p className="banner warn">{err}</p> : null}
      {body?.note ? <p className="rd-csv-note">{body.note}</p> : null}
      {body?.rows?.length ? (
        <div className="rd-csv-wrap">
          <table className="rd-csv-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c.key} title={String(r[c.key] ?? '')}>
                      {cellText(r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && !err && !body?.rows?.length ? <p className="rd-csv-note">This file has no parseable rows.</p> : null}
    </div>
  );
}
