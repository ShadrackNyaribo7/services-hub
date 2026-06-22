import { useState, useCallback } from 'react';
import { documentVerificationService } from '@/services/api';
import { DocumentVerificationRequest, VerificationStatusResponse } from '@/types';

export function useDocumentVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);

  const verifyDocuments = useCallback(async (documents: DocumentVerificationRequest) => {
    setIsVerifying(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await documentVerificationService.verifyDocuments(documents);

      if (result.error) {
        setError(result.error);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const fetchVerificationStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await documentVerificationService.getVerificationStatus();

      if (result.error) {
        setError(result.error);
        return null;
      }

      setVerificationStatus(result.data || null);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verification status');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsVerifying(false);
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    verifyDocuments,
    fetchVerificationStatus,
    isVerifying,
    isLoading,
    error,
    success,
    verificationStatus,
    reset
  };
}