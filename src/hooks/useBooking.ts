import { useState } from "react";
import { apiServices } from "@/services/api";
import { Booking } from "@/types";

export function useBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createBooking = async (booking: Booking) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiServices.bookings.createBooking(booking);

      if (response.error) {
        setError(response.error);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    createBooking,
    isLoading,
    error,
    success,
    reset,
  };
}