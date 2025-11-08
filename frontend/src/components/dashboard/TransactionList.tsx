import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Transaction {
  id: string;
  type: "payment" | "advance" | "deposit";
  amount: number;
  description: string;
  timestamp: Date;
  status: "completed" | "pending";
}

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList = ({ transactions }: TransactionListProps) => {
  const getIcon = (type: string) => {
    return type === "deposit" ? (
      <ArrowDownLeft className="h-4 w-4 text-accent" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-secondary" />
    );
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                  {getIcon(tx.type)}
                </div>
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">{formatTime(tx.timestamp)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
                </p>
                <Badge variant={tx.status === "completed" ? "default" : "secondary"} className="text-xs">
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
