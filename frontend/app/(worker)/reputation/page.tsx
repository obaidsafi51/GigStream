"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, TrendingUp, CheckCircle, AlertCircle, Award } from 'lucide-react';

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
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Reputation</h1>
          <p className="text-muted-foreground">Track your on-chain performance score</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'No reputation data available'}</AlertDescription>
        </Alert>
      </div>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold mt-1">{reputation.completionRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold mt-1">{reputation.tasksCompleted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold mt-1">{reputation.avgRating}/5.0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Breakdown */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
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
          </CardContent>
        </Card>

        {/* Badges */}
        {reputation.badges && reputation.badges.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Badges Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {reputation.badges.map((badge: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 text-center ${
                      badge.earned
                        ? 'border-primary bg-primary-light'
                        : 'border-muted bg-muted/30 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reputation.events && reputation.events.length > 0 ? (
                reputation.events.slice(0, 10).map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{event.description || event.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${event.pointsDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {event.pointsDelta >= 0 ? '+' : ''}{event.pointsDelta} pts
                      </span>
                      <p className="text-sm text-muted-foreground">{event.newScore} total</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
