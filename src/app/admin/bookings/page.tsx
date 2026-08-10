import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminIdentity } from "@/lib/auth/adminAccess";
import { redirect } from "next/navigation";
import {
  decryptProviderCoordinates,
  isLocationFresh,
} from "@/lib/location/providerLocationSecurity";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const admin = await getAdminIdentity();
  if (!admin) redirect("/");
  return admin;
}

async function updateBookingStatus(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  if (!["ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      paymentStatus: true,
      serviceConfirmed: true,
      clientConfirmed: true,
      operationStartedAt: true,
      operationEndedAt: true,
    },
  });
  if (!booking) return;
  if (status === "ACCEPTED" && booking.paymentStatus !== "COMPLETED") return;
  if (
    status === "COMPLETED" &&
    (!booking.serviceConfirmed ||
      !booking.clientConfirmed ||
      !booking.operationStartedAt ||
      !booking.operationEndedAt)
  ) {
    return;
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status: status as "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED",
      operationEndedAt:
        (status === "REJECTED" || status === "CANCELLED") &&
        booking.operationStartedAt &&
        !booking.operationEndedAt
          ? new Date()
          : undefined,
    },
  });

  revalidatePath("/admin/bookings");
}

export default async function AdminBookingsPage() {
  await requireAdmin();
  const bookings = await prisma.booking.findMany({
    include: {
      providerProfile: {
        include: { user: true },
      },
      locationEvents: {
        where: { eventType: { in: ["START", "HEARTBEAT"] } },
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { encryptedCoordinates: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="relative z-10 mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Booking Requests</h1>

        <div className="mt-8 space-y-4">
          {bookings.map((booking) => {
            let latestCoordinates: {
              latitude: number;
              longitude: number;
            } | null = null;
            try {
              if (booking.locationEvents[0]) {
                latestCoordinates = decryptProviderCoordinates(
                  booking.locationEvents[0].encryptedCoordinates,
                );
              }
            } catch {
              latestCoordinates = null;
            }

            return (
              <div key={booking.id} className="rounded-md border bg-white p-5">
                <h2 className="text-xl font-semibold">{booking.clientName}</h2>
                <p>Client phone: {booking.clientPhone}</p>
                <p>Provider: {booking.providerProfile.user.name}</p>
                <p>Service: {booking.providerProfile.serviceCategory}</p>
                <p>County: {booking.county}</p>
                <p>Status: {booking.status}</p>
                <div className="mt-3 rounded-md bg-slate-100 p-3">
                  <p className="font-semibold">Operational location security</p>
                  <p>
                    Tracking:{" "}
                    {booking.status === "IN_PROGRESS"
                      ? isLocationFresh(booking.providerLocationLastSeenAt)
                        ? "LIVE"
                        : "STALE — investigate"
                      : booking.operationStartedAt
                        ? "Operation ended"
                        : "Not started"}
                  </p>
                  <p>
                    Last heartbeat:{" "}
                    {booking.providerLocationLastSeenAt
                      ? booking.providerLocationLastSeenAt.toLocaleString()
                      : "None"}
                  </p>
                  <p>Recorded gaps: {booking.providerLocationGapCount}</p>
                  {booking.providerLocationRiskFlag && (
                    <p className="font-semibold text-red-700">
                      Risk: {booking.providerLocationRiskFlag}
                    </p>
                  )}
                  {latestCoordinates && (
                    <a
                      className="font-semibold text-blue-700 underline"
                      href={`https://www.google.com/maps?q=${latestCoordinates.latitude},${latestCoordinates.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open latest encrypted location
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {["ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"].map(
                    (status) => (
                      <form key={status} action={updateBookingStatus}>
                        <input type="hidden" name="id" value={booking.id} />
                        <input type="hidden" name="status" value={status} />
                        <button className="rounded-md border px-4 py-2 font-semibold">
                          {status}
                        </button>
                      </form>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
