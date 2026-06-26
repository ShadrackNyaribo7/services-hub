# Unified Fitness Platform (UFP) Integration Guide

## Overview
This guide will help you integrate the Unified Fitness Platform API into your services hub application to provide professional fitness trainer booking capabilities.

## Step 1: Get UFP API Credentials

1. **Contact UFP**: Reach out to Unified Fitness Platform to get API access
   - You'll need: Staff account email, password, and Company UUID
   - Email: [Contact UFP support](https://docs.unifiedfitnessplatform.ai/)

2. **Choose Environment**:
   - **Staging**: https://api.staging.ufp.ai (for testing and development)
   - **Production**: https://api.unifiedfitnessplatform.ai (for live production use)

3. **Update Environment Variables**: 
   Copy `.env3party` to `.env.local` and configure with your credentials:
   ```bash
   # UFP API Configuration
   # Choose between staging and production environments
   UFP_API_BASE_URL=https://api.unifiedfitnessplatform.ai
   # For staging use: https://api.staging.ufp.ai
   # For production use: https://api.unifiedfitnessplatform.ai

   UFP_API_EMAIL=your_actual_email@example.com
   UFP_API_PASSWORD=your_actual_password
   UFP_COMPANY_UUID=your_actual_company_uuid

   # Environment indicator (optional, for logging/monitoring)
   UFP_ENVIRONMENT=production
   # Options: staging, production
   ```

## Step 2: Test the Integration

### Test Authentication
```bash
# Run the development server
npm run dev
```

Visit `http://localhost:3000/services/ufp` to test the trainer listing.

### Test API Endpoints Directly

1. **Get Trainers**: 
   ```
   GET /api/ufp/trainers
   ```

2. **Get Trainers from Specific Tenant**:
   ```
   GET /api/ufp/trainers?tenantId={tenant_id}
   ```

3. **Get All Trainers Across All Locales**:
   ```
   GET /api/ufp/trainers/all
   ```

4. **Get All Trainers Grouped by Tenant**:
   ```
   GET /api/ufp/trainers/all?groupByTenant=true
   ```

5. **Get Available Tenants/Locales**:
   ```
   GET /api/ufp/tenants
   ```

6. **Get Appointment Types**:
   ```
   GET /api/ufp/appointment-types
   ```

7. **Get Available Appointments**:
   ```
   GET /api/ufp/bookings?coachId={coach_id}&startDate={date}&endDate={date}
   ```

## Step 3: Implementation Details

### Files Created/Modified:

1. **Environment Configuration** (`.env.local` and `.env3party`)
   - Added UFP API credentials
   - Added multi-tenant configuration options
   - Preserved existing Clerk authentication

2. **Type Definitions** (`src/types/index.ts`)
   - Added UFP-specific interfaces for authentication, coaches, appointments, bookings
   - Added tenant/locale types: `UFPTenant`, `UFPTenantWithCoaches`
   - Extended `UFPCoach` to include `tenant_id` and `locale` fields

3. **Service Layer** (`src/services/api.ts`)
   - Created `UFPService` class with JWT authentication
   - Implemented methods: `getCoaches()`, `getAppointments()`, `createAppointment()`, `bookAppointment()`
   - Added multi-tenant methods: `getTenants()`, `getAllCoachesAcrossTenants()`, `getAllCoachesFlattened()`

4. **API Routes**:
   - `/api/ufp/trainers` - Fetch available trainers (with optional tenant filter)
   - `/api/ufp/trainers/all` - Fetch all trainers across all locales
   - `/api/ufp/tenants` - Fetch available tenants/locales
   - `/api/ufp/bookings` - Get appointments and create bookings
   - `/api/ufp/appointment-types` - Get session types and pricing

5. **React Hook** (`src/hooks/useUfpBooking.ts`)
   - Custom hook for UFP booking operations
   - Handles state management for coaches, appointments, booking flow

6. **UI Pages**:
   - `/services/ufp` - Browse UFP trainers with multi-locale support
   - `/services/ufp/book/[id]` - Book specific trainer

7. **Updated Main Services Page** (`src/app/services/page.tsx`)
   - Added link to UFP trainers section
   - Maintained existing local providers

## Step 4: Authentication Flow

The UFP service automatically handles JWT authentication:

1. **First Request**: Authenticates with UFP using credentials from `.env.local` (copied from `.env3party`)
2. **Token Storage**: Stores JWT token with 1-hour expiry
3. **Auto Refresh**: Automatically re-authenticates when token expires
4. **API Calls**: Includes Bearer token in all subsequent requests

## Step 5: Environment Configuration

The integration supports both staging and production UFP environments:

### Environment URLs
- **Staging**: `https://api.staging.ufp.ai` - For development and testing
- **Production**: `https://api.unifiedfitnessplatform.ai` - For live production use

### Configuration Example

**For Development/Testing:**
```bash
UFP_API_BASE_URL=https://api.staging.ufp.ai
UFP_ENVIRONMENT=staging
UFP_API_EMAIL=staging_email@example.com
UFP_API_PASSWORD=staging_password
UFP_COMPANY_UUID=staging_company_uuid
```

**For Production:**
```bash
UFP_API_BASE_URL=https://api.unifiedfitnessplatform.ai
UFP_ENVIRONMENT=production
UFP_API_EMAIL=production_email@example.com
UFP_API_PASSWORD=production_password
UFP_COMPANY_UUID=production_company_uuid
```

### Environment Validation
The service automatically logs which environment it's connecting to, making it easier to debug configuration issues. Check your server logs for messages like:
```
UFP Authentication - Environment: staging, API: https://api.staging.ufp.ai
```

## Step 6: Multi-Locale Support

The integration now supports accessing trainers across multiple UFP locales/tenants:

### Locale Discovery
- Clients can view all available locales through the `/api/ufp/tenants` endpoint
- Each locale includes name, locale code, country, and region information
- The UI automatically fetches and displays available locales

### Access Patterns
1. **Single Locale View**: Browse trainers within a specific locale
   - Select a locale from the dropdown
   - View only trainers from that location
   - Book sessions with locale-specific trainers

2. **All Locales View**: Browse trainers across all available locales
   - Click "All Locales" button
   - View trainers organized by their respective locales
   - Compare availability across different locations
   - Book with any trainer regardless of locale

### API Endpoints for Multi-Locale Access
- `GET /api/ufp/tenants` - List all available locales
- `GET /api/ufp/trainers/all` - Get all trainers flattened across locales
- `GET /api/ufp/trainers/all?groupByTenant=true` - Get trainers grouped by locale
- `GET /api/ufp/trainers?tenantId={id}` - Get trainers for specific locale

### Environment Variables for Multi-Tenant Configuration
```bash
# Enable multi-tenant support
UFP_MULTI_TENANT_ENABLED=true

# Configure available locales
UFP_AVAILABLE_LOCALES=en-US,es-MX,fr-CA,pt-BR
UFP_DEFAULT_LOCALE=en-US

# Individual tenant IDs (if needed for specific operations)
# UFP_TENANT_ID_US=your_us_tenant_id
# UFP_TENANT_ID_MX=your_mx_tenant_id
```

## Step 7: Booking Flow

1. **Browse Trainers**: User visits `/services/ufp`
2. **Select View Mode**: Choose between "Single Locale" or "All Locales"
3. **Select Locale** (if single locale): Choose specific location from dropdown
4. **Select Trainer**: User chooses a trainer from the list
5. **Choose Date**: User selects preferred date
6. **Select Time Slot**: Available appointments are fetched and displayed
7. **Select Session Type**: User chooses appointment type (duration, price)
8. **Enter Details**: User provides name and notes
9. **Confirm Booking**: Appointment is created via UFP API

## Step 8: Error Handling

The integration includes comprehensive error handling:

- **Authentication Errors**: Caught and displayed to user
- **Network Errors**: Graceful fallback with user-friendly messages
- **API Errors**: Proper HTTP status codes and error messages
- **Loading States**: Visual feedback during API calls

## Step 9: Customization Options

### Modify Trainer Display
Edit `src/app/services/ufp/page.tsx` to customize how trainers are displayed

### Change Booking Flow
Modify `src/app/services/ufp/book/[id]/page.tsx` to adjust the booking process

### Add Additional Fields
Update types in `src/types/index.ts` and corresponding service methods

### Integrate Payments
The booking flow can be extended to integrate with your existing MPesa payment system

## Step 10: Production Considerations

1. **Environment Configuration**:
   - Use staging environment (`https://api.staging.ufp.ai`) for development and testing
   - Use production environment (`https://api.unifiedfitnessplatform.ai`) for live deployments
   - Set `UFP_ENVIRONMENT` variable to track which environment is being used
   - Ensure environment-specific credentials are used for each environment

2. **Security**: 
   - Never commit `.env.local` or `.env3party` to version control
   - Use environment-specific variables for production
   - Implement rate limiting for API calls
   - Rotate credentials periodically

3. **Performance**:
   - Consider caching trainer data
   - Implement pagination for large trainer lists
   - Add loading skeletons for better UX

4. **Monitoring**:
   - Add logging for UFP API calls
   - Monitor authentication failures
   - Track booking success rates
   - Use `UFP_ENVIRONMENT` variable to distinguish staging vs production logs

## Step 11: Troubleshooting

### Issue: "Authentication failed"
- **Solution**: Verify UFP credentials in `.env.local` (copied from `.env3party`)
- Check that email, password, and company UUID are correct

### Issue: "No trainers available"
- **Solution**: Ensure your UFP account has access to trainer data
- Verify tenant ID if using multi-tenant setup

### Issue: CORS errors
- **Solution**: UFP API should allow requests from your domain
- Contact UFP support to whitelist your domain

### Issue: Token expiry
- **Solution**: The service handles auto-refresh, but check system time is accurate

### Issue: "No tenants available"
- **Solution**: Verify your UFP account has access to multiple tenants
- Check that UFP_MULTI_TENANT_ENABLED is set to true in environment variables
- Ensure your UFP credentials have the necessary permissions

### Issue: "Some locales show no trainers"
- **Solution**: This is normal if some locales have no active trainers
- Check with UFP support to verify trainer availability in specific locales
- Verify that the locales are properly configured in your UFP account

### Issue: "Wrong environment data"
- **Solution**: Verify `UFP_API_BASE_URL` is set correctly for your environment
- Check that `UFP_ENVIRONMENT` matches your intended environment
- Ensure you're using the correct credentials for staging vs production
- Staging and production have different credentials and data

## Next Steps

1. **Get UFP Credentials**: Contact Unified Fitness Platform for API access (separate credentials for staging and production)
2. **Choose Environment**: Decide whether to start with staging for testing or go directly to production
3. **Update Environment**: Add your credentials to `.env.local` with the correct API URL for your chosen environment
4. **Test Integration**: Run the app and test the booking flow
5. **Verify Environment**: Check logs to confirm you're connecting to the intended environment
6. **Customize**: Adjust the UI and flow to match your needs
7. **Deploy**: Ensure environment variables are set correctly for production deployment

## Support

- **UFP Documentation**: https://docs.unifiedfitnessplatform.ai/
- **UFP Support**: Contact through their official channels
- **Project Issues**: Check the AGENTS.md file for project-specific guidance

## Notes

- The integration maintains your existing Clerk authentication
- Local providers continue to work alongside UFP trainers
- The booking flow is independent but can be integrated with MPesa payments
- All API calls are protected by Clerk authentication on the frontend
- Multi-locale support allows clients to access trainers across all UFP locations
- The system automatically discovers available locales through the UFP API
- Clients can switch between single-locale and multi-locale views seamlessly

## Summary of Multi-Locale Implementation

✅ **Now you have full multi-locale support:**

1. **New API Endpoints:**
   - `/api/ufp/tenants` - Lists all available locales/tenants
   - `/api/ufp/trainers/all` - Gets all trainers across all locales
   - `/api/ufp/trainers/all?groupByTenant=true` - Gets trainers organized by locale

2. **Enhanced Service Methods:**
   - `getTenants()` - Fetches all available tenants
   - `getAllCoachesAcrossTenants()` - Fetches coaches grouped by tenant
   - `getAllCoachesFlattened()` - Fetches all coaches in a single list

3. **Updated UI Features:**
   - Toggle between "Single Locale" and "All Locales" views
   - Automatic locale discovery and dropdown selection
   - Locale information displayed on trainer cards
   - Organized view showing trainers grouped by location

4. **Environment Variables:**
   - Multi-tenant configuration options
   - Locale availability settings
   - Individual tenant ID configuration

5. **Enhanced Types:**
   - `UFPTenant` - Tenant/locale information
   - `UFPTenantWithCoaches` - Tenant with associated coaches
   - Extended `UFPCoach` with tenant and locale fields

Any client who logs into your site can now:
- Browse trainers from specific locales
- View all available trainers across all UFP locales
- Switch between different location views
- Book sessions with trainers from any accessible locale
