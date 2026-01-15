import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Stock } from "@/types/market";
import { TopValueChart } from "./TopValueChart";
import { cn } from "@/lib/utils";

interface ValueChartSectionProps {
  stocks: Stock[];
  onStockClick?: (stock: Stock) => void;
}

type TabType = "highest" | "lowest";

export function ValueChartSection({ stocks, onStockClick }: ValueChartSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("highest");

  const tabs = [
    { key: "highest" as TabType, label: "Top 20 Highest Value", icon: TrendingUp },
    { key: "lowest" as TabType, label: "Top 20 Lowest Value", icon: TrendingDown },
  ];

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="p-4">
        <TopValueChart stocks={stocks} type={activeTab} onStockClick={onStockClick} />
      </div>
    </div>
  );
}