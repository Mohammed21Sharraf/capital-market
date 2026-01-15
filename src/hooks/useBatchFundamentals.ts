import { useState, useEffect, useCallback } from "react";
import { StockFundamentals } from "@/types/market";
import { supabase } from "@/integrations/supabase/client";

interface FundamentalsCache {
  [symbol: string]: StockFundamentals;
}

export function useBatchFundamentals(symbols: string[]) {
  const [fundamentals, setFundamentals] = useState<FundamentalsCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadedSymbols, setLoadedSymbols] = useState<Set<string>>(new Set());

  const fetchFundamental = useCallback(async (symbol: string) => {
    if (loadedSymbols.has(symbol)) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('stock-fundamentals', {
        body: { symbol },
      });
      
      if (!error && data?.data) {
        setFundamentals(prev => ({
          ...prev,
          [symbol]: data.data,
        }));
        setLoadedSymbols(prev => new Set([...prev, symbol]));
      }
    } catch (err) {
      console.error(`Failed to fetch fundamentals for ${symbol}:`, err);
    }
  }, [loadedSymbols]);

  // Fetch fundamentals for visible/searched stocks on demand
  const fetchForSymbols = useCallback(async (symbolsToFetch: string[]) => {
    const unfetched = symbolsToFetch.filter(s => !loadedSymbols.has(s));
    if (unfetched.length === 0) return;

    setIsLoading(true);
    
    // Fetch in parallel, max 5 at a time
    const chunks = [];
    for (let i = 0; i < unfetched.length; i += 5) {
      chunks.push(unfetched.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(fetchFundamental));
    }

    setIsLoading(false);
  }, [loadedSymbols, fetchFundamental]);

  return {
    fundamentals,
    isLoading,
    fetchForSymbols,
    getFundamental: (symbol: string) => fundamentals[symbol],
  };
}
