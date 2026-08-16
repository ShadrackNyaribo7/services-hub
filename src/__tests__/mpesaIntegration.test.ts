import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrismaBooking = {
  findUnique: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
  findMany: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  updateMany: jest.fn() as jest.MockedFunction<any>,
};

const mockPrismaMobileVerificationChallenge = {
  findUnique: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  updateMany: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: mockPrismaBooking,
    mobileVerificationChallenge: mockPrismaMobileVerificationChallenge,
  },
}));

const mockAuth = jest.fn() as jest.MockedFunction<any>;
jest.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));

import {
  createMpesaAccountReference,
  MpesaConfigurationError,
  MpesaRequestError,
  MpesaService,
  mpesaService,
} from "@/lib/mpesa/mpesaService";
import { POST as initiatePayment } from "@/app/api/mpesa/initiate/route";
import { POST as receiveCallback } from "@/app/api/mpesa/callback/route";
import { GET as getPaymentStatus } from "@/app/api/mpesa/status/route";
import { createMobileVerificationReference } from "@/lib/verification/mobileVerification";

const TEST_ENV = {
  MPESA_CONSUMER_KEY: "test_consumer_key",
  MPESA_CONSUMER_SECRET: "test_consumer_secret",
  MPESA_PASSKEY: "test_passkey",
  MPESA_SHORTCODE: "174379",
  MPESA_ENVIRONMENT: "sandbox",
  NEXT_PUBLIC_API_URL: "http://localhost:3000",
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockDarajaSuccess() {
  mockedAxios.get.mockResolvedValueOnce({
    data: { access_token: "access-token", expires_in: 3600 },
  });
  mockedAxios.post.mockResolvedValueOnce({
    data: {
      ResponseCode: "0",
      ResponseDescription: "Accepted",
      CheckoutRequestID: "ws_CO_123456789",
      MerchantRequestID: "merchant-123",
    },
  });
}

function pendingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking123",
    clientUserId: "client-1",
    providerProfileId: "provider-1",
    amount: 500,
    paymentStatus: "PENDING",
    mpesaPhoneNumber: "254712345678",
    mpesaCheckoutRequestId: "ws_CO_123456789",
    mpesaMerchantRequestId: "merchant-123",
    mpesaAccountReference: createMpesaAccountReference("booking123"),
    mpesaReceiptNumber: null,
    providerProfile: { serviceCategory: "Cleaning" },
    ...overrides,
  };
}

function callbackPayload(overrides: Record<string, unknown> = {}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-123",
        CheckoutRequestID: "ws_CO_123456789",
        ResultCode: 0,
        ResultDesc: "Success",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 500 },
            { Name: "MpesaReceiptNumber", Value: "TST1234567" },
            { Name: "PhoneNumber", Value: "254712345678" },
            {
              Name: "AccountReference",
              Value: createMpesaAccountReference("booking123"),
            },
          ],
        },
        ...overrides,
      },
    },
  };
}

