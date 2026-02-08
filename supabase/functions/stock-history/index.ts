import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "10Y" | "Max";

// Cache for historical data
type CachedHistory = { data: HistoricalDataPoint[]; fetchedAt: number; source: string };
const historyCache: Map<string, CachedHistory> = new Map();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes cache

// Get date range for timeframe
function getDateRange(timeframe: Timeframe): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeframe) {
    case "1D":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "1W":
      startDate.setDate(startDate.getDate() - 14);
      break;
    case "1M":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "3M":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "6M":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "1Y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "10Y":
      startDate.setFullYear(startDate.getFullYear() - 10);
      break;
    case "Max":
      startDate.setFullYear(2000); // Go back to year 2000 for max data
      break;
  }
  
  return { startDate, endDate };
}

// Format date as YYYY-MM-DD
function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Fetch historical data from database
async function fetchFromDatabase(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<HistoricalDataPoint[]> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'dse_market_data' },
    });

    const startStr = formatDateYMD(startDate);
    const endStr = formatDateYMD(endDate);

    console.log(`Fetching from database: ${symbol} from ${startStr} to ${endStr}`);

    const { data, error } = await supabase
      .from("historical_prices")
      .select("date, open, high, low, close, volume")
      .eq("symbol", symbol.toUpperCase())
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("Database query error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`No data found in database for ${symbol}`);
      return [];
    }

    console.log(`Found ${data.length} records in database for ${symbol}`);

    return data.map((row) => ({
      date: new Date(row.date).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    }));
  } catch (error) {
    console.error("Database fetch error:", error);
    return [];
  }
}

// Generate simulated data as fallback
function generateFallbackData(
  currentPrice: number,
  highPrice: number,
  lowPrice: number,
  volume: number,
  timeframe: Timeframe
): HistoricalDataPoint[] {
  const now = new Date();
  const data: HistoricalDataPoint[] = [];
  
  let numPoints: number;
  let intervalMs: number;
  
  switch (timeframe) {
    case "1D":
      numPoints = 78;
      intervalMs = 5 * 60 * 1000;
      break;
    case "1W":
      numPoints = 5;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "1M":
      numPoints = 22;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "3M":
      numPoints = 66;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "6M":
      numPoints = 132;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "1Y":
      numPoints = 252;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "10Y":
      numPoints = 2520; // ~10 years of trading days
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "Max":
      numPoints = 5000; // Max historical points
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    default:
      numPoints = 22;
      intervalMs = 24 * 60 * 60 * 1000;
  }
  
  const priceRange = highPrice - lowPrice;
  const volatility = priceRange / currentPrice;
  const dailyVolatility = Math.max(0.01, volatility * 0.3);
  
  const priceSpread = priceRange * 0.8;
  let price = currentPrice - priceSpread * (Math.random() - 0.3);
  price = Math.max(lowPrice * 0.9, Math.min(highPrice * 1.1, price));
  
  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(now.getTime() - (numPoints - i) * intervalMs);
    
    const drift = (currentPrice - price) / (numPoints - i + 1) * 0.5;
    const randomMove = (Math.random() - 0.5) * 2 * price * dailyVolatility;
    
    const open = price;
    price = price + drift + randomMove;
    price = Math.max(lowPrice * 0.85, Math.min(highPrice * 1.15, price));
    
    const dayVolatility = price * dailyVolatility * (timeframe === "1D" ? 0.2 : 1);
    const high = Math.max(open, price) + Math.random() * dayVolatility;
    const low = Math.min(open, price) - Math.random() * dayVolatility;
    const close = price;
    
    const volumeVariation = 0.5 + Math.random();
    const pointVolume = Math.floor(volume * volumeVariation / (timeframe === "1D" ? numPoints : 1));
    
    data.push({
      date: timestamp.toISOString(),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: pointVolume,
    });
  }
  
  if (data.length > 0) {
    data[data.length - 1].close = currentPrice;
  }
  
  return data;
}

// Fetch historical data with fallback
async function fetchHistoricalData(
  symbol: string,
  timeframe: Timeframe,
  currentPrice: number,
  highPrice: number,
  lowPrice: number,
  volume: number
): Promise<{ data: HistoricalDataPoint[]; source: string }> {
  const cacheKey = `${symbol}_${timeframe}`;
  const now = Date.now();
  
  // Check cache
  const cached = historyCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`Using cached data for ${cacheKey}`);
    return { data: cached.data, source: cached.source };
  }
  
  const { startDate, endDate } = getDateRange(timeframe);
  
  // Try database first
  const dbData = await fetchFromDatabase(symbol, startDate, endDate);
  
  if (dbData.length > 0) {
    console.log(`Using database data for ${symbol}: ${dbData.length} records`);
    historyCache.set(cacheKey, { data: dbData, fetchedAt: now, source: "database" });
    return { data: dbData, source: "database" };
  }
  
  // Fall back to simulated data
  console.log(`Using simulated data for ${symbol}`);
  const fallbackData = generateFallbackData(currentPrice, highPrice, lowPrice, volume, timeframe);
  historyCache.set(cacheKey, { data: fallbackData, fetchedAt: now, source: "simulated" });
  
  return { data: fallbackData, source: "simulated" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let symbol: string | undefined;
    let timeframe: Timeframe = "1M";
    let currentPrice = 100;
    let highPrice = 110;
    let lowPrice = 90;
    let volume = 100000;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        symbol = body.symbol;
        timeframe = body.timeframe || "1M";
        currentPrice = body.currentPrice || 100;
        highPrice = body.highPrice || currentPrice * 1.1;
        lowPrice = body.lowPrice || currentPrice * 0.9;
        volume = body.volume || 100000;
      } catch {
        // ignore body parse errors
      }
    } else {
      const url = new URL(req.url);
      symbol = url.searchParams.get("symbol") || undefined;
      timeframe = (url.searchParams.get("timeframe") as Timeframe) || "1M";
    }

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Historical data request - symbol: ${symbol}, timeframe: ${timeframe}`);

    const { data, source } = await fetchHistoricalData(
      symbol.toUpperCase(),
      timeframe,
      currentPrice,
      highPrice,
      lowPrice,
      volume
    );

    return new Response(
      JSON.stringify({
        symbol: symbol.toUpperCase(),
        timeframe,
        data,
        count: data.length,
        source,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in stock-history function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
