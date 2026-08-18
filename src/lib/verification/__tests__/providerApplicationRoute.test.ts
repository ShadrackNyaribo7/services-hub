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
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    providerProfile: {
      findFirst: jest.fn(),
    },
    mobileVerificationChallenge: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    providerMobileSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/provider-applications/route";

const authMock = jest.mocked(auth);
const transactionMock = jest.mocked(prisma.$transaction);
const userFindUniqueMock = jest.mocked(prisma.user.findUnique);
const userUpsertMock = jest.mocked(prisma.user.upsert);
const providerFindFirstMock = jest.mocked(prisma.providerProfile.findFirst);
const challengeFindUniqueMock = jest.mocked(
  prisma.mobileVerificationChallenge.findUnique,
);
const challengeUpdateManyMock = jest.mocked(
  prisma.mobileVerificationChallenge.updateMany,
);
const transactionImplementation = async (
  callback: (transaction: typeof prisma) => Promise<unknown>,
) => callback(prisma);

function validApplication(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Jane Wanjiku Doe",
    phone: "0712345678",
    county: "Nairobi",
    serviceCategory: "Mechanic",
    idNumber: "28745163",
    idNumberConfirmation: "28745163",
    identityDocumentName: "DOE JANE WANJIKU",
    policeClearanceNumber: "PCC-739152",
    policeClearanceNumberConfirmation: "PCC-739152",
    policeClearanceName: "Jane Wanjiku Doe",
    certificationNumber: "NITA/GTT/73915",
    certificationNumberConfirmation: "NITA/GTT/73915",
    certificationHolderName: "Jane Wanjiku Doe",
    certificationIssuer: "NITA",
    certificationName: "Motor Vehicle Mechanic I",
    verificationConsent: true,
    ...overrides,
  };
}

function request(body: Record<string, unknown>) {
  return new Request("https://example.test/api/provider-applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/provider-applications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OFFLINE_VERIFICATION_SECRET =
      "test-only-offline-evidence-secret-32-characters";
    authMock.mockResolvedValue({ userId: "user-1" } as never);
    (
      transactionMock as unknown as jest.MockedFunction<
        typeof transactionImplementation
      >
    ).mockImplementation(transactionImplementation);
    userFindUniqueMock.mockResolvedValue(null);
    providerFindFirstMock.mockResolvedValue(null);
    challengeFindUniqueMock.mockResolvedValue(null);
    challengeUpdateManyMock.mockResolvedValue({ count: 1 } as never);
    userUpsertMock.mockResolvedValue({
      id: "user-1",
      name: "Jane Wanjiku Doe",
      phone: "+254712345678",
      role: "PROVIDER",
      providerProfile: { id: "provider-1", verificationStatus: "APPROVED" },
    } as never);
  });

  it("automatically approves valid sealed offline evidence", async () => {
    const response = await POST(request(validApplication()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.qualificationCheck.autoApproved).toBe(true);
    expect(body.qualificationCheck.recommendedStatus).toBe("APPROVED");
    expect(body.message).toContain("No live government");
    expect(userUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          phone: "+254712345678",
          providerProfile: expect.objectContaining({
            upsert: expect.objectContaining({
              update: expect.objectContaining({
                verificationStatus: "APPROVED",
                identityVerificationLevel: "SELF_ATTESTED",
                policeVerificationLevel: "SELF_ATTESTED",
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("rejects mismatched repeated evidence before accessing the database", async () => {
    const response = await POST(
      request(validApplication({ idNumberConfirmation: "28745164" })),
    );

    expect(response.status).toBe(422);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(userUpsertMock).not.toHaveBeenCalled();
  });

  it("rejects locally replayed document identifiers", async () => {
    providerFindFirstMock.mockResolvedValue({ id: "provider-2" } as never);

    const response = await POST(request(validApplication()));

    expect(response.status).toBe(409);
    expect(userUpsertMock).not.toHaveBeenCalled();
  });

  it("records independently confirmed M-Pesa verification", async () => {
    const token = "a".repeat(43);
    challengeFindUniqueMock.mockResolvedValue({
      id: "mobile-challenge-1",
      tokenHash: expect.any(String),
      phone: "+254712345678",
      purpose: "PROVIDER_APPLICATION",
      status: "VERIFIED",
      verifiedAt: new Date(),
      consumedAt: null,
    } as never);

    const response = await POST(
      request(
        validApplication({
          phoneVerificationRequested: true,
          phoneVerificationToken: token,
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(challengeUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "mobile-challenge-1",
          consumedAt: null,
        }),
      }),
    );
    expect(userUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          providerProfile: expect.objectContaining({
            upsert: expect.objectContaining({
              update: expect.objectContaining({
                phoneVerifiedAt: expect.any(Date),
                phoneVerificationMethod: "MPESA_STK_CONFIRMATION",
                phoneVerificationSource: "SAFARICOM_DARAJA",
                phoneVerificationReference: "mobile-challenge-1",
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("rejects a mobile verification claim without a valid challenge", async () => {
    const token = "a".repeat(43);
    challengeFindUniqueMock.mockResolvedValue(null);

    const response = await POST(
      request(
        validApplication({
          phoneVerificationRequested: true,
          phoneVerificationToken: token,
        }),
      ),
    );

    expect(response.status).toBe(422);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(userUpsertMock).not.toHaveBeenCalled();
  });

  it("returns the saved application when a successful response is retried", async () => {
    const token = "b".repeat(43);
    challengeFindUniqueMock.mockResolvedValue({
      id: "mobile-challenge-retry",
      tokenHash: expect.any(String),
      phone: "+254712345678",
      purpose: "PROVIDER_APPLICATION",
      status: "VERIFIED",
      verifiedAt: new Date(),
      consumedAt: new Date(),
    } as never);
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      name: "Jane Wanjiku Doe",
      phone: "+254712345678",
      role: "PROVIDER",
      providerProfile: {
        id: "provider-1",
        verificationStatus: "APPROVED",
        phoneVerificationReference: "mobile-challenge-retry",
      },
    } as never);

    const response = await POST(
      request(
        validApplication({
          phoneVerificationRequested: true,
          phoneVerificationToken: token,
        }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("already submitted and approved");
    expect(transactionMock).not.toHaveBeenCalled();
    expect(userUpsertMock).not.toHaveBeenCalled();
  });

  it("requires authentication before parsing applicant evidence", async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const response = await POST(request(validApplication()));

    expect(response.status).toBe(401);
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });
});
