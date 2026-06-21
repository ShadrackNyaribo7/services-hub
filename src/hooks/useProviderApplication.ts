import { useState } from "react";
import { apiServices } from "@/services/api";
import { ProviderApplication } from "@/types";

export function useProviderApplication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitApplication = async (application: ProviderApplication) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiServices.providerApplications.submitApplication(application);

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
    submitApplication,
    isLoading,
    error,
    success,
    reset,
  };
}