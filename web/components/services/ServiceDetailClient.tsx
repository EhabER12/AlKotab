"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Sparkles,
  Gauge,
  ShoppingCart,
  Code,
  Globe,
  Search,
  Palette,
  Zap,
} from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

// Icon map for dynamic icon rendering
const iconMap: Record<string, any> = {
  "shopping-cart": ShoppingCart,
  code: Code,
  globe: Globe,
  search: Search,
  palette: Palette,
  zap: Zap,
  gauge: Gauge,
  sparkles: Sparkles,
  check: Check,
};

interface ServiceDetailClientProps {
  service: any;
  locale: string;
}

const normalizeCurrency = (currency?: string): "SAR" | "EGP" | "USD" => {
  if (currency === "SAR" || currency === "EGP" || currency === "USD") {
    return currency;
  }
  return "EGP";
};

export function ServiceDetailClient({
  service,
  locale,
}: ServiceDetailClientProps) {
  const isRtl = locale === "ar";
  const { selectedCurrency, convert, format } = useCurrencyContext();

  const title = isRtl ? service.title?.ar : service.title?.en;
  const shortDesc = isRtl
    ? service.shortDescription?.ar
    : service.shortDescription?.en;
  const rawDescription = isRtl
    ? service.description?.ar
    : service.description?.en;

  // Sanitize HTML content client-side only
  const description = useMemo(() => {
    if (typeof window === "undefined") return rawDescription || "";
    // Simple HTML sanitization for client-side
    const div = document.createElement("div");
    div.innerHTML = rawDescription || "";
    // Remove script tags
    div.querySelectorAll("script").forEach((el) => el.remove());
    return div.innerHTML;
  }, [rawDescription]);

  const ServiceIcon = iconMap[service.icon] || Zap;
  const formatPrice = (amount: number, currency?: string) =>
    format(
      convert(amount, normalizeCurrency(currency), selectedCurrency),
      selectedCurrency,
      isRtl ? "ar" : "en"
    );

  return (
    <main className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-[#04524B] to-[#033D38] overflow-hidden">
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FB9903' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container px-4 sm:px-6 relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-white/70 text-sm mb-8">
            <Link
              href={`/${locale}`}
              className="hover:text-white transition-colors"
            >
              {isRtl ? "الرئيسية" : "Home"}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              href={`/${locale}/services`}
              className="hover:text-white transition-colors"
            >
              {isRtl ? "الخدمات" : "Services"}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{title}</span>
          </nav>

          <div className="max-w-4xl">
            {/* Icon */}
            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-6">
              <ServiceIcon className="w-10 h-10 text-[#FB9903]" />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
              {title}
            </h1>

            {/* Short Description */}
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl">
              {shortDesc}
            </p>

            {/* CTA */}
            <Link
              href={`/${locale}/forms/consultation-request`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#FB9903] text-white font-bold rounded-full hover:bg-[#D98102] transition-colors shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isRtl ? "اطلب هذه الخدمة" : "Request This Service"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {service.stats && service.stats.length > 0 && (
        <section className="py-12 bg-white border-b border-gray-200">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-wrap justify-center gap-8">
              {service.stats.map((stat: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-[#FB9903] mb-1">
                    {stat.value}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {isRtl ? stat.label?.ar : stat.label?.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-16">
        <div className="container px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Cover Image */}
            {service.coverImage && (
              <div className="relative aspect-video rounded-3xl overflow-hidden mb-12 shadow-xl">
                <Image
                  src={service.coverImage}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="prose prose-lg max-w-none mb-12">
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: description || "" }}
              />
            </div>

            {/* Features */}
            {service.features && service.features.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {isRtl ? "مميزات الخدمة" : "Service Features"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.features.map((feature: any, index: number) => {
                    const FeatureIcon = iconMap[feature.icon] || Check;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-200"
                      >
                        <div className="p-2 bg-[#04524B]/10 rounded-xl flex-shrink-0">
                          <FeatureIcon className="w-5 h-5 text-[#04524B]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">
                            {isRtl ? feature.title?.ar : feature.title?.en}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {isRtl
                              ? feature.description?.ar
                              : feature.description?.en}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pricing */}
            {service.pricingType === "tiers" &&
              service.pricingTiers &&
              service.pricingTiers.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {isRtl ? "باقات الأسعار" : "Pricing Plans"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {service.pricingTiers.map((tier: any, index: number) => (
                      <div
                        key={index}
                        className={`p-6 rounded-3xl ${
                          tier.isPopular
                            ? "bg-[#04524B] text-white ring-4 ring-[#FB9903]"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {tier.isPopular && (
                          <span className="inline-block px-3 py-1 bg-[#FB9903] text-white text-xs font-bold rounded-full mb-4">
                            {isRtl ? "الأكثر طلباً" : "Most Popular"}
                          </span>
                        )}
                        <h3 className="text-lg font-bold mb-2">
                          {isRtl ? tier.name?.ar : tier.name?.en}
                        </h3>
                        <div className="text-3xl font-bold mb-4">
                          {tier.price ? (
                            <>{formatPrice(tier.price, tier.currency)}</>
                          ) : (
                            <span>
                              {isRtl ? "اتصل للسعر" : "Contact for Price"}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm mb-6 ${
                            tier.isPopular ? "text-white/80" : "text-gray-600"
                          }`}
                        >
                          {isRtl ? tier.description?.ar : tier.description?.en}
                        </p>
                        <Link
                          href={
                            tier.price
                              ? `/${locale}/checkout/service/${service.slug}?tier=${index}`
                              : `/${locale}/forms/consultation-request`
                          }
                          className={`block text-center px-6 py-3 rounded-full font-bold transition-colors ${
                            tier.isPopular
                              ? "bg-[#FB9903] text-white hover:bg-[#D98102]"
                              : "bg-[#04524B] text-white hover:bg-[#033D38]"
                          }`}
                        >
                          {tier.price
                            ? isRtl
                              ? "اختر الباقة"
                              : "Choose Plan"
                            : isRtl
                            ? "اطلب عرض سعر"
                            : "Request Quote"}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Fixed Price CTA */}
            {service.pricingType === "fixed" && service.startingPrice && (
              <div className="mb-12 bg-gradient-to-br from-[#04524B] to-[#033D38] rounded-3xl p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {isRtl ? "السعر الثابت" : "Fixed Price"}
                </h2>
                <div className="text-4xl font-bold text-[#FB9903] mb-4">
                  {formatPrice(Number(service.startingPrice || 0), "EGP")}
                </div>
                <p className="text-white/80 mb-6 max-w-md mx-auto">
                  {isRtl
                    ? "احصل على هذه الخدمة بسعر ثابت وشفاف"
                    : "Get this service at a fixed, transparent price"}
                </p>
                <Link
                  href={`/${locale}/checkout/service/${service.slug}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#FB9903] text-white font-bold rounded-full hover:bg-[#D98102] transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{isRtl ? "اطلب الآن" : "Order Now"}</span>
                </Link>
              </div>
            )}

            {/* Request Quote CTA */}
            {service.pricingType === "quote" && (
              <div className="bg-gradient-to-br from-[#04524B] to-[#033D38] rounded-3xl p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {isRtl ? "احصل على عرض سعر مخصص" : "Get a Custom Quote"}
                </h2>
                <p className="text-white/80 mb-6 max-w-md mx-auto">
                  {isRtl
                    ? "كل مشروع فريد. تواصل معنا لمناقشة متطلباتك والحصول على عرض سعر يناسب احتياجاتك."
                    : "Every project is unique. Contact us to discuss your requirements and get a tailored quote."}
                </p>
                <Link
                  href={`/${locale}/forms/consultation-request`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#FB9903] text-white font-bold rounded-full hover:bg-[#D98102] transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{isRtl ? "اطلب عرض سعر" : "Request Quote"}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Services */}
      {service.relatedServices && service.relatedServices.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {isRtl ? "خدمات ذات صلة" : "Related Services"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {service.relatedServices.map((related: any) => {
                const RelatedIcon = iconMap[related.icon] || Zap;
                return (
                  <Link
                    key={related.slug}
                    href={`/${locale}/services/${related.slug}`}
                    className="group p-6 bg-gray-50 rounded-2xl hover:bg-[#04524B] transition-colors"
                  >
                    <RelatedIcon className="w-8 h-8 text-[#04524B] group-hover:text-white mb-4 transition-colors" />
                    <h3 className="font-bold text-gray-900 group-hover:text-white transition-colors">
                      {isRtl ? related.title?.ar : related.title?.en}
                    </h3>
                    <div className="flex items-center gap-1 text-[#FB9903] text-sm mt-2 group-hover:text-white/80 transition-colors">
                      <span>{isRtl ? "عرض الخدمة" : "View Service"}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
