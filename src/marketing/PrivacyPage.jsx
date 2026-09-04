import LegalDocPage from './LegalDocPage.jsx';
import { loadPrivacy, subscribePrivacy } from '../lib/privacyStore.js';

export default function PrivacyPage() {
  return (
    <LegalDocPage
      load={loadPrivacy}
      subscribe={subscribePrivacy}
      kicker="POLICY"
      title="Privacy Policy"
      lede="How {org} collects, uses, protects and otherwise processes information when you use the Terminal and related services."
      railKicker="Data protection"
      railTitle="Questions about this policy"
      railCopy="Reach the privacy team with access, correction, or deletion requests."
      railCta="Email privacy team"
      muteKicker="Provenance"
      muteCopy="Third-party records in the Terminal remain subject to the publisher’s terms. Presence in a desk is not a claim that NIYANTRAN collected that information from the person it describes."
      teamFallback="Data Protection / Privacy Team"
    />
  );
}
