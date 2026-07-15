import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { RatingRequest, RatingResponse } from '@/types';

// POST - Submit a rating for a provider
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RatingRequest = await request.json();
    const { bookingId, rating, comment } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5 stars' },
        { status: 400 }
      );
    }

    // Find the booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { 
        rating: true,
        providerProfile: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if rating already exists
    if (booking.rating) {
      return NextResponse.json(
        { error: 'Rating already submitted for this booking' },
        { status: 400 }
      );
    }

    // Verify eligibility - all requirements must be met
    const eligibilityChecks = {
      paymentCompleted: booking.paymentStatus === 'COMPLETED',
      serviceConfirmed: booking.serviceConfirmed,
      clientConfirmed: booking.clientConfirmed,
      escrowReleased: booking.escrowReleased
    };

    const allRequirementsMet = Object.values(eligibilityChecks).every(check => check === true);

    if (!allRequirementsMet) {
      return NextResponse.json(
        { 
          error: 'Booking not eligible for rating. Both provider and client must confirm payment and service completion.' 
        },
        { status: 400 }
      );
    }

    // Calculate rating legitimacy score
    const legitimacyAnalysis = calculateRatingLegitimacy(booking, rating);
    
    // Create the rating record
    const newRating = await prisma.rating.create({
      data: {
        bookingId,
        providerProfileId: booking.providerProfileId,
        clientPhone: booking.clientPhone,
        rating,
        comment,
        ratingLegitimacyScore: legitimacyAnalysis.score,
        automatedFlags: legitimacyAnalysis.flags,
        ratingEligibleAt: booking.ratingEligibleAt || new Date(),
        ratedAt: new Date()
      }
    });

    // Update provider profile with new rating data
    const updatedProvider = await updateProviderRanking(booking.providerProfileId);

    return NextResponse.json({
      rating: newRating,
      providerUpdated: {
        averageRating: updatedProvider.averageRating || 0,
        totalRatings: updatedProvider.totalRatings,
        rankingTier: updatedProvider.rankingTier
      }
    } as RatingResponse);

  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

// GET - Get all ratings for a provider
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const ratings = await prisma.rating.findMany({
      where: { providerProfileId: providerId },
      include: {
        booking: {
          select: {
            clientName: true,
            scheduledDate: true,
            county: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ ratings });

  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

// Helper function to calculate rating legitimacy
function calculateRatingLegitimacy(booking: any, rating: number): { score: number, flags: string[] } {
  let score = 1.0; // Start with perfect legitimacy
  const flags: string[] = [];

  // Flag 1: Suspicious activity on booking
  if (booking.suspiciousActivity) {
    score -= 0.3;
    flags.push('SUSPICIOUS_BOOKING_ACTIVITY');
  }

  // Flag 2: Very low payment amount (potential fake booking)
  if (booking.amount && booking.amount < 100) {
    score -= 0.2;
    flags.push('LOW_PAYMENT_AMOUNT');
  }

  // Flag 3: Extreme rating patterns
  if (rating === 1 || rating === 5) {
    // Check if this is part of a pattern (simplified for now)
    // In production, you'd analyze the provider's rating distribution
    score -= 0.05; // Slight reduction for extreme ratings
    flags.push('EXTREME_RATING');
  }

  // Flag 4: Time-based legitimacy (rating submitted too quickly)
  const ratingEligibleTime = booking.ratingEligibleAt ? new Date(booking.ratingEligibleAt).getTime() : 0;
  const currentTime = new Date().getTime();
  const timeDiff = currentTime - ratingEligibleTime;

  if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes
    score -= 0.15;
    flags.push('QUICK_RATING');
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return { score, flags };
}

// Helper function to update provider ranking
async function updateProviderRanking(providerProfileId: string) {
  // Get all ratings for the provider
  const ratings = await prisma.rating.findMany({
    where: { providerProfileId: providerProfileId }
  });

  // Calculate new average and distribution
  const totalRatings = ratings.length;
  const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

  // Count rating distribution
  const distribution = {
    fiveStar: ratings.filter(r => r.rating === 5).length,
    fourStar: ratings.filter(r => r.rating === 4).length,
    threeStar: ratings.filter(r => r.rating === 3).length,
    twoStar: ratings.filter(r => r.rating === 2).length,
    oneStar: ratings.filter(r => r.rating === 1).length
  };

  // Determine ranking tier based on total ratings
  let rankingTier: 'NEW' | 'EMERGING' | 'ESTABLISHED' | 'TOP_RATED' | 'ELITE' = 'NEW';
  if (totalRatings >= 100) rankingTier = 'ELITE';
  else if (totalRatings >= 51) rankingTier = 'TOP_RATED';
  else if (totalRatings >= 21) rankingTier = 'ESTABLISHED';
  else if (totalRatings >= 6) rankingTier = 'EMERGING';

  // Update provider profile
  const updatedProvider = await prisma.providerProfile.update({
    where: { id: providerProfileId },
    data: {
      averageRating,
      totalRatings,
      totalFiveStar: distribution.fiveStar,
      totalFourStar: distribution.fourStar,
      totalThreeStar: distribution.threeStar,
      totalTwoStar: distribution.twoStar,
      totalOneStar: distribution.oneStar,
      rankingTier
    }
  });

  return updatedProvider;
}