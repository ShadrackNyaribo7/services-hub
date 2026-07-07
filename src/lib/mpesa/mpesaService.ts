// MPesa Daraja API Integration Service
import axios from 'axios';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  shortcode: string;
  environment: 'sandbox' | 'production';
}

class MpesaService {
  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      passKey: process.env.MPESA_PASSKEY || '',
      shortcode: process.env.MPESA_SHORTCODE || '',
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    if (!this.config.consumerKey || !this.config.consumerSecret) {
      console.warn('MPesa credentials not configured. Payment features will be limited.');
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`
      ).toString('base64');

      const response = await axios.get(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 minute before expiry

      if (!this.accessToken) {
        throw new Error('Failed to obtain access token from MPesa');
      }

      return this.accessToken;
    } catch (error) {
      console.error('Error getting MPesa access token:', error);
      throw new Error('Failed to authenticate with MPesa');
    }
  }

  private generateTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const password = Buffer.from(
      `${this.config.shortcode}${this.config.passKey}${timestamp}`
    ).toString('base64');

    return password;
  }

  async initiateSTKPush(phoneNumber: string, amount: number, bookingId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      // Format phone number (ensure it starts with 254)
      const formattedPhone = phoneNumber.startsWith('0')
        ? `254${phoneNumber.substring(1)}`
        : phoneNumber.startsWith('+254')
        ? phoneNumber.substring(1)
        : phoneNumber;

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.config.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.NEXT_PUBLIC_API_URL}/api/mpesa/callback`,
        AccountReference: `BOOKING-${bookingId}`,
        TransactionDesc: `Payment for booking ${bookingId}`,
      };

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        merchantRequestID: response.data.MerchantRequestID,
      };
    } catch (error) {
      console.error('Error initiating STK push:', error);
      throw new Error('Failed to initiate MPesa payment');
    }
  }

  async checkPaymentStatus(checkoutRequestID: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        resultDesc: response.data.ResultDesc,
        resultCode: response.data.ResultCode,
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error('Failed to check payment status');
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Convert to international format
    if (cleaned.startsWith('0')) {
      cleaned = `254${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = this.formatPhoneNumber(phoneNumber);
    // Kenyan phone numbers: 254 followed by valid mobile prefix (7, 1, or 5) and 8 more digits
    // Safaricom: 2547XXXXXXXX, Telkom: 2541XXXXXXXX, Airtel: 2545XXXXXXXX
    return /^254[715][0-9]{8}$/.test(cleaned);
  }
}

// Export singleton instance
export const mpesaService = new MpesaService();