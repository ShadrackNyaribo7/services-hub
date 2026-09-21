import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-slate-50">
      <section className="relative z-10 mx-auto flex max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          The ultimate service hub
        </p>

        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">
          Book an approved service provider.
        </h1>

        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Connect with providers approved through structured evidence
          checks, then book and pay securely.
        </p>

        <div className="loading mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/providers/apply"
            prefetch={false}
            className="min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-800"
          >
            Apply as Provider
          </Link>

          <Link
            href="/services"
            className="min-h-[44px] rounded-md border border-slate-600 px-5 py-3 text-center font-semibold text-slate-200"
          >
            Find Services
          </Link>
        </div>
      </section>
    </main>
  );
}
