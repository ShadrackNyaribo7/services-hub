import "server-only";
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

export type CredentialEvidenceLevel =
  | "SELF_ATTESTED"
  | "UNAVAILABLE"
  | "REJECTED";

export type CredentialVerificationEvidence = {
  level: CredentialEvidenceLevel;
  method: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  reason: string;
  holderMatched: boolean | null;
  issuerMatched: boolean | null;
  qualificationMatched: boolean | null;
  details?: Record<string, unknown>;
};

export type CredentialVerificationInput = {
  fullName: string;
  serviceCategory: string;
  certificationNumber: string;
  certificationNumberConfirmation: string;
  certificationHolderName: string;
  certificationIssuer: string;
  certificationName: string;
  idNumber: string;
  policeClearanceNumber: string;
};

export const CREDENTIAL_MODALITY_INDEX = [
  {
    rank: 1,
    method: "DUPLICATE_ENTRY_MATCH",
    strength: "INPUT_INTEGRITY",
    use: "Reject transcription differences in the credential number",
  },
  {
    rank: 2,
    method: "HOLDER_NAME_CROSS_CHECK",
    strength: "CROSS_FIELD_CONSISTENCY",
    use: "Require the printed credential holder to match the applicant",
  },
  {
    rank: 3,
    method: "CATEGORY_CREDENTIAL_RULES",
    strength: "PLAUSIBILITY",
    use: "Check category, issuer claim, qualification title, and number pattern",
  },
  {
    rank: 4,
    method: "HMAC_EVIDENCE_SEAL",
    strength: "TAMPER_EVIDENCE",
    use: "Bind the accepted submission fields to a server-generated reference",
  },
] as const;

const SOURCE = "Offline credential evidence validator";
const SOURCE_URL = "local://offline-evidence/credential/v1";

const ISSUER_ALIASES: Record<string, string> = {
  cdacc: "TVET Curriculum Development Assessment and Certification Council",
  epra: "Energy and Petroleum Regulatory Authority",
  knec: "Kenya National Examinations Council",
  nca: "National Construction Authority",
  nita: "National Industrial Training Authority",
  tveta: "Technical and Vocational Education and Training Authority",
  "tvet cdacc":
    "TVET Curriculum Development Assessment and Certification Council",
};

const LOCALLY_RECOGNIZED_ISSUERS = new Set(
  Object.values(ISSUER_ALIASES).map((issuer) => normalizeText(issuer)),
);

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveIssuerAlias(value: string) {
  const normalized = normalizeText(value);
  return ISSUER_ALIASES[normalized] ?? value.normalize("NFKC").trim();
}

function evidence(
  values: Omit<CredentialVerificationEvidence, "checkedAt">,
): CredentialVerificationEvidence {
  return { ...values, checkedAt: new Date().toISOString() };
}

function rejected(
  reason: string,
  matches: {
    holderMatched?: boolean | null;
    issuerMatched?: boolean | null;
    qualificationMatched?: boolean | null;
  } = {},
) {
  return evidence({
    level: "REJECTED",
    method: OFFLINE_VALIDATION_METHOD,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    reason,
    holderMatched: matches.holderMatched ?? null,
    issuerMatched: matches.issuerMatched ?? null,
    qualificationMatched: matches.qualificationMatched ?? null,
    details: {
      authenticityEstablished: false,
      validationVersion: OFFLINE_VALIDATION_VERSION,
    },
  });
}

function hasPlausibleText(value: string, minimumLength: number) {
  const normalized = normalizeText(value);
  return (
    normalized.length >= minimumLength &&
    /[a-z]{2}/.test(normalized) &&
    !/^(test|sample|demo|fake|unknown|none|na|self issued)$/.test(normalized)
  );
}

function categoryQualificationMatches(category: string, name: string) {
  const normalized = normalizeText(name);

  if (category === "electrical") {
    return (
      normalized.includes("electrical") &&
      /\b(worker|licence|license|installation|technician)\b/.test(normalized)
    );
  }

  if (category === "plumber" || category === "plumbing") {
    return /\b(plumb\w*|pipe\s?fitt\w*|water installation)\b/.test(normalized);
  }

  if (category === "mechanic") {
    return /\b(mechanic\w*|automotive|motor vehicle|vehicle maintenance)\b/.test(
      normalized,
    );
  }

  return category === "cleaning";
}

