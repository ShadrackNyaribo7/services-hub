import { NextRequest, NextResponse } from 'next/server';
import { ufpService } from '@/services/api';
import { auth } from '@clerk/nextjs/server';
import { UFPBookingRequest, UFPAppointmentRequest } from '@/types';

// GET - Fetch available appointments
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const coachId = searchParams.get('coachId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Fetch available appointments from UFP API
    const result = await ufpService.getAppointments(coachId, startDate, endDate);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error fetching UFP appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// POST - Create a new appointment booking
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...bookingData } = body;

    if (type === 'appointment') {
      // Create a new appointment
      const appointmentRequest: UFPAppointmentRequest = bookingData;
      const result = await ufpService.createAppointment(appointmentRequest);

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else if (type === 'booking') {
      // Book an existing appointment
      const bookingRequest: UFPBookingRequest = bookingData;
      const result = await ufpService.bookAppointment(bookingRequest);

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid booking type. Must be "appointment" or "booking"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating UFP booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
