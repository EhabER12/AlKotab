"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";

interface ServiceFormData {
  title: { ar: string; en: string };
  slug: string;
  shortDescription: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: string;
  category: string;
  pricingType: string;
  startingPrice: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
}

interface ServiceBasicInfoProps {
  formData: ServiceFormData;
  setFormData: (data: ServiceFormData) => void;
  formLang: "ar" | "en";
}

const categories = [
  { value: "salla", labelAr: "تطوير سلة", labelEn: "Salla Development" },
  { value: "shopify", labelAr: "متاجر شوبيفاي", labelEn: "Shopify Stores" },
  { value: "websites", labelAr: "مواقع مخصصة", labelEn: "Custom Websites" },
  { value: "seo", labelAr: "تحسين محركات البحث", labelEn: "SEO & Performance" },
  { value: "branding", labelAr: "الهوية البصرية", labelEn: "Branding" },
  { value: "other", labelAr: "خدمات أخرى", labelEn: "Other Services" },
];

const pricingTypes = [
  { value: "quote", labelAr: "عرض سعر", labelEn: "Request Quote" },
  { value: "fixed", labelAr: "سعر ثابت", labelEn: "Fixed Price" },
  { value: "tiers", labelAr: "باقات", labelEn: "Pricing Tiers" },
];

export function ServiceBasicInfo({
  formData,
  setFormData,
  formLang,
}: ServiceBasicInfoProps) {
  const { t } = useAdminLocale();

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">
        {t("admin.services.basicInfo")}
      </h2>

      {/* Title */}
      <div>
        <Label>
          {t("admin.services.serviceTitle")}
          <span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          value={formData.title[formLang]}
          onChange={(e) =>
            setFormData({
              ...formData,
              title: { ...formData.title, [formLang]: e.target.value },
            })
          }
          placeholder={formLang === "ar" ? "عنوان الخدمة" : "Service Title"}
          dir={formLang === "ar" ? "rtl" : "ltr"}
          required
        />
      </div>

      {/* Slug */}
      <div>
        <Label>{t("admin.services.slug")}</Label>
        <Input
          value={formData.slug}
          onChange={(e) =>
            setFormData({
              ...formData,
              slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
            })
          }
          placeholder="service-slug"
          dir="ltr"
          required
        />
      </div>

      {/* Category & Pricing Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>{t("admin.services.category")}</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {formLang === "ar" ? cat.labelAr : cat.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("admin.services.pricingType")}</Label>
          <Select
            value={formData.pricingType}
            onValueChange={(value) =>
              setFormData({ ...formData, pricingType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pricingTypes.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {formLang === "ar" ? pt.labelAr : pt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fixed Price Input */}
      {formData.pricingType === "fixed" && (
        <div>
          <Label>{t("admin.services.fixedPrice")} (EGP)</Label>
          <Input
            type="number"
            value={formData.startingPrice}
            onChange={(e) =>
              setFormData({ ...formData, startingPrice: e.target.value })
            }
            placeholder="0.00"
            dir="ltr"
          />
        </div>
      )}

      {/* Short Description */}
      <div>
        <Label>{t("admin.services.shortDescription")}</Label>
        <Textarea
          value={formData.shortDescription[formLang]}
          onChange={(e) =>
            setFormData({
              ...formData,
              shortDescription: {
                ...formData.shortDescription,
                [formLang]: e.target.value,
              },
            })
          }
          placeholder={
            formLang === "ar" ? "وصف مختصر للخدمة" : "Short service description"
          }
          dir={formLang === "ar" ? "rtl" : "ltr"}
          rows={2}
        />
      </div>

      {/* Full Description */}
      <div>
        <Label>{t("admin.services.fullDescription")}</Label>
        <Textarea
          value={formData.description[formLang]}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: {
                ...formData.description,
                [formLang]: e.target.value,
              },
            })
          }
          placeholder={
            formLang === "ar" ? "وصف تفصيلي للخدمة" : "Full service description"
          }
          dir={formLang === "ar" ? "rtl" : "ltr"}
          rows={6}
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
          />
          <Label>{t("admin.services.active")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isFeatured}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isFeatured: checked })
            }
          />
          <Label>{t("admin.services.featured")}</Label>
        </div>
      </div>
    </div>
  );
}
