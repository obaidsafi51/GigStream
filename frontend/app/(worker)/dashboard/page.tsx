"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import { EarningsCard } from "@/components/dashboard/EarningsCard";
import { ReputationCard } from "@/components/dashboard/ReputationCard";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real data from backend
  const [balance, setBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [reputation, setReputation] = useState({
    score: 0,
    level: "Starter",
    tasksCompleted: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch data in parallel for better performance
        const [reputationRes, tasksRes] = await Promise.allSettled([
          apiClient.getWorkerReputation(user.id),
          apiClient.getDemoTasks(),
        ]);

        // Handle reputation data
        if (reputationRes.status === 'fulfilled') {
          const repValue = reputationRes.value as any;
          if (repValue.success) {
            const repData = repValue.data;
            setReputation({
              score: Math.round((repData.score / 1000) * 100), // Convert 0-1000 to 0-100
              level: repData.rank || "Starter",
              tasksCompleted: repData.tasksCompleted || 0,
            });
          }
        }

        // Handle tasks data (for earnings calculation)
        if (tasksRes.status === 'fulfilled') {
          const tasksValue = tasksRes.value as any;
          if (tasksValue.success) {
            const tasks = tasksValue.data.tasks || [];
          
          // Filter tasks for current user
          const myTasks = tasks.filter((t: any) => t.workerId === user.id && t.status === 'completed');
          
          // Calculate total balance from all completed tasks
          const totalBalance = myTasks.reduce((sum: number, task: any) => {
            return sum + parseFloat(task.paidAmountUsdc || task.paymentAmountUsdc || '0');
          }, 0);
          setBalance(totalBalance);

          // Calculate today's earnings (tasks completed today)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTasks = myTasks.filter((t: any) => {
            const completedDate = new Date(t.completedAt);
            return completedDate >= today;
          });
          const todayTotal = todayTasks.reduce((sum: number, task: any) => {
            return sum + parseFloat(task.paidAmountUsdc || task.paymentAmountUsdc || '0');
          }, 0);
          setTodayEarnings(todayTotal);

          // Convert tasks to transactions format
          const taskTransactions = myTasks.slice(0, 5).map((task: any) => ({
            id: task.id,
            type: "payment" as const,
            amount: parseFloat(task.paidAmountUsdc || task.paymentAmountUsdc || '0'),
            description: task.title || task.description || "Task completed",
            timestamp: new Date(task.completedAt || task.createdAt),
            status: "completed" as const,
            txHash: null, // Will be populated if available from backend
          }));
          
          setTransactions(taskTransactions);
        }
      }

      } catch (err: any) {
        console.error('Dashboard data fetch error:', err);
        setError(err.message || 'Failed to load dashboard data');
        
        // Fallback to mock data on error
        setBalance(0);
        setTodayEarnings(0);
        setReputation({
          score: 50,
          level: "Starter",
          tasksCompleted: 0,
        });
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Polling: Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Welcome back, {user?.name || 'Worker'}!
        </h1>
        <p className="text-muted-foreground">Here's your earnings overview</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <EarningsCard 
            balance={balance} 
            todayEarnings={todayEarnings}
            isStreaming={false} // Will be determined by active task type
          />
        </div>
        <ReputationCard 
          score={reputation.score}
          level={reputation.level}
          tasksCompleted={reputation.tasksCompleted}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionList transactions={transactions} />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
