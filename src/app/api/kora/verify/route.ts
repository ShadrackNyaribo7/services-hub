// Kora Pay is intentionally disabled. Provider verification now uses the
// credential-free official verification workflow in /api/documents/verify.
export async function POST() {
  return Response.json(
    {
      error:
        "Kora Pay verification is disabled. Submit provider documents for official review.",
    },
    { status: 410 },
  );
}
