import { useState, useMemo, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Stock } from "@/types/market";
import { getSector, SECTOR_COLORS, getChangeColor, formatValue } from "@/lib/sectorUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Grid3X3 } from "lucide-react";

interface BirdsEyeViewProps {
  stocks: Stock[];
  onStockClick?: (stock: Stock) => void;
}

interface SectorNode {
  name: string;
  size: number;
  color: string;
  stockCount: number;
  avgChange: number;
  advancers: number;
  decliners: number;
  stocks: Stock[];
}

interface StockNode {
  name: string;
  symbol: string;
  size: number;
  color: string;
  changePercent: number;
  stock: Stock;
}

// Custom content renderer for the treemap
const SectorTreemapContent = ({ 
  x, 
  y, 
  width, 
  height, 
  name, 
  stockCount,
  avgChange,
  advancers,
  decliners,
  color,
  onNodeClick,
}: any) => {
  if (width < 2 || height < 2) return null;
  
  const showLabel = width > 40 && height > 30;
  const showDetails = width > 80 && height > 60;
  const showStats = width > 100 && height > 80;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "hsl(220, 20%, 12%)",
          strokeWidth: 2,
          cursor: "pointer",
        }}
        onClick={() => onNodeClick?.(name)}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (showDetails ? 12 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fill: "#fff",
              fontSize: Math.min(16, Math.max(10, Math.min(width, height) / 5)),
              fontWeight: 700,
              textShadow: "0 1px 3px rgba(0,0,0,0.6)",
              pointerEvents: "none",
            }}
          >
            {name}
          </text>
          {showDetails && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fill: "rgba(255,255,255,0.85)",
                fontSize: Math.min(11, Math.max(8, Math.min(width, height) / 8)),
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          >
            {stockCount ?? 0} stocks • {(avgChange ?? 0) > 0 ? "+" : ""}{(avgChange ?? 0).toFixed(2)}%
            </text>
          )}
          {showStats && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 22}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fill: "rgba(255,255,255,0.7)",
                fontSize: Math.min(10, Math.max(7, Math.min(width, height) / 10)),
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                pointerEvents: "none",
            }}
          >
            ↑{advancers ?? 0} ↓{decliners ?? 0}
            </text>
          )}
        </>
      )}
    </g>
  );
};

// Custom content renderer for stocks
const StockTreemapContent = ({ 
  x, 
  y, 
  width, 
  height, 
  name, 
  symbol,
  changePercent,
  color,
  stock,
  onNodeClick,
}: any) => {
  if (width < 2 || height < 2) return null;
  
  const showLabel = width > 30 && height > 20;
  const showChange = width > 45 && height > 35;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "hsl(220, 20%, 7%)",
          strokeWidth: 1,
          cursor: "pointer",
          opacity: 0.95,
        }}
        onClick={() => onNodeClick?.(stock)}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showChange ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: "#fff",
            fontSize: Math.min(12, Math.max(8, Math.min(width, height) / 6)),
            fontWeight: 500,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {symbol || name}
        </text>
      )}
      {showChange && changePercent !== undefined && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: "#fff",
            fontSize: Math.min(10, Math.max(7, Math.min(width, height) / 8)),
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {(changePercent ?? 0) > 0 ? "+" : ""}{(changePercent ?? 0).toFixed(2)}%
        </text>
      )}
    </g>
  );
};

// Custom tooltip for sectors
const SectorTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <div className="font-semibold text-foreground">{data.name}</div>
      <div className="mt-1 space-y-1 text-sm text-muted-foreground">
        <div>Stocks: {data.stockCount ?? 0}</div>
        <div>Value: {formatValue(data.size ?? 0)}</div>
        <div className={(data.avgChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"}>
          Avg Change: {(data.avgChange ?? 0) > 0 ? "+" : ""}{(data.avgChange ?? 0).toFixed(2)}%
        </div>
        <div className="flex gap-3">
          <span className="text-green-500">↑ {data.advancers ?? 0}</span>
          <span className="text-red-500">↓ {data.decliners ?? 0}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Click to view stocks</div>
    </div>
  );
};

