import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUserId } from "@/lib/auth/providerMobileSession";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";
import {
  isLocationFresh,
  LOCATION_FRESHNESS_LIMIT_MS,
} from "@/lib/location/providerLocationSecurity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const userId = await getAuthenticatedAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookingId } = await params;
    if (!bookingId || bookingId.length > 64) {
      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 },
      );
    }

    const body = await readBoundedJsonObject(request, 2_048);
    const role = readTextInput(body, "role", 16);
    if (
      (role !== "provider" && role !== "client") ||
      typeof body.confirmed !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            'role must be "provider" or "client", and confirmed must be boolean.',
        },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        clientUserId: true,
        paymentStatus: true,
        status: true,
        serviceConfirmed: true,
        clientConfirmed: true,
        operationStartedAt: true,
        operationEndedAt: true,
        providerLocationLastSeenAt: true,
        providerProfile: { select: { userId: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const ownsRole =
      role === "client"
        ? booking.clientUserId === userId
        : booking.providerProfile.userId === userId;
    if (!ownsRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.paymentStatus !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment must be completed before confirmation" },
        { status: 400 },
      );
    }

    const confirmed = body.confirmed;
    if (role === "provider" && !confirmed && booking.serviceConfirmed) {
      return NextResponse.json(
        { error: "A provider-completed operation cannot be reopened." },
        { status: 409 },
      );
    }
    if (booking.status === "COMPLETED") {
      const alreadyConfirmed =
        role === "provider"
          ? booking.serviceConfirmed === confirmed
          : booking.clientConfirmed === confirmed;
      if (!alreadyConfirmed) {
        return NextResponse.json(
          { error: "A completed booking cannot be reopened." },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        serviceComplete: true,
        message: "Both parties confirmed service completion.",
      });
    }

    if (confirmed && !booking.operationStartedAt) {
      return NextResponse.json(
        { error: "The provider must start the tracked operation first." },
        { status: 409 },
      );
    }

    if (
      role === "provider" &&
      confirmed &&
      !booking.serviceConfirmed &&
      (booking.status !== "IN_PROGRESS" ||
        !isLocationFresh(booking.providerLocationLastSeenAt))
    ) {
      return NextResponse.json(
        {
          error: `A live provider location update is required within ${Math.round(LOCATION_FRESHNESS_LIMIT_MS / 1_000)} seconds of completion.`,
        },
        { status: 409 },
      );
    }

    const confirmationTime = confirmed ? new Date() : null;
    await prisma.booking.update({
      where: { id: bookingId },
      data:
        role === "provider"
          ? {
              serviceConfirmed: confirmed,
              serviceConfirmedAt: confirmationTime,
              operationEndedAt: confirmationTime,
              status: confirmed
                ? booking.clientConfirmed
                  ? "COMPLETED"
                  : "AWAITING_CLIENT_CONFIRMATION"
                : "IN_PROGRESS",
            }
          : {
              clientConfirmed: confirmed,
              clientConfirmedAt: confirmationTime,
            },
    });

    const latest = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        serviceConfirmed: true,
        clientConfirmed: true,
        ratingEligibleAt: true,
      },
    });
    const serviceComplete = Boolean(
      latest?.serviceConfirmed && latest.clientConfirmed,
    );
    if (serviceComplete) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "COMPLETED",
          operationEndedAt: booking.operationEndedAt ?? new Date(),
          ratingEligibleAt: latest?.ratingEligibleAt ?? new Date(),
        },
      });
    } else if (role === "client" && booking.serviceConfirmed) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "AWAITING_CLIENT_CONFIRMATION" },
      });
    }

    return NextResponse.json({
      success: true,
      serviceComplete,
      message: serviceComplete
        ? "Both parties confirmed service completion."
        : "Confirmation recorded successfully.",
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Error confirming booking:", error);
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 },
    );
  }
}
