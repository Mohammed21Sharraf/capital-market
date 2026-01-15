import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Stock } from "@/types/market";

interface TopValueChartProps {
  stocks: Stock[];
  type: "highest" | "lowest";
  onStockClick?: (stock: Stock) => void;
}

export function TopValueChart({ stocks, type, onStockClick }: TopValueChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...stocks].filter(s => s.valueMn > 0);
    
    if (type === "highest") {
      return sorted.sort((a, b) => b.valueMn - a.valueMn).slice(0, 20);
    } else {
      return sorted.sort((a, b) => a.valueMn - b.valueMn).slice(0, 20);
    }
  }, [stocks, type]);

  const formatValue = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
    return `${value.toFixed(1)}M`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.symbol}</p>
          <p className="text-sm text-muted-foreground">{data.name}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Value: </span>
              <span className="font-mono font-semibold text-primary">{formatValue(data.valueMn)} Tk</span>
            </p>
            <p>
              <span className="text-muted-foreground">LTP: </span>
              <span className="font-mono">{data.ltp.toFixed(2)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Change: </span>
              <span className={`font-mono ${data.changePercent > 0 ? 'text-price-up' : data.changePercent < 0 ? 'text-price-down' : 'text-price-neutral'}`}>
                {data.changePercent > 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={600}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
      >
        <XAxis 
          type="number" 
          tickFormatter={formatValue}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
        />
        <YAxis 
          type="category" 
          dataKey="symbol" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          width={75}
          tick={{ fill: 'hsl(var(--foreground))' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
        <Bar 
          dataKey="valueMn" 
          radius={[0, 4, 4, 0]}
          onClick={(data) => onStockClick?.(data)}
          style={{ cursor: onStockClick ? 'pointer' : 'default' }}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={entry.changePercent > 0 
                ? 'hsl(var(--price-up))' 
                : entry.changePercent < 0 
                  ? 'hsl(var(--price-down))' 
                  : 'hsl(var(--primary))'
              }
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}