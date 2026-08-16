import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockChallenge = {
  count: jest.fn() as jest.MockedFunction<any>,
  create: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  findUnique: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("@/lib/prisma", () => ({
  prisma: { mobileVerificationChallenge: mockChallenge },
}));

const mockCreateSession = jest.fn() as jest.MockedFunction<any>;
jest.mock("@/lib/auth/providerMobileSession", () => ({
  createProviderMobileSession: mockCreateSession,
  hashOpaqueToken: (token: string) => `hash:${token}`,
}));

import { mpesaService } from "@/lib/mpesa/mpesaService";
import { POST as initiateVerification } from "@/app/api/mobile-verification/initiate/route";
import { POST as checkVerification } from "@/app/api/mobile-verification/status/route";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("independent M-Pesa mobile verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockChallenge).forEach((mock) => mock.mockReset());
    mockCreateSession.mockReset();
  });

  test("normalizes a Kenyan number and initiates a KES 1 challenge", async () => {
    mockChallenge.count.mockResolvedValue(0);
    mockChallenge.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "challenge-1",
        ...data,
      }),
    );
    mockChallenge.update.mockResolvedValue({});
    const initiateSpy = jest
      .spyOn(mpesaService, "initiateSTKPush")
      .mockResolvedValueOnce({
        success: true,
        checkoutRequestID: "checkout-1",
        merchantRequestID: "merchant-1",
        responseCode: "0",
        responseDescription: "Accepted",
      });

    const response = await initiateVerification(
      jsonRequest("http://localhost/api/mobile-verification/initiate", {
        phone: "0712 345 678",
        purpose: "PROVIDER_APPLICATION",
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(202);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(initiateSpy).toHaveBeenCalledWith(
      "+254712345678",
      1,
      "challenge-1",
      expect.stringMatching(/^MV[A-F0-9]{10}$/),
    );
    expect(mockChallenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          mpesaCheckoutRequestId: "checkout-1",
          mpesaMerchantRequestId: "merchant-1",
        },
      }),
    );
    initiateSpy.mockRestore();
  });

  test("rate limits repeated requests before contacting M-Pesa", async () => {
    mockChallenge.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(3);
    const initiateSpy = jest.spyOn(mpesaService, "initiateSTKPush");

    const response = await initiateVerification(
      jsonRequest("http://localhost/api/mobile-verification/initiate", {
        phone: "0712345678",
        purpose: "PROVIDER_SIGN_IN",
      }),
    );

    expect(response.status).toBe(429);
    expect(initiateSpy).not.toHaveBeenCalled();
    initiateSpy.mockRestore();
  });

  test("turns a verified challenge into an HTTP-only provider session", async () => {
    const rawToken = "a".repeat(43);
    mockChallenge.findUnique.mockResolvedValueOnce({
      id: "challenge-1",
      tokenHash: `hash:${rawToken}`,
      phone: "+254712345678",
      purpose: "PROVIDER_SIGN_IN",
      status: "VERIFIED",
      expiresAt: new Date(Date.now() + 60_000),
      verifiedAt: new Date(),
    });
    mockCreateSession.mockResolvedValueOnce({
      userId: "provider-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await checkVerification(
      jsonRequest("http://localhost/api/mobile-verification/status", {
        token: rawToken,
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalledWith(
      "+254712345678",
      "challenge-1",
    );
    expect(result).toMatchObject({
      status: "VERIFIED",
      redirectTo: "/providers/operations",
    });
  });
});
