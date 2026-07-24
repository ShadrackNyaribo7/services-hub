import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MpesaCallbackRequest } from "@/types";
import {
  calculateMarketplaceProfit,
  isExactPaymentAmount,
} from "@/lib/pricing/profitEngine";

export async function POST(request: Request) {
  try {
    const body: MpesaCallbackRequest = await request.json();
    const callback = body?.Body?.stkCallback;

    if (
      !callback ||
      !callback.MerchantRequestID ||
      !callback.CheckoutRequestID ||
      callback.ResultCode === undefined
    ) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Invalid callback payload" },
        { status: 400 },
      );
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;
    const normalizedResultCode = Number(ResultCode);

    if (!Number.isInteger(normalizedResultCode)) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Invalid callback result code" },
        { status: 400 },
      );
    }

    console.log('MPesa Callback received:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode: normalizedResultCode,
      ResultDesc,
    });

    let metadataBookingId = '';
    let mpesaReceiptNumber = '';
    let mpesaTransactionId = '';
    let paymentAmount = 0;
    let phoneNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'AccountReference') {
          const accountRef = String(item.Value);
          metadataBookingId = accountRef.replace('BOOKING-', '');
        } else if (item.Name === 'MpesaReceiptNumber') {
          mpesaReceiptNumber = String(item.Value);
        } else if (item.Name === 'TransactionID') {
          mpesaTransactionId = String(item.Value);
        } else if (item.Name === 'Amount') {
          paymentAmount = Number(item.Value);
        } else if (item.Name === 'PhoneNumber') {
          phoneNumber = String(item.Value);
        }
      }
    }

    const existingBooking = await prisma.booking.findUnique({
      where: {
        mpesaCheckoutRequestId: CheckoutRequestID,
      },
      include: {
        providerProfile: {
          select: {
            serviceCategory: true,
          },
        },
      },
    });

    if (!existingBooking) {
      console.error('Could not find booking for callback:', callback);
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Booking not found' },
        { status: 404 }
      );
    }

    if (metadataBookingId && metadataBookingId !== existingBooking.id) {
      console.error("Callback account reference does not match checkout request");
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Callback reference mismatch" },
        { status: 400 },
      );
    }

    const bookingId = existingBooking.id;

    if (existingBooking.paymentStatus === "COMPLETED") {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Payment already processed",
      });
    }

    const callbackSucceeded = normalizedResultCode === 0;
    const paymentMatchesBooking =
      callbackSucceeded &&
      isExactPaymentAmount(existingBooking.amount, paymentAmount);
    const paymentStatus =
      callbackSucceeded && paymentMatchesBooking ? 'COMPLETED' : 'FAILED';
    const profit =
      paymentStatus === "COMPLETED"
        ? calculateMarketplaceProfit({
            amount: paymentAmount,
            serviceCategory: existingBooking.providerProfile.serviceCategory,
          })
        : null;

    // Security measures to prevent payment undercutting
    // Check for suspicious payment patterns
    let suspiciousActivity = false;
    let securityFlag: string | null = null;

    // Flag 1: Payment amount significantly different from expected patterns
    if (callbackSucceeded && !paymentMatchesBooking) {
      suspiciousActivity = true;
      securityFlag = 'PAYMENT_AMOUNT_MISMATCH';
    } else if (callbackSucceeded && paymentAmount < 500) {
      suspiciousActivity = true;
      securityFlag = 'LOW_AMOUNT_RISK';
    }

    const recentBookings =
      callbackSucceeded && paymentMatchesBooking
        ? await prisma.booking.findMany({
            where: {
              OR: [
                ...(phoneNumber ? [{ clientPhone: phoneNumber }] : []),
                ...(existingBooking.providerProfileId
                  ? [{ providerProfileId: existingBooking.providerProfileId }]
                  : []),
              ],
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          })
        : [];

    if (recentBookings.length > 5) {
      suspiciousActivity = true;
      securityFlag = 'HIGH_FREQUENCY_RISK';
    }

    // Update booking with security measures and escrow system
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: paymentStatus,
        mpesaTransactionId: mpesaTransactionId || undefined,
        mpesaReceiptNumber: mpesaReceiptNumber || undefined,
        paymentCreatedAt: new Date(),
        amount: paymentAmount > 0 && paymentMatchesBooking ? paymentAmount : undefined,
        developerFee: profit ? profit.developerFee : undefined,
        providerAmount: profit ? profit.providerAmount : undefined,
        commissionRate: profit ? profit.commissionRate : undefined,
        grossPlatformFee: profit ? profit.grossPlatformFee : undefined,
        paymentProcessingFee: profit ? profit.paymentProcessingFee : undefined,
        status: paymentStatus === 'COMPLETED' ? 'ACCEPTED' : 'REQUESTED',
        // Security measures
        suspiciousActivity: suspiciousActivity,
        securityFlag: securityFlag,
        // Escrow system: funds held until service completion
        escrowReleased: false, // Will be released after service confirmation
      },
    });

    console.log(`Booking ${bookingId} payment updated to ${paymentStatus}`, {
      totalAmount: paymentAmount,
      developerFee: profit?.developerFee ?? 0,
      providerAmount: profit?.providerAmount ?? 0,
      grossPlatformFee: profit?.grossPlatformFee ?? 0,
      paymentProcessingFee: profit?.paymentProcessingFee ?? 0,
      securityFlags: {
        suspiciousActivity,
        securityFlag,
        escrowReleased: false
      }
    });

    // Additional security: Log if suspicious activity detected
    if (suspiciousActivity) {
      console.warn(`Security alert: suspicious activity detected for booking ${bookingId}`, {
        flag: securityFlag,
        amount: paymentAmount,
        recentBookingsCount: recentBookings.length
      });
    }

    // Return success response to MPesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Payment processed successfully',
    });

  } catch (error) {
    console.error('MPesa callback error:', error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: 'Error processing callback' },
      { status: 500 }
    );
  }
}
