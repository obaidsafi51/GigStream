/**
 * API functions for advance/loan operations
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787";

/**
 * Eligibility response type
 */
export interface EligibilityResponse {
  eligible: boolean;
  reasons: string[];
  maxAdvance: number;
  feeRate: number;
  checks: {
    riskScore: {
      passed: boolean;
      value: number;
      minimum: number;
    };
    predictedEarnings: {
      passed: boolean;
      value: number;
      minimum: number;
    };
    activeLoans: {
      passed: boolean;
      count: number;
    };
    accountAge: {
      passed: boolean;
      days: number;
      minimum: number;
    };
    completionRate: {
      passed: boolean;
      rate: number;
      minimum: number;
    };
  };
  predictedEarnings: {
    amount: number;
    confidence: number;
    breakdown: {
      lastWeekAvg: number;
      lastMonthAvg: number;
      dayOfWeekPattern: Record<string, number>;
    };
  };
  riskScore: {
    score: number;
    factors: {
      completionRate: number;
      accountAge: number;
      taskConsistency: number;
      avgRating: number;
      disputeRate: number;
      paymentHistory: number;
    };
  };
}

/**
 * Loan request payload
 */
export interface AdvanceRequest {
  amount: number;
  workerId: string;
}

/**
 * Loan response type
 */
export interface AdvanceResponse {
  loanId: string;
  amount: number;
  fee: number;
  totalAmount: number;
  repaymentAmount: number;
  repaymentSchedule: {
    taskNumber: number;
    deductionPercentage: number;
  }[];
  status: string;
  createdAt: string;
}

/**
 * Fetch advance eligibility for a worker
 */
export async function fetchEligibility(
  workerId: string,
  token?: string
): Promise<EligibilityResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/workers/${workerId}/advance/eligibility`,
    {
      headers,
      cache: "no-store", // Always fetch fresh data
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch eligibility: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Request an advance
 */
export async function requestAdvance(
  request: AdvanceRequest,
  token?: string
): Promise<AdvanceResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/workers/${request.workerId}/advance`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: request.amount }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to request advance: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get active loan details
 */
export async function getActiveLoan(
  workerId: string,
  token?: string
): Promise<any | null> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/workers/${workerId}/loans/active`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // No active loan
    }
    throw new Error(`Failed to fetch active loan: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}
