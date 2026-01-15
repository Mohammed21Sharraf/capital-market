import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, DollarSign, ArrowUpDown, Building2, Tag, Loader2 } from "lucide-react";
import { Stock, StockFundamentals } from "@/types/market";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo, useEffect } from "react";
import { useStockFundamentals } from "@/hooks/useStockFundamentals";
import { Badge } from "@/components/ui/badge";

interface StockDetailModalProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StockDetailModal({ stock, isOpen, onClose }: StockDetailModalProps) {
  const { fundamentals, isLoading: loadingFundamentals, fetchFundamentals, clearFundamentals } = useStockFundamentals();

  // Fetch fundamentals when modal opens - must be before any conditional returns
  useEffect(() => {
    if (isOpen && stock) {
      fetchFundamentals(stock.symbol);
    } else {
      clearFundamentals();
    }
  }, [isOpen, stock?.symbol, fetchFundamentals, clearFundamentals]);

  // Calculate day range position (0-100) - must be before any conditional returns
  const dayRangePosition = useMemo(() => {
    if (!stock) return 50;
    if (stock.high === stock.low) return 50;
    return Math.min(100, Math.max(0, ((stock.ltp - stock.low) / (stock.high - stock.low)) * 100));
  }, [stock?.ltp, stock?.high, stock?.low]);

  // Calculate volatility indicator - must be before any conditional returns
  const volatility = useMemo(() => {
    if (!stock || stock.previousClose === 0) return 0;
    return ((stock.high - stock.low) / stock.previousClose) * 100;
  }, [stock?.high, stock?.low, stock?.previousClose]);

