import {
  calculateMarketplaceProfit,
  calculateMpesaCollectionFee,
  isExactPaymentAmount,
  PROFIT_SYSTEM,
  validateServiceAmount,
} from "../profitEngine";

describe("profitEngine", () => {
  it("rejects non-viable low booking amounts", () => {
    expect(validateServiceAmount(PROFIT_SYSTEM.minimumBookingAmountKes - 1)).toEqual({
      valid: false,
      error: `Minimum payable service price is KES ${PROFIT_SYSTEM.minimumBookingAmountKes}.`,
    });
  });

  it("requires whole KES amounts for M-Pesa collection", () => {
    expect(validateServiceAmount(1000.5)).toEqual({
      valid: false,
      error: "Service price must be a whole KES amount.",
    });
  });

  it("caps M-Pesa merchant collection charges", () => {
    expect(calculateMpesaCollectionFee(100000)).toBe(200);
  });

  it("uses stronger monetization for regulated higher-risk trades", () => {
    const cleaning = calculateMarketplaceProfit({
      amount: 2000,
      serviceCategory: "Cleaning",
    });
    const electrical = calculateMarketplaceProfit({
      amount: 2000,
      serviceCategory: "Electrical",
    });

    expect(electrical.commissionRate).toBeGreaterThan(cleaning.commissionRate);
    expect(electrical.developerFee).toBeGreaterThan(cleaning.developerFee);
  });

  it("stores net developer fee after processing reserves", () => {
    const profit = calculateMarketplaceProfit({
      amount: 10000,
      serviceCategory: "Plumber",
    });

    expect(profit.grossPlatformFee).toBe(1550);
    expect(profit.paymentProcessingFee).toBeGreaterThan(0);
    expect(profit.developerFee).toBeLessThan(profit.grossPlatformFee);
    expect(profit.providerAmount + profit.grossPlatformFee).toBe(profit.serviceAmount);
  });

  it("detects payment amount mismatch during callback reconciliation", () => {
    expect(isExactPaymentAmount(2500, 2500)).toBe(true);
    expect(isExactPaymentAmount(2500, 2499)).toBe(false);
  });
});
