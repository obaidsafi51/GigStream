import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: "worker" | "platform";
      walletAddress?: string;
    };
    token: string;
  };
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for httpOnly cookies
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        result.message || "Login failed",
        result.errors
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Network error. Please try again.");
  }
}

/**
 * Register new user
 */
export async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for httpOnly cookies
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        result.message || "Registration failed",
        result.errors
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Network error. Please try again.");
  }
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
}

/**
 * Get current user (verifies token)
 */
export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data?.user || null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}
