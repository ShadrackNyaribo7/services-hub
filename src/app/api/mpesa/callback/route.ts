import type { MobileVerificationChallenge } from "@prisma/client";
import { NextResponse } from "next/server";
import { mpesaService } from "@/lib/mpesa/mpesaService";
import { prisma } from "@/lib/prisma";
import {
  calculateMarketplaceProfit,
  isExactPaymentAmount,
} from "@/lib/pricing/profitEngine";
import {
  readBoundedJsonObject,
  RequestInputError,
} from "@/lib/verification/requestGuards";

type CallbackItem = { Name?: unknown; Value?: unknown };

function callbackText(value: unknown, name: string, maximumLength = 160) {
  if (typeof value !== "string") {
    throw new RequestInputError(`${name} must be a string.`);
  }
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new RequestInputError(`${name} is invalid.`);
  }
  return normalized;
}

function readCallbackMetadata(items: unknown) {
  if (!Array.isArray(items) || items.length > 20) {
    throw new RequestInputError("Successful callbacks require valid metadata.");
  }

  const metadata = new Map<string, unknown>();
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new RequestInputError(
        "Callback metadata contains an invalid item.",
      );
    }
    const item = rawItem as CallbackItem;
    const name = callbackText(item.Name, "Callback metadata name", 64);
    if (metadata.has(name)) {
      throw new RequestInputError(`Callback metadata repeats ${name}.`);
    }
    metadata.set(name, item.Value);
  }

  return metadata;
}

function invalidCallback(message: string, status = 400) {
  return NextResponse.json({ ResultCode: 1, ResultDesc: message }, { status });
}

