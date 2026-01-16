import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StockNews } from "@/types/market";

export function useStockNews() {
  const [news, setNews] = useState<StockNews[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (symbol: string) => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("stock-news", {
        body: { symbol },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.data) {
        setNews(data.data);
      } else {
        setNews([]);
      }
    } catch (err) {
      console.error("Error fetching stock news:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch news");
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearNews = useCallback(() => {
    setNews(null);
    setError(null);
  }, []);

  return {
    news,
    isLoading,
    error,
    fetchNews,
    clearNews,
  };
}
