"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Transaction interface based on database schema
interface Transaction {
  id: string;
  date: string;
  type: "payout" | "advance" | "repayment" | "fee";
  amount: number;
  fee: number;
  status: "pending" | "processing" | "completed" | "failed";
  taskTitle?: string;
  platform?: string;
  txHash?: string;
  explorerUrl?: string;
  circleId?: string;
  confirmations?: number;
}

// Mock data for transaction history
function getMockTransactions(): Transaction[] {
  const baseUrl = process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://explorer.circle.com/arc-testnet";
  
  return [
    {
      id: "1",
      date: "2025-10-31T14:30:00Z",
      type: "payout",
      amount: 12.50,
      fee: 0.25,
      status: "completed",
      taskTitle: "Food Delivery - Downtown",
      platform: "DeliveryApp",
      txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      explorerUrl: `${baseUrl}/tx/0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890`,
      circleId: "circle_tx_001",
      confirmations: 12,
    },
    {
      id: "2",
      date: "2025-10-31T12:15:00Z",
      type: "payout",
      amount: 8.00,
      fee: 0.16,
      status: "completed",
      taskTitle: "Package Pickup",
      platform: "LogisticsHub",
      txHash: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      explorerUrl: `${baseUrl}/tx/0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab`,
      circleId: "circle_tx_002",
      confirmations: 15,
    },
    {
      id: "3",
      date: "2025-10-31T10:00:00Z",
      type: "advance",
      amount: 50.00,
      fee: 1.00,
      status: "completed",
      txHash: "0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      explorerUrl: `${baseUrl}/tx/0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd`,
      circleId: "circle_tx_003",
      confirmations: 20,
    },
    {
      id: "4",
      date: "2025-10-30T16:45:00Z",
      type: "payout",
      amount: 15.75,
      fee: 0.32,
      status: "completed",
      taskTitle: "Grocery Delivery",
      platform: "GroceryGo",
      txHash: "0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      explorerUrl: `${baseUrl}/tx/0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`,
      circleId: "circle_tx_004",
      confirmations: 18,
    },
    {
      id: "5",
      date: "2025-10-30T14:20:00Z",
      type: "repayment",
      amount: 10.00,
      fee: 0.00,
      status: "completed",
      txHash: "0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      explorerUrl: `${baseUrl}/tx/0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12`,
      circleId: "circle_tx_005",
      confirmations: 25,
    },
    {
      id: "6",
      date: "2025-10-30T11:00:00Z",
      type: "payout",
      amount: 20.00,
      fee: 0.40,
      status: "completed",
      taskTitle: "Document Courier",
      platform: "CourierPro",
      txHash: "0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
      explorerUrl: `${baseUrl}/tx/0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234`,
      circleId: "circle_tx_006",
      confirmations: 30,
    },
    {
      id: "7",
      date: "2025-10-29T15:30:00Z",
      type: "payout",
      amount: 18.50,
      fee: 0.37,
      status: "completed",
      taskTitle: "Flower Delivery",
      platform: "BloomDelivery",
      txHash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      explorerUrl: `${baseUrl}/tx/0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456`,
      circleId: "circle_tx_007",
      confirmations: 35,
    },
    {
      id: "8",
      date: "2025-10-29T13:00:00Z",
      type: "repayment",
      amount: 10.00,
      fee: 0.00,
      status: "completed",
      txHash: "0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567",
      explorerUrl: `${baseUrl}/tx/0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567`,
      circleId: "circle_tx_008",
      confirmations: 40,
    },
    {
      id: "9",
      date: "2025-10-29T10:15:00Z",
      type: "payout",
      amount: 45.00,
      fee: 0.90,
      status: "completed",
      taskTitle: "Furniture Assembly Task",
      platform: "TaskRabbit",
      txHash: "0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      explorerUrl: `${baseUrl}/tx/0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678`,
      circleId: "circle_tx_009",
      confirmations: 45,
    },
    {
      id: "10",
      date: "2025-10-28T16:00:00Z",
      type: "payout",
      amount: 50.00,
      fee: 1.00,
      status: "completed",
      taskTitle: "Event Setup",
      platform: "EventHelp",
      txHash: "0x0abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789",
      explorerUrl: `${baseUrl}/tx/0x0abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789`,
      circleId: "circle_tx_010",
      confirmations: 50,
    },
    {
      id: "11",
      date: "2025-10-28T12:30:00Z",
      type: "payout",
      amount: 25.00,
      fee: 0.50,
      status: "processing",
      taskTitle: "Data Entry Work",
      platform: "RemoteWork",
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      explorerUrl: `${baseUrl}/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890`,
      circleId: "circle_tx_011",
      confirmations: 3,
    },
    {
      id: "12",
      date: "2025-10-27T14:00:00Z",
      type: "advance",
      amount: 100.00,
      fee: 2.00,
      status: "failed",
      txHash: "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901",
      circleId: "circle_tx_012",
      confirmations: 0,
    },
  ];
}

