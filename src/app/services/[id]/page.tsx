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
    include: { user: true },
  });

  if (!provider || provider.verificationStatus !== "APPROVED") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <Link href="/services" className="text-sm font-semibold text-emerald-700">
          Back to providers
        </Link>

        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{provider.user.name}</h1>
        <p className="mt-2 text-base text-slate-600 sm:text-lg">{provider.serviceCategory}</p>
        <p className="text-base text-slate-600 sm:text-lg">{provider.county}</p>

        <Link
          href={`/services/${provider.id}/book`}
          className="mt-8 inline-block min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white"
        >
          Book Provider
        </Link>
      </section>
    </main>
  );
}