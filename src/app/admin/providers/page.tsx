import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminIdentity } from "@/lib/auth/adminAccess";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const admin = await getAdminIdentity();
  if (!admin) redirect("/");
  return admin;
}

async function moderateProvider(formData: FormData) {
  "use server";
  const { email: adminEmail } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || (status !== "REJECTED" && status !== "SUSPENDED")) return;

  await prisma.providerProfile.update({
    where: { id },
    data: {
      verificationStatus: status,
      adminNotes:
        status === "SUSPENDED"
          ? `Provider suspended by ${adminEmail} after post-approval review.`
          : `Provider rejected by ${adminEmail} after post-submission review.`,
    },
  });

  revalidatePath("/admin/providers");
}

export default async function AdminProvidersPage() {
  await requireAdmin();
  const providers = await prisma.providerProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="relative z-10 mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Provider Oversight</h1>
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Production onboarding is automatic when every offline rule and
          evidence seal passes. This page is not an approval gate. Offline
          checks do not authenticate documents against their issuers.
        </div>

        <div className="mt-8 space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border bg-white p-5">
              <h2 className="text-xl font-semibold">{provider.user.name}</h2>
              <p>Phone: {provider.user.phone}</p>
              <p>County: {provider.county}</p>
              <p>Category: {provider.serviceCategory}</p>
              <p>Status: {provider.verificationStatus}</p>
              <p>
                Mobile verification:{" "}
                {provider.phoneVerifiedAt
                  ? `Verified via ${provider.phoneVerificationSource ?? "trusted provider"} on ${provider.phoneVerifiedAt.toLocaleString()}`
                  : "Optional verification not completed"}
              </p>
              <p>ID: {provider.idNumber ?? "Missing"}</p>
              <p>
                Police clearance number:{" "}
                {provider.policeClearanceNumber ?? "Missing"}
              </p>
              <p>
                Identity evidence:{" "}
                {provider.identityVerificationLevel ?? "Unvalidated"}
              </p>
              {provider.identityVerificationReference && (
                <p className="break-all text-xs text-slate-600">
                  Identity seal: {provider.identityVerificationReference}
                </p>
              )}
              <p>
                Police evidence:{" "}
                {provider.policeVerificationLevel ?? "Unvalidated"}
              </p>
              {provider.policeVerificationReference && (
                <p className="break-all text-xs text-slate-600">
                  Police seal: {provider.policeVerificationReference}
                </p>
              )}
              <p>
                Professional certificate:{" "}
                {provider.certificationNumber ? "Provided" : "Missing"}
              </p>
              {provider.certificationNumber && (
                <>
                  <p>Credential number: {provider.certificationNumber}</p>
                  <p>
                    Issuer claim: {provider.certificationIssuer ?? "Missing"}
                  </p>
                  <p>
                    Qualification: {provider.certificationName ?? "Missing"}
                  </p>
                  <p>
                    Credential evidence:{" "}
                    {provider.credentialVerificationLevel ?? "Unvalidated"}
                  </p>
                  {provider.credentialManualReference && (
                    <p className="break-all text-xs text-slate-600">
                      Credential seal: {provider.credentialManualReference}
                    </p>
                  )}
                </>
              )}
              {provider.adminNotes && (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                  {provider.adminNotes}
                </pre>
              )}

              <form action={moderateProvider} className="mt-4">
                <input type="hidden" name="id" value={provider.id} />
                <input
                  type="hidden"
                  name="status"
                  value={
                    provider.verificationStatus === "APPROVED"
                      ? "SUSPENDED"
                      : "REJECTED"
                  }
                />
                <button className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white">
                  {provider.verificationStatus === "APPROVED"
                    ? "Suspend provider"
                    : "Reject submission"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
