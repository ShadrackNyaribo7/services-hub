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
  UFPAuthRequest,
  UFPAuthResponse,
  UFPCoach,
  UFPAppointment,
  UFPAppointmentType,
  UFPAppointmentRequest,
  UFPBookingRequest,
  UFPBookingResponse,
  UFPTenant,
  UFPTenantWithCoaches,
  KoraVerificationRequest,
  KoraVerificationResponse,
  KoraQueryRequest,
  KoraQueryResponse,
  RatingRequest,
  RatingResponse,
  RatingEligibility,
  ProviderLeaderboardResponse,
  ProviderRanking
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const UFP_API_BASE_URL = process.env.UFP_API_BASE_URL || 'https://api.unifiedfitnessplatform.ai';
const UFP_ENVIRONMENT = process.env.UFP_ENVIRONMENT || 'production';

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

  async checkPaymentStatus(
    bookingId: string
  ): Promise<ApiResponse<MpesaPaymentStatusResponse>> {
    return apiCall<MpesaPaymentStatusResponse>(`/api/mpesa/status?bookingId=${bookingId}`, {
      method: 'GET',
    });
  },
};

// Kora Verification Service
export const koraVerificationService = {
  async verifyIdentity(
    verification: KoraVerificationRequest
  ): Promise<ApiResponse<KoraVerificationResponse>> {
    return apiCall<KoraVerificationResponse>('/api/kora/verify', {
      method: 'POST',
      body: JSON.stringify(verification),
    });
  },

  async queryVerification(
    query: KoraQueryRequest
  ): Promise<ApiResponse<KoraQueryResponse>> {
    return apiCall<KoraQueryResponse>(`/api/kora/query?reference=${query.reference}`, {
      method: 'GET',
    });
  },
};

