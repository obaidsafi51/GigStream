# Authentication Pages

Secure authentication pages for GigStream using React Hook Form and Zod validation.

## 📁 Structure

```
app/(auth)/
├── layout.tsx          # Auth pages layout
├── page.tsx            # Redirect to login
├── login/
│   └── page.tsx        # Login page
└── register/
    └── page.tsx        # Registration page
```

## 🔐 Features

### Login Page (`/login`)
- Email and password authentication
- Form validation with Zod
- Loading states
- Error handling
- Remember me option
- Forgot password link
- Redirect to register page

### Register Page (`/register`)
- Full name, email, and password fields
- Password confirmation
- Role selection (Worker/Platform)
- Strong password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Terms of service checkbox
- Automatic wallet creation for workers
- Redirect to login page

## 🛠️ Implementation Details

### Form Validation

Using `react-hook-form` with `zod` for type-safe validation:

```typescript
// lib/validations/auth.ts
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
```

### API Integration

Centralized API functions in `lib/api/auth.ts`:

```typescript
export async function loginUser(data: LoginInput): Promise<AuthResponse>
export async function registerUser(data: RegisterInput): Promise<AuthResponse>
export async function logoutUser(): Promise<void>
export async function getCurrentUser(): Promise<User | null>
```

### Cookie-Based Authentication

- JWT tokens stored in **httpOnly cookies** (secure)
- Credentials sent with `credentials: "include"`
- Server handles token management
- No client-side token storage (XSS protection)

### Error Handling

- Field-level validation errors
- API error responses
- Network error handling
- User-friendly toast notifications

## 🔄 Authentication Flow

### Registration Flow

1. User fills registration form
2. Client validates with Zod schema
3. API call to `POST /api/v1/auth/register`
4. Backend:
   - Validates input
   - Hashes password
   - Creates user record
   - Creates wallet (for workers)
   - Generates JWT
   - Sets httpOnly cookie
5. Client receives response
6. Redirects to appropriate dashboard

### Login Flow

1. User fills login form
2. Client validates with Zod schema
3. API call to `POST /api/v1/auth/login`
4. Backend:
   - Validates credentials
   - Generates JWT
   - Sets httpOnly cookie
5. Client receives response
6. Redirects to appropriate dashboard

### Role-Based Redirects

- **Workers**: `/dashboard` (worker dashboard)
- **Platforms**: `/platform/dashboard` (platform admin)

## 📝 Validation Rules

### Login
- Email: Valid email format
- Password: Minimum 8 characters

### Registration
- Name: 2-100 characters
- Email: Valid email format
- Password: 
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Confirm Password: Must match password
- Role: Either "worker" or "platform"

## 🎨 UI Components Used

- `Card` - Page container
- `Input` - Form inputs with validation
- `Select` - Role selector
- `Button` - Submit buttons with loading states
- `Toast` - Success/error notifications

## 🔒 Security Features

1. **Password Hashing**: Passwords hashed on server (bcrypt)
2. **HttpOnly Cookies**: JWT stored securely, not accessible to JavaScript
3. **HTTPS Required**: Production requires HTTPS
4. **CSRF Protection**: Credentials include mode
5. **Input Validation**: Both client and server-side
6. **Rate Limiting**: Server-side rate limiting (backend)

## 🚀 Usage

### Navigate to Login
```
http://localhost:3000/login
```

### Navigate to Register
```
http://localhost:3000/register
```

### Test Credentials (when backend is ready)
- Will be provided by backend team

## 🔗 API Endpoints

Expected backend endpoints:

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

## ⚠️ Important Notes

1. **Backend Required**: These pages require a working backend API
2. **Environment Variable**: Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
3. **CORS**: Backend must allow credentials from frontend origin
4. **Cookies**: Backend must set httpOnly cookies correctly

## 🧪 Testing

To test without backend:
1. Mock API responses in `lib/api/auth.ts`
2. Add success/error states
3. Test form validation
4. Test loading states

## 📋 Next Steps

After authentication is complete:
- Task 6.4: Auth Store & Middleware
- Task 6.5: Layout Components
- Protected routes implementation
- Token refresh logic
