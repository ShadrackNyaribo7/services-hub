import { NextResponse } from "next/server";
import { getProviderMobileSession } from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getProviderMobileSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const challenge = session.verificationChallengeId
    ? await prisma.mobileVerificationChallenge.findUnique({
        where: { id: session.verificationChallengeId },
        select: {
          status: true,
          phone: true,
          verifiedAt: true,
          consumedAt: true,
        },
      })
    : null;
  const currentVerification = Boolean(
    challenge &&
      challenge.status === "VERIFIED" &&
      challenge.phone === session.phone &&
      !challenge.consumedAt &&
      challenge.verifiedAt &&
      challenge.verifiedAt.getTime() >= Date.now() - 60 * 60 * 1_000,
  );

  return NextResponse.json(
    {
      authenticated: true,
      phone: session.phone,
      currentVerification,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
