import { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Building2, Loader2, Star } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Stock, StockFundamentals } from "@/types/market";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/useWatchlist";

interface StockSearchProps {
  stocks: Stock[];
  onStockSelect?: (stock: Stock) => void;
}

interface FundamentalsCache {
  [symbol: string]: StockFundamentals;
}

export function StockSearch({ stocks, onStockSelect }: StockSearchProps) {
  const [open, setOpen] = useState(false);
  const [fundamentals, setFundamentals] = useState<FundamentalsCache>({});
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch fundamentals for a stock when needed
  const fetchFundamental = async (symbol: string) => {
    if (fundamentals[symbol] || loadingSymbols.has(symbol)) return;

    setLoadingSymbols(prev => new Set([...prev, symbol]));
    
    try {
      const { data, error } = await supabase.functions.invoke('stock-fundamentals', {
        body: { symbol },
      });
      
      if (!error && data?.data) {
        setFundamentals(prev => ({
          ...prev,
          [symbol]: data.data,
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch fundamentals for ${symbol}:`, err);
    } finally {
      setLoadingSymbols(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  };

  // Pre-fetch fundamentals for top movers and watchlist when dialog opens
  useEffect(() => {
    if (open && stocks.length > 0) {
      const topStocks = [
        ...stocks.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
        ...stocks.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
      ];
      
      // Also fetch for watchlist stocks
      const watchlistStocks = stocks.filter(s => watchlist.includes(s.symbol));
      
      // Fetch fundamentals for top movers and watchlist
      [...topStocks, ...watchlistStocks].forEach(stock => {
        if (!fundamentals[stock.symbol]) {
          fetchFundamental(stock.symbol);
        }
      });
    }
  }, [open, stocks, watchlist]);

  // Get watchlist stocks
  const watchlistStocks = useMemo(() => 
    stocks.filter(stock => watchlist.includes(stock.symbol)),
    [stocks, watchlist]
  );

  const handleStarClick = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    toggleWatchlist(symbol);
  };

  const handleSelect = (stock: Stock) => {
    setOpen(false);
    onStockSelect?.(stock);
  };

  // Filter stocks based on search query
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    const query = searchQuery.toLowerCase();
    return stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name?.toLowerCase().includes(query) ||
      stock.sector?.toLowerCase().includes(query) ||
      stock.category?.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);

  // Fetch fundamentals for filtered results
  useEffect(() => {
    if (searchQuery && filteredStocks.length <= 20) {
      filteredStocks.forEach(stock => {
        if (!fundamentals[stock.symbol]) {
          fetchFundamental(stock.symbol);
        }
      });
    }
  }, [filteredStocks, searchQuery]);

  // Group stocks by sector for better organization
  const stocksBySector = filteredStocks.reduce((acc, stock) => {
    const sector = stock.sector || "Other";
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  // Get top gainers and losers for quick access
  const topGainers = useMemo(() => 
    [...stocks]
      .filter((s) => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5),
    [stocks]
  );

  const topLosers = useMemo(() =>
    [...stocks]
      .filter((s) => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5),
    [stocks]
  );

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatMarketCap = (value?: number) => {
    if (!value) return "-";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
    return `${value.toFixed(0)}M`;
  };

  const renderFundamentals = (symbol: string) => {
    const fund = fundamentals[symbol];
    const isLoading = loadingSymbols.has(symbol);

    if (isLoading) {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }

    if (!fund) return null;

    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {fund.eps !== undefined && (
          <span className={`px-1.5 py-0.5 rounded font-medium ${
            fund.eps < 0 
              ? 'bg-red-500/30 text-red-300 group-data-[selected=true]:bg-red-600/40 group-data-[selected=true]:text-red-900' 
              : fund.eps > 0 
                ? 'bg-green-500/30 text-green-300 group-data-[selected=true]:bg-green-600/40 group-data-[selected=true]:text-green-900' 
                : 'bg-muted/50 text-muted-foreground group-data-[selected=true]:text-foreground/80'
          }`}>
            EPS: {fund.eps.toFixed(2)}
          </span>
        )}
        {fund.pe !== undefined && fund.pe > 0 && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded group-data-[selected=true]:bg-black/20 group-data-[selected=true]:text-foreground/80">
            P/E: {fund.pe.toFixed(1)}
          </span>
        )}
        {fund.marketCap !== undefined && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded group-data-[selected=true]:bg-black/20 group-data-[selected=true]:text-foreground/80">
            MCap: {formatMarketCap(fund.marketCap)}
          </span>
        )}
      </div>
    );
  };

  const renderStarButton = (symbol: string) => (
    <button
      onClick={(e) => handleStarClick(e, symbol)}
      className="p-1 hover:bg-muted rounded transition-colors"
      title={isInWatchlist(symbol) ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          isInWatchlist(symbol)
            ? "fill-yellow-500 text-yellow-500"
            : "text-muted-foreground hover:text-yellow-500"
        )}
      />
    </button>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 sm:gap-3 rounded-lg border border-border bg-secondary/80 px-2 py-1.5 sm:px-4 sm:py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-w-[80px] sm:min-w-[200px] md:min-w-[280px] flex-shrink-0"
      >
        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm">Search</span>
        <kbd className="pointer-events-none ml-auto hidden sm:flex h-5 sm:h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 sm:px-2 font-mono text-[10px] sm:text-xs font-medium">
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search stocks, sectors, EPS, P/E..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[500px]">
          <CommandEmpty>No stocks found.</CommandEmpty>

          {/* Watchlist Section */}
          {!searchQuery && watchlistStocks.length > 0 && (
            <CommandGroup heading="⭐ My Watchlist">
              {watchlistStocks.map((stock) => (
                <CommandItem
                  key={`watchlist-${stock.symbol}`}
                  value={`${stock.symbol} ${stock.name} ${stock.sector} watchlist`}
                  onSelect={() => handleSelect(stock)}
                  className="group flex flex-col items-start gap-1 py-2"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {renderStarButton(stock.symbol)}
                      <span className="font-medium">{stock.symbol}</span>
                      <span className="text-muted-foreground text-xs truncate max-w-[120px]">
                        {stock.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                      <span
                        className={cn(
                          "font-mono text-sm",
                          stock.changePercent >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {formatChange(stock.changePercent)}
                      </span>
                    </div>
                  </div>
                  {renderFundamentals(stock.symbol)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Access - Top Gainers (only when not searching) */}
          {!searchQuery && topGainers.length > 0 && (
            <>
              {watchlistStocks.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Top Gainers">
                {topGainers.map((stock) => (
                  <CommandItem
                    key={`gainer-${stock.symbol}`}
                    value={`${stock.symbol} ${stock.name} ${stock.sector} gainer`}
                    onSelect={() => handleSelect(stock)}
                    className="group flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {renderStarButton(stock.symbol)}
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-[120px]">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                        <span className="font-mono text-sm text-success">
                          {formatChange(stock.changePercent)}
                        </span>
                      </div>
                    </div>
                    {renderFundamentals(stock.symbol)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Quick Access - Top Losers (only when not searching) */}
          {!searchQuery && topLosers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Top Losers">
                {topLosers.map((stock) => (
                  <CommandItem
                    key={`loser-${stock.symbol}`}
                    value={`${stock.symbol} ${stock.name} ${stock.sector} loser`}
                    onSelect={() => handleSelect(stock)}
                    className="group flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {renderStarButton(stock.symbol)}
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-[120px]">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                        <span className="font-mono text-sm text-destructive">
                          {formatChange(stock.changePercent)}
                        </span>
                      </div>
                    </div>
                    {renderFundamentals(stock.symbol)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* All Stocks by Sector */}
          <CommandSeparator />
          {Object.entries(stocksBySector)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, searchQuery ? 10 : 5) // Limit sectors when browsing
            .map(([sector, sectorStocks]) => (
              <CommandGroup key={sector} heading={sector}>
                {sectorStocks
                  .sort((a, b) => a.symbol.localeCompare(b.symbol))
                  .slice(0, searchQuery ? 20 : 5) // Show more when searching
                  .map((stock) => (
                    <CommandItem
                      key={stock.symbol}
                      value={`${stock.symbol} ${stock.name} ${stock.sector} ${stock.category}`}
                      onSelect={() => handleSelect(stock)}
                      className="group flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {renderStarButton(stock.symbol)}
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{stock.symbol}</span>
                          <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                            {stock.name}
                          </span>
                          {stock.category && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {stock.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                          <span
                            className={cn(
                              "font-mono text-sm",
                              stock.changePercent >= 0 ? "text-success" : "text-destructive"
                            )}
                          >
                            {formatChange(stock.changePercent)}
                          </span>
                        </div>
                      </div>
                      {renderFundamentals(stock.symbol)}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
