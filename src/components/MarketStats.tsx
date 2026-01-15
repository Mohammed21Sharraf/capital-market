import { TrendingUp, TrendingDown, BarChart3, Activity, Banknote } from "lucide-react";
import { Stock } from "@/types/market";

interface MarketStatsProps {
  stocks: Stock[];
}

export function MarketStats({ stocks }: MarketStatsProps) {
  const advancers = stocks.filter((s) => s.change > 0).length;
  const decliners = stocks.filter((s) => s.change < 0).length;
  const unchanged = stocks.filter((s) => s.change === 0).length;
  const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);
  const totalValueMn = stocks.reduce((sum, s) => sum + s.valueMn, 0);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + "M";
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + "K";
    }
    return volume.toLocaleString();
  };

  const formatValue = (valueMn: number) => {
    if (valueMn >= 1000) {
      return (valueMn / 1000).toFixed(2) + "B";
    }
    return valueMn.toFixed(2) + "M";
  };

  const stats = [
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
    {
      label: "Unchanged",
      value: unchanged,
      icon: Activity,
      color: "text-price-neutral",
      bgColor: "bg-muted",
    },
    {
      label: "Total Volume",
      value: formatVolume(totalVolume),
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Value (Mn)",
      value: formatValue(totalValueMn),
      icon: Banknote,
      color: "text-accent-foreground",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg ${stat.bgColor} p-2`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`font-mono text-lg font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
