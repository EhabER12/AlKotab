"use client";

import { useState } from "react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, ChevronDown, Check } from "lucide-react";

interface CurrencySwitcherProps {
  locale?: "ar" | "en";
  variant?: "default" | "minimal" | "icon-only";
  className?: string;
}

export function CurrencySwitcher({
  locale = "en",
  variant = "default",
  className = "",
}: CurrencySwitcherProps) {
  const {
    selectedCurrency,
    setSelectedCurrency,
    getCurrencyConfig,
    isLoading,
  } = useCurrencyContext();

  const [open, setOpen] = useState(false);

  const currentConfig = getCurrencyConfig(selectedCurrency);
  const currencies: Array<"SAR" | "EGP" | "USD"> = ["EGP", "SAR", "USD"];

  const handleSelect = (currency: "SAR" | "EGP" | "USD") => {
    setSelectedCurrency(currency);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 w-32 bg-gray-200 rounded-md" />
      </div>
    );
  }

  if (variant === "icon-only") {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label="Switch currency"
          >
            <DollarSign className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
          {currencies.map((currency) => {
            const config = getCurrencyConfig(currency);
            return (
              <DropdownMenuItem
                key={currency}
                onClick={() => handleSelect(currency)}
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.flag}</span>
                  <div>
                    <div className="font-medium">{config.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {config.name[locale]}
                    </div>
                  </div>
                </div>
                {selectedCurrency === currency && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "minimal") {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <span className="mr-2">{currentConfig.flag}</span>
            {currentConfig.code}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
          {currencies.map((currency) => {
            const config = getCurrencyConfig(currency);
            return (
              <DropdownMenuItem
                key={currency}
                onClick={() => handleSelect(currency)}
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>{config.flag}</span>
                  <span>{config.code}</span>
                </div>
                {selectedCurrency === currency && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          <span className="mr-2 text-lg">{currentConfig.flag}</span>
          <div className="flex flex-col items-start mr-2">
            <span className="text-xs text-muted-foreground">
              {locale === "ar" ? "العملة" : "Currency"}
            </span>
            <span className="font-medium">{currentConfig.code}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
        {currencies.map((currency) => {
          const config = getCurrencyConfig(currency);
          return (
            <DropdownMenuItem
              key={currency}
              onClick={() => handleSelect(currency)}
              className="flex items-center justify-between gap-3 cursor-pointer py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.flag}</span>
                <div>
                  <div className="font-medium">{config.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.name[locale]}
                  </div>
                </div>
              </div>
              {selectedCurrency === currency && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
