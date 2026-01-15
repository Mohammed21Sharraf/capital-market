import { useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Stock } from "@/types/market";
import { StockRow } from "./StockRow";
import { StockDetailModal } from "./StockDetailModal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MarketTableProps {
  stocks: Stock[];
  isLoading: boolean;
}

type SortKey = "symbol" | "ltp" | "change" | "changePercent" | "volume";
type SortOrder = "asc" | "desc";

export function MarketTable({ stocks, isLoading }: MarketTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStocks = [...filteredStocks].sort((a, b) => {
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
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

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
        "cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground md:px-6",
        className
      )}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className={cn("flex items-center gap-1", align === "right" && "justify-end")}>
        <span>{label}</span>
        <ArrowUpDown
          className={cn(
            "h-3 w-3",
            sortKey === sortKeyName && "text-primary"
          )}
        />
      </div>
    </th>
  );

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        {/* Search Bar */}
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-table-header">
              <tr>
                <SortHeader label="Symbol" sortKeyName="symbol" />
                <SortHeader label="LTP" sortKeyName="ltp" align="right" />
                <SortHeader label="Change" sortKeyName="change" align="right" />
                <SortHeader label="Change %" sortKeyName="changePercent" className="hidden md:table-cell" align="right" />
                <SortHeader label="Volume" sortKeyName="volume" align="right" />
              </tr>
            </thead>
            <tbody className={cn(isLoading && "opacity-60")}>
              {sortedStocks.length > 0 ? (
                sortedStocks.map((stock, index) => (
                  <StockRow 
                    key={stock.symbol} 
                    stock={stock} 
                    index={index}
                    onClick={handleStockClick}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {searchQuery
                      ? `No stocks found matching "${searchQuery}"`
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
        <div className="border-t border-border px-4 py-3 md:px-6">
          <p className="text-xs text-muted-foreground">
            Showing {sortedStocks.length} of {stocks.length} stocks • Click on a row for details
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
