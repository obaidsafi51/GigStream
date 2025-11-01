"use client";

import { useEffect, useState } from "react";
import { DollarSign, Users, CheckCircle, TrendingUp } from "lucide-react";

interface QuickStat {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Platform Stats Header
 * 
 * Displays quick overview stats for platform admins:
 * - Total payouts
 * - Active workers
 * - Completed tasks
 * - Growth metrics
 */
export function PlatformStatsHeader() {
  const [stats, setStats] = useState<QuickStat[]>([
    {
      label: "Total Payouts",
      value: "$0.00",
      change: "+0%",
      changeType: "neutral",
      icon: DollarSign,
    },
    {
      label: "Active Workers",
      value: "0",
      change: "+0",
      changeType: "neutral",
      icon: Users,
    },
    {
      label: "Tasks Completed",
      value: "0",
      change: "+0%",
      changeType: "neutral",
      icon: CheckCircle,
    },
    {
      label: "This Week",
      value: "$0.00",
      change: "+0%",
      changeType: "neutral",
      icon: TrendingUp,
    },
  ]);

  // TODO: Fetch real stats from API
  useEffect(() => {
    // Mock data for now
    const mockStats: QuickStat[] = [
      {
        label: "Total Payouts",
        value: "$24,580.50",
        change: "+12.3%",
        changeType: "positive",
        icon: DollarSign,
      },
      {
        label: "Active Workers",
        value: "156",
        change: "+8",
        changeType: "positive",
        icon: Users,
      },
      {
        label: "Tasks Completed",
        value: "1,234",
        change: "+23.1%",
        changeType: "positive",
        icon: CheckCircle,
      },
      {
        label: "This Week",
        value: "$5,420.30",
        change: "+15.7%",
        changeType: "positive",
        icon: TrendingUp,
      },
    ];

    // Simulate API delay
    const timer = setTimeout(() => {
      setStats(mockStats);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 truncate">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <span
                        className={`text-xs font-medium ${
                          stat.changeType === "positive"
                            ? "text-green-600"
                            : stat.changeType === "negative"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
