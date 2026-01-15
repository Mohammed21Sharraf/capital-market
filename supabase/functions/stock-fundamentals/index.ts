import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StockFundamentals {
  symbol: string;
  marketCap?: number;
  authorizedCap?: number;
  paidUpCap?: number;
  faceValue?: number;
  pe?: number;
  eps?: number;
  nav?: number;
  listingYear?: number;
  yearHigh?: number;
  yearLow?: number;
  lastAGM?: string;
  sector?: string;
  category?: string;
}

type CachedFundamentals = { data: StockFundamentals; fetchedAt: number };

const CACHE_TTL_MS = 5 * 60_000; // 5 minutes cache for fundamentals
const fundamentalsCache: Map<string, CachedFundamentals> = new Map();

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .trim();
}

function parseNumber(text: string): number {
  const cleaned = text.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!cleaned || cleaned === "--" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (LovableCloud; DSE-Market-Tracker) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return await res.text();
}

// Extract 52-week range from "52 Weeks' Moving Range" cell
// Format in HTML: "250.40 - 347.90" or similar
function extract52WeekRange(html: string): { high?: number; low?: number } {
  const result: { high?: number; low?: number } = {};
  
  // Look for "52 Weeks' Moving Range" followed by a range like "250.40 - 347.90"
  const rangePatterns = [
    /52\s*[Ww]eeks['']?\s*[Mm]oving\s*[Rr]ange[^<]*<\/t[hd]>\s*<td[^>]*>\s*([\d,.]+)\s*-\s*([\d,.]+)/i,
    /52\s*[Ww]eeks['']?\s*[Mm]oving\s*[Rr]ange[^|]*\|\s*([\d,.]+)\s*-\s*([\d,.]+)/i,
    />52\s*[Ww]eeks['']?\s*[Mm]oving\s*[Rr]ange<[^>]*>[^<]*<[^>]*>\s*([\d,.]+)\s*-\s*([\d,.]+)/i,
  ];
  
  for (const pattern of rangePatterns) {
    const match = html.match(pattern);
    if (match && match[1] && match[2]) {
      const val1 = parseNumber(match[1]);
      const val2 = parseNumber(match[2]);
      result.low = Math.min(val1, val2);
      result.high = Math.max(val1, val2);
      console.log(`Found 52W range: ${result.low} - ${result.high}`);
      return result;
    }
  }
  
  return result;
}

// Extract P/E ratio from DSE's P/E table
// The table has rows like "Current P/E Ratio using Basic EPS" or "Trailing P/E Ratio"
// and multiple date columns - we want the last (most recent) value
function extractPERatio(html: string): number {
  // Look for P/E ratio rows and extract the last numeric value
  const pePatterns = [
    // Match "Current P/E Ratio using Basic EPS" row and capture all TD values
    /Current\s*P\/E\s*[Rr]atio\s*using\s*Basic\s*EPS[^<]*<\/td>((?:\s*<td[^>]*>[^<]*<\/td>)+)/i,
    /Trailing\s*P\/E\s*[Rr]atio[^<]*<\/td>((?:\s*<td[^>]*>[^<]*<\/td>)+)/i,
    /Current\s*P\/E\s*[Rr]atio[^<]*<\/td>((?:\s*<td[^>]*>[^<]*<\/td>)+)/i,
  ];
  
  for (const pattern of pePatterns) {
    const rowMatch = html.match(pattern);
    if (rowMatch && rowMatch[1]) {
      // Extract all TD values from the row
      const tdValues = rowMatch[1].match(/<td[^>]*>([^<]*)<\/td>/gi);
      if (tdValues && tdValues.length > 0) {
        // Get the last non-empty value
        for (let i = tdValues.length - 1; i >= 0; i--) {
          const valueMatch = tdValues[i].match(/<td[^>]*>([^<]*)<\/td>/i);
          if (valueMatch && valueMatch[1]) {
            const val = parseNumber(valueMatch[1]);
            if (val > 0 && val < 10000) {
              console.log(`Found P/E ratio: ${val}`);
              return val;
            }
          }
        }
      }
    }
  }
  
  // Fallback: simple pattern match
  const simpleMatch = html.match(/P\/E\s*[Rr]atio[^<]*(?:<[^>]+>)+\s*([\d,.]+)/i);
  if (simpleMatch) {
    const val = parseNumber(simpleMatch[1]);
    if (val > 0 && val < 10000) {
      console.log(`Found P/E ratio (fallback): ${val}`);
      return val;
    }
  }
  
  return 0;
}

