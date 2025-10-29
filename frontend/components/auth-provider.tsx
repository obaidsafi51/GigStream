"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wraps the app to:
 * - Check initial auth state
 * - Set up token refresh
 * - Handle auth loading state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading, checkAuth } = useAuth();

  useEffect(() => {
    // Check auth status on mount
    checkAuth();
  }, [checkAuth]);

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
