import { Stock, StockFundamentals } from "@/types/market";
import { PriceAlert } from "@/hooks/usePriceAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  Bell,
  BellRing,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WatchlistMiniChart } from "./WatchlistMiniChart";

interface WatchlistStockCardProps {
  stock: Stock;
  fundamentals?: StockFundamentals;
  isLoadingFundamentals: boolean;
  alerts: PriceAlert[];
  onRemove: () => void;
  onAddAlert: () => void;
  onViewDetails: () => void;
}

export function WatchlistStockCard({
  stock,
  fundamentals,
  isLoadingFundamentals,
  alerts,
  onRemove,
  onAddAlert,
  onViewDetails,
}: WatchlistStockCardProps) {
  const isPositive = stock.changePercent >= 0;
  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  const formatMarketCap = (value?: number) => {
    if (!value) return "-";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
    return `${value.toFixed(0)}M`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {stock.symbol}
              {triggeredAlerts.length > 0 && (
                <BellRing className="h-4 w-4 text-yellow-500 animate-pulse" />
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
              {stock.name}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onAddAlert}
              title="Set price alert"
            >
              <Bell className={cn("h-4 w-4", activeAlerts.length > 0 && "text-primary")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Remove from watchlist"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Section */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">৳{stock.ltp.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-success" : "text-destructive"
                )}
              >
                {isPositive ? "+" : ""}
                {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>High: ৳{stock.high.toFixed(2)}</p>
            <p>Low: ৳{stock.low.toFixed(2)}</p>
          </div>
        </div>

        {/* Mini Chart */}
        <WatchlistMiniChart stock={stock} />

        {/* Fundamentals */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {isLoadingFundamentals ? (
            <div className="col-span-3 flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : fundamentals ? (
            <>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">EPS</p>
                <p className={`font-semibold ${
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
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">P/E</p>
                <p className="font-semibold">
                  {fundamentals.pe?.toFixed(1) ?? "-"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">MCap</p>
                <p className="font-semibold">
                  {formatMarketCap(fundamentals.marketCap)}
                </p>
              </div>
            </>
          ) : (
            <p className="col-span-3 text-xs text-muted-foreground">
              No fundamental data
            </p>
          )}
        </div>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Active Alerts</p>
            <div className="flex flex-wrap gap-1">
              {activeAlerts.map((alert) => (
                <Badge key={alert.id} variant="secondary" className="text-xs">
                  {alert.type === "above" ? "↑" : "↓"} ৳{alert.targetPrice}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-yellow-600">Triggered!</p>
            <div className="flex flex-wrap gap-1">
              {triggeredAlerts.map((alert) => (
                <Badge key={alert.id} variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  {alert.type === "above" ? "↑" : "↓"} ৳{alert.targetPrice}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View Details Button */}
        <Button variant="outline" className="w-full" onClick={onViewDetails}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
