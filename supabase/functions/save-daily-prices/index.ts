import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StockData {
  symbol: string;
  ltp: number;
  high: number;
  low: number;
  closep: number;
  volume: number;
}

// Round to 1 decimal place
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Format date as YYYY-MM-DD in Bangladesh timezone
function getTodayDateBD(): string {
  const now = new Date();
  const bdTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const year = bdTime.getFullYear();
  const month = String(bdTime.getMonth() + 1).padStart(2, "0");
  const day = String(bdTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if today is a trading day (Sun-Thu in Bangladesh)
function isTradingDay(): boolean {
  const now = new Date();
  const bdTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const day = bdTime.getDay();
  // Sunday = 0, Monday = 1, ..., Thursday = 4
  return day >= 0 && day <= 4;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if it's a trading day
    if (!isTradingDay()) {
      console.log("Not a trading day, skipping price save");
      return new Response(
        JSON.stringify({ success: true, message: "Not a trading day, skipped", saved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current market data from market-data function
    const marketDataUrl = `${supabaseUrl}/functions/v1/market-data`;
    const marketRes = await fetch(marketDataUrl, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    if (!marketRes.ok) {
      throw new Error(`Failed to fetch market data: ${marketRes.status}`);
    }

    const marketData = await marketRes.json();
    const stocks: StockData[] = marketData.data || [];

    if (stocks.length === 0) {
      console.log("No stock data available");
      return new Response(
        JSON.stringify({ success: true, message: "No stock data available", saved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayDate = getTodayDateBD();
    console.log(`Saving ${stocks.length} stock prices for ${todayDate}`);

    // Prepare records with 1 decimal precision
    const priceRecords = stocks
      .filter((s) => s.symbol && s.ltp > 0)
      .map((s) => ({
        symbol: s.symbol.toUpperCase().trim(),
        date: todayDate,
        open: round1(s.closep || s.ltp), // Use previous close as open
        high: round1(s.high || s.ltp),
        low: round1(s.low || s.ltp),
        close: round1(s.ltp), // LTP is the closing price
        volume: Math.max(0, Math.floor(s.volume || 0)),
      }));

    if (priceRecords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No valid records to save", saved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert records (update if exists for the same symbol+date)
    const { error } = await supabase
      .from("historical_prices")
      .upsert(priceRecords, {
        onConflict: "symbol,date",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Database upsert error:", error);
      throw new Error(error.message);
    }

    console.log(`Successfully saved ${priceRecords.length} price records for ${todayDate}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Saved ${priceRecords.length} stock prices for ${todayDate}`,
        saved: priceRecords.length,
        date: todayDate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in save-daily-prices:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
