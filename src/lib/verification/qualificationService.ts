import {
  verificationService,
  type VerificationResult,
} from "./verificationService";
import { verifyProviderCredential } from "./credentialVerificationService";
import {
  normalizeDocumentNumber,
  OFFLINE_EVIDENCE_LEVEL,
  OFFLINE_VALIDATION_METHOD,
} from "./offlineEvidence";

export type VerificationStatusValue =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type ProviderQualificationInput = {
  fullName: string;
  serviceCategory: string;
  idNumber?: string | null;
  idNumberConfirmation?: string | null;
  identityDocumentName?: string | null;
  policeClearanceNumber?: string | null;
  policeClearanceNumberConfirmation?: string | null;
  policeClearanceName?: string | null;
  certificationNumber?: string | null;
  certificationNumberConfirmation?: string | null;
  certificationHolderName?: string | null;
  certificationIssuer?: string | null;
  certificationName?: string | null;
};

export type QualificationCheckName =
  | "identity"
  | "policeClearance"
  | "serviceCertification";

export type QualificationCheck = {
  name: QualificationCheckName;
  label: string;
  valid: boolean;
  reason: string;
  provider: string;
  requiresManualReview: boolean;
  details?: Record<string, unknown>;
};

export type ProviderQualificationResult = {
  accepted: boolean;
  autoApproved: boolean;
  recommendedStatus: VerificationStatusValue;
  adminNotes: string;
  blockingErrors: string[];
  checks: QualificationCheck[];
};

export type CredentialEvidenceSummary = {
  level: string | null;
  method: string | null;
  source: string | null;
  reference: string | null;
  checkedAt: Date | null;
  offlineValidated: boolean;
};

export type OfflineRecordEvidence = {
  level: string | null;
  method: string | null;
  source: string | null;
  reference: string | null;
  checkedAt: Date | null;
  sealed: boolean;
};

export type OfflineRecordEvidenceSummary = {
  identity: OfflineRecordEvidence;
  policeClearance: OfflineRecordEvidence;
};

type ServiceCertificationRequirement = {
  required: boolean;
  label: string;
};

const SERVICE_CERTIFICATION_REQUIREMENTS: Record<
  string,
  ServiceCertificationRequirement
> = {
  electrical: {
    required: true,
    label: "Electrical license or trade certificate",
  },
  plumber: {
    required: true,
    label: "Plumbing license or trade certificate",
  },
  mechanic: {
    required: true,
    label: "Mechanic trade certificate",
  },
  carpenter: {
    required: true,
    label: "Carpentry trade certificate",
  },
  driver: {
    required: true,
    label: "Driving licence",
  },
  mason: {
    required: true,
    label: "Masonry trade certificate",
  },
  glazier: {
    required: true,
    label: "Glazing trade certificate",
  },
  gardener: {
    required: true,
    label: "Gardening or horticulture certificate",
  },
  "interior decorator": {
    required: true,
    label: "Interior decoration certificate",
  },
  painter: {
    required: true,
    label: "Painting trade certificate",
  },
  "internet service installer": {
    required: true,
    label: "Internet installation or networking certificate",
  },
  cleaning: {
    required: false,
    label: "Cleaning or safety certificate",
  },
};

const CANONICAL_SERVICE_CATEGORIES: Record<string, string> = {
  carpenter: "Carpenter",
  carpentry: "Carpenter",
  cleaning: "Cleaning",
  driver: "Driver",
  gardener: "Gardener",
  gardeners: "Gardener",
  gardening: "Gardener",
  gardner: "Gardener",
  gardners: "Gardener",
  glazier: "Glazier",
  glazing: "Glazier",
  "interior decoration": "Interior Decorator",
  "interior decorator": "Interior Decorator",
  "interior decorating": "Interior Decorator",
  "internet installer": "Internet Service Installer",
  "internet service installer": "Internet Service Installer",
  "internet service installers": "Internet Service Installer",
  electrical: "Electrical",
  mason: "Mason",
  masonry: "Mason",
  mechanic: "Mechanic",
  painter: "Painter",
  painting: "Painter",
  plumber: "Plumber",
  plumbing: "Plumber",
};

function cleanValue(value?: string | null) {
  return (value ?? "").normalize("NFKC").trim();
}

function normalizeServiceCategory(serviceCategory: string) {
  return cleanValue(serviceCategory).toLowerCase();
}

export function normalizeSupportedServiceCategory(serviceCategory: string) {
  return (
    CANONICAL_SERVICE_CATEGORIES[normalizeServiceCategory(serviceCategory)] ??
    null
  );
}

