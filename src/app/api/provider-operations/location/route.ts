import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedAppUserId } from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";
import {
  decryptProviderCoordinates,
  distanceBetweenCoordinates,
  encryptProviderCoordinates,
  LOCATION_CAPTURE_FUTURE_TOLERANCE_MS,
  LOCATION_CAPTURE_MAX_AGE_MS,
  LOCATION_HEARTBEAT_INTERVAL_MS,
  LOCATION_MAXIMUM_ACCURACY_M,
  LOCATION_MAXIMUM_PLAUSIBLE_SPEED_MPS,
  LOCATION_MINIMUM_WRITE_INTERVAL_MS,
  LOCATION_START_MAXIMUM_ACCURACY_M,
  type ProviderCoordinates,
} from "@/lib/location/providerLocationSecurity";
import {
  readBoundedJsonObject,
  readTextInput,
  RequestInputError,
} from "@/lib/verification/requestGuards";

const GAP_DETECTION_MS = LOCATION_HEARTBEAT_INTERVAL_MS * 2;

function isTrustedMutationRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    return fetchSite === "same-origin" || process.env.NODE_ENV !== "production";
  }

  try {
    const trustedOrigins = new Set([new URL(request.url).origin]);
    const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (publicUrl) trustedOrigins.add(new URL(publicUrl).origin);

    return trustedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function readFiniteNumber(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RequestInputError(`${field} must be a finite number.`);
  }
  return value;
}

