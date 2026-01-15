import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketHeader } from "@/components/MarketHeader";
import { BirdsEyeView } from "@/components/BirdsEyeView";
import { StockDetailModal } from "@/components/StockDetailModal";
import { StockTicker } from "@/components/StockTicker";
import { useMarketData } from "@/hooks/useMarketData";
import { Stock } from "@/types/market";
import { AlertCircle, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const BirdsEye = () => {
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
      {/* Stock Ticker */}
      <StockTicker stocks={stocks} />

      <MarketHeader
        status={status}
        lastRefresh={lastRefresh}
        nextRefresh={nextRefresh}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Birds Eye View</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              Real-time market heatmap by sector and stock
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Birds Eye View */}
          <div className="rounded-lg border border-border bg-card p-4">
            <BirdsEyeView stocks={stocks} onStockClick={handleStockClick} />
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

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default BirdsEye;
