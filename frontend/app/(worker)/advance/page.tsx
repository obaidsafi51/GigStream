"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdvancePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState(false);
  const [amount, setAmount] = useState(50);
  const [eligibility, setEligibility] = useState<any>(null);
  const [activeLoan, setActiveLoan] = useState<any>(null);

  // Fetch eligibility from backend
  useEffect(() => {
    const fetchEligibility = async () => {
      if (!user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use mock data for demo mode (quick-login)
        const isQuickLogin = user.id === 'demo-worker-1' || user.id === 'demo-platform-1';
        
        if (isQuickLogin) {
          // Mock eligibility data
          setEligibility({
            eligible: true,
            reputationScore: 850,
            predictedEarnings: 450.00,
            maxAdvance: 360.00, // 80% of predicted
            fee: 2.5,
            reason: 'High reputation score'
          });
          setIsEligible(true);
          setActiveLoan(null);
          setLoading(false);
          return;
        }

        // Check for active loan first
        const loanRes = await apiClient.getActiveLoan(user.id) as any;
        if (loanRes.success && loanRes.data.hasActiveLoan) {
          setActiveLoan(loanRes.data.loan);
          setIsEligible(false);
          setLoading(false);
          return;
        }

        // Check eligibility
        const response = await apiClient.checkAdvanceEligibility(user.id) as any;
        
        if (response.success) {
          const data = response.data;
          setEligibility({
            eligible: data.eligible,
            reputationScore: data.riskScore.score,
            minScore: 600,
            predictedEarnings: data.earningsPrediction.next7Days,
            maxAmount: data.maxAdvanceAmount,
            feeRate: data.feePercentage,
            checks: data.checks,
          });
          setIsEligible(data.eligible);
          
          // Set default amount to 50% of max
          if (data.eligible && data.maxAdvanceAmount > 0) {
            setAmount(Math.round(data.maxAdvanceAmount * 0.5));
          }
        } else {
          setError('Failed to check eligibility');
        }
      } catch (err: any) {
        console.error('Eligibility check error:', err);
        setError(err.message || 'Failed to check eligibility');
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, [user?.id]);

  const fee = eligibility ? (amount * eligibility.feeRate) / 100 : 0;
  const netAmount = amount - fee;
  const repaymentPerTask = (amount + fee) / 5;

  const handleRequest = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setRequesting(true);

      // Mock response for quick-login demo mode
      const isQuickLogin = user.id === 'demo-worker-1' || user.id === 'demo-platform-1';
      
      if (isQuickLogin) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast({
          title: "Advance Approved! (Demo)",
          description: `$${netAmount.toFixed(2)} USDC would be sent to your wallet in production`,
        });

        // Show active loan in demo mode
        setActiveLoan({
          id: 'demo-loan-1',
          amount: amount.toString(),
          totalDue: (amount + fee).toFixed(2),
          status: 'active',
          repaymentProgress: {
            tasksCompleted: 0,
            tasksTarget: 5
          }
        });
        setIsEligible(false);
        setRequesting(false);
        return;
      }

      const response = await apiClient.requestAdvance(user.id, amount.toString()) as any;

      if (response.success) {
        toast({
          title: "Advance Approved!",
          description: `$${netAmount.toFixed(2)} USDC has been sent to your wallet`,
        });

        // Reload eligibility after successful request
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(response.error?.message || 'Failed to request advance');
      }
    } catch (err: any) {
      console.error('Advance request error:', err);
      toast({
        title: "Request Failed",
        description: err.message || 'Failed to process advance request',
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Request Cash Advance</h1>
        <p className="text-muted-foreground">Get instant access to your future earnings</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Loan Warning */}
      {activeLoan && (
        <Alert className="mb-6 border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            You have an active loan of ${parseFloat(activeLoan.totalDue).toFixed(2)}. 
            Complete {activeLoan.repaymentProgress.tasksTarget - activeLoan.repaymentProgress.tasksCompleted} more 
            tasks to repay before requesting a new advance.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Eligibility Check */}
        {eligibility && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Eligibility Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(eligibility.checks || {}).map(([key, check]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {check.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span>{check.description}</span>
                    </div>
                    <span className="font-semibold">
                      {typeof check.value === 'number' && check.value < 100 
                        ? check.value.toFixed(2) 
                        : check.value}
                      {check.threshold !== undefined && ` / ${check.threshold}`}
                    </span>
                  </div>
                ))}
                
                {isEligible && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-semibold">Maximum Advance</span>
                      <span className="font-bold text-primary">
                        ${eligibility.maxAmount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on predicted earnings • {eligibility.feeRate}% fee
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Amount */}
        {isEligible && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Request Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Select Amount</span>
                  <span className="text-3xl font-bold">${amount.toFixed(2)}</span>
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={(values: number[]) => setAmount(values[0])}
                  min={50}
                  max={eligibility.maxAmount}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$50</span>
                  <span>${eligibility.maxAmount.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Amount</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee ({eligibility.feeRate}%)</span>
                  <span className="font-semibold">${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>You'll Receive</span>
                  <span className="text-secondary">${netAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 bg-primary-light rounded-lg">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Repayment Terms</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Auto-deducted from next 5 tasks (${repaymentPerTask.toFixed(2)} per task)
                  </p>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                variant="gradient"
                onClick={handleRequest}
                disabled={requesting || !isEligible}
              >
                {requesting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  `Request $${netAmount.toFixed(2)} Advance`
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
