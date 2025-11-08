"use client";

import { Card, CardContent } from "../ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EarningsData {
  day: string;
  earnings: number;
}

interface EarningsChartProps {
  data: EarningsData[];
}

export function EarningsChart({ data }: EarningsChartProps) {
  // Calculate total and average
  const totalEarnings = data.reduce((sum, item) => sum + item.earnings, 0);
  const avgEarnings = totalEarnings / data.length;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Weekly Earnings
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Avg: ${avgEarnings.toFixed(2)}/day
            </p>
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              7 Days
            </button>
            <button className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              30 Days
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="day"
                stroke="#9ca3af"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
                labelStyle={{ color: "#374151", fontWeight: "600" }}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorEarnings)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Daily Earnings
            </span>
          </div>
          <span className="text-gray-500 dark:text-gray-400">
            Last updated: just now
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
