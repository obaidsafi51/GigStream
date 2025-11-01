"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award } from "lucide-react";

interface TopWorker {
  id: string;
  name: string;
  walletAddress: string;
  reputation: number;
  tasksCompleted: number;
  totalEarned: string;
  completionRate: number;
  rank: number;
}

interface TopWorkersTableProps {
  workers: TopWorker[];
}

/**
 * Top Workers Table Component
 * 
 * Displays the top-performing workers on the platform.
 * Shows reputation score, tasks completed, and earnings.
 * 
 * Features:
 * - Ranked list with medals for top 3
 * - Reputation score badges with color coding
 * - Completion rate percentage
 * - Total earnings
 * - Responsive table design
 */
export function TopWorkersTable({ workers }: TopWorkersTableProps) {
  // Get reputation badge color
  const getReputationColor = (score: number): string => {
    if (score >= 800) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 600) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 400) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Get rank icon/medal
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-gray-500 font-semibold">#{rank}</span>;
    }
  };

  // Truncate wallet address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Workers
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No workers yet. Start inviting workers to your platform!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Reputation
                  </th>
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="pb-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                    Total Earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3">
                      <div className="flex items-center justify-center w-10">
                        {getRankBadge(worker.rank)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {worker.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {truncateAddress(worker.walletAddress)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={getReputationColor(worker.reputation)}
                      >
                        {worker.reputation}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {worker.tasksCompleted}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${worker.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {worker.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-semibold text-gray-900">
                        ${worker.totalEarned}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
