import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Stock } from "@/types/market";
import { 
  getSector, 
  SECTOR_COLORS, 
  formatValue,
  SectorData 
} from "@/lib/sectorUtils";

interface SectorPerformanceProps {
  stocks: Stock[];
}

export function SectorPerformance({ stocks }: SectorPerformanceProps) {
  const sectorData = useMemo(() => {
    const sectors: Record<string, { 
      value: number; 
      stocks: Stock[];
    }> = {};

    stocks.forEach(stock => {
      const sector = getSector(stock.symbol, stock.name);
      if (!sectors[sector]) {
        sectors[sector] = { value: 0, stocks: [] };
      }
      sectors[sector].value += stock.valueMn;
      sectors[sector].stocks.push(stock);
    });

    const result: Omit<SectorData, 'stockList'>[] = Object.entries(sectors)
      .map(([name, data]) => {
        const advancers = data.stocks.filter(s => s.change > 0).length;
        const decliners = data.stocks.filter(s => s.change < 0).length;
        const unchanged = data.stocks.filter(s => s.change === 0).length;
        const avgChange = data.stocks.reduce((sum, s) => sum + s.changePercent, 0) / data.stocks.length;
        
        return {
          name,
          value: data.value,
          stocks: data.stocks.length,
          advancers,
          decliners,
          unchanged,
          avgChange,
        };
      })
      .sort((a, b) => b.value - a.value);

    return result;
  }, [stocks]);

  const totalValue = sectorData.reduce((sum, s) => sum + s.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as Omit<SectorData, 'stockList'>;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Value: </span>
              <span className="font-mono font-semibold">{formatValue(data.value)} Tk ({percentage}%)</span>
            </p>
            <p>
              <span className="text-muted-foreground">Stocks: </span>
              <span className="font-mono">{data.stocks}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Avg Change: </span>
              <span className={`font-mono ${data.avgChange > 0 ? 'text-price-up' : data.avgChange < 0 ? 'text-price-down' : 'text-price-neutral'}`}>
                {data.avgChange > 0 ? '+' : ''}{data.avgChange.toFixed(2)}%
              </span>
            </p>
            <div className="flex gap-3 pt-1">
              <span className="text-price-up">↑{data.advancers}</span>
              <span className="text-price-down">↓{data.decliners}</span>
              <span className="text-price-neutral">→{data.unchanged}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (sectorData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Pie Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectorData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {sectorData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={SECTOR_COLORS[entry.name] || SECTOR_COLORS["Others"]}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Sector List */}
      <div className="space-y-2 overflow-auto pr-2" style={{ maxHeight: 320 }}>
        {sectorData.map((sector) => {
          const percentage = ((sector.value / totalValue) * 100).toFixed(1);
          return (
            <div
              key={sector.name}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-2 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: SECTOR_COLORS[sector.name] || SECTOR_COLORS["Others"] }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{sector.name}</p>
                  <p className="text-xs text-muted-foreground">{sector.stocks} stocks</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {formatValue(sector.value)}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                  <span
                    className={`text-xs font-mono ${
                      sector.avgChange > 0
                        ? "text-price-up"
                        : sector.avgChange < 0
                        ? "text-price-down"
                        : "text-price-neutral"
                    }`}
                  >
                    {sector.avgChange > 0 ? "+" : ""}
                    {sector.avgChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}