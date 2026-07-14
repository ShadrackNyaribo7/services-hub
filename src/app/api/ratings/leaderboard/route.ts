import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get provider leaderboard with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceCategory = searchParams.get('serviceCategory');
    const county = searchParams.get('county');
    const tier = searchParams.get('tier');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filters
    const where: any = {
      verificationStatus: 'APPROVED' // Only show verified providers
    };

    if (serviceCategory) {
      where.serviceCategory = serviceCategory;
    }

    if (county) {
      where.county = county;
    }

    if (tier) {
      where.rankingTier = tier;
    }

    // Get providers with their ranking data
    const providers = await prisma.providerProfile.findMany({
      where,
      include: {
        user: true
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalRatings: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Format response
    const leaderboard = providers.map(provider => ({
      providerId: provider.id,
      providerName: provider.user.name,
      serviceCategory: provider.serviceCategory,
      county: provider.county,
      averageRating: provider.averageRating || 0,
      totalRatings: provider.totalRatings,
      rankingTier: provider.rankingTier,
      ratingDistribution: {
        fiveStar: provider.totalFiveStar,
        fourStar: provider.totalFourStar,
        threeStar: provider.totalThreeStar,
        twoStar: provider.totalTwoStar,
        oneStar: provider.totalOneStar
      }
    }));

    // Get total count for pagination
    const totalCount = await prisma.providerProfile.count({ where });

    return NextResponse.json({
      leaderboard,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}