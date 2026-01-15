import { useState, useEffect, useCallback } from "react";

const ALERTS_KEY = "dse-price-alerts";

export interface PriceAlert {
  id: string;
  symbol: string;
  type: "above" | "below";
  targetPrice: number;
  createdAt: string;
  triggered: boolean;
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(ALERTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever alerts change
  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = useCallback((symbol: string, type: "above" | "below", targetPrice: number) => {
    const newAlert: PriceAlert = {
      id: `${symbol}-${type}-${targetPrice}-${Date.now()}`,
      symbol,
      type,
      targetPrice,
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    setAlerts((prev) => [...prev, newAlert]);
    return newAlert;
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const triggerAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, triggered: true } : a))
    );
  }, []);

  const getAlertsForSymbol = useCallback(
    (symbol: string) => alerts.filter((a) => a.symbol === symbol),
    [alerts]
  );

  const checkAlerts = useCallback(
    (symbol: string, currentPrice: number) => {
      const symbolAlerts = alerts.filter((a) => a.symbol === symbol && !a.triggered);
      const triggeredAlerts: PriceAlert[] = [];

      symbolAlerts.forEach((alert) => {
        if (
          (alert.type === "above" && currentPrice >= alert.targetPrice) ||
          (alert.type === "below" && currentPrice <= alert.targetPrice)
        ) {
          triggeredAlerts.push(alert);
          triggerAlert(alert.id);
        }
      });

      return triggeredAlerts;
    },
    [alerts, triggerAlert]
  );

  const clearTriggeredAlerts = useCallback((symbol?: string) => {
    setAlerts((prev) =>
      prev.filter((a) => !a.triggered || (symbol && a.symbol !== symbol))
    );
  }, []);

  return {
    alerts,
    addAlert,
    removeAlert,
    triggerAlert,
    getAlertsForSymbol,
    checkAlerts,
    clearTriggeredAlerts,
  };
}
