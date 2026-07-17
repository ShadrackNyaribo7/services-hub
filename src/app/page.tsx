import "./globals.css"
import LottieAnimation from "@/app/component/lottie";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-slate-50">
      <LottieAnimation src="/rocket.json" top="0" left="0" width="400px" zIndex={0} />
      <section className="mx-auto flex max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          The ultimate service hub
        </p>

        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">
          Book verified service provider.
        </h1>

        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          The centre for you to connect with validated service providers.
        </p>

        <div className="loading mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="/providers/apply"
            className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-center font-semibold text-white"
          >
            Apply as Provider
          </a>

          <a
            href="/services"
            className="min-h-[44px] rounded-md border border-slate-600 px-5 py-3 text-center font-semibold text-slate-200"
          >
            Find Services
          </a>
        </div>
      </section>
    </main>
  );
}