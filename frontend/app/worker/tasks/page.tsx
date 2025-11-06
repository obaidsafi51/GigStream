"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Task interface
interface Task {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: "active" | "completed" | "cancelled" | "pending" | "streaming";
  progress: number;
  timeRemaining?: string;
  createdAt: string;
  completedAt?: string;
  platform: string;
  type: "fixed" | "streaming";
  duration?: string;
}

// Mock data for tasks
function getMockTasks(): Task[] {
  return [
    {
      id: "1",
      title: "Food Delivery - Downtown",
      description: "Deliver food from Restaurant A to Customer B",
      amount: 12.50,
      status: "active",
      progress: 75,
      timeRemaining: "15 mins",
      createdAt: "2025-10-31T10:30:00Z",
      platform: "DeliveryApp",
      type: "fixed",
    },
    {
      id: "2",
      title: "Package Pickup",
      description: "Pick up package from warehouse",
      amount: 8.00,
      status: "pending",
      progress: 0,
      timeRemaining: "30 mins",
      createdAt: "2025-10-31T11:00:00Z",
      platform: "LogisticsHub",
      type: "fixed",
    },
    {
      id: "3",
      title: "Grocery Delivery",
      description: "Deliver groceries to residential area",
      amount: 15.75,
      status: "streaming",
      progress: 45,
      timeRemaining: "2 hours",
      createdAt: "2025-10-31T09:00:00Z",
      platform: "GroceryGo",
      type: "streaming",
      duration: "4 hours",
    },
    {
      id: "4",
      title: "Document Courier",
      description: "Deliver important documents to office",
      amount: 20.00,
      status: "completed",
      progress: 100,
      createdAt: "2025-10-30T14:00:00Z",
      completedAt: "2025-10-30T15:30:00Z",
      platform: "CourierPro",
      type: "fixed",
    },
    {
      id: "5",
      title: "Flower Delivery",
      description: "Deliver flower bouquet for special occasion",
      amount: 18.50,
      status: "completed",
      progress: 100,
      createdAt: "2025-10-30T10:00:00Z",
      completedAt: "2025-10-30T11:00:00Z",
      platform: "BloomDelivery",
      type: "fixed",
    },
    {
      id: "6",
      title: "Furniture Assembly Task",
      description: "Assemble furniture at customer location",
      amount: 45.00,
      status: "streaming",
      progress: 60,
      timeRemaining: "1.5 hours",
      createdAt: "2025-10-31T08:00:00Z",
      platform: "TaskRabbit",
      type: "streaming",
      duration: "3 hours",
    },
    {
      id: "7",
      title: "Pet Sitting",
      description: "Watch pets for the day",
      amount: 35.00,
      status: "cancelled",
      progress: 0,
      createdAt: "2025-10-29T09:00:00Z",
      platform: "PetCare",
      type: "streaming",
    },
    {
      id: "8",
      title: "Event Setup",
      description: "Help setup event equipment",
      amount: 50.00,
      status: "completed",
      progress: 100,
      createdAt: "2025-10-29T12:00:00Z",
      completedAt: "2025-10-29T16:00:00Z",
      platform: "EventHelp",
      type: "streaming",
      duration: "4 hours",
    },
    {
      id: "9",
      title: "Quick Errand Run",
      description: "Run quick errands in local area",
      amount: 10.00,
      status: "active",
      progress: 30,
      timeRemaining: "45 mins",
      createdAt: "2025-10-31T12:00:00Z",
      platform: "TaskMaster",
      type: "fixed",
    },
    {
      id: "10",
      title: "Data Entry Work",
      description: "Complete data entry for spreadsheet",
      amount: 25.00,
      status: "streaming",
      progress: 80,
      timeRemaining: "30 mins",
      createdAt: "2025-10-31T07:00:00Z",
      platform: "RemoteWork",
      type: "streaming",
      duration: "2 hours",
    },
  ];
}

export default function TasksPage() {
  const [tasks] = useState<Task[]>(getMockTasks());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 6;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.platform.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [tasks, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * tasksPerPage;
    return filteredTasks.slice(startIndex, startIndex + tasksPerPage);
  }, [filteredTasks, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "streaming":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "completed":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: Task["status"]) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Task stats
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((t) => t.status === "active").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      streaming: tasks.filter((t) => t.status === "streaming").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all your tasks
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.active}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Streaming
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stats.streaming}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completed
              </div>
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cancelled
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.cancelled}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search tasks by title, description, or platform..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full"
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="streaming">Streaming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {paginatedTasks.length === 0 ? (
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                    No tasks found
                  </p>
                  <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                    Try adjusting your filters or search query
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            paginatedTasks.map((task) => (
              <Card
                key={task.id}
                className="shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side - Task info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {task.platform}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {task.type === "streaming" ? "🔄 Streaming" : "⚡ Fixed"}
                        </span>
                        {task.duration && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Duration: {task.duration}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {task.progress > 0 && task.status !== "cancelled" && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Progress
                            </span>
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              {task.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Created: {formatDate(task.createdAt)}</span>
                        {task.completedAt && (
                          <span>Completed: {formatDate(task.completedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Right side - Amount and time */}
                    <div className="flex md:flex-col items-start md:items-end justify-between md:justify-start gap-2 md:min-w-[120px]">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Amount
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${task.amount.toFixed(2)}
                        </div>
                      </div>
                      {task.timeRemaining && (
                        <div className="text-right">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Time Left
                          </div>
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {task.timeRemaining}
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
                  Showing {(currentPage - 1) * tasksPerPage + 1} to{" "}
                  {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of{" "}
                  {filteredTasks.length} tasks
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
