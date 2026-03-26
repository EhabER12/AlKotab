export const PREFERRED_CURRENCY_COOKIE = "preferred-currency";
export const PREFERRED_CURRENCY_STORAGE_KEY = "preferredCurrency";

export type CurrencyCode = "SAR" | "EGP" | "USD";

const COUNTRY_HEADER_NAMES = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "fastly-geoip-country-code",
  "x-country-code",
  "x-geo-country",
  "x-appengine-country",
] as const;

export const isCurrencyCode = (
  value?: string | null
): value is CurrencyCode => value === "SAR" || value === "EGP" || value === "USD";

export const resolveCurrencyFromCountryCode = (
  countryCode?: string | null
): CurrencyCode => {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();

  if (normalizedCountryCode === "SA") {
    return "SAR";
  }

  if (normalizedCountryCode === "EG") {
    return "EGP";
  }

  return "USD";
};

export const detectCountryCodeFromHeaders = (headerStore: {
  get: (name: string) => string | null;
}): string | null => {
  for (const headerName of COUNTRY_HEADER_NAMES) {
    const headerValue = headerStore.get(headerName)?.trim().toUpperCase();

    if (headerValue && /^[A-Z]{2}$/.test(headerValue)) {
      return headerValue;
    }
  }

  return null;
};
