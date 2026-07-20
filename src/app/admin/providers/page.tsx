import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { runProviderQualificationCheck } from "@/lib/verification/qualificationService";
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

  if (status === "REJECTED") {
    await prisma.providerProfile.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  if (status === "APPROVED") {
    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!provider) {
      return;
    }

    const qualificationCheck = await runProviderQualificationCheck({
      fullName: provider.user.name,
      serviceCategory: provider.serviceCategory,
      idNumber: provider.idNumber,
      policeClearanceNumber: provider.policeClearanceNumber,
      certificationNumber: provider.certificationNumber,
    });

    if (!qualificationCheck.accepted) {
      await prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: "PENDING",
          adminNotes: `Approval blocked:\n${qualificationCheck.adminNotes}`,
        },
      });

      revalidatePath("/admin/providers");
      return;
    }

    await prisma.providerProfile.update({
      where: { id },
      data: {
        verificationStatus: "APPROVED",
        adminNotes: `Manual admin approval recorded.\n${qualificationCheck.adminNotes}`,
      },
    });
  }

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
              <p>ID: {provider.idNumber ? "Provided" : "Missing"}</p>
              <p>
                Police clearance:{" "}
                {provider.policeClearanceNumber ? "Provided" : "Missing"}
              </p>
              <p>
                Professional certificate:{" "}
                {provider.certificationNumber ? "Provided" : "Missing"}
              </p>
              {provider.adminNotes && (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                  {provider.adminNotes}
                </pre>
              )}

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
