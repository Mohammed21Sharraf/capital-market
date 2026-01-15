import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity } from "lucide-react";
import { Stock } from "@/types/market";
import { cn } from "@/lib/utils";

interface TopMoversProps {
  stocks: Stock[];
  onStockClick: (stock: Stock) => void;
}

type TabType = "gainer" | "loser" | "volume" | "value" | "trade";

const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: "gainer", label: "Top Gainer", icon: TrendingUp },
  { key: "loser", label: "Top Loser", icon: TrendingDown },
  { key: "volume", label: "Top Volume", icon: BarChart3 },
  { key: "value", label: "Top Value", icon: DollarSign },
  { key: "trade", label: "Top Trade", icon: Activity },
];

export function TopMovers({ stocks, onStockClick }: TopMoversProps) {
  const [activeTab, setActiveTab] = useState<TabType>("gainer");

  const topStocks = useMemo(() => {
    const sorted = [...stocks];
    switch (activeTab) {
      case "gainer":
        return sorted.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
      case "loser":
        return sorted.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
      case "volume":
        return sorted.sort((a, b) => b.volume - a.volume).slice(0, 10);
      case "value":
        return sorted.sort((a, b) => b.valueMn - a.valueMn).slice(0, 10);
      case "trade":
        return sorted.sort((a, b) => b.trade - a.trade).slice(0, 10);
      default:
        return [];
    }
  }, [stocks, activeTab]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + "M";
    if (volume >= 1000) return (volume / 1000).toFixed(1) + "K";
    return volume.toLocaleString();
  };

  const formatValue = (valueMn: number) => {
    if (valueMn >= 1000) return (valueMn / 1000).toFixed(2) + "B";
    return valueMn.toFixed(2) + "M";
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Tabs */}
      <div className="flex flex-wrap border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors md:px-4 md:text-sm",
              activeTab === tab.key
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[1]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-table-header">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                Symbol
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                LTP
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                Change %
              </th>
              {activeTab === "volume" && (
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                  Volume
                </th>
              )}
              {activeTab === "trade" && (
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                  Trade
                </th>
              )}
              {activeTab === "value" && (
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:px-4">
                  Value (Mn)
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {topStocks.length > 0 ? (
              topStocks.map((stock, index) => {
                const isPositive = stock.changePercent > 0;
                const isNegative = stock.changePercent < 0;
                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onStockClick(stock)}
                    className="cursor-pointer border-b border-table-border transition-colors hover:bg-muted/50"
                  >
                    <td className="px-3 py-2 md:px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-foreground">{stock.symbol}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground md:px-4">
                      {stock.ltp.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right md:px-4">
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
                    {activeTab === "volume" && (
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground md:px-4">
                        {formatVolume(stock.volume)}
                      </td>
                    )}
                    {activeTab === "trade" && (
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground md:px-4">
                        {stock.trade.toLocaleString()}
                      </td>
                    )}
                    {activeTab === "value" && (
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground md:px-4">
                        {formatValue(stock.valueMn)}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}