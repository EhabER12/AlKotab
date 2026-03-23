"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { PublicWebsiteSettingsData } from "@/store/services/settingsService";

gsap.registerPlugin(ScrollTrigger);

export function MethodologySection({
  locale,
  settings,
}: {
  locale: string;
  settings?: PublicWebsiteSettingsData | null;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("landing.methodology");
  const isRtl = locale === "ar";
  const methodologySettings = settings?.homepageSections?.about;
  const title = isRtl
    ? methodologySettings?.title?.ar || t("title")
    : methodologySettings?.title?.en || t("title");
  const titleHighlight = isRtl
    ? methodologySettings?.titleHighlight?.ar || t("titleHighlight")
    : methodologySettings?.titleHighlight?.en || t("titleHighlight");
  const subtitle = isRtl
    ? methodologySettings?.subtitle?.ar || t("subtitle")
    : methodologySettings?.subtitle?.en || t("subtitle");

  const steps = [
    {
      number: "1",
      title:
        (isRtl
          ? methodologySettings?.steps?.[0]?.title?.ar
          : methodologySettings?.steps?.[0]?.title?.en) || t("step1Title"),
      titleEn:
        (isRtl
          ? methodologySettings?.steps?.[0]?.subtitle?.ar
          : methodologySettings?.steps?.[0]?.subtitle?.en) || t("step1Subtitle"),
      description:
        (isRtl
          ? methodologySettings?.steps?.[0]?.description?.ar
          : methodologySettings?.steps?.[0]?.description?.en) || t("step1Desc"),
    },
    {
      number: "2",
      title:
        (isRtl
          ? methodologySettings?.steps?.[1]?.title?.ar
          : methodologySettings?.steps?.[1]?.title?.en) || t("step2Title"),
      titleEn:
        (isRtl
          ? methodologySettings?.steps?.[1]?.subtitle?.ar
          : methodologySettings?.steps?.[1]?.subtitle?.en) || t("step2Subtitle"),
      description:
        (isRtl
          ? methodologySettings?.steps?.[1]?.description?.ar
          : methodologySettings?.steps?.[1]?.description?.en) || t("step2Desc"),
    },
    {
      number: "3",
      title:
        (isRtl
          ? methodologySettings?.steps?.[2]?.title?.ar
          : methodologySettings?.steps?.[2]?.title?.en) || t("step3Title"),
      titleEn:
        (isRtl
          ? methodologySettings?.steps?.[2]?.subtitle?.ar
          : methodologySettings?.steps?.[2]?.subtitle?.en) || t("step3Subtitle"),
      description:
        (isRtl
          ? methodologySettings?.steps?.[2]?.description?.ar
          : methodologySettings?.steps?.[2]?.description?.en) || t("step3Desc"),
    },
    {
      number: "4",
      title:
        (isRtl
          ? methodologySettings?.steps?.[3]?.title?.ar
          : methodologySettings?.steps?.[3]?.title?.en) || t("step4Title"),
      titleEn:
        (isRtl
          ? methodologySettings?.steps?.[3]?.subtitle?.ar
          : methodologySettings?.steps?.[3]?.subtitle?.en) || t("step4Subtitle"),
      description:
        (isRtl
          ? methodologySettings?.steps?.[3]?.description?.ar
          : methodologySettings?.steps?.[3]?.description?.en) || t("step4Desc"),
    },
  ];

  useGSAP(() => {
    if (!sectionRef.current) return;

    gsap.from(".methodology-step", {
      x: isRtl ? 50 : -50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 70%",
        toggleActions: "play none none reverse",
      },
    });

    // Refresh ScrollTrigger after a short delay to ensure proper triggering
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }, [isRtl]);

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 bg-gray-50 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div
        className={`absolute top-1/2 ${
          isRtl ? "right-0" : "left-0"
        } w-96 h-96 bg-genoun-green/5 rounded-full blur-3xl ${
          isRtl ? "translate-x-1/2" : "-translate-x-1/2"
        } -translate-y-1/2`}
      />

      <div className="container px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16" dir={isRtl ? "rtl" : "ltr"}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {title} <span className="text-genoun-green">{titleHighlight}</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
          {steps.map((step, index) => (
            <div key={index} className="methodology-step timeline-step">
              <div
                className={`flex items-start gap-6 ${
                  isRtl ? "flex-row-reverse" : ""
                }`}
              >
                {/* Step Number */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-genoun-gold/20">
                  <span className="text-2xl font-bold text-genoun-green">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 pb-8 ${
                    isRtl ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 mb-2 ${
                      isRtl ? "flex-row-reverse justify-end" : ""
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider text-gray-400">
                      {step.titleEn}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
