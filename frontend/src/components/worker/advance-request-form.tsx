"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { fetchEligibility, requestAdvance, type EligibilityResponse } from "../../lib/api/advances";
import { useAuthStore } from "../../stores/auth-store";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, DollarSign } from "lucide-react";

interface AdvanceRequestFormProps {
  workerId: string;
  hasActiveLoan: boolean;
}

export function AdvanceRequestForm({ workerId, hasActiveLoan }: AdvanceRequestFormProps) {
  const { token } = useAuthStore();
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch eligibility on mount
  useEffect(() => {
    async function loadEligibility() {
      try {
        setIsLoading(true);
        const data = await fetchEligibility(workerId, token || undefined);
        setEligibility(data);
        // Set initial slider value to 50% of max eligible amount
        if (data.eligible) {
          setSelectedAmount(Math.floor(data.maxAdvance / 2));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch eligibility");
      } finally {
        setIsLoading(false);
      }
    }

    loadEligibility();
  }, [workerId, token]);

  // Handle form submission
  async function handleSubmit() {
    if (!eligibility?.eligible || selectedAmount === 0) return;

    try {
      setIsSubmitting(true);
      const result = await requestAdvance(
        { workerId, amount: selectedAmount },
        token || undefined
      );
      
      toast.success("Advance Approved!", {
        description: `$${result.amount.toFixed(2)} will be deposited to your wallet shortly.`,
      });

      // Reload page to show active loan
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error("Request Failed", {
        description: err instanceof Error ? err.message : "Failed to request advance",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate fee and repayment
  const fee = selectedAmount * (eligibility?.feeRate || 0);
  const totalRepayment = selectedAmount + fee;
  const repaymentPerTask = totalRepayment / 5; // 5 tasks repayment

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Eligibility Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {eligibility.eligible ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                You&apos;re Eligible for an Advance!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                Not Eligible Yet
              </>
            )}
          </CardTitle>
          <CardDescription>
            {eligibility.eligible
              ? "Based on your performance and predicted earnings, you can request up to:"
              : "Complete the following requirements to become eligible:"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Eligible Amount */}
          {eligibility.eligible && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Maximum Advance</span>
                <span className="text-3xl font-bold text-blue-600">
                  ${eligibility.maxAdvance.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Fee: {(eligibility.feeRate * 100).toFixed(1)}% • Repaid over next 5 completed tasks
              </p>
            </div>
          )}

          {/* Eligibility Checks */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Eligibility Criteria</h4>
            
            <CheckItem
              label="Risk Score"
              passed={eligibility.checks.riskScore.passed}
              value={`${eligibility.checks.riskScore.value}/1000`}
              required={`Minimum ${eligibility.checks.riskScore.minimum}`}
            />
            
            <CheckItem
              label="Predicted 7-Day Earnings"
              passed={eligibility.checks.predictedEarnings.passed}
              value={`$${eligibility.checks.predictedEarnings.value.toFixed(2)}`}
              required={`Minimum $${eligibility.checks.predictedEarnings.minimum}`}
            />
            
            <CheckItem
              label="Active Loans"
              passed={eligibility.checks.activeLoans.passed}
              value={eligibility.checks.activeLoans.count === 0 ? "None" : `${eligibility.checks.activeLoans.count}`}
              required="Must have no active loans"
            />
            
            <CheckItem
              label="Account Age"
              passed={eligibility.checks.accountAge.passed}
              value={`${eligibility.checks.accountAge.days} days`}
              required={`Minimum ${eligibility.checks.accountAge.minimum} days`}
            />
            
            <CheckItem
              label="Completion Rate"
              passed={eligibility.checks.completionRate.passed}
              value={`${(eligibility.checks.completionRate.rate * 100).toFixed(1)}%`}
              required={`Minimum ${(eligibility.checks.completionRate.minimum * 100).toFixed(0)}%`}
            />
          </div>

          {/* Reasons */}
          {!eligibility.eligible && eligibility.reasons.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">What you need:</h4>
              <ul className="space-y-1">
                {eligibility.reasons.map((reason, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Score & Predictions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Risk Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">
                  {eligibility.riskScore.score}
                </span>
                <span className="text-sm text-gray-500">/ 1000</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <ScoreFactor label="Completion Rate" value={eligibility.riskScore.factors.completionRate} />
                <ScoreFactor label="Account Age" value={eligibility.riskScore.factors.accountAge} />
                <ScoreFactor label="Task Consistency" value={eligibility.riskScore.factors.taskConsistency} />
                <ScoreFactor label="Average Rating" value={eligibility.riskScore.factors.avgRating} />
                <ScoreFactor label="Payment History" value={eligibility.riskScore.factors.paymentHistory} />
                <ScoreFactor label="Dispute Rate" value={eligibility.riskScore.factors.disputeRate} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predicted Earnings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
              Predicted Earnings (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  ${eligibility.predictedEarnings.amount.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">
                  {(eligibility.predictedEarnings.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Week Avg</span>
                  <span className="font-medium">
                    ${eligibility.predictedEarnings.breakdown.lastWeekAvg.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Month Avg</span>
                  <span className="font-medium">
                    ${eligibility.predictedEarnings.breakdown.lastMonthAvg.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Form - Only show if eligible */}
      {eligibility.eligible && !hasActiveLoan && (
        <Card>
          <CardHeader>
            <CardTitle>Request Amount</CardTitle>
            <CardDescription>
              Choose how much you need. Funds will be deposited instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Advance Amount
                </label>
                <span className="text-2xl font-bold text-blue-600">
                  ${selectedAmount.toFixed(2)}
                </span>
              </div>
              
              <input
                type="range"
                min="1"
                max={eligibility.maxAdvance}
                step="1"
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>$1</span>
                <span>${eligibility.maxAdvance.toFixed(2)}</span>
              </div>
            </div>

            {/* Fee Display */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Advance Amount</span>
                <span className="font-medium">${selectedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Fee ({(eligibility.feeRate * 100).toFixed(1)}%)
                </span>
                <span className="font-medium">${fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                <span>Total Repayment</span>
                <span className="text-blue-600">${totalRepayment.toFixed(2)}</span>
              </div>
            </div>

            {/* Repayment Plan Preview */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Repayment Plan</h4>
              <p className="text-sm text-gray-600 mb-3">
                20% of earnings from each of your next 5 completed tasks will be deducted automatically:
              </p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((taskNum) => (
                  <div key={taskNum} className="flex justify-between text-sm">
                    <span className="text-gray-600">Task {taskNum} completion</span>
                    <span className="font-medium">${repaymentPerTask.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedAmount === 0}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? "Processing..." : `Request $${selectedAmount.toFixed(2)} Advance`}
            </Button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              By requesting an advance, you agree to our terms and automatic repayment from future earnings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Already has active loan */}
      {hasActiveLoan && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Active Loan in Progress
              </h3>
              <p className="text-gray-600">
                Complete your current loan repayment before requesting another advance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Check item component
 */
function CheckItem({
  label,
  passed,
  value,
  required,
}: {
  label: string;
  passed: boolean;
  value: string;
  required: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      {passed ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900">{label}</span>
          <span className={`text-sm ${passed ? "text-green-600" : "text-red-600"}`}>
            {value}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{required}</p>
      </div>
    </div>
  );
}

/**
 * Score factor component
 */
function ScoreFactor({ label, value }: { label: string; value: number }) {
  const isNegative = value < 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${isNegative ? "text-red-600" : "text-green-600"}`}>
        {isNegative ? "" : "+"}{value}
      </span>
    </div>
  );
}
