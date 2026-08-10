import LegalPage from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PATANAFUU collects, uses, and protects personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Information We Collect
        </h2>
        <p>We collect information you provide directly to us, including:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Name and contact information</li>
          <li>Phone numbers for M-Pesa payments</li>
          <li>Service category and location preferences</li>
          <li>Professional credentials and verification documents</li>
          <li>National ID and Police Clearance Certificate identifiers</li>
          <li>Consent and audit records for provider evidence review</li>
          <li>
            A provider&apos;s precise device location, GPS accuracy, heartbeat
            times, and continuity or integrity alerts while a paid job is marked
            in progress
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          How We Use Your Information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Process service bookings and payments</li>
          <li>Review service provider credential submissions</li>
          <li>Improve our services and user experience</li>
          <li>Communicate with you about your bookings</li>
          <li>
            Protect clients and providers, confirm operational continuity, and
            investigate safety, fraud, or service disputes
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Data Security
        </h2>
        <p>
          We implement appropriate security measures to protect your personal
          information, including:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>
            Application-layer authenticated encryption of precise operational
            coordinates before database storage
          </li>
          <li>Secure payment processing through M-Pesa</li>
          <li>Access controls and authentication systems</li>
          <li>Regular security assessments</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Provider Operational Location
        </h2>
        <p>
          Precise location collection starts only after an approved provider
          explicitly consents and starts a paid operation. It continues through
          authenticated heartbeats until the provider records completion.
          Providers must keep the operations screen active because mobile
          operating systems may suspend browser tracking in the background.
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>
            Exact coordinates are not shown in the public provider directory
          </li>
          <li>
            Exact coordinates are available only to authorized security
            administrators for safety and dispute handling
          </li>
          <li>
            Stale, interrupted, low-accuracy, or physically implausible updates
            are rejected or recorded as security signals
          </li>
          <li>
            Location records are retained only as needed for safety, fraud,
            dispute, legal, and regulatory purposes
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Third-Party Services
        </h2>
        <p>
          We use third-party services to facilitate our operations, including:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>M-Pesa for payment processing</li>
          <li>Clerk for authentication</li>
          <li>
            Offline consistency checks, automatic policy evaluation, and
            post-approval oversight for provider evidence
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Access your personal information</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt-out of marketing communications</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
        <p>
          For privacy-related inquiries, please contact us at:
          stilespulsar77@gmail.com
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Policy Updates
        </h2>
        <p>
          We may update this privacy policy from time to time. We will notify
          you of any changes by posting the new policy on this page.
        </p>
      </section>
    </LegalPage>
  );
}
