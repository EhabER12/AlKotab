"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AuthorityBarSettings,
  HomepageSections,
  ReviewsSectionSettings,
  WhyGenounSettings,
} from "@/store/services/settingsService";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SectionOrderItem {
  key: string;
  label: { ar: string; en: string };
  order: number;
  isEnabled: boolean;
  type: "homepage" | "authority" | "reviews" | "whyGenoun";
}

interface SectionOrderSettingsProps {
  sections: HomepageSections;
  setSections: (sections: HomepageSections) => void;
  authorityBar: AuthorityBarSettings;
  setAuthorityBar: (settings: AuthorityBarSettings) => void;
  reviewsSettings: ReviewsSectionSettings;
  setReviewsSettings: (settings: ReviewsSectionSettings) => void;
  whyGenounSettings: WhyGenounSettings;
  setWhyGenounSettings: (settings: WhyGenounSettings) => void;
  formLang: "en" | "ar";
}

export const SectionOrderSettings: React.FC<SectionOrderSettingsProps> = ({
  sections,
  setSections,
  authorityBar,
  setAuthorityBar,
  reviewsSettings,
  setReviewsSettings,
  whyGenounSettings,
  setWhyGenounSettings,
  formLang,
}) => {
  const [orderedSections, setOrderedSections] = useState<SectionOrderItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const allSectionLabels: Record<string, { ar: string; en: string }> = {
    hero: { ar: "القسم الرئيسي", en: "Hero Section" },
    authorityBar: { ar: "شريط الثقة", en: "Authority Bar" },
    features: { ar: "المميزات", en: "Features" },
    whyGenoun: { ar: "لماذا جنون", en: "Why Genoun" },
    services: { ar: "الخدمات", en: "Services" },
    stats: { ar: "الإحصائيات", en: "Statistics" },
    about: { ar: "المنهجية", en: "Methodology" },
    testimonials: { ar: "آراء الطلاب", en: "Reviews" },
    cta: { ar: "دعوة للعمل", en: "Call to Action" },
  };

  useEffect(() => {
    const items: SectionOrderItem[] = [];

    (Object.keys(sections) as Array<keyof HomepageSections>).forEach((key) => {
      const section = sections[key];
      items.push({
        key,
        label: allSectionLabels[key] || { ar: key, en: key },
        order: section.order ?? 0,
        isEnabled: section.isEnabled,
        type: "homepage",
      });
    });

    items.push({
      key: "authorityBar",
      label: allSectionLabels.authorityBar,
      order: authorityBar.order ?? 1,
      isEnabled: authorityBar.isEnabled ?? true,
      type: "authority",
    });

    items.push({
      key: "testimonials",
      label: allSectionLabels.testimonials,
      order: reviewsSettings.order ?? 6,
      isEnabled: reviewsSettings.isEnabled ?? true,
      type: "reviews",
    });

    items.push({
      key: "whyGenoun",
      label: allSectionLabels.whyGenoun,
      order: whyGenounSettings.order ?? 2,
      isEnabled: whyGenounSettings.isEnabled ?? true,
      type: "whyGenoun",
    });

    const uniqueItems = Array.from(
      new Map(items.map((item) => [item.key, item])).values()
    );
    uniqueItems.sort((a, b) => a.order - b.order);
    setOrderedSections(uniqueItems);
  }, [sections, authorityBar, reviewsSettings, whyGenounSettings]);

  const applyOrderChanges = (items: SectionOrderItem[]) => {
    const updatedSections = { ...sections };
    let updatedAuthorityBar = { ...authorityBar };
    let updatedReviewsSettings = { ...reviewsSettings };
    let updatedWhyGenounSettings = { ...whyGenounSettings };

    items.forEach((item, index) => {
      if (item.type === "homepage" && item.key in sections) {
        const sectionKey = item.key as keyof HomepageSections;
        updatedSections[sectionKey] = {
          ...sections[sectionKey],
          order: index,
          isEnabled: item.isEnabled,
        };
        return;
      }

      if (item.type === "authority") {
        updatedAuthorityBar = {
          ...authorityBar,
          order: index,
          isEnabled: item.isEnabled,
        };
        return;
      }

      if (item.type === "reviews") {
        updatedReviewsSettings = {
          ...reviewsSettings,
          order: index,
          isEnabled: item.isEnabled,
        };
        return;
      }

      if (item.type === "whyGenoun") {
        updatedWhyGenounSettings = {
          ...whyGenounSettings,
          order: index,
          isEnabled: item.isEnabled,
        };
      }
    });

    setSections(updatedSections);
    setAuthorityBar(updatedAuthorityBar);
    setReviewsSettings(updatedReviewsSettings);
    setWhyGenounSettings(updatedWhyGenounSettings);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const nextItems = [...orderedSections];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(index, 0, draggedItem);

    setOrderedSections(nextItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    applyOrderChanges(orderedSections);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedSections.length) return;

    const nextItems = [...orderedSections];
    [nextItems[index], nextItems[nextIndex]] = [
      nextItems[nextIndex],
      nextItems[index],
    ];

    setOrderedSections(nextItems);
    applyOrderChanges(nextItems);
  };

  const toggleEnabled = (index: number) => {
    const nextItems = [...orderedSections];
    nextItems[index].isEnabled = !nextItems[index].isEnabled;
    setOrderedSections(nextItems);
    applyOrderChanges(nextItems);
  };

  const handleOrderInputChange = (index: number, value: string) => {
    const nextOrder = parseInt(value, 10);
    if (Number.isNaN(nextOrder) || nextOrder < 0) return;

    const nextItems = [...orderedSections];
    nextItems[index].order = nextOrder;
    nextItems.sort((a, b) => a.order - b.order);

    setOrderedSections(nextItems);
    applyOrderChanges(nextItems);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {formLang === "ar"
            ? "ترتيب أقسام الصفحة الرئيسية"
            : "Homepage Sections Order"}
        </CardTitle>
        <CardDescription>
          {formLang === "ar"
            ? "رتّب الأقسام بالسحب والإفلات أو باستخدام أزرار التحريك."
            : "Arrange sections using drag-and-drop or move buttons."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            {formLang === "ar"
              ? "يمكنك تعطيل القسم بدل حذفه. الأقسام المعطلة لن تظهر في الصفحة الرئيسية."
              : "You can disable a section instead of removing it. Disabled sections won't appear on the homepage."}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          {orderedSections.map((item, index) => (
            <div
              key={item.key}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={[
                "flex cursor-move items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md",
                draggedIndex === index ? "scale-95 opacity-50" : "",
                !item.isEnabled ? "bg-muted opacity-60" : "",
              ].join(" ")}
            >
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <Label className="min-w-[40px] text-xs text-muted-foreground">
                  {formLang === "ar" ? "الترتيب:" : "Order:"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={index}
                  onChange={(e) => handleOrderInputChange(index, e.target.value)}
                  className="h-8 w-16 text-center"
                />
              </div>

              <div className="flex-1">
                <p className="font-medium">
                  {formLang === "ar" ? item.label.ar : item.label.en}
                </p>
                <p className="text-xs text-muted-foreground">{item.key}</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={item.isEnabled}
                  onCheckedChange={() => toggleEnabled(index)}
                />
                <Label className="cursor-pointer text-sm">
                  {item.isEnabled ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Label>
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === orderedSections.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            {formLang === "ar"
              ? "يمكنك سحب الأقسام لإعادة ترتيبها، أو استخدام الأسهم لتحريكها لأعلى ولأسفل."
              : "Drag sections to reorder them, or use the arrows to move them up and down."}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
