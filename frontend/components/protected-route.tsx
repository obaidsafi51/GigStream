"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "worker" | "platform" | "admin";
  redirectTo?: string;
}

/**
 * Protected Route Component
 * 
 * Wraps pages that require authentication
 * Redirects to login if not authenticated
 * Can also enforce role-based access
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Check role if required
      if (requiredRole && user?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on user role
        const roleDashboard = user?.role === "worker" 
          ? "/dashboard" 
          : "/platform/dashboard";
        router.push(roleDashboard);
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Check role access
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
