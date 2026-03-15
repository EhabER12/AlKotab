"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_HERO_TEXT_SIZES,
  DEFAULT_METHODOLOGY_STEPS,
  DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT,
  HomepageSections,
  SectionConfig,
  type HeroTextSizes,
  type MethodologyStep,
} from "@/store/services/settingsService";

interface HomepageSectionsSettingsProps {
  sections: HomepageSections;
  setSections: (sections: HomepageSections) => void;
  formLang: "en" | "ar";
  heroBackgroundPreview?: string | null;
  setHeroBackgroundPreview?: (preview: string | null) => void;
  onHeroBackgroundFileChange?: (file: File | null) => void;
}

const getDefaultMethodologySteps = (): MethodologyStep[] =>
  DEFAULT_METHODOLOGY_STEPS.map((step) => ({
    title: { ...step.title },
    subtitle: { ...step.subtitle },
    description: { ...step.description },
  }));

const getMethodologySteps = (steps?: MethodologyStep[]): MethodologyStep[] =>
  DEFAULT_METHODOLOGY_STEPS.map((defaultStep, index) => ({
    title: {
      ...defaultStep.title,
      ...(steps?.[index]?.title || {}),
    },
    subtitle: {
      ...defaultStep.subtitle,
      ...(steps?.[index]?.subtitle || {}),
    },
    description: {
      ...defaultStep.description,
      ...(steps?.[index]?.description || {}),
    },
  }));

export const HomepageSectionsSettings: React.FC<
  HomepageSectionsSettingsProps
