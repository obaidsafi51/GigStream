"use client";

import { useState } from "react";
import { EarningsCard } from "../../src/components/dashboard/EarningsCard";
import { ReputationCard } from "../../src/components/dashboard/ReputationCard";
import { TransactionList } from "../../src/components/dashboard/TransactionList";
import { QuickActions } from "../../src/components/dashboard/QuickActions";

const Dashboard = () => {
  // Mock data - will be replaced with real API calls
  const [balance] = useState(1247.89);
  const [todayEarnings] = useState(142.50);
  const [reputation] = useState({
    score: 87,
    level: "Excellent",
    tasksCompleted: 256,
  });

  const [transactions] = useState([
    {
      id: "1",
      type: "payment" as const,
      amount: 25.50,
      description: "Delivery completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: "completed" as const,
    },
    {
      id: "2",
      type: "payment" as const,
      amount: 42.00,
      description: "Task #1234 completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      status: "completed" as const,
    },
    {
      id: "3",
      type: "advance" as const,
      amount: 100.00,
      description: "Cash advance",
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      status: "pending" as const,
    },
    {
      id: "4",
      type: "payment" as const,
      amount: 75.00,
      description: "Service completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      status: "completed" as const,
    },
  ]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Worker!</h1>
        <p className="text-muted-foreground">Here's your earnings overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <EarningsCard 
            balance={balance} 
            todayEarnings={todayEarnings}
            isStreaming={true}
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
    </>
  );
};

export default Dashboard;
