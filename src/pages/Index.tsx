import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketHeader } from "@/components/MarketHeader";
import { MarketSummary } from "@/components/MarketSummary";
import { StrengthMeter } from "@/components/StrengthMeter";
import { TopMovers } from "@/components/TopMovers";
import { ValueChartSection } from "@/components/ValueChartSection";
import { SectorPerformance } from "@/components/SectorPerformance";
import { MarketTable } from "@/components/MarketTable";
import { StockDetailModal } from "@/components/StockDetailModal";
import { StockTicker } from "@/components/StockTicker";
import { Disclaimer } from "@/components/Disclaimer";
import { useMarketData } from "@/hooks/useMarketData";
import { Stock } from "@/types/market";
import { AlertCircle, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";

const Index = () => {
  const {
    stocks,
    status,
    isLoading,
    error,
    lastRefresh,
    nextRefresh,
    refresh,
  } = useMarketData();

  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { watchlist } = useWatchlist();

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Stock Ticker - Top scrolling prices */}
      <StockTicker stocks={stocks} />

      <MarketHeader
        status={status}
        lastRefresh={lastRefresh}
        nextRefresh={nextRefresh}
        isLoading={isLoading}
        onRefresh={refresh}
        stocks={stocks}
        onStockSelect={handleStockClick}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Disclaimer at top */}
          <Disclaimer />

          {/* Market Summary Stats */}
          <MarketSummary stocks={stocks} />

          {/* Strength Meter & Sentiment */}
          <StrengthMeter stocks={stocks} />

          {/* Top Movers Section */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Top Movers</h2>
            <TopMovers stocks={stocks} onStockClick={handleStockClick} />
          </div>

          {/* Value Charts - Top 20 Highest/Lowest */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Value Analysis</h2>
            <ValueChartSection stocks={stocks} onStockClick={handleStockClick} />
          </div>

          {/* Sectoral Performance */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Sectoral Performance</h2>
              <div className="flex items-center gap-2">
                <Link to="/watchlist">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    Watchlist
                    {watchlist.length > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {watchlist.length}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to="/birds-eye">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Birds Eye View
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <SectorPerformance stocks={stocks} />
            </div>
          </div>

          {/* Full Market Table */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">All Stocks</h2>
            <MarketTable stocks={stocks} isLoading={isLoading} />
          </div>

          {/* Footer */}
          <footer className="border-t border-border pt-6">
            <div className="flex flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground md:flex-row md:text-left">
              <p>
                © {new Date().getFullYear()} EDUINT Capital Market. Data provided for informational purposes only.
              </p>
              <p>
                Last updated:{" "}
                <span className="font-mono">
                  {lastRefresh.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </span>
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* Stock Detail Modal for Top Movers */}
      <StockDetailModal
        stock={selectedStock}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Index;
