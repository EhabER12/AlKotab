import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales, type Locale } from "@/i18n/request";
import { SITE_LOCALE_COOKIE, isSiteLocale } from "@/lib/site-locale";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const getPathLocale = (pathname: string): Locale | null => {
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }

  return null;
};

const getConfiguredDefaultLocale = async (): Promise<Locale> => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    return defaultLocale;
  }

  try {
    const response = await fetch(`${apiBase}/settings/public`, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return defaultLocale;
    }

    const data = await response.json();
    const configuredLocale = data?.data?.defaultSiteLanguage;

    return isSiteLocale(configuredLocale) ? configuredLocale : defaultLocale;
  } catch {
    return defaultLocale;
  }
};

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = getPathLocale(pathname);

  if (pathLocale) {
    const response = intlMiddleware(request) as NextResponse;

    response.cookies.set(SITE_LOCALE_COOKIE, pathLocale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });

    return response;
  }

  const cookieLocale = request.cookies.get(SITE_LOCALE_COOKIE)?.value;
  const preferredLocale = isSiteLocale(cookieLocale)
    ? cookieLocale
    : await getConfiguredDefaultLocale();

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname =
    pathname === "/" ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|dashboard|.*\\..*).*)",
    "/",
    "/(en|ar)/:path*",
  ],
};
