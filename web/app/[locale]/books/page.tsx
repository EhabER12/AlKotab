"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { bookService, Book } from "@/store/services/bookService";
import axiosInstance from "@/lib/axios";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import toast from "react-hot-toast";

const getLocalizedText = (
  text: { ar?: string; en?: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

const getLocalizedHeroText = (
  text: { ar?: string; en?: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text.trim();

  return text[locale as "ar" | "en"]?.trim() || "";
};

const normalizeCurrency = (currency?: string): "SAR" | "EGP" | "USD" => {
  if (currency === "USD" || currency === "EGP" || currency === "SAR") return currency;
  return "EGP";
};

export default function BooksPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isRtl = locale === "ar";
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const { selectedCurrency, convert, format } = useCurrencyContext();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booksPageHero, setBooksPageHero] = useState<{
    title: { ar: string; en: string };
    subtitle: { ar: string; en: string };
  }>({
    title: { ar: "الكتب", en: "Books" },
    subtitle: {
      ar: "مجموعة منتقاة من الكتب الرقمية الجاهزة للشراء",
      en: "A curated collection of digital books ready for purchase",
    },
  });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const result = await bookService.getBooks({ limit: 100 });
        if (mounted) {
          setBooks(result.items || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Failed to load books");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBooksPageSettings = async () => {
      try {
        const response = await axiosInstance.get("/settings/public", {
          headers: { "X-No-Loading": "1" },
        });
        const settings = response?.data?.data;
        const heroSettings = settings?.booksPageHero;

        if (!mounted || !heroSettings) return;

        setBooksPageHero((prev) => ({
          title: {
            ar: heroSettings.title?.ar || prev.title.ar,
            en: heroSettings.title?.en || prev.title.en,
          },
          subtitle: {
            ar: heroSettings.subtitle?.ar || prev.subtitle.ar,
            en: heroSettings.subtitle?.en || prev.subtitle.en,
          },
        }));
      } catch (settingsError) {
        console.error("Failed to load books page settings:", settingsError);
      }
    };

    loadBooksPageSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const totalBooks = useMemo(() => books.length, [books]);

  const handleAddToCart = (book: Book) => {
    dispatch(
      addToCart({
        product: book as any,
        quantity: 1,
      })
    );
    toast.success(t("cart.itemAdded") || "Added to cart");
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      <section className="bg-gradient-to-br from-primary to-primary/80 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-80" />
          <h1 className="mb-3 text-4xl font-bold">
            {getLocalizedHeroText(booksPageHero.title, locale) || "Books"}
          </h1>
          <p className="text-lg opacity-90">
            {getLocalizedHeroText(booksPageHero.subtitle, locale) ||
              "A curated collection of digital books ready for purchase"}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <p className="mb-6 text-sm text-muted-foreground">
          {totalBooks} Books
        </p>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="rounded-xl border bg-white p-10 text-center">
            <BookOpen className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <h2 className="text-xl font-semibold">No books found</h2>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => {
              const compareAtPrice = Number(book.compareAtPrice || 0);
              const basePrice = Number(book.basePrice || 0);
              const hasDiscount = compareAtPrice > basePrice && compareAtPrice > 0;
              const discountPercent = hasDiscount
                ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
                : 0;

              const converted = format(
                convert(book.basePrice || 0, normalizeCurrency(book.currency), selectedCurrency),
                selectedCurrency,
                isRtl ? "ar" : "en"
              );

              return (
                <div
                  key={book.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg"
                >
                  <Link href={`/${locale}/books/${book.slug}`}>
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {hasDiscount && (
                        <Badge
                          className={`absolute top-3 z-10 bg-red-600 text-white ${
                            isRtl ? "left-3" : "right-3"
                          }`}
                        >
                          {isRtl ? `خصم ${discountPercent}%` : `${discountPercent}% OFF`}
                        </Badge>
                      )}
                      {book.bookCoverPath || book.coverImage ? (
                        <img
                          src={book.bookCoverPath || book.coverImage}
                          alt={getLocalizedText(book.name, locale)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="space-y-3 p-4">
                    <Link href={`/${locale}/books/${book.slug}`}>
                      <h3 className="line-clamp-2 text-lg font-semibold hover:text-primary">
                        {getLocalizedText(book.name, locale)}
                      </h3>
                    </Link>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {getLocalizedText(book.shortDescription, locale)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{converted}</span>
                      <Button size="sm" onClick={() => handleAddToCart(book)}>
                        <ShoppingBag className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                        {t("products.addToCart") || "Add to Cart"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



