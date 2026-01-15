import { RefreshCw, TrendingUp, Clock, Activity, Zap, Star, Eye, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketStatus, Stock } from "@/types/market";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StockSearch } from "./StockSearch";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePortfolio } from "@/hooks/usePortfolio";

interface MarketHeaderProps {
  status: MarketStatus;
  lastRefresh: Date;
  nextRefresh: number;
  isLoading: boolean;
  onRefresh: () => void;
  stocks?: Stock[];
  onStockSelect?: (stock: Stock) => void;
}

export function MarketHeader({
  status,
  lastRefresh,
  nextRefresh,
  isLoading,
  onRefresh,
  stocks = [],
  onStockSelect,
}: MarketHeaderProps) {
  const { watchlist } = useWatchlist();
  const { portfolio } = usePortfolio();

  return (
    <header className="border-b border-border/50 bg-gradient-to-r from-card via-card to-card/80 px-4 py-3 md:px-6 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left Section - Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-lg shadow-primary/25">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
              <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight md:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                EDUINT Capital
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Live Exchange Data
              </p>
            </div>
          </div>

          {/* Center Section - Search & Nav Links */}
          <div className="flex flex-1 items-center justify-center gap-2 md:gap-3">
            {/* Search */}
            <StockSearch stocks={stocks} onStockSelect={onStockSelect} />

            {/* Navigation Links */}
            <Link to="/watchlist">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 rounded-full px-3 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Watchlist</span>
                {watchlist.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {watchlist.length}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/portfolio">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 rounded-full px-3 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Portfolio</span>
                {portfolio.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {portfolio.length}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/birds-eye">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 rounded-full px-3 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Bird's Eye</span>
              </Button>
            </Link>

            {/* Combined Update Tab */}
            <div className="hidden lg:flex items-center gap-3 rounded-full bg-secondary/60 px-4 py-1.5 border border-border/50">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {lastRefresh.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Zap className={cn(
                  "h-3.5 w-3.5",
                  nextRefresh <= 5 ? "text-primary animate-pulse" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-mono font-medium",
                  nextRefresh <= 5 ? "text-primary" : "text-muted-foreground"
                )}>
                  {nextRefresh}s
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-6 w-6 rounded-full hover:bg-primary/10"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Right Section - Market Status */}
          <div className="flex items-center gap-2">
            {/* Mobile/Tablet Update Info */}
            <div className="flex lg:hidden items-center gap-2 rounded-full bg-secondary/60 px-3 py-1.5 border border-border/50">
              <span className="text-xs font-mono text-muted-foreground">{nextRefresh}s</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-5 w-5 rounded-full"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            </div>

            {/* Market Status Badge */}
            <div className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-all duration-300",
              status.isOpen 
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                : "bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-lg shadow-rose-500/10"
            )}>
              <Activity className={cn(
                "h-4 w-4",
                status.isOpen && "animate-pulse"
              )} />
              <span className="hidden sm:inline">
                {status.isOpen ? "Market Open" : "Market Closed"}
              </span>
              <span className="sm:hidden">
                {status.isOpen ? "Open" : "Closed"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
