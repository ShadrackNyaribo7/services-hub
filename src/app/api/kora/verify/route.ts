// Kora Pay is intentionally disabled. Provider onboarding now uses the
// offline evidence-review workflow in /api/documents/verify.
export async function POST() {
  return Response.json(
    {
      error:
        "Kora Pay verification is disabled. Submit provider documents for official review.",
    },
    { status: 410 },
  );
}
