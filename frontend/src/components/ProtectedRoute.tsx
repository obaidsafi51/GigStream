"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "worker" | "platform" | "admin";
  redirectTo?: string;
}

export const ProtectedRoute = ({
  children,
  requireRole,
  redirectTo = "/login",
}: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, setLoading } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsHydrated(true);
    
    // Give Zustand persist middleware time to rehydrate from localStorage
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [setLoading]);

  useEffect(() => {
    // Only run checks after hydration
    if (!isHydrated) return;

    if (!isLoading) {
      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Check role if required
      if (requireRole && user?.role !== requireRole) {
        // ALWAYS redirect to worker dashboard (since we only support workers)
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, requireRole, redirectTo, router, isHydrated]);

  // Show loading during hydration or auth check
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Check role access
  if (requireRole && user?.role !== requireRole) {
    return null;
  }

  return <>{children}</>;
};
