import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * User type definition
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: "worker" | "platform" | "admin";
  walletAddress?: string;
  createdAt?: string;
}

/**
 * Auth state interface
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth actions interface
 */
interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  clearAuth: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  refreshToken: () => Promise<void>;
}

/**
 * Auth store type
 */
export type AuthStore = AuthState & AuthActions;

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false, // Set to false, will be handled by component hydration
};

/**
 * Auth Store using Zustand
 * 
 * Features:
 * - Persist auth state to localStorage
 * - Token management
 * - User profile management
 * - Auto-refresh token logic
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set user data
       */
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      /**
       * Set authentication token
       */
      setToken: (token) =>
        set({
          token,
        }),

      /**
       * Login user
       */
      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }),

      /**
       * Logout user
       */
      logout: () => {
        // Clear auth state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Clear auth_token cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }

        // Call logout API to clear httpOnly cookies
        // Only call if fetch is available (not in test cleanup)
        if (typeof fetch !== 'undefined') {
          fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "include",
          }).catch((error) => {
            console.error("Logout API error:", error);
          });
        }
      },

      /**
       * Clear auth (alias for logout for backward compatibility)
       */
      clearAuth: () => {
        get().logout();
      },

      /**
       * Update user profile data
       */
      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...userData,
            },
          });
        }
      },

      /**
       * Set loading state
       */
      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),

      /**
       * Refresh authentication token
       * This should be called periodically to keep the session alive
       */
      refreshToken: async () => {
        try {
          const response = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              set({
                user: data.data.user,
                token: data.data.token,
                isAuthenticated: true,
              });
            }
          } else {
            // If refresh fails, logout
            get().logout();
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          // On error, logout to be safe
          get().logout();
        }
      },
    }),
    {
      name: "auth-storage", // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, set loading to false
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);

/**
 * Selector hooks for specific auth state
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
