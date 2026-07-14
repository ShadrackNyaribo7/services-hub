// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Verification types
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  provider?: string;
  details?: any;
}

export interface DocumentVerificationRequest {
  idNumber: string;
  policeClearanceNumber: string;
  credentialValidator: string;
  serviceCategory?: string;
}

export interface DocumentVerificationResponse {
  message: string;
  verificationStatus: string;
  verificationResults: {
    idVerification: VerificationResult;
    policeClearanceVerification: VerificationResult;
    credentialVerification: VerificationResult;
  };
  providerProfile: any;
}

export interface VerificationStatusResponse {
  verificationStatus: string;
  adminNotes?: string;
  hasDocuments: boolean;
  documents: {
    idNumber: string;
    policeClearanceNumber: string;
    credentialValidator: string;
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
  Credentialvalidator?: string;
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
    };
  };
}

// Booking types
export interface Booking {
  providerProfileId: string;
  clientName: string;
  clientPhone: string;
  county: string;
  scheduledDate: string;
  notes?: string;
  // Payment fields
  amount?: number;
  mpesaPhoneNumber?: string;
}

export interface BookingResponse {
  booking: {
    id: string;
    providerProfileId: string;
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
  amount: number;
  bookingId: string;
  accountReference: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  message?: string;
  checkoutRequestID?: string;
  responseCode?: string;
  responseDescription?: string;
}

export interface MpesaCallbackRequest {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata: {
        Item: {
          Name: string;
          Value: string | number;
        }[];
      };
    };
  };
}

// Unified Fitness Platform (UFP) API Types
export interface UFPAuthRequest {
  email_id: string;
  password: string;
  company_uuid: string;
}

export interface UFPAuthResponse {
  token: string;
  refresh_token: string;
  company_uuid: string;
}

export interface UFPClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

export interface UFPCoach {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  specializations: string[];
  status: string;
  tenant_id?: string;
  locale?: string;
}

export interface UFPAppointment {
  id: string;
  coach_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type_id: string;
  notes?: string;
}

export interface UFPAppointmentType {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export interface UFPAppointmentRequest {
  coach_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  appointment_type_id: string;
  notes?: string;
}

export interface UFPBookingRequest {
  appointment_id: string;
  client_id: string;
}

export interface UFPBookingResponse {
  id: string;
  appointment_id: string;
  client_id: string;
  status: string;
  booked_at: string;
}

export interface UFPTenant {
  id: string;
  name: string;
  locale: string;
  country?: string;
  region?: string;
  status: string;
}

export interface UFPTenantWithCoaches extends UFPTenant {
  coaches: UFPCoach[];
}

// Kora Pay Verification Types
export interface KoraVerificationRequest {
  idNumber: string;
  idType: 'national_id' | 'passport';
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  selfieImage?: string;
  consent?: boolean;
}

export interface KoraVerificationResponse {
  success: boolean;
  data?: {
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
    image?: string;
  };
  validationResults?: {
    nameMatch: boolean;
    dobMatch: boolean;
    selfieMatch?: boolean;
    selfieConfidence?: number;
  };
  error?: string;
}

export interface KoraQueryRequest {
  reference: string;
}

export interface KoraQueryResponse {
  success: boolean;
  data?: KoraVerificationResponse['data'];
  error?: string;
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
  escrowReleased: boolean;
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