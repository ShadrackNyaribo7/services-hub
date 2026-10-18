import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MpesaConfigurationError,
  MpesaRequestError,
  mpesaService,
} from "@/lib/mpesa/mpesaService";
import { normalizeKenyanPhone } from "@/lib/phone/kenyanPhone";
import {
  createMobileVerificationReference,
  createMobileVerificationToken,
  isTrustedSameOriginRequest,
  MOBILE_VERIFICATION_AMOUNT_KES,
  MOBILE_VERIFICATION_LIFETIME_MS,
  mobileVerificationRequestFingerprint,
  readMobileVerificationPurpose,
} from "@/lib/verification/mobileVerification";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

const PHONE_REQUESTS_PER_HOUR = 5;
const CLIENT_REQUESTS_PER_HOUR = 15;

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-site verification requests are not allowed." },
      { status: 403 },
    );
  }

  let challengeId: string | null = null;

  try {
    const body = await readBoundedJsonObject(request, 2_048);
    const phone = normalizeKenyanPhone(readTextInput(body, "phone", 24));
    const purpose = readMobileVerificationPurpose(body.purpose);
    if (!phone || !purpose) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan Safaricom or M-Pesa mobile number." },
        { status: 422 },
      );
    }

    const requestFingerprint =
      mobileVerificationRequestFingerprint(request);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1_000);
    const [phoneRequests, clientRequests] = await Promise.all([
      prisma.mobileVerificationChallenge.count({
        where: { phone, createdAt: { gte: hourAgo } },
      }),
      prisma.mobileVerificationChallenge.count({
        where: { requestFingerprint, createdAt: { gte: hourAgo } },
      }),
    ]);

    if (
      phoneRequests >= PHONE_REQUESTS_PER_HOUR ||
      clientRequests >= CLIENT_REQUESTS_PER_HOUR
    ) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again in one hour." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const { token, tokenHash } = createMobileVerificationToken();
    const expiresAt = new Date(Date.now() + MOBILE_VERIFICATION_LIFETIME_MS);
    const challenge = await prisma.mobileVerificationChallenge.create({
      data: {
        tokenHash,
        phone,
        purpose,
        amount: MOBILE_VERIFICATION_AMOUNT_KES,
        accountReference: createMobileVerificationReference(tokenHash),
        requestFingerprint,
        expiresAt,
      },
    });
    challengeId = challenge.id;

    try {
      const mpesaResponse = await mpesaService.initiateSTKPush(
        phone,
        MOBILE_VERIFICATION_AMOUNT_KES,
        challenge.id,
        challenge.accountReference,
      );

      await prisma.mobileVerificationChallenge.update({
        where: { id: challenge.id },
        data: {
          mpesaCheckoutRequestId: mpesaResponse.checkoutRequestID,
          mpesaMerchantRequestId: mpesaResponse.merchantRequestID,
        },
      });
    } catch (error) {
      if (!(error instanceof MpesaRequestError && error.outcomeUnknown)) {
        await prisma.mobileVerificationChallenge.update({
          where: { id: challenge.id },
          data: {
            status: "FAILED",
            resultDescription: "M-Pesa could not start the verification.",
          },
        });
        throw error;
      }

      console.warn("M-Pesa mobile verification outcome is delayed", {
        challengeId: challenge.id,
      });
    }

    return NextResponse.json(
      {
        token,
        status: "PENDING",
        amountKes: MOBILE_VERIFICATION_AMOUNT_KES,
        expiresAt: expiresAt.toISOString(),
        message:
          "Check the phone and approve the KES 1 M-Pesa prompt. This page will confirm it automatically.",
      },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MpesaConfigurationError) {
      console.error("M-Pesa verification configuration error:", error.message);
      return NextResponse.json(
        { error: "Mobile verification is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (error instanceof MpesaRequestError) {
      console.error("M-Pesa verification initiation failed", {
        challengeId,
        outcomeUnknown: error.outcomeUnknown,
      });
      return NextResponse.json(
        { error: "M-Pesa could not start verification. Please try again." },
        { status: 502 },
      );
    }

    console.error("Mobile verification initiation error:", error);
    return NextResponse.json(
      { error: "Could not start mobile verification." },
      { status: 500 },
    );
  }
}
