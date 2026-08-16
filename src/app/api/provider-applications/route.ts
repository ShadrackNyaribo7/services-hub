import { randomUUID } from "node:crypto";
import type { MobileVerificationChallenge } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getApplicationIdentity,
  hashOpaqueToken,
} from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";
import { normalizeKenyanPhone } from "@/lib/phone/kenyanPhone";
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
import { isMobileVerificationToken } from "@/lib/verification/mobileVerification";

class MobileVerificationConsumptionError extends Error {
  constructor() {
    super("Mobile verification has already been used.");
    this.name = "MobileVerificationConsumptionError";
  }
}

export async function POST(request: Request) {
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

    if (body.verificationConsent !== true) {
      return NextResponse.json(
        {
          error:
            "Attestation is required for offline identity, police-clearance, and credential evidence review.",
        },
        { status: 400 },
      );
    }

    const identity = await getApplicationIdentity();
    if (!identity) {
      return NextResponse.json(
        {
          error:
            "Verify this mobile number with M-Pesa or sign in before applying.",
        },
        { status: 401 },
      );
    }
    if (identity.method === "MPESA" && identity.phone !== phone) {
      return NextResponse.json(
        { error: "The application phone must match the verified number." },
        { status: 403 },
      );
    }

    const phoneVerificationRequested = body.phoneVerificationRequested === true;
    const phoneVerificationToken = readTextInput(
      body,
      "phoneVerificationToken",
      64,
    );
    let verifiedChallenge: MobileVerificationChallenge | null = null;

    if (phoneVerificationRequested) {
      if (isMobileVerificationToken(phoneVerificationToken)) {
        verifiedChallenge =
          await prisma.mobileVerificationChallenge.findUnique({
            where: { tokenHash: hashOpaqueToken(phoneVerificationToken) },
          });
      } else if (
        identity.method === "MPESA" &&
        identity.verificationChallengeId
      ) {
        verifiedChallenge =
          await prisma.mobileVerificationChallenge.findUnique({
            where: { id: identity.verificationChallengeId },
          });
      } else {
        return NextResponse.json(
          {
            error:
              "Complete M-Pesa verification for this mobile number before submitting.",
          },
          { status: 422 },
        );
      }

      const recentVerification =
        verifiedChallenge?.verifiedAt &&
        verifiedChallenge.verifiedAt.getTime() >=
          Date.now() - 60 * 60 * 1_000;
      const permittedPurpose =
        verifiedChallenge?.purpose === "PROVIDER_APPLICATION" ||
        (identity.method === "MPESA" &&
          verifiedChallenge?.purpose === "PROVIDER_SIGN_IN" &&
          verifiedChallenge.id === identity.verificationChallengeId);
      if (
        !verifiedChallenge ||
        verifiedChallenge.status !== "VERIFIED" ||
        !permittedPurpose ||
        verifiedChallenge.phone !== phone ||
        verifiedChallenge.consumedAt ||
        !recentVerification
      ) {
        return NextResponse.json(
          {
            error:
              "Complete a current M-Pesa verification for this mobile number before submitting.",
          },
          { status: 422 },
        );
      }
    } else if (identity.method === "MPESA") {
      return NextResponse.json(
        {
          error:
            "M-Pesa mobile verification is required when applying without Clerk sign-in.",
        },
        { status: 422 },
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

    if (
      existingPhoneUser &&
      identity.userId &&
      existingPhoneUser.id !== identity.userId
    ) {
      return NextResponse.json(
        { error: "That phone number is already used by another account." },
        { status: 409 },
      );
    }
    const userId =
      existingPhoneUser?.id ??
      identity.userId ??
      `mobile_${randomUUID().replaceAll("-", "")}`;

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
      phoneVerifiedAt: verifiedChallenge ? new Date() : undefined,
      phoneVerificationMethod: verifiedChallenge
        ? "MPESA_STK_CONFIRMATION"
        : undefined,
      phoneVerificationSource: verifiedChallenge
        ? "SAFARICOM_DARAJA"
        : undefined,
      phoneVerificationReference: verifiedChallenge?.id,
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

    const application = await prisma.$transaction(async (transaction) => {
      if (verifiedChallenge) {
        const consumed =
          await transaction.mobileVerificationChallenge.updateMany({
            where: {
              id: verifiedChallenge.id,
              phone,
              status: "VERIFIED",
              consumedAt: null,
            },
            data: { consumedAt: new Date() },
          });
        if (consumed.count !== 1) {
          throw new MobileVerificationConsumptionError();
        }
      }

      const savedApplication = await transaction.user.upsert({
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

      if (identity.method === "MPESA") {
        await transaction.providerMobileSession.updateMany({
          where: { phone, expiresAt: { gt: new Date() } },
          data: { userId, lastUsedAt: new Date() },
        });
      }

      return savedApplication;
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
    if (error instanceof MobileVerificationConsumptionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
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
