"use client";

import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "./ui";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wraps the app to:
 * - Set up token refresh
 * - Handle auth loading state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading, refreshToken } = useAuth();

  useEffect(() => {
    // Set up token refresh every 23 hours
    const interval = setInterval(() => {
      refreshToken();
    }, 23 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
