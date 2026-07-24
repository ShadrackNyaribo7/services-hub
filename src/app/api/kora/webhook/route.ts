// Retained as a tombstone so previously configured webhooks cannot mutate data.
export async function POST() {
  return Response.json(
    { error: "Kora Pay webhooks are disabled." },
    { status: 410 },
  );
}
