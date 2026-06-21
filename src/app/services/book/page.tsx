"use client";

import { FormEvent } from "react";
import { useParams } from "next/navigation";
import { useBooking } from "@/hooks/useBooking";

export default function BookProviderPage() {
  const params = useParams<{ id: string }>();
  const { createBooking, isLoading, error, success, reset } = useBooking();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const booking = {
      providerProfileId: params.id,
      clientName: formData.get("clientName") as string,
      clientPhone: formData.get("clientPhone") as string,
      county: formData.get("county") as string,
      scheduledDate: formData.get("scheduledDate") as string,
      notes: formData.get("notes") as string,
    };

    const result = await createBooking(booking);

    if (result) {
      event.currentTarget.reset();
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Book Provider</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-md border bg-white p-6">
          <label className="block">
            <span className="font-medium">Your name</span>
            <input name="clientName" required className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Phone number</span>
            <input name="clientPhone" required placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">County</span>
            <input name="county" required className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Preferred date</span>
            <input name="scheduledDate" required type="datetime-local" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Notes</span>
            <textarea name="notes" rows={4} className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <button disabled={isLoading} className="w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
            {isLoading ? "Submitting..." : "Request Booking"}
          </button>

          {success && (
            <p className="text-sm font-medium text-emerald-700">
              Booking request submitted. Await confirmation.
            </p>
          )}
          {error && (
            <p className="text-sm font-medium text-red-700">{error}</p>
          )}
        </form>
      </section>
    </main>
  );
}