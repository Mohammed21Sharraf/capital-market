import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

export interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  costPrice: number;
  purchaseDate: string;
  notes?: string;
}

// Validation schema
const portfolioItemSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1).max(20),
  quantity: z.number().positive().max(100000000),
  costPrice: z.number().positive().max(100000000),
  purchaseDate: z.string(),
  notes: z.string().max(500).optional(),
});

const STORAGE_KEY = "dse-portfolio";

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate each item
        const validItems = parsed.filter((item: unknown) => {
          try {
            portfolioItemSchema.parse(item);
            return true;
          } catch {
            return false;
          }
        });
        setPortfolio(validItems);
      }
    } catch (error) {
      console.error("Failed to load portfolio:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when portfolio changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    }
  }, [portfolio, isLoaded]);

  const addItem = useCallback((item: Omit<PortfolioItem, "id">) => {
    const newItem: PortfolioItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    // Validate before adding
    try {
      portfolioItemSchema.parse(newItem);
      setPortfolio((prev) => [...prev, newItem]);
      return true;
    } catch (error) {
      console.error("Invalid portfolio item:", error);
      return false;
    }
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<PortfolioItem, "id">>) => {
    setPortfolio((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          try {
            portfolioItemSchema.parse(updated);
            return updated;
          } catch {
            return item;
          }
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getItemsBySymbol = useCallback(
    (symbol: string) => portfolio.filter((item) => item.symbol === symbol),
    [portfolio]
  );

  const getTotalInvestment = useCallback(() => {
    return portfolio.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  }, [portfolio]);

  const clearPortfolio = useCallback(() => {
    setPortfolio([]);
  }, []);

  return {
    portfolio,
    isLoaded,
    addItem,
    updateItem,
    removeItem,
    getItemsBySymbol,
    getTotalInvestment,
    clearPortfolio,
  };
}
