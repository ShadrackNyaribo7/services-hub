import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// POST - Confirm service completion (for escrow release)
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;
    const { role, confirmed } = await request.json();

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { providerProfile: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Security check: Verify payment was made through platform
    if (booking.paymentStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Payment must be completed before confirmation' },
        { status: 400 }
      );
    }

    // Security check: Prevent double confirmation
    if (booking.escrowReleased) {
      return NextResponse.json(
        { error: 'Escrow already released' },
        { status: 400 }
      );
    }

    // Handle confirmation based on role
    if (role === 'provider') {
      // Provider confirms service completion
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          serviceConfirmed: confirmed,
          serviceConfirmedAt: confirmed ? new Date() : null,
        }
      });

      // Check if both parties confirmed - release escrow
      if (confirmed && booking.clientConfirmed) {
        await releaseEscrow(bookingId);
      }

    } else if (role === 'client') {
      // Client confirms service completion
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          clientConfirmed: confirmed,
          clientConfirmedAt: confirmed ? new Date() : null,
        }
      });

      // Check if both parties confirmed - release escrow
      if (confirmed && booking.serviceConfirmed) {
        await releaseEscrow(bookingId);
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid role. Must be "provider" or "client"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation recorded successfully'
    });

  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      { error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}

// Helper function to release escrow
async function releaseEscrow(bookingId: string) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      escrowReleased: true,
      status: 'COMPLETED'
    }
  });

  console.log(`Escrow released for booking ${bookingId}`);
  // Here you would integrate with your payment system to actually
  // transfer the providerAmount to the provider's account
}