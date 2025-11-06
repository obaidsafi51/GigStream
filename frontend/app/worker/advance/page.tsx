import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdvanceRequestForm } from "@/components/worker/advance-request-form";
import { ActiveLoanCard } from "@/components/worker/active-loan-card";
import { Spinner } from "@/components/ui/spinner";

/**
 * Mock user ID - Replace with actual auth when ready
 */
const MOCK_USER_ID = "worker-demo-1";

/**
 * Server Component - Advance Request Page
 * 
 * Features:
 * - Check eligibility
 * - Display risk score and predicted earnings
 * - Request advance with amount slider
 * - Show repayment plan preview
 * - Display active loan if exists
 */
export default async function AdvancePage() {
  // TODO: Get actual user from auth
  const workerId = MOCK_USER_ID;

  if (!workerId) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Request Advance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Get early access to your upcoming earnings with instant approval.
          </p>
        </div>

        {/* Main Content */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          }
        >
          <AdvanceContent workerId={workerId} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Content component that handles data fetching
 */
async function AdvanceContent({ workerId }: { workerId: string }) {
  // Fetch active loan (if exists)
  let activeLoan = null;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787";
    const loanRes = await fetch(
      `${apiUrl}/api/v1/workers/${workerId}/loans/active`,
      { cache: "no-store" }
    );
    if (loanRes.ok) {
      const data = await loanRes.json();
      activeLoan = data.data;
    }
  } catch {
    // No active loan or API error - continue
  }

  return (
    <div className="space-y-6">
      {/* Show active loan if exists */}
      {activeLoan && <ActiveLoanCard loan={activeLoan} />}

      {/* Request form (disabled if active loan exists) */}
      <AdvanceRequestForm workerId={workerId} hasActiveLoan={!!activeLoan} />
    </div>
  );
}
