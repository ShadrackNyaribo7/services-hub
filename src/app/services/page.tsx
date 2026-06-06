import { prisma } from "@/lib/prisma";

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
    <main className="min-h-screen bg-white px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Find Verified Providers</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border p-5">
              <h2 className="text-xl font-semibold">{provider.user.name}</h2>
              <p>{provider.serviceCategory}</p>
              <p>{provider.county}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}