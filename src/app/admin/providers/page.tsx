import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";


async function requireAdmin() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !adminEmails.includes(email)) {
    redirect("/");
  }
}

async function updateProviderStatus(formData: FormData) {
  "use server";
await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  if (status !== "APPROVED" && status !== "REJECTED") {
    return;
  }

  await prisma.providerProfile.update({
    where: { id },
    data: { verificationStatus: status },
  });

  revalidatePath("/admin/providers");
}

export default async function AdminProvidersPage() {
  await requireAdmin();
  const providers = await prisma.providerProfile.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="relative z-10 mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Provider Applications</h1>

        <div className="mt-8 space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border bg-white p-5">
              <h2 className="text-xl font-semibold">{provider.user.name}</h2>
              <p>Phone: {provider.user.phone}</p>
              <p>County: {provider.county}</p>
              <p>Category: {provider.serviceCategory}</p>
              <p>Status: {provider.verificationStatus}</p>

              <div className="mt-4 flex gap-3">
                <form action={updateProviderStatus}>
                  <input type="hidden" name="id" value={provider.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <button className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white">
                    Approve
                  </button>
                </form>

                <form action={updateProviderStatus}>
                  <input type="hidden" name="id" value={provider.id} />
                  <input type="hidden" name="status" value="REJECTED" />
                  <button className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
