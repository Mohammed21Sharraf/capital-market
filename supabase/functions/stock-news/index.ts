import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StockNews {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
}

type CachedNews = { data: StockNews[]; fetchedAt: number };

const CACHE_TTL_MS = 15 * 60_000; // 15 minutes cache for news
const newsCache: Map<string, CachedNews> = new Map();

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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim();
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

async function fetchStockNews(symbol: string): Promise<StockNews[]> {
  const now = Date.now();
  const cached = newsCache.get(symbol.toUpperCase());
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`Cache hit for news: ${symbol}`);
    return cached.data;
  }

  console.log(`Fetching news for: ${symbol}`);
  
  const newsList: StockNews[] = [];
  
  try {
    // Fetch from DSE company page for news/announcements
    const dseUrl = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`;
    const html = await fetchHtml(dseUrl);
    
    // Extract announcements/news from DSE page
    // Look for news sections - typically corporate announcements, AGM notices, etc.
    const newsPatterns = [
      // Pattern for announcement sections
      /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi,
      // Pattern for news items with links
      /<a[^>]*href=["']([^"']*(?:announcement|news)[^"']*)["'][^>]*>([^<]+)<\/a>/gi,
    ];
    
    // Extract from corporate announcements table
    const announcementSection = html.match(/Corporate\s*(?:Declarations|Announcements?)[\s\S]*?<table[\s\S]*?<\/table>/i);
    if (announcementSection) {
      const rows = announcementSection[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      for (const row of rows.slice(0, 10)) { // Limit to 10 news items
        const dateMatch = row.match(/<td[^>]*>(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})<\/td>/i);
        const contentMatch = row.match(/<td[^>]*>([^<]+(?:<[^>]+>[^<]*)*)<\/td>/gi);
        
        if (dateMatch && contentMatch && contentMatch.length >= 2) {
          const dateStr = dateMatch[1];
          const content = contentMatch[1].replace(/<[^>]+>/g, '').trim();
          
          if (content && content.length > 10) {
            newsList.push({
              title: decodeHtmlEntities(content.substring(0, 200)),
              source: "DSE",
              url: dseUrl,
              publishedAt: dateStr,
              summary: content.length > 200 ? decodeHtmlEntities(content.substring(0, 300)) + "..." : undefined,
            });
          }
        }
      }
    }
    
    // Extract from Right Issue/Bonus/Dividend section
    const dividendSection = html.match(/(?:Right\s*Issue|Bonus|Dividend|AGM|EGM)[\s\S]*?<table[\s\S]*?<\/table>/gi);
    if (dividendSection) {
      for (const section of dividendSection.slice(0, 3)) {
        const titleMatch = section.match(/(Right\s*Issue|Bonus|Cash\s*Dividend|Stock\s*Dividend|AGM|EGM)[^<]*/i);
        const dateMatch = section.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
        
        if (titleMatch) {
          const title = decodeHtmlEntities(titleMatch[0].trim());
          newsList.push({
            title: `${symbol}: ${title}`,
            source: "DSE Corporate",
            url: dseUrl,
            publishedAt: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
          });
        }
      }
    }
    
    // Search for price sensitive information
    const psiMatch = html.match(/Price\s*Sensitive\s*Information[\s\S]*?<table[\s\S]*?<\/table>/i);
    if (psiMatch) {
      const psiRows = psiMatch[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      for (const row of psiRows.slice(0, 5)) {
        const dateMatch = row.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
        const contentMatch = row.match(/<td[^>]*>([^<]{20,})<\/td>/i);
        
        if (contentMatch) {
          newsList.push({
            title: decodeHtmlEntities(contentMatch[1].substring(0, 150)),
            source: "DSE PSI",
            url: dseUrl,
            publishedAt: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
          });
        }
      }
    }
    
  } catch (error) {
    console.error(`Error fetching news from DSE for ${symbol}:`, error);
  }
  
  // Try to fetch from a financial news source
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(symbol + " DSE Bangladesh stock news")}&tbm=nws&num=5`;
    // Note: This is a placeholder - in production you'd use a proper news API
    console.log(`Would search: ${searchUrl}`);
  } catch (error) {
    console.error(`Error fetching external news for ${symbol}:`, error);
  }

  // If no news found, add a placeholder
  if (newsList.length === 0) {
    newsList.push({
      title: `No recent news available for ${symbol}`,
      source: "System",
      url: `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`,
      publishedAt: new Date().toLocaleDateString(),
      summary: "Check DSE website for the latest announcements and corporate declarations.",
    });
  }

  // Remove duplicates based on title
  const uniqueNews = newsList.filter((news, index, self) => 
    index === self.findIndex(n => n.title === news.title)
  );

  console.log(`Found ${uniqueNews.length} news items for ${symbol}`);

  // Cache the result
  newsCache.set(symbol.toUpperCase(), { data: uniqueNews, fetchedAt: now });
  
  return uniqueNews;
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

    console.log(`Stock news request - symbol: ${symbol}`);

    const news = await fetchStockNews(symbol);

    return new Response(
      JSON.stringify({
        data: news,
        symbol: symbol.toUpperCase(),
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in stock-news function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
