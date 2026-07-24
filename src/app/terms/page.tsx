export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-900 text-slate-50 py-12 px-6">
      <div className="relative z-10 mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
            <p>By accessing and using SERVICE-HUB, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Service Description</h2>
            <p>SERVICE-HUB is a platform that connects clients with verified service providers. We facilitate:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Service provider applications and verification</li>
              <li>Client booking of services</li>
              <li>Payment processing through M-Pesa</li>
              <li>Service provider directory and search</li>
              <li>Integration with third-party service platforms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">User Responsibilities</h2>
            <p>As a user of SERVICE-HUB, you agree to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Provide accurate and truthful information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service for lawful purposes only</li>
              <li>Respect the rights of other users and service providers</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Service Provider Obligations</h2>
            <p>Service providers agree to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Provide accurate professional credentials</li>
              <li>Deliver services as described and booked</li>
              <li>Maintain professional standards and conduct</li>
              <li>Honor confirmed bookings and schedules</li>
              <li>Comply with industry regulations and standards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Client Obligations</h2>
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
            <h2 className="text-2xl font-semibold text-white mb-4">Payment Terms</h2>
            <p>Payments are processed through M-Pesa and subject to the following terms:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Payment is required before service delivery unless otherwise agreed</li>
              <li>All prices are quoted in Kenyan Shillings (KES)</li>
              <li>M-Pesa transaction fees may apply</li>
              <li>Refunds are processed according to our Refund Policy</li>
              <li>Payment confirmation is required for service confirmation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Verification and Background Checks</h2>
            <p>We conduct verification of service providers including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Professional credential validation</li>
              <li>Identity verification</li>
              <li>Police clearance checks where applicable</li>
              <li>Professional body verification</li>
              <li>Approval requires recorded official evidence; format checks alone are not verification</li>
              <li>However, we cannot guarantee the completeness or accuracy of all verifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
            <p>SERVICE-HUB is not liable for:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Quality of services provided by third-party providers</li>
              <li>Direct or indirect damages resulting from service use</li>
              <li>Issues arising from M-Pesa payment processing</li>
              <li>Service provider misconduct or negligence</li>
              <li>Technical issues or service interruptions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Prohibited Activities</h2>
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
            <h2 className="text-2xl font-semibold text-white mb-4">Account Termination</h2>
            <p>We reserve the right to terminate accounts that:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Violate these terms of service</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Compromise the safety of other users</li>
              <li>Damage the reputation of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Privacy and Data Protection</h2>
            <p>Your use of SERVICE-HUB is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Modifications to Terms</h2>
            <p>We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Governing Law</h2>
            <p>These terms are governed by the laws of Kenya. Any disputes will be resolved in Kenyan courts.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
            <p>For questions about these terms, contact us at: stilespulsar77@gmail.com</p>
          </section>
        </div>

        <div className="mt-8 text-sm text-slate-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
