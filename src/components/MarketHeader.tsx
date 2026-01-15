import { RefreshCw, TrendingUp } from "lucide-react";
import { MarketStatus } from "@/types/market";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketHeaderProps {
  status: MarketStatus;
  lastRefresh: Date;
  nextRefresh: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MarketHeader({
  status,
  lastRefresh,
  nextRefresh,
  isLoading,
  onRefresh,
}: MarketHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-4 py-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 glow-primary">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                EDUINT Capital Market
              </h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                Real-time Stock Exchange Data
              </p>
            </div>
          </div>

          {/* Status and Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Market Status */}
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <span
                className={cn(
                  "status-dot",
                  status.isOpen ? "status-dot-open" : "status-dot-closed"
                )}
              />
              <span className="text-sm font-medium">
                {status.isOpen ? "Market Open" : "Market Closed"}
              </span>
            </div>

            {/* Last Updated */}
            <div className="hidden text-sm text-muted-foreground md:block">
              <span>Updated: </span>
              <span className="font-mono">
                {lastRefresh.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>

            {/* Next Refresh Countdown */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Next update:</span>
              <span className={cn("font-mono", nextRefresh <= 5 && "text-primary refresh-pulse")}>
                {nextRefresh}s
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
