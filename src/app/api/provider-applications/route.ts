import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  getCredentialEvidenceSummary,
  getOfflineRecordEvidenceSummary,
  hasOfflineValidationConfigurationFailure,
  normalizeSupportedServiceCategory,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

function normalizeKenyanPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0[17]\d{8}$/.test(compact)) return `+254${compact.slice(1)}`;
  if (/^254[17]\d{8}$/.test(compact)) return `+${compact}`;
  return compact;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to apply." },
      { status: 401 },
    );
  }

  try {
    const body = await readBoundedJsonObject(request);
    const fullName = readTextInput(body, "fullName", 120);
    const phone = normalizeKenyanPhone(readTextInput(body, "phone", 24));
    const county = readTextInput(body, "county", 80);
    const rawServiceCategory = readTextInput(body, "serviceCategory", 40);
    const serviceCategory =
      normalizeSupportedServiceCategory(rawServiceCategory);
    const submittedIdNumber =
      readTextInput(body, "IDnumber", 16) ||
      readTextInput(body, "idNumber", 16);
    const idNumberConfirmation = readTextInput(
      body,
      "idNumberConfirmation",
      16,
    );
    const identityDocumentName = readTextInput(
      body,
      "identityDocumentName",
      120,
    );
    const submittedPoliceClearanceNumber = readTextInput(
      body,
      "policeClearanceNumber",
      64,
    );
    const policeClearanceNumberConfirmation = readTextInput(
      body,
      "policeClearanceNumberConfirmation",
      64,
    );
    const policeClearanceName = readTextInput(body, "policeClearanceName", 120);
    const submittedCertificationNumber = readTextInput(
      body,
      "certificationNumber",
      64,
    );
    const certificationNumberConfirmation = readTextInput(
      body,
      "certificationNumberConfirmation",
      64,
    );
    const certificationHolderName = readTextInput(
      body,
      "certificationHolderName",
      120,
    );
    const submittedCertificationIssuer = readTextInput(
      body,
      "certificationIssuer",
      160,
    );
    const submittedCertificationName = readTextInput(
      body,
      "certificationName",
      160,
    );

    if (!fullName || !phone || !county || !serviceCategory) {
      return NextResponse.json(
        {
          error:
            "Valid name, phone, county, and service category are required.",
        },
        { status: 400 },
      );
    }

    if (!/^\+254[17]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan mobile number." },
        { status: 422 },
      );
    }

    if (body.verificationConsent !== true) {
      return NextResponse.json(
        {
          error:
            "Attestation is required for offline identity, police-clearance, and credential evidence review.",
        },
        { status: 400 },
      );
    }

    const qualificationCheck = await runProviderQualificationCheck({
      fullName,
      serviceCategory,
      idNumber: submittedIdNumber,
      idNumberConfirmation,
      identityDocumentName,
      policeClearanceNumber: submittedPoliceClearanceNumber,
      policeClearanceNumberConfirmation,
      policeClearanceName,
      certificationNumber: submittedCertificationNumber,
      certificationNumberConfirmation,
      certificationHolderName,
      certificationIssuer: submittedCertificationIssuer,
      certificationName: submittedCertificationName,
    });

    if (!qualificationCheck.accepted) {
      return NextResponse.json(
        {
          error: qualificationCheck.blockingErrors.join(" "),
          qualificationErrors: qualificationCheck.blockingErrors,
          qualificationCheck,
        },
        {
          status: hasOfflineValidationConfigurationFailure(qualificationCheck)
            ? 503
            : 422,
        },
      );
    }

    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      return NextResponse.json(
        { error: "That phone number is already used by another account." },
        { status: 409 },
      );
    }

    const duplicateDocument = await prisma.providerProfile.findFirst({
      where: {
        userId: { not: userId },
        OR: [
          { idNumber: submittedIdNumber },
          { policeClearanceNumber: submittedPoliceClearanceNumber },
          ...(submittedCertificationNumber
            ? [{ certificationNumber: submittedCertificationNumber }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (duplicateDocument) {
      return NextResponse.json(
        {
          error:
            "One or more submitted document identifiers are already associated with another provider application.",
        },
        { status: 409 },
      );
    }

    const credentialEvidence = getCredentialEvidenceSummary(qualificationCheck);
    const offlineEvidence = getOfflineRecordEvidenceSummary(qualificationCheck);

    if (
      !offlineEvidence.identity.sealed ||
      !offlineEvidence.policeClearance.sealed ||
      (submittedCertificationNumber && !credentialEvidence.offlineValidated)
    ) {
      return NextResponse.json(
        { error: "Complete sealed offline evidence is required." },
        { status: 503 },
      );
    }

    const providerProfileData = {
      county,
      serviceCategory,
      policeClearanceNumber: submittedPoliceClearanceNumber,
      idNumber: submittedIdNumber,
      certificationNumber: submittedCertificationNumber || null,
      certificationIssuer: submittedCertificationIssuer || null,
      certificationName: submittedCertificationName || null,
      credentialVerificationLevel: credentialEvidence.level,
      credentialVerificationMethod: credentialEvidence.method,
      credentialVerificationSource: credentialEvidence.source,
      credentialVerifiedAt: null,
      credentialManualReference: credentialEvidence.reference,
      verificationConsentAt: new Date(),
      identityVerificationLevel: offlineEvidence.identity.level,
      identityVerificationMethod: offlineEvidence.identity.method,
      identityVerificationSource: offlineEvidence.identity.source,
      identityVerificationReference: offlineEvidence.identity.reference,
      identityVerifiedAt: offlineEvidence.identity.checkedAt,
      identityVerifiedBy: "OFFLINE_VALIDATION_SYSTEM",
      policeVerificationLevel: offlineEvidence.policeClearance.level,
      policeVerificationMethod: offlineEvidence.policeClearance.method,
      policeVerificationSource: offlineEvidence.policeClearance.source,
      policeVerificationReference: offlineEvidence.policeClearance.reference,
      policeVerifiedAt: offlineEvidence.policeClearance.checkedAt,
      policeVerifiedBy: "OFFLINE_VALIDATION_SYSTEM",
      verificationStatus: qualificationCheck.recommendedStatus,
      adminNotes: qualificationCheck.adminNotes,
    };

    const application = await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: fullName,
        phone,
        role: "PROVIDER",
        providerProfile: {
          upsert: {
            update: providerProfileData,
            create: providerProfileData,
          },
        },
      },
      create: {
        id: userId,
        name: fullName,
        phone,
        role: "PROVIDER",
        providerProfile: { create: providerProfileData },
      },
      include: { providerProfile: true },
    });

    return NextResponse.json(
      {
        application,
        qualificationCheck,
        message:
          "Application evidence passed every offline consistency and tamper-evidence rule and was approved automatically. No live government or regulator database lookup was performed.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Provider application error:", error);
    return NextResponse.json(
      { error: "Could not submit application." },
      { status: 500 },
    );
  }
}
