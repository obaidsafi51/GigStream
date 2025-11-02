"use client";

import { useEffect, useState } from "react";
import {
  AnalyticsCards,
  PaymentVolumeChart,
  TopWorkersTable,
  RecentTransactions,
} from "@/components/platform";

/**
 * Platform Dashboard Page
 *
 * Displays comprehensive analytics for platform administrators:
 * - Analytics cards (total payouts, workers, tasks, revenue)
 * - Payment volume chart (30-day trend)
 * - Top workers table (ranked by performance)
 * - Recent transactions list
 *
 * Features:
 * - Real-time updates every 30 seconds
 * - Client Component with state management
 * - Loading states and error handling
 */

interface DashboardData {
  analytics: {
    totalPayouts: string;
    totalTasks: number;
    activeWorkers: number;
    weeklyRevenue: string;
    payoutsChange?: string;
    tasksChange?: string;
    workersChange?: string;
    revenueChange?: string;
  };
  paymentVolume: Array<{
    date: string;
    amount: number;
    tasks: number;
  }>;
  topWorkers: Array<{
    id: string;
    name: string;
    walletAddress: string;
    reputation: number;
    tasksCompleted: number;
    totalEarned: string;
    completionRate: number;
    rank: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "payout" | "advance" | "repayment" | "stream_release";
    workerName: string;
    amount: string;
    status: "completed" | "pending" | "failed";
    txHash: string;
    createdAt: string;
    taskTitle?: string;
  }>;
}

export default function PlatformDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // For now, using mock data
      const mockData: DashboardData = {
        analytics: {
          totalPayouts: "12,345.67",
          totalTasks: 542,
          activeWorkers: 87,
          weeklyRevenue: "1,234.56",
          payoutsChange: "+12.5%",
          tasksChange: "+23",
          workersChange: "+5",
          revenueChange: "+8.3%",
        },
        paymentVolume: generateMockPaymentData(),
        topWorkers: generateMockTopWorkers(),
        recentTransactions: generateMockTransactions(),
      };

      setData(mockData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set up 30-second refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Loading analytics...</p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Dashboard
          </h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error || "Failed to load data"}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time analytics and performance metrics
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Auto-refreshes every 30 seconds
        </div>
      </div>

      {/* Analytics Cards */}
      <AnalyticsCards data={data.analytics} />

      {/* Charts and Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Volume Chart */}
        <div className="lg:col-span-2">
          <PaymentVolumeChart data={data.paymentVolume} />
        </div>

        {/* Top Workers Table */}
        <div className="lg:col-span-2">
          <TopWorkersTable workers={data.topWorkers} />
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <RecentTransactions
            transactions={data.recentTransactions}
            explorerUrl="https://testnet.arcscan.app"
          />
        </div>
      </div>
    </div>
  );
}

// Mock data generators (to be replaced with real API calls)

function generateMockPaymentData() {
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split("T")[0],
      amount: Math.floor(Math.random() * 500) + 200,
      tasks: Math.floor(Math.random() * 30) + 10,
    });
  }
  
  return data;
}

function generateMockTopWorkers() {
  const names = [
    "Alice Johnson",
    "Bob Smith",
    "Carol Williams",
    "David Brown",
    "Eve Davis",
    "Frank Miller",
    "Grace Wilson",
    "Henry Moore",
  ];

  return names.map((name, index) => ({
    id: `worker-${index + 1}`,
    name,
    walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
    reputation: 900 - index * 50,
    tasksCompleted: 150 - index * 15,
    totalEarned: (5000 - index * 500).toFixed(2),
    completionRate: 98 - index * 2,
    rank: index + 1,
  }));
}

function generateMockTransactions() {
  const workers = [
    "Alice Johnson",
    "Bob Smith",
    "Carol Williams",
    "David Brown",
    "Eve Davis",
  ];
  const types: Array<"payout" | "advance" | "repayment" | "stream_release"> = [
    "payout",
    "advance",
    "repayment",
    "stream_release",
  ];
  const statuses: Array<"completed" | "pending" | "failed"> = [
    "completed",
    "completed",
    "completed",
    "pending",
  ];

  return Array.from({ length: 10 }, (_, i) => {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - i * 15);

    return {
      id: `tx-${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      workerName: workers[Math.floor(Math.random() * workers.length)],
      amount: (Math.random() * 200 + 50).toFixed(2),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      createdAt: createdAt.toISOString(),
      taskTitle: `Task #${Math.floor(Math.random() * 1000)}`,
    };
  });
}
