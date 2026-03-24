"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Sparkles,
  Globe,
  ChevronDown,
  ShoppingBag,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { CartButton } from "@/components/cart";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { logout } from "@/store/services/authService";
import { PublicWebsiteSettingsData } from "@/store/services/settingsService";
import MarketingBanner from "./MarketingBanner";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { SITE_LOCALE_COOKIE } from "@/lib/site-locale";

interface HeaderProps {
  settings?: PublicWebsiteSettingsData | null;
}

const translations = {
  ar: {
    home: "الرئيسية",
    services: "خدماتنا",
    products: "المنتجات",
    books: "الكتب",
    courses: "الدورات",
    portfolio: "أعمالنا",
    articles: "المقالات",
    reviews: "آراء طلابنا",
    cta: "ابدأ الآن",
    menu: "القائمة",
    new: "جديد",
    account: "حسابي",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    dashboard: "لوحة التحكم",
  },
  en: {
    home: "Home",
    services: "Services",
    products: "Products",
    books: "Books",
    courses: "Courses",
    portfolio: "Portfolio",
    articles: "Articles",
    reviews: "Student Reviews",
    cta: "Get Started",
    menu: "Menu",
    new: "New",
    account: "My Account",
    login: "Login",
    logout: "Logout",
    dashboard: "Dashboard",
  },
};

