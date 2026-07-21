import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCredentialEvidenceSummary,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";
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
  const officialVerificationReference = String(
    formData.get("officialVerificationReference") ?? "",
  ).trim();
  const officialVerificationConfirmed =
    String(formData.get("officialVerificationConfirmed") ?? "") === "yes";

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
      certificationIssuer: provider.certificationIssuer,
      certificationName: provider.certificationName,
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

    const credentialEvidence = getCredentialEvidenceSummary(qualificationCheck);
    const hasCredential = Boolean(provider.certificationNumber);
    const hasStoredAuthoritativeEvidence =
      (provider.credentialVerificationLevel === "AUTHORITATIVE" ||
        provider.credentialVerificationLevel === "AUTHORITATIVE_MANUAL") &&
      Boolean(provider.credentialVerifiedAt);
    const needsOfficialManualEvidence =
      hasCredential &&
      !credentialEvidence.authoritative &&
      !hasStoredAuthoritativeEvidence;

    if (
      needsOfficialManualEvidence &&
      (!officialVerificationConfirmed || officialVerificationReference.length < 8)
    ) {
      await prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: "PENDING",
          adminNotes:
            `Approval blocked: confirm the credential with an official source and record its reference.\n${qualificationCheck.adminNotes}`,
        },
      });

      revalidatePath("/admin/providers");
      return;
    }

    const resolvedCredentialEvidence = credentialEvidence.authoritative
      ? {
          credentialVerificationLevel: credentialEvidence.level,
          credentialVerificationMethod: credentialEvidence.method,
          credentialVerificationSource: credentialEvidence.source,
          credentialVerifiedAt: credentialEvidence.verifiedAt,
          credentialManualReference: null,
        }
      : needsOfficialManualEvidence
      ? {
          credentialVerificationLevel: "AUTHORITATIVE_MANUAL",
          credentialVerificationMethod: "ISSUER_OR_REGULATOR_CONFIRMATION",
          credentialVerificationSource: officialVerificationReference,
          credentialVerifiedAt: new Date(),
          credentialManualReference: officialVerificationReference,
        }
      : {};

    await prisma.providerProfile.update({
      where: { id },
      data: {
        verificationStatus: "APPROVED",
        adminNotes: `Manual admin approval recorded.\n${qualificationCheck.adminNotes}`,
        ...resolvedCredentialEvidence,
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
              {provider.certificationNumber && (
                <>
                  <p>Credential number: {provider.certificationNumber}</p>
                  <p>Issuer: {provider.certificationIssuer ?? "Missing"}</p>
                  <p>Qualification: {provider.certificationName ?? "Missing"}</p>
                  <p>
                    Credential evidence: {provider.credentialVerificationLevel ?? "Unverified"}
                  </p>
                  {provider.credentialVerificationSource && (
                    <p className="break-all text-sm">
                      Evidence source: {provider.credentialVerificationSource}
                    </p>
                  )}
                </>
              )}
              {provider.adminNotes && (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                  {provider.adminNotes}
                </pre>
              )}

              <div className="mt-4 flex gap-3">
                <form action={updateProviderStatus}>
                  <input type="hidden" name="id" value={provider.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  {provider.certificationNumber &&
                    provider.credentialVerificationLevel !== "AUTHORITATIVE" &&
                    provider.credentialVerificationLevel !== "AUTHORITATIVE_MANUAL" && (
                      <div className="mb-3 max-w-md space-y-2">
                        <label className="block text-sm font-medium">
                          Official verification reference
                          <input
                            name="officialVerificationReference"
                            required
                            minLength={8}
                            className="mt-1 min-h-[44px] w-full rounded-md border px-3 py-2"
                          />
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="officialVerificationConfirmed"
                            value="yes"
                            required
                            className="mt-1 size-4"
                          />
                          I confirmed the credential holder with the regulator or issuing institution.
                        </label>
                      </div>
                    )}
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
