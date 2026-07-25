# Automated Provider Verification

National ID and DCI Police Clearance Certificate checks are automated and
fail closed. An administrator cannot approve either record with a checkbox or
manual lookup. Approval requires a fresh authoritative response, a matching
applicant name and ID, a matching police-clearance number, and stored audit
references.

## Government onboarding required

National ID verification requires organizational access to Kenya's National
Population Data Management service (formerly IPRS). The official onboarding
requirements, connection fee, and per-verification charge are published here:

https://usajili.go.ke/national-population-data-management-npdm-formerly-iprs

The public DCI checker is an interactive service with a security question and
anti-bot protection:

https://dci.ecitizen.go.ke/verify

The app does not scrape that page or bypass its controls. Obtain an authorized
machine-to-machine DCI integration from DCI/eCitizen, or place a server-side
gateway approved by those agencies in front of the issued integration.

## Server-only environment variables

Configure both providers in the deployment environment. Never prefix these
variables with `NEXT_PUBLIC_`.

```text
KENYA_IDENTITY_VERIFY_URL=https://authorized-identity-endpoint.example/verify
KENYA_IDENTITY_API_TOKEN=replace-with-issued-server-token
KENYA_IDENTITY_SOURCE_NAME=Kenya NPDM identity verification

KENYA_DCI_VERIFY_URL=https://authorized-dci-endpoint.example/verify
KENYA_DCI_API_TOKEN=replace-with-issued-server-token
KENYA_DCI_SOURCE_NAME=Kenya DCI police-clearance verification
```

The default authorization header is `Authorization: Bearer <token>`. Providers
using another issued header or scheme can be configured with:

```text
KENYA_IDENTITY_AUTH_HEADER=X-API-Key
KENYA_IDENTITY_AUTH_SCHEME=
KENYA_DCI_AUTH_HEADER=X-API-Key
KENYA_DCI_AUTH_SCHEME=
```

## Gateway contract

The app sends `POST` requests as JSON. The identity request is:

```json
{
  "verificationType": "NATIONAL_ID",
  "subject": {
    "idNumber": "28745163",
    "fullName": "Jane Wanjiku Doe"
  },
  "consent": {
    "granted": true,
    "purpose": "PROVIDER_ONBOARDING"
  }
}
```

The DCI request also contains:

```json
{
  "verificationType": "POLICE_CLEARANCE_CERTIFICATE",
  "subject": {
    "idNumber": "28745163",
    "fullName": "Jane Wanjiku Doe"
  },
  "document": {
    "number": "PCC-12345"
  },
  "consent": {
    "granted": true,
    "purpose": "PROVIDER_ONBOARDING"
  }
}
```

A successful identity response must have this shape:

```json
{
  "verified": true,
  "reference": "provider-audit-reference",
  "checkedAt": "2026-07-24T20:00:00.000Z",
  "subject": {
    "idNumber": "28745163",
    "fullName": "DOE JANE WANJIKU"
  }
}
```

A successful DCI response must also return the verified document number. A
provider may include `validUntil`; an expired date is rejected.

```json
{
  "verified": true,
  "reference": "dci-audit-reference",
  "checkedAt": "2026-07-24T20:00:00.000Z",
  "subject": {
    "idNumber": "28745163",
    "fullName": "Jane Wanjiku Doe"
  },
  "document": {
    "number": "PCC-12345",
    "validUntil": "2027-07-24T00:00:00.000Z"
  }
}
```

`checkedAt` must be no more than 15 minutes old. Responses missing the audit
reference, returning mismatched records, or failing schema validation are not
accepted.

## Failure behavior

- Missing provider configuration returns HTTP 503 and blocks approval.
- Provider downtime or malformed evidence returns HTTP 503 and blocks approval.
- Record mismatches return HTTP 422 and block approval.
- Successful automated results are stored as `AUTHORITATIVE` with method
  `AUTOMATED_OFFICIAL_API`, their source, timestamp, and audit reference.
- Existing legacy `AUTHORITATIVE_MANUAL` evidence is not sufficient for a new
  approval; the admin action reruns the automated checks.

Professional licence verification remains a separate process. This document
only governs National ID and DCI Police Clearance Certificate automation.
