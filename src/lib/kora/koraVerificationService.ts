// Kora Pay Identity Verification Service for Kenyan IDs and Passports
import axios from 'axios';

interface KoraConfig {
  secretKey: string;
  environment: 'test' | 'live';
}

interface KoraValidationData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  selfie?: string; // Base64 encoded image
}

interface KoraVerificationRequest {
  id: string;
  verification_consent: boolean;
  validation?: KoraValidationData;
}

interface KoraVerificationResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    id: string;
    id_type: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    full_name: string;
    date_of_birth: string;
    nationality: string;
    gender: string;
    image?: string; // Base64 encoded image from government database
    validation?: {
      first_name?: { value: string; match: boolean };
      last_name?: { value: string; match: boolean };
      date_of_birth?: { value: string; match: boolean };
      selfie?: { value: string; match: boolean; confidence_rating?: number };
    };
    requested_by: string;
  };
}

interface KoraQueryResponse {
  status: boolean;
  message: string;
  data: KoraVerificationResponse['data'];
}

class KoraVerificationService {
  private config: KoraConfig;

  constructor() {
    this.config = {
      secretKey: process.env.KORA_SECRET_KEY || '',
      environment: (process.env.KORA_ENVIRONMENT as 'test' | 'live') || 'test',
    };

    if (!this.config.secretKey) {
      console.warn('Kora Pay credentials not configured. Verification features will be limited.');
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'test'
      ? 'https://api.korapay.com/merchant/api/v1'
      : 'https://api.korapay.com/merchant/api/v1';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    };
  }

  /**
   * Verify Kenyan National ID
   * @param idNumber - The National ID number
   * @param consent - User consent for verification (must be true)
   * @param validationData - Optional data for validation matching
   */
  async verifyNationalID(
    idNumber: string,
    consent: boolean = true,
    validationData?: KoraValidationData
  ): Promise<KoraVerificationResponse> {
    try {
      const request: KoraVerificationRequest = {
        id: idNumber,
        verification_consent: consent,
      };

      if (validationData) {
        request.validation = validationData;
      }

      const response = await axios.post(
        `${this.getBaseUrl()}/identities/ke/national-id`,
        request,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error verifying Kenyan National ID:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Kora verification error: ${error.response.data?.message || 'Failed to verify National ID'}`);
      }
      throw new Error('Failed to verify National ID with Kora Pay');
    }
  }

  /**
   * Verify Kenyan International Passport
   * @param passportNumber - The Passport number
   * @param consent - User consent for verification (must be true)
   * @param validationData - Optional data for validation matching
   */
  async verifyPassport(
    passportNumber: string,
    consent: boolean = true,
    validationData?: KoraValidationData
  ): Promise<KoraVerificationResponse> {
    try {
      const request: KoraVerificationRequest = {
        id: passportNumber,
        verification_consent: consent,
      };

      if (validationData) {
        request.validation = validationData;
      }

      const response = await axios.post(
        `${this.getBaseUrl()}/identities/ke/passport`,
        request,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error verifying Kenyan Passport:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Kora verification error: ${error.response.data?.message || 'Failed to verify Passport'}`);
      }
      throw new Error('Failed to verify Passport with Kora Pay');
    }
  }

  /**
   * Query a previous verification using the reference
   * @param reference - The verification reference from the initial request
   */
  async queryVerification(reference: string): Promise<KoraQueryResponse> {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/identities/verifications/${reference}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error querying Kora verification:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Kora verification error: ${error.response.data?.message || 'Failed to query verification'}`);
      }
      throw new Error('Failed to query verification with Kora Pay');
    }
  }

  /**
   * Process verification request with full data validation and facial matching
   * This is the recommended method for comprehensive verification
   */
  async verifyIdentityWithFullValidation(
    idNumber: string,
    idType: 'national_id' | 'passport',
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    selfieImage?: string // Base64 encoded selfie
  ): Promise<{
    success: boolean;
    data: KoraVerificationResponse['data'];
    validationResults: {
      nameMatch: boolean;
      dobMatch: boolean;
      selfieMatch?: boolean;
      selfieConfidence?: number;
    };
  }> {
    try {
      const validationData: KoraValidationData = {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
      };

      if (selfieImage) {
        validationData.selfie = selfieImage;
      }

      const response =
        idType === 'national_id'
          ? await this.verifyNationalID(idNumber, true, validationData)
          : await this.verifyPassport(idNumber, true, validationData);

      if (!response.status) {
        throw new Error(response.message || 'Verification failed');
      }

      const validation = response.data.validation || {};

      return {
        success: true,
        data: response.data,
        validationResults: {
          nameMatch:
            (validation.first_name?.match || false) &&
            (validation.last_name?.match || false),
          dobMatch: validation.date_of_birth?.match || false,
          selfieMatch: validation.selfie?.match,
          selfieConfidence: validation.selfie?.confidence_rating,
        },
      };
    } catch (error) {
      console.error('Error in full identity verification:', error);
      throw error;
    }
  }

  /**
   * Validate Kenyan National ID format
   */
  validateNationalIDFormat(idNumber: string): boolean {
    // Kenyan National IDs are typically 8 digits
    return /^\d{8}$/.test(idNumber);
  }

  /**
   * Validate Kenyan Passport format
   */
  validatePassportFormat(passportNumber: string): boolean {
    // Kenyan passports typically start with a letter followed by digits
    // Format: A followed by 7 digits (e.g., A1234567)
    return /^[A-Za-z]\d{7}$/.test(passportNumber);
  }

  /**
   * Validate date of birth format (YYYY-MM-DD)
   */
  validateDateFormat(dateOfBirth: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateOfBirth)) return false;

    const date = new Date(dateOfBirth);
    return !isNaN(date.getTime());
  }

  /**
   * Validate base64 image format
   */
  validateBase64Image(base64String: string): boolean {
    // Check if it's a valid base64 string with image prefix
    const base64Regex = /^data:image\/(jpeg|png|jpg);base64,/;
    return base64Regex.test(base64String);
  }

  /**
   * Process webhook notification from Kora Pay
   */
  processWebhook(payload: any): { success: boolean; reference: string; status: string } {
    try {
      const { reference, status } = payload.data || payload;

      if (!reference || !status) {
        throw new Error('Invalid webhook payload');
      }

      return {
        success: true,
        reference,
        status,
      };
    } catch (error) {
      console.error('Error processing Kora webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }

  /**
   * Validate webhook signature (recommended for production)
   */
  validateWebhookSignature(payload: any, signature: string): boolean {
    const webhookSecret = process.env.KORA_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured. Skipping signature verification.');
      return true; // Skip verification in development/test mode
    }

    // TODO: Implement actual signature verification using Kora's webhook secret
    // This typically involves HMAC-SHA256 verification
    return true;
  }
}

// Export singleton instance
export const koraVerificationService = new KoraVerificationService();
