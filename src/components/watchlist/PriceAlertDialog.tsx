import { useState } from "react";
import { Stock } from "@/types/market";
import { PriceAlert } from "@/hooks/usePriceAlerts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";

interface PriceAlertDialogProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlert[];
  onAddAlert: (symbol: string, type: "above" | "below", targetPrice: number) => void;
  onRemoveAlert: (alertId: string) => void;
}

export function PriceAlertDialog({
  stock,
  isOpen,
  onClose,
  alerts,
  onAddAlert,
  onRemoveAlert,
}: PriceAlertDialogProps) {
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");

  if (!stock) return null;

  const stockAlerts = alerts.filter((a) => a.symbol === stock.symbol);

  const handleAddAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    onAddAlert(stock.symbol, alertType, price);
    setTargetPrice("");
  };

  const handleClose = () => {
    setTargetPrice("");
    setAlertType("above");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Price Alerts for {stock.symbol}</DialogTitle>
          <DialogDescription>
            Current price: ৳{stock.ltp.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add New Alert */}
          <div className="space-y-4">
            <Label>Set New Alert</Label>
            <RadioGroup
              value={alertType}
              onValueChange={(v) => setAlertType(v as "above" | "below")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="above" id="above" />
                <Label htmlFor="above" className="flex items-center gap-1 cursor-pointer">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Price goes above
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="below" id="below" />
                <Label htmlFor="below" className="flex items-center gap-1 cursor-pointer">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Price goes below
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <Button onClick={handleAddAlert} disabled={!targetPrice}>
                Add Alert
              </Button>
            </div>
          </div>

          {/* Existing Alerts */}
          {stockAlerts.length > 0 && (
            <div className="space-y-3">
              <Label>Active Alerts</Label>
              <div className="space-y-2">
                {stockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {alert.type === "above" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span>
                        {alert.type === "above" ? "Above" : "Below"} ৳{alert.targetPrice}
                      </span>
                      {alert.triggered && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                          Triggered
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stockAlerts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No alerts set for this stock
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
