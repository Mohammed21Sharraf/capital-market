import { Card } from "@/components/ui/card";
import { PortfolioItem } from "@/hooks/usePortfolio";
import { Stock } from "@/types/market";
import { Wallet, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioSummaryProps {
  portfolio: PortfolioItem[];
  stocks: Stock[];
}

export function PortfolioSummary({ portfolio, stocks }: PortfolioSummaryProps) {
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  const totals = portfolio.reduce(
    (acc, item) => {
      const stock = stockMap.get(item.symbol);
      const currentPrice = stock?.ltp || item.costPrice;
      const totalCost = item.quantity * item.costPrice;
      const currentValue = item.quantity * currentPrice;

      return {
        totalInvested: acc.totalInvested + totalCost,
        currentValue: acc.currentValue + currentValue,
        totalStocks: acc.totalStocks + 1,
        totalShares: acc.totalShares + item.quantity,
      };
    },
    { totalInvested: 0, currentValue: 0, totalStocks: 0, totalShares: 0 }
  );

  const totalGainLoss = totals.currentValue - totals.totalInvested;
  const totalGainLossPercent = totals.totalInvested > 0 
    ? (totalGainLoss / totals.totalInvested) * 100 
    : 0;
  const isProfit = totalGainLoss >= 0;

  const summaryItems = [
    {
      label: "Total Invested",
      value: `৳${totals.totalInvested.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Current Value",
      value: `৳${totals.currentValue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
      icon: PieChart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: isProfit ? "Total Profit" : "Total Loss",
      value: `${isProfit ? "+" : ""}৳${totalGainLoss.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
      subValue: `(${isProfit ? "+" : ""}${totalGainLossPercent.toFixed(2)}%)`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? "text-emerald-500" : "text-rose-500",
      bgColor: isProfit ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
  ];

  if (portfolio.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaryItems.map((item) => (
        <Card key={item.label} className={cn("p-4", item.bgColor)}>
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2", item.bgColor)}>
              <item.icon className={cn("h-5 w-5", item.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
              {item.subValue && (
                <p className={cn("text-xs font-medium", item.color)}>{item.subValue}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
      <Card className="p-4 bg-secondary/30 md:col-span-3">
        <div className="flex flex-wrap items-center justify-center gap-6 text-center">
          <div>
            <p className="text-2xl font-bold">{totals.totalStocks}</p>
            <p className="text-xs text-muted-foreground">Stocks</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold">{totals.totalShares.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Shares</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