  // Early return AFTER all hooks
  if (!stock) return null;

  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  const formatNumber = (num: number) => num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + "M";
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + "K";
    }
    return volume.toLocaleString();
  };

  const formatValue = (valueMn: number) => {
    if (valueMn >= 1000) return (valueMn / 1000).toFixed(2) + "B";
    if (valueMn >= 1) return valueMn.toFixed(2) + "M";
    return (valueMn * 1000).toFixed(2) + "K";
  };

  const formatMarketCap = (cap?: number) => {
    if (!cap) return "—";
    if (cap >= 1000) return (cap / 1000).toFixed(2) + " B";
    return cap.toFixed(2) + " M";
  };

  // Performance label
  const getPerformanceLabel = () => {
    if (stock.changePercent >= 5) return { label: "Strong Gainer", color: "text-price-up bg-success/20" };
    if (stock.changePercent >= 2) return { label: "Gainer", color: "text-price-up bg-success/10" };
    if (stock.changePercent <= -5) return { label: "Strong Loser", color: "text-price-down bg-destructive/20" };
    if (stock.changePercent <= -2) return { label: "Loser", color: "text-price-down bg-destructive/10" };
    return { label: "Stable", color: "text-price-neutral bg-muted" };
  };

  const performance = getPerformanceLabel();

  // Get category color
  const getCategoryColor = (category?: string) => {
    switch (category?.toUpperCase()) {
      case "A": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "B": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "N": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Z": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const sector = fundamentals?.sector || stock.sector;
  const category = fundamentals?.category || stock.category;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-border bg-card sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold text-foreground">{stock.symbol}</span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium",
                isPositive && "bg-success/10 text-price-up",
                isNegative && "bg-destructive/10 text-price-down",
                !isPositive && !isNegative && "bg-muted text-price-neutral"
              )}
            >
              {isPositive && <TrendingUp className="h-4 w-4" />}
              {isNegative && <TrendingDown className="h-4 w-4" />}
              {!isPositive && !isNegative && <Minus className="h-4 w-4" />}
              {isPositive && "+"}
              {stock.changePercent.toFixed(2)}%
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company Name & Performance Badge */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">{stock.name}</p>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", performance.color)}>
              {performance.label}
            </span>
          </div>

          {/* Sector & Category Badges */}
          {(sector || category) && (
            <div className="flex items-center gap-2 flex-wrap">
              {sector && (
                <Badge variant="outline" className="flex items-center gap-1.5 bg-muted/50">
                  <Building2 className="h-3 w-3" />
                  {sector}
                </Badge>
              )}
              {category && (
                <Badge variant="outline" className={cn("flex items-center gap-1.5", getCategoryColor(category))}>
                  <Tag className="h-3 w-3" />
                  Category {category}
                </Badge>
              )}
            </div>
          )}

          {/* Current Price */}
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Last Traded Price</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-foreground">
                ৳{formatNumber(stock.ltp)}
              </span>
              <span
                className={cn(
                  "font-mono text-lg font-semibold",
                  isPositive && "text-price-up",
                  isNegative && "text-price-down",
                  !isPositive && !isNegative && "text-price-neutral"
                )}
              >
                {isPositive && "+"}
                {formatNumber(stock.change)}
              </span>
            </div>
          </div>

          {/* Price Details Grid - Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard label="CloseP" value={`৳${formatNumber(stock.open)}`} />
            <DetailCard label="YCP" value={`৳${formatNumber(stock.previousClose)}`} />
          </div>

          {/* Price Details Grid - Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard 
              label="Day High" 
              value={`৳${formatNumber(stock.high)}`}
              valueClass="text-price-up"
            />
            <DetailCard 
              label="Day Low" 
              value={`৳${formatNumber(stock.low)}`}
              valueClass="text-price-down"
            />
          </div>

          {/* Trading Analytics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard 
              label="Volume" 
              value={formatVolume(stock.volume)}
              icon={<BarChart3 className="h-3.5 w-3.5 text-cyan-400" />}
            />
            <DetailCard 
              label="Change %" 
              value={`${isPositive ? "+" : ""}${stock.changePercent.toFixed(2)}%`}
              valueClass={cn(
                isPositive && "text-price-up",
                isNegative && "text-price-down"
              )}
              icon={<ArrowUpDown className="h-3.5 w-3.5 text-primary" />}
            />
          </div>

          {/* Trade & Value */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard 
              label="Total Trades" 
              value={stock.trade.toLocaleString()}
              icon={<Activity className="h-3.5 w-3.5 text-purple-400" />}
            />
            <DetailCard 
              label="Value (Mn)" 
              value={formatValue(stock.valueMn)}
              icon={<DollarSign className="h-3.5 w-3.5 text-yellow-400" />}
            />
          </div>

          {/* Day Range Visual */}
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Day Range</p>
              <span className="text-xs text-muted-foreground">
                Volatility: <span className="font-mono font-medium text-foreground">{volatility.toFixed(2)}%</span>
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 overflow-hidden">
              <div
                className="absolute top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-lg border border-gray-300 transition-all duration-300"
                style={{
                  left: `calc(${dayRangePosition}% - 3px)`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-mono text-price-down">৳{formatNumber(stock.low)}</span>
              <span className="text-muted-foreground">Current: ৳{formatNumber(stock.ltp)}</span>
              <span className="font-mono text-price-up">৳{formatNumber(stock.high)}</span>
            </div>
          </div>

          {/* Fundamental Data Section */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Fundamentals</p>
              {loadingFundamentals && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            
            {loadingFundamentals ? (
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3 w-12 bg-muted rounded mb-1"></div>
                    <div className="h-5 w-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : fundamentals ? (
              <div className="grid grid-cols-3 gap-4 text-center">
                <FundamentalItem 
                  label="Market Cap" 
                  value={formatMarketCap(fundamentals.marketCap)} 
                />
                <FundamentalItem 
                  label="P/E Ratio" 
                  value={fundamentals.pe ? fundamentals.pe.toFixed(2) : "—"} 
                />
                <FundamentalItem 
                  label="EPS" 
                  value={fundamentals.eps ? `৳${fundamentals.eps.toFixed(2)}` : "—"} 
                />
                <FundamentalItem 
                  label="NAV" 
                  value={fundamentals.nav ? `৳${fundamentals.nav.toFixed(2)}` : "—"} 
                />
                <FundamentalItem 
                  label="52W High" 
                  value={fundamentals.yearHigh ? `৳${formatNumber(fundamentals.yearHigh)}` : "—"} 
                  valueClass="text-price-up"
                />
                <FundamentalItem 
                  label="52W Low" 
                  value={fundamentals.yearLow ? `৳${formatNumber(fundamentals.yearLow)}` : "—"} 
                  valueClass="text-price-down"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Fundamental data unavailable</p>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Quick Analysis</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Spread</p>
                <p className="font-mono text-sm font-semibold text-foreground truncate">
                  ৳{formatNumber(stock.high - stock.low)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Avg Price</p>
                <p className="font-mono text-sm font-semibold text-foreground truncate">
                  ৳{formatNumber((stock.high + stock.low) / 2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">From YCP</p>
                <p className={cn(
                  "font-mono text-sm font-semibold truncate",
                  isPositive && "text-price-up",
                  isNegative && "text-price-down",
                  !isPositive && !isNegative && "text-price-neutral"
                )}>
                  {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailCard({ 
  label, 
  value, 
  valueClass,
  icon
}: { 
  label: string; 
  value: string; 
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={cn("font-mono text-sm font-semibold text-foreground mt-1", valueClass)}>
        {value}
      </p>
    </div>
  );
}

function FundamentalItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-sm font-semibold text-foreground truncate", valueClass)}>
        {value}
      </p>
    </div>
  );
}