// Rating and Ranking Service
export const ratingService = {
  async checkEligibility(
    bookingId: string
  ): Promise<ApiResponse<RatingEligibility>> {
    return apiCall<RatingEligibility>(`/api/ratings/eligibility/${bookingId}`, {
      method: 'GET',
    });
  },

  async submitRating(
    rating: RatingRequest
  ): Promise<ApiResponse<RatingResponse>> {
    return apiCall<RatingResponse>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  },

  async getProviderRanking(
    providerId: string
  ): Promise<ApiResponse<ProviderRanking>> {
    return apiCall<ProviderRanking>(`/api/ratings/providers/${providerId}`, {
      method: 'GET',
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
    if (filters?.serviceCategory) params.append('serviceCategory', filters.serviceCategory);
    if (filters?.county) params.append('county', filters.county);
    if (filters?.tier) params.append('tier', filters.tier);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return apiCall<ProviderLeaderboardResponse>(`/api/ratings/leaderboard?${params.toString()}`, {
      method: 'GET',
    });
  },
};

// Unified Fitness Platform (UFP) Service
class UFPService {
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  // Authentication
  async authenticate(): Promise<ApiResponse<UFPAuthResponse>> {
    const authRequest: UFPAuthRequest = {
      email_id: process.env.UFP_API_EMAIL || '',
      password: process.env.UFP_API_PASSWORD || '',
      company_uuid: process.env.UFP_COMPANY_UUID || '',
    };

    try {
      console.log(`UFP Authentication - Environment: ${UFP_ENVIRONMENT}, API: ${UFP_API_BASE_URL}`);
      const response = await fetch(`${UFP_API_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authRequest),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        this.token = data.token;
        this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour expiry
        console.log('UFP Authentication successful');
        return {
          data: data,
          status: response.status,
        };
      } else {
        console.error('UFP Authentication failed:', data.error);
        return {
          error: data.error || 'Authentication failed',
          status: response.status,
        };
      }
    } catch (error) {
      console.error('UFP Authentication network error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.token || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      const authResult = await this.authenticate();
      if (authResult.error) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
    }
  }

  private async ufpApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    await this.ensureAuthenticated();

    try {
      const response = await fetch(`${UFP_API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
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

  // Get coaches/trainers
  async getCoaches(tenantId?: string): Promise<ApiResponse<UFPCoach[]>> {
    const endpoint = tenantId 
      ? `/tenants/${tenantId}/coaches`
      : '/coaches';
    return this.ufpApiCall<UFPCoach[]>(endpoint);
  }

  // Get appointment types
  async getAppointmentTypes(tenantId?: string): Promise<ApiResponse<UFPAppointmentType[]>> {
    const endpoint = tenantId
      ? `/tenants/${tenantId}/appointment-types`
      : '/appointment-types';
    return this.ufpApiCall<UFPAppointmentType[]>(endpoint);
  }

  // Get available appointments
  async getAppointments(
    coachId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<UFPAppointment[]>> {
    const params = new URLSearchParams();
    if (coachId) params.append('coach_id', coachId);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const endpoint = `/appointments${params.toString() ? `?${params.toString()}` : ''}`;
    return this.ufpApiCall<UFPAppointment[]>(endpoint);
  }

  // Create appointment
  async createAppointment(
    appointment: UFPAppointmentRequest
  ): Promise<ApiResponse<UFPAppointment>> {
    return this.ufpApiCall<UFPAppointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  // Book appointment
  async bookAppointment(
    booking: UFPBookingRequest
  ): Promise<ApiResponse<UFPBookingResponse>> {
    return this.ufpApiCall<UFPBookingResponse>('/appointments/booking', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  // Get all tenants/locales
  async getTenants(): Promise<ApiResponse<UFPTenant[]>> {
    return this.ufpApiCall<UFPTenant[]>('/tenants');
  }

  // Get all coaches across all tenants
  async getAllCoachesAcrossTenants(): Promise<ApiResponse<UFPTenantWithCoaches[]>> {
    const tenantsResult = await this.getTenants();
    
    if (tenantsResult.error || !tenantsResult.data) {
      return {
        error: tenantsResult.error || 'Failed to fetch tenants',
        status: tenantsResult.status || 500,
      };
    }

    const tenants = tenantsResult.data;
    const tenantsWithCoaches: UFPTenantWithCoaches[] = [];

    // Fetch coaches for each tenant in parallel
    const coachPromises = tenants.map(async (tenant) => {
      const coachesResult = await this.getCoaches(tenant.id);
      return {
        tenant,
        coaches: coachesResult.data || [],
      };
    });

    const results = await Promise.all(coachPromises);

    results.forEach(({ tenant, coaches }) => {
      // Add tenant information to each coach
      const coachesWithTenant = coaches.map(coach => ({
        ...coach,
        tenant_id: tenant.id,
        locale: tenant.locale,
      }));

      tenantsWithCoaches.push({
        ...tenant,
        coaches: coachesWithTenant,
      });
    });

    return {
      data: tenantsWithCoaches,
      status: 200,
    };
  }

  // Get all coaches flattened across all tenants
  async getAllCoachesFlattened(): Promise<ApiResponse<UFPCoach[]>> {
    const result = await this.getAllCoachesAcrossTenants();
    
    if (result.error || !result.data) {
      return {
        error: result.error || 'Failed to fetch coaches',
        status: result.status || 500,
      };
    }

    // Flatten all coaches from all tenants
    const allCoaches: UFPCoach[] = [];
    result.data.forEach(tenant => {
      allCoaches.push(...tenant.coaches);
    });

    return {
      data: allCoaches,
      status: 200,
    };
  }
}

export const ufpService = new UFPService();

// Export all services
export const apiServices = {
  providerApplications: providerApplicationService,
  bookings: bookingService,
  documentVerification: documentVerificationService,
  mpesaPayment: mpesaPaymentService,
  koraVerification: koraVerificationService,
  rating: ratingService,
  ufp: ufpService,
};
