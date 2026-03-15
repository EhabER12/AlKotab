"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ShoppingBag, ArrowUpRight, Sparkles } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/slices/cartSlice";
import { ProductOptionsModal } from "@/components/products/ProductOptionsModal";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

gsap.registerPlugin(ScrollTrigger);

// Types
interface BilingualText {
  ar: string;
  en: string;
}

interface Category {
  id: string;
  _id?: string;
  name: BilingualText;
}

interface Product {
  id: string;
  _id?: string;
  name: BilingualText;
  shortDescription?: BilingualText;
  slug: string;
  categoryId: string | { _id: string; name: BilingualText };
  category?: Category;
  coverImage: string;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  variants?: any[];
  addons?: any[];
  isFeatured?: boolean;
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

interface ProductsSectionProps {
  locale: string;
  products?: Product[];
  categories?: Category[];
}

export function ProductsSection({
  locale,
  products = [],
  categories = [],
}: ProductsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isRtl = locale === "ar";
  const dispatch = useAppDispatch();
  const t = useTranslations("landing.products");
  const { selectedCurrency, convert, format } = useCurrencyContext();

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // GSAP animations
  useGSAP(() => {
    if (!sectionRef.current) return;

    gsap.set(".product-card", { opacity: 1, y: 0 });

    gsap.fromTo(
      ".product-card",
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      }
    );

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }, [products, activeCategory]);

  const handleAddToCart = (product: Product) => {
    const hasOptions =
      (product.variants && product.variants.length > 1) ||
      (product.addons && product.addons.length > 0);

    if (hasOptions) {
      setSelectedProduct(product);
      setIsModalOpen(true);
    } else {
      const defaultVariant = product.variants?.find((v: any) => v.isDefault);
      dispatch(
        addToCart({
          product: product as any,
          variant: defaultVariant,
          addons: [],
          quantity: 1,
        })
      );
      toast.success(t("itemAdded"));
    }
  };

  // Get category ID helper
  const getCategoryId = (product: Product): string => {
    if (typeof product.categoryId === "string") return product.categoryId;
    if (product.categoryId && product.categoryId._id)
      return product.categoryId._id;
    if (product.category)
      return product.category.id || product.category._id || "";
    return "";
  };

  // Filter products by category and limit to 8
  const filteredProducts =
    activeCategory === "all"
      ? products.slice(0, 8)
      : products.filter((p) => getCategoryId(p) === activeCategory).slice(0, 8);

  const formatPrice = (amount: number, currency?: string) =>
    format(
      convert(amount, normalizeCurrency(currency), selectedCurrency),
      selectedCurrency,
      isRtl ? "ar" : "en"
    );

  // Don't render if no products
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="products"
      dir={isRtl ? "rtl" : "ltr"}
      className="py-20 sm:py-28 relative overflow-hidden bg-white"
    >
      {/* Background decorations */}
      <div className="absolute top-20 right-0 w-72 h-72 bg-gradient-to-br from-[#FB9903]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-gradient-to-br from-[#04524B]/10 to-transparent rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FB9903]/20 to-[#FB9903]/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#FB9903]" />
            <span className="text-sm font-semibold text-[#FB9903]">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t("title")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FB9903] to-[#D98102]">
              {t("titleHighlight")}
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                activeCategory === "all"
                  ? "bg-[#04524B] text-white shadow-lg shadow-[#04524B]/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("all")}
            </button>
            {categories.map((cat) => {
              const catId = cat.id || cat._id || "";
              return (
                <button
                  key={catId}
                  onClick={() => setActiveCategory(catId)}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                    activeCategory === catId
                      ? "bg-[#04524B] text-white shadow-lg shadow-[#04524B]/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {getLocalizedText(cat.name, locale)}
                </button>
              );
            })}
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const productId = product.id || product._id || "";
            const hasDiscount =
              product.compareAtPrice &&
              product.compareAtPrice > product.basePrice;
            const discountPercent = hasDiscount
              ? Math.round(
                  ((product.compareAtPrice! - product.basePrice) /
                    product.compareAtPrice!) *
                    100
                )
              : 0;

            return (
              <div
                key={productId}
                className="product-card group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* Product Image - Reduced height */}
                <Link href={`/${locale}/products/${product.slug || productId}`}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                    {product.coverImage ? (
                      <img
                        src={product.coverImage}
                        alt={getLocalizedText(product.name, locale)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 text-gray-300" />
                      </div>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        {isRtl ? `خصم ${discountPercent}%` : `${discountPercent}% OFF`}
                      </div>
                    )}

                    {/* Featured Badge */}
                    {product.isFeatured && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                        {t("featured")}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="flex-1 flex flex-col p-4">
                  {/* Category */}
                  {product.category && (
                    <p className="text-xs text-primary font-medium mb-1">
                      {getLocalizedText(product.category.name, locale)}
                    </p>
                  )}

                  {/* Name */}
                  <Link
                    href={`/${locale}/products/${product.slug || productId}`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {getLocalizedText(product.name, locale)}
                    </h3>
                  </Link>

                  {/* Short Description */}
                  {product.shortDescription && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {getLocalizedText(product.shortDescription, locale)}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-3">
                    {hasDiscount && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.compareAtPrice!, product.currency)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(product.basePrice, product.currency)}
                    </span>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#04524B] text-white font-semibold rounded-xl hover:bg-[#033D38] transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t("addToCart")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/products`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FB9903] to-[#D98102] text-white font-bold rounded-full hover:shadow-xl hover:shadow-[#FB9903]/30 transition-all duration-300 hover:-translate-y-1"
          >
            <span>{t("viewAll")}</span>
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Product Options Modal */}
      <ProductOptionsModal
        product={selectedProduct as any}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        locale={locale}
      />
    </section>
  );
}
