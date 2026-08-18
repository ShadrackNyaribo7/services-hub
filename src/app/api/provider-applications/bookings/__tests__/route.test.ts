import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: { findUnique: jest.fn() },
    providerService: { findFirst: jest.fn() },
    booking: { create: jest.fn() },
  },
}));
jest.mock("@/lib/mpesa/mpesaService", () => ({
  mpesaService: {
    formatPhoneNumber: jest.fn((value: string) =>
      value.startsWith("0") ? `+254${value.slice(1)}` : value,
    ),
    validatePhoneNumber: jest.fn(() => true),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { POST } from "@/app/api/provider-applications/bookings/route";
import { prisma } from "@/lib/prisma";

const authMock = jest.mocked(auth);
const providerFindUniqueMock = jest.mocked(prisma.providerProfile.findUnique);
const providerServiceFindFirstMock = jest.mocked(
  prisma.providerService.findFirst,
);
const bookingCreateMock = jest.mocked(prisma.booking.create);

function request(overrides: Record<string, unknown> = {}) {
  return new Request(
    "https://example.test/api/provider-applications/bookings",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerProfileId: "provider-1",
        providerServiceId: "service-1",
        clientName: "John Kamau",
        clientPhone: "0712345678",
        county: "Nairobi",
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: "Apartment 4B",
        mpesaPhoneNumber: "0712345678",
        amount: 99_999,
        ...overrides,
      }),
    },
  );
}

describe("POST /api/provider-applications/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ userId: "client-1" } as never);
    providerFindUniqueMock.mockResolvedValue({
      id: "provider-1",
      userId: "provider-user-1",
      serviceCategory: "Cleaning",
      verificationStatus: "APPROVED",
      servicesConfirmedAt: new Date(),
    } as never);
    providerServiceFindFirstMock.mockResolvedValue({
      id: "service-1",
      name: "Sofa deep cleaning",
      priceKes: 2500,
    } as never);
    bookingCreateMock.mockResolvedValue({ id: "booking-1" } as never);
  });

  it("uses the provider-confirmed database price instead of client input", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(providerServiceFindFirstMock).toHaveBeenCalledWith({
      where: { id: "service-1", providerProfileId: "provider-1" },
      select: { id: true, name: true, priceKes: true },
    });
    expect(bookingCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerProfileId: "provider-1",
        providerServiceId: "service-1",
        serviceName: "Sofa deep cleaning",
        amount: 2500,
      }),
    });
  });

  it("rejects a service that does not belong to the selected provider", async () => {
    providerServiceFindFirstMock.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });

  it("requires the provider to have confirmed a service menu", async () => {
    providerFindUniqueMock.mockResolvedValue({
      id: "provider-1",
      userId: "provider-user-1",
      serviceCategory: "Cleaning",
      verificationStatus: "APPROVED",
      servicesConfirmedAt: null,
    } as never);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(providerServiceFindFirstMock).not.toHaveBeenCalled();
    expect(bookingCreateMock).not.toHaveBeenCalled();
  });
});
