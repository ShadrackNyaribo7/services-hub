import { useState } from "react";
import { apiServices } from "@/services/api";
import { ProviderApplication } from "@/types";

export function useProviderApplication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submitApplication = async (application: ProviderApplication) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setMessage(null);

    try {
      const response = await apiServices.providerApplications.submitApplication(application);

      if (response.error) {
        const qualificationErrors =
          response.data?.qualificationCheck?.blockingErrors;
        setError(
          qualificationErrors?.length
            ? qualificationErrors.join(" ")
            : response.error,
        );
        return false;
      }

      setMessage(response.data?.message ?? null);
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
    setMessage(null);
  };

  return {
    submitApplication,
    isLoading,
    error,
    success,
    message,
    reset,
  };
}
