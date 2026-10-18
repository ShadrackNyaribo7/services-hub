import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  getCredentialEvidenceSummary,
  getOfflineRecordEvidenceSummary,
  hasOfflineValidationConfigurationFailure,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to validate documents." },
      { status: 401 },
    );
  }

  try {
    const body = await readBoundedJsonObject(request);
    const idNumber = readTextInput(body, "idNumber", 16);
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
    const policeClearanceNumber = readTextInput(
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
    const certificationNumber = readTextInput(body, "certificationNumber", 64);
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
    const certificationIssuer = readTextInput(body, "certificationIssuer", 160);
    const certificationName = readTextInput(body, "certificationName", 160);

    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!providerProfile) {
      return NextResponse.json(
        { error: "Provider profile not found." },
        { status: 404 },
      );
    }

    if (
      body.verificationConsent !== true &&
      !providerProfile.verificationConsentAt
    ) {
      return NextResponse.json(
        {
          error:
            "Attestation is required for offline identity, police-clearance, and credential evidence review.",
        },
        { status: 400 },
      );
    }

    const resolvedCertificationNumber =
      certificationNumber || providerProfile.certificationNumber || "";
    const resolvedCertificationNumberConfirmation =
      certificationNumberConfirmation ||
      (certificationNumber ? "" : providerProfile.certificationNumber) ||
      "";
    const resolvedCertificationHolderName =
      certificationHolderName ||
      (certificationNumber ? "" : providerProfile.user.name);
    const resolvedCertificationIssuer =
      certificationIssuer || providerProfile.certificationIssuer || "";
    const resolvedCertificationName =
      certificationName || providerProfile.certificationName || "";

    const qualificationCheck = await runProviderQualificationCheck({
      fullName: providerProfile.user.name,
      serviceCategory: providerProfile.serviceCategory,
      idNumber,
      identityDocumentName,
      policeClearanceNumber,
      policeClearanceName,
      certificationNumber: resolvedCertificationNumber,
      certificationHolderName: resolvedCertificationHolderName,
      certificationIssuer: resolvedCertificationIssuer,
      certificationName: resolvedCertificationName,
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

    const duplicateDocument = await prisma.providerProfile.findFirst({
      where: {
        userId: { not: userId },
        OR: [
          { idNumber },
          { policeClearanceNumber },
          ...(resolvedCertificationNumber
            ? [{ certificationNumber: resolvedCertificationNumber }]
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
      (resolvedCertificationNumber && !credentialEvidence.offlineValidated)
    ) {
      return NextResponse.json(
        { error: "Complete sealed offline evidence is required." },
        { status: 503 },
      );
    }

    const updatedProfile = await prisma.providerProfile.update({
      where: { userId },
      data: {
        idNumber,
        policeClearanceNumber,
        certificationNumber: resolvedCertificationNumber || null,
        certificationIssuer: resolvedCertificationIssuer || null,
        certificationName: resolvedCertificationName || null,
        credentialVerificationLevel: credentialEvidence.level,
        credentialVerificationMethod: credentialEvidence.method,
        credentialVerificationSource: credentialEvidence.source,
        credentialVerifiedAt: null,
        credentialManualReference: credentialEvidence.reference,
        verificationConsentAt:
          providerProfile.verificationConsentAt ?? new Date(),
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
      },
    });

    return NextResponse.json(
      {
        message:
          "Document evidence passed every offline consistency and tamper-evidence rule and was approved automatically. No live government or regulator database lookup was performed.",
        verificationStatus: updatedProfile.verificationStatus,
        qualificationCheck,
        verificationResults: Object.fromEntries(
          qualificationCheck.checks.map((check) => [check.name, check]),
        ),
        providerProfile: updatedProfile,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Document validation error:", error);
    return NextResponse.json(
      { error: "Could not validate documents." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to check validation status." },
      { status: 401 },
    );
  }

  try {
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!providerProfile) {
      return NextResponse.json(
        { error: "Provider profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      verificationMode: "OFFLINE_EVIDENCE_REVIEW",
      authenticityEstablished: false,
      verificationStatus: providerProfile.verificationStatus,
      adminNotes: providerProfile.adminNotes,
      hasDocuments: Boolean(
        providerProfile.idNumber && providerProfile.policeClearanceNumber,
      ),
      documents: {
        idNumber: providerProfile.idNumber ? "Provided" : "Missing",
        policeClearanceNumber: providerProfile.policeClearanceNumber
          ? "Provided"
          : "Missing",
        certificationNumber: providerProfile.certificationNumber
          ? "Provided"
          : "Missing",
        certificationIssuer: providerProfile.certificationIssuer
          ? "Provided"
          : "Missing",
        certificationName: providerProfile.certificationName
          ? "Provided"
          : "Missing",
      },
      evidence: {
        identity: providerProfile.identityVerificationLevel ?? "Unvalidated",
        policeClearance:
          providerProfile.policeVerificationLevel ?? "Unvalidated",
        serviceCertification:
          providerProfile.credentialVerificationLevel ?? "Unvalidated",
      },
    });
  } catch (error) {
    console.error("Error fetching validation status:", error);
    return NextResponse.json(
      { error: "Could not fetch validation status." },
      { status: 500 },
    );
  }
}
