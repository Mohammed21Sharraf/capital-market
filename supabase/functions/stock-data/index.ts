import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

interface StockDataRequest {
  symbol: string;
  include_history?: boolean;
  timeframe?: Timeframe;
}

interface MarketData {
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  trade: number;
  valueMn: number;
}

interface Fundamentals {
  symbol: string;
  sector?: string;
  category?: string;
  marketCap?: number;
  authorizedCap?: number;
  paidUpCap?: number;
  faceValue?: number;
  totalShares?: number;
  pe?: number;
  eps?: number;
  nav?: number;
  yearHigh?: number;
  yearLow?: number;
  listingYear?: number;
  lastAGM?: string;
}

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Get the base URL for internal function calls
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

async function fetchMarketData(symbol: string): Promise<{ data: any; marketOpen: boolean } | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/market-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ code: symbol }),
    });

    if (!response.ok) {
      console.error("Market data fetch failed:", response.status);
      return null;
    }

    const result = await response.json();
    return {
      data: result.stock || null,
      marketOpen: result.marketOpen || false,
    };
  } catch (error) {
    console.error("Error fetching market data:", error);
    return null;
  }
}

async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-fundamentals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      console.error("Fundamentals fetch failed:", response.status);
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Error fetching fundamentals:", error);
    return null;
  }
}

async function fetchHistory(
  symbol: string,
  timeframe: Timeframe,
  currentPrice: number,
  highPrice: number,
  lowPrice: number,
  volume: number
): Promise<HistoricalDataPoint[] | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stock-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        symbol,
        timeframe,
        currentPrice,
        highPrice,
        lowPrice,
        volume,
      }),
    });

    if (!response.ok) {
      console.error("History fetch failed:", response.status);
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Error fetching history:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request parameters
    let params: StockDataRequest;

    if (req.method === "GET") {
      const url = new URL(req.url);
      params = {
        symbol: url.searchParams.get("symbol") || "",
        include_history: url.searchParams.get("include_history") === "true",
        timeframe: (url.searchParams.get("timeframe") as Timeframe) || "1M",
      };
    } else {
      params = await req.json();
    }

    const { symbol, include_history = false, timeframe = "1M" } = params;

    if (!symbol) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Symbol is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    // Fetch market data and fundamentals in parallel
    const [marketResult, fundamentals] = await Promise.all([
      fetchMarketData(upperSymbol),
      fetchFundamentals(upperSymbol),
    ]);

    if (!marketResult?.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Stock not found: ${upperSymbol}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stockData = marketResult.data;
    const marketOpen = marketResult.marketOpen;

    // Build market data object
    const market: MarketData = {
      ltp: stockData.ltp || 0,
      change: stockData.change || 0,
      changePercent: stockData.changePercent || 0,
      open: stockData.open || 0,
      high: stockData.high || 0,
      low: stockData.low || 0,
      previousClose: stockData.previousClose || stockData.open || 0,
      volume: stockData.volume || 0,
      trade: stockData.trade || 0,
      valueMn: stockData.valueMn || 0,
    };

    // Optionally fetch historical data
    let history: HistoricalDataPoint[] | null = null;
    if (include_history) {
      history = await fetchHistory(
        upperSymbol,
        timeframe,
        market.ltp,
        market.high,
        market.low,
        market.volume
      );
    }

    // Build unified response
    const response = {
      success: true,
      data: {
        symbol: upperSymbol,
        name: stockData.name || upperSymbol,
        sector: fundamentals?.sector || stockData.sector || "Unknown",
        category: fundamentals?.category || stockData.category || "Unknown",

        market,

        fundamentals: fundamentals
          ? {
              marketCap: fundamentals.marketCap,
              authorizedCap: fundamentals.authorizedCap,
              paidUpCap: fundamentals.paidUpCap,
              faceValue: fundamentals.faceValue,
              totalShares: fundamentals.totalShares,
              pe: fundamentals.pe,
              eps: fundamentals.eps,
              nav: fundamentals.nav,
              yearHigh: fundamentals.yearHigh,
              yearLow: fundamentals.yearLow,
              listingYear: fundamentals.listingYear,
              lastAGM: fundamentals.lastAGM,
            }
          : null,

        history: history || undefined,
      },
      marketOpen,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stock data API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
