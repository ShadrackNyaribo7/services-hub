import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { runProviderQualificationCheck } from "@/lib/verification/qualificationService";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to verify documents." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { idNumber, policeClearanceNumber, certificationNumber } = body;

    // Validate required fields
    if (!idNumber || !policeClearanceNumber) {
      return NextResponse.json(
        { error: "ID number and police clearance number are required for verification." },
        { status: 400 }
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
        { status: 404 }
      );
    }

    const qualificationCheck = await runProviderQualificationCheck({
      fullName: providerProfile.user.name,
      serviceCategory: providerProfile.serviceCategory,
      idNumber,
      policeClearanceNumber,
      certificationNumber:
        certificationNumber ?? providerProfile.certificationNumber,
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

    // Update provider profile with document details and verification status
    const updatedProfile = await prisma.providerProfile.update({
      where: { userId },
      data: {
        idNumber,
        policeClearanceNumber,
        certificationNumber:
          certificationNumber ?? providerProfile.certificationNumber,
        verificationStatus: qualificationCheck.recommendedStatus,
        adminNotes: qualificationCheck.adminNotes,
      },
    });

    // Return detailed verification results
    return NextResponse.json({
      message: qualificationCheck.autoApproved
        ? "Documents verified successfully"
        : "Documents submitted. Admin verification is required before approval.",
      verificationStatus: updatedProfile.verificationStatus,
      qualificationCheck,
      verificationResults: Object.fromEntries(
        qualificationCheck.checks.map((check) => [check.name, check]),
      ),
      providerProfile: updatedProfile,
    }, { status: qualificationCheck.autoApproved ? 200 : 207 }); // 207 for accepted but pending review
  } catch (error) {
    console.error("Document verification error:", error);
    return NextResponse.json(
      { error: "Could not verify documents.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to check verification status." },
      { status: 401 }
    );
  }

  try {
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!providerProfile) {
      return NextResponse.json(
        { error: "Provider profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verificationStatus: providerProfile.verificationStatus,
      adminNotes: providerProfile.adminNotes,
      hasDocuments: !!(
        providerProfile.idNumber &&
        providerProfile.policeClearanceNumber
      ),
      documents: {
        idNumber: providerProfile.idNumber ? "Provided" : "Missing",
        policeClearanceNumber: providerProfile.policeClearanceNumber ? "Provided" : "Missing",
        certificationNumber: providerProfile.certificationNumber ? "Provided" : "Missing",
      },
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    return NextResponse.json(
      { error: "Could not fetch verification status." },
      { status: 500 }
    );
  }
}