export function getServiceCertificationRequirement(
  serviceCategory: string,
): ServiceCertificationRequirement | null {
  const normalized = normalizeServiceCategory(serviceCategory);
  return SERVICE_CERTIFICATION_REQUIREMENTS[normalized] ?? null;
}

function hasPlaceholderValue(value: string) {
  const normalized = value.replace(/[\s\-/._]/g, "").toLowerCase();

  return (
    /^(test|sample|demo|fake|unknown|none|na)\d*$/.test(normalized) ||
    /^(.)\1{4,}$/.test(normalized) ||
    normalized === "12345" ||
    normalized === "123456" ||
    normalized === "1234567" ||
    normalized === "12345678"
  );
}

export function validateCertificationNumberFormat(certificationNumber: string) {
  const normalized = cleanValue(certificationNumber);

  if (normalized.length < 5 || normalized.length > 64) {
    return "Certification number must be between 5 and 64 characters.";
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9\s\-/.]*[A-Za-z0-9]$/.test(normalized)) {
    return "Certification number can only contain letters, numbers, spaces, hyphens, slashes, and periods.";
  }

  if (hasPlaceholderValue(normalized)) {
    return "Certification number looks like a placeholder.";
  }

  return null;
}

function fromVerificationResult(
  name: QualificationCheckName,
  label: string,
  result: VerificationResult,
): QualificationCheck {
  return {
    name,
    label,
    valid: result.valid,
    reason: result.reason ?? (result.valid ? "Validated" : "Validation failed"),
    provider: result.provider ?? "OfflineEvidenceValidator",
    requiresManualReview:
      result.valid && Boolean(result.details?.requiresManualReview),
    details: result.details,
  };
}

