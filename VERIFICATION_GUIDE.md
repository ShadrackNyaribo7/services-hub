# Offline Provider Evidence Validation

Provider onboarding does not call a live National ID, DCI, police-clearance,
EPRA, KNQA, regulator, or credential-issuer database. The system validates and
seals the evidence entered by the applicant, then automatically approves only
submissions that pass every rule. It never labels offline evidence as
authoritative, and administrator action is not part of onboarding.

## Security boundary

Offline validation can detect malformed, inconsistent, replayed, or altered
input. It cannot establish that a government agency or credential issuer
created a document, that the document remains valid, or that the applicant is
the person described by it. The UI, API responses, stored evidence levels, and
admin workflow state this limitation explicitly.

## Validation layers

Every application is checked on the server. Browser validation is only a
usability aid.

1. The applicant must either be authenticated with Clerk or complete the
   application-owned M-Pesa mobile verification flow.
2. JSON requests must use the correct content type and stay within the request
   size and field-length limits.
3. Only supported service categories are accepted.
4. National ID, police-clearance, and credential identifiers must meet strict
   character and length rules.
5. Placeholder, sequential, repeated, and low-diversity identifiers are
   rejected.
6. ID, police-clearance, and credential numbers must be distinct.
7. The applicant must enter ID, police-clearance, and credential numbers twice.
8. Names entered exactly as printed on each document must match the application
   name after safe normalization.
9. Credential issuer claims, number patterns, and qualification titles must be
   consistent with the selected service category. An issuer outside the local
   approved-issuer reference list is rejected because there is no manual
   approval fallback.
10. Identifiers already attached to another local provider account are
    rejected as potential replay.
11. Accepted fields are bound to a versioned HMAC-SHA-256 evidence reference.
12. Every accepted, sealed submission is set to `APPROVED` automatically.
13. The admin page is post-approval oversight only. An authorized administrator
    can reject or suspend a provider, but no administrator action is required
    for production onboarding.

## Evidence sealing secret

Configure a dedicated, random server-only secret of at least 32 characters:

```text
OFFLINE_VERIFICATION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

If this variable is absent, the validator falls back to the server-only
`CLERK_SECRET_KEY` with domain separation. If neither value is at least 32
characters, validation fails closed with `EVIDENCE_SEAL_NOT_CONFIGURED`.

Never prefix the secret with `NEXT_PUBLIC_`. Rotating it changes regenerated
evidence seals; any later document revalidation requires a fresh submission.

## Stored evidence states

- `SELF_ATTESTED`: server rules accepted and sealed the applicant's entries and
  the local policy may approve the profile automatically; issuer authenticity
  has not been established.
- `REJECTED`: one or more offline rules failed.
- `UNAVAILABLE`: the server could not create a protected evidence seal.

An approved provider is bookable immediately after all offline rules pass and
the local profile is set to `APPROVED`. Public provider listings and booking
creation filter for that status. Administrators retain post-approval suspension
and rejection controls.

## Independent mobile verification and sign-in

Provider mobile verification no longer depends on Clerk phone settings or an
email address. The application initiates a KES 1 Safaricom Daraja M-Pesa STK
Push to the submitted Kenyan number. The applicant approves the prompt with
the handset's M-Pesa PIN. A validated Daraja callback must match the expected
checkout ID, merchant ID, amount, and phone before the challenge becomes
verified.

Successful verification creates an opaque, hashed, HTTP-only provider session
that lasts for 30 days. A first-time applicant can submit without an email;
after the provider record exists, the same flow supports mobile-only sign-in at
`/provider-signin`. Clerk remains available as an alternative authentication
method.

Required production variables are the existing Daraja settings:

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `MPESA_ENVIRONMENT=production`
- `MPESA_CALLBACK_URL=https://www.patanafuu.pro/api/mpesa/callback`

The browser receives only a random challenge token. Only its SHA-256 hash is
stored. Pending challenges expire after 10 minutes, verified application
challenges can be consumed once, and initiation is rate-limited by phone and
request fingerprint. Daraja is an M-Pesa payment API rather than a general SMS
gateway, so the UI must always disclose the KES 1 confirmation amount before
the applicant starts it.

## Operational checks

Run the following before deployment:

```bash
npm run lint
npm test -- --runInBand
npm run build
```

The verification regression suites assert that no live `fetch` call occurs,
including when old Peleza-style environment variables are present.
