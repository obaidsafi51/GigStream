"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Badge {
  name: string;
  icon: string;
  earned: boolean;
}

interface ReputationData {
  score: number;
  maxScore: number;
  rank: string;
  tasksCompleted: number;
  completionRate: number;
  avgRating: number;
  badges: Badge[];
}

interface ReputationCardProps {
  reputation: ReputationData;
}

export function ReputationCard({ reputation }: ReputationCardProps) {
  const { score, maxScore, rank, tasksCompleted, completionRate, avgRating, badges } = reputation;
  const percentage = (score / maxScore) * 100;

  // Calculate color based on score
  const getScoreColor = () => {
    if (score >= 800) return "text-green-600 dark:text-green-400";
    if (score >= 600) return "text-blue-600 dark:text-blue-400";
    if (score >= 400) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRankColor = () => {
    if (rank === "Gold" || rank === "Diamond") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    if (rank === "Silver") return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    if (rank === "Bronze") return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Reputation Score
          </h3>
          <Link
            href="/reputation"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Details →
          </Link>
        </div>

        {/* Score Gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className={`text-4xl font-bold ${getScoreColor()}`}>
                {score}
              </span>
              <span className="text-lg text-gray-400 dark:text-gray-500">
                /{maxScore}
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRankColor()}`}>
              {rank}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                score >= 800
                  ? "bg-green-500"
                  : score >= 600
                  ? "bg-blue-500"
                  : score >= 400
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasks</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {tasksCompleted}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {completionRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rating</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              {avgRating}
              <svg
                className="w-4 h-4 text-yellow-400 ml-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </p>
          </div>
        </div>

        {/* Badges */}
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
            Achievements
          </p>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                  badge.earned
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-50"
                }`}
                title={badge.name}
              >
                <span className="text-2xl mb-1">{badge.icon}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  {badge.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
