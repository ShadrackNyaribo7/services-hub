"use client";

import { useEffect, useRef, useState } from "react";

type VerificationPurpose = "PROVIDER_APPLICATION" | "PROVIDER_SIGN_IN";
type VerificationState =
  | "idle"
  | "initiating"
  | "pending"
  | "verified"
  | "failed";

type VerificationResponse = {
  token?: string;
  status?: "PENDING" | "VERIFIED" | "FAILED" | "EXPIRED";
  message?: string;
  redirectTo?: string | null;
  error?: string;
};

export default function MpesaMobileVerification({
  phone,
  purpose,
  onVerified,
  onReset,
}: {
  phone: string;
  purpose: VerificationPurpose;
  onVerified: (token: string, redirectTo: string | null) => void;
  onReset?: () => void;
}) {
  const [state, setState] = useState<VerificationState>("idle");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previousPhone = useRef(phone);

  useEffect(() => {
    if (previousPhone.current === phone) return;
    previousPhone.current = phone;
    setState("idle");
    setToken("");
    setMessage("");
    setError("");
    onReset?.();
  }, [onReset, phone]);

  useEffect(() => {
    if (state !== "pending" || !token) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function checkStatus() {
      try {
        const response = await fetch("/api/mobile-verification/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });
        const result = (await response.json()) as VerificationResponse;
        if (cancelled) return;

        if (!response.ok) {
          setState("failed");
          setError(result.error || "Could not check M-Pesa verification.");
          return;
        }
        if (result.status === "VERIFIED") {
          setState("verified");
          setMessage(result.message || "Mobile number verified through M-Pesa.");
          onVerified(token, result.redirectTo ?? null);
          return;
        }
        if (result.status === "FAILED" || result.status === "EXPIRED") {
          setState("failed");
          setError(result.message || "Verification was not completed.");
          return;
        }

        setMessage(result.message || "Waiting for the M-Pesa confirmation.");
        timeoutId = setTimeout(checkStatus, 3_000);
      } catch {
        if (!cancelled) timeoutId = setTimeout(checkStatus, 5_000);
      }
    }

    timeoutId = setTimeout(checkStatus, 1_500);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onVerified, state, token]);

  async function startVerification() {
    setState("initiating");
    setMessage("");
    setError("");
    onReset?.();

    try {
      const response = await fetch("/api/mobile-verification/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose }),
      });
      const result = (await response.json()) as VerificationResponse;
      if (!response.ok || !result.token) {
        setState("failed");
        setError(result.error || "Could not start M-Pesa verification.");
        return;
      }

      setToken(result.token);
      setState("pending");
      setMessage(
        result.message ||
          "Approve the KES 1 M-Pesa prompt on the phone. Confirmation is automatic.",
      );
    } catch {
      setState("failed");
      setError("Could not connect to mobile verification. Try again.");
    }
  }

  return (
    <div aria-live="polite" className="space-y-3">
      <p className="text-sm text-slate-700">
        We will send an M-Pesa STK prompt for <strong>KES 1</strong>. Approving
        it with the phone&apos;s M-Pesa PIN verifies control of the number. No
        email address is needed.
      </p>

      {(state === "idle" || state === "failed") && (
        <button
          type="button"
          onClick={startVerification}
          className="min-h-[44px] rounded-md bg-slate-900 px-4 py-2 font-semibold text-white"
        >
          Verify with M-Pesa — KES 1
        </button>
      )}

      {state === "initiating" && (
        <p className="font-medium text-slate-700">Sending M-Pesa prompt…</p>
      )}
      {state === "pending" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Waiting for M-Pesa confirmation</p>
          <p className="mt-1">{message}</p>
          <p className="mt-1">Do not refresh this page while confirming.</p>
        </div>
      )}
      {state === "verified" && (
        <p className="font-semibold text-emerald-800">✓ {message}</p>
      )}
      {error && <p className="font-medium text-red-700">{error}</p>}
    </div>
  );
}
