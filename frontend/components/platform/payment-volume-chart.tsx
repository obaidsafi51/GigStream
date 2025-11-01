"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PaymentDataPoint {
  date: string;
  amount: number;
  tasks: number;
}

interface PaymentVolumeChartProps {
  data: PaymentDataPoint[];
}

/**
 * Payment Volume Chart Component
 * 
 * Displays a line chart showing payment volume over the last 30 days.
 * Shows both payment amounts and number of tasks completed.
 * 
 * Features:
 * - Dual-axis chart (amount in USD, task count)
 * - Responsive design
 * - Interactive tooltips
 * - Date formatting
 */
export function PaymentVolumeChart({ data }: PaymentVolumeChartProps) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format date for display (e.g., "Oct 25")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {formatDate(label)}
          </p>
          <p className="text-sm text-blue-600">
            Amount: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-purple-600">
            Tasks: {payload[1].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Volume (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#a855f7"
                style={{ fontSize: "12px" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "14px" }}
                iconType="line"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
                name="Payment Amount ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tasks"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: "#a855f7", r: 4 }}
                activeDot={{ r: 6 }}
                name="Tasks Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
