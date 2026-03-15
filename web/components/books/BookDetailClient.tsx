"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ShoppingBag } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Book } from "@/store/services/bookService";
import toast from "react-hot-toast";

interface BookDetailClientProps {
  book: Book;
  locale: string;
}

const getLocalizedText = (
  text: { ar?: string; en?: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

export function BookDetailClient({ book, locale }: BookDetailClientProps) {
  const isRtl = locale === "ar";
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const { selectedCurrency, convert, format } = useCurrencyContext();
  const [quantity, setQuantity] = useState(1);

  const convertedPrice = useMemo(() => {
    const sourceCurrency =
      book.currency === "USD" || book.currency === "EGP" || book.currency === "SAR"
        ? book.currency
        : "EGP";
    const amount = convert(book.basePrice || 0, sourceCurrency, selectedCurrency);
    return format(amount, selectedCurrency, isRtl ? "ar" : "en");
  }, [book.basePrice, book.currency, convert, format, selectedCurrency, isRtl]);

  const totalPrice = useMemo(() => {
    const sourceCurrency =
      book.currency === "USD" || book.currency === "EGP" || book.currency === "SAR"
        ? book.currency
        : "EGP";
    const amount = convert((book.basePrice || 0) * quantity, sourceCurrency, selectedCurrency);
    return format(amount, selectedCurrency, isRtl ? "ar" : "en");
  }, [book.basePrice, book.currency, quantity, convert, format, selectedCurrency, isRtl]);

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        product: book as any,
        quantity,
      })
    );
    toast.success(t("cart.itemAdded") || "Added to cart");
  };

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-4 text-sm text-muted-foreground">
          <Link href={`/${locale}`} className="hover:text-primary">
            {t("common.home") || "Home"}
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/${locale}/books`} className="hover:text-primary">
            Books
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{getLocalizedText(book.name, locale)}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-gray-100">
            {book.bookCoverPath || book.coverImage ? (
              <img
                src={book.bookCoverPath || book.coverImage}
                alt={getLocalizedText(book.name, locale)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center">
                <BookOpen className="h-20 w-20 text-gray-300" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Badge variant="secondary">Digital Book</Badge>
            <h1 className="text-3xl font-bold text-gray-900">
              {getLocalizedText(book.name, locale)}
            </h1>
            {getLocalizedText(book.author, locale) && (
              <p className="text-sm text-muted-foreground">
                Author: {getLocalizedText(book.author, locale)}
              </p>
            )}
            <p className="text-muted-foreground leading-relaxed">
              {getLocalizedText(book.shortDescription || book.description, locale)}
            </p>

            <div className="rounded-xl border bg-gray-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="text-2xl font-bold text-primary">{convertedPrice}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {t("products.quantity") || "Quantity"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </Button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <Button variant="outline" size="sm" onClick={() => setQuantity((prev) => prev + 1)}>
                  +
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{t("products.total") || "Total"}</span>
                <span className="text-xl font-bold text-primary">{totalPrice}</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleAddToCart}>
                <ShoppingBag className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                {t("products.addToCart") || "Add to Cart"}
              </Button>
            </div>

            <div className="rounded-xl border p-5">
              <h2 className="mb-2 text-lg font-semibold">
                {t("products.description") || "Description"}
              </h2>
              <p className="whitespace-pre-line text-muted-foreground">
                {getLocalizedText(book.description, locale)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


