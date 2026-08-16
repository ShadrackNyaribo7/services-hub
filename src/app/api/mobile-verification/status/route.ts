import { NextResponse } from "next/server";
import {
  createProviderMobileSession,
  hashOpaqueToken,
} from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";
import {
  isMobileVerificationToken,
  isTrustedSameOriginRequest,
} from "@/lib/verification/mobileVerification";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-site verification requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const body = await readBoundedJsonObject(request, 1_024);
    const token = readTextInput(body, "token", 64);
    if (!isMobileVerificationToken(token)) {
      return NextResponse.json(
        { error: "The verification request is invalid." },
        { status: 400 },
      );
    }

    let challenge = await prisma.mobileVerificationChallenge.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
    });
    if (!challenge) {
      return NextResponse.json(
        { error: "The verification request was not found." },
        { status: 404 },
      );
    }

    if (challenge.status === "PENDING" && challenge.expiresAt <= new Date()) {
      challenge = await prisma.mobileVerificationChallenge.update({
        where: { id: challenge.id },
        data: { status: "EXPIRED" },
      });
    }

    if (challenge.status === "VERIFIED") {
      const session = await createProviderMobileSession(
        challenge.phone,
        challenge.id,
      );
      return NextResponse.json(
        {
          status: "VERIFIED",
          purpose: challenge.purpose,
          verifiedAt: challenge.verifiedAt?.toISOString() ?? null,
          sessionExpiresAt: session.expiresAt.toISOString(),
          redirectTo:
            challenge.purpose === "PROVIDER_SIGN_IN"
              ? session.userId
                ? "/providers/operations"
                : "/providers/apply"
              : null,
          message: "Mobile number verified through M-Pesa.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const message =
      challenge.status === "PENDING"
        ? "Waiting for the M-Pesa confirmation."
        : challenge.status === "EXPIRED"
          ? "This verification request expired. Start a new one."
          : "M-Pesa verification was not completed. Start a new request.";

    return NextResponse.json(
      { status: challenge.status, purpose: challenge.purpose, message },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Mobile verification status error:", error);
    return NextResponse.json(
      { error: "Could not check mobile verification." },
      { status: 500 },
    );
  }
}
