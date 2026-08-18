"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MINIMUM_PRICE_KES = 500;
const MAXIMUM_PRICE_KES = 150_000;
const MAXIMUM_SERVICES = 12;

type ProviderServiceInput = {
  id: string;
  name: string;
  priceKes: string;
};

type ProviderServicesFormProps = {
  initialServices: Array<{
    id: string;
    name: string;
    priceKes: number;
  }>;
  confirmedAt: string | null;
};

function newService(id: number): ProviderServiceInput {
  return { id: `new-service-${id}`, name: "", priceKes: "" };
}

function formatConfirmedAt(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ProviderServicesForm({
  initialServices,
  confirmedAt,
}: ProviderServicesFormProps) {
  const router = useRouter();
  const nextId = useRef(initialServices.length + 1);
  const [services, setServices] = useState<ProviderServiceInput[]>(() =>
    initialServices.length > 0
      ? initialServices.map((service) => ({
          ...service,
          priceKes: String(service.priceKes),
        }))
      : [newService(0)],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateService(
    id: string,
    field: "name" | "priceKes",
    value: string,
  ) {
    setServices((current) =>
      current.map((service) =>
        service.id === id ? { ...service, [field]: value } : service,
      ),
    );
    setError(null);
    setSuccess(null);
  }

  function addService() {
    if (services.length >= MAXIMUM_SERVICES) return;
    const id = nextId.current;
    nextId.current += 1;
    setServices((current) => [...current, newService(id)]);
    setError(null);
    setSuccess(null);
  }

  function removeService(id: string) {
    if (services.length === 1) return;
    setServices((current) => current.filter((service) => service.id !== id));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/provider-services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: services.map(({ name, priceKes }) => ({
            name,
            priceKes: Number(priceKes),
          })),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Could not confirm your services.");
        return;
      }

      setSuccess(result.message ?? "Your services and prices are confirmed.");
      router.refresh();
    } catch {
      setError("Could not reach the service. Check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="services-heading"
      className={`mt-6 overflow-hidden rounded-xl border ${
        confirmedAt
          ? "border-slate-700 bg-slate-900"
          : "border-emerald-400/50 bg-emerald-950/30 shadow-lg shadow-emerald-950/30"
      }`}
    >
      <div className="border-b border-slate-700 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              {confirmedAt ? "Service menu" : "Required next step"}
            </p>
            <h2
              id="services-heading"
              className="mt-2 text-xl font-bold text-white sm:text-2xl"
            >
              {confirmedAt
                ? "Your services and prices"
                : "Set the services clients can book"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Add each specific service you offer and its full price in Kenyan
              shillings. Clients will see these exact prices when they book.
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
              confirmedAt
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/40 bg-amber-400/10 text-amber-200"
            }`}
          >
            {confirmedAt ? "Confirmed" : "Action required"}
          </span>
        </div>

        {confirmedAt && (
          <p className="mt-3 text-xs text-slate-400">
            Last confirmed {formatConfirmedAt(confirmedAt)}. You can update and
            reconfirm this menu at any time.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        <div className="space-y-3">
          {services.map((service, index) => (
            <fieldset
              key={service.id}
              className="rounded-lg border border-slate-700 bg-slate-950/70 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-emerald-300">
                Service {index + 1}
              </legend>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Specific service
                  </span>
                  <input
                    value={service.name}
                    onChange={(event) =>
                      updateService(service.id, "name", event.target.value)
                    }
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="e.g. Sofa deep cleaning"
                    className="mt-2 min-h-[44px] w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-200">
                    Price (KES)
                  </span>
                  <input
                    type="number"
                    value={service.priceKes}
                    onChange={(event) =>
                      updateService(service.id, "priceKes", event.target.value)
                    }
                    required
                    min={MINIMUM_PRICE_KES}
                    max={MAXIMUM_PRICE_KES}
                    step={1}
                    inputMode="numeric"
                    placeholder="2500"
                    className="mt-2 min-h-[44px] w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  disabled={services.length === 1}
                  aria-label={`Remove service ${index + 1}`}
                  className="min-h-[44px] rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 sm:mb-0"
                >
                  Remove
                </button>
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-700 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addService}
            disabled={services.length >= MAXIMUM_SERVICES}
            className="min-h-[44px] rounded-md border border-slate-600 px-4 py-2 font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add another service
          </button>
          <p className="text-xs text-slate-400">
            KES {MINIMUM_PRICE_KES.toLocaleString("en-KE")}–
            {MAXIMUM_PRICE_KES.toLocaleString("en-KE")} per service · up to {MAXIMUM_SERVICES}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-slate-300">
          By confirming, you agree that these are the prices clients will pay
          through M-Pesa. Update and reconfirm whenever your menu changes.
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[48px] w-full rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:bg-slate-600"
        >
          {isSubmitting
            ? "Confirming..."
            : confirmedAt
              ? "Update and confirm services"
              : "Confirm services and prices"}
        </button>

        {success && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-200"
          >
            {success}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm font-medium text-red-200"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
