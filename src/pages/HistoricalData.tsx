import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, BarChart3, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarketData } from "@/hooks/useMarketData";
import { useStockHistory } from "@/hooks/useStockHistory";
import { HistoricalChart } from "@/components/watchlist/HistoricalChart";
import { cn } from "@/lib/utils";

const TIMEFRAMES = [
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "10Y", label: "10Y" },
  { value: "Max", label: "Max" },
] as const;

type Timeframe = typeof TIMEFRAMES[number]["value"];

export default function HistoricalData() {
  const { stocks } = useMarketData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");

  // Filter stocks based on search
  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Historical Data</h1>
                <p className="text-xs text-muted-foreground">
                  Price history & trends
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {stocks.length} Stocks
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 space-y-4">
        {/* Search & Timeframe */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <TabsList className="grid grid-cols-8">
              {TIMEFRAMES.map((tf) => (
                <TabsTrigger key={tf.value} value={tf.value} className="text-xs">
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stock List */}
          <Card className="lg:col-span-1 max-h-[70vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Select Stock</span>
                <Badge variant="secondary" className="text-xs">
                  {filteredStocks.length} results
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredStocks.slice(0, 50).map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg transition-all text-left",
                    selectedSymbol === stock.symbol
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                        stock.changePercent >= 0
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      )}
                    >
                      {stock.changePercent >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stock.symbol}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {stock.sector}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">৳{stock.ltp.toFixed(2)}</p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        stock.changePercent >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      )}
                    >
                      {stock.changePercent >= 0 ? "+" : ""}
                      {stock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </button>
              ))}
              {filteredStocks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No stocks found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart Area */}
          <div className="lg:col-span-2">
            {selectedStock ? (
              <HistoricalChart stock={selectedStock} />
            ) : (
              <Card className="h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Select a Stock</p>
                  <p className="text-sm">
                    Choose a stock from the list to view historical data
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
