"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Image as ImageIcon,
  User,
  CreditCard as CreditCardIcon,
  Banknote,
  Upload,
  TicketPercent,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  initializeCart,
  clearCart,
  getCartItemCount,
  CartItem,
} from "@/store/slices/cartSlice";
import {
  getManualPaymentMethodsThunk,
  getPaymentGatewaysThunk,
  ManualPaymentMethod,
} from "@/store/services/settingsService";
import {
  createCustomerManualPaymentThunk,
  createPaypalPaymentThunk,
  createCashierPaymentThunk,
} from "@/store/services/paymentService";
import {
  validateCouponThunk,
  type ValidateCouponResponse,
} from "@/store/services/couponService";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { countries } from "@/constants/countries";
import {
  markSessionConverted,
} from "@/store/services/cartSessionService";
import { useAuth } from "@/components/auth/auth-provider";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

// Get localized text helper
const getLocalizedText = (
  text: { ar: string; en: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

const getCartItemCurrency = (item: CartItem | undefined): string => {
  if (!item) return "EGP";
  if (item.itemType === "course") return item.course?.currency || "EGP";
  return item.product?.currency || "EGP";
};

type CurrencyCode = "SAR" | "EGP" | "USD";

const normalizeCurrency = (currency?: string): CurrencyCode => {
  if (currency === "EGP" || currency === "USD" || currency === "SAR") {
    return currency;
  }
  return "EGP";
};

const getCartItemUnitPrice = (item: CartItem): number => {
  if (item.itemType === "course") return Number(item.course?.price || 0);
  return (
    (item.variant?.price ?? item.product?.basePrice ?? 0) +
    item.addons.reduce((sum, addon) => sum + addon.price, 0)
  );
};

const getCartItemLineTotal = (item: CartItem): number => {
  return getCartItemUnitPrice(item) * item.quantity;
};

const getCartItemName = (item: CartItem, locale: string): string => {
  if (item.itemType === "course") {
    return getLocalizedText(item.course?.title, locale);
  }
  return getLocalizedText(item.product?.name, locale);
};

const getCartItemImage = (item: CartItem): string | undefined => {
  if (item.itemType === "course") return item.course?.thumbnail;
  return item.product?.coverImage;
};

export default function CheckoutPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";
  const isRtl = locale === "ar";
  const t = useTranslations();

  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { manualPaymentMethods } = useAppSelector((state) => state.settings);
  const { user } = useAppSelector((state) => state.auth);
  const { userData } = useAuth();
  const { selectedCurrency, convert, format, exchangeRates } = useCurrencyContext();

  // Determine if user is logged in
  const isLoggedIn = !!user?.token;
  const checkoutPath = `/${locale}/checkout`;
  const loginHref = `/${locale}/login?redirect=${encodeURIComponent(
    checkoutPath
  )}`;
  const registerHref = `/${locale}/register?redirect=${encodeURIComponent(
    checkoutPath
  )}`;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    address: "",
    city: "",
    country: "",
  });
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [itemsData, setItemsData] = useState<
    Record<number, Record<string, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [gateways, setGateways] = useState<any>({});
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);

  // Initialize cart and fetch payment methods
  useEffect(() => {
    dispatch(initializeCart());
    dispatch(getManualPaymentMethodsThunk());
    dispatch(getPaymentGatewaysThunk()).unwrap().then(setGateways).catch(console.error);
  }, [dispatch]);

  const displayLocale = isRtl ? "ar" : "en";
  const total = items.reduce((sum, item) => {
    return (
      sum +
      convert(
        getCartItemLineTotal(item),
        normalizeCurrency(getCartItemCurrency(item)),
        selectedCurrency
      )
    );
  }, 0);
  const roundedTotal = Number(total.toFixed(2));
  const itemCount = getCartItemCount(items);
  const checkoutCurrency: CurrencyCode = selectedCurrency;
  const discountAmount = Number(appliedCoupon?.discountAmount || 0);
  const finalTotal = Number(Math.max(roundedTotal - discountAmount, 0).toFixed(2));

  type CheckoutItemPayload = {
    itemType: "product" | "course";
    itemId: string;
    quantity: number;
    variantId?: string;
    addonIds?: string[];
    customFields?: Array<{ label: string; value: string }>;
  };

  const checkoutItemsPayload: CheckoutItemPayload[] = items.map((item, index) => {
    if (item.itemType === "course") {
      return {
        itemType: "course",
        itemId: item.courseId || item.itemId,
        quantity: item.quantity,
        customFields: [],
      };
    }

    return {
      itemType: "product",
      itemId: item.productId || item.itemId,
      quantity: item.quantity,
      variantId: item.variantId,
      addonIds: item.addonIds,
      customFields: item.product?.customFields?.map((f, fIndex) => ({
        label: getLocalizedText(f.label, "en"),
        value: itemsData[index]?.[fIndex] || "",
      })),
    };
  });

  // Pre-fill form with user data when logged in
  useEffect(() => {
    if (userData && isLoggedIn) {
      setFormData((prev) => ({
        ...prev,
        name: userData.name || prev.name,
        email: userData.email || prev.email,
      }));
    }
  }, [userData, isLoggedIn]);

  useEffect(() => {
    if (!appliedCoupon) return;
    if (roundedTotal <= 0) {
      setAppliedCoupon(null);
      return;
    }
    if (checkoutCurrency !== appliedCoupon.currency) {
      setAppliedCoupon(null);
      return;
    }
    if (Math.abs(Number(appliedCoupon.originalAmount) - roundedTotal) > 0.01) {
      setAppliedCoupon(null);
    }
  }, [appliedCoupon, roundedTotal, checkoutCurrency]);

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle custom field change
  const handleItemFieldChange = (
    itemIndex: number,
    fieldIndex: number,
    value: string
  ) => {
    setItemsData((prev) => ({
      ...prev,
      [itemIndex]: {
        ...(prev[itemIndex] || {}),
        [fieldIndex]: value,
      },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCodeInput.trim();
    if (!code) {
      toast.error(isRtl ? "أدخل كود الكوبون" : "Enter a coupon code");
      return;
    }
    if (!isLoggedIn) {
      toast.error(
        isRtl
          ? "سجل دخولك أولاً لاستخدام الكوبون"
          : "Please login first to use a coupon"
      );
      return;
    }
    if (roundedTotal <= 0) {
      toast.error(isRtl ? "قيمة الطلب غير صالحة" : "Invalid order amount");
      return;
    }

    try {
      setCouponApplying(true);
      const result = await dispatch(
        validateCouponThunk({
          code,
          amount: roundedTotal,
          currency: checkoutCurrency,
          context: "checkout",
        })
      ).unwrap();

      setAppliedCoupon(result);
      setCouponCodeInput(result.code);
      toast.success(
        isRtl
          ? `تم تطبيق الكوبون (-${result.discountAmount} ${result.currency})`
          : `Coupon applied (-${result.discountAmount} ${result.currency})`
      );
    } catch (error: any) {
      setAppliedCoupon(null);
      toast.error(error || (isRtl ? "كوبون غير صالح" : "Invalid coupon"));
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
  };

  // Handle checkout submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error(
        isRtl
          ? "يرجى تسجيل الدخول أو إنشاء حساب قبل إتمام الطلب"
          : "Please login or create an account before placing your order"
      );
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error(t("checkout.name") + " is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error(t("checkout.email") + " is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error(t("checkout.phone") + " is required");
      return;
    }
    if (!selectedMethodId) {
      toast.error(t("checkout.paymentMethod") + " is required");
      return;
    }

    if (couponCodeInput.trim() && !appliedCoupon) {
      toast.error(
        isRtl
          ? "اضغط تطبيق الكوبون قبل تأكيد الطلب"
          : "Please apply the coupon before placing the order"
      );
      return;
    }

    const selectedMethod = manualPaymentMethods.find(
      (m) => m._id === selectedMethodId
    );
    // Only check proof if it's a manual method (not paypal/cashier) and requires it
    if (selectedMethodId !== "paypal" && selectedMethodId !== "cashier" && selectedMethod?.requiresAttachment && !paymentProof) {
      toast.error(t("admin.payments.paymentProof") + " is required");
      return;
    }

    // Validate Custom Fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.itemType === "product" && item.product?.customFields) {
        for (
          let fIndex = 0;
          fIndex < item.product.customFields.length;
          fIndex++
        ) {
          const field = item.product.customFields[fIndex];
          if (field.required) {
            const val = itemsData[i]?.[fIndex];
            if (!val || !val.trim()) {
              const label = getLocalizedText(field.label, locale);
              toast.error(
                `${getLocalizedText(
                  item.product?.name,
                  locale
                )}: ${label} is required`
              );
              return;
            }
          }
        }
      }
    }

    setSubmitting(true);

    try {
      // 1. PayPal
      if (selectedMethodId === "paypal") {
        const response = await dispatch(createPaypalPaymentThunk({
          currency: checkoutCurrency,
          items: checkoutItemsPayload,
          locale,
          couponCode: appliedCoupon?.code,
          billingInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          },
        })).unwrap();

        if (response.approvalUrl) {
          window.location.href = response.approvalUrl;
          return;
        } else if ((response as any).links) { // Fallback if structure differs
          const link = (response as any).links.find((l: any) => l.rel === 'approve');
          if (link) {
            window.location.href = link.href;
            return;
          }
        }
      }
      // 2. Kashier (Payment Sessions API v3)
      else if (selectedMethodId === "cashier") {
        const response = await dispatch(createCashierPaymentThunk({
          currency: checkoutCurrency,
          items: checkoutItemsPayload,
          couponCode: appliedCoupon?.code,
          customer: {
            name: formData.name,
            email: formData.email
          }
        })).unwrap();

        // Redirect to Kashier payment session URL
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
          return;
        } else {
          throw new Error(isRtl ? "فشل في إنشاء جلسة الدفع" : "Failed to create payment session");
        }
      }
      // 3. Manual Payment (Existing Logic)
      else {
        // Compress image if it's too large (> 2MB) - helps mobile users
        let processedProof = paymentProof;
        if (paymentProof && paymentProof.size > 2 * 1024 * 1024) {
          toast.loading(isRtl ? "جاري ضغط الصورة..." : "Compressing image...", {
            id: "compress",
          });
          try {
            processedProof = await compressImage(paymentProof);
            toast.dismiss("compress");
          } catch (compressError) {
            toast.dismiss("compress");
            console.warn(
              "Image compression failed, using original",
              compressError
            );
          }
        }

        const paymentData = {
          pricingTierId: "checkout_order", // Placeholder required by backend
          manualPaymentMethodId: selectedMethodId,
          paymentProof: processedProof || undefined,
          couponCode: appliedCoupon?.code,
          billingInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address || "",
            city: formData.city || "",
            country: formData.country,
            items: checkoutItemsPayload,
          },
          items: checkoutItemsPayload,
          currency: checkoutCurrency,
        };

        await dispatch(createCustomerManualPaymentThunk(paymentData)).unwrap();

        // Clear cart and show success
        dispatch(clearCart());
        setOrderSuccess(true);
        toast.success(t("checkout.orderSuccessMessage"));

        // Mark cart session as converted
        markSessionConverted();
      }
    } catch (err: any) {
      // Better error messages for common issues
      let errorMessage = isRtl ? "فشل في إتمام الطلب" : "Failed to place order";

      if (typeof err === "string") {
        errorMessage = err;
      } else if (err.message) {
        // Network errors
        if (
          err.message.includes("Network Error") ||
          err.message.includes("ECONNABORTED")
        ) {
          errorMessage = isRtl
            ? "خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
            : "Connection error. Please check your internet and try again.";
        } else if (err.message.includes("timeout")) {
          errorMessage = isRtl
            ? "انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى."
            : "Request timed out. Please try again.";
        } else {
          errorMessage = err.message;
        }
      }

      toast.error(errorMessage);
      console.error("Checkout error:", err);
      // Don't set submitting false if we are redirecting (logic simplified here)
      // Actually if redirecting we might unmount, but if error we stay.
      // For redirects, we want to keep spinner.
      if (selectedMethodId === "paypal" || selectedMethodId === "cashier") {
        // If error occurred, stop spinner
        setSubmitting(false);
      } else {
        setSubmitting(false);
      }
    } finally {
      if (selectedMethodId !== "paypal" && selectedMethodId !== "cashier") {
        setSubmitting(false);
      }
    }
  };

  // Helper function to compress images for mobile
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;

        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              reject(new Error("Compression failed"));
            }
          },
          "image/jpeg",
          0.8
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Success state
  if (orderSuccess) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center p-8"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("checkout.orderSuccess")}
            </h2>
            <p className="text-muted-foreground mb-2">
              {t("checkout.orderSuccessMessage")}
            </p>
            <p className="text-sm text-muted-foreground/80 mb-6">
              {t("checkout.orderSuccessSubtitle")}
            </p>
            <Link href={`/${locale}`}>
              <Button size="lg">{t("checkout.backToHome")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center p-8"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("cart.empty")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("cart.emptyMessage")}
            </p>
            <Link href={`/${locale}/products`}>
              <Button size="lg">{t("cart.continueShopping")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/products`}>
              <Button variant="ghost" size="icon">
                {isRtl ? (
                  <ArrowRight className="h-5 w-5" />
                ) : (
                  <ArrowLeft className="h-5 w-5" />
                )}
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              {!isLoggedIn && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg text-amber-900">
                      {isRtl ? "تسجيل الدخول مطلوب" : "Login required"}
                    </CardTitle>
                    <CardDescription className="text-amber-800">
                      {isRtl
                        ? "لا يمكن إتمام الطلب كزائر. سجل الدخول أو أنشئ حسابًا ثم أكمل الدفع."
                        : "Guest checkout is not available. Please login or create an account to continue."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button asChild>
                      <Link href={loginHref}>
                        {isRtl ? "تسجيل الدخول" : "Login"}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={registerHref}>
                        {isRtl ? "إنشاء حساب" : "Create account"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("checkout.contactInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("checkout.name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("checkout.email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      readOnly={isLoggedIn}
                      className={
                        isLoggedIn ? "bg-muted cursor-not-allowed" : ""
                      }
                    />
                    {isLoggedIn && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t("checkout.loggedInAs")} {userData?.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("checkout.phone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t("checkout.city")}</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t("checkout.country")}</Label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            country: e.target.value,
                          }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="" disabled>
                          {t("checkout.country")}
                        </option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("checkout.notes")}</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder={t("checkout.notesPlaceholder")}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Custom Fields */}
              {items.map((item, index) => {
                const fields =
                  item.itemType === "product" ? item.product?.customFields || [] : [];
                if (fields.length === 0) return null;

                return (
                  <Card key={`item-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {getCartItemName(item, locale)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field, fIndex) => {
                        const label = getLocalizedText(field.label, locale);
                        const placeholder = getLocalizedText(
                          field.placeholder,
                          locale
                        );

                        return (
                          <div key={fIndex} className="space-y-2">
                            <Label>
                              {label}{" "}
                              {field.required && (
                                <span className="text-red-500">*</span>
                              )}
                            </Label>
                            {field.type === "textarea" ? (
                              <Textarea
                                placeholder={placeholder}
                                required={field.required}
                                value={itemsData[index]?.[fIndex] || ""}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    fIndex,
                                    e.target.value
                                  )
                                }
                              />
                            ) : (
                              <Input
                                type={
                                  field.type === "number"
                                    ? "number"
                                    : field.type === "email"
                                      ? "email"
                                      : "text"
                                }
                                placeholder={placeholder}
                                required={field.required}
                                value={itemsData[index]?.[fIndex] || ""}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    fIndex,
                                    e.target.value
                                  )
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("checkout.paymentMethod")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={selectedMethodId}
                    onValueChange={setSelectedMethodId}
                    className="space-y-3"
                  >
                    {/* PayPal Option */}
                    {gateways?.paypal?.isEnabled && (
                      <div
                        className={`rounded-xl border-2 transition-all overflow-hidden ${selectedMethodId === "paypal"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50"
                          }`}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <label className="flex items-center gap-4 p-4 cursor-pointer">
                          <RadioGroupItem value="paypal" id="paypal" />
                          <Banknote className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="font-medium">PayPal</p>
                            <p className="text-sm text-muted-foreground">
                              {isRtl ? "الدفع الآمن عبر باي بال" : "Secure payment via PayPal"}
                            </p>
                          </div>
                        </label>
                        {selectedMethodId === "paypal" && checkoutCurrency !== "USD" && (
                          <div className="px-4 pb-3">
                            <div className="text-sm bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg p-3 flex items-center gap-2">
                              <span className="text-base">💱</span>
                              <span>
                                {(() => {
                                  const currency = checkoutCurrency;
                                  const rate = exchangeRates[currency] || 0;
                                  const usdAmount = rate > 0 ? (finalTotal / rate).toFixed(2) : "...";
                                  return isRtl
                                    ? `سيتم تحويل ${finalTotal} ${currency} إلى $${usdAmount} USD عبر PayPal`
                                    : `${finalTotal} ${currency} will be converted to $${usdAmount} USD via PayPal`;
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cashier Option */}
                    {gateways?.cashier?.isEnabled && (
                      <div
                        className={`rounded-xl border-2 transition-all overflow-hidden ${selectedMethodId === "cashier"
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50"
                          }`}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <label className="flex items-center gap-4 p-4 cursor-pointer">
                          <RadioGroupItem value="cashier" id="cashier" />
                          <CreditCardIcon className="h-6 w-6 text-purple-600" />
                          <div>
                            <p className="font-medium">{isRtl ? "بطاقة ائتمان / ميزة" : "Credit Card / Meeza"}</p>
                            <p className="text-sm text-muted-foreground">
                              {isRtl ? "الدفع السريع بالبطاقات" : "Fast payment via Cards/Wallets"}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}

                    {manualPaymentMethods && manualPaymentMethods.length > 0 ? (
                      manualPaymentMethods
                        .filter((m) => m.isEnabled)
                        .map((method) => (
                          <div
                            key={method._id}
                            className={`rounded-xl border-2 transition-all overflow-hidden ${selectedMethodId === method._id
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-primary/50"
                              }`}
                            dir={isRtl ? "rtl" : "ltr"}
                          >
                            <label className="flex items-center gap-4 p-4 cursor-pointer">
                              <RadioGroupItem
                                value={method._id}
                                id={method._id}
                              />
                              {method.imageUrl ? (
                                <img
                                  src={method.imageUrl}
                                  alt={getLocalizedText(method.title, locale)}
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <CreditCardIcon className="h-6 w-6 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {getLocalizedText(method.title, locale)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getLocalizedText(method.description, locale)}
                                </p>
                              </div>
                            </label>

                            {selectedMethodId === method._id && (
                              <div
                                className={`px-4 pb-4 space-y-4 ${isRtl ? "pr-12" : "pl-12"
                                  }`}
                              >
                                {method.instructions && (
                                  <div className="bg-white p-3 rounded border text-sm text-gray-600 whitespace-pre-wrap">
                                    {getLocalizedText(
                                      method.instructions,
                                      locale
                                    )}
                                  </div>
                                )}

                                {method.requiresAttachment && (
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="proof"
                                      className="text-sm font-medium"
                                    >
                                      {t("admin.payments.uploadProof")}{" "}
                                      <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          document
                                            .getElementById("proof")
                                            ?.click()
                                        }
                                      >
                                        <Upload
                                          className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"
                                            }`}
                                        />
                                        {t("admin.payments.chooseFile")}
                                      </Button>
                                      <Input
                                        id="proof"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                      />
                                      {paymentProof && (
                                        <div className="flex items-center gap-2 text-sm text-green-600">
                                          <ImageIcon className="h-4 w-4" />
                                          {paymentProof.name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        {t("checkout.noPaymentMethods")}
                      </p>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Right: Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{t("checkout.orderSummary")}</CardTitle>
                  <CardDescription>
                    {itemCount} {t("cart.itemsInCart")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  {items.map((item: CartItem, index: number) => (
                    <div key={index} className="flex gap-3 text-sm">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {getCartItemImage(item) ? (
                          <img
                            src={getCartItemImage(item)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">
                          {getCartItemName(item, locale)}
                        </p>
                        <p className="text-muted-foreground">
                          x{item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-primary">
                        {format(
                          convert(
                            getCartItemLineTotal(item),
                            normalizeCurrency(getCartItemCurrency(item)),
                            selectedCurrency
                          ),
                          selectedCurrency,
                          displayLocale
                        )}
                      </p>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="couponCode" className="text-sm font-medium">
                      {isRtl ? "كوبون الخصم" : "Discount Coupon"}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="couponCode"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder={isRtl ? "مثال: SAVE20" : "e.g. SAVE20"}
                        disabled={couponApplying || submitting}
                      />
                      {appliedCoupon ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveCoupon}
                          disabled={couponApplying || submitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleApplyCoupon}
                          disabled={couponApplying || submitting || !couponCodeInput.trim()}
                        >
                          {couponApplying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TicketPercent className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    {appliedCoupon && (
                      <p className="text-xs text-green-700">
                        {isRtl
                          ? `تم تطبيق ${appliedCoupon.code} بنجاح`
                          : `${appliedCoupon.code} applied successfully`}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm">
                    <span>{isRtl ? "المجموع قبل الخصم" : "Subtotal"}</span>
                    <span>{format(roundedTotal, checkoutCurrency, displayLocale)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-700">
                      <span>{isRtl ? "الخصم" : "Discount"}</span>
                      <span>- {format(discountAmount, checkoutCurrency, displayLocale)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>{t("cart.total")}</span>
                    <span className="text-primary">
                      {format(finalTotal, checkoutCurrency, displayLocale)}
                    </span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitting || !isLoggedIn}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"
                            }`}
                        />
                        {t("checkout.processing")}
                      </>
                    ) : (
                      isLoggedIn
                        ? t("checkout.placeOrder")
                        : isRtl
                          ? "سجل دخولك لإتمام الطلب"
                          : "Login to place your order"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