function readCoordinates(body: Record<string, unknown>) {
  const latitude = readFiniteNumber(body, "latitude");
  const longitude = readFiniteNumber(body, "longitude");
  const accuracyM = readFiniteNumber(body, "accuracyM");

  if (latitude < -90 || latitude > 90) {
    throw new RequestInputError("latitude is outside the valid range.");
  }
  if (longitude < -180 || longitude > 180) {
    throw new RequestInputError("longitude is outside the valid range.");
  }
  if (accuracyM <= 0 || accuracyM > LOCATION_MAXIMUM_ACCURACY_M) {
    throw new RequestInputError(
      `Location accuracy must be within ${LOCATION_MAXIMUM_ACCURACY_M} metres.`,
    );
  }

  const capturedAtValue = readTextInput(body, "capturedAt", 64);
  const capturedAt = new Date(capturedAtValue);
  const ageMs = Date.now() - capturedAt.getTime();
  if (
    !capturedAtValue ||
    Number.isNaN(capturedAt.getTime()) ||
    ageMs > LOCATION_CAPTURE_MAX_AGE_MS ||
    ageMs < -LOCATION_CAPTURE_FUTURE_TOLERANCE_MS
  ) {
    throw new RequestInputError("Location capture is stale or invalid.");
  }

  return {
    coordinates: { latitude, longitude } satisfies ProviderCoordinates,
    accuracyM,
    capturedAt,
  };
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json(
      { error: "Cross-site location updates are not allowed." },
      { status: 403 },
    );
  }

  try {
    const body = await readBoundedJsonObject(request, 4_096);
    const bookingId = readTextInput(body, "bookingId", 64);
    const action = readTextInput(body, "action", 16);
    if (!bookingId || (action !== "start" && action !== "heartbeat")) {
      return NextResponse.json(
        { error: "A valid bookingId and location action are required." },
        { status: 400 },
      );
    }

    const { coordinates, accuracyM, capturedAt } = readCoordinates(body);
    if (
      action === "start" &&
      (body.consent !== true || accuracyM > LOCATION_START_MAXIMUM_ACCURACY_M)
    ) {
      return NextResponse.json(
        {
          error: `Starting an operation requires explicit consent and location accuracy within ${LOCATION_START_MAXIMUM_ACCURACY_M} metres.`,
        },
        { status: 422 },
      );
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });
    if (!provider || provider.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "An approved provider profile is required." },
        { status: 403 },
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, providerProfileId: provider.id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        serviceConfirmed: true,
        operationStartedAt: true,
        operationEndedAt: true,
        providerLocationLastSeenAt: true,
        providerLocationCapturedAt: true,
        providerLocationAccuracyM: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.paymentStatus !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment must be completed before an operation can start." },
        { status: 409 },
      );
    }

    const encryptedCoordinates = encryptProviderCoordinates(coordinates);
    const receivedAt = new Date();

    if (action === "start") {
      if (booking.status !== "ACCEPTED" || booking.operationStartedAt) {
        return NextResponse.json(
          { error: "This booking cannot start an operation." },
          { status: 409 },
        );
      }

      const otherActiveOperation = await prisma.booking.findFirst({
        where: {
          providerProfileId: provider.id,
          id: { not: booking.id },
          operationStartedAt: { not: null },
          operationEndedAt: null,
        },
        select: { id: true },
      });
      if (otherActiveOperation) {
        return NextResponse.json(
          { error: "Finish the current operation before starting another." },
          { status: 409 },
        );
      }

      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "IN_PROGRESS",
            operationStartedAt: receivedAt,
            operationEndedAt: null,
            providerLocationConsentAt: receivedAt,
            providerLocationLastSeenAt: receivedAt,
            providerLocationCapturedAt: capturedAt,
            providerLocationAccuracyM: accuracyM,
            providerLocationRiskFlag: null,
            providerLocationGapCount: 0,
          },
        }),
        prisma.providerLocationEvent.create({
          data: {
            bookingId: booking.id,
            providerProfileId: provider.id,
            capturedAt,
            receivedAt,
            accuracyM,
            encryptedCoordinates,
            eventType: "START",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: "IN_PROGRESS",
        locationActive: true,
        nextHeartbeatDueAt: new Date(
          receivedAt.getTime() + LOCATION_HEARTBEAT_INTERVAL_MS,
        ).toISOString(),
      });
    }

    if (
      booking.status !== "IN_PROGRESS" ||
      !booking.operationStartedAt ||
      booking.operationEndedAt ||
      booking.serviceConfirmed
    ) {
      return NextResponse.json(
        { error: "Location heartbeats require an active operation." },
        { status: 409 },
      );
    }

    if (
      booking.providerLocationCapturedAt &&
      capturedAt <= booking.providerLocationCapturedAt
    ) {
      return NextResponse.json(
        { error: "Location capture must be newer than the previous update." },
        { status: 409 },
      );
    }

    if (
      booking.providerLocationLastSeenAt &&
      receivedAt.getTime() - booking.providerLocationLastSeenAt.getTime() <
        LOCATION_MINIMUM_WRITE_INTERVAL_MS
    ) {
      return NextResponse.json({
        success: true,
        stored: false,
        locationActive: true,
      });
    }

    const riskFlags: string[] = [];
    const gapDetected = Boolean(
      booking.providerLocationLastSeenAt &&
      receivedAt.getTime() - booking.providerLocationLastSeenAt.getTime() >
        GAP_DETECTION_MS,
    );
    if (gapDetected) riskFlags.push("LOCATION_GAP");
    if (accuracyM > LOCATION_START_MAXIMUM_ACCURACY_M) {
      riskFlags.push("LOW_ACCURACY");
    }

    const previousLocation = await prisma.providerLocationEvent.findFirst({
      where: {
        bookingId: booking.id,
        eventType: { in: ["START", "HEARTBEAT"] },
      },
      orderBy: { capturedAt: "desc" },
      select: {
        capturedAt: true,
        accuracyM: true,
        encryptedCoordinates: true,
      },
    });

    if (previousLocation) {
      const previousCoordinates = decryptProviderCoordinates(
        previousLocation.encryptedCoordinates,
      );
      const elapsedSeconds =
        (capturedAt.getTime() - previousLocation.capturedAt.getTime()) / 1_000;
      const rawDistanceM = distanceBetweenCoordinates(
        previousCoordinates,
        coordinates,
      );
      const effectiveDistanceM = Math.max(
        0,
        rawDistanceM - previousLocation.accuracyM - accuracyM,
      );
      const speedMps = effectiveDistanceM / Math.max(elapsedSeconds, 1);

      if (
        effectiveDistanceM > 1_000 &&
        speedMps > LOCATION_MAXIMUM_PLAUSIBLE_SPEED_MPS
      ) {
        await prisma.$transaction([
          prisma.providerLocationEvent.create({
            data: {
              bookingId: booking.id,
              providerProfileId: provider.id,
              capturedAt,
              receivedAt,
              accuracyM,
              encryptedCoordinates,
              eventType: "REJECTED",
              riskFlags: ["IMPOSSIBLE_SPEED"],
            },
          }),
          prisma.booking.update({
            where: { id: booking.id },
            data: {
              suspiciousActivity: true,
              securityFlag: "IMPOSSIBLE_PROVIDER_LOCATION_SPEED",
              providerLocationRiskFlag: "IMPOSSIBLE_SPEED",
            },
          }),
        ]);

        return NextResponse.json(
          { error: "Location update failed movement-integrity checks." },
          { status: 422 },
        );
      }
    }

    await prisma.$transaction([
      prisma.providerLocationEvent.create({
        data: {
          bookingId: booking.id,
          providerProfileId: provider.id,
          capturedAt,
          receivedAt,
          accuracyM,
          encryptedCoordinates,
          eventType: "HEARTBEAT",
          riskFlags,
        },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          providerLocationLastSeenAt: receivedAt,
          providerLocationCapturedAt: capturedAt,
          providerLocationAccuracyM: accuracyM,
          providerLocationRiskFlag:
            riskFlags.length > 0 ? riskFlags.join(",") : null,
          providerLocationGapCount: gapDetected ? { increment: 1 } : undefined,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stored: true,
      locationActive: true,
      riskFlags,
      nextHeartbeatDueAt: new Date(
        receivedAt.getTime() + LOCATION_HEARTBEAT_INTERVAL_MS,
      ).toISOString(),
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Only one provider operation can be active at a time." },
        { status: 409 },
      );
    }
    console.error("Provider location update failed:", error);
    return NextResponse.json(
      { error: "Provider location security is temporarily unavailable." },
      { status: 503 },
    );
  }
}
