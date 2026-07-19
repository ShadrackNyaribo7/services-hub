import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { koraVerificationService } from "@/lib/kora/koraVerificationService";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to perform verifications." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { idNumber, idType, firstName, lastName, dateOfBirth, selfieImage, consent } = body;

    // Validate required fields
    if (!idNumber || !idType) {
      return NextResponse.json(
        { error: "Missing required fields: idNumber, idType" },
        { status: 400 }
      );
    }

    // Validate ID type
    if (idType !== 'national_id' && idType !== 'passport') {
      return NextResponse.json(
        { error: "Invalid idType. Must be 'national_id' or 'passport'" },
        { status: 400 }
      );
    }

    // Validate ID format based on type
    if (idType === 'national_id' && !koraVerificationService.validateNationalIDFormat(idNumber)) {
      return NextResponse.json(
        { error: "Invalid National ID format. Must be 8 digits" },
        { status: 400 }
      );
    }

    if (idType === 'passport' && !koraVerificationService.validatePassportFormat(idNumber)) {
      return NextResponse.json(
        { error: "Invalid Passport format. Must start with a letter followed by 7 digits" },
        { status: 400 }
      );
    }

    // Validate optional fields if provided
    if (dateOfBirth && !koraVerificationService.validateDateFormat(dateOfBirth)) {
      return NextResponse.json(
        { error: "Invalid date of birth format. Must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (selfieImage && !koraVerificationService.validateBase64Image(selfieImage)) {
      return NextResponse.json(
        { error: "Invalid selfie image format. Must be base64 encoded image" },
        { status: 400 }
      );
    }

    // If full validation data is provided, use comprehensive verification
    if (firstName && lastName && dateOfBirth) {
      const result = await koraVerificationService.verifyIdentityWithFullValidation(
        idNumber,
        idType,
        firstName,
        lastName,
        dateOfBirth,
        selfieImage
      );

      return NextResponse.json({
        success: true,
        data: result.data,
        validationResults: result.validationResults,
      }, { status: 200 });
    }

    // Otherwise, perform basic verification
    const response =
      idType === 'national_id'
        ? await koraVerificationService.verifyNationalID(idNumber, consent !== false)
        : await koraVerificationService.verifyPassport(idNumber, consent !== false);

    if (!response.status) {
      return NextResponse.json(
        { error: response.message || "Verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 });

  } catch (error) {
    console.error("Kora verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform verification. Please try again." },
      { status: 500 }
    );
  }
}
