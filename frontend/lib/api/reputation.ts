/**
 * API functions for reputation operations
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787";

/**
 * Badge type
 */
export interface Badge {
  name: string;
  icon: string;
  earned: boolean;
  description: string;
}

/**
 * Reputation event type
 */
export interface ReputationEvent {
  id: string;
  type: string;
  pointsDelta: number;
  previousScore: number;
  newScore: number;
  description: string | null;
  createdAt: Date | string;
  metadata: Record<string, unknown>;
}

/**
 * Score factor breakdown
 */
export interface ScoreFactor {
  name: string;
  value: number;
  description: string;
}

/**
 * Reputation response type
 */
export interface ReputationResponse {
  score: number;
  maxScore: number;
  rank: string;
  grade: string;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  avgRating: number;
  avgWorkerScore: number;
  percentile: number;
  factors: ScoreFactor[];
  badges: Badge[];
  events: ReputationEvent[];
  riskScore: {
    score: number;
    confidence: number;
    algorithmUsed: string;
  };
}

/**
 * Fetch reputation data for a worker
 */
export async function fetchReputation(
  workerId: string,
  token?: string
): Promise<ReputationResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/workers/${workerId}/reputation`,
    {
      headers,
      cache: "no-store", // Always fetch fresh data
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch reputation: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}
