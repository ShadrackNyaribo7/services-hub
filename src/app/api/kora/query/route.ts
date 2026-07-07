import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { koraVerificationService } from "@/lib/kora/koraVerificationService";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to query verifications." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: "Missing required parameter: reference" },
        { status: 400 }
      );
    }

    const response = await koraVerificationService.queryVerification(reference);

    if (!response.status) {
      return NextResponse.json(
        { error: response.message || "Failed to query verification" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data,
    }, { status: 200 });

  } catch (error) {
    console.error("Kora query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query verification. Please try again." },
      { status: 500 }
    );
  }
}
