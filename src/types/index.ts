// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Verification types
export interface VerificationResult {
  valid: boolean;
  reason: string;
  provider: string;
  details?: Record<string, unknown>;
}

export interface DocumentVerificationRequest {
  idNumber: string;
  idNumberConfirmation: string;
  identityDocumentName: string;
  policeClearanceNumber: string;
  policeClearanceNumberConfirmation: string;
  policeClearanceName: string;
  serviceCategory?: string;
  certificationNumber?: string;
  certificationNumberConfirmation?: string;
  certificationHolderName?: string;
  certificationIssuer?: string;
  certificationName?: string;
  verificationConsent?: boolean;
}

export interface DocumentVerificationResponse {
  message: string;
  verificationStatus: string;
  verificationResults: Record<string, VerificationResult>;
  qualificationCheck?: ProviderQualificationCheckResponse;
  providerProfile: Record<string, unknown>;
}

export interface VerificationStatusResponse {
  verificationMode?: string;
  authenticityEstablished?: boolean;
  verificationStatus: string;
  adminNotes?: string;
  hasDocuments: boolean;
  documents: {
    idNumber: string;
    policeClearanceNumber: string;
    certificationNumber?: string;
    certificationIssuer?: string;
    certificationName?: string;
  };
  evidence?: {
    identity: string;
    policeClearance: string;
    serviceCertification: string;
  };
}

// Provider Application types
export interface ProviderApplication {
  fullName: string;
  phone: string;
  county: string;
  serviceCategory: string;
  policeClearanceNumber?: string;
  IDnumber?: string;
  idNumber?: string;
  idNumberConfirmation?: string;
  identityDocumentName?: string;
  policeClearanceNumberConfirmation?: string;
  policeClearanceName?: string;
  certificationNumber?: string;
  certificationNumberConfirmation?: string;
  certificationHolderName?: string;
  certificationIssuer?: string;
  certificationName?: string;
  verificationConsent?: boolean;
  phoneVerificationRequested?: boolean;
  phoneVerificationToken?: string;
}

export interface ProviderQualificationCheckResponse {
  accepted: boolean;
  autoApproved: boolean;
  recommendedStatus: string;
  adminNotes: string;
  blockingErrors: string[];
  checks: {
    name: string;
    label: string;
    valid: boolean;
    reason: string;
    provider: string;
    requiresManualReview: boolean;
    details?: Record<string, unknown>;
  }[];
}

export interface ProviderApplicationResponse {
  application: {
    id: string;
    name: string;
    phone: string;
    role: string;
    providerProfile: {
      id: string;
      county: string;
      serviceCategory: string;
      policeClearanceNumber?: string;
      idNumber?: string;
      certificationNumber?: string | null;
      certificationIssuer?: string | null;
      certificationName?: string | null;
      credentialVerificationLevel?: string | null;
      credentialVerificationMethod?: string | null;
      credentialVerificationSource?: string | null;
      credentialVerifiedAt?: Date | string | null;
      credentialManualReference?: string | null;
      verificationConsentAt?: Date | string | null;
      phoneVerifiedAt?: Date | string | null;
      phoneVerificationMethod?: string | null;
      phoneVerificationSource?: string | null;
      phoneVerificationReference?: string | null;
      identityVerificationLevel?: string | null;
      identityVerificationMethod?: string | null;
      identityVerificationSource?: string | null;
      identityVerificationReference?: string | null;
      identityVerifiedAt?: Date | string | null;
      identityVerifiedBy?: string | null;
      policeVerificationLevel?: string | null;
      policeVerificationMethod?: string | null;
      policeVerificationSource?: string | null;
      policeVerificationReference?: string | null;
      policeVerifiedAt?: Date | string | null;
      policeVerifiedBy?: string | null;
      verificationStatus: string;
      adminNotes?: string | null;
    };
  };
  message?: string;
  qualificationCheck?: ProviderQualificationCheckResponse;
}

// Booking types
export interface Booking {
  providerProfileId: string;
  providerServiceId: string;
  clientName: string;
  clientPhone: string;
  county: string;
  scheduledDate: string;
  notes?: string;
  // Payment fields
  mpesaPhoneNumber?: string;
}

export interface BookingResponse {
  booking: {
    id: string;
    providerProfileId: string;
    providerServiceId?: string | null;
    serviceName?: string | null;
    clientName: string;
    clientPhone: string;
    county: string;
    scheduledDate: Date;
    notes?: string;
    // Payment fields
    amount?: number;
    paymentStatus?: string;
    mpesaTransactionId?: string;
    mpesaReceiptNumber?: string;
    paymentMethod?: string;
    paymentCreatedAt?: Date;
    developerFee?: number | null;
    grossPlatformFee?: number | null;
    paymentProcessingFee?: number | null;
    providerAmount?: number | null;
    commissionRate?: number | null;
  };
  profit?: {
    serviceAmount: number;
    commissionRate: number;
    grossPlatformFee: number;
    paymentProcessingFee: number;
    developerFee: number;
    providerAmount: number;
    effectivePlatformTakeRate: number;
    profitabilityIndex: number;
  };
}

// Provider types
export interface Provider {
  id: string;
  name: string;
  serviceCategory: string;
  county: string;
  phone: string;
}

// MPesa types
export interface MpesaPaymentRequest {
  phoneNumber: string;
  amount?: number;
  bookingId: string;
  accountReference?: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  message?: string;
  checkoutRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
}

export interface MpesaPaymentStatusResponse {
  paymentStatus: string;
  amount?: number | null;
  mpesaReceiptNumber?: string | null;
  mpesaTransactionId?: string | null;
  paymentMethod?: string | null;
  paymentCreatedAt?: Date | string | null;
}

export interface MpesaCallbackRequest {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number | string;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: {
          Name: string;
          Value: string | number;
        }[];
      };
    };
  };
}

// Rating and Ranking types
export interface Rating {
  id: string;
  bookingId: string;
  providerProfileId: string;
  clientPhone: string;
  rating: number; // 1-5 stars
  comment?: string;
  ratingLegitimacyScore: number; // 0-1 score for legitimacy
  automatedFlags: string[];
  createdAt: Date;
  ratingEligibleAt: Date;
  ratedAt: Date;
}

export interface RatingRequest {
  bookingId: string;
  rating: number; // 1-5 stars
  comment?: string;
}

export interface RatingResponse {
  rating: Rating;
  providerUpdated: {
    averageRating: number;
    totalRatings: number;
    rankingTier: string;
  };
}

export interface RatingEligibility {
  eligible: boolean;
  reason?: string;
  paymentCompleted: boolean;
  serviceConfirmed: boolean;
  clientConfirmed: boolean;
}

export interface ProviderRanking {
  providerId: string;
  providerName: string;
  serviceCategory: string;
  averageRating: number;
  totalRatings: number;
  rankingTier: string;
  ratingDistribution: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}

export interface ProviderLeaderboardItem extends ProviderRanking {
  county: string;
}

export interface ProviderLeaderboardResponse {
  leaderboard: ProviderLeaderboardItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
