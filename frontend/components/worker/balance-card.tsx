                                                                                                                                                                                                "use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CountUp from "react-countup";
import { useRealtimeBalance } from "@/hooks/use-realtime-balance";

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
  const [showBalanceChange, setShowBalanceChange] = useState(false);

  // Use the new real-time balance hook
  const { balance, isLoading, error } = useRealtimeBalance({
    initialBalance,
    onBalanceChange: (newBalance, oldBalance) => {
      console.log(`Balance changed from $${oldBalance} to $${newBalance}`);
      // Show a subtle animation when balance changes
      setShowBalanceChange(true);
      setTimeout(() => setShowBalanceChange(false), 2000);
    },
    onError: (error) => {
      console.error("Balance update error:", error);
    },
  });

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Current Balance
          </h3>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {error && (
              <div
                className="h-4 w-4 text-red-500"
                title="Connection error - retrying..."
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div
            className={`text-4xl font-bold text-gray-900 dark:text-white transition-all duration-300 ${
              showBalanceChange ? "scale-105 text-green-600 dark:text-green-400" : ""
            }`}
          >
            <CountUp
              end={balance}
              decimals={2}
              prefix="$"
              duration={0.8}
              preserveValue
              separator=","
              useEasing={true}
              easingFn={(t, b, c, d) => {
                // Ease out cubic for smooth deceleration
                return c * ((t = t / d - 1) * t * t + 1) + b;
              }}
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
