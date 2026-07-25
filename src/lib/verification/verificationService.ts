import "server-only";
import type { VerificationResult } from "@/types";

export type { VerificationResult } from "@/types";

type VerificationGatewayConfig = {
  endpoint: string;
  token: string;
  authHeader: string;
  authScheme: string;
  sourceName: string;
};

type VerificationGatewayResponse = {
  verified: boolean;
  reference?: string;
  checkedAt?: string;
  reason?: string;
  subject?: {
    idNumber?: string;
    fullName?: string;
  };
  document?: {
    number?: string;
    validUntil?: string;
  };
};

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const AUTOMATED_VERIFIER = "AUTOMATED_OFFICIAL_API";
const IDENTITY_ONBOARDING_URL =
  "https://usajili.go.ke/national-population-data-management-npdm-formerly-iprs";
const DCI_VERIFICATION_URL = "https://dci.ecitizen.go.ke/verify";

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

function normalizeDocumentNumber(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function namesMatch(expected: string, actual: string) {
  const normalizedExpected = normalizeName(expected);
  return (
    Boolean(normalizedExpected) && normalizedExpected === normalizeName(actual)
  );
}

function safeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 240) : fallback;
}

function unavailableResult({
  label,
  reason,
  sourceUrl,
  errorCode,
  retryable,
}: {
  label: string;
  reason: string;
  sourceUrl: string;
  errorCode: string;
  retryable: boolean;
}): VerificationResult {
  return {
    valid: false,
    reason,
    provider: "AutomatedOfficialRecordsVerification",
    details: {
      evidenceLevel: "UNAVAILABLE",
      verificationMethod: AUTOMATED_VERIFIER,
      sourceUrl,
      errorCode,
      retryable,
      automationRequired: true,
      label,
      requiresManualReview: false,
    },
  };
}

function getGatewayConfig(
  prefix: "KENYA_IDENTITY" | "KENYA_DCI",
): VerificationGatewayConfig | null {
  const endpoint = process.env[`${prefix}_VERIFY_URL`]?.trim();
  const token = process.env[`${prefix}_API_TOKEN`]?.trim();

  if (!endpoint || !token) return null;

  try {
    const url = new URL(endpoint);
    const isLocalTestEndpoint =
      url.hostname === "localhost" || url.hostname.endsWith(".test");

    if (url.protocol !== "https:" && !isLocalTestEndpoint) return null;
  } catch {
    return null;
  }

  const authHeader =
    process.env[`${prefix}_AUTH_HEADER`]?.trim() || "Authorization";

  if (!/^[A-Za-z0-9-]+$/.test(authHeader)) return null;

  return {
    endpoint,
    token,
    authHeader,
    authScheme: process.env[`${prefix}_AUTH_SCHEME`]?.trim() ?? "Bearer",
    sourceName:
      process.env[`${prefix}_SOURCE_NAME`]?.trim() ||
      (prefix === "KENYA_IDENTITY"
        ? "Kenya NPDM identity verification"
        : "Kenya DCI police-clearance verification"),
  };
}

