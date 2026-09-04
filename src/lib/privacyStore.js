const KEY = 'niyantranPrivacy';
const EVENT = 'niy-privacy';

export const DEFAULT_PRIVACY = {
  lastUpdated: '3 September 2026',
  org: 'NIYANTRAN TERMINAL',
  team: 'Data Protection / Privacy Team',
  email: 'privacy@niyantran.com',
  website: '',
  address: '',
  sections: [
    {
      id: 'intro',
      num: '1',
      title: 'Introduction',
      body: `Welcome to NIYANTRAN TERMINAL ("NIYANTRAN", "Terminal", "we", "us", or "our").

NIYANTRAN TERMINAL is an intelligence platform that brings together authoritative information and data sources across government, policy, legislation, economics, global affairs, markets, research, and related areas.

This Privacy Policy explains how we collect, use, protect, store, and otherwise process information when you access or use our website, platform, dashboards, APIs, research tools, and related services (collectively, the "Services").

By accessing or using the Services, you acknowledge that you have read and understood this Privacy Policy.`,
    },
    {
      id: 'collect',
      num: '2',
      title: 'Information We Collect',
      body: `Depending on how you interact with NIYANTRAN TERMINAL, we may collect the following categories of information.

### 2.1 Account and Authentication Information

If access to the Terminal requires an account, we may collect information necessary to authenticate and maintain your account, such as:

- Username or account identifier
- Authentication credentials
- Session information
- Account permissions and access level
- Login and logout activity

Authentication credentials are intended to be handled server-side and are not shipped as passwords within the client application.

### 2.2 Usage and Technical Information

When you use the Services, we may automatically receive technical information such as:

- IP address
- Browser and device information
- Operating system
- Pages, dashboards, or features accessed
- Approximate timestamps of requests
- Session information
- Error and diagnostic information
- Interaction with platform functionality

Where browser errors are collected for operational purposes, the platform is designed to redact and send them to authenticated server logs.

### 2.3 Information You Submit

We may collect information that you voluntarily provide when you:

- Contact us
- Submit an enquiry
- Request access to the Terminal
- Request support
- Submit feedback
- Use research or analysis functionality
- Communicate with our team`,
    },
    {
      id: 'sources',
      num: '3',
      title: 'Information from Data Sources',
      body: `NIYANTRAN TERMINAL aggregates information from multiple external sources to provide intelligence and research functionality.

These may include government publications, parliamentary sources, public datasets, financial and economic datasets, news and reporting sources, and other authorised information providers.

The platform's source registry maps individual features to specific providers, endpoints, authentication requirements, refresh schedules, coverage rules, and fallback mechanisms.

Information obtained from these sources may be publicly available information and may be subject to the terms, licences, attribution requirements, or other conditions imposed by the relevant source or publisher.

NIYANTRAN does not claim ownership of third-party information merely because it is displayed, indexed, analysed, or referenced through the Terminal.`,
    },
    {
      id: 'use',
      num: '4',
      title: 'How We Use Information',
      body: `We may use information for purposes including:

- Providing and operating the NIYANTRAN TERMINAL
- Authenticating users and maintaining secure sessions
- Providing dashboards, data feeds, research and analytical functionality
- Responding to enquiries and support requests
- Improving platform performance and usability
- Monitoring reliability and service availability
- Detecting, investigating, and preventing misuse or security incidents
- Troubleshooting technical problems
- Maintaining system integrity
- Complying with applicable legal and regulatory requirements

The platform's data architecture uses authenticated API routes, source allowlists, request limits, timeouts, caching, provenance metadata, and labelled fallback states to support reliable operation.`,
    },
    {
      id: 'ai',
      num: '5',
      title: 'AI, Research and Analytical Features',
      body: `NIYANTRAN TERMINAL may provide AI-assisted research, search, analysis, transcription, or related functionality.

Depending on the feature being used, information submitted through these tools may be processed by NIYANTRAN's server-side systems and, where applicable, authorised technology providers used to provide the relevant functionality.

AI-related routes are designed to require authenticated access and server-side credentials rather than exposing provider credentials within the browser.

AI-generated or assisted outputs should not automatically be treated as authoritative statements of fact. Users should review underlying sources and provenance information where available.`,
    },
    {
      id: 'security',
      num: '6',
      title: 'Data Security',
      body: `We take reasonable technical and organisational measures to protect information processed through the Services.

The Terminal's current security architecture includes measures such as:

- Server-side credential verification
- Signed session cookies
- HttpOnly cookies
- SameSite protections
- Secure cookies in production
- Authenticated data and inference routes
- Protected static assets
- Allowlisted upstream sources
- Private-network and local-address rejection
- DNS validation for document retrieval
- Request and resource limits
- Response-size and execution-time limits
- Sanitised browser-error logging

The current implementation specifies a 12-hour signed session cookie with HttpOnly, SameSite=Strict and Secure attributes in production.

No security measure can guarantee absolute protection. Accordingly, while we take appropriate measures to protect information, we cannot guarantee that any transmission or storage system will be completely secure.`,
    },
    {
      id: 'api',
      num: '7',
      title: 'API and Third-Party Services',
      body: `NIYANTRAN TERMINAL connects to approved external data providers and services to retrieve information required by particular features.

The platform's API architecture includes routes for areas such as:

- Legislative information
- Conflict and research information
- Economic indicators
- Weather
- Aircraft and vessel information
- Company information
- Financial data
- Public documents and articles
- AI analysis
- Transcription
- Fact-checking

External requests are subject to controls such as provider allowlists, bounded inputs, timeouts, response limits, authentication requirements, and caching where applicable.

Third-party services may have their own privacy policies and terms. We encourage users to review the applicable policies of external providers where relevant.`,
    },
    {
      id: 'cookies',
      num: '8',
      title: 'Cookies and Session Technologies',
      body: `NIYANTRAN TERMINAL may use cookies and similar technologies to:

- Maintain authenticated sessions
- Secure access to protected areas
- Remember necessary service state
- Support platform functionality
- Maintain security and reliability

Authentication sessions currently use signed cookies, with production sessions configured using HttpOnly, SameSite=Strict and Secure protections.

### Cookie inventory

- Signed session cookie — authentication; 12 hours; HttpOnly, SameSite=Strict, Secure in production
- niyantranAuthed / niyantranAdmin (session storage) — local sign-in state for the Terminal and control plane; cleared when the browser session ends
- niyantranUser (session storage) — issued user identifier for the current session
- niyantranPricing / niyantranSiteSettings / niyantranPrivacy / niyantranRefreshCfg (local storage) — operator-published site copy, pricing, and refresh configuration on this device
- _ga / _ga_* / _gid (Google Analytics, if enabled) — measurement of site usage; duration per Google's current policy; only set when a Measurement ID or Analytics script is published in website settings

If Google Tag Manager is enabled, additional tags configured in that container may set further cookies. Review the container configuration before publishing.`,
    },
    {
      id: 'retention',
      num: '9',
      title: 'Data Retention',
      body: `We retain information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including to:

- Provide the Services
- Maintain account and security records
- Resolve disputes
- Investigate security incidents
- Comply with legal obligations
- Maintain operational and technical records

Specific retention periods currently applied:

- Authentication sessions: 12 hours from issuance, unless renewed
- Account records: while the account is active, and for a reasonable period after closure for security and audit
- Operational and diagnostic logs: typically up to 12 months
- Enquiry and support correspondence: typically up to 24 months
- Published intelligence records: retained according to the source's coverage and the Terminal's archive / last-known-good policy

These periods may be extended where a security investigation, legal claim, or regulatory requirement requires it.`,
    },
    {
      id: 'sharing',
      num: '10',
      title: 'Data Sharing',
      body: `We do not share personal information except where reasonably necessary for legitimate operational, contractual, security, or legal purposes.

Information may be shared with:

- Authorised service providers
- Infrastructure and hosting providers
- Technology providers supporting specific Terminal functionality
- Professional advisers where necessary
- Government or regulatory authorities where legally required
- Other parties where you have provided appropriate consent or instructed us to do so

We do not intend to sell personal information as a commercial data product.`,
    },
    {
      id: 'public',
      num: '11',
      title: 'Public and Third-Party Information',
      body: `The Terminal provides access to information obtained from authoritative and public sources.

The presence of information within the Terminal does not necessarily mean that NIYANTRAN collected that information directly from the individual to whom it relates.

Source provenance and coverage are maintained as part of the platform's data architecture. The system is designed to return live or authoritative records, a last-known-good archive, or an explicitly labelled source-status state rather than fabricate records.

Where a third-party publisher imposes licensing or usage restrictions, those requirements take precedence over technical availability.`,
    },
    {
      id: 'transfers',
      num: '12',
      title: 'International Data Transfers',
      body: `Depending on the hosting infrastructure, service providers, and external data services used by NIYANTRAN TERMINAL, information may be processed or stored in countries other than the country in which you access the Services.

Where applicable, we will take appropriate steps required by applicable data-protection laws in relation to such transfers.

Hosting locations and transfer mechanisms are those of the operator's chosen infrastructure and authorised technology providers. Confirm current locations with the Data Protection / Privacy Team using the contact details in this policy.`,
    },
    {
      id: 'rights',
      num: '13',
      title: 'Your Privacy Rights',
      body: `Depending on your location and applicable law, you may have rights relating to your personal information, including the right to:

- Request access to personal information we hold about you
- Request correction of inaccurate information
- Request deletion of certain information
- Request restriction of processing
- Object to certain processing
- Request portability of information where applicable
- Withdraw consent where processing is based on consent
- Lodge a complaint with the relevant data-protection authority

These rights may be subject to applicable legal limitations and exemptions.

To exercise a privacy right, contact us using the details below.`,
    },
    {
      id: 'children',
      num: '14',
      title: "Children's Privacy",
      body: `The Services are intended for professional and general users and are not specifically directed toward children.

We do not knowingly collect personal information from children where such collection is prohibited by applicable law.

If you believe that a child has provided personal information to us, please contact us so that we can review and take appropriate action.`,
    },
    {
      id: 'links',
      num: '15',
      title: 'External Links',
      body: `The Terminal may contain links to external websites, datasets, documents, publishers, or other resources.

We are not responsible for the privacy practices, security, content, or policies of third-party websites.

We encourage you to review the privacy policy of any external service you access through the Terminal.`,
    },
    {
      id: 'changes',
      num: '16',
      title: 'Changes to This Privacy Policy',
      body: `We may update this Privacy Policy from time to time to reflect:

- Changes to the Services
- Changes to our data practices
- Changes to technology
- Changes to legal or regulatory requirements
- Changes to third-party services

When we make material changes, we may update the "Last Updated" date at the beginning of this policy and provide additional notice where required.`,
    },
    {
      id: 'contact',
      num: '17',
      title: 'Contact Us',
      body: `If you have questions about this Privacy Policy, our data practices, or your privacy rights, please contact the Data Protection / Privacy Team using the details shown on this page.

Those details are maintained by the operator and can be updated from the control plane.`,
    },
  ],
};