function pendingMobileChallenge(overrides: Record<string, unknown> = {}) {
  return {
    id: "mobile-challenge-1",
    tokenHash: "a".repeat(64),
    phone: "+254712345678",
    purpose: "PROVIDER_APPLICATION",
    status: "PENDING",
    amount: 1,
    accountReference: createMobileVerificationReference("mobile-challenge-1"),
    requestFingerprint: "b".repeat(64),
    mpesaCheckoutRequestId: "ws_CO_mobile_123",
    mpesaMerchantRequestId: "merchant-mobile-123",
    mpesaReceiptNumber: null,
    resultCode: null,
    resultDescription: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1_000),
    verifiedAt: null,
    consumedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mobileCallbackPayload(overrides: Record<string, unknown> = {}) {
  return callbackPayload({
    MerchantRequestID: "merchant-mobile-123",
    CheckoutRequestID: "ws_CO_mobile_123",
    CallbackMetadata: {
      Item: [
        { Name: "Amount", Value: 1 },
        { Name: "MpesaReceiptNumber", Value: "MOBILE12345" },
        { Name: "PhoneNumber", Value: "254712345678" },
        {
          Name: "AccountReference",
          Value: createMobileVerificationReference("mobile-challenge-1"),
        },
      ],
    },
    ...overrides,
  });
}

describe("M-Pesa production hardening", () => {
  beforeEach(() => {
    Object.assign(process.env, TEST_ENV);
    delete process.env.MPESA_CALLBACK_URL;
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.isAxiosError.mockReset();
    Object.values(mockPrismaBooking).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaMobileVerificationChallenge).forEach((mock) =>
      mock.mockReset(),
    );
    mockAuth.mockReset();
    mpesaService.resetTokenCacheForTests();
  });

  describe("service configuration and request construction", () => {
    test("normalizes and validates supported Kenyan M-Pesa numbers", () => {
      expect(mpesaService.formatPhoneNumber("(0712) 345-678")).toBe(
        "254712345678",
      );
      expect(mpesaService.validatePhoneNumber("+254712345678")).toBe(true);
      expect(mpesaService.validatePhoneNumber("0112345678")).toBe(true);
      expect(mpesaService.validatePhoneNumber("0512345678")).toBe(false);
      expect(mpesaService.validatePhoneNumber("25471234567")).toBe(false);
    });

    test("creates deterministic Daraja-safe account references", () => {
      const reference = createMpesaAccountReference("booking123");
      expect(reference).toMatch(/^SH[A-F0-9]{10}$/);
      expect(reference).toHaveLength(12);
      expect(createMpesaAccountReference("booking123")).toBe(reference);
      expect(createMpesaAccountReference("booking124")).not.toBe(reference);
    });

    test("uses Nairobi time and the exact same timestamp in the password", async () => {
      mockDarajaSuccess();
      await mpesaService.initiateSTKPush("0712345678", 500, "booking123");

      const payload = mockedAxios.post.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      const timestamp = String(payload.Timestamp);
      expect(timestamp).toMatch(/^\d{14}$/);
      expect(payload.Password).toBe(
        Buffer.from(`174379test_passkey${timestamp}`).toString("base64"),
      );
    });

    test("sends bounded requests with a callback and Daraja-safe text fields", async () => {
      mockDarajaSuccess();
      const result = await mpesaService.initiateSTKPush(
        "0712345678",
        500,
        "booking123",
      );

      expect(result.checkoutRequestID).toBe("ws_CO_123456789");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        expect.objectContaining({ timeout: 10_000 }),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        expect.objectContaining({
          Amount: 500,
          PartyA: "254712345678",
          PhoneNumber: "254712345678",
          CallBackURL: "http://localhost:3000/api/mpesa/callback",
          AccountReference: createMpesaAccountReference("booking123"),
          TransactionDesc: "ServiceHub",
        }),
        expect.objectContaining({ timeout: 20_000 }),
      );
    });

    test("uses only the production host when production is configured", async () => {
      process.env.MPESA_ENVIRONMENT = "production";
      process.env.MPESA_CALLBACK_URL =
        "https://serviceshub.co.ke/api/mpesa/callback";
      mockDarajaSuccess();

      await new MpesaService().initiateSTKPush("0712345678", 500, "booking123");

      expect(mockedAxios.get.mock.calls[0][0]).toContain(
        "https://api.safaricom.co.ke/",
      );
      const payload = mockedAxios.post.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload.CallBackURL).toBe(
        "https://serviceshub.co.ke/api/mpesa/callback",
      );
    });

    test("rejects placeholder or non-HTTPS production callbacks", async () => {
      process.env.MPESA_ENVIRONMENT = "production";
      process.env.MPESA_CALLBACK_URL =
        "https://your-railway-url.railway.app/api/mpesa/callback";
      mockDarajaSuccess();

      await expect(
        new MpesaService().initiateSTKPush("0712345678", 500, "booking123"),
      ).rejects.toBeInstanceOf(MpesaConfigurationError);

      process.env.MPESA_CALLBACK_URL =
        "http://serviceshub.co.ke/api/mpesa/callback";
      mockedAxios.get.mockReset();
      mockedAxios.post.mockReset();
      mockDarajaSuccess();
      await expect(
        new MpesaService().initiateSTKPush("0712345678", 500, "booking123"),
      ).rejects.toBeInstanceOf(MpesaConfigurationError);
    });

    test("fails closed when credentials are missing", async () => {
      delete process.env.MPESA_CONSUMER_SECRET;
      await expect(
        new MpesaService().initiateSTKPush("0712345678", 500, "booking123"),
      ).rejects.toBeInstanceOf(MpesaConfigurationError);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    test("caches a valid OAuth token", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { access_token: "access-token", expires_in: 3600 },
      });
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            ResponseCode: "0",
            ResponseDescription: "Accepted",
            CheckoutRequestID: "checkout-1",
            MerchantRequestID: "merchant-1",
          },
        })
        .mockResolvedValueOnce({
          data: {
            ResponseCode: "0",
            ResponseDescription: "Accepted",
            CheckoutRequestID: "checkout-2",
            MerchantRequestID: "merchant-2",
          },
        });

      const service = new MpesaService();
      await service.initiateSTKPush("0712345678", 500, "booking123");
      await service.initiateSTKPush("0712345678", 500, "booking124");
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test("marks a network-level STK failure as outcome unknown", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { access_token: "access-token", expires_in: 3600 },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error("timeout"));
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        new MpesaService().initiateSTKPush("0712345678", 500, "booking123"),
      ).rejects.toMatchObject({ outcomeUnknown: true });
    });

    test("queries payment status with matching timestamp and timeout", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { access_token: "access-token", expires_in: 3600 },
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ResponseCode: "0",
          ResponseDescription: "Processed",
          ResultCode: "1032",
          ResultDesc: "Cancelled",
        },
      });

      const result = await new MpesaService().checkPaymentStatus("checkout-1");
      expect(result.resultCode).toBe("1032");
      const payload = mockedAxios.post.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload.Password).toBe(
        Buffer.from(`174379test_passkey${payload.Timestamp}`).toString(
          "base64",
        ),
      );
      expect(mockedAxios.post.mock.calls[0][2]).toEqual(
        expect.objectContaining({ timeout: 20_000 }),
      );
    });
  });

  describe("payment initiation API ownership and idempotency", () => {
    test("requires authentication before reading input", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });
      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {}),
      );
      expect(response.status).toBe(401);
    });

    test("rejects non-JSON and oversized requests", async () => {
      mockAuth.mockResolvedValue({ userId: "client-1" });
      const nonJson = await initiatePayment(
        new Request("http://localhost/api/mpesa/initiate", {
          method: "POST",
          body: "bookingId=booking123",
        }),
      );
      expect(nonJson.status).toBe(415);

      const oversized = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: `07${"1".repeat(5_000)}`,
        }),
      );
      expect(oversized.status).toBe(413);
    });

    test("does not reveal or charge a booking owned by another user", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "attacker" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(null);
      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: "0712345678",
        }),
      );
      expect(response.status).toBe(404);
      expect(mockPrismaBooking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "booking123", clientUserId: "attacker" },
        }),
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    test("requires the payment number saved with the booking", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "client-1" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(
        pendingBooking({
          mpesaCheckoutRequestId: null,
          mpesaInitiationToken: null,
        }),
      );
      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: "0711111111",
        }),
      );
      expect(response.status).toBe(409);
      expect(mockPrismaBooking.updateMany).not.toHaveBeenCalled();
    });

    test("blocks repeated payment attempts", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "client-1" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(pendingBooking());
      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: "0712345678",
        }),
      );
      expect(response.status).toBe(409);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    test("atomically reserves and persists a successful attempt", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "client-1" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(
        pendingBooking({
          mpesaCheckoutRequestId: null,
          mpesaInitiationToken: null,
        }),
      );
      mockPrismaBooking.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 });
      const serviceSpy = jest
        .spyOn(mpesaService, "initiateSTKPush")
        .mockResolvedValueOnce({
          success: true,
          checkoutRequestID: "checkout-1",
          merchantRequestID: "merchant-1",
          responseCode: "0",
          responseDescription: "Accepted",
        });

      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: "0712345678",
        }),
      );

      expect(response.status).toBe(200);
      expect(mockPrismaBooking.updateMany).toHaveBeenCalledTimes(2);
      expect(serviceSpy).toHaveBeenCalledWith(
        "254712345678",
        500,
        "booking123",
        createMpesaAccountReference("booking123"),
      );
      serviceSpy.mockRestore();
    });

    test("locks an uncertain network outcome against duplicate charging", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "client-1" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(
        pendingBooking({
          mpesaCheckoutRequestId: null,
          mpesaInitiationToken: null,
        }),
      );
      mockPrismaBooking.updateMany.mockResolvedValue({ count: 1 });
      const serviceSpy = jest
        .spyOn(mpesaService, "initiateSTKPush")
        .mockRejectedValueOnce(new MpesaRequestError("timeout", true));

      const response = await initiatePayment(
        jsonRequest("http://localhost/api/mpesa/initiate", {
          bookingId: "booking123",
          phoneNumber: "0712345678",
        }),
      );

      expect(response.status).toBe(502);
      expect(mockPrismaBooking.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            securityFlag: "MPESA_INITIATION_OUTCOME_UNKNOWN",
          }),
        }),
      );
      serviceSpy.mockRestore();
    });
  });

  describe("callback authentication by stored transaction evidence", () => {
    test("accepts a fully correlated successful callback", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      mockPrismaBooking.findFirst.mockResolvedValueOnce(null);
      mockPrismaBooking.findMany.mockResolvedValueOnce([]);
      mockPrismaBooking.updateMany.mockResolvedValueOnce({ count: 1 });

      const response = await receiveCallback(
        jsonRequest("http://localhost/api/mpesa/callback", callbackPayload()),
      );
      expect(response.status).toBe(200);
      expect(mockPrismaBooking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: "COMPLETED",
            mpesaReceiptNumber: "TST1234567",
            amount: 500,
          }),
        }),
      );
    });

    test("rejects merchant-request correlation mismatches", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          callbackPayload({ MerchantRequestID: "attacker-merchant" }),
        ),
      );
      expect(response.status).toBe(400);
      expect(mockPrismaBooking.updateMany).not.toHaveBeenCalled();
    });

    test.each([
      [
        "amount",
        [
          { Name: "Amount", Value: 499 },
          { Name: "MpesaReceiptNumber", Value: "TST1234567" },
          { Name: "PhoneNumber", Value: "254712345678" },
        ],
      ],
      [
        "phone",
        [
          { Name: "Amount", Value: 500 },
          { Name: "MpesaReceiptNumber", Value: "TST1234567" },
          { Name: "PhoneNumber", Value: "254711111111" },
        ],
      ],
      [
        "account",
        [
          { Name: "Amount", Value: 500 },
          { Name: "MpesaReceiptNumber", Value: "TST1234567" },
          { Name: "PhoneNumber", Value: "254712345678" },
          { Name: "AccountReference", Value: "SH0000000000" },
        ],
      ],
    ])("rejects a mismatched callback %s", async (_name, items) => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      mockPrismaBooking.update.mockResolvedValueOnce({});
      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          callbackPayload({ CallbackMetadata: { Item: items } }),
        ),
      );
      expect(response.status).toBe(400);
      expect(mockPrismaBooking.updateMany).not.toHaveBeenCalled();
    });

    test("rejects duplicated critical metadata fields", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      const payload = callbackPayload({
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 500 },
            { Name: "Amount", Value: 1 },
            { Name: "MpesaReceiptNumber", Value: "TST1234567" },
            { Name: "PhoneNumber", Value: "254712345678" },
          ],
        },
      });
      const response = await receiveCallback(
        jsonRequest("http://localhost/api/mpesa/callback", payload),
      );
      expect(response.status).toBe(400);
    });

    test("rejects a receipt already attached to another booking", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      mockPrismaBooking.findFirst.mockResolvedValueOnce({
        id: "other-booking",
      });
      const response = await receiveCallback(
        jsonRequest("http://localhost/api/mpesa/callback", callbackPayload()),
      );
      expect(response.status).toBe(400);
      expect(mockPrismaBooking.updateMany).not.toHaveBeenCalled();
    });

    test("acknowledges an exact callback replay without another update", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(
        pendingBooking({
          paymentStatus: "COMPLETED",
          mpesaReceiptNumber: "TST1234567",
        }),
      );
      const response = await receiveCallback(
        jsonRequest("http://localhost/api/mpesa/callback", callbackPayload()),
      );
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.ResultDesc).toContain("already processed");
      expect(mockPrismaBooking.updateMany).not.toHaveBeenCalled();
    });

    test("records a correlated failed callback without requiring success metadata", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(pendingBooking());
      mockPrismaBooking.updateMany.mockResolvedValueOnce({ count: 1 });
      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          callbackPayload({
            ResultCode: 1032,
            ResultDesc: "Cancelled",
            CallbackMetadata: undefined,
          }),
        ),
      );
      expect(response.status).toBe(200);
      expect(mockPrismaBooking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentStatus: "FAILED" }),
        }),
      );
    });

    test("requires JSON and a bounded callback body", async () => {
      const response = await receiveCallback(
        new Request("http://localhost/api/mpesa/callback", {
          method: "POST",
          body: "not-json",
        }),
      );
      expect(response.status).toBe(415);
      expect(mockPrismaBooking.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("M-Pesa mobile ownership callbacks", () => {
    test("verifies a correlated KES 1 ownership confirmation", async () => {
      mockPrismaBooking.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaMobileVerificationChallenge.findUnique.mockResolvedValueOnce(
        pendingMobileChallenge(),
      );
      mockPrismaMobileVerificationChallenge.findFirst.mockResolvedValueOnce(
        null,
      );
      mockPrismaMobileVerificationChallenge.updateMany.mockResolvedValueOnce({
        count: 1,
      });

      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          mobileCallbackPayload(),
        ),
      );

      expect(response.status).toBe(200);
      expect(
        mockPrismaMobileVerificationChallenge.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "VERIFIED",
            mpesaReceiptNumber: "MOBILE12345",
          }),
        }),
      );
    });

    test("rejects a mobile callback for a different phone", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(null);
      mockPrismaMobileVerificationChallenge.findUnique.mockResolvedValueOnce(
        pendingMobileChallenge(),
      );

      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          mobileCallbackPayload({
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 1 },
                { Name: "MpesaReceiptNumber", Value: "MOBILE12345" },
                { Name: "PhoneNumber", Value: "254711111111" },
              ],
            },
          }),
        ),
      );

      expect(response.status).toBe(400);
      expect(
        mockPrismaMobileVerificationChallenge.updateMany,
      ).not.toHaveBeenCalled();
    });

    test("records a declined mobile confirmation without success metadata", async () => {
      mockPrismaBooking.findUnique.mockResolvedValueOnce(null);
      mockPrismaMobileVerificationChallenge.findUnique.mockResolvedValueOnce(
        pendingMobileChallenge(),
      );
      mockPrismaMobileVerificationChallenge.updateMany.mockResolvedValueOnce({
        count: 1,
      });

      const response = await receiveCallback(
        jsonRequest(
          "http://localhost/api/mpesa/callback",
          mobileCallbackPayload({
            ResultCode: 1032,
            ResultDesc: "Cancelled",
            CallbackMetadata: undefined,
          }),
        ),
      );

      expect(response.status).toBe(200);
      expect(
        mockPrismaMobileVerificationChallenge.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "FAILED", resultCode: 1032 }),
        }),
      );
    });
  });

  describe("payment-status ownership", () => {
    test("requires authentication", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });
      const response = await getPaymentStatus(
        new Request("http://localhost/api/mpesa/status?bookingId=booking123"),
      );
      expect(response.status).toBe(401);
    });

    test("returns only the signed-in client's booking", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "client-1" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce({
        paymentStatus: "COMPLETED",
        amount: 500,
        mpesaReceiptNumber: "TST1234567",
        mpesaTransactionId: "TST1234567",
        paymentMethod: "MPESA",
        paymentCreatedAt: new Date(),
        securityFlag: null,
      });
      const response = await getPaymentStatus(
        new Request("http://localhost/api/mpesa/status?bookingId=booking123"),
      );
      expect(response.status).toBe(200);
      expect(mockPrismaBooking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "booking123", clientUserId: "client-1" },
        }),
      );
    });

    test("does not reveal another client's booking", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "attacker" });
      mockPrismaBooking.findFirst.mockResolvedValueOnce(null);
      const response = await getPaymentStatus(
        new Request("http://localhost/api/mpesa/status?bookingId=booking123"),
      );
      expect(response.status).toBe(404);
    });
  });
});
