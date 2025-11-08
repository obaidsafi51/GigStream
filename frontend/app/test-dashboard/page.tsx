"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDashboardPage() {
  const [balance] = useState(1247.89);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold mb-4">Test Dashboard (No Auth)</h1>
      <p className="mb-8">If you can see this, the page rendering works!</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Balance: ${balance.toFixed(2)}</p>
          <p className="mt-4 text-muted-foreground">
            This page doesn't have ProtectedRoute, so it should always render.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
