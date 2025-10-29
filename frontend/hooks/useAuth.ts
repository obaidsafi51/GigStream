"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore, User } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

/**
 * Custom hook for authentication operations
 * 
 * Provides:
 * - Current user and auth status
 * - Login/logout functions
 * - Auto token refresh
 * - Protected route navigation
 */
export function useAuth() {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: loginStore,
    logout: logoutStore,
    updateUser,
    refreshToken,
    setLoading,
  } = useAuthStore();

  /**
   * Login function
   * Calls the login API and updates the store
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          loginStore(data.data.user, data.data.token);
          return { success: true, user: data.data.user };
        } else {
          return {
            success: false,
            message: data.message || "Login failed",
            errors: data.errors,
          };
        }
      } catch (error) {
        console.error("Login error:", error);
        return {
          success: false,
          message: "Network error. Please try again.",
        };
      } finally {
        setLoading(false);
      }
    },
    [loginStore, setLoading]
  );

  /**
   * Logout function
   * Clears auth state and redirects to login
   */
  const logout = useCallback(() => {
    logoutStore();
    router.push("/login");
  }, [logoutStore, router]);

  /**
   * Check authentication status
   * Useful for route guards
   */
  const checkAuth = useCallback(async () => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      // Verify token is still valid by calling /me endpoint
      const response = await fetch("/api/v1/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          updateUser(data.data);
          return true;
        }
      }

      // If verification fails, logout
      logoutStore();
      return false;
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    }
  }, [isAuthenticated, updateUser, logoutStore]);

  /**
   * Require authentication
   * Redirects to login if not authenticated
   */
  const requireAuth = useCallback(
    async (redirectTo: string = "/login") => {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return false;
      }

      const isValid = await checkAuth();
      if (!isValid) {
        router.push(redirectTo);
        return false;
      }

      return true;
    },
    [isAuthenticated, checkAuth, router]
  );

  /**
   * Auto-refresh token
   * Runs every 50 minutes (tokens typically expire in 60 minutes)
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes

    const interval = setInterval(() => {
      refreshToken();
    }, REFRESH_INTERVAL);

    // Also refresh on mount if authenticated
    refreshToken();

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken]);

  /**
   * Check auth status on mount
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      checkAuth();
    }
  }, []); // Only run once on mount

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,

    // Actions
    login,
    logout,
    updateUser,
    checkAuth,
    requireAuth,
    refreshToken,
  };
}

/**
 * Hook to get current user
 */
export function useUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook to check if authenticated
 */
export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Hook to check auth loading state
 */
export function useAuthLoading() {
  return useAuthStore((state) => state.isLoading);
}
