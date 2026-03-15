"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Minus, Plus, Star } from "lucide-react";
import {
  Product,
  ProductVariant,
  ProductAddon,
} from "@/store/slices/productSlice";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import toast from "react-hot-toast";

// Localized strings
const strings = {
  ar: {
    selectVariant: "اختر الباقة",
    addons: "إضافات اختيارية",
    quantity: "الكمية",
    addToCart: "أضف للسلة",
    total: "الإجمالي",
    added: "تمت الإضافة للسلة",
    currency: "ر.س",
    default: "الخيار الافتراضي",
    featured: "مميز",
  },
  en: {
    selectVariant: "Select Package",
    addons: "Optional Add-ons",
    quantity: "Quantity",
    addToCart: "Add to Cart",
    total: "Total",
    added: "Added to cart",
    currency: "SAR",
    default: "Default option",
    featured: "Featured",
  },
};

// Get localized text helper
const getLocalizedText = (
  text: { ar: string; en: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

const normalizeCurrency = (currency?: string): "SAR" | "EGP" | "USD" => {
  if (currency === "SAR" || currency === "EGP" || currency === "USD") {
    return currency;
  }
  return "EGP";
};

interface ProductOptionsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  locale,
}: ProductOptionsModalProps) {
  const isRtl = locale === "ar";
  const t = strings[locale as "ar" | "en"] || strings.en;
  const dispatch = useAppDispatch();
  const { selectedCurrency, convert, format } = useCurrencyContext();

  // State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Initialize selected variant when product changes
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      const defaultVariant = product.variants.find((v) => v.isDefault);
      setSelectedVariant(defaultVariant || product.variants[0] || null);
    } else {
      setSelectedVariant(null);
    }
    setSelectedAddons([]);
    setQuantity(1);
  }, [product]);

  if (!product) return null;

  const productCurrency = normalizeCurrency(product.currency);
  const formatPrice = (amount: number) =>
    format(
      convert(amount, productCurrency, selectedCurrency),
      selectedCurrency,
      isRtl ? "ar" : "en"
    );

  // Calculate price
  const basePrice = selectedVariant?.price ?? product.basePrice;
  const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = (basePrice + addonsPrice) * quantity;

  // Handle addon toggle
  const toggleAddon = (addon: ProductAddon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  // Handle add to cart
  const handleAddToCart = () => {
    dispatch(
      addToCart({
        product,
        variant: selectedVariant || undefined,
        addons: selectedAddons,
        quantity,
      })
    );
    toast.success(t.added);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[95vw] max-w-lg max-h-[90vh] overflow-hidden p-0 sm:w-full"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Visually hidden title for screen reader accessibility */}
        <DialogTitle className="sr-only">
          {getLocalizedText(product.name, locale)}
        </DialogTitle>

        <div className="max-h-[90vh] overflow-y-auto">
          {/* Header with Image */}
          <div className="relative">
            <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
              {product.coverImage ? (
                <img
                  src={product.coverImage}
                  alt={getLocalizedText(product.name, locale)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {product.isFeatured && (
                <Badge className="bg-amber-500 hover:bg-amber-600 shadow-lg">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {t.featured}
                </Badge>
              )}
              {product.compareAtPrice &&
                product.compareAtPrice > product.basePrice && (
                  <Badge className="bg-red-500 hover:bg-red-600 shadow-lg">
                    {isRtl
                      ? `خصم ${Math.round(
                          ((product.compareAtPrice - product.basePrice) /
                            product.compareAtPrice) *
                            100
                        )}%`
                      : `${Math.round(
                          ((product.compareAtPrice - product.basePrice) /
                            product.compareAtPrice) *
                            100
                        )}% OFF`}
                  </Badge>
                )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Product Info */}
            <div>
              {product.category && (
                <p className="text-sm text-primary font-medium mb-1">
                  {getLocalizedText(product.category.name, locale)}
                </p>
              )}
              <h3 className="font-bold text-xl text-gray-900">
                {getLocalizedText(product.name, locale)}
              </h3>
              {product.shortDescription && (
                <p className="text-sm text-muted-foreground mt-2">
                  {getLocalizedText(product.shortDescription, locale)}
                </p>
              )}
            </div>

            <Separator />

            {/* Variants Selection */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                  {t.selectVariant}
                </h4>
                <RadioGroup
                  value={
                    selectedVariant?.id || (selectedVariant as any)?._id || ""
                  }
                  onValueChange={(value) => {
                    const variant = product.variants?.find(
                      (v) => v.id === value || (v as any)._id === value
                    );
                    setSelectedVariant(variant || null);
                  }}
                  className="space-y-2"
                >
                  {product.variants.map((variant, index) => {
                    const variantId =
                      variant.id || (variant as any)._id || `variant-${index}`;
                    const isSelected =
                      selectedVariant?.id === variantId ||
                      (selectedVariant as any)?._id === variantId;
                    return (
                      <label
                        key={variantId}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={variantId} />
                          <div>
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {getLocalizedText(variant.name, locale)}
                            </p>
                            {variant.isDefault && (
                              <span className="text-xs text-primary">
                                {t.default}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={isRtl ? "text-left" : "text-right"}>
                          <p className="font-bold text-primary text-sm sm:text-base">
                            {formatPrice(Number(variant.price || 0))}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>
            )}

            {/* Addons Selection */}
            {product.addons && product.addons.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                  {t.addons}
                </h4>
                <div className="space-y-2">
                  {product.addons.map((addon, index) => {
                    const addonId =
                      addon.id || (addon as any)._id || `addon-${index}`;
                    const isSelected = selectedAddons.some(
                      (a) => a.id === addonId || (a as any)._id === addonId
                    );
                    return (
                      <div
                        key={addonId}
                        onClick={() => toggleAddon(addon)}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <p className="font-medium text-gray-900 text-sm sm:text-base">
                            {getLocalizedText(addon.name, locale)}
                          </p>
                        </div>
                        <p className="font-bold text-green-600 text-sm sm:text-base">
                          +{formatPrice(Number(addon.price || 0))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                {t.quantity}
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold text-lg">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-3 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Total & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-500">{t.total}</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatPrice(totalPrice)}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleAddToCart}
                className="w-full sm:w-auto px-6 sm:px-8 gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                {t.addToCart}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
