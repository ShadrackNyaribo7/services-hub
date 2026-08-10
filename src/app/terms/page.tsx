import LegalPage from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the PATANAFUU services marketplace.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Acceptance of Terms
        </h2>
        <p>
          By accessing and using PATANAFUU, you accept and agree to be bound by
          the terms and provisions of this agreement. If you do not agree to
          abide by these terms, please do not use our service.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Service Description
        </h2>
        <p>
          PATANAFUU is a platform that connects clients with providers approved
          through structured offline evidence review. We facilitate:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>Service provider applications and verification</li>
          <li>Client booking of services</li>
          <li>Payment processing through M-Pesa</li>
          <li>Service provider directory and search</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          User Responsibilities
        </h2>
        <p>As a user of PATANAFUU, you agree to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Provide accurate and truthful information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Use the service for lawful purposes only</li>
          <li>Respect the rights of other users and service providers</li>
          <li>Comply with all applicable laws and regulations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Service Provider Obligations
        </h2>
        <p>Service providers agree to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Provide accurate professional credentials</li>
          <li>Deliver services as described and booked</li>
          <li>Maintain professional standards and conduct</li>
          <li>Honor confirmed bookings and schedules</li>
          <li>Comply with industry regulations and standards</li>
          <li>
            Enable precise device location, keep the Provider Operations screen
            active, and maintain uninterrupted authenticated location heartbeats
            throughout each in-progress job
          </li>
          <li>
            Never spoof, falsify, relay, obstruct, or attempt to bypass
            operational location safety controls
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Operational Location Safety
        </h2>
        <p>
          A paid booking cannot enter active operation until the provider gives
          explicit location consent and supplies a sufficiently precise live
          position. Location heartbeats are required while work is in progress,
          and provider completion requires a fresh accepted heartbeat. Missing,
          stale, low-accuracy, or implausible updates may pause operational
          assurance and create an automatic security record; they do not create
          an admin-approval stage in normal booking completion.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Client Obligations
        </h2>
        <p>Clients agree to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Provide accurate booking information</li>
          <li>Be available at scheduled service times</li>
          <li>Pay for services as agreed</li>
          <li>Treat service providers with respect</li>
          <li>Provide appropriate access for service delivery</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Payment Terms
        </h2>
        <p>
          Payments are processed through M-Pesa and subject to the following
          terms:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>
            Payment is required before service delivery unless otherwise agreed
          </li>
          <li>All prices are quoted in Kenyan Shillings (KES)</li>
          <li>M-Pesa transaction fees may apply</li>
          <li>Refunds are processed according to our Refund Policy</li>
          <li>Payment confirmation is required for service confirmation</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Verification and Background Checks
        </h2>
        <p>We review service-provider submissions using:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Document-number format and duplicate-entry checks</li>
          <li>Cross-document holder-name consistency checks</li>
          <li>Professional credential plausibility checks</li>
          <li>Tamper-evident audit seals and automatic policy evaluation</li>
          <li>
            These offline checks do not authenticate records against a live
            government, police, regulator, or issuer database
          </li>
          <li>
            However, we cannot guarantee the completeness or accuracy of all
            verifications
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Limitation of Liability
        </h2>
        <p>PATANAFUU is not liable for:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Quality of services provided by third-party providers</li>
          <li>Direct or indirect damages resulting from service use</li>
          <li>Issues arising from M-Pesa payment processing</li>
          <li>Service provider misconduct or negligence</li>
          <li>Technical issues or service interruptions</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Prohibited Activities
        </h2>
        <p>Users are prohibited from:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Using the platform for fraudulent activities</li>
          <li>Harassing or abusing other users</li>
          <li>Posting false or misleading information</li>
          <li>Attempting to bypass security measures</li>
          <li>Violating any applicable laws or regulations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Account Termination
        </h2>
        <p>We reserve the right to terminate accounts that:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Violate these terms of service</li>
          <li>Engage in fraudulent or illegal activities</li>
          <li>Compromise the safety of other users</li>
          <li>Damage the reputation of the platform</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Privacy and Data Protection
        </h2>
        <p>
          Your use of PATANAFUU is also governed by our Privacy Policy, which
          describes how we collect, use, and protect your personal information.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Modifications to Terms
        </h2>
        <p>
          We may modify these terms at any time. Continued use of the service
          after changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Governing Law
        </h2>
        <p>
          These terms are governed by the laws of Kenya. Any disputes will be
          resolved in Kenyan courts.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Contact Information
        </h2>
        <p>
          For questions about these terms, contact us at:
          stilespulsar77@gmail.com
        </p>
      </section>
    </LegalPage>
  );
}