async function processMobileVerificationCallback(input: {
  challenge: MobileVerificationChallenge;
  values: Record<string, unknown>;
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDescription: string;
}) {
  const {
    challenge,
    values,
    merchantRequestId,
    checkoutRequestId,
    resultCode,
    resultDescription,
  } = input;

  if (
    !challenge.mpesaMerchantRequestId ||
    challenge.mpesaMerchantRequestId !== merchantRequestId
  ) {
    return invalidCallback("Callback merchant reference mismatch");
  }

  if (challenge.status === "VERIFIED") {
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Mobile verification already processed",
    });
  }

  if (challenge.expiresAt <= new Date()) {
    await prisma.mobileVerificationChallenge.updateMany({
      where: { id: challenge.id, status: "PENDING" },
      data: { status: "EXPIRED", resultCode, resultDescription },
    });
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Mobile verification expired",
    });
  }

  if (resultCode !== 0) {
    await prisma.mobileVerificationChallenge.updateMany({
      where: { id: challenge.id, status: "PENDING" },
      data: { status: "FAILED", resultCode, resultDescription },
    });
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Mobile verification result recorded",
    });
  }

  const metadata = readCallbackMetadata(
    (values.CallbackMetadata as Record<string, unknown> | undefined)?.Item,
  );
  const paymentAmount = Number(metadata.get("Amount"));
  const receiptNumber = callbackText(
    metadata.get("MpesaReceiptNumber"),
    "MpesaReceiptNumber",
    32,
  ).toUpperCase();
  const phoneNumber = mpesaService.formatPhoneNumber(
    callbackText(metadata.get("PhoneNumber"), "PhoneNumber", 24),
  );
  const rawAccountReference = metadata.get("AccountReference");
  const accountReference =
    typeof rawAccountReference === "string" && rawAccountReference.trim()
      ? callbackText(rawAccountReference, "AccountReference", 12)
      : "";

  if (paymentAmount !== challenge.amount) {
    return invalidCallback("Verification amount mismatch");
  }
  if (!/^[A-Z0-9]{8,32}$/.test(receiptNumber)) {
    return invalidCallback("Invalid M-Pesa receipt number");
  }
  if (`+${phoneNumber}` !== challenge.phone) {
    return invalidCallback("Verification phone number mismatch");
  }
  if (accountReference && accountReference !== challenge.accountReference) {
    return invalidCallback("Verification account reference mismatch");
  }

  const [duplicateBookingReceipt, duplicateVerificationReceipt] =
    await Promise.all([
      prisma.booking.findUnique({
        where: { mpesaReceiptNumber: receiptNumber },
        select: { id: true },
      }),
      prisma.mobileVerificationChallenge.findFirst({
        where: {
          mpesaReceiptNumber: receiptNumber,
          id: { not: challenge.id },
        },
        select: { id: true },
      }),
    ]);
  if (duplicateBookingReceipt || duplicateVerificationReceipt) {
    return invalidCallback("M-Pesa receipt has already been used");
  }

  const update = await prisma.mobileVerificationChallenge.updateMany({
    where: {
      id: challenge.id,
      mpesaCheckoutRequestId: checkoutRequestId,
      mpesaMerchantRequestId: merchantRequestId,
      status: "PENDING",
    },
    data: {
      status: "VERIFIED",
      mpesaReceiptNumber: receiptNumber,
      resultCode,
      resultDescription,
      verifiedAt: new Date(),
    },
  });
  if (update.count !== 1) {
    return invalidCallback("Mobile verification state changed", 409);
  }

  console.info("M-Pesa mobile verification processed", {
    challengeId: challenge.id,
    checkoutRequestId,
  });
  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Mobile verification processed",
  });
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJsonObject(request, 32_768);
    const rawBody = body.Body;
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return invalidCallback("Invalid callback payload");
    }

    const callback = (rawBody as Record<string, unknown>).stkCallback;
    if (!callback || typeof callback !== "object" || Array.isArray(callback)) {
      return invalidCallback("Invalid callback payload");
    }

    const values = callback as Record<string, unknown>;
    const merchantRequestId = callbackText(
      values.MerchantRequestID,
      "MerchantRequestID",
      128,
    );
    const checkoutRequestId = callbackText(
      values.CheckoutRequestID,
      "CheckoutRequestID",
      128,
    );
    const resultCode = Number(values.ResultCode);
    if (!Number.isInteger(resultCode)) {
      return invalidCallback("Invalid callback result code");
    }
    const resultDescription =
      typeof values.ResultDesc === "string"
        ? values.ResultDesc.normalize("NFKC").trim().slice(0, 500)
        : "";

    const existingBooking = await prisma.booking.findUnique({
      where: { mpesaCheckoutRequestId: checkoutRequestId },
      include: {
        providerProfile: { select: { serviceCategory: true } },
      },
    });

    if (!existingBooking) {
      const mobileChallenge =
        await prisma.mobileVerificationChallenge.findUnique({
          where: { mpesaCheckoutRequestId: checkoutRequestId },
        });
      if (!mobileChallenge) {
        return invalidCallback("Payment request not found", 404);
      }
      return processMobileVerificationCallback({
        challenge: mobileChallenge,
        values,
        merchantRequestId,
        checkoutRequestId,
        resultCode,
        resultDescription,
      });
    }

    if (
      !existingBooking.mpesaMerchantRequestId ||
      existingBooking.mpesaMerchantRequestId !== merchantRequestId
    ) {
      return invalidCallback("Callback merchant reference mismatch");
    }

    const callbackSucceeded = resultCode === 0;
    let paymentAmount = 0;
    let receiptNumber = "";
    let transactionId = "";
    let phoneNumber = "";
    let accountReference = "";

    if (callbackSucceeded) {
      const metadata = readCallbackMetadata(
        (values.CallbackMetadata as Record<string, unknown> | undefined)?.Item,
      );
      paymentAmount = Number(metadata.get("Amount"));
      receiptNumber = callbackText(
        metadata.get("MpesaReceiptNumber"),
        "MpesaReceiptNumber",
        32,
      ).toUpperCase();
      phoneNumber = mpesaService.formatPhoneNumber(
        callbackText(metadata.get("PhoneNumber"), "PhoneNumber", 24),
      );
      const rawTransactionId = metadata.get("TransactionID");
      transactionId =
        typeof rawTransactionId === "string" && rawTransactionId.trim()
          ? callbackText(rawTransactionId, "TransactionID", 64)
          : receiptNumber;
      const rawAccountReference = metadata.get("AccountReference");
      accountReference =
        typeof rawAccountReference === "string" && rawAccountReference.trim()
          ? callbackText(rawAccountReference, "AccountReference", 12)
          : "";

      if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
        return invalidCallback("Invalid callback payment amount");
      }
      if (!/^[A-Z0-9]{8,32}$/.test(receiptNumber)) {
        return invalidCallback("Invalid M-Pesa receipt number");
      }
      if (!mpesaService.validatePhoneNumber(phoneNumber)) {
        return invalidCallback("Invalid callback phone number");
      }
      if (!isExactPaymentAmount(existingBooking.amount, paymentAmount)) {
        await prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            paymentStatus: "FAILED",
            suspiciousActivity: true,
            securityFlag: "PAYMENT_AMOUNT_MISMATCH",
            paymentCreatedAt: new Date(),
          },
        });
        return invalidCallback("Payment amount mismatch");
      }
      if (
        !existingBooking.mpesaPhoneNumber ||
        mpesaService.formatPhoneNumber(existingBooking.mpesaPhoneNumber) !==
          phoneNumber
      ) {
        return invalidCallback("Callback phone number mismatch");
      }
      if (
        accountReference &&
        accountReference !== existingBooking.mpesaAccountReference
      ) {
        return invalidCallback("Callback account reference mismatch");
      }
      if (
        existingBooking.paymentStatus === "COMPLETED" &&
        existingBooking.mpesaReceiptNumber === receiptNumber
      ) {
        return NextResponse.json({
          ResultCode: 0,
          ResultDesc: "Payment already processed",
        });
      }
      if (existingBooking.paymentStatus === "COMPLETED") {
        return invalidCallback("Completed payment reference mismatch");
      }

      const duplicateReceipt = await prisma.booking.findFirst({
        where: {
          mpesaReceiptNumber: receiptNumber,
          id: { not: existingBooking.id },
        },
        select: { id: true },
      });
      if (duplicateReceipt) {
        return invalidCallback("M-Pesa receipt has already been used");
      }
    } else if (existingBooking.paymentStatus === "COMPLETED") {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Payment already processed",
      });
    }

    const profit = callbackSucceeded
      ? calculateMarketplaceProfit({
          amount: paymentAmount,
          serviceCategory: existingBooking.providerProfile.serviceCategory,
        })
      : null;
    const recentBookings = callbackSucceeded
      ? await prisma.booking.findMany({
          where: {
            OR: [
              { mpesaPhoneNumber: phoneNumber },
              { providerProfileId: existingBooking.providerProfileId },
            ],
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
          take: 7,
        })
      : [];
    const highFrequencyRisk = recentBookings.length > 5;

    const update = await prisma.booking.updateMany({
      where: {
        id: existingBooking.id,
        mpesaCheckoutRequestId: checkoutRequestId,
        mpesaMerchantRequestId: merchantRequestId,
        paymentStatus: { not: "COMPLETED" },
      },
      data: {
        paymentStatus: callbackSucceeded ? "COMPLETED" : "FAILED",
        mpesaTransactionId: callbackSucceeded ? transactionId : undefined,
        mpesaReceiptNumber: callbackSucceeded ? receiptNumber : undefined,
        paymentCreatedAt: new Date(),
        amount: callbackSucceeded ? paymentAmount : undefined,
        developerFee: profit?.developerFee,
        providerAmount: profit?.providerAmount,
        commissionRate: profit?.commissionRate,
        grossPlatformFee: profit?.grossPlatformFee,
        paymentProcessingFee: profit?.paymentProcessingFee,
        status: callbackSucceeded ? "ACCEPTED" : "REQUESTED",
        suspiciousActivity: highFrequencyRisk,
        securityFlag: highFrequencyRisk ? "HIGH_FREQUENCY_RISK" : null,
        escrowReleased: false,
      },
    });

    if (update.count !== 1) {
      const latest = await prisma.booking.findUnique({
        where: { id: existingBooking.id },
        select: { paymentStatus: true, mpesaReceiptNumber: true },
      });
      if (
        latest?.paymentStatus === "COMPLETED" &&
        latest.mpesaReceiptNumber === receiptNumber
      ) {
        return NextResponse.json({
          ResultCode: 0,
          ResultDesc: "Payment already processed",
        });
      }
      return invalidCallback("Payment state changed during processing", 409);
    }

    console.info("M-Pesa callback processed", {
      bookingId: existingBooking.id,
      checkoutRequestId,
      resultCode,
      resultDescription,
      suspiciousActivity: highFrequencyRisk,
    });

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Payment callback processed",
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return invalidCallback(error.message, error.status);
    }
    console.error("M-Pesa callback error:", error);
    return invalidCallback("Error processing callback", 500);
  }
}
