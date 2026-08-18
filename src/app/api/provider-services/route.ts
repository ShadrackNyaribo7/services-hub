import { NextResponse } from "next/server";
import { getAuthenticatedAppUserId } from "@/lib/auth/providerMobileSession";
import { prisma } from "@/lib/prisma";
import {
  PROFIT_SYSTEM,
  validateServiceAmount,
} from "@/lib/pricing/profitEngine";
import {
  readBoundedJsonObject,
  RequestInputError,
} from "@/lib/verification/requestGuards";

const MAXIMUM_SERVICES = 12;
const MAXIMUM_SERVICE_NAME_LENGTH = 80;

type ValidatedService = {
  name: string;
  priceKes: number;
};

function validateServices(value: unknown): ValidatedService[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RequestInputError("Add at least one service and its price.");
  }
  if (value.length > MAXIMUM_SERVICES) {
    throw new RequestInputError(
      `You can list up to ${MAXIMUM_SERVICES} services.`,
    );
  }

  const names = new Set<string>();
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new RequestInputError(`Service ${index + 1} is invalid.`);
    }

    const rawName = (entry as Record<string, unknown>).name;
    if (typeof rawName !== "string") {
      throw new RequestInputError(`Enter a name for service ${index + 1}.`);
    }

    const name = rawName.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > MAXIMUM_SERVICE_NAME_LENGTH) {
      throw new RequestInputError(
        `Service ${index + 1} must have a name between 2 and ${MAXIMUM_SERVICE_NAME_LENGTH} characters.`,
      );
    }
    if (/\p{Cc}/u.test(name)) {
      throw new RequestInputError(
        `Service ${index + 1} contains unsupported characters.`,
      );
    }

    const normalizedName = name.toLocaleLowerCase("en-KE");
    if (names.has(normalizedName)) {
      throw new RequestInputError("Each service name must be unique.");
    }
    names.add(normalizedName);

    const priceValidation = validateServiceAmount(
      (entry as Record<string, unknown>).priceKes,
    );
    if (!priceValidation.valid) {
      throw new RequestInputError(
        `Service ${index + 1}: ${priceValidation.error}`,
      );
    }

    return { name, priceKes: priceValidation.amount };
  });
}

export async function PUT(request: Request) {
  const userId = await getAuthenticatedAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await readBoundedJsonObject(request);
    const services = validateServices(body.services);
    const provider = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Complete your provider application first." },
        { status: 404 },
      );
    }
    if (provider.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Your provider profile must be approved first." },
        { status: 403 },
      );
    }

    const confirmedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.providerService.deleteMany({
        where: { providerProfileId: provider.id },
      });
      await transaction.providerService.createMany({
        data: services.map((service) => ({
          providerProfileId: provider.id,
          ...service,
        })),
      });
      await transaction.providerProfile.update({
        where: { id: provider.id },
        data: { servicesConfirmedAt: confirmedAt },
      });
    });

    return NextResponse.json({
      services,
      servicesConfirmedAt: confirmedAt.toISOString(),
      limits: {
        minimumPriceKes: PROFIT_SYSTEM.minimumBookingAmountKes,
        maximumPriceKes: PROFIT_SYSTEM.maximumMpesaAmountKes,
      },
      message: "Your services and prices are confirmed.",
    });
  } catch (error) {
    if (error instanceof RequestInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Provider services update error:", error);
    return NextResponse.json(
      { error: "Could not confirm your services. Please try again." },
      { status: 500 },
    );
  }
}
