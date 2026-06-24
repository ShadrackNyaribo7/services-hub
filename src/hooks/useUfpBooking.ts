import { useState } from 'react';
import { UFPCoach, UFPAppointment, UFPAppointmentType, UFPAppointmentRequest, UFPBookingRequest } from '@/types';

interface UseUfpBookingReturn {
  coaches: UFPCoach[] | null;
  appointments: UFPAppointment[] | null;
  appointmentTypes: UFPAppointmentType[] | null;
  isLoading: boolean;
  error: string | null;
  fetchCoaches: (tenantId?: string) => Promise<void>;
  fetchAppointments: (coachId?: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchAppointmentTypes: (tenantId?: string) => Promise<void>;
  createAppointment: (appointment: UFPAppointmentRequest) => Promise<UFPAppointment | null>;
  bookAppointment: (booking: UFPBookingRequest) => Promise<any | null>;
  reset: () => void;
}

export function useUfpBooking(): UseUfpBookingReturn {
  const [coaches, setCoaches] = useState<UFPCoach[] | null>(null);
  const [appointments, setAppointments] = useState<UFPAppointment[] | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<UFPAppointmentType[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCoaches(null);
    setAppointments(null);
    setAppointmentTypes(null);
    setError(null);
  };

  const fetchCoaches = async (tenantId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);
      
      const response = await fetch(`/api/ufp/trainers?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCoaches(data.data);
      } else {
        setError(data.error || 'Failed to fetch coaches');
      }
    } catch (err) {
      setError('Network error while fetching coaches');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async (coachId?: string, startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (coachId) params.append('coachId', coachId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/ufp/bookings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAppointments(data.data);
      } else {
        setError(data.error || 'Failed to fetch appointments');
      }
    } catch (err) {
      setError('Network error while fetching appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointmentTypes = async (tenantId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.append('tenantId', tenantId);

      const response = await fetch(`/api/ufp/appointment-types?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAppointmentTypes(data.data);
      } else {
        setError(data.error || 'Failed to fetch appointment types');
      }
    } catch (err) {
      setError('Network error while fetching appointment types');
    } finally {
      setIsLoading(false);
    }
  };

  const createAppointment = async (appointment: UFPAppointmentRequest): Promise<UFPAppointment | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ufp/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'appointment', ...appointment }),
      });
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.error || 'Failed to create appointment');
        return null;
      }
    } catch (err) {
      setError('Network error while creating appointment');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const bookAppointment = async (booking: UFPBookingRequest): Promise<any | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ufp/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'booking', ...booking }),
      });
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.error || 'Failed to book appointment');
        return null;
      }
    } catch (err) {
      setError('Network error while booking appointment');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    coaches,
    appointments,
    appointmentTypes,
    isLoading,
    error,
    fetchCoaches,
    fetchAppointments,
    fetchAppointmentTypes,
    createAppointment,
    bookAppointment,
    reset,
  };
}
