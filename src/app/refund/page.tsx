"use client";

import BackgroundLottie from "@/components/BackgroundLottie";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-900 text-slate-50 py-12 px-6">
      <BackgroundLottie />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Refund Eligibility</h2>
            <p>Refunds may be processed under the following circumstances:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Service provider cancellation before the scheduled date</li>
              <li>Double payment or erroneous transaction</li>
              <li>Service not delivered as described</li>
              <li>Technical issues preventing service delivery</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Refund Process</h2>
            <p>To request a refund:</p>
            <ol className="list-decimal ml-6 mt-2">
              <li>Contact our support team at stilespulsar77@gmail.com</li>
              <li>Provide your booking ID and transaction details</li>
              <li>Describe the reason for the refund request</li>
              <li>Our team will review your request within 3-5 business days</li>
              <li>Approved refunds will be processed via M-Pesa within 7-14 business days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Non-Refundable Situations</h2>
            <p>Refunds will not be issued for:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Client cancellation less than 24 hours before scheduled service</li>
              <li>No-show by the client</li>
              <li>Change of mind after service has been initiated</li>
              <li>Services already completed to satisfaction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Partial Refunds</h2>
            <p>Partial refunds may be offered in situations where:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Service was partially completed</li>
              <li>Alternative arrangements were made</li>
              <li>Both parties agree to a partial refund</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">M-Pesa Refund Processing</h2>
            <p>All refunds are processed through M-Pesa using the following procedure:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Refunds are initiated from our business account to the original payment number</li>
              <li>M-Pesa transaction fees may apply to refund transactions</li>
              <li>Processing time depends on M-Pesa's system (typically 1-3 business days)</li>
              <li>You will receive an SMS confirmation when the refund is processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Dispute Resolution</h2>
            <p>If you disagree with a refund decision:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>You may request a review within 7 days of the decision</li>
              <li>Provide additional evidence or documentation</li>
              <li>Our management team will conduct a secondary review</li>
              <li>Final decisions will be communicated within 5 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Cancellation Policy</h2>
            <p>For service cancellations:</p>
            <ul className="list-disc ml-6 mt-2">
              <li><strong>More than 48 hours notice:</strong> Full refund</li>
              <li><strong>24-48 hours notice:</strong> 50% refund</li>
              <li><strong>Less than 24 hours notice:</strong> No refund</li>
              <li>Provider cancellations always qualify for full refund</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
            <p>For refund-related inquiries:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Email: stilespulsar77@gmail.com</li>
              <li>Phone: Available in your booking confirmation</li>
              <li>Response time: Within 24 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Policy Updates</h2>
            <p>We reserve the right to modify this refund policy. Changes will be posted on this page and will apply to future transactions.</p>
          </section>
        </div>

        <div className="mt-8 text-sm text-slate-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}