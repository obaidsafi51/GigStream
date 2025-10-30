"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";
import { UserMenu } from "@/components/user-menu";

/**
 * Navigation item type
 */
interface NavItem {
  label: string;
  href: string;
  roles?: ("worker" | "platform" | "admin")[];
}

/**
 * Navigation items based on user role
 */
const workerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tasks", href: "/tasks" },
  { label: "History", href: "/history" },
  { label: "Advance", href: "/advance" },
  { label: "Reputation", href: "/reputation" },
];

const platformNavItems: NavItem[] = [
  { label: "Dashboard", href: "/platform/dashboard" },
  { label: "Workers", href: "/platform/workers" },
  { label: "Analytics", href: "/platform/analytics" },
];

const demoNavItems: NavItem[] = [
  { label: "Simulator", href: "/demo/simulator" },
];

/**
 * Get navigation items based on user role and current path
 */
function getNavItems(role?: string, pathname?: string): NavItem[] {
  if (pathname?.startsWith("/demo")) {
    return demoNavItems;
  }
  
  if (role === "platform") {
    return platformNavItems;
  }
  
  if (role === "worker") {
    return workerNavItems;
  }
  
  return [];
}

/**
 * Header Component
 * 
 * Features:
 * - Route-specific navigation items
 * - User profile dropdown
 * - Logout button
 * - Responsive mobile menu
 * - Active route highlighting
 */
export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show header on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  const navItems = getNavItems(user?.role, pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link 
          href={isAuthenticated ? (user?.role === "platform" ? "/platform/dashboard" : "/dashboard") : "/"} 
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <span className="text-lg font-bold text-white">G</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            GigStream
          </span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && navItems.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        {isAuthenticated && (
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}
      </nav>

      {/* Mobile Menu */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {/* Mobile Navigation Items */}
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile User Info */}
            <div className="pt-4 border-t">
              <div className="px-4 py-2">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                {user?.role && (
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {user.role} Account
                  </p>
                )}
              </div>
              <div className="mt-2">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
