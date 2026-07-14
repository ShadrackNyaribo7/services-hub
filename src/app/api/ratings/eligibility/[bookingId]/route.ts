import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { RatingEligibility } from '@/types';

// GET - Check if a booking is eligible for rating
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await params;

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { rating: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if rating already exists
    if (booking.rating) {
      return NextResponse.json({
        eligible: false,
        reason: 'Rating already submitted for this booking',
        paymentCompleted: booking.paymentStatus === 'COMPLETED',
        serviceConfirmed: booking.serviceConfirmed,
        clientConfirmed: booking.clientConfirmed,
        escrowReleased: booking.escrowReleased
      } as RatingEligibility);
    }

    // Check eligibility requirements
    const eligibilityChecks = {
      paymentCompleted: booking.paymentStatus === 'COMPLETED',
      serviceConfirmed: booking.serviceConfirmed,
      clientConfirmed: booking.clientConfirmed,
      escrowReleased: booking.escrowReleased
    };

    const allRequirementsMet = Object.values(eligibilityChecks).every(check => check === true);

    if (!allRequirementsMet) {
      const failedRequirements = Object.entries(eligibilityChecks)
        .filter(([_, met]) => !met)
        .map(([requirement]) => requirement);

      return NextResponse.json({
        eligible: false,
        reason: `Rating not eligible. Missing requirements: ${failedRequirements.join(', ')}`,
        ...eligibilityChecks
      } as RatingEligibility);
    }

    return NextResponse.json({
      eligible: true,
      ...eligibilityChecks
    } as RatingEligibility);

  } catch (error) {
    console.error('Error checking rating eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check rating eligibility' },
      { status: 500 }
    );
  }
}