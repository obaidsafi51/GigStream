"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";

/**
 * User Menu Component
 * 
 * Displays user info and logout button
 * Can be used in header/navbar
 */
export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={logout}
      >
        Logout
      </Button>
    </div>
  );
}
