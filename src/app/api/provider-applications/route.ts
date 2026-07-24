import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  getCredentialEvidenceSummary,
  runProviderQualificationCheck,
} from "@/lib/verification/qualificationService";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to apply." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const {
      fullName: rawFullName,
      phone: rawPhone,
      county: rawCounty,
      serviceCategory: rawServiceCategory,
      policeClearanceNumber,
      IDnumber,
      idNumber,
      certificationNumber,
      certificationIssuer,
      certificationName,
      verificationConsent,
    } = body;
    const fullName = String(rawFullName ?? "").trim();
    const phone = String(rawPhone ?? "").trim();
    const county = String(rawCounty ?? "").trim();
    const serviceCategory = String(rawServiceCategory ?? "").trim();
    const submittedIdNumber = String(IDnumber ?? idNumber ?? "").trim();
    const submittedPoliceClearanceNumber = String(
      policeClearanceNumber ?? "",
    ).trim();
    const submittedCertificationNumber = String(
      certificationNumber ?? "",
    ).trim();
    const submittedCertificationIssuer = String(
      certificationIssuer ?? "",
    ).trim();
    const submittedCertificationName = String(
      certificationName ?? "",
    ).trim();

    if (!fullName || !phone || !county || !serviceCategory) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (verificationConsent !== true) {
      return NextResponse.json(
        {
          error:
            "Consent is required to verify identity, police clearance, and professional credentials.",
        },
        { status: 400 },
      );
    }

    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      return NextResponse.json(
        { error: "That phone number is already used by another account." },
        { status: 409 },
      );
    }

    const qualificationCheck = await runProviderQualificationCheck({
      fullName,
      serviceCategory,
      idNumber: submittedIdNumber,
      policeClearanceNumber: submittedPoliceClearanceNumber,
      certificationNumber: submittedCertificationNumber,
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
        { status: 422 },
      );
    }

    const credentialEvidence = getCredentialEvidenceSummary(qualificationCheck);

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
      credentialVerifiedAt: credentialEvidence.verifiedAt,
      credentialManualReference: null,
      verificationConsentAt: new Date(),
      identityVerificationLevel: null,
      identityVerificationMethod: null,
      identityVerificationSource: null,
      identityVerifiedAt: null,
      identityVerifiedBy: null,
      policeVerificationLevel: null,
      policeVerificationMethod: null,
      policeVerificationSource: null,
      policeVerifiedAt: null,
      policeVerifiedBy: null,
      verificationStatus: qualificationCheck.recommendedStatus,
      adminNotes: qualificationCheck.adminNotes,
    };

    const application = await prisma.user.upsert({
      where: {
        id: userId,
      },
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
        providerProfile: {
          create: providerProfileData,
        },
      },
      include: {
        providerProfile: true,
      },
    });

    return NextResponse.json(
      {
        application,
        qualificationCheck,
        message: qualificationCheck.autoApproved
          ? "Application submitted and qualifications verified."
          : "Application submitted. Admin verification is required before approval.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not submit application." },
      { status: 500 }
    );
  }
}
