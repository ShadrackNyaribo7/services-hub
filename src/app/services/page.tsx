import { prisma } from "@/lib/prisma";
import Link from "next/link";
import LottieAnimation from "../component/lottie";
import Image from "next/image";

export const dynamic = "force-dynamic";

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
  
    <main className="min-h-screen bg-grey px-4 py-10 text-slate-950 sm:px-6">
      <LottieAnimation src="/services.lottie" top="0" left="0" width="100%" height="100vh" zIndex={1} opacity="0.3" scale="1.5" />
      <section className="mx-auto flex max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
              <h1 className="text-2xl font-bold text-emerald-400 sm:text-3xl">Find Verified Providers</h1>

        <div className="mt-6 mb-8 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-base font-semibold text-emerald-800 sm:text-lg">Professional Fitness Trainers</h2>
          <p className="mt-1 text-sm text-emerald-700 sm:text-base">
            Book certified fitness trainers through our Unified Fitness Platform 
          </p>
          <Link
            href="/services/ufp"
            className="mt-3 inline-block min-h-[44px] rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            Browse UFP Trainers
          </Link>
        </div>

        

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border p-4 sm:p-5">
              <h2 className="text-lg font-semibold sm:text-xl">{provider.user.name}</h2>
              <p className="text-sm sm:text-base">{provider.serviceCategory}</p>
              <p className="text-sm sm:text-base">{provider.county}</p>

              <Link
              href={`/services/${provider.id}`}
             className="mt-4 inline-block min-h-[44px] rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white">
  View Provider
</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
