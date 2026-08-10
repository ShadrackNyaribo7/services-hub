import "server-only";

import { createHash } from "node:crypto";
import axios from "axios";

type MpesaEnvironment = "sandbox" | "production";

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  shortcode: string;
  environment: MpesaEnvironment;
}

interface MpesaSTKPushResponse {
  success: true;
  checkoutRequestID: string;
  responseCode: string;
  responseDescription: string;
  merchantRequestID: string;
}

interface MpesaPaymentStatusResponse {
  success: true;
  responseCode: string;
  responseDescription: string;
  resultDesc: string;
  resultCode: string;
}

export class MpesaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MpesaConfigurationError";
  }
}

export class MpesaRequestError extends Error {
  constructor(
    message: string,
    readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "MpesaRequestError";
  }
}

const OAUTH_TIMEOUT_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 20_000;
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";
const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const CALLBACK_PATH = "/api/mpesa/callback";

function requiredConfig(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new MpesaConfigurationError(`${name} is not configured.`);
  }

  if (/placeholder|change.?me|example|your[-_ ]/i.test(normalized)) {
    throw new MpesaConfigurationError(`${name} contains a placeholder value.`);
  }

  return normalized;
}

function requiredResponseText(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MpesaRequestError(`M-Pesa returned an invalid ${name}.`);
  }
  return value.trim();
}

