import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const OFFLINE_VALIDATION_VERSION = "OFFLINE_EVIDENCE_V1";
export const OFFLINE_VALIDATION_METHOD = "OFFLINE_CROSS_FIELD_VALIDATION";
export const OFFLINE_EVIDENCE_LEVEL = "SELF_ATTESTED";

type EvidenceValue = string | number | boolean | null | undefined;

function getEvidenceSecret() {
  const secret =
    process.env.OFFLINE_VERIFICATION_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim();

  return secret && secret.length >= 32 ? secret : null;
}

function canonicalizeEvidence(
  kind: string,
  values: Record<string, EvidenceValue>,
) {
  const fields = Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, rawValue]) => {
      const value = String(rawValue ?? "").normalize("NFKC");
      return `${key.length}:${key}:${value.length}:${value}`;
    })
    .join("|");

  return `${OFFLINE_VALIDATION_VERSION}|${kind}|${fields}`;
}

export function createOfflineEvidenceReference(
  kind: "IDENTITY" | "POLICE_CLEARANCE" | "CREDENTIAL",
  values: Record<string, EvidenceValue>,
) {
  const secret = getEvidenceSecret();

  if (!secret) return null;

  const digest = createHmac("sha256", secret)
    .update(canonicalizeEvidence(kind, values), "utf8")
    .digest("hex")
    .toUpperCase();

  return `OEV1-${kind}-${digest}`;
}

export function offlineEvidenceReferenceMatches(
  reference: string | null | undefined,
  kind: "IDENTITY" | "POLICE_CLEARANCE" | "CREDENTIAL",
  values: Record<string, EvidenceValue>,
) {
  const expected = createOfflineEvidenceReference(kind, values);

  if (!reference || !expected) return false;

  const actualBuffer = Buffer.from(reference, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function normalizeDocumentNumber(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
}

export function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export function namesMatch(expected: string, submitted: string) {
  const normalizedExpected = normalizeName(expected);
  return (
    Boolean(normalizedExpected) &&
    normalizedExpected === normalizeName(submitted)
  );
}

export function validateHumanName(value: string) {
  const normalized = value.normalize("NFKC").trim();

  if (normalized.length < 5 || normalized.length > 120) {
    return "Full name must be between 5 and 120 characters.";
  }

  if (
    /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F]/u.test(
      normalized,
    )
  ) {
    return "Full name contains unsupported control characters.";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length < 2 || parts.length > 8) {
    return "Enter the holder's full name using 2 to 8 name parts.";
  }

  if (
    parts.some(
      (part) => part.length > 40 || !/^[\p{L}][\p{L}'’\-]*[\p{L}]$/u.test(part),
    )
  ) {
    return "Names may contain letters, apostrophes, and hyphens only.";
  }

  const compact = normalizeName(normalized).replace(/\s/g, "");
  if (/^(test|sample|unknown|anonymous|none|na)+$/i.test(compact)) {
    return "Full name looks like a placeholder.";
  }

  return null;
}

export function hasSuspiciousDocumentValue(value: string) {
  const compact = value
    .normalize("NFKC")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  if (!compact) return true;

  if (
    /^(test|sample|demo|fake|unknown|none|na|nil|document|certificate|licen[cs]e)\d*$/.test(
      compact,
    )
  ) {
    return true;
  }

  if (/^(.)\1{4,}$/.test(compact) || /^(.{1,4})\1{2,}$/.test(compact)) {
    return true;
  }

  if (/^\d{5,}$/.test(compact)) {
    const ascending = "01234567890123456789";
    const descending = "98765432109876543210";
    if (ascending.includes(compact) || descending.includes(compact)) {
      return true;
    }
  }

  return new Set(compact).size < 3;
}
