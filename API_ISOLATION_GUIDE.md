# API Isolation Architecture Guide

## Overview
This project now follows a layered architecture that isolates API logic from frontend components, following the Separation of Concerns principle.

## Architecture Layers

### 1. **Type Definitions Layer** (`src/types/`)
- **Purpose**: Centralized TypeScript interfaces and types
- **Benefits**: Type safety across the application, single source of truth for data structures
- **Files**: `index.ts`

```typescript
// Example: Type definitions
export interface ProviderApplication {
  fullName: string;
  phone: string;
  // ... other fields
}
```

### 2. **API Service Layer** (`src/services/`)
- **Purpose**: Handles all HTTP communication with backend APIs
- **Benefits**: Centralized error handling, consistent API patterns, easy to mock for testing
- **Files**: `api.ts`

```typescript
// Example: Service usage
const response = await apiServices.providerApplications.submitApplication(data);
```

### 3. **Custom Hooks Layer** (`src/hooks/`)
- **Purpose**: Encapsulates business logic and state management
- **Benefits**: Reusable logic, clean component separation, easier testing
- **Files**: `useProviderApplication.ts`, `useBooking.ts`

```typescript
// Example: Hook usage
const { submitApplication, isLoading, error, success } = useProviderApplication();
```

### 4. **Component Layer** (`src/app/`)
- **Purpose**: Pure UI/presentation logic
- **Benefits**: Clean, focused components, easy to maintain and test
- **No direct API calls or business logic**

## How to Add New Features

### Step 1: Define Types
Add your data structures to `src/types/index.ts`:
```typescript
export interface YourDataType {
  field1: string;
  field2: number;
  // ...
}
```

### Step 2: Create API Service
Add your API functions to `src/services/api.ts`:
```typescript
export const yourService = {
  async yourAction(data: YourDataType): Promise<ApiResponse<YourResponseType>> {
    return apiCall<YourResponseType>('/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

### Step 3: Create Custom Hook
Create a new hook in `src/hooks/useYourFeature.ts`:
```typescript
export function useYourFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yourAction = async (data: YourDataType) => {
    setIsLoading(true);
    try {
      const response = await apiServices.yourService.yourAction(data);
      // Handle response
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { yourAction, isLoading, error };
}
```

### Step 4: Use in Components
```typescript
import { useYourFeature } from "@/hooks/useYourFeature";

export default function YourComponent() {
  const { yourAction, isLoading, error } = useYourFeature();
  // UI logic only
}
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Testability**: Easy to unit test each layer independently
3. **Reusability**: Services and hooks can be reused across components
4. **Maintainability**: Changes to API endpoints only affect the service layer
5. **Type Safety**: TypeScript ensures data consistency across layers
6. **Error Handling**: Centralized error handling in the service layer

## Migration Status

✅ **Completed**:
- Type definitions created
- API service layer established
- Custom hooks for provider applications
- Custom hooks for bookings
- Provider application page refactored
- Booking page refactored

🔄 **To Do**:
- Apply same pattern to other API endpoints
- Add loading/error UI components
- Implement proper logging/monitoring
- Add unit tests for services and hooks

## File Structure

```
src/
├── types/
│   └── index.ts              # Type definitions
├── services/
│   └── api.ts                # API service layer
├── hooks/
│   ├── useProviderApplication.ts
│   └── useBooking.ts
└── app/
    ├── providers/apply/       # Refactored components
    └── services/book/        # Refactored components
```