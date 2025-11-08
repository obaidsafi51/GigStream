import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

interface EarningsCardProps {
  balance: number;
  todayEarnings: number;
  isStreaming?: boolean;
}

export const EarningsCard = ({ balance, todayEarnings, isStreaming = false }: EarningsCardProps) => {
  return (
    <Card className={cn(
      "gradient-card shadow-md border-0",
      isStreaming && "payment-stream"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Available Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <DollarSign className="h-8 w-8 text-secondary" />
          <span className="text-4xl font-bold">{balance.toFixed(2)}</span>
          <span className="text-2xl text-muted-foreground">USDC</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-secondary" />
          <span className="text-secondary font-medium">+${todayEarnings.toFixed(2)}</span>
          <span className="text-muted-foreground">earned today</span>
        </div>

        {isStreaming && (
          <div className="mt-3 text-xs text-accent font-medium flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            Payment streaming active
          </div>
        )}
      </CardContent>
    </Card>
  );
};
