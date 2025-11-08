"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  FileText,
  CreditCard,
  X,
} from "lucide-react";
import { useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/platform/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Workers",
    href: "/platform/workers",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/platform/analytics",
    icon: BarChart3,
  },
  {
    label: "Transactions",
    href: "/platform/transactions",
    icon: CreditCard,
  },
  {
    label: "Reports",
    href: "/platform/reports",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/platform/settings",
    icon: Settings,
  },
];

interface PlatformMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Platform Mobile Sidebar
 * 
 * Features:
 * - Slide-out navigation menu for mobile/tablet
 * - Backdrop overlay
 * - Close on navigation
 * - Animated transitions
 */
export function PlatformMobileSidebar({ isOpen, onClose }: PlatformMobileSidebarProps) {
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden animate-in slide-in-from-left duration-300">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Platform Admin
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer Info */}
          <div className="border-t p-4">
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Platform Status
              </h3>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-xs font-medium text-green-700">
                  All Systems Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
