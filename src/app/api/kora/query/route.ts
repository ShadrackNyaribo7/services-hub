// Retained as a tombstone so old clients receive an explicit response.
export async function GET() {
  return Response.json(
    { error: "Kora Pay verification is disabled." },
    { status: 410 },
  );
}
