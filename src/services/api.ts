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
  MpesaPaymentResponse,
  MpesaPaymentStatusResponse,
  RatingRequest,
  RatingResponse,
  RatingEligibility,
  ProviderLeaderboardResponse,
  ProviderRanking,
} from "@/types";

// Internal browser requests must remain same-origin. The public deployment URL is
// server-only payment configuration and must never redirect authenticated API
// calls to a build-time hostname.
const API_BASE_URL = "";

// Generic API handler with error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || "An error occurred",
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

// Provider Application Service
export const providerApplicationService = {
  async submitApplication(
    application: ProviderApplication,
  ): Promise<ApiResponse<ProviderApplicationResponse>> {
    return apiCall<ProviderApplicationResponse>("/api/provider-applications", {
      method: "POST",
      body: JSON.stringify(application),
    });
  },
};

// Booking Service
export const bookingService = {
  async createBooking(booking: Booking): Promise<ApiResponse<BookingResponse>> {
    return apiCall<BookingResponse>("/api/provider-applications/bookings", {
      method: "POST",
      body: JSON.stringify(booking),
    });
  },
};

// Document Verification Service
export const documentVerificationService = {
  async verifyDocuments(
    documents: DocumentVerificationRequest,
  ): Promise<ApiResponse<DocumentVerificationResponse>> {
    return apiCall<DocumentVerificationResponse>("/api/documents/verify", {
      method: "POST",
      body: JSON.stringify(documents),
    });
  },

  async getVerificationStatus(): Promise<
    ApiResponse<VerificationStatusResponse>
  > {
    return apiCall<VerificationStatusResponse>("/api/documents/verify", {
      method: "GET",
    });
  },
};

// MPesa Payment Service
export const mpesaPaymentService = {
  async initiatePayment(
    payment: MpesaPaymentRequest,
  ): Promise<ApiResponse<MpesaPaymentResponse>> {
    return apiCall<MpesaPaymentResponse>("/api/mpesa/initiate", {
      method: "POST",
      body: JSON.stringify(payment),
    });
  },

  async checkPaymentStatus(
    bookingId: string,
  ): Promise<ApiResponse<MpesaPaymentStatusResponse>> {
    return apiCall<MpesaPaymentStatusResponse>(
      `/api/mpesa/status?bookingId=${bookingId}`,
      {
        method: "GET",
      },
    );
  },
};

// Rating and Ranking Service
export const ratingService = {
  async checkEligibility(
    bookingId: string,
  ): Promise<ApiResponse<RatingEligibility>> {
    return apiCall<RatingEligibility>(`/api/ratings/eligibility/${bookingId}`, {
      method: "GET",
    });
  },

  async submitRating(
    rating: RatingRequest,
  ): Promise<ApiResponse<RatingResponse>> {
    return apiCall<RatingResponse>("/api/ratings", {
      method: "POST",
      body: JSON.stringify(rating),
    });
  },

  async getProviderRanking(
    providerId: string,
  ): Promise<ApiResponse<ProviderRanking>> {
    return apiCall<ProviderRanking>(`/api/ratings/providers/${providerId}`, {
      method: "GET",
    });
  },

  async getLeaderboard(filters?: {
    serviceCategory?: string;
    county?: string;
    tier?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ProviderLeaderboardResponse>> {
    const params = new URLSearchParams();
    if (filters?.serviceCategory)
      params.append("serviceCategory", filters.serviceCategory);
    if (filters?.county) params.append("county", filters.county);
    if (filters?.tier) params.append("tier", filters.tier);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    return apiCall<ProviderLeaderboardResponse>(
      `/api/ratings/leaderboard?${params.toString()}`,
      {
        method: "GET",
      },
    );
  },
};

// Export all services
export const apiServices = {
  providerApplications: providerApplicationService,
  bookings: bookingService,
  documentVerification: documentVerificationService,
  mpesaPayment: mpesaPaymentService,
  rating: ratingService,
};
