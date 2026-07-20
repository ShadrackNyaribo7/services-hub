import { verificationService, type VerificationResult } from "./verificationService";

export type VerificationStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type ProviderQualificationInput = {
  fullName: string;
  serviceCategory: string;
  idNumber?: string | null;
  policeClearanceNumber?: string | null;
  certificationNumber?: string | null;
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

type ServiceCertificationRequirement = {
  required: boolean;
  label: string;
};

const DEFAULT_CERTIFICATION_REQUIREMENT: ServiceCertificationRequirement = {
  required: false,
  label: "Service certification",
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
  plumbing: {
    required: true,
    label: "Plumbing license or trade certificate",
  },
  mechanic: {
    required: true,
    label: "Mechanic trade certificate",
  },
  cleaning: {
    required: false,
    label: "Cleaning or safety certificate",
  },
};

function cleanValue(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeServiceCategory(serviceCategory: string) {
  return serviceCategory.trim().toLowerCase();
}

export function getServiceCertificationRequirement(
  serviceCategory: string,
): ServiceCertificationRequirement {
  return (
    SERVICE_CERTIFICATION_REQUIREMENTS[normalizeServiceCategory(serviceCategory)] ??
    DEFAULT_CERTIFICATION_REQUIREMENT
  );
}

function hasPlaceholderValue(value: string) {
  const normalized = value.replace(/[\s\-/._]/g, "").toLowerCase();

  return (
    normalized === "na" ||
    normalized === "none" ||
    normalized === "test" ||
    normalized === "sample" ||
    normalized === "unknown" ||
    /^(test|sample|unknown|none|na)\d*$/.test(normalized) ||
    /^0+$/.test(normalized) ||
    /^1+$/.test(normalized) ||
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

  if (!/[A-Za-z]/.test(normalized) || !/\d/.test(normalized)) {
    return "Certification number must include both letters and numbers.";
  }

  if (hasPlaceholderValue(normalized)) {
    return "Certification number looks like a placeholder.";
  }

  return null;
}

function verificationNeedsManualReview(result: VerificationResult) {
  return (
    result.provider === "Basic" ||
    Boolean(result.details?.requiresManualReview) ||
    result.reason?.toLowerCase().includes("manual verification") === true ||
    result.reason?.toLowerCase().includes("not configured") === true
  );
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
    reason: result.reason ?? (result.valid ? "Verified" : "Verification failed"),
    provider: result.provider ?? "VerificationService",
    requiresManualReview: result.valid ? verificationNeedsManualReview(result) : false,
    details: result.details,
  };
}

async function verifyServiceCertification({
  fullName,
  serviceCategory,
  certificationNumber,
}: {
  fullName: string;
  serviceCategory: string;
  certificationNumber?: string | null;
}): Promise<QualificationCheck> {
  const requirement = getServiceCertificationRequirement(serviceCategory);
  const normalizedCertificationNumber = cleanValue(certificationNumber);

  if (!normalizedCertificationNumber) {
    return {
      name: "serviceCertification",
      label: requirement.label,
      valid: !requirement.required,
      reason: requirement.required
        ? `${requirement.label} is required for ${serviceCategory} providers.`
        : "No service certification required for this category.",
      provider: "QualificationRules",
      requiresManualReview: false,
    };
  }

  const formatError = validateCertificationNumberFormat(
    normalizedCertificationNumber,
  );

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

  const professionalBodyEnabled =
    process.env.ENABLE_PROFESSIONAL_BODY_VERIFICATION === "true";
  const apiBaseUrl = process.env.PROFESSIONAL_BODY_API_URL;
  const apiKey = process.env.PROFESSIONAL_BODY_API_KEY;

  if (professionalBodyEnabled && apiBaseUrl && apiKey) {
    try {
      const response = await fetch(`${apiBaseUrl}/certifications/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          fullName,
          serviceCategory,
          certificationNumber: normalizedCertificationNumber,
        }),
      });
      const result = (await response.json()) as {
        valid?: boolean;
        reason?: string;
        details?: Record<string, unknown>;
      };

      return {
        name: "serviceCertification",
        label: requirement.label,
        valid: response.ok && result.valid === true,
        reason:
          result.reason ??
          (response.ok
            ? "Professional certification verified."
            : "Professional certification verification failed."),
        provider: "ProfessionalBody",
        requiresManualReview: false,
        details: result.details,
      };
    } catch {
      return {
        name: "serviceCertification",
        label: requirement.label,
        valid: true,
        reason:
          "Professional certification service unavailable; manual admin verification required.",
        provider: "ProfessionalBody",
        requiresManualReview: true,
      };
    }
  }

  return {
    name: "serviceCertification",
    label: requirement.label,
    valid: true,
    reason:
      "Certification format accepted; configure a professional-body API or complete manual admin verification before approval.",
    provider: "QualificationRules",
    requiresManualReview: requirement.required,
  };
}

export async function runProviderQualificationCheck(
  input: ProviderQualificationInput,
): Promise<ProviderQualificationResult> {
  const idNumber = cleanValue(input.idNumber);
  const policeClearanceNumber = cleanValue(input.policeClearanceNumber);

  const missingRequiredFields = [
    !idNumber ? "ID number is required." : null,
    !policeClearanceNumber
      ? "Police clearance certificate number is required."
      : null,
  ].filter(Boolean) as string[];

  if (missingRequiredFields.length > 0) {
    return buildQualificationResult([
      {
        name: "identity",
        label: "National ID",
        valid: Boolean(idNumber),
        reason: idNumber ? "Provided." : "ID number is required.",
        provider: "QualificationRules",
        requiresManualReview: false,
      },
      {
        name: "policeClearance",
        label: "Police clearance",
        valid: Boolean(policeClearanceNumber),
        reason: policeClearanceNumber
          ? "Provided."
          : "Police clearance certificate number is required.",
        provider: "QualificationRules",
        requiresManualReview: false,
      },
      await verifyServiceCertification(input),
    ]);
  }

  const [documentVerification, certificationVerification] = await Promise.all([
    verificationService.verifyAllDocuments({
      idNumber,
      policeClearanceNumber,
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

function buildQualificationResult(
  checks: QualificationCheck[],
): ProviderQualificationResult {
  const blockingErrors = checks
    .filter((check) => !check.valid)
    .map((check) => `${check.label}: ${check.reason}`);
  const accepted = blockingErrors.length === 0;
  const autoApproved =
    accepted && checks.every((check) => !check.requiresManualReview);
  const recommendedStatus: VerificationStatusValue = autoApproved
    ? "APPROVED"
    : "PENDING";
  const adminNotes = checks
    .map((check) => {
      const state = check.valid ? "valid" : "invalid";
      const review = check.requiresManualReview ? "; manual review required" : "";
      return `${check.label}: ${state} via ${check.provider}. ${check.reason}${review}`;
    })
    .join("\n");

  return {
    accepted,
    autoApproved,
    recommendedStatus,
    adminNotes,
    blockingErrors,
    checks,
  };
}
