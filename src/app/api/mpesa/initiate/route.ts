import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createMpesaAccountReference,
  MpesaConfigurationError,
  MpesaRequestError,
  mpesaService,
} from "@/lib/mpesa/mpesaService";
import { prisma } from "@/lib/prisma";
import { validateServiceAmount } from "@/lib/pricing/profitEngine";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to initiate payments." },
      { status: 401 },
    );
  }

  let bookingId = "";
  let initiationToken = "";
  let accountReference = "";

  try {
    const body = await readBoundedJsonObject(request, 4_096);
    const phoneNumber = readTextInput(body, "phoneNumber", 24);
    bookingId = readTextInput(body, "bookingId", 64);

    if (!phoneNumber || !bookingId) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, bookingId" },
        { status: 400 },
      );
    }

    if (!mpesaService.validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number format. Use a Kenyan M-Pesa number such as 07XXXXXXXX or +254XXXXXXXXX.",
        },
        { status: 422 },
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientUserId: userId },
      select: {
        id: true,
        amount: true,
        paymentStatus: true,
        mpesaPhoneNumber: true,
        mpesaCheckoutRequestId: true,
        mpesaInitiationToken: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "This booking has already been paid." },
        { status: 409 },
      );
    }

    if (booking.mpesaCheckoutRequestId || booking.mpesaInitiationToken) {
      return NextResponse.json(
        {
          error:
            "An M-Pesa payment attempt already exists for this booking. Check its status before trying again.",
        },
        { status: 409 },
      );
    }

    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    if (
      booking.mpesaPhoneNumber &&
      mpesaService.formatPhoneNumber(booking.mpesaPhoneNumber) !==
        formattedPhone
    ) {
      return NextResponse.json(
        {
          error:
            "The payment number must match the M-Pesa number saved with the booking.",
        },
        { status: 409 },
      );
    }

    const amountValidation = validateServiceAmount(booking.amount);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error },
        { status: 400 },
      );
    }

    initiationToken = randomUUID();
    accountReference = createMpesaAccountReference(bookingId);
    const reservation = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        clientUserId: userId,
        mpesaCheckoutRequestId: null,
        mpesaInitiationToken: null,
      },
      data: {
        mpesaPhoneNumber: formattedPhone,
        mpesaAccountReference: accountReference,
        mpesaInitiationToken: initiationToken,
        mpesaInitiatedAt: new Date(),
        paymentMethod: "MPESA",
        paymentStatus: "PENDING",
      },
    });

    if (reservation.count !== 1) {
      return NextResponse.json(
        { error: "Another payment attempt is already in progress." },
        { status: 409 },
      );
    }

    const mpesaResponse = await mpesaService.initiateSTKPush(
      formattedPhone,
      amountValidation.amount,
      bookingId,
      accountReference,
    );

    const stored = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        clientUserId: userId,
        mpesaInitiationToken: initiationToken,
      },
      data: {
        amount: amountValidation.amount,
        mpesaCheckoutRequestId: mpesaResponse.checkoutRequestID,
        mpesaMerchantRequestId: mpesaResponse.merchantRequestID,
        suspiciousActivity: false,
        securityFlag: null,
      },
    });

    if (stored.count !== 1) {
      throw new MpesaRequestError(
        "M-Pesa accepted the request, but its identifiers could not be persisted.",
        true,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment initiated successfully. Complete the prompt on your phone.",
        checkoutRequestID: mpesaResponse.checkoutRequestID,
        merchantRequestID: mpesaResponse.merchantRequestID,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (bookingId && initiationToken) {
      if (error instanceof MpesaRequestError && error.outcomeUnknown) {
        await prisma.booking.updateMany({
          where: { id: bookingId, mpesaInitiationToken: initiationToken },
          data: {
            suspiciousActivity: true,
            securityFlag: "MPESA_INITIATION_OUTCOME_UNKNOWN",
          },
        });
      } else {
        await prisma.booking.updateMany({
          where: {
            id: bookingId,
            mpesaInitiationToken: initiationToken,
            mpesaCheckoutRequestId: null,
          },
          data: {
            mpesaInitiationToken: null,
            mpesaInitiatedAt: null,
            mpesaAccountReference: null,
          },
        });
      }
    }

    if (error instanceof MpesaConfigurationError) {
      console.error("M-Pesa configuration error:", error.message);
      return NextResponse.json(
        { error: "M-Pesa is not configured for production payments." },
        { status: 503 },
      );
    }

    console.error("M-Pesa initiation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof MpesaRequestError && error.outcomeUnknown
            ? "The payment request outcome is uncertain. Do not retry this booking; contact support."
            : "Failed to initiate payment. Please try again.",
      },
      { status: 502 },
    );
  }
}
