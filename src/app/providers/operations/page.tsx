import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProviderOperationsPanel from "@/components/ProviderOperationsPanel";
import { getAuthenticatedAppUserId } from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Provider Operations",
  description: "Manage active PATANAFUU bookings and location safety.",
  robots: { index: false, follow: false },
};

export default async function ProviderOperationsPage() {
  const userId = await getAuthenticatedAppUserId();
  if (!userId) redirect("/provider-signin");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { verificationStatus: true, servicesConfirmedAt: true },
  });
  if (!provider || provider.verificationStatus !== "APPROVED") {
    redirect("/providers/apply");
  }
  if (!provider.servicesConfirmedAt) redirect("/providers/profile");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <section className="relative z-10 mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-emerald-400">
          Provider Operations
        </h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Precise location is required throughout every active job. Keep this
          secure page open until you mark the work complete.
        </p>
        <ProviderOperationsPanel />
      </section>
    </main>
  );
}
