import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2 } from "lucide-react";
import { Stock } from "@/types/market";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddPortfolioDialogProps {
  stocks: Stock[];
  isLoading?: boolean;
  onAdd: (item: {
    symbol: string;
    quantity: number;
    costPrice: number;
    purchaseDate: string;
    notes?: string;
  }) => boolean;
}

export function AddPortfolioDialog({ stocks, isLoading, onAdd }: AddPortfolioDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [manualSymbol, setManualSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
    setSearchQuery(stock.symbol);
    setCostPrice(stock.ltp.toString());
    setShowDropdown(false);
  };

  const handleSubmit = () => {
    const symbolToUse = useManualEntry ? manualSymbol.trim().toUpperCase() : selectedStock?.symbol;
    
    if (!symbolToUse) {
      toast.error("Please select or enter a stock symbol");
      return;
    }

    if (symbolToUse.length < 1 || symbolToUse.length > 20) {
      toast.error("Invalid stock symbol");
      return;
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(costPrice);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (isNaN(cost) || cost <= 0) {
      toast.error("Please enter a valid cost price");
      return;
    }

    if (qty > 100000000 || cost > 100000000) {
      toast.error("Values are too large");
      return;
    }

    const success = onAdd({
      symbol: symbolToUse,
      quantity: qty,
      costPrice: cost,
      purchaseDate,
      notes: notes.trim() || undefined,
    });

    if (success) {
      toast.success(`Added ${symbolToUse} to portfolio`);
      resetForm();
      setOpen(false);
    } else {
      toast.error("Failed to add to portfolio");
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedStock(null);
    setManualSymbol("");
    setQuantity("");
    setCostPrice("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setUseManualEntry(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Portfolio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Stock Search or Manual Entry */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stock</Label>
              <button
                type="button"
                onClick={() => {
                  setUseManualEntry(!useManualEntry);
                  setSelectedStock(null);
                  setSearchQuery("");
                  setManualSymbol("");
                }}
                className="text-xs text-primary hover:underline"
              >
                {useManualEntry ? "Search stocks" : "Enter manually"}
              </button>
            </div>
            
            {useManualEntry ? (
              <Input
                placeholder="Enter stock symbol (e.g., BRACBANK)"
                value={manualSymbol}
                onChange={(e) => setManualSymbol(e.target.value.toUpperCase().slice(0, 20))}
                className="uppercase"
              />
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={isLoading ? "Loading stocks..." : "Search stocks..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedStock(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="pl-9"
                  disabled={isLoading}
                />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                
                {showDropdown && searchQuery && !isLoading && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                    {filteredStocks.length > 0 ? (
                      filteredStocks.map((stock) => (
                        <button
                          key={stock.symbol}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectStock(stock)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent",
                            selectedStock?.symbol === stock.symbol && "bg-accent"
                          )}
                        >
                          <div>
                            <span className="font-medium">{stock.symbol}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{stock.sector}</span>
                          </div>
                          <span className="text-sm">৳{stock.ltp.toFixed(2)}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No stocks found. Try{" "}
                        <button
                          type="button"
                          onClick={() => setUseManualEntry(true)}
                          className="text-primary hover:underline"
                        >
                          manual entry
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {!isLoading && stocks.length === 0 && !showDropdown && (
                  <p className="text-xs text-amber-500 mt-1">
                    Market data unavailable.{" "}
                    <button
                      type="button"
                      onClick={() => setUseManualEntry(true)}
                      className="text-primary hover:underline"
                    >
                      Enter manually
                    </button>
                  </p>
                )}
              </div>
            )}
            
            {selectedStock && (
              <p className="text-xs text-muted-foreground">
                Current Price: ৳{selectedStock.ltp.toFixed(2)}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              placeholder="Number of shares"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max="100000000"
            />
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <Label>Cost Price (per share)</Label>
            <Input
              type="number"
              placeholder="Purchase price per share"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              min="0.01"
              step="0.01"
              max="100000000"
            />
          </div>

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
          </div>

          {/* Total Investment Preview */}
          {quantity && costPrice && !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(costPrice)) && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-sm text-muted-foreground">Total Investment</p>
              <p className="text-lg font-bold">
                ৳{(parseFloat(quantity) * parseFloat(costPrice)).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            Add to Portfolio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