export default function Header({ settings }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayUser = isMounted ? user : null;

  useEffect(() => {
    if (pathname.startsWith("/en")) {
      setLocale("en");
    } else {
      setLocale("ar");
    }
  }, [pathname]);

  const isRtl = locale === "ar";
  const t = translations[locale];

  const showLogo = settings?.headerDisplay?.showLogo ?? true;
  const showTitle = settings?.headerDisplay?.showTitle ?? true;
  const logoWidth = settings?.headerDisplay?.logoWidth ?? 44;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const switchLocale = (newLocale: "ar" | "en") => {
    document.cookie = `${SITE_LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "en" || segments[0] === "ar") {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    window.location.href = "/" + segments.join("/");
  };

  const getLocalizedHref = (href: string) => {
    if (href.startsWith("#")) return href;
    if (href === "/") return `/${locale}`;
    return `/${locale}${href}`;
  };

  const isReviewsNavLink = (href: string) => {
    if (!href) return false;
    const normalized = href
      .trim()
      .replace(/^\/(ar|en)(?=\/)/, "")
      .replace(/\/+$/, "");
    return (
      normalized === "/reviews" ||
      normalized.startsWith("/reviews?") ||
      normalized.startsWith("/reviews#")
    );
  };

  const mapReviewsToSectionHref = (href: string) =>
    isReviewsNavLink(href) ? "/#reviews" : href;

  const handleLogout = () => {
    dispatch(logout());
    setIsMobileMenuOpen(false);
    router.push(getLocalizedHref("/login"));
  };

  // Default nav items for Quran memorization platform
  const defaultNavItems = [
    { label: t.home, href: "/", anchor: false },
    { label: t.courses, href: "/courses", anchor: false, special: true },
    { label: t.books, href: "/books", anchor: false },
    { label: t.reviews, href: "/#reviews", anchor: false },
    {
      label: isRtl ? "من نحن" : "About Us",
      href: "/pages/about-us",
      anchor: false,
    },
  ];

  // Dynamic nav items from settings if available
  const navItems = settings?.navbarLinks?.length
    ? settings.navbarLinks
      .filter((link) => link.isEnabled)
      .sort((a, b) => a.order - b.order)
      .map((link) => {
        const rawUrl = link.url || "";
        const href = mapReviewsToSectionHref(rawUrl);

        return {
          label: isReviewsNavLink(rawUrl) ? t.reviews : (isRtl ? link.title.ar : link.title.en),
          href,
          anchor: href.startsWith("#"),
          special: rawUrl.includes("courses"), // Highlight courses as special
        };
      })
    : defaultNavItems;

  return (
    <header
      className="fixed top-0 z-50 w-full transition-all duration-500 flex flex-col bg-white/95 backdrop-blur-sm"
      suppressHydrationWarning
    >
      {settings && <MarketingBanner settings={settings} />}

      {/* Desktop Header */}
      <div className="hidden lg:flex container h-20 items-center justify-between px-4 md:px-6" suppressHydrationWarning>
        {/* Logo */}
        <Link
          href={getLocalizedHref("/")}
          className="flex items-center gap-3 group"
        >
          {showLogo && (
            <>
              {settings?.logo ? (
                <div
                  className="relative flex-shrink-0 overflow-hidden"
                  style={{ width: `${logoWidth}px`, height: `${logoWidth}px` }}
                >
                  <Image
                    src={
                      isRtl && settings.logo_ar
                        ? settings.logo_ar
                        : settings.logo
                    }
                    alt={
                      (isRtl ? settings.siteName_ar : settings.siteName) ||
                      "Genoun"
                    }
                    fill
                    sizes={`${logoWidth}px`}
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <></>
              )}
            </>
          )}
          {showTitle && (
            <span className="text-2xl font-bold text-gray-900">
              {(isRtl ? settings?.siteName_ar : settings?.siteName) ||
                settings?.siteName ||
                "Genoun"}
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.anchor ? item.href : getLocalizedHref(item.href)}
              className={
                item.special
                  ? "relative flex items-center gap-1.5 px-4 py-2 text-[15px] font-bold rounded-full transition-all duration-300 bg-gradient-to-r from-[#FB9903] to-[#D98102] text-white hover:shadow-lg hover:shadow-[#FB9903]/30 hover:-translate-y-0.5"
                  : "px-4 py-2 text-[15px] font-medium rounded-full transition-all duration-300 text-gray-700 hover:text-genoun-green hover:bg-genoun-green/5"
              }
            >
              {item.special && <ShoppingBag className="w-4 h-4" />}
              {item.label}
              {item.special && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-white text-[#FB9903] rounded-full shadow-sm">
                  {t.new}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side: Language + Currency + Cart + Account */}
        <div className="flex items-center gap-4" suppressHydrationWarning>
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 border border-transparent hover:border-gray-200">
                <Globe className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" />
                <span className="uppercase tracking-wide text-xs">
                  {locale}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10px]">
              <DropdownMenuItem
                onClick={() => switchLocale("en")}
                className={
                  locale === "en"
                    ? "bg-genoun-green/10 text-genoun-green font-medium"
                    : ""
                }
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => switchLocale("ar")}
                className={`mt-1 ${locale === "ar"
                    ? "bg-genoun-green/10 text-genoun-green font-medium"
                    : ""
                  }`}
              >
                العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Currency Switcher */}
          <CurrencySwitcher locale={locale} variant="minimal" />

          <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

          {/* Cart Button */}
          <CartButton />

          {/* Account Button */}
          <div suppressHydrationWarning>
            {!isMounted ? (
              // Skeleton placeholder while checking auth state - prevents flickering
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            ) : displayUser ? (
              <DropdownMenu dir={locale === "ar" ? "rtl" : "ltr"}>
                <DropdownMenuTrigger asChild>
                  <button className="relative group p-0.5 rounded-full ring-2 ring-transparent transition-all duration-300 hover:ring-primary/20 focus:outline-none">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:shadow-md transition-shadow">
                      <AvatarImage
                        src={displayUser.profilePic}
                        alt={displayUser.name || "User"}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white font-medium">
                        {(displayUser.name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px] p-2">
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-sm font-medium leading-none text-gray-900">
                      {displayUser.name}
                    </p>
                    <p className="text-xs leading-none text-gray-500 mt-1 truncate">
                      {displayUser.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={getLocalizedHref("/account")}
                      className="flex items-center gap-2 cursor-pointer w-full p-2 my-0.5 rounded-md hover:bg-gray-100"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{t.account}</span>
                    </Link>
                  </DropdownMenuItem>
                  {(displayUser.role === "admin" ||
                    displayUser.role === "moderator") && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 cursor-pointer w-full p-2 my-0.5 rounded-md hover:bg-gray-100"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-500" />
                          <span>{t.dashboard}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer w-full text-red-600 focus:text-red-700 focus:bg-red-50 p-2 my-0.5 rounded-md"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.logout}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href={getLocalizedHref("/login")}>
                <Button className="rounded-full bg-gradient-to-r from-[#FB9903] to-[#D98102] text-white hover:shadow-lg hover:shadow-[#FB9903]/30 hover:-translate-y-0.5 transition-all duration-300 font-bold px-6">
                  {t.login}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden w-full px-4 h-16 flex items-center justify-between">
        {/* Mobile Logo */}
        <Link href={getLocalizedHref("/")} className="block relative">
          <div className="relative h-10 w-32 overflow-hidden flex items-center">
            {settings?.logo || (isRtl && settings?.logo_ar) ? (
              <Image
                src={
                  (isRtl && settings?.logo_ar
                    ? settings.logo_ar
                    : settings?.logo) || ""
                }
                alt="Logo"
                fill
                className={`object-contain ${isRtl ? "origin-right" : "origin-left"
                  }`}
                sizes="128px"
              />
            ) : (
              <span className="text-lg font-bold">
                {isRtl ? settings?.siteName_ar : settings?.siteName}
              </span>
            )}
          </div>
        </Link>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2">
          <CartButton />

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 hover:bg-black/5"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isRtl ? "left" : "right"}
              className="w-full sm:w-80 bg-gradient-to-b from-genoun-green to-genoun-green-dark border-none p-0 flex flex-col h-full"
            >
              <nav
                className="flex flex-col gap-2 p-6 pt-16 overflow-y-auto flex-1 scrollbar-hide"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                  {t.menu}
                </p>
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.anchor ? item.href : getLocalizedHref(item.href)}
                    className={
                      item.special
                        ? "flex items-center gap-2 px-4 py-3 font-bold rounded-xl bg-gradient-to-r from-[#FB9903] to-[#D98102] text-white transition-colors shadow-lg"
                        : "flex items-center px-4 py-3 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.special && <ShoppingBag className="w-5 h-5" />}
                    {item.label}
                    {item.special && (
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-white text-[#FB9903] rounded-full">
                        {t.new}
                      </span>
                    )}
                  </Link>
                ))}

                <div className="my-2 border-t border-white/10" />

                {/* Account Links Mobile */}
                {!isMounted ? (
                  // Skeleton placeholder for mobile while checking auth state
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="h-5 w-5 rounded-full bg-white/20 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-white/20 animate-pulse" />
                  </div>
                ) : displayUser ? (
                  <>
                    <Link
                      href={getLocalizedHref("/account")}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span>{t.account}</span>
                    </Link>

                    {(displayUser.role === "admin" ||
                      displayUser.role === "moderator") && (
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span>{t.dashboard}</span>
                        </Link>
                      )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-3 text-red-300 font-medium rounded-xl hover:bg-white/10 transition-colors w-full text-start"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>{t.logout}</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href={getLocalizedHref("/login")}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{t.login}</span>
                  </Link>
                )}

                {/* Language Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      switchLocale("en");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${locale === "en"
                        ? "bg-white text-genoun-green"
                        : "bg-white/10 text-white"
                      }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      switchLocale("ar");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${locale === "ar"
                        ? "bg-white text-genoun-green"
                        : "bg-white/10 text-white"
                      }`}
                  >
                    العربية
                  </button>
                </div>

                {/* Currency Switcher Mobile */}
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                    {locale === "ar" ? "العملة" : "Currency"}
                  </p>
                  <CurrencySwitcher locale={locale} variant="default" className="w-full" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
