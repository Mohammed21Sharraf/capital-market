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
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function formatDate(dateStr: string): string {
  // Try to parse various date formats and return a consistent format
  try {
    // Handle formats like "16-Jan-2026", "16/01/2026", etc.
    const months: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    // Try DD-MMM-YYYY format
    const dmy = dateStr.match(/(\d{1,2})[-\/](\w{3})[-\/](\d{2,4})/i);
    if (dmy) {
      const day = parseInt(dmy[1]);
      const month = months[dmy[2].toLowerCase()];
      let year = parseInt(dmy[3]);
      if (year < 100) year += 2000;
      
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    // Try DD/MM/YYYY format
    const dmyNum = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (dmyNum) {
      const day = parseInt(dmyNum[1]);
      const month = parseInt(dmyNum[2]) - 1;
      let year = parseInt(dmyNum[3]);
      if (year < 100) year += 2000;
      
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    return dateStr;
  } catch {
    return dateStr;
  }
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
  const newsArchiveUrl = "https://www.dsebd.org/news_archive.php";
  
  try {
    // Fetch from DSE news archive page
    const html = await fetchHtml(newsArchiveUrl);
    
    // Parse news items from the archive
    // The DSE news archive typically has news in table format
    const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    
    if (tableMatches) {
      for (const table of tableMatches) {
        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        
        for (const row of rows) {
          // Check if this row contains news for the requested symbol
          const symbolRegex = new RegExp(`\\b${symbol.toUpperCase()}\\b`, 'i');
          if (!symbolRegex.test(row)) continue;
          
          // Extract all cell contents
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          
          let date = "";
          let newsContent = "";
          
          for (const cell of cells) {
            const cellText = decodeHtmlEntities(cell);
            
            // Check if this is a date cell
            const dateMatch = cellText.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
            if (dateMatch && !date) {
              date = formatDate(dateMatch[1]);
              continue;
            }
            
            // If cell has substantial content, it's likely the news
            if (cellText.length > 30 && !dateMatch) {
              newsContent = cellText;
            }
          }
          
          if (newsContent) {
            // Create a title from the first part of the content
            let title = symbol.toUpperCase();
            
            // Check if content mentions specific topics for subtitle
            if (newsContent.toLowerCase().includes('q1') || newsContent.toLowerCase().includes('q2') || 
                newsContent.toLowerCase().includes('q3') || newsContent.toLowerCase().includes('q4')) {
              const quarterMatch = newsContent.match(/Q[1-4]/i);
              if (quarterMatch) {
                title = `${symbol.toUpperCase()} - ${quarterMatch[0].toUpperCase()}`;
              }
            } else if (newsContent.toLowerCase().includes('dividend')) {
              title = `${symbol.toUpperCase()} - Dividend`;
            } else if (newsContent.toLowerCase().includes('agm')) {
              title = `${symbol.toUpperCase()} - AGM`;
            } else if (newsContent.toLowerCase().includes('bonus')) {
              title = `${symbol.toUpperCase()} - Bonus`;
            } else if (newsContent.toLowerCase().includes('right')) {
              title = `${symbol.toUpperCase()} - Right Share`;
            } else if (newsContent.toLowerCase().includes('continuation') || newsContent.toLowerCase().includes('cont.')) {
              title = `${symbol.toUpperCase()} (Continuation)`;
            }
            
            newsList.push({
              title: title,
              source: "DSE News Archive",
              url: newsArchiveUrl,
              publishedAt: date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
              summary: newsContent,
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`Error fetching news from DSE archive for ${symbol}:`, error);
  }
  
  // Also fetch from company-specific page for corporate announcements
  try {
    const companyUrl = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`;
    const companyHtml = await fetchHtml(companyUrl);
    
    // Look for news/announcement sections
    const sections = companyHtml.match(/(?:News|Declaration|Announcement|Price\s*Sensitive)[\s\S]*?<table[\s\S]*?<\/table>/gi) || [];
    
    for (const section of sections.slice(0, 2)) {
      const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      for (const row of rows.slice(0, 10)) {
        // Skip header rows
        if (/<th/i.test(row)) continue;
        
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        
        let date = "";
        let content = "";
        
        for (const cell of cells) {
          const cellText = decodeHtmlEntities(cell);
          
          const dateMatch = cellText.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
          if (dateMatch && !date) {
            date = formatDate(dateMatch[1]);
            continue;
          }
          
          if (cellText.length > 20 && !dateMatch) {
            content = cellText;
          }
        }
        
        if (content && !newsList.some(n => n.summary === content)) {
          let title = symbol.toUpperCase();
          
          if (content.toLowerCase().includes('q1') || content.toLowerCase().includes('q2') || 
              content.toLowerCase().includes('q3') || content.toLowerCase().includes('q4')) {
            const quarterMatch = content.match(/Q[1-4]/i);
            if (quarterMatch) {
              title = `${symbol.toUpperCase()} - ${quarterMatch[0].toUpperCase()}`;
            }
          } else if (content.toLowerCase().includes('dividend')) {
            title = `${symbol.toUpperCase()} - Dividend`;
          } else if (content.toLowerCase().includes('agm')) {
            title = `${symbol.toUpperCase()} - AGM`;
          }
          
          newsList.push({
            title: title,
            source: "DSE Corporate",
            url: companyUrl,
            publishedAt: date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            summary: content,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching company news for ${symbol}:`, error);
  }

  // If no news found, add a message
  if (newsList.length === 0) {
    newsList.push({
      title: symbol.toUpperCase(),
      source: "System",
      url: newsArchiveUrl,
      publishedAt: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      summary: `No recent news available for ${symbol}. Please check DSE website for the latest announcements.`,
    });
  }

  // Remove duplicates based on summary content and sort by date
  const uniqueNews = newsList
    .filter((news, index, self) => 
      index === self.findIndex(n => n.summary === news.summary)
    )
    .slice(0, 20); // Limit to 20 news items

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
