import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

// Cache for historical data
type CachedHistory = { data: HistoricalDataPoint[]; fetchedAt: number };
const historyCache: Map<string, CachedHistory> = new Map();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes cache

function stripCommas(s: string) { return s.replace(/,/g, "").trim(); }

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseNumber(text: string): number {
  const cleaned = stripCommas(text);
  if (!cleaned || cleaned === "--" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntNumber(text: string): number {
  const cleaned = stripCommas(text);
  if (!cleaned || cleaned === "--" || cleaned === "-") return 0;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

// Delay helper for retry backoff
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with exponential backoff retry
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const backoffDelay = baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const totalDelay = backoffDelay + jitter;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(totalDelay)}ms delay`);
        await delay(totalDelay);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const defaultHeaders = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.5",
        "cache-control": "no-cache",
      };

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      console.log(`Fetched successfully (${text.length} chars) on attempt ${attempt + 1}`);
      return text;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRetryable =
        lastError.message.includes("abort") ||
        lastError.message.includes("timeout") ||
        lastError.message.includes("network") ||
        lastError.message.includes("HTTP 5") ||
        lastError.message.includes("HTTP 429");

      console.warn(`Fetch attempt ${attempt + 1} failed: ${lastError.message}`);

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}

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

// Parse date from various formats to Date object
function parseDate(dateStr: string): Date | null {
  // Try DD-Mon-YY format (e.g., "15-Jan-26")
  const dmyMatch = dateStr.match(/(\d{1,2})[-\/](\w{3})[-\/](\d{2,4})/i);
  if (dmyMatch) {
    const months: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const day = parseInt(dmyMatch[1]);
    const month = months[dmyMatch[2].toLowerCase()];
    let year = parseInt(dmyMatch[3]);
    if (year < 100) year += 2000;
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Try DD/MM/YYYY format
  const numMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (numMatch) {
    const day = parseInt(numMatch[1]);
    const month = parseInt(numMatch[2]) - 1;
    let year = parseInt(numMatch[3]);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Try YYYY-MM-DD format
  const isoMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    if (month >= 0 && month <= 11 && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  return null;
}

// Try to fetch from DSE close_price_archive.php
async function fetchFromDSEArchive(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalDataPoint[]> {
  const data: HistoricalDataPoint[] = [];
  
  try {
    const archiveUrl = `https://www.dsebd.org/close_price_archive.php`;
    console.log(`Trying close_price_archive.php for ${symbol}`);
    
    // POST with form data
    const formData = new URLSearchParams();
    formData.append("inst", symbol);
    formData.append("archive", "data");
    formData.append("sday", startDate.getDate().toString());
    formData.append("smonth", (startDate.getMonth() + 1).toString());
    formData.append("syear", startDate.getFullYear().toString());
    formData.append("eday", endDate.getDate().toString());
    formData.append("emonth", (endDate.getMonth() + 1).toString());
    formData.append("eyear", endDate.getFullYear().toString());
    
    const html = await fetchWithRetry(archiveUrl, {
      method: "POST",
      body: formData.toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "referer": "https://www.dsebd.org/close_price_archive.php",
        "origin": "https://www.dsebd.org",
      },
    }, 2, 1000);
    
    // Parse the response table
    // Format: DATE | TRADING CODE | LTP | HIGH | LOW | OPENP | CLOSEP | YCP | TRADE | VALUE | VOLUME
    const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    console.log(`Found ${allRows.length} rows in close_price_archive`);
    
    for (const tr of allRows) {
      if (/<th[\s>]/i.test(tr)) continue;
      
      const tdMatches = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
      const tdTexts = tdMatches.map((x: RegExpMatchArray) => decodeHtmlEntities(x[1].replace(/<[^>]+>/g, "").trim()));
      
      if (tdTexts.length < 7) continue;
      
      // Check if this row is for our symbol
      const hasSymbol = tdTexts.some(t => t.toUpperCase() === symbol.toUpperCase());
      if (!hasSymbol) continue;
      
      // Find date column
      let dateStr = "";
      let dateIdx = -1;
      for (let i = 0; i < 3; i++) {
        const parsed = parseDate(tdTexts[i]);
        if (parsed) {
          dateStr = tdTexts[i];
          dateIdx = i;
          break;
        }
      }
      
      if (!dateStr || dateIdx < 0) continue;
      
      const parsedDate = parseDate(dateStr);
      if (!parsedDate) continue;
      
      // Find price columns after the date and symbol
      // Expected: LTP(1) | HIGH(2) | LOW(3) | OPENP(4) | CLOSEP(5) | YCP(6) | TRADE(7) | VALUE(8) | VOLUME(9)
      const priceStartIdx = dateIdx + 2; // Skip date and symbol
      
      if (priceStartIdx + 9 > tdTexts.length) continue;
      
      const ltp = parseNumber(tdTexts[priceStartIdx]);
      const high = parseNumber(tdTexts[priceStartIdx + 1]);
      const low = parseNumber(tdTexts[priceStartIdx + 2]);
      const openPrice = parseNumber(tdTexts[priceStartIdx + 3]);
      const closePrice = parseNumber(tdTexts[priceStartIdx + 4]) || ltp;
      const ycp = parseNumber(tdTexts[priceStartIdx + 5]);
      const volume = parseIntNumber(tdTexts[priceStartIdx + 8]);
      
      if (closePrice > 0 && high > 0 && low > 0) {
        data.push({
          date: parsedDate.toISOString(),
          open: openPrice > 0 ? openPrice : (ycp > 0 ? ycp : closePrice),
          high: Math.max(high, closePrice),
          low: Math.min(low, closePrice),
          close: closePrice,
          volume,
        });
      }
    }
  } catch (error) {
    console.warn(`close_price_archive.php failed: ${error instanceof Error ? error.message : error}`);
  }
  
  return data;
}

