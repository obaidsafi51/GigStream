"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  amount: number;
  status: "active" | "pending" | "streaming" | "completed";
  progress: number;
  timeRemaining?: string;
}

interface TaskListProps {
  initialTasks: Task[];
}

export function TaskList({ initialTasks }: TaskListProps) {
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
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending";
      case "streaming":
        return "Streaming";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active Tasks
          </h3>
          <Link
            href="/tasks"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View All →
          </Link>
        </div>

        <div className="space-y-4">
          {initialTasks.length === 0 ? (
            <div className="py-12 text-center">
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
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No active tasks
              </p>
            </div>
          ) : (
            initialTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${task.amount.toFixed(2)}
                      </span>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </div>
                  {task.timeRemaining && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.timeRemaining}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {task.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
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
              </div>
            ))
          )}
        </div>

        {initialTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link href="/tasks">
              <button className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                View all {initialTasks.length} tasks
              </button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
