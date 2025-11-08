"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Wallet, History, TrendingUp } from "lucide-react";

export const QuickActions = () => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild variant="outline" className="w-full justify-start" size="lg">
          <Link href="/advance">
            <Wallet className="mr-2 h-5 w-5" />
            Request Advance
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start" size="lg">
          <Link href="/history">
            <History className="mr-2 h-5 w-5" />
            View History
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start" size="lg">
          <Link href="/reputation">
            <TrendingUp className="mr-2 h-5 w-5" />
            Check Reputation
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
