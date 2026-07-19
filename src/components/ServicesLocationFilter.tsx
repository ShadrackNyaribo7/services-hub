"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveKenyaCounty } from "@/lib/location";

type ServicesLocationFilterProps = {
  availableCounties: string[];
  locationApiEnabled: boolean;
  providerCount: number;
  selectedCounty: string | null;
  totalProviderCount: number;
};

type LocationResolveResponse = {
  county?: string;
  error?: string;
};

function isLocationResolveResponse(
  value: unknown,
): value is LocationResolveResponse {
  return typeof value === "object" && value !== null;
}

async function resolveLocation(searchParams: URLSearchParams) {
  const response = await fetch(`/api/location/resolve?${searchParams}`);
  const data: unknown = await response.json();

  if (!isLocationResolveResponse(data)) {
    throw new Error("Location lookup failed.");
  }

  if (!response.ok || !data.county) {
    throw new Error(data.error || "No matching Kenya county found.");
  }

  return data.county;
}

export default function ServicesLocationFilter({
  availableCounties,
  locationApiEnabled,
  providerCount,
  selectedCounty,
  totalProviderCount,
}: ServicesLocationFilterProps) {
  const router = useRouter();
  const [locationInput, setLocationInput] = useState(selectedCounty ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const resultLabel = useMemo(() => {
    if (!selectedCounty) {
      return `${totalProviderCount} provider${
        totalProviderCount === 1 ? "" : "s"
      } available`;
    }

    return `${providerCount} provider${providerCount === 1 ? "" : "s"} in ${
      selectedCounty
    }`;
  }, [providerCount, selectedCounty, totalProviderCount]);

  function navigateToCounty(county: string | null) {
    const params = new URLSearchParams(window.location.search);

    if (county) {
      params.set("county", county);
    } else {
      params.delete("county");
    }

    const queryString = params.toString();
    router.push(queryString ? `/services?${queryString}` : "/services");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const requestedLocation = locationInput.trim();

    if (!requestedLocation) {
      navigateToCounty(null);
      return;
    }

    const localCounty = resolveKenyaCounty(requestedLocation);

    if (localCounty) {
      navigateToCounty(localCounty);
      return;
    }

    setIsResolving(true);

    try {
      const params = new URLSearchParams({ query: requestedLocation });
      const county = await resolveLocation(params);
      setLocationInput(county);
      navigateToCounty(county);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No matching Kenya county found.",
      );
    } finally {
      setIsResolving(false);
    }
  }

  function handleCountySelection(county: string) {
    setMessage(null);
    setLocationInput(county);
    navigateToCounty(county || null);
  }

  function handleClear() {
    setMessage(null);
    setLocationInput("");
    navigateToCounty(null);
  }

  function handleUseCurrentLocation() {
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage("Current location is not available in this browser.");
      return;
    }

    setIsResolving(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            lat: String(coords.latitude),
            lng: String(coords.longitude),
          });
          const county = await resolveLocation(params);
          setLocationInput(county);
          navigateToCounty(county);
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Current location could not be matched.",
          );
        } finally {
          setIsResolving(false);
        }
      },
      () => {
        setIsResolving(false);
        setMessage("Location permission was not granted.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }

  return (
    <div className="mt-8 rounded-md border border-slate-700 bg-slate-950/80 p-4 text-slate-100 shadow-lg sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <form onSubmit={handleSubmit} className="flex-1">
          <label htmlFor="provider-location" className="text-sm font-semibold">
            Location
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="provider-location"
              name="county"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              list="provider-location-options"
              placeholder="County, town, or area"
              className="min-h-[44px] flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-emerald-400"
            />
            <datalist id="provider-location-options">
              {availableCounties.map((county) => (
                <option key={county} value={county} />
              ))}
            </datalist>
            <button
              type="submit"
              disabled={isResolving}
              className="min-h-[44px] rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white disabled:bg-slate-600"
            >
              {isResolving ? "Finding..." : "Apply"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Available provider counties"
            value={selectedCounty ?? ""}
            onChange={(event) => handleCountySelection(event.target.value)}
            className="min-h-[44px] rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
          >
            <option value="">All locations</option>
            {availableCounties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>

          {locationApiEnabled && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isResolving}
              className="min-h-[44px] rounded-md border border-emerald-500 px-4 py-2 font-semibold text-emerald-200 disabled:border-slate-600 disabled:text-slate-400"
            >
              Use My Location
            </button>
          )}

          {selectedCounty && (
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[44px] rounded-md border border-slate-600 px-4 py-2 font-semibold text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p>{resultLabel}</p>
        {message && <p className="font-medium text-amber-300">{message}</p>}
      </div>
    </div>
  );
}
