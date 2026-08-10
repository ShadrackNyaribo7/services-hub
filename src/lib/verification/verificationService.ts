import "server-only";
import type { VerificationResult } from "@/types";
import {
  createOfflineEvidenceReference,
  hasSuspiciousDocumentValue,
  namesMatch,
  normalizeDocumentNumber,
  normalizeName,
  OFFLINE_EVIDENCE_LEVEL,
  OFFLINE_VALIDATION_METHOD,
  OFFLINE_VALIDATION_VERSION,
  validateHumanName,
} from "./offlineEvidence";

export type { VerificationResult } from "@/types";

type IdentityVerificationInput = {
  fullName: string;
  identityDocumentName: string;
  idNumber: string;
  idNumberConfirmation: string;
};

type PoliceClearanceVerificationInput = {
  fullName: string;
  policeClearanceName: string;
  idNumber: string;
  certificateNumber: string;
  certificateNumberConfirmation: string;
};

const OFFLINE_PROVIDER = "OfflineEvidenceValidator";
const IDENTITY_SOURCE = "local://offline-evidence/identity/v1";
const POLICE_SOURCE = "local://offline-evidence/police-clearance/v1";

function invalidResult(reason: string, sourceUrl: string): VerificationResult {
  return {
    valid: false,
    reason,
    provider: OFFLINE_PROVIDER,
    details: {
      evidenceLevel: "REJECTED",
      verificationMethod: OFFLINE_VALIDATION_METHOD,
      sourceUrl,
      authenticityEstablished: false,
      requiresManualReview: false,
      validationVersion: OFFLINE_VALIDATION_VERSION,
    },
  };
}

function unavailableSealResult(sourceUrl: string): VerificationResult {
  return {
    valid: false,
    reason:
      "Offline evidence sealing is not configured. Set a server-only OFFLINE_VERIFICATION_SECRET of at least 32 characters.",
    provider: OFFLINE_PROVIDER,
    details: {
      evidenceLevel: "UNAVAILABLE",
      verificationMethod: OFFLINE_VALIDATION_METHOD,
      sourceUrl,
      errorCode: "EVIDENCE_SEAL_NOT_CONFIGURED",
      authenticityEstablished: false,
      retryable: false,
      requiresManualReview: false,
      validationVersion: OFFLINE_VALIDATION_VERSION,
    },
  };
}

function validOfflineResult({
  reason,
  reference,
  sourceUrl,
}: {
  reason: string;
  reference: string;
  sourceUrl: string;
}): VerificationResult {
  return {
    valid: true,
    reason,
    provider: OFFLINE_PROVIDER,
    details: {
      evidenceLevel: OFFLINE_EVIDENCE_LEVEL,
      verificationMethod: OFFLINE_VALIDATION_METHOD,
      sourceUrl,
      checkedAt: new Date().toISOString(),
      reference,
      integrityProtected: true,
      authenticityEstablished: false,
      requiresManualReview: false,
      productionAutoApprovalEligible: true,
      validationVersion: OFFLINE_VALIDATION_VERSION,
    },
  };
}

class VerificationService {
  async verifyIdNumber(
    input: IdentityVerificationInput,
  ): Promise<VerificationResult> {
    const idNumber = input.idNumber.normalize("NFKC").trim();
    const confirmation = input.idNumberConfirmation.normalize("NFKC").trim();
    const fullName = input.fullName.normalize("NFKC").trim();
    const documentName = input.identityDocumentName.normalize("NFKC").trim();

    const nameError = validateHumanName(fullName);
    if (nameError) return invalidResult(nameError, IDENTITY_SOURCE);

    const documentNameError = validateHumanName(documentName);
    if (documentNameError) {
      return invalidResult(
        `Name printed on National ID: ${documentNameError}`,
        IDENTITY_SOURCE,
      );
    }

    if (!/^\d{7,10}$/.test(idNumber)) {
      return invalidResult(
        "National ID must contain 7 to 10 digits.",
        IDENTITY_SOURCE,
      );
    }

    if (hasSuspiciousDocumentValue(idNumber)) {
      return invalidResult(
        "National ID looks like a placeholder, sequence, or repeated value.",
        IDENTITY_SOURCE,
      );
    }

    if (confirmation !== idNumber) {
      return invalidResult(
        "National ID entries do not match.",
        IDENTITY_SOURCE,
      );
    }

    if (!namesMatch(fullName, documentName)) {
      return invalidResult(
        "The name printed on the National ID does not match the application name.",
        IDENTITY_SOURCE,
      );
    }

    const reference = createOfflineEvidenceReference("IDENTITY", {
      idNumber,
      fullName: normalizeName(fullName),
    });

    if (!reference) return unavailableSealResult(IDENTITY_SOURCE);

    return validOfflineResult({
      reason:
        "National ID entries are structurally valid, match each other, and match the submitted holder name. No government database lookup was performed.",
      reference,
      sourceUrl: IDENTITY_SOURCE,
    });
  }

