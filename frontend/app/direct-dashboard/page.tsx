"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Star } from "lucide-react";

export default function DirectDashboardPage() {
  console.log('[DirectDashboard] Rendering');
  
  const [balance] = useState(1247.89);
  const [todayEarnings] = useState(142.50);
  const [reputation] = useState({
    score: 87,
    level: "Excellent",
    tasksCompleted: 256,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Direct Dashboard (No Auth Layout)
          </h1>
          <p className="text-slate-600">
            This page bypasses the WorkerLayout to test rendering
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <span className="text-4xl font-bold text-slate-900">
                  {balance.toFixed(2)}
                </span>
                <span className="text-2xl text-slate-500">USDC</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  +${todayEarnings.toFixed(2)}
                </span>
                <span className="text-slate-500">earned today</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Reputation Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">
                    {reputation.score}
                  </div>
                  <div className="text-sm text-slate-500">
                    {reputation.level}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-500">
                {reputation.tasksCompleted} tasks completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-slate-700">Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  All systems operational
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">
            ✅ If you can see this, the dashboard components are rendering correctly!
          </p>
          <p className="text-green-700 text-sm mt-2">
            The issue might be with the ProtectedRoute or WorkerLayout wrapper.
          </p>
        </div>
      </div>
    </div>
  );
}
