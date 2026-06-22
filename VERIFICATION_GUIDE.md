# Document Verification Integration Guide

This guide explains how I integrated third-party document verification APIs into your services hub website and how you can use and extend it.

## Overview of Implementation

I've implemented a comprehensive document verification system with the following components:

### 1. Database Schema Updates
- **File**: `prisma/schema.prisma`
- **Changes**: Added `idNumber` and `credentialValidator` fields to the `ProviderProfile` model
- **Purpose**: Store all document information for verification tracking

### 2. Verification Service Layer
- **File**: `src/lib/verification/verificationService.ts`
- **Components**: Multiple verification provider classes
- **Providers implemented**:
  - `KenyaGovernmentVerification`: For eCitizen/DCI integration
  - `ProfessionalBodyVerification`: For professional license validation
  - `CommercialVerificationService`: For services like Onfido, Veriff
  - Basic validation fallback when no APIs are configured

### 3. API Endpoints
- **File**: `src/app/api/documents/verify/route.ts`
- **Endpoints**:
  - `POST /api/documents/verify`: Submit documents for verification
  - `GET /api/documents/verify`: Check verification status

### 4. Frontend Integration
- **Types**: Updated `src/types/index.ts` with verification interfaces
- **Service**: Added `documentVerificationService` to `src/services/api.ts`
- **Hook**: Created `useDocumentVerification` hook for React components

### 5. Configuration
- **File**: `.env.example`
- **Environment variables for all verification providers**

## How to Use the Verification System

### Step 1: Configure Environment Variables

Copy `.env.example` to `.env` and configure the verification services you want to use:

```bash
# Enable Kenya Government verification
ENABLE_KE_GOV_VERIFICATION="true"
KE_GOV_API_URL="https://api.ecitizen.go.ke/v1"
KE_GOV_API_KEY="your_api_key_here"

# Enable Professional Body verification
ENABLE_PROFESSIONAL_BODY_VERIFICATION="true"
PROFESSIONAL_BODY_API_URL="https://api.professional-bodies.co.ke"
PROFESSIONAL_BODY_API_KEY="your_api_key_here"
```

### Step 2: Run Database Migration

Since we updated the Prisma schema, you need to run migrations:

```bash
npx prisma migrate dev --name add_document_verification_fields
```

### Step 3: Use the Verification API

#### Submit Documents for Verification

```typescript
import { documentVerificationService } from '@/services/api';

const documents = {
  idNumber: '12345678',
  policeClearanceNumber: 'PCC123456',
  credentialValidator: 'EBK123456',
  serviceCategory: 'Electrical'
};

const result = await documentVerificationService.verifyDocuments(documents);

if (result.data?.verificationResults.overallValid) {
  console.log('All documents verified successfully');
} else {
  console.log('Verification pending or failed');
}
```

#### Check Verification Status

```typescript
const status = await documentVerificationService.getVerificationStatus();

console.log('Verification Status:', status.data?.verificationStatus);
console.log('Has Documents:', status.data?.hasDocuments);
```

### Step 4: Use in React Components

```typescript
import { useDocumentVerification } from '@/hooks/useDocumentVerification';

function MyComponent() {
  const { verifyDocuments, isVerifying, error, success } = useDocumentVerification();

  const handleVerification = async () => {
    await verifyDocuments({
      idNumber: '12345678',
      policeClearanceNumber: 'PCC123456',
      credentialValidator: 'EBK123456',
      serviceCategory: 'Electrical'
    });
  };

  return (
    <button onClick={handleVerification} disabled={isVerifying}>
      {isVerifying ? 'Verifying...' : 'Verify Documents'}
    </button>
  );
}
```

## How Third-Party Integration Works

### 1. Kenya Government Integration

The system can integrate with Kenya government APIs for:
- **National ID verification**: Through eCitizen API
- **Police Clearance Certificate**: Through DCI systems

**Requirements**:
- Register as a developer on eCitizen portal
- Obtain API credentials
- Set `ENABLE_KE_GOV_VERIFICATION="true"`

