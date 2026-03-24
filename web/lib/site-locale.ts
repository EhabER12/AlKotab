export const SITE_LOCALE_COOKIE = "preferred-locale";

export type SiteLocale = "ar" | "en";

export const isSiteLocale = (value?: string | null): value is SiteLocale =>
  value === "ar" || value === "en";
