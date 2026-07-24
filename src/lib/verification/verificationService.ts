import "server-only";

export interface VerificationResult {
  valid: boolean;
  reason: string;
  provider: string;
  details?: Record<string, unknown>;
}

const DIGITAL_ID_URL = "https://did.ecitizen.go.ke/";
const DCI_CLEARANCE_VERIFICATION_URL = "https://dci.ecitizen.go.ke/verify";

function hasPlaceholderValue(value: string) {
  const normalized = value.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return (
    /^(test|sample|unknown|none|na)\d*$/.test(normalized) ||
    /^0+$/.test(normalized) ||
    /^1+$/.test(normalized) ||
    normalized === "1234567" ||
    normalized === "12345678"
  );
}

function manualReviewResult(
  reason: string,
  officialSourceUrl: string,
): VerificationResult {
  return {
    valid: true,
    reason,
    provider: "OfficialKenyaManualVerification",
    details: {
      evidenceLevel: "FORMAT_ONLY",
      officialSourceUrl,
      requiresManualReview: true,
    },
  };
}

class VerificationService {
  async verifyIdNumber(idNumber: string): Promise<VerificationResult> {
    const normalized = idNumber.trim();

    if (!/^\d{7,10}$/.test(normalized)) {
      return {
        valid: false,
        reason: "National ID must contain 7 to 10 digits.",
        provider: "DocumentFormatRules",
      };
    }

    if (hasPlaceholderValue(normalized)) {
      return {
        valid: false,
        reason: "National ID looks like a placeholder.",
        provider: "DocumentFormatRules",
      };
    }

    return manualReviewResult(
      "National ID format accepted. An administrator must match the applicant's name and number using the official eCitizen Digital ID QR before approval.",
      DIGITAL_ID_URL,
    );
  }

  async verifyPoliceClearance(
    certificateNumber: string,
  ): Promise<VerificationResult> {
    const normalized = certificateNumber.trim();

    if (
      !/^[A-Za-z0-9][A-Za-z0-9/-]{4,63}$/.test(normalized) ||
      hasPlaceholderValue(normalized)
    ) {
      return {
        valid: false,
        reason:
          "Police clearance application number must be 5 to 64 letters, numbers, hyphens, or slashes and cannot be a placeholder.",
        provider: "DocumentFormatRules",
      };
    }

    return manualReviewResult(
      "Police clearance number format accepted. An administrator must verify it in the official DCI eCitizen checker before approval.",
      DCI_CLEARANCE_VERIFICATION_URL,
    );
  }

  async verifyAllDocuments(documents: {
    idNumber: string;
    policeClearanceNumber: string;
  }) {
    const [idVerification, policeClearanceVerification] = await Promise.all([
      this.verifyIdNumber(documents.idNumber),
      this.verifyPoliceClearance(documents.policeClearanceNumber),
    ]);

    return {
      idVerification,
      policeClearanceVerification,
      formatsAccepted:
        idVerification.valid && policeClearanceVerification.valid,
      overallValid: false,
    };
  }
}

export const verificationService = new VerificationService();
