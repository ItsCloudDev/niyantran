import { parsePolicyBody } from './privacyStore.js';

const KEY = 'niyantranTerms';
const EVENT = 'niy-terms';

export { parsePolicyBody };

export const DEFAULT_TERMS = {
  lastUpdated: '3 September 2026',
  org: 'NIYANTRAN TERMINAL',
  team: 'Legal / Compliance Team',
  email: 'legal@niyantran.com',
  website: '',
  address: '',
  jurisdiction: '',
  courts: '',
  sections: [
    {
      id: 'intro',
      num: '1',
      title: 'Introduction',
      body: `These Terms & Conditions ("Terms", "Terms and Conditions") govern your access to and use of NIYANTRAN TERMINAL ("NIYANTRAN", "Terminal", "we", "us", or "our"), including our website, dashboards, data services, research tools, APIs, analytical functionality, and related services (collectively, the "Services").

By accessing or using the Services, you agree to be bound by these Terms.

If you do not agree with these Terms, you should not access or use the Services.`,
    },
    {
      id: 'about',
      num: '2',
      title: 'About NIYANTRAN TERMINAL',
      body: `NIYANTRAN TERMINAL is an intelligence and information platform designed to bring together information from multiple authoritative, public, and approved data sources.

The Terminal provides functionality across areas including:

- Legislative and policy intelligence
- Government operations
- Electoral data and analytics
- Global affairs and diplomacy
- Conflict and security intelligence
- Economics and finance
- Strategic assets
- Media and narrative intelligence
- Environmental and carbon information
- Markets and related research

The Services may include live information, historical information, analytical outputs, research results, visualisations, summaries, AI-assisted analysis, and links to underlying sources.`,
    },
    {
      id: 'eligibility',
      num: '3',
      title: 'Eligibility and Access',
      body: `You may use the Services only if you are legally capable of entering into a binding agreement under applicable law.

Certain areas of NIYANTRAN TERMINAL may require authentication or authorised access.

Where authentication is required, you are responsible for:

- Maintaining the confidentiality of your credentials
- Preventing unauthorised access to your account
- Using the Services only through authorised means
- Immediately notifying us of suspected unauthorised access

The Terminal's current implementation uses authenticated routes and signed sessions for protected functionality.

We reserve the right to suspend or restrict access where we reasonably believe an account is being misused, compromised, or used in violation of these Terms.`,
    },
    {
      id: 'use',
      num: '4',
      title: 'Acceptable Use',
      body: `You agree to use NIYANTRAN TERMINAL only for lawful purposes and in accordance with these Terms.

You must not:

- Attempt to gain unauthorised access to the Services
- Circumvent authentication or access controls
- Interfere with the operation or security of the platform
- Introduce malicious code, malware, or harmful material
- Attempt to probe, scan, or test system vulnerabilities without authorisation
- Circumvent rate limits or technical restrictions
- Use automated systems to access the Services in a manner that exceeds permitted usage
- Scrape or systematically extract information where such activity is prohibited
- Misrepresent information obtained through the Terminal
- Use the Services for unlawful surveillance, harassment, fraud, or other unlawful activity
- Attempt to access credentials, secrets, private APIs, or internal infrastructure
- Reverse engineer or attempt to reproduce protected components of the Services except where permitted by applicable law

The platform applies controls including allowlisted upstreams, bounded inputs, private-network rejection, timeouts, response limits, and other network and resource protections.`,
    },
    {
      id: 'data',
      num: '5',
      title: 'Data and Information',
      body: `NIYANTRAN TERMINAL aggregates information from a range of external sources.

These sources may include official government sources, parliamentary records, public datasets, financial and economic information, news and reporting sources, and other authorised providers.

The platform's source registry defines the relevant source, endpoint, method, authentication requirements, refresh cadence, fallback behaviour, and coverage information for individual features.

Information displayed through the Terminal may therefore:

- Originate from third parties
- Change over time
- Be incomplete
- Contain errors or omissions
- Become temporarily unavailable
- Be subject to source-specific licensing or usage restrictions

We do not guarantee that every item of information available through the Services is complete, current, accurate, or suitable for a particular purpose.`,
    },
    {
      id: 'provenance',
      num: '6',
      title: 'Source Provenance and Coverage',
      body: `Where available, NIYANTRAN may display source, provenance, coverage, timestamp, or availability information alongside data.

The platform is designed to distinguish between live information, last-known-good information, archived information, and source-status states rather than presenting fabricated records as live information.

Where a source is unavailable, the Terminal may provide an archived or fallback result or indicate that information is currently unavailable.

Users should consider the underlying source and its applicable terms before relying on information obtained through the Services.`,
    },
    {
      id: 'thirdparty',
      num: '7',
      title: 'Third-Party Sources and Links',
      body: `The Services may display, reference, retrieve, or link to information hosted by third parties.

These third parties may include:

- Government institutions
- Parliamentary bodies
- Public-data providers
- Financial information providers
- News organisations
- Research organisations
- Technology providers
- Other external publishers

NIYANTRAN does not necessarily own or control third-party information.

Third-party websites, documents, APIs, datasets, and services may be subject to separate terms, licences, copyright restrictions, and privacy policies.

Where third-party publisher terms or licensing requirements apply, those requirements take precedence over technical availability.`,
    },
    {
      id: 'ai',
      num: '8',
      title: 'AI and Analytical Features',
      body: `NIYANTRAN TERMINAL may provide AI-assisted research, analysis, search, summarisation, transcription, or other computational features.

AI-generated or AI-assisted outputs are provided as research and informational assistance.

They should not automatically be treated as:

- Legal advice
- Financial advice
- Investment advice
- Government advice
- Political advice
- Security advice
- Professional advice
- A definitive statement of fact

AI outputs may contain inaccuracies, omissions, outdated information, or incorrect interpretations.

Users are responsible for reviewing relevant underlying sources and independently verifying important information before relying upon it.

The Terminal's AI and analysis routes are authenticated and use server-side credentials for supported providers.`,
    },
    {
      id: 'advice',
      num: '9',
      title: 'No Professional Advice',
      body: `NIYANTRAN TERMINAL is an information and intelligence service.

Nothing provided through the Services constitutes professional advice unless expressly stated otherwise in a separate written agreement.

You should obtain appropriate professional advice before making decisions involving legal, financial, investment, regulatory, security, political, commercial, or other material consequences.`,
    },
    {
      id: 'availability',
      num: '10',
      title: 'Accuracy and Availability',
      body: `We aim to provide reliable and useful information, but the Services are dependent on multiple internal systems and external providers.

Accordingly, we do not guarantee that the Services will:

- Always be available
- Always operate without interruption
- Be completely error-free
- Contain complete information
- Contain real-time information for every feature
- Always retrieve information from an external provider
- Be free from technical defects

The platform includes fallback and caching mechanisms intended to maintain useful service availability when upstream providers experience problems.`,
    },
    {
      id: 'ip',
      num: '11',
      title: 'Intellectual Property',
      body: `Unless otherwise stated, NIYANTRAN and its licensors retain all rights, title, and interest in the NIYANTRAN TERMINAL platform, including its:

- Software
- Interface
- Design
- Branding
- Logos
- Visual systems
- Original content
- Documentation
- Platform architecture
- Proprietary databases and structures
- Analytical systems
- Software code

Nothing in these Terms grants you ownership of the Terminal or its underlying technology.

You receive only the rights necessary to access and use the Services in accordance with these Terms and any applicable subscription or service agreement.`,
    },
    {
      id: 'tpcontent',
      num: '12',
      title: 'Third-Party Content',
      body: `Information originating from third-party sources remains subject to the rights of the relevant publisher, provider, government body, organisation, or other rights holder.

Your access to third-party content through NIYANTRAN does not grant you ownership of that content.

You are responsible for complying with applicable copyright, licensing, attribution, database-rights, and other restrictions when using information obtained through the Services.`,
    },
    {
      id: 'api',
      num: '13',
      title: 'API and Automated Access',
      body: `Certain NIYANTRAN functionality may be exposed through APIs or machine-readable interfaces.

API access, where provided, may be subject to separate:

- Authentication requirements
- Rate limits
- Usage limits
- Technical documentation
- Commercial terms
- Data-source restrictions
- API-specific agreements

You must not attempt to bypass API restrictions, authentication requirements, rate limits, or other technical controls.

The Terminal's current API architecture uses bounded inputs and results, authentication controls, provenance metadata, provider allowlists, and other safeguards.`,
    },
    {
      id: 'security',
      num: '14',
      title: 'Security',
      body: `You must not interfere with or attempt to compromise the security of NIYANTRAN TERMINAL.

This includes attempting to:

- Obtain unauthorised credentials
- Access protected routes
- Circumvent authentication
- Exploit vulnerabilities
- Access private infrastructure
- Introduce malicious software
- Manipulate platform data
- Interfere with service availability

The Terminal is designed with server-side credential handling, signed sessions, authenticated routes, network allowlists, private-address rejection, DNS validation, timeouts, and bounded resource usage.`,
    },
    {
      id: 'accounts',
      num: '15',
      title: 'Accounts and Credentials',
      body: `Where an account is provided, you are responsible for all activity conducted through your account unless you can demonstrate that such activity occurred through no fault or action on your part.

You must not:

- Share credentials with unauthorised persons
- Sell or transfer access
- Attempt to use another person's account
- Store credentials insecurely
- Circumvent account restrictions

We may suspend or terminate access where account security has been compromised or these Terms have been violated.`,
    },
    {
      id: 'changes-service',
      num: '16',
      title: 'Service Changes',
      body: `We may modify, improve, suspend, replace, or discontinue portions of the Services from time to time.

This may include changes to:

- Data sources
- APIs
- Dashboards
- Features
- AI models
- External providers
- Data coverage
- Technical architecture
- Interface and design

The platform's source registry and provider integrations may require updates when external sources change their endpoints, schemas, authentication requirements, or availability.

Where reasonably practicable, material changes may be communicated to users.`,
    },
    {
      id: 'termination',
      num: '17',
      title: 'Suspension and Termination',
      body: `We may suspend or terminate access to the Services if:

- You breach these Terms
- You misuse the Services
- Your account presents a security risk
- You attempt unauthorised access
- Your use creates a risk to the Services or other users
- We are required to do so by law
- Continued operation of a particular feature becomes impractical or unlawful

Upon termination, your right to access restricted portions of the Services may immediately cease.`,
    },
    {
      id: 'warranty',
      num: '18',
      title: 'Disclaimer of Warranties',
      body: `To the maximum extent permitted by applicable law, the Services are provided on an "as is" and "as available" basis.

To the extent permitted by law, NIYANTRAN disclaims warranties, whether express, implied, statutory, or otherwise, including warranties relating to:

- Accuracy
- Completeness
- Availability
- Reliability
- Fitness for a particular purpose
- Non-infringement
- Merchantability
- Continuous operation

Nothing in these Terms excludes a warranty or right that cannot legally be excluded.`,
    },
    {
      id: 'liability',
      num: '19',
      title: 'Limitation of Liability',
      body: `To the maximum extent permitted by applicable law, NIYANTRAN and its officers, employees, contractors, licensors, and service providers will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages arising from or relating to your use of the Services.

This includes, where legally permissible, losses arising from:

- Reliance on information displayed through the Terminal
- Business or investment decisions
- AI-generated analysis
- Data inaccuracies
- Service interruptions
- Third-party source failures
- Loss of data
- Loss of business opportunities
- Unauthorised access resulting from circumstances outside our reasonable control

Nothing in these Terms limits liability where such limitation is prohibited by applicable law.

> Insert any agreed contractual liability cap after legal review.`,
    },
    {
      id: 'indemnity',
      num: '20',
      title: 'Indemnification',
      body: `To the extent permitted by applicable law, you agree to indemnify and hold harmless NIYANTRAN and its officers, employees, contractors, licensors, and service providers from claims, liabilities, losses, damages, costs, and expenses arising from:

- Your violation of these Terms
- Your unlawful use of the Services
- Your misuse of third-party information
- Your infringement of third-party rights
- Your unauthorised use of the Services
- Your actions that cause damage to the platform or another user`,
    },
    {
      id: 'confidential',
      num: '21',
      title: 'Confidentiality',
      body: `Where NIYANTRAN and a customer or user enter into a separate confidentiality or commercial agreement, the terms of that agreement may impose additional confidentiality obligations.

Nothing in these Terms requires either party to disclose confidential information except where permitted or required under applicable law or an applicable agreement.`,
    },
    {
      id: 'privacy',
      num: '22',
      title: 'Privacy',
      body: `Your use of the Services is also subject to our [Privacy Policy](/privacy), which explains how we process personal information.

The Privacy Policy forms part of the framework governing your use of the Services.`,
    },
    {
      id: 'law',
      num: '23',
      title: 'Governing Law',
      body: `These Terms shall be governed by and interpreted in accordance with the laws of the jurisdiction named below, without regard to its conflict-of-law principles.

Any disputes arising from or relating to these Terms or the Services shall be subject to the courts named below, unless otherwise required by applicable law or agreed in writing between the parties.

Confirm governing law and forum with the Legal / Compliance Team before relying on this clause.`,
    },
    {
      id: 'changes-terms',
      num: '24',
      title: 'Changes to These Terms',
      body: `We may update these Terms from time to time.

When changes are made, we may update the "Last Updated" date at the beginning of this document.

Where required by law or where changes are materially significant, we may provide additional notice.

Your continued use of the Services following the effective date of updated Terms constitutes acceptance of the revised Terms, to the extent permitted by law.`,
    },
    {
      id: 'severability',
      num: '25',
      title: 'Severability',
      body: `If any provision of these Terms is found to be invalid, unlawful, or unenforceable, that provision shall be interpreted or modified to the minimum extent necessary to make it enforceable.

The remaining provisions will continue in full force and effect.`,
    },
    {
      id: 'entire',
      num: '26',
      title: 'Entire Agreement',
      body: `These Terms, together with the [Privacy Policy](/privacy) and any applicable subscription, commercial, enterprise, API, or other written agreement between you and NIYANTRAN, constitute the agreement governing your use of the Services.

Where a separately executed agreement conflicts with these Terms, the separately executed agreement will prevail to the extent of the conflict.`,
    },
    {
      id: 'contact',
      num: '27',
      title: 'Contact',
      body: `If you have questions regarding these Terms, the Services, or a potential violation of these Terms, please contact the Legal / Compliance Team using the details shown on this page.

Those details are maintained by the operator and can be updated from the control plane.`,
    },
  ],
};

function sid() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function merge(saved) {
  const base = DEFAULT_TERMS;
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
    jurisdiction: String(src.jurisdiction ?? base.jurisdiction),
    courts: String(src.courts ?? base.courts),
    sections,
  };
}

export function loadTerms() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch {
    /* defaults */
  }
  return merge({});
}

export function saveTerms(next) {
  const value = merge(next);
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  return value;
}

export function resetTerms() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
  return loadTerms();
}

export function subscribeTerms(fn) {
  const on = () => fn(loadTerms());
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener('storage', on);
  };
}

export function newTermsSection(index) {
  return {
    id: sid(),
    num: String(index + 1),
    title: 'New section',
    body: '',
  };
}
