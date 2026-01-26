import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceRecord {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const prices: PriceRecord[] = body.prices;

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prices provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round to 1 decimal place
    const round1 = (n: number): number => Math.round(n * 10) / 10;

    // Validate and transform data
    const validRecords = prices
      .filter((p) => p.symbol && p.date && p.close > 0)
      .map((p) => ({
        symbol: p.symbol.toUpperCase().trim(),
        date: p.date,
        open: round1(Math.max(0, p.open || p.close)),
        high: round1(Math.max(p.high || p.close, p.open || p.close, p.close)),
        low: round1(Math.min(p.low || p.close, p.open || p.close, p.close)),
        close: round1(p.close),
        volume: Math.max(0, Math.floor(p.volume || 0)),
      }));

    if (validRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid records found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert records (update if exists, insert if not)
    const { data, error } = await supabase
      .from("historical_prices")
      .upsert(validRecords, {
        onConflict: "symbol,date",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: validRecords.length,
        message: `Successfully imported ${validRecords.length} records`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in import-historical-prices:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
