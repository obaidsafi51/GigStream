"use client";

import { X, TrendingUp, Calendar, DollarSign, Star, Award, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface WorkerDetailModalProps {
  worker: {
    id: string;
    name: string;
    email: string;
    reputation: number;
    tasksCompleted: number;
    totalEarned: number;
    status: string;
    completionRate: number;
    averageRating: number;
    accountAgeDays: number;
    lastActive: string;
    walletAddress: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkerDetailModal({ worker, isOpen, onClose }: WorkerDetailModalProps) {
  if (!isOpen) return null;

  const getReputationLevel = (score: number) => {
    if (score >= 800) return { level: "Excellent", color: "text-green-600", bgColor: "bg-green-100" };
    if (score >= 600) return { level: "Good", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (score >= 400) return { level: "Fair", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "Poor", color: "text-red-600", bgColor: "bg-red-100" };
  };

  const reputationInfo = getReputationLevel(worker.reputation);

  // Calculate reputation percentage for visual display
  const reputationPercentage = (worker.reputation / 1000) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl transform rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Worker Details</h2>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Worker Info Header */}
            <div className="mb-6 flex items-start gap-4">
              <div className="h-16 w-16 flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {worker.name.charAt(0)}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{worker.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{worker.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  {worker.status === "active" ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    Last active: {worker.lastActive}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm font-medium">Total Earned</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${worker.totalEarned.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ${(worker.totalEarned / worker.tasksCompleted).toFixed(2)} per task
                </p>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <Award className="h-5 w-5" />
                  <span className="text-sm font-medium">Tasks Completed</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{worker.tasksCompleted}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {worker.completionRate}% completion rate
                </p>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                  <Star className="h-5 w-5" />
                  <span className="text-sm font-medium">Average Rating</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{worker.averageRating}</p>
                <div className="flex gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(worker.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-green-50 to-green-100 p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm font-medium">Account Age</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{worker.accountAgeDays}</p>
                <p className="text-sm text-gray-600 mt-1">days active</p>
              </div>
            </div>

            {/* Reputation Score */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-700" />
                  <h4 className="font-semibold text-gray-900">Reputation Score</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">{worker.reputation}</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${reputationInfo.bgColor} ${reputationInfo.color}`}>
                    {reputationInfo.level}
                  </span>
                </div>
              </div>
              
              {/* Reputation Progress Bar */}
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    worker.reputation >= 800
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : worker.reputation >= 600
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : worker.reputation >= 400
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                      : "bg-gradient-to-r from-red-500 to-red-600"
                  }`}
                  style={{ width: `${reputationPercentage}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span>1000</span>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="mb-6 rounded-lg border bg-gray-50 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Performance Breakdown</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${worker.completionRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {worker.completionRate}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${(worker.averageRating / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {worker.averageRating}/5
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Experience Level</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${Math.min((worker.tasksCompleted / 200) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {worker.tasksCompleted}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Wallet Information</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wallet Address</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 text-xs font-mono text-gray-900">
                      {worker.walletAddress.slice(0, 6)}...{worker.walletAddress.slice(-4)}
                    </code>
                    <a
                      href={`https://testnet.arcscan.app/address/${worker.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Worker ID</span>
                  <code className="rounded bg-white px-2 py-1 text-xs font-mono text-gray-900">
                    {worker.id}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                View Full Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
