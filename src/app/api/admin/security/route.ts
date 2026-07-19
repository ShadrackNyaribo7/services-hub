import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// GET - Fetch suspicious activity reports
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch bookings with suspicious activity
    const suspiciousBookings = await prisma.booking.findMany({
      where: {
        suspiciousActivity: true
      },
      include: {
        providerProfile: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate statistics
    const totalBookings = await prisma.booking.count();
    const suspiciousCount = suspiciousBookings.length;
    const suspiciousRate = totalBookings > 0 ? (suspiciousCount / totalBookings) * 100 : 0;

    // Group by security flag
    const flagGroups = suspiciousBookings.reduce((acc, booking) => {
      const flag = booking.securityFlag || 'UNKNOWN';
      acc[flag] = (acc[flag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Identify repeat offenders (providers with multiple suspicious bookings)
    const providerSuspiciousCount = suspiciousBookings.reduce((acc, booking) => {
      const providerId = booking.providerProfileId;
      acc[providerId] = (acc[providerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatOffenders = Object.entries(providerSuspiciousCount)
      .filter((entry) => entry[1] > 2)
      .map(([providerId, count]) => ({ providerId, count }));

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalBookings,
          suspiciousCount,
          suspiciousRate: suspiciousRate.toFixed(2) + '%',
          flagGroups,
          repeatOffenders
        },
        suspiciousBookings
      }
    });

  } catch (error) {
    console.error('Error fetching security data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
      { status: 500 }
    );
  }
}

// POST - Flag suspicious activity manually
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, flag, reason } = await request.json();

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        suspiciousActivity: true,
        securityFlag: flag,
      }
    });

    // Log the manual flag for audit purposes
    console.log(`Manual security flag: Booking ${bookingId} flagged as ${flag} by admin ${userId}. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'Booking flagged successfully',
      data: booking
    });

  } catch (error) {
    console.error('Error flagging booking:', error);
    return NextResponse.json(
      { error: 'Failed to flag booking' },
      { status: 500 }
    );
  }
}
