import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      services: { orderBy: [{ priceKes: "asc" }, { name: "asc" }] },
    },
  });

  if (
    !provider ||
    provider.verificationStatus !== "APPROVED" ||
    !provider.servicesConfirmedAt ||
    provider.services.length === 0
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <section className="relative z-10 mx-auto max-w-4xl">
        <Link
          href="/services"
          className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          ← Back to providers
        </Link>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 p-5 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Approved provider
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {provider.user.name}
            </h1>
            <p className="mt-2 text-base text-slate-300 sm:text-lg">
              {provider.serviceCategory} · {provider.county}
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Services and prices
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Prices confirmed by the provider in Kenyan shillings.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Confirmed
              </span>
            </div>

            <ul className="mt-5 divide-y divide-slate-700 rounded-lg border border-slate-700 bg-slate-950/70">
              {provider.services.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <span className="font-medium text-slate-100">
                    {service.name}
                  </span>
                  <span className="shrink-0 font-bold text-emerald-300">
                    KES {service.priceKes.toLocaleString("en-KE")}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href={`/services/${provider.id}/book`}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 sm:w-auto"
            >
              Choose a service and book
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
