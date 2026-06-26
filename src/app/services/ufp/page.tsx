"use client";

import { useEffect, useState } from "react";
import { useUfpBooking } from "@/hooks/useUfpBooking";
import { UFPCoach, UFPTenant, UFPTenantWithCoaches } from "@/types";
import Link from "next/link";

export default function UFPTrainersPage() {
  const { coaches, isLoading, error, fetchCoaches } = useUfpBooking();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [viewAllLocales, setViewAllLocales] = useState<boolean>(false);
  const [tenants, setTenants] = useState<UFPTenant[]>([]);
  const [tenantsWithCoaches, setTenantsWithCoaches] = useState<UFPTenantWithCoaches[]>([]);
  const [loadingTenants, setLoadingTenants] = useState<boolean>(false);
  const [loadingAllCoaches, setLoadingAllCoaches] = useState<boolean>(false);

  // Fetch available tenants on mount
  useEffect(() => {
    const fetchTenants = async () => {
      setLoadingTenants(true);
      try {
        const response = await fetch('/api/ufp/tenants');
        const data = await response.json();
        if (data.success) {
          setTenants(data.data);
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
      } finally {
        setLoadingTenants(false);
      }
    };

    fetchTenants();
  }, []);

  // Fetch coaches when component mounts or when tenant selection changes
  useEffect(() => {
    if (viewAllLocales) {
      fetchAllCoachesAcrossTenants();
    } else {
      fetchCoaches(selectedTenant || undefined);
    }
  }, [selectedTenant, viewAllLocales]);

  const fetchAllCoachesAcrossTenants = async () => {
    setLoadingAllCoaches(true);
    try {
      const response = await fetch('/api/ufp/trainers/all?groupByTenant=true');
      const data = await response.json();
      if (data.success) {
        setTenantsWithCoaches(data.data);
      }
    } catch (error) {
      console.error('Error fetching all coaches:', error);
    } finally {
      setLoadingAllCoaches(false);
    }
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setViewAllLocales(false);
  };

  const handleViewAllLocales = () => {
    setViewAllLocales(true);
    setSelectedTenant("");
  };

  const handleSingleLocaleView = () => {
    setViewAllLocales(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">UFP Fitness Trainers</h1>
          <p className="mt-2 text-slate-600">
            Book professional fitness trainers through our Unified Fitness Platform integration
          </p>
        </div>

        {/* Locale Selection */}
        <div className="mb-6 rounded-md border bg-white p-4">
          <div className="mb-4">
            <span className="font-medium">View Options:</span>
            <div className="mt-2 flex gap-4">
              <button
                onClick={handleSingleLocaleView}
                className={`rounded-md px-4 py-2 font-medium ${
                  !viewAllLocales
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Single Locale
              </button>
              <button
                onClick={handleViewAllLocales}
                className={`rounded-md px-4 py-2 font-medium ${
                  viewAllLocales
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Locales
              </button>
            </div>
          </div>

          {!viewAllLocales && (
            <div>
              <label className="block">
                <span className="font-medium">Select Locale/Location:</span>
                {loadingTenants ? (
                  <div className="mt-2 text-sm text-slate-600">Loading locales...</div>
                ) : tenants.length > 0 ? (
                  <select
                    value={selectedTenant}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    className="mt-2 w-full rounded-md border px-3 py-2"
                  >
                    <option value="">All Available Trainers</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.locale})
                        {tenant.country && ` - ${tenant.country}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={selectedTenant}
                      onChange={(e) => setSelectedTenant(e.target.value)}
                      placeholder="Enter tenant ID manually"
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                )}
              </label>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-slate-600">Loading trainers...</div>
          </div>
        )}

        {loadingAllCoaches && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-slate-600">Loading trainers from all locales...</div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-700">Error: {error}</p>
          </div>
        )}

        {/* Single Locale View */}
        {!viewAllLocales && !isLoading && !error && coaches && coaches.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {coaches.map((coach: UFPCoach) => (
              <div key={coach.id} className="rounded-md border bg-white p-5">
                <h2 className="text-xl font-semibold">
                  {coach.first_name} {coach.last_name}
                </h2>
                <p className="text-slate-600">{coach.email}</p>
                <p className="text-slate-600">{coach.phone}</p>
                
                {coach.locale && (
                  <p className="mt-2 text-sm text-slate-500">
                    📍 {coach.locale}
                  </p>
                )}
                
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

        {/* All Locales View */}
        {viewAllLocales && !loadingAllCoaches && !error && tenantsWithCoaches.length > 0 && (
          <div className="space-y-8">
            {tenantsWithCoaches.map((tenant) => (
              <div key={tenant.id} className="rounded-md border bg-white p-6">
                <div className="mb-4 border-b pb-4">
                  <h2 className="text-2xl font-bold text-emerald-700">
                    {tenant.name}
                  </h2>
                  <p className="text-slate-600">
                    {tenant.locale} {tenant.country && `• ${tenant.country}`}
                    {tenant.region && `• ${tenant.region}`}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      tenant.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>

                {tenant.coaches.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {tenant.coaches.map((coach) => (
                      <div key={coach.id} className="rounded-md border bg-slate-50 p-4">
                        <h3 className="text-lg font-semibold">
                          {coach.first_name} {coach.last_name}
                        </h3>
                        <p className="text-sm text-slate-600">{coach.email}</p>
                        <p className="text-sm text-slate-600">{coach.phone}</p>
                        
                        {coach.specializations && coach.specializations.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium">Specializations:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {coach.specializations.map((spec, index) => (
                                <span
                                  key={index}
                                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
                          className="mt-3 inline-block rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          Book Session
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-sm text-slate-600">No trainers available in this locale.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !loadingAllCoaches && !error && (!coaches || coaches.length === 0) && !viewAllLocales && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-lg text-slate-600">No trainers available at the moment.</p>
            <p className="mt-2 text-sm text-slate-500">
              Please check back later or contact support.
            </p>
          </div>
        )}

        {!loadingAllCoaches && !error && viewAllLocales && tenantsWithCoaches.length === 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-lg text-slate-600">No trainers available across any locale.</p>
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
