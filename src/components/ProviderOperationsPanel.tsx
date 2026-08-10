"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OperationBooking = {
  id: string;
  clientName: string;
  clientPhone: string;
  county: string;
  scheduledDate: string;
  notes: string | null;
  status: "ACCEPTED" | "IN_PROGRESS" | "AWAITING_CLIENT_CONFIRMATION";
  paymentStatus: string;
  serviceConfirmed: boolean;
  clientConfirmed: boolean;
  operationStartedAt: string | null;
  operationEndedAt: string | null;
  providerLocationLastSeenAt: string | null;
  providerLocationAccuracyM: number | null;
  providerLocationRiskFlag: string | null;
  providerLocationGapCount: number;
  locationActive: boolean;
};

type OperationsResponse = {
  provider: { id: string; serviceCategory: string };
  bookings: OperationBooking[];
  error?: string;
};

type LocationAction = "start" | "heartbeat";
type TrackingState = "idle" | "starting" | "live" | "warning" | "error";
type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

const HEARTBEAT_INTERVAL_MS = 30_000;
const MINIMUM_CLIENT_SEND_INTERVAL_MS = 20_000;

function positionPayload(
  bookingId: string,
  action: LocationAction,
  position: GeolocationPosition,
  consent = false,
) {
  return {
    bookingId,
    action,
    consent,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyM: position.coords.accuracy,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
  };
}

function getPrecisePosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error("Location safety requires a secure HTTPS connection."));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error("This device does not support location tracking."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15_000,
    });
  });
}

function locationErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    if (error.code === 1) {
      return "Precise location permission is required during an active job.";
    }
    if (error.code === 2) {
      return "Your device cannot determine a precise location right now.";
    }
    if (error.code === 3) {
      return "Location acquisition timed out. Move to an area with a clearer GPS signal.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Live location tracking failed.";
}

