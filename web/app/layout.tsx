import React from "react";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "../styles/nprogress.css";
import { Providers } from "./providers";
import { LazyAnalytics } from "@/components/analytics/LazyAnalytics";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Zain } from "next/font/google";
import {
  detectCountryCodeFromHeaders,
  isCurrencyCode,
  PREFERRED_CURRENCY_COOKIE,
  PREFERRED_CURRENCY_SOURCE_COOKIE,
  resolveCurrencyFromCountryCode,
  isManualCurrencyPreference,
} from "@/lib/currency";
import { fetchSettings } from "@/lib/settings";

// Arabic font - optimized loading via next/font
const zain = Zain({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "700", "800", "900"],
  display: "swap",
  variable: "--font-zain",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  const data = settings.data || {};

  return {
    title: data?.siteName || "Genoun",
    description: data?.siteDescription || "Your success starts here",
    icons: data?.favicon ? [{ url: data.favicon }] : undefined,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [settings, cookieStore, headerStore] = await Promise.all([
    fetchSettings(),
    cookies(),
    headers(),
  ]);
  const data = settings.data || {};
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "";
  const savedCurrency = cookieStore.get(PREFERRED_CURRENCY_COOKIE)?.value;
  const savedCurrencySource = cookieStore.get(
    PREFERRED_CURRENCY_SOURCE_COOKIE
  )?.value;
  const detectedCountryCode = detectCountryCodeFromHeaders(headerStore);
  const initialCurrency =
    isCurrencyCode(savedCurrency) &&
    isManualCurrencyPreference(savedCurrencySource)
    ? savedCurrency
    : resolveCurrencyFromCountryCode(detectedCountryCode);

  // Await params to get locale (might be undefined if at root)
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || "en";
  const direction = locale === "ar" ? "rtl" : "ltr";

  const primaryColor = data?.theme?.primary || "#1a472a";
  const secondaryColor = data?.theme?.secondary || "#f97316";
  const accentColor = data?.theme?.accent || "#22c55e";
  const backgroundColor = data?.theme?.background || "#ffffff";
  const textColor = data?.theme?.text || "#0f172a";
  const adminPrimaryColor = data?.theme?.adminPrimary || "#1a472a";

  // Generate CSS variables
  const colorVars = `
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
      --background: ${backgroundColor};
      --text: ${textColor};
      --admin-primary: ${adminPrimaryColor};
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      
      /* genoun Brand Colors Mapping */
      --genoun-green: ${primaryColor};
      --genoun-green-dark: ${primaryColor}dd;
      --genoun-green-light: ${primaryColor}33;
      --genoun-gold: ${secondaryColor};
      --genoun-gold-light: ${secondaryColor}dd;
      --genoun-gold-dark: ${secondaryColor}aa;
      
      --font-zain: ${zain.style.fontFamily};
    }
    
    body {
      font-family: var(--font-zain), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  `;

  return (
    <html
      lang={locale}
      dir={direction}
      className={` ${zain.variable} `}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="icon" href={data?.favicon || "/favicon.ico"} sizes="any" />
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: colorVars }} />
      </head>
      <body suppressHydrationWarning>
        <Providers initialCurrency={initialCurrency}>
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `window.__SETTINGS__ = ${JSON.stringify({
                siteName: data?.siteName,
                logo: data?.logo,
                socialLinks: data?.socialLinks,
                contactEmail: data?.contactEmail,
                contactPhone: data?.contactPhone,
                whatsappNumber: data?.whatsappNumber,
                address: data?.address,
                headerDisplay: data?.headerDisplay,
              })}`,
            }}
          />
          {children}
          {data?.floatingWhatsAppEnabled !== false && (
            <FloatingWhatsApp phoneNumber={data?.whatsappNumber || "201022944477"} />
          )}
        </Providers>
        {gaId && <LazyAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
