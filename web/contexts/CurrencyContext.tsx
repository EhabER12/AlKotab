"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/lib/axios";
import {
  detectCountryCodeFromGeoApis,
  isCurrencyCode,
  isManualCurrencyPreference,
  PREFERRED_CURRENCY_COOKIE,
  PREFERRED_CURRENCY_SOURCE_COOKIE,
  PREFERRED_CURRENCY_STORAGE_KEY,
  PREFERRED_CURRENCY_SOURCE_STORAGE_KEY,
  resolveCurrencyFromCountryCode,
  type CurrencyCode,
} from "@/lib/currency";

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

const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function CurrencyProvider({
  children,
  initialCurrency,
}: {
  children: ReactNode;
  initialCurrency: CurrencyCode;
}) {
  const [selectedCurrency, setSelectedCurrencyState] =
    useState<CurrencyCode>(initialCurrency);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("EGP");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    SAR: 3.75,
    EGP: 50.0,
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(true);

  const persistManualCurrencyPreference = (currency: CurrencyCode) => {
    localStorage.setItem(PREFERRED_CURRENCY_STORAGE_KEY, currency);
    localStorage.setItem(PREFERRED_CURRENCY_SOURCE_STORAGE_KEY, "manual");
    document.cookie = `${PREFERRED_CURRENCY_COOKIE}=${currency}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${PREFERRED_CURRENCY_SOURCE_COOKIE}=manual; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
  };

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
        setIsSettingsLoading(false);
      }
    };

    fetchCurrencySettings();
  }, []);

  // Load user's preferred currency if it was explicitly chosen by the user.
  useEffect(() => {
    let isCancelled = false;

    const loadCurrencyPreference = async () => {
      const savedCurrency = localStorage.getItem(PREFERRED_CURRENCY_STORAGE_KEY);
      const savedSource = localStorage.getItem(
        PREFERRED_CURRENCY_SOURCE_STORAGE_KEY
      );

      if (
        isCurrencyCode(savedCurrency) &&
        isManualCurrencyPreference(savedSource)
      ) {
        setSelectedCurrencyState(savedCurrency);
        persistManualCurrencyPreference(savedCurrency);
        if (!isCancelled) {
          setIsCurrencyLoading(false);
        }
        return;
      }

      setSelectedCurrencyState(initialCurrency);

      try {
        const detectedCountryCode = await detectCountryCodeFromGeoApis();
        const detectedCurrency = resolveCurrencyFromCountryCode(
          detectedCountryCode
        );

        if (!isCancelled) {
          setSelectedCurrencyState(detectedCurrency);
        }
      } catch {
        if (!isCancelled) {
          setSelectedCurrencyState(initialCurrency);
        }
      } finally {
        if (!isCancelled) {
          setIsCurrencyLoading(false);
        }
      }
    };

    void loadCurrencyPreference();

    return () => {
      isCancelled = true;
    };
  }, [initialCurrency]);

  // Save selected currency to localStorage
  const setSelectedCurrency = (currency: CurrencyCode) => {
    setSelectedCurrencyState(currency);
    persistManualCurrencyPreference(currency);
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
        isLoading: isSettingsLoading || isCurrencyLoading,
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
