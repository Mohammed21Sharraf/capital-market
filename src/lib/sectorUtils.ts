// Shared sector utilities for the application
import { Stock } from "@/types/market";

// DSE Sector mapping based on common company naming patterns
export const SECTOR_PATTERNS: Record<string, RegExp[]> = {
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

export const SECTOR_COLORS: Record<string, string> = {
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

export function getSector(symbol: string, name: string): string {
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

export interface SectorData {
  name: string;
  value: number;
  stocks: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  avgChange: number;
  stockList: Stock[];
}

export function calculateSectorData(stocks: Stock[]): SectorData[] {
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

  return Object.entries(sectors)
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
        stockList: data.stocks,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export function formatValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}B`;
  return `${value.toFixed(2)}M`;
}

// Get color based on percentage change (for treemap heatmap)
export function getChangeColor(changePercent: number): string {
  // Clamp to -6% to +6% range
  const clampedChange = Math.max(-6, Math.min(6, changePercent));
  
  if (clampedChange > 0) {
    // Green gradient for positive
    const intensity = Math.min(1, clampedChange / 6);
    const lightness = 45 - (intensity * 20); // 45% to 25%
    return `hsl(142, 71%, ${lightness}%)`;
  } else if (clampedChange < 0) {
    // Red gradient for negative
    const intensity = Math.min(1, Math.abs(clampedChange) / 6);
    const lightness = 51 - (intensity * 20); // 51% to 31%
    return `hsl(0, 72%, ${lightness}%)`;
  }
  // Neutral gray
  return `hsl(215, 16%, 55%)`;
}
