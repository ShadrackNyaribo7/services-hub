import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import {
  getCredentialEvidenceSummary,
  getOfflineRecordEvidenceSummary,
  normalizeSupportedServiceCategory,
  runProviderQualificationCheck,
  validateCertificationNumberFormat,
} from "../qualificationService";

const originalOfflineSecret = process.env.OFFLINE_VERIFICATION_SECRET;

const baseInput = {
  fullName: "Jane Wanjiku Doe",
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
};

describe("offline provider qualification enforcement", () => {
  beforeEach(() => {
    process.env.OFFLINE_VERIFICATION_SECRET =
      "test-only-offline-evidence-secret-32-characters";
  });

  afterEach(() => {
    if (originalOfflineSecret === undefined) {
      delete process.env.OFFLINE_VERIFICATION_SECRET;
    } else {
      process.env.OFFLINE_VERIFICATION_SECRET = originalOfflineSecret;
    }
  });

  it("allows legitimate all-numeric certificate serial formats", () => {
    expect(validateCertificationNumberFormat("57382946")).toBeNull();
  });

  it("canonicalizes only supported service categories", () => {
    expect(normalizeSupportedServiceCategory(" plumbing ")).toBe("Plumber");
    expect(normalizeSupportedServiceCategory("carpentry")).toBe("Carpenter");
    expect(normalizeSupportedServiceCategory("gardners")).toBe("Gardener");
    expect(
      normalizeSupportedServiceCategory("internet service installers"),
    ).toBe("Internet Service Installer");
    expect(normalizeSupportedServiceCategory("Unlisted Trade")).toBeNull();
  });

  it("blocks a required trade application with no credential", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      certificationNumber: "",
      certificationNumberConfirmation: "",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain(
      "Mechanic trade certificate is required",
    );
  });

  it("automatically approves sealed, internally consistent evidence", async () => {
    const result = await runProviderQualificationCheck(baseInput);
    const identity = getOfflineRecordEvidenceSummary(result).identity;
    const credential = getCredentialEvidenceSummary(result);

    expect(result.accepted).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(result.recommendedStatus).toBe("APPROVED");
    expect(identity.sealed).toBe(true);
    expect(credential.offlineValidated).toBe(true);
    expect(credential.reference).toMatch(/^OEV1-CREDENTIAL-/);
  });

  it.each([
    ["Carpenter", "Carpentry and Joinery Grade I", "NITA"],
    ["Driver", "Commercial Driving Licence", "NTSA"],
    ["Mason", "Masonry Trade Test Grade I", "NITA"],
    ["Glazier", "Glass and Glazing Trade Certificate", "NITA"],
    ["Gardener", "Horticulture and Landscaping Certificate", "NITA"],
    ["Interior Decorator", "Interior Decoration Certificate", "NITA"],
    ["Painter", "Painting and Decorating Grade I", "NITA"],
    [
      "Internet Service Installer",
      "Fiber Optic Installation Technician",
      "NITA",
    ],
  ])(
    "automatically approves valid %s credential evidence",
    async (serviceCategory, certificationName, certificationIssuer) => {
      const result = await runProviderQualificationCheck({
        ...baseInput,
        serviceCategory,
        certificationName,
        certificationIssuer,
      });

      expect(result.accepted).toBe(true);
      expect(result.recommendedStatus).toBe("APPROVED");
    },
  );

  it("blocks a mismatched credential holder", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      certificationHolderName: "John Other Person",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain("does not match");
  });

  it("blocks reuse of an ID as a credential number", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      certificationNumber: "28745163",
      certificationNumberConfirmation: "28745163",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain("must be distinct");
  });

  it("automatically approves cleaning without an unnecessary credential", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      serviceCategory: "Cleaning",
      certificationNumber: "",
      certificationNumberConfirmation: "",
      certificationHolderName: "",
      certificationIssuer: "",
      certificationName: "",
    });

    expect(result.accepted).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(result.recommendedStatus).toBe("APPROVED");
  });

  it("rejects placeholder National ID values", async () => {
    const result = await runProviderQualificationCheck({
      ...baseInput,
      idNumber: "12345678",
      idNumberConfirmation: "12345678",
    });

    expect(result.accepted).toBe(false);
    expect(result.blockingErrors.join(" ")).toContain("placeholder");
  });
});
