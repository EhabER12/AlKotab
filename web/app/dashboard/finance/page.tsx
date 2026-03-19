"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Download,
  RefreshCw,
  Search,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Calendar,
  Trash2,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  CheckCircle,
  Eye,
} from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import {
  FinanceTransaction,
  FinanceSummary,
  TRANSACTION_CATEGORIES,
} from "@/store/services/financeService";
import { useToast } from "@/components/ui/use-toast";
import { isAdmin, isAuthenticated } from "@/store/services/authService";

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { t, isRtl, locale } = useAdminLocale();
  const { toast } = useToast();
  const hasAdminAccess = isAuthenticated() && isAdmin();

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [datePreset, setDatePreset] = useState<string>("all");

  // Sorting
  type SortField = "transactionDate" | "amount" | "type" | "category";
  type SortOrder = "asc" | "desc";
  type DisplayTransactionSource =
    | FinanceTransaction["source"]
    | "payment_manual";
  const [sortField, setSortField] = useState<SortField>("transactionDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  type AdminProfitTransaction = {
    id: string;
    teacherId?: {
      id?: string;
      _id?: string;
      fullName?: any;
      email?: string;
      profilePic?: string;
    };
    revenueType: "course_sale" | "subscription";
    totalAmount: number;
    profitPercentage: number;
    profitAmount: number;
    currency: string;
    transactionDate: string;
    status: "pending" | "paid" | "cancelled";
    paidAt?: string;
    notes?: string;
    payoutProofUrl?: string;
  };

  const [payouts, setPayouts] = useState<AdminProfitTransaction[]>([]);
  const [payoutPagination, setPayoutPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [payoutFilters, setPayoutFilters] = useState({
    status: "pending",
    revenueType: "all",
    search: "",
  });
  const [isPayoutsLoading, setIsPayoutsLoading] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<AdminProfitTransaction | null>(null);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [showPayoutProofDialog, setShowPayoutProofDialog] = useState(false);
  const [payoutProofPreviewUrl, setPayoutProofPreviewUrl] = useState<string | null>(null);
  const [showTransactionDetailsDialog, setShowTransactionDetailsDialog] =
    useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<FinanceTransaction | null>(null);

  // Display currency for all amounts
  const [displayCurrency, setDisplayCurrency] = useState<"SAR" | "EGP" | "USD">(
    "EGP"
  );

  // Exchange rates (relative to USD)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
    SAR: 3.75,
    EGP: 50.0,
  });

  // Settings loading state
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  const formatLocalDate = (date: Date) => {
    const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - tzOffsetMs);
    return localDate.toISOString().split("T")[0];
  };

  // Add transaction dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense" | "adjustment",
    amount: "",
    currency: "EGP",
    category: "",
    customCategory: "",
    description: "",
    transactionDate: formatLocalDate(new Date()),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch summary
      const summaryRes = await axiosInstance.get("/finance/summary");
      setSummary(summaryRes.data.data);

      // Fetch transactions
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

      const transRes = await axiosInstance.get(`/finance?${params.toString()}`);
      setTransactions(transRes.data.data.results || []);
      setPagination((prev) => ({
        ...prev,
        total: transRes.data.data.pagination?.total || 0,
        pages: transRes.data.data.pagination?.pages || 1,
      }));
    } catch (error: any) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: error.message || "Failed to load finance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    typeFilter,
    searchTerm,
    dateRange,
    toast,
    isRtl,
  ]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!isAdmin()) {
      router.push("/dashboard");
    }
  }, [router]);

  const fetchTeacherPayouts = useCallback(async () => {
    setIsPayoutsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", payoutPagination.page.toString());
      params.append("limit", payoutPagination.limit.toString());
      if (payoutFilters.status && payoutFilters.status !== "all") {
        params.append("status", payoutFilters.status);
      }
      if (payoutFilters.revenueType && payoutFilters.revenueType !== "all") {
        params.append("revenueType", payoutFilters.revenueType);
      }

      const res = await axiosInstance.get(
        `/teacher-profit/transactions?${params.toString()}`
      );
      setPayouts(res.data.data.results || []);
      setPayoutPagination((prev) => ({
        ...prev,
        total: res.data.data.pagination?.total || 0,
        pages: res.data.data.pagination?.pages || 1,
      }));
    } catch (error: any) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: error.message || "Failed to load teacher payouts",
        variant: "destructive",
      });
    } finally {
      setIsPayoutsLoading(false);
    }
  }, [
    payoutPagination.page,
    payoutPagination.limit,
    payoutFilters.status,
    payoutFilters.revenueType,
    toast,
    isRtl,
  ]);


  // Fetch settings on mount
  useEffect(() => {
    if (!hasAdminAccess) {
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await axiosInstance.get("/finance/settings");
        const settings = res.data.data;
        if (settings) {
          setDisplayCurrency(settings.baseCurrency);
          setExchangeRates(settings.exchangeRates);

          // Set default currency for new transaction
          setNewTransaction((prev) => ({
            ...prev,
            currency: settings.baseCurrency,
          }));
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [hasAdminAccess]);

  // Handle currency change and persist it
  const handleCurrencyChange = async (currency: "SAR" | "EGP" | "USD") => {
    setDisplayCurrency(currency);
    try {
      await axiosInstance.put("/finance/settings", {
        baseCurrency: currency,
      });
      toast({
        title: isRtl ? "تم التحديث" : "Updated",
        description: isRtl
          ? "تم تحديث العملة الأساسية"
          : "Base currency updated",
      });
    } catch (error) {
      // Revert if failed (optional, but good UX)
      console.error("Failed to update base currency", error);
    }
  };

  useEffect(() => {
    if (!hasAdminAccess) {
      return;
    }

    fetchData();
  }, [fetchData, hasAdminAccess]);
  useEffect(() => {
    if (!hasAdminAccess) {
      return;
    }

    fetchTeacherPayouts();
  }, [fetchTeacherPayouts, hasAdminAccess]);


  const handleAddTransaction = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: isRtl ? "المبلغ مطلوب" : "Amount is required",
        variant: "destructive",
      });
      return;
    }
    if (useCustomCategory && !newTransaction.customCategory.trim()) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: isRtl
          ? "من فضلك ادخل تصنيفًا مخصصًا"
          : "Please enter a custom category",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryToSend = useCustomCategory
        ? newTransaction.customCategory
        : newTransaction.category || "other";

      await axiosInstance.post("/finance", {
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        currency: newTransaction.currency,
        category: categoryToSend,
        description: newTransaction.description,
        transactionDate: newTransaction.transactionDate,
      });

      toast({
        title: isRtl ? "تم بنجاح" : "Success",
        description: isRtl ? "تمت إضافة المعاملة" : "Transaction added",
      });

      setShowAddDialog(false);
      setUseCustomCategory(false);
      setNewTransaction({
        type: "income",
        amount: "",
        currency: displayCurrency,
        category: "",
        customCategory: "",
        description: "",
        transactionDate: formatLocalDate(new Date()),
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePayoutFilterChange = (key: string, value: string) => {
    setPayoutFilters((prev) => ({ ...prev, [key]: value }));
    setPayoutPagination((prev) => ({ ...prev, page: 1 }));
  };

  const openMarkPaidDialog = (payout: AdminProfitTransaction) => {
    setSelectedPayout(payout);
    setPayoutNotes("");
    setPayoutProofFile(null);
    setShowMarkPaidDialog(true);
  };

  const openPayoutProof = (url: string) => {
    setPayoutProofPreviewUrl(url);
    setShowPayoutProofDialog(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;
    setIsMarkingPaid(true);
    try {
      const formData = new FormData();
      if (payoutNotes) formData.append("notes", payoutNotes);
      if (payoutProofFile) formData.append("payoutProof", payoutProofFile);

      await axiosInstance.put(
        `/teacher-profit/profit/${selectedPayout.id}/mark-paid`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast({
        title: isRtl ? "تم بنجاح" : "Success",
        description: isRtl
          ? "تم تحديث حالة الدفع"
          : "Payout marked as paid",
      });

      setShowMarkPaidDialog(false);
      setSelectedPayout(null);
      setPayoutProofFile(null);
      setPayoutNotes("");
      fetchTeacherPayouts();
    } catch (error: any) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: error.message || "Failed to mark payout as paid",
        variant: "destructive",
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };


  const handleExport = async () => {
    try {
      const response = await axiosInstance.post(
        "/finance/export",
        {
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `finance_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: isRtl ? "خطأ" : "Error",
        description: isRtl ? "فشل التصدير" : "Export failed",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat(isRtl ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Convert amount from one currency to another
  const convertCurrency = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    // Convert to USD first, then to target currency
    // Use dynamic exchangeRates state instead of constant
    const amountInUSD = amount / (exchangeRates[fromCurrency] || 1);
    return amountInUSD * (exchangeRates[toCurrency] || 1);
  };

  // Convert USD amount to display currency
  const toDisplayCurrency = (amountInUSD: number): number => {
    return amountInUSD * (exchangeRates[displayCurrency] || 1);
  };

  // Get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      SAR: isRtl ? "ر.س" : "SAR",
      EGP: isRtl ? "ج.م" : "EGP",
      USD: "$",
    };
    return symbols[currency] || currency;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "expense":
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return <MinusCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge className="bg-green-100 text-green-800">
            {isRtl ? "إيراد" : "Income"}
          </Badge>
        );
      case "expense":
        return (
          <Badge className="bg-red-100 text-red-800">
            {isRtl ? "مصروف" : "Expense"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800">
            {isRtl ? "تسوية" : "Adjustment"}
          </Badge>
        );
    }
  };

  // Category translations
  const CATEGORY_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
    // Income categories
    product_sale: { en: "Product Sale", ar: "بيع منتج" },
    service_payment: { en: "Service Payment", ar: "دفعة خدمة" },
    subscription: { en: "Subscription", ar: "اشتراك" },
    commission: { en: "Commission", ar: "عمولة" },
    // Expense categories
    refund: { en: "Refund", ar: "استرداد" },
    salary: { en: "Salary", ar: "راتب" },
    rent: { en: "Rent", ar: "إيجار" },
    utilities: { en: "Utilities", ar: "مرافق" },
    marketing: { en: "Marketing", ar: "تسويق" },
    software: { en: "Software", ar: "برمجيات" },
    equipment: { en: "Equipment", ar: "معدات" },
    taxes: { en: "Taxes", ar: "ضرائب" },
    // Adjustment
    adjustment: { en: "Adjustment", ar: "تسوية" },
    // Common
    other: { en: "Other", ar: "أخرى" },
  };

  const translateCategory = (category: string): string => {
    if (!category) return "-";
    const translation = CATEGORY_TRANSLATIONS[category.toLowerCase()];
    if (translation) {
      return isRtl ? translation.ar : translation.en;
    }
    // Return the category as-is if no translation (for custom categories)
    return category.replace(/_/g, " ");
  };
  const getTeacherLabel = (teacher: any): string => {
    if (!teacher) return "-";
    if (typeof teacher.fullName === "string") return teacher.fullName;
    const name = isRtl
      ? teacher.fullName?.ar || teacher.fullName?.en
      : teacher.fullName?.en || teacher.fullName?.ar;
    return name || teacher.email || "-";
  };

  const getLocalizedValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const getReferencedPayment = (tx: FinanceTransaction) => {
    const referenceId = tx.reference?.id;
    if (!referenceId || typeof referenceId !== "object" || Array.isArray(referenceId)) {
      return null;
    }

    return referenceId;
  };

  const isManualPaymentReference = (payment: any) => {
    const methodType = payment?.paymentDetails?.methodType;

    return Boolean(
      payment?.manualPaymentMethodId ||
        payment?.paymentProofUrl ||
        methodType === "manual_user_payment" ||
        methodType === "admin_manual_payment"
    );
  };

  const getTransactionSource = (
    tx: FinanceTransaction
  ): DisplayTransactionSource => {
    if (tx.source === "payment_manual") {
      return "payment_manual";
    }

    if (tx.source !== "payment_auto") {
      return tx.source;
    }

    return isManualPaymentReference(getReferencedPayment(tx))
      ? "payment_manual"
      : "payment_auto";
  };

  const getSourceLabel = (source: DisplayTransactionSource) => {
    switch (source) {
      case "payment_auto":
        return isRtl ? "تلقائي (شراء)" : "Auto (Purchase)";
      case "refund_auto":
        return isRtl ? "تلقائي (استرداد)" : "Auto (Refund)";
      case "system":
        return isRtl ? "نظام" : "System";
      default:
        return isRtl ? "يدوي" : "Manual";
    }
  };

  const getDisplaySourceLabel = (source: DisplayTransactionSource) => {
    switch (source) {
      case "payment_manual":
        return isRtl ? "يدوي (دفع)" : "Manual (Payment)";
      case "payment_auto":
        return isRtl ? "تلقائي (دفع)" : "Auto (Payment)";
      case "refund_auto":
        return isRtl ? "تلقائي (استرداد)" : "Auto (Refund)";
      case "system":
        return isRtl ? "نظام" : "System";
      default:
        return isRtl ? "يدوي (قيد)" : "Manual (Entry)";
    }
  };

  const getTransactionCustomer = (tx: FinanceTransaction) => {
    const payment = getReferencedPayment(tx);

    return {
      name: payment?.billingInfo?.name || tx.metadata?.customerName || "-",
      email: payment?.billingInfo?.email || tx.metadata?.customerEmail || "-",
      phone: payment?.billingInfo?.phone || "-",
      city: payment?.billingInfo?.city || "",
      country: payment?.billingInfo?.country || "",
    };
  };

  const getTransactionPurchaseType = (tx: FinanceTransaction) => {
    const payment = getReferencedPayment(tx);
    const purchaseType = tx.metadata?.purchaseType;

    if (!payment && !purchaseType) {
      return "-";
    }

    if (purchaseType === "subscription" || payment?.packageId || payment?.studentMemberId) {
      return isRtl ? "اشتراك" : "Subscription";
    }

    if (purchaseType === "service" || payment?.serviceId) {
      return isRtl ? "خدمة" : "Service";
    }

    if (purchaseType === "course" || payment?.courseId) {
      return isRtl ? "دورة" : "Course";
    }

    return isRtl ? "منتج" : "Product";
  };

  const getTransactionItems = (tx: FinanceTransaction) => {
    const payment = getReferencedPayment(tx);
    const cartItems = Array.isArray(payment?.cartSessionId?.cartItems)
      ? payment.cartSessionId.cartItems
      : [];

    if (cartItems.length > 0) {
      return cartItems.map((item: any, index: number) => {
        const quantity = Number(item?.quantity || 1);
        const unitPrice = Number(item?.unitPrice || item?.price || 0);
        const totalPrice = Number(item?.totalPrice || unitPrice * quantity);

        return {
          id: `${item?._id || item?.id || "cart"}-${index}`,
          name:
            getLocalizedValue(item?.productId?.name) ||
            getLocalizedValue(item?.productName) ||
            item?.name ||
            (isRtl ? "منتج" : "Product"),
          itemType: item?.itemType,
          quantity,
          unitPrice,
          totalPrice,
          currency: payment?.cartSessionId?.currency || payment?.currency || tx.currency,
          variantName: getLocalizedValue(item?.variantName),
        };
      });
    }

    const paymentItems = Array.isArray(payment?.paymentDetails?.items)
      ? payment.paymentDetails.items
      : Array.isArray(tx.metadata?.itemsSummary)
        ? tx.metadata.itemsSummary
        : [];

    return paymentItems.map((item: any, index: number) => {
      const quantity = Number(item?.quantity || 1);
      const unitPrice = Number(item?.unitPrice || item?.price || 0);
      const totalPrice = Number(item?.totalPrice || unitPrice * quantity);

      return {
        id: `${item?.itemId || "payment"}-${index}`,
        name:
          getLocalizedValue(item?.name) ||
          getLocalizedValue(item?.productName) ||
          (item?.itemType === "course"
            ? isRtl
              ? "دورة"
              : "Course"
            : isRtl
              ? "منتج"
              : "Product"),
        itemType: item?.itemType,
        quantity,
        unitPrice,
        totalPrice,
        currency: payment?.currency || tx.currency,
        variantName: getLocalizedValue(item?.variantName),
      };
    });
  };

  const getTransactionRelatedEntities = (tx: FinanceTransaction) => {
    const payment = getReferencedPayment(tx);
    if (!payment) return [];

    const entities = [];

    if (payment.courseId) {
      entities.push({
        label: isRtl ? "الدورة" : "Course",
        value: getLocalizedValue(payment.courseId.title) || "-",
      });
    }

    if (payment.packageId) {
      entities.push({
        label: isRtl ? "الباقة" : "Package",
        value: getLocalizedValue(payment.packageId.name) || "-",
      });
    }

    if (payment.productId) {
      entities.push({
        label: isRtl ? "المنتج" : "Product",
        value: getLocalizedValue(payment.productId.name) || "-",
      });
    }

    if (payment.serviceId) {
      entities.push({
        label: isRtl ? "الخدمة" : "Service",
        value: getLocalizedValue(payment.serviceId.title) || "-",
      });
    }

    return entities;
  };

  const openTransactionDetails = (tx: FinanceTransaction) => {
    setSelectedTransaction(tx);
    setShowTransactionDetailsDialog(true);
  };


  // Get all unique categories from transactions for the filter
  const allCategories = Array.from(
    new Set(transactions.map((tx) => tx.category).filter(Boolean))
  );

  // Handle column sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ms-1 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ms-1 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 ms-1 text-primary" />
    );
  };

  // Apply client-side sorting and filtering
  const getFilteredAndSortedTransactions = () => {
    let filtered = [...transactions];

    // Filter by category
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((tx) => tx.category === categoryFilter);
    }

    // Filter by source
    if (sourceFilter && sourceFilter !== "all") {
      filtered = filtered.filter(
        (tx) => getTransactionSource(tx) === sourceFilter
      );
    }

    // Filter by amount range
    if (amountRange.min) {
      const minAmount = parseFloat(amountRange.min);
      filtered = filtered.filter((tx) => Math.abs(tx.amount) >= minAmount);
    }
    if (amountRange.max) {
      const maxAmount = parseFloat(amountRange.max);
      filtered = filtered.filter((tx) => Math.abs(tx.amount) <= maxAmount);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "transactionDate":
          comparison =
            new Date(a.transactionDate).getTime() -
            new Date(b.transactionDate).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredTransactions = getFilteredAndSortedTransactions();
  const filteredPayouts = payoutFilters.search
    ? payouts.filter((payout) => {
        const searchValue = payoutFilters.search.toLowerCase().trim();
        const teacherLabel = getTeacherLabel(payout.teacherId).toLowerCase();
        const teacherEmail = (payout.teacherId?.email || "").toLowerCase();
        return (
          teacherLabel.includes(searchValue) ||
          teacherEmail.includes(searchValue)
        );
      })
    : payouts;


  // Check if any filter is active
  const hasActiveFilters =
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    sourceFilter !== "all" ||
    datePreset !== "all" ||
    searchTerm ||
    dateRange.startDate ||
    dateRange.endDate ||
    amountRange.min ||
    amountRange.max;

  if (!hasAdminAccess) {
    return null;
  }

  const resetPaginationPage = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setSourceFilter("all");
    setDatePreset("all");
    setSearchTerm("");
    setDateRange({ startDate: "", endDate: "" });
    setAmountRange({ min: "", max: "" });
    setSortField("transactionDate");
    setSortOrder("desc");
    resetPaginationPage();
  };

  // Apply date preset
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    let startDate = "";
    let endDate = formatLocalDate(now);

    switch (preset) {
      case "today":
        startDate = endDate;
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = formatLocalDate(weekStart);
        break;
      case "month":
        startDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case "lastMonth":
        startDate = formatLocalDate(
          new Date(now.getFullYear(), now.getMonth() - 1, 1)
        );
        endDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = formatLocalDate(
          new Date(now.getFullYear(), quarterMonth, 1)
        );
        break;
      case "year":
        startDate = formatLocalDate(new Date(now.getFullYear(), 0, 1));
        break;
      default:
        startDate = "";
        endDate = "";
    }

    setDateRange({ startDate, endDate });
    resetPaginationPage();
  };

  // Calculate this month's stats
  const thisMonthStats = (() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let monthIncome = 0;
    let monthExpense = 0;
    let todayIncome = 0;
    let todayExpense = 0;
    let weekIncome = 0;
    let weekExpense = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.transactionDate);
      const amountUSD =
        tx.amountInUSD || tx.amount / (exchangeRates[tx.currency] || 1);

      // This month
      if (txDate >= startOfMonth) {
        if (tx.type === "income") monthIncome += amountUSD;
        if (tx.type === "expense") monthExpense += amountUSD;
      }

      // This week
      if (txDate >= startOfWeek) {
        if (tx.type === "income") weekIncome += amountUSD;
        if (tx.type === "expense") weekExpense += amountUSD;
      }

      // Today
      if (txDate >= startOfToday) {
        if (tx.type === "income") todayIncome += amountUSD;
        if (tx.type === "expense") todayExpense += amountUSD;
      }
    });

    return {
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      weekIncome,
      weekExpense,
      todayIncome,
      todayExpense,
    };
  })();

  if (isLoading && !summary) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            {isRtl ? "إدارة المالية" : "Finance Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "تتبع الإيرادات والمصروفات والرصيد"
              : "Track income, expenses, and balance"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency Selector */}
          <Select
            value={displayCurrency}
            onValueChange={(v: "SAR" | "EGP" | "USD") =>
              handleCurrencyChange(v)
            }
            disabled={isSettingsLoading}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAR">{isRtl ? "ر.س (SAR)" : "SAR"}</SelectItem>
              <SelectItem value="EGP">{isRtl ? "ج.م (EGP)" : "EGP"}</SelectItem>
              <SelectItem value="USD">{isRtl ? "$ (USD)" : "USD"}</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isRtl ? "إضافة معاملة" : "Add Transaction"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-start">
                  {isRtl ? "إضافة معاملة جديدة" : "Add New Transaction"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{isRtl ? "النوع" : "Type"}</Label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(v: any) =>
                      setNewTransaction({ ...newTransaction, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={isRtl ? "rtl" : "ltr"}>
                      <SelectItem value="income">
                        {isRtl ? "إيراد" : "Income"}
                      </SelectItem>
                      <SelectItem value="expense">
                        {isRtl ? "مصروف" : "Expense"}
                      </SelectItem>
                      <SelectItem value="adjustment">
                        {isRtl ? "تسوية" : "Adjustment"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isRtl ? "المبلغ" : "Amount"}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          amount: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRtl ? "العملة" : "Currency"}</Label>
                    <Select
                      value={newTransaction.currency}
                      onValueChange={(v) =>
                        setNewTransaction({ ...newTransaction, currency: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="EGP">EGP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{isRtl ? "التصنيف" : "Category"}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUseCustomCategory(!useCustomCategory)}
                      className="text-xs h-6"
                    >
                      {useCustomCategory
                        ? isRtl
                          ? "اختر من القائمة"
                          : "Select from list"
                        : isRtl
                          ? "تصنيف مخصص"
                          : "Custom category"}
                    </Button>
                  </div>
                  {useCustomCategory ? (
                    <Input
                      value={newTransaction.customCategory}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          customCategory: e.target.value,
                        })
                      }
                      placeholder={
                        isRtl
                          ? "أدخل تصنيف مخصص..."
                          : "Enter custom category..."
                      }
                    />
                  ) : (
                    <Select
                      value={newTransaction.category}
                      onValueChange={(v) =>
                        setNewTransaction({ ...newTransaction, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isRtl ? "اختر التصنيف" : "Select category"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_CATEGORIES[newTransaction.type]?.map(
                          (cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {isRtl ? cat.label.ar : cat.label.en}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{isRtl ? "التاريخ" : "Date"}</Label>
                  <Input
                    type="date"
                    value={newTransaction.transactionDate}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        transactionDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{isRtl ? "الوصف" : "Description"}</Label>
                  <Textarea
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: e.target.value,
                      })
                    }
                    placeholder={
                      isRtl ? "وصف اختياري..." : "Optional description..."
                    }
                  />
                </div>

                <Button
                  onClick={handleAddTransaction}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting
                    ? isRtl
                      ? "جاري الإضافة..."
                      : "Adding..."
                    : isRtl
                      ? "إضافة"
                      : "Add"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {isRtl ? "تصدير" : "Export"}
          </Button>

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {isRtl ? "إجمالي الإيرادات" : "Total Income"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  toDisplayCurrency(summary.totalIncomeUSD),
                  displayCurrency
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {isRtl ? "هذا الشهر" : "This Month"}:{" "}
                {formatCurrency(
                  toDisplayCurrency(thisMonthStats.monthIncome),
                  displayCurrency
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "اليوم" : "Today"}:{" "}
                {formatCurrency(
                  toDisplayCurrency(thisMonthStats.todayIncome),
                  displayCurrency
                )}
                {" | "}
                {isRtl ? "الأسبوع" : "Week"}:{" "}
                {formatCurrency(
                  toDisplayCurrency(thisMonthStats.weekIncome),
                  displayCurrency
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                {isRtl ? "إجمالي المصروفات" : "Total Expenses"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  toDisplayCurrency(summary.totalExpenseUSD),
                  displayCurrency
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.expenseCount} {isRtl ? "معاملة" : "transactions"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MinusCircle className="h-4 w-4 text-blue-500" />
                {isRtl ? "التسويات" : "Adjustments"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  toDisplayCurrency(summary.totalAdjustmentUSD),
                  displayCurrency
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              summary.balanceUSD >= 0 ? "border-green-400" : "border-red-400"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {isRtl ? "الرصيد" : "Balance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${summary.balanceUSD >= 0 ? "text-green-600" : "text-red-600"
                  }`}
              >
                {formatCurrency(
                  toDisplayCurrency(summary.balanceUSD),
                  displayCurrency
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.transactionCount} {isRtl ? "معاملة إجمالي" : "total"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teacher Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isRtl ? "مدفوعات أرباح المدرسين" : "Teacher Payouts"}
          </CardTitle>
          <CardDescription>
            {isRtl
              ? "تحويل نسبة الأرباح وإرفاق إثبات التحويل"
              : "Send profit share payouts and attach transfer proof"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="min-w-[160px]">
              <Label className="mb-2 block">{isRtl ? "الحالة" : "Status"}</Label>
              <Select
                value={payoutFilters.status}
                onValueChange={(v) => handlePayoutFilterChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="pending">
                    {isRtl ? "قيد الانتظار" : "Pending"}
                  </SelectItem>
                  <SelectItem value="paid">{isRtl ? "مدفوع" : "Paid"}</SelectItem>
                  <SelectItem value="cancelled">
                    {isRtl ? "ملغي" : "Cancelled"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <Label className="mb-2 block">{isRtl ? "النوع" : "Type"}</Label>
              <Select
                value={payoutFilters.revenueType}
                onValueChange={(v) => handlePayoutFilterChange("revenueType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="course_sale">
                    {isRtl ? "بيع دورة" : "Course Sale"}
                  </SelectItem>
                  <SelectItem value="subscription">
                    {isRtl ? "اشتراك" : "Subscription"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block">{isRtl ? "بحث" : "Search"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    isRtl ? "بحث بالمدرس أو البريد" : "Search by teacher or email"
                  }
                  value={payoutFilters.search}
                  onChange={(e) =>
                    setPayoutFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchTeacherPayouts}
              disabled={isPayoutsLoading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isPayoutsLoading ? "animate-spin" : ""}`}
              />
              {isRtl ? "تحديث" : "Refresh"}
            </Button>
          </div>

          {isPayoutsLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {isRtl ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {isRtl ? "لا توجد عمليات دفع" : "No payouts found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">
                      {isRtl ? "التاريخ" : "Date"}
                    </TableHead>
                    <TableHead className="text-start">
                      {isRtl ? "المدرس" : "Teacher"}
                    </TableHead>
                    <TableHead className="text-start">
                      {isRtl ? "النوع" : "Type"}
                    </TableHead>
                    <TableHead className={isRtl ? "text-left" : "text-right"}>
                      {isRtl ? "المبلغ" : "Profit"}
                    </TableHead>
                    <TableHead className="text-center">
                      {isRtl ? "الحالة" : "Status"}
                    </TableHead>
                    <TableHead className="text-center">
                      {isRtl ? "الإثبات" : "Proof"}
                    </TableHead>
                    <TableHead className="text-center">
                      {isRtl ? "الإجراء" : "Action"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(payout.transactionDate).toLocaleDateString(
                          isRtl ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getTeacherLabel(payout.teacherId)}
                          </span>
                          {payout.teacherId?.email && (
                            <span className="text-xs text-muted-foreground">
                              {payout.teacherId.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payout.revenueType === "course_sale"
                          ? isRtl
                            ? "بيع دورة"
                            : "Course Sale"
                          : isRtl
                          ? "اشتراك"
                          : "Subscription"}
                      </TableCell>
                      <TableCell
                        className={`${
                          isRtl ? "text-left" : "text-right"
                        } font-medium`}
                      >
                        <div>
                          {formatCurrency(
                            convertCurrency(
                              payout.profitAmount,
                              payout.currency,
                              displayCurrency
                            ),
                            displayCurrency
                          )}
                        </div>
                        {payout.currency !== displayCurrency && (
                          <div className="text-xs text-muted-foreground">
                            ({formatCurrency(payout.profitAmount, payout.currency)})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            payout.status === "paid"
                              ? "default"
                              : payout.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            payout.status === "paid"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : ""
                          }
                        >
                          {payout.status === "paid"
                            ? isRtl
                              ? "مدفوع"
                              : "Paid"
                            : payout.status === "pending"
                            ? isRtl
                              ? "قيد الانتظار"
                              : "Pending"
                            : isRtl
                            ? "ملغي"
                            : "Cancelled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {payout.payoutProofUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => openPayoutProof(payout.payoutProofUrl!)}
                          >
                            <Eye className="h-4 w-4" />
                            {isRtl ? "عرض" : "View"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {payout.status === "pending" ? (
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => openMarkPaidDialog(payout)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            {isRtl ? "تم الدفع" : "Mark Paid"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {payout.paidAt
                              ? new Date(payout.paidAt).toLocaleDateString(
                                  isRtl ? "ar-SA" : "en-US"
                                )
                              : "-"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {payoutPagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={payoutPagination.page === 1}
                onClick={() =>
                  setPayoutPagination({
                    ...payoutPagination,
                    page: payoutPagination.page - 1,
                  })
                }
              >
                {isRtl ? "السابق" : "Previous"}
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {payoutPagination.page} / {payoutPagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={payoutPagination.page === payoutPagination.pages}
                onClick={() =>
                  setPayoutPagination({
                    ...payoutPagination,
                    page: payoutPagination.page + 1,
                  })
                }
              >
                {isRtl ? "التالي" : "Next"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block">{isRtl ? "بحث" : "Search"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isRtl ? "بحث..." : "Search..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPaginationPage();
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="min-w-[130px]">
              <Label className="mb-2 block">{isRtl ? "النوع" : "Type"}</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  resetPaginationPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="income">
                    {isRtl ? "إيراد" : "Income"}
                  </SelectItem>
                  <SelectItem value="expense">
                    {isRtl ? "مصروف" : "Expense"}
                  </SelectItem>
                  <SelectItem value="adjustment">
                    {isRtl ? "تسوية" : "Adjustment"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[130px]">
              <Label className="mb-2 block">
                {isRtl ? "التصنيف" : "Category"}
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  resetPaginationPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {translateCategory(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[160px]">
              <Label className="mb-2 block">
                {isRtl ? "المصدر" : "Source"}
              </Label>
              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  setSourceFilter(value);
                  resetPaginationPage();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="payment_manual">
                    {isRtl ? "يدوي (دفع)" : "Manual (Payment)"}
                  </SelectItem>
                  <SelectItem value="manual">
                    {isRtl ? "يدوي" : "Manual"}
                  </SelectItem>
                  <SelectItem value="payment_auto">
                    {isRtl ? "تلقائي (دفع)" : "Auto (Payment)"}
                  </SelectItem>
                  <SelectItem value="refund_auto">
                    {isRtl ? "تلقائي (استرداد)" : "Auto (Refund)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label className="mb-2 block">
                {isRtl ? "الفترة" : "Period"}
              </Label>
              <Select value={datePreset} onValueChange={applyDatePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRtl ? "الكل" : "All Time"}
                  </SelectItem>
                  <SelectItem value="today">
                    {isRtl ? "اليوم" : "Today"}
                  </SelectItem>
                  <SelectItem value="week">
                    {isRtl ? "هذا الأسبوع" : "This Week"}
                  </SelectItem>
                  <SelectItem value="month">
                    {isRtl ? "هذا الشهر" : "This Month"}
                  </SelectItem>
                  <SelectItem value="lastMonth">
                    {isRtl ? "الشهر الماضي" : "Last Month"}
                  </SelectItem>
                  <SelectItem value="quarter">
                    {isRtl ? "هذا الربع" : "This Quarter"}
                  </SelectItem>
                  <SelectItem value="year">
                    {isRtl ? "هذا العام" : "This Year"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[140px]">
              <Label className="mb-2 block">{isRtl ? "من" : "From"}</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setDatePreset("all");
                    setDateRange({ ...dateRange, startDate: e.target.value });
                    resetPaginationPage();
                  }}
                />
              </div>

            <div className="min-w-[140px]">
              <Label className="mb-2 block">{isRtl ? "إلى" : "To"}</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setDatePreset("all");
                    setDateRange({ ...dateRange, endDate: e.target.value });
                    resetPaginationPage();
                  }}
                />
              </div>

            <div className="min-w-[240px]">
              <Label className="mb-2 block">
                {isRtl ? "نطاق المبلغ" : "Amount Range"}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min="0"
                  placeholder={isRtl ? "الأدنى" : "Min"}
                  value={amountRange.min}
                  onChange={(e) => {
                    setAmountRange({ ...amountRange, min: e.target.value });
                    resetPaginationPage();
                  }}
                  className="w-20"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  placeholder={isRtl ? "الأقصى" : "Max"}
                  value={amountRange.max}
                  onChange={(e) => {
                    setAmountRange({ ...amountRange, max: e.target.value });
                    resetPaginationPage();
                  }}
                  className="w-20"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                {isRtl ? "مسح" : "Clear"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "المعاملات" : "Transactions"}</CardTitle>
          <CardDescription>
            {isRtl
              ? "قائمة جميع المعاملات المالية"
              : "List of all financial transactions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRtl ? "لا توجد معاملات" : "No transactions found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="text-start cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("transactionDate")}
                    >
                      <div className="flex items-center">
                        {isRtl ? "التاريخ" : "Date"}
                        {getSortIcon("transactionDate")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-start cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        {isRtl ? "النوع" : "Type"}
                        {getSortIcon("type")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-start cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center">
                        {isRtl ? "التصنيف" : "Category"}
                        {getSortIcon("category")}
                      </div>
                    </TableHead>
                    <TableHead className="text-start">
                      {isRtl ? "الوصف" : "Description"}
                    </TableHead>
                    <TableHead
                      className={`${isRtl ? "text-left" : "text-right"
                        } cursor-pointer hover:bg-muted/50 select-none`}
                      onClick={() => handleSort("amount")}
                    >
                      <div
                        className={`flex items-center ${isRtl ? "justify-start" : "justify-end"
                          }`}
                      >
                        {isRtl ? "المبلغ" : "Amount"}
                        {getSortIcon("amount")}
                      </div>
                    </TableHead>
                    <TableHead className="text-start">
                      {isRtl ? "المصدر" : "Source"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const amountForDisplay = Math.abs(tx.amount);
                    return (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => openTransactionDetails(tx)}
                      >
                      <TableCell className="whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString(
                          isRtl ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell>
                        {translateCategory(tx.category || "")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell
                        className={`${isRtl ? "text-left" : "text-right"
                          } font-medium ${tx.type === "income"
                            ? "text-green-600"
                            : tx.type === "expense"
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                      >
                        <div>
                          {tx.type === "expense" ? "-" : ""}
                          {formatCurrency(
                            convertCurrency(
                              amountForDisplay,
                              tx.currency,
                              displayCurrency
                            ),
                            displayCurrency
                          )}
                        </div>
                        {tx.currency !== displayCurrency && (
                          <div className="text-xs text-muted-foreground">
                            ({formatCurrency(amountForDisplay, tx.currency)})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {false ? tx.source === "payment_auto"
                            ? isRtl
                              ? "تلقائي"
                              : "Auto"
                            : isRtl
                              ? "يدوي"
                              : "Manual" : getDisplaySourceLabel(getTransactionSource(tx))}
                        </Badge>
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
              >
                {isRtl ? "السابق" : "Previous"}
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {pagination.page} / {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
              >
                {isRtl ? "التالي" : "Next"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={showTransactionDetailsDialog}
        onOpenChange={setShowTransactionDetailsDialog}
      >
        <DialogContent className="max-w-3xl" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-start">
              {isRtl ? "تفاصيل المعاملة" : "Transaction Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">
                    {isRtl ? "بيانات العملية" : "Transaction Info"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "المرجع" : "Reference"}
                      </span>
                      <span className="font-mono">
                        {selectedTransaction.reference?.displayId ||
                          selectedTransaction.id}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "التاريخ" : "Date"}
                      </span>
                      <span>
                        {new Date(selectedTransaction.transactionDate).toLocaleString(
                          isRtl ? "ar-SA" : "en-US"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "الفئة" : "Category"}
                      </span>
                      <span>
                        {translateCategory(selectedTransaction.category || "")}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "المصدر" : "Source"}
                      </span>
                      <span>
                        {getDisplaySourceLabel(getTransactionSource(selectedTransaction))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "القيمة" : "Amount"}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          Math.abs(selectedTransaction.amount),
                          selectedTransaction.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">
                    {isRtl ? "بيانات الشراء" : "Purchase Info"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "نوع الشراء" : "Purchase Type"}
                      </span>
                      <span>{getTransactionPurchaseType(selectedTransaction)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "طريقة الدفع" : "Payment Method"}
                      </span>
                      <span>
                        {getReferencedPayment(selectedTransaction)?.paymentMethod ||
                          selectedTransaction.metadata?.paymentMethod ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "المبلغ الأصلي" : "Original Amount"}
                      </span>
                      <span>
                        {selectedTransaction.metadata?.originalAmount
                          ? formatCurrency(
                              selectedTransaction.metadata.originalAmount,
                              getReferencedPayment(selectedTransaction)?.currency ||
                                selectedTransaction.currency
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "الخصم" : "Discount"}
                      </span>
                      <span>
                        {selectedTransaction.metadata?.discountAmount
                          ? formatCurrency(
                              selectedTransaction.metadata.discountAmount,
                              getReferencedPayment(selectedTransaction)?.currency ||
                                selectedTransaction.currency
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        {isRtl ? "كود الخصم" : "Coupon"}
                      </span>
                      <span>
                        {getReferencedPayment(selectedTransaction)?.couponCode ||
                          selectedTransaction.metadata?.couponCode ||
                          "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">
                  {isRtl ? "بيانات العميل" : "Customer Info"}
                </h3>
                {(() => {
                  const customer = getTransactionCustomer(selectedTransaction);
                  return (
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          {isRtl ? "الاسم" : "Name"}
                        </p>
                        <p>{customer.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {isRtl ? "البريد" : "Email"}
                        </p>
                        <p>{customer.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {isRtl ? "الهاتف" : "Phone"}
                        </p>
                        <p>{customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {isRtl ? "المدينة / الدولة" : "City / Country"}
                        </p>
                        <p>
                          {[customer.city, customer.country]
                            .filter(Boolean)
                            .join(" / ") || "-"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {selectedTransaction.description ? (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">
                    {isRtl ? "الوصف" : "Description"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransaction.description}
                  </p>
                </div>
              ) : null}

              {getTransactionRelatedEntities(selectedTransaction).length > 0 ? (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">
                    {isRtl ? "العناصر المرتبطة" : "Related Records"}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    {getTransactionRelatedEntities(selectedTransaction).map(
                      (item: { label: string; value: string }) => (
                        <div key={`${item.label}-${item.value}`}>
                          <p className="text-muted-foreground">{item.label}</p>
                          <p>{item.value}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {getTransactionItems(selectedTransaction).length > 0 ? (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">
                    {isRtl ? "تفاصيل المشتريات" : "Purchased Items"}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isRtl ? "العنصر" : "Item"}</TableHead>
                          <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                          <TableHead>{isRtl ? "الكمية" : "Qty"}</TableHead>
                          <TableHead>{isRtl ? "سعر الوحدة" : "Unit Price"}</TableHead>
                          <TableHead>{isRtl ? "الإجمالي" : "Total"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getTransactionItems(selectedTransaction).map((item: {
                          id: string;
                          name: string;
                          itemType?: string;
                          quantity: number;
                          unitPrice: number;
                          totalPrice: number;
                          currency: string;
                          variantName?: string;
                        }) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.variantName ? (
                                  <p className="text-xs text-muted-foreground">
                                    {item.variantName}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.itemType === "course"
                                ? isRtl
                                  ? "دورة"
                                  : "Course"
                                : isRtl
                                  ? "منتج"
                                  : "Product"}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(item.unitPrice, item.currency)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.totalPrice, item.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تأكيد تحويل الأرباح" : "Confirm Payout"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{isRtl ? "ملاحظات" : "Notes"}</Label>
              <Textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder={isRtl ? "اكتب ملاحظة للمدرس" : "Add a note for the teacher"}
                rows={3}
              />
            </div>
            <div>
              <Label className="mb-2 block">
                {isRtl ? "صورة إثبات التحويل" : "Transfer Proof"}
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPayoutProofFile(e.target.files ? e.target.files[0] : null)
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMarkPaidDialog(false)}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleMarkPaid} disabled={isMarkingPaid} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {isMarkingPaid
                  ? isRtl
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isRtl
                  ? "تأكيد الدفع"
                  : "Confirm Paid"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPayoutProofDialog}
        onOpenChange={setShowPayoutProofDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "صورة إثبات التحويل" : "Payout Proof"}
            </DialogTitle>
          </DialogHeader>
          {payoutProofPreviewUrl ? (
            <img
              src={payoutProofPreviewUrl}
              alt={isRtl ? "إثبات التحويل" : "Payout proof"}
              className="w-full rounded-md border"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {isRtl ? "لا توجد صورة" : "No proof available"}
            </p>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
