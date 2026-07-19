import { prisma } from "@/lib/prisma";
import {
  cleanLocationLabel,
  getCountySearchTerms,
  resolveKenyaCounty,
} from "@/lib/location";
import ServicesLocationFilter from "@/components/ServicesLocationFilter";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ServicesPageProps = {
  searchParams: Promise<{
    county?: string | string[] | undefined;
  }>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildCountyWhere(county: string): Prisma.ProviderProfileWhereInput[] {
  return getCountySearchTerms(county).flatMap((term) => [
    {
      county: {
        equals: term,
        mode: "insensitive" as const,
      },
    },
    {
      county: {
        contains: term,
        mode: "insensitive" as const,
      },
    },
  ]);
}

function getLocationApiEnabled() {
  return Boolean(
    process.env.GOOGLE_GEOCODING_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
}

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const params = await searchParams;
  const requestedCounty = cleanLocationLabel(
    getFirstSearchParam(params.county),
  );
  const selectedCounty = requestedCounty
    ? (resolveKenyaCounty(requestedCounty) ?? requestedCounty)
    : null;
  const where: Prisma.ProviderProfileWhereInput = {
    verificationStatus: "APPROVED",
  };
  const countyWhere = selectedCounty ? buildCountyWhere(selectedCounty) : [];

  if (countyWhere.length > 0) {
    where.OR = countyWhere;
  }

  const providers = await prisma.providerProfile.findMany({
    where,
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const allApprovedProviders = await prisma.providerProfile.findMany({
    where: {
      verificationStatus: "APPROVED",
    },
    select: {
      county: true,
    },
  });

  const availableCounties = Array.from(
    new Set(
      allApprovedProviders
        .map(
          (provider) => resolveKenyaCounty(provider.county) ?? provider.county,
        )
        .map(cleanLocationLabel)
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-slate-50 sm:px-6">
      <section className="relative z-10 mx-auto flex max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-emerald-400 sm:text-3xl">
          Find Verified Providers
        </h1>

        <ServicesLocationFilter
          key={selectedCounty ?? "all-locations"}
          availableCounties={availableCounties}
          locationApiEnabled={getLocationApiEnabled()}
          providerCount={providers.length}
          selectedCounty={selectedCounty}
          totalProviderCount={allApprovedProviders.length}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-md border border-slate-700 bg-slate-950/80 p-4 text-slate-100 sm:p-5"
              >
                <h2 className="text-lg font-semibold sm:text-xl">
                  {provider.user.name}
                </h2>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">
                  {provider.serviceCategory}
                </p>
                <p className="text-sm text-slate-400 sm:text-base">
                  {provider.county}
                </p>

                <Link
                  href={`/services/${provider.id}`}
                  className="mt-4 inline-block min-h-[44px] rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white"
                >
                  View Provider
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-slate-700 bg-slate-950/80 p-5 text-slate-200 sm:col-span-2 lg:col-span-3">
              No approved providers found for this location.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
