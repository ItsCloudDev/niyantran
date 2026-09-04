import { useMemo, useState } from 'react';
import { loadPrivacy, newPrivacySection, resetPrivacy, savePrivacy } from '../lib/privacyStore.js';
import { loadSiteSettings, resetSiteSettings, saveSiteSettings } from '../lib/siteSettingsStore.js';
import { loadTerms, newTermsSection, resetTerms, saveTerms } from '../lib/termsStore.js';

const SETTING_TABS = [
  { id: 'identity', label: 'Identity' },
  { id: 'seo', label: 'SEO & social' },
  { id: 'analytics', label: 'Analytics' },
];

export function SiteSettingsPage() {
  const [form, setForm] = useState(() => loadSiteSettings());
  const [tab, setTab] = useState('identity');
  const [msg, setMsg] = useState('');

  function patch(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
    setMsg('');
  }

  function onSave(e) {
    e.preventDefault();
    saveSiteSettings(form);
    setMsg('Website settings published. Meta tags and scripts update immediately.');
  }

  return (
    <>
      <h1 className="adm-h1">Website settings</h1>
      <p className="adm-lede">
        Name, description, search metadata, and measurement scripts for the public site. Published values apply
        in this browser at once.
      </p>
      <div className="adm-filters">
        {SETTING_TABS.map((t) => (
          <button key={t.id} type="button" className={`adm-chip${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSave}>
        {tab === 'identity' ? (
          <div className="adm-card">
            <h2>Identity</h2>
            <div className="adm-form">
              <label className="adm-field">
                <span>Website name</span>
                <input value={form.siteName} onChange={(e) => patch('siteName', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Short name</span>
                <input value={form.shortName} onChange={(e) => patch('shortName', e.target.value)} />
              </label>
              <label className="adm-field span2">
                <span>Tagline</span>
                <input value={form.tagline} onChange={(e) => patch('tagline', e.target.value)} />
              </label>
              <label className="adm-field span2">
                <span>Description</span>
                <textarea value={form.description} onChange={(e) => patch('description', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Contact email</span>
                <input type="email" value={form.contactEmail} onChange={(e) => patch('contactEmail', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Public website URL</span>
                <input
                  placeholder="https://"
                  value={form.contactWebsite}
                  onChange={(e) => patch('contactWebsite', e.target.value)}
                />
              </label>
              <label className="adm-field span2">
                <span>Registered address</span>
                <input value={form.contactAddress} onChange={(e) => patch('contactAddress', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Theme colour</span>
                <input value={form.themeColor} onChange={(e) => patch('themeColor', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Favicon URL</span>
                <input value={form.faviconUrl} onChange={(e) => patch('faviconUrl', e.target.value)} />
              </label>
            </div>
          </div>
        ) : null}

        {tab === 'seo' ? (
          <div className="adm-card">
            <h2>Search and social</h2>
            <div className="adm-form">
              <label className="adm-field span2">
                <span>Meta title</span>
                <input value={form.metaTitle} onChange={(e) => patch('metaTitle', e.target.value)} />
              </label>
              <label className="adm-field span2">
                <span>Meta description</span>
                <textarea value={form.metaDescription} onChange={(e) => patch('metaDescription', e.target.value)} />
              </label>
              <label className="adm-field span2">
                <span>Meta keywords</span>
                <input value={form.metaKeywords} onChange={(e) => patch('metaKeywords', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Canonical URL</span>
                <input placeholder="https://…" value={form.canonicalUrl} onChange={(e) => patch('canonicalUrl', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Robots</span>
                <select value={form.robots} onChange={(e) => patch('robots', e.target.value)}>
                  <option value="index,follow">index, follow</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="index,nofollow">index, nofollow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </label>
              <label className="adm-field">
                <span>Locale</span>
                <input value={form.locale} onChange={(e) => patch('locale', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Author</span>
                <input value={form.author} onChange={(e) => patch('author', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Open Graph title</span>
                <input placeholder="Defaults to meta title" value={form.ogTitle} onChange={(e) => patch('ogTitle', e.target.value)} />
              </label>
              <label className="adm-field">
                <span>Open Graph image</span>
                <input value={form.ogImage} onChange={(e) => patch('ogImage', e.target.value)} />
              </label>
              <label className="adm-field span2">
                <span>Open Graph description</span>
                <input
                  placeholder="Defaults to meta description"
                  value={form.ogDescription}
                  onChange={(e) => patch('ogDescription', e.target.value)}
                />
              </label>
              <label className="adm-field">
                <span>Twitter card</span>
                <select value={form.twitterCard} onChange={(e) => patch('twitterCard', e.target.value)}>
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="summary">summary</option>
                </select>
              </label>
              <label className="adm-field">
                <span>Twitter handle</span>
                <input placeholder="@handle" value={form.twitterHandle} onChange={(e) => patch('twitterHandle', e.target.value)} />
              </label>
            </div>
          </div>
        ) : null}

        {tab === 'analytics' ? (
          <div className="adm-card">
            <h2>Measurement</h2>
            <div className="adm-form">
              <label className="adm-field">
                <span>Google Analytics ID</span>
                <input
                  placeholder="G-XXXXXXXXXX"
                  value={form.googleAnalyticsId}
                  onChange={(e) => patch('googleAnalyticsId', e.target.value.trim())}
                />
              </label>
              <label className="adm-field">
                <span>Google Tag Manager ID</span>
                <input
                  placeholder="GTM-XXXXXXX"
                  value={form.googleTagManagerId}
                  onChange={(e) => patch('googleTagManagerId', e.target.value.trim())}
                />
              </label>
              <label className="adm-field span2">
                <span>Additional head script / tags</span>
                <textarea
                  className="adm-code"
                  placeholder={'<script async src="https://www.googletagmanager.com/gtag/js?id=G-…"></script>'}
                  value={form.customHeadHtml}
                  onChange={(e) => patch('customHeadHtml', e.target.value)}
                />
              </label>
            </div>
            <p className="adm-hint">
              A Measurement ID injects the official gtag snippet. Paste extra <code>&lt;script&gt;</code>,{' '}
              <code>&lt;meta&gt;</code> or <code>&lt;link&gt;</code> tags only from an operator you trust — they
              run in every visitor’s browser.
            </p>
          </div>
        ) : null}

        <div className="adm-actions">
          <button className="adm-btn" type="submit">
            Publish settings
          </button>
          <button
            className="adm-btn ghost"
            type="button"
            onClick={() => {
              setForm(resetSiteSettings());
              setMsg('Restored default website settings.');
            }}
          >
            Restore defaults
          </button>
          {msg ? <span className="adm-msg">{msg}</span> : null}
        </div>
      </form>
    </>
  );
}

export function PrivacyAdminPage() {
  return (
    <LegalDocAdmin
      title="Privacy policy"
      lede="This is the copy on the public Privacy Policy page. Use ### Heading for subsections and - item for lists."
      emailLabel="Privacy email"
      load={loadPrivacy}
      save={savePrivacy}
      reset={resetPrivacy}
      newSection={newPrivacySection}
      viewHref="/privacy"
      published="Privacy policy published to the public page."
    />
  );
}

export function TermsAdminPage() {
  return (
    <LegalDocAdmin
      title="Terms & conditions"
      lede="This is the copy on the public Terms page. Use ### Heading for subsections and - item for lists. Markdown links such as [Privacy Policy](/privacy) become live links."
      emailLabel="Legal email"
      load={loadTerms}
      save={saveTerms}
      reset={resetTerms}
      newSection={newTermsSection}
      viewHref="/terms"
      published="Terms published to the public page."
      extraFields
    />
  );
}

function LegalDocAdmin({
  title,
  lede,
  emailLabel,
  load,
  save,
  reset,
  newSection,
  viewHref,
  published,
  extraFields,
}) {
  const [doc, setDoc] = useState(() => load());
  const [open, setOpen] = useState(() => doc.sections[0]?.id || '');
  const [msg, setMsg] = useState('');
  const count = useMemo(() => (doc.sections || []).length, [doc]);

  function patchMeta(key, value) {
    setDoc((d) => ({ ...d, [key]: value }));
    setMsg('');
  }

  function patchSection(id, field, value) {
    setDoc((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
    setMsg('');
  }

  function move(id, dir) {
    setDoc((d) => {
      const list = [...d.sections];
      const i = list.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, sections: list.map((s, n) => ({ ...s, num: String(n + 1) })) };
    });
    setMsg('');
  }

  function removeSection(id) {
    setDoc((d) => {
      const sections = d.sections.filter((s) => s.id !== id).map((s, n) => ({ ...s, num: String(n + 1) }));
      return { ...d, sections };
    });
    setMsg('');
  }

  function addSection() {
    const next = newSection(doc.sections.length);
    setDoc((d) => ({ ...d, sections: [...d.sections, next] }));
    setOpen(next.id);
    setMsg('');
  }

  function onSave(e) {
    e.preventDefault();
    save(doc);
    setMsg(published);
  }

  return (
    <>
      <h1 className="adm-h1">{title}</h1>
      <p className="adm-lede">{lede}</p>
      <form onSubmit={onSave}>
        <div className="adm-card">
          <h2>Document</h2>
          <div className="adm-form">
            <label className="adm-field">
              <span>Last updated</span>
              <input value={doc.lastUpdated} onChange={(e) => patchMeta('lastUpdated', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Organisation</span>
              <input value={doc.org} onChange={(e) => patchMeta('org', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Team</span>
              <input value={doc.team} onChange={(e) => patchMeta('team', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>{emailLabel}</span>
              <input type="email" value={doc.email} onChange={(e) => patchMeta('email', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Website</span>
              <input placeholder="Leave blank to use site URL" value={doc.website} onChange={(e) => patchMeta('website', e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Address</span>
              <input value={doc.address} onChange={(e) => patchMeta('address', e.target.value)} />
            </label>
            {extraFields ? (
              <>
                <label className="adm-field">
                  <span>Governing law</span>
                  <input
                    placeholder="e.g. India"
                    value={doc.jurisdiction || ''}
                    onChange={(e) => patchMeta('jurisdiction', e.target.value)}
                  />
                </label>
                <label className="adm-field">
                  <span>Courts / forum</span>
                  <input
                    placeholder="e.g. courts of Mumbai"
                    value={doc.courts || ''}
                    onChange={(e) => patchMeta('courts', e.target.value)}
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        {doc.sections.map((s, i) => (
          <article key={s.id} className={`adm-card adm-sec${open === s.id ? ' open' : ''}`}>
            <button type="button" className="adm-sec-h" onClick={() => setOpen(open === s.id ? '' : s.id)}>
              <em>{s.num}</em>
              <strong>{s.title || 'Untitled'}</strong>
              <span>{open === s.id ? 'Collapse' : 'Edit'}</span>
            </button>
            {open === s.id ? (
              <div className="adm-form" style={{ marginTop: 12 }}>
                <label className="adm-field">
                  <span>Number</span>
                  <input value={s.num} onChange={(e) => patchSection(s.id, 'num', e.target.value)} />
                </label>
                <label className="adm-field">
                  <span>Title</span>
                  <input value={s.title} onChange={(e) => patchSection(s.id, 'title', e.target.value)} />
                </label>
                <label className="adm-field span2">
                  <span>Body</span>
                  <textarea
                    className="adm-policy-body"
                    value={s.body}
                    onChange={(e) => patchSection(s.id, 'body', e.target.value)}
                  />
                </label>
                <div className="adm-actions span2">
                  <button className="adm-btn ghost" type="button" disabled={i === 0} onClick={() => move(s.id, -1)}>
                    Move up
                  </button>
                  <button
                    className="adm-btn ghost"
                    type="button"
                    disabled={i === count - 1}
                    onClick={() => move(s.id, 1)}
                  >
                    Move down
                  </button>
                  <button className="adm-btn danger" type="button" onClick={() => removeSection(s.id)}>
                    Remove section
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}

        <div className="adm-actions">
          <button className="adm-btn" type="submit">
            Publish
          </button>
          <button className="adm-btn ghost" type="button" onClick={addSection}>
            Add section
          </button>
          <a className="adm-btn ghost" href={viewHref} target="_blank" rel="noreferrer">
            View public page
          </a>
          <button
            className="adm-btn ghost"
            type="button"
            onClick={() => {
              const next = reset();
              setDoc(next);
              setOpen(next.sections[0]?.id || '');
              setMsg('Restored the original text.');
            }}
          >
            Restore original
          </button>
          {msg ? <span className="adm-msg">{msg}</span> : null}
        </div>
      </form>
    </>
  );
}
