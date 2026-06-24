import { prisma } from "@/lib/prisma";
import Link from "next/link";
import LottieAnimation from "../component/lottie";

export default async function ServicesPage() {
  const providers = await prisma.providerProfile.findMany({
    where: {
      verificationStatus: "APPROVED",
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });


  return (
  
    <main className="min-h-screen bg-grey px-6 py-10 text-slate-950">
      <LottieAnimation src="/services.lottie" top="0" left="0" width="100%" height="100vh" zIndex={1} animate={false} opacity="0.3" scale="1.5" />
      <section className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold  text-emerald-400">Find Verified Providers</h1>

        <div className="mt-6 mb-8 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-lg font-semibold text-emerald-800">Professional Fitness Trainers</h2>
          <p className="mt-1 text-emerald-700">
            Book certified fitness trainers through our Unified Fitness Platform integration
          </p>
          <Link
            href="/services/ufp"
            className="mt-3 inline-block rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            Browse UFP Trainers
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-slate-800">Local Service Providers</h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border p-5">
              <h2 className="text-xl font-semibold">{provider.user.name}</h2>
              <p>{provider.serviceCategory}</p>
              <p>{provider.county}</p>

              <Link
              href={`/services/${provider.id}`}
             className="mt-4 inline-block rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white">
  View Provider
</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}