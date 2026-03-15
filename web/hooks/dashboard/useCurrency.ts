import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axios";
import { useAdminLocale } from "./useAdminLocale";

export interface CurrencySettings {
  baseCurrency: "SAR" | "EGP" | "USD";
  exchangeRates: Record<string, number>;
  lastRatesUpdate: string;
}

export const useCurrency = () => {
  const { isRtl } = useAdminLocale();
  const [settings, setSettings] = useState<CurrencySettings>({
    baseCurrency: "EGP",
    exchangeRates: {
      USD: 1,
      SAR: 3.75,
      EGP: 50.0,
    },
    lastRatesUpdate: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await axiosInstance.get("/finance/settings");
      if (res.data.data) {
        setSettings(res.data.data);
      }
    } catch (error: any) {
      // If 403 (Forbidden), user doesn't have access to finance settings
      // This is expected for non-admin users (teachers, moderators)
      // Just use default settings
      if (error.response?.status === 403) {
        console.log("Using default currency settings (no finance access)");
      } else {
        console.error("Failed to load currency settings", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const convertCost = (
    amount: number,
    fromCurrency: string,
    toCurrency: string = settings.baseCurrency
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    const rates = settings.exchangeRates;
    // Convert to USD first
    const amountInUSD = amount / (rates[fromCurrency] || 1);
    // Then to target
    return amountInUSD * (rates[toCurrency] || 1);
  };

  const formatMoney = (
    amount: number,
    currency: string = settings.baseCurrency
  ): string => {
    return new Intl.NumberFormat(isRtl ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Convert any amount to the base currency for display
  const toBaseCurrency = (amount: number, fromCurrency: string): number => {
    return convertCost(amount, fromCurrency, settings.baseCurrency);
  };

  return {
    ...settings,
    isLoading,
    convertCost,
    formatMoney,
    toBaseCurrency,
    refetchSettings: fetchSettings,
  };
};
