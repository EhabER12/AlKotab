"use client";

import { Button } from "@/components/ui/button";
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
import { Plus, Trash2 } from "lucide-react";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";

interface PricingTierItem {
  name: { ar: string; en: string };
  price: number | null;
  currency: string;
  description: { ar: string; en: string };
  features: { ar: string[]; en: string[] };
  isPopular: boolean;
}

interface ServicePricingTiersProps {
  pricingTiers: PricingTierItem[];
  setPricingTiers: (tiers: PricingTierItem[]) => void;
  formLang: "ar" | "en";
}

export function ServicePricingTiers({
  pricingTiers,
  setPricingTiers,
  formLang,
}: ServicePricingTiersProps) {
  const { t } = useAdminLocale();

  const addPricingTier = () => {
    setPricingTiers([
      ...pricingTiers,
      {
        name: { ar: "", en: "" },
        price: null,
        currency: "EGP",
        description: { ar: "", en: "" },
        features: { ar: [], en: [] },
        isPopular: false,
      },
    ]);
  };

  const removePricingTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  const updatePricingTier = (index: number, field: string, value: any) => {
    const updated = [...pricingTiers];
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      (updated[index] as any)[parent][child] = value;
    } else {
      (updated[index] as any)[field] = value;
    }
    setPricingTiers(updated);
  };

  const updatePricingTierFeatures = (
    index: number,
    lang: "ar" | "en",
    featuresString: string
  ) => {
    const updated = [...pricingTiers];
    updated[index].features[lang] = featuresString
      .split("\n")
      .filter((f) => f.trim() !== "");
    setPricingTiers(updated);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-gray-900">
          {t("admin.services.pricingTiers")}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPricingTier}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t("admin.services.addTier")}
        </Button>
      </div>

      {pricingTiers.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          {t("admin.services.noTiersYet")}
        </p>
      )}

      {pricingTiers.map((tier, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg space-y-4 ${
            tier.isPopular
              ? "bg-[#04524B]/10 border-2 border-[#04524B]"
              : "bg-white border border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {t("admin.services.tier")} {index + 1}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={tier.isPopular}
                  onCheckedChange={(checked) =>
                    updatePricingTier(index, "isPopular", checked)
                  }
                />
                <span className="text-xs text-gray-500">
                  {t("admin.services.popular")}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePricingTier(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tier Name */}
          <div>
            <Label className="text-xs">{t("admin.services.tierName")}</Label>
            <Input
              placeholder={
                formLang === "ar" ? "أدخل اسم الباقة" : "Enter tier name"
              }
              value={tier.name[formLang]}
              onChange={(e) =>
                updatePricingTier(index, `name.${formLang}`, e.target.value)
              }
              dir={formLang === "ar" ? "rtl" : "ltr"}
            />
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("admin.services.price")}</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={tier.price || ""}
                onChange={(e) =>
                  updatePricingTier(
                    index,
                    "price",
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-xs">{t("admin.services.currency")}</Label>
              <Select
                value={tier.currency}
                onValueChange={(value) =>
                  updatePricingTier(index, "currency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">
              {t("admin.services.tierDescription")}
            </Label>
            <Textarea
              placeholder={
                formLang === "ar" ? "أدخل وصف الباقة" : "Enter tier description"
              }
              value={tier.description[formLang]}
              onChange={(e) =>
                updatePricingTier(
                  index,
                  `description.${formLang}`,
                  e.target.value
                )
              }
              dir={formLang === "ar" ? "rtl" : "ltr"}
              rows={2}
            />
          </div>

          {/* Features */}
          <div>
            <Label className="text-xs">
              {t("admin.services.featuresPerLine")}
            </Label>
            <Textarea
              placeholder={
                formLang === "ar"
                  ? "ميزة 1\nميزة 2\nميزة 3"
                  : "Feature 1\nFeature 2\nFeature 3"
              }
              value={tier.features[formLang].join("\n")}
              onChange={(e) =>
                updatePricingTierFeatures(index, formLang, e.target.value)
              }
              dir={formLang === "ar" ? "rtl" : "ltr"}
              rows={3}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
