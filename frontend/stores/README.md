# Authentication System

This directory contains the authentication store and related functionality for GigStream.

## Overview

The authentication system uses:
- **Zustand** for state management with persistence
- **Next.js Middleware** for route protection
- **httpOnly cookies** for secure token storage
- **Auto token refresh** to maintain sessions

## Files

### `auth-store.ts`
Zustand store that manages authentication state:
- User data
- Authentication token
- Loading state
- Login/logout actions
- Token refresh logic

**State persisted to localStorage:**
- User object
- Auth token
- Authentication status

### Usage

#### Basic Usage

```typescript
import { useAuthStore } from '@/stores/auth-store';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {user?.name}!</div>;
}
```

#### Using the useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const { login, isLoading } = useAuth();
  
  const handleSubmit = async (email: string, password: string) => {
    const result = await login(email, password);
    
    if (result.success) {
      // Login successful, user is redirected
    } else {
      // Handle error
      console.error(result.message);
    }
  };
  
  return (
    // Your form JSX
  );
}
```

#### Protecting Routes with Middleware

Routes are automatically protected by Next.js middleware in `middleware.ts`.

**Protected routes:**
- `/dashboard`
- `/tasks`
- `/history`
- `/advance`
- `/reputation`
- `/settings`
- `/workers` (Platform)
- `/analytics` (Platform)

**Auth routes (redirect if logged in):**
- `/login`
- `/register`

#### Using ProtectedRoute Component

For client-side route protection with role enforcement:

```typescript
import { ProtectedRoute } from '@/components/protected-route';

export default function WorkerDashboard() {
  return (
    <ProtectedRoute requiredRole="worker">
      <div>Worker Dashboard Content</div>
    </ProtectedRoute>
  );
}
```

#### Manual Auth Check

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

function MyPage() {
  const { requireAuth } = useAuth();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    requireAuth();
  }, [requireAuth]);
  
  return <div>Protected Content</div>;
}
```

## Features

### 1. State Persistence
Auth state is persisted to localStorage and rehydrated on page load.

### 2. Auto Token Refresh
Tokens are automatically refreshed every 50 minutes to maintain active sessions.

### 3. Secure Token Storage
Tokens are stored in httpOnly cookies (server-side) to prevent XSS attacks.

### 4. Route Protection
Next.js middleware automatically redirects unauthenticated users to login.

### 5. Role-Based Access
Components can enforce role-based access (worker, platform, admin).

### 6. Loading States
Proper loading states prevent flickering during auth checks.

## API Endpoints

### POST `/api/v1/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "worker",
      "walletAddress": "0x..."
    },
    "token": "jwt_token"
  }
}
```

### POST `/api/v1/auth/logout`
Logout and clear session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET `/api/v1/auth/me`
Get current user data.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "worker",
      "walletAddress": "0x..."
    }
  }
}
```

### POST `/api/v1/auth/refresh`
Refresh authentication token.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "new_jwt_token"
  }
}
```

## Security Considerations

1. **httpOnly Cookies**: Tokens stored in httpOnly cookies prevent XSS attacks
2. **HTTPS Only**: Cookies only sent over HTTPS in production
3. **SameSite**: Cookies use `SameSite=strict` to prevent CSRF
4. **Token Expiry**: Tokens expire after 7 days
5. **Auto Refresh**: Tokens refresh before expiry to maintain sessions
6. **Middleware Protection**: Server-side route protection prevents unauthorized access

## Testing

```typescript
// Example test
import { useAuthStore } from '@/stores/auth-store';

describe('Auth Store', () => {
  it('should login user', () => {
    const { login } = useAuthStore.getState();
    
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'worker' as const,
    };
    
    login(mockUser, 'mock_token');
    
    const { isAuthenticated, user } = useAuthStore.getState();
    expect(isAuthenticated).toBe(true);
    expect(user).toEqual(mockUser);
  });
});
```

## Migration from Mock to Production

When integrating with the real backend:

1. Update API endpoint URLs in `useAuth` hook
2. Replace mock token handling with real JWT verification
3. Implement proper password hashing verification
4. Add rate limiting to auth endpoints
5. Set up proper error handling and logging
6. Configure CORS and security headers

## Troubleshooting

### Auth state not persisting
- Check browser localStorage for `auth-storage` key
- Ensure localStorage is not disabled
- Clear browser cache and try again

### Infinite redirect loop
- Check middleware configuration
- Verify protected routes array
- Check auth cookie presence

### Token not refreshing
- Check console for refresh errors
- Verify `/api/v1/auth/refresh` endpoint
- Check token expiry time

## Future Enhancements

- [ ] Add 2FA support
- [ ] Implement remember me functionality
- [ ] Add session management UI
- [ ] Add biometric authentication
- [ ] Implement OAuth providers (Google, GitHub, etc.)
- [ ] Add email verification
- [ ] Add password reset flow
