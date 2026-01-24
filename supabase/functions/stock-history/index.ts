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
        "referer": "https://www.dsebd.org/",
        "origin": "https://www.dsebd.org",
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

// Parse historical data from DSE pages (both displayCompany.php and archive pages)
function parseHistoricalData(html: string, symbol: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  
  // Find all table rows
  const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  console.log(`Found ${allRows.length} total rows in HTML`);
  
  let debugSampleLogged = false;
  
  for (const tr of allRows) {
    // Skip header rows
    if (/<th[\s>]/i.test(tr)) continue;
    
    const tdMatches = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const tdTexts = tdMatches.map((x: RegExpMatchArray) => decodeHtmlEntities(x[1].replace(/<[^>]+>/g, "").trim()));
    
    // Need enough columns for price data
    if (tdTexts.length < 6) continue;
    
    // Look for a date pattern in any of the first 3 columns
    let dateIdx = -1;
    let dateStr = "";
    
    for (let i = 0; i < Math.min(3, tdTexts.length); i++) {
      // Match various date formats: DD-Mon-YY, DD-Mon-YYYY, DD/MM/YYYY
      if (/\d{1,2}[-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\/]\d{2,4}/i.test(tdTexts[i]) ||
          /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(tdTexts[i])) {
        dateIdx = i;
        dateStr = tdTexts[i];
        break;
      }
    }
    
    if (dateIdx < 0 || !dateStr) continue;
    
    // Skip header/label rows
    if (dateStr.toLowerCase().includes("date") || 
        dateStr.toLowerCase().includes("total") ||
        dateStr.toLowerCase().includes("trading")) continue;
    
    // Log first date row for debugging
    if (!debugSampleLogged) {
      console.log(`Date row sample (${tdTexts.length} cols): ${JSON.stringify(tdTexts.slice(0, 12))}`);
      debugSampleLogged = true;
    }
    
    // Parse date
    let parsedDate: Date | null = null;
    
    // Try DD-Mon-YY format
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
        parsedDate = new Date(year, month, day);
      }
    }
    
    // Try DD/MM/YYYY format
    if (!parsedDate) {
      const numMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
      if (numMatch) {
        const day = parseInt(numMatch[1]);
        const month = parseInt(numMatch[2]) - 1;
        let year = parseInt(numMatch[3]);
        if (year < 100) year += 2000;
        if (month >= 0 && month <= 11 && !isNaN(day) && !isNaN(year)) {
          parsedDate = new Date(year, month, day);
        }
      }
    }
    
    if (!parsedDate || isNaN(parsedDate.getTime())) continue;
    
    // Remaining columns after date
    const remainingCols = tdTexts.slice(dateIdx + 1);
    
    if (remainingCols.length < 5) continue;
    
    // Try to find price columns - look for patterns:
    // Format 1: TRADING_CODE, LTP, HIGH, LOW, OPENP, CLOSEP, YCP, TRADE, VALUE, VOLUME
    // Format 2: TRADE, VALUE(mn), VOLUME, HIGH, LOW, CLOSEP, YCP
    
    let high = 0, low = 0, close = 0, open = 0, volume = 0;
    
    // Check if first remaining column is a trading code (string)
    const firstCol = remainingCols[0];
    const isFirstColCode = /^[A-Z]+$/i.test(firstCol);
    
    if (isFirstColCode) {
      // Format: CODE, LTP, HIGH, LOW, OPENP, CLOSEP, YCP, TRADE, VALUE, VOLUME
      const ltp = parseNumber(remainingCols[1]);
      high = parseNumber(remainingCols[2]);
      low = parseNumber(remainingCols[3]);
      open = parseNumber(remainingCols[4]);
      close = parseNumber(remainingCols[5]) || ltp;
      const ycp = parseNumber(remainingCols[6]);
      volume = remainingCols.length > 9 ? parseIntNumber(remainingCols[9]) : 0;
      if (open === 0) open = ycp > 0 ? ycp : close;
    } else {
      // Format: TRADE, VALUE(mn), VOLUME, HIGH, LOW, CLOSEP, YCP
      // Or other numeric-first formats
      const nums = remainingCols.map(parseNumber);
      
      // Find likely price columns (values between 1 and 10000)
      const priceRange = nums.filter(n => n > 0.1 && n < 50000);
      
      if (priceRange.length >= 3) {
        // Try to identify high, low, close from position
        if (remainingCols.length >= 7) {
          // Assume: TRADE(0), VALUE(1), VOLUME(2), HIGH(3), LOW(4), CLOSEP(5), YCP(6)
          high = parseNumber(remainingCols[3]);
          low = parseNumber(remainingCols[4]);
          close = parseNumber(remainingCols[5]);
          const ycp = parseNumber(remainingCols[6]);
          volume = parseIntNumber(remainingCols[2]);
          open = ycp > 0 ? ycp : close;
        } else {
          // Fallback: assume HIGH, LOW, CLOSE are the last three valid prices
          high = priceRange[0];
          low = priceRange[1];
          close = priceRange[2];
          open = close;
        }
      }
    }
    
    // Validate that we have reasonable price data
    if (close > 0 && high > 0 && low > 0) {
      // Sanity check: high >= close >= low (with some tolerance for bad data)
      const validPrices = high >= low * 0.9;
      
      if (validPrices) {
        data.push({
          date: parsedDate.toISOString(),
          open: open || close,
          high: Math.max(high, close, open || close),
          low: Math.min(low, close, open || close),
          close,
          volume,
        });
      }
    }
  }
  
  // Sort by date ascending
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log(`Parsed ${data.length} historical data points for ${symbol}`);
  
  if (data.length > 0) {
    console.log(`First entry: ${JSON.stringify(data[0])}`);
    console.log(`Last entry: ${JSON.stringify(data[data.length - 1])}`);
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
  
  // Try displayCompany.php first (has some historical data for some stocks)
  try {
    const companyUrl = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`;
    console.log(`Trying displayCompany.php for ${symbol}`);
    
    const html = await fetchWithRetry(companyUrl, {}, 2, 1000);
    const data = parseHistoricalData(html, symbol);
    
    if (data.length > 0) {
      console.log(`Got ${data.length} data points from displayCompany.php`);
      return data;
    }
  } catch (error) {
    console.warn(`displayCompany.php failed: ${error instanceof Error ? error.message : error}`);
  }
  
  // Try close_price_archive.php with GET first to get the form, then POST
  try {
    const archiveUrl = `https://www.dsebd.org/close_price_archive.php`;
    console.log(`Trying close_price_archive.php for ${symbol}`);
    
    // First, GET the page to establish session
    await fetchWithRetry(archiveUrl, {}, 1, 500);
    
    // Then POST with form data
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
      },
    }, 2, 1000);
    
    const data = parseHistoricalData(html, symbol);
    
    if (data.length > 0) {
      console.log(`Got ${data.length} data points from close_price_archive.php`);
      return data;
    }
  } catch (error) {
    console.warn(`close_price_archive.php failed: ${error instanceof Error ? error.message : error}`);
  }
  
  // Try data_archive.php for day-wise data
  try {
    const day = endDate.getDate();
    const month = endDate.getMonth() + 1;
    const year = endDate.getFullYear();
    
    const dayArchiveUrl = `https://www.dsebd.org/data_archive.php?view_archive=Archive&day=${day}&month=${month}&year=${year}`;
    console.log(`Trying data_archive.php for ${symbol}`);
    
    const html = await fetchWithRetry(dayArchiveUrl, {}, 2, 1000);
    const data = parseHistoricalData(html, symbol);
    
    // Filter by symbol if we got general market data
    const symbolData = data.filter(d => d.close > 0);
    
    if (symbolData.length > 0) {
      console.log(`Got ${symbolData.length} data points from data_archive.php`);
      return symbolData;
    }
  } catch (error) {
    console.warn(`data_archive.php failed: ${error instanceof Error ? error.message : error}`);
  }
  
  console.log(`All DSE sources failed for ${symbol}`);
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
