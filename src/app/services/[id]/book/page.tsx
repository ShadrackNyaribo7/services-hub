import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookProviderForm from "@/components/BookProviderForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book Provider",
  description: "Choose a confirmed provider service and book securely.",
  robots: { index: false, follow: false },
};

export default async function BookProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      county: true,
      serviceCategory: true,
      verificationStatus: true,
      servicesConfirmedAt: true,
      user: { select: { name: true } },
      services: {
        orderBy: [{ priceKes: "asc" }, { name: "asc" }],
        select: { id: true, name: true, priceKes: true },
      },
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
      <section className="relative z-10 mx-auto max-w-3xl">
        <Link
          href={`/services/${provider.id}`}
          className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          ← Back to provider profile
        </Link>
        <BookProviderForm
          provider={{
            id: provider.id,
            name: provider.user.name,
            county: provider.county,
            serviceCategory: provider.serviceCategory,
            services: provider.services,
          }}
        />
      </section>
    </main>
  );
}
