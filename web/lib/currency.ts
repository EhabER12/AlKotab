export const PREFERRED_CURRENCY_COOKIE = "preferred-currency";
export const PREFERRED_CURRENCY_STORAGE_KEY = "preferredCurrency";
export const PREFERRED_CURRENCY_SOURCE_COOKIE = "preferred-currency-source";
export const PREFERRED_CURRENCY_SOURCE_STORAGE_KEY = "preferredCurrencySource";

export type CurrencyCode = "SAR" | "EGP" | "USD";
export type CurrencyPreferenceSource = "manual";

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

export const isManualCurrencyPreference = (
  value?: string | null
): value is CurrencyPreferenceSource => value === "manual";

const normalizeCountryCode = (value?: string | null): string | null => {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
};

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
    const headerValue = normalizeCountryCode(headerStore.get(headerName));

    if (headerValue) {
      return headerValue;
    }
  }

  return null;
};

const GEO_LOOKUP_ENDPOINTS = [
  {
    buildUrl: (ipAddress?: string) =>
      `https://ipwho.is/${ipAddress ? encodeURIComponent(ipAddress) : ""}`,
    getCountryCode: (data: any) =>
      data?.success === false ? null : data?.country_code,
  },
  {
    buildUrl: (ipAddress?: string) =>
      ipAddress
        ? `https://ipapi.co/${encodeURIComponent(ipAddress)}/json/`
        : "https://ipapi.co/json/",
    getCountryCode: (data: any) => data?.country_code,
  },
] as const;

export const detectCountryCodeFromGeoApis = async (
  ipAddress?: string
): Promise<string | null> => {
  for (const endpoint of GEO_LOOKUP_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(endpoint.buildUrl(ipAddress), {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const countryCode = normalizeCountryCode(endpoint.getCountryCode(data));

      if (countryCode) {
        return countryCode;
      }
    } catch {
      // Fall through to the next provider.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
};