export default function ProviderOperationsPanel() {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [consentedBookings, setConsentedBookings] = useState<Set<string>>(
    () => new Set(),
  );
  const lastSentAtRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const loadOperations = useCallback(async () => {
    const response = await fetch("/api/provider-operations", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const result = (await response.json()) as OperationsResponse;
    if (!response.ok) {
      throw new Error(result.error || "Could not load provider operations.");
    }
    setData(result);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadOperations()
      .catch((error) => {
        if (mounted) setMessage(locationErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const refresh = window.setInterval(() => {
      void loadOperations().catch(() => undefined);
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [loadOperations]);

  const activeBooking = useMemo(
    () => data?.bookings.find((booking) => booking.status === "IN_PROGRESS"),
    [data],
  );
  const activeBookingId = activeBooking?.id;

  const sendLocation = useCallback(
    async (
      bookingId: string,
      action: LocationAction,
      position: GeolocationPosition,
      consent = false,
      force = false,
    ) => {
      if (
        action === "heartbeat" &&
        !force &&
        Date.now() - lastSentAtRef.current < MINIMUM_CLIENT_SEND_INTERVAL_MS
      ) {
        return;
      }

      const response = await fetch("/api/provider-operations/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          positionPayload(bookingId, action, position, consent),
        ),
      });
      const result = (await response.json()) as {
        error?: string;
        riskFlags?: string[];
      };
      if (!response.ok) {
        throw new Error(result.error || "Location update was rejected.");
      }

      lastSentAtRef.current = Date.now();
      setTrackingState(
        result.riskFlags && result.riskFlags.length > 0 ? "warning" : "live",
      );
      setMessage(
        result.riskFlags && result.riskFlags.length > 0
          ? `Tracking restored with security notice: ${result.riskFlags.join(", ")}.`
          : "Live location security is active.",
      );
    },
    [],
  );

  useEffect(() => {
    if (!activeBookingId) {
      setTrackingState("idle");
      return;
    }

    let cancelled = false;
    let watchId: number | undefined;

    const requestWakeLock = async () => {
      const wakeLock = (navigator as WakeLockNavigator).wakeLock;
      if (!wakeLock || document.visibilityState !== "visible") return;
      try {
        wakeLockRef.current = await wakeLock.request("screen");
      } catch {
        setTrackingState("warning");
      }
    };

    const handlePosition = (position: GeolocationPosition) => {
      if (cancelled) return;
      void sendLocation(activeBookingId, "heartbeat", position).catch(
        (error) => {
          setTrackingState("error");
          setMessage(locationErrorMessage(error));
        },
      );
    };

    const handlePositionError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      setTrackingState("error");
      setMessage(locationErrorMessage(error));
    };

    if (!navigator.geolocation) {
      setTrackingState("error");
      setMessage("This device does not support required location tracking.");
      return;
    }

    setTrackingState("starting");
    void requestWakeLock();
    watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handlePositionError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    const heartbeat = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        handlePositionError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
      );
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          handlePositionError,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
        );
      } else {
        setTrackingState("warning");
        setMessage(
          "Keep Provider Operations visible; background browser tracking can be suspended by your device.",
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [activeBookingId, sendLocation]);

  async function startOperation(bookingId: string) {
    if (!consentedBookings.has(bookingId)) {
      setMessage("Confirm the operational location notice before starting.");
      return;
    }

    setTrackingState("starting");
    setMessage("Acquiring a precise security location…");
    try {
      const position = await getPrecisePosition();
      await sendLocation(bookingId, "start", position, true, true);
      await loadOperations();
    } catch (error) {
      setTrackingState("error");
      setMessage(locationErrorMessage(error));
    }
  }

  async function completeOperation(bookingId: string) {
    setMessage("Validating the final live location…");
    try {
      const position = await getPrecisePosition();
      await sendLocation(bookingId, "heartbeat", position, false, true);
      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "provider", confirmed: true }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Could not complete the operation.");
      }
      setMessage(
        result.message ||
          "Provider completion recorded. Location tracking stopped.",
      );
      await loadOperations();
    } catch (error) {
      setTrackingState("error");
      setMessage(locationErrorMessage(error));
    }
  }

  if (loading) {
    return <p className="mt-8 text-slate-300">Loading secure operations…</p>;
  }

  const statusClass =
    trackingState === "live"
      ? "border-emerald-500 bg-emerald-950 text-emerald-200"
      : trackingState === "error"
        ? "border-red-500 bg-red-950 text-red-200"
        : "border-amber-500 bg-amber-950 text-amber-200";

  return (
    <div className="mt-8 space-y-5">
      {message && (
        <div className={`rounded-md border p-4 ${statusClass}`} role="status">
          {message}
        </div>
      )}

      {data?.bookings.length ? (
        data.bookings.map((booking) => (
          <article
            key={booking.id}
            className="rounded-lg border border-slate-700 bg-white p-5 text-slate-950 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{booking.clientName}</h2>
                <p>{booking.clientPhone}</p>
                <p>{booking.county}</p>
                <p>{new Date(booking.scheduledDate).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                {booking.status.replaceAll("_", " ")}
              </span>
            </div>

            {booking.notes && (
              <p className="mt-3 text-slate-700">{booking.notes}</p>
            )}

            {booking.status === "ACCEPTED" && (
              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 rounded-md bg-slate-100 p-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={consentedBookings.has(booking.id)}
                    onChange={(event) => {
                      setConsentedBookings((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(booking.id);
                        else next.delete(booking.id);
                        return next;
                      });
                    }}
                  />
                  <span>
                    I consent to precise location collection throughout this
                    operation for safety, integrity checks, and authorized
                    security oversight.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => void startOperation(booking.id)}
                  className="min-h-11 rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  Start tracked operation
                </button>
              </div>
            )}

            {booking.status === "IN_PROGRESS" && (
              <div className="mt-5 space-y-3">
                <p className="font-semibold">
                  Location:{" "}
                  {booking.locationActive ? "live" : "awaiting heartbeat"}
                </p>
                <p className="text-sm text-slate-700">
                  Last update:{" "}
                  {booking.providerLocationLastSeenAt
                    ? new Date(
                        booking.providerLocationLastSeenAt,
                      ).toLocaleTimeString()
                    : "none"}
                  {booking.providerLocationAccuracyM
                    ? ` · ±${Math.round(booking.providerLocationAccuracyM)} m`
                    : ""}
                </p>
                {booking.providerLocationGapCount > 0 && (
                  <p className="text-sm font-semibold text-amber-700">
                    Tracking interruptions recorded:{" "}
                    {booking.providerLocationGapCount}
                  </p>
                )}
                {booking.providerLocationRiskFlag && (
                  <p className="text-sm font-semibold text-red-700">
                    Security signal: {booking.providerLocationRiskFlag}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void completeOperation(booking.id)}
                  className="min-h-11 rounded-md bg-slate-900 px-5 py-2 font-semibold text-white hover:bg-slate-700"
                >
                  Complete work and stop tracking
                </button>
              </div>
            )}

            {booking.status === "AWAITING_CLIENT_CONFIRMATION" && (
              <p className="mt-5 rounded-md bg-emerald-50 p-3 font-medium text-emerald-900">
                Work completion recorded and location tracking stopped. Waiting
                for the client&apos;s confirmation.
              </p>
            )}
          </article>
        ))
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-300">
          No paid provider operations are ready to start.
        </div>
      )}
    </div>
  );
}
