import "./globals.css"
import LottieAnimation from "./component/lottie";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-slate-50">
      <LottieAnimation src="/rocket.json" top="0" left="0" width="400px" zIndex={0} />
      <LottieAnimation src="/services.lottie" top="0" left="0" width="100%" height="100vh" zIndex={1} animate={false} opacity="0.3" scale="1.5" />
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          The ultimate service hub
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Book verified service provider.
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          The centre for you to connect with validated service providers.
        </p>

        <div className="loading flex gap-4">
          <a
            href="/providers/apply"
            className="rounded-md bg-emerald-600 px-5 py-3 text-center font-semibold text-white"
          >
            Apply as Provider
          </a>

          <a
            href="/services"
            className="rounded-md border border-slate-600 px-5 py-3 text-center font-semibold text-slate-200"
          >
            Find Services
          </a>
        </div>
      </section>
    </main>
  );
}