import { BarChart3, Activity, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Stock } from "@/types/market";

interface MarketSummaryProps {
  stocks: Stock[];
}

export function MarketSummary({ stocks }: MarketSummaryProps) {
  const totalTrade = stocks.reduce((sum, s) => sum + s.trade, 0);
  const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);
  const totalValueMn = stocks.reduce((sum, s) => sum + s.valueMn, 0);
  const advancers = stocks.filter((s) => s.change > 0).length;
  const decliners = stocks.filter((s) => s.change < 0).length;

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + "B";
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + "M";
    if (volume >= 1000) return (volume / 1000).toFixed(2) + "K";
    return volume.toLocaleString();
  };

  const formatValue = (valueMn: number) => {
    if (valueMn >= 1000) return (valueMn / 1000).toFixed(2) + "B";
    return valueMn.toFixed(2) + "M";
  };

  const stats = [
    {
      label: "Total Trade",
      value: formatVolume(totalTrade),
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Volume",
      value: formatVolume(totalVolume),
      icon: BarChart3,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Total Value (Mn)",
      value: formatValue(totalValueMn),
      icon: DollarSign,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      label: "Advancers",
      value: advancers,
      icon: TrendingUp,
      color: "text-price-up",
      bgColor: "bg-success/10",
    },
    {
      label: "Decliners",
      value: decliners,
      icon: TrendingDown,
      color: "text-price-down",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 md:p-4"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`rounded-lg ${stat.bgColor} p-1.5 md:p-2`}>
              <stat.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stat.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] text-muted-foreground md:text-xs">{stat.label}</p>
              <p className={`font-mono text-sm font-bold md:text-lg ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}