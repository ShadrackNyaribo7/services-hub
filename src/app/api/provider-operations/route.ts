import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLocationFresh } from "@/lib/location/providerLocationSecurity";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
      serviceCategory: true,
      bookings: {
        where: {
          status: {
            in: ["ACCEPTED", "IN_PROGRESS", "AWAITING_CLIENT_CONFIRMATION"],
          },
        },
        orderBy: { scheduledDate: "asc" },
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          county: true,
          scheduledDate: true,
          notes: true,
          status: true,
          paymentStatus: true,
          serviceConfirmed: true,
          clientConfirmed: true,
          operationStartedAt: true,
          operationEndedAt: true,
          providerLocationLastSeenAt: true,
          providerLocationAccuracyM: true,
          providerLocationRiskFlag: true,
          providerLocationGapCount: true,
        },
      },
    },
  });

  if (!provider || provider.verificationStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "An approved provider profile is required." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      provider: {
        id: provider.id,
        serviceCategory: provider.serviceCategory,
      },
      bookings: provider.bookings.map((booking) => ({
        ...booking,
        locationActive:
          booking.status === "IN_PROGRESS" &&
          !booking.serviceConfirmed &&
          isLocationFresh(booking.providerLocationLastSeenAt),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
