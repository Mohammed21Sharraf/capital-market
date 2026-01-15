import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInfo {
  name: string;
  sector: string;
  category: string;
}

interface RawStockData {
  symbol: string;
  name: string;
  sector: string;
  category: string;
  ltp: number;
  high: number;
  low: number;
  closep: number;
  ycp: number;
  rawChange: number;
  trade: number;
  valueMn: number;
  volume: number;
}

interface StockData {
  symbol: string;
  name: string;
  sector: string;
  category: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  closep: number;
  ycp: number;
  trade: number;
  valueMn: number;
}

type Cached<T> = { data: T; fetchedAt: number };

const CACHE_TTL_MS = 60_000; // 1 minute
const COMPANY_CACHE_TTL_MS = 10 * 60_000; // 10 minutes

let cachedCompanies: Cached<Record<string, CompanyInfo>> | null = null;
let cachedMarket: Cached<{ rawStocks: RawStockData[]; timestampText?: string }> | null = null;

function stripCommas(s: string) {
  return s.replace(/,/g, "").trim();
}

function decodeHtmlEntities(input: string) {
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
  if (!cleaned || cleaned === "--") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntNumber(text: string): number {
  const cleaned = stripCommas(text);
  if (!cleaned || cleaned === "--") return 0;
  const n = Number.parseInt(cleaned, 10);
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

// Parse company listing page to extract symbol, name, sector, and category
async function getCompanyInfoMap(): Promise<Record<string, CompanyInfo>> {
  const now = Date.now();
  if (cachedCompanies && now - cachedCompanies.fetchedAt < COMPANY_CACHE_TTL_MS) {
    return cachedCompanies.data;
  }

  const html = await fetchHtml("https://www.dsebd.org/company_listing.php");
  const map: Record<string, CompanyInfo> = {};

  // Parse table rows to extract company info with sector and category
  // Table structure: Serial, Trading Code, Company Name, Category, Sector
  const tableMatch = html.match(/<table[^>]*class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  
  if (tableMatch) {
    for (const table of tableMatch) {
      const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      
      for (const row of rows) {
        // Skip header rows
        if (row.includes("<th")) continue;
        
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length < 5) continue;
        
        const extractCellText = (cell: string) => {
          return decodeHtmlEntities(cell.replace(/<[^>]+>/g, "").trim());
        };
        
        // Extract trading code from link
        const codeMatch = row.match(/displayCompany\.php\?name=([^"&]+)[^>]*>([^<]*)</i);
        if (!codeMatch) continue;
        
        const symbol = decodeHtmlEntities(codeMatch[2] || codeMatch[1] || "").trim();
        if (!symbol) continue;
        
        const cellTexts = cells.map(extractCellText);
        
        // Column indices: 0=Serial, 1=Trading Code, 2=Company Name, 3=Category, 4=Sector
        const name = cellTexts[2] || symbol;
        const category = cellTexts[3] || "";
        const sector = cellTexts[4] || "";
        
        map[symbol] = {
          name,
          sector,
          category,
        };
      }
    }
  }

  // Fallback: use the old regex pattern if table parsing didn't work
  if (Object.keys(map).length === 0) {
    const re = /<a\s+href="https:\/\/www\.dsebd\.org\/displayCompany\.php\?name=([^"]+)"[^>]*>\s*([^<]+)\s*<\/a>\s*<span[^>]*>\s*\(([^)]+)\)\s*<br\s*\/?\s*>\s*<\/span>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const code = decodeHtmlEntities(m[2] || "");
      const fullName = decodeHtmlEntities(m[3] || "");
      if (code) {
        map[code] = {
          name: fullName || code,
          sector: "",
          category: "",
        };
      }
    }
  }

  console.log(`Parsed ${Object.keys(map).length} companies from listing page`);
  cachedCompanies = { data: map, fetchedAt: now };
  return map;
}

function extractTimestampTextFromMarketPage(html: string): string | undefined {
  const m = html.match(/<h2[^>]*class="BodyHead topBodyHead"[^>]*>([\s\S]*?)<\/h2>/i);
  if (!m) return undefined;
  const raw = m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return decodeHtmlEntities(raw);
}

function parseMarketStocks(html: string, companyInfo: Record<string, CompanyInfo>): RawStockData[] {
  const rows: RawStockData[] = [];

  const trBlocks = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const tr of trBlocks) {
    if (!tr.includes("displayCompany.php?name=")) continue;

    const codeMatch = tr.match(/displayCompany\.php\?name=([^"&]+)[^>]*>([^<]*)</i);
    if (!codeMatch) continue;

    const symbol = decodeHtmlEntities(codeMatch[2] || codeMatch[1] || "").trim();
    if (!symbol) continue;

    const tdMatches = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const tdTexts = tdMatches.map((x) =>
      decodeHtmlEntities(x[1].replace(/<[^>]+>/g, "").trim())
    );

    if (tdTexts.length < 11) continue;

    const firstCell = tdTexts[0].toLowerCase();
    if (firstCell.includes("#") || firstCell.includes("sl") || firstCell.includes("trading")) continue;

    const ltp = parseNumber(tdTexts[2]);
    const high = parseNumber(tdTexts[3]);
    const low = parseNumber(tdTexts[4]);
    const closep = parseNumber(tdTexts[5]);
    const ycp = parseNumber(tdTexts[6]);
    const rawChange = parseNumber(tdTexts[7]);
    const trade = parseIntNumber(tdTexts[8]);
    const valueMn = parseNumber(tdTexts[9]);
    const volume = parseIntNumber(tdTexts[10]);

    if (ltp === 0 && high === 0 && low === 0) continue;

    const info = companyInfo[symbol];
    
    rows.push({
      symbol,
      name: info?.name || symbol,
      sector: info?.sector || "",
      category: info?.category || "",
      ltp,
      high,
      low,
      closep,
      ycp,
      rawChange,
      trade,
      valueMn,
      volume,
    });
  }

  return rows;
}

function computeStockData(raw: RawStockData, marketOpen: boolean): StockData {
  const basePrice = marketOpen ? raw.ltp : raw.closep;
  const change = basePrice - raw.ycp;
  const changePercent = raw.ycp !== 0 ? (change / raw.ycp) * 100 : 0;

  return {
    symbol: raw.symbol,
    name: raw.name,
    sector: raw.sector,
    category: raw.category,
    ltp: raw.ltp,
    change: Math.round(change * 100) / 100,
    changePercent: Number.isFinite(changePercent) ? Math.round(changePercent * 100) / 100 : 0,
    volume: raw.volume,
    high: raw.high,
    low: raw.low,
    closep: raw.closep,
    ycp: raw.ycp,
    trade: raw.trade,
    valueMn: raw.valueMn,
  };
}

function isMarketOpen(): boolean {
  const now = new Date();
  const bdTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const day = bdTime.getDay();
  const hours = bdTime.getHours();
  const minutes = bdTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const isTradeDay = day >= 0 && day <= 4;
  const isTradeHours = currentMinutes >= 600 && currentMinutes <= 870;

  return isTradeDay && isTradeHours;
}

async function getRawMarketSnapshot(): Promise<{ rawStocks: RawStockData[]; timestampText?: string }> {
  const now = Date.now();
  if (cachedMarket && now - cachedMarket.fetchedAt < CACHE_TTL_MS) {
    return cachedMarket.data;
  }

  const [companyInfo, marketHtml] = await Promise.all([
    getCompanyInfoMap(),
    fetchHtml("https://www.dsebd.org/latest_share_price_scroll_by_ltp.php"),
  ]);

  const timestampText = extractTimestampTextFromMarketPage(marketHtml);
  const rawStocks = parseMarketStocks(marketHtml, companyInfo);

  if (rawStocks.length === 0) {
    throw new Error("Failed to parse market data from dsebd.org");
  }

  const data = { rawStocks, timestampText };
  cachedMarket = { data, fetchedAt: now };
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    let stockCode = url.searchParams.get("code") || undefined;
    if (!stockCode && req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body.code === "string") stockCode = body.code;
      } catch {
        // ignore body parse errors
      }
    }

    console.log(`Market data request - code: ${stockCode || "all"}`);

    const { rawStocks, timestampText } = await getRawMarketSnapshot();
    const marketOpen = isMarketOpen();

    const stocks = rawStocks.map((raw) => computeStockData(raw, marketOpen));

    if (stockCode) {
      const stock = stocks.find((s) => s.symbol.toUpperCase() === stockCode!.toUpperCase());
      if (!stock) {
        return new Response(JSON.stringify({ error: "Stock not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          data: stock,
          marketOpen,
          timestamp: new Date().toISOString(),
          sourceTimestampText: timestampText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sortedStocks = [...stocks].sort((a, b) => a.symbol.localeCompare(b.symbol));

    return new Response(
      JSON.stringify({
        data: sortedStocks,
        marketOpen,
        timestamp: new Date().toISOString(),
        sourceTimestampText: timestampText,
        count: sortedStocks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in market-data function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
