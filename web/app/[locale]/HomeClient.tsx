"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Landing Page Sections
import {
  HeroSection,
  AuthorityBar,
  WhyGenoun,
  ServicesSection,
  ProductsSection,
  ResultsSection,
  MethodologySection,
  CTASection,
  ReviewsSection,
  ArticlesSection,
  PromoModal,
} from "@/components/sections/landing";
import { HomepageBanner } from "@/components/sections/landing/HomepageBanner";
import { HomepageCourses } from "@/components/sections/landing/HomepageCourses";
import { PublicWebsiteSettingsData } from "@/store/services/settingsService";

gsap.registerPlugin(ScrollTrigger);

// Define types for server-side data
interface BilingualText {
  ar: string;
  en: string;
}

interface Category {
  id: string;
  _id?: string;
  name: BilingualText;
  slug?: string;
}

interface Product {
  id: string;
  _id?: string;
  name: BilingualText;
  shortDescription?: BilingualText;
  description?: BilingualText;
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
  isActive?: boolean;
}

interface Review {
  id: string;
  _id?: string;
  name: string;
  rating: number;
  comment: string;
  review?: string;
  status?: string;
}

interface Article {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  views?: number;
  publishedAt?: string;
  createdAt?: string;
  author?: {
    name: string;
  };
}

interface HomeClientProps {
  locale: string;
  products?: Product[];
  categories?: Category[];
  reviews?: Review[];
  settings?: PublicWebsiteSettingsData | null;
  articles?: Article[];
}

export default function HomeClient({
  locale,
  products = [],
  categories = [],
  reviews = [],
  settings,
  articles = [],
}: HomeClientProps) {
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Debug: Log settings to verify order field
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Homepage Settings:', settings?.homepageSections);
  }

  // Get sections order from settings
  const getSectionOrder = (key: string): number => {
    if (!settings?.homepageSections) return 999;
    const section = settings.homepageSections[key as keyof typeof settings.homepageSections];
    return section?.order ?? 999;
  };

  // Check if section is enabled
  const isSectionEnabled = (key: string): boolean => {
    if (!settings?.homepageSections) return true;
    const section = settings.homepageSections[key as keyof typeof settings.homepageSections];
    return section?.isEnabled !== false;
  };

  // Create array of sections with their order
  const sections = [
    { key: 'hero', order: getSectionOrder('hero'), enabled: isSectionEnabled('hero'), component: <HeroSection locale={locale} settings={settings || undefined} /> },
    { key: 'authorityBar', order: settings?.authorityBar?.order ?? 1, enabled: settings?.authorityBar?.isEnabled !== false, component: <AuthorityBar locale={locale} settings={settings || undefined} /> },
    { key: 'whyGenoun', order: settings?.whyGenounSettings?.order ?? 2, enabled: settings?.whyGenounSettings?.isEnabled !== false, component: <WhyGenoun locale={locale} settings={settings || undefined} /> },
    { key: 'services', order: getSectionOrder('services'), enabled: isSectionEnabled('services'), component: <ServicesSection locale={locale} settings={settings || undefined} /> },
    { key: 'about', order: getSectionOrder('about'), enabled: isSectionEnabled('about'), component: <MethodologySection locale={locale} settings={settings || undefined} /> },
    { key: 'stats', order: getSectionOrder('stats'), enabled: isSectionEnabled('stats'), component: <ResultsSection locale={locale} /> },
    { key: 'testimonials', order: settings?.reviewsSettings?.order ?? 6, enabled: settings?.reviewsSettings?.isEnabled !== false, component: <ReviewsSection ref={reviewsRef} locale={locale} reviews={reviews} settings={settings || undefined} /> },
    { key: 'cta', order: getSectionOrder('cta'), enabled: isSectionEnabled('cta'), component: <CTASection locale={locale} settings={settings || undefined} /> },
  ];

  // Filter and sort sections
  const orderedSections = sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  useGSAP(() => {
    // Refresh ScrollTrigger after a delay to ensure proper detection
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    let fallbackTimer: NodeJS.Timeout;
    let header: Element | null = null;

    if (reviewsRef.current) {
      header = reviewsRef.current.querySelector(".mb-12, .mb-14, .mb-16");
      if (header) {
        // Use fromTo() to ensure elements are visible even if animation fails
        gsap.fromTo(
          header,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: reviewsRef.current,
              start: "top 85%",
              once: true,
            },
          }
        );

        // Fallback: ensure visibility after 3 seconds if animation hasn't triggered
        fallbackTimer = setTimeout(() => {
          if (header) {
            gsap.set(header, { opacity: 1, y: 0 });
          }
        }, 3000);
      }
    }

    return () => {
      clearTimeout(refreshTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [reviews]);

  return (
    <main className="flex-1">
      {settings?.promoModal && (
        <PromoModal settings={settings.promoModal} locale={locale} />
      )}

      {/* Dynamically render ordered and enabled sections */}
      {orderedSections.map((section) => (
        <div key={section.key}>{section.component}</div>
      ))}

      {/* Homepage Banner - Configurable (always after main sections) */}
      <HomepageBanner settings={settings || undefined} locale={locale} />

      {/* Homepage Courses - Configurable (always after banner) */}
      <HomepageCourses settings={settings || undefined} locale={locale} />

      {/* Articles Section (if available) */}
      {articles &&
        articles.length > 0 &&
        settings?.homepageArticlesSection?.isEnabled !== false && (
        <ArticlesSection
          locale={locale}
          articles={articles}
          settings={settings || undefined}
        />
      )}
    </main>
  );
}
