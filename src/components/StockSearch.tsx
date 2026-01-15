import { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Building2, Loader2 } from "lucide-react";
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

  // Pre-fetch fundamentals for top movers when dialog opens
  useEffect(() => {
    if (open && stocks.length > 0) {
      const topStocks = [
        ...stocks.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
        ...stocks.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
      ];
      
      // Fetch fundamentals for top movers
      topStocks.forEach(stock => {
        if (!fundamentals[stock.symbol]) {
          fetchFundamental(stock.symbol);
        }
      });
    }
  }, [open, stocks]);

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
          <span className="bg-muted/50 px-1.5 py-0.5 rounded">
            EPS: {fund.eps.toFixed(2)}
          </span>
        )}
        {fund.pe !== undefined && fund.pe > 0 && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded">
            P/E: {fund.pe.toFixed(1)}
          </span>
        )}
        {fund.marketCap !== undefined && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded">
            MCap: {formatMarketCap(fund.marketCap)}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/80 px-4 py-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-w-[200px] sm:min-w-[280px]"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search</span>
        <kbd className="pointer-events-none ml-auto flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs font-medium">
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

          {/* Quick Access - Top Gainers (only when not searching) */}
          {!searchQuery && topGainers.length > 0 && (
            <CommandGroup heading="Top Gainers">
              {topGainers.map((stock) => (
                <CommandItem
                  key={`gainer-${stock.symbol}`}
                  value={`${stock.symbol} ${stock.name} ${stock.sector} gainer`}
                  onSelect={() => handleSelect(stock)}
                  className="flex flex-col items-start gap-1 py-2"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
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
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
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
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
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
