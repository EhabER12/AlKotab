"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/lib/axios";

type CurrencyCode = "SAR" | "EGP" | "USD";

interface ExchangeRates {
  USD: number;
  SAR: number;
  EGP: number;
}

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: { ar: string; en: string };
  flag: string;
  rtl: boolean;
}

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  baseCurrency: CurrencyCode;
  exchangeRates: ExchangeRates;
  convert: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number;
  format: (amount: number, currency?: CurrencyCode, locale?: "ar" | "en") => string;
  getCurrencyConfig: (code: CurrencyCode) => CurrencyConfig;
  isLoading: boolean;
}

const currencyConfigs: Record<CurrencyCode, CurrencyConfig> = {
  SAR: {
    code: "SAR",
    symbol: "ر.س",
    name: { ar: "ريال سعودي", en: "Saudi Riyal" },
    flag: "🇸🇦",
    rtl: true,
  },
  EGP: {
    code: "EGP",
    symbol: "ج.م",
    name: { ar: "جنيه مصري", en: "Egyptian Pound" },
    flag: "🇪🇬",
    rtl: true,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: { ar: "دولار أمريكي", en: "US Dollar" },
    flag: "🇺🇸",
    rtl: false,
  },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyCode>("EGP");
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("EGP");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    SAR: 3.75,
    EGP: 50.0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load currency settings from API
  useEffect(() => {
    const fetchCurrencySettings = async () => {
      try {
        const response = await axiosInstance.get("/settings/public");
        const financeSettings = response.data?.data?.financeSettings;

        if (financeSettings) {
          setBaseCurrency(financeSettings.baseCurrency || "EGP");
          setExchangeRates(financeSettings.exchangeRates || exchangeRates);
        }
      } catch (error) {
        console.error("Failed to load currency settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencySettings();
  }, []);

  // Load user's preferred currency from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("preferredCurrency");
    if (saved && (saved === "SAR" || saved === "EGP" || saved === "USD")) {
      setSelectedCurrencyState(saved as CurrencyCode);
    } else {
      // Site-wide storefront default is EGP unless the user picked another currency.
      setSelectedCurrencyState("EGP");
    }
  }, [baseCurrency]);

  // Save selected currency to localStorage
  const setSelectedCurrency = (currency: CurrencyCode) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem("preferredCurrency", currency);
  };

  // Convert currency
  const convert = (
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode = selectedCurrency
  ): number => {
    if (from === to) return amount;

    // Convert to USD first (base)
    const amountInUSD = amount / exchangeRates[from];
    // Then convert to target currency
    const convertedAmount = amountInUSD * exchangeRates[to];

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  };

  // Format currency
  const format = (
    amount: number,
    currency: CurrencyCode = selectedCurrency,
    locale: "ar" | "en" = "en"
  ): string => {
    const config = currencyConfigs[currency];
    const formattedNumber = amount.toLocaleString(
      locale === "ar" ? "ar-SA" : "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

    if (config.rtl && locale === "ar") {
      return `${formattedNumber} ${config.symbol}`;
    } else {
      return `${config.symbol}${formattedNumber}`;
    }
  };

  const getCurrencyConfig = (code: CurrencyCode): CurrencyConfig => {
    return currencyConfigs[code];
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        baseCurrency,
        exchangeRates,
        convert,
        format,
        getCurrencyConfig,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrencyContext must be used within a CurrencyProvider");
  }
  return context;
}
