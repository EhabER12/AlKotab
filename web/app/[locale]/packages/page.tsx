"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Sparkles, Zap, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getPackages, Package } from "@/store/services/packageService";
import { useTranslations } from "next-intl";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

const normalizeCurrency = (currency?: string): "SAR" | "EGP" | "USD" => {
  if (currency === "SAR" || currency === "EGP" || currency === "USD") {
    return currency;
  }

  return "EGP";
};

export default function PackagesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isRtl = locale === "ar";
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const { selectedCurrency, convert, format, isLoading: isCurrencyLoading } =
    useCurrencyContext();

  const { packages, isLoading } = useAppSelector((state) => state.packages);

  useEffect(() => {
    dispatch(getPackages({ isActive: true }));
  }, [dispatch]);

  const getLocalizedText = (text: any) => {
    if (!text) return "";
    return text[locale] || text.en || text.ar || "";
  };

  const formatPackagePrice = (pkg: Package) =>
    format(
      convert(pkg.price, normalizeCurrency(pkg.currency), selectedCurrency),
      selectedCurrency,
      isRtl ? "ar" : "en"
    );

  if (isLoading || isCurrencyLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12" dir={isRtl ? "rtl" : "ltr"}>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          {isRtl ? "باقات الاشتراك" : "Subscription Packages"}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {isRtl 
            ? "اختر الباقة المناسبة لك وابدأ رحلتك التعليمية معنا اليوم. نقدم خيارات متنوعة تناسب جميع الاحتياجات."
            : "Choose the right package for you and start your learning journey today. We offer various options to suit all needs."}
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg: Package, index: number) => (
          <Card 
            key={pkg.id || pkg._id || `pkg-${index}`} 
            className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl border-2 ${
              pkg.isPopular ? "border-primary scale-105 z-10" : "border-border"
            }`}
          >
            {pkg.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="px-4 py-1 uppercase tracking-wider">
                  {isRtl ? "الأكثر شيوعاً" : "Most Popular"}
                </Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl font-bold">{getLocalizedText(pkg.name)}</CardTitle>
              <CardDescription className="line-clamp-2">
                {getLocalizedText(pkg.description)}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">{formatPackagePrice(pkg)}</span>
                <span className="text-muted-foreground ml-1 lowercase">
                  / {pkg.duration.value > 1 ? pkg.duration.value : ""} {isRtl 
                    ? (pkg.duration.unit === 'month' ? 'شهر' : pkg.duration.unit === 'week' ? 'أسبوع' : 'يوم')
                    : pkg.duration.unit}
                </span>
              </div>

              <div className="space-y-3">
                {pkg.features.map((feature, idx) => (
                  <div key={`${pkg.id || pkg._id}-feature-${idx}`} className="flex items-start gap-3">
                    <div className="mt-1 bg-primary/10 rounded-full p-0.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-gray-600">
                      {getLocalizedText(feature)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              <Link 
                href={`/${locale}/packages/checkout/${pkg.id || pkg._id}`} 
                className="w-full"
              >
                <Button 
                  className="w-full h-12 text-lg font-semibold" 
                  variant={pkg.isPopular ? "default" : "outline"}
                >
                  {isRtl ? "اشترك الآن" : "Subscribe Now"}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
          <p className="text-muted-foreground">
            {isRtl ? "لا توجد باقات متاحة حالياً." : "No packages available at the moment."}
          </p>
        </div>
      )}
    </div>
  );
}
