import { Stock } from "@/types/market";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockTickerProps {
  stocks: Stock[];
}

const TickerItem = ({ stock }: { stock: Stock }) => {
  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 border-r border-border/50">
      <span className="font-medium text-foreground whitespace-nowrap">
        {stock.symbol}
      </span>
      <span className="font-mono text-sm text-foreground/90 whitespace-nowrap">
        {stock.ltp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <div
        className={cn(
          "inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap",
          isPositive && "text-price-up",
          isNegative && "text-price-down",
          !isPositive && !isNegative && "text-price-neutral"
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isNegative ? (
          <TrendingDown className="h-3 w-3" />
        ) : null}
        <span>
          {isPositive ? "▲" : isNegative ? "▼" : ""}
          {" "}
          {Math.abs(stock.change).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export const StockTicker = ({ stocks }: StockTickerProps) => {
  // Get top active stocks by value for the ticker
  const tickerStocks = [...stocks]
    .sort((a, b) => b.valueMn - a.valueMn)
    .slice(0, 30);

  if (tickerStocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-card border-b border-border overflow-hidden">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {/* First set of items */}
          {tickerStocks.map((stock, index) => (
            <TickerItem key={`first-${stock.symbol}-${index}`} stock={stock} />
          ))}
          {/* Duplicate for seamless loop */}
          {tickerStocks.map((stock, index) => (
            <TickerItem key={`second-${stock.symbol}-${index}`} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
};
