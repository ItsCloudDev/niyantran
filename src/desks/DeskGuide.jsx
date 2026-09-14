import { bucketBlurb, deskIntro, moduleBlurb } from '../lib/deskGuide.js';
import { featureMenuLabel } from '../lib/national.js';
import { Icon, TAB_ICON } from '../shell/Icons.jsx';

export default function DeskGuide({ tab, label, buckets, onFeature }) {
  const intro = deskIntro(tab);

  return (
    <div className="desk desk-wide desk-guide" key={tab}>
      <div className="dg-hero">
        <div className="dg-kicker">
          <Icon name={TAB_ICON[tab] || 'globe'} size={16} />
          Desk walkthrough
        </div>
        <h1>{label || 'Desk'}</h1>
        <p>{intro}</p>
        <ol className="dg-steps">
          <li>
            Use the <b>dropdown pills</b> on the top strip (not this page alone) to open a group.
          </li>
          <li>
            Pick a <b>module name</b> in the menu. That loads the table or map.
          </li>
          <li>
            Use search, filters and the right rail on the module itself. Click a row for evidence.
          </li>
        </ol>
      </div>

      <div className="dg-grid">
        {(buckets || []).map((b, i) => (
          <section key={b.label} className="dg-bucket" style={{ '--dg-i': i }}>
            <header>
              <h2>{b.label}</h2>
              <p>{bucketBlurb(b.label)}</p>
            </header>
            <ul>
              {b.items.map((m) => {
                const name = m.htmlFeature;
                const title = featureMenuLabel(m) || name;
                return (
                  <li key={name}>
                    <button type="button" onClick={() => onFeature?.(name)}>
                      <span className="dg-mod-name">{title}</span>
                      <span className="dg-mod-copy">{moduleBlurb(name)}</span>
                      <span className="dg-mod-go" aria-hidden="true">
                        Open →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
