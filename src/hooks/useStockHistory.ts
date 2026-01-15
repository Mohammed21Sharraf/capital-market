import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

interface UseStockHistoryParams {
  symbol: string;
  timeframe: Timeframe;
  currentPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export function useStockHistory({
  symbol,
  timeframe,
  currentPrice,
  highPrice,
  lowPrice,
  volume,
}: UseStockHistoryParams) {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!symbol) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke(
        "stock-history",
        {
          body: {
            symbol,
            timeframe,
            currentPrice,
            highPrice,
            lowPrice,
            volume,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (response?.data) {
        setData(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch historical data";
      setError(errorMessage);
      console.error("Historical data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, currentPrice, highPrice, lowPrice, volume]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}
