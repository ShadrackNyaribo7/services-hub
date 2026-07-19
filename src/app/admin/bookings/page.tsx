import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function updateBookingStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  if (!["ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {
    return;
  }

  await prisma.booking.update({
    where: { id },
    data: { status: status as "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED" },
  });

  revalidatePath("/admin/bookings");
}

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      providerProfile: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="relative z-10 mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Booking Requests</h1>

        <div className="mt-8 space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-md border bg-white p-5">
              <h2 className="text-xl font-semibold">{booking.clientName}</h2>
              <p>Client phone: {booking.clientPhone}</p>
              <p>Provider: {booking.providerProfile.user.name}</p>
              <p>Service: {booking.providerProfile.serviceCategory}</p>
              <p>County: {booking.county}</p>
              <p>Status: {booking.status}</p>

              <div className="mt-4 flex flex-wrap gap-3">
                {["ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"].map((status) => (
                  <form key={status} action={updateBookingStatus}>
                    <input type="hidden" name="id" value={booking.id} />
                    <input type="hidden" name="status" value={status} />
                    <button className="rounded-md border px-4 py-2 font-semibold">
                      {status}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
