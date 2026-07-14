import { useState } from "react";
import { apiServices } from "@/services/api";
import { RatingRequest, RatingEligibility, RatingResponse, ProviderRanking } from "@/types";

export function useRating() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = async (bookingId: string): Promise<RatingEligibility | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.rating.checkEligibility(bookingId);

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const submitRating = async (ratingData: RatingRequest): Promise<RatingResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.rating.submitRating(ratingData);

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderRanking = async (providerId: string): Promise<ProviderRanking | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.rating.getProviderRanking(providerId);

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getLeaderboard = async (filters?: {
    serviceCategory?: string;
    county?: string;
    tier?: string;
    limit?: number;
    offset?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.rating.getLeaderboard(filters);

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    checkEligibility,
    submitRating,
    getProviderRanking,
    getLeaderboard,
    isLoading,
    error,
    reset: () => setError(null)
  };
}