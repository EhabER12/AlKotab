"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Globe } from "lucide-react";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import type { Locale } from "@/i18n/request";
import { cn } from "@/lib/utils";

const languageNames: Record<Locale, string> = {
  en: "English",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
};

interface AdminLanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline";
  showLabel?: boolean;
}

export function AdminLanguageSwitcher({
  variant = "ghost",
  showLabel = true,
}: AdminLanguageSwitcherProps) {
  const { locale, setLocale, isRtl } = useAdminLocale();

  return (
    <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? "default" : "icon"}
          className={cn(
            "gap-2",
            !showLabel &&
              "rounded-xl border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-sm hover:bg-white/20 hover:text-white lg:border-transparent lg:bg-transparent lg:shadow-none lg:backdrop-blur-none"
          )}
        >
          <Globe className="h-4 w-4" />
          {showLabel && <span>{languageNames[locale]}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="z-[80] w-40 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-sm"
      >
        <DropdownMenuItem
          onSelect={() => setLocale("en")}
          className={cn(
            "cursor-pointer justify-between rounded-lg px-3 py-2.5 font-medium",
            locale === "en" && "bg-secondary-blue/10 text-secondary-blue"
          )}
        >
          <span>{languageNames.en}</span>
          {locale === "en" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setLocale("ar")}
          className={cn(
            "cursor-pointer justify-between rounded-lg px-3 py-2.5 font-medium",
            locale === "ar" && "bg-secondary-blue/10 text-secondary-blue"
          )}
        >
          <span>{languageNames.ar}</span>
          {locale === "ar" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