// Extract EPS and NAV from the Financial Performance table
// The table has yearly rows with EPS in the 5th column and NAV in the 8th column
function extractEPSandNAV(html: string): { eps?: number; nav?: number } {
  const result: { eps?: number; nav?: number } = {};
  
  // Find the Financial Performance table section
  const finPerfSection = html.match(/Financial\s*Performance\s*as\s*per\s*Audited[\s\S]*?(<table[\s\S]*?<\/table>)/i);
  
  if (finPerfSection) {
    const table = finPerfSection[1];
    // Find all data rows (rows with year like 2024, 2023, etc.)
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    
    // Get the most recent year's data (usually last row with numeric year)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      // Check if row starts with a year (2020-2030)
      const yearMatch = row.match(/<td[^>]*>\s*(20[2-3]\d)\s*<\/td>/i);
      if (yearMatch) {
        // Extract all TD values
        const cells = row.match(/<td[^>]*>([^<]*)<\/td>/gi) || [];
        
        // Column indices based on DSE structure:
        // 0=Year, 1-3=Other, 4=EPS, 5-6=Other, 7=NAV
        if (cells.length >= 8) {
          const epsCell = cells[4];
          const navCell = cells[7];
          
          const epsMatch = epsCell?.match(/<td[^>]*>([^<]*)<\/td>/i);
          const navMatch = navCell?.match(/<td[^>]*>([^<]*)<\/td>/i);
          
          if (epsMatch) {
            result.eps = parseNumber(epsMatch[1]);
          }
          if (navMatch) {
            result.nav = parseNumber(navMatch[1]);
          }
          
          if (result.eps || result.nav) {
            console.log(`Found EPS: ${result.eps}, NAV: ${result.nav} for year ${yearMatch[1]}`);
            return result;
          }
        }
      }
    }
  }
  
  // Fallback patterns for EPS
  const epsPatterns = [
    /EPS\s*\([Bb]asic\)[^<]*(?:<[^>]+>)+\s*([\d,.()-]+)/i,
    /[Ee]arning[s]?\s*[Pp]er\s*[Ss]hare[^<]*(?:<[^>]+>)+\s*([\d,.()-]+)/i,
  ];
  
  for (const pattern of epsPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && !result.eps) {
      result.eps = parseNumber(match[1]);
      console.log(`Found EPS (fallback): ${result.eps}`);
      break;
    }
  }
  
  // Fallback patterns for NAV
  const navPatterns = [
    /NAV[^<]*(?:<[^>]+>)+\s*([\d,.()-]+)/i,
    /[Nn]et\s*[Aa]sset\s*[Vv]alue[^<]*(?:<[^>]+>)+\s*([\d,.()-]+)/i,
  ];
  
  for (const pattern of navPatterns) {
    const match = html.match(pattern);
    if (match && match[1] && !result.nav) {
      result.nav = parseNumber(match[1]);
      console.log(`Found NAV (fallback): ${result.nav}`);
      break;
    }
  }
  
  return result;
}