async function callVerificationGateway(
  config: VerificationGatewayConfig,
  payload: Record<string, unknown>,
): Promise<VerificationGatewayResponse> {
  const authorizationValue = config.authScheme
    ? `${config.authScheme} ${config.token}`
    : config.token;
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [config.authHeader]: authorizationValue,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Verification gateway returned HTTP ${response.status}.`);
  }

  const body: unknown = await response.json();

  if (typeof body !== "object" || body === null || !("verified" in body)) {
    throw new Error("Verification gateway returned an invalid response.");
  }

  const verificationResponse = body as VerificationGatewayResponse;

  if (typeof verificationResponse.verified !== "boolean") {
    throw new Error("Verification gateway returned an invalid decision.");
  }

  return verificationResponse;
}

function validatePositiveResponse({
  response,
  config,
  expectedIdNumber,
  expectedFullName,
  expectedDocumentNumber,
  successReason,
}: {
  response: VerificationGatewayResponse;
  config: VerificationGatewayConfig;
  expectedIdNumber: string;
  expectedFullName: string;
  expectedDocumentNumber?: string;
  successReason: string;
}): VerificationResult {
  if (!response.verified) {
    return {
      valid: false,
      reason: safeText(
        response.reason,
        "The official record was not verified.",
      ),
      provider: config.sourceName,
      details: {
        evidenceLevel: "REJECTED",
        verificationMethod: AUTOMATED_VERIFIER,
        sourceUrl: config.endpoint,
        requiresManualReview: false,
      },
    };
  }

  const reference = response.reference?.trim();
  const checkedAt = response.checkedAt
    ? new Date(response.checkedAt)
    : new Date(Number.NaN);
  const checkedAtValue = checkedAt.valueOf();
  const now = Date.now();

  if (
    !reference ||
    !Number.isFinite(checkedAtValue) ||
    checkedAtValue < now - MAX_EVIDENCE_AGE_MS ||
    checkedAtValue > now + CLOCK_SKEW_MS
  ) {
    return unavailableResult({
      label: "Official record",
      reason:
        "The automated verifier returned stale or incomplete audit evidence.",
      sourceUrl: config.endpoint,
      errorCode: "INVALID_EVIDENCE",
      retryable: true,
    });
  }

  if (
    response.subject?.idNumber?.trim() !== expectedIdNumber ||
    !response.subject.fullName ||
    !namesMatch(expectedFullName, response.subject.fullName)
  ) {
    return {
      valid: false,
      reason:
        "The official record does not match the submitted applicant identity.",
      provider: config.sourceName,
      details: {
        evidenceLevel: "REJECTED",
        verificationMethod: AUTOMATED_VERIFIER,
        sourceUrl: config.endpoint,
        checkedAt: checkedAt.toISOString(),
        reference,
        requiresManualReview: false,
      },
    };
  }

  if (
    expectedDocumentNumber &&
    normalizeDocumentNumber(response.document?.number ?? "") !==
      normalizeDocumentNumber(expectedDocumentNumber)
  ) {
    return {
      valid: false,
      reason:
        "The verified police-clearance record does not match the submitted certificate number.",
      provider: config.sourceName,
      details: {
        evidenceLevel: "REJECTED",
        verificationMethod: AUTOMATED_VERIFIER,
        sourceUrl: config.endpoint,
        checkedAt: checkedAt.toISOString(),
        reference,
        requiresManualReview: false,
      },
    };
  }

  const validUntil = response.document?.validUntil
    ? new Date(response.document.validUntil)
    : null;

  if (
    validUntil &&
    Number.isFinite(validUntil.valueOf()) &&
    validUntil < new Date()
  ) {
    return {
      valid: false,
      reason: "The verified police-clearance certificate is no longer valid.",
      provider: config.sourceName,
      details: {
        evidenceLevel: "REJECTED",
        verificationMethod: AUTOMATED_VERIFIER,
        sourceUrl: config.endpoint,
        checkedAt: checkedAt.toISOString(),
        reference,
        validUntil: validUntil.toISOString(),
        requiresManualReview: false,
      },
    };
  }

  return {
    valid: true,
    reason: successReason,
    provider: config.sourceName,
    details: {
      evidenceLevel: "AUTHORITATIVE",
      verificationMethod: AUTOMATED_VERIFIER,
      sourceUrl: config.endpoint,
      checkedAt: checkedAt.toISOString(),
      reference,
      validUntil: validUntil?.toISOString(),
      requiresManualReview: false,
    },
  };
}

class VerificationService {
  async verifyIdNumber(
    idNumber: string,
    fullName: string,
  ): Promise<VerificationResult> {
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

    const config = getGatewayConfig("KENYA_IDENTITY");

    if (!config) {
      return unavailableResult({
        label: "National ID",
        reason:
          "Automated National ID verification is not configured. Approval is blocked until the official integration is available.",
        sourceUrl: IDENTITY_ONBOARDING_URL,
        errorCode: "NOT_CONFIGURED",
        retryable: false,
      });
    }

    try {
      const response = await callVerificationGateway(config, {
        verificationType: "NATIONAL_ID",
        subject: { idNumber: normalized, fullName: fullName.trim() },
        consent: { granted: true, purpose: "PROVIDER_ONBOARDING" },
      });

      return validatePositiveResponse({
        response,
        config,
        expectedIdNumber: normalized,
        expectedFullName: fullName,
        successReason:
          "National ID matched the authoritative identity register.",
      });
    } catch {
      return unavailableResult({
        label: "National ID",
        reason:
          "Automated National ID verification is temporarily unavailable. Approval remains blocked.",
        sourceUrl: config.endpoint,
        errorCode: "UPSTREAM_UNAVAILABLE",
        retryable: true,
      });
    }
  }

  async verifyPoliceClearance(
    certificateNumber: string,
    idNumber: string,
    fullName: string,
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

    const config = getGatewayConfig("KENYA_DCI");

    if (!config) {
      return unavailableResult({
        label: "Police clearance",
        reason:
          "Automated DCI verification is not configured. Approval is blocked until an authorized DCI integration is available.",
        sourceUrl: DCI_VERIFICATION_URL,
        errorCode: "NOT_CONFIGURED",
        retryable: false,
      });
    }

    try {
      const response = await callVerificationGateway(config, {
        verificationType: "POLICE_CLEARANCE_CERTIFICATE",
        subject: { idNumber: idNumber.trim(), fullName: fullName.trim() },
        document: { number: normalized },
        consent: { granted: true, purpose: "PROVIDER_ONBOARDING" },
      });

      return validatePositiveResponse({
        response,
        config,
        expectedIdNumber: idNumber.trim(),
        expectedFullName: fullName,
        expectedDocumentNumber: normalized,
        successReason:
          "Police-clearance certificate matched the authoritative DCI record.",
      });
    } catch {
      return unavailableResult({
        label: "Police clearance",
        reason:
          "Automated DCI verification is temporarily unavailable. Approval remains blocked.",
        sourceUrl: config.endpoint,
        errorCode: "UPSTREAM_UNAVAILABLE",
        retryable: true,
      });
    }
  }

  async verifyAllDocuments(documents: {
    fullName: string;
    idNumber: string;
    policeClearanceNumber: string;
  }) {
    const [idVerification, policeClearanceVerification] = await Promise.all([
      this.verifyIdNumber(documents.idNumber, documents.fullName),
      this.verifyPoliceClearance(
        documents.policeClearanceNumber,
        documents.idNumber,
        documents.fullName,
      ),
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
