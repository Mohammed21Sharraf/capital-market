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
  const newsArchiveUrl = "https://www.dsebd.org/news_archive.php";
  
  try {
    // Fetch from DSE news archive page
    const html = await fetchHtml(newsArchiveUrl);
    
    // Parse news items from the archive - look for rows containing the symbol
    // The news archive has a table structure with date, company, and news content
    const tableMatch = html.match(/<table[^>]*class[^>]*>[\s\S]*?<\/table>/gi);
    
    if (tableMatch) {
      for (const table of tableMatch) {
        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        
        for (const row of rows) {
          // Check if this row contains news for the requested symbol
          const symbolRegex = new RegExp(`\\b${symbol}\\b`, 'i');
          if (!symbolRegex.test(row)) continue;
          
          // Extract date - usually in first column
          const dateMatch = row.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
          
          // Extract news link and title
          const linkMatch = row.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
          
          // Extract text content from cells
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          let newsContent = "";
          
          for (const cell of cells) {
            const cellText = cell.replace(/<[^>]+>/g, '').trim();
            if (cellText.length > 20 && !cellText.match(/^\d{1,2}[-\/]/)) {
              newsContent = cellText;
              break;
            }
          }
          
          if (newsContent || linkMatch) {
            const title = linkMatch ? decodeHtmlEntities(linkMatch[2]) : decodeHtmlEntities(newsContent.substring(0, 200));
            const url = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://www.dsebd.org/${linkMatch[1]}`) : newsArchiveUrl;
            
            newsList.push({
              title: title,
              source: "DSE News",
              url: url,
              publishedAt: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
              summary: newsContent.length > 200 ? decodeHtmlEntities(newsContent.substring(0, 300)) + "..." : undefined,
            });
          }
        }
      }
    }
    
    // Also try to find news in div-based structures
    const newsItems = html.match(/<div[^>]*class[^>]*news[^>]*>[\s\S]*?<\/div>/gi) || [];
    for (const item of newsItems) {
      const symbolRegex = new RegExp(`\\b${symbol}\\b`, 'i');
      if (!symbolRegex.test(item)) continue;
      
      const linkMatch = item.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
      const dateMatch = item.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
      
      if (linkMatch) {
        const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://www.dsebd.org/${linkMatch[1]}`;
        newsList.push({
          title: decodeHtmlEntities(linkMatch[2]),
          source: "DSE News",
          url: url,
          publishedAt: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
        });
      }
    }
    
  } catch (error) {
    console.error(`Error fetching news from DSE archive for ${symbol}:`, error);
  }
  
  // Also fetch from company-specific page for corporate announcements
  try {
    const companyUrl = `https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(symbol)}`;
    const companyHtml = await fetchHtml(companyUrl);
    
    // Look for corporate declarations/announcements section
    const announcementSection = companyHtml.match(/(?:Corporate|Declaration|Announcement|AGM|Dividend|Bonus)[\s\S]*?<table[\s\S]*?<\/table>/gi);
    
    if (announcementSection) {
      for (const section of announcementSection.slice(0, 2)) {
        const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        
        for (const row of rows.slice(0, 5)) {
          const dateMatch = row.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
          const linkMatch = row.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          
          let content = "";
          for (const cell of cells) {
            const cellText = cell.replace(/<[^>]+>/g, '').trim();
            if (cellText.length > 15) {
              content = cellText;
              break;
            }
          }
          
          if (content || linkMatch) {
            const title = linkMatch ? decodeHtmlEntities(linkMatch[2]) : decodeHtmlEntities(content.substring(0, 150));
            const url = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://www.dsebd.org/${linkMatch[1]}`) : companyUrl;
            
            // Avoid duplicates
            if (!newsList.some(n => n.title === title)) {
              newsList.push({
                title: `${symbol}: ${title}`,
                source: "DSE Corporate",
                url: url,
                publishedAt: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching company news for ${symbol}:`, error);
  }

  // If no news found, add a placeholder with correct link
  if (newsList.length === 0) {
    newsList.push({
      title: `No recent news available for ${symbol}`,
      source: "System",
      url: newsArchiveUrl,
      publishedAt: new Date().toLocaleDateString(),
      summary: "Check DSE News Archive for the latest announcements.",
    });
  }

  // Remove duplicates based on title
  const uniqueNews = newsList.filter((news, index, self) => 
    index === self.findIndex(n => n.title === news.title)
  ).slice(0, 15); // Limit to 15 news items

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
