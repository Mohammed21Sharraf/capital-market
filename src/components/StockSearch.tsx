import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Stock } from "@/types/market";
import { cn } from "@/lib/utils";

interface StockSearchProps {
  stocks: Stock[];
  onStockSelect?: (stock: Stock) => void;
}

export function StockSearch({ stocks, onStockSelect }: StockSearchProps) {
  const [open, setOpen] = useState(false);

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

  const handleSelect = (stock: Stock) => {
    setOpen(false);
    onStockSelect?.(stock);
  };

  // Group stocks by sector for better organization
  const stocksBySector = stocks.reduce((acc, stock) => {
    const sector = stock.sector || "Other";
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  // Get top gainers and losers for quick access
  const topGainers = [...stocks]
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  const topLosers = [...stocks]
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
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
        <CommandInput placeholder="Search stocks, sectors, EPS, P/E..." />
        <CommandList>
          <CommandEmpty>No stocks found.</CommandEmpty>

          {/* Quick Access - Top Gainers */}
          {topGainers.length > 0 && (
            <CommandGroup heading="Top Gainers">
              {topGainers.map((stock) => (
                <CommandItem
                  key={`gainer-${stock.symbol}`}
                  value={`${stock.symbol} ${stock.name} ${stock.sector} gainer`}
                  onSelect={() => handleSelect(stock)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="font-medium">{stock.symbol}</span>
                    <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                      {stock.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                    <span className="font-mono text-sm text-success">
                      {formatChange(stock.changePercent)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Access - Top Losers */}
          {topLosers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Top Losers">
                {topLosers.map((stock) => (
                  <CommandItem
                    key={`loser-${stock.symbol}`}
                    value={`${stock.symbol} ${stock.name} ${stock.sector} loser`}
                    onSelect={() => handleSelect(stock)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{stock.symbol}</span>
                      <span className="text-muted-foreground text-xs truncate max-w-[150px]">
                        {stock.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</span>
                      <span className="font-mono text-sm text-destructive">
                        {formatChange(stock.changePercent)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* All Stocks by Sector */}
          <CommandSeparator />
          {Object.entries(stocksBySector)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([sector, sectorStocks]) => (
              <CommandGroup key={sector} heading={sector}>
                {sectorStocks
                  .sort((a, b) => a.symbol.localeCompare(b.symbol))
                  .map((stock) => (
                    <CommandItem
                      key={stock.symbol}
                      value={`${stock.symbol} ${stock.name} ${stock.sector} ${stock.category}`}
                      onSelect={() => handleSelect(stock)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-[150px]">
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
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
