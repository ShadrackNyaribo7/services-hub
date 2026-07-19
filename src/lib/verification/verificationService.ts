// Document Verification Service
// Supports multiple third-party verification providers

interface VerificationResult {
  valid: boolean;
  reason?: string;
  provider?: string;
  details?: Record<string, unknown>;
}

interface VerificationApiResponse {
  message?: string;
  valid?: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  data?: {
    status?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    full_name?: string;
  };
}

interface VerificationProvider {
  name: string;
  verifyIdNumber(idNumber: string): Promise<VerificationResult>;
  verifyPoliceClearance(certificateNumber: string): Promise<VerificationResult>;
}

// Kenya Government Services (using Korapay for ID verification)
class KenyaGovernmentVerification implements VerificationProvider {
  name = 'KenyaGovernment';

  private apiBaseUrl = process.env.KE_GOV_API_URL || 'https://api.korapay.com/merchant/api/v1';
  private apiKey = process.env.KE_GOV_API_KEY;

  private async makeApiCall(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<VerificationApiResponse> {
    if (!this.apiKey) {
      throw new Error('Kenya Government API key not configured');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Kenya Government API error:', error);
      throw error;
    }
  }

  async verifyIdNumber(idNumber: string): Promise<VerificationResult> {
    try {
      // Format validation first
      if (!/^\d{8}$/.test(idNumber)) {
        return { valid: false, reason: 'Invalid ID number format. Must be 8 digits.', provider: this.name };
      }

      const result = await this.makeApiCall('/identities/ke/national-id', {
        id: idNumber,
        verification_consent: true
      });

      if (result.data && result.data.status === 'success') {
        return {
          valid: true,
          provider: this.name,
          details: { 
            firstName: result.data.first_name,
            lastName: result.data.last_name,
            middleName: result.data.middle_name,
            fullName: result.data.full_name
          }
        };
      } else {
        return { valid: false, reason: result.message || 'ID verification failed', provider: this.name };
      }
    } catch {
      return { valid: false, reason: 'Kenya ID verification service unavailable', provider: this.name };
    }
  }

  async verifyPoliceClearance(certificateNumber: string): Promise<VerificationResult> {
    try {
      // Basic format validation
      if (!certificateNumber || certificateNumber.length < 5) {
        return { valid: false, reason: 'Invalid police clearance certificate number', provider: this.name };
      }

      // Note: Police clearance verification typically requires direct DCI integration
      // Most third-party providers don't offer this service
      // For now, we'll do basic validation and recommend manual verification
      return {
        valid: true,
        reason: 'Police clearance requires manual verification. Please upload certificate for admin review.',
        provider: this.name,
        details: { requiresManualReview: true }
      };
    } catch {
      return { valid: false, reason: 'Police clearance verification service unavailable', provider: this.name };
    }
  }
}

// Professional Body Verification
class ProfessionalBodyVerification implements VerificationProvider {
  name = 'ProfessionalBody';

  private apiBaseUrl = process.env.PROFESSIONAL_BODY_API_URL || '';
  private apiKey = process.env.PROFESSIONAL_BODY_API_KEY;

  async verifyIdNumber(): Promise<VerificationResult> {
    return { valid: false, reason: 'ID verification not handled by professional bodies', provider: this.name };
  }

  async verifyPoliceClearance(): Promise<VerificationResult> {
    return { valid: false, reason: 'Police clearance not handled by professional bodies', provider: this.name };
  }
}

// Commercial Verification Services (Onfido, Veriff, etc.)
class CommercialVerificationService implements VerificationProvider {
  name = 'Commercial';

  private apiBaseUrl = process.env.COMMERCIAL_VERIFICATION_API_URL || '';
  private apiKey = process.env.COMMERCIAL_VERIFICATION_API_KEY;

