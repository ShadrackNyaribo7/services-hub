import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidLocationEncryptionConfiguration } from "@/lib/location/providerLocationSecurity";

export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 8_000;

async function checkDatabaseReadiness() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRawUnsafe("SELECT 1"),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Database readiness check timed out")),
          DATABASE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET() {
  const startedAt = Date.now();

  try {
    if (!hasValidLocationEncryptionConfiguration()) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "not_checked",
          providerLocationEncryption: "unavailable",
          responseTimeMs: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    await checkDatabaseReadiness();

    return NextResponse.json(
      {
        status: "healthy",
        database: "connected",
        providerLocationEncryption: "ready",
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Readiness check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unavailable",
        providerLocationEncryption: "ready",
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
