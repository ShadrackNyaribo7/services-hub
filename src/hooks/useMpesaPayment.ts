import { useState } from "react";
import { apiServices } from "@/services/api";
import { MpesaPaymentRequest } from "@/types";

export function useMpesaPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);

  const initiatePayment = async (payment: MpesaPaymentRequest) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiServices.mpesaPayment.initiatePayment(payment);

      if (response.error) {
        setError(response.error);
        return false;
      }

      setSuccess(true);
      setCheckoutRequestID(response.data?.checkoutRequestID || null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (bookingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.mpesaPayment.checkPaymentStatus(bookingId);

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

  const reset = () => {
    setError(null);
    setSuccess(false);
    setCheckoutRequestID(null);
  };

  return {
    initiatePayment,
    checkPaymentStatus,
    isLoading,
    error,
    success,
    checkoutRequestID,
    reset,
  };
}