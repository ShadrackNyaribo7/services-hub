import {
  ApiResponse,
  ProviderApplication,
  ProviderApplicationResponse,
  Booking,
  BookingResponse,
  DocumentVerificationRequest,
  DocumentVerificationResponse,
  VerificationStatusResponse,
  MpesaPaymentRequest,
  MpesaPaymentResponse
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Generic API handler with error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || 'An error occurred',
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

// Provider Application Service
export const providerApplicationService = {
  async submitApplication(
    application: ProviderApplication
  ): Promise<ApiResponse<ProviderApplicationResponse>> {
    return apiCall<ProviderApplicationResponse>('/api/provider-applications', {
      method: 'POST',
      body: JSON.stringify(application),
    });
  },
};

// Booking Service
export const bookingService = {
  async createBooking(
    booking: Booking
  ): Promise<ApiResponse<BookingResponse>> {
    return apiCall<BookingResponse>('/api/provider-applications/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  },
};

// Document Verification Service
export const documentVerificationService = {
  async verifyDocuments(
    documents: DocumentVerificationRequest
  ): Promise<ApiResponse<DocumentVerificationResponse>> {
    return apiCall<DocumentVerificationResponse>('/api/documents/verify', {
      method: 'POST',
      body: JSON.stringify(documents),
    });
  },

  async getVerificationStatus(): Promise<ApiResponse<VerificationStatusResponse>> {
    return apiCall<VerificationStatusResponse>('/api/documents/verify', {
      method: 'GET',
    });
  },
};

// MPesa Payment Service
export const mpesaPaymentService = {
  async initiatePayment(
    payment: MpesaPaymentRequest
  ): Promise<ApiResponse<MpesaPaymentResponse>> {
    return apiCall<MpesaPaymentResponse>('/api/mpesa/initiate', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  },

  async checkPaymentStatus(bookingId: string): Promise<ApiResponse<any>> {
    return apiCall<any>(`/api/mpesa/status?bookingId=${bookingId}`, {
      method: 'GET',
    });
  },
};

// Export all services
export const apiServices = {
  providerApplications: providerApplicationService,
  bookings: bookingService,
  documentVerification: documentVerificationService,
  mpesaPayment: mpesaPaymentService,
};