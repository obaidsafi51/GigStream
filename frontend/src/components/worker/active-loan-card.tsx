"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CheckCircle2, Clock, DollarSign } from "lucide-react";

interface Loan {
  id: string;
  amount: number;
  fee: number;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  repaymentProgress: number; // 0-100
  tasksCompleted: number;
  totalTasks: number;
  createdAt: string;
  dueDate?: string;
}

interface ActiveLoanCardProps {
  loan: Loan;
}

export function ActiveLoanCard({ loan }: ActiveLoanCardProps) {
  const progressPercentage = (loan.repaymentProgress || 0);
  const paidAmount = loan.totalAmount - loan.remainingAmount;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Active Advance
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            {loan.status}
          </Badge>
        </div>
        <CardDescription>
          Complete tasks to repay your advance automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Original Amount</p>
            <p className="text-lg font-bold text-gray-900">
              ${loan.amount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Fee</p>
            <p className="text-lg font-bold text-gray-900">
              ${loan.fee.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Repayment</p>
            <p className="text-lg font-bold text-blue-600">
              ${loan.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Repayment Progress</span>
            <span className="font-medium text-blue-600">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Paid: ${paidAmount.toFixed(2)}</span>
            <span>Remaining: ${loan.remainingAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Tasks Progress */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-900">
              Tasks Completed
            </span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {loan.tasksCompleted} / {loan.totalTasks}
          </span>
        </div>

        {/* Due Date (if available) */}
        {loan.dueDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              Due: {new Date(loan.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-gray-600 bg-white rounded-lg p-3">
          💡 <strong>Auto-repayment:</strong> 20% of your earnings from each completed task
          will be automatically deducted until the advance is fully repaid.
        </p>
      </CardContent>
    </Card>
  );
}
