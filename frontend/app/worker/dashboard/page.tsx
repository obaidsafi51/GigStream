import { Suspense } from "react";
import { BalanceCard } from "@/components/worker/balance-card";
import { EarningsChart } from "@/components/worker/earnings-chart";
import { TaskList } from "@/components/worker/task-list";
import { ReputationCard } from "@/components/worker/reputation-card";
import { QuickActionsCard } from "@/components/worker/quick-actions-card";
import { redirect } from "next/navigation";
import { TaskListSkeleton } from "@/components/worker/skeletons";

// Server Component - fetches initial data
async function getDashboardData(workerId: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/v1/workers/${workerId}/dashboard`, {
      cache: "no-store", // Always fresh data
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // Return mock data for development
      return getMockDashboardData();
    }

    return res.json();
  } catch (error) {
    // Return mock data if API fails
    return getMockDashboardData();
  }
}

// Mock data for development/demo
function getMockDashboardData() {
  return {
    balance: 1250.75,
    todayEarnings: {
      amount: 85.50,
      change: 12.30,
      changePercent: 16.8,
    },
    weeklyEarnings: [
      { day: "Mon", earnings: 120.50 },
      { day: "Tue", earnings: 95.30 },
      { day: "Wed", earnings: 145.75 },
      { day: "Thu", earnings: 110.20 },
      { day: "Fri", earnings: 135.60 },
      { day: "Sat", earnings: 89.40 },
      { day: "Sun", earnings: 85.50 },
    ],
    activeTasks: [
      {
        id: "1",
        title: "Food Delivery - Downtown",
        amount: 12.50,
        status: "active",
        progress: 75,
        timeRemaining: "15 mins",
      },
      {
        id: "2",
        title: "Package Pickup",
        amount: 8.00,
        status: "pending",
        progress: 0,
        timeRemaining: "30 mins",
      },
      {
        id: "3",
        title: "Grocery Delivery",
        amount: 15.75,
        status: "streaming",
        progress: 45,
        timeRemaining: "2 hours",
      },
    ],
    reputation: {
      score: 850,
      maxScore: 1000,
      rank: "Gold",
      tasksCompleted: 247,
      completionRate: 98.5,
      avgRating: 4.8,
      badges: [
        { name: "Fast Earner", icon: "⚡", earned: true },
        { name: "Reliable", icon: "🎯", earned: true },
        { name: "Top Rated", icon: "⭐", earned: true },
        { name: "Speedster", icon: "🚀", earned: false },
      ],
    },
  };
}

export default async function WorkerDashboard() {
  // TODO: Add proper authentication check
  // For now, use mock user ID
  const mockUserId = "worker-demo-1";

  const data = await getDashboardData(mockUserId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's your earnings overview.
          </p>
        </div>

        {/* Stats Grid - Client components for real-time updates */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <BalanceCard
            initialBalance={data.balance}
            todayEarnings={data.todayEarnings}
          />
          <QuickActionsCard />
        </div>

        {/* Chart */}
        <EarningsChart data={data.weeklyEarnings} />

        {/* Tasks & Reputation */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          <Suspense fallback={<TaskListSkeleton />}>
            <TaskList initialTasks={data.activeTasks} />
          </Suspense>
          <ReputationCard reputation={data.reputation} />
        </div>
      </div>
    </div>
  );
}
