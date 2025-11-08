"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { fetchReputation, ReputationResponse, ReputationEvent } from "../../lib/api/reputation";
import { 
  Award, 
  TrendingUp, 
  Target, 
  Users, 
  Star,
  Trophy,
  Zap,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";

/**
 * Reputation Content Component
 * Main component that fetches and displays reputation data
 */
export function ReputationContent() {
  const { user, token } = useAuthStore();
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReputation() {
      if (!user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchReputation(user.id, token || undefined);
        setReputation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reputation");
      } finally {
        setLoading(false);
      }
    }

    loadReputation();
  }, [user?.id, token]);

  if (loading) {
    return <div className="text-center py-12">Loading reputation data...</div>;
  }

  if (error || !reputation) {
    return (
      <div className="text-center py-12 text-red-600">
        {error || "Failed to load reputation data"}
      </div>
    );
  }

  const percentage = (reputation.score / reputation.maxScore) * 100;

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Reputation Score
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className={`text-6xl font-bold ${getScoreColor(reputation.score)}`}>
                    {reputation.score}
                  </span>
                  <span className="text-3xl text-gray-400 dark:text-gray-500">
                    /{reputation.maxScore}
                  </span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${getRankBadgeColor(reputation.rank)}`}>
                {reputation.rank}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${getProgressBarColor(reputation.score)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span>1000</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <Target className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reputation.tasksCompleted}
                </p>
                <p className="text-xs text-gray-500">Tasks Completed</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reputation.completionRate}%
                </p>
                <p className="text-xs text-gray-500">Success Rate</p>
              </div>
              <div className="text-center">
                <Star className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reputation.avgRating.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Comparison
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Your Score</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {reputation.score}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400">Average Worker</span>
                  <span className="font-bold text-gray-500">
                    {reputation.avgWorkerScore}
                  </span>
                </div>

                {/* Percentile */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide mb-1">Percentile</p>
                  <p className="text-3xl font-bold">
                    {reputation.percentile}
                    <span className="text-lg">th</span>
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    {reputation.score > reputation.avgWorkerScore
                      ? `+${reputation.score - reputation.avgWorkerScore} above average`
                      : `${reputation.avgWorkerScore - reputation.score} below average`
                    }
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Zap className="w-4 h-4" />
                  <span>Grade: <span className="font-semibold text-gray-900 dark:text-white">{reputation.grade}</span></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Score Breakdown
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reputation.factors.map((factor) => (
              <div
                key={factor.name}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 capitalize">
                  {factor.name.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {factor.value}
                </p>
                <p className="text-xs text-gray-500">{factor.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Algorithm:</strong> {reputation.riskScore.algorithmUsed === 'heuristic' ? 'Heuristic Scoring' : 'XGBoost ML Model'} 
              {' '}({(reputation.riskScore.confidence * 100).toFixed(0)}% confidence)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Achievements
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {reputation.badges.map((badge) => (
              <div
                key={badge.name}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                  badge.earned
                    ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 dark:from-blue-900/20 dark:to-purple-900/20 dark:border-blue-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-50"
                }`}
                title={badge.description}
              >
                <span className="text-4xl mb-2">{badge.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                  {badge.name}
                </span>
                {badge.earned && (
                  <span className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ Earned
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reputation History */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Reputation History
            </h3>
          </div>

          <div className="space-y-3">
            {reputation.events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No reputation events yet
              </p>
            ) : (
              reputation.events.map((event) => (
                <ReputationEventRow key={event.id} event={event} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Reputation Event Row Component
 */
function ReputationEventRow({ event }: { event: ReputationEvent }) {
  const isPositive = event.pointsDelta > 0;
  const isNegative = event.pointsDelta < 0;
  const date = new Date(event.createdAt);

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
      {/* Icon */}
      <div className={`p-2 rounded-full ${
        isPositive ? 'bg-green-100 dark:bg-green-900/30' :
        isNegative ? 'bg-red-100 dark:bg-red-900/30' :
        'bg-gray-100 dark:bg-gray-700'
      }`}>
        {isPositive ? (
          <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : isNegative ? (
          <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
        ) : (
          <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
          {event.type.replace(/_/g, ' ')}
        </p>
        {event.description && (
          <p className="text-xs text-gray-500 truncate">{event.description}</p>
        )}
      </div>

      {/* Points */}
      <div className="text-right">
        <p className={`text-sm font-bold ${
          isPositive ? 'text-green-600 dark:text-green-400' :
          isNegative ? 'text-red-600 dark:text-red-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {isPositive ? '+' : ''}{event.pointsDelta}
        </p>
        <p className="text-xs text-gray-500">
          {event.previousScore} → {event.newScore}
        </p>
      </div>

      {/* Date */}
      <div className="text-right min-w-[80px]">
        <p className="text-xs text-gray-500">
          {date.toLocaleDateString()}
        </p>
        <p className="text-xs text-gray-400">
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

/**
 * Utility Functions
 */
function getScoreColor(score: number): string {
  if (score >= 800) return "text-green-600 dark:text-green-400";
  if (score >= 600) return "text-blue-600 dark:text-blue-400";
  if (score >= 400) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getRankBadgeColor(rank: string): string {
  const colors: Record<string, string> = {
    Diamond: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    Platinum: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    Gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    Silver: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    Bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    Starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  };
  return colors[rank] || colors.Starter;
}

function getProgressBarColor(score: number): string {
  if (score >= 800) return "bg-gradient-to-r from-green-500 to-emerald-500";
  if (score >= 600) return "bg-gradient-to-r from-blue-500 to-cyan-500";
  if (score >= 400) return "bg-gradient-to-r from-yellow-500 to-orange-500";
  return "bg-gradient-to-r from-red-500 to-pink-500";
}
