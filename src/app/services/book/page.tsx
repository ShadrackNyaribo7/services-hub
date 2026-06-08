"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";

export default function BookProviderPage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerProfileId: params.id,
        clientName: formData.get("clientName"),
        clientPhone: formData.get("clientPhone"),
        county: formData.get("county"),
        scheduledDate: formData.get("scheduledDate"),
        notes: formData.get("notes"),
      }),
    });

    if (response.ok) {
      event.currentTarget.reset();
      setMessage("Booking request submitted. Await confirmation.");
    } else {
      setMessage("Could not submit booking. Please check your details.");
    }

    setIsSubmitting(false);
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

          <button disabled={isSubmitting} className="w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
            {isSubmitting ? "Submitting..." : "Request Booking"}
          </button>

          {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
        </form>
      </section>
    </main>
  );
}