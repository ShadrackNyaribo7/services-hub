import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { MobileVerificationPurpose } from "@prisma/client";
import { hashOpaqueToken } from "@/lib/auth/providerMobileSession";

export const MOBILE_VERIFICATION_AMOUNT_KES = 1;
export const MOBILE_VERIFICATION_LIFETIME_MS = 10 * 60 * 1_000;

export function createMobileVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOpaqueToken(token) };
}

export function isMobileVerificationToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function createMobileVerificationReference(challengeId: string) {
  const digest = createHash("sha256")
    .update(`patanafuu:mobile-verification:${challengeId}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `MV${digest}`;
}

export function readMobileVerificationPurpose(
  value: unknown,
): MobileVerificationPurpose | null {
  if (value === "PROVIDER_APPLICATION" || value === "PROVIDER_SIGN_IN") {
    return value;
  }
  return null;
}

export function mobileVerificationRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "unknown";
  const clientIp = forwardedFor.split(",", 1)[0].trim().slice(0, 64);
  const userAgent = (request.headers.get("user-agent") ?? "unknown").slice(
    0,
    256,
  );

  return createHash("sha256")
    .update(`${clientIp}\n${userAgent}`, "utf8")
    .digest("hex");
}

export function isTrustedSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    return fetchSite === "same-origin" || process.env.NODE_ENV !== "production";
  }

  try {
    const trustedOrigins = new Set([new URL(request.url).origin]);
    const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (publicUrl) trustedOrigins.add(new URL(publicUrl).origin);
    return trustedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
