"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { locales, type Locale } from "@/i18n/request";
import { SITE_LOCALE_COOKIE } from "@/lib/site-locale";

const languageNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

interface LanguageSwitcherProps {
  variant?: "default" | "ghost" | "outline";
  showLabel?: boolean;
}

export function LanguageSwitcher({
  variant = "ghost",
  showLabel = true,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  const switchLocale = (newLocale: Locale) => {
    document.cookie = `${SITE_LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Remove current locale from pathname and add new one
    const segments = pathname.split("/").filter(Boolean);

    // Check if first segment is a locale
    if (locales.includes(segments[0] as Locale)) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }

    const newPath = "/" + segments.join("/");
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={showLabel ? "default" : "icon"}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {showLabel && <span>{languageNames[locale as Locale]}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? "bg-accent" : ""}
          >
            {languageNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
