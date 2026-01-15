import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMarketData } from "@/hooks/useMarketData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { Stock, StockFundamentals } from "@/types/market";
import { supabase } from "@/integrations/supabase/client";
import { WatchlistStockCard } from "@/components/watchlist/WatchlistStockCard";
import { PriceAlertDialog } from "@/components/watchlist/PriceAlertDialog";
import { WatchlistDetailModal } from "@/components/watchlist/WatchlistDetailModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  RefreshCw,
  Bell,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FundamentalsCache {
  [symbol: string]: StockFundamentals;
}

const Watchlist = () => {
  const { stocks, isLoading, lastRefresh, refresh } = useMarketData();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const {
    alerts,
    addAlert,
    removeAlert,
    checkAlerts,
    clearTriggeredAlerts,
  } = usePriceAlerts();

  const [fundamentals, setFundamentals] = useState<FundamentalsCache>({});
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [alertDialogStock, setAlertDialogStock] = useState<Stock | null>(null);
  const [detailStock, setDetailStock] = useState<Stock | null>(null);

  // Get watchlist stocks from market data
  const watchlistStocks = useMemo(
    () => stocks.filter((s) => watchlist.includes(s.symbol)),
    [stocks, watchlist]
  );

  // Fetch fundamentals for watchlist stocks
  const fetchFundamental = async (symbol: string) => {
    if (fundamentals[symbol] || loadingSymbols.has(symbol)) return;

    setLoadingSymbols((prev) => new Set([...prev, symbol]));

    try {
      const { data, error } = await supabase.functions.invoke("stock-fundamentals", {
        body: { symbol },
      });

      if (!error && data?.data) {
        setFundamentals((prev) => ({
          ...prev,
          [symbol]: data.data,
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch fundamentals for ${symbol}:`, err);
    } finally {
      setLoadingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  };

  // Fetch fundamentals for all watchlist stocks
  useEffect(() => {
    watchlistStocks.forEach((stock) => {
      if (!fundamentals[stock.symbol]) {
        fetchFundamental(stock.symbol);
      }
    });
  }, [watchlistStocks]);

  // Check price alerts when stock prices update
  useEffect(() => {
    watchlistStocks.forEach((stock) => {
      const triggered = checkAlerts(stock.symbol, stock.ltp);
      triggered.forEach((alert) => {
        toast.warning(`Price Alert: ${alert.symbol}`, {
          description: `${alert.type === "above" ? "Crossed above" : "Dropped below"} ৳${alert.targetPrice}`,
          duration: 10000,
        });
      });
    });
  }, [watchlistStocks, checkAlerts]);

  const handleAddAlert = (symbol: string, type: "above" | "below", targetPrice: number) => {
    addAlert(symbol, type, targetPrice);
    toast.success("Alert created", {
      description: `You'll be notified when ${symbol} goes ${type} ৳${targetPrice}`,
    });
  };

  const totalAlerts = alerts.filter((a) => !a.triggered).length;
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <h1 className="text-xl font-bold">My Watchlist</h1>
                <span className="text-sm text-muted-foreground">
                  ({watchlist.length} stocks)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Alert Status */}
              {(totalAlerts > 0 || triggeredCount > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  {totalAlerts > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Bell className="h-4 w-4" />
                      {totalAlerts} active
                    </span>
                  )}
                  {triggeredCount > 0 && (
                    <button
                      onClick={() => clearTriggeredAlerts()}
                      className="flex items-center gap-1 text-yellow-600 hover:underline"
                    >
                      {triggeredCount} triggered
                    </button>
                  )}
                </div>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Last Updated */}
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Empty State */}
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No stocks in watchlist</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add stocks to your watchlist by clicking the star icon in the search or market table.
            </p>
            <Link to="/">
              <Button>Browse Stocks</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            {watchlistStocks.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                <div className="flex items-center gap-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/20 p-3">
                  <div className="rounded-xl bg-amber-500/30 p-2">
                    <Star className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Watching</p>
                    <p className="text-lg font-bold text-amber-400">{watchlistStocks.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border-2 border-cyan-500/40 bg-cyan-500/20 p-3">
                  <div className="rounded-xl bg-cyan-500/30 p-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Alerts</p>
                    <p className="text-lg font-bold text-cyan-400">{totalAlerts}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/20 p-3">
                  <div className="rounded-xl bg-emerald-500/30 p-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Gainers</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {watchlistStocks.filter(s => s.changePercent > 0).length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border-2 border-rose-500/40 bg-rose-500/20 p-3">
                  <div className="rounded-xl bg-rose-500/30 p-2">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Losers</p>
                    <p className="text-lg font-bold text-rose-400">
                      {watchlistStocks.filter(s => s.changePercent < 0).length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && watchlistStocks.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Watchlist Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {watchlistStocks.map((stock) => (
                <WatchlistStockCard
                  key={stock.symbol}
                  stock={stock}
                  fundamentals={fundamentals[stock.symbol]}
                  isLoadingFundamentals={loadingSymbols.has(stock.symbol)}
                  alerts={alerts.filter((a) => a.symbol === stock.symbol)}
                  onRemove={() => {
                    removeFromWatchlist(stock.symbol);
                    toast.info(`${stock.symbol} removed from watchlist`);
                  }}
                  onAddAlert={() => setAlertDialogStock(stock)}
                  onViewDetails={() => setDetailStock(stock)}
                />
              ))}
            </div>

            {/* Show message for symbols not in market data */}
            {watchlist.length > watchlistStocks.length && (
              <p className="mt-6 text-sm text-muted-foreground text-center">
                {watchlist.length - watchlistStocks.length} stocks are not currently traded or data unavailable.
              </p>
            )}
          </>
        )}
      </main>

      {/* Price Alert Dialog */}
      <PriceAlertDialog
        stock={alertDialogStock}
        isOpen={!!alertDialogStock}
        onClose={() => setAlertDialogStock(null)}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onRemoveAlert={removeAlert}
      />

      {/* Stock Detail Modal */}
      <WatchlistDetailModal
        stock={detailStock}
        fundamentals={detailStock ? fundamentals[detailStock.symbol] : undefined}
        isLoadingFundamentals={detailStock ? loadingSymbols.has(detailStock.symbol) : false}
        alerts={detailStock ? alerts.filter((a) => a.symbol === detailStock.symbol) : []}
        isOpen={!!detailStock}
        onClose={() => setDetailStock(null)}
        onRemoveFromWatchlist={() => {
          if (detailStock) {
            removeFromWatchlist(detailStock.symbol);
            toast.info(`${detailStock.symbol} removed from watchlist`);
            setDetailStock(null);
          }
        }}
        onAddAlert={() => {
          if (detailStock) {
            setAlertDialogStock(detailStock);
          }
        }}
      />
    </div>
  );
};

export default Watchlist;
