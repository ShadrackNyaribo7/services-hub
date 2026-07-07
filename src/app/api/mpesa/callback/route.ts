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

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: paymentStatus,
        mpesaTransactionId: mpesaTransactionId,
        mpesaReceiptNumber: mpesaReceiptNumber,
        paymentCreatedAt: new Date(),
        amount: paymentAmount > 0 ? paymentAmount : undefined,
        status: paymentStatus === 'COMPLETED' ? 'ACCEPTED' : 'REQUESTED',
      },
    });

    console.log(`Booking ${bookingId} payment updated to ${paymentStatus}`);

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