export async function verifyProviderCredential(
  input: CredentialVerificationInput,
): Promise<CredentialVerificationEvidence> {
  const category = normalizeText(input.serviceCategory);
  const certificationNumber = input.certificationNumber
    .normalize("NFKC")
    .trim();
  const confirmation = input.certificationNumberConfirmation
    .normalize("NFKC")
    .trim();
  const holderName = input.certificationHolderName.normalize("NFKC").trim();
  const issuer = resolveIssuerAlias(input.certificationIssuer);
  const certificationName = input.certificationName.normalize("NFKC").trim();

  const holderNameError = validateHumanName(holderName);
  if (holderNameError) {
    return rejected(`Credential holder name: ${holderNameError}`, {
      holderMatched: false,
    });
  }

  if (!namesMatch(input.fullName, holderName)) {
    return rejected(
      "The name printed on the credential does not match the application name.",
      { holderMatched: false },
    );
  }

  if (
    normalizeDocumentNumber(certificationNumber) !==
    normalizeDocumentNumber(confirmation)
  ) {
    return rejected("Professional credential number entries do not match.", {
      holderMatched: true,
    });
  }

  if (
    certificationNumber.length < 5 ||
    certificationNumber.length > 64 ||
    !/^[A-Za-z0-9][A-Za-z0-9\s\-/.]*[A-Za-z0-9]$/.test(certificationNumber) ||
    hasSuspiciousDocumentValue(certificationNumber)
  ) {
    return rejected(
      "Professional credential number has an invalid or suspicious format.",
      { holderMatched: true },
    );
  }

  const normalizedCertificationNumber =
    normalizeDocumentNumber(certificationNumber);
  if (
    normalizedCertificationNumber === normalizeDocumentNumber(input.idNumber) ||
    normalizedCertificationNumber ===
      normalizeDocumentNumber(input.policeClearanceNumber)
  ) {
    return rejected(
      "Professional credential number must be distinct from the National ID and police clearance numbers.",
      { holderMatched: true },
    );
  }

  if (
    issuer.length > 160 ||
    certificationName.length > 160 ||
    !hasPlausibleText(issuer, 3) ||
    !hasPlausibleText(certificationName, 5)
  ) {
    return rejected(
      "Credential issuer and qualification name must be plausible, non-placeholder values of 160 characters or fewer.",
      { holderMatched: true },
    );
  }

  const normalizedIssuer = normalizeText(issuer);
  const issuerInLocalReferenceList =
    LOCALLY_RECOGNIZED_ISSUERS.has(normalizedIssuer);

  if (!issuerInLocalReferenceList) {
    return rejected(
      "Credential issuer is not in the local approved-issuer reference list.",
      {
        holderMatched: true,
        issuerMatched: false,
        qualificationMatched: null,
      },
    );
  }

  if (category === "electrical") {
    const expectedIssuer = normalizeText(
      "Energy and Petroleum Regulatory Authority",
    );

    if (normalizedIssuer !== expectedIssuer) {
      return rejected(
        "Electrical providers must claim an electrical-worker licence issued by EPRA.",
        {
          holderMatched: true,
          issuerMatched: false,
          qualificationMatched: false,
        },
      );
    }

    if (!/^EPRA\/EW\/\d{4,10}$/i.test(certificationNumber.replace(/\s/g, ""))) {
      return rejected(
        "Electrical providers must enter an EPRA electrical-worker licence in the form EPRA/EW/12345.",
        {
          holderMatched: true,
          issuerMatched: true,
          qualificationMatched: false,
        },
      );
    }
  }

  const qualificationMatched = categoryQualificationMatches(
    category,
    certificationName,
  );
  if (!qualificationMatched) {
    return rejected(
      "The qualification or licence name is not consistent with the selected service category.",
      {
        holderMatched: true,
        issuerMatched: issuerInLocalReferenceList,
        qualificationMatched: false,
      },
    );
  }

  const reference = createOfflineEvidenceReference("CREDENTIAL", {
    certificationName: normalizeText(certificationName),
    certificationNumber: normalizedCertificationNumber,
    fullName: normalizeName(input.fullName),
    issuer: normalizedIssuer,
    serviceCategory: category,
  });

  if (!reference) {
    return evidence({
      level: "UNAVAILABLE",
      method: OFFLINE_VALIDATION_METHOD,
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      reason:
        "Offline evidence sealing is not configured. Set a server-only OFFLINE_VERIFICATION_SECRET of at least 32 characters.",
      holderMatched: true,
      issuerMatched: issuerInLocalReferenceList,
      qualificationMatched: true,
      details: {
        errorCode: "EVIDENCE_SEAL_NOT_CONFIGURED",
        authenticityEstablished: false,
        validationVersion: OFFLINE_VALIDATION_VERSION,
      },
    });
  }

  return evidence({
    level: OFFLINE_EVIDENCE_LEVEL,
    method: OFFLINE_VALIDATION_METHOD,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    reason:
      "Credential entries are internally consistent, match the local approved-issuer policy, and are sealed for automatic policy evaluation. No regulator, issuer, EPRA, or KNQA database lookup was performed.",
    holderMatched: true,
    issuerMatched: issuerInLocalReferenceList,
    qualificationMatched: true,
    details: {
      reference,
      riskFlags: [],
      resolvedIssuer: issuer,
      integrityProtected: true,
      authenticityEstablished: false,
      requiresManualReview: false,
      productionAutoApprovalEligible: true,
      validationVersion: OFFLINE_VALIDATION_VERSION,
    },
  });
}
