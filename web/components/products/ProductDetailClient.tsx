"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Check,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  Product,
  ProductVariant,
  ProductAddon,
} from "@/store/slices/productSlice";

interface ProductDetailClientProps {
  product: Product;
  locale: string;
}

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

export function ProductDetailClient({
  product,
  locale,
}: ProductDetailClientProps) {
  const isRtl = locale === "ar";
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const { selectedCurrency, convert, format } = useCurrencyContext();

  // State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.length
      ? product.variants.find((v) => v.isDefault) || product.variants[0]
      : null
  );
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const productCurrency = normalizeCurrency(product.currency);

  // Ref for options section
  const optionsSectionRef = useRef<HTMLDivElement>(null);

  // Check if product has options
  const hasOptions =
    (product.variants && product.variants.length > 1) ||
    (product.addons && product.addons.length > 0);

  // Scroll to options
  const scrollToOptions = () => {
    optionsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Toggle addon
  const toggleAddon = (addon: ProductAddon) => {
    const addonId = addon.id || (addon as any)._id;
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addonId || (a as any)._id === addonId)
        ? prev.filter((a) => a.id !== addonId && (a as any)._id !== addonId)
        : [...prev, addon]
    );
  };

  // Calculate total price
  const calculateTotal = () => {
    const basePrice = selectedVariant?.price ?? product.basePrice ?? 0;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    return (basePrice + addonsTotal) * quantity;
  };

  const formatPrice = (amount: number) =>
    format(
      convert(amount, productCurrency, selectedCurrency),
      selectedCurrency,
      isRtl ? "ar" : "en"
    );

  // Add to cart
  const handleAddToCart = () => {
    if (!product) return;

    dispatch(
      addToCart({
        product,
        variant: selectedVariant || undefined,
        addons: selectedAddons,
        quantity,
      })
    );
    toast.success(t("admin.cart.itemAdded"));
  };

  // Gallery images
  const galleryImages = [product.coverImage, ...(product.gallery || [])].filter(
    Boolean
  );

  return (
    <div
      className="min-h-screen bg-white pb-24 lg:pb-0"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/${locale}`}
              className="hover:text-primary transition-colors"
            >
              {t("common.home") || "Home"}
            </Link>
            <span>/</span>
            <Link
              href={`/${locale}/products`}
              className="hover:text-primary transition-colors"
            >
              {t("products.title") || "Products"}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {getLocalizedText(product.name, locale)}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[currentImageIndex]}
                  alt={getLocalizedText(product.name, locale)}
                  className="w-full h-full object-cover"
                  fetchPriority={currentImageIndex === 0 ? "high" : "auto"}
                  loading={currentImageIndex === 0 ? "eager" : "lazy"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-24 w-24 text-gray-300" />
                </div>
              )}

              {/* Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? galleryImages.length - 1 : prev - 1
                      )
                    }
                  >
                    {isRtl ? (
                      <ChevronRight className="h-5 w-5" />
                    ) : (
                      <ChevronLeft className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg"
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === galleryImages.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    {isRtl ? (
                      <ChevronLeft className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                </>
              )}

              {/* Featured Badge */}
              {product.isFeatured && (
                <Badge className="absolute top-4 left-4 bg-amber-500">
                  {t("products.featured") || "Featured"}
                </Badge>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {galleryImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.category && (
              <Link
                href={`/${locale}/products?category=${product.category.id}`}
                className="text-sm text-primary hover:underline"
              >
                {getLocalizedText(product.category.name, locale)}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900">
              {getLocalizedText(product.name, locale)}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(selectedVariant?.price ?? product.basePrice ?? 0)}
              </span>
              {product.compareAtPrice &&
                product.compareAtPrice > product.basePrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
            </div>

            {/* Short Description */}
            <p className="text-gray-600 leading-relaxed">
              {getLocalizedText(product.shortDescription, locale)}
            </p>

            {/* Separator before options - only show if there are options */}
            {hasOptions && <Separator />}

            {/* Options Section - for scroll target */}
            <div ref={optionsSectionRef}>
              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-lg">
                    {t("products.selectVariant") || "Select Package"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.variants.map((variant, index) => {
                      const variantId =
                        variant.id ||
                        (variant as any)._id ||
                        `variant-${index}`;
                      const isSelected =
                        selectedVariant?.id === variantId ||
                        (selectedVariant as any)?._id === variantId;
                      return (
                        <button
                          key={variantId}
                          onClick={() => setSelectedVariant(variant)}
                          className={`p-4 rounded-xl border-2 text-${
                            isRtl ? "right" : "left"
                          } transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {getLocalizedText(variant.name, locale)}
                            </span>
                            {isSelected && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <span className="text-sm text-primary font-semibold">
                            {formatPrice(Number(variant.price || 0))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Addons */}
              {product.addons && product.addons.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">
                    {t("products.addons") || "Add-ons"}
                  </h3>
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
                          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <span className="font-medium">
                              {getLocalizedText(addon.name, locale)}
                            </span>
                          </div>
                          <span className="text-primary font-semibold">
                            +{formatPrice(Number(addon.price || 0))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <h3 className="font-semibold">
                {t("products.quantity") || "Quantity"}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold text-lg">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Total & Add to Cart */}
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">
                  {t("products.total") || "Total"}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={handleAddToCart}
              >
                <ShoppingBag className={`h-5 w-5 ${isRtl ? "ml-2" : "mr-2"}`} />
                {t("products.addToCart") || "Add to Cart"}
              </Button>
            </div>

            <Separator />

            {/* Full Description */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">
                {t("products.description") || "Description"}
              </h3>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 whitespace-pre-line">
                  {getLocalizedText(product.description, locale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl lg:hidden z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Price Info */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {t("products.total") || "Total"}
              </p>
              <p className="text-xl font-bold text-primary">
                {formatPrice(calculateTotal())}
              </p>
            </div>

            {/* Choose Options / Add to Cart Button */}
            {hasOptions ? (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={scrollToOptions}
                  className="gap-2 px-3 sm:px-4 text-xs sm:text-base h-10 sm:h-auto"
                >
                  <ChevronUp className="h-4 w-4" />
                  {isRtl ? "الخيارات" : "Options"}
                </Button>
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className="gap-2 px-4 sm:px-6 h-10 sm:h-auto text-xs sm:text-base"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isRtl ? "أضف" : "Add"}
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleAddToCart}
                className="gap-2 px-8"
              >
                <ShoppingBag className="h-5 w-5" />
                {t("products.addToCart") || "Add to Cart"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
