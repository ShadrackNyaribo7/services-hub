# Unified Fitness Platform (UFP) Integration Guide

## Overview
This guide will help you integrate the Unified Fitness Platform API into your services hub application to provide professional fitness trainer booking capabilities.

## Step 1: Get UFP API Credentials

1. **Contact UFP**: Reach out to Unified Fitness Platform to get API access
   - You'll need: Staff account email, password, and Company UUID
   - Email: [Contact UFP support](https://docs.unifiedfitnessplatform.ai/)

2. **Update Environment Variables**: 
   Edit `.env.local` file in your project root:
   ```bash
   # UFP API Configuration
   UFP_API_BASE_URL=https://api.unifiedfitnessplatform.ai
   UFP_API_EMAIL=your_actual_email@example.com
   UFP_API_PASSWORD=your_actual_password
   UFP_COMPANY_UUID=your_actual_company_uuid
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

2. **Get Appointment Types**:
   ```
   GET /api/ufp/appointment-types
   ```

3. **Get Available Appointments**:
   ```
   GET /api/ufp/bookings?coachId={coach_id}&startDate={date}&endDate={date}
   ```

## Step 3: Implementation Details

### Files Created/Modified:

1. **Environment Configuration** (`.env.local`)
   - Added UFP API credentials
   - Preserved existing Clerk authentication

2. **Type Definitions** (`src/types/index.ts`)
   - Added UFP-specific interfaces for authentication, coaches, appointments, bookings

3. **Service Layer** (`src/services/api.ts`)
   - Created `UFPService` class with JWT authentication
   - Implemented methods: `getCoaches()`, `getAppointments()`, `createAppointment()`, `bookAppointment()`

4. **API Routes**:
   - `/api/ufp/trainers` - Fetch available trainers
   - `/api/ufp/bookings` - Get appointments and create bookings
   - `/api/ufp/appointment-types` - Get session types and pricing

5. **React Hook** (`src/hooks/useUfpBooking.ts`)
   - Custom hook for UFP booking operations
   - Handles state management for coaches, appointments, booking flow

6. **UI Pages**:
   - `/services/ufp` - Browse UFP trainers
   - `/services/ufp/book/[id]` - Book specific trainer

7. **Updated Main Services Page** (`src/app/services/page.tsx`)
   - Added link to UFP trainers section
   - Maintained existing local providers

## Step 4: Authentication Flow

The UFP service automatically handles JWT authentication:

1. **First Request**: Authenticates with UFP using credentials from `.env.local`
2. **Token Storage**: Stores JWT token with 1-hour expiry
3. **Auto Refresh**: Automatically re-authenticates when token expires
4. **API Calls**: Includes Bearer token in all subsequent requests

## Step 5: Booking Flow

1. **Browse Trainers**: User visits `/services/ufp`
2. **Select Trainer**: User chooses a trainer from the list
3. **Choose Date**: User selects preferred date
4. **Select Time Slot**: Available appointments are fetched and displayed
5. **Select Session Type**: User chooses appointment type (duration, price)
6. **Enter Details**: User provides name and notes
7. **Confirm Booking**: Appointment is created via UFP API

## Step 6: Error Handling

The integration includes comprehensive error handling:

- **Authentication Errors**: Caught and displayed to user
- **Network Errors**: Graceful fallback with user-friendly messages
- **API Errors**: Proper HTTP status codes and error messages
- **Loading States**: Visual feedback during API calls

## Step 7: Customization Options

### Modify Trainer Display
Edit `src/app/services/ufp/page.tsx` to customize how trainers are displayed

### Change Booking Flow
Modify `src/app/services/ufp/book/[id]/page.tsx` to adjust the booking process

### Add Additional Fields
Update types in `src/types/index.ts` and corresponding service methods

### Integrate Payments
The booking flow can be extended to integrate with your existing MPesa payment system

## Step 8: Production Considerations

1. **Security**: 
   - Never commit `.env.local` to version control
   - Use environment-specific variables for production
   - Implement rate limiting for API calls

2. **Performance**:
   - Consider caching trainer data
   - Implement pagination for large trainer lists
   - Add loading skeletons for better UX

3. **Monitoring**:
   - Add logging for UFP API calls
   - Monitor authentication failures
   - Track booking success rates

## Troubleshooting

### Issue: "Authentication failed"
- **Solution**: Verify UFP credentials in `.env.local`
- Check that email, password, and company UUID are correct

### Issue: "No trainers available"
- **Solution**: Ensure your UFP account has access to trainer data
- Verify tenant ID if using multi-tenant setup

### Issue: CORS errors
- **Solution**: UFP API should allow requests from your domain
- Contact UFP support to whitelist your domain

### Issue: Token expiry
- **Solution**: The service handles auto-refresh, but check system time is accurate

## Next Steps

1. **Get UFP Credentials**: Contact Unified Fitness Platform for API access
2. **Update Environment**: Add your credentials to `.env.local`
3. **Test Integration**: Run the app and test the booking flow
4. **Customize**: Adjust the UI and flow to match your needs
5. **Deploy**: Ensure environment variables are set in production

## Support

- **UFP Documentation**: https://docs.unifiedfitnessplatform.ai/
- **UFP Support**: Contact through their official channels
- **Project Issues**: Check the AGENTS.md file for project-specific guidance

## Notes

- The integration maintains your existing Clerk authentication
- Local providers continue to work alongside UFP trainers
- The booking flow is independent but can be integrated with MPesa payments
- All API calls are protected by Clerk authentication on the frontend
