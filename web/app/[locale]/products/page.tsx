"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShoppingBag,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getProducts, Product } from "@/store/slices/productSlice";
import { getCategories, Category } from "@/store/slices/categorySlice";
import { addToCart } from "@/store/slices/cartSlice";
import { ProductOptionsModal } from "@/components/products/ProductOptionsModal";
import { getPublicWebsiteSettingsThunk } from "@/store/services/settingsService";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { PriceDisplay } from "@/components/currency/PriceDisplay";

// Get localized text helper
const getLocalizedText = (
  text: { ar: string; en: string } | string | undefined,
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

export default function ProductsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isRtl = locale === "ar";
  const t = useTranslations();

  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector((state) => state.products);
  const { categories } = useAppSelector((state) => state.categories);
  const { publicSettings } = useAppSelector((state) => state.settings);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(getProducts({ active: true }));
    dispatch(getCategories({ active: true }));
    dispatch(getPublicWebsiteSettingsThunk());
  }, [dispatch]);

  const productsPageHero = publicSettings?.productsPageHero;
  const heroEnabled = productsPageHero?.isEnabled !== false;
  const heroBadge =
    getLocalizedHeroText(productsPageHero?.badge as any, locale) ||
    (isRtl ? "منتجاتنا الرقمية" : "Our Digital Products");
  const heroTitle =
    getLocalizedHeroText(productsPageHero?.title as any, locale) ||
    (t("products.title") as string) ||
    "Our Digital Products";
  const heroSubtitle =
    getLocalizedHeroText(productsPageHero?.subtitle as any, locale) ||
    (t("products.subtitle") as string) ||
    "Premium digital services and products for your business";
  const heroStyle =
    productsPageHero?.backgroundImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${productsPageHero.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter]);

  const handleAddToCart = (product: Product) => {
    // Check if product has variants or addons
    const hasOptions =
      (product.variants && product.variants.length > 1) ||
      (product.addons && product.addons.length > 0);

    if (hasOptions) {
      // Open modal for product with options
      setSelectedProduct(product);
      setIsModalOpen(true);
    } else {
      // Direct add to cart for simple products
      const defaultVariant = product.variants?.find((v) => v.isDefault);
      dispatch(
        addToCart({
          product,
          variant: defaultVariant,
          addons: [],
          quantity: 1,
        })
      );
      toast.success(t("cart.itemAdded") || "Added to cart");
    }
  };

  // Filter products
  const filteredProducts =
    categoryFilter === "all"
      ? products
      : products.filter((p) => p.categoryId === categoryFilter);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Section */}
      {heroEnabled && (
        <section
          className="bg-gradient-to-br from-primary to-primary/80 py-16 text-white"
          style={heroStyle}
        >
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-5">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-sm font-medium">{heroBadge}</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">{heroTitle}</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">{heroSubtitle}</p>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("products.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("products.allCategories") || "All Categories"}
              </SelectItem>
              {categories.map((cat: Category) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {getLocalizedText(cat.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">
            {filteredProducts.length}{" "}
            {t("products.productsFound") || "products"}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {t("products.noProducts") || "No products found"}
            </h3>
            <p className="text-muted-foreground">
              {t("products.checkBackLater") ||
                "Check back later for new products!"}
            </p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map((product: Product) => (
                <div
                  key={product.id}
                  className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* Product Image */}
                  <Link
                    href={`/${locale}/products/${product.slug || product.id}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      {product.coverImage ? (
                        <img
                          src={product.coverImage}
                          alt={getLocalizedText(product.name, locale)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-gray-300" />
                        </div>
                      )}

                      {/* Featured Badge */}
                      {product.isFeatured && (
                        <Badge className="absolute top-3 left-3 bg-amber-500 hover:bg-amber-600">
                          {t("products.featured") || "Featured"}
                        </Badge>
                      )}

                      {/* Discount Badge */}
                      {product.compareAtPrice &&
                        product.compareAtPrice > product.basePrice && (
                          <Badge className="absolute top-3 right-3 bg-red-500 hover:bg-red-600">
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
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col p-4">
                    {/* Category */}
                    {product.category && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {getLocalizedText(product.category.name, locale)}
                      </p>
                    )}

                    {/* Name */}
                    <Link
                      href={`/${locale}/products/${product.slug || product.id}`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary transition-colors">
                        {getLocalizedText(product.name, locale)}
                      </h3>
                    </Link>

                    {/* Short Description */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {getLocalizedText(product.shortDescription, locale)}
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-2">
                      {(product.compareAtPrice ?? 0) > 0 &&
                        product.compareAtPrice! > product.basePrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            <PriceDisplay
                              amount={product.compareAtPrice!}
                              currency={(product.currency as "SAR" | "EGP" | "USD") || "EGP"}
                              locale={isRtl ? "ar" : "en"}
                              className="text-sm text-muted-foreground line-through"
                            />
                          </span>
                        )}
                      {product.basePrice > 0 && (
                        <PriceDisplay
                          amount={product.basePrice}
                          currency={(product.currency as "SAR" | "EGP" | "USD") || "EGP"}
                          locale={isRtl ? "ar" : "en"}
                          className="text-xl font-bold text-primary"
                        />
                      )}
                    </div>

                    {/* Variants Count */}
                    {product.variants && product.variants.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {product.variants.length}{" "}
                        {t("products.variants") || "variants"}
                      </p>
                    )}

                    {/* Spacer to push button to bottom */}
                    <div className="flex-1" />

                    {/* Add to Cart Button - Always at bottom */}
                    <Button
                      className="w-full"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingBag
                        className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                      />
                      {t("products.addToCart") || "Add to Cart"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {isRtl ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      // Show first, last, current, and neighbors
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="icon"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10"
                          >
                            {page}
                          </Button>
                        );
                      }
                      // Show ellipsis
                      if (
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 &&
                          currentPage < totalPages - 2)
                      ) {
                        return (
                          <span
                            key={page}
                            className="px-2 text-muted-foreground"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  {isRtl ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Options Modal */}
      <ProductOptionsModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        locale={locale}
      />
    </div>
  );
}
