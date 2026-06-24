import { NextRequest, NextResponse } from 'next/server';
import { ufpService } from '@/services/api';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId') || undefined;

    // Fetch appointment types from UFP API
    const result = await ufpService.getAppointmentTypes(tenantId);

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
    console.error('Error fetching UFP appointment types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointment types' },
      { status: 500 }
    );
  }
}
