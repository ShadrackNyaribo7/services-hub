import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCredentialEvidenceSummary,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const DIGITAL_ID_URL = "https://did.ecitizen.go.ke/";
const DCI_CLEARANCE_VERIFICATION_URL = "https://dci.ecitizen.go.ke/verify";

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

  return { email };
}

async function updateProviderStatus(formData: FormData) {
  "use server";
  const { email: adminEmail } = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const officialVerificationReference = String(
    formData.get("officialVerificationReference") ?? "",
  ).trim();
  const officialVerificationConfirmed =
    String(formData.get("officialVerificationConfirmed") ?? "") === "yes";
  const identityVerificationConfirmed =
    String(formData.get("identityVerificationConfirmed") ?? "") === "yes";
  const policeVerificationConfirmed =
    String(formData.get("policeVerificationConfirmed") ?? "") === "yes";

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

    if (!provider.verificationConsentAt) {
      await prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: "PENDING",
          adminNotes:
            "Approval blocked: the applicant must resubmit and consent to official record verification.",
        },
      });

      revalidatePath("/admin/providers");
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
    const hasStoredIdentityEvidence =
      provider.identityVerificationLevel === "AUTHORITATIVE_MANUAL" &&
      provider.identityVerificationMethod === "ECITIZEN_DIGITAL_ID_QR" &&
      Boolean(provider.identityVerifiedAt);
    const hasStoredPoliceEvidence =
      provider.policeVerificationLevel === "AUTHORITATIVE_MANUAL" &&
      provider.policeVerificationMethod === "DCI_ECITIZEN_PUBLIC_CHECKER" &&
      Boolean(provider.policeVerifiedAt);
    const hasCredential = Boolean(provider.certificationNumber);
    const hasStoredAuthoritativeEvidence =
      (provider.credentialVerificationLevel === "AUTHORITATIVE" ||
        provider.credentialVerificationLevel === "AUTHORITATIVE_MANUAL") &&
      Boolean(provider.credentialVerifiedAt);
    const needsOfficialManualEvidence =
      hasCredential &&
      !credentialEvidence.authoritative &&
      !hasStoredAuthoritativeEvidence;

    if (!hasStoredIdentityEvidence && !identityVerificationConfirmed) {
      await prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: "PENDING",
          adminNotes:
            `Approval blocked: confirm the applicant's National ID using the official eCitizen Digital ID QR.\n${qualificationCheck.adminNotes}`,
        },
      });

      revalidatePath("/admin/providers");
      return;
    }

    if (!hasStoredPoliceEvidence && !policeVerificationConfirmed) {
      await prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: "PENDING",
          adminNotes:
            `Approval blocked: confirm the Police Clearance Certificate using the official DCI eCitizen checker.\n${qualificationCheck.adminNotes}`,
        },
      });

      revalidatePath("/admin/providers");
      return;
    }

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
    const resolvedIdentityEvidence = hasStoredIdentityEvidence
      ? {}
      : {
          identityVerificationLevel: "AUTHORITATIVE_MANUAL",
          identityVerificationMethod: "ECITIZEN_DIGITAL_ID_QR",
          identityVerificationSource: DIGITAL_ID_URL,
          identityVerifiedAt: new Date(),
          identityVerifiedBy: adminEmail,
        };
    const resolvedPoliceEvidence = hasStoredPoliceEvidence
      ? {}
      : {
          policeVerificationLevel: "AUTHORITATIVE_MANUAL",
          policeVerificationMethod: "DCI_ECITIZEN_PUBLIC_CHECKER",
          policeVerificationSource: DCI_CLEARANCE_VERIFICATION_URL,
          policeVerifiedAt: new Date(),
          policeVerifiedBy: adminEmail,
        };

    await prisma.providerProfile.update({
      where: { id },
      data: {
        verificationStatus: "APPROVED",
        adminNotes:
          `Official identity and police-clearance checks confirmed by ${adminEmail}.\n${qualificationCheck.adminNotes}`,
        ...resolvedIdentityEvidence,
        ...resolvedPoliceEvidence,
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
              <p>ID: {provider.idNumber ?? "Missing"}</p>
              <p>
                Police clearance application:{" "}
                {provider.policeClearanceNumber ?? "Missing"}
              </p>
              <p>
                Identity evidence:{" "}
                {provider.identityVerificationLevel ?? "Unverified"}
              </p>
              <p>
                Police clearance evidence:{" "}
                {provider.policeVerificationLevel ?? "Unverified"}
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
                  {(!provider.identityVerifiedAt ||
                    provider.identityVerificationLevel !==
                      "AUTHORITATIVE_MANUAL" ||
                    provider.identityVerificationMethod !==
                      "ECITIZEN_DIGITAL_ID_QR") && (
                    <div className="mb-3 max-w-md space-y-2">
                      <a
                        href={DIGITAL_ID_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block font-semibold text-emerald-800 underline"
                      >
                        Open official eCitizen Digital ID
                      </a>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="identityVerificationConfirmed"
                          value="yes"
                          required
                          className="mt-1 size-4"
                        />
                        I scanned the applicant&apos;s eCitizen Digital ID QR and
                        matched the full name and National ID.
                      </label>
                    </div>
                  )}
                  {(!provider.policeVerifiedAt ||
                    provider.policeVerificationLevel !==
                      "AUTHORITATIVE_MANUAL" ||
                    provider.policeVerificationMethod !==
                      "DCI_ECITIZEN_PUBLIC_CHECKER") && (
                    <div className="mb-3 max-w-md space-y-2">
                      <a
                        href={DCI_CLEARANCE_VERIFICATION_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block font-semibold text-emerald-800 underline"
                      >
                        Open official DCI certificate checker
                      </a>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="policeVerificationConfirmed"
                          value="yes"
                          required
                          className="mt-1 size-4"
                        />
                        I verified this application number in the DCI checker and
                        matched the certificate holder.
                      </label>
                    </div>
                  )}
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
