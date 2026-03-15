"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Star,
  TrendingUp,
  Globe,
  Briefcase,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_HERO_TEXT_SIZES,
  PublicWebsiteSettingsData,
} from "@/store/services/settingsService";

export function HeroSection({
  locale,
  settings,
}: {
  locale: string;
  settings?: PublicWebsiteSettingsData | null;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("landing.hero");
  const isRtl = locale === "ar";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const heroSettings = settings?.homepageSections?.hero;
  const showDynamic = heroSettings?.isEnabled;
  const heroTextSizes = {
    ...DEFAULT_HERO_TEXT_SIZES,
    ...(heroSettings?.textSizes || {}),
  };
  const titleFontSize = `clamp(${heroTextSizes.titleMobile}px, 6vw, ${heroTextSizes.titleDesktop}px)`;
  const subtitleFontSize = `clamp(${heroTextSizes.subtitleMobile}px, 2.5vw, ${heroTextSizes.subtitleDesktop}px)`;

  const title = showDynamic
    ? isRtl
      ? heroSettings.title.ar
      : heroSettings.title.en
    : t("title1");

  const subtitle = showDynamic
    ? isRtl
      ? heroSettings.subtitle.ar
      : heroSettings.subtitle.en
    : t("subtitle");

  const content = showDynamic
    ? isRtl
      ? heroSettings.content.ar
      : heroSettings.content.en
    : t("subtitleHighlight");

  const ctaText = showDynamic
    ? isRtl
      ? heroSettings.buttonText.ar
      : heroSettings.buttonText.en
    : t("cta");

  const ctaLink = showDynamic ? heroSettings.buttonLink : "/forms/consultation-request";

  // Badge from settings or fallback to translation
  const badge = showDynamic && heroSettings?.badge
    ? isRtl
      ? heroSettings.badge.ar || t("badge")
      : heroSettings.badge.en || t("badge")
    : t("badge");

  useGSAP(() => {
    if (!heroRef.current) return;

    const tl = gsap.timeline();

    // Stagger animations for premium feel
    // NOTE: hero-title does NOT start with opacity:0 to avoid LCP penalty
    tl.from(".hero-badge", {
      y: -30,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
    })
      .from(
        ".hero-title",
        {
          y: 30,
          // No opacity animation - keeps LCP visible immediately
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3"
      )
      .from(
        ".hero-subtitle",
        {
          y: 40,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.4"
      )
      .from(
        ".hero-buttons",
        {
          y: 30,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.3"
      )
      .from(
        ".hero-social-proof",
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.2"
      )
      .from(
        ".hero-mockup",
        {
          x: isRtl ? -80 : 80,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.6"
      )
      .from(
        ".hero-stats",
        {
          y: 40,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.4"
      );
  }, [isRtl]);

  // Inline SVG avatars - no network requests, instant load
  const avatarColors = ["#FB9903", "#04524B", "#066a60", "#d98102"];

  // Get proper background image URL
  const getBackgroundImageUrl = () => {
    if (!heroSettings?.backgroundImage) return null;

    //If URL is already absolute, use as is
    if (heroSettings.backgroundImage.startsWith('http')) {
      return heroSettings.backgroundImage;
    }

    // Otherwise prepend API base URL
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${apiBase}${heroSettings.backgroundImage}`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();
  const satisfiedStudentsValue = settings?.heroStats?.satisfiedStudents?.value;
  const satisfiedStudentsLabel = isRtl
    ? settings?.heroStats?.satisfiedStudents?.label?.ar
    : settings?.heroStats?.satisfiedStudents?.label?.en;
  const satisfiedStudentsText =
    settings?.heroStats?.enabled &&
    (satisfiedStudentsValue || satisfiedStudentsLabel)
      ? [satisfiedStudentsValue, satisfiedStudentsLabel].filter(Boolean).join(" ")
      : t("clients");

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
      style={{
        background: backgroundImageUrl
          ? `linear-gradient(135deg, rgba(26, 71, 42, 0.85) 0%, rgba(4, 82, 75, 0.85) 50%, rgba(4, 82, 75, 0.85) 100%), url(${backgroundImageUrl})`
          : `linear-gradient(135deg, var(--primary) 0%, var(--genoun-green-dark) 50%, var(--genoun-green-dark) 100%)`,
        backgroundSize: backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: backgroundImageUrl ? 'center' : undefined,
      }}
    >
      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FB9903' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating Orbs */}
      <div
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 animate-pulse-slow"
        style={{
          background: "radial-gradient(circle, #FB9903 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-1/2 -left-32 w-[300px] h-[300px] rounded-full opacity-15 animate-pulse-slow-reverse"
        style={{
          background: "radial-gradient(circle, #FB9903 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Main Content */}
      <div
        className="relative z-10 flex-1 container px-4 sm:px-6 md:px-8 pt-14 md:pt-32 pb-8"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 min-h-[calc(100vh-200px)]"
        >
          {/* Left Side - Text Content */}
          <div className={`flex-1 max-w-2xl `}>
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-genoun-gold/10 border border-genoun-gold/20 mb-6">
              <Sparkles className="w-4 h-4 text-genoun-gold" />
              <span className="text-genoun-gold text-sm font-medium tracking-wide">
                {badge}
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className="hero-title mb-6 font-bold leading-[1.1] text-white"
              style={{ fontSize: titleFontSize }}
            >
              {title}
              {!showDynamic && <span className="block text-genoun-gold mt-2">{t("title2")}</span>}
            </h1>

            {/* Subheadline */}
            <p
              className="hero-subtitle mb-8 max-w-xl leading-relaxed text-white/70"
              style={{ fontSize: subtitleFontSize }}
            >
              {subtitle}
              <span className="text-genoun-gold font-medium">
                {" "}
                {content}
              </span>
            </p>

            {/* CTA Buttons */}
            <div
              className={`hero-buttons flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 `}
            >
              <Link href={ctaLink}>
                <button className="group px-8 py-4 bg-genoun-gold hover:bg-genoun-gold-light text-genoun-green font-bold text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-genoun-gold/30 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
                  <span>{ctaText}</span>
                </button>
              </Link>

              <Link
                href="#results"
                className={`flex items-center gap-2 text-white/90 hover:text-genoun-gold transition-colors text-lg font-medium group `}
              >
                <span>{t("secondaryCta")}</span>
                <ArrowIcon
                  className={`w-5 h-5 transition-transform ${isRtl
                    ? "group-hover:-translate-x-1"
                    : "group-hover:translate-x-1"
                    }`}
                />
              </Link>
            </div>

            {/* Social Proof */}
            <div className={`hero-social-proof flex items-center gap-4 }`}>
              {/* Avatar Stack - Using inline SVG to save 277KB */}
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {avatarColors.map((color, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 rounded-full border-2 border-genoun-green overflow-hidden flex items-center justify-center"
                    style={{
                      zIndex: avatarColors.length - index,
                      backgroundColor: color,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" fill="white" opacity="0.9" />
                      <path
                        d="M4 20c0-4 4-6 8-6s8 2 8 6"
                        fill="white"
                        opacity="0.9"
                      />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Rating & Text */}
              <div className={isRtl ? "text-right" : "text-left"}>
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-genoun-gold text-genoun-gold"
                    />
                  ))}
                  <span className="text-white/80 text-sm font-medium ml-1">
                    {t("rating")}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{satisfiedStudentsText}</p>
              </div>
            </div>
          </div>

          {/* Right Side - Mockup Image */}
          <div className={`hero-mockup flex-1 max-w-xl `}>
            <div className="relative">
              {/* Glow Effect Behind Mockup */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(circle at center, #FB9903 0%, transparent 60%)",
                  filter: "blur(60px)",
                  transform: "scale(1.2)",
                }}
              />

              {/* Dashboard Mockup Container */}
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/80 border-b border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-6 bg-gray-700/50 rounded-md flex items-center px-3">
                      <span className="text-xs text-gray-400 truncate">
                        genoun.com/dashboard
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content Placeholder */}
                <div className="p-6 bg-gradient-to-br from-gray-900/95 to-gray-800/95 min-h-[280px] sm:min-h-[320px]">
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-genoun-gold text-xl font-bold">
                        +85%
                      </div>
                      <div className="text-white/50 text-xs">Traffic</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-green-400 text-xl font-bold">
                        325
                      </div>
                      <div className="text-white/50 text-xs">Orders</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-white text-xl font-bold">98%</div>
                      <div className="text-white/50 text-xs">Satisfaction</div>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                    <div className="flex items-end justify-between h-24 gap-2">
                      {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-genoun-gold/50 to-genoun-gold"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-genoun-gold/20 rounded-lg p-3 border border-genoun-gold/30">
                      <div className="text-genoun-gold font-bold">ROI</div>
                      <div className="text-white text-2xl font-bold">+312%</div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-white/50 text-xs">
                        Active Projects
                      </div>
                      <div className="text-white text-2xl font-bold">24</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="hero-stats relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container px-4 sm:px-6 py-6">
          <div className={`grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto `}>
            {/* Projects */}
            <div className={`flex items-center gap-3 `}>
              <div className="w-10 h-10 rounded-xl bg-genoun-gold/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-genoun-gold" />
              </div>
              <div>
                <div className="text-white font-bold text-xl sm:text-2xl">
                  {settings?.heroStats?.enabled
                    ? settings.heroStats.projects.value
                    : t("statsProjects")}
                </div>
                <div className="text-white/50 text-xs sm:text-sm">
                  {settings?.heroStats?.enabled
                    ? (isRtl ? settings.heroStats.projects.label.ar : settings.heroStats.projects.label.en)
                    : t("statsProjectsLabel")}
                </div>
              </div>
            </div>

            {/* Growth */}
            <div className={`flex items-center gap-3 `}>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-white font-bold text-xl sm:text-2xl">
                  {settings?.heroStats?.enabled
                    ? settings.heroStats.growth.value
                    : t("statsGrowth")}
                </div>
                <div className="text-white/50 text-xs sm:text-sm">
                  {settings?.heroStats?.enabled
                    ? (isRtl ? settings.heroStats.growth.label.ar : settings.heroStats.growth.label.en)
                    : t("statsGrowthLabel")}
                </div>
              </div>
            </div>

            {/* Countries */}
            <div className={`flex items-center gap-3 `}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-bold text-xl sm:text-2xl">
                  {settings?.heroStats?.enabled
                    ? settings.heroStats.countries.value
                    : t("statsCountries")}
                </div>
                <div className="text-white/50 text-xs sm:text-sm">
                  {settings?.heroStats?.enabled
                    ? (isRtl ? settings.heroStats.countries.label.ar : settings.heroStats.countries.label.en)
                    : t("statsCountriesLabel")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="relative z-10">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
