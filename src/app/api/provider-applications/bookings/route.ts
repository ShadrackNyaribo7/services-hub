import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateMarketplaceProfit,
  validateServiceAmount,
} from "@/lib/pricing/profitEngine";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to book." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      providerProfileId,
      clientName,
      clientPhone,
      county,
      scheduledDate,
      notes,
      amount,
      mpesaPhoneNumber,
    } = body;

    if (!providerProfileId || !clientName || !clientPhone || !county || !scheduledDate) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const amountValidation = validateServiceAmount(amount);
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 });
    }

    const providerProfile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: {
        id: true,
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

    const profit = calculateMarketplaceProfit({
      amount: amountValidation.amount,
      serviceCategory: providerProfile.serviceCategory,
    });

    const booking = await prisma.booking.create({
      data: {
        providerProfileId,
        clientName,
        clientPhone,
        county,
        scheduledDate: new Date(scheduledDate),
        notes,
        amount: profit.serviceAmount,
        developerFee: profit.developerFee,
        providerAmount: profit.providerAmount,
        commissionRate: profit.commissionRate,
        grossPlatformFee: profit.grossPlatformFee,
        paymentProcessingFee: profit.paymentProcessingFee,
        mpesaPhoneNumber: mpesaPhoneNumber || undefined,
        paymentMethod: "MPESA",
        paymentStatus: "PENDING",
      },
    });

    return NextResponse.json({ booking, profit }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }
}
