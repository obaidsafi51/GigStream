"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import WorkerDetailModal from "@/components/platform/worker-detail-modal";

// Mock data - In production, this would come from API
const mockWorkers = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    reputation: 850,
    tasksCompleted: 124,
    totalEarned: 4520.50,
    status: "active",
    completionRate: 98.5,
    averageRating: 4.9,
    accountAgeDays: 45,
    lastActive: "2 hours ago",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@example.com",
    reputation: 720,
    tasksCompleted: 89,
    totalEarned: 3150.75,
    status: "active",
    completionRate: 95.2,
    averageRating: 4.7,
    accountAgeDays: 32,
    lastActive: "1 hour ago",
    walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    reputation: 650,
    tasksCompleted: 56,
    totalEarned: 1890.25,
    status: "active",
    completionRate: 92.8,
    averageRating: 4.6,
    accountAgeDays: 21,
    lastActive: "30 minutes ago",
    walletAddress: "0x9c2E4B9b8E8f8c8d8e8f8c8d8e8f8c8d8e8f8c8d",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.k@example.com",
    reputation: 580,
    tasksCompleted: 42,
    totalEarned: 1420.00,
    status: "inactive",
    completionRate: 88.5,
    averageRating: 4.4,
    accountAgeDays: 18,
    lastActive: "3 days ago",
    walletAddress: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  },
  {
    id: "5",
    name: "Lisa Anderson",
    email: "lisa.a@example.com",
    reputation: 920,
    tasksCompleted: 203,
    totalEarned: 7850.00,
    status: "active",
    completionRate: 99.1,
    averageRating: 5.0,
    accountAgeDays: 67,
    lastActive: "15 minutes ago",
    walletAddress: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
  },
  {
    id: "6",
    name: "James Wilson",
    email: "james.w@example.com",
    reputation: 480,
    tasksCompleted: 28,
    totalEarned: 890.50,
    status: "active",
    completionRate: 82.3,
    averageRating: 4.2,
    accountAgeDays: 12,
    lastActive: "5 hours ago",
    walletAddress: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
  },
  {
    id: "7",
    name: "Maria Garcia",
    email: "maria.g@example.com",
    reputation: 790,
    tasksCompleted: 98,
    totalEarned: 3680.25,
    status: "active",
    completionRate: 96.4,
    averageRating: 4.8,
    accountAgeDays: 38,
    lastActive: "20 minutes ago",
    walletAddress: "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
  },
  {
    id: "8",
    name: "Robert Taylor",
    email: "robert.t@example.com",
    reputation: 550,
    tasksCompleted: 35,
    totalEarned: 1150.00,
    status: "inactive",
    completionRate: 85.7,
    averageRating: 4.3,
    accountAgeDays: 15,
    lastActive: "1 week ago",
    walletAddress: "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c",
  },
];

type WorkerStatus = "all" | "active" | "inactive";
type ReputationFilter = "all" | "excellent" | "good" | "fair" | "poor";

export default function WorkersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkerStatus>("all");
  const [reputationFilter, setReputationFilter] = useState<ReputationFilter>("all");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter and search workers
  const filteredWorkers = useMemo(() => {
    return mockWorkers.filter((worker) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" || worker.status === statusFilter;

      // Reputation filter
      let matchesReputation = true;
      if (reputationFilter !== "all") {
        if (reputationFilter === "excellent" && worker.reputation < 800) matchesReputation = false;
        if (reputationFilter === "good" && (worker.reputation < 600 || worker.reputation >= 800)) matchesReputation = false;
        if (reputationFilter === "fair" && (worker.reputation < 400 || worker.reputation >= 600)) matchesReputation = false;
        if (reputationFilter === "poor" && worker.reputation >= 400) matchesReputation = false;
      }

      return matchesSearch && matchesStatus && matchesReputation;
    });
  }, [searchQuery, statusFilter, reputationFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const paginatedWorkers = filteredWorkers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: mockWorkers.length,
    active: mockWorkers.filter((w) => w.status === "active").length,
    avgReputation: Math.round(
      mockWorkers.reduce((sum, w) => sum + w.reputation, 0) / mockWorkers.length
    ),
    totalEarned: mockWorkers.reduce((sum, w) => sum + w.totalEarned, 0),
  };

  const getReputationBadge = (score: number) => {
    if (score >= 800) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 600) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 400) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workers Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and monitor your platform workers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Workers</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-green-600">{stats.active}</span> active
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Reputation</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.avgReputation}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Out of 1000 max score
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Earned</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${stats.totalEarned.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Across all workers
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Filtered Results</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{filteredWorkers.length}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Filter className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            From current filters
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="rounded-lg border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as WorkerStatus);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Reputation Filter */}
          <select
            value={reputationFilter}
            onChange={(e) => {
              setReputationFilter(e.target.value as ReputationFilter);
              setCurrentPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Reputation</option>
            <option value="excellent">Excellent (800+)</option>
            <option value="good">Good (600-799)</option>
            <option value="fair">Fair (400-599)</option>
            <option value="poor">Poor (&lt;400)</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reputation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tasks Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Earned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-900">No workers found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {worker.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                          <div className="text-sm text-gray-500">{worker.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{worker.reputation}</span>
                        {getReputationBadge(worker.reputation)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{worker.tasksCompleted}</div>
                      <div className="text-sm text-gray-500">{worker.completionRate}% rate</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${worker.totalEarned.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${(worker.totalEarned / worker.tasksCompleted).toFixed(2)}/task
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(worker.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWorker(worker)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredWorkers.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredWorkers.length}</span> results
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[40px]"
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Worker Detail Modal */}
      {selectedWorker && (
        <WorkerDetailModal
          worker={selectedWorker}
          isOpen={!!selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );
}
