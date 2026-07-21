"use client";

import { FormEvent, useState } from "react";
import { useProviderApplication } from "@/hooks/useProviderApplication";

export default function ProviderApplyPage() {
  const { submitApplication, isLoading, error, success, message } = useProviderApplication();
  const [serviceCategory, setServiceCategory] = useState("Cleaning");
  const credentialRequired = serviceCategory !== "Cleaning";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const application = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string,
      county: formData.get("county") as string,
      serviceCategory: formData.get("serviceCategory") as string,
      policeClearanceNumber: formData.get("policeClearanceNumber") as string,
      idNumber: formData.get("idNumber") as string,
      certificationNumber: formData.get("certificationNumber") as string,
      certificationIssuer: formData.get("certificationIssuer") as string,
      certificationName: formData.get("certificationName") as string,
    };

    const result = await submitApplication(application);

    if (result) {
      event.currentTarget.reset();
      setServiceCategory("Cleaning");
      // Success message will be handled by the success state
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-950 sm:px-6">
      <section className="relative z-10 mx-auto max-w-5xl"></section>
      <section className="relative z-10 mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 sm:text-3xl">Provider Application</h1>
        <p className="mt-2 font-bold text-emerald-400">
          Submit your details for review before offering services.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-md border bg-white p-4 sm:p-6">
          <label className="block">
            <span className="font-medium text-emerald-400">Full name</span>
            <input name="fullName" required className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Phone number</span>
            <input name="phone" required placeholder="07XXXXXXXX" className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">County</span>
            <input name="county" required placeholder="Nairobi, Mombasa, Kisumu..." className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Service</span>
            <select
              name="serviceCategory"
              required
              value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-md border bg-white px-3 py-2 text-slate-950"
            >
              <option value="Cleaning">Cleaning</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumber">Plumber</option>
              <option value="Mechanic">Mechanic</option>
            </select>
          </label>

           <label className="block">
            <span className="font-medium text-emerald-400">ID number</span>
            <input name="idNumber" required inputMode="numeric" className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Police Clearance Certificate number</span>
            <input name="policeClearanceNumber" required className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]" />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Professional certificate/license number</span>
            <input
              name="certificationNumber"
              required={credentialRequired}
              maxLength={64}
              placeholder={serviceCategory === "Electrical" ? "EPRA/EW/12345" : undefined}
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
            <span className="mt-1 block text-sm text-slate-600">
              Electrical providers must use their EPRA electrical-worker licence number.
            </span>
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Issuing institution or regulator</span>
            <input
              name="certificationIssuer"
              required={credentialRequired}
              maxLength={160}
              list="credential-issuers"
              placeholder="EPRA, NITA, KNEC, TVET CDACC..."
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
            <datalist id="credential-issuers">
              <option value="Energy and Petroleum Regulatory Authority" />
              <option value="National Industrial Training Authority" />
              <option value="Kenya National Examinations Council" />
              <option value="TVET Curriculum Development Assessment and Certification Council" />
              <option value="National Construction Authority" />
            </datalist>
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Exact qualification or licence name</span>
            <input
              name="certificationName"
              required={credentialRequired}
              maxLength={160}
              placeholder={serviceCategory === "Electrical" ? "Electrical Worker Licence" : "As printed on the certificate"}
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
          </label>

          <button disabled={isLoading} className="w-full min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400">
            {isLoading ? "Submitting..." : "Submit Application"}
          </button>

          {success && (
            <p className="text-sm font-medium text-emerald-700">
              {message ?? "Application submitted successfully. Await admin review."}
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