async function fetchStockFundamentals(symbol: string): Promise<StockFundamentals> {
  const now = Date.now();
  const cached = fundamentalsCache.get(symbol.toUpperCase());
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`Cache hit for fundamentals: ${symbol}`);
    return cached.data;
  }

  console.log(`Fetching fundamentals for: ${symbol}`);
  
  const url = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`;
  const html = await fetchHtml(url);

  const fundamentals: StockFundamentals = {
    symbol: symbol.toUpperCase(),
  };

  // Extract sector
  const sectorPatterns = [
    /Sector[:\s]*<\/th>\s*<td[^>]*>([^<]+)</i,
    /Sector[:\s]*<\/td>\s*<td[^>]*>([^<]+)</i,
    />Sector<\/[^>]+>\s*<[^>]+>([^<]+)</i,
  ];
  for (const pattern of sectorPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      fundamentals.sector = decodeHtmlEntities(match[1]);
      break;
    }
  }

  // Extract category
  const categoryPatterns = [
    /(?:Share\s*)?Category[:\s]*<\/th>\s*<td[^>]*>([^<]+)</i,
    /Category[:\s]*<\/td>\s*<td[^>]*>([^<]+)</i,
  ];
  for (const pattern of categoryPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      fundamentals.category = decodeHtmlEntities(match[1]);
      break;
    }
  }

  // Extract Market Capitalization (in Mn)
  const marketCapPatterns = [
    /Market\s*Cap(?:italization)?\s*\(mn\)[^<]*<\/t[hd]>\s*<td[^>]*>\s*([\d,.-]+)/i,
    /Market\s*Cap(?:italization)?[^<]*<\/th>\s*<td[^>]*>\s*([\d,.-]+)/i,
    /Market\s*Cap[^|]*\|\s*([\d,.-]+)/i,
  ];
  for (const pattern of marketCapPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      fundamentals.marketCap = parseNumber(match[1]);
      break;
    }
  }

  // Extract Authorized Capital
  const authCapMatch = html.match(/Authorized\s*Capital[^<]*<\/th>\s*<td[^>]*>\s*([\d,.-]+)/i);
  if (authCapMatch) {
    fundamentals.authorizedCap = parseNumber(authCapMatch[1]);
  }

  // Extract Paid-up Capital
  const paidUpMatch = html.match(/Paid[- ]?up\s*Capital[^<]*<\/th>\s*<td[^>]*>\s*([\d,.-]+)/i);
  if (paidUpMatch) {
    fundamentals.paidUpCap = parseNumber(paidUpMatch[1]);
  }

  // Extract Face Value
  const faceValueMatch = html.match(/Face(?:\/Par)?\s*Value[^<]*<\/th>\s*<td[^>]*>\s*([\d,.-]+)/i);
  if (faceValueMatch) {
    fundamentals.faceValue = parseNumber(faceValueMatch[1]);
  }

  // Extract Listing Year
  const listingMatch = html.match(/Listing\s*Year[^<]*<\/th>\s*<td[^>]*>\s*(\d{4})/i);
  if (listingMatch) {
    fundamentals.listingYear = parseInt(listingMatch[1], 10);
  }

  // Extract P/E ratio
  fundamentals.pe = extractPERatio(html);

  // Extract EPS and NAV
  const epsNav = extractEPSandNAV(html);
  if (epsNav.eps) fundamentals.eps = epsNav.eps;
  if (epsNav.nav) fundamentals.nav = epsNav.nav;

  // Extract 52-week range
  const range = extract52WeekRange(html);
  if (range.high) fundamentals.yearHigh = range.high;
  if (range.low) fundamentals.yearLow = range.low;

  // Extract Last AGM - with validation
  const agmMatch = html.match(/(?:Last\s*)?AGM\s*[Hh]eld\s*[Oo]n[^<]*<\/th>\s*<td[^>]*>([^<]+)</i);
  if (agmMatch && agmMatch[1]) {
    const agmValue = decodeHtmlEntities(agmMatch[1]);
    if (/\d/.test(agmValue) && !agmValue.includes('function') && !agmValue.includes('window')) {
      fundamentals.lastAGM = agmValue;
    }
  }

  console.log(`Parsed fundamentals for ${symbol}:`, JSON.stringify(fundamentals));

  // Cache the result
  fundamentalsCache.set(symbol.toUpperCase(), { data: fundamentals, fetchedAt: now });
  
  return fundamentals;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    let symbol = url.searchParams.get("symbol") || undefined;
    if (!symbol && req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body.symbol === "string") symbol = body.symbol;
      } catch {
        // ignore body parse errors
      }
    }

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Stock fundamentals request - symbol: ${symbol}`);

    const fundamentals = await fetchStockFundamentals(symbol);

    return new Response(
      JSON.stringify({
        data: fundamentals,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in stock-fundamentals function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
