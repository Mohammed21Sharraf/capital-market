import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortfolioItem } from "@/hooks/usePortfolio";
import { Stock } from "@/types/market";
import { Trash2, Edit2, Check, X, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PortfolioCardProps {
  item: PortfolioItem;
  stock?: Stock;
  onUpdate: (id: string, updates: Partial<Omit<PortfolioItem, "id">>) => void;
  onRemove: (id: string) => void;
  onViewDetails?: (stock: Stock) => void;
}

export function PortfolioCard({ item, stock, onUpdate, onRemove, onViewDetails }: PortfolioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());
  const [editCostPrice, setEditCostPrice] = useState(item.costPrice.toString());

  const currentPrice = stock?.ltp || item.costPrice;
  const totalCost = item.quantity * item.costPrice;
  const currentValue = item.quantity * currentPrice;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  const isProfit = gainLoss >= 0;

  const handleSave = () => {
    const qty = parseFloat(editQuantity);
    const cost = parseFloat(editCostPrice);

    if (isNaN(qty) || qty <= 0 || qty > 100000000) {
      toast.error("Invalid quantity");
      return;
    }

    if (isNaN(cost) || cost <= 0 || cost > 100000000) {
      toast.error("Invalid cost price");
      return;
    }

    onUpdate(item.id, { quantity: qty, costPrice: cost });
    setIsEditing(false);
    toast.success("Updated successfully");
  };

  const handleCancel = () => {
    setEditQuantity(item.quantity.toString());
    setEditCostPrice(item.costPrice.toString());
    setIsEditing(false);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Stock Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg truncate">{item.symbol}</h3>
            {stock && (
              <span className="text-xs text-muted-foreground">{stock.sector}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Purchased: {new Date(item.purchaseDate).toLocaleDateString("en-BD")}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic truncate">{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8 text-emerald-500">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 text-rose-500">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {stock && onViewDetails && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onViewDetails(stock)} 
                  className="h-8 w-8 text-primary hover:text-primary"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  onRemove(item.id);
                  toast.success("Removed from portfolio");
                }} 
                className="h-8 w-8 text-rose-500 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Quantity</label>
            <Input
              type="number"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className="mt-1"
              min="1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cost Price</label>
            <Input
              type="number"
              value={editCostPrice}
              onChange={(e) => setEditCostPrice(e.target.value)}
              className="mt-1"
              min="0.01"
              step="0.01"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Holdings Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Quantity</p>
              <p className="font-semibold">{item.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Cost</p>
              <p className="font-semibold">৳{item.costPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="font-semibold">৳{currentPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="font-semibold">৳{totalCost.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Gain/Loss Section */}
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-center justify-between",
            isProfit ? "bg-emerald-500/10" : "bg-rose-500/10"
          )}>
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-rose-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="font-bold">৳{currentValue.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{isProfit ? "Profit" : "Loss"}</p>
              <p className={cn("font-bold", isProfit ? "text-emerald-500" : "text-rose-500")}>
                {isProfit ? "+" : ""}৳{gainLoss.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className={cn("text-xs font-medium", isProfit ? "text-emerald-500" : "text-rose-500")}>
                ({isProfit ? "+" : ""}{gainLossPercent.toFixed(2)}%)
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
