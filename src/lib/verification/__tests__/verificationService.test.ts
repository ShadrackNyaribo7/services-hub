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
const originalOfflineSecret = process.env.OFFLINE_VERIFICATION_SECRET;
const originalClerkSecret = process.env.CLERK_SECRET_KEY;

function validDocuments() {
  return {
    fullName: "Jane Wanjiku Doe",
    identityDocumentName: "DOE JANE WANJIKU",
    idNumber: "28745163",
    idNumberConfirmation: "28745163",
    policeClearanceName: "Jane Wanjiku Doe",
    policeClearanceNumber: "PCC-739152",
    policeClearanceNumberConfirmation: "PCC-739152",
  };
}

describe("offline identity and police-clearance evidence validation", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.OFFLINE_VERIFICATION_SECRET =
      "test-only-offline-evidence-secret-32-characters";
    process.env.PELEZA_IDENTITY_VERIFY_URL =
      "https://identity.example.test/verify";
    process.env.PELEZA_POLICE_VERIFY_URL = "https://police.example.test/verify";
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
    delete process.env.PELEZA_IDENTITY_VERIFY_URL;
    delete process.env.PELEZA_POLICE_VERIFY_URL;
  });

  it("accepts consistent entries, seals them, and never calls a live service", async () => {
    const result =
      await verificationService.verifyAllDocuments(validDocuments());

    expect(result.overallValid).toBe(true);
    expect(result.idVerification.details?.evidenceLevel).toBe("SELF_ATTESTED");
    expect(result.idVerification.details?.reference).toMatch(/^OEV1-IDENTITY-/);
    expect(result.idVerification.details?.authenticityEstablished).toBe(false);
    expect(result.idVerification.details?.requiresManualReview).toBe(false);
    expect(result.policeClearanceVerification.details?.reference).toMatch(
      /^OEV1-POLICE_CLEARANCE-/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched repeated ID entry", async () => {
    const result = await verificationService.verifyIdNumber({
      fullName: "Jane Wanjiku Doe",
      identityDocumentName: "Jane Wanjiku Doe",
      idNumber: "28745163",
      idNumberConfirmation: "28745164",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("do not match");
  });

  it("rejects a printed identity name belonging to someone else", async () => {
    const result = await verificationService.verifyIdNumber({
      fullName: "Jane Wanjiku Doe",
      identityDocumentName: "John Other Person",
      idNumber: "28745163",
      idNumberConfirmation: "28745163",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("does not match");
  });

  it("rejects placeholder, repeated, and sequential ID values", async () => {
    for (const idNumber of ["12345678", "00000000", "11111111"]) {
      const result = await verificationService.verifyIdNumber({
        fullName: "Jane Wanjiku Doe",
        identityDocumentName: "Jane Wanjiku Doe",
        idNumber,
        idNumberConfirmation: idNumber,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("placeholder");
    }
  });

  it("rejects a police number reused as the National ID", async () => {
    const result = await verificationService.verifyPoliceClearance({
      fullName: "Jane Wanjiku Doe",
      policeClearanceName: "Jane Wanjiku Doe",
      idNumber: "28745163",
      certificateNumber: "28745163",
      certificateNumberConfirmation: "28745163",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("cannot be the same");
  });

  it("fails closed when no sufficiently strong server secret is available", async () => {
    delete process.env.OFFLINE_VERIFICATION_SECRET;
    delete process.env.CLERK_SECRET_KEY;

    const result =
      await verificationService.verifyAllDocuments(validDocuments());

    expect(result.overallValid).toBe(false);
    expect(result.idVerification.details?.errorCode).toBe(
      "EVIDENCE_SEAL_NOT_CONFIGURED",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