> = ({
  sections,
  setSections,
  formLang,
  heroBackgroundPreview,
  setHeroBackgroundPreview,
  onHeroBackgroundFileChange,
}) => {
  const updateSection = (
    sectionKey: keyof HomepageSections,
    field: string,
    value: unknown
  ) => {
    const updatedSections = { ...sections };
    const section = { ...updatedSections[sectionKey] } as SectionConfig;

    if (field.startsWith("badge_")) {
      section.badge = {
        ...(section.badge || { ar: "", en: "" }),
        [field.split("_")[1]]: value,
      };
    } else if (field.startsWith("titleHighlight_")) {
      section.titleHighlight = {
        ...(section.titleHighlight || DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT),
        [field.split("_")[1]]: value,
      };
    } else if (field.startsWith("title_")) {
      section.title = { ...section.title, [field.split("_")[1]]: value };
    } else if (field.startsWith("subtitle_")) {
      section.subtitle = {
        ...section.subtitle,
        [field.split("_")[1]]: value,
      };
    } else if (field.startsWith("textSizes_")) {
      const sizeKey = field.replace("textSizes_", "") as keyof HeroTextSizes;
      section.textSizes = {
        ...DEFAULT_HERO_TEXT_SIZES,
        ...(section.textSizes || {}),
        [sizeKey]: value,
      };
    } else if (field.startsWith("content_")) {
      section.content = { ...section.content, [field.split("_")[1]]: value };
    } else if (field.startsWith("buttonText_")) {
      section.buttonText = {
        ...section.buttonText,
        [field.split("_")[1]]: value,
      };
    } else if (field.startsWith("steps_")) {
      const [, indexRaw, stepField, lang] = field.split("_");
      const index = Number(indexRaw);
      const steps = getMethodologySteps(section.steps);
      const step = steps[index];

      if (!step || (lang !== "ar" && lang !== "en")) {
        return;
      }

      const stepKey = stepField as keyof MethodologyStep;
      steps[index] = {
        ...step,
        [stepKey]: {
          ...step[stepKey],
          [lang]: value,
        },
      };
      section.steps = steps;
    } else {
      (section as unknown as Record<string, unknown>)[field] = value;
    }

    updatedSections[sectionKey] = section;
    setSections(updatedSections);
  };

  const handleHeroTextSizeChange = (
    sectionKey: keyof HomepageSections,
    sizeKey: keyof HeroTextSizes,
    rawValue: string
  ) => {
    const fallback = DEFAULT_HERO_TEXT_SIZES[sizeKey];
    updateSection(
      sectionKey,
      `textSizes_${sizeKey}`,
      Number(rawValue) || fallback
    );
  };

  const renderHeroTextSizeInputs = (
    key: keyof HomepageSections,
    section: SectionConfig
  ) => {
    if (key !== "hero") return null;

    const heroTextSizes = {
      ...DEFAULT_HERO_TEXT_SIZES,
      ...(section.textSizes || {}),
    };

    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div>
          <Label className="text-base font-medium">
            {formLang === "ar" ? "أحجام نصوص الهيرو" : "Hero Text Sizes"}
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            {formLang === "ar"
              ? "تحكم في حجم العنوان والوصف على الموبايل والشاشات الكبيرة."
              : "Control the title and subtitle size on mobile and larger screens."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {formLang === "ar" ? "حجم العنوان - موبايل" : "Title Size - Mobile"}
            </Label>
            <Input
              type="number"
              min={24}
              max={96}
              value={heroTextSizes.titleMobile}
              onChange={(e) =>
                handleHeroTextSizeChange(key, "titleMobile", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              {formLang === "ar" ? "حجم العنوان - ديسكتوب" : "Title Size - Desktop"}
            </Label>
            <Input
              type="number"
              min={32}
              max={140}
              value={heroTextSizes.titleDesktop}
              onChange={(e) =>
                handleHeroTextSizeChange(key, "titleDesktop", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              {formLang === "ar" ? "حجم الوصف - موبايل" : "Subtitle Size - Mobile"}
            </Label>
            <Input
              type="number"
              min={14}
              max={40}
              value={heroTextSizes.subtitleMobile}
              onChange={(e) =>
                handleHeroTextSizeChange(key, "subtitleMobile", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              {formLang === "ar" ? "حجم الوصف - ديسكتوب" : "Subtitle Size - Desktop"}
            </Label>
            <Input
              type="number"
              min={16}
              max={48}
              value={heroTextSizes.subtitleDesktop}
              onChange={(e) =>
                handleHeroTextSizeChange(key, "subtitleDesktop", e.target.value)
              }
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {formLang === "ar" ? "القيم بالبكسل." : "Values are in pixels."}
        </p>
      </div>
    );
  };

  const renderMethodologyInputs = (
    key: keyof HomepageSections,
    section: SectionConfig
  ) => {
    if (key !== "about") return null;

    const methodologySteps =
      (section.steps?.length ?? 0) > 0
        ? getMethodologySteps(section.steps)
        : getDefaultMethodologySteps();

    return (
      <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {formLang === "ar"
                ? "تمييز العنوان (عربي)"
                : "Title Highlight (Arabic)"}
            </Label>
            <Input
              value={section.titleHighlight?.ar || ""}
              onChange={(e) =>
                updateSection(key, "titleHighlight_ar", e.target.value)
              }
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>
              {formLang === "ar"
                ? "تمييز العنوان (إنجليزي)"
                : "Title Highlight (English)"}
            </Label>
            <Input
              value={section.titleHighlight?.en || ""}
              onChange={(e) =>
                updateSection(key, "titleHighlight_en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <Label className="text-base font-medium">
              {formLang === "ar" ? "خطوات المنهجية" : "Methodology Steps"}
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              {formLang === "ar"
                ? "عدّل عناوين ووصف خطوات الـ timeline للغة الحالية."
                : "Edit the timeline step labels and descriptions for the current language."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {methodologySteps.map((step, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-medium">
                    {formLang === "ar"
                      ? `الخطوة ${index + 1}`
                      : `Step ${index + 1}`}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{formLang === "ar" ? "العنوان الصغير" : "Small Label"}</Label>
                    <Input
                      value={step.subtitle[formLang]}
                      onChange={(e) =>
                        updateSection(
                          key,
                          `steps_${index}_subtitle_${formLang}`,
                          e.target.value
                        )
                      }
                      dir={formLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{formLang === "ar" ? "العنوان" : "Title"}</Label>
                    <Input
                      value={step.title[formLang]}
                      onChange={(e) =>
                        updateSection(
                          key,
                          `steps_${index}_title_${formLang}`,
                          e.target.value
                        )
                      }
                      dir={formLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{formLang === "ar" ? "الوصف" : "Description"}</Label>
                    <Textarea
                      value={step.description[formLang]}
                      onChange={(e) =>
                        updateSection(
                          key,
                          `steps_${index}_description_${formLang}`,
                          e.target.value
                        )
                      }
                      dir={formLang === "ar" ? "rtl" : "ltr"}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderSectionForm = (key: keyof HomepageSections, label: string) => {
    const section = sections[key];
    if (!section) return null;

    const isMethodologySection = key === "about";

    return (
      <Card key={key} className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription>
              {formLang === "ar"
                ? `إعدادات قسم ${label}`
                : `Settings for ${label} section`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={section.isEnabled}
              onCheckedChange={(checked) =>
                updateSection(key, "isEnabled", checked)
              }
            />
            <Label>{formLang === "ar" ? "مفعل" : "Enabled"}</Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {key === "hero" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{formLang === "ar" ? "الشارة (عربي)" : "Badge (Arabic)"}</Label>
                <Input
                  value={section.badge?.ar || ""}
                  onChange={(e) => updateSection(key, "badge_ar", e.target.value)}
                  dir="rtl"
                  placeholder={
                    formLang === "ar"
                      ? "مثال: منصتك المتكاملة لتعلم القرآن"
                      : "e.g., Your Complete Quran Learning Platform"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{formLang === "ar" ? "الشارة (إنجليزي)" : "Badge (English)"}</Label>
                <Input
                  value={section.badge?.en || ""}
                  onChange={(e) => updateSection(key, "badge_en", e.target.value)}
                  placeholder="e.g., Your Complete Quran Learning Platform"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{formLang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
              <Input
                value={section.title.ar}
                onChange={(e) => updateSection(key, "title_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{formLang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
              <Input
                value={section.title.en}
                onChange={(e) => updateSection(key, "title_en", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{formLang === "ar" ? "العنوان الفرعي (عربي)" : "Subtitle (Arabic)"}</Label>
              <Input
                value={section.subtitle.ar}
                onChange={(e) => updateSection(key, "subtitle_ar", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{formLang === "ar" ? "العنوان الفرعي (إنجليزي)" : "Subtitle (English)"}</Label>
              <Input
                value={section.subtitle.en}
                onChange={(e) => updateSection(key, "subtitle_en", e.target.value)}
              />
            </div>
          </div>

          {renderMethodologyInputs(key, section)}

          {renderHeroTextSizeInputs(key, section)}

          {!isMethodologySection && (
            <>
              <div className="space-y-2">
                <Label>{formLang === "ar" ? "المحتوى" : "Content"}</Label>
                <Textarea
                  value={formLang === "ar" ? section.content.ar : section.content.en}
                  onChange={(e) =>
                    updateSection(key, `content_${formLang}`, e.target.value)
                  }
                  dir={formLang === "ar" ? "rtl" : "ltr"}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    {formLang === "ar" ? "نص الزر (عربي)" : "Button Text (Arabic)"}
                  </Label>
                  <Input
                    value={section.buttonText.ar}
                    onChange={(e) =>
                      updateSection(key, "buttonText_ar", e.target.value)
                    }
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {formLang === "ar"
                      ? "نص الزر (إنجليزي)"
                      : "Button Text (English)"}
                  </Label>
                  <Input
                    value={section.buttonText.en}
                    onChange={(e) =>
                      updateSection(key, "buttonText_en", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{formLang === "ar" ? "رابط الزر" : "Button Link"}</Label>
                  <Input
                    value={section.buttonLink}
                    onChange={(e) => updateSection(key, "buttonLink", e.target.value)}
                    placeholder="/courses"
                  />
                </div>
              </div>
            </>
          )}

          {key === "hero" && (
            <div className="space-y-2">
              <Label>{formLang === "ar" ? "صورة الخلفية" : "Background Image"}</Label>

              {(heroBackgroundPreview || section.backgroundImage) && (
                <div className="relative inline-block">
                  <Image
                    src={heroBackgroundPreview || section.backgroundImage || ""}
                    alt="Hero Background Preview"
                    width={300}
                    height={150}
                    className="h-32 w-auto rounded border object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full border bg-background"
                    onClick={() => {
                      setHeroBackgroundPreview?.(null);
                      onHeroBackgroundFileChange?.(null);
                      updateSection(key, "backgroundImage", "");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !onHeroBackgroundFileChange) return;

                  onHeroBackgroundFileChange(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setHeroBackgroundPreview?.(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <p className="text-sm text-muted-foreground">
                {formLang === "ar"
                  ? "قم برفع صورة للخلفية، ويفضل أن تكون 1920x1080 بكسل."
                  : "Upload background image (recommended 1920x1080px)."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hero">
        <TabsList className="mb-4">
          <TabsTrigger value="hero">{formLang === "ar" ? "الرئيسي" : "Hero"}</TabsTrigger>
          <TabsTrigger value="features">{formLang === "ar" ? "المميزات" : "Features"}</TabsTrigger>
          <TabsTrigger value="services">{formLang === "ar" ? "الخدمات" : "Services"}</TabsTrigger>
          <TabsTrigger value="about">
            {formLang === "ar" ? "المنهجية" : "Methodology"}
          </TabsTrigger>
          <TabsTrigger value="cta">{formLang === "ar" ? "دعوة للعمل" : "CTA"}</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          {renderSectionForm("hero", formLang === "ar" ? "القسم الرئيسي" : "Hero Section")}
        </TabsContent>
        <TabsContent value="features">
          {renderSectionForm("features", formLang === "ar" ? "المميزات" : "Features Section")}
        </TabsContent>
        <TabsContent value="services">
          {renderSectionForm("services", formLang === "ar" ? "الخدمات" : "Services Section")}
        </TabsContent>
        <TabsContent value="about">
          {renderSectionForm("about", formLang === "ar" ? "قسم المنهجية" : "Methodology Section")}
        </TabsContent>
        <TabsContent value="cta">
          {renderSectionForm("cta", formLang === "ar" ? "دعوة للعمل" : "CTA Section")}
        </TabsContent>
      </Tabs>
    </div>
  );
};
