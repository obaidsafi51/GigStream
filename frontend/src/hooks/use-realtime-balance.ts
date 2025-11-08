"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseRealtimeBalanceOptions {
  initialBalance: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onBalanceChange?: (newBalance: number, oldBalance: number) => void;
}

interface UseRealtimeBalanceReturn {
  balance: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for real-time balance updates with exponential backoff
 * Features:
 * - Polling every 2 seconds
 * - Exponential backoff on errors (max 10s)
 * - Pauses when tab is inactive
 * - Memory leak prevention
 * - Manual refetch capability
 */
export function useRealtimeBalance({
  initialBalance,
  enabled = true,
  onError,
  onBalanceChange,
}: UseRealtimeBalanceOptions): UseRealtimeBalanceReturn {
  const [balance, setBalance] = useState(initialBalance);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to track state without causing re-renders
  const intervalRef = useRef(2000); // Start at 2 seconds
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const previousBalanceRef = useRef(initialBalance);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch balance from API
  const fetchBalance = useCallback(async (): Promise<number> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const apiUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/v1/workers/balance`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: abortControllerRef.current.signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch balance: ${res.status}`);
    }

    const data = await res.json();
    return data.balanceUsdc || initialBalance;
  }, [initialBalance]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      const newBalance = await fetchBalance();

      // Check if balance changed
      if (newBalance !== previousBalanceRef.current) {
        onBalanceChange?.(newBalance, previousBalanceRef.current);
        previousBalanceRef.current = newBalance;
      }

      setBalance(newBalance);
      // Reset interval on successful fetch
      intervalRef.current = 2000;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");

      // Ignore abort errors
      if (error.name === "AbortError") {
        return;
      }

      setError(error);
      onError?.(error);

      // Exponential backoff: increase interval up to max 10s
      intervalRef.current = Math.min(intervalRef.current * 1.5, 10000);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchBalance, onBalanceChange, onError]);

  // Polling logic
  useEffect(() => {
    if (!enabled) {
      return;
    }

    isActiveRef.current = true;

    const poll = async () => {
      if (!isActiveRef.current) return;

      // Pause polling when tab is inactive
      if (document.hidden) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(poll, 5000); // Check again in 5s
        return;
      }

      // Fetch balance
      await refetch();

      // Schedule next poll
      if (isActiveRef.current) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(poll, intervalRef.current);
      }
    };

    // Start polling
    poll();

    // Listen for visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && isActiveRef.current) {
        // Tab became visible, reset interval and poll immediately
        intervalRef.current = 2000;
        poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, refetch]);

  return {
    balance,
    isLoading,
    error,
    refetch,
  };
}
