import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  getAutomatedRecordEvidenceSummary,
  getCredentialEvidenceSummary,
  hasAutomatedVerificationServiceFailure,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to verify documents." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const {
      idNumber,
      policeClearanceNumber,
      certificationNumber,
      certificationIssuer,
      certificationName,
      verificationConsent,
    } = body;

    // Validate required fields
    if (!idNumber || !policeClearanceNumber) {
      return NextResponse.json(
        {
          error:
            "ID number and police clearance number are required for verification.",
        },
        { status: 400 },
      );
    }

    // Get user's provider profile
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
      verificationConsent !== true &&
      !providerProfile.verificationConsentAt
    ) {
      return NextResponse.json(
        {
          error:
            "Consent is required to verify identity, police clearance, and professional credentials.",
        },
        { status: 400 },
      );
    }

    const resolvedCertificationNumber = String(
      certificationNumber ?? providerProfile.certificationNumber ?? "",
    ).trim();
    const resolvedCertificationIssuer = String(
      certificationIssuer ?? providerProfile.certificationIssuer ?? "",
    ).trim();
    const resolvedCertificationName = String(
      certificationName ?? providerProfile.certificationName ?? "",
    ).trim();

    const qualificationCheck = await runProviderQualificationCheck({
      fullName: providerProfile.user.name,
      serviceCategory: providerProfile.serviceCategory,
      idNumber,
      policeClearanceNumber,
      certificationNumber: resolvedCertificationNumber,
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
          status: hasAutomatedVerificationServiceFailure(qualificationCheck)
            ? 503
            : 422,
        },
      );
    }

    const credentialEvidence = getCredentialEvidenceSummary(qualificationCheck);
    const automatedEvidence =
      getAutomatedRecordEvidenceSummary(qualificationCheck);

    if (
      !automatedEvidence.identity.authoritative ||
      !automatedEvidence.policeClearance.authoritative
    ) {
      return NextResponse.json(
        { error: "Authoritative automated verification evidence is required." },
        { status: 503 },
      );
    }

    // Update provider profile with document details and verification status
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
        credentialVerifiedAt: credentialEvidence.verifiedAt,
        credentialManualReference: null,
        verificationConsentAt:
          providerProfile.verificationConsentAt ?? new Date(),
        identityVerificationLevel: automatedEvidence.identity.level,
        identityVerificationMethod: automatedEvidence.identity.method,
        identityVerificationSource: automatedEvidence.identity.source,
        identityVerificationReference: automatedEvidence.identity.reference,
        identityVerifiedAt: automatedEvidence.identity.verifiedAt,
        identityVerifiedBy: "AUTOMATED_SYSTEM",
        policeVerificationLevel: automatedEvidence.policeClearance.level,
        policeVerificationMethod: automatedEvidence.policeClearance.method,
        policeVerificationSource: automatedEvidence.policeClearance.source,
        policeVerificationReference:
          automatedEvidence.policeClearance.reference,
        policeVerifiedAt: automatedEvidence.policeClearance.verifiedAt,
        policeVerifiedBy: "AUTOMATED_SYSTEM",
        verificationStatus: qualificationCheck.recommendedStatus,
        adminNotes: qualificationCheck.adminNotes,
      },
    });

    // Return detailed verification results
    return NextResponse.json(
      {
        message: qualificationCheck.autoApproved
          ? "Documents verified automatically."
          : "National ID and police clearance were verified automatically. Professional credential review remains pending.",
        verificationStatus: updatedProfile.verificationStatus,
        qualificationCheck,
        verificationResults: Object.fromEntries(
          qualificationCheck.checks.map((check) => [check.name, check]),
        ),
        providerProfile: updatedProfile,
      },
      { status: qualificationCheck.autoApproved ? 200 : 207 },
    ); // 207 for accepted but pending review
  } catch (error) {
    console.error("Document verification error:", error);
    return NextResponse.json(
      {
        error: "Could not verify documents.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to check verification status." },
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
      verificationStatus: providerProfile.verificationStatus,
      adminNotes: providerProfile.adminNotes,
      hasDocuments: !!(
        providerProfile.idNumber && providerProfile.policeClearanceNumber
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
        identity: providerProfile.identityVerificationLevel ?? "Unverified",
        policeClearance:
          providerProfile.policeVerificationLevel ?? "Unverified",
        serviceCertification:
          providerProfile.credentialVerificationLevel ?? "Unverified",
      },
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    return NextResponse.json(
      { error: "Could not fetch verification status." },
      { status: 500 },
    );
  }
}
