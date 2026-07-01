"use client";

import { FormEvent } from "react";
import LottieAnimation from "@/app/component/lottie";
import { useProviderApplication } from "@/hooks/useProviderApplication";

export default function ProviderApplyPage() {
  const { submitApplication, isLoading, error, success, reset } = useProviderApplication();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const application = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string,
      county: formData.get("county") as string,
      serviceCategory: formData.get("serviceCategory") as string,
      policeClearanceNumber: formData.get("policeClearanceNumber") as string,
      IDnumber: formData.get("ID number") as string,
      Credentialvalidator: formData.get("Credential validator") as string,
    };

    const result = await submitApplication(application);

    if (result) {
      event.currentTarget.reset();
      // Success message will be handled by the success state
    }
  }

  return (
    <main className="min-h-screen bg-black = 900 px-6 py-10 text-slate-950">
       <LottieAnimation src="/services.lottie" top="0" left="0" width="100%" height="100vh" zIndex={1} animate={false} opacity="0.3" scale="1.5" />
      <section className="mx-auto max-w-5xl"></section>
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-emerald-400">Provider Application</h1>
        <p className="mt-2 font-bold text-emerald-400">
          Submit your details for review before offering services.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-md border bg-white = 900 p-6">
          <label className="block">
            <span className="font-medium text-emerald-400">Full name</span>
            <input name="fullName" required className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Phone number</span>
            <input name="phone" required placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">County</span>
            <input name="county" required placeholder="Nairobi, Mombasa, Kisumu..." className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Service</span>
            <select name="serviceCategory" required className="mt-2 w-full rounded-md border px-3 py-2 bg-grey = 900  text-black-400">
              <option value="Cleaning">Cleaning</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumber">Plumber</option>
              <option value="Mechanic">Mechanic</option>
            </select>
          </label>

           <label className="block">
            <span className="font-medium text-emerald-400">ID number</span>
            <input name="ID number" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Police Clearance Certificate number</span>
            <input name="policeClearanceNumber" className="mt-2 w-full rounded-md border px-3 py-2" />
          </label>

          <button disabled={isLoading} className="w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
            {isLoading ? "Submitting..." : "Submit Application"}
          </button>

          {success && (
            <p className="text-sm font-medium text-emerald-700">
              Application submitted successfully. Await admin review.
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