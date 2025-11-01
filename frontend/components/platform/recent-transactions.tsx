"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: "payout" | "advance" | "repayment" | "stream_release";
  workerName: string;
  amount: string;
  status: "completed" | "pending" | "failed";
  txHash: string;
  createdAt: string;
  taskTitle?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  explorerUrl?: string;
}

/**
 * Recent Transactions Component
 * 
 * Displays recent payment transactions on the platform.
 * Shows transaction type, worker, amount, status, and blockchain link.
 * 
 * Features:
 * - Transaction type badges with color coding
 * - Status indicators
 * - Links to blockchain explorer
 * - Relative time display
 * - Transaction details on hover
 */
export function RecentTransactions({
  transactions,
  explorerUrl = "https://testnet.arcscan.app",
}: RecentTransactionsProps) {
  // Get transaction type label and color
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "payout":
        return {
          label: "Payout",
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "advance":
        return {
          label: "Advance",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "repayment":
        return {
          label: "Repayment",
          className: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "stream_release":
        return {
          label: "Stream",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        };
      default:
        return {
          label: type,
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  // Get status badge config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          label: "Completed",
          className: "bg-green-50 text-green-700 border-green-200",
        };
      case "pending":
        return {
          label: "Pending",
          className: "bg-yellow-50 text-yellow-700 border-yellow-200",
        };
      case "failed":
        return {
          label: "Failed",
          className: "bg-red-50 text-red-700 border-red-200",
        };
      default:
        return {
          label: status,
          className: "bg-gray-50 text-gray-700 border-gray-200",
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Truncate hash
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions yet. Transactions will appear here once workers complete tasks.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const typeConfig = getTypeConfig(tx.type);
              const statusConfig = getStatusConfig(tx.status);
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Type Badge */}
                    <Badge variant="outline" className={typeConfig.className}>
                      {typeConfig.label}
                    </Badge>

                    {/* Worker & Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {tx.workerName}
                      </div>
                      {tx.taskTitle && (
                        <div className="text-xs text-gray-500 truncate">
                          {tx.taskTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount & Status */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${tx.amount}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(tx.createdAt)}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`${statusConfig.className} min-w-[85px] justify-center`}
                    >
                      {statusConfig.label}
                    </Badge>

                    {/* Blockchain Link */}
                    {tx.txHash && tx.status === "completed" && (
                      <a
                        href={`${explorerUrl}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title={`View on explorer: ${truncateHash(tx.txHash)}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
