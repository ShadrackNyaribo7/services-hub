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