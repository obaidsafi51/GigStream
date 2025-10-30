"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CountUp from "react-countup";

interface BalanceCardProps {
  initialBalance: number;
  todayEarnings: {
    amount: number;
    change: number;
    changePercent: number;
  };
}

export function BalanceCard({
  initialBalance,
  todayEarnings,
}: BalanceCardProps) {
  // Real-time balance updates with polling
  const [balance, setBalance] = useState(initialBalance);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval = 2000; // 2 seconds initial polling
    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      // Skip polling if tab is not visible
      if (document.hidden) {
        timeoutId = setTimeout(poll, 5000);
        return;
      }

      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/v1/workers/balance`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          setBalance(data.balanceUsdc || initialBalance);
          interval = 2000; // Reset on success
        } else {
          interval = Math.min(interval * 1.5, 10000); // Exponential backoff to max 10s
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        interval = Math.min(interval * 1.5, 10000); // Exponential backoff
      } finally {
        setIsLoading(false);
      }

      if (isActive) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    // Start polling after component mount
    poll();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [initialBalance]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Current Balance
          </h3>
          {isLoading && (
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <div className="mb-6">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            <CountUp
              end={balance}
              decimals={2}
              prefix="$"
              duration={0.5}
              preserveValue
              separator=","
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
              USDC
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Today's Earnings
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">
              ${todayEarnings.amount.toFixed(2)}
            </span>
            {todayEarnings.change > 0 && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                ${todayEarnings.change.toFixed(2)} (
                {todayEarnings.changePercent.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
