import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { verificationService } from "../verificationService";

const originalFetch = global.fetch;
const ENVIRONMENT_KEYS = [
  "KENYA_IDENTITY_VERIFY_URL",
  "KENYA_IDENTITY_API_TOKEN",
  "KENYA_IDENTITY_AUTH_HEADER",
  "KENYA_IDENTITY_AUTH_SCHEME",
  "KENYA_DCI_VERIFY_URL",
  "KENYA_DCI_API_TOKEN",
  "KENYA_DCI_AUTH_HEADER",
  "KENYA_DCI_AUTH_SCHEME",
] as const;

describe("automated official-record verification", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;

    for (const key of ENVIRONMENT_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fails closed when the official integrations are not configured", async () => {
    const result = await verificationService.verifyAllDocuments({
      fullName: "Jane Wanjiku Doe",
      idNumber: "28745163",
      policeClearanceNumber: "PCC-12345",
    });

    expect(result.overallValid).toBe(false);
    expect(result.idVerification.valid).toBe(false);
    expect(result.idVerification.details?.errorCode).toBe("NOT_CONFIGURED");
    expect(result.idVerification.details?.requiresManualReview).toBe(false);
    expect(result.policeClearanceVerification.details?.errorCode).toBe(
      "NOT_CONFIGURED",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("authoritatively verifies matching identity and DCI records", async () => {
    process.env.KENYA_IDENTITY_VERIFY_URL =
      "https://identity.example.test/verify";
    process.env.KENYA_IDENTITY_API_TOKEN = "identity-secret";
    process.env.KENYA_DCI_VERIFY_URL = "https://dci.example.test/verify";
    process.env.KENYA_DCI_API_TOKEN = "dci-secret";
    const checkedAt = new Date().toISOString();

    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          verified: true,
          reference: "identity-audit-123",
          checkedAt,
          subject: {
            idNumber: "28745163",
            fullName: "DOE JANE WANJIKU",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          verified: true,
          reference: "dci-audit-456",
          checkedAt,
          subject: {
            idNumber: "28745163",
            fullName: "Jane Wanjiku Doe",
          },
          document: {
            number: "PCC-12345",
            validUntil: "2099-12-31T23:59:59.000Z",
          },
        }),
      );

    const result = await verificationService.verifyAllDocuments({
      fullName: "Jane Wanjiku Doe",
      idNumber: "28745163",
      policeClearanceNumber: "PCC-12345",
    });

    expect(result.overallValid).toBe(true);
    expect(result.idVerification.details?.evidenceLevel).toBe("AUTHORITATIVE");
    expect(result.idVerification.details?.reference).toBe("identity-audit-123");
    expect(result.policeClearanceVerification.details?.reference).toBe(
      "dci-audit-456",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a verified DCI document belonging to another identity", async () => {
    process.env.KENYA_DCI_VERIFY_URL = "https://dci.example.test/verify";
    process.env.KENYA_DCI_API_TOKEN = "dci-secret";
    fetchMock.mockResolvedValueOnce(
      Response.json({
        verified: true,
        reference: "dci-audit-789",
        checkedAt: new Date().toISOString(),
        subject: {
          idNumber: "99999999",
          fullName: "Other Person",
        },
        document: { number: "PCC-12345" },
      }),
    );

    const result = await verificationService.verifyPoliceClearance(
      "PCC-12345",
      "28745163",
      "Jane Wanjiku Doe",
    );

    expect(result.valid).toBe(false);
    expect(result.details?.evidenceLevel).toBe("REJECTED");
    expect(result.reason).toContain("does not match");
  });

  it("blocks approval when the upstream verifier is unavailable", async () => {
    process.env.KENYA_IDENTITY_VERIFY_URL =
      "https://identity.example.test/verify";
    process.env.KENYA_IDENTITY_API_TOKEN = "identity-secret";
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));

    const result = await verificationService.verifyIdNumber(
      "28745163",
      "Jane Wanjiku Doe",
    );

    expect(result.valid).toBe(false);
    expect(result.details?.errorCode).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.details?.retryable).toBe(true);
    expect(result.details?.requiresManualReview).toBe(false);
  });
});
