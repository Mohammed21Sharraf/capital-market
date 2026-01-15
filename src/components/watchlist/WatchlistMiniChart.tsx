import { Stock } from "@/types/market";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface WatchlistMiniChartProps {
  stock: Stock;
}

export function WatchlistMiniChart({ stock }: WatchlistMiniChartProps) {
  // Generate simulated intraday data based on stock's OHLC
  const chartData = useMemo(() => {
    const { open, high, low, ltp } = stock;
    const points = 20;
    const data = [];

    // Create a realistic price path from open to current
    for (let i = 0; i <= points; i++) {
      const progress = i / points;
      // Add some randomness while respecting high/low bounds
      const basePrice = open + (ltp - open) * progress;
      const noise = (Math.random() - 0.5) * (high - low) * 0.3;
      let price = basePrice + noise;
      
      // Clamp to high/low
      price = Math.min(high, Math.max(low, price));
      
      // Last point should be exact LTP
      if (i === points) price = ltp;
      
      data.push({
        time: i,
        price: price,
      });
    }

    return data;
  }, [stock]);

  const isPositive = stock.changePercent >= 0;
  const gradientId = `gradient-${stock.symbol}`;
  const strokeColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const fillColor = isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div className="h-[80px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <ReferenceLine
            y={stock.previousClose || stock.open}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
