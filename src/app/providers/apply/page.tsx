"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { FormEvent, useCallback, useEffect, useState } from "react";
import MpesaMobileVerification from "@/components/MpesaMobileVerification";
import { useProviderApplication } from "@/hooks/useProviderApplication";

export default function ProviderApplyPage() {
  return (
    <ClerkProvider>
      <ProviderApplicationForm />
    </ClerkProvider>
  );
}

function ProviderApplicationForm() {
  const { isLoaded: isUserLoaded, isSignedIn } = useAuth();
  const { submitApplication, isLoading, error, success, message } =
    useProviderApplication();
  const [serviceCategory, setServiceCategory] = useState("Cleaning");
  const [phone, setPhone] = useState("");
  const [verifyMobileChoice, setVerifyMobileChoice] = useState(true);
  const [mobileVerificationToken, setMobileVerificationToken] = useState("");
  const [mobileSessionVerified, setMobileSessionVerified] = useState(false);
  const [mobileVerificationError, setMobileVerificationError] = useState<
    string | null
  >(null);
  const credentialRequired = serviceCategory !== "Cleaning" && serviceCategory !== "Interior Decorator";
  const mobileVerificationRequired = isUserLoaded && !isSignedIn;
  const verifyMobile = mobileVerificationRequired || verifyMobileChoice;
  const hasMobileVerification =
    Boolean(mobileVerificationToken) || mobileSessionVerified;

  const resetMobileVerification = useCallback(() => {
    setMobileVerificationToken("");
    setMobileSessionVerified(false);
    setMobileVerificationError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMobileSession() {
      try {
        const response = await fetch("/api/provider-mobile-session", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          authenticated?: boolean;
          phone?: string;
          currentVerification?: boolean;
        };
        if (
          !cancelled &&
          response.ok &&
          result.authenticated &&
          result.currentVerification &&
          result.phone
        ) {
          setPhone(result.phone);
          setVerifyMobileChoice(true);
          setMobileSessionVerified(true);
        }
      } catch {
        // A missing mobile session is normal for Clerk-authenticated users.
      }
    }

    void loadMobileSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMobileVerified = useCallback((token: string) => {
    setMobileVerificationToken(token);
    setMobileSessionVerified(true);
    setMobileVerificationError(null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((verifyMobile || !isSignedIn) && !hasMobileVerification) {
      setMobileVerificationError(
        "Complete M-Pesa mobile verification before submitting without an email account.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);

    const application = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string,
      county: formData.get("county") as string,
      serviceCategory: formData.get("serviceCategory") as string,
      policeClearanceNumber: formData.get("policeClearanceNumber") as string,
      policeClearanceName: formData.get("policeClearanceName") as string,
      idNumber: formData.get("idNumber") as string,
      identityDocumentName: formData.get("identityDocumentName") as string,
      certificationNumber: formData.get("certificationNumber") as string,
      certificationHolderName: formData.get(
        "certificationHolderName",
      ) as string,
      certificationIssuer: formData.get("certificationIssuer") as string,
      certificationName: formData.get("certificationName") as string,
      verificationConsent: formData.get("verificationConsent") === "yes",
      phoneVerificationRequested: hasMobileVerification,
      phoneVerificationToken: mobileVerificationToken || undefined,
    };

    const result = await submitApplication(application);

    if (result) {
      event.currentTarget.reset();
      setServiceCategory("Cleaning");
      setPhone("");
      setVerifyMobileChoice(true);
      resetMobileVerification();
      // Success message will be handled by the success state
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-950 sm:px-6">
      <section className="relative z-10 mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-emerald-400 sm:text-3xl">
          Provider Application
        </h1>
        <p className="mt-2 font-bold text-emerald-400">
          Submit your details for review before offering services.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-md border bg-white p-4 sm:p-6"
        >
          <label className="block">
            <span className="font-medium text-emerald-400">Full name</span>
            <input
              name="fullName"
              required
              className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Phone number</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="07XXXXXXXX"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                resetMobileVerification();
              }}
              className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
            />
          </label>

          <fieldset className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={verifyMobile}
                disabled={mobileVerificationRequired}
                onChange={(event) => {
                  setVerifyMobileChoice(event.target.checked);
                  resetMobileVerification();
                }}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                <span className="block font-semibold text-slate-950">
                  Verify mobile number with M-Pesa
                </span>
                {mobileVerificationRequired
                  ? "Required when applying without an email account."
                  : "Optional because you are already signed in."}
              </span>
            </label>

            {verifyMobile && (
              <div className="mt-4 border-t border-emerald-200 pt-4">
                {mobileSessionVerified && !mobileVerificationToken ? (
                  <p className="font-semibold text-emerald-800">
                    ✓ Mobile number verified through your current M-Pesa
                    session.
                  </p>
                ) : (
                  <MpesaMobileVerification
                    phone={phone}
                    purpose="PROVIDER_APPLICATION"
                    onVerified={handleMobileVerified}
                    onReset={resetMobileVerification}
                  />
                )}
                {mobileVerificationError && (
                  <p className="mt-3 font-medium text-red-700">
                    {mobileVerificationError}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <label className="block">
            <span className="font-medium text-emerald-400">County</span>
            <input
              name="county"
              required
              placeholder="Nairobi, Mombasa, Kisumu..."
              className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">Service</span>
            <select
              name="serviceCategory"
              required
              value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-md border bg-white px-3 py-2 text-slate-950"
            >
              <option value="Cleaning">Cleaning</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumber">Plumber</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Driver">Driver</option>
              <option value="Mason">Mason</option>
              <option value="Glazier">Glazier</option>
              <option value="Gardener">Gardener</option>
              <option value="Interior Decorator">Interior Decorator</option>
              <option value="Painter">Painter</option>
              <option value="Internet Service Installer">
                Internet Service Installer
              </option>
            </select>
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">ID number</span>
            <input
              name="idNumber"
              required
              inputMode="numeric"
              pattern="[0-9]{7,10}"
              minLength={7}
              maxLength={10}
              autoComplete="off"
              className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Full name exactly as printed on ID
            </span>
            <input
              name="identityDocumentName"
              required
              minLength={5}
              maxLength={120}
              autoComplete="off"
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Police Clearance Certificate number
            </span>
            <input
              name="policeClearanceNumber"
              required
              minLength={5}
              maxLength={64}
              pattern="[A-Za-z0-9][A-Za-z0-9/-]{4,63}"
              autoComplete="off"
              className="mt-2 w-full rounded-md border px-3 py-2 min-h-[44px]"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Full name exactly as printed on Police Clearance Certificate
            </span>
            <input
              name="policeClearanceName"
              required
              minLength={5}
              maxLength={120}
              autoComplete="off"
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Professional certificate/license number
            </span>
            <input
              name="certificationNumber"
              required={credentialRequired}
              maxLength={64}
              placeholder={
                serviceCategory === "Electrical" ? "EPRA/EW/12345" : undefined
              }
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
            <span className="mt-1 block text-sm text-slate-600">
              Electrical providers must use their EPRA electrical-worker licence
              number.
            </span>
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Full name exactly as printed on the credential
            </span>
            <input
              name="certificationHolderName"
              required={credentialRequired}
              minLength={5}
              maxLength={120}
              autoComplete="off"
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Issuing institution or regulator
            </span>
            <input
              name="certificationIssuer"
              required={credentialRequired}
              maxLength={160}
              list="credential-issuers"
              placeholder="EPRA, NITA, KNEC, TVET CDACC..."
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
            <datalist id="credential-issuers">
              <option value="Energy and Petroleum Regulatory Authority" />
              <option value="National Industrial Training Authority" />
              <option value="Kenya National Examinations Council" />
              <option value="TVET Curriculum Development Assessment and Certification Council" />
              <option value="National Construction Authority" />
              <option value="National Transport and Safety Authority" />
            </datalist>
          </label>

          <label className="block">
            <span className="font-medium text-emerald-400">
              Exact qualification or licence name
            </span>
            <input
              name="certificationName"
              required={credentialRequired}
              maxLength={160}
              placeholder={
                serviceCategory === "Electrical"
                  ? "Electrical Worker Licence"
                  : "As printed on the certificate"
              }
              className="mt-2 min-h-[44px] w-full rounded-md border px-3 py-2"
            />
          </label>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="verificationConsent"
              value="yes"
              required
              className="mt-1 size-4 shrink-0"
            />
            <span>
              I attest that every identifier and printed name above exactly
              matches the original document. I consent to secure storage,
              offline consistency checks, tamper-evident audit sealing, and
              automatic policy evaluation.
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:bg-slate-400"
          >
            {isLoading ? "Submitting..." : "Submit Application"}
          </button>

          {success && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-emerald-700"
            >
              {message ??
                "Application submitted successfully. Await admin review."}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