export function createMpesaAccountReference(bookingId: string) {
  const digest = createHash("sha256")
    .update(`services-hub:${bookingId}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `SH${digest}`;
}

export class MpesaService {
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  private getConfig(): MpesaConfig {
    const environment = process.env.MPESA_ENVIRONMENT?.trim();
    if (environment !== "sandbox" && environment !== "production") {
      throw new MpesaConfigurationError(
        "MPESA_ENVIRONMENT must be either sandbox or production.",
      );
    }

    const shortcode = requiredConfig(
      process.env.MPESA_SHORTCODE ?? "",
      "MPESA_SHORTCODE",
    );
    if (!/^\d{5,8}$/.test(shortcode)) {
      throw new MpesaConfigurationError(
        "MPESA_SHORTCODE must contain 5 to 8 digits.",
      );
    }

    return {
      consumerKey: requiredConfig(
        process.env.MPESA_CONSUMER_KEY ?? "",
        "MPESA_CONSUMER_KEY",
      ),
      consumerSecret: requiredConfig(
        process.env.MPESA_CONSUMER_SECRET ?? "",
        "MPESA_CONSUMER_SECRET",
      ),
      passKey: requiredConfig(process.env.MPESA_PASSKEY ?? "", "MPESA_PASSKEY"),
      shortcode,
      environment,
    };
  }

  private getBaseUrl(environment: MpesaEnvironment) {
    return environment === "production"
      ? PRODUCTION_BASE_URL
      : SANDBOX_BASE_URL;
  }

  private getCallbackUrl(environment: MpesaEnvironment) {
    const explicitCallback = process.env.MPESA_CALLBACK_URL?.trim();
    const publicBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    let callbackUrl: URL;

    try {
      if (environment === "production") {
        callbackUrl = new URL(
          requiredConfig(explicitCallback ?? "", "MPESA_CALLBACK_URL"),
        );
      } else {
        callbackUrl = explicitCallback
          ? new URL(explicitCallback)
          : new URL(
              CALLBACK_PATH,
              requiredConfig(publicBaseUrl ?? "", "NEXT_PUBLIC_API_URL"),
            );
      }
    } catch {
      throw new MpesaConfigurationError(
        environment === "production"
          ? "Configure MPESA_CALLBACK_URL as an absolute public HTTPS URL."
          : "Configure MPESA_CALLBACK_URL or NEXT_PUBLIC_API_URL as an absolute URL.",
      );
    }

    if (callbackUrl.pathname !== CALLBACK_PATH) {
      throw new MpesaConfigurationError(
        `The M-Pesa callback URL must use ${CALLBACK_PATH}.`,
      );
    }

    const hostname = callbackUrl.hostname.toLowerCase();
    if (
      environment === "production" &&
      (callbackUrl.protocol !== "https:" ||
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".example") ||
        /placeholder|your[-_]/i.test(hostname))
    ) {
      throw new MpesaConfigurationError(
        "Production M-Pesa callbacks require a real public HTTPS URL.",
      );
    }

    callbackUrl.search = "";
    callbackUrl.hash = "";
    return callbackUrl.toString();
  }

  private async getAccessToken(config: MpesaConfig) {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${config.consumerKey}:${config.consumerSecret}`,
    ).toString("base64");

    try {
      const response = await axios.get(
        `${this.getBaseUrl(config.environment)}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: OAUTH_TIMEOUT_MS,
        },
      );
      const token = requiredResponseText(
        response.data?.access_token,
        "access token",
      );
      const expiresIn = Number(response.data?.expires_in);
      if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new MpesaRequestError(
          "M-Pesa returned an invalid access-token lifetime.",
        );
      }

      this.accessToken = token;
      this.tokenExpiry = Date.now() + Math.max(expiresIn - 60, 0) * 1000;
      return token;
    } catch (error) {
      this.accessToken = null;
      this.tokenExpiry = 0;
      if (error instanceof MpesaRequestError) throw error;
      throw new MpesaRequestError("Failed to authenticate with M-Pesa.");
    }
  }

  private generateTimestamp(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
  }

  private generatePassword(config: MpesaConfig, timestamp: string) {
    return Buffer.from(
      `${config.shortcode}${config.passKey}${timestamp}`,
    ).toString("base64");
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    bookingId: string,
    accountReference = createMpesaAccountReference(bookingId),
  ): Promise<MpesaSTKPushResponse> {
    const config = this.getConfig();
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!this.validatePhoneNumber(formattedPhone)) {
      throw new MpesaRequestError("A valid Kenyan M-Pesa number is required.");
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 150_000) {
      throw new MpesaRequestError(
        "The M-Pesa amount is outside the supported range.",
      );
    }
    if (!/^[A-Z0-9]{1,12}$/.test(accountReference)) {
      throw new MpesaRequestError(
        "The M-Pesa account reference must contain at most 12 letters or digits.",
      );
    }

    const accessToken = await this.getAccessToken(config);
    const timestamp = this.generateTimestamp();
    const payload = {
      BusinessShortCode: config.shortcode,
      Password: this.generatePassword(config, timestamp),
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: config.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: this.getCallbackUrl(config.environment),
      AccountReference: accountReference,
      TransactionDesc: "ServiceHub",
    };

    try {
      const response = await axios.post(
        `${this.getBaseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: PAYMENT_TIMEOUT_MS,
        },
      );

      const responseCode = requiredResponseText(
        response.data?.ResponseCode,
        "STK response code",
      );
      if (responseCode !== "0") {
        throw new MpesaRequestError("M-Pesa rejected the STK push request.");
      }

      return {
        success: true,
        checkoutRequestID: requiredResponseText(
          response.data?.CheckoutRequestID,
          "checkout request ID",
        ),
        responseCode,
        responseDescription: requiredResponseText(
          response.data?.ResponseDescription,
          "response description",
        ),
        merchantRequestID: requiredResponseText(
          response.data?.MerchantRequestID,
          "merchant request ID",
        ),
      };
    } catch (error) {
      if (error instanceof MpesaRequestError) {
        if (error.message === "M-Pesa rejected the STK push request.") {
          throw error;
        }
        throw new MpesaRequestError(error.message, true);
      }
      const outcomeUnknown = axios.isAxiosError(error) && !error.response;
      throw new MpesaRequestError(
        outcomeUnknown
          ? "The M-Pesa request outcome is unknown after a network failure."
          : "M-Pesa rejected the STK push request.",
        outcomeUnknown,
      );
    }
  }

  async checkPaymentStatus(
    checkoutRequestID: string,
  ): Promise<MpesaPaymentStatusResponse> {
    if (!checkoutRequestID.trim() || checkoutRequestID.length > 128) {
      throw new MpesaRequestError("A valid checkout request ID is required.");
    }

    const config = this.getConfig();
    const accessToken = await this.getAccessToken(config);
    const timestamp = this.generateTimestamp();

    try {
      const response = await axios.post(
        `${this.getBaseUrl(config.environment)}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: config.shortcode,
          Password: this.generatePassword(config, timestamp),
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestID,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: PAYMENT_TIMEOUT_MS,
        },
      );

      return {
        success: true,
        responseCode: requiredResponseText(
          response.data?.ResponseCode,
          "status response code",
        ),
        responseDescription: requiredResponseText(
          response.data?.ResponseDescription,
          "status response description",
        ),
        resultDesc: requiredResponseText(
          response.data?.ResultDesc,
          "status result description",
        ),
        resultCode: String(response.data?.ResultCode ?? ""),
      };
    } catch (error) {
      if (error instanceof MpesaRequestError) throw error;
      throw new MpesaRequestError("Failed to check M-Pesa payment status.");
    }
  }

  formatPhoneNumber(phoneNumber: string) {
    const cleaned = phoneNumber.normalize("NFKC").replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("0")) return `254${cleaned.slice(1)}`;
    if (cleaned.startsWith("+254")) return cleaned.slice(1);
    return cleaned;
  }

  validatePhoneNumber(phoneNumber: string) {
    return /^254[17]\d{8}$/.test(this.formatPhoneNumber(phoneNumber));
  }

  resetTokenCacheForTests() {
    if (process.env.NODE_ENV !== "test") return;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
}

export const mpesaService = new MpesaService();
