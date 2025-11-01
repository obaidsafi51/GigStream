/**
 * API Type Definitions
 * Shared types for request/response objects
 */

// Common response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Worker types
export interface Worker {
  id: string;
  email: string;
  name: string;
  walletId: string;
  walletAddress: string;
  reputationScore: number;
  totalEarnings: number;
  totalTasks: number;
  completionRate: number;
  createdAt: string;
}

export interface WorkerBalance {
  walletAddress: string;
  usdcBalance: number;
  pendingEarnings: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'stream_release' | 'loan_disbursement' | 'loan_repayment';
  amount: number;
  fromAddress: string;
  toAddress: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

// Platform types
export interface Platform {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  webhookUrl: string;
  createdAt: string;
}

// Task types
export interface Task {
  id: string;
  workerId: string;
  platformId: string;
  type: 'fixed' | 'streaming';
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  verificationData?: TaskVerificationData;
  completedAt?: string;
  createdAt: string;
}

export interface TaskVerificationData {
  photo?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

// Stream types
export interface PaymentStream {
  id: number;
  contractStreamId: number;
  workerId: string;
  platformId: string;
  totalAmount: number;
  releasedAmount: number;
  claimedAmount: number;
  duration: number;
  releaseInterval: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
}

// Loan types
export interface Loan {
  id: string;
  workerId: string;
  amount: number;
  feeRate: number;
  totalAmount: number;
  repaidAmount: number;
  status: 'pending' | 'approved' | 'disbursed' | 'active' | 'repaying' | 'repaid' | 'defaulted';
  requestedAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  dueAt?: string;
  completedAt?: string;
}

// Reputation types
export interface ReputationScore {
  workerId: string;
  score: number;
  breakdown: {
    completionRate: number;
    accountAge: number;
    taskConsistency: number;
    averageRating: number;
    disputeRate: number;
    paymentHistory: number;
  };
  lastUpdated: string;
}

// JWT payload
export interface JWTPayload {
  sub: string; // User ID
  type: 'worker' | 'platform';
  wallet?: string;
  iat: number;
  exp: number;
}
