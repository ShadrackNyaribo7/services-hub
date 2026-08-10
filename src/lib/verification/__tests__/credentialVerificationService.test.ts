import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { verifyProviderCredential } from "../credentialVerificationService";

const originalFetch = global.fetch;
const originalOfflineSecret = process.env.OFFLINE_VERIFICATION_SECRET;
const originalClerkSecret = process.env.CLERK_SECRET_KEY;

function epraInput(
  overrides: Partial<Parameters<typeof verifyProviderCredential>[0]> = {},
) {
  return {
    fullName: "Jane Wanjiku Doe",
    serviceCategory: "Electrical",
    certificationNumber: "EPRA/EW/73915",
    certificationNumberConfirmation: "EPRA/EW/73915",
    certificationHolderName: "DOE JANE WANJIKU",
    certificationIssuer: "Energy and Petroleum Regulatory Authority",
    certificationName: "Electrical Worker Licence",
    idNumber: "28745163",
    policeClearanceNumber: "PCC-739152",
    ...overrides,
  };
}

describe("offline provider credential validation", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.OFFLINE_VERIFICATION_SECRET =
      "test-only-offline-evidence-secret-32-characters";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalOfflineSecret === undefined) {
      delete process.env.OFFLINE_VERIFICATION_SECRET;
    } else {
      process.env.OFFLINE_VERIFICATION_SECRET = originalOfflineSecret;
    }
    if (originalClerkSecret === undefined) {
      delete process.env.CLERK_SECRET_KEY;
    } else {
      process.env.CLERK_SECRET_KEY = originalClerkSecret;
    }
  });

  it("accepts and seals a consistent EPRA-formatted claim without a live call", async () => {
    const result = await verifyProviderCredential(epraInput());

    expect(result.level).toBe("SELF_ATTESTED");
    expect(result.holderMatched).toBe(true);
    expect(result.details?.reference).toMatch(/^OEV1-CREDENTIAL-/);
    expect(result.details?.authenticityEstablished).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-EPRA issuer claim for an electrical provider", async () => {
    const result = await verifyProviderCredential(
      epraInput({ certificationIssuer: "Unknown Training Centre" }),
    );

    expect(result.level).toBe("REJECTED");
    expect(result.issuerMatched).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a credential number confirmation mismatch", async () => {
    const result = await verifyProviderCredential(
      epraInput({ certificationNumberConfirmation: "EPRA/EW/73916" }),
    );

    expect(result.level).toBe("REJECTED");
    expect(result.reason).toContain("do not match");
  });

  it("rejects a credential holder name mismatch", async () => {
    const result = await verifyProviderCredential(
      epraInput({ certificationHolderName: "John Other Person" }),
    );

    expect(result.level).toBe("REJECTED");
    expect(result.holderMatched).toBe(false);
  });

  it("rejects a qualification title inconsistent with the service category", async () => {
    const result = await verifyProviderCredential({
      ...epraInput(),
      serviceCategory: "Mechanic",
      certificationNumber: "NITA/GTT/73915",
      certificationNumberConfirmation: "NITA/GTT/73915",
      certificationIssuer: "NITA",
      certificationName: "Food Handling Certificate",
    });

    expect(result.level).toBe("REJECTED");
    expect(result.qualificationMatched).toBe(false);
  });

  it("rejects an unlisted issuer because there is no manual approval fallback", async () => {
    const result = await verifyProviderCredential({
      ...epraInput(),
      serviceCategory: "Mechanic",
      certificationNumber: "ATC/MVM/73915",
      certificationNumberConfirmation: "ATC/MVM/73915",
      certificationIssuer: "Acme Technical College",
      certificationName: "Motor Vehicle Mechanic Certificate",
    });

    expect(result.level).toBe("REJECTED");
    expect(result.issuerMatched).toBe(false);
    expect(result.reason).toContain("approved-issuer reference list");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed if evidence cannot be sealed", async () => {
    delete process.env.OFFLINE_VERIFICATION_SECRET;
    delete process.env.CLERK_SECRET_KEY;

    const result = await verifyProviderCredential(epraInput());

    expect(result.level).toBe("UNAVAILABLE");
    expect(result.details?.errorCode).toBe("EVIDENCE_SEAL_NOT_CONFIGURED");
  });
});