### 2. Professional Body Integration

For professional services, the system integrates with:
- **Engineers Board of Kenya (EBK)**: For electrical, plumbing services
- **Other professional bodies**: As needed

**Requirements**:
- Contact respective professional bodies for API access
- Set `ENABLE_PROFESSIONAL_BODY_VERIFICATION="true"`

### 3. Commercial Verification Services

Integration with commercial providers like:
- **Onfido**: Global identity verification
- **Veriff**: Document verification
- **Other providers**: As needed

**Requirements**:
- Register with the commercial provider
- Obtain API credentials
- Set `ENABLE_COMMERCIAL_VERIFICATION="true"`

## How to Extend the System

### Adding a New Verification Provider

1. **Create a new provider class** in `verificationService.ts`:

```typescript
class MyCustomVerification implements VerificationProvider {
  name = 'MyCustomProvider';

  async verifyIdNumber(idNumber: string): Promise<VerificationResult> {
    // Your custom verification logic
    const result = await yourCustomApiCall(idNumber);
    return { valid: result.success, reason: result.message };
  }

  async verifyPoliceClearance(certificateNumber: string): Promise<VerificationResult> {
    // Implement police clearance verification
  }

  async verifyCredentials(validator: string, serviceCategory: string): Promise<VerificationResult> {
    // Implement credential verification
  }
}
```

2. **Add it to the VerificationService constructor**:

```typescript
if (process.env.ENABLE_MY_CUSTOM_VERIFICATION === 'true') {
  this.providers.push(new MyCustomVerification());
}
```

3. **Add environment variables** to `.env.example`:

```bash
ENABLE_MY_CUSTOM_VERIFICATION="false"
MY_CUSTOM_API_URL="https://api.custom-provider.com"
MY_CUSTOM_API_KEY="your_api_key"
```

## Fallback Behavior

If no third-party services are configured, the system automatically falls back to:
- **Basic validation**: Format checking for ID numbers and certificates
- **Manual review**: Sets status to PENDING for admin review
- **Graceful degradation**: System continues to work with reduced verification

## Verification Status Flow

1. **PENDING**: Documents submitted, awaiting verification
2. **APPROVED**: All documents verified successfully
3. **REJECTED**: Verification failed, documents invalid
4. **SUSPENDED**: Provider suspended by admin

## Security Considerations

1. **API Keys**: Never commit API keys to repository
2. **Rate Limiting**: Implement rate limiting for verification APIs
3. **Data Privacy**: Ensure compliance with data protection laws
4. **Logging**: Monitor verification attempts and failures

## Testing the Implementation

### Test with Basic Validation (No API Keys)

The system will work with basic validation even without API keys:

```typescript
const result = await documentVerificationService.verifyDocuments({
  idNumber: '12345678', // 8+ digits
  policeClearanceNumber: 'PCC123456', // 5+ characters
  credentialValidator: 'EBK123456', // 3+ characters
  serviceCategory: 'Electrical'
});
```

### Test with Mock Data

You can test the verification flow using the provided frontend form in `src/app/providers/apply/page.tsx`.

## Next Steps

1. **Obtain API credentials** from your chosen verification providers
2. **Configure environment variables** with your API keys
3. **Run database migrations** to update the schema
4. **Test the verification flow** with real documents
5. **Monitor verification results** and adjust validation rules
6. **Implement admin panel** for manual verification review

## Troubleshooting

### Verification Fails
- Check API key configuration
- Verify API endpoints are accessible
- Check network connectivity
- Review API service status

### Database Errors
- Ensure migrations were run
- Check database connection
- Verify schema updates

### Frontend Errors
- Check TypeScript types are correct
- Verify API service is properly imported
- Review console for error messages

## Support

For issues or questions about the verification system:
1. Check this guide first
2. Review the code comments in `verificationService.ts`
3. Test with basic validation to isolate the issue
4. Consult third-party API documentation for specific provider issues