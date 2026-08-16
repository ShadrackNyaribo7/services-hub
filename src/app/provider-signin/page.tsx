"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import MpesaMobileVerification from "@/components/MpesaMobileVerification";

export default function ProviderMobileSignInPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const handleVerified = useCallback(
    (_token: string, redirectTo: string | null) => {
      router.push(redirectTo || "/providers/operations");
      router.refresh();
    },
    [router],
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-950 sm:px-6">
      <section className="mx-auto max-w-md rounded-md border bg-white p-5 sm:p-7">
        <h1 className="text-2xl font-bold text-slate-950">
          Provider mobile sign-in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with the M-Pesa number attached to your provider profile. An
          email address is not required.
        </p>

        <label className="mt-6 block">
          <span className="font-medium text-slate-950">M-Pesa number</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="07XXXXXXXX"
            autoComplete="tel"
            inputMode="tel"
            className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
          />
        </label>

        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <MpesaMobileVerification
            phone={phone}
            purpose="PROVIDER_SIGN_IN"
            onVerified={handleVerified}
          />
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          Applying for the first time?{" "}
          <Link
            href="/providers/apply"
            className="font-semibold text-emerald-700 underline"
          >
            Start a provider application
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-600">
          <Link href="/signin" className="text-slate-700 underline">
            Use regular account sign-in instead
          </Link>
        </p>
      </section>
    </main>
  );
}
