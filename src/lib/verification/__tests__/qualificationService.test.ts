import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../credentialVerificationService", () => ({
  verifyProviderCredential: jest.fn(),
}));

import { verifyProviderCredential } from "../credentialVerificationService";
import {
  runProviderQualificationCheck,
  validateCertificationNumberFormat,
} from "../qualificationService";

const credentialMock = jest.mocked(verifyProviderCredential);
const baseInput = {
  fullName: "Jane Wanjiku Doe",
  serviceCategory: "Mechanic",
  idNumber: "12345678",
  policeClearanceNumber: "PCC-12345",
  certificationNumber: "NITA/GTT/12345",
  certificationIssuer: "NITA",
  certificationName: "Motor Vehicle Mechanic I",
};

describe("runProviderQualificationCheck credential enforcement", () => {
  beforeEach(() => {
    credentialMock.mockReset();
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
    expect(result.blockingErrors.join(" ")).toContain("Mechanic trade certificate is required");
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
    expect(result.blockingErrors.join(" ")).toContain("Licence holder mismatch");
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
});
