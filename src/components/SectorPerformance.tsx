import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Stock } from "@/types/market";

interface SectorPerformanceProps {
  stocks: Stock[];
}

// DSE Sector mapping based on common company naming patterns
const SECTOR_PATTERNS: Record<string, RegExp[]> = {
  "Bank": [/BANK/, /BNK/, /ISLAMI/, /JAMUNA/, /MERCANTILE/, /PUBALI/, /RUPALI/, /SOUTHEAST/, /PREMIER/, /EXIM/, /MTBL/, /ALARABANK/, /BRACBANK/, /CITYBANK/, /DHAKA/, /DUTCH/, /FIRST/, /ICB/, /NCC/, /NRBC/, /ONE/, /SHAHJALAL/, /SOCIAL/, /SONALI/, /STANDARD/, /TRUST/, /UCBL/, /UTTARA/],
  "Pharma": [/PHARMA/, /LAB/, /ACME/, /BEXIMCO/, /SQUARE/, /RENATA/, /IBN/, /ORION/, /GLAXO/, /AVENTIS/, /SANOFI/, /RECKITT/, /FORMULA/, /AMBEE/],
  "Engineering": [/STEEL/, /ISPAT/, /BSRM/, /GPH/, /KSRM/, /RSRM/, /OLYMPIC/, /SINGER/, /WALTON/, /RUNNER/, /AFTAB/, /LINDE/, /RANGPUR/],
  "Textile": [/TEX/, /YARN/, /SPINNING/, /WEAVING/, /DENIM/, /COTTON/, /FIBER/, /FABRIC/],
  "Fuel & Power": [/POWER/, /GAS/, /OIL/, /PETROLEUM/, /JAMUNA/, /PADMA/, /SUMMIT/, /BARKA/, /UNITED/],
  "Food": [/FOOD/, /DAIRY/, /SUGAR/, /FEED/, /AGRO/, /MILK/, /AMAN/, /OLYMPIC/, /PRAN/],
  "Cement": [/CEMENT/, /LAFARGE/, /HEIDELBERG/, /PREMIER/, /MEGHNA/, /CONFIDENCE/],
  "Insurance": [/INS/, /INSURANCE/, /LIFE/, /ASIA/, /CONTINENTAL/, /DELTA/, /EASTERN/, /GLOBE/, /GREEN/, /JANATA/, /MERCANTILE/, /NATIONAL/, /PEOPLES/, /PIONEER/, /PRAGATI/, /PRIME/, /RELIANCE/, /REPUBLIC/, /RUPALI/, /SONAR/, /UNITED/],
  "IT": [/TECH/, /SOFTWARE/, /IT/, /COMPUTER/, /DIGITAL/, /DATA/, /NET/, /SYSL/, /BDCOM/, /ADNTEL/, /BRACIT/],
  "Financial": [/FINANCE/, /LEASING/, /CAPITAL/, /INVEST/, /FML/, /LIC/, /IDLC/, /IFIC/, /IPDC/, /LANKA/, /MIDAS/, /NBF/, /PF1/, /UNION/],
  "Telecom": [/GRAMEENPHONE/, /GP/, /ROBI/, /BANGLALINK/, /TELETALK/],
  "Mutual Fund": [/MF/, /1ST/, /FUND/, /GROWTH/],
};

function getSector(symbol: string, name: string): string {
  const combined = `${symbol} ${name}`.toUpperCase();
  
  for (const [sector, patterns] of Object.entries(SECTOR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return sector;
      }
    }
  }
  return "Others";
}

const SECTOR_COLORS: Record<string, string> = {
  "Bank": "#3b82f6",
  "Pharma": "#10b981",
  "Engineering": "#f59e0b",
  "Textile": "#8b5cf6",
  "Fuel & Power": "#ef4444",
  "Food": "#06b6d4",
  "Cement": "#6b7280",
  "Insurance": "#ec4899",
  "IT": "#14b8a6",
  "Financial": "#f97316",
  "Telecom": "#a855f7",
  "Mutual Fund": "#84cc16",
  "Others": "#64748b",
};

interface SectorData {
  name: string;
  value: number;
  stocks: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  avgChange: number;
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

    const result: SectorData[] = Object.entries(sectors)
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

  const formatValue = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(2)}B`;
    return `${value.toFixed(2)}M`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SectorData;
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