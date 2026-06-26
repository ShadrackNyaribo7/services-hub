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
    const groupByTenant = searchParams.get('groupByTenant') === 'true';

    // Fetch all coaches across all tenants
    if (groupByTenant) {
      const result = await ufpService.getAllCoachesAcrossTenants();

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
      const result = await ufpService.getAllCoachesFlattened();

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
    }
  } catch (error) {
    console.error('Error fetching all UFP trainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all trainers' },
      { status: 500 }
    );
  }
}
