import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProviderServicesForm from "@/components/ProviderServicesForm";
import { getAuthenticatedAppUserId } from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Provider Profile",
  description:
    "Review your PATANAFUU provider profile and verification status.",
  robots: { index: false, follow: false },
};

const STATUS_STYLES = {
  APPROVED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  PENDING: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  REJECTED: "border-red-400/40 bg-red-400/10 text-red-200",
  SUSPENDED: "border-red-400/40 bg-red-400/10 text-red-200",
} as const;

function displayEvidence(value: string | null) {
  if (!value) return "Not recorded";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPhone(phone: string) {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}

export default async function ProviderProfilePage() {
  const userId = await getAuthenticatedAppUserId();
  if (!userId) redirect("/provider-signin");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      county: true,
      serviceCategory: true,
      certificationIssuer: true,
      certificationName: true,
      credentialVerificationLevel: true,
      identityVerificationLevel: true,
      policeVerificationLevel: true,
      phoneVerifiedAt: true,
      verificationStatus: true,
      averageRating: true,
      totalRatings: true,
      rankingTier: true,
      servicesConfirmedAt: true,
      createdAt: true,
      services: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          priceKes: true,
        },
      },
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });

  if (!provider) redirect("/providers/apply");

  const statusStyle = STATUS_STYLES[provider.verificationStatus];
  const servicesAreConfirmed = Boolean(
    provider.servicesConfirmedAt && provider.services.length > 0,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Provider profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                {provider.user.name}
              </h1>
              <p className="mt-2 text-lg text-slate-300">
                {provider.serviceCategory} · {provider.county}
              </p>
            </div>
            <span
              className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusStyle}`}
            >
              {displayEvidence(provider.verificationStatus)}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
              <h2 className="font-semibold text-emerald-300">
                Profile details
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Mobile number</dt>
                  <dd className="mt-1 text-slate-100">
                    {formatPhone(provider.user.phone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Member since</dt>
                  <dd className="mt-1 text-slate-100">
                    {provider.createdAt.toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
              <h2 className="font-semibold text-emerald-300">
                Trust and verification
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Mobile ownership</dt>
                  <dd className="mt-1 text-slate-100">
                    {provider.phoneVerifiedAt ? "Verified" : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Identity evidence</dt>
                  <dd className="mt-1 text-slate-100">
                    {displayEvidence(provider.identityVerificationLevel)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Police clearance</dt>
                  <dd className="mt-1 text-slate-100">
                    {displayEvidence(provider.policeVerificationLevel)}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-4 sm:col-span-2 lg:col-span-1">
              <h2 className="font-semibold text-emerald-300">Performance</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Rating</dt>
                  <dd className="mt-1 text-slate-100">
                    {provider.totalRatings > 0
                      ? `${(provider.averageRating ?? 0).toFixed(1)} / 5 from ${provider.totalRatings} rating${provider.totalRatings === 1 ? "" : "s"}`
                      : "No ratings yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Ranking tier</dt>
                  <dd className="mt-1 text-slate-100">
                    {displayEvidence(provider.rankingTier)}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          {(provider.certificationName || provider.certificationIssuer) && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-4">
              <h2 className="font-semibold text-emerald-300">
                Service credential
              </h2>
              <p className="mt-3 text-sm text-slate-200">
                {[provider.certificationName, provider.certificationIssuer]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Evidence level:{" "}
                {displayEvidence(provider.credentialVerificationLevel)}
              </p>
            </div>
          )}

          {provider.verificationStatus === "APPROVED" && (
            <ProviderServicesForm
              initialServices={provider.services}
              confirmedAt={provider.servicesConfirmedAt?.toISOString() ?? null}
            />
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {provider.verificationStatus === "APPROVED" &&
              servicesAreConfirmed && (
              <>
                <Link
                  href={`/services/${provider.id}`}
                  className="min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600"
                >
                  View public profile
                </Link>
                <Link
                  href="/providers/operations"
                  className="min-h-[44px] rounded-md border border-slate-600 px-5 py-3 font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
                >
                  Provider operations
                </Link>
              </>
            )}
            {provider.verificationStatus === "APPROVED" &&
              !servicesAreConfirmed && (
                <p className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  Confirm at least one specific service and price above to
                  publish your profile and open provider operations.
                </p>
              )}
            {provider.verificationStatus !== "APPROVED" && (
              <Link
                href="/providers/apply"
                className="min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600"
              >
                Review application
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
