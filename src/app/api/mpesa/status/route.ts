import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to check payment status." },
      { status: 401 },
    );
  }

  try {
    const bookingId = new URL(request.url).searchParams
      .get("bookingId")
      ?.trim();
    if (!bookingId || bookingId.length > 64) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientUserId: userId },
      select: {
        paymentStatus: true,
        amount: true,
        mpesaReceiptNumber: true,
        mpesaTransactionId: true,
        paymentMethod: true,
        paymentCreatedAt: true,
        securityFlag: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 },
    );
  }
}
