import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { mpesaService } from "@/lib/mpesa/mpesaService";
import { prisma } from "@/lib/prisma";
import { validateServiceAmount } from "@/lib/pricing/profitEngine";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to initiate payments." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber, bookingId } = body;

    // Validate required fields
    if (!phoneNumber || !bookingId) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, bookingId" },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!mpesaService.validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use Kenyan format (07XXXXXXXX or +254XXXXXXXXX)" },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const amountValidation = validateServiceAmount(booking.amount);
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 });
    }

    // Initiate MPesa STK Push
    const mpesaResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amountValidation.amount,
      bookingId
    );

    // Update booking with payment details
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        amount: amountValidation.amount,
        mpesaPhoneNumber: mpesaService.formatPhoneNumber(phoneNumber),
        mpesaCheckoutRequestId: mpesaResponse.checkoutRequestID,
        mpesaMerchantRequestId: mpesaResponse.merchantRequestID,
        paymentMethod: "MPESA",
        paymentStatus: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment initiated successfully. Please complete payment on your phone.",
      checkoutRequestID: mpesaResponse.checkoutRequestID,
      merchantRequestID: mpesaResponse.merchantRequestID,
    }, { status: 200 });

  } catch (error) {
    console.error("MPesa initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment. Please try again." },
      { status: 500 }
    );
  }
}
