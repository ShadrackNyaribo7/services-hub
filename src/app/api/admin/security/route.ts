import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminIdentity } from "@/lib/auth/adminAccess";
import { prisma } from "@/lib/prisma";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";
import { isLocationFresh } from "@/lib/location/providerLocationSecurity";

const MANUAL_SECURITY_FLAGS = new Set([
  "MANUAL_REVIEW",
  "FRAUD_SUSPECTED",
  "PAYMENT_DISPUTE",
]);

async function authorizeAdmin() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 } as const;

  const admin = await getAdminIdentity();
  if (!admin || admin.userId !== userId) {
    return { error: "Forbidden", status: 403 } as const;
  }
  return { admin } as const;
}

export async function GET() {
  const authorization = await authorizeAdmin();
  if ("error" in authorization) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const suspiciousBookings = await prisma.booking.findMany({
      where: { suspiciousActivity: true },
      include: {
        providerProfile: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const totalBookings = await prisma.booking.count();
    const activeOperations = await prisma.booking.findMany({
      where: { status: "IN_PROGRESS", serviceConfirmed: false },
      select: {
        id: true,
        providerProfileId: true,
        providerLocationLastSeenAt: true,
        providerLocationAccuracyM: true,
        providerLocationRiskFlag: true,
        providerLocationGapCount: true,
        providerProfile: { select: { user: { select: { name: true } } } },
      },
      take: 500,
    });
    const locationAlerts = activeOperations
      .filter(
        (booking) =>
          !isLocationFresh(booking.providerLocationLastSeenAt) ||
          Boolean(booking.providerLocationRiskFlag),
      )
      .map((booking) => ({
        bookingId: booking.id,
        providerId: booking.providerProfileId,
        providerName: booking.providerProfile.user.name,
        lastSeenAt: booking.providerLocationLastSeenAt,
        accuracyM: booking.providerLocationAccuracyM,
        riskFlag: booking.providerLocationRiskFlag,
        gapCount: booking.providerLocationGapCount,
        stale: !isLocationFresh(booking.providerLocationLastSeenAt),
      }));
    const suspiciousCount = suspiciousBookings.length;
    const flagGroups = suspiciousBookings.reduce<Record<string, number>>(
      (groups, booking) => {
        const flag = booking.securityFlag || "UNKNOWN";
        groups[flag] = (groups[flag] || 0) + 1;
        return groups;
      },
      {},
    );
    const providerCounts = suspiciousBookings.reduce<Record<string, number>>(
      (groups, booking) => {
        groups[booking.providerProfileId] =
          (groups[booking.providerProfileId] || 0) + 1;
        return groups;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalBookings,
          suspiciousCount,
          activeOperations: activeOperations.length,
          staleOrRiskyLocations: locationAlerts.length,
          suspiciousRate:
            totalBookings > 0
              ? `${((suspiciousCount / totalBookings) * 100).toFixed(2)}%`
              : "0.00%",
          flagGroups,
          repeatOffenders: Object.entries(providerCounts)
            .filter(([, count]) => count > 2)
            .map(([providerId, count]) => ({ providerId, count })),
        },
        locationAlerts,
        suspiciousBookings,
      },
    });
  } catch (error) {
    console.error("Error fetching security data:", error);
    return NextResponse.json(
      { error: "Failed to fetch security data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeAdmin();
  if ("error" in authorization) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const body = await readBoundedJsonObject(request, 4_096);
    const bookingId = readTextInput(body, "bookingId", 64);
    const flag = readTextInput(body, "flag", 32).toUpperCase();
    const reason = readTextInput(body, "reason", 500);
    if (!bookingId || !reason || !MANUAL_SECURITY_FLAGS.has(flag)) {
      return NextResponse.json(
        { error: "A valid booking, security flag, and reason are required." },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { suspiciousActivity: true, securityFlag: flag },
    });
    console.info("Manual booking security flag applied", {
      bookingId,
      flag,
      adminUserId: authorization.admin.userId,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Booking flagged successfully",
      data: booking,
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Error flagging booking:", error);
    return NextResponse.json(
      { error: "Failed to flag booking" },
      { status: 500 },
    );
  }
}
