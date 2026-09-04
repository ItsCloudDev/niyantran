import { useMemo, useRef, useState } from 'react';

function Ico({ d, size = 18, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const DESKS = [
  {
    id: 'legislative',
    label: 'Legislative & Policy Intelligence',
    d: 'M4 21h16M4 10h16M12 3l8 7H4z',
    title: 'BILL PASSAGE INDEX',
    more: 'View All Bills →',
    cols: ['BILL', 'HOUSE'],
    rows: [
      ['The Constitution (One Hundred and Twenty-Eighth Amendment) Bill, 2026', 'Lok Sabha'],
      ['The Finance Bill, 2026', 'Lok Sabha'],
      ['The Bharatiya Vayuyan Vidheyak, 2024', 'Rajya Sabha'],
      ['The Oilfields (Regulation and Development) Amendment Bill, 2024', 'Lok Sabha'],
      ['The Boilers Bill, 2024', 'Lok Sabha'],
      ['The Banking Laws (Amendment) Bill, 2024', 'Lok Sabha'],
    ],
    kpis: [
      ['4,576', 'blue', 'BILLS TRACKED'],
      ['816', 'ok', 'PASSED BOTH HOUSES'],
      ['3,760', 'warn', 'NOT YET ENACTED'],
      ['70', 'gold', 'POLICY SECTORS'],
    ],
    bars: [
      ['Introduced', 620, '14%', 14, ''],
      ['In Committee', 48, '1%', 4, 'sand'],
      ['Passed One House', 3092, '68%', 68, ''],
      ['Passed Both Houses', 816, '18%', 18, 'red'],
    ],
    note: 'Passage stage is taken from the bill record. This panel does not infer what a house will do next.',
  },
  {
    id: 'electoral',
    label: 'Electoral Data & Analytics',
    d: 'M4 20V10M10 20V4M16 20v-8M22 20V8',
    title: 'ELECTORAL RETURNS',
    more: 'View All Returns →',
    cols: ['CONTEST', 'STATE'],
    rows: [
      ['Lok Sabha general election, 2024 — Uttar Pradesh', 'Uttar Pradesh'],
      ['Assembly by-election, 2025 — Wayanad', 'Kerala'],
      ['Lok Sabha general election, 2024 — Maharashtra', 'Maharashtra'],
      ['Assembly election, 2024 — Haryana', 'Haryana'],
      ['Assembly election, 2024 — Jammu & Kashmir', 'J&K'],
      ['Lok Sabha general election, 2024 — West Bengal', 'West Bengal'],
    ],
    kpis: [
      ['543', 'blue', 'LS CONSTITUENCIES'],
      ['28', 'ok', 'STATES COVERED'],
      ['8', 'warn', 'BY-ELECTIONS'],
      ['1951', 'gold', 'SERIES START'],
    ],
    bars: [
      ['Declared', 480, '88%', 88, ''],
      ['Counting', 32, '6%', 6, 'sand'],
      ['Notified', 22, '4%', 4, ''],
      ['Disputed', 9, '2%', 2, 'red'],
    ],
    note: 'Returns are official counts as published. Seat totals here are a desk preview, not a forecast.',
  },
  {
    id: 'media',
    label: 'Representative & Media Intelligence',
    d: 'M21 15a4 4 0 01-4 4H7l-4 3V7a4 4 0 014-4h10a4 4 0 014 4z',
    title: 'STATEMENT TRACKER',
    more: 'View All Statements →',
    cols: ['ITEM', 'SOURCE'],
    rows: [
      ['PIB briefing on monsoon session business', 'PIB'],
      ['Lok Sabha speaker on privilege notices', 'Lok Sabha'],
      ['RBI governor remarks after MPC', 'RBI'],
      ['MEA readout on bilateral consultations', 'MEA'],
      ['Election Commission press note on rolls', 'ECI'],
      ['NDTV wire on standing committee report', 'NDTV'],
    ],
    kpis: [
      ['128', 'blue', 'ITEMS THIS WEEK'],
      ['14', 'ok', 'OFFICIAL SOURCES'],
      ['6', 'warn', 'WIRE SEARCHES'],
      ['3', 'gold', 'HOUSES COVERED'],
    ],
    bars: [
      ['Official', 72, '56%', 56, ''],
      ['Parliament', 31, '24%', 24, 'sand'],
      ['Wire', 18, '14%', 14, ''],
      ['Other', 7, '6%', 6, 'red'],
    ],
    note: 'Wires are labelled as reporting searches. They are not treated as official tables.',
  },
  {
    id: 'ops',
    label: 'Government Operations',
    d: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
    title: 'TENDERS & NOTICES',
    more: 'View All Notices →',
    cols: ['NOTICE', 'ISSUER'],
    rows: [
      ['GeM bid for network equipment, MeitY', 'MeitY'],
      ['CPWD civil works, New Delhi circle', 'CPWD'],
      ['NHAI package, Delhi–Mumbai corridor', 'NHAI'],
      ['Railways signalling upgrade, WR', 'IR'],
      ['MoD request for information, UAVs', 'MoD'],
      ['CBIC circular on drawback rates', 'CBIC'],
    ],
    kpis: [
      ['84', 'blue', 'OPEN NOTICES'],
      ['12', 'ok', 'MINISTRIES'],
      ['9', 'warn', 'CLOSING 7D'],
      ['6', 'gold', 'SECTORS'],
    ],
    bars: [
      ['Open', 48, '57%', 57, ''],
      ['Closing', 19, '23%', 23, 'sand'],
      ['Awarded', 12, '14%', 14, ''],
      ['Cancelled', 5, '6%', 6, 'red'],
    ],
    note: 'Tender rows are administrative notices. Award status is as published, not a recommendation.',
  },
  {
    id: 'economy',
    label: 'Economy, Finance & Industry',
    d: 'M4 20h16M7 16V10M12 16V6M17 16v-8',
    title: 'MACRO SERIES',
    more: 'View All Series →',
    cols: ['SERIES', 'SOURCE'],
    rows: [
      ['CPI combined, latest print', 'MoSPI'],
      ['IIP manufacturing', 'MoSPI'],
      ['Merchandise exports, monthly', 'DGCI&S'],
      ['GST collections, monthly', 'GSTN'],
      ['RBI policy repo rate', 'RBI'],
      ['World Bank India GDP series', 'World Bank'],
    ],
    kpis: [
      ['42', 'blue', 'LIVE SERIES'],
      ['8', 'ok', 'PUBLISHERS'],
      ['4', 'warn', 'UPDATED TODAY'],
      ['1991', 'gold', 'SERIES START'],
    ],
    bars: [
      ['Prices', 12, '29%', 29, ''],
      ['Activity', 11, '26%', 26, 'sand'],
      ['Trade', 10, '24%', 24, ''],
      ['Fiscal', 9, '21%', 21, 'red'],
    ],
    note: 'Market cap is never an input here. Size bands, if shown on a desk, are revenue-based only.',
  },
  {
    id: 'global',
    label: 'Global Affairs & Security',
    d: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18',
    title: 'OPEN FRONTS',
    more: 'View All Fronts →',
    cols: ['FRONT', 'THEATRE'],
    rows: [
      ['Ukraine–Russia, latest development', 'Europe'],
      ['Israel–Gaza, latest development', 'West Asia'],
      ['Red Sea shipping disruption', 'Maritime'],
      ['India–China LAC, latest notice', 'Himalaya'],
      ['Myanmar, border developments', 'East'],
      ['Sahel, security notices', 'Africa'],
    ],
    kpis: [
      ['18', 'blue', 'OPEN FRONTS'],
      ['6', 'ok', 'THEATRES'],
      ['4', 'warn', 'UPDATED 48H'],
      ['9', 'gold', 'SOURCES'],
    ],
    bars: [
      ['Active', 11, '61%', 61, ''],
      ['Watch', 4, '22%', 22, 'sand'],
      ['Frozen', 2, '11%', 11, ''],
      ['Closed', 1, '6%', 6, 'red'],
    ],
    note: 'Fronts are sourced events. Intensity labels are descriptive of the record, not a call to action.',
  },
];

const CAPS = [
  { title: 'Legislative Intelligence', d: 'M4 21h16M4 10h16M12 3l8 7H4zM7 10v11M12 10v11M17 10v11', fg: '#012ea1', copy: 'Track bills, amendments, debates and passage across both houses in real time.' },
  { title: 'Open Fronts', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z', fg: '#c81322', copy: 'Monitor global conflicts, hostilities and crisis hotspots with verified intelligence.' },
  { title: 'Global Diplomacy', d: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18', fg: '#012ea1', copy: 'Follow diplomatic relations, treaties, statements and multilateral developments.' },
  { title: 'Economy & Finance', d: 'M4 20h16M7 16V10M12 16V6M17 16v-8', fg: '#c45c26', copy: 'Access economic indicators, markets, budgets, and financial sector data.' },
  { title: 'Media & Narrative', d: 'M21 15a4 4 0 01-4 4H7l-4 3V7a4 4 0 014-4h10a4 4 0 014 4z', fg: '#4f1d90', copy: 'Analyze media coverage, sentiment, narratives and information landscape.' },
  { title: 'Strategic Assets', d: 'M12 3l8 18H4zM12 8v5M12 16h.01', fg: '#c81322', copy: 'Explore critical infrastructure, military assets, defense deals and strategic capabilities.' },
];

const CHIPS = [
  { cls: 'blue c1', cap: 'Open Fronts', d: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z', label: 'Open Fronts' },
  { cls: 'fill-purple c2', cap: 'Legislative Intelligence', d: 'M4 21h16M4 10h16M12 3l8 7H4z', label: 'Legislative Tracker' },
  { cls: 'blue c3', cap: 'Global Diplomacy', d: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18', label: 'Global Diplomacy' },
  { cls: 'fill-red c4', cap: 'Strategic Assets', d: 'M12 3l8 18H4z', label: 'Strategic Assets' },
  { cls: 'fill-purple c5', cap: 'Media & Narrative', d: 'M21 15a4 4 0 01-4 4H7l-4 3V7a4 4 0 014-4h10a4 4 0 014 4z', label: 'Media & Narrative' },
  { cls: 'fill-sand c6', cap: 'Economy & Finance', d: 'M4 20h16M7 16V10M12 16V6M17 16v-8', label: 'Economy & Finance' },
];

function onCardMove(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`);
}

export default function HomePage({ onLogin, onCoverage }) {
  const heroRef = useRef(null);
  const [deskId, setDeskId] = useState('legislative');
  const [tab, setTab] = useState('kpis');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(0);
  const [capFocus, setCapFocus] = useState(null);
  const desk = DESKS.find((d) => d.id === deskId) || DESKS[0];
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return desk.rows;
    return desk.rows.filter(([name, house]) => `${name} ${house}`.toLowerCase().includes(needle));
  }, [desk, q]);

  function pickDesk(id) {
    setDeskId(id);
    setQ('');
    setPicked(0);
    setTab('kpis');
  }

  function onHeroMove(e) {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    el.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    el.style.setProperty('--px', `${((x - 0.5) * 24).toFixed(2)}px`);
    el.style.setProperty('--py', `${((y - 0.5) * 16).toFixed(2)}px`);
  }

  return (
    <>
      <section className="mkt-hero" ref={heroRef} onMouseMove={onHeroMove}>
        <div className="mkt-hero-scene" aria-hidden="true">
          <img className="mkt-hero-bg" src="/brand/bg.png?v=1" alt="" />
          <span className="mkt-pr-scan" />
          <span className="mkt-pr-gridlines mkt-hero-gridlines" />
          <span className="mkt-pr-sh navy" />
          <span className="mkt-pr-sh sand" />
          <span className="mkt-pr-sh purple" />
          <span className="mkt-pr-sh red" />
          <span className="mkt-hero-spot" />
        </div>
        <div className="mkt-wrap mkt-hero-inner">
          <div className="mkt-hero-copy">
            <p className="mkt-kicker">
              <span className="live">● LIVE</span>
              <span className="mid">REAL-TIME</span>
              <span className="sys">SYS/READY_</span>
            </p>
            <h1>
              The Intelligence Layer for <em className="gov">Government</em>, <em className="pol">Policy</em> &amp; Global Affairs.
            </h1>
            <p className="mkt-lede">
              One terminal that unifies 200+ authoritative data sources — legislation, fronts, markets, carbon
              and the courts — into a single platform an analyst can interrogate without leaving the desk.
            </p>
            <div className="mkt-hero-tele">
              <span>
                <i />
                FEED 211+
              </span>
              <span>
                <i />
                BILLS 4,576
              </span>
              <span>
                <i />
                UPTIME 99.9%
              </span>
              <span className="blink">▌</span>
            </div>
            <div className="mkt-hero-actions">
              <button type="button" className="mkt-cta" onClick={onLogin}>
                Explore Live Terminal
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <button type="button" className="mkt-cta ghost" onClick={onCoverage}>
                View Data Coverage
              </button>
            </div>
          </div>
          <div className="mkt-orb-wrap" aria-hidden="true">
            <div className="mkt-orb-layer">
              <div className="mkt-orb-fx">
                <span className="mkt-halo" />
                <span className="mkt-ring r1" />
                <span className="mkt-ring r2" />
                <span className="mkt-ring r3" />
                <span className="mkt-spark s1" />
                <span className="mkt-spark s2" />
                <span className="mkt-spark s3" />
                <span className="mkt-spark s4" />
                <span className="mkt-spark s5" />
              </div>
              <svg className="mkt-hero-orbits" viewBox="0 0 400 400">
                <ellipse cx="200" cy="200" rx="188" ry="72" fill="none" stroke="#e4dfd6" strokeWidth="1" strokeDasharray="3 6" transform="rotate(-22 200 200)" />
                <ellipse cx="200" cy="200" rx="176" ry="58" fill="none" stroke="#ebe6de" strokeWidth="1" strokeDasharray="2 7" transform="rotate(16 200 200)" />
                <circle cx="200" cy="200" r="152" fill="none" stroke="#ddd8cf" strokeWidth="1" strokeDasharray="2 4" />
                <ellipse cx="200" cy="200" rx="72" ry="152" fill="none" stroke="#e6e1d8" strokeWidth="0.8" strokeDasharray="2 5" />
                <ellipse cx="200" cy="200" rx="152" ry="48" fill="none" stroke="#e6e1d8" strokeWidth="0.8" strokeDasharray="2 5" />
                <ellipse cx="200" cy="200" rx="152" ry="100" fill="none" stroke="#ece7de" strokeWidth="0.7" strokeDasharray="2 6" />
                <circle cx="318" cy="118" r="3" fill="#c81322" />
                <circle cx="86" cy="168" r="3" fill="#012ea1" />
                <circle cx="274" cy="286" r="2.5" fill="#c81322" />
              </svg>
              <img className="mkt-globe" src="/brand/globe.png?v=3" alt="" />
            </div>
            {CHIPS.map((chip) => (
              <div
                key={chip.label}
                className={`mkt-chip ${chip.cls}${capFocus === chip.cap ? ' on' : ''}`}
                onMouseEnter={() => setCapFocus(chip.cap)}
                onMouseLeave={() => setCapFocus(null)}
              >
                <i>
                  <Ico d={chip.d} size={14} />
                </i>
                {chip.label}
              </div>
            ))}
          </div>
        </div>
        <div className="mkt-wrap">
          <div className="mkt-mini-stats">
            <div className="mkt-mini-stat t-blue">
              <i>
                <Ico d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18" />
              </i>
              211+ Live Endpoints
            </div>
            <div className="mkt-mini-stat t-purple">
              <i>
                <Ico d="M4 21h16M4 10h16M12 3l8 7H4z" />
              </i>
              4,576+ Bills Tracked
            </div>
            <div className="mkt-mini-stat t-sand">
              <i>
                <Ico d="M4 5h16v14H4zM8 3v4M16 3v4M4 9h16" />
              </i>
              1952–Present Comprehensive Coverage
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-preview">
        <div className="mkt-wrap">
          <div className="mkt-preview-frame">
            <span className="mkt-preview-scan" aria-hidden="true" />
            <aside className="mkt-prev-nav">
              <div className="mark">
                <img src="/brand/logo.png?v=2" alt="" />
                TERMINAL
              </div>
              {DESKS.map((item) => (
                <button
                  type="button"
                  className={item.id === desk.id ? 'on' : ''}
                  key={item.id}
                  onClick={() => pickDesk(item.id)}
                >
                  <Ico d={item.d} size={15} />
                  {item.label}
                </button>
              ))}
              <button type="button" className="mkt-prev-all" onClick={onLogin}>
                <Ico d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" size={15} />
                All Desks
              </button>
            </aside>
            <div className="mkt-prev-table">
              <div className="mkt-prev-top">
                <h3>
                  {desk.title}
                  <span className="mkt-prev-live">
                    <i />
                    LIVE FEED
                  </span>
                </h3>
                <div className="mkt-prev-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" />
                  </svg>
                  <input
                    value={q}
                    placeholder="Filter this table"
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPicked(0);
                    }}
                  />
                </div>
              </div>
              <div className="mkt-prev-cols">
                <span>{desk.cols[0]}</span>
                <span>{desk.cols[1]}</span>
              </div>
              {rows.length === 0 && <div className="mkt-prev-empty">No rows match this filter.</div>}
              {rows.map(([name, house], i) => (
                <button type="button" className={`mkt-prev-row${i === picked ? ' on' : ''}`} key={name} onClick={() => setPicked(i)}>
                  <b>{name}</b>
                  <span>{house}</span>
                </button>
              ))}
              <button type="button" className="mkt-prev-more" onClick={onLogin}>
                {desk.more}
              </button>
            </div>
            <aside className="mkt-prev-rail">
              <div className="mkt-prev-tabs">
                <button type="button" className={tab === 'kpis' ? 'on' : ''} onClick={() => setTab('kpis')}>
                  KEY INDICATORS
                </button>
                <button type="button" className={tab === 'ai' ? 'on' : ''} onClick={() => setTab('ai')}>
                  AI RESEARCH
                </button>
              </div>
              {tab === 'kpis' ? (
                <>
                  <div className="mkt-kpi-grid">
                    {desk.kpis.map(([n, tone, lab]) => (
                      <div className="mkt-kpi" key={lab}>
                        <strong className={tone}>{n}</strong>
                        <small>{lab}</small>
                      </div>
                    ))}
                  </div>
                  <div className="mkt-bar-lab">STATUS BY STAGE</div>
                  {desk.bars.map(([lab, count, pct, width, tone]) => (
                    <div className="mkt-bar" key={`${desk.id}-${lab}`}>
                      <span>{lab}</span>
                      <i>
                        <b className={tone} style={{ width: `${width}%` }} />
                      </i>
                      <em>
                        {count.toLocaleString()} ({pct})
                      </em>
                    </div>
                  ))}
                </>
              ) : (
                <div className="mkt-ai">
                  <p className="mkt-ai-kicker">SELECTED ROW</p>
                  <p className="mkt-ai-title">{rows[picked]?.[0] || 'Nothing selected'}</p>
                  <p>{desk.note}</p>
                  <p>Evidence sits above any reading. This panel never issues a buy, sell or hold.</p>
                  <button type="button" className="mkt-prev-more" onClick={onLogin}>
                    Open in the live terminal →
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className="mkt-caps" id="coverage">
        <div className="mkt-wrap mkt-caps-layout">
          <div className="mkt-caps-head">
            <p>POWERFUL CAPABILITIES</p>
            <h2>
              One Terminal. <em>Endless</em> Intelligence.
            </h2>
            <span className="mkt-caps-copy">
              Legislatures, fronts, markets, carbon and the courts in one desk — official sources, labelled
              provenance, no recommendations.
            </span>
            <button type="button" className="mkt-caps-link" onClick={onLogin}>
              Explore All Desks →
            </button>
          </div>
          <div className="mkt-grid" onMouseLeave={() => setCapFocus(null)}>
            {CAPS.map((c) => (
              <article
                className={`mkt-card${capFocus === c.title ? ' on' : ''}`}
                style={{ '--glow': c.fg }}
                key={c.title}
                onMouseEnter={() => setCapFocus(c.title)}
                onMouseMove={onCardMove}
              >
                <span className="mkt-card-glow" aria-hidden="true" />
                <div className="ico" style={{ color: c.fg }}>
                  <Ico d={c.d} size={28} />
                </div>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-ribbon">
        <div className="mkt-wrap">
          <div className="mkt-ribbon-inner">
            <div className="mkt-ribbon-item">
              <i>
                <Ico d="M4 20h16M7 16V10M12 16V6M17 16v-8" size={16} />
              </i>
              <div>
                <div className="n">200+</div>
                <div className="l">Authoritative Sources</div>
              </div>
            </div>
            <div className="mkt-ribbon-item">
              <i>
                <Ico d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18" size={16} />
              </i>
              <div>
                <div className="n">211+</div>
                <div className="l">Live API Endpoints</div>
              </div>
            </div>
            <div className="mkt-ribbon-item">
              <i>
                <Ico d="M4 21h16M4 10h16M12 3l8 7H4z" size={16} />
              </i>
              <div>
                <div className="n">4,576+</div>
                <div className="l">Bills Tracked</div>
              </div>
            </div>
            <div className="mkt-ribbon-item">
              <i>
                <Ico d="M4 5h16v14H4zM8 3v4M16 3v4M4 9h16" size={16} />
              </i>
              <div>
                <div className="n">1952–</div>
                <div className="l">Present Coverage</div>
              </div>
            </div>
            <div className="mkt-ribbon-item">
              <i>
                <Ico d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" size={16} />
              </i>
              <div>
                <div className="n">99.9%</div>
                <div className="l">Uptime &amp; Reliability</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