// Try to fetch from multiple DSE day archives
async function fetchFromDSEDayArchives(symbol: string, startDate: Date, endDate: Date): Promise<HistoricalDataPoint[]> {
  const data: HistoricalDataPoint[] = [];
  const currentDate = new Date(endDate);
  const maxDays = Math.min(30, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  
  for (let i = 0; i < maxDays && currentDate >= startDate; i++) {
    // Skip weekends (Friday and Saturday in Bangladesh)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }
    
    try {
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const dayArchiveUrl = `https://www.dsebd.org/data_archive.php?view_archive=Archive&day=${day}&month=${month}&year=${year}`;
      
      const html = await fetchWithRetry(dayArchiveUrl, {}, 1, 500);
      
      // Parse for the specific symbol
      const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      for (const tr of allRows) {
        if (/<th[\s>]/i.test(tr)) continue;
        
        const tdMatches = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
        const tdTexts = tdMatches.map((x: RegExpMatchArray) => decodeHtmlEntities(x[1].replace(/<[^>]+>/g, "").trim()));
        
        // Check if this row contains our symbol (usually in first or second column)
        const symbolIdx = tdTexts.findIndex(t => t.toUpperCase() === symbol.toUpperCase());
        if (symbolIdx < 0) continue;
        
        // Parse price columns
        // Format varies but typically: SL | CODE | LTP | HIGH | LOW | CLOSEP | YCP | TRADE | VALUE | VOLUME
        if (tdTexts.length < 8) continue;
        
        const priceStartIdx = symbolIdx + 1;
        const ltp = parseNumber(tdTexts[priceStartIdx]);
        const high = parseNumber(tdTexts[priceStartIdx + 1]);
        const low = parseNumber(tdTexts[priceStartIdx + 2]);
        const closePrice = parseNumber(tdTexts[priceStartIdx + 3]) || ltp;
        const ycp = parseNumber(tdTexts[priceStartIdx + 4]);
        const volume = parseIntNumber(tdTexts[priceStartIdx + 7]);
        
        if (closePrice > 0 && high > 0 && low > 0) {
          data.push({
            date: new Date(year, month - 1, day).toISOString(),
            open: ycp > 0 ? ycp : closePrice,
            high: Math.max(high, closePrice),
            low: Math.min(low, closePrice),
            close: closePrice,
            volume,
          });
          break; // Found the symbol for this day
        }
      }
    } catch (error) {
      // Silently continue to next day
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return data;
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

// Try fetching from multiple DSE sources
async function fetchFromDSE(symbol: string, timeframe: Timeframe): Promise<HistoricalDataPoint[]> {
  const { startDate, endDate } = getDateRange(timeframe);
  
  // Try close_price_archive.php first (best for historical data)
  let data = await fetchFromDSEArchive(symbol, startDate, endDate);
  
  if (data.length > 0) {
    console.log(`Got ${data.length} data points from close_price_archive.php`);
    // Sort by date ascending
    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return data;
  }
  
  // Try day archives for recent data
  if (timeframe === "1W" || timeframe === "1M") {
    data = await fetchFromDSEDayArchives(symbol, startDate, endDate);
    
    if (data.length > 0) {
      console.log(`Got ${data.length} data points from day archives`);
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return data;
    }
  }
  
  console.log(`All DSE sources returned no data for ${symbol}`);
  return [];
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
    return { data: cached.data, source: "cached" };
  }
  
  try {
    const data = await fetchFromDSE(symbol, timeframe);
    
    if (data.length > 0) {
      // Filter by timeframe
      const { startDate } = getDateRange(timeframe);
      const filteredData = data.filter(d => new Date(d.date) >= startDate);
      
      if (filteredData.length > 0) {
        historyCache.set(cacheKey, { data: filteredData, fetchedAt: now });
        return { data: filteredData, source: "dse" };
      }
    }
  } catch (error) {
    console.error(`Error fetching from DSE: ${error instanceof Error ? error.message : error}`);
  }
  
  // Fall back to simulated data
  console.log(`Using simulated data for ${symbol}`);
  const fallbackData = generateFallbackData(currentPrice, highPrice, lowPrice, volume, timeframe);
  historyCache.set(cacheKey, { data: fallbackData, fetchedAt: now });
  
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
