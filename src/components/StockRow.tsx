import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Stock } from "@/types/market";
import { cn } from "@/lib/utils";

interface StockRowProps {
  stock: Stock;
  index: number;
  onClick: (stock: Stock) => void;
}

export function StockRow({ stock, index, onClick }: StockRowProps) {
  const [flashClass, setFlashClass] = useState("");
  
  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  // Flash animation on price change
  useEffect(() => {
    if (stock.previousLtp !== undefined && stock.previousLtp !== stock.ltp) {
      const newFlashClass = stock.ltp > stock.previousLtp ? "price-flash-up" : "price-flash-down";
      setFlashClass(newFlashClass);
      
      const timer = setTimeout(() => setFlashClass(""), 600);
      return () => clearTimeout(timer);
    }
  }, [stock.ltp, stock.previousLtp]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + "M";
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + "K";
    }
    return volume.toLocaleString();
  };

  return (
    <tr
      className={cn(
        "market-table-row cursor-pointer border-b border-table-border transition-colors hover:bg-muted/50",
        flashClass
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => onClick(stock)}
    >
      {/* Symbol & Name */}
      <td className="px-4 py-3 md:px-6">
        <div>
          <span className="font-semibold text-foreground">{stock.symbol}</span>
          <p className="hidden text-xs text-muted-foreground md:block">{stock.name}</p>
        </div>
      </td>

      {/* LTP */}
      <td className="px-4 py-3 text-right font-mono md:px-6">
        <span className="text-foreground">{stock.ltp.toFixed(2)}</span>
      </td>

      {/* Change */}
      <td className="px-4 py-3 text-right md:px-6">
        <div className="flex items-center justify-end gap-1">
          {isPositive && <TrendingUp className="h-4 w-4 text-price-up" />}
          {isNegative && <TrendingDown className="h-4 w-4 text-price-down" />}
          {!isPositive && !isNegative && <Minus className="h-4 w-4 text-price-neutral" />}
          <span
            className={cn(
              "font-mono",
              isPositive && "text-price-up",
              isNegative && "text-price-down",
              !isPositive && !isNegative && "text-price-neutral"
            )}
          >
            {isPositive && "+"}
            {stock.change.toFixed(2)}
          </span>
        </div>
      </td>

      {/* Change % */}
      <td className="hidden px-4 py-3 text-right md:table-cell md:px-6">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium",
            isPositive && "bg-success/10 text-price-up",
            isNegative && "bg-destructive/10 text-price-down",
            !isPositive && !isNegative && "bg-muted text-price-neutral"
          )}
        >
          {isPositive && "+"}
          {stock.changePercent.toFixed(2)}%
        </span>
      </td>

      {/* Volume */}
      <td className="px-4 py-3 text-right font-mono text-muted-foreground md:px-6">
        {formatVolume(stock.volume)}
      </td>
    </tr>
  );
}
