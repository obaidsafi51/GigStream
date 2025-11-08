import { Card, CardContent } from "../ui/card";

export function TaskListSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className="bg-gray-300 h-2 rounded-full w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BalanceCardSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="mb-6">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EarningsChartSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function ReputationCardSkeleton() {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div>
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <BalanceCardSkeleton />
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <EarningsChartSkeleton />

        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          <TaskListSkeleton />
          <ReputationCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ReputationSkeleton() {
  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardContent className="p-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-16 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>

      {/* Additional Cards */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="shadow-lg">
          <CardContent className="p-6">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
