# Authentication Flow Diagram

## Login Flow

```
┌─────────────┐
│ User enters │
│ credentials │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Login Page              │
│ - React Hook Form       │
│ - Zod Validation        │
└──────┬──────────────────┘
       │ calls useAuth().login()
       ▼
┌─────────────────────────┐
│ useAuth Hook            │
│ - POST /api/v1/auth/login
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Login API Route         │
│ - Validate credentials  │
│ - Generate JWT          │
│ - Set httpOnly cookie   │
└──────┬──────────────────┘
       │ returns user data + token
       ▼
┌─────────────────────────┐
│ Auth Store (Zustand)    │
│ - Update user state     │
│ - Set isAuthenticated   │
│ - Persist to localStorage
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Redirect to Dashboard   │
└─────────────────────────┘
```

## Protected Route Access Flow

```
┌─────────────────────────┐
│ User navigates to       │
│ /dashboard              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Next.js Middleware      │
│ - Check auth_token      │
│   cookie exists         │
└──────┬──────────────────┘
       │
       ├─── Token exists ──────┐
       │                       │
       │                       ▼
       │              ┌─────────────────┐
       │              │ Allow request   │
       │              │ to proceed      │
       │              └────────┬────────┘
       │                       │
       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ No token found   │   │ Page Component   │
│ Redirect to      │   │ renders          │
│ /login           │   └──────┬───────────┘
└──────────────────┘          │
                              ▼
                      ┌──────────────────┐
                      │ ProtectedRoute   │
                      │ component        │
                      │ - Double check   │
                      │   auth state     │
                      └──────┬───────────┘
                             │
                             ▼
                      ┌──────────────────┐
                      │ Dashboard UI     │
                      │ displays         │
                      └──────────────────┘
```

## Token Refresh Flow

```
┌─────────────────────────┐
│ User authenticated      │
│ (page loaded)           │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ useAuth useEffect       │
│ - Start 50min timer     │
│ - Call refreshToken()   │
│   on mount              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Every 50 minutes        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ POST /api/v1/auth/refresh
│ - Verify current token  │
│ - Generate new token    │
│ - Set new cookie        │
└──────┬──────────────────┘
       │
       ├─── Success ────────┐
       │                    │
       │                    ▼
       │            ┌──────────────────┐
       │            │ Update Auth Store│
       │            │ - New token      │
       │            │ - User data      │
       │            └──────────────────┘
       │
       ▼
┌──────────────────┐
│ Refresh failed   │
│ Logout user      │
│ Redirect to login│
└──────────────────┘
```

## Logout Flow

```
┌─────────────────────────┐
│ User clicks logout      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ useAuth().logout()      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Auth Store              │
│ - Clear user            │
│ - Clear token           │
│ - Set isAuthenticated=  │
│   false                 │
│ - Clear localStorage    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ POST /api/v1/auth/logout│
│ - Delete auth cookie    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Redirect to /login      │
└─────────────────────────┘
```

## State Persistence Flow

```
┌─────────────────────────┐
│ User refreshes page     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Zustand rehydration     │
│ - Read from localStorage│
│ - Parse auth-storage    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Auth Store loaded       │
│ - user: { ... }         │
│ - token: "..."          │
│ - isAuthenticated: true │
│ - isLoading: false      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ useAuth checkAuth()     │
│ - Verify with backend   │
│ - GET /api/v1/auth/me   │
└──────┬──────────────────┘
       │
       ├─── Valid ──────────┐
       │                    │
       │                    ▼
       │            ┌──────────────────┐
       │            │ Stay logged in   │
       │            │ Update user data │
       │            └──────────────────┘
       │
       ▼
┌──────────────────┐
│ Invalid token    │
│ Logout user      │
└──────────────────┘
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Pages     │  │  Components  │  │    Hooks         │   │
│  │             │  │              │  │                  │   │
│  │ - Login     │  │ - UserMenu   │  │ - useAuth()      │   │
│  │ - Register  │  │ - Protected  │  │ - useUser()      │   │
│  │ - Dashboard │  │   Route      │  │ - useAuthLoading │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          │                                  │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │   Auth Store          │                      │
│              │   (Zustand)           │                      │
│              │                       │                      │
│              │ - user                │◄────────────────────┐│
│              │ - token               │                     ││
│              │ - isAuthenticated     │                     ││
│              │ - login()             │                     ││
│              │ - logout()            │                     ││
│              │ - refreshToken()      │                     ││
│              └───────────┬───────────┘                     ││
│                          │                                 ││
│                          ▼                                 ││
│              ┌───────────────────────┐                     ││
│              │   localStorage        │                     ││
│              │   (Persistence)       │                     ││
│              └───────────────────────┘                     ││
│                                                            ││
├────────────────────────────────────────────────────────────┤│
│                    Middleware Layer                        ││
├────────────────────────────────────────────────────────────┤│
│                                                            ││
│              ┌───────────────────────┐                     ││
│              │  Next.js Middleware   │                     ││
│              │                       │                     ││
│              │ - Route protection    │                     ││
│              │ - Auth check          │                     ││
│              │ - Redirects           │                     ││
│              └───────────┬───────────┘                     ││
│                          │                                 ││
├──────────────────────────┼─────────────────────────────────┤│
│                API Routes│                                 ││
├──────────────────────────┼─────────────────────────────────┤│
│                          │                                 ││
│  ┌───────────────────────┼───────────────────────────┐    ││
│  │  /api/v1/auth/        │                           │    ││
│  │                       ▼                           │    ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │    ││
│  │  │  login     │  │  logout    │  │  refresh   │ │    ││
│  │  └────────────┘  └────────────┘  └────────────┘ │    ││
│  │  ┌────────────┐  ┌────────────┐                 │    ││
│  │  │  register  │  │  me        │                 │    ││
│  │  └────────────┘  └────────────┘                 │    ││
│  │                                                  │    ││
│  │  - Set httpOnly cookies                         │────┘│
│  │  - Validate credentials                         │     │
│  │  - Generate JWT                                 │     │
│  └──────────────────────────────────────────────────┘     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Key Security Features

1. **httpOnly Cookies** 🔒
   - Tokens stored in cookies (not localStorage)
   - JavaScript cannot access tokens
   - Prevents XSS attacks

2. **Server-Side Middleware** 🛡️
   - Route protection happens on server
   - Cannot be bypassed by client
   - Instant redirects before page loads

3. **Token Expiry & Refresh** ⏰
   - Tokens expire after 7 days
   - Auto-refresh every 50 minutes
   - Graceful logout on failure

4. **State Persistence** 💾
   - User data in localStorage
   - Token in httpOnly cookie
   - Best of both worlds

5. **Security Headers** 📋
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin
