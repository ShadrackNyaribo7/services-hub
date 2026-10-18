import type { MobileVerificationChallenge } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  createProviderMobileSession,
  hashOpaqueToken,
} from "@/lib/auth/providerMobileSession";
import { mpesaService } from "@/lib/mpesa/mpesaService";
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

const MPESA_STATUS_QUERY_INTERVAL_MS = 5_000;
const PENDING_STATUS_DESCRIPTION = "Awaiting M-Pesa status confirmation.";

async function touchPendingChallenge(
  challenge: MobileVerificationChallenge,
): Promise<MobileVerificationChallenge> {
  const checkedAt = new Date();
  await prisma.mobileVerificationChallenge.updateMany({
    where: { id: challenge.id, status: "PENDING" },
    data: { resultDescription: PENDING_STATUS_DESCRIPTION },
  });
  return {
    ...challenge,
    resultDescription: PENDING_STATUS_DESCRIPTION,
    updatedAt: checkedAt,
  };
}

async function reconcilePendingChallenge(
  challenge: MobileVerificationChallenge,
): Promise<MobileVerificationChallenge> {
  if (
    challenge.status !== "PENDING" ||
    !challenge.mpesaCheckoutRequestId ||
    challenge.updatedAt.getTime() > Date.now() - MPESA_STATUS_QUERY_INTERVAL_MS
  ) {
    return challenge;
  }

  try {
    const result = await mpesaService.checkPaymentStatus(
      challenge.mpesaCheckoutRequestId,
    );
    const rawResultCode = result.resultCode.trim();
    if (!/^-?\d+$/.test(rawResultCode)) {
      return touchPendingChallenge(challenge);
    }
    const resultCode = Number.parseInt(rawResultCode, 10);

    const status: MobileVerificationChallenge["status"] =
      resultCode === 0 ? "VERIFIED" : "FAILED";
    const resolvedAt = new Date();
    const update = await prisma.mobileVerificationChallenge.updateMany({
      where: { id: challenge.id, status: "PENDING" },
      data: {
        status,
        resultCode,
        resultDescription: result.resultDesc,
        verifiedAt: status === "VERIFIED" ? resolvedAt : undefined,
      },
    });
    if (update.count === 1) {
      return {
        ...challenge,
        status,
        resultCode,
        resultDescription: result.resultDesc,
        verifiedAt: status === "VERIFIED" ? resolvedAt : challenge.verifiedAt,
        updatedAt: resolvedAt,
      };
    }

    return (
      (await prisma.mobileVerificationChallenge.findUnique({
        where: { id: challenge.id },
      })) ?? challenge
    );
  } catch (error) {
    console.warn("M-Pesa mobile verification status query delayed", {
      challengeId: challenge.id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return touchPendingChallenge(challenge);
  }
}

function verificationFailureMessage(resultCode: number | null) {
  switch (resultCode) {
    case 1:
      return "M-Pesa reported insufficient funds. Add funds and start a new request.";
    case 1032:
      return "The M-Pesa prompt was cancelled. Start a new request when ready.";
    case 1037:
      return "The M-Pesa prompt timed out. Confirm the phone is reachable and start a new request.";
    case 2001:
      return "M-Pesa could not verify the PIN. Start a new request and try again.";
    case 4999:
      return "The M-Pesa transaction is still processing. Wait 2-3 minutes, then click 'Verify with M-Pesa' again to check status.";
    default:
      return "M-Pesa verification was not completed. Start a new request.";
  }
}

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

    if (challenge.status === "PENDING") {
      challenge = await reconcilePendingChallenge(challenge);
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
          : verificationFailureMessage(challenge.resultCode);

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
