export type CredentialEvidenceLevel =
  | "AUTHORITATIVE"
  | "CORROBORATED"
  | "INCONCLUSIVE"
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
  certificationIssuer: string;
  certificationName: string;
};

export const CREDENTIAL_MODALITY_INDEX = [
  {
    rank: 1,
    method: "EPRA_PUBLIC_REGISTER",
    strength: "AUTHORITATIVE",
    use: "Electrical worker licence, holder name, and expiry",
  },
  {
    rank: 2,
    method: "KNQA_CERTIFICATE_VERIFICATION",
    strength: "AUTHORITATIVE_MANUAL",
    use: "Individual qualification verification in the authenticated KNQA NQD service",
  },
  {
    rank: 3,
    method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
    strength: "CORROBORATED",
    use: "Qualification-awarding body and qualification registration",
  },
  {
    rank: 4,
    method: "ISSUER_OR_REGULATOR_CONFIRMATION",
    strength: "AUTHORITATIVE_MANUAL",
    use: "NCA, NITA, TVETA, KNEC, or issuing-institution confirmation",
  },
] as const;

const EPRA_REGISTER_URL =
  "https://portal.epra.go.ke:8450/licence-register/index";
const KNQA_QUALIFICATIONS_URL =
  "https://nqd.knqa.go.ke/registered-qualifications/";
const KNQA_QUERY_URL = "https://nqd.knqa.go.ke/query-qualifications/";
const REQUEST_TIMEOUT_MS = 8_000;

