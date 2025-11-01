"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  FileText,
  CreditCard,
} from "lucide-react";

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

/**
 * Platform Admin Sidebar
 * 
 * Features:
 * - Navigation menu with icons
 * - Active route highlighting
 * - Responsive design
 */
export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-20 space-y-2">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 px-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Platform Admin
        </h2>
        <nav className="space-y-1">
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
        </nav>
      </div>

      {/* Quick Info Card */}
      <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Platform Status
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Active Workers</span>
            <span className="font-semibold text-gray-900">--</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pending Tasks</span>
            <span className="font-semibold text-gray-900">--</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">System Status</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-green-700">Online</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
