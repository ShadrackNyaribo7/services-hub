"use client";

import { useEffect, useState } from "react";
import { useUfpBooking } from "@/hooks/useUfpBooking";
import { UFPCoach } from "@/types";
import Link from "next/link";

export default function UFPTrainersPage() {
  const { coaches, isLoading, error, fetchCoaches } = useUfpBooking();
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  useEffect(() => {
    // Fetch coaches when component mounts
    fetchCoaches(selectedTenant || undefined);
  }, [selectedTenant]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">UFP Fitness Trainers</h1>
          <p className="mt-2 text-slate-600">
            Book professional fitness trainers through our Unified Fitness Platform integration
          </p>
        </div>

        <div className="mb-6 rounded-md border bg-white p-4">
          <label className="block">
            <span className="font-medium">Filter by Tenant/Location (Optional)</span>
            <input
              type="text"
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              placeholder="Enter tenant ID"
              className="mt-2 w-full rounded-md border px-3 py-2"
            />
          </label>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-slate-600">Loading trainers...</div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">Error: {error}</p>
          </div>
        )}

        {!isLoading && !error && coaches && coaches.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {coaches.map((coach: UFPCoach) => (
              <div key={coach.id} className="rounded-md border bg-white p-5">
                <h2 className="text-xl font-semibold">
                  {coach.first_name} {coach.last_name}
                </h2>
                <p className="text-slate-600">{coach.email}</p>
                <p className="text-slate-600">{coach.phone}</p>
                
                {coach.specializations && coach.specializations.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm font-medium">Specializations:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {coach.specializations.map((spec, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      coach.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {coach.status}
                  </span>
                </div>

                <Link
                  href={`/services/ufp/book/${coach.id}`}
                  className="mt-4 inline-block rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  Book Session
                </Link>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && (!coaches || coaches.length === 0) && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-lg text-slate-600">No trainers available at the moment.</p>
            <p className="mt-2 text-sm text-slate-500">
              Please check back later or contact support.
            </p>
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <Link
            href="/services"
            className="inline-block rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to All Services
          </Link>
        </div>
      </section>
    </main>
  );
}
