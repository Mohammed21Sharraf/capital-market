import { useState, useMemo, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Stock } from "@/types/market";
import { formatValue, SECTOR_COLORS } from "@/lib/sectorUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Grid3X3 } from "lucide-react";

interface BirdsEyeViewProps {
  stocks: Stock[];
  onStockClick?: (stock: Stock) => void;
}

interface StockNode {
  name: string;
  symbol: string;
  size: number;
  color: string;
  changePercent: number;
  valueCr: string;
  stock: Stock;
}

interface SectorData {
  name: string;
  stocks: StockNode[];
  totalValue: number;
  avgChange: number;
}

// Get color based on change percentage - green for gain, red for loss
const getGainLossColor = (changePercent: number): string => {
  if (changePercent >= 5) return "hsl(142, 76%, 28%)"; // Deep green
  if (changePercent >= 3) return "hsl(142, 72%, 35%)"; // Strong green
  if (changePercent >= 1) return "hsl(142, 65%, 40%)"; // Medium green
  if (changePercent >= 0.5) return "hsl(142, 55%, 45%)"; // Light green
  if (changePercent > 0) return "hsl(142, 45%, 48%)"; // Very light green
  if (changePercent === 0) return "hsl(220, 15%, 45%)"; // Neutral gray
  if (changePercent > -0.5) return "hsl(0, 50%, 48%)"; // Very light red
  if (changePercent > -1) return "hsl(0, 60%, 45%)"; // Light red
  if (changePercent > -3) return "hsl(0, 70%, 40%)"; // Medium red
  if (changePercent > -5) return "hsl(0, 75%, 35%)"; // Strong red
  return "hsl(0, 80%, 28%)"; // Deep red
};

// Custom content renderer for stocks - matches reference design
const StockTreemapContent = ({ 
  x, 
  y, 
  width, 
  height, 
  symbol,
  changePercent,
  valueCr,
  color,
  stock,
  onNodeClick,
}: any) => {
  if (width < 2 || height < 2) return null;
  
  const showSymbol = width > 25 && height > 20;
  const showChange = width > 35 && height > 30;
  const showValue = width > 45 && height > 45;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "rgba(0,0,0,0.3)",
          strokeWidth: 1,
          cursor: "pointer",
        }}
        onClick={() => onNodeClick?.(stock)}
      />
      {showSymbol && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValue ? 10 : showChange ? 4 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: "#fff",
            fontSize: Math.min(13, Math.max(7, width / 6)),
            fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.7)",
            pointerEvents: "none",
          }}
        >
          {symbol}
        </text>
      )}
      {showChange && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showValue ? 2 : 8)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: "#fff",
            fontSize: Math.min(10, Math.max(6, width / 8)),
            fontWeight: 500,
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {(changePercent ?? 0) > 0 ? "+" : ""}{(changePercent ?? 0).toFixed(2)}%
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: "rgba(255,255,255,0.85)",
            fontSize: Math.min(9, Math.max(6, width / 10)),
            fontWeight: 400,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {valueCr}
        </text>
      )}
    </g>
  );
};

