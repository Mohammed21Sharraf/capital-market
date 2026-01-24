import { useState, useMemo } from "react";
import { ArrowUpDown, Filter, X } from "lucide-react";
import { Stock } from "@/types/market";
import { StockRow } from "./StockRow";
import { StockDetailModal } from "./StockDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MarketTableProps {
  stocks: Stock[];
  isLoading: boolean;
}

type SortKey = "symbol" | "ltp" | "change" | "changePercent" | "volume" | "valueMn" | "trade" | "sector" | "category";
type SortOrder = "asc" | "desc";

interface ColumnFilters {
  code: string;
  sector: string;
  category: string;
  closeMin: string;
  closeMax: string;
  valueMin: string;
  valueMax: string;
  tradeMin: string;
  tradeMax: string;
  volumeMin: string;
  volumeMax: string;
}

const initialFilters: ColumnFilters = {
  code: "",
  sector: "",
  category: "",
  closeMin: "",
  closeMax: "",
  valueMin: "",
  valueMax: "",
  tradeMin: "",
  tradeMax: "",
  volumeMin: "",
  volumeMax: "",
};

export function MarketTable({ stocks, isLoading }: MarketTableProps) {
  const [filters, setFilters] = useState<ColumnFilters>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Extract unique sectors and categories for dropdown filters
  const { uniqueSectors, uniqueCategories } = useMemo(() => {
    const sectors = new Set<string>();
    const categories = new Set<string>();
    stocks.forEach((stock) => {
      if (stock.sector) sectors.add(stock.sector);
      if (stock.category) categories.add(stock.category);
    });
    return {
      uniqueSectors: Array.from(sectors).sort(),
      uniqueCategories: Array.from(categories).sort(),
    };
  }, [stocks]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
  };

  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  // Apply filters
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // Code filter
      if (filters.code && !stock.symbol.toLowerCase().includes(filters.code.toLowerCase())) {
        return false;
      }
      // Sector filter
      if (filters.sector && stock.sector !== filters.sector) {
        return false;
      }
      // Category filter
      if (filters.category && stock.category !== filters.category) {
        return false;
      }
      // Close (LTP) range
      if (filters.closeMin && stock.ltp < parseFloat(filters.closeMin)) {
        return false;
      }
      if (filters.closeMax && stock.ltp > parseFloat(filters.closeMax)) {
        return false;
      }
      // Value range
      if (filters.valueMin && stock.valueMn < parseFloat(filters.valueMin)) {
        return false;
      }
      if (filters.valueMax && stock.valueMn > parseFloat(filters.valueMax)) {
        return false;
      }
      // Trade range
      if (filters.tradeMin && stock.trade < parseFloat(filters.tradeMin)) {
        return false;
      }
      if (filters.tradeMax && stock.trade > parseFloat(filters.tradeMax)) {
        return false;
      }
      // Volume range
      if (filters.volumeMin && stock.volume < parseFloat(filters.volumeMin)) {
        return false;
      }
      if (filters.volumeMax && stock.volume > parseFloat(filters.volumeMax)) {
        return false;
      }
      return true;
    });
  }, [stocks, filters]);

  // Sort filtered stocks
  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "ltp":
          comparison = a.ltp - b.ltp;
          break;
        case "change":
          comparison = a.change - b.change;
          break;
        case "changePercent":
          comparison = a.changePercent - b.changePercent;
          break;
        case "volume":
          comparison = a.volume - b.volume;
          break;
        case "valueMn":
          comparison = a.valueMn - b.valueMn;
          break;
        case "trade":
          comparison = a.trade - b.trade;
          break;
        case "sector":
          comparison = (a.sector || "").localeCompare(b.sector || "");
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredStocks, sortKey, sortOrder]);

  const SortHeader = ({
    label,
    sortKeyName,
    className,
    align = "left",
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
    align?: "left" | "right";
  }) => (
    <th
      className={cn(
        "cursor-pointer px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className={cn("flex items-center gap-0.5 sm:gap-1", align === "right" && "justify-end")}>
        <span>{label}</span>
        <ArrowUpDown
          className={cn(
            "h-2.5 w-2.5 sm:h-3 sm:w-3",
            sortKey === sortKeyName && "text-primary"
          )}
        />
      </div>
    </th>
  );

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return (value / 1000).toFixed(2) + "B";
    }
    return value.toFixed(2) + "M";
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + "M";
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + "K";
    }
    return volume.toLocaleString();
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        {/* Filter Toggle Bar */}
        <div className="flex items-center justify-between border-b border-border px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-foreground">Filters</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] sm:text-xs text-primary-foreground">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2"
              >
                <X className="mr-0.5 sm:mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2"
            >
              {showFilters ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 border-b border-border bg-muted/30 p-2 sm:p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {/* Code Filter */}
            <div className="space-y-0.5 sm:space-y-1">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Code</label>
              <Input
                type="text"
                placeholder="Search..."
                value={filters.code}
                onChange={(e) => updateFilter("code", e.target.value)}
                className="h-7 sm:h-8 text-xs sm:text-sm"
              />
            </div>

            {/* Sector Filter */}
            <div className="space-y-0.5 sm:space-y-1">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Sector</label>
              <Select value={filters.sector} onValueChange={(v) => updateFilter("sector", v === "all" ? "" : v)}>
                <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Sectors</SelectItem>
                  {uniqueSectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-0.5 sm:space-y-1">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Category</label>
              <Select value={filters.category} onValueChange={(v) => updateFilter("category", v === "all" ? "" : v)}>
                <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Close (LTP) Range */}
            <div className="space-y-0.5 sm:space-y-1">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Close</label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.closeMin}
                  onChange={(e) => updateFilter("closeMin", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.closeMax}
                  onChange={(e) => updateFilter("closeMax", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-0.5 sm:space-y-1 hidden sm:block">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Value</label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.valueMin}
                  onChange={(e) => updateFilter("valueMin", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.valueMax}
                  onChange={(e) => updateFilter("valueMax", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Trade Range */}
            <div className="space-y-0.5 sm:space-y-1 hidden md:block">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Trade</label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.tradeMin}
                  onChange={(e) => updateFilter("tradeMin", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.tradeMax}
                  onChange={(e) => updateFilter("tradeMax", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Volume Range */}
            <div className="space-y-0.5 sm:space-y-1 hidden lg:block">
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Volume</label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.volumeMin}
                  onChange={(e) => updateFilter("volumeMin", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.volumeMax}
                  onChange={(e) => updateFilter("volumeMax", e.target.value)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-table-header">
              <tr>
                <SortHeader label="Code" sortKeyName="symbol" />
                <SortHeader label="Sector" sortKeyName="sector" className="hidden lg:table-cell" />
                <SortHeader label="Cat" sortKeyName="category" className="hidden md:table-cell" />
                <SortHeader label="Close" sortKeyName="ltp" align="right" />
                <SortHeader label="Change %" sortKeyName="changePercent" align="right" />
                <SortHeader label="Value" sortKeyName="valueMn" align="right" className="hidden sm:table-cell" />
                <SortHeader label="Trade" sortKeyName="trade" align="right" className="hidden md:table-cell" />
                <SortHeader label="Volume" sortKeyName="volume" align="right" />
              </tr>
            </thead>
            <tbody className={cn(isLoading && "opacity-60")}>
              {sortedStocks.length > 0 ? (
                sortedStocks.map((stock, index) => (
                  <tr
                    key={stock.symbol}
                    className="cursor-pointer border-b border-table-border transition-colors hover:bg-muted/50"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => handleStockClick(stock)}
                  >
                    {/* Code & Name */}
                    <td className="px-3 py-2">
                      <div>
                        <span className="font-semibold text-foreground">{stock.symbol}</span>
                        <p className="hidden text-xs text-muted-foreground lg:block">{stock.name}</p>
                      </div>
                    </td>

                    {/* Sector */}
                    <td className="hidden px-3 py-2 text-sm text-muted-foreground lg:table-cell">
                      {stock.sector || "-"}
                    </td>

                    {/* Category */}
                    <td className="hidden px-3 py-2 md:table-cell">
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {stock.category || "-"}
                      </span>
                    </td>

                    {/* Close (LTP) */}
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      {stock.ltp.toFixed(2)}
                    </td>

                    {/* Change % */}
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium",
                          stock.change > 0 && "bg-success/10 text-price-up",
                          stock.change < 0 && "bg-destructive/10 text-price-down",
                          stock.change === 0 && "bg-muted text-price-neutral"
                        )}
                      >
                        {stock.change > 0 && "+"}
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Value */}
                    <td className="hidden px-3 py-2 text-right font-mono text-muted-foreground sm:table-cell">
                      {formatValue(stock.valueMn)}
                    </td>

                    {/* Trade */}
                    <td className="hidden px-3 py-2 text-right font-mono text-muted-foreground md:table-cell">
                      {stock.trade.toLocaleString()}
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {formatVolume(stock.volume)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    {hasActiveFilters
                      ? "No stocks match the current filters"
                      : isLoading
                      ? "Loading market data..."
                      : "No market data available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {sortedStocks.length} of {stocks.length} stocks
            {hasActiveFilters && " (filtered)"} • Click on a row for details
          </p>
        </div>
      </div>

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
