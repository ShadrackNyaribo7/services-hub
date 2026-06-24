"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUfpBooking } from "@/hooks/useUfpBooking";
import { UFPAppointment, UFPAppointmentType, UFPCoach } from "@/types";

export default function BookUFPTrainerPage() {
  const params = useParams<{ id: string }>();
  const { 
    appointments, 
    appointmentTypes, 
    isLoading, 
    error, 
    fetchAppointments, 
    fetchAppointmentTypes,
    createAppointment,
    bookAppointment 
  } = useUfpBooking();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<UFPAppointment | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [bookingStep, setBookingStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch appointment types when component mounts
    fetchAppointmentTypes();
  }, []);

  useEffect(() => {
    // Fetch appointments when date is selected
    if (selectedDate) {
      fetchAppointments(params.id, selectedDate);
    }
  }, [selectedDate, params.id]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedAppointment(null);
  };

  const handleAppointmentSelect = (appointment: UFPAppointment) => {
    setSelectedAppointment(appointment);
    setBookingStep('details');
  };

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBookingStep('confirm');
  };

  const handleConfirmBooking = async () => {
    if (!selectedAppointment || !selectedAppointmentType) return;

    // Create appointment request
    const appointmentRequest = {
      coach_id: params.id,
      client_id: "client-placeholder", // This would come from user auth in real implementation
      start_time: selectedAppointment.start_time,
      end_time: selectedAppointment.end_time,
      appointment_type_id: selectedAppointmentType,
      notes: notes,
    };

    const result = await createAppointment(appointmentRequest);
    
    if (result) {
      setSuccess(true);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Book UFP Trainer Session</h1>
        <p className="mt-2 text-slate-600">Trainer ID: {params.id}</p>

        {success ? (
          <div className="mt-8 rounded-md border border-green-200 bg-green-50 p-6">
            <h2 className="text-2xl font-bold text-green-800">Booking Confirmed!</h2>
            <p className="mt-2 text-green-700">
              Your fitness session has been successfully booked.
            </p>
            <button
              onClick={() => window.location.href = '/services/ufp'}
              className="mt-4 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
            >
              Back to Trainers
            </button>
          </div>
        ) : (
          <>
            {bookingStep === 'select' && (
              <div className="mt-8 space-y-6">
                <div className="rounded-md border bg-white p-6">
                  <h2 className="text-xl font-semibold">Select Date</h2>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-4 w-full rounded-md border px-3 py-2"
                  />
                </div>

                {selectedDate && (
                  <div className="rounded-md border bg-white p-6">
                    <h2 className="text-xl font-semibold">Available Time Slots</h2>
                    {isLoading ? (
                      <p className="mt-4 text-slate-600">Loading available slots...</p>
                    ) : error ? (
                      <p className="mt-4 text-red-600">{error}</p>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {appointments.map((appointment) => (
                          <button
                            key={appointment.id}
                            onClick={() => handleAppointmentSelect(appointment)}
                            className="w-full rounded-md border border-slate-200 p-4 text-left hover:border-emerald-500 hover:bg-emerald-50"
                          >
                            <div className="font-medium">
                              {new Date(appointment.start_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {' - '}
                              {new Date(appointment.end_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-sm text-slate-600">
                              Status: {appointment.status}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-slate-600">No available slots for this date.</p>
                    )}
                  </div>
                )}

                {appointmentTypes && appointmentTypes.length > 0 && (
                  <div className="rounded-md border bg-white p-6">
                    <h2 className="text-xl font-semibold">Session Type</h2>
                    <div className="mt-4 space-y-3">
                      {appointmentTypes.map((type) => (
                        <label
                          key={type.id}
                          className="flex cursor-pointer items-center space-x-3 rounded-md border p-4 hover:border-emerald-500"
                        >
                          <input
                            type="radio"
                            name="appointmentType"
                            value={type.id}
                            checked={selectedAppointmentType === type.id}
                            onChange={(e) => setSelectedAppointmentType(e.target.value)}
                            className="h-4 w-4 text-emerald-600"
                          />
                          <div>
                            <div className="font-medium">{type.name}</div>
                            <div className="text-sm text-slate-600">{type.description}</div>
                            <div className="text-sm font-medium text-emerald-700">
                              {type.duration} min - KES {type.price}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {bookingStep === 'details' && selectedAppointment && (
              <div className="mt-8 rounded-md border bg-white p-6">
                <h2 className="text-xl font-semibold">Booking Details</h2>
                
                <div className="mt-4 space-y-2 text-slate-600">
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(selectedAppointment.start_time).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong>{' '}
                    {new Date(selectedAppointment.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' - '}
                    {new Date(selectedAppointment.end_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="font-medium">Your Name</span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      className="mt-2 w-full rounded-md border px-3 py-2"
                    />
                  </label>

                  <label className="block">
                    <span className="font-medium">Notes (Optional)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-md border px-3 py-2"
                    />
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingStep('select')}
                      className="flex-1 rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {bookingStep === 'confirm' && selectedAppointment && (
              <div className="mt-8 rounded-md border bg-white p-6">
                <h2 className="text-xl font-semibold">Confirm Booking</h2>
                
                <div className="mt-4 space-y-2 text-slate-600">
                  <p><strong>Name:</strong> {clientName}</p>
                  <p>
                    <strong>Date:</strong>{' '}
                    {new Date(selectedAppointment.start_time).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong>{' '}
                    {new Date(selectedAppointment.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {notes && <p><strong>Notes:</strong> {notes}</p>}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setBookingStep('details')}
                    className="flex-1 rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={isLoading}
                    className="flex-1 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400"
                  >
                    {isLoading ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>

                {error && (
                  <p className="mt-4 text-sm font-medium text-red-700">{error}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
