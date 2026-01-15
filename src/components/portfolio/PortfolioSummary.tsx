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
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
      borderColor: "border-amber-500/40",
    },
    {
      label: "Current Value",
      value: `৳${totals.currentValue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
      icon: PieChart,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-500/40",
    },
    {
      label: isProfit ? "Total Profit" : "Total Loss",
      value: `${isProfit ? "+" : ""}৳${totalGainLoss.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
      subValue: `(${isProfit ? "+" : ""}${totalGainLossPercent.toFixed(2)}%)`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? "text-emerald-400" : "text-rose-400",
      bgColor: isProfit ? "bg-emerald-500/20" : "bg-rose-500/20",
      borderColor: isProfit ? "border-emerald-500/40" : "border-rose-500/40",
    },
  ];

  if (portfolio.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-3">
      {summaryItems.map((item) => (
        <Card key={item.label} className={cn("p-3 md:p-5 border-2", item.bgColor, item.borderColor)}>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <div className={cn("rounded-lg md:rounded-xl p-2 md:p-3 w-fit", item.bgColor)}>
              <item.icon className={cn("h-4 w-4 md:h-6 md:w-6", item.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">{item.label}</p>
              <p className={cn("text-sm md:text-xl font-bold truncate", item.color)}>{item.value}</p>
              {item.subValue && (
                <p className={cn("text-xs md:text-sm font-semibold", item.color)}>{item.subValue}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
      <Card className="p-3 md:p-4 bg-secondary/30 col-span-2 md:col-span-3">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-center">
          <div>
            <p className="text-xl md:text-2xl font-bold">{totals.totalStocks}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Stocks</p>
          </div>
          <div className="h-6 md:h-8 w-px bg-border" />
          <div>
            <p className="text-xl md:text-2xl font-bold">{totals.totalShares.toLocaleString()}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Total Shares</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