function sid() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function merge(saved) {
  const base = DEFAULT_PRIVACY;
  const src = saved && typeof saved === 'object' ? saved : {};
  const sections = Array.isArray(src.sections) && src.sections.length
    ? src.sections.map((s, i) => ({
        id: String(s.id || sid()),
        num: String(s.num || String(i + 1)),
        title: String(s.title || `Section ${i + 1}`),
        body: String(s.body || ''),
      }))
    : base.sections.map((s) => ({ ...s }));
  return {
    lastUpdated: String(src.lastUpdated ?? base.lastUpdated),
    org: String(src.org ?? base.org),
    team: String(src.team ?? base.team),
    email: String(src.email ?? base.email),
    website: String(src.website ?? base.website),
    address: String(src.address ?? base.address),
    sections,
  };
}

export function parsePolicyBody(body) {
  const lines = String(body || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (!para.length) return;
    const text = para.join('\n').trim();
    if (text) blocks.push({ type: 'p', text });
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: 'ul', items: list });
    list = [];
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^###\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', text: line.replace(/^###\s+/, '').trim() });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ type: 'note', text: line.replace(/^>\s?/, '').trim() });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      list.push(line.replace(/^[-*]\s+/, '').trim());
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function loadPrivacy() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch {
    /* defaults */
  }
  return merge({});
}

export function savePrivacy(next) {
  const value = merge(next);
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  return value;
}

export function resetPrivacy() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
  return loadPrivacy();
}

export function subscribePrivacy(fn) {
  const on = () => fn(loadPrivacy());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function newPrivacySection(index) {
  return {
    id: sid(),
    num: String(index + 1),
    title: 'New section',
    body: '',
  };
}
