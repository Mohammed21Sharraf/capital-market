import { useState, useCallback } from "react";
import { StockFundamentals } from "@/types/market";
import { supabase } from "@/integrations/supabase/client";

export function useStockFundamentals() {
  const [fundamentals, setFundamentals] = useState<StockFundamentals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFundamentals = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('stock-fundamentals', {
        body: { symbol },
      });
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      if (data && data.data) {
        setFundamentals(data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch fundamentals";
      setError(errorMessage);
      console.error("Stock fundamentals fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearFundamentals = useCallback(() => {
    setFundamentals(null);
    setError(null);
  }, []);

  return {
    fundamentals,
    isLoading,
    error,
    fetchFundamentals,
    clearFundamentals,
  };
}
