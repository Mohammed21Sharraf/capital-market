import { useMemo } from "react";
import { Stock } from "@/types/market";

interface StrengthMeterProps {
  stocks: Stock[];
}

export function StrengthMeter({ stocks }: StrengthMeterProps) {
  const { advancers, decliners, unchanged, total, advancerPercent, declinerPercent, unchangedPercent } = useMemo(() => {
    const advancers = stocks.filter((s) => s.change > 0).length;
    const decliners = stocks.filter((s) => s.change < 0).length;
    const unchanged = stocks.filter((s) => s.change === 0).length;
    const total = stocks.length || 1;

    return {
      advancers,
      decliners,
      unchanged,
      total,
      advancerPercent: (advancers / total) * 100,
      declinerPercent: (decliners / total) * 100,
      unchangedPercent: (unchanged / total) * 100,
    };
  }, [stocks]);

  // Calculate sentiment score (0-100, where 50 is neutral)
  const sentimentScore = useMemo(() => {
    if (stocks.length === 0) return 50;
    const ratio = advancers / (advancers + decliners || 1);
    return Math.round(ratio * 100);
  }, [stocks, advancers, decliners]);

  const getSentimentLabel = (score: number) => {
    if (score >= 80) return "Ex. Bull";
    if (score >= 60) return "Bull";
    if (score >= 40) return "Neutral";
    if (score >= 20) return "Bear";
    return "Ex. Bear";
  };

  const getSentimentColor = (score: number) => {
    if (score >= 60) return "text-price-up";
    if (score >= 40) return "text-price-neutral";
    return "text-price-down";
  };

  // SVG Donut chart
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const advancerDash = (advancerPercent / 100) * circumference;
  const declinerDash = (declinerPercent / 100) * circumference;
  const unchangedDash = (unchangedPercent / 100) * circumference;

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Winner/Loser Pie */}
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-foreground">Market Strength</h3>
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Donut Chart */}
          <div className="relative h-20 w-20 sm:h-28 sm:w-28">
            <svg className="h-20 w-20 sm:h-28 sm:w-28 -rotate-90 transform" viewBox="0 0 100 100">
              {/* Advancers */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="hsl(var(--price-up))"
                strokeWidth="8"
                strokeDasharray={`${advancerDash} ${circumference}`}
                strokeDashoffset="0"
                className="transition-all duration-500"
              />
              {/* Decliners */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="hsl(var(--price-down))"
                strokeWidth="8"
                strokeDasharray={`${declinerDash} ${circumference}`}
                strokeDashoffset={-advancerDash}
                className="transition-all duration-500"
              />
              {/* Unchanged */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="hsl(var(--price-neutral))"
                strokeWidth="8"
                strokeDasharray={`${unchangedDash} ${circumference}`}
                strokeDashoffset={-(advancerDash + declinerDash)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm sm:text-lg font-bold text-foreground">{total}</span>
              <span className="text-[8px] sm:text-[10px] text-muted-foreground">Stocks</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[hsl(var(--price-up))]"/>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Advancers</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-price-up">{advancers}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[hsl(var(--price-down))]"/>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Decliners</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-price-down">{decliners}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[hsl(var(--price-neutral))]"/>
              <span className="text-[10px] sm:text-xs text-muted-foreground">Unchanged</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-price-neutral">{unchanged}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Meter */}
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <h3 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-foreground">Market Sentiment</h3>
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          {/* Sentiment Score */}
          <div className="text-center">
            <span className={`text-xl sm:text-3xl font-bold ${getSentimentColor(sentimentScore)}`}>
              {getSentimentLabel(sentimentScore)}
            </span>
          </div>

          {/* Gauge Bar */}
          <div className="relative w-full">
            <div className="flex h-2.5 sm:h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
              {/* Indicator */}
              <div
                className="absolute top-1/2 h-4 w-1 sm:h-5 sm:w-1.5 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-500"
                style={{ left: `calc(${sentimentScore}% - 3px)` }}
              />
            </div>
          </div>

          {/* Labels */}
          <div className="flex w-full justify-between text-[8px] sm:text-[10px] text-muted-foreground">
            <span>Bear</span>
            <span>Neutral</span>
            <span>Bull</span>
          </div>

          {/* Score */}
          <div className="mt-1 sm:mt-2 text-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Advancer Ratio: </span>
            <span className={`font-mono text-xs sm:text-sm font-semibold ${getSentimentColor(sentimentScore)}`}>
              {sentimentScore}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
