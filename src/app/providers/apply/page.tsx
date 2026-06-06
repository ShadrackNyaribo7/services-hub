"use client";

import { FormEvent, useState } from "react";



export default function ProviderApplyPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/provider-applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        phone: formData.get("phone"),
        county: formData.get("county"),
        serviceCategory: formData.get("serviceCategory"),
        policeClearanceNumber: formData.get("policeClearanceNumber"),
        IDnumber: formData.get("ID number"),
        Credentialvalidator: formData.get("Credential validator")
      }),
    });

    if (response.ok) {
      event.currentTarget.reset();
      setMessage("Application submitted successfully. Await admin review.");
    } else {
      setMessage("Something went wrong. Check the details and try again.");
    }

    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Provider Application</h1>
        <p className="mt-2 text-slate-600">
          Submit your details for review before offering services.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-md border bg-white p-6">
          <label className="block">
            <span className="font-medium">Full name</span>
            <input name="fullName" required className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Phone number</span>
            <input name="phone" required placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">County</span>
            <input name="county" required placeholder="Nairobi, Mombasa, Kisumu..." className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Service</span>
            <select name="serviceCategory" required className="mt-2 w-full rounded-md border px-3 py-2">
              <option value="Cleaning">Cleaning</option>
              <option value="Personal trainer">Personal trainer</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumber">Plumber</option>
              <option value="Mechanic">Mechanic</option>
            </select>
          </label>

           <label className="block">
            <span className="font-medium">ID number</span>
            <input name="ID number" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium">Police Clearance Certificate number</span>
            <input name="policeClearanceNumber" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

           <label className="block">
            <span className="font-medium">Credential validator</span>
            <input name="Credentail validator" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <button disabled={isSubmitting} className="w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>

          {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
        </form>
      </section>
    </main>
  );
}