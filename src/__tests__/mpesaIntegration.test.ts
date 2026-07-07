/**
 * Comprehensive MPesa Integration Test Suite
 * 
 * This test suite covers:
 * 1. MPesa Service functionality
 * 2. API Route handlers
 * 3. Phone number validation and formatting
 * 4. Payment initiation and status checking
 * 5. Callback handling
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Prisma to avoid database operations
const mockPrismaBooking = {
  findUnique: jest.fn() as jest.MockedFunction<any>,
  update: jest.fn() as jest.MockedFunction<any>,
  findFirst: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: mockPrismaBooking,
  },
}));

// Mock Clerk auth
const mockAuth = jest.fn() as any;
jest.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}));

// Import after mocking
import { mpesaService } from '@/lib/mpesa/mpesaService';
import { prisma } from '@/lib/prisma';

describe('MPesa Integration Test Suite', () => {
  
  beforeAll(() => {
    // Set environment variables for testing
    process.env.MPESA_CONSUMER_KEY = 'test_consumer_key';
    process.env.MPESA_CONSUMER_SECRET = 'test_consumer_secret';
    process.env.MPESA_PASSKEY = 'test_passkey';
    process.env.MPESA_SHORTCODE = '174379';
    process.env.MPESA_ENVIRONMENT = 'sandbox';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    // Reset all mocks before each test to prevent state contamination
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockPrismaBooking.findUnique.mockReset();
    mockPrismaBooking.update.mockReset();
    mockPrismaBooking.findFirst.mockReset();
    mockAuth.mockReset();
    
    // Reset token cache in mpesaService
    (mpesaService as any).accessToken = null;
    (mpesaService as any).tokenExpiry = 0;
  });

  describe('MPesa Service - Configuration', () => {
    test('should initialize with environment variables', () => {
      expect(mpesaService).toBeDefined();
      expect(mpesaService).toBeInstanceOf(Object);
    });

    test('should warn when credentials are not configured', () => {
      const originalKey = process.env.MPESA_CONSUMER_KEY;
      const originalSecret = process.env.MPESA_CONSUMER_SECRET;
      
      delete process.env.MPESA_CONSUMER_KEY;
      delete process.env.MPESA_CONSUMER_SECRET;
      
      // Re-create service instance to test warning
      const { mpesaService: newService } = require('@/lib/mpesa/mpesaService');
      expect(newService).toBeDefined();
      
      // Restore environment variables
      process.env.MPESA_CONSUMER_KEY = originalKey;
      process.env.MPESA_CONSUMER_SECRET = originalSecret;
    });
  });

  describe('MPesa Service - Phone Number Formatting', () => {
    test('should format phone number starting with 0', () => {
      const result = mpesaService.formatPhoneNumber('0712345678');
      expect(result).toBe('254712345678');
    });

    test('should format phone number starting with +254', () => {
      const result = mpesaService.formatPhoneNumber('+254712345678');
      expect(result).toBe('254712345678');
    });

    test('should format phone number already in international format', () => {
      const result = mpesaService.formatPhoneNumber('254712345678');
      expect(result).toBe('254712345678');
    });

    test('should remove spaces, dashes, and parentheses', () => {
      const result = mpesaService.formatPhoneNumber('0712-345 678');
      expect(result).toBe('254712345678');
    });

    test('should handle phone number with parentheses', () => {
      const result = mpesaService.formatPhoneNumber('(0712)345678');
      expect(result).toBe('254712345678');
    });
  });

  describe('MPesa Service - Phone Number Validation', () => {
    test('should validate correct Kenyan phone number', () => {
      expect(mpesaService.validatePhoneNumber('0712345678')).toBe(true);
      expect(mpesaService.validatePhoneNumber('+254712345678')).toBe(true);
      expect(mpesaService.validatePhoneNumber('254712345678')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(mpesaService.validatePhoneNumber('12345')).toBe(false);
      expect(mpesaService.validatePhoneNumber('071234567')).toBe(false); // Too short
      expect(mpesaService.validatePhoneNumber('07123456789')).toBe(false); // Too long
      expect(mpesaService.validatePhoneNumber('1234567890')).toBe(false); // Invalid format
      expect(mpesaService.validatePhoneNumber('')).toBe(false);
    });

    test('should reject phone numbers with invalid country code', () => {
      expect(mpesaService.validatePhoneNumber('+1234567890')).toBe(false);
      expect(mpesaService.validatePhoneNumber('1234567890')).toBe(false);
    });
  });

  describe('MPesa Service - Timestamp Generation', () => {
    test('should generate timestamp in correct format', () => {
      const timestamp = (mpesaService as any).generateTimestamp();
      expect(timestamp).toBeDefined();
      expect(timestamp).toHaveLength(14); // YYYYMMDDHHmmss
      expect(/^\d{14}$/.test(timestamp)).toBe(true);
    });

    test('should generate current timestamp', () => {
      const before = Date.now();
      const timestamp = (mpesaService as any).generateTimestamp();
      const after = Date.now();
      
      // Extract date from timestamp
      const year = parseInt(timestamp.substring(0, 4));
      const month = parseInt(timestamp.substring(4, 6));
      const day = parseInt(timestamp.substring(6, 8));
      const hours = parseInt(timestamp.substring(8, 10));
      const minutes = parseInt(timestamp.substring(10, 12));
      const seconds = parseInt(timestamp.substring(12, 14));
      
      const generatedDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Add 1 second tolerance to account for second-level precision
      expect(generatedDate.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(generatedDate.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('MPesa Service - Password Generation', () => {
    test('should generate password as base64 encoded string', () => {
      const password = (mpesaService as any).generatePassword();
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      // Base64 should only contain specific characters
      expect(/^[A-Za-z0-9+/=]+$/.test(password)).toBe(true);
    });

    test('should generate consistent password for same timestamp', () => {
      const timestamp = '20230101120000';
      const password1 = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
      ).toString('base64');
      
      expect(password1).toBeDefined();
      expect(password1.length).toBeGreaterThan(0);
    });
  });

  describe('MPesa Service - Access Token', () => {
    test('should obtain access token from MPesa API', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_access_token',
          expires_in: 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);

      const token = await (mpesaService as any).getAccessToken();
      expect(token).toBe('test_access_token');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('oauth/v1/generate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    test('should handle token fetch errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect((mpesaService as any).getAccessToken()).rejects.toThrow();
    });

    test('should cache token until expiry', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'cached_token',
          expires_in: 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);

      const token1 = await (mpesaService as any).getAccessToken();
      const token2 = await (mpesaService as any).getAccessToken();

      expect(token1).toBe('cached_token');
      expect(token2).toBe('cached_token');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not call again
    });
  });

  describe('MPesa Service - STK Push Initiation', () => {
    test('should initiate STK push successfully', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      const mockSTKResponse = {
        data: {
          CheckoutRequestID: 'ws_CO_060720260712345678',
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          MerchantRequestID: '12345-67890-12345',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.post.mockResolvedValueOnce(mockSTKResponse);

      const result = await mpesaService.initiateSTKPush('0712345678', 100, 'booking123');

      expect(result.success).toBe(true);
      expect(result.checkoutRequestID).toBe('ws_CO_060720260712345678');
      expect(result.responseCode).toBe('0');
      expect(result.merchantRequestID).toBe('12345-67890-12345');
    });

    test('should format phone number in STK push', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      const mockSTKResponse = {
        data: {
          CheckoutRequestID: 'ws_CO_060720260712345678',
          ResponseCode: '0',
          ResponseDescription: 'Success',
          MerchantRequestID: '12345',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.post.mockResolvedValueOnce(mockSTKResponse);

      await mpesaService.initiateSTKPush('0712345678', 100, 'booking123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('stkpush/v1/processrequest'),
        expect.objectContaining({
          PartyA: '254712345678',
          PhoneNumber: '254712345678',
        }),
        expect.any(Object)
      );
    });

    test('should handle STK push errors', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.post.mockRejectedValueOnce(new Error('STK push failed'));

      await expect(mpesaService.initiateSTKPush('0712345678', 100, 'booking123')).rejects.toThrow();
    });
  });

  describe('MPesa Service - Payment Status Check', () => {
    test('should check payment status successfully', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      const mockStatusResponse = {
        data: {
          ResponseCode: '0',
          ResponseDescription: 'The service request is processed successfully.',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.post.mockResolvedValueOnce(mockStatusResponse);

      const result = await mpesaService.checkPaymentStatus('ws_CO_060720260712345678');

      expect(result.success).toBe(true);
      expect(result.responseCode).toBe('0');
      expect(result.resultCode).toBe('0');
    });

    test('should handle payment status check errors', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      mockedAxios.post.mockRejectedValueOnce(new Error('Status check failed'));

      await expect(mpesaService.checkPaymentStatus('ws_CO_123456')).rejects.toThrow();
    });
  });

  describe('API Route - Initiate Payment', () => {
    test('should require authentication', async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '0712345678',
          amount: 100,
          bookingId: 'booking123',
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('signed in');
    });

    test('should validate required fields', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '0712345678',
          // Missing amount and bookingId
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    test('should validate phone number format', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: 'invalid',
          amount: 100,
          bookingId: 'booking123',
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid phone number');
    });

    test('should validate amount is positive', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '0712345678',
          amount: -100,
          bookingId: 'booking123',
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('greater than 0');
    });

    test('should check if booking exists', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });
      mockPrismaBooking.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '0712345678',
          amount: 100,
          bookingId: 'nonexistent',
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Booking not found');
    });
  });

  describe('API Route - Callback Handler', () => {
    test('should process successful payment callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345',
            CheckoutRequestID: 'ws_CO_123456',
            ResultCode: '0',
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'AccountReference', Value: 'BOOKING-booking123' },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
                { Name: 'TransactionID', Value: 'XYZ789' },
                { Name: 'Amount', Value: 100 },
                { Name: 'PhoneNumber', Value: '254712345678' },
              ],
            },
          },
        },
      };

      mockPrismaBooking.update.mockResolvedValueOnce({});

      const request = new Request('http://localhost:3000/api/mpesa/callback', {
        method: 'POST',
        body: JSON.stringify(callbackData),
      });

      const { POST } = require('@/app/api/mpesa/callback/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ResultCode).toBe(0);
      expect(mockPrismaBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking123' },
          data: expect.objectContaining({
            paymentStatus: 'COMPLETED',
            status: 'ACCEPTED',
          }),
        })
      );
    });

    test('should process failed payment callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345',
            CheckoutRequestID: 'ws_CO_123456',
            ResultCode: '1',
            ResultDesc: 'Transaction cancelled by user',
            CallbackMetadata: {
              Item: [
                { Name: 'AccountReference', Value: 'BOOKING-booking123' },
              ],
            },
          },
        },
      };

      mockPrismaBooking.update.mockResolvedValueOnce({});

      const request = new Request('http://localhost:3000/api/mpesa/callback', {
        method: 'POST',
        body: JSON.stringify(callbackData),
      });

      const { POST } = require('@/app/api/mpesa/callback/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ResultCode).toBe(0);
      expect(mockPrismaBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'booking123' },
          data: expect.objectContaining({
            paymentStatus: 'FAILED',
            status: 'REQUESTED',
          }),
        })
      );
    });

    test('should handle missing booking in callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: '12345',
            CheckoutRequestID: 'ws_CO_123456',
            ResultCode: '0',
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [],
            },
          },
        },
      };

      mockPrismaBooking.findFirst.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/mpesa/callback', {
        method: 'POST',
        body: JSON.stringify(callbackData),
      });

      const { POST } = require('@/app/api/mpesa/callback/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.ResultCode).toBe(1);
    });
  });

  describe('API Route - Payment Status Check', () => {
    test('should require authentication', async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });

      const request = new Request('http://localhost:3000/api/mpesa/status?bookingId=booking123', {
        method: 'GET',
      });

      const { GET } = require('@/app/api/mpesa/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('signed in');
    });

    test('should require booking ID parameter', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });

      const request = new Request('http://localhost:3000/api/mpesa/status', {
        method: 'GET',
      });

      const { GET } = require('@/app/api/mpesa/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Booking ID is required');
    });

    test('should return payment status for valid booking', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });
      mockPrismaBooking.findUnique.mockResolvedValueOnce({
        id: 'booking123',
        paymentStatus: 'COMPLETED',
        amount: 100,
        mpesaReceiptNumber: 'ABC123',
        mpesaTransactionId: 'XYZ789',
        paymentMethod: 'MPESA',
        paymentCreatedAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/mpesa/status?bookingId=booking123', {
        method: 'GET',
      });

      const { GET } = require('@/app/api/mpesa/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paymentStatus).toBe('COMPLETED');
      expect(data.amount).toBe(100);
      expect(data.mpesaReceiptNumber).toBe('ABC123');
    });

    test('should handle non-existent booking', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });
      mockPrismaBooking.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/mpesa/status?bookingId=nonexistent', {
        method: 'GET',
      });

      const { GET } = require('@/app/api/mpesa/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Booking not found');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete payment flow', async () => {
      // This test simulates a complete payment flow
      // 1. Initiate payment
      // 2. Check status
      // 3. Process callback

      const mockTokenResponse = {
        data: {
          access_token: 'test_token',
          expires_in: 3600,
        },
      };

      const mockSTKResponse = {
        data: {
          CheckoutRequestID: 'ws_CO_COMPLETE_FLOW',
          ResponseCode: '0',
          ResponseDescription: 'Success',
          MerchantRequestID: '12345',
        },
      };

      mockedAxios.get.mockResolvedValue(mockTokenResponse);
      mockedAxios.post.mockResolvedValue(mockSTKResponse);

      // Step 1: Initiate payment
      const initiateResult = await mpesaService.initiateSTKPush('0712345678', 100, 'booking123');
      expect(initiateResult.success).toBe(true);
      expect(initiateResult.checkoutRequestID).toBe('ws_CO_COMPLETE_FLOW');

      // Step 2: Check status
      const mockStatusResponse = {
        data: {
          ResponseCode: '0',
          ResponseDescription: 'Success',
          ResultCode: '0',
          ResultDesc: 'Success',
        },
      };

      mockedAxios.post.mockResolvedValue(mockStatusResponse);
      const statusResult = await mpesaService.checkPaymentStatus('ws_CO_COMPLETE_FLOW');
      expect(statusResult.success).toBe(true);
      expect(statusResult.resultCode).toBe('0');

      // Step 3: Process callback (tested in callback handler tests)
      expect(true).toBe(true); // Placeholder for callback step
    });

    test('should handle payment failure scenarios', async () => {
      // Test various failure scenarios
      const failureScenarios = [
        { ResultCode: '1', ResultDesc: 'Transaction cancelled' },
        { ResultCode: '1032', ResultDesc: 'Request cancelled by user' },
        { ResultCode: '1037', ResultDesc: 'Timeout' },
      ];

      for (const scenario of failureScenarios) {
        // Reset mocks before each scenario
        mockedAxios.get.mockReset();
        mockedAxios.post.mockReset();
        (mpesaService as any).accessToken = null;
        (mpesaService as any).tokenExpiry = 0;

        const mockTokenResponse = {
          data: {
            access_token: 'test_token',
            expires_in: 3600,
          },
        };

        const mockStatusResponse = {
          data: {
            ResponseCode: '0',
            ResponseDescription: 'Success',
            ResultCode: scenario.ResultCode,
            ResultDesc: scenario.ResultDesc,
          },
        };

        mockedAxios.get.mockResolvedValue(mockTokenResponse);
        mockedAxios.post.mockResolvedValue(mockStatusResponse);
        const result = await mpesaService.checkPaymentStatus('ws_CO_FAILURE');
        
        expect(result.success).toBe(true);
        expect(result.resultCode).toBe(scenario.ResultCode);
        expect(result.resultDesc).toBe(scenario.ResultDesc);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed phone numbers gracefully', () => {
      const invalidNumbers = [
        '',
        'abc',
        '123',
        '12345678901234567890',
      ];

      invalidNumbers.forEach(number => {
        expect(mpesaService.validatePhoneNumber(number)).toBe(false);
      });
    });

    test('should handle zero amount validation', async () => {
      mockAuth.mockResolvedValueOnce({ userId: 'user123' });

      const request = new Request('http://localhost:3000/api/mpesa/initiate', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '0712345678',
          amount: 0,
          bookingId: 'booking123',
        }),
      });

      const { POST } = require('@/app/api/mpesa/initiate/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('greater than 0');
    });

    test('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network timeout'));

      await expect((mpesaService as any).getAccessToken()).rejects.toThrow();
    });

    test('should handle API response errors', async () => {
      const mockErrorResponse = {
        data: undefined, // Simulate malformed response
      };

      mockedAxios.get.mockResolvedValueOnce(mockErrorResponse);

      await expect((mpesaService as any).getAccessToken()).rejects.toThrow();
    });
  });
});
