import LegalDocPage from './LegalDocPage.jsx';
import { loadTerms, subscribeTerms } from '../lib/termsStore.js';

export default function TermsPage() {
  return (
    <LegalDocPage
      load={loadTerms}
      subscribe={subscribeTerms}
      kicker="TERMS"
      title="Terms & Conditions"
      lede="The agreement that governs access to {org}, including the website, dashboards, APIs, research tools and related services."
      chip="Governs website, dashboards, APIs and research tools"
      railKicker="Legal"
      railTitle="Questions about these Terms"
      railCopy="Contact the legal and compliance team about these Terms, the Services, or a suspected violation."
      railCta="Email legal team"
      muteKicker="No professional advice"
      muteCopy="The Terminal is an information service. Outputs are not legal, financial, investment, or other professional advice unless a separate written agreement says otherwise."
      teamFallback="Legal / Compliance Team"
      showLaw
    />
  );
}