// Custom tooltip for stocks
const StockTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  const stock = data.stock;
  
  if (!stock) return null;
  
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <div className="font-semibold text-foreground">{stock.symbol}</div>
      <div className="text-xs text-muted-foreground">{stock.name}</div>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-mono text-foreground">৳{(stock.ltp ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Change:</span>
          <span className={`font-mono ${(stock.change ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
            {(stock.change ?? 0) > 0 ? "+" : ""}{(stock.change ?? 0).toFixed(2)} ({(stock.changePercent ?? 0) > 0 ? "+" : ""}{(stock.changePercent ?? 0).toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono text-foreground">{(stock.volume ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono text-foreground">{formatValue(stock.valueMn ?? 0)}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Click for details</div>
    </div>
  );
};

export function BirdsEyeView({ stocks, onStockClick }: BirdsEyeViewProps) {
  const [zoomedSector, setZoomedSector] = useState<string | null>(null);

  // Build sector-level data (flat list for sector view)
  const sectorData = useMemo((): SectorNode[] => {
    const sectorMap: Record<string, { stocks: Stock[]; totalValue: number }> = {};

    stocks.forEach(stock => {
      const sector = getSector(stock.symbol, stock.name);
      if (!sectorMap[sector]) {
        sectorMap[sector] = { stocks: [], totalValue: 0 };
      }
      sectorMap[sector].stocks.push(stock);
      sectorMap[sector].totalValue += stock.valueMn;
    });

    return Object.entries(sectorMap)
      .map(([name, data]) => {
        const advancers = data.stocks.filter(s => s.change > 0).length;
        const decliners = data.stocks.filter(s => s.change < 0).length;
        const avgChange = data.stocks.reduce((sum, s) => sum + s.changePercent, 0) / data.stocks.length;
        
        return {
          name,
          size: Math.max(data.totalValue, 1),
          color: SECTOR_COLORS[name] || SECTOR_COLORS["Others"],
          stockCount: data.stocks.length,
          avgChange,
          advancers,
          decliners,
          stocks: data.stocks,
        };
      })
      .sort((a, b) => b.size - a.size);
  }, [stocks]);

  // Build stock-level data for zoomed sector
  const stockData = useMemo((): StockNode[] => {
    if (!zoomedSector) return [];
    
    const sector = sectorData.find(s => s.name === zoomedSector);
    if (!sector) return [];
    
    return sector.stocks
      .sort((a, b) => b.valueMn - a.valueMn)
      .map(stock => ({
        name: stock.name,
        symbol: stock.symbol,
        size: Math.max(stock.valueMn, 0.1),
        color: getChangeColor(stock.changePercent),
        changePercent: stock.changePercent,
        stock,
      }));
  }, [sectorData, zoomedSector]);

  const handleSectorClick = useCallback((sectorName: string) => {
    setZoomedSector(sectorName);
  }, []);

  const handleStockClick = useCallback((stock: Stock) => {
    if (onStockClick) {
      onStockClick(stock);
    }
  }, [onStockClick]);

  const handleZoomOut = () => {
    setZoomedSector(null);
  };

  // Color legend
  const colorLegend = [
    { label: "-6%+", color: "hsl(0, 72%, 31%)" },
    { label: "-3%", color: "hsl(0, 72%, 41%)" },
    { label: "0%", color: "hsl(215, 16%, 55%)" },
    { label: "+3%", color: "hsl(142, 71%, 35%)" },
    { label: "+6%+", color: "hsl(142, 71%, 25%)" },
  ];

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

  // Get zoomed sector info for header
  const zoomedSectorInfo = zoomedSector 
    ? sectorData.find(s => s.name === zoomedSector) 
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {zoomedSector ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                All Sectors
              </Button>
              <div className="flex items-center gap-2">
                <div 
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: zoomedSectorInfo?.color }}
                />
                <span className="font-semibold text-foreground">{zoomedSector}</span>
                <span className="text-sm text-muted-foreground">
                  ({zoomedSectorInfo?.stockCount} stocks)
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Click on a sector to view individual stocks
            </div>
          )}
        </div>
        
        {/* Legend - only show when viewing stocks */}
        {zoomedSector && (
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-muted-foreground">Change:</span>
            {colorLegend.map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <div
                  className="h-4 w-8 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="mt-0.5 text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Treemap */}
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {zoomedSector ? (
            <Treemap
              data={stockData}
              dataKey="size"
              stroke="hsl(220, 20%, 7%)"
              animationDuration={300}
              content={
                <StockTreemapContent
                  onNodeClick={handleStockClick}
                />
              }
            >
              <Tooltip content={<StockTooltip />} />
            </Treemap>
          ) : (
            <Treemap
              data={sectorData}
              dataKey="size"
              stroke="hsl(220, 20%, 12%)"
              animationDuration={300}
              content={
                <SectorTreemapContent
                  onNodeClick={handleSectorClick}
                />
              }
            >
              <Tooltip content={<SectorTooltip />} />
            </Treemap>
          )}
        </ResponsiveContainer>
      </div>

      {/* Sector legend when not zoomed */}
      {!zoomedSector && (
        <div className="flex flex-wrap justify-center gap-3">
          {sectorData.slice(0, 8).map((sector) => (
            <button
              key={sector.name}
              onClick={() => handleSectorClick(sector.name)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:bg-muted"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: sector.color }}
              />
              <span className="text-foreground">{sector.name}</span>
              <span className="text-muted-foreground">({sector.stockCount})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
