"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CheckCircle, TrendingUp } from "lucide-react";

interface AnalyticsSummary {
  totalPayouts: string;
  totalTasks: number;
  activeWorkers: number;
  weeklyRevenue: string;
  payoutsChange?: string;
  tasksChange?: string;
  workersChange?: string;
  revenueChange?: string;
}

interface AnalyticsCardsProps {
  data: AnalyticsSummary;
}

/**
 * Analytics Cards Component
 * 
 * Displays key metrics for platform administrators:
 * - Total payouts (all-time)
 * - Total tasks completed
 * - Active workers count
 * - Weekly revenue
 * 
 * Each card shows the main value and a change indicator
 */
export function AnalyticsCards({ data }: AnalyticsCardsProps) {
  const cards = [
    {
      title: "Total Payouts",
      value: `$${data.totalPayouts}`,
      change: data.payoutsChange,
      icon: DollarSign,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      title: "Active Workers",
      value: data.activeWorkers.toLocaleString(),
      change: data.workersChange,
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      title: "Tasks Completed",
      value: data.totalTasks.toLocaleString(),
      change: data.tasksChange,
      icon: CheckCircle,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      title: "Weekly Revenue",
      value: `$${data.weeklyRevenue}`,
      change: data.revenueChange,
      icon: TrendingUp,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.iconBg}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            {card.change && (
              <p className="text-xs text-gray-500 mt-1">
                <span
                  className={
                    card.change.startsWith("+")
                      ? "text-green-600"
                      : card.change.startsWith("-")
                      ? "text-red-600"
                      : "text-gray-600"
                  }
                >
                  {card.change}
                </span>{" "}
                from last period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
