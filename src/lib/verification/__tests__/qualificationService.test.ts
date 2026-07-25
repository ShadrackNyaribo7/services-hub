import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../credentialVerificationService", () => ({
  verifyProviderCredential: jest.fn(),
}));
jest.mock("../verificationService", () => ({
  verificationService: {
    verifyAllDocuments: jest.fn(),
  },
}));

import { verifyProviderCredential } from "../credentialVerificationService";
import { verificationService } from "../verificationService";
import {
  runProviderQualificationCheck,
  validateCertificationNumberFormat,
} from "../qualificationService";

const credentialMock = jest.mocked(verifyProviderCredential);
const documentVerificationMock = jest.mocked(
  verificationService.verifyAllDocuments,
);
const automatedDocumentEvidence = {
  idVerification: {
    valid: true,
    reason: "National ID matched the authoritative identity register.",
    provider: "Kenya NPDM identity verification",
    details: {
      evidenceLevel: "AUTHORITATIVE",
      verificationMethod: "AUTOMATED_OFFICIAL_API",
      sourceUrl: "https://identity.example.test/verify",
      reference: "identity-audit-123",
      checkedAt: new Date().toISOString(),
      requiresManualReview: false,
    },
  },
  policeClearanceVerification: {
    valid: true,
    reason:
      "Police-clearance certificate matched the authoritative DCI record.",
    provider: "Kenya DCI police-clearance verification",
    details: {
      evidenceLevel: "AUTHORITATIVE",
      verificationMethod: "AUTOMATED_OFFICIAL_API",
      sourceUrl: "https://dci.example.test/verify",
      reference: "dci-audit-456",
      checkedAt: new Date().toISOString(),
      requiresManualReview: false,
    },
  },
  formatsAccepted: true,
  overallValid: true,
};
const baseInput = {
  fullName: "Jane Wanjiku Doe",
  serviceCategory: "Mechanic",
  idNumber: "28745163",
  policeClearanceNumber: "PCC-12345",
  certificationNumber: "NITA/GTT/12345",
  certificationIssuer: "NITA",
  certificationName: "Motor Vehicle Mechanic I",
};

describe("runProviderQualificationCheck credential enforcement", () => {
  beforeEach(() => {
    credentialMock.mockReset();
    documentVerificationMock.mockReset();
    documentVerificationMock.mockResolvedValue(automatedDocumentEvidence);
  });

  it("allows legitimate all-numeric certificate serial formats", () => {
    expect(validateCertificationNumberFormat("57382946")).toBeNull();
  });

  it("blocks a required trade application with no credential", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      certificationNumber: "",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain(
      "Mechanic trade certificate is required",
    );
    expect(credentialMock).not.toHaveBeenCalled();
  });

  it("blocks a credential rejected by an authoritative register", async () => {
    credentialMock.mockResolvedValueOnce({
      level: "REJECTED",
      method: "EPRA_PUBLIC_REGISTER",
      source: "Energy and Petroleum Regulatory Authority",
      sourceUrl: "https://example.test/register",
      checkedAt: new Date().toISOString(),
      reason: "Licence holder mismatch.",
      holderMatched: false,
      issuerMatched: true,
      qualificationMatched: true,
    });

    const result = await runProviderQualificationCheck(baseInput);

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain(
      "Licence holder mismatch",
    );
  });

  it("saves a corroborated credential as pending rather than verified", async () => {
    credentialMock.mockResolvedValueOnce({
      level: "CORROBORATED",
      method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
      source: "Kenya National Qualifications Authority",
      sourceUrl: "https://nqd.knqa.go.ke/registered-qualifications/",
      checkedAt: new Date().toISOString(),
      reason: "Issuer and qualification matched; holder confirmation required.",
      holderMatched: null,
      issuerMatched: true,
      qualificationMatched: true,
    });

    const result = await runProviderQualificationCheck(baseInput);
    const credentialCheck = result.checks.find(
      (check) => check.name === "serviceCertification",
    );

    expect(result.accepted).toBe(true);
    expect(result.autoApproved).toBe(false);
    expect(result.recommendedStatus).toBe("PENDING");
    expect(credentialCheck?.requiresManualReview).toBe(true);
  });

  it("auto-approves authoritative automated ID and DCI records", async () => {
    credentialMock.mockResolvedValueOnce({
      level: "AUTHORITATIVE",
      method: "EPRA_PUBLIC_REGISTER",
      source: "Energy and Petroleum Regulatory Authority",
      sourceUrl: "https://example.test/register",
      checkedAt: new Date().toISOString(),
      reason: "Licence confirmed.",
      holderMatched: true,
      issuerMatched: true,
      qualificationMatched: true,
    });

    const result = await runProviderQualificationCheck(baseInput);
    const identity = result.checks.find((check) => check.name === "identity");
    const police = result.checks.find(
      (check) => check.name === "policeClearance",
    );

    expect(result.accepted).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(result.recommendedStatus).toBe("APPROVED");
    expect(identity?.requiresManualReview).toBe(false);
    expect(police?.requiresManualReview).toBe(false);
    expect(identity?.details?.reference).toBe("identity-audit-123");
    expect(police?.details?.reference).toBe("dci-audit-456");
  });

  it("rejects placeholder National ID values", async () => {
    documentVerificationMock.mockResolvedValueOnce({
      ...automatedDocumentEvidence,
      idVerification: {
        valid: false,
        reason: "National ID looks like a placeholder.",
        provider: "DocumentFormatRules",
      },
      formatsAccepted: false,
      overallValid: false,
    });
    credentialMock.mockResolvedValueOnce({
      level: "AUTHORITATIVE",
      method: "EPRA_PUBLIC_REGISTER",
      source: "Energy and Petroleum Regulatory Authority",
      sourceUrl: "https://example.test/register",
      checkedAt: new Date().toISOString(),
      reason: "Licence confirmed.",
      holderMatched: true,
      issuerMatched: true,
      qualificationMatched: true,
    });

    const result = await runProviderQualificationCheck({
      ...baseInput,
      idNumber: "12345678",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain("placeholder");
  });
});
