export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-900 text-slate-50 py-12 px-6">
      <div className="relative z-10 mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Name and contact information</li>
              <li>Phone numbers for M-Pesa payments</li>
              <li>Service category and location preferences</li>
              <li>Professional credentials and verification documents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Process service bookings and payments</li>
              <li>Verify service provider credentials</li>
              <li>Improve our services and user experience</li>
              <li>Communicate with you about your bookings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information, including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Encryption of sensitive data</li>
              <li>Secure payment processing through M-Pesa</li>
              <li>Access controls and authentication systems</li>
              <li>Regular security assessments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Services</h2>
            <p>We use third-party services to facilitate our operations, including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>M-Pesa for payment processing</li>
              <li>Clerk for authentication</li>
              <li>Unified Fitness Platform for service provider integration</li>
              <li>Document verification services for provider validation</li>
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
            <p>For privacy-related inquiries, please contact us at: stilespulsar77@gmail.com</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Policy Updates</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
          </section>
        </div>

        <div className="mt-8 text-sm text-slate-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
