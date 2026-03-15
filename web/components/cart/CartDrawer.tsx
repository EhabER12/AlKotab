"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  initializeCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  closeCart,
  getCartItemCount,
  CartItem,
} from "@/store/slices/cartSlice";
import { useTranslations, useLocale } from "next-intl";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

// Get localized text helper
const getLocalizedText = (
  text: { ar: string; en: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

const getCartItemName = (item: CartItem, locale: string): string => {
  if (item.itemType === "course") {
    return getLocalizedText(item.course?.title, locale);
  }
  return getLocalizedText(item.product?.name, locale);
};

const getCartItemImage = (item: CartItem): string | undefined => {
  if (item.itemType === "course") return item.course?.thumbnail;
  return item.product?.coverImage;
};

const getCartItemCurrency = (item: CartItem): string => {
  if (item.itemType === "course") return item.course?.currency || "EGP";
  return item.product?.currency || "EGP";
};

type CurrencyCode = "SAR" | "EGP" | "USD";

const normalizeCurrency = (currency?: string): CurrencyCode => {
  if (currency === "EGP" || currency === "USD" || currency === "SAR") {
    return currency;
  }
  return "EGP";
};

const getCartItemUnitPrice = (item: CartItem): number => {
  if (item.itemType === "course") return Number(item.course?.price || 0);
  return (
    (item.variant?.price ?? item.product?.basePrice ?? 0) +
    item.addons.reduce((sum, addon) => sum + addon.price, 0)
  );
};

const getCartItemLineTotal = (item: CartItem): number => {
  return getCartItemUnitPrice(item) * item.quantity;
};

export function CartDrawer() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("cart");
  const { selectedCurrency, convert, format } = useCurrencyContext();

  const dispatch = useAppDispatch();
  const { items, isOpen } = useAppSelector((state) => state.cart);

  // Initialize cart from localStorage
  useEffect(() => {
    dispatch(initializeCart());
  }, [dispatch]);

  const itemCount = getCartItemCount(items);
  const displayLocale = isRtl ? "ar" : "en";
  const displayTotal = items.reduce((sum, item) => {
    const sourceCurrency = normalizeCurrency(getCartItemCurrency(item));
    return sum + convert(getCartItemLineTotal(item), sourceCurrency, selectedCurrency);
  }, 0);

  return (
    <Sheet open={isOpen} onOpenChange={() => dispatch(closeCart())}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        className="w-full sm:max-w-md flex flex-col"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("title")}
            <span className="text-sm font-normal text-muted-foreground">
              ({itemCount} {t("itemsInCart")})
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t("empty")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("emptyMessage")}
              </p>
              <Link href={`/${locale}/products`}>
                <Button onClick={() => dispatch(closeCart())}>
                  {t("continueShopping")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item: CartItem, index: number) => (
                <div
                  key={index}
                  className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {getCartItemImage(item) ? (
                      <img
                        src={getCartItemImage(item)}
                        alt={getCartItemName(item, locale)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {getCartItemName(item, locale)}
                    </h4>

                    {item.itemType === "course" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRtl ? "دورة" : "Course"}
                      </p>
                    )}

                    {/* Variant */}
                    {item.itemType === "product" && item.variant && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("variant")}:{" "}
                        {getLocalizedText(item.variant.name, locale)}
                      </p>
                    )}

                    {/* Addons */}
                    {item.itemType === "product" && item.addons.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("addons")}:{" "}
                        {item.addons
                          .map((a) => getLocalizedText(a.name, locale))
                          .join(", ")}
                      </p>
                    )}

                    {/* Price */}
                    <p className="text-sm font-semibold text-primary mt-1">
                      {format(
                        convert(
                          getCartItemUnitPrice(item),
                          normalizeCurrency(getCartItemCurrency(item)),
                          selectedCurrency
                        ),
                        selectedCurrency,
                        displayLocale
                      )}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          dispatch(
                            updateQuantity({
                              index,
                              quantity: item.quantity - 1,
                            })
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          dispatch(
                            updateQuantity({
                              index,
                              quantity: item.quantity + 1,
                            })
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                        onClick={() => dispatch(removeFromCart(index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {/* Clear Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full"
              onClick={() => dispatch(clearCart())}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("clearCart")}
            </Button>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>{t("total")}</span>
              <span className="text-primary">
                {format(displayTotal, selectedCurrency, displayLocale)}
              </span>
            </div>

            {/* Checkout Button */}
            <Link href={`/${locale}/checkout`} className="block">
              <Button
                className="w-full"
                size="lg"
                onClick={() => dispatch(closeCart())}
              >
                {t("checkout")}
              </Button>
            </Link>

            {/* Continue Shopping */}
            <Link href={`/${locale}/products`} className="block">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => dispatch(closeCart())}
              >
                {t("continueShopping")}
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
