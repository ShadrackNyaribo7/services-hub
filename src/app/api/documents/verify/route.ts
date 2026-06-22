import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { verificationService } from "@/lib/verification/verificationService";

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
    const { idNumber, policeClearanceNumber, credentialValidator, serviceCategory } = body;

    // Validate required fields
    if (!idNumber || !policeClearanceNumber || !credentialValidator) {
      return NextResponse.json(
        { error: "All document fields are required for verification." },
        { status: 400 }
      );
    }

    // Get user's provider profile
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!providerProfile) {
      return NextResponse.json(
        { error: "Provider profile not found." },
        { status: 404 }
      );
    }

    // Perform third-party verification
    const verificationResults = await verificationService.verifyAllDocuments({
      idNumber,
      policeClearanceNumber,
      credentialValidator,
      serviceCategory: serviceCategory || providerProfile.serviceCategory
    });

    // Update provider profile with document details and verification status
    const updatedProfile = await prisma.providerProfile.update({
      where: { userId },
      data: {
        idNumber,
        policeClearanceNumber,
        credentialValidator,
        verificationStatus: verificationResults.overallValid ? "APPROVED" : "PENDING",
        adminNotes: verificationResults.overallValid 
          ? "All documents verified successfully" 
          : `Verification pending: ID=${verificationResults.idVerification.reason}, Police=${verificationResults.policeClearanceVerification.reason}, Credentials=${verificationResults.credentialVerification.reason}`,
      },
    });

    // Return detailed verification results
    return NextResponse.json({
      message: verificationResults.overallValid 
        ? "Documents verified successfully" 
        : "Documents submitted with some verification issues",
      verificationStatus: updatedProfile.verificationStatus,
      verificationResults: {
        idVerification: verificationResults.idVerification,
        policeClearanceVerification: verificationResults.policeClearanceVerification,
        credentialVerification: verificationResults.credentialVerification,
      },
      providerProfile: updatedProfile,
    }, { status: verificationResults.overallValid ? 200 : 207 }); // 207 for partial success
  } catch (error) {
    console.error("Document verification error:", error);
    return NextResponse.json(
      { error: "Could not verify documents.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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
        providerProfile.policeClearanceNumber &&
        providerProfile.credentialValidator
      ),
      documents: {
        idNumber: providerProfile.idNumber ? "Provided" : "Missing",
        policeClearanceNumber: providerProfile.policeClearanceNumber ? "Provided" : "Missing",
        credentialValidator: providerProfile.credentialValidator ? "Provided" : "Missing",
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