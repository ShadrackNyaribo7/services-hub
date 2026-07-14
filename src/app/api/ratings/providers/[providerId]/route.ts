import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProviderRanking } from '@/types';

// GET - Get ranking information for a specific provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;

    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        ratings: {
          include: {
            booking: {
              select: {
                clientName: true,
                scheduledDate: true,
                county: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Return recent 10 ratings
        }
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const rankingData: ProviderRanking = {
      providerId: provider.id,
      providerName: provider.user.name,
      serviceCategory: provider.serviceCategory,
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
    };

    return NextResponse.json({
      ranking: rankingData,
      recentRatings: provider.ratings
    });

  } catch (error) {
    console.error('Error fetching provider ranking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider ranking' },
      { status: 500 }
    );
  }
}