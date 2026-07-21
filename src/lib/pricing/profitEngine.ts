export const PROFIT_SYSTEM = {
  minimumBookingAmountKes: 500,
  maximumMpesaAmountKes: 150000,
  minimumPlatformFeeKes: 75,
  merchantCollectionFreeThresholdKes: 200,
  merchantCollectionRate: 0.0055,
  merchantCollectionCapKes: 200,
  payoutReserveRate: 0.0027,
  payoutReserveCapKes: 200,
  tierRates: [
    { upToKes: 2500, rate: 0.18 },
    { upToKes: 10000, rate: 0.16 },
    { upToKes: 40000, rate: 0.14 },
    { upToKes: Number.POSITIVE_INFINITY, rate: 0.12 },
  ],
  categoryAdjustments: {
    electrical: 0.02,
    electrician: 0.02,
    plumber: 0.015,
    plumbing: 0.015,
    mechanic: 0.015,
    mechanical: 0.015,
    cleaning: 0,
    cleaner: 0,
  },
  maximumCommissionRate: 0.22,
} as const;

export type ProfitBreakdown = {
  serviceAmount: number;
  commissionRate: number;
  grossPlatformFee: number;
  paymentProcessingFee: number;
  developerFee: number;
  providerAmount: number;
  effectivePlatformTakeRate: number;
  profitabilityIndex: number;
};

export type AmountValidationResult =
  | { valid: true; amount: number }
  | { valid: false; error: string };

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeAmount(amount: unknown): number | null {
  if (typeof amount === "string" && amount.trim() !== "") {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function getCategoryAdjustment(serviceCategory?: string) {
  const normalized = (serviceCategory ?? "").trim().toLowerCase();
  const match = Object.entries(PROFIT_SYSTEM.categoryAdjustments).find(([key]) =>
    normalized.includes(key),
  );

  return match?.[1] ?? 0;
}

function getBaseRate(amount: number) {
  return (
    PROFIT_SYSTEM.tierRates.find((tier) => amount < tier.upToKes)?.rate ??
    PROFIT_SYSTEM.tierRates[PROFIT_SYSTEM.tierRates.length - 1].rate
  );
}

export function validateServiceAmount(amount: unknown): AmountValidationResult {
  const normalized = normalizeAmount(amount);

  if (normalized === null) {
    return { valid: false, error: "Service price must be a valid number." };
  }

  if (!Number.isInteger(normalized)) {
    return { valid: false, error: "Service price must be a whole KES amount." };
  }

  if (normalized < PROFIT_SYSTEM.minimumBookingAmountKes) {
    return {
      valid: false,
      error: `Minimum payable service price is KES ${PROFIT_SYSTEM.minimumBookingAmountKes}.`,
    };
  }

  if (normalized > PROFIT_SYSTEM.maximumMpesaAmountKes) {
    return {
      valid: false,
      error: `Maximum M-Pesa service price is KES ${PROFIT_SYSTEM.maximumMpesaAmountKes}.`,
    };
  }

  return { valid: true, amount: normalized };
}

export function calculateMpesaCollectionFee(amount: number) {
  if (amount <= PROFIT_SYSTEM.merchantCollectionFreeThresholdKes) {
    return 0;
  }

  return roundMoney(
    Math.min(amount * PROFIT_SYSTEM.merchantCollectionRate, PROFIT_SYSTEM.merchantCollectionCapKes),
  );
}

export function calculatePayoutReserve(providerAmount: number) {
  return roundMoney(
    Math.min(providerAmount * PROFIT_SYSTEM.payoutReserveRate, PROFIT_SYSTEM.payoutReserveCapKes),
  );
}

export function calculateMarketplaceProfit(input: {
  amount: number;
  serviceCategory?: string;
}): ProfitBreakdown {
  const baseRate = getBaseRate(input.amount);
  const commissionRate = Math.min(
    baseRate + getCategoryAdjustment(input.serviceCategory),
    PROFIT_SYSTEM.maximumCommissionRate,
  );

  const grossPlatformFee = roundMoney(
    Math.min(
      Math.max(input.amount * commissionRate, PROFIT_SYSTEM.minimumPlatformFeeKes),
      input.amount,
    ),
  );
  const providerAmount = roundMoney(input.amount - grossPlatformFee);
  const paymentProcessingFee = roundMoney(
    calculateMpesaCollectionFee(input.amount) + calculatePayoutReserve(providerAmount),
  );
  const developerFee = roundMoney(Math.max(grossPlatformFee - paymentProcessingFee, 0));

  return {
    serviceAmount: input.amount,
    commissionRate,
    grossPlatformFee,
    paymentProcessingFee,
    developerFee,
    providerAmount,
    effectivePlatformTakeRate: roundMoney(grossPlatformFee / input.amount),
    profitabilityIndex: roundMoney(input.amount > 0 ? developerFee / input.amount : 0),
  };
}

export function isExactPaymentAmount(expectedAmount: number | null | undefined, paidAmount: number) {
  return typeof expectedAmount === "number" && Math.abs(expectedAmount - paidAmount) < 0.01;
}
