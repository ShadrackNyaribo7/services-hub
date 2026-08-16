import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const PROVIDER_MOBILE_SESSION_COOKIE =
  "patanafuu_provider_mobile_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function validOpaqueToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function getProviderMobileSession() {
  const rawToken = (await cookies()).get(PROVIDER_MOBILE_SESSION_COOKIE)?.value;
  if (!rawToken || !validOpaqueToken(rawToken)) return null;

  const session = await prisma.providerMobileSession.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
  });
  if (!session || session.expiresAt <= new Date()) return null;

  let userId = session.userId;
  if (!userId) {
    const user = await prisma.user.findUnique({
      where: { phone: session.phone },
      select: { id: true },
    });
    userId = user?.id ?? null;

    if (userId) {
      await prisma.providerMobileSession.update({
        where: { id: session.id },
        data: { userId, lastUsedAt: new Date() },
      });
    }
  }

  return { ...session, userId };
}

export async function createProviderMobileSession(
  phone: string,
  verificationChallengeId: string,
) {
  const existingSession = await getProviderMobileSession();
  if (existingSession?.phone === phone) {
    return prisma.providerMobileSession.update({
      where: { id: existingSession.id },
      data: { verificationChallengeId, lastUsedAt: new Date() },
    });
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const session = await prisma.providerMobileSession.create({
    data: {
      tokenHash: hashOpaqueToken(rawToken),
      phone,
      userId: user?.id ?? null,
      verificationChallengeId,
      expiresAt,
    },
  });

  (await cookies()).set(PROVIDER_MOBILE_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });

  return session;
}

export async function getApplicationIdentity() {
  const { userId } = await auth();
  if (userId) {
    return { userId, phone: null, method: "CLERK" as const };
  }

  const mobileSession = await getProviderMobileSession();
  if (!mobileSession) return null;

  return {
    userId: mobileSession.userId,
    phone: mobileSession.phone,
    verificationChallengeId: mobileSession.verificationChallengeId,
    method: "MPESA" as const,
  };
}

export async function getAuthenticatedAppUserId() {
  return (await getApplicationIdentity())?.userId ?? null;
}
