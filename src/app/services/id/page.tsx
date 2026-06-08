import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!provider || provider.verificationStatus !== "APPROVED") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-3xl">
        <Link href="/services" className="text-sm font-semibold text-emerald-700">
          Back to providers
        </Link>

        <h1 className="mt-6 text-3xl font-bold">{provider.user.name}</h1>
        <p className="mt-2 text-slate-600">{provider.serviceCategory}</p>
        <p className="text-slate-600">{provider.county}</p>

        <Link
          href={`/services/${provider.id}/book`}
          className="mt-8 inline-block rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white"
        >
          Book Provider
        </Link>
      </section>
    </main>
  );
}