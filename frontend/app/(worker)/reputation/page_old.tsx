"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function ReputationPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<any>(null);

  useEffect(() => {
    const fetchReputation = async () => {
      if (!user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getWorkerReputation(user.id) as any;
        
        if (response.success) {
          setReputation(response.data);
        } else {
          setError('Failed to load reputation data');
        }
      } catch (err: any) {
        console.error('Reputation fetch error:', err);
        setError(err.message || 'Failed to load reputation data');
      } finally {
        setLoading(false);
      }
    };

    fetchReputation();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!reputation) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'No reputation data available'}</AlertDescription>
      </Alert>
    );
  }

  const totalPoints = reputation.factors?.reduce((sum: number, f: any) => sum + f.points, 0) || 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Reputation</h1>
        <p className="text-muted-foreground">Track your on-chain performance score</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Overall Score */}
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold">{reputation.score}</span>
                  <span className="text-xl text-muted-foreground">/{reputation.maxScore}</span>
                  <Badge variant="default" className="ml-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {reputation.rank}
                  </Badge>
                </div>
                <Progress value={(reputation.score / reputation.maxScore) * 100} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  Grade: {reputation.grade} • Top {100 - reputation.percentile}% of workers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Score Breakdown ({totalPoints} total points)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reputation.factors?.map((factor: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="font-medium">{factor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {factor.description}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold">{factor.points} pts</span>
              </div>
            ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-medium">Account Age</p>
                  <p className="text-sm text-muted-foreground">
                    {reputation.metrics.accountAgeDays} days active
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold">{reputation.breakdown.accountAge} pts</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-medium">Consistency</p>
                  <p className="text-sm text-muted-foreground">Regular activity</p>
                </div>
              </div>
              <span className="text-xl font-bold">{reputation.breakdown.consistency} pts</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-medium">Average Rating</p>
                  <p className="text-sm text-muted-foreground">
                    {reputation.metrics.averageRating}/5.0 stars
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold">{reputation.breakdown.rating} pts</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-medium">Dispute Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {reputation.metrics.disputes} disputes
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold">{reputation.breakdown.disputes} pts</span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Score</span>
                <span className="text-primary">{totalPoints}/75 factors</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reputation.history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{item.event}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-secondary">
                      +{item.change} pts
                    </span>
                    <p className="text-xs text-muted-foreground">Score: {item.newScore}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
