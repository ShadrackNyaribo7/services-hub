import { useState } from "react";
import { apiServices } from "@/services/api";
import { KoraQueryResponse, KoraVerificationRequest, KoraVerificationResponse } from "@/types";

type VerificationData =
  | KoraVerificationResponse
  | KoraQueryResponse
  | null;

export function useKoraVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData>(null);

  const verifyIdentity = async (verification: KoraVerificationRequest): Promise<KoraVerificationResponse | null> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiServices.koraVerification.verifyIdentity(verification);

      if (response.error) {
        setError(response.error);
        return null;
      }

      setSuccess(true);
      setVerificationData(response.data ?? null);
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const queryVerification = async (reference: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiServices.koraVerification.queryVerification({ reference });

      if (response.error) {
        setError(response.error);
        return null;
      }

      setVerificationData(response.data ?? null);
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
    setVerificationData(null);
  };

  return {
    verifyIdentity,
    queryVerification,
    isLoading,
    error,
    success,
    verificationData,
    reset,
  };
}
