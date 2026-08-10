import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpesaService } from "@/lib/mpesa/mpesaService";
import {
  calculateMarketplaceProfit,
  validateServiceAmount,
} from "@/lib/pricing/profitEngine";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

const MAXIMUM_ADVANCE_BOOKING_DAYS = 366;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to book." },
      { status: 401 },
    );
  }

  try {
    const body = await readBoundedJsonObject(request);
    const providerProfileId = readTextInput(body, "providerProfileId", 64);
    const clientName = readTextInput(body, "clientName", 120);
    const clientPhone = mpesaService.formatPhoneNumber(
      readTextInput(body, "clientPhone", 24),
    );
    const mpesaPhoneNumber = mpesaService.formatPhoneNumber(
      readTextInput(body, "mpesaPhoneNumber", 24),
    );
    const county = readTextInput(body, "county", 80);
    const scheduledDateValue = readTextInput(body, "scheduledDate", 64);
    const notes = readTextInput(body, "notes", 2_000);

    if (
      !providerProfileId ||
      !clientName ||
      !county ||
      !scheduledDateValue ||
      !clientPhone ||
      !mpesaPhoneNumber
    ) {
      return NextResponse.json(
        { error: "Missing required booking fields." },
        { status: 400 },
      );
    }

    if (
      !mpesaService.validatePhoneNumber(clientPhone) ||
      !mpesaService.validatePhoneNumber(mpesaPhoneNumber)
    ) {
      return NextResponse.json(
        { error: "Enter valid Kenyan mobile and M-Pesa phone numbers." },
        { status: 422 },
      );
    }

    const scheduledDate = new Date(scheduledDateValue);
    const latestAllowedDate = new Date(
      Date.now() + MAXIMUM_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000,
    );
    if (
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate <= new Date() ||
      scheduledDate > latestAllowedDate
    ) {
      return NextResponse.json(
        { error: "Choose a valid future booking date within one year." },
        { status: 422 },
      );
    }

    const amountValidation = validateServiceAmount(body.amount);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error },
        { status: 400 },
      );
    }

    const providerProfile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: {
        id: true,
        userId: true,
        serviceCategory: true,
        verificationStatus: true,
      },
    });

    if (!providerProfile || providerProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Provider is not available for booking." },
        { status: 404 },
      );
    }

    if (providerProfile.userId === userId) {
      return NextResponse.json(
        { error: "Providers cannot create bookings with themselves." },
        { status: 409 },
      );
    }

    const profit = calculateMarketplaceProfit({
      amount: amountValidation.amount,
      serviceCategory: providerProfile.serviceCategory,
    });

    const booking = await prisma.booking.create({
      data: {
        providerProfileId,
        clientUserId: userId,
        clientName,
        clientPhone,
        county,
        scheduledDate,
        notes: notes || null,
        amount: profit.serviceAmount,
        developerFee: profit.developerFee,
        providerAmount: profit.providerAmount,
        commissionRate: profit.commissionRate,
        grossPlatformFee: profit.grossPlatformFee,
        paymentProcessingFee: profit.paymentProcessingFee,
        mpesaPhoneNumber,
        paymentMethod: "MPESA",
        paymentStatus: "PENDING",
      },
    });

    return NextResponse.json({ booking, profit }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Could not create booking." },
      { status: 500 },
    );
  }
}
