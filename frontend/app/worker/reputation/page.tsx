import { Suspense } from "react";
import { ReputationContent } from "@/components/worker/reputation-content";
import { ReputationSkeleton } from "@/components/worker/skeletons";

/**
 * Worker Reputation Page
 * 
 * Displays:
 * - Reputation score with gauge visualization
 * - Score breakdown by factor (reputation, maturity, task history, etc.)
 * - Reputation history/events
 * - Achievement badges
 * - Comparison to average worker
 */
export default function ReputationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Reputation
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your reputation score, achievements, and performance history
          </p>
        </div>

        {/* Content */}
        <Suspense fallback={<ReputationSkeleton />}>
          <ReputationContent />
        </Suspense>
      </div>
    </div>
  );
}
