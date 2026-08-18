"use client";

import { FormEvent, useState } from "react";
import { useBooking } from "@/hooks/useBooking";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";

type ServiceOption = {
  id: string;
  name: string;
  priceKes: number;
};

type BookProviderFormProps = {
  provider: {
    id: string;
    name: string;
    county: string;
    serviceCategory: string;
    services: ServiceOption[];
  };
};

const fieldClassName =
  "mt-2 min-h-[44px] w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";

export default function BookProviderForm({ provider }: BookProviderFormProps) {
  const {
    createBooking,
    isLoading: bookingLoading,
    error: bookingError,
  } = useBooking();
  const {
    initiatePayment,
    isLoading: paymentLoading,
    error: paymentError,
    success: paymentSuccess,
    reset: paymentReset,
  } = useMpesaPayment();
  const [selectedServiceId, setSelectedServiceId] = useState(
    provider.services[0].id,
  );
  const [bookedService, setBookedService] = useState<ServiceOption | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentPhone, setPaymentPhone] = useState("");

  const selectedService =
    provider.services.find((service) => service.id === selectedServiceId) ??
    provider.services[0];
  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mpesaPhoneNumber = String(formData.get("mpesaPhoneNumber") ?? "");

    const result = await createBooking({
      providerProfileId: provider.id,
      providerServiceId: selectedService.id,
      clientName: String(formData.get("clientName") ?? ""),
      clientPhone: String(formData.get("clientPhone") ?? ""),
      county: String(formData.get("county") ?? ""),
      scheduledDate: String(formData.get("scheduledDate") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      mpesaPhoneNumber,
    });

    if (result) {
      setBookingId(result.booking.id);
      setBookedService(selectedService);
      setPaymentPhone(mpesaPhoneNumber);
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingId) return;

    const formData = new FormData(event.currentTarget);
    await initiatePayment({
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      bookingId,
    });
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
      <div className="border-b border-slate-700 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
          {provider.serviceCategory} · {provider.county}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Book {provider.name}
        </h1>
      </div>

      {!bookingId || !bookedService ? (
        <form onSubmit={handleBookingSubmit} className="space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="font-semibold text-slate-100">
              Choose a service
            </legend>
            <div className="mt-3 grid gap-3">
              {provider.services.map((service) => (
                <label
                  key={service.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition ${
                    selectedServiceId === service.id
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-slate-700 bg-slate-950/60 hover:border-slate-500"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="providerServiceId"
                      value={service.id}
                      checked={selectedServiceId === service.id}
                      onChange={() => setSelectedServiceId(service.id)}
                      className="size-4 accent-emerald-500"
                    />
                    <span className="font-medium text-slate-100">
                      {service.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-emerald-300">
                    KES {service.priceKes.toLocaleString("en-KE")}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-medium text-slate-200">Your name</span>
              <input name="clientName" required className={fieldClassName} />
            </label>

            <label className="block">
              <span className="font-medium text-slate-200">Phone number</span>
              <input
                name="clientPhone"
                type="tel"
                required
                placeholder="07XXXXXXXX"
                autoComplete="tel"
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-200">Service county</span>
              <input
                name="county"
                required
                defaultValue={provider.county}
                className={fieldClassName}
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-200">Preferred date</span>
              <input
                name="scheduledDate"
                required
                type="datetime-local"
                className={fieldClassName}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-medium text-slate-200">Job details</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="Add access details or anything the provider should know."
              className={fieldClassName}
            />
          </label>

          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Confirmed price</span>
              <span className="text-lg font-bold text-emerald-300">
                KES {selectedService.priceKes.toLocaleString("en-KE")}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              This price is set by the provider and cannot be changed at checkout.
            </p>

            <label className="mt-4 block border-t border-slate-700 pt-4">
              <span className="font-medium text-slate-200">
                M-Pesa phone number
              </span>
              <input
                name="mpesaPhoneNumber"
                type="tel"
                required
                placeholder="07XXXXXXXX or +254XXXXXXXXX"
                autoComplete="tel"
                className={fieldClassName}
              />
            </label>
          </div>

          <button
            disabled={bookingLoading}
            className="min-h-[48px] w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-600"
          >
            {bookingLoading ? "Creating booking..." : "Confirm booking request"}
          </button>

          {bookingError && (
            <p role="alert" className="text-sm font-medium text-red-300">
              {bookingError}
            </p>
          )}
        </form>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="text-sm font-semibold text-emerald-300">
              Booking request created
            </p>
            <p className="mt-2 text-slate-200">{bookedService.name}</p>
            <p className="mt-1 text-xl font-bold text-white">
              KES {bookedService.priceKes.toLocaleString("en-KE")}
            </p>
          </div>

          <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="font-medium text-slate-200">
                M-Pesa phone number
              </span>
              <input
                name="phoneNumber"
                type="tel"
                required
                defaultValue={paymentPhone}
                className={fieldClassName}
              />
            </label>

            <button
              disabled={paymentLoading || paymentSuccess}
              className="min-h-[48px] w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-600"
            >
              {paymentLoading
                ? "Sending M-Pesa prompt..."
                : paymentSuccess
                  ? "M-Pesa prompt sent"
                  : `Pay KES ${bookedService.priceKes.toLocaleString("en-KE")} with M-Pesa`}
            </button>

            {paymentSuccess && (
              <p
                role="status"
                className="text-sm font-medium text-emerald-300"
              >
                Check your phone and enter your M-Pesa PIN to complete payment.
              </p>
            )}
            {paymentError && (
              <p role="alert" className="text-sm font-medium text-red-300">
                {paymentError}
              </p>
            )}
          </form>

          {!paymentSuccess && (
            <button
              type="button"
              onClick={() => {
                setBookingId(null);
                setBookedService(null);
                paymentReset();
              }}
              className="mt-4 min-h-[44px] w-full rounded-md border border-slate-600 px-5 py-2 font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              Back to booking details
            </button>
          )}
        </div>
      )}
    </div>
  );
}
