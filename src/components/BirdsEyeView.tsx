import { useMemo, useState, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Stock } from "@/types/market";
import { 
  getSector, 
  SECTOR_COLORS, 
  getChangeColor, 
  formatValue 
} from "@/lib/sectorUtils";
import { ArrowLeft, ZoomIn, ZoomOut, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BirdsEyeViewProps {
  stocks: Stock[];
  onStockClick?: (stock: Stock) => void;
}

interface TreemapNode {
  name: string;
  symbol?: string;
  size?: number;
  value?: number;
  changePercent?: number;
  color?: string;
  children?: TreemapNode[];
  stock?: Stock;
  sector?: string;
}

// Custom treemap content renderer
const CustomTreemapContent = ({ 
  root, 
  depth, 
  x, 
  y, 
  width, 
  height, 
  name, 
  changePercent,
  symbol,
  stock,
  color,
  onNodeClick,
  zoomedSector,
}: any) => {
  if (width < 2 || height < 2) return null;
  
  const isStock = depth === 2 || (zoomedSector && depth === 1);
  const showLabel = width > 30 && height > 20;
  const showChange = width > 45 && height > 35;
  
  const displayColor = isStock && changePercent !== undefined 
    ? getChangeColor(changePercent) 
    : color || SECTOR_COLORS["Others"];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: displayColor,
          stroke: "hsl(220, 20%, 7%)",
          strokeWidth: isStock ? 1 : 2,
          cursor: stock ? "pointer" : "default",
          opacity: isStock ? 0.9 : 1,
        }}
        onClick={() => onNodeClick?.(stock, name, isStock)}
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
            fontWeight: isStock ? 500 : 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {isStock ? symbol || name : name}
        </text>
      )}
      {showChange && isStock && changePercent !== undefined && (
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
          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
        </text>
      )}
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const isStock = !!data.stock;
  
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      {isStock ? (
        <>
          <p className="font-semibold text-foreground">{data.symbol}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">LTP: </span>
              <span className="font-mono font-semibold">৳{data.stock?.ltp?.toFixed(2)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Change: </span>
              <span className={`font-mono ${
                data.changePercent > 0 ? 'text-price-up' : 
                data.changePercent < 0 ? 'text-price-down' : 'text-price-neutral'
              }`}>
                {data.changePercent > 0 ? '+' : ''}{data.changePercent?.toFixed(2)}%
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Value: </span>
              <span className="font-mono">{formatValue(data.value || 0)} Tk</span>
            </p>
            <p>
              <span className="text-muted-foreground">Sector: </span>
              <span>{data.sector}</span>
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Click to zoom into sector
          </p>
        </>
      )}
    </div>
  );
};

export function BirdsEyeView({ stocks, onStockClick }: BirdsEyeViewProps) {
  const [zoomedSector, setZoomedSector] = useState<string | null>(null);

  // Build hierarchical data for treemap
  const treemapData = useMemo(() => {
    const sectorMap: Record<string, { stocks: Stock[]; totalValue: number }> = {};

    stocks.forEach(stock => {
      const sector = getSector(stock.symbol, stock.name);
      if (!sectorMap[sector]) {
        sectorMap[sector] = { stocks: [], totalValue: 0 };
      }
      sectorMap[sector].stocks.push(stock);
      sectorMap[sector].totalValue += stock.valueMn;
    });

    const children: TreemapNode[] = Object.entries(sectorMap)
      .map(([sectorName, data]) => ({
        name: sectorName,
        color: SECTOR_COLORS[sectorName] || SECTOR_COLORS["Others"],
        children: data.stocks
          .sort((a, b) => b.valueMn - a.valueMn)
          .map(stock => ({
            name: stock.name,
            symbol: stock.symbol,
            size: Math.max(stock.valueMn, 0.1), // Ensure minimum size
            value: stock.valueMn,
            changePercent: stock.changePercent,
            stock: stock,
            sector: sectorName,
          })),
      }))
      .sort((a, b) => {
        const aTotal = a.children?.reduce((sum, c) => sum + (c.size || 0), 0) || 0;
        const bTotal = b.children?.reduce((sum, c) => sum + (c.size || 0), 0) || 0;
        return bTotal - aTotal;
      });

    return children;
  }, [stocks]);

  // Get zoomed data if a sector is selected
  const displayData = useMemo(() => {
    if (!zoomedSector) {
      return treemapData;
    }
    
    const sector = treemapData.find(s => s.name === zoomedSector);
    if (!sector || !sector.children) return treemapData;
    
    // Return flat list of stocks when zoomed
    return sector.children.map(stock => ({
      ...stock,
      color: getChangeColor(stock.changePercent || 0),
    }));
  }, [treemapData, zoomedSector]);

  const handleNodeClick = useCallback((stock: Stock | undefined, name: string, isStock: boolean) => {
    if (isStock && stock && onStockClick) {
      onStockClick(stock);
    } else if (!isStock && !zoomedSector) {
      setZoomedSector(name);
    }
  }, [onStockClick, zoomedSector]);

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
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Grid3X3 className="mx-auto h-12 w-12 opacity-50 mb-3" />
          <p>No market data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {zoomedSector && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Sectors
            </Button>
          )}
          <div className="text-sm text-muted-foreground">
            {zoomedSector ? (
              <span className="font-medium text-foreground">{zoomedSector} Sector</span>
            ) : (
              <span>Click a sector to zoom in • Click a stock for details</span>
            )}
          </div>
        </div>
        
        {/* Color Legend */}
        <div className="hidden md:flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Change:</span>
          {colorLegend.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div 
                className="w-5 h-4 rounded-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treemap */}
      <div className="h-[500px] md:h-[600px] rounded-lg border border-border bg-card overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={displayData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="hsl(220, 20%, 7%)"
            content={
              <CustomTreemapContent 
                onNodeClick={handleNodeClick}
                zoomedSector={zoomedSector}
              />
            }
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Mobile Color Legend */}
      <div className="flex md:hidden items-center justify-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground mr-2">Change:</span>
        {colorLegend.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div 
              className="w-4 h-3 rounded-sm" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Size represents trading value • Color indicates price change</p>
      </div>
    </div>
  );
}
