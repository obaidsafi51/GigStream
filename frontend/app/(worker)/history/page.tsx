"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  txHash: string | null;
  taskTitle: string | null;
  taskDescription: string | null;
  createdAt: string;
  confirmedAt: string | null;
  metadata: any;
}

interface EarningsResponse {
  success: boolean;
  data?: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    summary: {
      totalEarnings: number;
      totalAdvances: number;
      totalRepayments: number;
      netEarnings: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function HistoryPage() {
  const { user, token } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    totalAdvances: 0,
    totalRepayments: 0,
    netEarnings: 0,
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:8787/api/v1/workers/${user.id}/earnings?limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${token || ''}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data: EarningsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to fetch transactions');
        }

        if (data.data) {
          setTransactions(data.data.transactions);
          setSummary(data.data.summary);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.id, token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payout: 'Task Payout',
      advance: 'Advance',
      repayment: 'Repayment',
      refund: 'Refund',
      fee: 'Fee',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      confirmed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const truncateHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const getAmountDisplay = (type: string, amount: number) => {
    // Repayments and fees are negative from worker's perspective
    const isNegative = type === 'repayment' || type === 'fee';
    const displayAmount = isNegative ? -Math.abs(amount) : Math.abs(amount);
    const colorClass = displayAmount > 0 ? 'text-secondary' : 'text-destructive';
    const sign = displayAmount > 0 ? '+' : '';
    
    return (
      <span className={colorClass}>
        {sign}${Math.abs(displayAmount).toFixed(2)}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please log in to view your transaction history</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-muted-foreground">View all your payments and earnings</p>
      </div>

      {/* Summary Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Earnings</div>
              <div className="text-2xl font-bold text-secondary">
                ${summary.totalEarnings.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Advances</div>
              <div className="text-2xl font-bold">
                ${summary.totalAdvances.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Repayments</div>
              <div className="text-2xl font-bold text-destructive">
                ${summary.totalRepayments.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Net Earnings</div>
              <div className="text-2xl font-bold text-primary">
                ${summary.netEarnings.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive mb-2">Error loading transactions</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell>{getTypeLabel(tx.type)}</TableCell>
                    <TableCell>{tx.taskTitle || 'N/A'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {getAmountDisplay(tx.type, tx.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tx.status)}
                    </TableCell>
                    <TableCell>
                      {tx.txHash ? (
                        <a
                          href={`https://explorer.circle.com/arc-testnet/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {truncateHash(tx.txHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
