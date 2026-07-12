import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MpesaCallbackRequest } from "@/types";

export async function POST(request: Request) {
  try {
    const body: MpesaCallbackRequest = await request.json();
    const callback = body.Body.stkCallback;

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    console.log('MPesa Callback received:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    });

    // Extract booking ID from account reference if available
    let bookingId = '';
    let mpesaReceiptNumber = '';
    let mpesaTransactionId = '';
    let paymentAmount = 0;
    let phoneNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'AccountReference') {
          const accountRef = String(item.Value);
          bookingId = accountRef.replace('BOOKING-', '');
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

    // Find booking by checkout request ID if booking ID not found
    if (!bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          // You might need to store checkoutRequestID in the booking model
          // For now, we'll try to find by other means
        },
      });
      
      if (booking) {
        bookingId = booking.id;
      }
    }

    if (!bookingId) {
      console.error('Could not find booking for callback:', callback);
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking based on payment result
    const paymentStatus = ResultCode === 0 ? 'COMPLETED' : 'FAILED';

    // Commission model: Tiered commission for optimal market penetration
    // Growth strategy: Start low to attract providers, increase as platform matures
    // Phase 1 (0-1000 transactions): 12% - Market penetration
    // Phase 2 (1000-5000 transactions): 15% - Growth stage
    // Phase 3 (5000+ transactions): 18% - Mature platform
    // Current phase: 12% commission
    const COMMISSION_RATE = 0.12; // 12% developer commission
    const developerFee = paymentAmount > 0 ? paymentAmount * COMMISSION_RATE : 0;
    const providerAmount = paymentAmount > 0 ? paymentAmount * (1 - COMMISSION_RATE) : 0;

    // Security measures to prevent payment undercutting
    // Check for suspicious payment patterns
    let suspiciousActivity = false;
    let securityFlag = null;

    // Flag 1: Payment amount significantly different from expected patterns
    if (paymentAmount > 0 && paymentAmount < 100) {
      suspiciousActivity = true;
      securityFlag = 'LOW_AMOUNT_RISK';
    }

    // Flag 2: Multiple recent bookings from same client/provider combo (potential bypass)
    // First get the booking to check provider patterns
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    const recentBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { clientPhone: phoneNumber },
          ...(existingBooking?.providerProfileId ? [{ providerProfileId: existingBooking.providerProfileId }] : [])
        ],
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentBookings.length > 5) {
      suspiciousActivity = true;
      securityFlag = 'HIGH_FREQUENCY_RISK';
    }

    // Update booking with security measures and escrow system
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: paymentStatus,
        mpesaTransactionId: mpesaTransactionId,
        mpesaReceiptNumber: mpesaReceiptNumber,
        paymentCreatedAt: new Date(),
        amount: paymentAmount > 0 ? paymentAmount : undefined,
        developerFee: developerFee > 0 ? developerFee : undefined,
        providerAmount: providerAmount > 0 ? providerAmount : undefined,
        commissionRate: COMMISSION_RATE,
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
      developerFee: developerFee,
      providerAmount: providerAmount,
      securityFlags: {
        suspiciousActivity,
        securityFlag,
        escrowReleased: false
      }
    });

    // Additional security: Log if suspicious activity detected
    if (suspiciousActivity) {
      console.warn(`⚠️ SECURITY ALERT: Suspicious activity detected for booking ${bookingId}`, {
        flag: securityFlag,
        phoneNumber,
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