async function verifyServiceCertification(
  input: ProviderQualificationInput,
): Promise<QualificationCheck> {
  const requirement = getServiceCertificationRequirement(input.serviceCategory);

  if (!requirement) {
    return {
      name: "serviceCertification",
      label: "Service certification",
      valid: false,
      reason: "Unsupported service category.",
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  const certificationNumber = cleanValue(input.certificationNumber);
  const certificationNumberConfirmation = cleanValue(
    input.certificationNumberConfirmation,
  );
  const certificationHolderName = cleanValue(input.certificationHolderName);
  const certificationIssuer = cleanValue(input.certificationIssuer);
  const certificationName = cleanValue(input.certificationName);

  if (!certificationNumber) {
    return {
      name: "serviceCertification",
      label: requirement.label,
      valid: !requirement.required,
      reason: requirement.required
        ? `${requirement.label} is required for ${input.serviceCategory} providers.`
        : "No service certification is required for this category.",
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  const formatError = validateCertificationNumberFormat(certificationNumber);
  if (formatError) {
    return {
      name: "serviceCertification",
      label: requirement.label,
      valid: false,
      reason: formatError,
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  if (
    !certificationNumberConfirmation ||
    !certificationHolderName ||
    !certificationIssuer ||
    !certificationName
  ) {
    return {
      name: "serviceCertification",
      label: requirement.label,
      valid: false,
      reason:
        "Credential number confirmation, printed holder name, issuer, and exact qualification or licence name are required.",
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  if (
    normalizeDocumentNumber(certificationNumber) ===
      normalizeDocumentNumber(cleanValue(input.idNumber)) ||
    normalizeDocumentNumber(certificationNumber) ===
      normalizeDocumentNumber(cleanValue(input.policeClearanceNumber))
  ) {
    return {
      name: "serviceCertification",
      label: requirement.label,
      valid: false,
      reason:
        "Credential number must be distinct from the National ID and police clearance numbers.",
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  const credentialEvidence = await verifyProviderCredential({
    fullName: cleanValue(input.fullName),
    serviceCategory: input.serviceCategory,
    certificationNumber,
    certificationNumberConfirmation,
    certificationHolderName,
    certificationIssuer,
    certificationName,
    idNumber: cleanValue(input.idNumber),
    policeClearanceNumber: cleanValue(input.policeClearanceNumber),
  });

  return {
    name: "serviceCertification",
    label: requirement.label,
    valid: credentialEvidence.level === OFFLINE_EVIDENCE_LEVEL,
    reason: credentialEvidence.reason,
    provider: credentialEvidence.source,
    requiresManualReview: false,
    details: {
      evidenceLevel: credentialEvidence.level,
      verificationMethod: credentialEvidence.method,
      sourceUrl: credentialEvidence.sourceUrl,
      checkedAt: credentialEvidence.checkedAt,
      holderMatched: credentialEvidence.holderMatched,
      issuerMatched: credentialEvidence.issuerMatched,
      qualificationMatched: credentialEvidence.qualificationMatched,
      ...credentialEvidence.details,
    },
  };
}

export async function runProviderQualificationCheck(
  input: ProviderQualificationInput,
): Promise<ProviderQualificationResult> {
  const idNumber = cleanValue(input.idNumber);
  const policeClearanceNumber = cleanValue(input.policeClearanceNumber);

  const [documentVerification, certificationVerification] = await Promise.all([
    verificationService.verifyAllDocuments({
      fullName: cleanValue(input.fullName),
      identityDocumentName: cleanValue(input.identityDocumentName),
      idNumber,
      idNumberConfirmation: cleanValue(input.idNumberConfirmation),
      policeClearanceName: cleanValue(input.policeClearanceName),
      policeClearanceNumber,
      policeClearanceNumberConfirmation: cleanValue(
        input.policeClearanceNumberConfirmation,
      ),
    }),
    verifyServiceCertification(input),
  ]);

  return buildQualificationResult([
    fromVerificationResult(
      "identity",
      "National ID",
      documentVerification.idVerification,
    ),
    fromVerificationResult(
      "policeClearance",
      "Police clearance",
      documentVerification.policeClearanceVerification,
    ),
    certificationVerification,
  ]);
}

function parseCheckedAt(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function getCredentialEvidenceSummary(
  result: ProviderQualificationResult,
): CredentialEvidenceSummary {
  const check = result.checks.find(
    (qualificationCheck) => qualificationCheck.name === "serviceCertification",
  );
  const level =
    typeof check?.details?.evidenceLevel === "string"
      ? check.details.evidenceLevel
      : null;
  const method =
    typeof check?.details?.verificationMethod === "string"
      ? check.details.verificationMethod
      : null;
  const source =
    typeof check?.details?.sourceUrl === "string"
      ? check.details.sourceUrl
      : null;
  const reference =
    typeof check?.details?.reference === "string"
      ? check.details.reference
      : null;
  const checkedAt = parseCheckedAt(check?.details?.checkedAt);
  const offlineValidated =
    check?.valid === true &&
    level === OFFLINE_EVIDENCE_LEVEL &&
    method === OFFLINE_VALIDATION_METHOD &&
    Boolean(source && reference && checkedAt);

  return {
    level,
    method,
    source,
    reference,
    checkedAt,
    offlineValidated,
  };
}

function getOfflineRecordEvidence(
  result: ProviderQualificationResult,
  checkName: "identity" | "policeClearance",
): OfflineRecordEvidence {
  const check = result.checks.find(
    (qualificationCheck) => qualificationCheck.name === checkName,
  );
  const level =
    typeof check?.details?.evidenceLevel === "string"
      ? check.details.evidenceLevel
      : null;
  const method =
    typeof check?.details?.verificationMethod === "string"
      ? check.details.verificationMethod
      : null;
  const source =
    typeof check?.details?.sourceUrl === "string"
      ? check.details.sourceUrl
      : null;
  const reference =
    typeof check?.details?.reference === "string"
      ? check.details.reference
      : null;
  const checkedAt = parseCheckedAt(check?.details?.checkedAt);
  const sealed =
    check?.valid === true &&
    check.requiresManualReview === false &&
    level === OFFLINE_EVIDENCE_LEVEL &&
    method === OFFLINE_VALIDATION_METHOD &&
    Boolean(source && reference && checkedAt);

  return { level, method, source, reference, checkedAt, sealed };
}

export function getOfflineRecordEvidenceSummary(
  result: ProviderQualificationResult,
): OfflineRecordEvidenceSummary {
  return {
    identity: getOfflineRecordEvidence(result, "identity"),
    policeClearance: getOfflineRecordEvidence(result, "policeClearance"),
  };
}

export function hasOfflineValidationConfigurationFailure(
  result: ProviderQualificationResult,
) {
  return result.checks.some(
    (check) => check.details?.errorCode === "EVIDENCE_SEAL_NOT_CONFIGURED",
  );
}

function buildQualificationResult(
  checks: QualificationCheck[],
): ProviderQualificationResult {
  const blockingErrors = checks
    .filter((check) => !check.valid)
    .map((check) => `${check.label}: ${check.reason}`);
  const accepted = blockingErrors.length === 0;
  const adminNotes = checks
    .map((check) => {
      const state = check.valid ? "accepted" : "rejected";
      return `${check.label}: ${state} via ${check.provider}. ${check.reason}`;
    })
    .join("\n");

  return {
    accepted,
    autoApproved: accepted,
    recommendedStatus: accepted ? "APPROVED" : "PENDING",
    adminNotes,
    blockingErrors,
    checks,
  };
}
