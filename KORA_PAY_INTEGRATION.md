# Kora Pay ID Verification Integration Guide

This guide explains how to integrate Kora Pay's Identity Verification API for Kenyan National ID and Passport verification in your application.

## Overview

Kora Pay's Identity Verification API provides real-time verification of government-issued identification documents in Kenya. This integration supports:

- **Kenyan National ID Verification**: Verify 8-digit national ID numbers
- **Kenyan International Passport Verification**: Verify passport numbers
- **Data Validation**: Match provided names and date of birth against government records
- **Facial Recognition**: Compare user selfies against government database photos
- **Webhook Notifications**: Receive real-time updates on verification status

## Prerequisites

### 1. Kora Pay Account Setup

1. **Create a Kora Pay Account**
   - Go to [merchant.korapay.com](https://merchant.korapay.com/auth/signup)
   - Sign up for a merchant account
   - Complete the required compliance documentation

2. **Enable Identity Service**
   - Log in to your Kora dashboard
   - Navigate to "Identity" from the main menu
   - Click "Request Access"
   - Fill out the due diligence form
   - Wait for approval (typically 1-2 business days)

3. **Get API Keys**
   - Go to Settings → API Configuration
   - Copy your Secret Key (for server-side use)
   - Copy your Public Key (for client-side use, if needed)
   - Note: Test mode and Live mode have different keys

4. **Configure Webhook** (Optional but recommended)
   - In your Kora dashboard, set your webhook URL
   - Use: `https://your-domain.com/api/kora/webhook`
   - Generate a webhook secret for signature verification

### 2. Environment Configuration

Add the following variables to your `.env` file:

```env
# Kora Pay Verification Configuration
KORA_SECRET_KEY="your_kora_secret_key"
KORA_PUBLIC_KEY="your_kora_public_key"
KORA_ENVIRONMENT="test"  # Use "live" for production
KORA_WEBHOOK_SECRET="your_kora_webhook_secret"
```

**Important:**
- Never commit `.env` files to version control
- Use different keys for test and production environments
- Ensure your Kora account has sufficient balance for verification fees

## Architecture

### Components

1. **Service Layer** (`src/lib/kora/koraVerificationService.ts`)
   - Handles all Kora Pay API interactions
   - Manages authentication and request formatting
   - Provides validation utilities

2. **API Routes** (`src/app/api/kora/`)
   - `verify/route.ts` - Initiates verification requests
   - `query/route.ts` - Queries previous verifications
   - `webhook/route.ts` - Handles Kora webhook notifications

3. **React Hook** (`src/hooks/useKoraVerification.ts`)
   - Provides React-friendly interface for verifications
   - Manages loading states and error handling

4. **Type Definitions** (`src/types/index.ts`)
   - TypeScript interfaces for requests and responses
   - Ensures type safety across the application

## Usage Examples

### 1. Basic National ID Verification

```typescript
import { useKoraVerification } from '@/hooks/useKoraVerification';

function VerificationForm() {
  const { verifyIdentity, isLoading, error, success, verificationData } = useKoraVerification();

  const handleVerify = async () => {
    const result = await verifyIdentity({
      idNumber: '12345678',
      idType: 'national_id',
      consent: true,
    });

    if (result) {
      console.log('Verification successful:', result.data);
    }
  };

  return (
    <div>
      <button onClick={handleVerify} disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify ID'}
      </button>
      {error && <p>Error: {error}</p>}
      {success && <p>Verification successful!</p>}
    </div>
  );
}
```

### 2. Full Verification with Data Validation

```typescript
const handleFullVerification = async () => {
  const result = await verifyIdentity({
    idNumber: '12345678',
    idType: 'national_id',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    selfieImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // Base64 encoded selfie
    consent: true,
  });

  if (result?.validationResults) {
    console.log('Name match:', result.validationResults.nameMatch);
    console.log('DOB match:', result.validationResults.dobMatch);
    console.log('Selfie match:', result.validationResults.selfieMatch);
    console.log('Confidence:', result.validationResults.selfieConfidence);
  }
};
```

### 3. Passport Verification

```typescript
const handlePassportVerification = async () => {
  const result = await verifyIdentity({
    idNumber: 'A1234567',
    idType: 'passport',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1985-05-15',
    consent: true,
  });
};
```

### 4. Query Previous Verification

```typescript
const { queryVerification } = useKoraVerification();

const handleQuery = async (reference: string) => {
  const data = await queryVerification(reference);
  console.log('Verification data:', data);
};
```

## API Reference

### Verification Request

```typescript
interface KoraVerificationRequest {
  idNumber: string;        // ID or Passport number
  idType: 'national_id' | 'passport';
  firstName?: string;      // Required for data validation
  lastName?: string;       // Required for data validation
  dateOfBirth?: string;    // Required for data validation (YYYY-MM-DD)
  selfieImage?: string;    // Base64 encoded image for facial matching
  consent?: boolean;       // User consent (default: true)
}
```

### Verification Response

```typescript
interface KoraVerificationResponse {
  success: boolean;
  data?: {
    reference: string;           // Verification reference
    id: string;                  // ID number
    id_type: string;             // ID type
    first_name: string;          // First name from government DB
    last_name: string;           // Last name from government DB
    full_name: string;           // Full name
    date_of_birth: string;       // Date of birth
    nationality: string;         // Nationality
    gender: string;              // Gender
    image?: string;              // Base64 image from government DB
  };
  validationResults?: {
    nameMatch: boolean;          // Whether provided name matches
    dobMatch: boolean;           // Whether provided DOB matches
    selfieMatch?: boolean;       // Whether selfie matches
    selfieConfidence?: number;   // Facial match confidence (0-100)
  };
  error?: string;
}
```

## Validation Rules

### National ID Format
- Must be exactly 8 digits
- Example: `12345678`

### Passport Format
- Must start with a letter followed by 7 digits
- Example: `A1234567`

### Date of Birth Format
- Must be in YYYY-MM-DD format
- Example: `1990-01-01`

### Selfie Image
- Must be base64 encoded
- Must include data URI prefix
- Example: `data:image/jpeg;base64,/9j/4AAQSkZJRg...`

## Webhook Integration

### Webhook Endpoint

The webhook endpoint at `/api/kora/webhook` receives notifications from Kora Pay:

```typescript
// Webhook payload structure
{
  "data": {
    "reference": "VR-8YgAZW4R8WUZRJh2M",
    "status": "success",
    // ... other verification data
  }
}
```

### Webhook Security

1. **Signature Verification**: The webhook validates signatures using `KORA_WEBHOOK_SECRET`
2. **Implementation**: Currently uses placeholder - implement HMAC-SHA256 for production

### Webhook Processing

The webhook automatically:
- Validates the signature
- Processes the verification result
- Updates provider profiles in your database
- Logs verification events

## Database Integration

To store verification references, add a field to your `ProviderProfile` model:

```prisma
model ProviderProfile {
  // ... existing fields
  koraVerificationReference String?
  koraVerificationStatus   String?
  koraVerifiedAt           DateTime?
}
```

## Best Practices

### 1. Security
- Never expose secret keys on the client side
- Always use HTTPS for API calls
- Implement webhook signature verification
- Store verification references securely

### 2. User Experience
- Show clear loading states during verification
- Display user-friendly error messages
- Provide verification status updates
- Allow users to retry failed verifications

### 3. Error Handling
- Handle network errors gracefully
- Implement retry logic for failed requests
- Log verification attempts for audit trails
- Monitor verification success rates

### 4. Cost Management
- Cache verification results when possible
- Query existing verifications before initiating new ones
- Monitor your Kora account balance
- Use test mode for development

### 5. Compliance
- Always obtain user consent before verification
- Store verification data securely
- Implement data retention policies
- Follow Kora Pay's compliance guidelines

## Testing

### Test Mode

1. Use test environment credentials
2. Kora provides test data for sandbox testing
3. No actual charges are made in test mode

### Test Data

Use Kora's provided test data from their documentation:
- Test National ID numbers
- Test Passport numbers
- Test scenarios for different validation outcomes

### Integration Testing

```typescript
// Example test case
describe('Kora Verification', () => {
  it('should verify national ID successfully', async () => {
    const result = await verifyIdentity({
      idNumber: '12345678',
      idType: 'national_id',
      consent: true,
    });
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check if API keys are correct
   - Verify account is active
   - Ensure sufficient account balance

2. **Validation Errors**
   - Verify ID format matches requirements
   - Check date of birth format
   - Ensure base64 images are properly encoded

3. **Webhook Issues**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Review webhook logs in Kora dashboard

4. **Rate Limiting**
   - Implement exponential backoff
   - Cache verification results
   - Monitor usage patterns

## Support

For issues specific to:
- **Kora Pay API**: Contact Kora support at support@korapay.com
- **This Integration**: Check your application logs and Kora dashboard
- **Account Issues**: Use Kora's merchant dashboard support

## Cost Structure

Kora Pay charges per verification:
- Fees vary by verification type
- Check Kora dashboard for current pricing
- Ensure sufficient balance before production use

## Future Enhancements

Potential improvements to consider:
- Bulk verification processing
- Additional document types
- Enhanced fraud detection
- Integration with other Kora services
- Advanced analytics and reporting

## Version History

- v1.0.0 - Initial integration with National ID and Passport verification
- Support for data validation and facial matching
- Webhook integration for real-time updates
- Comprehensive error handling and validation
