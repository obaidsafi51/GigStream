"use client";

import { useAuthStore, User } from "../stores/auth-store";
import { useEffect } from "react";

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

/**
 * Custom hook for authentication
 * 
 * Provides access to auth state and actions
 * Automatically refreshes token on mount if authenticated
 */
export function useAuth(): UseAuthReturn {
  const authStore = useAuthStore();

  // Auto-refresh token on mount if authenticated
  useEffect(() => {
    if (authStore.isAuthenticated && !authStore.isLoading) {
      // Set up token refresh interval (every 23 hours)
      const refreshInterval = setInterval(() => {
        authStore.refreshToken();
      }, 23 * 60 * 60 * 1000); // 23 hours

      // Refresh immediately if needed
      authStore.refreshToken();

      return () => clearInterval(refreshInterval);
    }
  }, [authStore.isAuthenticated, authStore.isLoading]);

  return {
    user: authStore.user,
    token: authStore.token,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    login: authStore.login,
    logout: authStore.logout,
    updateUser: authStore.updateUser,
    refreshToken: authStore.refreshToken,
  };
}