const ISSUER_ALIASES: Record<string, string> = {
  cdacc:
    "TVET Curriculum Development Assessment and Certification Council",
  epra: "Energy and Petroleum Regulatory Authority",
  knec: "Kenya National Examinations Council",
  nita: "National Industrial Training Authority",
  "tvet cdacc":
    "TVET Curriculum Development Assessment and Certification Council",
};

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlText(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

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

function normalizeHolderName(value: string) {
  return normalizeText(value).split(" ").filter(Boolean).sort().join(" ");
}

function normalizeLicenceNumber(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function evidence(
  values: Omit<CredentialVerificationEvidence, "checkedAt">,
): CredentialVerificationEvidence {
  return {
    ...values,
    checkedAt: new Date().toISOString(),
  };
}

function requestSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function extractCookieHeader(response: Response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const cookies = [...setCookie.matchAll(/(?:^|,\s*)([\w-]+)=([^;,]*)/g)]
    .filter((match) => match[1] === "csrftoken" || match[1] === "sessionid")
    .map((match) => `${match[1]}=${match[2]}`);

  return cookies.join("; ");
}

function resolveIssuerAlias(value: string) {
  const normalized = normalizeText(value);
  return ISSUER_ALIASES[normalized] ?? value;
}

async function verifyEpraElectricalWorker(
  input: CredentialVerificationInput,
): Promise<CredentialVerificationEvidence> {
  const licenceNumber = normalizeLicenceNumber(input.certificationNumber);
  const sourceUrl = new URL(EPRA_REGISTER_URL);
  sourceUrl.searchParams.set("category", "MQ,,");
  sourceUrl.searchParams.set(
    "LicenceApplicationSearch[LicenceNumber]",
    licenceNumber,
  );

  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      headers: { Accept: "text/html" },
      signal: requestSignal(),
    });

    if (!response.ok) {
      throw new Error(`EPRA returned HTTP ${response.status}`);
    }

    const body = await response.text();
    const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
      (row) =>
        [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
          htmlText(cell[1]),
        ),
    );
    const record = rows.find(
      (row) => normalizeLicenceNumber(row[3] ?? "") === licenceNumber,
    );

    if (!record) {
      return evidence({
        level: "REJECTED",
        method: "EPRA_PUBLIC_REGISTER",
        source: "Energy and Petroleum Regulatory Authority",
        sourceUrl: sourceUrl.toString(),
        reason: "The electrical-worker licence was not found in the EPRA register.",
        holderMatched: false,
        issuerMatched: true,
        qualificationMatched: false,
      });
    }

    const registeredName = record[1] ?? "";
    const licenceClass = record[2] ?? "";
    const expiryDate = record[5] ?? "";
    const holderMatched =
      normalizeHolderName(registeredName) === normalizeHolderName(input.fullName);

    if (!holderMatched) {
      return evidence({
        level: "REJECTED",
        method: "EPRA_PUBLIC_REGISTER",
        source: "Energy and Petroleum Regulatory Authority",
        sourceUrl: sourceUrl.toString(),
        reason: "The licence exists, but the EPRA holder name does not match the applicant.",
        holderMatched: false,
        issuerMatched: true,
        qualificationMatched: true,
        details: { licenceClass, expiryDate, registeredName },
      });
    }

    const expiry = /^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
      ? new Date(`${expiryDate}T23:59:59Z`)
      : null;

    if (!expiry || Number.isNaN(expiry.valueOf()) || expiry < new Date()) {
      return evidence({
        level: "REJECTED",
        method: "EPRA_PUBLIC_REGISTER",
        source: "Energy and Petroleum Regulatory Authority",
        sourceUrl: sourceUrl.toString(),
        reason: "The EPRA electrical-worker licence is expired or has no valid expiry date.",
        holderMatched: true,
        issuerMatched: true,
        qualificationMatched: true,
        details: { licenceClass, expiryDate, registeredName },
      });
    }

    return evidence({
      level: "AUTHORITATIVE",
      method: "EPRA_PUBLIC_REGISTER",
      source: "Energy and Petroleum Regulatory Authority",
      sourceUrl: sourceUrl.toString(),
      reason: "EPRA confirms the licence number, holder name, class, and current expiry.",
      holderMatched: true,
      issuerMatched: true,
      qualificationMatched: true,
      details: { licenceClass, expiryDate, registeredName },
    });
  } catch (error) {
    return evidence({
      level: "INCONCLUSIVE",
      method: "EPRA_PUBLIC_REGISTER",
      source: "Energy and Petroleum Regulatory Authority",
      sourceUrl: sourceUrl.toString(),
      reason:
        "EPRA could not be reached. An administrator must verify the licence in the official register before approval.",
      holderMatched: null,
      issuerMatched: true,
      qualificationMatched: null,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
  }
}

function parseInstitutionOptions(body: string) {
  const select = body.match(
    /<select[^>]+id="institutionName"[^>]*>([\s\S]*?)<\/select>/i,
  )?.[1];

  if (!select) {
    return [];
  }

  return [...select.matchAll(/<option[^>]+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((option) => ({ id: option[1], name: htmlText(option[2]) }))
    .filter((option) => option.id && option.name);
}

function parseQualificationNames(body: string) {
  return [
    ...body.matchAll(
      /Qualification Name:<\/strong>\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/gi,
    ),
  ].map((match) => htmlText(match[1]));
}

async function verifyKnqaQualification(
  input: CredentialVerificationInput,
): Promise<CredentialVerificationEvidence> {
  try {
    const initialResponse = await fetch(KNQA_QUALIFICATIONS_URL, {
      cache: "no-store",
      headers: { Accept: "text/html" },
      signal: requestSignal(),
    });

    if (!initialResponse.ok) {
      throw new Error(`KNQA returned HTTP ${initialResponse.status}`);
    }

    const initialBody = await initialResponse.text();
    const csrfToken = initialBody.match(
      /name="csrfmiddlewaretoken"\s+value="([^"]+)"/i,
    )?.[1];
    const expectedIssuer = normalizeText(resolveIssuerAlias(input.certificationIssuer));
    const issuer = parseInstitutionOptions(initialBody).find(
      (option) => normalizeText(option.name) === expectedIssuer,
    );

    if (!csrfToken) {
      throw new Error("KNQA did not return a CSRF token");
    }

    if (!issuer) {
      return evidence({
        level: "INCONCLUSIVE",
        method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
        source: "Kenya National Qualifications Authority",
        sourceUrl: KNQA_QUALIFICATIONS_URL,
        reason:
          "The named issuer was not found in the KNQA awarding-body list. Verify it with KNQA, TVETA, NCA, NITA, KNEC, or the issuing institution before approval.",
        holderMatched: null,
        issuerMatched: false,
        qualificationMatched: null,
      });
    }

    const form = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      qualificationType: "",
      institutionType: "",
      institutionName: issuer.id,
      qualificationSearch: input.certificationName,
    });
    const queryResponse = await fetch(KNQA_QUERY_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Cookie: extractCookieHeader(initialResponse),
        Referer: KNQA_QUALIFICATIONS_URL,
        "X-CSRFToken": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: form,
      signal: requestSignal(),
    });

    if (!queryResponse.ok) {
      throw new Error(`KNQA query returned HTTP ${queryResponse.status}`);
    }

    const queryBody = await queryResponse.text();
    const requestedQualification = normalizeText(input.certificationName);
    const matchedQualification = parseQualificationNames(queryBody).find(
      (name) => normalizeText(name) === requestedQualification,
    );

    if (!matchedQualification) {
      return evidence({
        level: "INCONCLUSIVE",
        method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
        source: "Kenya National Qualifications Authority",
        sourceUrl: KNQA_QUALIFICATIONS_URL,
        reason:
          "KNQA recognizes the issuer, but an exact registered qualification title was not found. Official holder-level confirmation is required.",
        holderMatched: null,
        issuerMatched: true,
        qualificationMatched: false,
        details: { registeredIssuer: issuer.name },
      });
    }

    return evidence({
      level: "CORROBORATED",
      method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
      source: "Kenya National Qualifications Authority",
      sourceUrl: KNQA_QUALIFICATIONS_URL,
      reason:
        "KNQA confirms the awarding body and qualification, but its public register does not confirm that this applicant received the certificate.",
      holderMatched: null,
      issuerMatched: true,
      qualificationMatched: true,
      details: {
        registeredIssuer: issuer.name,
        registeredQualification: matchedQualification,
      },
    });
  } catch (error) {
    return evidence({
      level: "INCONCLUSIVE",
      method: "KNQA_QAB_AND_QUALIFICATION_REGISTER",
      source: "Kenya National Qualifications Authority",
      sourceUrl: KNQA_QUALIFICATIONS_URL,
      reason:
        "KNQA could not be reached. Official holder-level confirmation is required before approval.",
      holderMatched: null,
      issuerMatched: null,
      qualificationMatched: null,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
  }
}

export async function verifyProviderCredential(
  input: CredentialVerificationInput,
): Promise<CredentialVerificationEvidence> {
  if (normalizeText(input.serviceCategory) === "electrical") {
    const expectedIssuer = normalizeText(
      "Energy and Petroleum Regulatory Authority",
    );
    const submittedIssuer = normalizeText(
      resolveIssuerAlias(input.certificationIssuer),
    );

    if (submittedIssuer !== expectedIssuer) {
      return evidence({
        level: "REJECTED",
        method: "EPRA_PUBLIC_REGISTER",
        source: "Energy and Petroleum Regulatory Authority",
        sourceUrl: EPRA_REGISTER_URL,
        reason:
          "Electrical providers must submit a licence issued by the Energy and Petroleum Regulatory Authority (EPRA).",
        holderMatched: false,
        issuerMatched: false,
        qualificationMatched: false,
      });
    }

    if (!/^EPRA\/EW\/\d{4,10}$/i.test(normalizeLicenceNumber(input.certificationNumber))) {
      return evidence({
        level: "REJECTED",
        method: "EPRA_PUBLIC_REGISTER",
        source: "Energy and Petroleum Regulatory Authority",
        sourceUrl: EPRA_REGISTER_URL,
        reason:
          "Electrical providers must submit an EPRA electrical-worker licence in the form EPRA/EW/12345.",
        holderMatched: false,
        issuerMatched: false,
        qualificationMatched: false,
      });
    }

    return verifyEpraElectricalWorker(input);
  }

  return verifyKnqaQualification(input);
}
