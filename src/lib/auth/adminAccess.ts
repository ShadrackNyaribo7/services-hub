import "server-only";

import { currentUser } from "@clerk/nextjs/server";

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAdminIdentity() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email || !configuredAdminEmails().has(email)) return null;

  return { userId: user.id, email };
}
