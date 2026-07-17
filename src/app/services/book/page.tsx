"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { useBooking } from "@/hooks/useBooking";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import BackgroundLottie from "@/components/BackgroundLottie";

export default function BookProviderPage() {
  const params = useParams<{ id: string }>();
  const { createBooking, isLoading: bookingLoading, error: bookingError, success: bookingSuccess, reset: bookingReset } = useBooking();
  const { initiatePayment, isLoading: paymentLoading, error: paymentError, success: paymentSuccess, reset: paymentReset } = useMpesaPayment();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState<number>(100); // Default service fee

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const booking = {
      providerProfileId: params.id,
      clientName: formData.get("clientName") as string,
      clientPhone: formData.get("clientPhone") as string,
      county: formData.get("county") as string,
      scheduledDate: formData.get("scheduledDate") as string,
      notes: formData.get("notes") as string,
      amount: amount,
      mpesaPhoneNumber: formData.get("mpesaPhoneNumber") as string,
    };

    const result = await createBooking(booking);

    if (result) {
      // Extract booking ID from response
      
      const mockBookingId = "booking-" + Date.now();
      setBookingId(mockBookingId);
      setShowPayment(true);
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const phoneNumber = formData.get("phoneNumber") as string;

    if (!bookingId) {
      alert("Booking ID not available. Please try booking again.");
      return;
    }

    const paymentResult = await initiatePayment({
      phoneNumber,
      amount,
      bookingId,
      accountReference: `BOOKING-${bookingId}`,
    });

    if (paymentResult) {
      alert("Payment initiated! Please check your phone to complete the MPesa payment.");
    }
  }

  const isLoading = bookingLoading || paymentLoading;
  const error = bookingError || paymentError;
  const success = bookingSuccess || paymentSuccess;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <BackgroundLottie />
      <section className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Book Provider</h1>

        {!showPayment ? (
          <form onSubmit={handleBookingSubmit} className="mt-8 space-y-5 rounded-md border bg-white p-4 sm:p-6">
            <label className="block">
              <span className="font-medium">Your name</span>
              <input name="clientName" required className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
            </label>

            <label className="block">
              <span className="font-medium">Phone number</span>
              <input name="clientPhone" required placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
            </label>

            <label className="block">
              <span className="font-medium">County</span>
              <input name="county" required className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
            </label>

            <label className="block">
              <span className="font-medium">Preferred date</span>
              <input name="scheduledDate" required type="datetime-local" className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
            </label>

            <label className="block">
              <span className="font-medium">Notes</span>
              <textarea name="notes" rows={4} className="mt-2 w-full rounded-md border px-3 py-2" />
            </label>

            <div className="border-t pt-5">
              <label className="block">
                <span className="font-medium">Payment Method</span>
                <select
                  value={showPayment ? "mpesa" : "none"}
                  onChange={(e) => {
                    if (e.target.value === "mpesa") {
                      setShowPayment(true);
                    }
                  }}
                  className="mt-2 w-full rounded-md border px-3 py-2"
                >
                  <option value="none">Select payment method</option>
                  <option value="mpesa">MPesa (Mobile Money)</option>
                </select>
              </label>

              <label className="mt-4 block">
                <span className="font-medium">Service fee (KES)</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="1"
                  required
                  className="mt-2 w-full rounded-md border px-3 py-2"
                />
              </label>

              <label className="mt-4 block">
                <span className="font-medium">MPesa Phone Number</span>
                <input
                  name="mpesaPhoneNumber"
                  placeholder="07XXXXXXXX or +254XXXXXXXXX"
                  className="mt-2 w-full rounded-md border px-3 py-2"
                />
                <span className="text-xs text-slate-500">Enter the MPesa number you'll use to pay</span>
              </label>
            </div>

            <button disabled={isLoading} className="w-full min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
              {isLoading ? "Processing..." : "Request Booking"}
            </button>

            {bookingSuccess && (
              <p className="text-sm font-medium text-emerald-700">
                Booking request submitted! After payment, both you and the provider will need to confirm service completion before the booking is finalized.
              </p>
            )}
            {error && (
              <p className="text-sm font-medium text-red-700">{error}</p>
            )}
          </form>
        ) : (
          <div className="mt-8 rounded-md border bg-white p-4 sm:p-6">
            <h2 className="text-xl font-bold sm:text-2xl">Complete Payment</h2>
            <p className="mt-2 text-slate-600">
              Booking ID: {bookingId}
            </p>
            <p className="text-base font-semibold sm:text-lg">
              Amount: KES {amount}
            </p>

            <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="font-medium">MPesa Phone Number</span>
                <input
                  name="phoneNumber"
                  required
                  placeholder="07XXXXXXXX or +254XXXXXXXXX"
                  className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
                />
                <span className="text-xs text-slate-500">Enter the number registered with MPesa</span>
              </label>

              <button disabled={paymentLoading} className="w-full min-h-[44px] rounded-md bg-green-600 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
                {paymentLoading ? "Initiating..." : "Pay with MPesa"}
              </button>

              {paymentSuccess && (
                <p className="text-sm font-medium text-emerald-700">
                  Payment initiated! Check your phone for the MPesa STK push prompt. After payment completion, both you and the provider will confirm service delivery.
                </p>
              )}
              {paymentError && (
                <p className="text-sm font-medium text-red-700">{paymentError}</p>
              )}
            </form>

            <button
              onClick={() => {
                setShowPayment(false);
                paymentReset();
              }}
              className="mt-4 w-full rounded-md border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
            >
              Back to Booking
            </button>
          </div>
        )}
      </section>
    </main>
  );
}