// Custom tooltip for stocks
const StockTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  const stock = data.stock;
  
  if (!stock) return null;
  
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-xl">
      <div className="font-bold text-foreground">{stock.symbol}</div>
      <div className="text-xs text-muted-foreground">{stock.name}</div>
      {stock.sector && (
        <div className="text-xs text-primary font-medium mt-1">{stock.sector}</div>
      )}
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-mono text-foreground">৳{(stock.ltp ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Change:</span>
          <span className={`font-mono font-semibold ${(stock.changePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            {(stock.changePercent ?? 0) > 0 ? "+" : ""}{(stock.changePercent ?? 0).toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono text-foreground">{data.valueCr}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono text-foreground">{(stock.volume ?? 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export function BirdsEyeView({ stocks, onStockClick }: BirdsEyeViewProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Build sector-grouped data using official sector from API
  const { sectorList, allStockData, filteredStockData } = useMemo(() => {
    const sectorMap: Record<string, { stocks: Stock[]; totalValue: number }> = {};

    stocks.forEach(stock => {
      // Use official sector from API, fallback to "Others" if empty
      const sector = stock.sector?.trim() || "Others";
      if (!sectorMap[sector]) {
        sectorMap[sector] = { stocks: [], totalValue: 0 };
      }
      sectorMap[sector].stocks.push(stock);
      sectorMap[sector].totalValue += stock.valueMn || 0;
    });

    const sectors: SectorData[] = Object.entries(sectorMap)
      .map(([name, data]) => {
        const avgChange = data.stocks.length > 0 
          ? data.stocks.reduce((sum, s) => sum + (s.changePercent || 0), 0) / data.stocks.length 
          : 0;
        
        const stockNodes: StockNode[] = data.stocks
          .sort((a, b) => (b.valueMn || 0) - (a.valueMn || 0))
          .map(stock => ({
            name: stock.name,
            symbol: stock.symbol,
            size: Math.max(stock.valueMn || 0.1, 0.1),
            color: getGainLossColor(stock.changePercent || 0),
            changePercent: stock.changePercent || 0,
            valueCr: ((stock.valueMn || 0) / 10).toFixed(2) + "cr",
            stock,
          }));

        return {
          name,
          stocks: stockNodes,
          totalValue: data.totalValue,
          avgChange,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);

    // All stocks combined
    const allStocks = stocks
      .sort((a, b) => (b.valueMn || 0) - (a.valueMn || 0))
      .map(stock => ({
        name: stock.name,
        symbol: stock.symbol,
        size: Math.max(stock.valueMn || 0.1, 0.1),
        color: getGainLossColor(stock.changePercent || 0),
        changePercent: stock.changePercent || 0,
        valueCr: ((stock.valueMn || 0) / 10).toFixed(2) + "cr",
        stock,
      }));

    return {
      sectorList: sectors,
      allStockData: allStocks,
      filteredStockData: (sectorName: string | null) => {
        if (!sectorName) return allStocks;
        const sector = sectors.find(s => s.name === sectorName);
        return sector ? sector.stocks : allStocks;
      },
    };
  }, [stocks]);

  const handleStockClick = useCallback((stock: Stock) => {
    if (onStockClick) {
      onStockClick(stock);
    }
  }, [onStockClick]);

  const displayData = selectedSector 
    ? filteredStockData(selectedSector) 
    : allStockData;

  if (stocks.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Grid3X3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No market data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sector Header Tabs - All sectors in a single scrollable row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        <Button
          variant={selectedSector === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSector(null)}
          className={`shrink-0 text-xs h-7 px-2.5 font-medium transition-all ${
            selectedSector === null 
              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md border-0" 
              : "bg-card hover:bg-muted border-border"
          }`}
        >
          All ({stocks.length})
        </Button>
        {sectorList.map((sector) => {
          const isSelected = selectedSector === sector.name;
          const avgChangeColor = sector.avgChange >= 0 ? "bg-emerald-500" : "bg-red-500";
          const sectorColor = SECTOR_COLORS[sector.name] || SECTOR_COLORS["Others"];
          
          return (
            <Button
              key={sector.name}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSector(sector.name)}
              className={`shrink-0 text-xs h-7 px-2.5 gap-1.5 font-medium transition-all ${
                isSelected 
                  ? "shadow-md border-0 text-white" 
                  : "bg-card hover:bg-muted border-border"
              }`}
              style={isSelected ? { backgroundColor: sectorColor } : undefined}
            >
              <span 
                className={`w-1.5 h-1.5 rounded-full ${avgChangeColor}`}
              />
              <span className="max-w-[120px] truncate">{sector.name}</span>
              <span className="text-[10px] opacity-70">({sector.stocks.length})</span>
            </Button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedSector && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSector(null)}
              className="gap-2 h-7 text-xs"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {displayData.length} stocks • Click to view details
          </span>
        </div>
        
        {/* Color Legend */}
        <div className="flex items-center gap-0.5">
          <span className="mr-2 text-xs text-muted-foreground">Loss</span>
          {[
            "hsl(0, 80%, 28%)",
            "hsl(0, 75%, 35%)",
            "hsl(0, 70%, 40%)",
            "hsl(0, 60%, 45%)",
            "hsl(220, 15%, 45%)",
            "hsl(142, 55%, 45%)",
            "hsl(142, 65%, 40%)",
            "hsl(142, 72%, 35%)",
            "hsl(142, 76%, 28%)",
          ].map((color, i) => (
            <div
              key={i}
              className="h-4 w-5"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">Gain</span>
        </div>
      </div>

      {/* Treemap - Main View */}
      <div className="h-[550px] w-full rounded-lg overflow-hidden border border-border/50 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={displayData}
            dataKey="size"
            stroke="rgba(0,0,0,0.2)"
            animationDuration={200}
            content={
              <StockTreemapContent
                onNodeClick={handleStockClick}
              />
            }
          >
            <Tooltip content={<StockTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/20 p-3">
          <div className="rounded-xl bg-emerald-500/30 p-2">
            <div className="h-4 w-4 rounded-full bg-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Gainers</p>
            <p className="text-lg font-bold text-emerald-400">
              {displayData.filter(s => (s.changePercent || 0) > 0).length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border-2 border-slate-500/40 bg-slate-500/20 p-3">
          <div className="rounded-xl bg-slate-500/30 p-2">
            <div className="h-4 w-4 rounded-full bg-slate-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Unchanged</p>
            <p className="text-lg font-bold text-slate-400">
              {displayData.filter(s => (s.changePercent || 0) === 0).length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border-2 border-rose-500/40 bg-rose-500/20 p-3">
          <div className="rounded-xl bg-rose-500/30 p-2">
            <div className="h-4 w-4 rounded-full bg-rose-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Losers</p>
            <p className="text-lg font-bold text-rose-400">
              {displayData.filter(s => (s.changePercent || 0) < 0).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