  async verifyPoliceClearance(
    input: PoliceClearanceVerificationInput,
  ): Promise<VerificationResult> {
    const certificateNumber = input.certificateNumber.normalize("NFKC").trim();
    const confirmation = input.certificateNumberConfirmation
      .normalize("NFKC")
      .trim();
    const fullName = input.fullName.normalize("NFKC").trim();
    const documentName = input.policeClearanceName.normalize("NFKC").trim();

    if (
      !/^[A-Za-z0-9][A-Za-z0-9/-]{4,63}$/.test(certificateNumber) ||
      hasSuspiciousDocumentValue(certificateNumber)
    ) {
      return invalidResult(
        "Police clearance number must be 5 to 64 letters, numbers, hyphens, or slashes and cannot be a placeholder, sequence, or repeated value.",
        POLICE_SOURCE,
      );
    }

    if (
      normalizeDocumentNumber(confirmation) !==
      normalizeDocumentNumber(certificateNumber)
    ) {
      return invalidResult(
        "Police clearance number entries do not match.",
        POLICE_SOURCE,
      );
    }

    if (
      normalizeDocumentNumber(certificateNumber) ===
      normalizeDocumentNumber(input.idNumber)
    ) {
      return invalidResult(
        "Police clearance number cannot be the same as the National ID number.",
        POLICE_SOURCE,
      );
    }

    const documentNameError = validateHumanName(documentName);
    if (documentNameError) {
      return invalidResult(
        `Name printed on Police Clearance Certificate: ${documentNameError}`,
        POLICE_SOURCE,
      );
    }

    if (!namesMatch(fullName, documentName)) {
      return invalidResult(
        "The name printed on the Police Clearance Certificate does not match the application name.",
        POLICE_SOURCE,
      );
    }

    const reference = createOfflineEvidenceReference("POLICE_CLEARANCE", {
      certificateNumber: normalizeDocumentNumber(certificateNumber),
      fullName: normalizeName(fullName),
      idNumber: input.idNumber.trim(),
    });

    if (!reference) return unavailableSealResult(POLICE_SOURCE);

    return validOfflineResult({
      reason:
        "Police clearance entries are structurally valid, match each other, are distinct from the National ID, and match the submitted holder name. No DCI or government database lookup was performed.",
      reference,
      sourceUrl: POLICE_SOURCE,
    });
  }

  async verifyAllDocuments(documents: {
    fullName: string;
    identityDocumentName: string;
    idNumber: string;
    idNumberConfirmation: string;
    policeClearanceName: string;
    policeClearanceNumber: string;
    policeClearanceNumberConfirmation: string;
  }) {
    const [idVerification, policeClearanceVerification] = await Promise.all([
      this.verifyIdNumber({
        fullName: documents.fullName,
        identityDocumentName: documents.identityDocumentName,
        idNumber: documents.idNumber,
        idNumberConfirmation: documents.idNumberConfirmation,
      }),
      this.verifyPoliceClearance({
        fullName: documents.fullName,
        policeClearanceName: documents.policeClearanceName,
        idNumber: documents.idNumber,
        certificateNumber: documents.policeClearanceNumber,
        certificateNumberConfirmation:
          documents.policeClearanceNumberConfirmation,
      }),
    ]);

    return {
      idVerification,
      policeClearanceVerification,
      formatsAccepted:
        idVerification.valid && policeClearanceVerification.valid,
      overallValid: idVerification.valid && policeClearanceVerification.valid,
    };
  }
}

export const verificationService = new VerificationService();