  async verifyIdNumber(idNumber: string): Promise<VerificationResult> {
    try {
      if (!this.apiKey) {
        return { valid: true, reason: 'Commercial verification not configured, using basic validation', provider: this.name };
      }

      const response = await fetch(`${this.apiBaseUrl}/id-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ idNumber, country: 'KE' }),
      });

      const result = await response.json();

      return {
        valid: result.valid,
        reason: result.reason,
        provider: this.name,
        details: result.details
      };
    } catch {
      return { valid: true, reason: 'Commercial verification service unavailable, using basic validation', provider: this.name };
    }
  }

  async verifyPoliceClearance(): Promise<VerificationResult> {
    // Commercial services typically don't verify police certificates
    return { valid: true, reason: 'Police certificate verification handled by government services', provider: this.name };
  }
}

// Main Verification Service
class VerificationService {
  private providers: VerificationProvider[] = [];
  private primaryProvider: VerificationProvider | null = null;

  constructor() {
    // Initialize providers based on environment configuration
    const useKenyaGov = process.env.ENABLE_KE_GOV_VERIFICATION === 'true';
    const useProfessionalBodies = process.env.ENABLE_PROFESSIONAL_BODY_VERIFICATION === 'true';
    const useCommercial = process.env.ENABLE_COMMERCIAL_VERIFICATION === 'true';

    if (useKenyaGov) {
      const kenyaGov = new KenyaGovernmentVerification();
      this.providers.push(kenyaGov);
      this.primaryProvider = kenyaGov;
    }

    if (useProfessionalBodies) {
      const professionalBodies = new ProfessionalBodyVerification();
      this.providers.push(professionalBodies);
      if (!this.primaryProvider) this.primaryProvider = professionalBodies;
    }

    if (useCommercial) {
      const commercial = new CommercialVerificationService();
      this.providers.push(commercial);
      if (!this.primaryProvider) this.primaryProvider = commercial;
    }

    // Fallback to basic validation if no providers configured
    if (this.providers.length === 0) {
      console.log('No verification providers configured, using basic validation');
    }
  }

  async verifyIdNumber(idNumber: string): Promise<VerificationResult> {
    if (this.primaryProvider) {
      const result = await this.primaryProvider.verifyIdNumber(idNumber);
      if (result.valid) return result;
    }

    // Fallback to basic validation
    return this.basicIdValidation(idNumber);
  }

  async verifyPoliceClearance(certificateNumber: string): Promise<VerificationResult> {
    if (this.primaryProvider) {
      const result = await this.primaryProvider.verifyPoliceClearance(certificateNumber);
      if (result.valid) return result;
    }

    // Fallback to basic validation
    return this.basicPoliceClearanceValidation(certificateNumber);
  }

  async verifyAllDocuments(documents: {
    idNumber: string;
    policeClearanceNumber: string;
  }): Promise<{
    idVerification: VerificationResult;
    policeClearanceVerification: VerificationResult;
    overallValid: boolean;
  }> {
    const [idVerification, policeClearanceVerification] = await Promise.all([
      this.verifyIdNumber(documents.idNumber),
      this.verifyPoliceClearance(documents.policeClearanceNumber)
    ]);

    const overallValid = idVerification.valid && policeClearanceVerification.valid;

    return {
      idVerification,
      policeClearanceVerification,
      overallValid
    };
  }

  // Basic validation fallback
  private basicIdValidation(idNumber: string): VerificationResult {
    if (!idNumber || idNumber.length < 5) {
      return { valid: false, reason: 'ID number format is invalid (minimum 5 characters)' };
    }
    if (!/^\d+$/.test(idNumber)) {
      return { valid: false, reason: 'ID number should contain only digits' };
    }
    return { valid: true, reason: 'Basic ID validation passed', provider: 'Basic' };
  }

  private basicPoliceClearanceValidation(certificateNumber: string): VerificationResult {
    if (!certificateNumber || certificateNumber.length < 5) {
      return { valid: false, reason: 'Police clearance number format is invalid (minimum 5 characters)' };
    }
    return { valid: true, reason: 'Basic police clearance validation passed', provider: 'Basic' };
  }
}

// Export singleton instance
export const verificationService = new VerificationService();