export default function TransactionHistoryPage() {
  const [transactions] = useState<Transaction[]>(getMockTransactions());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 8;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tx.taskTitle?.toLowerCase().includes(query) ||
          tx.platform?.toLowerCase().includes(query) ||
          tx.txHash?.toLowerCase().includes(query) ||
          tx.circleId?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * transactionsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);
  }, [filteredTransactions, currentPage]);

  // Reset to page 1 when filters change
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Amount", "Fee", "Net Amount", "Status", "Task", "Platform", "TX Hash"];
    const csvData = filteredTransactions.map((tx) => [
      new Date(tx.date).toLocaleString(),
      tx.type,
      tx.amount.toFixed(2),
      tx.fee.toFixed(2),
      (tx.amount - tx.fee).toFixed(2),
      tx.status,
      tx.taskTitle || "N/A",
      tx.platform || "N/A",
      tx.txHash || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `gigstream-transactions-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeColor = (type: Transaction["type"]) => {
    switch (type) {
      case "payout":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "advance":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "repayment":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "fee":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "payout":
        return "💰";
      case "advance":
        return "⚡";
      case "repayment":
        return "↩️";
      case "fee":
        return "🏦";
      default:
        return "💵";
    }
  };

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "processing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: Transaction["type"]) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getStatusLabel = (status: Transaction["status"]) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  // Transaction stats
  const stats = useMemo(() => {
    const completed = transactions.filter((tx) => tx.status === "completed");
    const totalReceived = completed
      .filter((tx) => tx.type === "payout" || tx.type === "advance")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalPaid = completed
      .filter((tx) => tx.type === "repayment")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalFees = completed.reduce((sum, tx) => sum + tx.fee, 0);

    return {
      total: transactions.length,
      payouts: transactions.filter((tx) => tx.type === "payout").length,
      advances: transactions.filter((tx) => tx.type === "advance").length,
      repayments: transactions.filter((tx) => tx.type === "repayment").length,
      totalReceived,
      totalPaid,
      totalFees,
      netEarnings: totalReceived - totalPaid - totalFees,
    };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Transaction History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View all your transactions and earnings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Transactions
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Received
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                ${stats.totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Fees
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                ${stats.totalFees.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Net Earnings
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                ${stats.netEarnings.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Export */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search by task, platform, or transaction hash..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full"
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select
                    value={typeFilter}
                    onChange={(e) => handleTypeFilterChange(e.target.value)}
                    className="w-full"
                  >
                    <option value="all">All Types</option>
                    <option value="payout">Payout</option>
                    <option value="advance">Advance</option>
                    <option value="repayment">Repayment</option>
                    <option value="fee">Fee</option>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleExportCSV}>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export to CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          {paginatedTransactions.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="p-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                    No transactions found
                  </p>
                  <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                    Try adjusting your filters or search query
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            paginatedTransactions.map((tx) => (
              <Card
                key={tx.id}
                className="shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left side - Transaction info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getTypeIcon(tx.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {tx.taskTitle || getTypeLabel(tx.type)}
                            </h3>
                            <Badge className={getTypeColor(tx.type)}>
                              {getTypeLabel(tx.type)}
                            </Badge>
                            <Badge className={getStatusColor(tx.status)}>
                              {getStatusLabel(tx.status)}
                            </Badge>
                          </div>
                          {tx.platform && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Platform: {tx.platform}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{formatDate(tx.date)}</span>
                        </div>
                        {tx.confirmations !== undefined && (
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>{tx.confirmations} confirmations</span>
                          </div>
                        )}
                      </div>

                      {tx.txHash && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            TX Hash:
                          </span>
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">
                            {truncateHash(tx.txHash)}
                          </code>
                          {tx.explorerUrl && (
                            <a
                              href={tx.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              View on Explorer
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - Amount details */}
                    <div className="flex flex-col items-start md:items-end gap-2 md:min-w-[180px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                      <div className="text-right w-full">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Amount
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${tx.amount.toFixed(2)}
                        </div>
                      </div>
                      {tx.fee > 0 && (
                        <div className="text-right w-full">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Fee: ${tx.fee.toFixed(2)}
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Net: ${(tx.amount - tx.fee).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * transactionsPerPage + 1} to{" "}
                  {Math.min(currentPage * transactionsPerPage, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first page, last page, current page, and adjacent pages
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        // Add ellipsis if there's a gap
                        const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
