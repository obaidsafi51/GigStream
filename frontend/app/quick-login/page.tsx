"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export default function QuickLoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (role: "worker" | "platform") => {
    setLoading(true);
    
    // Create a mock user (for testing only)
    const mockUser = {
      id: "test-" + role,
      email: role === "worker" ? "alice@example.com" : "platform@example.com",
      name: role === "worker" ? "Alice Johnson" : "Platform Admin",
      role: role,
      walletAddress: "0x1234567890123456789012345678901234567890",
    };
    
    // Mock token
    const mockToken = "mock-jwt-token-" + Date.now();
    
    // Set auth store
    login(mockUser, mockToken);
    
    // Set cookie for middleware
    document.cookie = `auth_token=${mockToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    
    // Wait a bit for state to persist to localStorage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Redirect to appropriate dashboard
    const path = role === "platform" ? "/platform/dashboard" : "/dashboard";
    router.push(path);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Quick Test Login</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            Bypass backend authentication for testing
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={() => handleQuickLogin("worker")}
              disabled={loading}
              className="w-full"
              variant="default"
              size="lg"
            >
              Login as Worker (Alice)
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              View worker dashboard with earnings and tasks
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => handleQuickLogin("platform")}
              disabled={loading}
              className="w-full"
              variant="outline"
              size="lg"
            >
              Login as Platform
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              View platform analytics dashboard
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              This is a test page that bypasses authentication.
              <br />
              For real login with backend: <a href="/login" className="text-primary hover:underline">Use regular login</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
