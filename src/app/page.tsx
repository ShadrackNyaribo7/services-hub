/*import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};*/



export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          The ultimate service hub
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Book verified service provider.
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          The centre for you to connect with validated service providers.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/providers/apply"
            className="rounded-md bg-emerald-700 px-5 py-3 text-center font-semibold text-white"
          >
            Apply as Provider
          </a>

          <a
            href="/services"
            className="rounded-md border border-slate-300 px-5 py-3 text-center font-semibold"
          >
            Find Services
          </a>
        </div>
      </section>
    </main>
  );
}