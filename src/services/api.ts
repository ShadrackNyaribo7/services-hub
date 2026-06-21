import {
  ApiResponse,
  ProviderApplication,
  ProviderApplicationResponse,
  Booking,
  BookingResponse
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

// Export all services
export const apiServices = {
  providerApplications: providerApplicationService,
  bookings: bookingService,
};