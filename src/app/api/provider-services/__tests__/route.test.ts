import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ get: jest.fn(() => undefined) })),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    providerProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    providerService: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { PUT } from "@/app/api/provider-services/route";
import { prisma } from "@/lib/prisma";

const authMock = jest.mocked(auth);
const transactionMock = jest.mocked(prisma.$transaction);
const providerFindUniqueMock = jest.mocked(prisma.providerProfile.findUnique);
const providerUpdateMock = jest.mocked(prisma.providerProfile.update);
const serviceDeleteManyMock = jest.mocked(prisma.providerService.deleteMany);
const serviceCreateManyMock = jest.mocked(prisma.providerService.createMany);
const transactionImplementation = async (
  callback: (transaction: typeof prisma) => Promise<unknown>,
) => callback(prisma);

function request(services: unknown) {
  return new Request("https://example.test/api/provider-services", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ services }),
  });
}

describe("PUT /api/provider-services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" } as never);
    providerFindUniqueMock.mockResolvedValue({
      id: "provider-1",
      verificationStatus: "APPROVED",
    } as never);
    (
      transactionMock as unknown as jest.MockedFunction<
        typeof transactionImplementation
      >
    ).mockImplementation(transactionImplementation);
    serviceDeleteManyMock.mockResolvedValue({ count: 1 } as never);
    serviceCreateManyMock.mockResolvedValue({ count: 2 } as never);
    providerUpdateMock.mockResolvedValue({ id: "provider-1" } as never);
  });

  it("atomically replaces and confirms an approved provider's service menu", async () => {
    const response = await PUT(
      request([
        { name: " Sofa   deep cleaning ", priceKes: 2500 },
        { name: "Carpet cleaning", priceKes: "1800" },
      ]),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.services).toEqual([
      { name: "Sofa deep cleaning", priceKes: 2500 },
      { name: "Carpet cleaning", priceKes: 1800 },
    ]);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(serviceDeleteManyMock).toHaveBeenCalledWith({
      where: { providerProfileId: "provider-1" },
    });
    expect(serviceCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          providerProfileId: "provider-1",
          name: "Sofa deep cleaning",
          priceKes: 2500,
        },
        {
          providerProfileId: "provider-1",
          name: "Carpet cleaning",
          priceKes: 1800,
        },
      ],
    });
    expect(providerUpdateMock).toHaveBeenCalledWith({
      where: { id: "provider-1" },
      data: { servicesConfirmedAt: expect.any(Date) },
    });
  });

  it("requires an authenticated provider", async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const response = await PUT(
      request([{ name: "Sofa cleaning", priceKes: 2500 }]),
    );

    expect(response.status).toBe(401);
    expect(providerFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("only lets approved providers confirm services", async () => {
    providerFindUniqueMock.mockResolvedValue({
      id: "provider-1",
      verificationStatus: "PENDING",
    } as never);

    const response = await PUT(
      request([{ name: "Sofa cleaning", priceKes: 2500 }]),
    );

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate names and invalid prices before writing", async () => {
    const duplicateResponse = await PUT(
      request([
        { name: "Sofa cleaning", priceKes: 2500 },
        { name: "sofa cleaning", priceKes: 3000 },
      ]),
    );
    const priceResponse = await PUT(
      request([{ name: "Sofa cleaning", priceKes: 499 }]),
    );

    expect(duplicateResponse.status).toBe(400);
    expect(priceResponse.status).toBe(400);
    expect(providerFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
