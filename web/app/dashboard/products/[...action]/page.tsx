"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getProductById,
  createProduct,
  updateProduct,
  resetCurrentProduct,
  ProductVariant,
  ProductAddon,
  ProductCustomField,
} from "@/store/slices/productSlice";
import { getCategories } from "@/store/slices/categorySlice";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { LanguageSwitcher } from "@/components/dashboard/common/LanguageSwitcher";
import { bookService } from "@/store/services/bookService";
import toast from "react-hot-toast";

interface BilingualText {
  ar: string;
  en: string;
}

const createEmptyBilingual = (): BilingualText => ({ ar: "", en: "" });

const generateSlug = (text: string) => {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

interface ProductFormData {
  name: BilingualText;
  slug: string;
  shortDescription: BilingualText;
  description: BilingualText;
  categoryId: string;
  basePrice: number;
  compareAtPrice: number;
  currency: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
}

const initialFormData: ProductFormData = {
  name: createEmptyBilingual(),
  slug: "",
  shortDescription: createEmptyBilingual(),
  description: createEmptyBilingual(),
  categoryId: "",
  basePrice: 0,
  compareAtPrice: 0,
  currency: "EGP",
  isActive: true,
  isFeatured: false,
  order: 0,
};

type ProductCreationMode = "default" | "digital_book";

export default function ProductFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { locale, t } = useAdminLocale();

  const actionParam = params?.action;
  const isCreate = Array.isArray(actionParam)
    ? actionParam[0] === "create"
    : actionParam === "create";

  const isEdit = !isCreate;
  const productId = isEdit
    ? Array.isArray(actionParam)
      ? actionParam[0]
      : actionParam
    : null;

  const { currentProduct, loading } = useAppSelector((state) => state.products);
  const { categories } = useAppSelector((state) => state.categories);

  // Form language state - synced with admin locale
  const [formLang, setFormLang] = useState<"ar" | "en">("ar");

  // Form state
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [customFields, setCustomFields] = useState<ProductCustomField[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [creationMode, setCreationMode] = useState<ProductCreationMode>("default");
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync formLang with admin locale
  useEffect(() => {
    if (locale === "ar" || locale === "en") {
      setFormLang(locale);
    }
  }, [locale]);

  // Load categories
  useEffect(() => {
    dispatch(getCategories({}));
  }, [dispatch]);

  useEffect(() => {
    if (!isCreate) return;
    const requestedType = searchParams.get("type");
    if (requestedType === "digital_book") {
      setCreationMode("digital_book");
    }
  }, [isCreate, searchParams]);

  // Load product if editing
  useEffect(() => {
    if (isEdit && productId) {
      dispatch(getProductById(productId));
    }
    return () => {
      dispatch(resetCurrentProduct());
    };
  }, [isEdit, productId, dispatch]);

  // Populate form when product loads
  useEffect(() => {
    if (isEdit && currentProduct) {
      setFormData({
        name: currentProduct.name || createEmptyBilingual(),
        slug: currentProduct.slug || "",
        shortDescription:
          currentProduct.shortDescription || createEmptyBilingual(),
        description: currentProduct.description || createEmptyBilingual(),
        categoryId: currentProduct.categoryId || "",
        basePrice: currentProduct.basePrice || 0,
        compareAtPrice: currentProduct.compareAtPrice || 0,
        currency: currentProduct.currency || "EGP",
        isActive: currentProduct.isActive ?? true,
        isFeatured: currentProduct.isFeatured ?? false,
        order: currentProduct.order || 0,
      });
      setVariants(currentProduct.variants || []);
      setAddons(currentProduct.addons || []);
      setCustomFields(currentProduct.customFields || []);
      if (currentProduct.coverImage) {
        setCoverImagePreview(currentProduct.coverImage);
      }
      if (currentProduct.gallery) {
        setExistingGallery(currentProduct.gallery);
      }
      setCreationMode("default");
    }
  }, [isEdit, currentProduct]);

  // Handle text input
  const handleTextChange = (field: keyof ProductFormData, value: string) => {
    if (
      field === "name" ||
      field === "shortDescription" ||
      field === "description"
    ) {
      setFormData((prev) => ({
        ...prev,
        [field]: { ...(prev[field] as BilingualText), [formLang]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Handle cover image
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Add variant
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: createEmptyBilingual(),
        price: 0,
        isDefault: prev.length === 0,
      },
    ]);
  };

  // Update variant
  const updateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: any
  ) => {
    setVariants((prev) => {
      const updated = [...prev];
      if (field === "name") {
        updated[index] = {
          ...updated[index],
          name: { ...updated[index].name, [formLang]: value },
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Remove variant
  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Add addon
  const addAddon = () => {
    setAddons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: createEmptyBilingual(),
        price: 0,
      },
    ]);
  };

  // Update addon
  const updateAddon = (
    index: number,
    field: keyof ProductAddon,
    value: any
  ) => {
    setAddons((prev) => {
      const updated = [...prev];
      if (field === "name") {
        updated[index] = {
          ...updated[index],
          name: { ...updated[index].name, [formLang]: value },
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Remove addon
  const removeAddon = (index: number) => {
    setAddons((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Custom Field
  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      {
        label: createEmptyBilingual(),
        type: "text",
        required: false,
        placeholder: createEmptyBilingual(),
      },
    ]);
  };

  // Update Custom Field
  const updateCustomField = (
    index: number,
    field: keyof ProductCustomField | "label" | "placeholder",
    value: any
  ) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      if (field === "label" || field === "placeholder") {
        updated[index] = {
          ...updated[index],
          [field]: { ...updated[index][field], [formLang]: value },
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Remove Custom Field
  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Backend schema requires both languages for name.
    if (!formData.name.ar?.trim() || !formData.name.en?.trim()) {
      toast.error(
        (t("admin.products.nameBothLanguages") as any) ||
          "Product name is required in Arabic and English"
      );
      return;
    }

    setSubmitting(true);

    try {
      const resolvedSlug =
        formData.slug?.trim() ||
        generateSlug(formData.name.en || formData.name.ar || "");

      if (!resolvedSlug) {
        toast.error(
          (t("admin.products.slugAutoFailed") as any) ||
            "Could not generate product slug"
        );
        return;
      }

      const data = new FormData();
      data.append("name", JSON.stringify(formData.name));
      data.append("slug", resolvedSlug);
      data.append(
        "shortDescription",
        JSON.stringify(formData.shortDescription)
      );
      data.append("description", JSON.stringify(formData.description));
      // Avoid sending empty string which can trigger CastError in mongoose for ObjectId.
      if (formData.categoryId) {
        data.append("categoryId", formData.categoryId);
      }
      data.append("basePrice", String(formData.basePrice));
      data.append("compareAtPrice", String(formData.compareAtPrice));
      data.append("currency", formData.currency);
      data.append("isActive", String(formData.isActive));
      data.append("isFeatured", String(formData.isFeatured));
      data.append("order", String(formData.order));
      data.append("variants", JSON.stringify(variants));
      data.append("addons", JSON.stringify(addons));
      data.append("customFields", JSON.stringify(customFields));

      if (coverImage) {
        data.append(creationMode === "digital_book" ? "cover" : "coverImage", coverImage);
      }

      galleryFiles.forEach((file) => {
        data.append("gallery", file);
      });

      if (isEdit && existingGallery.length > 0) {
        data.append("existingGallery", JSON.stringify(existingGallery));
      }

      if (isCreate && creationMode === "digital_book") {
        if (!bookFile) {
          toast.error(
            locale === "ar" ? "من فضلك ارفع ملف الكتاب PDF" : "Please upload the book PDF file"
          );
          return;
        }
        data.append("pdf", bookFile);
        await bookService.createBook(data);
        toast.success(
          locale === "ar" ? "تم إضافة منتج الكتاب الرقمي بنجاح" : "Digital book product created successfully"
        );
        router.push("/dashboard/books");
      } else if (isEdit && productId) {
        await dispatch(updateProduct({ id: productId, data })).unwrap();
        toast.success(t("admin.products.productUpdated"));
      } else {
        await dispatch(createProduct(data)).unwrap();
        toast.success(t("admin.products.productCreated"));
      }

      router.push("/dashboard/products");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isRtl = formLang === "ar";

  return (
    <div className="p-6 max-w-4xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit
              ? t("admin.products.editProduct")
              : creationMode === "digital_book"
                ? locale === "ar"
                  ? "إضافة منتج كتاب رقمي"
                  : "Create Digital Book Product"
                : t("admin.products.createProduct")}
          </h1>
        </div>

        {/* Language Switcher - Same component used in services */}
        <LanguageSwitcher />
      </div>

      {isCreate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={creationMode === "default" ? "default" : "outline"}
                onClick={() => setCreationMode("default")}
              >
                {locale === "ar" ? "إضافة منتج عادي" : "Add Regular Product"}
              </Button>
              <Button
                type="button"
                variant={creationMode === "digital_book" ? "default" : "outline"}
                onClick={() => setCreationMode("digital_book")}
              >
                {locale === "ar" ? "إضافة منتج كتاب رقمي" : "Add Digital Book Product"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.products.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label>{t("admin.products.productName")}</Label>
              <Input
                value={(formData.name as BilingualText)[formLang]}
                onChange={(e) => handleTextChange("name", e.target.value)}
                placeholder={t("admin.products.productNamePlaceholder")}
                dir={formLang === "ar" ? "rtl" : "ltr"}
              />
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label>{t("admin.products.shortDescription")}</Label>
              <Textarea
                value={(formData.shortDescription as BilingualText)[formLang]}
                onChange={(e) =>
                  handleTextChange("shortDescription", e.target.value)
                }
                placeholder={t("admin.products.shortDescriptionPlaceholder")}
                dir={formLang === "ar" ? "rtl" : "ltr"}
                rows={2}
              />
            </div>

            {/* Full Description */}
            <div className="space-y-2">
              <Label>{t("admin.products.fullDescription")}</Label>
              <Textarea
                value={(formData.description as BilingualText)[formLang]}
                onChange={(e) =>
                  handleTextChange("description", e.target.value)
                }
                placeholder={t("admin.products.fullDescriptionPlaceholder")}
                dir={formLang === "ar" ? "rtl" : "ltr"}
                rows={4}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>{t("admin.products.category")}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, categoryId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.products.selectCategory")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {(cat.name as BilingualText)[locale] || cat.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, isActive: v }))
                  }
                />
                <Label>{t("admin.products.isActive")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, isFeatured: v }))
                  }
                />
                <Label>{t("admin.products.isFeatured")}</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.products.pricing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.products.basePrice")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basePrice: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.products.compareAtPrice")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.compareAtPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compareAtPrice: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.products.currency")}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, currency: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EGP">EGP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.products.media")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("admin.products.coverImage")}</Label>
              {coverImagePreview ? (
                <div className="relative w-48 h-48">
                  <img
                    src={coverImagePreview}
                    alt="Cover"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {t("admin.payments.uploadImage")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageChange}
                  />
                </label>
              )}
            </div>
            {isCreate && creationMode === "digital_book" && (
              <div className="space-y-2 pt-4">
                <Label>{locale === "ar" ? "ملف الكتاب (PDF)" : "Book File (PDF)"}</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setBookFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  {bookFile
                    ? bookFile.name
                    : locale === "ar"
                      ? "ارفع ملف PDF ليتاح للشراء بعد المراجعة."
                      : "Upload a PDF file to be sold after approval."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("admin.products.variants")}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("admin.products.addVariant")}
              </Button>
            </div>
            <CardDescription>
              {t("admin.products.variants")} ({variants.length})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                className="flex items-end gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <Label>{t("admin.products.variantName")}</Label>
                  <Input
                    value={variant.name[formLang]}
                    onChange={(e) =>
                      updateVariant(index, "name", e.target.value)
                    }
                    placeholder={t("admin.products.variantName")}
                    dir={formLang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>{t("admin.products.variantPrice")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={variant.price}
                    onChange={(e) =>
                      updateVariant(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={variant.isDefault}
                    onCheckedChange={(v) =>
                      updateVariant(index, "isDefault", v)
                    }
                  />
                  <Label className="text-xs">
                    {t("admin.products.isDefaultVariant")}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500"
                  onClick={() => removeVariant(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {variants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("admin.products.noProducts")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Addons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("admin.products.addons")}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAddon}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("admin.products.addAddon")}
              </Button>
            </div>
            <CardDescription>
              {t("admin.products.addons")} ({addons.length})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {addons.map((addon, index) => (
              <div
                key={addon.id}
                className="flex items-end gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <Label>{t("admin.products.addonName")}</Label>
                  <Input
                    value={addon.name[formLang]}
                    onChange={(e) => updateAddon(index, "name", e.target.value)}
                    placeholder={t("admin.products.addonName")}
                    dir={formLang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>{t("admin.products.addonPrice")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={addon.price}
                    onChange={(e) =>
                      updateAddon(
                        index,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500"
                  onClick={() => removeAddon(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {addons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("admin.products.noProducts")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Custom Fields */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {t("admin.products.customFields") || "Custom Fields"}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomField}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("admin.products.addField") || "Add Field"}
              </Button>
            </div>
            <CardDescription>
              {t("admin.products.customFieldsDesc") ||
                "Define custom fields for this product (e.g., Domain Name, Requirements)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.map((field, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50/50"
              >
                <div className="flex items-start gap-4">
                  {/* Label */}
                  <div className="flex-1 space-y-2">
                    <Label>
                      {t("admin.products.fieldLabel") || "Label"} (
                      {formLang.toUpperCase()})
                    </Label>
                    <Input
                      value={field.label?.[formLang] || ""}
                      onChange={(e) =>
                        updateCustomField(index, "label", e.target.value)
                      }
                      placeholder={t("admin.products.fieldLabel") || "Label"}
                      dir={formLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  {/* Type */}
                  <div className="w-1/4 space-y-2">
                    <Label>{t("admin.products.fieldType") || "Type"}</Label>
                    <Select
                      value={field.type}
                      onValueChange={(v) => updateCustomField(index, "type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wrapper for Delete */}
                  <div className="pt-8">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => removeCustomField(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Placeholder */}
                  <div className="flex-1 space-y-2">
                    <Label>
                      {t("admin.products.placeholder") || "Placeholder"}
                    </Label>
                    <Input
                      value={field.placeholder?.[formLang] || ""}
                      onChange={(e) =>
                        updateCustomField(index, "placeholder", e.target.value)
                      }
                      placeholder={
                        t("admin.products.placeholder") || "Placeholder"
                      }
                      dir={formLang === "ar" ? "rtl" : "ltr"}
                    />
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(v) =>
                        updateCustomField(index, "required", v)
                      }
                    />
                    <Label className="cursor-pointer">
                      {t("admin.products.isRequired") || "Required"}
                    </Label>
                  </div>
                </div>
              </div>
            ))}
            {customFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("admin.products.noCustomFields") ||
                  "No custom fields defined."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="sticky bottom-0 z-10 flex justify-end gap-4 bg-background p-4 border-t mt-6 -mx-6 px-6 shadow-sm">
          <Link href="/dashboard/products">
            <Button type="button" variant="outline">
              {t("common.cancel")}
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 bg-primary hover:bg-primary/90 min-w-[150px]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting
              ? locale === "ar"
                ? "جاري الحفظ..."
                : "Saving..."
              : isCreate && creationMode === "digital_book"
                ? locale === "ar"
                  ? "إضافة منتج كتاب رقمي"
                  : "Create Digital Book Product"
                : t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
