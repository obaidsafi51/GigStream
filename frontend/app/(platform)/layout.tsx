"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/shared/header";
import { PlatformSidebar } from "@/components/platform/sidebar";
import { PlatformMobileSidebar } from "@/components/platform/mobile-sidebar";
import { PlatformStatsHeader } from "@/components/platform/stats-header";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";

interface PlatformLayoutProps {
  children: ReactNode;
}

/**
 * Platform Admin Layout
 * 
 * Features:
 * - Admin-specific navigation sidebar
 * - Quick stats in header
 * - Responsive design with mobile menu
 * - Protected route (platform users only)
 */
export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect non-platform users
  if (isAuthenticated && user?.role !== "platform") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <Header />
      
      {/* Platform Stats Header - Quick overview */}
      <PlatformStatsHeader />

      {/* Mobile Menu Button */}
      <div className="lg:hidden sticky top-16 z-40 border-b bg-white px-4 py-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          Menu
        </button>
      </div>

      {/* Mobile Sidebar */}
      <PlatformMobileSidebar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main Content Area with Sidebar */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <PlatformSidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
