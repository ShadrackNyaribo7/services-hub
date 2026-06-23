import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "You must be signed in to book." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { providerProfileId, clientName, clientPhone, county, scheduledDate, notes, amount, mpesaPhoneNumber } = body;

    if (!providerProfileId || !clientName || !clientPhone || !county || !scheduledDate) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        providerProfileId,
        clientName,
        clientPhone,
        county,
        scheduledDate: new Date(scheduledDate),
        notes,
        amount: amount || undefined,
        mpesaPhoneNumber: mpesaPhoneNumber || undefined,
        paymentMethod: amount && mpesaPhoneNumber ? "MPESA" : undefined,
        paymentStatus: amount && mpesaPhoneNumber ? "PENDING" : "PENDING",
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }
}