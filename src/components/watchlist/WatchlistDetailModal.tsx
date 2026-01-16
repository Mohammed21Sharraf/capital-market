import { Stock, StockFundamentals } from "@/types/market";
import { PriceAlert } from "@/hooks/usePriceAlerts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Bell,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoricalChart } from "./HistoricalChart";

interface WatchlistDetailModalProps {
  stock: Stock | null;
  fundamentals?: StockFundamentals;
  isLoadingFundamentals: boolean;
  alerts: PriceAlert[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveFromWatchlist: () => void;
  onAddAlert: () => void;
}

export function WatchlistDetailModal({
  stock,
  fundamentals,
  isLoadingFundamentals,
  alerts,
  isOpen,
  onClose,
  onRemoveFromWatchlist,
  onAddAlert,
}: WatchlistDetailModalProps) {
  if (!stock) return null;

  const isPositive = stock.changePercent >= 0;
  const activeAlerts = alerts.filter((a) => !a.triggered);

  const formatMarketCap = (value?: number) => {
    if (!value) return "-";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
    return `${value.toFixed(0)}M`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                {stock.symbol}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{stock.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onAddAlert}
                className="gap-1"
              >
                <Bell className={cn("h-4 w-4", activeAlerts.length > 0 && "text-primary")} />
                {activeAlerts.length > 0 ? `${activeAlerts.length} Alert${activeAlerts.length > 1 ? "s" : ""}` : "Set Alert"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRemoveFromWatchlist}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Price Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold">৳{stock.ltp.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-2">
                {isPositive ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-lg font-medium",
                    isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Trading Stats */}
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Open:</span>
                <span className="font-mono">৳{stock.open.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">High:</span>
                <span className="font-mono text-success">৳{stock.high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Low:</span>
                <span className="font-mono text-destructive">৳{stock.low.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Prev Close:</span>
                <span className="font-mono">৳{stock.previousClose.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Historical Chart */}
          <HistoricalChart stock={stock} />

          <Separator />

          {/* Fundamentals Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Fundamentals</h3>
            {isLoadingFundamentals ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : fundamentals ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">EPS</p>
                  <p className={`text-lg font-semibold ${
                    fundamentals.eps !== undefined && fundamentals.eps !== null
                      ? fundamentals.eps < 0 
                        ? 'text-price-down' 
                        : fundamentals.eps > 0 
                          ? 'text-price-up' 
                          : ''
                      : ''
                  }`}>
                    {fundamentals.eps?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">P/E Ratio</p>
                  <p className="text-lg font-semibold">
                    {fundamentals.pe?.toFixed(1) ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                  <p className="text-lg font-semibold">
                    {formatMarketCap(fundamentals.marketCap)}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">NAV</p>
                  <p className="text-lg font-semibold">
                    {fundamentals.nav?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">52W High</p>
                  <p className="text-lg font-semibold text-success">
                    ৳{fundamentals.yearHigh?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">52W Low</p>
                  <p className="text-lg font-semibold text-destructive">
                    ৳{fundamentals.yearLow?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Sector</p>
                  <p className="text-sm font-semibold truncate">
                    {fundamentals.sector ?? "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-lg font-semibold">
                    {fundamentals.category ?? "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No fundamental data available
              </p>
            )}
          </div>

          {/* Trading Activity */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Trading Activity</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-lg font-semibold font-mono">
                  {stock.volume.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Value (Mn)</p>
                <p className="text-lg font-semibold font-mono">
                  ৳{stock.valueMn.toFixed(2)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Trades</p>
                <p className="text-lg font-semibold font-mono">
                  {stock.trade.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Price Alerts</h3>
              <div className="flex flex-wrap gap-2">
                {activeAlerts.map((alert) => (
                  <Badge key={alert.id} variant="secondary" className="text-sm py-1 px-3">
                    {alert.type === "above" ? "↑ Above" : "↓ Below"} ৳{alert.targetPrice}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
