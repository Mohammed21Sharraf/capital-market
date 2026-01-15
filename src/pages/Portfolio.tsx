import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarketData } from "@/hooks/useMarketData";
import { PortfolioCard } from "@/components/portfolio/PortfolioCard";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { AddPortfolioDialog } from "@/components/portfolio/AddPortfolioDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Portfolio = () => {
  const { portfolio, isLoaded, addItem, updateItem, removeItem, clearPortfolio } = usePortfolio();
  const { stocks, isLoading: isLoadingStocks } = useMarketData();

  const isInitialStocksLoading = isLoadingStocks && stocks.length === 0;
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  const handleClearAll = () => {
    clearPortfolio();
    toast.success("Portfolio cleared");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                  <Briefcase className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">My Portfolio</h1>
                  <p className="text-xs text-muted-foreground">
                    Track your investments • Saved locally
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {portfolio.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-rose-500 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear All</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Portfolio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all {portfolio.length} stocks from your portfolio. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll} className="bg-rose-500 hover:bg-rose-600">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AddPortfolioDialog stocks={stocks} isLoading={isInitialStocksLoading} onAdd={addItem} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="space-y-6">
          {/* Summary */}
          {isLoaded && portfolio.length > 0 && (
            <PortfolioSummary portfolio={portfolio} stocks={stocks} />
          )}

          {/* Portfolio List */}
          {!isLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : portfolio.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No stocks in portfolio</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start tracking your investments by adding stocks with your purchase price and quantity.
                All data is saved locally in your browser.
              </p>
              <AddPortfolioDialog stocks={stocks} isLoading={isInitialStocksLoading} onAdd={addItem} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Holdings ({portfolio.length})
                </h2>
              </div>
              <div className="grid gap-4">
                {portfolio.map((item) => (
                  <PortfolioCard
                    key={item.id}
                    item={item}
                    stock={stockMap.get(item.symbol)}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Info Notice */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
            <p>
              💾 Your portfolio data is saved locally in your browser. 
              It will persist across sessions but won't sync across devices.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Portfolio;
